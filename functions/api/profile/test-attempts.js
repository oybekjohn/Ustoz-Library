/**
 * GET /api/profile/test-attempts
 */
import { getCurrentUser } from '../../_lib/user-auth.js';

export async function onRequestGet(context) {
  const { env, request } = context;
  const user = await getCurrentUser(env, request);

  if (!user) {
    return new Response(JSON.stringify({ error: "Avtorizatsiyadan o'tilmagan" }), { status: 401 });
  }

  try {
    const { results } = await env.DB.prepare(
      `SELECT a.id, a.test_id, a.channel, a.status, a.started_at, a.submitted_at,
              a.correct_count, a.total_count, a.score_percent, a.passed, t.title_uz
       FROM test_attempts a
       JOIN tests t ON a.test_id = t.id
       WHERE a.user_id = ? AND a.status != 'in_progress'
       ORDER BY a.started_at DESC`
    ).bind(user.id).all();

    return new Response(JSON.stringify({ attempts: results || [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
