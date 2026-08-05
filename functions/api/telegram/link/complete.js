/**
 * POST /api/telegram/link/complete
 * Completes Telegram account link
 */
import { verifyAndConsumeLinkToken } from '../../../_lib/telegram-link.js';

export async function onRequestPost(context) {
  const { env, request } = context;

  try {
    const body = await request.json();
    const { token, telegram_user_id, username, first_name, last_name } = body;

    if (!token || !telegram_user_id) {
      return new Response(JSON.stringify({ error: "Token va telegram_user_id talab qilinadi" }), { status: 400 });
    }

    const userId = await verifyAndConsumeLinkToken(env, token);
    if (!userId) {
      return new Response(JSON.stringify({ error: "Ulash kodi eskirgan yoki noto'g'ri" }), { status: 400 });
    }

    const now = new Date().toISOString();

    // Upsert link
    await env.DB.prepare(
      `INSERT INTO user_telegram_links (telegram_user_id, user_id, telegram_username, telegram_first_name, telegram_last_name, linked_at, last_seen_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(telegram_user_id) DO UPDATE SET
       user_id = excluded.user_id,
       telegram_username = excluded.telegram_username,
       telegram_first_name = excluded.telegram_first_name,
       telegram_last_name = excluded.telegram_last_name,
       revoked_at = NULL,
       last_seen_at = excluded.last_seen_at`
    ).bind(String(telegram_user_id), userId, username || null, first_name || null, last_name || null, now, now).run();

    return new Response(JSON.stringify({ success: true, userId }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
