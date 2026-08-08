import test from 'node:test';
import assert from 'node:assert/strict';

import { analyzeBookMetadata, supportedMetadataProviders } from '../functions/_lib/ai/index.js';
import {
  arrayBufferToBase64,
  buildMetadataPrompt,
  normalizeMetadata,
  parseJsonText,
} from '../functions/_lib/ai/common.js';

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

test('AI prompt uch til grammatikasi va 20-25 so\'zli tavsifni talab qiladi', () => {
  const prompt = buildMetadataPrompt('IT', {
    pageCount: 120,
    sourceMode: 'first_pages_text',
  });

  assert.match(prompt, /o'zbek lotin yozuvida/);
  assert.match(prompt, /rus tilida, kirill yozuvida/);
  assert.match(prompt, /tabiiy ingliz tilida/);
  assert.match(prompt, /20-25 ta so'zdan/);
  assert.match(prompt, /22 ta so'zni maqsad qiling/);
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

test('Anthropic provider text layer bor bo\'lsa PDF document yubormaydi', async (context) => {
  const originalFetch = globalThis.fetch;
  let requestBody;
  globalThis.fetch = async (_url, options) => {
    requestBody = JSON.parse(options.body);
    return new Response(JSON.stringify({
      content: [{
        type: 'text',
        text: JSON.stringify({
          title: { uz: 'Algoritmlar', ru: 'Algoritmlar', en: 'Algorithms' },
          author: 'A. Muallif',
          year: 2025,
          pages: 120,
          language: 'uz',
          description: { uz: 'Tavsif.', ru: 'Opisanie.', en: 'Description.' },
        }),
      }],
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };
  context.after(() => { globalThis.fetch = originalFetch; });

  const book = await analyzeBookMetadata({
    env: {
      AI_METADATA_PROVIDER: 'anthropic',
      ANTHROPIC_API_KEY: 'test-key',
    },
    pdfBuffer: new TextEncoder().encode('full PDF').buffer,
    firstPagesPdfBuffer: new TextEncoder().encode('two pages').buffer,
    firstPagesText: 'A. Muallif Algoritmlar 2025',
    fileName: 'algoritmlar.pdf',
    categoryName: 'IT',
    pageCount: 120,
  });

  assert.equal(book.title.uz, 'Algoritmlar');
  // Standart model aniq versiya bilan belgilanadi (alias emas)
  assert.equal(requestBody.model, 'claude-haiku-4-5-20251001');
  assert.equal(requestBody.messages[0].content.some((item) => item.type === 'document'), false);
});

test('Anthropic skaner fallbackida faqat ikki sahifalik PDF yuboriladi', async (context) => {
  const originalFetch = globalThis.fetch;
  let requestBody;
  globalThis.fetch = async (_url, options) => {
    requestBody = JSON.parse(options.body);
    return new Response(JSON.stringify({
      content: [{
        type: 'text',
        text: JSON.stringify({
          title: { uz: 'Skaner kitob', ru: 'Skaner kitob', en: 'Scanned book' },
          author: "Noma'lum",
          year: null,
          pages: 10,
          language: 'uz',
          description: { uz: 'Tavsif.', ru: 'Opisanie.', en: 'Description.' },
        }),
      }],
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };
  context.after(() => { globalThis.fetch = originalFetch; });

  const firstPagesPdfBuffer = new TextEncoder().encode('only first two pages').buffer;
  await analyzeBookMetadata({
    env: {
      AI_METADATA_PROVIDER: 'anthropic',
      ANTHROPIC_API_KEY: 'test-key',
    },
    pdfBuffer: new TextEncoder().encode('full PDF must not be sent').buffer,
    firstPagesPdfBuffer,
    firstPagesText: '',
    fileName: 'scan.pdf',
    categoryName: 'Boshqa',
    pageCount: 10,
  });

  const document = requestBody.messages[0].content.find((item) => item.type === 'document');
  assert.equal(document.source.data, arrayBufferToBase64(firstPagesPdfBuffer));
});
