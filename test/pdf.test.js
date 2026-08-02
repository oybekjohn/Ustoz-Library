import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { createFirstPagesPdf, inspectPdfFirstPages } from '../functions/_lib/pdf.js';

test('PDF helper sahifa soni va birinchi sahifalar matnini oladi', async () => {
  const buffer = await readFile('books/kitob1 monografiya.pdf');
  const result = await inspectPdfFirstPages(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength), 2);

  assert.equal(result.pageCount, 508);
  assert.match(result.firstPagesText, /RENESSANS TA'LIM UNIVERSITETI|RENESSANS TA’LIM UNIVERSITETI/);
});

test('Claude fallback uchun faqat dastlabki ikki sahifali PDF yaratiladi', async () => {
  const buffer = await readFile('books/kitob1 monografiya.pdf');
  const source = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
  const originalByteLength = source.byteLength;

  await inspectPdfFirstPages(source, 2);
  assert.equal(source.byteLength, originalByteLength);

  const firstPages = await createFirstPagesPdf(source, 2);
  const result = await inspectPdfFirstPages(firstPages, 2);

  assert.equal(result.pageCount, 2);
});

test('PDF.js yuklanmasa sahifa soni pdf-lib orqali olinadi', async () => {
  const buffer = await readFile('books/kitob1 monografiya.pdf');
  const source = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
  const result = await inspectPdfFirstPages(source, 2, {
    parserLoader: async () => {
      throw new Error('Cloudflare PDF.js import xatosi');
    },
  });

  assert.equal(result.pageCount, 508);
  assert.equal(result.firstPagesText, '');
});
