/**
 * POST /api/telegram/link-token
 * Create one-time account link token for logged-in user
 */
import { getCurrentUser } from '../../_lib/user-auth.js';
import { createAccountLinkToken } from '../../_lib/telegram-link.js';

export async function onRequestPost(context) {
  const { env, request } = context;
  const user = await getCurrentUser(env, request);

  if (!user) {
    return new Response(JSON.stringify({ error: "Avtorizatsiyadan o'tilmagan" }), { status: 401 });
  }

  try {
    const { rawToken, expiresAt } = await createAccountLinkToken(env, user.id, 10);
    return new Response(JSON.stringify({ rawToken, expiresAt }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
