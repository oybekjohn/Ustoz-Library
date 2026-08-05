/**
 * GET /api/user/me
 * Returns current authenticated user profile or unauthenticated state
 */
import { getCurrentUser } from '../../_lib/user-auth.js';

export async function onRequestGet(context) {
  const { env, request } = context;
  const user = await getCurrentUser(env, request);

  if (!user) {
    return new Response(JSON.stringify({ authenticated: false, user: null }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  return new Response(JSON.stringify({
    authenticated: true,
    user
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}
