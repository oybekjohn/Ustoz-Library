export function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

export async function groupTelegramApi(env, method, body = {}) {
  if (!env.TELEGRAM_BOT_TOKEN) throw new Error('TELEGRAM_BOT_TOKEN sozlanmagan');
  const response = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.ok) {
    throw new Error(`Telegram ${method}: ${payload?.description || response.status}`);
  }
  return payload.result;
}

export function sendGroupText(env, chatId, text, options = {}) {
  return groupTelegramApi(env, 'sendMessage', {
    chat_id: chatId,
    text: String(text || '').slice(0, 4096),
    parse_mode: options.parseMode || 'HTML',
    ...(options.threadId ? { message_thread_id: Number(options.threadId) } : {}),
    ...(options.replyTo ? { reply_parameters: { message_id: Number(options.replyTo) } } : {}),
    ...(options.replyMarkup ? { reply_markup: options.replyMarkup } : {}),
  });
}

export function sendGroupPhoto(env, chatId, photo, caption, replyMarkup) {
  return groupTelegramApi(env, 'sendPhoto', {
    chat_id: chatId,
    photo,
    caption: String(caption || '').slice(0, 1024),
    parse_mode: 'HTML',
    ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
  });
}

export function deleteGroupMessage(env, chatId, messageId) {
  return groupTelegramApi(env, 'deleteMessage', {
    chat_id: chatId,
    message_id: Number(messageId),
  });
}

export function answerGroupCallback(env, callbackId, text) {
  return groupTelegramApi(env, 'answerCallbackQuery', {
    callback_query_id: callbackId,
    ...(text ? { text: String(text).slice(0, 200) } : {}),
  });
}

export function approveGroupJoinRequest(env, chatId, userId) {
  return groupTelegramApi(env, 'approveChatJoinRequest', {
    chat_id: chatId,
    user_id: Number(userId),
  });
}

export function declineGroupJoinRequest(env, chatId, userId) {
  return groupTelegramApi(env, 'declineChatJoinRequest', {
    chat_id: chatId,
    user_id: Number(userId),
  });
}

export function banGroupMember(env, chatId, userId) {
  return groupTelegramApi(env, 'banChatMember', {
    chat_id: chatId,
    user_id: Number(userId),
    revoke_messages: true,
  });
}

export function unbanGroupMember(env, chatId, userId) {
  return groupTelegramApi(env, 'unbanChatMember', {
    chat_id: chatId,
    user_id: Number(userId),
    only_if_banned: true,
  });
}

export async function downloadTelegramFile(env, fileId, maxBytes = 20 * 1024 * 1024) {
  const file = await groupTelegramApi(env, 'getFile', { file_id: fileId });
  if (Number(file?.file_size || 0) > maxBytes) throw new Error('Fayl hajmi ruxsat etilgan limitdan katta');
  const response = await fetch(`https://api.telegram.org/file/bot${env.TELEGRAM_BOT_TOKEN}/${file.file_path}`);
  if (!response.ok) throw new Error(`Telegram faylini yuklab bo‘lmadi: HTTP ${response.status}`);
  const buffer = await response.arrayBuffer();
  if (buffer.byteLength > maxBytes) throw new Error('Fayl hajmi ruxsat etilgan limitdan katta');
  return buffer;
}
