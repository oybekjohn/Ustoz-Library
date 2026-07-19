import test from 'node:test';
import assert from 'node:assert/strict';

import { analyzeBookMetadata, supportedMetadataProviders } from '../functions/_lib/ai/index.js';
import { arrayBufferToBase64, normalizeMetadata, parseJsonText } from '../functions/_lib/ai/common.js';

test('AI providerlar ro\'yxati almashtiriladigan adapterlarni o\'z ichiga oladi', () => {
  assert.deepEqual([...supportedMetadataProviders].sort(), ['anthropic', 'gemini', 'mock', 'openai', 'openrouter']);
});

test('mock provider umumiy kitob formatini qaytaradi', async () => {
  const book = await analyzeBookMetadata({
    env: { AI_METADATA_PROVIDER: 'mock' },
    pdfBuffer: new ArrayBuffer(0),
    fileName: 'Suniy_intellekt-asoslari.pdf',
    categoryName: "Sun'iy intellekt",
  });

  assert.equal(book.title.uz, 'Suniy intellekt asoslari');
  assert.equal(book.language, 'uz');
  assert.equal(book.author, "Noma'lum");
});

test('metadata bo\'sh tarjimalarni mavjud nom bilan to\'ldiradi', () => {
  const book = normalizeMetadata({
    title: { uz: 'Algoritmlar' },
    author: 'A. Muallif',
    year: 2025,
    pages: 120,
    language: 'uz',
    description: {},
  }, 'fallback.pdf');

  assert.deepEqual(book.title, { uz: 'Algoritmlar', ru: 'Algoritmlar', en: 'Algoritmlar' });
  assert.equal(book.year, 2025);
  assert.equal(book.pages, 120);
});

test('JSON markdown bloki va base64 yordamchilari ishlaydi', () => {
  assert.deepEqual(parseJsonText('```json\n{"ok":true}\n```'), { ok: true });
  assert.equal(arrayBufferToBase64(new TextEncoder().encode('kitob').buffer), 'a2l0b2I=');
});

test('OpenRouter provider text layer bor bo\'lsa PDFni yubormaydi', async (context) => {
  const originalFetch = globalThis.fetch;
  let requestBody;
  globalThis.fetch = async (_url, options) => {
    requestBody = JSON.parse(options.body);
    return new Response(JSON.stringify({
      choices: [{
        message: {
          content: JSON.stringify({
            title: { uz: 'Algoritmlar', ru: 'Алгоритмы', en: 'Algorithms' },
            author: 'A. Muallif',
            year: 2025,
            pages: 120,
            language: 'uz',
            description: { uz: 'Qisqa tavsif.', ru: 'Краткое описание.', en: 'Short description.' },
          }),
        },
      }],
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };
  context.after(() => { globalThis.fetch = originalFetch; });

  const book = await analyzeBookMetadata({
    env: {
      AI_METADATA_PROVIDER: 'openrouter',
      OPENROUTER_API_KEY: 'test-key',
      OPENROUTER_METADATA_MODEL: 'openrouter/free',
    },
    pdfBuffer: new TextEncoder().encode('PDF bytes').buffer,
    fileName: 'algoritmlar.pdf',
    categoryName: 'IT',
    pageCount: 120,
    firstPagesText: 'A. Muallif Algoritmlar 2025',
  });

  assert.equal(book.pages, 120);
  assert.equal(book.title.uz, 'Algoritmlar');
  assert.doesNotMatch(JSON.stringify(requestBody.messages), /file_data|application\/pdf/);
});
