// Faqat ommaviy material prefikslariga ruxsat beriladi
const ALLOWED_PREFIXES = ['books/', 'covers/', 'presentations/', 'presentation-covers/'];

// GET /files/<key> — R2 dan fayl uzatish (ommaviy o'qish)
export async function onRequestGet({ params, env, request }) {
  const segments = Array.isArray(params.path) ? params.path : [params.path];
  const key = segments.join('/');
  if (!key || key.includes('..') || !ALLOWED_PREFIXES.some((p) => key.startsWith(p))) {
    return new Response('Not found', { status: 404 });
  }

  const object = await env.BUCKET.get(key);
  if (!object) return new Response('Not found', { status: 404 });

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('etag', object.httpEtag);
  // Muqovalar uzoq, PDF'lar qisqaroq keshlanadi
  headers.set('Cache-Control', key.startsWith('covers/') ? 'public, max-age=31536000, immutable' : 'public, max-age=3600');
  // PDF brauzerda ko'rsatiladi (yuklab olishni emas)
  if ((object.httpMetadata?.contentType || '').includes('pdf')) {
    headers.set('Content-Disposition', 'inline');
  }

  return new Response(object.body, { headers });
}
