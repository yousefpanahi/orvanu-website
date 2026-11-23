// /api/admin/inquiry
//
//   GET    ?id=ORV-...              full record + attachment metadata
//   PATCH  { id, status }           one of the five workflow statuses
//   DELETE ?id=ORV-...              removes the record and its private objects
//
// Every branch re-checks the session server-side.

import { json, fail, text, requireAdmin, requireSameOrigin, audit, nowIso, STATUSES } from '../../_lib/core.js';

async function loadInquiry(env, id) {
  return env.DB.prepare(
    `SELECT id, created_at, updated_at, name, email, phone, company, service, budget, timeline,
            description, status, status_changed_at, emailed_at, email_error
     FROM inquiries WHERE id = ?`,
  )
    .bind(id)
    .first();
}

async function loadAttachments(env, id) {
  const rows = await env.DB.prepare(
    `SELECT id, filename, content_type, size, created_at, deleted_at
     FROM attachments WHERE inquiry_id = ? ORDER BY created_at`,
  )
    .bind(id)
    .all();
  return rows.results || [];
}

async function deleteObjects(env, id) {
  const rows = await env.DB.prepare('SELECT id, r2_key FROM attachments WHERE inquiry_id = ?').bind(id).all();
  const objects = rows.results || [];
  let removed = 0;
  for (const object of objects) {
    if (env.INQUIRIES) {
      try {
        await env.INQUIRIES.delete(object.r2_key);
        removed++;
      } catch (error) {
        console.error('[admin] object delete failed', object.r2_key, error?.message);
      }
    }
    await env.DB.prepare('UPDATE attachments SET deleted_at = ? WHERE id = ?').bind(nowIso(), object.id).run();
  }
  return { objects: objects.length, removed };
}

export async function onRequestGet({ request, env }) {
  if (!env.DB) return fail(503, 'Inquiry storage is not configured.');
  const guard = await requireAdmin(env, request);
  if (guard.response) return guard.response;

  const id = text(new URL(request.url).searchParams.get('id'), 40);
  if (!id) return fail(422, 'Missing inquiry reference.');

  const inquiry = await loadInquiry(env, id);
  if (!inquiry) return fail(404, 'Inquiry not found.');

  return json(200, { ok: true, inquiry, attachments: await loadAttachments(env, id) });
}

export async function onRequestPatch({ request, env }) {
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

  const id = text(body?.id, 40);
  const status = text(body?.status, 20);
  if (!id) return fail(422, 'Missing inquiry reference.');
  if (!STATUSES.includes(status)) return fail(422, `Status must be one of: ${STATUSES.join(', ')}.`);

  const existing = await env.DB.prepare('SELECT status FROM inquiries WHERE id = ?').bind(id).first();
  if (!existing) return fail(404, 'Inquiry not found.');

  const now = nowIso();
  const result = await env.DB.prepare(
    'UPDATE inquiries SET status = ?, status_changed_at = ?, updated_at = ? WHERE id = ?',
  )
    .bind(status, now, now, id)
    .run();

  if (!result.meta || result.meta.changes === 0) return fail(404, 'Inquiry not found.');

  audit(env, {
    actor: guard.session.email,
    action: 'status_change',
    inquiryId: id,
    detail: `${existing.status} -> ${status}`,
  });

  return json(200, { ok: true, id, status, status_changed_at: now });
}

export async function onRequestDelete({ request, env }) {
  if (!env.DB) return fail(503, 'Inquiry storage is not configured.');
  const blocked = requireSameOrigin(request);
  if (blocked) return blocked;
  const guard = await requireAdmin(env, request);
  if (guard.response) return guard.response;

  const id = text(new URL(request.url).searchParams.get('id'), 40);
  if (!id) return fail(422, 'Missing inquiry reference.');

  const existing = await loadInquiry(env, id);
  if (!existing) return fail(404, 'Inquiry not found.');

  const files = await deleteObjects(env, id);
  await env.DB.prepare('DELETE FROM attachments WHERE inquiry_id = ?').bind(id).run();
  await env.DB.prepare('DELETE FROM inquiries WHERE id = ?').bind(id).run();

  audit(env, {
    actor: guard.session.email,
    action: 'delete',
    inquiryId: id,
    detail: `removed ${files.objects} attachment(s)`,
  });

  return json(200, { ok: true, id, deleted_attachments: files.objects });
}

export async function onRequest() {
  return fail(405, 'Method not allowed.');
}
