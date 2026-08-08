/**
 * Telegram bot: taqdimot, video va test materiallari.
 *
 * Asosiy g'oya — "yopishqoq bo'lim" (sticky section): admin bir marta
 * bo'limni tanlaydi va keyin ketma-ket istagancha material yuboraveradi.
 * Bo'lim faqat asosiy menyudan o'zgartiriladi.
 *
 * Oqimlar:
 *   Taqdimot — fayl yuboriladi, qolganini AI qiladi (sarlavha, tavsif,
 *              kategoriya), 1-sahifa muqova bo'ladi. Tasdiqlash so'ralmaydi.
 *              Bir nechta fayl ketma-ket yuborilsa, har biri alohida qo'shiladi.
 *   Video    — YouTube havolasi yuboriladi, qolganini AI qiladi.
 *   Test     — .txt fayl yoki oddiy matn yuboriladi, so'ng faqat mavzu nomi
 *              so'raladi; uch tilli nom va tavsifni AI yozadi.
 */

import { analyzePresentation, analyzeTest, analyzeVideo } from './ai/content.js';
import { createFirstPagesPdf, inspectPdfFirstPages } from './pdf.js';
import { createStorageKey, deleteObjects, putObject } from './storage.js';
import { parseTestTxt } from './test-parser.js';
import { fetchYouTubeMeta } from './youtube-meta.js';
import { extractYouTubeId } from './youtube.js';
import {
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
  presentation: { label: 'Taqdimot', table: 'presentations', emoji: '📊', hash: '#presentations' },
  video: { label: 'Video dars', table: 'videos', emoji: '🎥', hash: '#videos' },
  test: { label: 'Test', table: 'tests', emoji: '📝', hash: '#tests' },
};

const LIST_PAGE_SIZE = 6;
const MAX_TXT_BYTES = 1024 * 1024;
const MIN_INLINE_TEST_CHARS = 40;

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

// ============================================================
// BO'LIMNI TANLASH (yopishqoq)
// ============================================================

function uploadKeyboard(type) {
  return {
    inline_keyboard: [
      [{ text: "🔄 Boshqa bo'limga o'tish", callback_data: 'mat:section' }],
      [{ text: '✅ Tugatdim', callback_data: 'mat:done' }],
    ],
  };
}

export function sectionKeyboard() {
  return {
    inline_keyboard: [
      [{ text: '📚 Kitob (PDF)', callback_data: 'create-type:book' }],
      [{ text: '📊 Taqdimot (PDF/PPTX)', callback_data: 'create-type:presentation' }],
      [{ text: '🎥 Video dars (YouTube)', callback_data: 'create-type:video' }],
      [{ text: '📝 Test (TXT yoki matn)', callback_data: 'create-type:test' }],
      [{ text: 'Bekor qilish', callback_data: 'cancel' }],
    ],
  };
}

/** Bo'lim tanlangach, admin ketma-ket material yuboraveradi. */
export async function startMaterialCreate(env, chatId, userId, type) {
  const info = typeInfo(type);
  await saveSession(env, {
    user_id: userId,
    chat_id: chatId,
    state: 'awaiting_material_source',
    material_type: type,
  });

  const hints = {
    presentation: [
      "Taqdimot fayllarini yuboravering: PDF, PPT yoki PPTX.",
      `Maksimal hajm: ${Math.floor(maxPdfBytes(env) / 1024 / 1024)} MB.`,
      '',
      "Sarlavha, tavsif va kategoriyani tizim o'zi aniqlaydi.",
      "Birinchi sahifa muqova bo'lib qo'yiladi.",
      "Bir nechta faylni ketma-ket yuborsangiz ham bo'ladi.",
    ],
    video: [
      'YouTube havolalarini yuboravering.',
      'Masalan: https://youtu.be/XXXXXXXXXXX',
      '',
      "Sarlavha, tavsif va kategoriyani tizim o'zi aniqlaydi.",
    ],
    test: [
      'Test savollarini yuboring: .txt fayl yoki oddiy matn.',
      '',
      'Format:',
      'Savol matni?',
      '================',
      'Birinchi variant',
      '================',
      "#To'g'ri variant",
      '',
      '+++++',
      '',
      'Keyingi savol...',
      '',
      "So'ngra faqat mavzu nomini so'rayman.",
    ],
  };

  await sendMessage(
    env,
    chatId,
    [`${info.emoji} ${info.label} bo'limi tanlandi.`, '', ...hints[type]].join('\n'),
    uploadKeyboard(type),
  );
}

