/**
 * GET /api/user-auth/google/start
 * Initiates Google OAuth 2.0 flow
 */

export async function onRequestGet(context) {
  const { env, request } = context;
  const clientId = env.GOOGLE_CLIENT_ID;

  if (!clientId) {
    return new Response(JSON.stringify({ error: "GOOGLE_CLIENT_ID sozlanmagan" }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const url = new URL(request.url);
  const redirectUri = env.GOOGLE_REDIRECT_URI || `${url.origin}/api/user-auth/google/callback`;

  // Random state parameter for CSRF protection
  const stateBytes = new Uint8Array(16);
  crypto.getRandomValues(stateBytes);
  const state = Array.from(stateBytes).map(b => b.toString(16).padStart(2, '0')).join('');

  const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  googleAuthUrl.searchParams.set('client_id', clientId);
  googleAuthUrl.searchParams.set('redirect_uri', redirectUri);
  googleAuthUrl.searchParams.set('response_type', 'code');
  googleAuthUrl.searchParams.set('scope', 'openid email profile');
  googleAuthUrl.searchParams.set('state', state);
  googleAuthUrl.searchParams.set('prompt', 'select_account');

  // State cookieni saqlash
  const headers = new Headers();
  headers.set('Location', googleAuthUrl.toString());
  headers.set('Set-Cookie', `dl_oauth_state=${state}; Path=/; Max-Age=600; HttpOnly; Secure; SameSite=Lax`);

  return new Response(null, {
    status: 302,
    headers
  });
}
