import test from 'node:test';
import assert from 'node:assert/strict';

import { validateBook } from '../functions/_lib/books.js';

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
