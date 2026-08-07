/**
 * Telegram bot: taqdimot, video va test materiallarini
 * qo'shish hamda boshqarish oqimlari.
 *
 * Yaratish (barcha bot adminlari):
 *   kategoriya -> fayl/URL -> sarlavha -> tavsif -> saqlash (published=1)
 * Boshqarish (faqat owner):
 *   ro'yxat -> ko'rish -> publish/unpublish, o'chirish
 */

import { inspectPdfFirstPages } from './pdf.js';
import { createStorageKey, deleteObjects, putObject } from './storage.js';
import { parseTestTxt } from './test-parser.js';
import { extractYouTubeId } from './youtube.js';
import {
  categoryKeyboard,
  categoryLabel,
  downloadTelegramFile,
  getSession,
  maxPdfBytes,
  parseJson,
  resetSession,
  safeErrorMessage,
  saveSession,
  sendMessage,
  shortText,
} from './telegram-core.js';

const MATERIAL_TYPES = {
  presentation: { label: 'Prezentatsiya', table: 'presentations', emoji: '📊', hash: '#presentations' },
  video: { label: 'Video dars', table: 'videos', emoji: '🎥', hash: '#videos' },
  test: { label: 'Test', table: 'tests', emoji: '📝', hash: '#tests' },
};

const LIST_PAGE_SIZE = 6;
const MAX_TXT_BYTES = 1024 * 1024;

const PPTX_MIMES = [
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-powerpoint',
];

function typeInfo(type) {
  const info = MATERIAL_TYPES[type];
  if (!info) throw new Error("Noma'lum material turi");
  return info;
}

function siteUrl(env) {
  return String(env.PUBLIC_SITE_URL || 'https://dl-library.uz').replace(/\/$/, '');
}

function pendingData(session) {
  return parseJson(session.pending_metadata, {}) || {};
}

// ============================================================
// YARATISH OQIMI
// ============================================================

export async function startMaterialCreate(env, chatId, userId, type) {
  const info = typeInfo(type);
  const current = await getSession(env, userId);
  await cleanupMaterialFiles(env, current);
  await saveSession(env, {
    user_id: userId,
    chat_id: chatId,
    state: 'awaiting_material_category',
    material_type: type,
  });
  await sendMessage(env, chatId, `${info.emoji} ${info.label} qaysi bo'limga tegishli?`, categoryKeyboard(`mat-cat:${type}`));
}

async function cleanupMaterialFiles(env, session) {
  if (session?.pending_source_key) {
    await deleteObjects(env.BUCKET, [session.pending_source_key]);
  }
}

async function promptForSource(env, chatId, type) {
  if (type === 'presentation') {
    await sendMessage(env, chatId, `Taqdimot faylini yuboring: PDF, PPT yoki PPTX (maksimal ${Math.floor(maxPdfBytes(env) / 1024 / 1024)} MB).\n\nEng sifatli ko'rinish uchun PDF tavsiya etiladi.`);
  } else if (type === 'video') {
    await sendMessage(env, chatId, 'YouTube video havolasini yuboring.\nMasalan: https://youtu.be/XXXXXXXXXXX');
  } else {
    await sendMessage(env, chatId, [
      'Test savollari yozilgan UTF-8 .txt faylni yuboring.',
      '',
      'Format:',
      'Savol matni?',
      '================',
      'Birinchi variant',
      '================',
      "#To'g'ri variant (# belgisi bilan)",
      '',
      '+++++',
      '',
      'Keyingi savol...',
    ].join('\n'));
  }
}

/** mat-cat:<type>:<key> — kategoriya tanlandi */
async function handleCategoryPick(env, chatId, userId, type, categoryKey) {
  const info = typeInfo(type);
  await saveSession(env, {
    user_id: userId,
    chat_id: chatId,
    state: type === 'video' ? 'awaiting_material_url' : 'awaiting_material_file',
    material_type: type,
    category: categoryKey,
  });
  await sendMessage(env, chatId, `${info.label} kategoriyasi: ${categoryLabel(categoryKey)}`);
  await promptForSource(env, chatId, type);
}

function getPresentationFile(message) {
  const document = message?.document;
  if (!document) return null;
  const name = document.file_name || '';
  const isPdf = document.mime_type === 'application/pdf' || /\.pdf$/i.test(name);
  const isPptx = PPTX_MIMES.includes(document.mime_type) || /\.pptx?$/i.test(name);
  if (!isPdf && !isPptx) return null;
  return { document, isPdf };
}

