/**
 * POST /api/telegram/webapp/session
 * Authenticate Telegram Mini App initData
 */
import { validateTelegramInitData } from '../../../_lib/telegram-auth.js';
import { generateRandomToken } from '../../../_lib/telegram-link.js';
import { hashToken } from '../../../_lib/user-auth.js';

export async function onRequestPost(context) {
  const { env, request } = context;
  const botToken = env.TELEGRAM_BOT_TOKEN;

  try {
    const body = await request.json();
    const initDataRaw = body.initData;

    if (!initDataRaw) {
      return new Response(JSON.stringify({ error: "initData taqdim etilmadi" }), { status: 400 });
    }

    const validated = await validateTelegramInitData(initDataRaw, botToken);
    if (!validated || !validated.user) {
      return new Response(JSON.stringify({ error: "Telegram initData imzosi yaroqsiz" }), { status: 401 });
    }

    const telegramUserId = String(validated.user.id);

    // Akkaunt bog'langan bo'lsa user_id ni olamiz
    const linked = await env.DB.prepare(
      `SELECT user_id FROM user_telegram_links WHERE telegram_user_id = ? AND revoked_at IS NULL`
    ).bind(telegramUserId).first();

    const userId = linked ? linked.user_id : null;

    // WebApp session yaratish
    const sessionToken = generateRandomToken(32);
    const tokenHash = await hashToken(sessionToken);

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 3600 * 1000).toISOString();

    await env.DB.prepare(
      `INSERT INTO telegram_webapp_sessions (token_hash, telegram_user_id, user_id, expires_at, created_at, last_seen_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).bind(tokenHash, telegramUserId, userId, expiresAt, now.toISOString(), now.toISOString()).run();

    return new Response(JSON.stringify({
      success: true,
      sessionToken,
      telegramUserId,
      userId,
      isLinked: Boolean(userId),
      user: validated.user
    }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