// ============================================================
// TAQDIMOT
// ============================================================

function getPresentationFile(message) {
  const document = message?.document;
  if (!document) return null;
  const name = document.file_name || '';
  const isPdf = document.mime_type === 'application/pdf' || /\.pdf$/i.test(name);
  const isPptx = PPTX_MIMES.includes(document.mime_type) || /\.pptx?$/i.test(name);
  if (!isPdf && !isPptx) return null;
  return { document, isPdf };
}

async function processPresentation(env, { chatId, userId, document, isPdf }) {
  const uploadedKeys = [];
  try {
    await sendMessage(env, chatId, `📊 "${shortText(document.file_name || 'fayl', 50)}" qabul qilindi, tahlil qilinmoqda...`);

    const buffer = await downloadTelegramFile(env, document.file_id, document.file_size);

    let pageCount = 0;
    let firstPageText = '';
    let coverKey = null;

    if (isPdf) {
      const info = await inspectPdfFirstPages(buffer, 2);
      pageCount = info.pageCount || 0;
      firstPageText = info.firstPagesText || '';

      // Birinchi sahifa — muqova (kichik 1 sahifali PDF)
      try {
        const coverBuffer = await createFirstPagesPdf(buffer, 1);
        coverKey = createStorageKey('presentation-covers', 'cover', 'application/pdf');
        await putObject(env.BUCKET, coverKey, coverBuffer, 'application/pdf');
        uploadedKeys.push(coverKey);
      } catch (coverError) {
        // Muqovasiz ham davom etamiz
        console.error('Cover extraction failed:', coverError?.message);
        coverKey = null;
      }
    }

    const contentType = isPdf
      ? 'application/pdf'
      : 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
    const fileKey = createStorageKey('presentations', document.file_name || 'taqdimot', contentType);
    await putObject(env.BUCKET, fileKey, buffer, contentType);
    uploadedKeys.push(fileKey);

    const meta = await analyzePresentation({
      env,
      firstPageText,
      fileName: document.file_name,
      pageCount,
    });

    const now = new Date().toISOString();
    const result = await env.DB.prepare(
      `INSERT INTO presentations
       (title_uz, title_ru, title_en, description_uz, description_ru, description_en,
        category, language, page_count, pdf_key, cover_key, published, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'uz', ?, ?, ?, 1, ?, ?)`
    ).bind(
      meta.title.uz, meta.title.ru, meta.title.en,
      meta.description.uz, meta.description.ru, meta.description.en,
      meta.category, pageCount, fileKey, coverKey, now, now,
    ).run();

    await sendMessage(env, chatId, [
      `✅ Taqdimot #${result.meta.last_row_id} qo'shildi`,
      '',
      `📌 ${meta.title.uz}`,
      `🏷 ${categoryLabel(meta.category)}`,
      isPdf ? `📄 ${pageCount} slayd${coverKey ? ' · muqova tayyor' : ''}` : '📄 PPTX (Office viewer)',
      meta.aiUsed ? '' : "⚠️ AI ishlamadi — nomi fayl nomidan olindi",
      '',
      `${siteUrl(env)}/${typeInfo('presentation').hash}`,
    ].filter(Boolean).join('\n'));
  } catch (error) {
    if (uploadedKeys.length) await deleteObjects(env.BUCKET, uploadedKeys);
    await sendMessage(env, chatId, `❌ Taqdimotni qo'shishda xatolik:\n${safeErrorMessage(error)}\n\nFaylni qayta yuboring.`);
  }
}

// ============================================================
// VIDEO
// ============================================================

