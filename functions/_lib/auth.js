// Oddiy parolli sessiya: imzolangan (HMAC-SHA256) cookie.
// Web Crypto API Cloudflare Workers muhitida mavjud.

const COOKIE_NAME = 'session';
const MAX_AGE_SECONDS = 60 * 60 * 12; // 12 soat

const enc = new TextEncoder();

function b64urlEncode(bytes) {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlDecode(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  const bin = atob(str);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function hmac(secret, data) {
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data));
  return b64urlEncode(new Uint8Array(sig));
}

// Doimiy vaqtli taqqoslash (timing attack'ga qarshi)
function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function createSession(username, secret) {
  const payload = b64urlEncode(enc.encode(JSON.stringify({
    u: username,
    exp: Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS,
  })));
  const sig = await hmac(secret, payload);
  return `${payload}.${sig}`;
}

export async function verifySession(token, secret) {
  if (!token || !token.includes('.')) return null;
  const [payload, sig] = token.split('.');
  const expected = await hmac(secret, payload);
  if (!safeEqual(sig, expected)) return null;
  try {
    const data = JSON.parse(new TextDecoder().decode(b64urlDecode(payload)));
    if (!data.exp || data.exp < Math.floor(Date.now() / 1000)) return null;
    return data;
  } catch {
    return null;
  }
}

export function sessionCookie(token) {
  return `${COOKIE_NAME}=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${MAX_AGE_SECONDS}`;
}

export function clearCookie() {
  return `${COOKIE_NAME}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`;
}

function readCookie(request, name) {
  const header = request.headers.get('Cookie') || '';
  for (const part of header.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return v.join('=');
  }
  return null;
}

// So'rov autentifikatsiyadan o'tganmi? O'tgan bo'lsa sessiya ma'lumotini qaytaradi.
export async function requireAuth(request, env) {
  const secret = env.SESSION_SECRET;
  if (!secret) return null;
  const token = readCookie(request, COOKIE_NAME);
  return await verifySession(token, secret);
}
