import { analyzeBookMetadata } from './ai/index.js';
import { createBook } from './books.js';
import { createStorageKey, deleteObjects, putObject } from './storage.js';

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

const IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp'];
const DEFAULT_MAX_PDF_BYTES = 19 * 1024 * 1024;

function categoryByKey(key) {
  return TELEGRAM_CATEGORIES.find((item) => item.key === key);
}

function mainKeyboard() {
  return {
    keyboard: [[{ text: 'Kitob yuklash' }]],
    resize_keyboard: true,
  };
}

function categoryKeyboard() {
  const rows = [];
  for (let i = 0; i < TELEGRAM_CATEGORIES.length; i += 2) {
    rows.push(TELEGRAM_CATEGORIES.slice(i, i + 2).map((item) => ({
      text: item.label,
      callback_data: `category:${item.key}`,
    })));
  }
  rows.push([{ text: 'Bekor qilish', callback_data: 'cancel' }]);
  return { inline_keyboard: rows };
}

function allowedUserIds(env) {
  return new Set(String(env.TELEGRAM_ALLOWED_USER_IDS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean));
}

function maxPdfBytes(env) {
  const megabytes = Number(env.TELEGRAM_MAX_PDF_MB || 19);
  if (!Number.isFinite(megabytes) || megabytes <= 0 || megabytes > 20) {
    return DEFAULT_MAX_PDF_BYTES;
  }
  return Math.floor(megabytes * 1024 * 1024);
}

