import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractYouTubeId, isValidYouTubeUrl, getYouTubeEmbedUrl } from '../functions/_lib/youtube.js';

test('extractYouTubeId - barcha ruxsat berilgan YouTube URL formatlarini aniqlaydi', () => {
  const cases = [
    { url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', expected: 'dQw4w9WgXcQ' },
    { url: 'http://youtu.be/dQw4w9WgXcQ', expected: 'dQw4w9WgXcQ' },
    { url: 'https://www.youtube.com/embed/dQw4w9WgXcQ', expected: 'dQw4w9WgXcQ' },
    { url: 'https://www.youtube.com/shorts/dQw4w9WgXcQ', expected: 'dQw4w9WgXcQ' },
    { url: 'https://youtube.com/watch?v=dQw4w9WgXcQ&feature=shared', expected: 'dQw4w9WgXcQ' }
  ];

  for (const c of cases) {
    assert.strictEqual(extractYouTubeId(c.url), c.expected, `Failed for ${c.url}`);
    assert.strictEqual(isValidYouTubeUrl(c.url), true);
  }
});

test('extractYouTubeId - noto\'g\'ri URLlar uchun null qaytaradi', () => {
  assert.strictEqual(extractYouTubeId('https://google.com'), null);
  assert.strictEqual(extractYouTubeId('https://youtube.com/watch?v=123'), null);
  assert.strictEqual(isValidYouTubeUrl('not-a-url'), false);
});

test('getYouTubeEmbedUrl - nocookie embed linkini qaytaradi', () => {
  assert.strictEqual(getYouTubeEmbedUrl('dQw4w9WgXcQ'), 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ');
});
