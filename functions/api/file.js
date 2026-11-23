// GET /api/file?k=<r2 key>&e=<unix expiry>&s=<hmac signature>
//
// Serves a privately stored inquiry attachment. Objects are never publicly
// listable or guessable: the link carries an expiry plus an HMAC signature that
// only the server can produce (FILE_SIGNING_SECRET).

const json = (status, payload) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });

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

function timingSafeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const key = url.searchParams.get('k') || '';
  const expires = Number(url.searchParams.get('e') || 0);
  const signature = url.searchParams.get('s') || '';

  if (!key || !expires || !signature) return json(400, { ok: false, error: 'Missing link parameters.' });
  if (!key.startsWith('inquiries/')) return json(400, { ok: false, error: 'Invalid attachment reference.' });
  if (!env.FILE_SIGNING_SECRET) return json(503, { ok: false, error: 'Attachments are not configured.' });
  if (Date.now() / 1000 > expires) return json(410, { ok: false, error: 'This attachment link has expired.' });

  const expected = await sign(env.FILE_SIGNING_SECRET, `${key}.${expires}`);
  if (!timingSafeEqual(expected, signature)) return json(403, { ok: false, error: 'This attachment link is not valid.' });

  if (!env.INQUIRIES) return json(404, { ok: false, error: 'Attachment storage is not available.' });

  const object = await env.INQUIRIES.get(key);
  if (!object) return json(404, { ok: false, error: 'Attachment not found.' });

  const filename = object.customMetadata?.originalName || key.split('/').pop() || 'attachment';
  const headers = new Headers({
    'content-type': object.httpMetadata?.contentType || 'application/octet-stream',
    'content-disposition': `attachment; filename="${filename.replace(/["\\\r\n]/g, '')}"`,
    'cache-control': 'private, no-store',
    'x-content-type-options': 'nosniff',
    'content-security-policy': "default-src 'none'; sandbox",
  });
  if (object.size) headers.set('content-length', String(object.size));

  return new Response(object.body, { headers });
}