async function telegramApi(env, method, body) {
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

async function sendMessage(env, chatId, text, replyMarkup) {
  return telegramApi(env, 'sendMessage', {
    chat_id: chatId,
    text,
    ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
  });
}

async function answerCallback(env, callbackId, text) {
  return telegramApi(env, 'answerCallbackQuery', {
    callback_query_id: callbackId,
    ...(text ? { text } : {}),
  });
}

async function getSession(env, userId) {
  return await env.DB.prepare('SELECT * FROM telegram_sessions WHERE user_id = ?')
    .bind(String(userId))
    .first() || { user_id: String(userId), state: 'idle' };
}

async function saveSession(env, session) {
  await env.DB.prepare(`
    INSERT INTO telegram_sessions
      (user_id, chat_id, state, category, pdf_file_id, pdf_name, pdf_size, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(user_id) DO UPDATE SET
      chat_id=excluded.chat_id,
      state=excluded.state,
      category=excluded.category,
      pdf_file_id=excluded.pdf_file_id,
      pdf_name=excluded.pdf_name,
      pdf_size=excluded.pdf_size,
      updated_at=datetime('now')
  `).bind(
    String(session.user_id),
    String(session.chat_id),
    session.state,
    session.category || null,
    session.pdf_file_id || null,
    session.pdf_name || null,
    session.pdf_size || null,
  ).run();
}

async function resetSession(env, userId, chatId) {
  await saveSession(env, {
    user_id: userId,
    chat_id: chatId,
    state: 'idle',
  });
}

async function downloadTelegramFile(env, fileId, expectedSize) {
  if (expectedSize && expectedSize > 20 * 1024 * 1024) {
    throw new Error('Telegram orqali 20 MB dan katta faylni yuklab bo\'lmaydi');
  }
  const file = await telegramApi(env, 'getFile', { file_id: fileId });
  if (!file?.file_path) throw new Error("Telegram fayl manzilini qaytarmadi");

  const response = await fetch(`https://api.telegram.org/file/bot${env.TELEGRAM_BOT_TOKEN}/${file.file_path}`);
  if (!response.ok) throw new Error(`Telegram faylini yuklab bo'lmadi (${response.status})`);
  return response.arrayBuffer();
}

function getCover(message) {
  if (Array.isArray(message.photo) && message.photo.length) {
    const photo = [...message.photo].sort((a, b) => (b.file_size || 0) - (a.file_size || 0))[0];
    return {
      fileId: photo.file_id,
      fileName: `cover-${photo.file_unique_id || photo.file_id}.jpg`,
      fileSize: photo.file_size || null,
      contentType: 'image/jpeg',
    };
  }

  const document = message.document;
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

function safeErrorMessage(error) {
  return String(error?.message || error || "Noma'lum xatolik")
    .replace(/(Bearer|key|token)\s+[A-Za-z0-9._-]+/gi, '$1 ***')
    .slice(0, 700);
}

async function processBook({ env, chatId, userId, session, cover }) {
  const uploadedKeys = [];
  try {
    await sendMessage(env, chatId, "Fayllar qabul qilindi. Kitob ma'lumotlari AI orqali tayyorlanmoqda...");

    const pdfBuffer = await downloadTelegramFile(env, session.pdf_file_id, session.pdf_size);

    const category = categoryByKey(session.category);
    if (!category) throw new Error("Tanlangan kategoriya topilmadi");

    const metadata = await analyzeBookMetadata({
      env,
      pdfBuffer,
      fileName: session.pdf_name,
      categoryName: category.label,
    });

    // PDF base64 tahlili tugagachgina muqovani yuklaymiz; bu Workers xotira
    // sarfini ayniqsa katta PDF fayllarda pastroq ushlab turadi.
    const coverBuffer = await downloadTelegramFile(env, cover.fileId, cover.fileSize);

    const pdfKey = createStorageKey('books', session.pdf_name, 'application/pdf');
    const coverKey = createStorageKey('covers', cover.fileName, cover.contentType);
    await putObject(env.BUCKET, pdfKey, pdfBuffer, 'application/pdf');
    uploadedKeys.push(pdfKey);
    await putObject(env.BUCKET, coverKey, coverBuffer, cover.contentType);
    uploadedKeys.push(coverKey);

    const book = await createBook(env, {
      ...metadata,
      category: category.key,
      file_key: pdfKey,
      cover_key: coverKey,
    });

    await resetSession(env, userId, chatId);
    const siteUrl = String(env.PUBLIC_SITE_URL || '').replace(/\/$/, '');
    const bookUrl = siteUrl ? `\n${siteUrl}/?book=${book.id}` : '';
    await sendMessage(env, chatId, [
      'Bajarildi!',
      `Kitob: ${book.title.uz}`,
      `Muallif: ${book.author}`,
      `Yil: ${book.year || '-'}`,
      `Sahifalar: ${book.pages || '-'}`,
      `Kategoriya: ${category.label}${bookUrl}`,
    ].join('\n'), mainKeyboard());
  } catch (error) {
    await deleteObjects(env.BUCKET, uploadedKeys);
    await saveSession(env, {
      ...session,
      user_id: userId,
      chat_id: chatId,
      state: 'awaiting_cover',
    });
    await sendMessage(
      env,
      chatId,
      `Kitobni saqlashda xatolik yuz berdi:\n${safeErrorMessage(error)}\n\nMuqovani qayta yuborishingiz mumkin.`,
    );
    throw error;
  }
}

export async function claimTelegramUpdate(env, updateId) {
  const result = await env.DB.prepare(`
    INSERT OR IGNORE INTO telegram_updates (update_id, status, created_at, updated_at)
    VALUES (?, 'processing', datetime('now'), datetime('now'))
  `).bind(String(updateId)).run();
  return Number(result.meta?.changes || 0) > 0;
}

export async function finishTelegramUpdate(env, updateId, status, errorMessage = null) {
  await env.DB.prepare(`
    UPDATE telegram_updates
    SET status = ?, error = ?, updated_at = datetime('now')
    WHERE update_id = ?
  `).bind(status, errorMessage, String(updateId)).run();
}

export async function handleTelegramUpdate(env, update) {
  const message = update.message;
  const callback = update.callback_query;
  const from = message?.from || callback?.from;
  const chatId = message?.chat?.id || callback?.message?.chat?.id;
  if (!from || !chatId) return { background: null };

  if (!allowedUserIds(env).has(String(from.id))) {
    await sendMessage(
      env,
      chatId,
      `Bu botga kirishga ruxsat yo'q. Telegram user ID: ${from.id}`,
    );
    return { background: null };
  }

  if (callback) {
    await answerCallback(env, callback.id);
    if (callback.data === 'cancel') {
      await resetSession(env, from.id, chatId);
      await sendMessage(env, chatId, 'Jarayon bekor qilindi.', mainKeyboard());
      return { background: null };
    }

    if (callback.data?.startsWith('category:')) {
      const category = categoryByKey(callback.data.slice('category:'.length));
      if (!category) {
        await sendMessage(env, chatId, "Kategoriya noto'g'ri tanlandi");
        return { background: null };
      }
      await saveSession(env, {
        user_id: from.id,
        chat_id: chatId,
        state: 'awaiting_pdf',
        category: category.key,
      });
      await sendMessage(env, chatId, `Kategoriya: ${category.label}\n\nPDF kitobni yuboring (maksimal ${Math.floor(maxPdfBytes(env) / 1024 / 1024)} MB).`);
    }
    return { background: null };
  }

  const text = String(message?.text || '').trim();
  if (text === '/start' || text === '/cancel') {
    await resetSession(env, from.id, chatId);
    await sendMessage(env, chatId, text === '/cancel' ? 'Jarayon bekor qilindi.' : 'Kitob yuklash botiga xush kelibsiz.', mainKeyboard());
    return { background: null };
  }

  if (text === 'Kitob yuklash') {
    await resetSession(env, from.id, chatId);
    await sendMessage(env, chatId, "Kitob qaysi bo'limga tegishli?", categoryKeyboard());
    return { background: null };
  }

  const session = await getSession(env, from.id);
  if (session.state === 'processing') {
    await sendMessage(env, chatId, 'Oldingi kitob hali qayta ishlanmoqda. Bajarildi xabarini kuting.');
    return { background: null };
  }

  if (session.state === 'awaiting_pdf') {
    const document = message.document;
    const isPdf = document && (document.mime_type === 'application/pdf' || /\.pdf$/i.test(document.file_name || ''));
    if (!isPdf) {
      await sendMessage(env, chatId, 'PDF formatdagi kitob faylini yuboring.');
      return { background: null };
    }
    if ((document.file_size || 0) > maxPdfBytes(env)) {
      await sendMessage(env, chatId, `PDF juda katta. Maksimal hajm ${Math.floor(maxPdfBytes(env) / 1024 / 1024)} MB.`);
      return { background: null };
    }

    await saveSession(env, {
      ...session,
      user_id: from.id,
      chat_id: chatId,
      state: 'awaiting_cover',
      pdf_file_id: document.file_id,
      pdf_name: document.file_name || 'kitob.pdf',
      pdf_size: document.file_size || null,
    });
    await sendMessage(env, chatId, 'PDF qabul qilindi. Endi kitob muqovasini rasm sifatida yuboring (JPG, PNG yoki WEBP).');
    return { background: null };
  }

  if (session.state === 'awaiting_cover') {
    const cover = getCover(message);
    if (!cover) {
      await sendMessage(env, chatId, 'Kitob muqovasini rasm sifatida yuboring (JPG, PNG yoki WEBP).');
      return { background: null };
    }
    if ((cover.fileSize || 0) > 8 * 1024 * 1024) {
      await sendMessage(env, chatId, 'Muqova rasmi juda katta. Maksimal hajm 8 MB.');
      return { background: null };
    }

    await saveSession(env, {
      ...session,
      user_id: from.id,
      chat_id: chatId,
      state: 'processing',
    });
    return {
      background: () => processBook({ env, chatId, userId: from.id, session, cover }),
    };
  }

  await sendMessage(env, chatId, 'Kitob yuklashni boshlash uchun tugmani bosing.', mainKeyboard());
  return { background: null };
}
