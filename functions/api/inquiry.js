// POST /api/inquiry — project inquiry endpoint for the ORVANU website.
//
// Runs as a Cloudflare Pages Function. Configuration is via environment
// variables / bindings (documented in docs/FORM-SETUP.md):
//
//   RESEND_API_KEY        secret   — Resend API key (free tier is enough)
//   INQUIRY_TO_EMAIL      var      — destination inbox (default orvanutech@gmail.com)
//   INQUIRY_FROM_EMAIL    var      — verified sender (default onboarding@resend.dev)
//   TURNSTILE_SECRET_KEY  secret   — Cloudflare Turnstile secret key
//   FILE_SIGNING_SECRET   secret   — HMAC key for private attachment links
//   INQUIRIES             binding  — R2 bucket for attachments (optional)
//   DB                    binding  — D1 database holding inquiries (optional)
//   MAIL_MODE             var      — "console" logs instead of sending (local dev only)
//
// The inquiry is written to D1 first and emailed second, so a mail outage never
// loses a lead: the dashboard still shows it, and `notified` reports the truth.

import { rateLimit, ipHash, audit } from '../_lib/core.js';

const RECIPIENT_FALLBACK = 'orvanutech@gmail.com';
const SENDER_FALLBACK = 'onboarding@resend.dev';

const MAX_FILES = 3;
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_BODY_BYTES = 32 * 1024 * 1024;
const LINK_TTL_SECONDS = 7 * 24 * 60 * 60;

const SERVICES = [
  'Custom Software Development',
  'Dedicated Engineering Team',
  'MVP & SaaS Product Development',
  'Not Sure Yet',
];
const BUDGETS = ['Under €5,000', '€5,000 – €15,000', '€15,000 – €50,000', '€50,000+'];
const TIMELINES = ['Within 1 month', '1–3 months', '3–6 months', 'Flexible / Not sure yet'];

// Extensions we accept, each with the byte signatures that must match.
const FILE_TYPES = {
  pdf: ['pdf'],
  png: ['png'],
  jpg: ['jpg'],
  jpeg: ['jpg'],
  docx: ['zip'],
  xlsx: ['zip'],
};
const SIGNATURES = {
  pdf: [0x25, 0x50, 0x44, 0x46], // %PDF
  png: [0x89, 0x50, 0x4e, 0x47], // .PNG
  jpg: [0xff, 0xd8, 0xff], // JPEG SOI
  zip: [0x50, 0x4b, 0x03, 0x04], // PK.. (docx / xlsx are zip containers)
};
const CONTENT_TYPES = {
  pdf: 'application/pdf',
  png: 'image/png',
  jpg: 'image/jpeg',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};

const json = (status, payload) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });

const fail = (status, error, fields) => json(status, fields ? { ok: false, error, fields } : { ok: false, error });

const text = (value, max) => String(value ?? '').trim().slice(0, max);

function isEmail(value) {
  // Permissive but structurally sound: rejects spaces, requires a dotted TLD.
  return /^[^\s@"(),:;<>[\\\]]+@[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)+$/.test(value) && value.length <= 254;
}

function isPhone(value) {
  // International numbers only: leading +, 7–15 digits, common separators.
  if (!/^\+[\d\s().-]+$/.test(value)) return false;
  const digits = value.replace(/\D/g, '');
  return digits.length >= 7 && digits.length <= 15;
}

function extensionOf(name) {
  const match = /\.([A-Za-z0-9]+)$/.exec(name || '');
  return match ? match[1].toLowerCase() : '';
}

function matchesSignature(bytes, ext) {
  const kinds = FILE_TYPES[ext];
  if (!kinds) return false;
  return kinds.some((kind) => SIGNATURES[kind].every((byte, i) => bytes[i] === byte));
}

function base64url(bytes) {
  let binary = '';
  for (const byte of new Uint8Array(bytes)) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function sign(secret, payload) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  return base64url(signature);
}

async function storeAttachment(env, inquiryId, file, ext, index) {
  if (!env.INQUIRIES) return null;
  const key = `inquiries/${inquiryId}/${index + 1}-${crypto.randomUUID()}.${ext}`;
  await env.INQUIRIES.put(key, await file.arrayBuffer(), {
    httpMetadata: { contentType: CONTENT_TYPES[ext] },
    customMetadata: { originalName: text(file.name, 120), inquiryId },
  });
  return key;
}

async function privateLink(env, key) {
  const expires = Math.floor(Date.now() / 1000) + LINK_TTL_SECONDS;
  const payload = `${key}.${expires}`;
  const signature = env.FILE_SIGNING_SECRET ? await sign(env.FILE_SIGNING_SECRET, payload) : '';
  const base = (env.PUBLIC_SITE_URL || '').replace(/\/$/, '');
  return `${base}/api/file?k=${encodeURIComponent(key)}&e=${expires}&s=${signature}`;
}

async function verifyTurnstile(secret, token, ip) {
  if (!token) return false;
  const body = new FormData();
  body.append('secret', secret);
  body.append('response', token);
  if (ip) body.append('remoteip', ip);
  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body,
  });
  if (!response.ok) return false;
  const result = await response.json();
  return result.success === true;
}

