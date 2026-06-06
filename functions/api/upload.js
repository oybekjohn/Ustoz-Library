import { ok, error } from '../_lib/http.js';
import { requireAuth } from '../_lib/auth.js';

const LIMITS = {
  pdf: { max: 50 * 1024 * 1024, mimes: ['application/pdf'], dir: 'books', ext: 'pdf' },
  cover: { max: 8 * 1024 * 1024, mimes: ['image/png', 'image/jpeg', 'image/webp'], dir: 'covers', ext: null },
};

function slug(name) {
  return (name || 'fayl')
    .normalize('NFKD').replace(/[^\w.\- ]+/g, '')
    .trim().replace(/\s+/g, '_').toLowerCase().slice(0, 60);
}

function extFromMime(mime) {
  return { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'application/pdf': 'pdf' }[mime] || 'bin';
}

// POST /api/upload  (multipart: file, type=pdf|cover) — faqat admin
export async function onRequestPost({ request, env }) {
  const session = await requireAuth(request, env);
  if (!session) return error('Avtorizatsiya talab qilinadi', 401);

  let form;
  try {
    form = await request.formData();
  } catch {
    return error('multipart/form-data kutilgan', 400);
  }

  const file = form.get('file');
  const type = form.get('type');
  if (!file || typeof file === 'string') return error('Fayl yo\'q', 400);
  const rule = LIMITS[type];
  if (!rule) return error('type pdf yoki cover bo\'lishi kerak', 400);

  if (file.size > rule.max) {
    return error(`Fayl juda katta (maks ${Math.round(rule.max / 1024 / 1024)}MB)`, 413);
  }
  if (rule.mimes.length && !rule.mimes.includes(file.type)) {
    return error(`Fayl turi noto'g'ri: ${file.type}`, 415);
  }

  const ext = rule.ext || extFromMime(file.type);
  const base = slug(file.name.replace(/\.[^.]+$/, ''));
  const key = `${rule.dir}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}-${base}.${ext}`;

  await env.BUCKET.put(key, file.stream(), {
    httpMetadata: { contentType: file.type },
  });

  return ok({ key, size: file.size, contentType: file.type });
}
