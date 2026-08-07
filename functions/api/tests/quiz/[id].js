import { json, error } from '../../../_lib/http.js';

// Har bir urinishda beriladigan savollar soni
const QUESTIONS_PER_ATTEMPT = 20;

/**
 * GET /api/tests/quiz/[id]
 * O'quv rejimi: testdan tasodifiy 20 ta savolni variantlari bilan qaytaradi.
 * To'g'ri javob ham beriladi — client javob belgilanganda darhol ko'rsatadi.
 */
export async function onRequestGet(context) {
  const { env, params } = context;
  const testId = Number(params.id);
  if (!Number.isInteger(testId) || testId < 1) {
    return error('Test topilmadi', 404);
  }

  try {
    const test = await env.DB.prepare(
      `SELECT id, title_uz, title_ru, title_en, category, language,
              passing_percent, show_answers_after_finish
       FROM tests WHERE id = ? AND published = 1`
    ).bind(testId).first();

    if (!test) return error('Test topilmadi', 404);

    // Tasodifiy 20 ta savol (savollar 20 tadan kam bo'lsa — hammasi)
    const { results: questions } = await env.DB.prepare(
      `SELECT id, question_text FROM test_questions
       WHERE test_id = ? ORDER BY RANDOM() LIMIT ?`
    ).bind(testId, QUESTIONS_PER_ATTEMPT).all();

    if (!questions || questions.length === 0) {
      return error("Testda savollar yo'q", 404);
    }

    // Barcha variantlar bitta so'rovda
    const placeholders = questions.map(() => '?').join(', ');
    const { results: options } = await env.DB.prepare(
      `SELECT id, question_id, option_text, is_correct FROM test_options
       WHERE question_id IN (${placeholders}) ORDER BY question_id, position`
    ).bind(...questions.map((q) => q.id)).all();

    const optionsByQuestion = new Map();
    for (const opt of options || []) {
      if (!optionsByQuestion.has(opt.question_id)) optionsByQuestion.set(opt.question_id, []);
      optionsByQuestion.get(opt.question_id).push({
        id: opt.id,
        option_text: opt.option_text,
        is_correct: opt.is_correct,
      });
    }

    return json({
      test,
      questions: questions.map((q) => ({
        id: q.id,
        question_text: q.question_text,
        options: optionsByQuestion.get(q.id) || [],
      })),
    });
  } catch (err) {
    console.error('quiz endpoint error:', err);
    return error('Server xatosi', 500);
  }
}
