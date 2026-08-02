import test from 'node:test';
import assert from 'node:assert/strict';

import {
  formatCoverPromptMessage,
  formatPreview,
  handleTelegramUpdate,
} from '../functions/_lib/telegram.js';

class FakeDB {
  constructor() {
    this.sessions = new Map();
    this.admins = new Map([['42', { user_id: '42' }]]);
  }

  prepare(sql) {
    const database = this;
    return {
      bind(...values) {
        return {
          async first() {
            if (sql.includes('SELECT * FROM telegram_sessions')) {
              return database.sessions.get(String(values[0])) || null;
            }
            if (sql.includes('FROM telegram_admins WHERE user_id')) {
              return database.admins.get(String(values[0])) || null;
            }
            throw new Error(`Unexpected first: ${sql}`);
          },
          async run() {
            if (sql.includes('UPDATE telegram_admins SET username')) {
              const admin = database.admins.get(String(values[2]));
              if (admin) {
                admin.username = values[0];
                admin.first_name = values[1];
              }
              return { success: true, meta: { changes: admin ? 1 : 0 } };
            }
            if (sql.includes('INSERT INTO telegram_admins')) {
              const [targetId, addedBy, username, firstName] = values;
              database.admins.set(String(targetId), {
                user_id: String(targetId),
                added_by: String(addedBy),
                username,
                first_name: firstName,
              });
              return { success: true, meta: { changes: 1 } };
            }
            if (!sql.includes('INSERT INTO telegram_sessions')) throw new Error(`Unexpected run: ${sql}`);
            const [
              userId,
              chatId,
              state,
              category,
              pdfFileId,
              pdfName,
              pdfSize,
              pendingPdfKey,
              pendingCoverKey,
              pendingMetadata,
              editField,
              activeBookId,
              listPage,
            ] = values;
            database.sessions.set(String(userId), {
              user_id: String(userId),
              chat_id: String(chatId),
              state,
              category,
              pdf_file_id: pdfFileId,
              pdf_name: pdfName,
              pdf_size: pdfSize,
              pending_pdf_key: pendingPdfKey,
              pending_cover_key: pendingCoverKey,
              pending_metadata: pendingMetadata,
              edit_field: editField,
              active_book_id: activeBookId,
              list_page: listPage,
            });
            return { success: true };
          },
        };
      },
    };
  }
}

test('kategoriya tanlangach PDF background tahliliga yuboriladi', async (context) => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, body: JSON.parse(options.body) });
    return new Response(JSON.stringify({ ok: true, result: {} }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };
  context.after(() => { globalThis.fetch = originalFetch; });

  const DB = new FakeDB();
  const env = {
    DB,
    TELEGRAM_ALLOWED_USER_IDS: '42',
    TELEGRAM_BOT_TOKEN: 'test-token',
  };

  await handleTelegramUpdate(env, {
    callback_query: {
      id: 'callback-1',
      data: 'category:it',
      from: { id: 42 },
      message: { chat: { id: 100 } },
    },
  });
  assert.equal(DB.sessions.get('42').state, 'awaiting_pdf');
  assert.equal(DB.sessions.get('42').category, 'it');

  const result = await handleTelegramUpdate(env, {
    message: {
      from: { id: 42 },
      chat: { id: 100 },
      document: {
        file_id: 'pdf-file',
        file_name: 'kitob.pdf',
        file_size: 1024,
        mime_type: 'application/pdf',
      },
    },
  });

  const session = DB.sessions.get('42');
  assert.equal(session.state, 'processing');
  assert.equal(typeof result.background, 'function');
});