function buildEmail({ name, email, phone, company, service, budget, timeline, description, files, inquiryId, siteUrl }) {
  const formatBytes = (bytes) =>
    bytes < 1024 ? `${bytes} B` : bytes < 1024 * 1024 ? `${Math.round(bytes / 1024)} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

  const fileLines = files.length
    ? files.map((file) => `  • ${file.name} (${formatBytes(file.size)})\n    ${file.link || 'NOT STORED — ask the sender to email the file directly'}`).join('\n')
    : '  (none)';

  const body = [
    `New project inquiry (${inquiryId})`,
    '',
    `Name:      ${name}`,
    `Email:     ${email}`,
    `WhatsApp:  ${phone || '—'}`,
    `Company:   ${company || '—'}`,
    `Service:   ${service || '—'}`,
    `Budget:    ${budget || '—'}`,
    `Timeline:  ${timeline || '—'}`,
    '',
    'Description:',
    description,
    '',
    'Attachments:',
    fileLines,
    '',
    `Submitted from: ${siteUrl}`,
    'Attachment links expire in 7 days. Reply to this email to answer the sender directly.',
  ].join('\n');

  const escape = (value) =>
    String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

  const rows = [
    ['Name', name],
    ['Email', email],
    ['WhatsApp', phone || '—'],
    ['Company', company || '—'],
    ['Service', service || '—'],
    ['Budget', budget || '—'],
    ['Timeline', timeline || '—'],
  ]
    .map(([label, value]) => `<tr><td style="padding:4px 14px 4px 0;color:#6e6878">${label}</td><td style="padding:4px 0;font-weight:600">${escape(value)}</td></tr>`)
    .join('');

  const attachmentRows = files.length
    ? files
        .map(
          (file) =>
            `<li style="margin-bottom:6px">${escape(file.name)} <span style="color:#8a8296">(${formatBytes(file.size)})</span><br>${
              file.link ? `<a href="${escape(file.link)}">Download (expires in 7 days)</a>` : 'Not stored — ask the sender to email the file directly'
            }</li>`,
        )
        .join('')
    : '<li>None</li>';

  const html = `<!doctype html><html><body style="font-family:ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;color:#191624;line-height:1.6">
    <h2 style="margin:0 0 4px;font-size:20px">New project inquiry</h2>
    <p style="margin:0 0 18px;color:#8a8296;font-size:13px">${escape(inquiryId)}</p>
    <table style="border-collapse:collapse;font-size:14px">${rows}</table>
    <h3 style="margin:22px 0 6px;font-size:15px">Description</h3>
    <p style="white-space:pre-wrap;margin:0;font-size:14px">${escape(description)}</p>
    <h3 style="margin:22px 0 6px;font-size:15px">Attachments</h3>
    <ul style="margin:0;padding-left:18px;font-size:14px">${attachmentRows}</ul>
    <p style="margin:22px 0 0;color:#8a8296;font-size:12px">Submitted from ${escape(siteUrl)}. Download links expire after 7 days.</p>
  </body></html>`;

  return {
    subject: `Project inquiry — ${name}${company ? ` · ${company}` : ''}`,
    text: body,
    html,
  };
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const siteUrl = new URL(request.url).origin;

  const length = Number(request.headers.get('content-length') || 0);
  if (length > MAX_BODY_BYTES) return fail(413, 'That submission is too large. Please reduce the attachments and try again.');

  let form;
  try {
    form = await request.formData();
  } catch {
    return fail(400, 'We could not read the form data. Please try again.');
  }

  // Honeypot: real users never fill this hidden field.
  if (text(form.get('website'), 50)) return json(200, { ok: true, id: 'ignored' });

  const name = text(form.get('name'), 120);
  const email = text(form.get('email'), 254);
  const phone = text(form.get('phone'), 40);
  const company = text(form.get('company'), 160);
  const service = text(form.get('service'), 80);
  const budget = text(form.get('budget'), 60);
  const timeline = text(form.get('timeline'), 60);
  const description = text(form.get('description'), 8000);

  const fields = {};
  if (name.length < 2) fields.name = 'Please tell us your name.';
  if (!isEmail(email)) fields.email = 'Please enter a valid email address.';
  if (phone && !isPhone(phone)) fields.phone = 'Please include a country code, for example +31 6 12345678.';
  if (service && !SERVICES.includes(service)) fields.service = 'Please choose one of the listed services.';
  if (budget && !BUDGETS.includes(budget)) fields.budget = 'Please choose one of the listed ranges.';
  if (timeline && !TIMELINES.includes(timeline)) fields.timeline = 'Please choose one of the listed timelines.';
  if (description.length < 20) fields.description = 'Please describe your project in a little more detail (at least 20 characters).';
  if (Object.keys(fields).length) return fail(422, 'Please check the highlighted fields.', fields);

  // Abuse control: five submissions per connection per hour (D1-backed, fails
  // open if the database is unavailable).
  const requesterHash = await ipHash(env, request);
  const limit = await rateLimit(env, `submit-ip:${requesterHash}`, 5, 3600);
  if (!limit.allowed) {
    return json(
      429,
      { ok: false, error: `Too many submissions from this connection. Try again in ${Math.max(1, Math.ceil(limit.retryAfter / 60))} minutes, or email orvanutech@gmail.com.` },
      { 'retry-after': String(limit.retryAfter) },
    );
  }

  // Spam protection.
  const turnstileSecret = env.TURNSTILE_SECRET_KEY;
  if (turnstileSecret) {
    const token = text(form.get('cf-turnstile-response'), 2048);
    const ok = await verifyTurnstile(turnstileSecret, token, request.headers.get('cf-connecting-ip') || '');
    if (!ok) return fail(403, 'Spam check failed. Please refresh the page and try again.');
  } else if (env.MAIL_MODE !== 'console') {
    return fail(503, 'This form is not fully configured yet. Please email us at orvanutech@gmail.com.');
  }

  // Attachments: enforce count, size, extension and real content before storing.
  const uploads = form.getAll('files').filter((entry) => entry instanceof File && entry.size > 0);
  if (uploads.length > MAX_FILES) return fail(422, `Please attach at most ${MAX_FILES} files.`);
  for (const file of uploads) {
    const ext = extensionOf(file.name);
    if (!FILE_TYPES[ext]) return fail(422, `“${file.name}” is not an accepted file type. Use PDF, DOCX, XLSX, PNG or JPG.`);
    if (file.size > MAX_FILE_BYTES) return fail(422, `“${file.name}” is larger than 10 MB.`);
    const head = new Uint8Array(await file.slice(0, 8).arrayBuffer());
    if (!matchesSignature(head, ext)) return fail(422, `“${file.name}” does not look like a valid ${ext.toUpperCase()} file.`);
  }

  const inquiryId = `ORV-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${crypto.randomUUID().slice(0, 8)}`;
  const files = [];
  for (let i = 0; i < uploads.length; i++) {
    const file = uploads[i];
    const ext = extensionOf(file.name);
    const stored = await storeAttachment(env, inquiryId, file, ext, i).catch(() => null);
    files.push({
      name: file.name,
      size: file.size,
      key: stored,
      link: stored ? await privateLink(env, stored) : null,
    });
  }

  const emailContent = buildEmail({
    name, email, phone, company, service, budget, timeline, description, files, inquiryId, siteUrl,
  });

  // Persist before sending: a mail outage must not lose the lead.
  const createdAt = new Date().toISOString();
  let persisted = false;
  if (env.DB) {
    try {
      await env.DB.prepare(
        `INSERT INTO inquiries
           (id, created_at, updated_at, name, email, phone, company, service, budget, timeline,
            description, status, ip_hash, user_agent)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'New', ?, ?)`,
      )
        .bind(
          inquiryId, createdAt, createdAt, name, email, phone || null, company || null,
          service || null, budget || null, timeline || null, description,
          requesterHash, text(request.headers.get('user-agent'), 300) || null,
        )
        .run();

      for (const file of files) {
        if (!file.key) continue;
        await env.DB.prepare(
          `INSERT INTO attachments (id, inquiry_id, r2_key, filename, content_type, size, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
        )
          .bind(
            crypto.randomUUID(), inquiryId, file.key, text(file.name, 200),
            CONTENT_TYPES[extensionOf(file.name)] || 'application/octet-stream', file.size, createdAt,
          )
          .run();
      }
      persisted = true;
    } catch (error) {
      console.error('[inquiry] persistence failed', inquiryId, error?.message);
    }
  }

  let delivery = { ok: false, error: 'not attempted' };

  if (env.MAIL_MODE === 'console') {
    console.log('[inquiry] console mode — email not sent', { inquiryId, to: env.INQUIRY_TO_EMAIL || RECIPIENT_FALLBACK, subject: emailContent.subject });
    console.log(emailContent.text);
    delivery = { ok: true, id: 'console' };
  } else if (!env.RESEND_API_KEY) {
    delivery = { ok: false, error: 'RESEND_API_KEY is not configured' };
  } else {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${env.RESEND_API_KEY}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        from: `ORVANU Inquiries <${env.INQUIRY_FROM_EMAIL || SENDER_FALLBACK}>`,
        to: [env.INQUIRY_TO_EMAIL || RECIPIENT_FALLBACK],
        reply_to: [email],
        subject: emailContent.subject,
        text: emailContent.text,
        html: emailContent.html,
      }),
    }).catch(() => null);

    if (!response || !response.ok) {
      const detail = response ? await response.text().catch(() => '') : 'network error';
      delivery = { ok: false, error: detail.slice(0, 300) || `HTTP ${response ? response.status : 'n/a'}` };
      console.error('[inquiry] email delivery failed', inquiryId, delivery.error);
    } else {
      const result = await response.json().catch(() => ({}));
      delivery = { ok: true, id: result.id };
    }
  }

  if (persisted && env.DB) {
    await env.DB.prepare('UPDATE inquiries SET emailed_at = ?, email_error = ? WHERE id = ?')
      .bind(delivery.ok ? new Date().toISOString() : null, delivery.ok ? null : String(delivery.error).slice(0, 300), inquiryId)
      .run()
      .catch(() => {});
  }

  if (!delivery.ok) {
    // The record is safe in D1, so the customer has been heard even without mail.
    if (persisted) {
      audit(env, { actor: 'form', action: 'email_failed', inquiryId, detail: delivery.error });
      return json(200, { ok: true, id: inquiryId, notified: false });
    }
    if (!env.RESEND_API_KEY) {
      return fail(503, 'This form is not fully configured yet. Please email us at orvanutech@gmail.com.');
    }
    return fail(502, 'We could not deliver your inquiry right now. Please try again, or email orvanutech@gmail.com directly.');
  }

  return json(200, { ok: true, id: inquiryId, notified: true });
}

export async function onRequestGet() {
  return fail(405, 'Use POST to submit an inquiry.');
}
