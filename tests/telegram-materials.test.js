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
                pdf_file_id: values[4],
                pdf_name: values[5],
                pdf_size: values[6],
                pending_pdf_key: values[7],
                pending_cover_key: values[8],
                pending_metadata: values[9],
                edit_field: values[10],
                active_book_id: values[11],
                list_page: values[12],
                material_type: values[13],
                pending_source_key: values[14],
              });
            }
            if (sql.startsWith('INSERT INTO videos')) {
              db.inserted.push({ table: 'videos', values });
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

function makeEnv() {
  return {
    DB: new FakeDB(),
    BUCKET: { delete: async () => {} },
    TELEGRAM_BOT_TOKEN: 'test-token',
    PUBLIC_SITE_URL: 'https://dl-library.uz',
  };
}

const sentMessages = [];
globalThis.fetch = async (url, init) => {
  const body = init?.body ? JSON.parse(init.body) : {};
  if (String(url).includes('sendMessage')) sentMessages.push(body.text || '');
  return {
    ok: true,
    json: async () => ({ ok: true, result: {} }),
  };
};

// ---------- Testlar ----------

test("video qo'shish oqimi: kategoriya -> URL -> sarlavha -> tavsif -> saqlash", async () => {
  const env = makeEnv();
  const userId = '77';
  const chatId = '77';

  await startMaterialCreate(env, chatId, userId, 'video');
  let session = env.DB.sessions.get(userId);
  assert.equal(session.state, 'awaiting_material_category');
  assert.equal(session.material_type, 'video');

  const handled = await handleMaterialCallback(env, chatId, userId, 'mat-cat:video:it', true);
  assert.equal(handled, true);
  session = env.DB.sessions.get(userId);
  assert.equal(session.state, 'awaiting_material_url');
  assert.equal(session.category, 'it');

  await handleMaterialMessageState(env, {
    session,
    message: {},
    text: 'https://youtu.be/dQw4w9WgXcQ',
    chatId,
    userId,
  });
  session = env.DB.sessions.get(userId);
  assert.equal(session.state, 'awaiting_material_title');

  await handleMaterialMessageState(env, {
    session,
    message: {},
    text: 'Sun\'iy intellekt asoslari — 1-dars',
    chatId,
    userId,
  });
  session = env.DB.sessions.get(userId);
  assert.equal(session.state, 'awaiting_material_desc');

  await handleMaterialMessageState(env, {
    session,
    message: {},
    text: '-',
    chatId,
    userId,
  });
  session = env.DB.sessions.get(userId);
  assert.equal(session.state, 'idle');

  assert.equal(env.DB.inserted.length, 1);
  const insert = env.DB.inserted[0];
  assert.equal(insert.table, 'videos');
  assert.ok(insert.values.includes('dQw4w9WgXcQ'));
});

test("noto'g'ri YouTube havolasi rad etiladi", async () => {
  const env = makeEnv();
  const userId = '78';
  await startMaterialCreate(env, '78', userId, 'video');
  await handleMaterialCallback(env, '78', userId, 'mat-cat:video:ai', true);

  const session = env.DB.sessions.get(userId);
  await handleMaterialMessageState(env, {
    session,
    message: {},
    text: 'https://example.com/video',
    chatId: '78',
    userId,
  });
  assert.equal(env.DB.sessions.get(userId).state, 'awaiting_material_url');
  assert.equal(env.DB.inserted.length, 0);
});

test('owner bo\'lmagan foydalanuvchi materiallarni boshqara olmaydi', async () => {
  const env = makeEnv();
  sentMessages.length = 0;
  const handled = await handleMaterialCallback(env, '79', '79', 'mat:list:video:0', false);
  assert.equal(handled, true);
  assert.ok(sentMessages.some((m) => m.includes('faqat owner')));
});

test('material bo\'lmagan holatlar uchun null qaytadi', async () => {
  const env = makeEnv();
  const result = await handleMaterialMessageState(env, {
    session: { state: 'awaiting_pdf' },
    message: {},
    text: 'salom',
    chatId: '80',
    userId: '80',
  });
  assert.equal(result, null);
});
