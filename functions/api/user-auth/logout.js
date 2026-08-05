/**
 * POST /api/user-auth/logout
 * Logs out user and clears dl_user_session cookie
 */
import { parseCookies, createClearSessionCookie, hashToken, USER_COOKIE_NAME } from '../../_lib/user-auth.js';

export async function onRequestPost(context) {
  const { env, request } = context;
  const cookies = parseCookies(request);
  const token = cookies[USER_COOKIE_NAME];

  if (token) {
    try {
      const tokenHash = await hashToken(token);
      await env.DB.prepare(`DELETE FROM user_sessions WHERE token_hash = ?`).bind(tokenHash).run();
    } catch (err) {
      console.error('Logout error:', err);
    }
  }

  const headers = new Headers();
  headers.set('Content-Type', 'application/json');
  headers.set('Set-Cookie', createClearSessionCookie());

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers
  });
}
