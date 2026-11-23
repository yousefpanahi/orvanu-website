// POST /api/admin/verify  { email, code }
//
// Exchanges a valid one-time code for a session cookie. The cookie holds a
// random 256-bit token; the database stores only its salted hash, so a copy of
// the database cannot be replayed as a login.

import {
  json,
  fail,
  text,
  isAdminEmail,
  rateLimit,
  ipHash,
  randomToken,
  sha256Hex,
  nowIso,
  audit,
  requireSameOrigin,
  sessionCookie,
  SESSION_TTL_SECONDS,
} from '../../_lib/core.js';

const MAX_ATTEMPTS = 5;

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
  const code = text(body?.code, 12).replace(/\s/g, '');
  if (!email || !/^\d{6}$/.test(code)) return fail(422, 'Enter the six-digit code from your email.');

  const byIp = await rateLimit(env, `verify-ip:${await ipHash(env, request)}`, 10, 900);
  if (!byIp.allowed) return json(429, { ok: false, error: 'Too many attempts. Wait a few minutes and try again.' });

  if (!isAdminEmail(env, email)) return fail(401, 'That code is not valid.');

  const row = await env.DB.prepare(
    `SELECT id, code_hash, expires_at, attempts FROM login_codes
     WHERE email = ? AND consumed_at IS NULL
     ORDER BY created_at DESC LIMIT 1`,
  )
    .bind(email)
    .first();

  if (!row) return fail(400, 'No code is waiting for this address. Request a new one.');
  if (Date.parse(row.expires_at) <= Date.now()) {
    await env.DB.prepare('UPDATE login_codes SET consumed_at = ? WHERE id = ?').bind(nowIso(), row.id).run();
    return fail(400, 'That code has expired. Request a new one.');
  }
  if (row.attempts >= MAX_ATTEMPTS) {
    await env.DB.prepare('UPDATE login_codes SET consumed_at = ? WHERE id = ?').bind(nowIso(), row.id).run();
    return fail(429, 'Too many incorrect attempts. Request a new code.');
  }

  const expected = await sha256Hex(`${code}|${email}|${env.SESSION_SECRET || ''}`);
  if (expected !== row.code_hash) {
    await env.DB.prepare('UPDATE login_codes SET attempts = attempts + 1 WHERE id = ?').bind(row.id).run();
    return fail(401, 'That code is not valid.');
  }

  // Single use.
  await env.DB.prepare('UPDATE login_codes SET consumed_at = ? WHERE id = ?').bind(nowIso(), row.id).run();
  await env.DB.prepare('DELETE FROM login_codes WHERE email = ? AND consumed_at IS NOT NULL').bind(email).run();

  const token = randomToken(32);
  const idHash = await sha256Hex(`${token}|${env.SESSION_SECRET || ''}`);
  const createdAt = nowIso();
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000).toISOString();

  await env.DB.prepare(
    'INSERT INTO admin_sessions (id_hash, email, created_at, expires_at, ip_hash) VALUES (?, ?, ?, ?, ?)',
  )
    .bind(idHash, email, createdAt, expiresAt, await ipHash(env, request))
    .run();

  // Housekeeping: drop sessions that can no longer be used.
  await env.DB.prepare('DELETE FROM admin_sessions WHERE expires_at < ?').bind(createdAt).run().catch(() => {});

  audit(env, { actor: email, action: 'login' });

  return json(
    200,
    { ok: true, email, expires_at: expiresAt },
    { 'set-cookie': sessionCookie(token, SESSION_TTL_SECONDS, new URL(request.url).protocol === 'https:') },
  );
}

export async function onRequestGet() {
  return fail(405, 'Use POST.');
}