function getTxtFile(message) {
  const document = message?.document;
  if (!document) return null;
  const isTxt = document.mime_type === 'text/plain' || /\.txt$/i.test(document.file_name || '');
  return isTxt ? document : null;
}

async function processPresentationFile(env, { chatId, userId, session, document, isPdf }) {
  let uploadedKey = null;
  try {
    await sendMessage(env, chatId, 'Fayl qabul qilindi, tekshirilmoqda...');
    const buffer = await downloadTelegramFile(env, document.file_id, document.file_size);

    let pageCount = 0;
    if (isPdf) {
      const info = await inspectPdfFirstPages(buffer, 1);
      pageCount = info.pageCount || 0;
    }

    const contentType = isPdf
      ? 'application/pdf'
      : 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
    uploadedKey = createStorageKey('presentations', document.file_name || 'taqdimot', contentType);
    await putObject(env.BUCKET, uploadedKey, buffer, contentType);

    const pending = {
      ...pendingData(session),
      category: session.category,
      pdf_key: uploadedKey,
      page_count: pageCount,
      file_name: document.file_name || null,
    };
    await saveSession(env, {
      ...session,
      user_id: userId,
      chat_id: chatId,
      state: 'awaiting_material_title',
      pending_metadata: JSON.stringify(pending),
      pending_source_key: uploadedKey,
    });
    await cleanupOldKey(env, session.pending_source_key, uploadedKey);

    await sendMessage(env, chatId, [
      isPdf ? `PDF qabul qilindi: ${pageCount} slayd.` : 'PPTX qabul qilindi (Office viewer orqali ochiladi).',
      '',
      'Endi taqdimot sarlavhasini yuboring.',
    ].join('\n'));
  } catch (error) {
    if (uploadedKey) await deleteObjects(env.BUCKET, [uploadedKey]);
    await sendMessage(env, chatId, `Faylni qayta ishlashda xatolik:\n${safeErrorMessage(error)}\n\nFaylni qayta yuboring.`);
  }
}

async function cleanupOldKey(env, oldKey, newKey) {
  if (oldKey && oldKey !== newKey) {
    await deleteObjects(env.BUCKET, [oldKey]);
  }
}

async function processTestFile(env, { chatId, userId, session, document }) {
  try {
    await sendMessage(env, chatId, 'Test fayli qabul qilindi, tekshirilmoqda...');
    const buffer = await downloadTelegramFile(env, document.file_id, document.file_size);
    const content = new TextDecoder('utf-8').decode(buffer);
    const parsed = parseTestTxt(content);

    if (!parsed.success) {
      const errorLines = (parsed.errors || []).slice(0, 5).map((e) => `- ${e.message}`);
      await sendMessage(env, chatId, [
        'Test faylida xatolik topildi:',
        ...errorLines,
        '',
        "Faylni to'g'rilab qayta yuboring.",
      ].join('\n'));
      return;
    }

    const pending = {
      ...pendingData(session),
      category: session.category,
      questions: parsed.questions,
    };
    await saveSession(env, {
      ...session,
      user_id: userId,
      chat_id: chatId,
      state: 'awaiting_material_title',
      pending_metadata: JSON.stringify(pending),
    });
    await sendMessage(env, chatId, [
      `Fayl qabul qilindi: ${parsed.questions.length} ta savol.`,
      '',
      'Endi test sarlavhasini yuboring.',
    ].join('\n'));
  } catch (error) {
    await sendMessage(env, chatId, `Test faylini o'qishda xatolik:\n${safeErrorMessage(error)}\n\nFaylni qayta yuboring.`);
  }
}

async function handleVideoUrl(env, { chatId, userId, session, text }) {
  const videoId = extractYouTubeId(text);
  if (!videoId) {
    await sendMessage(env, chatId, "YouTube havolasi noto'g'ri. To'g'ri havolani yuboring.\nMasalan: https://youtu.be/XXXXXXXXXXX");
    return;
  }
  const pending = {
    ...pendingData(session),
    category: session.category,
    youtube_url: text,
    youtube_video_id: videoId,
  };
  await saveSession(env, {
    ...session,
    user_id: userId,
    chat_id: chatId,
    state: 'awaiting_material_title',
    pending_metadata: JSON.stringify(pending),
  });
  await sendMessage(env, chatId, 'Video qabul qilindi.\n\nEndi video dars sarlavhasini yuboring.');
}

