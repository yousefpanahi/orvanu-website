// GET /api/admin/inquiries?q=&status=&sort=&page=&per=
//
// Lists inquiry summaries with search, status filter, sort and pagination,
// plus per-status counts for the dashboard tabs. Session required.

import { json, fail, text, requireAdmin, STATUSES } from '../../_lib/core.js';

const MAX_PER_PAGE = 50;

/** Escapes LIKE wildcards so a search for "100%" behaves literally. */
const likeValue = (value) => `%${value.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;

export async function onRequestGet({ request, env }) {
  if (!env.DB) return fail(503, 'Inquiry storage is not configured.');

  const guard = await requireAdmin(env, request);
  if (guard.response) return guard.response;

  const url = new URL(request.url);
  const q = text(url.searchParams.get('q'), 120);
  const statusParam = text(url.searchParams.get('status'), 20);
  const status = STATUSES.includes(statusParam) ? statusParam : '';
  const direction = url.searchParams.get('sort') === 'oldest' ? 'ASC' : 'DESC';
  const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
  const per = Math.min(MAX_PER_PAGE, Math.max(5, Number(url.searchParams.get('per')) || 25));

  // Clauses are built once and their bindings supplied in the same order to
  // both queries, so count and page can never disagree.
  const searchClause = q
    ? `AND (i.name LIKE ? ESCAPE '\\' OR i.email LIKE ? ESCAPE '\\' OR i.company LIKE ? ESCAPE '\\' OR i.description LIKE ? ESCAPE '\\' OR i.id LIKE ? ESCAPE '\\')`
    : '';
  const searchBindings = q ? [likeValue(q), likeValue(q), likeValue(q), likeValue(q), likeValue(q)] : [];
  const statusClause = status ? 'AND i.status = ?' : '';
  const statusBindings = status ? [status] : [];

  const total = await env.DB.prepare(
    `SELECT COUNT(*) AS n FROM inquiries i WHERE 1 = 1 ${statusClause} ${searchClause}`,
  )
    .bind(...statusBindings, ...searchBindings)
    .first();

  const rows = await env.DB.prepare(
    `SELECT i.id, i.created_at, i.name, i.email, i.company, i.service, i.budget, i.timeline, i.status,
            substr(i.description, 1, 180) AS excerpt,
            (SELECT COUNT(*) FROM attachments a WHERE a.inquiry_id = i.id AND a.deleted_at IS NULL) AS attachment_count
     FROM inquiries i
     WHERE 1 = 1 ${statusClause} ${searchClause}
     ORDER BY i.created_at ${direction}
     LIMIT ? OFFSET ?`,
  )
    .bind(...statusBindings, ...searchBindings, per, (page - 1) * per)
    .all();

  const counts = { New: 0, Contacted: 0, 'In Discussion': 0, Won: 0, Lost: 0, all: 0 };
  const countRows = await env.DB.prepare('SELECT status, COUNT(*) AS n FROM inquiries GROUP BY status').all();
  for (const row of countRows.results || []) {
    if (row.status in counts) counts[row.status] = row.n;
    counts.all += row.n;
  }

  return json(200, {
    ok: true,
    total: total?.n || 0,
    page,
    per,
    pages: Math.max(1, Math.ceil((total?.n || 0) / per)),
    counts,
    items: rows.results || [],
  });
}

export async function onRequest() {
  return fail(405, 'Method not allowed.');
}
