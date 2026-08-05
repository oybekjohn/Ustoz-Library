import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseTestTxt } from '../functions/_lib/test-parser.js';

test('parseTestTxt - normal faylni toʻgʻri pars qiladi', () => {
  const input = `
Savol matni 1?
================
Birinchi variant
================
Ikkinchi variant
================
#To'g'ri variant
================
To'rtinchi variant

+++++

Keyingi savol 2?
================
#Birinchi to'g'ri
================
Ikkinchi variant
`;

  const res = parseTestTxt(input);
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.questions.length, 2);

  // 1-savol
  assert.strictEqual(res.questions[0].questionText, 'Savol matni 1?');
  assert.strictEqual(res.questions[0].options.length, 4);
  assert.strictEqual(res.questions[0].options[2].isCorrect, true);
  assert.strictEqual(res.questions[0].options[2].text, "To'g'ri variant");

  // 2-savol
  assert.strictEqual(res.questions[1].questionText, 'Keyingi savol 2?');
  assert.strictEqual(res.questions[1].options[0].isCorrect, true);
  assert.strictEqual(res.questions[1].options[0].text, "Birinchi to'g'ri");
});

test('parseTestTxt - to\'g\'ri javob bo\'lmasa xato beradi', () => {
  const input = `
Xato savol?
================
Variant 1
================
Variant 2
`;
  const res = parseTestTxt(input);
  assert.strictEqual(res.success, false);
  assert.strictEqual(res.errors.length, 1);
  assert.match(res.errors[0].message, /to'g'ri javob/);
});

test('parseTestTxt - 1 tadan ko\'p to\'g\'ri javob bo\'lsa xato beradi', () => {
  const input = `
Ko'p to'g'ri javobli savol?
================
#Variant 1
================
#Variant 2
`;
  const res = parseTestTxt(input);
  assert.strictEqual(res.success, false);
  assert.strictEqual(res.errors.length, 1);
  assert.match(res.errors[0].message, /1 tadan ko'p/);
});

test('parseTestTxt - kamida 2 variant bo\'lmasa xato beradi', () => {
  const input = `
Bitta variantli savol?
================
#Faqat bitta variant
`;
  const res = parseTestTxt(input);
  assert.strictEqual(res.success, false);
  assert.strictEqual(res.errors.length, 1);
  assert.match(res.errors[0].message, /kamida 2 ta/);
});
