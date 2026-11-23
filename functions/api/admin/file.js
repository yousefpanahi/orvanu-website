// GET /api/admin/file?id=<attachment id>
//
// Authenticated download of a privately stored attachment. No public URL exists
// for these objects; this endpoint is the only path that does not rely on an
// emailed signed link.

import { json, fail, text, requireAdmin, audit } from '../../_lib/core.js';

export async function onRequestGet({ request, env }) {
  if (!env.DB) return fail(503, 'Attachment storage is not configured.');
  const guard = await requireAdmin(env, request);
  if (guard.response) return guard.response;

  const id = text(new URL(request.url).searchParams.get('id'), 60);
  if (!id) return fail(422, 'Missing attachment reference.');

  const row = await env.DB.prepare(
    'SELECT id, inquiry_id, r2_key, filename, content_type, size, deleted_at FROM attachments WHERE id = ?',
  )
    .bind(id)
    .first();

  if (!row || row.deleted_at) return fail(404, 'Attachment not found.');
  if (!env.INQUIRIES) return fail(503, 'Attachment storage is not available.');

  const object = await env.INQUIRIES.get(row.r2_key);
  if (!object) return fail(404, 'Attachment not found.');

  const filename = (row.filename || 'attachment').replace(/["\\\r\n]/g, '');
  const headers = new Headers({
    'content-type': row.content_type || 'application/octet-stream',
    'content-disposition': `attachment; filename="${filename}"`,
    'cache-control': 'private, no-store',
    'x-content-type-options': 'nosniff',
    'content-security-policy': "default-src 'none'; sandbox",
    'referrer-policy': 'no-referrer',
  });
  if (object.size) headers.set('content-length', String(object.size));

  audit(env, { actor: guard.session.email, action: 'download', inquiryId: row.inquiry_id, detail: row.filename });

  return new Response(object.body, { headers });
}

export async function onRequest() {
  return fail(405, 'Method not allowed.');
}