async function handleTitle(env, { chatId, userId, session, text }) {
  const title = text.trim();
  if (title.length < 3 || title.length > 250) {
    await sendMessage(env, chatId, "Sarlavha 3-250 belgi oralig'ida bo'lishi kerak. Qayta yuboring.");
    return;
  }
  const pending = { ...pendingData(session), title_uz: title };
  await saveSession(env, {
    ...session,
    user_id: userId,
    chat_id: chatId,
    state: 'awaiting_material_desc',
    pending_metadata: JSON.stringify(pending),
  });
  await sendMessage(env, chatId, "Qisqa tavsif yuboring (yoki o'tkazib yuborish uchun \"-\" yozing).");
}

async function handleDescriptionAndSave(env, { chatId, userId, session, text }) {
  const info = typeInfo(session.material_type);
  const description = text.trim() === '-' ? null : text.trim();
  const pending = pendingData(session);
  const now = new Date().toISOString();

  let savedId = null;
  if (session.material_type === 'presentation') {
    const res = await env.DB.prepare(
      `INSERT INTO presentations (title_uz, description_uz, category, language, page_count, pdf_key, published, created_at, updated_at)
       VALUES (?, ?, ?, 'uz', ?, ?, 1, ?, ?)`
    ).bind(pending.title_uz, description, pending.category, pending.page_count || 0, pending.pdf_key, now, now).run();
    savedId = res.meta.last_row_id;
  } else if (session.material_type === 'video') {
    const res = await env.DB.prepare(
      `INSERT INTO videos (title_uz, description_uz, category, language, youtube_url, youtube_video_id, published, created_at, updated_at)
       VALUES (?, ?, ?, 'uz', ?, ?, 1, ?, ?)`
    ).bind(pending.title_uz, description, pending.category, pending.youtube_url, pending.youtube_video_id, now, now).run();
    savedId = res.meta.last_row_id;
  } else if (session.material_type === 'test') {
    const res = await env.DB.prepare(
      `INSERT INTO tests (title_uz, description_uz, category, language, published, created_at, updated_at)
       VALUES (?, ?, ?, 'uz', 1, ?, ?)`
    ).bind(pending.title_uz, description, pending.category, now, now).run();
    savedId = res.meta.last_row_id;

    for (let qIdx = 0; qIdx < pending.questions.length; qIdx++) {
      const q = pending.questions[qIdx];
      const qRes = await env.DB.prepare(
        `INSERT INTO test_questions (test_id, position, question_text, created_at) VALUES (?, ?, ?, ?)`
      ).bind(savedId, qIdx + 1, q.questionText || q.text, now).run();
      const qId = qRes.meta.last_row_id;
      for (let oIdx = 0; oIdx < q.options.length; oIdx++) {
        const opt = q.options[oIdx];
        await env.DB.prepare(
          `INSERT INTO test_options (question_id, position, option_text, is_correct) VALUES (?, ?, ?, ?)`
        ).bind(qId, oIdx + 1, opt.text || opt.option_text, opt.isCorrect ? 1 : 0).run();
      }
    }
  }

  // pending_source_key endi materialga tegishli — sessiyadan tozalaymiz
  await saveSession(env, {
    user_id: userId,
    chat_id: chatId,
    state: 'idle',
  });

  const extra = session.material_type === 'test'
    ? `Savollar: ${pending.questions.length} ta`
    : session.material_type === 'presentation'
      ? `Slaydlar: ${pending.page_count || 'Office viewer'}`
      : `YouTube: ${pending.youtube_video_id}`;

  await sendMessage(env, chatId, [
    `${info.emoji} ${info.label} saytga joylandi!`,
    '',
    `Sarlavha: ${pending.title_uz}`,
    `Kategoriya: ${categoryLabel(pending.category)}`,
    extra,
    '',
    `${siteUrl(env)}/${info.hash}`,
  ].join('\n'));
}

// ============================================================
// BOSHQARISH OQIMI (owner)
// ============================================================

export async function sendMaterialManageMenu(env, chatId, type) {
  await sendMaterialList(env, chatId, type, 0);
}

