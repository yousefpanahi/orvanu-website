// POST /api/admin/purge  { days }
//
// Retention control: permanently removes inquiries older than `days`, together
// with their private objects. Minimum 30 days so a mistyped value cannot wipe
// the pipeline.

import { json, fail, requireAdmin, requireSameOrigin, audit, nowIso } from '../../_lib/core.js';

const MIN_DAYS = 30;
const MAX_DAYS = 3650;

export async function onRequestPost({ request, env }) {
  if (!env.DB) return fail(503, 'Inquiry storage is not configured.');
  const blocked = requireSameOrigin(request);
  if (blocked) return blocked;
  const guard = await requireAdmin(env, request);
  if (guard.response) return guard.response;

  let body;
  try {
    body = await request.json();
  } catch {
    return fail(400, 'Invalid request.');
  }

  const days = Math.round(Number(body?.days));
  if (!Number.isFinite(days) || days < MIN_DAYS || days > MAX_DAYS) {
    return fail(422, `Choose between ${MIN_DAYS} and ${MAX_DAYS} days.`);
  }

  const cutoff = new Date(Date.now() - days * 86400000).toISOString();
  const stale = await env.DB.prepare('SELECT id FROM inquiries WHERE created_at < ?').bind(cutoff).all();
  const ids = (stale.results || []).map((row) => row.id);

  let objects = 0;
  for (const id of ids) {
    const rows = await env.DB.prepare('SELECT r2_key FROM attachments WHERE inquiry_id = ?').bind(id).all();
    for (const row of rows.results || []) {
      objects++;
      if (env.INQUIRIES) await env.INQUIRIES.delete(row.r2_key).catch(() => {});
    }
    await env.DB.prepare('DELETE FROM attachments WHERE inquiry_id = ?').bind(id).run();
    await env.DB.prepare('DELETE FROM inquiries WHERE id = ?').bind(id).run();
  }

  // Housekeeping for expired auth artefacts.
  await env.DB.prepare('DELETE FROM admin_sessions WHERE expires_at < ?').bind(nowIso()).run().catch(() => {});
  await env.DB.prepare('DELETE FROM login_codes WHERE expires_at < ?').bind(nowIso()).run().catch(() => {});
  await env.DB.prepare(
    'DELETE FROM rate_limits WHERE window_start < ?',
  )
    .bind(Math.floor(Date.now() / 1000) - 86400)
    .run()
    .catch(() => {});

  audit(env, {
    actor: guard.session.email,
    action: 'purge',
    detail: `${ids.length} inquiry(ies), ${objects} attachment(s) before ${cutoff}`,
  });

  return json(200, { ok: true, removed: ids.length, attachments: objects, cutoff });
}

export async function onRequest() {
  return fail(405, 'Method not allowed.');
}
