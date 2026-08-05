/**
 * GET /api/profile/summary
 * Unified profile statistics for logged in user
 */
import { getCurrentUser } from '../../_lib/user-auth.js';

export async function onRequestGet(context) {
  const { env, request } = context;
  const user = await getCurrentUser(env, request);

  if (!user) {
    return new Response(JSON.stringify({ error: "Avtorizatsiyadan o'tilmagan" }), { status: 401 });
  }

  try {
    const userId = user.id;

    const booksCount = await env.DB.prepare(
      `SELECT COUNT(*) as count FROM user_progress WHERE user_id = ? AND item_type = 'book'`
    ).bind(userId).first('count');

    const presentationsCount = await env.DB.prepare(
      `SELECT COUNT(*) as count FROM user_progress WHERE user_id = ? AND item_type = 'presentation'`
    ).bind(userId).first('count');

    const videosCount = await env.DB.prepare(
      `SELECT COUNT(*) as count FROM user_progress WHERE user_id = ? AND item_type = 'video'`
    ).bind(userId).first('count');

    const testsCount = await env.DB.prepare(
      `SELECT COUNT(*) as count FROM test_attempts WHERE user_id = ? AND status != 'in_progress'`
    ).bind(userId).first('count');

    // Telegram link info
    const telegramLink = await env.DB.prepare(
      `SELECT telegram_username, telegram_first_name, linked_at FROM user_telegram_links WHERE user_id = ? AND revoked_at IS NULL`
    ).bind(userId).first();

    return new Response(JSON.stringify({
      user,
      stats: {
        booksCount,
        presentationsCount,
        videosCount,
        testsCount
      },
      telegramLink: telegramLink || null
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