async function processVideo(env, { chatId, url }) {
  try {
    const videoId = extractYouTubeId(url);
    if (!videoId) {
      await sendMessage(env, chatId, "❌ YouTube havolasi noto'g'ri. To'g'ri havolani yuboring.\nMasalan: https://youtu.be/XXXXXXXXXXX");
      return;
    }

    const existing = await env.DB.prepare('SELECT id FROM videos WHERE youtube_video_id = ?')
      .bind(videoId).first();
    if (existing) {
      await sendMessage(env, chatId, `ℹ️ Bu video allaqachon qo'shilgan (#${existing.id}).`);
      return;
    }

    await sendMessage(env, chatId, '🎥 Havola qabul qilindi, tahlil qilinmoqda...');

    const ytMeta = await fetchYouTubeMeta(videoId);
    const meta = await analyzeVideo({
      env,
      youtubeTitle: ytMeta.title || url,
      channelName: ytMeta.author,
      videoUrl: url,
    });

    const now = new Date().toISOString();
    const result = await env.DB.prepare(
      `INSERT INTO videos
       (title_uz, title_ru, title_en, description_uz, description_ru, description_en,
        category, language, youtube_url, youtube_video_id, published, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'uz', ?, ?, 1, ?, ?)`
    ).bind(
      meta.title.uz, meta.title.ru, meta.title.en,
      meta.description.uz, meta.description.ru, meta.description.en,
      meta.category, `https://www.youtube.com/watch?v=${videoId}`, videoId, now, now,
    ).run();

    await sendMessage(env, chatId, [
      `✅ Video dars #${result.meta.last_row_id} qo'shildi`,
      '',
      `📌 ${meta.title.uz}`,
      `🏷 ${categoryLabel(meta.category)}`,
      ytMeta.author ? `📺 ${ytMeta.author}` : '',
      meta.aiUsed ? '' : "⚠️ AI ishlamadi — nomi YouTube'dan olindi",
      '',
      `${siteUrl(env)}/${typeInfo('video').hash}`,
    ].filter(Boolean).join('\n'));
  } catch (error) {
    await sendMessage(env, chatId, `❌ Videoni qo'shishda xatolik:\n${safeErrorMessage(error)}`);
  }
}

// ============================================================
// TEST
// ============================================================

function getTxtFile(message) {
  const document = message?.document;
  if (!document) return null;
  const isTxt = document.mime_type === 'text/plain' || /\.txt$/i.test(document.file_name || '');
  return isTxt ? document : null;
}

async function stageTestQuestions(env, { chatId, userId, session, content }) {
  const parsed = parseTestTxt(content);

  if (!parsed.success) {
    const errorLines = (parsed.errors || []).slice(0, 5).map((e) => `• ${e.message}`);
    await sendMessage(env, chatId, [
      '❌ Test matnida xatolik topildi:',
      ...errorLines,
      '',
      "Tuzatib qayta yuboring.",
    ].join('\n'));
    return;
  }

  await saveSession(env, {
    ...session,
    user_id: userId,
    chat_id: chatId,
    state: 'awaiting_material_topic',
    material_type: 'test',
    pending_metadata: JSON.stringify({ questions: parsed.questions }),
  });

  await sendMessage(env, chatId, [
    `✅ ${parsed.questions.length} ta savol o'qildi.`,
    '',
    "Endi test qaysi fan yoki mavzu doirasida ekanini o'zbek tilida yozing.",
    'Masalan: "Axborot xavfsizligi asoslari"',
  ].join('\n'));
}

