import test from 'node:test';
import assert from 'node:assert/strict';

import { handleTelegramUpdate } from '../functions/_lib/telegram.js';

class FakeDB {
  constructor() {
    this.sessions = new Map();
  }

  prepare(sql) {
    const database = this;
    return {
      bind(...values) {
        return {
          async first() {
            if (!sql.includes('SELECT * FROM telegram_sessions')) throw new Error(`Unexpected first: ${sql}`);
            return database.sessions.get(String(values[0])) || null;
          },
          async run() {
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
            });
            return { success: true };
          },
        };
      },
    };
  }
}

test('kategoriya tanlangach PDF, undan keyin muqova kutiladi', async (context) => {
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

  await handleTelegramUpdate(env, {
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
  assert.equal(session.state, 'awaiting_cover');
  assert.equal(session.pdf_file_id, 'pdf-file');
  assert.match(calls.at(-1).body.text, /muqovasini/);
});
