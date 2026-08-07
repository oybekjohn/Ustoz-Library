import { ok, error } from '../../_lib/http.js';
import { createSession, safeEqual, sessionCookie } from '../../_lib/auth.js';

export async function onRequestPost({ request, env }) {
  if (!env.ADMIN_USERNAME || !env.ADMIN_PASSWORD || !env.SESSION_SECRET) {
    return error("Server sozlanmagan: ADMIN_USERNAME / ADMIN_PASSWORD / SESSION_SECRET yo'q", 500);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return error("Noto'g'ri so'rov", 400);
  }

  const { username, password } = body || {};
  const validUser = typeof username === 'string' && safeEqual(username, env.ADMIN_USERNAME);
  const validPass = typeof password === 'string' && safeEqual(password, env.ADMIN_PASSWORD);
  if (!validUser || !validPass) {
    return error("Login yoki parol noto'g'ri", 401);
  }

  const token = await createSession(username, env.SESSION_SECRET);
  const res = ok({ user: { username } });
  res.headers.append('Set-Cookie', sessionCookie(token));
  return res;
}
