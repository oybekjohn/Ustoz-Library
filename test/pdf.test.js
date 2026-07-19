import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { inspectPdfFirstPages } from '../functions/_lib/pdf.js';

test('PDF helper sahifa soni va birinchi sahifalar matnini oladi', async () => {
  const buffer = await readFile('books/kitob1 monografiya.pdf');
  const result = await inspectPdfFirstPages(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength), 2);

  assert.equal(result.pageCount, 508);
  assert.match(result.firstPagesText, /RENESSANS TA'LIM UNIVERSITETI|RENESSANS TA’LIM UNIVERSITETI/);
});
