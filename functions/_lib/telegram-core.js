/**
 * Telegram bot yadro helperlari.
 * telegram.js (kitoblar, adminlar) va telegram-materials.js
 * (taqdimot, video, test) modullari shu yerdan foydalanadi.
 */

export const TELEGRAM_CATEGORIES = [
  { key: 'it', label: 'IT' },
  { key: 'ai', label: "Sun'iy intellekt" },
  { key: 'iqtisodiyot', label: 'Iqtisodiyot' },
  { key: 'biznes', label: 'Biznes va Tadbirkorlik' },
  { key: 'salomatlik', label: 'Salomatlik va Kosmetika' },
  { key: 'bogdorchilik', label: "Bog'dorchilik" },
  { key: 'fandastur', label: 'Fan dasturlari' },
  { key: 'ai_darslar', label: 'SI darslar' },
  { key: 'ai_agentlar', label: 'SI agentlar' },
  { key: 'boshqa', label: 'Boshqa' },
];

export const IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp'];
const DEFAULT_MAX_PDF_BYTES = 19 * 1024 * 1024;
const DEFAULT_OWNER_ID = '5252931517';

export function categoryByKey(key) {
  return TELEGRAM_CATEGORIES.find((item) => item.key === key);
}

export function categoryLabel(key) {
  return categoryByKey(key)?.label || key || 'Boshqa';
}

export function categoryKeyboard(prefix = 'category') {
  const rows = [];
  for (let index = 0; index < TELEGRAM_CATEGORIES.length; index += 2) {
    rows.push(TELEGRAM_CATEGORIES.slice(index, index + 2).map((item) => ({
      text: item.label,
      callback_data: `${prefix}:${item.key}`,
    })));
  }
  rows.push([{ text: 'Bekor qilish', callback_data: 'cancel' }]);
  return { inline_keyboard: rows };
}

export function ownerId(env) {
  return String(env.TELEGRAM_OWNER_ID || DEFAULT_OWNER_ID).trim();
}

export function isOwner(env, userId) {
  return String(userId) === ownerId(env);
}

export function maxPdfBytes(env) {
  const megabytes = Number(env.TELEGRAM_MAX_PDF_MB || 19);
  if (!Number.isFinite(megabytes) || megabytes <= 0 || megabytes > 20) {
    return DEFAULT_MAX_PDF_BYTES;
  }
  return Math.floor(megabytes * 1024 * 1024);
}

// ---------- Telegram API ----------

export async function telegramApi(env, method, body) {
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

export async function sendMessage(env, chatId, text, replyMarkup) {
  return telegramApi(env, 'sendMessage', {
    chat_id: chatId,
    text: String(text || '').slice(0, 4096),
    ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
  });
}

export async function sendHtmlMessage(env, chatId, html, replyMarkup) {
  return telegramApi(env, 'sendMessage', {
    chat_id: chatId,
    text: String(html || '').slice(0, 4096),
    parse_mode: 'HTML',
    ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
  });
}

export async function sendPhoto(env, chatId, photo, caption) {
  return telegramApi(env, 'sendPhoto', {
    chat_id: chatId,
    photo,
    ...(caption ? { caption: String(caption).slice(0, 1024) } : {}),
  });
}

export async function answerCallback(env, callbackId, text) {
  return telegramApi(env, 'answerCallbackQuery', {
    callback_query_id: callbackId,
    ...(text ? { text } : {}),
  });
}

export async function downloadTelegramFile(env, fileId, expectedSize) {
  if (expectedSize && expectedSize > 20 * 1024 * 1024) {
    throw new Error("Telegram orqali 20 MB dan katta faylni yuklab bo'lmaydi");
  }
  const file = await telegramApi(env, 'getFile', { file_id: fileId });
  if (!file?.file_path) throw new Error('Telegram fayl manzilini qaytarmadi');

  const response = await fetch(`https://api.telegram.org/file/bot${env.TELEGRAM_BOT_TOKEN}/${file.file_path}`);
  if (!response.ok) throw new Error(`Telegram faylini yuklab bo'lmadi (${response.status})`);
  return response.arrayBuffer();
}

// ---------- Sessiya ----------

export async function getSession(env, userId) {
  return await env.DB.prepare('SELECT * FROM telegram_sessions WHERE user_id = ?')
    .bind(String(userId))
    .first() || { user_id: String(userId), state: 'idle' };
}

export async function saveSession(env, session) {
  await env.DB.prepare(`
    INSERT INTO telegram_sessions
      (user_id, chat_id, state, category, pdf_file_id, pdf_name, pdf_size,
       pending_pdf_key, pending_cover_key, pending_metadata, edit_field,
       active_book_id, list_page, material_type, pending_source_key, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(user_id) DO UPDATE SET
      chat_id=excluded.chat_id,
      state=excluded.state,
      category=excluded.category,
      pdf_file_id=excluded.pdf_file_id,
      pdf_name=excluded.pdf_name,
      pdf_size=excluded.pdf_size,
      pending_pdf_key=excluded.pending_pdf_key,
      pending_cover_key=excluded.pending_cover_key,
      pending_metadata=excluded.pending_metadata,
      edit_field=excluded.edit_field,
      active_book_id=excluded.active_book_id,
      list_page=excluded.list_page,
      material_type=excluded.material_type,
      pending_source_key=excluded.pending_source_key,
      updated_at=datetime('now')
  `).bind(
    String(session.user_id),
    String(session.chat_id),
    session.state,
    session.category || null,
    session.pdf_file_id || null,
    session.pdf_name || null,
    session.pdf_size || null,
    session.pending_pdf_key || null,
    session.pending_cover_key || null,
    session.pending_metadata || null,
    session.edit_field || null,
    session.active_book_id || null,
    Number.isInteger(session.list_page) ? session.list_page : null,
    session.material_type || null,
    session.pending_source_key || null,
  ).run();
}

export async function resetSession(env, userId, chatId) {
  await saveSession(env, {
    user_id: userId,
    chat_id: chatId,
    state: 'idle',
  });
}

// ---------- Xabar tarkibi ----------

export function getCover(message) {
  if (Array.isArray(message?.photo) && message.photo.length) {
    const photo = [...message.photo].sort((left, right) => (right.file_size || 0) - (left.file_size || 0))[0];
    return {
      fileId: photo.file_id,
      fileName: `cover-${photo.file_unique_id || photo.file_id}.jpg`,
      fileSize: photo.file_size || null,
      contentType: 'image/jpeg',
    };
  }

  const document = message?.document;
  if (document && IMAGE_MIMES.includes(document.mime_type)) {
    return {
      fileId: document.file_id,
      fileName: document.file_name || 'cover',
      fileSize: document.file_size || null,
      contentType: document.mime_type,
    };
  }
  return null;
}

export function getPdf(message) {
  const document = message?.document;
  if (!document) return null;
  const isPdf = document.mime_type === 'application/pdf' || /\.pdf$/i.test(document.file_name || '');
  return isPdf ? document : null;
}

// ---------- Matn helperlari ----------

export function safeErrorMessage(error) {
  return String(error?.message || error || "Noma'lum xatolik")
    .replace(/(Bearer|key|token)\s+[A-Za-z0-9._-]+/gi, '$1 ***')
    .slice(0, 700);
}

export function parseJson(value, fallback = null) {
  try {
    return JSON.parse(value || '');
  } catch {
    return fallback;
  }
}

export function shortText(value, maxLength = 700) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  return text.length > maxLength ? `${text.slice(0, maxLength - 3)}...` : text;
}

export function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}
