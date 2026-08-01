import {
  addGroupModerator,
  allowBot,
  claimGroupRequest,
  clearModeratorSession,
  clearRequestMessages,
  createGroupImport,
  createGroupRequest,
  deleteGroupContact,
  finishGroupRequest,
  getGroupConfig,
  getGroupContact,
  getGroupImport,
  getGroupRequest,
  getModeratorSession,
  isAllowedBot,
  isAnyGroupModerator,
  isGroupModerator,
  listGroupContacts,
  listGroupImportContacts,
  listGroupModerators,
  listModeratorGroups,
  listRequestMessages,
  removeGroupModerator,
  reopenGroupRequest,
  resolveGroupImport,
  saveModeratorSession,
  saveRequestMessage,
  setPhoneTopic,
  setTelCommandEnabled,
  updateGroupContact,
  upsertGroupConfig,
  upsertGroupContact,
  voteGroupContact,
} from './repository.js';
import {
  answerGroupCallback,
  approveGroupJoinRequest,
  banGroupMember,
  declineGroupJoinRequest,
  deleteGroupMessage,
  downloadTelegramFile,
  escapeHtml,
  sendGroupPhoto,
  sendGroupText,
  unbanGroupMember,
} from './telegram-api.js';
import {
  displayName,
  extractContactName,
  extractContactsFromTelegramExport,
  extractPhones,
  extractRequestedName,
  formatContactLine,
  formatContactsTablePages,
  normalizePhone,
  rankContacts,
} from './utils.js';

const DEFAULT_OWNER_ID = '5252931517';
const CONTACT_PAGE_SIZE = 8;
const MAX_IMPORT_BYTES = 19 * 1024 * 1024;
const MAX_IMPORT_CONTACTS = 5000;

function ownerId(env) {
  return String(env.TELEGRAM_OWNER_ID || DEFAULT_OWNER_ID).trim();
}

function isOwner(env, userId) {
  return String(userId) === ownerId(env);
}

function isGroupChat(chat) {
  return chat?.type === 'group' || chat?.type === 'supergroup';
}

function commandName(text) {
  return String(text || '').trim().split(/\s+/, 1)[0].split('@')[0].toLocaleLowerCase('uz');
}

function commandArguments(text) {
  return String(text || '').trim().replace(/^\/\S+\s*/, '').trim();
}

function groupMenuKeyboard() {
  return {
    keyboard: [[{ text: 'Guruh boshqaruvi' }]],
    resize_keyboard: true,
  };
}

function requestKeyboard(requestId, kind) {
  const rows = [];
  if (kind !== 'photo') {
    rows.push([{ text: 'Tasdiqlash', callback_data: `grp:req:${requestId}:a` }]);
  }
  if (kind === 'contact' || kind === 'photo') {
    rows.push([{ text: 'Tahrirlash', callback_data: `grp:req:${requestId}:e` }]);
  }
  if (kind === 'bot') {
    rows.push([{ text: 'Qo‘shgan odamni bloklash', callback_data: `grp:req:${requestId}:b` }]);
  }
  rows.push([{ text: 'Bekor qilish', callback_data: `grp:req:${requestId}:r` }]);
  return { inline_keyboard: rows };
}

function contactVoteKeyboard(contactId) {
  return {
    inline_keyboard: [[
      { text: 'To‘g‘ri', callback_data: `grp:vote:${contactId}:1` },
      { text: 'Noto‘g‘ri', callback_data: `grp:vote:${contactId}:-1` },
    ]],
  };
}

async function isLibraryAdmin(env, userId) {
  if (isOwner(env, userId)) return true;
  const configured = new Set(String(env.TELEGRAM_ALLOWED_USER_IDS || '')
    .split(',').map((item) => item.trim()).filter(Boolean));
  if (configured.has(String(userId))) return true;
  try {
    const row = await env.DB.prepare('SELECT 1 AS allowed FROM telegram_admins WHERE user_id = ?')
      .bind(String(userId)).first();
    return Boolean(row?.allowed);
  } catch {
    return false;
  }
}

async function moderatorRecipients(env, chatId) {
  const moderators = await listGroupModerators(env, chatId);
  const ids = new Set([ownerId(env), ...moderators.map((item) => String(item.user_id))]);
  return [...ids];
}

async function notifyModerators(env, request) {
  const recipients = await moderatorRecipients(env, request.chat_id);
  const payload = request.payload || {};
  for (const moderatorId of recipients) {
    try {
      let sent;
      const keyboard = requestKeyboard(request.id, request.kind);
      if (request.kind === 'photo') {
        sent = await sendGroupPhoto(
          env,
          moderatorId,
          payload.fileId,
          [
            '<b>Telefon topigida rasm yuborildi</b>',
            `Guruh: ${escapeHtml(payload.groupTitle || request.chat_id)}`,
            `Yubordi: ${escapeHtml(payload.senderName || request.source_user_id || '-')}`,
            'Rasmdagi ism va telefonni qo‘lda kiriting.',
          ].join('\n'),
          keyboard,
        );
      } else {
        let text = '';
        if (request.kind === 'contact') {
          text = [
            '<b>Yangi kontakt topildi</b>',
            `Guruh: ${escapeHtml(payload.groupTitle || request.chat_id)}`,
            `Yubordi: ${escapeHtml(payload.senderName || request.source_user_id || '-')}`,
            '',
            escapeHtml(formatContactLine({ full_name: payload.fullName, phone: payload.phone })),
          ].join('\n');
        } else if (request.kind === 'join') {
          text = [
            '<b>Guruhga qo‘shilish so‘rovi</b>',
            `Guruh: ${escapeHtml(payload.groupTitle || request.chat_id)}`,
            `Foydalanuvchi: <a href="tg://user?id=${Number(payload.userId)}">${escapeHtml(payload.userName)}</a>`,
            payload.username ? `Username: @${escapeHtml(payload.username)}` : '',
          ].filter(Boolean).join('\n');
        } else if (request.kind === 'bot') {
          text = [
            '<b>Noma’lum bot bloklandi</b>',
            `Guruh: ${escapeHtml(payload.groupTitle || request.chat_id)}`,
            `Bot: ${escapeHtml(payload.botName)}${payload.botUsername ? ` (@${escapeHtml(payload.botUsername)})` : ''}`,
            `Qo‘shdi: ${escapeHtml(payload.actorName || payload.actorId || '-')}`,
            '',
            'Tasdiqlansa bot blokdan olinadi va uni guruhga qayta qo‘shish mumkin.',
          ].join('\n');
        }
        sent = await sendGroupText(env, moderatorId, text, { replyMarkup: keyboard });
      }
      await saveRequestMessage(env, request.id, moderatorId, moderatorId, sent.message_id);
    } catch (error) {
      console.warn(JSON.stringify({ event: 'group_moderator_notify_failed', moderatorId, error: String(error) }));
    }
  }
}

