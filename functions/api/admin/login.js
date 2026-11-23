// POST /api/admin/login  { email }
//
// Sends a 6-digit sign-in code to an allowlisted admin address. The response is
// deliberately identical for unknown addresses so the endpoint cannot be used
// to discover who has access.

import {
  json,
  fail,
  text,
  isAdminEmail,
  rateLimit,
  sendEmail,
  ipHash,
  randomCode,
  sha256Hex,
  nowIso,
  audit,
  requireSameOrigin,
} from '../../_lib/core.js';

const CODE_TTL_MINUTES = 10;

export async function onRequestPost({ request, env }) {
  const blocked = requireSameOrigin(request);
  if (blocked) return blocked;

  if (!env.DB) return fail(503, 'Sign-in is not configured yet.');

  let body;
  try {
    body = await request.json();
  } catch {
    return fail(400, 'Invalid request.');
  }

  const email = text(body?.email, 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail(422, 'Enter a valid email address.');

  const byIp = await rateLimit(env, `login-ip:${await ipHash(env, request)}`, 5, 900);
  if (!byIp.allowed) return json(429, { ok: false, error: `Too many attempts. Try again in ${Math.ceil(byIp.retryAfter / 60)} minutes.` }, { 'retry-after': String(byIp.retryAfter) });

  const emailKey = await sha256Hex(`${email}|${env.SESSION_SECRET || ''}`);
  const byEmail = await rateLimit(env, `login-mail:${emailKey}`, 5, 3600);
  if (!byEmail.allowed) return json(429, { ok: false, error: 'Too many codes requested. Try again later.' }, { 'retry-after': String(byEmail.retryAfter) });

  // Same response whether or not the address is authorized.
  const generic = { ok: true, message: 'If that address is authorized, a sign-in code is on its way.' };

  if (!isAdminEmail(env, email)) {
    console.warn('[admin] sign-in attempt for non-admin address');
    return json(200, generic);
  }

  const code = randomCode();
  const codeHash = await sha256Hex(`${code}|${email}|${env.SESSION_SECRET || ''}`);
  const createdAt = nowIso();
  const expiresAt = new Date(Date.now() + CODE_TTL_MINUTES * 60 * 1000).toISOString();

  // Only the newest code is valid.
  await env.DB.prepare('UPDATE login_codes SET consumed_at = ? WHERE email = ? AND consumed_at IS NULL')
    .bind(createdAt, email)
    .run();
  await env.DB.prepare(
    'INSERT INTO login_codes (id, email, code_hash, created_at, expires_at, attempts) VALUES (?, ?, ?, ?, ?, 0)',
  )
    .bind(crypto.randomUUID(), email, codeHash, createdAt, expiresAt)
    .run();

  const minutes = CODE_TTL_MINUTES;
  const sent = await sendEmail(env, {
    to: email,
    subject: `Your ORVANU admin code: ${code}`,
    text: [
      `Sign-in code: ${code}`,
      '',
      `This code expires in ${minutes} minutes and can be used once.`,
      'If you did not request it, someone tried to access the ORVANU inquiry dashboard.',
      'No action is needed — the code is useless without it, and nothing is exposed.',
      '',
      'ORVANU — https://orvanu.pages.dev/admin',
    ].join('\n'),
    html: `<div style="font-family:ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;color:#191624">
      <p style="margin:0 0 6px;font-size:13px;color:#8a8296">ORVANU inquiry dashboard</p>
      <p style="margin:0 0 14px;font-size:14px">Your sign-in code:</p>
      <p style="margin:0 0 14px;font-size:30px;font-weight:700;letter-spacing:6px">${code}</p>
      <p style="margin:0 0 14px;font-size:13px;color:#6e6878">Expires in ${minutes} minutes. Single use.</p>
      <p style="margin:0;font-size:12px;color:#8a8296">If you did not request this code, you can ignore this email — nothing has been exposed.</p>
    </div>`,
  });

  if (!sent.ok) {
    console.error('[admin] code delivery failed', sent.error);
    return fail(503, 'We could not send the sign-in code. Try again in a moment.');
  }

  audit(env, { actor: email, action: 'login_code_sent' });
  return json(200, generic);
}

export async function onRequestGet() {
  return fail(405, 'Use POST.');
}
