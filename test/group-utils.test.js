import test from 'node:test';
import assert from 'node:assert/strict';

import {
  extractContactsFromTelegramExport,
  extractPhones,
  extractRequestedName,
  formatContactLine,
  formatContactsListPages,
  normalizePhone,
  rankContacts,
} from '../functions/_lib/group/utils.js';

test('telefon raqamlari +998 formatiga keltiriladi', () => {
  assert.deepEqual(
    extractPhones('Oybek: 90 123 45 67, shifokor +998 (91) 765-43-21'),
    ['+998901234567', '+998917654321'],
  );
});

test('+7 va qisqa xizmat raqamlari saqlanadi', () => {
  assert.equal(normalizePhone('+7 920 140 39 41'), '+79201403941');
  assert.equal(normalizePhone('8 (920) 140-39-41'), '+79201403941');
  assert.equal(normalizePhone('1154'), '1154');
});

test('telefon so‘rovidan ism yoki kasb ajratiladi', () => {
  assert.equal(extractRequestedName('Oybekning telefon nomeri kimda bor?'), 'oybek');
  assert.equal(extractRequestedName('Shashlikchining nomerini tashlanglar'), 'shashlikchi');
});

test('bir xil va o‘xshash ismli barcha kontaktlar saralanadi', () => {
  const contacts = [
    { id: 1, full_name: 'Oybek Shifokor', normalized_name: 'oybek shifokor', phone: '+998901111111' },
    { id: 2, full_name: 'Oybek Usta', normalized_name: 'oybek usta', phone: '+998902222222' },
    { id: 3, full_name: 'Akmal', normalized_name: 'akmal', phone: '+998903333333' },
  ];
  assert.deepEqual(rankContacts(contacts, 'Oybek').map((item) => item.id), [1, 2]);
  assert.deepEqual(rankContacts(contacts, 'Oybekk').map((item) => item.id), [1, 2]);
  assert.deepEqual(rankContacts(contacts, 'Ойбек').map((item) => item.id), [1, 2]);
});

test('kontakt javobi talab qilingan ko‘rinishda chiqadi', () => {
  assert.equal(
    formatContactLine({
      full_name: 'Bolalar shifokori',
      phone: '+998901234567',
      secondary_phone: '+998907654321',
    }),
    'Bolalar shifokori  +998901234567, +998907654321',
  );
});

test('/tel oddiy kontaktlarni alifbo tartibida chiqaradi', () => {
  const [page] = formatContactsListPages([
    { full_name: 'Zafar Usta', phone: '+998902222222' },
    { full_name: 'Akmal Doktor', phone: '+998901111111' },
  ]);
  assert.ok(page.indexOf('Akmal Doktor') < page.indexOf('Zafar Usta'));
  assert.match(page, /Akmal Doktor  \+998901111111/);
});

test('Telegram JSON eksportidan kontaktlar deduplikatsiya qilinadi', () => {
  const result = extractContactsFromTelegramExport({
    messages: [
      { id: 1, text: ['Oybek doktor: ', { type: 'phone', text: '+998 90 123 45 67' }] },
      { id: 2, text: 'Oybek yangi: 901234567' },
      {
        id: 3,
        contact_information: { first_name: 'Ali', last_name: 'Usta', phone_number: '+998917654321' },
      },
    ],
  });
  assert.equal(result.totalMessages, 3);
  assert.equal(result.contacts.length, 2);
  assert.equal(result.duplicateCount, 1);
  assert.equal(result.contacts.find((item) => item.phone === '+998917654321').fullName, 'Ali Usta');
});
