/**
 * DL-Library User Authentication Helper (Google OAuth + User Sessions)
 */

export const USER_COOKIE_NAME = 'dl_user_session';

export async function hashToken(token) {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export function parseCookies(request) {
  const cookieHeader = request.headers.get('Cookie') || '';
  const cookies = {};
  cookieHeader.split(';').forEach(cookie => {
    const [name, ...rest] = cookie.trim().split('=');
    if (name) {
      cookies[name] = rest.join('=');
    }
  });
  return cookies;
}

export function createSessionCookie(token, maxAgeSeconds = 30 * 24 * 3600) {
  return `${USER_COOKIE_NAME}=${token}; Path=/; Max-Age=${maxAgeSeconds}; HttpOnly; Secure; SameSite=Lax`;
}

export function createClearSessionCookie() {
  return `${USER_COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`;
}

export async function getCurrentUser(env, request) {
  const cookies = parseCookies(request);
  const token = cookies[USER_COOKIE_NAME];
  if (!token) return null;

  try {
    const tokenHash = await hashToken(token);
    const session = await env.DB.prepare(
      `SELECT s.*, u.id as user_id, u.google_sub, u.email, u.display_name, u.avatar_url, u.locale
       FROM user_sessions s
       JOIN users u ON s.user_id = u.id
       WHERE s.token_hash = ? AND s.expires_at > datetime('now')`
    ).bind(tokenHash).first();

    if (!session) return null;

    return {
      id: session.user_id,
      googleSub: session.google_sub,
      email: session.email,
      displayName: session.display_name,
      avatarUrl: session.avatar_url,
      locale: session.locale
    };
  } catch (err) {
    console.error('getCurrentUser error:', err);
    return null;
  }
}