async function removeRequestCards(env, requestId) {
  const messages = await listRequestMessages(env, requestId);
  await Promise.all(messages.map((item) => (
    deleteGroupMessage(env, item.private_chat_id, item.message_id).catch(() => null)
  )));
  await clearRequestMessages(env, requestId);
}

async function createAndNotifyRequest(env, data) {
  const id = await createGroupRequest(env, data);
  const request = await getGroupRequest(env, id);
  await notifyModerators(env, request);
  return request;
}

async function sendGroupsMenu(env, privateChatId, userId) {
  const groups = await listModeratorGroups(env, userId, ownerId(env));
  if (!groups.length) {
    await sendGroupText(env, privateChatId, 'Sizga biriktirilgan guruh topilmadi.', {
      replyMarkup: groupMenuKeyboard(),
    });
    return;
  }
  await sendGroupText(env, privateChatId, 'Boshqariladigan guruhni tanlang:', {
    replyMarkup: {
      inline_keyboard: groups.map((group) => [{
        text: group.title,
        callback_data: `grp:g:${group.chat_id}`,
      }]),
    },
  });
}

async function sendGroupPanel(env, privateChatId, userId, chatId) {
  const config = await getGroupConfig(env, chatId);
  if (!config || !(await isGroupModerator(env, chatId, userId, ownerId(env)))) {
    await sendGroupText(env, privateChatId, 'Guruh topilmadi yoki ruxsat yo‘q.');
    return;
  }
  const contacts = await listGroupContacts(env, chatId);
  const moderators = await listGroupModerators(env, chatId);
  await sendGroupText(env, privateChatId, [
    `<b>${escapeHtml(config.title)}</b>`,
    `Telefon topigi: ${config.phone_topic_id || 'sozlanmagan'}`,
    `Kontaktlar: ${contacts.length} ta`,
    `Moderatorlar: ${moderators.length} ta`,
    `/tel: ${Number(config.tel_command_enabled) ? 'yoqilgan' : 'to‘xtatilgan'}`,
  ].join('\n'), {
    replyMarkup: {
      inline_keyboard: [
        [{ text: `Kontaktlar (${contacts.length})`, callback_data: `grp:cs:${chatId}:0` }],
        [{ text: 'Kontakt qo‘shish', callback_data: `grp:cnew:${chatId}` }],
        [{
          text: Number(config.tel_command_enabled) ? '/tel ni to‘xtatish' : '/tel ni yoqish',
          callback_data: `grp:tel:${chatId}:${Number(config.tel_command_enabled) ? 0 : 1}`,
        }],
        [{ text: 'Moderatorlar', callback_data: `grp:mods:${chatId}` }],
        [{ text: 'Tarixni import qilish', callback_data: `grp:impstart:${chatId}` }],
        [{ text: 'Guruhlar', callback_data: 'grp:groups' }],
      ],
    },
  });
}

async function sendContactsPage(env, privateChatId, userId, chatId, page) {
  if (!(await isGroupModerator(env, chatId, userId, ownerId(env)))) {
    await sendGroupText(env, privateChatId, 'Ruxsat yo‘q.');
    return;
  }
  const contacts = await listGroupContacts(env, chatId);
  const safePage = Math.max(0, Math.min(Number(page) || 0, Math.max(0, Math.ceil(contacts.length / CONTACT_PAGE_SIZE) - 1)));
  const slice = contacts.slice(safePage * CONTACT_PAGE_SIZE, (safePage + 1) * CONTACT_PAGE_SIZE);
  const rows = slice.map((contact) => [{
    text: `#${contact.id} ${contact.full_name}`.slice(0, 55),
    callback_data: `grp:c:${contact.id}`,
  }]);
  const nav = [];
  if (safePage > 0) nav.push({ text: 'Oldingi', callback_data: `grp:cs:${chatId}:${safePage - 1}` });
  if ((safePage + 1) * CONTACT_PAGE_SIZE < contacts.length) nav.push({ text: 'Keyingi', callback_data: `grp:cs:${chatId}:${safePage + 1}` });
  if (nav.length) rows.push(nav);
  rows.push([{ text: 'Kontakt qo‘shish', callback_data: `grp:cnew:${chatId}` }]);
  rows.push([{ text: 'Orqaga', callback_data: `grp:g:${chatId}` }]);
  await sendGroupText(env, privateChatId, `Kontaktlar: ${contacts.length} ta. Sahifa ${safePage + 1}/${Math.max(1, Math.ceil(contacts.length / CONTACT_PAGE_SIZE))}`, {
    replyMarkup: { inline_keyboard: rows },
  });
}

