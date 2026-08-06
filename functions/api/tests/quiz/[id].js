/**
 * GET /api/tests/quiz/[id]
 * Testning barcha savollari va variantlarini qaytaradi (client-side quiz uchun).
 * To'g'ri javob ham beriladi — client tomonida tekshiriladi.
 * Keyingi versiyada bu endpoint olib tashlanib, server-side attempt tizimi ishlatiladi.
 */
export async function onRequestGet(context) {
  const { env, params } = context;
  const testId = params.id;

  try {
    const test = await env.DB.prepare(
      `SELECT * FROM tests WHERE id = ? AND published = 1`
    ).bind(testId).first();

    if (!test) {
      return new Response(JSON.stringify({ error: "Test topilmadi" }), { status: 404 });
    }

    const { results: questions } = await env.DB.prepare(
      `SELECT id, position, question_text FROM test_questions WHERE test_id = ? ORDER BY position ASC`
    ).bind(testId).all();

    for (const q of questions) {
      const { results: options } = await env.DB.prepare(
        `SELECT id, position, option_text, is_correct FROM test_options WHERE question_id = ? ORDER BY position ASC`
      ).bind(q.id).all();
      q.options = options || [];
    }

    return new Response(JSON.stringify({
      test: {
        id: test.id,
        title_uz: test.title_uz,
        title_ru: test.title_ru,
        title_en: test.title_en,
        category: test.category,
        duration_minutes: test.duration_minutes,
        passing_percent: test.passing_percent,
        shuffle_questions: test.shuffle_questions,
        shuffle_options: test.shuffle_options,
        show_answers_after_finish: test.show_answers_after_finish,
      },
      questions,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