async function saveTestWithTopic(env, { chatId, userId, session, topicName }) {
  try {
    const pending = parseJson(session.pending_metadata, {}) || {};
    const questions = pending.questions || [];
    if (questions.length === 0) {
      await resetSession(env, userId, chatId);
      await sendMessage(env, chatId, '❌ Savollar topilmadi. Testni qaytadan yuboring.');
      return;
    }

    await sendMessage(env, chatId, "📝 Ma'lumotlar tayyorlanmoqda...");

    const meta = await analyzeTest({
      env,
      topicName,
      sampleQuestions: questions.slice(0, 5).map((q) => q.questionText),
      questionCount: questions.length,
    });

    const now = new Date().toISOString();
    const testResult = await env.DB.prepare(
      `INSERT INTO tests
       (title_uz, title_ru, title_en, description_uz, description_ru, description_en,
        category, language, published, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'uz', 1, ?, ?)`
    ).bind(
      meta.title.uz, meta.title.ru, meta.title.en,
      meta.description.uz, meta.description.ru, meta.description.en,
      meta.category, now, now,
    ).run();

    const testId = testResult.meta.last_row_id;

    // Savollar va variantlarni yozish
    for (let qIdx = 0; qIdx < questions.length; qIdx++) {
      const q = questions[qIdx];
      const qRes = await env.DB.prepare(
        'INSERT INTO test_questions (test_id, position, question_text, created_at) VALUES (?, ?, ?, ?)'
      ).bind(testId, qIdx + 1, q.questionText, now).run();

      const questionId = qRes.meta.last_row_id;
      for (let oIdx = 0; oIdx < q.options.length; oIdx++) {
        const opt = q.options[oIdx];
        await env.DB.prepare(
          'INSERT INTO test_options (question_id, position, option_text, is_correct) VALUES (?, ?, ?, ?)'
        ).bind(questionId, oIdx + 1, opt.text, opt.isCorrect ? 1 : 0).run();
      }
    }

    // Bo'lim saqlanadi — admin yana test yuborishi mumkin
    await saveSession(env, {
      user_id: userId,
      chat_id: chatId,
      state: 'awaiting_material_source',
      material_type: 'test',
    });

    await sendMessage(env, chatId, [
      `✅ Test #${testId} qo'shildi`,
      '',
      `📌 ${meta.title.uz}`,
      `🏷 ${categoryLabel(meta.category)}`,
      `❓ ${questions.length} ta savol`,
      meta.aiUsed ? '' : '⚠️ AI ishlamadi — nomi siz yozgan mavzudan olindi',
      '',
      `${siteUrl(env)}/${typeInfo('test').hash}`,
      '',
      'Keyingi testni yuborishingiz mumkin.',
    ].filter(Boolean).join('\n'), uploadKeyboard('test'));
  } catch (error) {
    await sendMessage(env, chatId, `❌ Testni saqlashda xatolik:\n${safeErrorMessage(error)}`);
  }
}

// ============================================================
// BOSHQARISH (owner)
// ============================================================

export async function sendMaterialManageMenu(env, chatId, type) {
  await sendMaterialList(env, chatId, type, 0);
}

async function sendMaterialList(env, chatId, type, page) {
  const info = typeInfo(type);
  const offset = page * LIST_PAGE_SIZE;

  const totalRow = await env.DB.prepare(`SELECT COUNT(*) as total FROM ${info.table}`).first();
  const total = totalRow?.total || 0;

  if (total === 0) {
    await sendMessage(env, chatId, `Hozircha ${info.label.toLowerCase()} yo'q. "Material qo'shish" orqali qo'shishingiz mumkin.`);
    return;
  }

  const { results = [] } = await env.DB.prepare(
    `SELECT id, title_uz, published FROM ${info.table} ORDER BY created_at DESC LIMIT ? OFFSET ?`
  ).bind(LIST_PAGE_SIZE, offset).all();

  const rows = results.map((item) => [{
    text: `${item.published ? '✅' : '🚫'} #${item.id} ${shortText(item.title_uz, 40)}`,
    callback_data: `mat:view:${type}:${item.id}`,
  }]);

  const navigation = [];
  if (page > 0) navigation.push({ text: '◀ Oldingi', callback_data: `mat:list:${type}:${page - 1}` });
  if (offset + LIST_PAGE_SIZE < total) navigation.push({ text: 'Keyingi ▶', callback_data: `mat:list:${type}:${page + 1}` });
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
  return env.DB.prepare(`SELECT * FROM ${typeInfo(type).table} WHERE id = ?`).bind(id).first();
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
  if (type === 'presentation') {
    lines.push(`Slaydlar: ${item.page_count || 'Office viewer'}`);
    lines.push(`Muqova: ${item.cover_key ? 'bor' : "yo'q"}`);
  }
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
      'DELETE FROM test_options WHERE question_id IN (SELECT id FROM test_questions WHERE test_id = ?)'
    ).bind(id).run();
    await env.DB.prepare('DELETE FROM test_questions WHERE test_id = ?').bind(id).run();
  }
  await env.DB.prepare(`DELETE FROM ${info.table} WHERE id = ?`).bind(id).run();

  const keys = [item.pdf_key, item.cover_key].filter(Boolean);
  if (keys.length) await deleteObjects(env.BUCKET, keys);
  return true;
}

