// Shared helpers for the admin API. Not a route (underscore directory).
//
// Conventions used across functions/api/admin/*:
//   - Every handler returns JSON with { ok } and `cache-control: no-store`.
//   - Authorization is resolved from the D1 session row on every request; no
//     claim in the cookie is trusted and nothing is read from the client.
//   - Secrets live in env / bindings only.

export const STATUSES = ['New', 'Contacted', 'In Discussion', 'Won', 'Lost'];

export const SESSION_COOKIE = 'orv_admin';
export const SESSION_TTL_SECONDS = 12 * 60 * 60;

export const nowIso = () => new Date().toISOString();

/* ------------------------------ responses ------------------------------ */

export function json(status, payload, extraHeaders) {
  const headers = new Headers({
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
    'referrer-policy': 'no-referrer',
  });
  if (extraHeaders) {
    for (const [key, value] of Object.entries(extraHeaders)) headers.append(key, value);
  }
  return new Response(JSON.stringify(payload), { status, headers });
}

export const fail = (status, error, fields) => json(status, fields ? { ok: false, error, fields } : { ok: false, error });

/* ------------------------------ primitives ----------------------------- */

export function base64url(bytes) {
  let binary = '';
  for (const byte of new Uint8Array(bytes)) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function randomToken(byteLength = 32) {
  return base64url(crypto.getRandomValues(new Uint8Array(byteLength)));
}

/** 6-digit numeric code, uniformly distributed. */
export function randomCode() {
  const buffer = new Uint32Array(1);
  crypto.getRandomValues(buffer);
  return String(buffer[0] % 1000000).padStart(6, '0');
}

export async function sha256Hex(value) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function timingSafeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export const text = (value, max) => String(value ?? '').trim().slice(0, max);

const secret = (env, key) => env[key] || '';

/* ------------------------------- cookies ------------------------------- */

export function readCookie(request, name) {
  const header = request.headers.get('cookie') || '';
  for (const part of header.split(';')) {
    const index = part.indexOf('=');
    if (index < 0) continue;
    if (part.slice(0, index).trim() === name) return decodeURIComponent(part.slice(index + 1).trim());
  }
  return '';
}

export function sessionCookie(value, maxAge, secure) {
  const parts = [
    `${SESSION_COOKIE}=${encodeURIComponent(value)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Strict',
    `Max-Age=${maxAge}`,
  ];
  if (secure) parts.push('Secure');
  return parts.join('; ');
}

/* ------------------------------- identity ------------------------------ */

export function isAdminEmail(env, email) {
  const list = String(env.ADMIN_EMAILS || '')
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(String(email || '').trim().toLowerCase());
}

export function ipHash(env, request) {
  const ip = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || 'unknown';
  // Salted so a leaked hash cannot be reversed by brute force over IPv4 space.
  return sha256Hex(`${ip}|${secret(env, 'SESSION_SECRET')}`);
}

/** Resolves the request's session against D1. Returns { email } or null. */
export async function adminSession(env, request) {
  if (!env.DB) return null;
  const raw = readCookie(request, SESSION_COOKIE);
  if (!raw || raw.length < 20) return null;

  const idHash = await sha256Hex(`${raw}|${secret(env, 'SESSION_SECRET')}`);
  const row = await env.DB.prepare(
    'SELECT email, expires_at, revoked_at FROM admin_sessions WHERE id_hash = ?',
  )
    .bind(idHash)
    .first();

  if (!row || row.revoked_at) return null;
  if (Date.parse(row.expires_at) <= Date.now()) return null;
  return { email: row.email };
}

/** Guard for protected handlers: returns a session or a 401 Response. */
export async function requireAdmin(env, request) {
  const session = await adminSession(env, request);
  if (!session) return { response: fail(401, 'Sign in to continue.') };
  return { session };
}

/** Mutations must carry this header, which a cross-site form cannot set. */
export function requireSameOrigin(request) {
  if (request.headers.get('x-orvanu-admin') !== '1') {
    return fail(403, 'Request rejected.');
  }
  return null;
}

/* ------------------------------ rate limit ----------------------------- */

/**
 * Fixed-window counter in D1. Returns { allowed, retryAfter }.
 * Fails open when D1 is unavailable so a database hiccup cannot lock the form.
 */
export async function rateLimit(env, key, limit, windowSeconds) {
  if (!env.DB) return { allowed: true, retryAfter: 0 };
  const windowStart = Math.floor(Date.now() / 1000 / windowSeconds) * windowSeconds;

  try {
    const row = await env.DB.prepare(
      `INSERT INTO rate_limits (key, window_start, count) VALUES (?, ?, 1)
       ON CONFLICT(key) DO UPDATE SET
         count = CASE WHEN window_start = excluded.window_start THEN count + 1 ELSE 1 END,
         window_start = excluded.window_start
       RETURNING count, window_start`,
    )
      .bind(key, windowStart)
      .first();

    if (!row) return { allowed: true, retryAfter: 0 };
    return {
      allowed: row.count <= limit,
      retryAfter: Math.max(1, row.window_start + windowSeconds - Math.floor(Date.now() / 1000)),
    };
  } catch {
    return { allowed: true, retryAfter: 0 };
  }
}

/* -------------------------------- email -------------------------------- */

/**
 * Sends mail through Resend. Returns { ok, id?, error? }.
 * In MAIL_MODE=console the message is logged instead (local development).
 */
export async function sendEmail(env, { to, subject, text: body, html, replyTo }) {
  if (env.MAIL_MODE === 'console') {
    console.log('[mail:console]', JSON.stringify({ to, subject }));
    console.log(body);
    return { ok: true, id: 'console' };
  }

  if (!env.RESEND_API_KEY) return { ok: false, error: 'RESEND_API_KEY is not configured' };

  const payload = {
    from: `ORVANU Inquiries <${env.INQUIRY_FROM_EMAIL || 'onboarding@resend.dev'}>`,
    to: Array.isArray(to) ? to : [to],
    subject,
    text: body,
    ...(html ? { html } : {}),
    ...(replyTo ? { reply_to: [replyTo] } : {}),
  };

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${env.RESEND_API_KEY}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(payload),
  }).catch(() => null);

  if (!response || !response.ok) {
    const detail = response ? await response.text().catch(() => '') : 'network error';
    return { ok: false, error: detail.slice(0, 300) || `HTTP ${response ? response.status : 'n/a'}` };
  }

  const result = await response.json().catch(() => ({}));
  return { ok: true, id: result.id };
}

/* -------------------------------- audit -------------------------------- */

export function audit(env, { actor, action, inquiryId, detail }) {
  if (!env.DB) return;
  env.DB.prepare('INSERT INTO audit_log (id, at, actor, action, inquiry_id, detail) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(crypto.randomUUID(), nowIso(), actor, action, inquiryId || null, detail ? String(detail).slice(0, 500) : null)
    .run()
    .catch((error) => console.error('[audit] write failed', error?.message));
}

/* ------------------------------- html util ----------------------------- */

export const escapeHtml = (value) =>
  String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
