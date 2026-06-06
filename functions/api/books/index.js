import { ok, error, rowToBook, CATEGORIES, LANGUAGES } from '../../_lib/http.js';
import { requireAuth } from '../../_lib/auth.js';

// GET /api/books — barcha kitoblar (ommaviy)
export async function onRequestGet({ env }) {
  const { results } = await env.DB
    .prepare('SELECT * FROM books ORDER BY created_at DESC, id DESC')
    .all();
  return ok({ books: (results || []).map(rowToBook) });
}

// POST /api/books — yangi kitob (faqat admin)
export async function onRequestPost({ request, env }) {
  const session = await requireAuth(request, env);
  if (!session) return error('Avtorizatsiya talab qilinadi', 401);

  let b;
  try {
    b = await request.json();
  } catch {
    return error("Noto'g'ri so'rov", 400);
  }

  const v = validateBook(b);
  if (v) return error(v, 422);

  const { results } = await env.DB.prepare(`
    INSERT INTO books
      (title_uz, title_ru, title_en, author, year, category, language, pages,
       file_key, cover_key, description_uz, description_ru, description_en)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
    RETURNING *
  `).bind(
    b.title.uz, b.title.ru || null, b.title.en || null,
    b.author, b.year || null, b.category, b.language, b.pages || null,
    b.file_key, b.cover_key || null,
    b.description?.uz || null, b.description?.ru || null, b.description?.en || null
  ).all();

  return ok({ book: rowToBook(results[0]) });
}

export function validateBook(b) {
  if (!b || typeof b !== 'object') return 'Bo\'sh ma\'lumot';
  if (!b.title?.uz?.trim()) return "Kitob nomi (uz) majburiy";
  if (!b.author?.trim()) return 'Muallif majburiy';
  if (!CATEGORIES.includes(b.category)) return 'Kategoriya noto\'g\'ri';
  if (!LANGUAGES.includes(b.language)) return 'Til noto\'g\'ri';
  if (!b.file_key?.trim()) return 'PDF fayl yuklanmagan (file_key yo\'q)';
  if (b.year && (b.year < 1900 || b.year > 2100)) return 'Yil noto\'g\'ri';
  return null;
}
