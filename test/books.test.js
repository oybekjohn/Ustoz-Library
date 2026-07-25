import test from 'node:test';
import assert from 'node:assert/strict';

import {
  deleteBook,
  getBook,
  updateBook,
  validateBook,
} from '../functions/_lib/books.js';

function validBook() {
  return {
    title: { uz: 'Test kitob' },
    author: 'Test muallif',
    year: 2026,
    pages: 100,
    category: 'it',
    language: 'uz',
    file_key: 'books/test.pdf',
  };
}

test('to\'liq kitob validatsiyadan o\'tadi', () => {
  assert.equal(validateBook(validBook()), null);
});

test('kategoriya va sahifa soni tekshiriladi', () => {
  assert.match(validateBook({ ...validBook(), category: 'unknown' }), /Kategoriya/);
  assert.match(validateBook({ ...validBook(), pages: -1 }), /Sahifalar/);
});

class FakeBooksDB {
  constructor() {
    this.row = {
      id: 7,
      title_uz: 'Eski nom',
      title_ru: '',
      title_en: '',
      author: 'Muallif',
      year: 2020,
      category: 'it',
      language: 'uz',
      pages: 100,
      file_key: 'books/old.pdf',
      cover_key: 'covers/old.jpg',
      description_uz: '',
      description_ru: '',
      description_en: '',
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
    };
  }

  prepare(sql) {
    const database = this;
    return {
      bind(...values) {
        return {
          async first() {
            if (sql.includes('SELECT * FROM books WHERE id = ?')) {
              return database.row && database.row.id === Number(values[0]) ? { ...database.row } : null;
            }
            throw new Error(`Unexpected first query: ${sql}`);
          },
          async all() {
            if (!sql.includes('UPDATE books SET')) throw new Error(`Unexpected all query: ${sql}`);
            const [
              titleUz,
              titleRu,
              titleEn,
              author,
              year,
              category,
              language,
              pages,
              fileKey,
              coverKey,
              descriptionUz,
              descriptionRu,
              descriptionEn,
            ] = values;
            database.row = {
              ...database.row,
              title_uz: titleUz,
              title_ru: titleRu,
              title_en: titleEn,
              author,
              year,
              category,
              language,
              pages,
              file_key: fileKey,
              cover_key: coverKey,
              description_uz: descriptionUz,
              description_ru: descriptionRu,
              description_en: descriptionEn,
            };
            return { results: [{ ...database.row }] };
          },
          async run() {
            if (!sql.includes('DELETE FROM books')) throw new Error(`Unexpected run query: ${sql}`);
            database.row = null;
            return { success: true };
          },
        };
      },
    };
  }
}

test('kitob CRUD PDF va muqova kalitlarini xavfsiz almashtiradi va o\'chiradi', async () => {
  const DB = new FakeBooksDB();
  const env = { DB };

  const existing = await getBook(env, 7);
  assert.equal(existing.title.uz, 'Eski nom');

  const updated = await updateBook(env, 7, {
    title: { uz: 'Yangi nom' },
    cover_key: 'covers/new.jpg',
  });
  assert.equal(updated.book.title.uz, 'Yangi nom');
  assert.deepEqual(updated.replacedKeys, ['covers/old.jpg']);

  const deleted = await deleteBook(env, 7);
  assert.deepEqual(deleted.deletedKeys, ['books/old.pdf', 'covers/new.jpg']);
  assert.equal(await getBook(env, 7), null);
});