async function sendContactDetail(env, privateChatId, userId, contactId) {
  const contact = await getGroupContact(env, contactId);
  if (!contact || !(await isGroupModerator(env, contact.chat_id, userId, ownerId(env)))) {
    await sendGroupText(env, privateChatId, 'Kontakt topilmadi yoki ruxsat yo‘q.');
    return;
  }
  await sendGroupText(env, privateChatId, [
    `<b>#${contact.id} ${escapeHtml(contact.full_name)}</b>`,
    `<code>${escapeHtml(contact.phone)}</code>`,
    contact.note ? `Izoh: ${escapeHtml(contact.note)}` : '',
    `To‘g‘ri: ${contact.correct_votes || 0} | Noto‘g‘ri: ${contact.wrong_votes || 0}`,
  ].filter(Boolean).join('\n'), {
    replyMarkup: {
      inline_keyboard: [
        [{ text: 'Tahrirlash', callback_data: `grp:cedit:${contact.id}` }],
        [{ text: 'O‘chirish', callback_data: `grp:cdel:${contact.id}` }],
        [{ text: 'Kontaktlar', callback_data: `grp:cs:${contact.chat_id}:0` }],
      ],
    },
  });
}

async function sendModeratorList(env, privateChatId, userId, chatId) {
  if (!(await isGroupModerator(env, chatId, userId, ownerId(env)))) {
    await sendGroupText(env, privateChatId, 'Ruxsat yo‘q.');
    return;
  }
  const moderators = await listGroupModerators(env, chatId);
  const lines = moderators.length
    ? moderators.map((item) => `${escapeHtml(item.display_name || 'Moderator')} — <code>${item.user_id}</code>`)
    : ['Moderatorlar qo‘shilmagan.'];
  await sendGroupText(env, privateChatId, ['<b>Moderatorlar</b>', ...lines].join('\n'), {
    replyMarkup: { inline_keyboard: [[{ text: 'Orqaga', callback_data: `grp:g:${chatId}` }]] },
  });
}

async function sendTelDirectory(env, message, config) {
  if (!Number(config.tel_command_enabled)) {
    await sendGroupText(env, message.chat.id, '/tel vaqtincha to‘xtatilgan.', {
      threadId: message.message_thread_id,
      replyTo: message.message_id,
    });
    return;
  }
  const contacts = await listGroupContacts(env, message.chat.id);
  const pages = formatContactsTablePages(contacts);
  for (let index = 0; index < pages.length; index += 1) {
    const pageLabel = pages.length > 1 ? ` (${index + 1}/${pages.length})` : '';
    await sendGroupText(env, message.chat.id, [
      `<b>Telefonlar bazasi${pageLabel}</b>`,
      `<pre>${escapeHtml(pages[index])}</pre>`,
    ].join('\n'), { threadId: message.message_thread_id });
  }
}

async function sendContactSearchResults(env, message, contacts) {
  if (!contacts.length) {
    await sendGroupText(env, message.chat.id, 'Bazadan mos telefon raqami topilmadi.', {
      threadId: message.message_thread_id,
      replyTo: message.message_id,
    });
    return;
  }
  for (const contact of contacts.slice(0, 12)) {
    await sendGroupText(env, message.chat.id, [
      `<b>${escapeHtml(formatContactLine(contact))}</b>`,
      `To‘g‘ri: ${contact.correct_votes || 0} | Noto‘g‘ri: ${contact.wrong_votes || 0}`,
    ].join('\n'), {
      threadId: message.message_thread_id,
      replyTo: message.message_id,
      replyMarkup: contactVoteKeyboard(contact.id),
    });
  }
}

async function handlePhoneTopicMessage(env, message, config) {
  if (String(message.message_thread_id || '') !== String(config.phone_topic_id || '')) return;
  const text = String(message.text || message.caption || '').trim();
  const requestedName = extractRequestedName(text);
  if (requestedName) {
    const contacts = await listGroupContacts(env, message.chat.id);
    await sendContactSearchResults(env, message, rankContacts(contacts, requestedName));
    return;
  }

  const sender = displayName(message.from);
  if (message.contact) {
    const phone = normalizePhone(message.contact.phone_number);
    if (phone) {
      const fullName = [message.contact.first_name, message.contact.last_name].filter(Boolean).join(' ').trim() || sender;
      await createAndNotifyRequest(env, {
        chatId: message.chat.id,
        topicId: message.message_thread_id,
        kind: 'contact',
        sourceUserId: message.from?.id,
        sourceMessageId: message.message_id,
        payload: { fullName, phone, senderName: sender, groupTitle: config.title },
      });
    }
    return;
  }

  const phones = extractPhones(text);
  for (const phone of phones) {
    const fullName = extractContactName(text, phone) || sender;
    await createAndNotifyRequest(env, {
      chatId: message.chat.id,
      topicId: message.message_thread_id,
      kind: 'contact',
      sourceUserId: message.from?.id,
      sourceMessageId: message.message_id,
      payload: { fullName, phone, senderName: sender, groupTitle: config.title },
    });
  }
  if (phones.length) return;

  const photo = message.photo?.at(-1);
  if (photo?.file_id) {
    await createAndNotifyRequest(env, {
      chatId: message.chat.id,
      topicId: message.message_thread_id,
      kind: 'photo',
      sourceUserId: message.from?.id,
      sourceMessageId: message.message_id,
      payload: { fileId: photo.file_id, senderName: sender, groupTitle: config.title },
    });
  }
}

