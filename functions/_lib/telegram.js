import { analyzeBookMetadata } from './ai/index.js';
import { createBook } from './books.js';
import { inspectPdfFirstPages } from './pdf.js';
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
const DEFAULT_OWNER_ID = '5252931517';

const EDIT_FIELDS = {
  title_uz: "Kitob nomi (o'zbek)",
  title_ru: 'Kitob nomi (rus)',
  title_en: 'Kitob nomi (ingliz)',
  author: 'Muallif(lar)',
  year: 'Yil',
  description_uz: "Tavsif (o'zbek)",
  description_ru: 'Tavsif (rus)',
  description_en: 'Tavsif (ingliz)',
};

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

function ownerId(env) {
  return String(env.TELEGRAM_OWNER_ID || DEFAULT_OWNER_ID).trim();
}

function isOwner(env, userId) {
  return String(userId) === ownerId(env);
}

async function isTelegramAdmin(env, userId) {
  const id = String(userId);
  if (isOwner(env, id) || allowedUserIds(env).has(id)) return true;
  try {
    const admin = await env.DB.prepare('SELECT user_id FROM telegram_admins WHERE user_id = ?')
      .bind(id)
      .first();
    return Boolean(admin);
  } catch {
    return false;
  }
}

async function addTelegramAdmin(env, userId, addedBy) {
  await env.DB.prepare(`
    INSERT INTO telegram_admins (user_id, added_by, added_at)
    VALUES (?, ?, datetime('now'))
    ON CONFLICT(user_id) DO UPDATE SET
      added_by=excluded.added_by,
      added_at=datetime('now')
  `).bind(String(userId), String(addedBy)).run();
}

async function removeTelegramAdmin(env, userId) {
  await env.DB.prepare('DELETE FROM telegram_admins WHERE user_id = ?')
    .bind(String(userId))
    .run();
}

