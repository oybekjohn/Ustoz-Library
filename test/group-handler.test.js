import test from 'node:test';
import assert from 'node:assert/strict';

import { handleGroupUpdate } from '../functions/_lib/group/index.js';

class GroupFakeDB {
  constructor() {
    this.config = {
      chat_id: '-1001',
      title: 'Sinov guruhi',
      phone_topic_id: '77',
      enabled: 1,
      tel_command_enabled: 1,
    };
    this.contacts = [
      {
        id: 1,
        chat_id: '-1001',
        full_name: 'Oybek Shifokor',
        normalized_name: 'oybek shifokor',
        aliases_json: '[]',
        phone: '+998901234567',
        correct_votes: 0,
        wrong_votes: 0,
      },
    ];
  }

  prepare(sql) {
    const database = this;
    return {
      _sql: sql,
      _values: [],
      bind(...values) {
        this._values = values;
        return this;
      },
      async first() {
        if (sql.includes('telegram_group_configs')) return database.config;
        if (sql.includes('telegram_group_contacts WHERE id')) {
          return database.contacts.find((item) => item.id === Number(this._values[0])) || null;
        }
        throw new Error(`Unexpected first query: ${sql}`);
      },
      async all() {
        if (sql.includes('FROM telegram_group_contacts')) return { results: database.contacts };
        throw new Error(`Unexpected all query: ${sql}`);
      },
      async run() {
        return { meta: { changes: 1 } };
      },
    };
  }

  async batch(statements) {
    const vote = Number(statements[0]._values[2]);
    this.contacts[0].correct_votes = vote === 1 ? 1 : 0;
    this.contacts[0].wrong_votes = vote === -1 ? 1 : 0;
    return statements.map(() => ({ success: true }));
  }
}

function mockTelegram(context) {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (_url, options) => {
    calls.push(JSON.parse(options.body));
    return new Response(JSON.stringify({ ok: true, result: { message_id: calls.length } }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };
  context.after(() => { globalThis.fetch = originalFetch; });
  return calls;
}

test('ism so‘ralganda bot kontaktni shu xabarga reply qilib baholash tugmalarini beradi', async (context) => {
  const calls = mockTelegram(context);
  const result = await handleGroupUpdate({
    DB: new GroupFakeDB(),
    TELEGRAM_BOT_TOKEN: 'test-token',
  }, {
    message: {
      message_id: 55,
      message_thread_id: 77,
      chat: { id: -1001, type: 'supergroup', title: 'Sinov guruhi' },
      from: { id: 42, first_name: 'Ali' },
      text: 'Oybekning telefon nomeri kimda bor?',
    },
  });

  assert.equal(result.handled, true);
  assert.match(calls[0].text, /Oybek Shifokor: \+998901234567/);
  assert.equal(calls[0].message_thread_id, 77);
  assert.equal(calls[0].reply_parameters.message_id, 55);
  assert.deepEqual(
    calls[0].reply_markup.inline_keyboard[0].map((button) => button.text),
    ['To‘g‘ri', 'Noto‘g‘ri'],
  );
});

test('/tel barcha kontaktlarni oddiy matn ko‘rinishida chiqaradi', async (context) => {
  const calls = mockTelegram(context);
  await handleGroupUpdate({
    DB: new GroupFakeDB(),
    TELEGRAM_BOT_TOKEN: 'test-token',
  }, {
    message: {
      message_id: 60,
      message_thread_id: 77,
      chat: { id: -1001, type: 'supergroup' },
      from: { id: 43, first_name: 'Vali' },
      text: '/tel',
    },
  });

  assert.doesNotMatch(calls[0].text, /<pre>/);
  assert.match(calls[0].text, /Oybek Shifokor  \+998901234567/);
});

test('kontakt bahosi foydalanuvchi ID si bilan yangilanadi', async (context) => {
  const calls = mockTelegram(context);
  const DB = new GroupFakeDB();
  await handleGroupUpdate({ DB, TELEGRAM_BOT_TOKEN: 'test-token' }, {
    callback_query: {
      id: 'vote-1',
      data: 'grp:vote:1:1',
      from: { id: 44, first_name: 'Hasan' },
      message: { chat: { id: -1001, type: 'supergroup' } },
    },
  });

  assert.equal(DB.contacts[0].correct_votes, 1);
  assert.match(calls[0].text, /To‘g‘ri deb tasdiqlandi/);
});