async function processRequestCallback(env, callback, requestId, action) {
  const request = await getGroupRequest(env, requestId);
  if (!request) {
    await answerGroupCallback(env, callback.id, 'So‘rov topilmadi.');
    return;
  }
  if (!(await isGroupModerator(env, request.chat_id, callback.from.id, ownerId(env)))) {
    await answerGroupCallback(env, callback.id, 'Bu amal uchun ruxsat yo‘q.');
    return;
  }
  const claimed = await claimGroupRequest(env, requestId, callback.from.id);
  if (!claimed) {
    await answerGroupCallback(env, callback.id, 'Bu so‘rovni boshqa moderator ko‘rib bo‘lgan.');
    return;
  }
  await answerGroupCallback(env, callback.id, 'Qabul qilindi.');
  await removeRequestCards(env, requestId);
  const payload = request.payload || {};

  try {
    if (action === 'e' && (request.kind === 'contact' || request.kind === 'photo')) {
      await saveModeratorSession(env, {
        moderatorId: callback.from.id,
        chatId: request.chat_id,
        state: 'request_contact_name',
        requestId,
        draftName: request.kind === 'contact' ? payload.fullName : null,
        draftPhone: request.kind === 'contact' ? payload.phone : null,
      });
      await sendGroupText(env, callback.from.id, [
        'Kontakt ismi yoki kasbini yuboring.',
        payload.fullName ? `Hozirgi qiymat: ${escapeHtml(payload.fullName)}` : '',
      ].filter(Boolean).join('\n'));
      return;
    }
    if (action === 'r') {
      if (request.kind === 'join') {
        await declineGroupJoinRequest(env, request.chat_id, payload.userId);
      }
      await finishGroupRequest(env, requestId, 'rejected', callback.from.id, payload);
      await sendGroupText(env, callback.from.id, 'So‘rov bekor qilindi.');
      return;
    }
    if (action === 'b' && request.kind === 'bot') {
      if (payload.actorId) await banGroupMember(env, request.chat_id, payload.actorId);
      await finishGroupRequest(env, requestId, 'actor_blocked', callback.from.id, payload);
      await sendGroupText(env, callback.from.id, 'Botni qo‘shgan foydalanuvchi bloklandi.');
      return;
    }
    if (action !== 'a') throw new Error('Noma’lum amal');

    if (request.kind === 'contact') {
      await upsertGroupContact(env, {
        chatId: request.chat_id,
        fullName: payload.fullName,
        phone: payload.phone,
        sourceUserId: request.source_user_id,
        sourceMessageId: request.source_message_id,
        approvedBy: callback.from.id,
      });
    } else if (request.kind === 'join') {
      await approveGroupJoinRequest(env, request.chat_id, payload.userId);
    } else if (request.kind === 'bot') {
      await allowBot(env, request.chat_id, {
        id: payload.botId,
        username: payload.botUsername,
      }, callback.from.id);
      await unbanGroupMember(env, request.chat_id, payload.botId);
    }
    await finishGroupRequest(env, requestId, 'approved', callback.from.id, payload);
    await sendGroupText(env, callback.from.id, request.kind === 'bot'
      ? 'Bot ruxsat etilganlar ro‘yxatiga qo‘shildi. Endi uni guruhga qayta qo‘shish mumkin.'
      : 'Tasdiqlandi.');
  } catch (error) {
    await reopenGroupRequest(env, requestId);
    await notifyModerators(env, await getGroupRequest(env, requestId));
    await sendGroupText(env, callback.from.id, `Amal bajarilmadi: ${escapeHtml(error.message)}`);
  }
}

async function handleModeratorSession(env, message, session) {
  const text = String(message.text || '').trim();
  if (commandName(text) === '/cancel') {
    if (session.request_id) {
      await reopenGroupRequest(env, session.request_id);
      const request = await getGroupRequest(env, session.request_id);
      if (request) await notifyModerators(env, request);
    }
    await clearModeratorSession(env, message.from.id);
    await sendGroupText(env, message.chat.id, 'Jarayon bekor qilindi.');
    return true;
  }

  if (session.state === 'import_file') {
    const document = message.document;
    if (!document || !String(document.file_name || '').toLowerCase().endsWith('.json')) {
      await sendGroupText(env, message.chat.id, 'Telegram Desktop’dan eksport qilingan JSON faylini yuboring.');
      return true;
    }
    if (Number(document.file_size || 0) > MAX_IMPORT_BYTES) {
      await sendGroupText(env, message.chat.id, 'JSON fayl juda katta. Maksimal hajm 19 MB. Eksportda media fayllarni o‘chiring.');
      return true;
    }
    await clearModeratorSession(env, message.from.id);
    await sendGroupText(env, message.chat.id, 'JSON qabul qilindi. Telefonlar ajratilmoqda...');
    return {
      background: () => processTelegramHistoryImport(env, message, session.chat_id, document),
    };
  }

  if (!text) {
    await sendGroupText(env, message.chat.id, 'Matn ko‘rinishida qiymat yuboring yoki /cancel bosing.');
    return true;
  }
  if (session.state === 'new_contact_name' || session.state === 'manage_contact_name' || session.state === 'request_contact_name') {
    if (text.length < 2 || text.length > 160) {
      await sendGroupText(env, message.chat.id, 'Ism yoki kasb 2-160 ta belgi bo‘lsin.');
      return true;
    }
    await saveModeratorSession(env, {
      moderatorId: message.from.id,
      chatId: session.chat_id,
      requestId: session.request_id,
      state: session.state.replace('_name', '_phone'),
      draftName: text,
      draftPhone: session.draft_phone,
    });
    await sendGroupText(env, message.chat.id, `Telefon raqamini yuboring.${session.draft_phone ? `\nHozirgi qiymat: ${escapeHtml(session.draft_phone)}` : ''}`);
    return true;
  }
  if (session.state.endsWith('_phone')) {
    const phone = normalizePhone(text);
    if (!phone) {
      await sendGroupText(env, message.chat.id, 'Telefon raqamini +998901234567 ko‘rinishida yuboring.');
      return true;
    }
    try {
      if (session.state === 'manage_contact_phone') {
        await updateGroupContact(env, session.request_id, {
          chatId: session.chat_id,
          fullName: session.draft_name,
          phone,
          approvedBy: message.from.id,
        });
      } else {
        const request = session.request_id ? await getGroupRequest(env, session.request_id) : null;
        await upsertGroupContact(env, {
          chatId: session.chat_id,
          fullName: session.draft_name,
          phone,
          sourceUserId: request?.source_user_id,
          sourceMessageId: request?.source_message_id,
          approvedBy: message.from.id,
        });
        if (request) {
          await finishGroupRequest(env, request.id, 'approved', message.from.id, {
            ...request.payload,
            fullName: session.draft_name,
            phone,
          });
        }
      }
      await clearModeratorSession(env, message.from.id);
      await sendGroupText(env, message.chat.id, `Saqlandi: ${escapeHtml(session.draft_name)}: <code>${phone}</code>`, {
        replyMarkup: { inline_keyboard: [[{ text: 'Kontaktlar', callback_data: `grp:cs:${session.chat_id}:0` }]] },
      });
    } catch (error) {
      await sendGroupText(env, message.chat.id, `Kontaktni saqlab bo‘lmadi: ${escapeHtml(error.message)}. Boshqa raqam yuboring yoki /cancel bosing.`);
    }
    return true;
  }
  return false;
}

