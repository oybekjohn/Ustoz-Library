import { analyzeBookMetadata } from './ai/index.js';
import {
  createBook,
  deleteBook,
  getBook,
  listBooks,
  updateBook,
} from './books.js';
import { buildCoverPrompt } from './cover-prompt.js';
import { createFirstPagesPdf, inspectPdfFirstPages } from './pdf.js';
import { createStorageKey, deleteObjects, putObject } from './storage.js';
import {
  addGroupModerator,
  disableGroupModeratorEverywhere,
} from './group/repository.js';

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
const BOT_VERSION = '3.3.2';
const BOOKS_PAGE_SIZE = 6;

const EDIT_FIELDS = {
  title_uz: "Kitob nomi (o'zbek)",
  title_ru: 'Kitob nomi (rus)',
  title_en: 'Kitob nomi (ingliz)',
  author: 'Muallif(lar)',
  year: 'Yil',
  pages: 'Sahifalar soni',
  description_uz: "Tavsif (o'zbek)",
  description_ru: 'Tavsif (rus)',
  description_en: 'Tavsif (ingliz)',
};

function categoryByKey(key) {
  return TELEGRAM_CATEGORIES.find((item) => item.key === key);
}

function categoryLabel(key) {
  return categoryByKey(key)?.label || key || 'Boshqa';
}

function mainKeyboard(role = 'owner') {
  if (role === 'library') {
    return {
      keyboard: [
        [{ text: 'Kitob yuklash' }],
        [{ text: 'Bot haqida' }],
      ],
      resize_keyboard: true,
    };
  }
  if (role === 'group') {
    return {
      keyboard: [[{ text: 'Guruh boshqaruvi' }]],
      resize_keyboard: true,
    };
  }
  return {
    keyboard: [
      [{ text: 'Kitoblarni boshqarish' }],
      [{ text: 'Guruh boshqaruvi' }],
      [{ text: 'Adminlar' }, { text: 'Bot haqida' }],
    ],
    resize_keyboard: true,
  };
}

function adminRoleKeyboard() {
  return {
    inline_keyboard: [
      [{ text: 'DL Library admini', callback_data: 'admin:role:library' }],
      [{ text: 'Guruh admini', callback_data: 'admin:role:group' }],
      [{ text: 'Bekor qilish', callback_data: 'cancel' }],
    ],
  };
}

function bookManagementKeyboard() {
  return {
    inline_keyboard: [
      [{ text: 'Kitob yuklash', callback_data: 'books:create' }],
      [
        { text: "Kitoblar ro'yxati", callback_data: 'books:list:0' },
        { text: 'Kitob qidirish', callback_data: 'books:search' },
      ],
    ],
  };
}

function categoryKeyboard(prefix = 'category') {
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

function previewKeyboard() {
  return {
    inline_keyboard: [
      [{ text: 'Tasdiqlayman', callback_data: 'create:confirm' }],
      [{ text: 'Tahrirlayman', callback_data: 'create:edit' }],
      [{ text: 'Muqova prompti', callback_data: 'create:prompt' }],
      [{ text: 'Bekor qilaman', callback_data: 'create:cancel' }],
    ],
  };
}

function createEditKeyboard() {
  const entries = Object.entries(EDIT_FIELDS);
  const rows = [];
  for (let index = 0; index < entries.length; index += 2) {
    rows.push(entries.slice(index, index + 2).map(([key, label]) => ({
      text: label,
      callback_data: `create-field:${key}`,
    })));
  }
  rows.push([
    { text: 'Kategoriya', callback_data: 'create:category' },
    { text: 'PDF', callback_data: 'create:pdf' },
  ]);
  rows.push([
    { text: 'Muqova', callback_data: 'create:cover' },
    { text: 'Orqaga', callback_data: 'create:preview' },
  ]);
  return { inline_keyboard: rows };
}

function manageEditKeyboard(bookId) {
  const entries = Object.entries(EDIT_FIELDS);
  const rows = [];
  for (let index = 0; index < entries.length; index += 2) {
    rows.push(entries.slice(index, index + 2).map(([key, label]) => ({
      text: label,
      callback_data: `manage-field:${key}:${bookId}`,
    })));
  }
  rows.push([{ text: 'Kategoriya', callback_data: `manage-category-pick:${bookId}` }]);
  rows.push([{ text: 'Orqaga', callback_data: `manage:view:${bookId}` }]);
  return { inline_keyboard: rows };
}

function bookDetailKeyboard(bookId) {
  return {
    inline_keyboard: [
      [{ text: 'Tahrirlash', callback_data: `manage:edit:${bookId}` }],
      [
        { text: 'PDF almashtirish', callback_data: `manage:pdf:${bookId}` },
        { text: 'Muqova almashtirish', callback_data: `manage:cover:${bookId}` },
      ],
      [{ text: "O'chirish", callback_data: `manage:delete:${bookId}` }],
      [{ text: "Ro'yxatga qaytish", callback_data: 'books:list:0' }],
    ],
  };
}

function deleteConfirmKeyboard(bookId) {
  return {
    inline_keyboard: [
      [{ text: "Ha, o'chirish", callback_data: `manage:delete-confirm:${bookId}` }],
      [{ text: 'Yo‘q, qaytish', callback_data: `manage:view:${bookId}` }],
    ],
  };
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

function ownerId(env) {
  return String(env.TELEGRAM_OWNER_ID || DEFAULT_OWNER_ID).trim();
}

function isOwner(env, userId) {
  return String(userId) === ownerId(env);
}

async function getTelegramAccess(env, userId) {
  const id = String(userId);
  if (isOwner(env, id)) return { user_id: id, role: 'owner' };
  try {
    const admin = await env.DB.prepare('SELECT * FROM telegram_admins WHERE user_id = ?')
      .bind(id)
      .first();
    if (admin) return admin;
  } catch {}
  return null;
}

async function addTelegramAdmin(env, admin, addedBy) {
  await env.DB.prepare(`
    INSERT INTO telegram_admins
      (user_id, added_by, added_at, role, username, first_name, group_chat_id)
    VALUES (?, ?, datetime('now'), ?, ?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET
      added_by=excluded.added_by,
      added_at=datetime('now'),
      role=excluded.role,
      username=COALESCE(excluded.username, telegram_admins.username),
      first_name=COALESCE(excluded.first_name, telegram_admins.first_name),
      group_chat_id=excluded.group_chat_id
  `).bind(
    String(admin.userId), String(addedBy), admin.role,
    admin.username || null, admin.firstName || null, admin.groupChatId || null,
  ).run();
}

async function removeTelegramAdmin(env, userId) {
  await disableGroupModeratorEverywhere(env, userId);
  await env.DB.prepare('DELETE FROM telegram_admins WHERE user_id = ?')
    .bind(String(userId))
    .run();
}

async function listTelegramAdmins(env) {
  const { results = [] } = await env.DB.prepare(
    `SELECT user_id, role, username, first_name, group_chat_id, added_by, added_at
     FROM telegram_admins ORDER BY added_at DESC`,
  ).all();
  return results;
}

async function refreshTelegramAdminProfiles(env, admins) {
  await Promise.all(admins.map(async (admin) => {
    if (admin.username && admin.first_name) return;
    const profile = await getTelegramProfile(env, admin.user_id);
    if (!profile.username && !profile.firstName) return;
    admin.username = profile.username || admin.username;
    admin.first_name = profile.firstName || admin.first_name;
    await env.DB.prepare(`
      UPDATE telegram_admins SET username = ?, first_name = ? WHERE user_id = ?
    `).bind(admin.username || null, admin.first_name || null, String(admin.user_id)).run();
  }));
}

async function listConfiguredGroups(env) {
  const { results = [] } = await env.DB.prepare(`
    SELECT chat_id, title FROM telegram_group_configs WHERE enabled = 1 ORDER BY title
  `).all();
  return results;
}

async function getTelegramProfile(env, userId) {
  try {
    const chat = await telegramApi(env, 'getChat', { chat_id: String(userId) });
    return {
      username: chat?.username || null,
      firstName: chat?.first_name || null,
    };
  } catch {
    return { username: null, firstName: null };
  }
}

async function syncTelegramAdminProfile(env, user) {
  if (!user?.id) return;
  await env.DB.prepare(`
    UPDATE telegram_admins SET username = ?, first_name = ? WHERE user_id = ?
  `).bind(user.username || null, user.first_name || null, String(user.id)).run();
}

async function mainKeyboardForUser(env, userId) {
  const access = await getTelegramAccess(env, userId);
  return mainKeyboard(access?.role || 'library');
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
    text: String(text || '').slice(0, 4096),
    ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
  });
}

