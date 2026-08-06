/**
 * /api/tests
 * GET: List published tests (without correct answers)
 * POST: Create new test with parsed questions (Admin)
 */

export async function onRequestGet(context) {
  const { env, request } = context;
  const url = new URL(request.url);
  const category = url.searchParams.get('category');
  const language = url.searchParams.get('language');

  const all = url.searchParams.get('all');

  let sql = `SELECT t.id, t.title_uz, t.title_ru, t.title_en, t.description_uz, t.description_ru, t.description_en,
                    t.category, t.language, t.duration_minutes, t.passing_percent, t.max_attempts,
                    (SELECT COUNT(*) FROM test_questions q WHERE q.test_id = t.id) as question_count
             FROM tests t`;
  
  const params = [];
  const conditions = [];

  if (!all) {
    conditions.push(`t.published = 1`);
  }

  if (category) {
    conditions.push(`t.category = ?`);
    params.push(category);
  }
  if (language) {
    conditions.push(`t.language = ?`);
    params.push(language);
  }

  if (conditions.length > 0) {
    sql += ` WHERE ` + conditions.join(' AND ');
  }

  sql += ` ORDER BY t.created_at DESC`;

  try {
    const { results } = await env.DB.prepare(sql).bind(...params).all();
    return new Response(JSON.stringify({ tests: results || [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}

export async function onRequestPost(context) {
  const { env, request } = context;

  try {
    const body = await request.json();
    const {
      title_uz, title_ru, title_en, description_uz, description_ru, description_en,
      category, language, duration_minutes, passing_percent, max_attempts,
      shuffle_questions, shuffle_options, violation_limit, show_answers_after_finish,
      published, questions
    } = body;

    if (!title_uz || !category || !questions || !Array.isArray(questions) || questions.length === 0) {
      return new Response(JSON.stringify({ error: "Sarlavha, kategoriya va kamida 1 ta savol bo'lishi shart" }), { status: 400 });
    }

    const now = new Date().toISOString();

    // 1. Insert test metadata
    const testRes = await env.DB.prepare(
      `INSERT INTO tests
       (title_uz, title_ru, title_en, description_uz, description_ru, description_en, category, language,
        duration_minutes, passing_percent, max_attempts, shuffle_questions, shuffle_options, violation_limit,
        show_answers_after_finish, published, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      title_uz.trim(), title_ru ? title_ru.trim() : null, title_en ? title_en.trim() : null,
      description_uz ? description_uz.trim() : null, description_ru ? description_ru.trim() : null, description_en ? description_en.trim() : null,
      category, language || 'uz', duration_minutes || 15, passing_percent || 60, max_attempts || null,
      shuffle_questions !== false ? 1 : 0, shuffle_options !== false ? 1 : 0, violation_limit || 3,
      show_answers_after_finish !== false ? 1 : 0, published ? 1 : 0, now, now
    ).run();

    const testId = testRes.meta.last_row_id;

    // 2. Insert questions & options
    for (let qIdx = 0; qIdx < questions.length; qIdx++) {
      const q = questions[qIdx];
      const qRes = await env.DB.prepare(
        `INSERT INTO test_questions (test_id, position, question_text, created_at)
         VALUES (?, ?, ?, ?)`
      ).bind(testId, qIdx + 1, q.questionText || q.text, now).run();

      const qId = qRes.meta.last_row_id;

      for (let oIdx = 0; oIdx < q.options.length; oIdx++) {
        const opt = q.options[oIdx];
        await env.DB.prepare(
          `INSERT INTO test_options (question_id, position, option_text, is_correct)
           VALUES (?, ?, ?, ?)`
        ).bind(qId, oIdx + 1, opt.text || opt.option_text, opt.isCorrect ? 1 : 0).run();
      }
    }

    return new Response(JSON.stringify({ success: true, id: testId }), { status: 201 });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