async function processTelegramHistoryImport(env, message, chatId, document) {
  try {
    const buffer = await downloadTelegramFile(env, document.file_id, MAX_IMPORT_BYTES);
    const payload = JSON.parse(new TextDecoder().decode(buffer));
    const config = await getGroupConfig(env, chatId);
    const extracted = extractContactsFromTelegramExport(payload, {
      topicId: config?.phone_topic_id,
    });
    if (!extracted.contacts.length) {
      await sendGroupText(env, message.chat.id, 'JSON ichidan ism bilan birga yozilgan telefon raqami topilmadi.');
      return;
    }
    if (extracted.contacts.length > MAX_IMPORT_CONTACTS) {
      throw new Error(`Bitta importda maksimal ${MAX_IMPORT_CONTACTS} ta kontakt qabul qilinadi`);
    }
    const imported = await createGroupImport(env, {
      chatId,
      totalMessages: extracted.totalMessages,
      skippedCount: extracted.skippedCount,
      duplicateCount: extracted.duplicateCount,
      createdBy: message.from.id,
    }, extracted.contacts);
    const preview = await listGroupImportContacts(env, imported.id, 10, 0);
    await sendGroupText(env, message.chat.id, [
      '<b>Tarix importi tayyor</b>',
      `Xabarlar: ${imported.total_messages}`,
      `Kontaktlar: ${imported.found_count}`,
      `Takroriy raqamlar: ${imported.duplicate_count}`,
      `Ismi topilmagan: ${imported.skipped_count}`,
      '',
      '<b>Dastlabki 10 ta:</b>',
      ...preview.map((item) => escapeHtml(`${item.full_name}: ${item.phone}`)),
    ].join('\n'), {
      replyMarkup: {
        inline_keyboard: [
          [{ text: 'Barchasini tasdiqlash', callback_data: `grp:imp:${imported.id}:a` }],
          [{ text: 'Tekshirish kerak', callback_data: `grp:impl:${imported.id}:0` }],
          [{ text: 'Bekor qilish', callback_data: `grp:imp:${imported.id}:r` }],
        ],
      },
    });
  } catch (error) {
    await sendGroupText(env, message.chat.id, `Import xatoligi: ${escapeHtml(error.message)}`);
  }
}

