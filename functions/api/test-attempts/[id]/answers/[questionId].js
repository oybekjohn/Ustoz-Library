/**
 * PUT /api/test-attempts/:id/answers/:questionId
 * Autosave user answer choice for a question
 */

export async function onRequestPut(context) {
  const { env, params, request } = context;
  const { id: attemptId, questionId } = params;

  try {
    const attempt = await env.DB.prepare(
      `SELECT status, expires_at FROM test_attempts WHERE id = ?`
    ).bind(attemptId).first();

    if (!attempt) {
      return new Response(JSON.stringify({ error: "Attempt topilmadi" }), { status: 404 });
    }

    if (attempt.status !== 'in_progress') {
      return new Response(JSON.stringify({ error: "Test yakunlangan yoki to'xtatilgan" }), { status: 400 });
    }

    const now = new Date().toISOString();
    if (now > attempt.expires_at) {
      // Vaqt tugagan -> expired deb belgilaymiz
      await env.DB.prepare(
        `UPDATE test_attempts SET status = 'expired', finish_reason = 'time_expired', submitted_at = ? WHERE id = ?`
      ).bind(now, attemptId).run();
      return new Response(JSON.stringify({ error: "Vaqt tugadi", expired: true }), { status: 400 });
    }

    const body = await request.json();
    const selectedOptionId = body.selected_option_id;

    await env.DB.prepare(
      `INSERT INTO test_answers (attempt_id, question_id, selected_option_id, answered_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(attempt_id, question_id) DO UPDATE SET
       selected_option_id = excluded.selected_option_id,
       answered_at = excluded.answered_at`
    ).bind(attemptId, questionId, selectedOptionId || null, now).run();

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
