/**
 * POST /api/test-attempts/:id/finish
 * Server-authoritative test scoring and submission
 */
import { calculateScoring } from '../../../_lib/test-engine.js';

export async function onRequestPost(context) {
  const { env, params } = context;
  const attemptId = params.id;

  try {
    const attempt = await env.DB.prepare(
      `SELECT a.*, t.passing_percent FROM test_attempts a
       JOIN tests t ON a.test_id = t.id
       WHERE a.id = ?`
    ).bind(attemptId).first();

    if (!attempt) {
      return new Response(JSON.stringify({ error: "Attempt topilmadi" }), { status: 404 });
    }

    // Idempotent: If already submitted or finished, return stored result directly
    if (attempt.status !== 'in_progress') {
      return new Response(JSON.stringify({
        alreadyFinished: true,
        correctCount: attempt.correct_count,
        totalCount: attempt.total_count,
        scorePercent: attempt.score_percent,
        passed: Boolean(attempt.passed),
        finishReason: attempt.finish_reason
      }), { status: 200 });
    }

    // 1. Fetch test questions with correct answer options
    const { results: questions } = await env.DB.prepare(
      `SELECT id FROM test_questions WHERE test_id = ?`
    ).bind(attempt.test_id).all();

    for (const q of questions) {
      const { results: options } = await env.DB.prepare(
        `SELECT id, is_correct FROM test_options WHERE question_id = ?`
      ).bind(q.id).all();
      q.options = options || [];
    }

    // 2. Fetch user selected answers
    const { results: savedAnswers } = await env.DB.prepare(
      `SELECT question_id, selected_option_id FROM test_answers WHERE attempt_id = ?`
    ).bind(attemptId).all();

    const userAnswersMap = new Map();
    if (savedAnswers) {
      for (const sa of savedAnswers) {
        userAnswersMap.set(sa.question_id, sa.selected_option_id);
      }
    }

    // 3. Compute score server-side
    const scoring = calculateScoring(questions, userAnswersMap);
    const passingPercent = attempt.passing_percent || 60;
    const passed = scoring.scorePercent >= passingPercent ? 1 : 0;
    const now = new Date().toISOString();

    // 4. Update attempt record
    await env.DB.prepare(
      `UPDATE test_attempts
       SET status = 'submitted',
           submitted_at = ?,
           correct_count = ?,
           total_count = ?,
           score_percent = ?,
           passed = ?,
           finish_reason = 'user_submitted'
       WHERE id = ?`
    ).bind(now, scoring.correctCount, scoring.totalCount, scoring.scorePercent, passed, attemptId).run();

    // 5. Update test_answers with is_correct evaluation
    for (const q of questions) {
      const selectedOptionId = userAnswersMap.get(q.id);
      if (selectedOptionId) {
        const correctOpt = q.options.find(o => o.is_correct === 1);
        const isCorrect = (correctOpt && correctOpt.id === Number(selectedOptionId)) ? 1 : 0;
        await env.DB.prepare(
          `UPDATE test_answers SET is_correct = ? WHERE attempt_id = ? AND question_id = ?`
        ).bind(isCorrect, attemptId, q.id).run();
      }
    }

    return new Response(JSON.stringify({
      success: true,
      correctCount: scoring.correctCount,
      totalCount: scoring.totalCount,
      scorePercent: scoring.scorePercent,
      passed: Boolean(passed)
    }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