async function handleGroupCommands(env, message, config) {
  const text = String(message.text || '').trim();
  const command = commandName(text);
  const args = commandArguments(text);
  const chatId = message.chat.id;
  const userId = message.from?.id;
  if (!userId) return false;

  if (command === '/guruh_ulash') {
    if (!isOwner(env, userId)) {
      await sendGroupText(env, chatId, 'Guruhni faqat bot owneri ulashi mumkin.', { replyTo: message.message_id });
      return true;
    }
    const saved = await upsertGroupConfig(env, {
      chatId,
      title: message.chat.title || String(chatId),
      createdBy: userId,
    });
    await addGroupModerator(env, {
      chatId,
      userId,
      displayName: displayName(message.from),
      addedBy: userId,
    });
    await sendGroupText(env, chatId, `Guruh ulandi: ${escapeHtml(saved.title)}. Endi telefon topigida /telefon_topik buyrug‘ini yuboring.`, {
      replyTo: message.message_id,
    });
    return true;
  }
  if (!config) return false;

  if (command === '/tel') {
    await sendTelDirectory(env, message, config);
    return true;
  }
  if (!command.startsWith('/')) return false;
  const moderator = await isGroupModerator(env, chatId, userId, ownerId(env));
  if (command === '/telefon_topik') {
    if (!moderator) return sendDenied(env, message);
    if (!message.message_thread_id) {
      await sendGroupText(env, chatId, 'Bu buyruqni telefon raqamlar topigining ichida yuboring.', { replyTo: message.message_id });
      return true;
    }
    await setPhoneTopic(env, chatId, message.message_thread_id);
    await sendGroupText(env, chatId, 'Telefon raqamlar topigi saqlandi.', {
      threadId: message.message_thread_id,
      replyTo: message.message_id,
    });
    return true;
  }
  if (command === '/tel_yoq' || command === '/tel_toxtat') {
    if (!moderator) return sendDenied(env, message);
    const enabled = command === '/tel_yoq';
    await setTelCommandEnabled(env, chatId, enabled);
    await sendGroupText(env, chatId, `/tel ${enabled ? 'yoqildi' : 'to‘xtatildi'}.`, { replyTo: message.message_id });
    return true;
  }
  if (command === '/guruh_holati') {
    if (!moderator) return sendDenied(env, message);
    await sendGroupText(env, chatId, [
      `Guruh: ${escapeHtml(config.title)}`,
      `Telefon topigi: ${config.phone_topic_id || 'sozlanmagan'}`,
      `/tel: ${Number(config.tel_command_enabled) ? 'yoqilgan' : 'to‘xtatilgan'}`,
    ].join('\n'), { replyTo: message.message_id });
    return true;
  }
  if (command === '/moderatorlar') {
    if (!moderator) return sendDenied(env, message);
    const moderators = await listGroupModerators(env, chatId);
    await sendGroupText(env, chatId, [
      '<b>Moderatorlar</b>',
      ...moderators.map((item) => `${escapeHtml(item.display_name || 'Moderator')}: <code>${item.user_id}</code>`),
    ].join('\n'), { replyTo: message.message_id });
    return true;
  }
  if (command === '/moderator_qosh' || command === '/moderator_ochir') {
    if (!isOwner(env, userId)) return sendDenied(env, message, 'Moderatorlarni faqat owner boshqaradi.');
    const [targetId, ...nameParts] = args.split(/\s+/);
    if (!/^\d{4,20}$/.test(targetId || '')) {
      await sendGroupText(env, chatId, `Foydalanish: ${command} TELEGRAM_ID Ism`, { replyTo: message.message_id });
      return true;
    }
    if (command === '/moderator_qosh') {
      await addGroupModerator(env, {
        chatId,
        userId: targetId,
        displayName: nameParts.join(' ') || null,
        addedBy: userId,
      });
      await sendGroupText(env, chatId, `Moderator qo‘shildi: <code>${targetId}</code>. U bot lichkasida /start bosishi kerak.`, { replyTo: message.message_id });
    } else {
      if (String(targetId) === ownerId(env)) {
        await sendGroupText(env, chatId, 'Ownerni moderatorlardan o‘chirib bo‘lmaydi.', { replyTo: message.message_id });
      } else {
        await removeGroupModerator(env, chatId, targetId);
        await sendGroupText(env, chatId, `Moderator o‘chirildi: <code>${targetId}</code>`, { replyTo: message.message_id });
      }
    }
    return true;
  }
  if (command === '/kontakt_qosh') {
    if (!moderator) return sendDenied(env, message);
    const [fullName, rawPhone] = args.split('|').map((item) => item?.trim());
    const phone = normalizePhone(rawPhone);
    if (!fullName || !phone) {
      await sendGroupText(env, chatId, 'Foydalanish: /kontakt_qosh Ism yoki kasb | +998901234567', { replyTo: message.message_id });
      return true;
    }
    await upsertGroupContact(env, { chatId, fullName, phone, approvedBy: userId });
    await sendGroupText(env, chatId, `Saqlandi: ${escapeHtml(fullName)}: <code>${phone}</code>`, { replyTo: message.message_id });
    return true;
  }
  if (command === '/kontakt_ochir') {
    if (!moderator) return sendDenied(env, message);
    if (!/^\d+$/.test(args)) {
      await sendGroupText(env, chatId, 'Foydalanish: /kontakt_ochir KONTAKT_ID', { replyTo: message.message_id });
      return true;
    }
    const deleted = await deleteGroupContact(env, Number(args), chatId);
    await sendGroupText(env, chatId, deleted ? 'Kontakt o‘chirildi.' : 'Kontakt topilmadi.', { replyTo: message.message_id });
    return true;
  }
  if (command === '/tel_import') {
    if (!moderator) return sendDenied(env, message);
    await sendGroupText(env, chatId, `Import uchun bot lichkasiga quyidagini yuboring:\n<code>/tel_import ${chatId}</code>`, { replyTo: message.message_id });
    return true;
  }
  return false;
}

async function sendDenied(env, message, text = 'Bu amal uchun moderator ruxsati kerak.') {
  await sendGroupText(env, message.chat.id, text, { replyTo: message.message_id });
  return true;
}

