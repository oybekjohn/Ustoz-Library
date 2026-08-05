/**
 * GET /api/test-attempts/:id
 * Fetch ongoing attempt state and sanitized questions
 */
import { getCurrentUser, parseCookies, hashToken } from '../../_lib/user-auth.js';
import { sanitizeQuestionsForClient } from '../../_lib/test-engine.js';

export async function onRequestGet(context) {
  const { env, params, request } = context;
  const attemptId = params.id;

  try {
    const attempt = await env.DB.prepare(
      `SELECT a.*, t.title_uz, t.duration_minutes, t.violation_limit
       FROM test_attempts a
       JOIN tests t ON a.test_id = t.id
       WHERE a.id = ?`
    ).bind(attemptId).first();

    if (!attempt) {
      return new Response(JSON.stringify({ error: "Attempt topilmadi" }), { status: 404 });
    }

    // Verify ownership (user_id or anon token)
    const user = await getCurrentUser(env, request);
    if (attempt.user_id) {
      if (!user || user.id !== attempt.user_id) {
        return new Response(JSON.stringify({ error: "Ushbu test urinishiga ruxsat berilmagan" }), { status: 403 });
      }
    } else if (attempt.anonymous_token_hash) {
      const cookies = parseCookies(request);
      const anonToken = cookies['dl_anon_token'];
      const tokenHash = anonToken ? await hashToken(anonToken) : null;

      if (!tokenHash || tokenHash !== attempt.anonymous_token_hash) {
        return new Response(JSON.stringify({ error: "Ushbu test urinishiga ruxsat berilmagan" }), { status: 403 });
      }
    }

    // Fetch questions & options
    const { results: questions } = await env.DB.prepare(
      `SELECT id, position, question_text FROM test_questions WHERE test_id = ? ORDER BY position ASC`
    ).bind(attempt.test_id).all();

    for (const q of questions) {
      const { results: options } = await env.DB.prepare(
        `SELECT id, position, option_text FROM test_options WHERE question_id = ? ORDER BY position ASC`
      ).bind(q.id).all();
      q.options = options || [];
    }

    const questionOrder = JSON.parse(attempt.question_order_json);
    const optionOrder = JSON.parse(attempt.option_order_json);

    const clientQuestions = sanitizeQuestionsForClient(questions, questionOrder, optionOrder);

    // Saved answers
    const { results: savedAnswers } = await env.DB.prepare(
      `SELECT question_id, selected_option_id FROM test_answers WHERE attempt_id = ?`
    ).bind(attemptId).all();

    const answersMap = {};
    if (savedAnswers) {
      for (const a of savedAnswers) {
        answersMap[a.question_id] = a.selected_option_id;
      }
    }

    return new Response(JSON.stringify({
      attemptId: attempt.id,
      testId: attempt.test_id,
      titleUz: attempt.title_uz,
      status: attempt.status,
      startedAt: attempt.started_at,
      expiresAt: attempt.expires_at,
      violationCount: attempt.violation_count,
      violationLimit: attempt.violation_limit,
      questions: clientQuestions,
      savedAnswers: answersMap,
      isAnonymous: !attempt.user_id
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