// ============================================================
// DISPATCH
// ============================================================

/** Callbacklar: mat:section, mat:done, mat:list|view|pub|del|del-confirm:<type>:<id> */
export async function handleMaterialCallback(env, chatId, userId, data, isOwnerUser) {
  if (data === 'mat:section') {
    await sendMessage(env, chatId, "Qaysi turdagi material qo'shmoqchisiz?", sectionKeyboard());
    return true;
  }

  if (data === 'mat:done') {
    await resetSession(env, userId, chatId);
    await sendMessage(env, chatId, "Tayyor. Yana material qo'shish uchun menyudan tanlang.");
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
 * Material yuborish holatidagi xabarlar.
 * Boshqa holat bo'lsa null qaytaradi (dispatcher davom etadi).
 */
export async function handleMaterialMessageState(env, { session, message, text, chatId, userId }) {
  const state = session.state || 'idle';
  if (!state.startsWith('awaiting_material_')) return null;

  const type = session.material_type;
  if (!type || !MATERIAL_TYPES[type]) {
    await resetSession(env, userId, chatId);
    await sendMessage(env, chatId, "Jarayon eskirgan. Bo'limni qaytadan tanlang.", sectionKeyboard());
    return { background: null };
  }

  // Test uchun mavzu nomi kutilmoqda
  if (state === 'awaiting_material_topic') {
    if (!text || text.trim().length < 3) {
      await sendMessage(env, chatId, "Mavzu nomini matn sifatida yozing (kamida 3 ta belgi).");
      return { background: null };
    }
    return { background: () => saveTestWithTopic(env, { chatId, userId, session, topicName: text.trim() }) };
  }

  if (state !== 'awaiting_material_source') return null;

  // --- Taqdimot ---
  if (type === 'presentation') {
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
      background: () => processPresentation(env, {
        chatId,
        userId,
        document: found.document,
        isPdf: found.isPdf,
      }),
    };
  }

  // --- Video ---
  if (type === 'video') {
    if (!text) {
      await sendMessage(env, chatId, 'YouTube havolasini matn sifatida yuboring.');
      return { background: null };
    }
    return { background: () => processVideo(env, { chatId, url: text.trim() }) };
  }

  // --- Test: .txt fayl yoki oddiy matn ---
  if (type === 'test') {
    const document = getTxtFile(message);
    if (document) {
      if ((document.file_size || 0) > MAX_TXT_BYTES) {
        await sendMessage(env, chatId, 'Fayl juda katta. Maksimal hajm 1 MB.');
        return { background: null };
      }
      return {
        background: async () => {
          try {
            const buffer = await downloadTelegramFile(env, document.file_id, document.file_size);
            const content = new TextDecoder('utf-8').decode(buffer);
            await stageTestQuestions(env, { chatId, userId, session, content });
          } catch (error) {
            await sendMessage(env, chatId, `❌ Faylni o'qishda xatolik:\n${safeErrorMessage(error)}`);
          }
        },
      };
    }

    if (text && text.length >= MIN_INLINE_TEST_CHARS) {
      return { background: () => stageTestQuestions(env, { chatId, userId, session, content: text }) };
    }

    await sendMessage(env, chatId, 'Test savollarini .txt fayl yoki to\'liq matn sifatida yuboring.');
    return { background: null };
  }

  return null;
}
