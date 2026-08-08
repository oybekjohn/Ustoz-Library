import test from 'node:test';
import assert from 'node:assert/strict';

import {
  handleMaterialCallback,
  handleMaterialMessageState,
  startMaterialCreate,
} from '../functions/_lib/telegram-materials.js';

// ---------- Soxta muhit ----------

class FakeDB {
  constructor() {
    this.sessions = new Map();
    this.inserted = [];
    this.existingVideoIds = new Set();
  }

  prepare(sql) {
    const db = this;
    return {
      bind(...values) {
        return {
          async first() {
            if (sql.includes('FROM telegram_sessions')) {
              return db.sessions.get(String(values[0])) || null;
            }
            if (sql.includes('FROM videos WHERE youtube_video_id')) {
              return db.existingVideoIds.has(values[0]) ? { id: 1 } : null;
            }
            if (sql.includes('COUNT(*)')) return { total: 0, c: 0 };
            return null;
          },
          async run() {
            if (sql.includes('INTO telegram_sessions')) {
              db.sessions.set(String(values[0]), {
                user_id: String(values[0]),
                chat_id: String(values[1]),
                state: values[2],
                category: values[3],
                pending_metadata: values[9],
                material_type: values[13],
                pending_source_key: values[14],
              });
            }
            const table = sql.match(/INSERT INTO (\w+)/)?.[1];
            if (table && table !== 'telegram_sessions') {
              db.inserted.push({ table, values });
            }
            return { meta: { last_row_id: db.inserted.length, changes: 1 } };
          },
          async all() {
            return { results: [] };
          },
        };
      },
    };
  }
}

function makeEnv(overrides = {}) {
  return {
    DB: new FakeDB(),
    BUCKET: { delete: async () => {}, put: async () => {} },
    TELEGRAM_BOT_TOKEN: 'test-token',
    PUBLIC_SITE_URL: 'https://dl-library.uz',
    // mock provayder => AI chaqirilmaydi, zaxira qiymatlar ishlatiladi
    AI_METADATA_PROVIDER: 'mock',
    ...overrides,
  };
}

const sentMessages = [];
globalThis.fetch = async (url, init) => {
  const urlStr = String(url);
  const body = init?.body ? JSON.parse(init.body) : {};
  if (urlStr.includes('sendMessage')) sentMessages.push(body.text || '');
  if (urlStr.includes('youtube.com/oembed')) {
    return { ok: true, json: async () => ({ title: 'Test video', author_name: 'Kanal' }) };
  }
  return { ok: true, json: async () => ({ ok: true, result: {} }) };
};

async function runBackground(result) {
  if (result?.background) await result.background();
}

// ---------- Bo'lim tanlash ----------

test("bo'lim tanlangach sessiya yopishqoq holatga o'tadi", async () => {
  const env = makeEnv();
  await startMaterialCreate(env, '77', '77', 'presentation');

  const session = env.DB.sessions.get('77');
  assert.equal(session.state, 'awaiting_material_source');
  assert.equal(session.material_type, 'presentation');
});

// ---------- Video ----------

test('video: havola yuborilsa metadata bilan saqlanadi', async () => {
  const env = makeEnv();
  await startMaterialCreate(env, '77', '77', 'video');
  const session = env.DB.sessions.get('77');

  await runBackground(await handleMaterialMessageState(env, {
    session,
    message: {},
    text: 'https://youtu.be/dQw4w9WgXcQ',
    chatId: '77',
    userId: '77',
  }));

  const insert = env.DB.inserted.find((i) => i.table === 'videos');
  assert.ok(insert, "video qatori qo'shilishi kerak");
  assert.ok(insert.values.includes('dQw4w9WgXcQ'));
  assert.ok(insert.values.includes('https://www.youtube.com/watch?v=dQw4w9WgXcQ'));
  // Kategoriya ruxsat etilgan ro'yxatdan olinadi (mock rejimda "boshqa")
  assert.ok(insert.values.includes('boshqa'));
});

test("video: bo'lim yuborishdan keyin ham saqlanadi (ketma-ket yuborish)", async () => {
  const env = makeEnv();
  await startMaterialCreate(env, '77', '77', 'video');

  await runBackground(await handleMaterialMessageState(env, {
    session: env.DB.sessions.get('77'),
    message: {},
    text: 'https://youtu.be/dQw4w9WgXcQ',
    chatId: '77',
    userId: '77',
  }));

  // Sessiya hali ham video yuborish holatida
  const session = env.DB.sessions.get('77');
  assert.equal(session.state, 'awaiting_material_source');
  assert.equal(session.material_type, 'video');
});

