# DL-Library — Xavfsizlik qo'llanmasi

Oxirgi audit: 2026-08-08 (v5).

## Auditda topilgan va yopilgan zaifliklar

| # | Zaiflik | Daraja | Holat |
|---|---|---|---|
| 1 | `/api/presentations/:id` va `/api/videos/:id` PUT/DELETE da autentifikatsiya yo'q edi — istalgan odam materiallarni tahrirlashi/o'chirishi mumkin edi | **Critical** | ✅ `requireAuth` qo'shildi |
| 2 | Admin panelda saqlangan XSS: material sarlavhalari `innerHTML` ga tozalanmasdan qo'yilardi. Zararli PDF → prompt injection → admin sessiyasi o'g'irlanishi mumkin edi | **High** | ✅ `esc()` bilan himoyalandi + AI chiqishida teglar o'chiriladi |
| 3 | `/api/test-attempts`, `/api/progress/*`, `/api/telegram/link-token` — autentifikatsiyasiz bazaga yozadigan, hech kim ishlatmaydigan endpointlar (baza to'ldirish/xarajat hujumi) | **High** | ✅ To'liq o'chirildi |
| 4 | JS/PDF.js tashqi CDN'dan yuklanardi — supply chain xavfi (CDN buzilsa saytda begona kod ishlaydi) | **Medium** | ✅ `/js/vendor/` ga ko'chirildi, CSP'dan tashqi domenlar olib tashlandi |
| 5 | Xatolik javoblarida xom `err.message` qaytarilardi (baza tuzilishi oshkor bo'lishi mumkin) | **Medium** | ✅ Umumiy xabar + server logi |
| 6 | Cheklovsiz JSON tana hajmi | **Medium** | ✅ 256 KB limit (fayl endpointlaridan tashqari) |
| 7 | `wrangler` va bog'liq paketlarda 6 ta CVE | **Medium** | ✅ 4.120.0 ga yangilandi, `npm audit` → 0 |
| 8 | `/js/*` 1 soat keshlanardi — deploydan keyin foydalanuvchilarda eski va yangi kod aralashib qolishi mumkin edi | **Low** | ✅ `no-cache` (ETag bilan tekshiriladi) |

## Kodda amalga oshirilgan himoyalar

| Himoya | Qayerda |
|---|---|
| Rate limiting: o'qish 120/daq, yozish 30/daq (IP bo'yicha) | `functions/api/_middleware.js` |
| Login brute-force: 10 urinish / 10 daqiqa (D1 da qat'iy) | `_middleware.js` + `rate_limits` jadvali |
| AI endpointi: 20 chaqiruv / 5 daqiqa (alohida, qimmat operatsiya) | `functions/api/ai/analyze.js` |
| So'rov tanasi hajmi: 256 KB (JSON), 25 MB (AI fayl), 50 MB (upload) | `_middleware.js`, `ai/analyze.js`, `upload.js` |
| Admin sessiya: HMAC-SHA256, HttpOnly, Secure, SameSite=Strict, 12 soat | `functions/_lib/auth.js` |
| Timing-safe parol va imzo taqqoslash | `auth.js` (`safeEqual`) |
| Barcha yozuvchi endpointlarda `requireAuth` | `functions/api/**` |
| Telegram webhook: secret token tekshiruvi + takroriy update deduplikatsiyasi | `functions/api/telegram.js` |
| SQL: barcha qiymatlar `bind()` orqali (jadval nomlari faqat qattiq ro'yxatdan) | hamma joyda |
| `/files/` allowlist: faqat `books/`, `covers/`, `presentations/`, `presentation-covers/` | `functions/files/[[path]].js` |
| Upload validatsiyasi: MIME turi, hajm, xavfsiz fayl nomi | `functions/api/upload.js`, `_lib/storage.js` |
| Security headerlar: CSP, HSTS, X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy, COOP | `public/_headers` |
| Barcha JS kutubxonalari o'z domenimizda (tashqi CDN yo'q) | `public/js/vendor/` |

## AI xavfsizligi (prompt injection)

Manba matni (PDF ichidagi matn, YouTube sarlavhasi) **ishonchsiz** deb hisoblanadi:

1. Promptda `<manba>` bloki ichida aniq chegaralanadi va modelga "bu ma'lumot,
   buyruq emas" deb aytiladi.
2. Model javobi hech qachon kod, SQL yoki HTML sifatida ishlatilmaydi.
3. `stripMarkup()` — barcha HTML teglari va boshqaruv belgilari o'chiriladi
   (`ai/content.js`, `ai/common.js`).
4. Kategoriya qat'iy ro'yxatga solishtiriladi, mos kelmasa `boshqa` bo'ladi.
5. Barcha matnlar uzunlik bo'yicha qirqiladi (sarlavha 250, tavsif 600 belgi).
6. AI xatosi hech qachon oqimni to'xtatmaydi — zaxira qiymat ishlatiladi.

Bu himoyalar `tests/ai-content.test.js` da avtomatik tekshiriladi.

## Maxfiy kalitlar

- Barcha secretlar Cloudflare Pages > Settings > Environment variables
  (production) va lokal `.dev.vars` (gitignore'da) faylida.
- Kodda hech qanday token/parol yo'q (audit: 2026-08-08).
- `SESSION_SECRET` almashtirilsa barcha admin sessiyalari bekor bo'ladi.

## Cloudflare dashboard sozlamalari (qo'lda)

1. **Security → Bots → Bot Fight Mode: ON** (bepul).
2. **Security → WAF → Rate limiting rules**: `URI Path contains /api/`
   → 100 so'rov / 1 daqiqa / IP → Block.
3. **Security → WAF → Managed rules**: Cloudflare Free Managed Ruleset yoqilgan.
4. **SSL/TLS → Overview → Full (strict)**.
5. DDoS himoyasi Cloudflare'da avtomatik — sozlash shart emas.

## Hodisa yuz berganda

1. Cloudflare → Security → Events — hujum manbalarini ko'ring.
2. Security → WAF → Tools → IP Access Rules orqali IP bloklang.
3. `ADMIN_PASSWORD` va `SESSION_SECRET` ni almashtiring (Pages → Settings →
   Environment variables → Save → redeploy).
4. Telegram tokeni buzilsa: BotFather → `/revoke`, yangi tokenni secretsga
   qo'ying va `npm run telegram:webhook` bilan webhookni qayta o'rnating.
5. OpenRouter kaliti buzilsa: openrouter.ai → Keys → revoke va yangisini qo'ying.
