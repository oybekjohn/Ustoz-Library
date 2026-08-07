# DL-Library — Xavfsizlik qo'llanmasi

Oxirgi yangilanish: 2026-08-08 (v4).

## Kodda amalga oshirilgan himoyalar

| Himoya | Qayerda | Tavsif |
|---|---|---|
| Rate limiting (API) | `functions/api/_middleware.js` | IP bo'yicha: o'qish 120/daq, yozish 30/daq (isolate xotirasida) |
| Login brute-force himoyasi | `functions/api/_middleware.js` + D1 `rate_limits` | 10 urinish / 10 daqiqa, IP bo'yicha, D1 da qat'iy hisoblanadi |
| Admin sessiya | `functions/_lib/auth.js` | HMAC-SHA256 imzolangan cookie, HttpOnly, Secure, SameSite=Strict, 12 soat |
| Timing-safe taqqoslash | `auth.js` (`safeEqual`) | Login va sessiya imzosi tekshiruvida |
| Yozuvchi endpointlar auth | barcha `POST/PUT/DELETE` | `requireAuth` (admin cookie) yoki Telegram webhook secret |
| Telegram webhook | `functions/api/telegram.js` | `X-Telegram-Bot-Api-Secret-Token` tekshiruvi, takroriy update deduplikatsiyasi |
| Fayl proxy allowlist | `functions/files/[[path]].js` | Faqat `books/`, `covers/`, `presentations/`, `presentation-covers/` prefikslari |
| Upload validatsiyasi | `functions/api/upload.js` | Fayl turi (PDF/PNG/JPG/WEBP/PPTX) va hajm cheklovi, xavfsiz fayl nomi |
| Security headerlar | `public/_headers` + middleware | CSP, X-Frame-Options, nosniff, HSTS, Referrer-Policy, Permissions-Policy |
| Foydalanuvchi sessiya tokenlari | `user-auth` (keyingi reliz) | SHA-256 hash bilan saqlanadi |

## Maxfiy kalitlar

- Barcha secretlar **faqat** Cloudflare Pages > Settings > Environment variables
  (production) va lokal `.dev.vars` (gitignore'da) faylida saqlanadi.
- Kodda hech qanday token/parol yo'q (audit: 2026-08-08).
- `SESSION_SECRET` uzun tasodifiy satr bo'lishi shart; almashtirilsa barcha
  sessiyalar bekor bo'ladi.

## Cloudflare dashboard sozlamalari (qo'lda, tavsiya)

Bular kod bilan emas, dashboard orqali yoqiladi — har biri 1-2 daqiqa:

1. **Bot himoyasi**: Security → Bots → **Bot Fight Mode: ON** (bepul).
2. **Rate limiting rule** (tarmoq darajasida): Security → WAF → Rate limiting
   rules → yangi qoida: `URI Path contains /api/` uchun 100 req / 1 daqiqa /
   IP → Block. (Bepul planda 1 ta qoida mumkin.)
3. **Managed WAF**: Security → WAF → Managed rules — bepul planda Cloudflare
   Free Managed Ruleset yoqilganini tekshiring.
4. **DDoS**: Cloudflare avtomatik L3/L4/L7 DDoS himoyasi doim yoniq —
   qo'shimcha sozlash shart emas.
5. **SSL/TLS**: SSL/TLS → Overview → **Full (strict)** rejimini tanlang.
6. **Turbo/Cache**: Speed → Optimization — Brotli ON (odatda avtomatik).

## Hodisa yuz berganda (incident)

1. Cloudflare dashboard → Security → Events — hujum manbalarini ko'ring.
2. Zarur bo'lsa: Security → WAF → Tools → IP Access Rules orqali IP bloklang.
3. `ADMIN_PASSWORD` va `SESSION_SECRET` ni darhol almashtiring
   (Pages → Settings → Environment variables → Edit → Save → redeploy).
4. Telegram bot token buzilgan bo'lsa: BotFather → /revoke, yangi tokenni
   secretsga qo'ying va webhookni qayta o'rnating (`npm run telegram:webhook`).
