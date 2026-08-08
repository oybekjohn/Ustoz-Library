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
  TELEGRAM_CATEGORIES,
  answerCallback,
  categoryByKey,
  categoryKeyboard,
  categoryLabel,
  downloadTelegramFile,
  escapeHtml,
  getCover,
  getPdf,
  getSession,
  isOwner,
  maxPdfBytes,
  ownerId,
  resetSession,
  safeErrorMessage,
  saveSession,
  sendHtmlMessage,
  sendMessage,
  sendPhoto,
  shortText,
  telegramApi,
} from './telegram-core.js';
import {
  handleMaterialCallback,
  handleMaterialMessageState,
  sectionKeyboard,
  startMaterialCreate,
  sendMaterialManageMenu,
} from './telegram-materials.js';
import { resolveAnthropicModel, resolveOpenRouterModel } from './ai/text-json.js';
import { analyzeVideo } from './ai/content.js';

export { TELEGRAM_CATEGORIES };

const BOT_VERSION = '4.0.0';
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

// Asosiy menyu: bo'limlar to'g'ridan-to'g'ri tugmalarda.
// Bo'lim tanlangach admin ketma-ket material yuboraveradi.
const MENU_BOOKS = '📚 Kitoblar';
const MENU_PRESENTATIONS = '📊 Taqdimotlar';
const MENU_VIDEOS = '🎥 Videolar';
const MENU_TESTS = '📝 Testlar';
const MENU_ADMINS = '👤 Adminlar';
const MENU_ABOUT = 'ℹ️ Bot haqida';

function mainKeyboard(role = 'owner') {
  const rows = [
    [{ text: MENU_BOOKS }, { text: MENU_PRESENTATIONS }],
    [{ text: MENU_VIDEOS }, { text: MENU_TESTS }],
  ];
  rows.push(role === 'owner'
    ? [{ text: MENU_ADMINS }, { text: MENU_ABOUT }]
    : [{ text: MENU_ABOUT }]);
  return { keyboard: rows, resize_keyboard: true };
}