async function listTelegramAdmins(env) {
  const { results = [] } = await env.DB.prepare('SELECT user_id, added_at FROM telegram_admins ORDER BY added_at DESC').all();
  return results;
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
      (user_id, chat_id, state, category, pdf_file_id, pdf_name, pdf_size,
       pending_pdf_key, pending_cover_key, pending_metadata, edit_field, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
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

function parsePendingMetadata(session) {
  const value = session?.pending_metadata;
  if (!value) throw new Error("Tasdiqlanadigan kitob ma'lumoti topilmadi");
  return JSON.parse(value);
}

function metadataForStorage(metadata) {
  return JSON.stringify(metadata);
}

function previewKeyboard() {
  return {
    inline_keyboard: [
      [{ text: 'Tasdiqlayman', callback_data: 'book:confirm' }],
      [{ text: 'Tahrirlayman', callback_data: 'book:edit' }],
      [{ text: 'Bekor qilaman', callback_data: 'book:cancel' }],
    ],
  };
}

function editKeyboard() {
  const entries = Object.entries(EDIT_FIELDS);
  const rows = [];
  for (let i = 0; i < entries.length; i += 2) {
    rows.push(entries.slice(i, i + 2).map(([key, label]) => ({
      text: label,
      callback_data: `edit:${key}`,
    })));
  }
  rows.push([{ text: 'Orqaga', callback_data: 'book:preview' }]);
  return { inline_keyboard: rows };
}

function adminKeyboard() {
  return {
    inline_keyboard: [
      [{ text: "Admin qo'shish", callback_data: 'admin:add' }],
      [{ text: "Admin o'chirish", callback_data: 'admin:remove' }],
      [{ text: "Adminlar ro'yxati", callback_data: 'admin:list' }],
    ],
  };
}

function shortText(value, maxLength = 700) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  return text.length > maxLength ? `${text.slice(0, maxLength - 3)}...` : text;
}

function formatPreview(metadata, categoryLabel) {
  return [
    "Kitob ma'lumotlarini tekshiring:",
    '',
    `Nomi (uz): ${metadata.title?.uz || '-'}`,
    `Nomi (ru): ${metadata.title?.ru || '-'}`,
    `Nomi (en): ${metadata.title?.en || '-'}`,
    `Muallif: ${metadata.author || '-'}`,
    `Yil: ${metadata.year || '-'}`,
    `Sahifalar: ${metadata.pages || '-'}`,
    `Kategoriya: ${categoryLabel}`,
    '',
    `Tavsif (uz): ${shortText(metadata.description?.uz) || '-'}`,
    `Tavsif (ru): ${shortText(metadata.description?.ru) || '-'}`,
    `Tavsif (en): ${shortText(metadata.description?.en) || '-'}`,
  ].join('\n').slice(0, 3900);
}

function applyEdit(metadata, field, value) {
  const text = String(value || '').trim();
  if (field === 'year') {
    const year = text ? Number(text) : null;
    if (text && (!Number.isInteger(year) || year < 1900 || year > 2100)) {
      throw new Error("Yilni 1900-2100 oralig'ida raqam qilib yuboring yoki bo'sh qoldiring");
    }
    return { ...metadata, year };
  }
  if (field === 'author') return { ...metadata, author: text || "Noma'lum" };
  if (field.startsWith('title_')) {
    const lang = field.slice('title_'.length);
    return { ...metadata, title: { ...metadata.title, [lang]: text } };
  }
  if (field.startsWith('description_')) {
    const lang = field.slice('description_'.length);
    return { ...metadata, description: { ...metadata.description, [lang]: text } };
  }
  throw new Error("Tahrir maydoni noto'g'ri");
}

async function sendPreview(env, chatId, session) {
  const category = categoryByKey(session.category);
  const metadata = parsePendingMetadata(session);
  await sendMessage(env, chatId, formatPreview(metadata, category?.label || session.category), previewKeyboard());
}

async function cancelPendingBook(env, session, chatId, userId) {
  await deleteObjects(env.BUCKET, [session.pending_pdf_key, session.pending_cover_key].filter(Boolean));
  await resetSession(env, userId, chatId);
  await sendMessage(env, chatId, 'Kitob qo\'shish bekor qilindi.', mainKeyboard());
}

async function processBook({ env, chatId, userId, session, cover }) {
  const uploadedKeys = [];
  try {
    await sendMessage(env, chatId, "Fayllar qabul qilindi. Kitob ma'lumotlari tayyorlanmoqda...");

    const pdfBuffer = await downloadTelegramFile(env, session.pdf_file_id, session.pdf_size);
    const pdfInfo = await inspectPdfFirstPages(pdfBuffer, 2);

    const category = categoryByKey(session.category);
    if (!category) throw new Error("Tanlangan kategoriya topilmadi");

    const metadata = await analyzeBookMetadata({
      env,
      pdfBuffer,
      fileName: session.pdf_name,
      categoryName: category.label,
      pageCount: pdfInfo.pageCount,
      firstPagesText: pdfInfo.firstPagesText,
    });

    const coverBuffer = await downloadTelegramFile(env, cover.fileId, cover.fileSize);

    const pdfKey = createStorageKey('books', session.pdf_name, 'application/pdf');
    const coverKey = createStorageKey('covers', cover.fileName, cover.contentType);
    await putObject(env.BUCKET, pdfKey, pdfBuffer, 'application/pdf');
    uploadedKeys.push(pdfKey);
    await putObject(env.BUCKET, coverKey, coverBuffer, cover.contentType);
    uploadedKeys.push(coverKey);

    const pendingMetadata = {
      ...metadata,
      pages: pdfInfo.pageCount || metadata.pages || null,
      category: category.key,
      file_key: pdfKey,
      cover_key: coverKey,
    };

    const nextSession = {
      ...session,
      user_id: userId,
      chat_id: chatId,
      state: 'awaiting_confirm',
      pending_pdf_key: pdfKey,
      pending_cover_key: coverKey,
      pending_metadata: metadataForStorage(pendingMetadata),
      edit_field: null,
    };
    await saveSession(env, nextSession);
    await sendPreview(env, chatId, nextSession);
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

  if (!(await isTelegramAdmin(env, from.id))) {
    await sendMessage(
      env,
      chatId,
      `Bu botga kirishga ruxsat yo'q. Telegram user ID: ${from.id}`,
    );
    return { background: null };
  }

  if (callback) {
    await answerCallback(env, callback.id);
    const data = callback.data || '';

    if (data === 'cancel') {
      await resetSession(env, from.id, chatId);
      await sendMessage(env, chatId, 'Jarayon bekor qilindi.', mainKeyboard());
      return { background: null };
    }

    if (data === 'book:preview') {
      const session = await getSession(env, from.id);
      await sendPreview(env, chatId, session);
      return { background: null };
    }

    if (data === 'book:cancel') {
      const session = await getSession(env, from.id);
      await cancelPendingBook(env, session, chatId, from.id);
      return { background: null };
    }

    if (data === 'book:edit') {
      const session = await getSession(env, from.id);
      if (session.state !== 'awaiting_confirm') {
        await sendMessage(env, chatId, 'Tahrirlash uchun avval kitob preview holatida bo\'lishi kerak.');
        return { background: null };
      }
      await sendMessage(env, chatId, 'Qaysi ma\'lumotni tahrirlaysiz?', editKeyboard());
      return { background: null };
    }

    if (data === 'book:confirm') {
      const session = await getSession(env, from.id);
      if (session.state !== 'awaiting_confirm') {
        await sendMessage(env, chatId, 'Tasdiqlanadigan kitob topilmadi.');
        return { background: null };
      }
      const metadata = parsePendingMetadata(session);
      const book = await createBook(env, metadata);
      await resetSession(env, from.id, chatId);
      const siteUrl = String(env.PUBLIC_SITE_URL || '').replace(/\/$/, '');
      const bookUrl = siteUrl ? `\n${siteUrl}/?book=${book.id}` : '';
      await sendMessage(env, chatId, [
        'Bajarildi!',
        `Kitob: ${book.title.uz}`,
        `Muallif: ${book.author}`,
        `Yil: ${book.year || '-'}`,
        `Sahifalar: ${book.pages || '-'}`,
        `${bookUrl}`,
      ].join('\n'), mainKeyboard());
      return { background: null };
    }

    if (data.startsWith('edit:')) {
      const field = data.slice('edit:'.length);
      if (!EDIT_FIELDS[field]) {
        await sendMessage(env, chatId, "Tahrir maydoni noto'g'ri.");
        return { background: null };
      }
      const session = await getSession(env, from.id);
      await saveSession(env, {
        ...session,
        user_id: from.id,
        chat_id: chatId,
        state: 'awaiting_edit',
        edit_field: field,
      });
      await sendMessage(env, chatId, `${EDIT_FIELDS[field]} uchun yangi qiymatni yuboring.`);
      return { background: null };
    }

    if (data.startsWith('admin:')) {
      if (!isOwner(env, from.id)) {
        await sendMessage(env, chatId, 'Adminlarni faqat owner boshqaradi.');
        return { background: null };
      }
      const action = data.slice('admin:'.length);
      if (action === 'add' || action === 'remove') {
        await saveSession(env, {
          user_id: from.id,
          chat_id: chatId,
          state: action === 'add' ? 'awaiting_admin_add' : 'awaiting_admin_remove',
        });
        await sendMessage(env, chatId, action === 'add'
          ? "Qo'shiladigan admin Telegram user ID raqamini yuboring."
          : "O'chiriladigan admin Telegram user ID raqamini yuboring.");
        return { background: null };
      }
      if (action === 'list') {
        const admins = await listTelegramAdmins(env);
        const lines = admins.length
          ? admins.map((admin) => `- ${admin.user_id} (${admin.added_at || '-'})`)
          : ["Hozircha qo'shimcha admin yo'q."];
        await sendMessage(env, chatId, [`Owner: ${ownerId(env)}`, ...lines].join('\n'));
        return { background: null };
      }
    }

    if (data.startsWith('category:')) {
      const category = categoryByKey(data.slice('category:'.length));
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
    if (text === '/cancel') {
      const current = await getSession(env, from.id);
      await deleteObjects(env.BUCKET, [current.pending_pdf_key, current.pending_cover_key].filter(Boolean));
    }
    await resetSession(env, from.id, chatId);
    await sendMessage(env, chatId, text === '/cancel' ? 'Jarayon bekor qilindi.' : 'Kitob yuklash botiga xush kelibsiz.', mainKeyboard());
    return { background: null };
  }

  if (text === '/admin' || text === 'Adminlar') {
    if (!isOwner(env, from.id)) {
      await sendMessage(env, chatId, 'Admin panel faqat owner uchun.');
      return { background: null };
    }
    await sendMessage(env, chatId, 'Adminlarni boshqarish:', adminKeyboard());
    return { background: null };
  }

  if (text === 'Kitob yuklash') {
    const current = await getSession(env, from.id);
    await deleteObjects(env.BUCKET, [current.pending_pdf_key, current.pending_cover_key].filter(Boolean));
    await resetSession(env, from.id, chatId);
    await sendMessage(env, chatId, "Kitob qaysi bo'limga tegishli?", categoryKeyboard());
    return { background: null };
  }

  const session = await getSession(env, from.id);
  if (session.state === 'processing') {
    await sendMessage(env, chatId, 'Oldingi kitob hali qayta ishlanmoqda. Preview xabarini kuting.');
    return { background: null };
  }

  if (session.state === 'awaiting_admin_add' || session.state === 'awaiting_admin_remove') {
    if (!isOwner(env, from.id)) {
      await resetSession(env, from.id, chatId);
      await sendMessage(env, chatId, 'Adminlarni faqat owner boshqaradi.');
      return { background: null };
    }
    if (!/^\d{4,20}$/.test(text)) {
      await sendMessage(env, chatId, 'Telegram user ID faqat raqamlardan iborat bo\'lishi kerak.');
      return { background: null };
    }
    if (session.state === 'awaiting_admin_add') {
      await addTelegramAdmin(env, text, from.id);
      await resetSession(env, from.id, chatId);
      await sendMessage(env, chatId, `Admin qo'shildi: ${text}`, mainKeyboard());
      return { background: null };
    }
    if (text === ownerId(env)) {
      await sendMessage(env, chatId, "Ownerni adminlardan o'chirib bo'lmaydi.");
      return { background: null };
    }
    await removeTelegramAdmin(env, text);
    await resetSession(env, from.id, chatId);
    await sendMessage(env, chatId, `Admin o'chirildi: ${text}`, mainKeyboard());
    return { background: null };
  }

  if (session.state === 'awaiting_edit') {
    const field = session.edit_field;
    const metadata = parsePendingMetadata(session);
    const nextMetadata = applyEdit(metadata, field, text);
    const nextSession = {
      ...session,
      user_id: from.id,
      chat_id: chatId,
      state: 'awaiting_confirm',
      pending_metadata: metadataForStorage(nextMetadata),
      edit_field: null,
    };
    await saveSession(env, nextSession);
    await sendPreview(env, chatId, nextSession);
    return { background: null };
  }

  if (session.state === 'awaiting_confirm') {
    await sendPreview(env, chatId, session);
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
