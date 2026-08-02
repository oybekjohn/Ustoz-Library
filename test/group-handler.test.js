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
        secondary_phone: '+998907654321',
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
        if (sql.includes('SET tel_command_enabled')) {
          database.config.tel_command_enabled = Number(this._values[0]);
        }
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
  assert.match(calls[0].text, /Oybek Shifokor  \+998901234567, \+998907654321/);
  assert.equal(calls[0].message_thread_id, 77);
  assert.equal(calls[0].reply_parameters.message_id, 55);
  assert.deepEqual(
    calls[0].reply_markup.inline_keyboard[0].map((button) => button.text),
    ['✅', '❌'],
  );
});

test('bir nechta mos kontakt bitta reply xabarda tugmalarsiz chiqadi', async (context) => {
  const calls = mockTelegram(context);
  const DB = new GroupFakeDB();
  DB.contacts.push({
    id: 2,
    chat_id: '-1001',
    full_name: 'Oybek Usta',
    normalized_name: 'oybek usta',
    aliases_json: '[]',
    phone: '+998909876543',
    secondary_phone: null,
    correct_votes: 0,
    wrong_votes: 0,
  });

  await handleGroupUpdate({ DB, TELEGRAM_BOT_TOKEN: 'test-token' }, {
    message: {
      message_id: 56,
      message_thread_id: 77,
      chat: { id: -1001, type: 'supergroup' },
      from: { id: 42, first_name: 'Ali' },
      text: 'Oybekning telefon nomeri kimda bor?',
    },
  });

  assert.equal(calls.length, 1);
  assert.match(calls[0].text, /Oybek Shifokor  \+998901234567, \+998907654321/);
  assert.match(calls[0].text, /Oybek Usta  \+998909876543/);
  assert.equal(calls[0].reply_parameters.message_id, 56);
  assert.equal(calls[0].reply_markup, undefined);
});

test('telefon so‘rovi bazaga mos kelmasa bot javob bermaydi', async (context) => {
  const calls = mockTelegram(context);
  await handleGroupUpdate({
    DB: new GroupFakeDB(),
    TELEGRAM_BOT_TOKEN: 'test-token',
  }, {
    message: {
      message_id: 57,
      message_thread_id: 77,
      chat: { id: -1001, type: 'supergroup' },
      from: { id: 42, first_name: 'Ali' },
      text: 'Veterinarning telefon nomeri kimda bor?',
    },
  });

  assert.equal(calls.length, 0);
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

test('owner /stop_tel va /start_tel orqali /tel ni boshqaradi', async (context) => {
  const calls = mockTelegram(context);
  const DB = new GroupFakeDB();
  const baseMessage = {
    message_id: 61,
    chat: { id: -1001, type: 'supergroup' },
    from: { id: 5252931517, first_name: 'Owner' },
  };

  await handleGroupUpdate({ DB, TELEGRAM_BOT_TOKEN: 'test-token' }, {
    message: { ...baseMessage, text: '/stop_tel' },
  });
  assert.equal(DB.config.tel_command_enabled, 0);
  assert.match(calls.at(-1).text, /to‘xtatildi/);

  await handleGroupUpdate({ DB, TELEGRAM_BOT_TOKEN: 'test-token' }, {
    message: { ...baseMessage, message_id: 62, text: '/start_tel' },
  });
  assert.equal(DB.config.tel_command_enabled, 1);
  assert.match(calls.at(-1).text, /yoqildi/);
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

test('noto‘g‘ri bahodan keyin yangilanish tartibi aytiladi', async (context) => {
  const calls = mockTelegram(context);
  const DB = new GroupFakeDB();
  await handleGroupUpdate({ DB, TELEGRAM_BOT_TOKEN: 'test-token' }, {
    callback_query: {
      id: 'vote-2',
      data: 'grp:vote:1:-1',
      from: { id: 45, first_name: 'Vali' },
      message: { chat: { id: -1001, type: 'supergroup' } },
    },
  });

  assert.equal(DB.contacts[0].wrong_votes, 1);
  assert.match(calls[0].text, /Keyingi mos kontakt moderator tasdig‘idan so‘ng yangilanadi/);
});
