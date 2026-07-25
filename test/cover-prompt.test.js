import test from 'node:test';
import assert from 'node:assert/strict';

import { buildCoverPrompt } from '../functions/_lib/cover-prompt.js';

test('muqova prompti metadata qiymatlarini shablonga joylaydi', () => {
  const prompt = buildCoverPrompt({
    title: { uz: 'Suniy intellekt asoslari' },
    author: 'A. Muallif',
    year: 2026,
  }, "Sun'iy intellekt");

  assert.match(prompt, /Suniy intellekt asoslari/);
  assert.match(prompt, /A\. Muallif/);
  assert.match(prompt, /2026/);
  assert.match(prompt, /1024x1024/);
});
