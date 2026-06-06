import { json } from '../../_lib/http.js';
import { requireAuth } from '../../_lib/auth.js';

export async function onRequestGet({ request, env }) {
  const session = await requireAuth(request, env);
  if (!session) {
    return json({ ok: true, authenticated: false });
  }
  return json({ ok: true, authenticated: true, user: { username: session.u } });
}