// Bo'lim ochilganda owner uchun qo'shimcha boshqaruv tugmasi
function sectionActionsKeyboard(type, isOwnerUser) {
  const rows = [];
  if (isOwnerUser) {
    rows.push([{ text: '⚙️ Ro\'yxat va boshqaruv', callback_data: `mat:list:${type}:0` }]);
  }
  rows.push([{ text: '✅ Tugatdim', callback_data: 'mat:done' }]);
  return { inline_keyboard: rows };
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

async function getTelegramAccess(env, userId) {
  const id = String(userId);
  if (isOwner(env, id)) return { user_id: id, role: 'owner' };
  try {
    const admin = await env.DB.prepare(`
      SELECT user_id, added_by, added_at, username, first_name
      FROM telegram_admins WHERE user_id = ?
    `)
      .bind(id)
      .first();
    return admin ? { ...admin, role: 'library' } : null;
  } catch {}
  return null;
}

async function addTelegramAdmin(env, admin, addedBy) {
  await env.DB.prepare(`
    INSERT INTO telegram_admins
      (user_id, added_by, added_at, username, first_name)
    VALUES (?, ?, datetime('now'), ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET
      added_by=excluded.added_by,
      added_at=datetime('now'),
      username=COALESCE(excluded.username, telegram_admins.username),
      first_name=COALESCE(excluded.first_name, telegram_admins.first_name)
  `).bind(
    String(admin.userId), String(addedBy),
    admin.username || null, admin.firstName || null,
  ).run();
}

async function removeTelegramAdmin(env, userId) {
  await env.DB.prepare('DELETE FROM telegram_admins WHERE user_id = ?')
    .bind(String(userId))
    .run();
}

async function listTelegramAdmins(env) {
  const { results = [] } = await env.DB.prepare(
    `SELECT user_id, username, first_name, added_by, added_at
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

/**
 * AI ulanishini jonli tekshiradi: kichik test so'rovi yuborib, qaysi
 * provayder javob berayotganini va necha soniyada javob kelganini aytadi.
 * Kalit eskirgan yoki kvota tugagan bo'lsa shu yerda darhol ko'rinadi.
 */
async function runAiHealthCheck(env, chatId) {
  const provider = String(env.AI_METADATA_PROVIDER || 'mock');
  const model = provider === 'anthropic'
    ? resolveAnthropicModel(env)
    : provider === 'openrouter' ? resolveOpenRouterModel(env) : '-';

  await sendMessage(env, chatId, '🔍 AI ulanishi tekshirilmoqda...');
  const startedAt = Date.now();

  try {
    const result = await analyzeVideo({
      env,
      youtubeTitle: 'Matematika asoslari: kirish darsi',
      channelName: 'Sinov',
      videoUrl: 'https://youtu.be/test',
    });
    const seconds = ((Date.now() - startedAt) / 1000).toFixed(1);

    if (!result.aiUsed) {
      await sendMessage(env, chatId, [
        '❌ AI javob bermadi.',
        '',
        `Provayder: ${provider}`,
        `Model: ${model}`,
        '',
        'Kalit yoki kvotani tekshiring. Hozircha materiallar',
        "AI'siz (fayl nomi asosida) qo'shiladi.",
      ].join('\n'));
      return;
    }

    await sendMessage(env, chatId, [
      '✅ AI ishlayapti!',
      '',
      `Provayder: ${provider}`,
      `Model: ${model}`,
      `Javob vaqti: ${seconds} soniya`,
      '',
      'Sinov natijasi:',
      `📌 ${result.title.uz}`,
      `🏷 ${categoryLabel(result.category)}`,
    ].join('\n'));
  } catch (error) {
    await sendMessage(env, chatId, [
      '❌ AI ulanishida xatolik:',
      safeErrorMessage(error),
      '',
      `Provayder: ${provider}`,
      `Model: ${model}`,
    ].join('\n'));
  }
}

async function cleanupSessionFiles(env, session) {
  await deleteObjects(env.BUCKET, [
    session?.pending_pdf_key,
    session?.pending_cover_key,
    session?.pending_source_key,
  ].filter(Boolean));
}

function parsePendingMetadata(session) {
  if (!session?.pending_metadata) throw new Error("Tasdiqlanadigan kitob ma'lumoti topilmadi");
  return JSON.parse(session.pending_metadata);
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
  if (action === 'list') {
    const admins = await listTelegramAdmins(env);
    await refreshTelegramAdminProfiles(env, admins);
    const lines = admins.length
      ? admins.map((admin) => {
          const name = admin.first_name || (admin.username ? `@${admin.username}` : admin.user_id);
          const username = admin.username ? `@${admin.username}` : 'username yo‘q';
          return `- ${name} | ${username} | ID: ${admin.user_id}`;
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
  const chat = message?.chat || callback?.message?.chat;
  const chatId = chat?.id;
  if (!from || !chatId) return { background: null };
  if (chat.type && chat.type !== 'private') return { background: null };

  const access = await getTelegramAccess(env, from.id);
  if (!access) {
    await sendMessage(env, chatId, `Bu botga kirishga ruxsat yo'q. Telegram user ID: ${from.id}`);
    return { background: null };
  }
  await syncTelegramAdminProfile(env, from).catch(() => null);

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
    if (data.startsWith('create-type:')) {
      const type = data.split(':')[1];
      if (type === 'book') {
        await startCreate(env, chatId, from.id);
      } else if (['presentation', 'video', 'test'].includes(type)) {
        await startMaterialCreate(env, chatId, from.id, type);
        await sendMessage(env, chatId, 'Yuborishni boshlang 👇', sectionActionsKeyboard(type, isOwner(env, from.id)));
      } else {
        await sendMessage(env, chatId, "Noma'lum material turi.", mainKeyboard(access.role));
      }
      return { background: null };
    }
    if (data.startsWith('manage-type:')) {
      const type = data.split(':')[1];
      if (!isOwner(env, from.id)) {
        await sendMessage(env, chatId, 'Materiallarni boshqarish faqat owner uchun.');
        return { background: null };
      }
      if (type === 'book') {
        await sendBookManagementMenu(env, chatId);
      } else if (['presentation', 'video', 'test'].includes(type)) {
        await sendMaterialManageMenu(env, chatId, type);
      } else {
        await sendMessage(env, chatId, "Noma'lum material turi.", mainKeyboard(access.role));
      }
      return { background: null };
    }
    if (data.startsWith('mat:') || data.startsWith('mat-cat:')) {
      await handleMaterialCallback(env, chatId, from.id, data, isOwner(env, from.id));
      return { background: null };
    }
    // AI ulanishini jonli tekshirish: haqiqiy (kichik) so'rov yuboriladi
    if (data === 'ai:check') {
      return { background: () => runAiHealthCheck(env, chatId) };
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

  // Eslatma: Google profilini Telegram bilan bog'lash oqimi (/start link_TOKEN)
  // foydalanuvchi profili bilan birga keyingi relizga qoldirildi.

  if (text === '/start' || text === '/cancel') {
    const current = await getSession(env, from.id);
    await cleanupSessionFiles(env, current);
    await resetSession(env, from.id, chatId);
    await sendMessage(
      env,
      chatId,
      text === '/cancel'
        ? 'Jarayon bekor qilindi.'
        : [
            'DL Library boshqaruv botiga xush kelibsiz! 👋',
            '',
            "Quyidagi bo'limlardan birini tanlang. Bo'lim tanlangach,",
            "ketma-ket material yuboraverasiz — har safar qayta tanlash shart emas.",
          ].join('\n'),
      mainKeyboard(access.role),
    );
    return { background: null };
  }

  // ---- Asosiy menyu bo'limlari ----
  if (text === MENU_BOOKS) {
    const current = await getSession(env, from.id);
    await cleanupSessionFiles(env, current);
    await sendMessage(
      env,
      chatId,
      "📚 Kitoblar bo'limi.\n\nKitob qo'shish uchun avval kategoriyani tanlang.",
      {
        inline_keyboard: [
          [{ text: "➕ Kitob qo'shish", callback_data: 'books:create' }],
          ...(isOwner(env, from.id) ? [[
            { text: "📋 Ro'yxat", callback_data: 'books:list:0' },
            { text: '🔍 Qidirish', callback_data: 'books:search' },
          ]] : []),
        ],
      },
    );
    return { background: null };
  }

  const sectionByMenu = {
    [MENU_PRESENTATIONS]: 'presentation',
    [MENU_VIDEOS]: 'video',
    [MENU_TESTS]: 'test',
  };
  if (sectionByMenu[text]) {
    const type = sectionByMenu[text];
    const current = await getSession(env, from.id);
    await cleanupSessionFiles(env, current);
    await startMaterialCreate(env, chatId, from.id, type);
    await sendMessage(env, chatId, "Yuborishni boshlang 👇", sectionActionsKeyboard(type, isOwner(env, from.id)));
    return { background: null };
  }

  if (text === '/admin' || text === MENU_ADMINS) {
    if (!isOwner(env, from.id)) {
      await sendMessage(env, chatId, 'Adminlarni faqat owner boshqaradi.');
      return { background: null };
    }
    await sendMessage(env, chatId, 'Adminlarni boshqarish:', adminKeyboard());
    return { background: null };
  }

  if (text === MENU_ABOUT || text === 'Bot haqida') {
    const provider = String(env.AI_METADATA_PROVIDER || 'mock');
    const model = provider === 'anthropic'
      ? resolveAnthropicModel(env)
      : provider === 'openrouter'
        ? resolveOpenRouterModel(env)
        : String(env.OPENAI_METADATA_MODEL || env.GEMINI_METADATA_MODEL || '-');
    await sendMessage(env, chatId, [
      `DL Library Bot v${BOT_VERSION}`,
      `Sayt: ${env.PUBLIC_SITE_URL || 'https://dl-library.uz'}`,
      '',
      `AI provayder: ${provider}`,
      `AI model: ${model}`,
      `Fayl limiti: ${Math.floor(maxPdfBytes(env) / 1024 / 1024)} MB`,
      '',
      'Bo\'limlar:',
      "📚 Kitoblar — kategoriya tanlaysiz, PDF yuborasiz, ma'lumotlarni AI tayyorlaydi, siz tasdiqlaysiz.",
      "📊 Taqdimotlar — faylni yuborasiz, qolganini tizim qiladi (1-sahifa muqova bo'ladi).",
      '🎥 Videolar — YouTube havolasini yuborasiz, qolganini tizim qiladi.',
      '📝 Testlar — savollarni yuborasiz, faqat mavzu nomini yozasiz.',
      '',
      "Bo'lim tanlangach ketma-ket material yuboraverasiz — har safar qayta tanlash shart emas.",
    ].join('\n'), {
      inline_keyboard: [[{ text: '🔍 AI ulanishini tekshirish', callback_data: 'ai:check' }]],
    });
    return { background: null };
  }

  const session = await getSession(env, from.id);
  if (session.state === 'processing') {
    await sendMessage(env, chatId, 'Fayl hali qayta ishlanmoqda. Keyingi xabarni kuting.');
    return { background: null };
  }

  // Taqdimot / video / test yaratish holatlari
  const materialResult = await handleMaterialMessageState(env, {
    session,
    message,
    text,
    chatId,
    userId: from.id,
  });
  if (materialResult) return materialResult;

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
      await addTelegramAdmin(env, {
        userId: text,
        username: profile.username,
        firstName: profile.firstName,
      }, from.id);
      await resetSession(env, from.id, chatId);
      await sendMessage(
        env,
        chatId,
        `DL Library admini qo‘shildi: ${profile.firstName || profile.username || text}`,
        mainKeyboard('owner'),
      );
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

  await sendMessage(env, chatId, "Kerakli bo'limni menyudan tanlang.", mainKeyboard(access.role));
  return { background: null };
}
