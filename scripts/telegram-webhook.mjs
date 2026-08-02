const siteUrl = String(process.argv[2] || process.env.PUBLIC_SITE_URL || '').replace(/\/$/, '');
const token = process.env.TELEGRAM_BOT_TOKEN;
const secret = process.env.TELEGRAM_WEBHOOK_SECRET;

if (!siteUrl || !/^https:\/\//i.test(siteUrl)) {
  console.error('HTTPS sayt manzilini kiriting: npm run telegram:webhook -- https://ustoz-library.pages.dev');
  process.exit(1);
}
if (!token) {
  console.error('TELEGRAM_BOT_TOKEN environment variable topilmadi');
  process.exit(1);
}
if (!secret) {
  console.error('TELEGRAM_WEBHOOK_SECRET environment variable topilmadi');
  process.exit(1);
}

const response = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    url: `${siteUrl}/api/telegram`,
    secret_token: secret,
    allowed_updates: ['message', 'callback_query'],
  }),
});

const payload = await response.json().catch(() => null);
if (!response.ok || !payload?.ok) {
  console.error(payload?.description || `Telegram HTTP ${response.status}`);
  process.exit(1);
}

console.log(`Webhook o'rnatildi: ${siteUrl}/api/telegram`);