async function sendMaterialList(env, chatId, type, page) {
  const info = typeInfo(type);
  const offset = page * LIST_PAGE_SIZE;

  const totalRow = await env.DB.prepare(`SELECT COUNT(*) as total FROM ${info.table}`).first();
  const total = totalRow?.total || 0;
  const { results = [] } = await env.DB.prepare(
    `SELECT id, title_uz, published FROM ${info.table} ORDER BY created_at DESC LIMIT ? OFFSET ?`
  ).bind(LIST_PAGE_SIZE, offset).all();

  if (total === 0) {
    await sendMessage(env, chatId, `Hozircha ${info.label.toLowerCase()} yo'q. "Material qo'shish" orqali qo'shishingiz mumkin.`);
    return;
  }

  const rows = results.map((item) => [{
    text: `${item.published ? '✅' : '🚫'} #${item.id} ${shortText(item.title_uz, 40)}`,
    callback_data: `mat:view:${type}:${item.id}`,
  }]);

  const navigation = [];
  if (page > 0) navigation.push({ text: 'Oldingi', callback_data: `mat:list:${type}:${page - 1}` });
  if (offset + LIST_PAGE_SIZE < total) navigation.push({ text: 'Keyingi', callback_data: `mat:list:${type}:${page + 1}` });
  if (navigation.length) rows.push(navigation);

  const pageCount = Math.max(1, Math.ceil(total / LIST_PAGE_SIZE));
  await sendMessage(
    env,
    chatId,
    `${info.emoji} ${info.label}lar: ${total} ta. Sahifa ${page + 1}/${pageCount}\n(✅ saytda ko'rinadi, 🚫 yashirilgan)`,
    { inline_keyboard: rows },
  );
}

async function getMaterial(env, type, id) {
  const info = typeInfo(type);
  return env.DB.prepare(`SELECT * FROM ${info.table} WHERE id = ?`).bind(id).first();
}

async function sendMaterialDetail(env, chatId, type, id) {
  const info = typeInfo(type);
  const item = await getMaterial(env, type, id);
  if (!item) {
    await sendMessage(env, chatId, `${info.label} topilmadi.`);
    return;
  }

  const lines = [
    `${info.emoji} ${info.label} #${item.id}`,
    '',
    `Sarlavha: ${item.title_uz}`,
    `Kategoriya: ${categoryLabel(item.category)}`,
    `Holat: ${item.published ? "✅ Saytda ko'rinadi" : '🚫 Yashirilgan'}`,
  ];
  if (type === 'presentation') lines.push(`Slaydlar: ${item.page_count || 'Office viewer'}`, `Fayl: ${item.pdf_key}`);
  if (type === 'video') lines.push(`YouTube: ${item.youtube_url}`);
  if (type === 'test') {
    const countRow = await env.DB.prepare('SELECT COUNT(*) as c FROM test_questions WHERE test_id = ?').bind(id).first();
    lines.push(`Savollar: ${countRow?.c || 0} ta`);
  }
  if (item.description_uz) lines.push('', `Tavsif: ${shortText(item.description_uz, 300)}`);

  await sendMessage(env, chatId, lines.join('\n'), {
    inline_keyboard: [
      [{
        text: item.published ? '🚫 Saytdan yashirish' : '✅ Saytga chiqarish',
        callback_data: `mat:pub:${type}:${id}`,
      }],
      [{ text: "🗑 O'chirish", callback_data: `mat:del:${type}:${id}` }],
      [{ text: "◀ Ro'yxatga qaytish", callback_data: `mat:list:${type}:0` }],
    ],
  });
}

async function deleteMaterial(env, type, id) {
  const info = typeInfo(type);
  const item = await getMaterial(env, type, id);
  if (!item) return false;

  if (type === 'test') {
    await env.DB.prepare(
      `DELETE FROM test_options WHERE question_id IN (SELECT id FROM test_questions WHERE test_id = ?)`
    ).bind(id).run();
    await env.DB.prepare('DELETE FROM test_questions WHERE test_id = ?').bind(id).run();
  }
  await env.DB.prepare(`DELETE FROM ${info.table} WHERE id = ?`).bind(id).run();

  // R2 fayllarini tozalash
  const keys = [item.pdf_key, item.cover_key].filter(Boolean);
  if (keys.length) await deleteObjects(env.BUCKET, keys);
  return true;
}

// ============================================================
// DISPATCH
// ============================================================

