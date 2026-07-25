import { CATEGORIES, LANGUAGES, rowToBook } from './http.js';

export function validateBook(book) {
  if (!book || typeof book !== 'object') return "Bo'sh ma'lumot";
  if (!book.title?.uz?.trim()) return 'Kitob nomi (uz) majburiy';
  if (!book.author?.trim()) return 'Muallif majburiy';
  if (!CATEGORIES.includes(book.category)) return "Kategoriya noto'g'ri";
  if (!LANGUAGES.includes(book.language)) return "Til noto'g'ri";
  if (!book.file_key?.trim()) return "PDF fayl yuklanmagan (file_key yo'q)";
  if (book.year && (book.year < 1900 || book.year > 2100)) return "Yil noto'g'ri";
  if (book.pages && (!Number.isInteger(book.pages) || book.pages < 1)) return "Sahifalar soni noto'g'ri";
  return null;
}

export async function createBook(env, book) {
  const validationError = validateBook(book);
  if (validationError) throw new Error(validationError);

  const { results } = await env.DB.prepare(`
    INSERT INTO books
      (title_uz, title_ru, title_en, author, year, category, language, pages,
       file_key, cover_key, description_uz, description_ru, description_en)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
    RETURNING *
  `).bind(
    book.title.uz,
    book.title.ru || null,
    book.title.en || null,
    book.author,
    book.year || null,
    book.category,
    book.language,
    book.pages || null,
    book.file_key,
    book.cover_key || null,
    book.description?.uz || null,
    book.description?.ru || null,
    book.description?.en || null,
  ).all();

  return rowToBook(results[0]);
}

export function rowToStoredBook(row) {
  if (!row) return null;
  return {
    ...rowToBook(row),
    file_key: row.file_key,
    cover_key: row.cover_key || null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function getBook(env, id) {
  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId < 1) return null;
  const row = await env.DB.prepare('SELECT * FROM books WHERE id = ?')
    .bind(numericId)
    .first();
  return rowToStoredBook(row);
}

export async function listBooks(env, { page = 0, pageSize = 6, query = '' } = {}) {
  const safePage = Math.max(0, Number.isInteger(page) ? page : 0);
  const safePageSize = Math.min(10, Math.max(1, Number.isInteger(pageSize) ? pageSize : 6));
  const offset = safePage * safePageSize;
  const search = String(query || '').trim().slice(0, 120);

  let totalRow;
  let rows;
  if (search) {
    const like = `%${search}%`;
    totalRow = await env.DB.prepare(`
      SELECT COUNT(*) AS total
      FROM books
      WHERE CAST(id AS TEXT) = ? OR title_uz LIKE ? OR title_ru LIKE ? OR title_en LIKE ? OR author LIKE ?
    `).bind(search, like, like, like, like).first();
    ({ results: rows = [] } = await env.DB.prepare(`
      SELECT *
      FROM books
      WHERE CAST(id AS TEXT) = ? OR title_uz LIKE ? OR title_ru LIKE ? OR title_en LIKE ? OR author LIKE ?
      ORDER BY created_at DESC, id DESC
      LIMIT ? OFFSET ?
    `).bind(search, like, like, like, like, safePageSize, offset).all());
  } else {
    totalRow = await env.DB.prepare('SELECT COUNT(*) AS total FROM books').first();
    ({ results: rows = [] } = await env.DB.prepare(`
      SELECT *
      FROM books
      ORDER BY created_at DESC, id DESC
      LIMIT ? OFFSET ?
    `).bind(safePageSize, offset).all());
  }

  return {
    books: rows.map(rowToStoredBook),
    page: safePage,
    pageSize: safePageSize,
    total: Number(totalRow?.total || 0),
  };
}

export async function updateBook(env, id, book) {
  const existing = await getBook(env, id);
  if (!existing) throw new Error('Kitob topilmadi');

  const merged = {
    ...existing,
    ...book,
    title: { ...existing.title, ...(book.title || {}) },
    description: { ...existing.description, ...(book.description || {}) },
    file_key: book.file_key || existing.file_key,
    cover_key: book.cover_key === undefined ? existing.cover_key : book.cover_key,
    language: book.language || existing.language || 'uz',
  };
  const validationError = validateBook(merged);
  if (validationError) throw new Error(validationError);

  const { results = [] } = await env.DB.prepare(`
    UPDATE books SET
      title_uz=?, title_ru=?, title_en=?, author=?, year=?, category=?, language=?, pages=?,
      file_key=?, cover_key=?, description_uz=?, description_ru=?, description_en=?,
      updated_at=datetime('now')
    WHERE id=?
    RETURNING *
  `).bind(
    merged.title.uz,
    merged.title.ru || null,
    merged.title.en || null,
    merged.author,
    merged.year || null,
    merged.category,
    merged.language,
    merged.pages || null,
    merged.file_key,
    merged.cover_key || null,
    merged.description.uz || null,
    merged.description.ru || null,
    merged.description.en || null,
    Number(id),
  ).all();

  return {
    book: rowToStoredBook(results[0]),
    replacedKeys: [
      merged.file_key !== existing.file_key ? existing.file_key : null,
      merged.cover_key !== existing.cover_key ? existing.cover_key : null,
    ].filter(Boolean),
  };
}

export async function deleteBook(env, id) {
  const existing = await getBook(env, id);
  if (!existing) throw new Error('Kitob topilmadi');
  await env.DB.prepare('DELETE FROM books WHERE id = ?').bind(Number(id)).run();
  return {
    book: existing,
    deletedKeys: [existing.file_key, existing.cover_key].filter(Boolean),
  };
}