test('/start asosiy boshqaruv tugmalarini ko\'rsatadi', async (context) => {
  const originalFetch = globalThis.fetch;
  let requestBody;
  globalThis.fetch = async (_url, options) => {
    requestBody = JSON.parse(options.body);
    return new Response(JSON.stringify({ ok: true, result: {} }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };
  context.after(() => { globalThis.fetch = originalFetch; });

  await handleTelegramUpdate({
    DB: new FakeDB(),
    TELEGRAM_ALLOWED_USER_IDS: '42',
    TELEGRAM_OWNER_ID: '42',
    TELEGRAM_BOT_TOKEN: 'test-token',
  }, {
    message: {
      from: { id: 42 },
      chat: { id: 100 },
      text: '/start',
    },
  });

  const labels = requestBody.reply_markup.keyboard.flat().map((button) => button.text);
  assert.deepEqual(labels, ['Kitoblarni boshqarish', 'Adminlar', 'Bot haqida']);
});

test('DL Library admini faqat kitob yuklash menyusini ko‘radi', async (context) => {
  const originalFetch = globalThis.fetch;
  let requestBody;
  globalThis.fetch = async (_url, options) => {
    requestBody = JSON.parse(options.body);
    return new Response(JSON.stringify({ ok: true, result: {} }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };
  context.after(() => { globalThis.fetch = originalFetch; });

  await handleTelegramUpdate({
    DB: new FakeDB(),
    TELEGRAM_ALLOWED_USER_IDS: '42',
    TELEGRAM_OWNER_ID: '5252931517',
    TELEGRAM_BOT_TOKEN: 'test-token',
  }, {
    message: {
      from: { id: 42, first_name: 'Admin' },
      chat: { id: 100 },
      text: '/start',
    },
  });

  const labels = requestBody.reply_markup.keyboard.flat().map((button) => button.text);
  assert.deepEqual(labels, ['Kitob yuklash', 'Bot haqida']);
});

test('DL Library admini eski callback orqali kitoblar ro‘yxatini ko‘ra olmaydi', async (context) => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (_url, options) => {
    calls.push(JSON.parse(options.body));
    return new Response(JSON.stringify({ ok: true, result: {} }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };
  context.after(() => { globalThis.fetch = originalFetch; });

  await handleTelegramUpdate({
    DB: new FakeDB(),
    TELEGRAM_ALLOWED_USER_IDS: '42',
    TELEGRAM_OWNER_ID: '5252931517',
    TELEGRAM_BOT_TOKEN: 'test-token',
  }, {
    callback_query: {
      id: 'callback-books-list',
      data: 'books:list:0',
      from: { id: 42, first_name: 'Admin' },
      message: { chat: { id: 100 } },
    },
  });

  assert.match(calls.at(-1).text, /faqat owner uchun/);
});

test('owner yangi DL Library adminini qo‘shadi va profil saqlanadi', async (context) => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options) => {
    const body = JSON.parse(options.body);
    calls.push({ url, body });
    const result = String(url).endsWith('/getChat')
      ? { id: 7777, username: 'ali_admin', first_name: 'Ali' }
      : {};
    return new Response(JSON.stringify({ ok: true, result }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };
  context.after(() => { globalThis.fetch = originalFetch; });

  const DB = new FakeDB();
  const env = {
    DB,
    TELEGRAM_OWNER_ID: '42',
    TELEGRAM_BOT_TOKEN: 'test-token',
  };

  await handleTelegramUpdate(env, {
    callback_query: {
      id: 'admin-add',
      data: 'admin:add',
      from: { id: 42, first_name: 'Owner' },
      message: { chat: { id: 100 } },
    },
  });
  await handleTelegramUpdate(env, {
    message: {
      from: { id: 42, first_name: 'Owner' },
      chat: { id: 100 },
      text: '7777',
    },
  });
  assert.equal(DB.sessions.get('42').state, 'idle');
  assert.match(calls.at(-1).body.text, /Ali/);

  assert.deepEqual(DB.admins.get('7777'), {
    user_id: '7777',
    added_by: '42',
    username: 'ali_admin',
    first_name: 'Ali',
  });
});

test('bot guruh chatidagi xabarlarni e’tiborsiz qoldiradi', async (context) => {
  const originalFetch = globalThis.fetch;
  let called = false;
  globalThis.fetch = async () => {
    called = true;
    return new Response(JSON.stringify({ ok: true, result: {} }));
  };
  context.after(() => { globalThis.fetch = originalFetch; });

  const result = await handleTelegramUpdate({
    DB: new FakeDB(),
    TELEGRAM_OWNER_ID: '42',
    TELEGRAM_BOT_TOKEN: 'test-token',
  }, {
    message: {
      from: { id: 42 },
      chat: { id: -1001, type: 'supergroup' },
      text: '/start',
    },
  });

  assert.equal(result.background, null);
  assert.equal(called, false);
});

test('kitob preview talab qilingan uch tilli HTML formatda chiqadi', () => {
  const preview = formatPreview({
    title: {
      uz: 'Algoritmlar & ma’lumotlar',
      ru: 'Алгоритмы и данные',
      en: 'Algorithms and Data',
    },
    author: 'A. Muallif',
    year: 2026,
    pages: 240,
    category: 'it',
    description: {
      uz: 'O‘zbekcha tavsif.',
      ru: 'Описание на русском языке.',
      en: 'An English description.',
    },
  });

  assert.match(preview, /^<b>Kitob nomi<\/b>/);
  assert.match(preview, /uz - Algoritmlar &amp; ma’lumotlar/);
  assert.match(preview, /<b>Muallif\(lar\):<\/b> - A\. Muallif/);
  assert.match(preview, /<b>Tavsiflar \(20-25 ta so'z\):<\/b>/);
  assert.match(preview, /ru - Описание на русском языке\./);
});

test('muqova prompti Telegram nusxalash kodi blokida chiqadi', () => {
  const message = formatCoverPromptMessage({
    title: { uz: 'AI & ta’lim' },
    author: 'A. Muallif',
    year: 2026,
    category: 'ai',
  });

  assert.match(message, /^<b>Muqova uchun prompt:<\/b>\n<pre>/);
  assert.match(message, /AI &amp; ta’lim/);
  assert.match(message, /<\/pre>$/);
});