test("video: noto'g'ri havola rad etiladi va hech narsa saqlanmaydi", async () => {
  const env = makeEnv();
  sentMessages.length = 0;
  await startMaterialCreate(env, '78', '78', 'video');

  await runBackground(await handleMaterialMessageState(env, {
    session: env.DB.sessions.get('78'),
    message: {},
    text: 'https://example.com/video',
    chatId: '78',
    userId: '78',
  }));

  assert.equal(env.DB.inserted.filter((i) => i.table === 'videos').length, 0);
  assert.ok(sentMessages.some((m) => m.includes("noto'g'ri")));
});

test('video: takroriy havola qayta saqlanmaydi', async () => {
  const env = makeEnv();
  env.DB.existingVideoIds.add('dQw4w9WgXcQ');
  sentMessages.length = 0;
  await startMaterialCreate(env, '79', '79', 'video');

  await runBackground(await handleMaterialMessageState(env, {
    session: env.DB.sessions.get('79'),
    message: {},
    text: 'https://youtu.be/dQw4w9WgXcQ',
    chatId: '79',
    userId: '79',
  }));

  assert.equal(env.DB.inserted.filter((i) => i.table === 'videos').length, 0);
  assert.ok(sentMessages.some((m) => m.includes('allaqachon')));
});

// ---------- Test (savollar) ----------

const SAMPLE_TEST = [
  'Poytaxt qaysi shahar?',
  '================',
  'Samarqand',
  '================',
  '#Toshkent',
  '',
  '+++++',
  '',
  'Eng katta daryo?',
  '================',
  '#Amudaryo',
  '================',
  'Zarafshon',
].join('\n');

test('test: matn yuborilsa mavzu nomi so\'raladi', async () => {
  const env = makeEnv();
  sentMessages.length = 0;
  await startMaterialCreate(env, '80', '80', 'test');

  await runBackground(await handleMaterialMessageState(env, {
    session: env.DB.sessions.get('80'),
    message: {},
    text: SAMPLE_TEST,
    chatId: '80',
    userId: '80',
  }));

  const session = env.DB.sessions.get('80');
  assert.equal(session.state, 'awaiting_material_topic');
  assert.ok(sentMessages.some((m) => m.includes('mavzu')));
  // Hali saqlanmagan
  assert.equal(env.DB.inserted.filter((i) => i.table === 'tests').length, 0);
});

test('test: mavzu nomi berilgach savollar bilan saqlanadi', async () => {
  const env = makeEnv();
  await startMaterialCreate(env, '81', '81', 'test');

  await runBackground(await handleMaterialMessageState(env, {
    session: env.DB.sessions.get('81'),
    message: {},
    text: SAMPLE_TEST,
    chatId: '81',
    userId: '81',
  }));

  await runBackground(await handleMaterialMessageState(env, {
    session: env.DB.sessions.get('81'),
    message: {},
    text: "O'zbekiston geografiyasi",
    chatId: '81',
    userId: '81',
  }));

  assert.equal(env.DB.inserted.filter((i) => i.table === 'tests').length, 1);
  assert.equal(env.DB.inserted.filter((i) => i.table === 'test_questions').length, 2);
  assert.equal(env.DB.inserted.filter((i) => i.table === 'test_options').length, 4);

  // Keyingi testni yuborish uchun sessiya tayyor
  assert.equal(env.DB.sessions.get('81').state, 'awaiting_material_source');
});

test("test: noto'g'ri formatdagi matn rad etiladi", async () => {
  const env = makeEnv();
  sentMessages.length = 0;
  await startMaterialCreate(env, '82', '82', 'test');

  const badTest = ['Savol matni bormi?', '================', 'Faqat bitta variant bor'].join('\n');
  await runBackground(await handleMaterialMessageState(env, {
    session: env.DB.sessions.get('82'),
    message: {},
    text: badTest + ' '.repeat(50),
    chatId: '82',
    userId: '82',
  }));

  assert.equal(env.DB.inserted.filter((i) => i.table === 'tests').length, 0);
  assert.ok(sentMessages.some((m) => m.includes('xatolik')));
});

// ---------- Ruxsatlar ----------

test("owner bo'lmagan foydalanuvchi materiallarni boshqara olmaydi", async () => {
  const env = makeEnv();
  sentMessages.length = 0;
  const handled = await handleMaterialCallback(env, '83', '83', 'mat:list:video:0', false);
  assert.equal(handled, true);
  assert.ok(sentMessages.some((m) => m.includes('faqat owner')));
});

test("material bo'lmagan holatlar uchun null qaytadi", async () => {
  const env = makeEnv();
  const result = await handleMaterialMessageState(env, {
    session: { state: 'awaiting_pdf' },
    message: {},
    text: 'salom',
    chatId: '84',
    userId: '84',
  });
  assert.equal(result, null);
});
