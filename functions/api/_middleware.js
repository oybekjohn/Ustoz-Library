/**
 * /api/* uchun umumiy middleware:
 *  1. Rate limiting:
 *     - xotirada (isolate darajasida) tezkor limit: o'qish 120/min, yozish 30/min, IP bo'yicha
 *     - login uchun D1 asosidagi qat'iy limit: 10 urinish / 10 daqiqa, IP bo'yicha
 *  2. API javoblariga xavfsizlik headerlari.
 *
 * Eslatma: xotiradagi hisoblagich har bir Workers isolate uchun alohida —
 * bu qat'iy kafolat emas, lekin burst hujumlarni arzon usulda sekinlashtiradi.
 * Tarmoq darajasidagi himoya Cloudflare WAF/Bot Fight Mode tomonidan beriladi.
 */

const WINDOW_MS = 60_000;
const READ_LIMIT = 120;
const WRITE_LIMIT = 30;

const LOGIN_WINDOW_SECONDS = 600;
const LOGIN_MAX_ATTEMPTS = 10;

// So'rov tanasining maksimal hajmi (fayl yuklashdan tashqari).
// Content-Length yo'q bo'lsa tekshirilmaydi — bunday holda endpointning
// o'z cheklovlari ishlaydi.
const MAX_JSON_BODY_BYTES = 256 * 1024;
const UPLOAD_PATHS = ['/api/upload', '/api/ai/analyze'];

// isolate darajasidagi hisoblagichlar: key -> { windowStart, count }
const memoryBuckets = new Map();

function clientIp(request) {
  return request.headers.get('CF-Connecting-IP')
    || request.headers.get('X-Forwarded-For')?.split(',')[0].trim()
    || 'unknown';
}

function memoryAllow(key, limit) {
  const now = Date.now();
  const bucket = memoryBuckets.get(key);
  if (!bucket || now - bucket.windowStart >= WINDOW_MS) {
    memoryBuckets.set(key, { windowStart: now, count: 1 });
    return true;
  }
  bucket.count += 1;
  if (memoryBuckets.size > 10_000) memoryBuckets.clear(); // xotira himoyasi
  return bucket.count <= limit;
}

async function d1Allow(env, bucketKey, windowSeconds, maxCount) {
  try {
    const now = Math.floor(Date.now() / 1000);
    const windowStart = now - (now % windowSeconds);
    const row = await env.DB.prepare(`
      INSERT INTO rate_limits (bucket, window_start, count) VALUES (?, ?, 1)
      ON CONFLICT(bucket) DO UPDATE SET
        count = CASE WHEN rate_limits.window_start = excluded.window_start
                     THEN rate_limits.count + 1 ELSE 1 END,
        window_start = excluded.window_start,
        updated_at = datetime('now')
      RETURNING count
    `).bind(bucketKey, windowStart).first();
    return (row?.count || 1) <= maxCount;
  } catch {
    // rate_limits jadvali hali yaratilmagan bo'lsa — bloklamaymiz
    return true;
  }
}

function tooManyRequests(message) {
  return new Response(JSON.stringify({ ok: false, error: message }), {
    status: 429,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Retry-After': '60',
    },
  });
}

export async function onRequest(context) {
  const { request, env, next } = context;
  const method = request.method.toUpperCase();
  const url = new URL(request.url);
  const ip = clientIp(request);

  const isWrite = !['GET', 'HEAD', 'OPTIONS'].includes(method);
  if (!memoryAllow(`${ip}:${isWrite ? 'w' : 'r'}`, isWrite ? WRITE_LIMIT : READ_LIMIT)) {
    return tooManyRequests("So'rovlar soni juda ko'p. Bir daqiqadan so'ng urinib ko'ring.");
  }

  // Katta JSON tanalar bilan xotirani to'ldirish urinishini to'samiz.
  // Fayl yuklaydigan endpointlar o'z hajm cheklovlariga ega.
  if (isWrite && !UPLOAD_PATHS.some((p) => url.pathname.startsWith(p))) {
    const declaredLength = Number(request.headers.get('Content-Length') || 0);
    if (declaredLength > MAX_JSON_BODY_BYTES) {
      return new Response(JSON.stringify({ ok: false, error: "So'rov hajmi juda katta" }), {
        status: 413,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      });
    }
  }

  if (url.pathname === '/api/auth/login' && method === 'POST') {
    const allowed = await d1Allow(env, `login:${ip}`, LOGIN_WINDOW_SECONDS, LOGIN_MAX_ATTEMPTS);
    if (!allowed) {
      return tooManyRequests("Login urinishlari soni oshib ketdi. 10 daqiqadan so'ng urinib ko'ring.");
    }
  }

  const response = await next();

  const headers = new Headers(response.headers);
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  headers.set('X-Frame-Options', 'SAMEORIGIN');
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
