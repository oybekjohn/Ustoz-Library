import { ok } from '../../_lib/http.js';
import { clearCookie } from '../../_lib/auth.js';

export async function onRequestPost() {
  const res = ok({ loggedOut: true });
  res.headers.append('Set-Cookie', clearCookie());
  return res;
}