/** Callbacklar: mat-cat:<type>:<key>, mat:list|view|pub|del|del-confirm:<type>:<id> */
export async function handleMaterialCallback(env, chatId, userId, data, isOwnerUser) {
  const catMatch = data.match(/^mat-cat:(presentation|video|test):([a-z_]+)$/);
  if (catMatch) {
    await handleCategoryPick(env, chatId, userId, catMatch[1], catMatch[2]);
    return true;
  }

  const matMatch = data.match(/^mat:(list|view|pub|del|del-confirm):(presentation|video|test):(\d+)$/);
  if (!matMatch) return false;

  const [, action, type, idStr] = matMatch;
  const id = Number(idStr);
  const info = typeInfo(type);

  if (!isOwnerUser) {
    await sendMessage(env, chatId, 'Materiallarni boshqarish faqat owner uchun.');
    return true;
  }

  if (action === 'list') {
    await sendMaterialList(env, chatId, type, id);
    return true;
  }
  if (action === 'view') {
    await sendMaterialDetail(env, chatId, type, id);
    return true;
  }
  if (action === 'pub') {
    const item = await getMaterial(env, type, id);
    if (!item) {
      await sendMessage(env, chatId, `${info.label} topilmadi.`);
      return true;
    }
    await env.DB.prepare(
      `UPDATE ${info.table} SET published = ?, updated_at = datetime('now') WHERE id = ?`
    ).bind(item.published ? 0 : 1, id).run();
    await sendMaterialDetail(env, chatId, type, id);
    return true;
  }
  if (action === 'del') {
    const item = await getMaterial(env, type, id);
    if (!item) {
      await sendMessage(env, chatId, `${info.label} topilmadi.`);
      return true;
    }
    await sendMessage(env, chatId, `#${id} "${shortText(item.title_uz, 60)}" ${info.label.toLowerCase()}ini o'chirasizmi?`, {
      inline_keyboard: [
        [{ text: "Ha, o'chirish", callback_data: `mat:del-confirm:${type}:${id}` }],
        [{ text: "Yo'q, qaytish", callback_data: `mat:view:${type}:${id}` }],
      ],
    });
    return true;
  }
  if (action === 'del-confirm') {
    const deleted = await deleteMaterial(env, type, id);
    await sendMessage(env, chatId, deleted ? `#${id} ${info.label.toLowerCase()} o'chirildi.` : `${info.label} topilmadi.`);
    await sendMaterialList(env, chatId, type, 0);
    return true;
  }
  return false;
}

/**
 * Material yaratish holatlaridagi xabarlar.
 * Boshqa holat bo'lsa null qaytaradi (dispatcher davom etadi).
 */
export async function handleMaterialMessageState(env, { session, message, text, chatId, userId }) {
  const state = session.state || 'idle';
  if (!state.startsWith('awaiting_material_')) return null;

  const type = session.material_type;
  if (!type || !MATERIAL_TYPES[type]) {
    await resetSession(env, userId, chatId);
    await sendMessage(env, chatId, "Jarayon eskirgan. Boshidan boshlang: Material qo'shish.");
    return { background: null };
  }

  if (state === 'awaiting_material_category') {
    await sendMessage(env, chatId, 'Kategoriyani yuqoridagi tugmalardan tanlang.');
    return { background: null };
  }

  if (state === 'awaiting_material_file' && type === 'presentation') {
    const found = getPresentationFile(message);
    if (!found) {
      await sendMessage(env, chatId, 'PDF, PPT yoki PPTX formatidagi faylni yuboring.');
      return { background: null };
    }
    if ((found.document.file_size || 0) > maxPdfBytes(env)) {
      await sendMessage(env, chatId, `Fayl juda katta. Maksimal hajm ${Math.floor(maxPdfBytes(env) / 1024 / 1024)} MB.`);
      return { background: null };
    }
    return {
      background: () => processPresentationFile(env, {
        chatId,
        userId,
        session,
        document: found.document,
        isPdf: found.isPdf,
      }),
    };
  }

  if (state === 'awaiting_material_file' && type === 'test') {
    const document = getTxtFile(message);
    if (!document) {
      await sendMessage(env, chatId, 'UTF-8 kodlashdagi .txt faylni yuboring.');
      return { background: null };
    }
    if ((document.file_size || 0) > MAX_TXT_BYTES) {
      await sendMessage(env, chatId, 'Fayl juda katta. Maksimal hajm 1 MB.');
      return { background: null };
    }
    return {
      background: () => processTestFile(env, { chatId, userId, session, document }),
    };
  }

  if (state === 'awaiting_material_url' && type === 'video') {
    if (!text) {
      await sendMessage(env, chatId, 'YouTube havolasini matn sifatida yuboring.');
      return { background: null };
    }
    await handleVideoUrl(env, { chatId, userId, session, text });
    return { background: null };
  }

  if (state === 'awaiting_material_title') {
    if (!text) {
      await sendMessage(env, chatId, 'Sarlavhani matn sifatida yuboring.');
      return { background: null };
    }
    await handleTitle(env, { chatId, userId, session, text });
    return { background: null };
  }

  if (state === 'awaiting_material_desc') {
    if (!text) {
      await sendMessage(env, chatId, "Tavsifni matn sifatida yuboring (yoki \"-\" yozing).");
      return { background: null };
    }
    try {
      await handleDescriptionAndSave(env, { chatId, userId, session, text });
    } catch (error) {
      await sendMessage(env, chatId, `Saqlashda xatolik:\n${safeErrorMessage(error)}`);
    }
    return { background: null };
  }

  return null;
}
