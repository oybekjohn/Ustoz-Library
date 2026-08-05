/**
 * GET /api/user-auth/google/callback
 * Handles OAuth callback from Google
 */
import { parseCookies, createSessionCookie, hashToken } from '../../../_lib/user-auth.js';

export async function onRequestGet(context) {
  const { env, request } = context;
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  if (error || !code) {
    return Response.redirect(`${url.origin}/?auth_error=${encodeURIComponent(error || 'code_missing')}`, 302);
  }

  const cookies = parseCookies(request);
  const savedState = cookies['dl_oauth_state'];

  if (!savedState || savedState !== state) {
    return Response.redirect(`${url.origin}/?auth_error=invalid_state`, 302);
  }

  const clientId = env.GOOGLE_CLIENT_ID;
  const clientSecret = env.GOOGLE_CLIENT_SECRET;
  const redirectUri = env.GOOGLE_REDIRECT_URI || `${url.origin}/api/user-auth/google/callback`;

  try {
    // 1. Exchange code for access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
      })
    });

    const tokenData = await tokenResponse.json();
    if (!tokenResponse.ok || !tokenData.access_token) {
      console.error('Google token exchange error:', tokenData);
      return Response.redirect(`${url.origin}/?auth_error=token_exchange_failed`, 302);
    }

    // 2. Fetch user profile from Google
    const userResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    });

    const profile = await userResponse.json();
    if (!profile || !profile.sub || !profile.email) {
      return Response.redirect(`${url.origin}/?auth_error=profile_failed`, 302);
    }

    const now = new Date().toISOString();

    // 3. Upsert user in DB
    const existingUser = await env.DB.prepare(
      `SELECT id FROM users WHERE google_sub = ?`
    ).bind(profile.sub).first();

    let userId;
    if (existingUser) {
      userId = existingUser.id;
      await env.DB.prepare(
        `UPDATE users SET email = ?, display_name = ?, avatar_url = ?, last_login_at = ? WHERE id = ?`
      ).bind(profile.email, profile.name || profile.email, profile.picture || null, now, userId).run();
    } else {
      const res = await env.DB.prepare(
        `INSERT INTO users (google_sub, email, display_name, avatar_url, created_at, last_login_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      ).bind(profile.sub, profile.email, profile.name || profile.email, profile.picture || null, now, now).run();
      userId = res.meta.last_row_id;
    }

    // 4. Create User Session
    const sessionTokenBytes = new Uint8Array(32);
    crypto.getRandomValues(sessionTokenBytes);
    const sessionToken = Array.from(sessionTokenBytes).map(b => b.toString(16).padStart(2, '0')).join('');
    const tokenHash = await hashToken(sessionToken);

    const expiresAt = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString();
    const userAgent = request.headers.get('User-Agent') || '';

    await env.DB.prepare(
      `INSERT INTO user_sessions (token_hash, user_id, expires_at, created_at, last_seen_at, user_agent)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).bind(tokenHash, userId, expiresAt, now, now, userAgent).run();

    // 5. Redirect back home with session cookie
    const headers = new Headers();
    headers.set('Location', `${url.origin}/`);
    headers.append('Set-Cookie', createSessionCookie(sessionToken));
    headers.append('Set-Cookie', `dl_oauth_state=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`);

    return new Response(null, {
      status: 302,
      headers
    });
  } catch (err) {
    console.error('Google Callback Error:', err);
    return Response.redirect(`${url.origin}/?auth_error=server_error`, 302);
  }
}
