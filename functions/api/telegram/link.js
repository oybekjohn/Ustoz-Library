/**
 * DELETE /api/telegram/link
 * Unlink Telegram account for current user
 */
import { getCurrentUser } from '../../_lib/user-auth.js';

export async function onRequestDelete(context) {
  const { env, request } = context;
  const user = await getCurrentUser(env, request);

  if (!user) {
    return new Response(JSON.stringify({ error: "Avtorizatsiyadan o'tilmagan" }), { status: 401 });
  }

  try {
    const now = new Date().toISOString();
    await env.DB.prepare(
      `UPDATE user_telegram_links SET revoked_at = ? WHERE user_id = ?`
    ).bind(now, user.id).run();

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
