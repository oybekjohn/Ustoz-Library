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
