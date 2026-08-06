import { ok, error } from '../_lib/http.js';
import { requireAuth } from '../_lib/auth.js';
import { createStorageKey, putObject } from '../_lib/storage.js';
import { inspectPdfFirstPages } from '../_lib/pdf.js';

const LIMITS = {
  pdf: { max: 50 * 1024 * 1024, mimes: ['application/pdf'], dir: 'books', ext: 'pdf' },
  cover: { max: 8 * 1024 * 1024, mimes: ['image/png', 'image/jpeg', 'image/webp'], dir: 'covers', ext: null },
  presentation: { max: 50 * 1024 * 1024, mimes: ['application/pdf'], dir: 'presentations', ext: 'pdf' },
  'presentation-cover': { max: 8 * 1024 * 1024, mimes: ['image/png', 'image/jpeg', 'image/webp'], dir: 'presentation-covers', ext: null },
};

// POST /api/upload  (multipart: file, type=pdf|cover|presentation|presentation-cover) - faqat admin
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

  let pageCount = null;
  let uploadBody = file.stream();
  if (type === 'presentation') {
    const bytes = await file.arrayBuffer();
    const inspected = await inspectPdfFirstPages(bytes, 1);
    pageCount = inspected.pageCount;
    uploadBody = bytes;
  }

  const key = createStorageKey(rule.dir, file.name, file.type);
  await putObject(env.BUCKET, key, uploadBody, file.type);

  return ok({ key, size: file.size, contentType: file.type, pageCount });
}

