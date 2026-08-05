/**
 * Telegram Mini App initData HMAC-SHA256 Validatsiyasi
 */

export async function validateTelegramInitData(initDataRaw, botToken) {
  if (!initDataRaw || !botToken) return null;

  try {
    const params = new URLSearchParams(initDataRaw);
    const hash = params.get('hash');
    if (!hash) return null;

    params.delete('hash');

    // Parametrlarni kalit bo'yicha alifbo tartibida saralaymiz
    const keys = Array.from(params.keys()).sort();
    const dataCheckString = keys.map(k => `${k}=${params.get(k)}`).join('\n');

    const encoder = new TextEncoder();

    // WebCrypto orqali HMAC hisoblash
    const secretKey = await crypto.subtle.importKey(
      'raw',
      encoder.encode('WebAppData'),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const secretKeyBuffer = await crypto.subtle.sign('HMAC', secretKey, encoder.encode(botToken));

    const hmacKey = await crypto.subtle.importKey(
      'raw',
      secretKeyBuffer,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const calculatedHashBuffer = await crypto.subtle.sign('HMAC', hmacKey, encoder.encode(dataCheckString));
    const calculatedHashHex = Array.from(new Uint8Array(calculatedHashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    if (calculatedHashHex !== hash.toLowerCase()) {
      return null;
    }

    const userJson = params.get('user');
    const user = userJson ? JSON.parse(userJson) : null;
    const authDate = parseInt(params.get('auth_date') || '0', 10);

    return {
      user,
      authDate,
      raw: params
    };
  } catch (err) {
    console.error('validateTelegramInitData error:', err);
    return null;
  }
}
