/**
 * POST /api/test-attempts/:id/violations
 * Record anti-cheat violation (tab change, blur, fullscreen exit)
 */

export async function onRequestPost(context) {
  const { env, params, request } = context;
  const attemptId = params.id;

  try {
    const attempt = await env.DB.prepare(
      `SELECT a.*, t.violation_limit FROM test_attempts a
       JOIN tests t ON a.test_id = t.id
       WHERE a.id = ?`
    ).bind(attemptId).first();

    if (!attempt) {
      return new Response(JSON.stringify({ error: "Attempt topilmadi" }), { status: 404 });
    }

    if (attempt.status !== 'in_progress') {
      return new Response(JSON.stringify({ error: "Test faol emas" }), { status: 400 });
    }

    const body = await request.json();
    const eventType = body.event_type || 'unknown_violation';
    const now = new Date().toISOString();

    // Insert violation
    await env.DB.prepare(
      `INSERT INTO test_violations (attempt_id, event_type, occurred_at, client_context_json)
       VALUES (?, ?, ?, ?)`
    ).bind(attemptId, eventType, now, JSON.stringify(body.context || {})).run();

    const newViolationCount = attempt.violation_count + 1;
    const limit = attempt.violation_limit || 3;
    let terminated = false;

    if (newViolationCount >= limit) {
      terminated = true;
      await env.DB.prepare(
        `UPDATE test_attempts
         SET violation_count = ?, status = 'terminated', finish_reason = 'violation_limit_exceeded', submitted_at = ?
         WHERE id = ?`
      ).bind(newViolationCount, now, attemptId).run();
    } else {
      await env.DB.prepare(
        `UPDATE test_attempts SET violation_count = ? WHERE id = ?`
      ).bind(newViolationCount, attemptId).run();
    }

    return new Response(JSON.stringify({
      success: true,
      violationCount: newViolationCount,
      violationLimit: limit,
      terminated
    }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
