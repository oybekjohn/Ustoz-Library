/**
 * POST /api/ai/analyze — admin panel uchun AI yordamchisi.
 *
 * Admin kontentni beradi (PDF fayl, YouTube havolasi yoki test matni),
 * endpoint uch tilli sarlavha/tavsif/kategoriyani qaytaradi. Saqlash
 * amali bu yerda bajarilmaydi — admin formani ko'rib, o'zi saqlaydi.
 *
 * Faqat admin sessiyasi uchun. AI chaqiruvlari qimmat bo'lgani sababli
 * bu endpoint alohida, qattiqroq rate limit ostida.
 */

import { requireAuth } from '../../_lib/auth.js';
import { error, json } from '../../_lib/http.js';
import { analyzePresentation, analyzeTest, analyzeVideo } from '../../_lib/ai/content.js';
import { analyzeBookMetadata } from '../../_lib/ai/index.js';
import { isAiConfigured } from '../../_lib/ai/text-json.js';
import { inspectPdfFirstPages } from '../../_lib/pdf.js';
import { fetchYouTubeMeta } from '../../_lib/youtube-meta.js';
import { extractYouTubeId } from '../../_lib/youtube.js';
import { parseTestTxt } from '../../_lib/test-parser.js';

const MAX_FILE_BYTES = 25 * 1024 * 1024;
const MAX_TEXT_CHARS = 60_000;
const KINDS = ['book', 'presentation', 'video', 'test'];

// AI endpointi uchun alohida limit: 20 so'rov / 5 daqiqa (admin bo'yicha)
const AI_WINDOW_SECONDS = 300;
const AI_MAX_CALLS = 20;

async function checkAiRateLimit(env, request) {
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  try {
    const now = Math.floor(Date.now() / 1000);
    const windowStart = now - (now % AI_WINDOW_SECONDS);
    const row = await env.DB.prepare(`
      INSERT INTO rate_limits (bucket, window_start, count) VALUES (?, ?, 1)
      ON CONFLICT(bucket) DO UPDATE SET
        count = CASE WHEN rate_limits.window_start = excluded.window_start
                     THEN rate_limits.count + 1 ELSE 1 END,
        window_start = excluded.window_start,
        updated_at = datetime('now')
      RETURNING count
    `).bind(`ai:${ip}`, windowStart).first();
    return (row?.count || 1) <= AI_MAX_CALLS;
  } catch {
    return true;
  }
}

export async function onRequestPost(context) {
  const { env, request } = context;

  const session = await requireAuth(request, env);
  if (!session) return error('Avtorizatsiya talab qilinadi', 401);

  if (!isAiConfigured(env)) {
    return error("AI provayder sozlanmagan. Ma'lumotlarni qo'lda kiriting.", 503);
  }

  if (!(await checkAiRateLimit(env, request))) {
    return error("AI so'rovlari cheklovi oshib ketdi. Bir necha daqiqadan so'ng urinib ko'ring.", 429);
  }

  let kind;
  let file = null;
  let text = '';
  let url = '';
  let topic = '';

  const contentType = request.headers.get('Content-Type') || '';

  try {
    if (contentType.includes('multipart/form-data')) {
      const form = await request.formData();
      kind = String(form.get('kind') || '');
      const uploaded = form.get('file');
      if (uploaded && typeof uploaded !== 'string') file = uploaded;
      text = String(form.get('text') || '').slice(0, MAX_TEXT_CHARS);
      url = String(form.get('url') || '').slice(0, 500);
      topic = String(form.get('topic') || '').slice(0, 300);
    } else {
      const body = await request.json();
      kind = String(body?.kind || '');
      text = String(body?.text || '').slice(0, MAX_TEXT_CHARS);
      url = String(body?.url || '').slice(0, 500);
      topic = String(body?.topic || '').slice(0, 300);
    }
  } catch {
    return error("So'rov formati noto'g'ri", 400);
  }

  if (!KINDS.includes(kind)) return error("kind noto'g'ri", 400);
  if (file && file.size > MAX_FILE_BYTES) return error('Fayl juda katta (maksimal 25 MB)', 413);

  try {
    if (kind === 'video') {
      const videoId = extractYouTubeId(url);
      if (!videoId) return error("YouTube havolasi noto'g'ri", 400);
      const ytMeta = await fetchYouTubeMeta(videoId);
      const meta = await analyzeVideo({
        env,
        youtubeTitle: ytMeta.title || url,
        channelName: ytMeta.author,
        videoUrl: url,
      });
      return json({ ok: true, kind, meta, youtubeVideoId: videoId, youtubeTitle: ytMeta.title });
    }

    if (kind === 'test') {
      // Savollar matni ixtiyoriy — mavzu nomi asosiy manba
      let questionCount = null;
      let sampleQuestions = [];
      if (text.trim()) {
        const parsed = parseTestTxt(text);
        if (parsed.success) {
          questionCount = parsed.questions.length;
          sampleQuestions = parsed.questions.slice(0, 5).map((q) => q.questionText);
        }
      }
      if (!topic.trim() && sampleQuestions.length === 0) {
        return error("Mavzu nomi yoki test matnini kiriting", 400);
      }
      const meta = await analyzeTest({ env, topicName: topic, sampleQuestions, questionCount });
      return json({ ok: true, kind, meta, questionCount });
    }

    // book va presentation uchun PDF kerak
    if (!file) return error('PDF fayl yuborilmadi', 400);
    const buffer = await file.arrayBuffer();
    const info = await inspectPdfFirstPages(buffer, 2);

    if (kind === 'presentation') {
      const meta = await analyzePresentation({
        env,
        firstPageText: info.firstPagesText,
        fileName: file.name,
        pageCount: info.pageCount,
      });
      return json({ ok: true, kind, meta, pageCount: info.pageCount });
    }

    // kind === 'book' — mavjud kitob analizatori (uch tilli nom, muallif, yil)
    const metadata = await analyzeBookMetadata({
      env,
      pdfBuffer: buffer,
      firstPagesPdfBuffer: null,
      fileName: file.name || 'kitob.pdf',
      categoryName: 'Aniqlanmagan',
      pageCount: info.pageCount,
      firstPagesText: info.firstPagesText,
    });
    return json({ ok: true, kind, meta: metadata, pageCount: info.pageCount });
  } catch (err) {
    console.error('AI analyze error:', err?.message || err);
    return error("AI tahlili bajarilmadi. Ma'lumotlarni qo'lda kiriting.", 502);
  }
}
