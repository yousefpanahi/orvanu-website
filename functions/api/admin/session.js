// GET  /api/admin/session  -> { ok, authenticated, email? }
// POST /api/admin/logout   -> revokes the session row and clears the cookie

import {
  json,
  fail,
  requireAdmin,
  readCookie,
  sha256Hex,
  nowIso,
  audit,
  requireSameOrigin,
  sessionCookie,
  adminSession,
  SESSION_COOKIE,
} from '../../_lib/core.js';

export async function onRequestGet({ request, env }) {
  const session = await adminSession(env, request);
  if (!session) return json(401, { ok: false, authenticated: false });
  return json(200, { ok: true, authenticated: true, email: session.email });
}

export async function onRequestPost({ request, env }) {
  const blocked = requireSameOrigin(request);
  if (blocked) return blocked;

  const guard = await requireAdmin(env, request);
  if (guard.response) return guard.response;

  const token = readCookie(request, SESSION_COOKIE);
  if (token && env.DB) {
    const idHash = await sha256Hex(`${token}|${env.SESSION_SECRET || ''}`);
    await env.DB.prepare('UPDATE admin_sessions SET revoked_at = ? WHERE id_hash = ?')
      .bind(nowIso(), idHash)
      .run();
  }

  audit(env, { actor: guard.session.email, action: 'logout' });
  return json(200, { ok: true }, { 'set-cookie': sessionCookie('', 0, new URL(request.url).protocol === 'https:') });
}

export async function onRequest() {
  return fail(405, 'Method not allowed.');
}