async function sendHtmlMessage(env, chatId, html, replyMarkup) {
  return telegramApi(env, 'sendMessage', {
    chat_id: chatId,
    text: String(html || '').slice(0, 4096),
    parse_mode: 'HTML',
    ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
  });
}

async function sendPhoto(env, chatId, photo, caption) {
  return telegramApi(env, 'sendPhoto', {
    chat_id: chatId,
    photo,
    ...(caption ? { caption: String(caption).slice(0, 1024) } : {}),
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
       pending_pdf_key, pending_cover_key, pending_metadata, edit_field,
       active_book_id, list_page, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
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
  ).run();
}

async function resetSession(env, userId, chatId) {
  await saveSession(env, {
    user_id: userId,
    chat_id: chatId,
    state: 'idle',
  });
}

async function cleanupSessionFiles(env, session) {
  await deleteObjects(env.BUCKET, [
    session?.pending_pdf_key,
    session?.pending_cover_key,
  ].filter(Boolean));
}

async function downloadTelegramFile(env, fileId, expectedSize) {
  if (expectedSize && expectedSize > 20 * 1024 * 1024) {
    throw new Error("Telegram orqali 20 MB dan katta faylni yuklab bo'lmaydi");
  }
  const file = await telegramApi(env, 'getFile', { file_id: fileId });
  if (!file?.file_path) throw new Error("Telegram fayl manzilini qaytarmadi");

  const response = await fetch(`https://api.telegram.org/file/bot${env.TELEGRAM_BOT_TOKEN}/${file.file_path}`);
  if (!response.ok) throw new Error(`Telegram faylini yuklab bo'lmadi (${response.status})`);
  return response.arrayBuffer();
}

function getCover(message) {
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

function getPdf(message) {
  const document = message?.document;
  if (!document) return null;
  const isPdf = document.mime_type === 'application/pdf' || /\.pdf$/i.test(document.file_name || '');
  return isPdf ? document : null;
}

function safeErrorMessage(error) {
  return String(error?.message || error || "Noma'lum xatolik")
    .replace(/(Bearer|key|token)\s+[A-Za-z0-9._-]+/gi, '$1 ***')
    .slice(0, 700);
}

function parsePendingMetadata(session) {
  if (!session?.pending_metadata) throw new Error("Tasdiqlanadigan kitob ma'lumoti topilmadi");
  return JSON.parse(session.pending_metadata);
}

function parseJson(value, fallback = null) {
  try {
    return JSON.parse(value || '');
  } catch {
    return fallback;
  }
}

function shortText(value, maxLength = 700) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  return text.length > maxLength ? `${text.slice(0, maxLength - 3)}...` : text;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function previewValue(value, fallback = '-') {
  return escapeHtml(shortText(value) || fallback);
}

export function formatPreview(metadata, selectedCategory = metadata.category) {
  return [
    '<b>Kitob nomi</b>',
    `uz - ${previewValue(metadata.title?.uz)}`,
    `ru - ${previewValue(metadata.title?.ru)}`,
    `en - ${previewValue(metadata.title?.en)}`,
    '',
    `<b>Muallif(lar):</b> - ${previewValue(metadata.author)}`,
    `<b>Yil:</b> - ${previewValue(metadata.year)}`,
    `<b>Sahifalar:</b> - ${previewValue(metadata.pages)}`,
    `<b>Kategoriya:</b> - ${previewValue(categoryLabel(selectedCategory))}`,
    '',
    `<b>Tavsiflar (20-25 ta so'z):</b>`,
    `uz - ${previewValue(metadata.description?.uz)}`,
    `ru - ${previewValue(metadata.description?.ru)}`,
    `en - ${previewValue(metadata.description?.en)}`,
  ].join('\n').slice(0, 3900);
}

function formatBookDetail(book) {
  return [
    `Kitob #${book.id}`,
    '',
    `Nomi (uz): ${book.title.uz || '-'}`,
    `Nomi (ru): ${book.title.ru || '-'}`,
    `Nomi (en): ${book.title.en || '-'}`,
    `Muallif: ${book.author || '-'}`,
    `Yil: ${book.year || '-'}`,
    `Sahifalar: ${book.pages || '-'}`,
    `Kategoriya: ${categoryLabel(book.category)}`,
    `PDF: ${book.file_key ? 'bor' : "yo'q"}`,
    `Muqova: ${book.cover_key ? 'bor' : "yo'q"}`,
    '',
    `Tavsif (uz): ${shortText(book.description.uz) || '-'}`,
    `Tavsif (ru): ${shortText(book.description.ru) || '-'}`,
    `Tavsif (en): ${shortText(book.description.en) || '-'}`,
  ].join('\n').slice(0, 3900);
}

function applyEdit(metadata, field, value) {
  const text = String(value || '').trim();
  if (field === 'year') {
    const year = text ? Number(text) : null;
    if (text && (!Number.isInteger(year) || year < 1900 || year > 2100)) {
      throw new Error("Yilni 1900-2100 oralig'ida raqam qilib yuboring");
    }
    return { ...metadata, year };
  }
  if (field === 'pages') {
    const pages = text ? Number(text) : null;
    if (text && (!Number.isInteger(pages) || pages < 1 || pages > 100000)) {
      throw new Error("Sahifalar sonini musbat raqam qilib yuboring");
    }
    return { ...metadata, pages };
  }
  if (field === 'author') return { ...metadata, author: text || "Noma'lum" };
  if (field.startsWith('title_')) {
    const language = field.slice('title_'.length);
    return { ...metadata, title: { ...metadata.title, [language]: text } };
  }
  if (field.startsWith('description_')) {
    const language = field.slice('description_'.length);
    return { ...metadata, description: { ...metadata.description, [language]: text } };
  }
  throw new Error("Tahrir maydoni noto'g'ri");
}

async function sendCoverPrompt(env, chatId, metadata) {
  await sendHtmlMessage(env, chatId, formatCoverPromptMessage(metadata));
}

export function formatCoverPromptMessage(metadata) {
  const prompt = buildCoverPrompt(metadata, categoryLabel(metadata.category));
  return `<b>Muqova uchun prompt:</b>\n<pre>${escapeHtml(prompt)}</pre>`;
}

async function sendPreview(env, chatId, session) {
  const metadata = parsePendingMetadata(session);
  if (metadata.cover_telegram_file_id) {
    await sendPhoto(env, chatId, metadata.cover_telegram_file_id, 'Muqova preview');
  }
  await sendHtmlMessage(env, chatId, formatPreview(metadata, session.category), previewKeyboard());
}

async function sendBookManagementMenu(env, chatId) {
  await sendMessage(env, chatId, 'Kitoblarni boshqarish:', bookManagementKeyboard());
}

async function sendBookList(env, chatId, page = 0, query = '') {
  const result = await listBooks(env, { page, pageSize: BOOKS_PAGE_SIZE, query });
  if (!result.books.length) {
    await sendMessage(
      env,
      chatId,
      query ? `"${query}" bo'yicha kitob topilmadi.` : "Hozircha kitob yo'q.",
      bookManagementKeyboard(),
    );
    return;
  }

  const rows = result.books.map((book) => [{
    text: `#${book.id} ${shortText(book.title.uz, 44)}`,
    callback_data: `manage:view:${book.id}`,
  }]);
  const navigation = [];
  if (result.page > 0) navigation.push({
    text: 'Oldingi',
    callback_data: `books:list:${result.page - 1}`,
  });
  if ((result.page + 1) * result.pageSize < result.total) navigation.push({
    text: 'Keyingi',
    callback_data: `books:list:${result.page + 1}`,
  });
  if (navigation.length) rows.push(navigation);
  rows.push([{ text: 'Kitob qidirish', callback_data: 'books:search' }]);

  const pageCount = Math.max(1, Math.ceil(result.total / result.pageSize));
  await sendMessage(
    env,
    chatId,
    `Kitoblar: ${result.total} ta. Sahifa ${result.page + 1}/${pageCount}`,
    { inline_keyboard: rows },
  );
}

async function sendBookDetail(env, chatId, bookId) {
  const book = await getBook(env, bookId);
  if (!book) {
    await sendMessage(env, chatId, 'Kitob topilmadi.', bookManagementKeyboard());
    return;
  }
  await sendMessage(env, chatId, formatBookDetail(book), bookDetailKeyboard(book.id));
}

async function startCreate(env, chatId, userId) {
  const current = await getSession(env, userId);
  await cleanupSessionFiles(env, current);
  await resetSession(env, userId, chatId);
  await sendMessage(env, chatId, "Kitob qaysi bo'limga tegishli?", categoryKeyboard());
}

async function cancelCreate(env, chatId, userId) {
  const session = await getSession(env, userId);
  await cleanupSessionFiles(env, session);
  await resetSession(env, userId, chatId);
  await sendMessage(env, chatId, "Kitob qo'shish bekor qilindi.", await mainKeyboardForUser(env, userId));
}

async function prepareMetadataFromPdf(env, pdfBuffer, fileName, category) {
  const pdfInfo = await inspectPdfFirstPages(pdfBuffer, 2);
  let firstPagesPdfBuffer = null;
  if (!pdfInfo.firstPagesText.trim()) {
    firstPagesPdfBuffer = await createFirstPagesPdf(pdfBuffer, 2);
  }
  const metadata = await analyzeBookMetadata({
    env,
    pdfBuffer,
    firstPagesPdfBuffer,
    fileName,
    categoryName: category.label,
    pageCount: pdfInfo.pageCount,
    firstPagesText: pdfInfo.firstPagesText,
  });
  return {
    ...metadata,
    pages: pdfInfo.pageCount || metadata.pages || null,
    category: category.key,
  };
}

async function processCreatePdf({
  env,
  chatId,
  userId,
  session,
  document,
  failureState,
}) {
  let uploadedPdfKey = null;
  let committed = false;
  try {
    await sendMessage(env, chatId, "PDF qabul qilindi. Kitob ma'lumotlari tayyorlanmoqda...");
    const category = categoryByKey(session.category);
    if (!category) throw new Error("Tanlangan kategoriya topilmadi");

    const pdfBuffer = await downloadTelegramFile(env, document.file_id, document.file_size);
    const metadata = await prepareMetadataFromPdf(
      env,
      pdfBuffer,
      document.file_name || 'kitob.pdf',
      category,
    );

    uploadedPdfKey = createStorageKey(
      'books',
      document.file_name || 'kitob.pdf',
      'application/pdf',
    );
    await putObject(env.BUCKET, uploadedPdfKey, pdfBuffer, 'application/pdf');

    const pendingMetadata = {
      ...metadata,
      language: metadata.language || 'uz',
      file_key: uploadedPdfKey,
      cover_key: null,
    };
    const nextSession = {
      ...session,
      user_id: userId,
      chat_id: chatId,
      state: 'awaiting_cover',
      pdf_file_id: document.file_id,
      pdf_name: document.file_name || 'kitob.pdf',
      pdf_size: document.file_size || null,
      pending_pdf_key: uploadedPdfKey,
      pending_cover_key: null,
      pending_metadata: JSON.stringify(pendingMetadata),
      edit_field: null,
    };
    await saveSession(env, nextSession);

    await deleteObjects(env.BUCKET, [
      session.pending_pdf_key,
      session.pending_cover_key,
    ].filter((key) => key && key !== uploadedPdfKey));
    committed = true;

    await sendHtmlMessage(env, chatId, formatPreview(pendingMetadata, category.key));
    await sendCoverPrompt(env, chatId, pendingMetadata);
    await sendMessage(env, chatId, 'Prompt orqali muqovani tayyorlab, JPG, PNG yoki WEBP rasmni yuboring.');
  } catch (error) {
    if (!committed) {
      if (uploadedPdfKey) await deleteObjects(env.BUCKET, [uploadedPdfKey]);
      await saveSession(env, {
        ...session,
        user_id: userId,
        chat_id: chatId,
        state: failureState,
      });
      await sendMessage(
        env,
        chatId,
        `PDFni tahlil qilishda xatolik:\n${safeErrorMessage(error)}\n\nPDFni qayta yuboring.`,
      );
    }
    throw error;
  }
}

async function saveCreateCover({ env, chatId, userId, session, cover }) {
  const coverBuffer = await downloadTelegramFile(env, cover.fileId, cover.fileSize);
  const coverKey = createStorageKey('covers', cover.fileName, cover.contentType);
  await putObject(env.BUCKET, coverKey, coverBuffer, cover.contentType);
  let committed = false;

  try {
    const metadata = {
      ...parsePendingMetadata(session),
      cover_key: coverKey,
      cover_telegram_file_id: cover.fileId,
    };
    const nextSession = {
      ...session,
      user_id: userId,
      chat_id: chatId,
      state: 'awaiting_confirm',
      pending_cover_key: coverKey,
      pending_metadata: JSON.stringify(metadata),
      edit_field: null,
    };
    await saveSession(env, nextSession);
    if (session.pending_cover_key && session.pending_cover_key !== coverKey) {
      await deleteObjects(env.BUCKET, [session.pending_cover_key]);
    }
    committed = true;
    await sendPreview(env, chatId, nextSession);
  } catch (error) {
    if (!committed) await deleteObjects(env.BUCKET, [coverKey]);
    throw error;
  }
}

async function processManagedPdf({ env, chatId, userId, session, document }) {
  let newKey = null;
  let committed = false;
  try {
    await sendMessage(env, chatId, 'Yangi PDF tekshirilmoqda...');
    const book = await getBook(env, session.active_book_id);
    if (!book) throw new Error('Kitob topilmadi');
    const pdfBuffer = await downloadTelegramFile(env, document.file_id, document.file_size);
    const pdfInfo = await inspectPdfFirstPages(pdfBuffer, 2);
    newKey = createStorageKey('books', document.file_name || 'kitob.pdf', 'application/pdf');
    await putObject(env.BUCKET, newKey, pdfBuffer, 'application/pdf');

    const result = await updateBook(env, book.id, {
      file_key: newKey,
      pages: pdfInfo.pageCount || book.pages,
    });
    await deleteObjects(env.BUCKET, result.replacedKeys);
    committed = true;
    await resetSession(env, userId, chatId);
    await sendMessage(env, chatId, 'PDF almashtirildi.');
    await sendBookDetail(env, chatId, book.id);
  } catch (error) {
    if (!committed) {
      if (newKey) await deleteObjects(env.BUCKET, [newKey]);
      await saveSession(env, {
        ...session,
        user_id: userId,
        chat_id: chatId,
        state: 'awaiting_manage_pdf',
      });
      await sendMessage(env, chatId, `PDFni almashtirishda xatolik:\n${safeErrorMessage(error)}`);
    }
    throw error;
  }
}

async function replaceManagedCover({ env, chatId, userId, session, cover }) {
  let newKey = null;
  let committed = false;
  try {
    const book = await getBook(env, session.active_book_id);
    if (!book) throw new Error('Kitob topilmadi');
    const coverBuffer = await downloadTelegramFile(env, cover.fileId, cover.fileSize);
    newKey = createStorageKey('covers', cover.fileName, cover.contentType);
    await putObject(env.BUCKET, newKey, coverBuffer, cover.contentType);
    const result = await updateBook(env, book.id, { cover_key: newKey });
    await deleteObjects(env.BUCKET, result.replacedKeys);
    committed = true;
    await resetSession(env, userId, chatId);
    await sendMessage(env, chatId, 'Muqova almashtirildi.');
    await sendBookDetail(env, chatId, book.id);
  } catch (error) {
    if (!committed && newKey) await deleteObjects(env.BUCKET, [newKey]);
    throw error;
  }
}

async function handleCreateCallback(env, callback, chatId, userId, data) {
  if (data === 'create:cancel') {
    await cancelCreate(env, chatId, userId);
    return true;
  }
  if (data === 'create:preview') {
    await sendPreview(env, chatId, await getSession(env, userId));
    return true;
  }
  if (data === 'create:prompt') {
    const metadata = parsePendingMetadata(await getSession(env, userId));
    await sendCoverPrompt(env, chatId, metadata);
    return true;
  }
  if (data === 'create:edit') {
    const session = await getSession(env, userId);
    if (session.state !== 'awaiting_confirm') {
      await sendMessage(env, chatId, "Tahrirlash uchun avval muqovani yuboring.");
      return true;
    }
    await sendMessage(env, chatId, "Qaysi ma'lumotni tahrirlaysiz?", createEditKeyboard());
    return true;
  }
  if (data === 'create:confirm') {
    const session = await getSession(env, userId);
    if (session.state !== 'awaiting_confirm') {
      await sendMessage(env, chatId, 'Tasdiqlanadigan kitob topilmadi.');
      return true;
    }
    const metadata = parsePendingMetadata(session);
    const book = await createBook(env, metadata);
    await resetSession(env, userId, chatId);
    const siteUrl = String(env.PUBLIC_SITE_URL || '').replace(/\/$/, '');
    const bookUrl = siteUrl ? `\n${siteUrl}/?book=${book.id}` : '';
    await sendMessage(env, chatId, [
      'Bajarildi!',
      `Kitob: ${book.title.uz}`,
      `Muallif: ${book.author}`,
      `Yil: ${book.year || '-'}`,
      `Sahifalar: ${book.pages || '-'}`,
      bookUrl,
    ].join('\n'), await mainKeyboardForUser(env, userId));
    return true;
  }
  if (data === 'create:category') {
    await sendMessage(env, chatId, 'Yangi kategoriyani tanlang:', categoryKeyboard('create-category'));
    return true;
  }
  if (data === 'create:pdf') {
    const session = await getSession(env, userId);
    await saveSession(env, { ...session, state: 'awaiting_create_pdf' });
    await sendMessage(env, chatId, `Yangi PDFni yuboring (maksimal ${Math.floor(maxPdfBytes(env) / 1024 / 1024)} MB).`);
    return true;
  }
  if (data === 'create:cover') {
    const session = await getSession(env, userId);
    await saveSession(env, { ...session, state: 'awaiting_create_cover' });
    await sendMessage(env, chatId, 'Yangi muqova rasmini yuboring (JPG, PNG yoki WEBP).');
    return true;
  }
  if (data.startsWith('create-field:')) {
    const field = data.slice('create-field:'.length);
    if (!EDIT_FIELDS[field]) {
      await sendMessage(env, chatId, "Tahrir maydoni noto'g'ri.");
      return true;
    }
    const session = await getSession(env, userId);
    await saveSession(env, {
      ...session,
      state: 'awaiting_create_edit',
      edit_field: field,
    });
    await sendMessage(env, chatId, `${EDIT_FIELDS[field]} uchun yangi qiymatni yuboring.`);
    return true;
  }
  if (data.startsWith('create-category:')) {
    const category = categoryByKey(data.slice('create-category:'.length));
    if (!category) {
      await sendMessage(env, chatId, "Kategoriya noto'g'ri.");
      return true;
    }
    const session = await getSession(env, userId);
    const metadata = { ...parsePendingMetadata(session), category: category.key };
    const nextSession = {
      ...session,
      category: category.key,
      state: 'awaiting_confirm',
      pending_metadata: JSON.stringify(metadata),
    };
    await saveSession(env, nextSession);
    await sendPreview(env, chatId, nextSession);
    await sendCoverPrompt(env, chatId, metadata);
    return true;
  }
  return false;
}

async function handleBooksCallback(env, chatId, userId, data) {
  if (data === 'books:create') {
    await startCreate(env, chatId, userId);
    return true;
  }
  if (data === 'books:search') {
    await saveSession(env, {
      user_id: userId,
      chat_id: chatId,
      state: 'awaiting_book_search',
    });
    await sendMessage(env, chatId, 'Kitob ID, nomi yoki muallifini yuboring.');
    return true;
  }
  if (data.startsWith('books:list:')) {
    const page = Math.max(0, Number(data.slice('books:list:'.length)) || 0);
    await sendBookList(env, chatId, page);
    return true;
  }
  return false;
}

async function handleManageCallback(env, chatId, userId, data) {
  const match = data.match(/^manage:(view|edit|pdf|cover|delete|delete-confirm):(\d+)$/);
  if (match) {
    const action = match[1];
    const bookId = Number(match[2]);
    const book = await getBook(env, bookId);
    if (!book) {
      await sendMessage(env, chatId, 'Kitob topilmadi.');
      return true;
    }
    if (action === 'view') {
      await sendBookDetail(env, chatId, bookId);
      return true;
    }
    if (action === 'edit') {
      await sendMessage(env, chatId, `#${bookId} kitobning qaysi ma'lumotini tahrirlaysiz?`, manageEditKeyboard(bookId));
      return true;
    }
    if (action === 'pdf' || action === 'cover') {
      await saveSession(env, {
        user_id: userId,
        chat_id: chatId,
        state: action === 'pdf' ? 'awaiting_manage_pdf' : 'awaiting_manage_cover',
        active_book_id: bookId,
      });
      await sendMessage(
        env,
        chatId,
        action === 'pdf'
          ? `Yangi PDFni yuboring (maksimal ${Math.floor(maxPdfBytes(env) / 1024 / 1024)} MB).`
          : 'Yangi muqova rasmini yuboring (JPG, PNG yoki WEBP).',
      );
      return true;
    }
    if (action === 'delete') {
      await sendMessage(
        env,
        chatId,
        `#${bookId} "${book.title.uz}" kitobini PDF va muqovasi bilan birga o'chirasizmi?`,
        deleteConfirmKeyboard(bookId),
      );
      return true;
    }
    if (action === 'delete-confirm') {
      const result = await deleteBook(env, bookId);
      await deleteObjects(env.BUCKET, result.deletedKeys);
      await resetSession(env, userId, chatId);
      await sendMessage(env, chatId, `#${bookId} kitob o'chirildi.`);
      await sendBookList(env, chatId, 0);
      return true;
    }
  }

  const fieldMatch = data.match(/^manage-field:([a-z_]+):(\d+)$/);
  if (fieldMatch) {
    const [, field, bookId] = fieldMatch;
    if (!EDIT_FIELDS[field]) {
      await sendMessage(env, chatId, "Tahrir maydoni noto'g'ri.");
      return true;
    }
    await saveSession(env, {
      user_id: userId,
      chat_id: chatId,
      state: 'awaiting_manage_edit',
      active_book_id: Number(bookId),
      edit_field: field,
    });
    await sendMessage(env, chatId, `${EDIT_FIELDS[field]} uchun yangi qiymatni yuboring.`);
    return true;
  }

  const categoryPickMatch = data.match(/^manage-category-pick:(\d+)$/);
  if (categoryPickMatch) {
    const bookId = Number(categoryPickMatch[1]);
    await sendMessage(
      env,
      chatId,
      'Yangi kategoriyani tanlang:',
      categoryKeyboard(`manage-category:${bookId}`),
    );
    return true;
  }

  const categoryMatch = data.match(/^manage-category:(\d+):([a-z_]+)$/);
  if (categoryMatch) {
    const bookId = Number(categoryMatch[1]);
    const category = categoryByKey(categoryMatch[2]);
    if (!category) {
      await sendMessage(env, chatId, "Kategoriya noto'g'ri.");
      return true;
    }
    await updateBook(env, bookId, { category: category.key });
    await resetSession(env, userId, chatId);
    await sendMessage(env, chatId, 'Kategoriya yangilandi.');
    await sendBookDetail(env, chatId, bookId);
    return true;
  }
  return false;
}

async function handleAdminCallback(env, chatId, userId, data) {
  if (!data.startsWith('admin:')) return false;
  if (!isOwner(env, userId)) {
    await sendMessage(env, chatId, 'Adminlarni faqat owner boshqaradi.');
    return true;
  }
  const action = data.slice('admin:'.length);
  if (action === 'add' || action === 'remove') {
    await saveSession(env, {
      user_id: userId,
      chat_id: chatId,
      state: action === 'add' ? 'awaiting_admin_add' : 'awaiting_admin_remove',
    });
    await sendMessage(
      env,
      chatId,
      action === 'add'
        ? "Qo'shiladigan admin Telegram user ID raqamini yuboring."
        : "O'chiriladigan admin Telegram user ID raqamini yuboring.",
    );
    return true;
  }
  if (action === 'role:library' || action === 'role:group') {
    const session = await getSession(env, userId);
    if (session.state !== 'awaiting_admin_role') {
      await sendMessage(env, chatId, 'Admin qo‘shish sessiyasi tugagan. Qaytadan boshlang.', adminKeyboard());
      return true;
    }
    const pending = parseJson(session.pending_metadata, {});
    if (!/^\d{4,20}$/.test(String(pending.userId || ''))) {
      await resetSession(env, userId, chatId);
      await sendMessage(env, chatId, 'Admin ID topilmadi. Qaytadan boshlang.', adminKeyboard());
      return true;
    }
    if (action === 'role:library') {
      await disableGroupModeratorEverywhere(env, pending.userId);
      await addTelegramAdmin(env, {
        ...pending,
        role: 'library',
        groupChatId: null,
      }, userId);
      await resetSession(env, userId, chatId);
      await sendMessage(
        env,
        chatId,
        `DL Library admini qo‘shildi: ${pending.firstName || pending.username || pending.userId}`,
        mainKeyboard('owner'),
      );
      return true;
    }

    const groups = await listConfiguredGroups(env);
    if (!groups.length) {
      await sendMessage(env, chatId, 'Avval botni guruhga admin qilib, guruh ichida /guruh_ulash buyrug‘ini yuboring.');
      return true;
    }
    await saveSession(env, { ...session, state: 'awaiting_admin_group' });
    await sendMessage(env, chatId, 'Admin qaysi guruhga biriktiriladi?', {
      inline_keyboard: [
        ...groups.map((group) => [{
          text: group.title,
          callback_data: `admin:group:${group.chat_id}`,
        }]),
        [{ text: 'Bekor qilish', callback_data: 'cancel' }],
      ],
    });
    return true;
  }
  if (action.startsWith('group:')) {
    const session = await getSession(env, userId);
    const groupChatId = action.slice('group:'.length);
    const pending = parseJson(session.pending_metadata, {});
    const groups = await listConfiguredGroups(env);
    const group = groups.find((item) => String(item.chat_id) === String(groupChatId));
    if (session.state !== 'awaiting_admin_group' || !group || !pending.userId) {
      await sendMessage(env, chatId, 'Guruh adminini qo‘shish sessiyasi tugagan. Qaytadan boshlang.', adminKeyboard());
      return true;
    }
    await disableGroupModeratorEverywhere(env, pending.userId);
    await addTelegramAdmin(env, {
      ...pending,
      role: 'group',
      groupChatId,
    }, userId);
    await addGroupModerator(env, {
      chatId: groupChatId,
      userId: pending.userId,
      displayName: pending.firstName || pending.username || pending.userId,
      username: pending.username,
      firstName: pending.firstName,
      addedBy: userId,
    });
    await resetSession(env, userId, chatId);
    await sendMessage(
      env,
      chatId,
      `Guruh admini qo‘shildi: ${pending.firstName || pending.username || pending.userId}\nGuruh: ${group.title}`,
      mainKeyboard('owner'),
    );
    return true;
  }
  if (action === 'list') {
    const admins = await listTelegramAdmins(env);
    await refreshTelegramAdminProfiles(env, admins);
    const groups = await listConfiguredGroups(env);
    const groupNames = new Map(groups.map((group) => [String(group.chat_id), group.title]));
    const lines = admins.length
      ? admins.map((admin) => {
          const name = admin.first_name || (admin.username ? `@${admin.username}` : admin.user_id);
          const username = admin.username ? `@${admin.username}` : 'username yo‘q';
          const role = admin.role === 'group'
            ? `Guruh admini — ${groupNames.get(String(admin.group_chat_id)) || admin.group_chat_id || '-'}`
            : 'DL Library admini';
          return `- ${name} | ${username} | ID: ${admin.user_id} | ${role}`;
        })
      : ["Hozircha qo'shimcha admin yo'q."];
    await sendMessage(env, chatId, [`Owner: ${ownerId(env)}`, ...lines].join('\n'), adminKeyboard());
    return true;
  }
  return true;
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

  const access = await getTelegramAccess(env, from.id);
  if (!access) {
    await sendMessage(env, chatId, `Bu botga kirishga ruxsat yo'q. Telegram user ID: ${from.id}`);
    return { background: null };
  }
  await syncTelegramAdminProfile(env, from).catch(() => null);

  if (access.role === 'group') {
    if (callback) await answerCallback(env, callback.id, 'Faqat guruh boshqaruvi uchun ruxsat berilgan.');
    await sendMessage(env, chatId, 'Sizga faqat guruh boshqaruvi uchun ruxsat berilgan.', mainKeyboard('group'));
    return { background: null };
  }

  if (callback) {
    await answerCallback(env, callback.id);
    const data = callback.data || '';
    if (data === 'cancel') {
      const session = await getSession(env, from.id);
      await cleanupSessionFiles(env, session);
      await resetSession(env, from.id, chatId);
      await sendMessage(env, chatId, 'Jarayon bekor qilindi.', mainKeyboard(access.role));
      return { background: null };
    }
    if (data.startsWith('create:') || data.startsWith('create-field:') || data.startsWith('create-category:')) {
      await handleCreateCallback(env, callback, chatId, from.id, data);
      return { background: null };
    }
    if (!isOwner(env, from.id)
        && (data.startsWith('books:list:') || data === 'books:search' || data.startsWith('manage'))) {
      await sendMessage(env, chatId, 'Kitoblar ro‘yxati va boshqaruvi faqat owner uchun.');
      return { background: null };
    }
    if (await handleBooksCallback(env, chatId, from.id, data)) return { background: null };
    if (await handleManageCallback(env, chatId, from.id, data)) return { background: null };
    if (await handleAdminCallback(env, chatId, from.id, data)) return { background: null };
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
      await sendMessage(
        env,
        chatId,
        `Kategoriya: ${category.label}\n\nPDF kitobni yuboring (maksimal ${Math.floor(maxPdfBytes(env) / 1024 / 1024)} MB).`,
      );
    }
    return { background: null };
  }

  const text = String(message?.text || '').trim();
  if (text === '/start' || text === '/cancel') {
    const current = await getSession(env, from.id);
    await cleanupSessionFiles(env, current);
    await resetSession(env, from.id, chatId);
    await sendMessage(
      env,
      chatId,
      text === '/cancel' ? 'Jarayon bekor qilindi.' : 'DL Library boshqaruv botiga xush kelibsiz.',
      mainKeyboard(access.role),
    );
    return { background: null };
  }

  if (text === 'Kitoblarni boshqarish' || text === 'Kitob yuklash') {
    if (text === 'Kitob yuklash') {
      await startCreate(env, chatId, from.id);
    } else {
      if (!isOwner(env, from.id)) {
        await sendMessage(env, chatId, 'Kitoblar ro‘yxati va boshqaruvi faqat owner uchun.', mainKeyboard(access.role));
      } else {
        await sendBookManagementMenu(env, chatId);
      }
    }
    return { background: null };
  }

  if (text === '/admin' || text === 'Adminlar') {
    if (!isOwner(env, from.id)) {
      await sendMessage(env, chatId, 'Adminlarni faqat owner boshqaradi.');
      return { background: null };
    }
    await sendMessage(env, chatId, 'Adminlarni boshqarish:', adminKeyboard());
    return { background: null };
  }

  if (text === 'Bot haqida') {
    const provider = String(env.AI_METADATA_PROVIDER || 'mock');
    const model = provider === 'anthropic'
      ? String(env.ANTHROPIC_METADATA_MODEL || 'claude-haiku-4-5')
      : String(env.OPENROUTER_METADATA_MODEL || env.OPENAI_METADATA_MODEL || env.GEMINI_METADATA_MODEL || '-');
    await sendMessage(env, chatId, [
      `DL Library Bot v${BOT_VERSION}`,
      `Sayt: ${env.PUBLIC_SITE_URL || 'https://dl-library.uz'}`,
      `AI provayder: ${provider}`,
      `AI model: ${model}`,
      `PDF limiti: ${Math.floor(maxPdfBytes(env) / 1024 / 1024)} MB`,
      'PDF sahifalar soni AI ishlatmasdan aniqlanadi.',
      "Muqova rasmi admin tomonidan tayyorlanadi.",
    ].join('\n'), mainKeyboard(access.role));
    return { background: null };
  }

  const session = await getSession(env, from.id);
  if (session.state === 'processing') {
    await sendMessage(env, chatId, 'PDF hali qayta ishlanmoqda. Keyingi xabarni kuting.');
    return { background: null };
  }

  if (session.state === 'awaiting_admin_add' || session.state === 'awaiting_admin_remove') {
    if (!isOwner(env, from.id)) {
      await resetSession(env, from.id, chatId);
      await sendMessage(env, chatId, 'Adminlarni faqat owner boshqaradi.');
      return { background: null };
    }
    if (!/^\d{4,20}$/.test(text)) {
      await sendMessage(env, chatId, "Telegram user ID faqat raqamlardan iborat bo'lishi kerak.");
      return { background: null };
    }
    if (session.state === 'awaiting_admin_add') {
      if (text === ownerId(env)) {
        await sendMessage(env, chatId, 'Ownerni qayta admin qilib qo‘shish shart emas.');
        return { background: null };
      }
      const profile = await getTelegramProfile(env, text);
      await saveSession(env, {
        ...session,
        state: 'awaiting_admin_role',
        pending_metadata: JSON.stringify({
          userId: text,
          username: profile.username,
          firstName: profile.firstName,
        }),
      });
      await sendMessage(env, chatId, [
        `Admin: ${profile.firstName || profile.username || text}`,
        profile.username ? `Username: @${profile.username}` : 'Username: topilmadi',
        `ID: ${text}`,
        '',
        'Admin turini tanlang:',
      ].join('\n'), adminRoleKeyboard());
      return { background: null };
    }
    if (text === ownerId(env)) {
      await sendMessage(env, chatId, "Ownerni adminlardan o'chirib bo'lmaydi.");
      return { background: null };
    }
    await removeTelegramAdmin(env, text);
    await resetSession(env, from.id, chatId);
    await sendMessage(env, chatId, `Admin o'chirildi: ${text}`, mainKeyboard('owner'));
    return { background: null };
  }

  if (session.state === 'awaiting_book_search') {
    if (!isOwner(env, from.id)) {
      await resetSession(env, from.id, chatId);
      await sendMessage(env, chatId, 'Kitob qidirish faqat owner uchun.', mainKeyboard(access.role));
      return { background: null };
    }
    if (!text) {
      await sendMessage(env, chatId, 'Qidirish uchun ID, kitob nomi yoki muallifni yuboring.');
      return { background: null };
    }
    await resetSession(env, from.id, chatId);
    await sendBookList(env, chatId, 0, text);
    return { background: null };
  }

  if (session.state === 'awaiting_create_edit') {
    try {
      const metadata = applyEdit(parsePendingMetadata(session), session.edit_field, text);
      const nextSession = {
        ...session,
        state: 'awaiting_confirm',
        pending_metadata: JSON.stringify(metadata),
        edit_field: null,
      };
      await saveSession(env, nextSession);
      await sendPreview(env, chatId, nextSession);
      await sendCoverPrompt(env, chatId, metadata);
    } catch (error) {
      await sendMessage(env, chatId, safeErrorMessage(error));
    }
    return { background: null };
  }

  if (session.state === 'awaiting_manage_edit') {
    if (!isOwner(env, from.id)) {
      await resetSession(env, from.id, chatId);
      await sendMessage(env, chatId, 'Kitoblarni tahrirlash faqat owner uchun.', mainKeyboard(access.role));
      return { background: null };
    }
    try {
      const book = await getBook(env, session.active_book_id);
      if (!book) throw new Error('Kitob topilmadi');
      const edited = applyEdit(book, session.edit_field, text);
      await updateBook(env, book.id, edited);
      await resetSession(env, from.id, chatId);
      await sendMessage(env, chatId, "Kitob ma'lumoti yangilandi.");
      await sendBookDetail(env, chatId, book.id);
    } catch (error) {
      await sendMessage(env, chatId, safeErrorMessage(error));
    }
    return { background: null };
  }

  if (session.state === 'awaiting_confirm') {
    await sendPreview(env, chatId, session);
    return { background: null };
  }

  if (session.state === 'awaiting_pdf' || session.state === 'awaiting_create_pdf') {
    const document = getPdf(message);
    if (!document) {
      await sendMessage(env, chatId, 'PDF formatdagi kitob faylini yuboring.');
      return { background: null };
    }
    if ((document.file_size || 0) > maxPdfBytes(env)) {
      await sendMessage(env, chatId, `PDF juda katta. Maksimal hajm ${Math.floor(maxPdfBytes(env) / 1024 / 1024)} MB.`);
      return { background: null };
    }
    const failureState = session.state;
    await saveSession(env, { ...session, state: 'processing' });
    return {
      background: () => processCreatePdf({
        env,
        chatId,
        userId: from.id,
        session,
        document,
        failureState,
      }),
    };
  }

  if (session.state === 'awaiting_cover' || session.state === 'awaiting_create_cover') {
    const cover = getCover(message);
    if (!cover) {
      await sendMessage(env, chatId, 'Kitob muqovasini rasm sifatida yuboring (JPG, PNG yoki WEBP).');
      return { background: null };
    }
    if ((cover.fileSize || 0) > 8 * 1024 * 1024) {
      await sendMessage(env, chatId, 'Muqova rasmi juda katta. Maksimal hajm 8 MB.');
      return { background: null };
    }
    await saveCreateCover({ env, chatId, userId: from.id, session, cover });
    return { background: null };
  }

  if (session.state === 'awaiting_manage_pdf') {
    if (!isOwner(env, from.id)) {
      await resetSession(env, from.id, chatId);
      await sendMessage(env, chatId, 'Kitob PDFini almashtirish faqat owner uchun.', mainKeyboard(access.role));
      return { background: null };
    }
    const document = getPdf(message);
    if (!document) {
      await sendMessage(env, chatId, 'Yangi PDF faylini yuboring.');
      return { background: null };
    }
    if ((document.file_size || 0) > maxPdfBytes(env)) {
      await sendMessage(env, chatId, `PDF juda katta. Maksimal hajm ${Math.floor(maxPdfBytes(env) / 1024 / 1024)} MB.`);
      return { background: null };
    }
    await saveSession(env, { ...session, state: 'processing' });
    return {
      background: () => processManagedPdf({
        env,
        chatId,
        userId: from.id,
        session,
        document,
      }),
    };
  }

  if (session.state === 'awaiting_manage_cover') {
    if (!isOwner(env, from.id)) {
      await resetSession(env, from.id, chatId);
      await sendMessage(env, chatId, 'Kitob muqovasini almashtirish faqat owner uchun.', mainKeyboard(access.role));
      return { background: null };
    }
    const cover = getCover(message);
    if (!cover) {
      await sendMessage(env, chatId, 'Yangi muqova rasmini yuboring (JPG, PNG yoki WEBP).');
      return { background: null };
    }
    if ((cover.fileSize || 0) > 8 * 1024 * 1024) {
      await sendMessage(env, chatId, 'Muqova rasmi juda katta. Maksimal hajm 8 MB.');
      return { background: null };
    }
    await replaceManagedCover({ env, chatId, userId: from.id, session, cover });
    return { background: null };
  }

  await sendMessage(env, chatId, 'Kerakli bo‘limni menyudan tanlang.', mainKeyboard(access.role));
  return { background: null };
}
