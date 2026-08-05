/**
 * GET /api/test-attempts/:id/result
 * Detailed test attempt results (questions, user answers, correct answers)
 */
import { getCurrentUser, parseCookies, hashToken } from '../../../_lib/user-auth.js';

export async function onRequestGet(context) {
  const { env, params, request } = context;
  const attemptId = params.id;

  try {
    const attempt = await env.DB.prepare(
      `SELECT a.*, t.title_uz, t.show_answers_after_finish, t.passing_percent
       FROM test_attempts a
       JOIN tests t ON a.test_id = t.id
       WHERE a.id = ?`
    ).bind(attemptId).first();

    if (!attempt) {
      return new Response(JSON.stringify({ error: "Attempt topilmadi" }), { status: 404 });
    }

    if (attempt.status === 'in_progress') {
      return new Response(JSON.stringify({ error: "Test hali yakunlanmagan" }), { status: 400 });
    }

    // Verify ownership
    const user = await getCurrentUser(env, request);
    if (attempt.user_id) {
      if (!user || user.id !== attempt.user_id) {
        return new Response(JSON.stringify({ error: "Ruxsat berilmagan" }), { status: 403 });
      }
    } else if (attempt.anonymous_token_hash) {
      const cookies = parseCookies(request);
      const anonToken = cookies['dl_anon_token'];
      const tokenHash = anonToken ? await hashToken(anonToken) : null;
      if (!tokenHash || tokenHash !== attempt.anonymous_token_hash) {
        return new Response(JSON.stringify({ error: "Ruxsat berilmagan" }), { status: 403 });
      }
    }

    const showAnswers = Boolean(attempt.show_answers_after_finish);

    // Fetch questions & options
    const { results: questions } = await env.DB.prepare(
      `SELECT id, position, question_text FROM test_questions WHERE test_id = ? ORDER BY position ASC`
    ).bind(attempt.test_id).all();

    for (const q of questions) {
      const { results: options } = await env.DB.prepare(
        `SELECT id, position, option_text${showAnswers ? ', is_correct' : ''} FROM test_options WHERE question_id = ? ORDER BY position ASC`
      ).bind(q.id).all();
      q.options = options || [];
    }

    // Fetch user answers
    const { results: savedAnswers } = await env.DB.prepare(
      `SELECT question_id, selected_option_id, is_correct FROM test_answers WHERE attempt_id = ?`
    ).bind(attemptId).all();

    const answersMap = {};
    if (savedAnswers) {
      for (const sa of savedAnswers) {
        answersMap[sa.question_id] = {
          selectedOptionId: sa.selected_option_id,
          isCorrect: Boolean(sa.is_correct)
        };
      }
    }

    return new Response(JSON.stringify({
      attemptId: attempt.id,
      titleUz: attempt.title_uz,
      status: attempt.status,
      finishReason: attempt.finish_reason,
      correctCount: attempt.correct_count,
      totalCount: attempt.total_count,
      scorePercent: attempt.score_percent,
      passingPercent: attempt.passing_percent,
      passed: Boolean(attempt.passed),
      submittedAt: attempt.submitted_at,
      showAnswers,
      questions,
      answersMap,
      isAnonymous: !attempt.user_id
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
