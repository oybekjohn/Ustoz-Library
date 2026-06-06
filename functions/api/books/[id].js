import { ok, error, rowToBook } from '../../_lib/http.js';
import { requireAuth } from '../../_lib/auth.js';
import { validateBook } from './index.js';

// GET /api/books/:id — bitta kitob (ommaviy)
export async function onRequestGet({ params, env }) {
  const id = parseInt(params.id, 10);
  if (!id) return error('ID noto\'g\'ri', 400);
  const row = await env.DB.prepare('SELECT * FROM books WHERE id = ?').bind(id).first();
  if (!row) return error('Kitob topilmadi', 404);
  return ok({ book: rowToBook(row) });
}

// PUT /api/books/:id — yangilash (faqat admin)
export async function onRequestPut({ request, params, env }) {
  const session = await requireAuth(request, env);
  if (!session) return error('Avtorizatsiya talab qilinadi', 401);

  const id = parseInt(params.id, 10);
  if (!id) return error('ID noto\'g\'ri', 400);

  const existing = await env.DB.prepare('SELECT * FROM books WHERE id = ?').bind(id).first();
  if (!existing) return error('Kitob topilmadi', 404);

  let b;
  try {
    b = await request.json();
  } catch {
    return error("Noto'g'ri so'rov", 400);
  }

  // Fayllar yangilanmasa, eskilari saqlanadi
  b.file_key = b.file_key || existing.file_key;
  b.cover_key = b.cover_key ?? existing.cover_key;

  const v = validateBook(b);
  if (v) return error(v, 422);

  // Yangi fayl yuklangan bo'lsa, eski R2 obyektini o'chiramiz
  const toDelete = [];
  if (b.file_key !== existing.file_key && existing.file_key) toDelete.push(existing.file_key);
  if (b.cover_key !== existing.cover_key && existing.cover_key) toDelete.push(existing.cover_key);

  const { results } = await env.DB.prepare(`
    UPDATE books SET
      title_uz=?, title_ru=?, title_en=?, author=?, year=?, category=?, language=?, pages=?,
      file_key=?, cover_key=?, description_uz=?, description_ru=?, description_en=?,
      updated_at=datetime('now')
    WHERE id=?
    RETURNING *
  `).bind(
    b.title.uz, b.title.ru || null, b.title.en || null,
    b.author, b.year || null, b.category, b.language, b.pages || null,
    b.file_key, b.cover_key || null,
    b.description?.uz || null, b.description?.ru || null, b.description?.en || null,
    id
  ).all();

  for (const key of toDelete) {
    try { await env.BUCKET.delete(key); } catch { /* e'tiborsiz */ }
  }

  return ok({ book: rowToBook(results[0]) });
}

// DELETE /api/books/:id — o'chirish (faqat admin)
export async function onRequestDelete({ request, params, env }) {
  const session = await requireAuth(request, env);
  if (!session) return error('Avtorizatsiya talab qilinadi', 401);

  const id = parseInt(params.id, 10);
  if (!id) return error('ID noto\'g\'ri', 400);

  const row = await env.DB.prepare('SELECT * FROM books WHERE id = ?').bind(id).first();
  if (!row) return error('Kitob topilmadi', 404);

  await env.DB.prepare('DELETE FROM books WHERE id = ?').bind(id).run();

  // R2 fayllarini ham o'chiramiz
  for (const key of [row.file_key, row.cover_key]) {
    if (key) { try { await env.BUCKET.delete(key); } catch { /* e'tiborsiz */ } }
  }

  return ok({ deleted: id });
}