async function handlePrivateMessage(env, message) {
  const text = String(message.text || '').trim();
  const userId = message.from.id;
  const session = await getModeratorSession(env, userId);
  if (session) {
    const sessionResult = await handleModeratorSession(env, message, session);
    if (sessionResult && typeof sessionResult === 'object') {
      return { handled: true, background: sessionResult.background || null };
    }
    return { handled: true, background: null };
  }

  const command = commandName(text);
  if (command === '/tel_import') {
    const chatId = commandArguments(text);
    if (!/^-?\d+$/.test(chatId) || !(await isGroupModerator(env, chatId, userId, ownerId(env)))) {
      await sendGroupText(env, message.chat.id, 'Foydalanish: /tel_import GURUH_ID. Guruh ID sini guruhdagi /tel_import buyrug‘idan oling.');
      return { handled: true, background: null };
    }
    await saveModeratorSession(env, { moderatorId: userId, chatId, state: 'import_file' });
    await sendGroupText(env, message.chat.id, [
      'Telegram Desktop’dan eksport qilingan <b>JSON</b> faylini yuboring.',
      'Eksportda faqat telefon topigi yozishmalari bo‘lishi va media fayllar o‘chirilishi tavsiya etiladi.',
      'Bekor qilish: /cancel',
    ].join('\n'));
    return { handled: true, background: null };
  }
  if (text === 'Guruh boshqaruvi' || command === '/guruhlar') {
    if (!(await isAnyGroupModerator(env, userId, ownerId(env)))) {
      await sendGroupText(env, message.chat.id, 'Siz guruh moderatori emassiz.');
    } else {
      await sendGroupsMenu(env, message.chat.id, userId);
    }
    return { handled: true, background: null };
  }
  if (command === '/start' && !isOwner(env, userId) && !(await isLibraryAdmin(env, userId))
      && await isAnyGroupModerator(env, userId, ownerId(env))) {
    await sendGroupText(env, message.chat.id, 'Guruh moderatsiyasi botiga xush kelibsiz.', {
      replyMarkup: groupMenuKeyboard(),
    });
    return { handled: true, background: null };
  }
  return { handled: false, background: null };
}

async function handleGroupCallback(env, callback) {
  const data = String(callback.data || '');
  let match = data.match(/^grp:vote:(\d+):(-?1)$/);
  if (match) {
    const contact = await getGroupContact(env, Number(match[1]));
    if (!contact) {
      await answerGroupCallback(env, callback.id, 'Kontakt topilmadi.');
      return;
    }
    const voted = await voteGroupContact(env, contact.id, callback.from.id, Number(match[2]));
    await answerGroupCallback(
      env,
      callback.id,
      Number(match[2]) === 1
        ? `Rahmat. To‘g‘ri deb tasdiqlandi (${voted.correct_votes}).`
        : `Rahmat. Noto‘g‘ri deb belgilandi (${voted.wrong_votes}).`,
    );
    return;
  }
  match = data.match(/^grp:req:(\d+):([aerb])$/);
  if (match) {
    await processRequestCallback(env, callback, Number(match[1]), match[2]);
    return;
  }

  await answerGroupCallback(env, callback.id);
  if (data === 'grp:groups') {
    await sendGroupsMenu(env, callback.message.chat.id, callback.from.id);
    return;
  }
  match = data.match(/^grp:g:(-?\d+)$/);
  if (match) return sendGroupPanel(env, callback.message.chat.id, callback.from.id, match[1]);
  match = data.match(/^grp:cs:(-?\d+):(\d+)$/);
  if (match) return sendContactsPage(env, callback.message.chat.id, callback.from.id, match[1], Number(match[2]));
  match = data.match(/^grp:c:(\d+)$/);
  if (match) return sendContactDetail(env, callback.message.chat.id, callback.from.id, Number(match[1]));
  match = data.match(/^grp:cnew:(-?\d+)$/);
  if (match) {
    if (!(await isGroupModerator(env, match[1], callback.from.id, ownerId(env)))) return;
    await saveModeratorSession(env, { moderatorId: callback.from.id, chatId: match[1], state: 'new_contact_name' });
    await sendGroupText(env, callback.message.chat.id, 'Kontakt ismi yoki kasbini yuboring. Bekor qilish: /cancel');
    return;
  }
  match = data.match(/^grp:cedit:(\d+)$/);
  if (match) {
    const contact = await getGroupContact(env, Number(match[1]));
    if (!contact || !(await isGroupModerator(env, contact.chat_id, callback.from.id, ownerId(env)))) return;
    await saveModeratorSession(env, {
      moderatorId: callback.from.id,
      chatId: contact.chat_id,
      state: 'manage_contact_name',
      requestId: contact.id,
      draftName: contact.full_name,
      draftPhone: contact.phone,
    });
    await sendGroupText(env, callback.message.chat.id, `Yangi ism yoki kasbni yuboring.\nHozirgi qiymat: ${escapeHtml(contact.full_name)}`);
    return;
  }
  match = data.match(/^grp:cdel:(\d+)$/);
  if (match) {
    const contact = await getGroupContact(env, Number(match[1]));
    if (!contact || !(await isGroupModerator(env, contact.chat_id, callback.from.id, ownerId(env)))) return;
    await sendGroupText(env, callback.message.chat.id, `${escapeHtml(formatContactLine(contact))} kontaktini o‘chirasizmi?`, {
      replyMarkup: { inline_keyboard: [[
        { text: 'Ha, o‘chirish', callback_data: `grp:cdelok:${contact.id}` },
        { text: 'Yo‘q', callback_data: `grp:c:${contact.id}` },
      ]] },
    });
    return;
  }
  match = data.match(/^grp:cdelok:(\d+)$/);
  if (match) {
    const contact = await getGroupContact(env, Number(match[1]));
    if (!contact || !(await isGroupModerator(env, contact.chat_id, callback.from.id, ownerId(env)))) return;
    await deleteGroupContact(env, contact.id, contact.chat_id);
    await sendGroupText(env, callback.message.chat.id, 'Kontakt o‘chirildi.', {
      replyMarkup: { inline_keyboard: [[{ text: 'Kontaktlar', callback_data: `grp:cs:${contact.chat_id}:0` }]] },
    });
    return;
  }
  match = data.match(/^grp:tel:(-?\d+):([01])$/);
  if (match) {
    if (!(await isGroupModerator(env, match[1], callback.from.id, ownerId(env)))) return;
    await setTelCommandEnabled(env, match[1], match[2] === '1');
    await sendGroupPanel(env, callback.message.chat.id, callback.from.id, match[1]);
    return;
  }
  match = data.match(/^grp:mods:(-?\d+)$/);
  if (match) return sendModeratorList(env, callback.message.chat.id, callback.from.id, match[1]);
  match = data.match(/^grp:impstart:(-?\d+)$/);
  if (match) {
    if (!(await isGroupModerator(env, match[1], callback.from.id, ownerId(env)))) return;
    await saveModeratorSession(env, { moderatorId: callback.from.id, chatId: match[1], state: 'import_file' });
    await sendGroupText(env, callback.message.chat.id, 'Telegram Desktop’dan eksport qilingan JSON faylini yuboring. Bekor qilish: /cancel');
    return;
  }
  match = data.match(/^grp:impl:(\d+):(\d+)$/);
  if (match) {
    const imported = await getGroupImport(env, Number(match[1]));
    if (!imported || !(await isGroupModerator(env, imported.chat_id, callback.from.id, ownerId(env)))) return;
    const page = Number(match[2]);
    const rows = await listGroupImportContacts(env, imported.id, 20, page * 20);
    const pageCount = Math.max(1, Math.ceil(Number(imported.found_count) / 20));
    const navigation = [];
    if (page > 0) navigation.push({ text: 'Oldingi', callback_data: `grp:impl:${imported.id}:${page - 1}` });
    if (page + 1 < pageCount) navigation.push({ text: 'Keyingi', callback_data: `grp:impl:${imported.id}:${page + 1}` });
    const keyboard = [];
    if (navigation.length) keyboard.push(navigation);
    keyboard.push([{ text: 'Barchasini tasdiqlash', callback_data: `grp:imp:${imported.id}:a` }]);
    keyboard.push([{ text: 'Bekor qilish', callback_data: `grp:imp:${imported.id}:r` }]);
    await sendGroupText(env, callback.message.chat.id, [
      `<b>Import #${imported.id}: ${page + 1}/${pageCount}</b>`,
      ...rows.map((item) => escapeHtml(`${item.full_name}: ${item.phone}`)),
    ].join('\n'), { replyMarkup: { inline_keyboard: keyboard } });
    return;
  }
  match = data.match(/^grp:imp:(\d+):([ar])$/);
  if (match) {
    const imported = await getGroupImport(env, Number(match[1]));
    if (!imported || !(await isGroupModerator(env, imported.chat_id, callback.from.id, ownerId(env)))) return;
    try {
      const resolved = await resolveGroupImport(env, imported.id, callback.from.id, match[2] === 'a');
      await sendGroupText(env, callback.message.chat.id, resolved
        ? (match[2] === 'a' ? `${imported.found_count} tagacha yangi kontakt bazaga qo‘shildi.` : 'Import bekor qilindi.')
        : 'Bu importni boshqa moderator ko‘rib bo‘lgan.');
    } catch (error) {
      await sendGroupText(env, callback.message.chat.id, `Importni saqlab bo‘lmadi: ${escapeHtml(error.message)}`);
    }
  }
}

