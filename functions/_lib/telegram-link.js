/**
 * Telegram Account Link Helper
 */
import { hashToken } from './user-auth.js';

export function generateRandomToken(length = 32) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function createAccountLinkToken(env, userId, ttlMinutes = 10) {
  const rawToken = generateRandomToken(24);
  const tokenHash = await hashToken(rawToken);

  const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000).toISOString();

  await env.DB.prepare(
    `INSERT INTO account_link_tokens (token_hash, user_id, purpose, expires_at)
     VALUES (?, ?, 'telegram_link', ?)`
  ).bind(tokenHash, userId, expiresAt).run();

  return {
    rawToken,
    expiresAt
  };
}

export async function verifyAndConsumeLinkToken(env, rawToken) {
  if (!rawToken) return null;
  const tokenHash = await hashToken(rawToken);

  const tokenRecord = await env.DB.prepare(
    `SELECT * FROM account_link_tokens
     WHERE token_hash = ? AND used_at IS NULL AND expires_at > datetime('now')`
  ).bind(tokenHash).first();

  if (!tokenRecord) return null;

  // Ishlatildi deb belgilaymiz (one-time use)
  await env.DB.prepare(
    `UPDATE account_link_tokens SET used_at = datetime('now') WHERE token_hash = ?`
  ).bind(tokenHash).run();

  return tokenRecord.user_id;
}