async function handleJoinRequest(env, joinRequest) {
  const config = await getGroupConfig(env, joinRequest.chat.id);
  if (!config) return;
  await createAndNotifyRequest(env, {
    chatId: joinRequest.chat.id,
    kind: 'join',
    sourceUserId: joinRequest.from.id,
    payload: {
      groupTitle: config.title,
      userId: joinRequest.from.id,
      userName: displayName(joinRequest.from),
      username: joinRequest.from.username || null,
    },
  });
}

async function handleUnknownBot(env, memberUpdate) {
  const config = await getGroupConfig(env, memberUpdate.chat.id);
  if (!config) return;
  const oldStatus = memberUpdate.old_chat_member?.status;
  const newMember = memberUpdate.new_chat_member;
  const bot = newMember?.user;
  const joined = ['member', 'administrator', 'restricted'].includes(newMember?.status)
    && ['left', 'kicked'].includes(oldStatus);
  if (!joined || !bot?.is_bot || await isAllowedBot(env, memberUpdate.chat.id, bot.id)) return;

  try {
    await banGroupMember(env, memberUpdate.chat.id, bot.id);
  } catch (error) {
    console.error(JSON.stringify({ event: 'unknown_bot_ban_failed', botId: bot.id, error: String(error) }));
  }
  await createAndNotifyRequest(env, {
    chatId: memberUpdate.chat.id,
    kind: 'bot',
    sourceUserId: memberUpdate.from?.id,
    payload: {
      groupTitle: config.title,
      botId: bot.id,
      botName: displayName(bot),
      botUsername: bot.username || null,
      actorId: memberUpdate.from?.id || null,
      actorName: displayName(memberUpdate.from),
    },
  });
}

export async function handleGroupUpdate(env, update) {
  const callback = update.callback_query;
  if (callback?.data?.startsWith('grp:')) {
    await handleGroupCallback(env, callback);
    return { handled: true, background: null };
  }
  if (update.chat_join_request) {
    await handleJoinRequest(env, update.chat_join_request);
    return { handled: true, background: null };
  }
  if (update.chat_member) {
    await handleUnknownBot(env, update.chat_member);
    return { handled: true, background: null };
  }

  const message = update.message;
  if (!message) return { handled: false, background: null };
  if (message.chat?.type === 'private') return handlePrivateMessage(env, message);
  if (!isGroupChat(message.chat)) return { handled: false, background: null };

  const config = await getGroupConfig(env, message.chat.id);
  const commandHandled = await handleGroupCommands(env, message, config);
  if (!commandHandled && config) await handlePhoneTopicMessage(env, message, config);
  return { handled: true, background: null };
}
