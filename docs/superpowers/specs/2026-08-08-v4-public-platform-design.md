# DL-Library v4 — Public Platform (auth'siz reja) — Design Spec

Sana: 2026-08-08. Holat: foydalanuvchi tomonidan tasdiqlangan qarorlar asosida.

## Maqsad

Saytning barcha funksiyalari ro'yxatdan o'tmasdan ishlaydi. Google login keyingi
katta relizga qoldiriladi. Buzilgan kitoblar katalogi tiklanadi, Taqdimotlar /
Videolar / Testlar bo'limlari qayta dizayn qilinadi, Telegram bot orqali barcha
material turlari boshqariladi, xavfsizlik kuchaytiriladi.

## Tasdiqlangan qarorlar

1. **Deploy**: branchda ishlanadi, lokal tekshiruvdan keyin master'ga push —
   production (dl-library.uz) avtomatik yangilanadi. Production D1 da faqat
   qo'shuvchi (additive) migratsiyalar. Kerak bo'lsa KV yaratish mumkin.
2. **Slaydlar**: PDF — ichki viewer (asosiy format). PPT/PPTX — Office online
   embed viewer orqali. API kalit talab qilinmaydi.
3. **Test**: har urinishda bazadan tasodifiy 20 ta savol (kam bo'lsa hammasi).
4. **Dizayn**: hozirgi vizual uslub (RTU logo, indigo palette, dark/light)
   saqlanadi, bo'limlar shu tizim ichida sayqallanadi.

## Diagnostika xulosalari (2026-08-08)

- `public/js/app.js` — encoding buzilishi (mojibake): `рџ“–`, `вЂ”`, butun RU
  tarjima bloki buzilgan. Sabab: `cfdeecb` commit noto'g'ri kodlashda saqlangan.
- Production D1 hali eski 151 kitob bilan — yangi 14 kitoblik katalog
  (books.json) production'ga sinxronlanmagan. Lokal D1 da 14 kitob bor va grid
  ishlaydi.
- `scripts/update-d1-books.mjs` `INSERT OR REPLACE` bilan id 1–14 ni bosib
  yuboradi — productionda eski kitoblarni yo'qotish xavfi bor. Ishlatilmaydi.
- Google login tugmasi dekorativ (hech narsa qilmaydi).
- CSS'da takrorlangan bloklar bor (material-card, badge 2 marta).

## Arxitektura qarorlari

### 1. Kitoblar katalogi (production sync, yo'qotishsiz)

- Additive migratsiya `0008_catalog_v4.sql`: `books` jadvaliga
  `archived INTEGER NOT NULL DEFAULT 0` ustuni.
- Public `GET /api/books` faqat `archived = 0` qaytaradi.
- Production sync skripti (`scripts/sync-catalog-remote.mjs`):
  1) barcha mavjud kitoblarni `archived = 1` qiladi;
  2) books.json dagi 14 kitobni YANGI id bilan qo'shadi (id berilmaydi,
     AUTOINCREMENT), file/cover R2 kalitlari bilan;
  3) 14 PDF + 14 muqova R2 ga `wrangler r2 object put` bilan yuklanadi.
- Hech narsa o'chirilmaydi: eski 151 kitob va R2 fayllari arxivda qoladi.

### 2. Auth'siz rejim

- `app.js` toza qayta yoziladi (encoding tuzatiladi).
- Google tugmasi bosilganda toast: o'ng yuqoridan ingichka panel slide-in,
  "Bu funksiya hali mavjud emas", ~3s dan keyin slide-out. Umumiy
  `showToast(message, type)` komponenti (boshqa xabarlar uchun ham).
- OAuth backend endpointlari qoladi (dormant), UI'dan chaqirilmaydi.
- Progress localStorage'da: kitob oxirgi sahifa, slayd pozitsiyasi, test
  natijalari tarixi (keyingi relizda profilga ko'chirish oson bo'lgan format:
  `dl_progress_v1` kaliti ostida JSON).

### 3. Taqdimotlar

- Katalog: muqova/gradient karta, sarlavha, slaydlar soni, kategoriya badge.
- Viewer: PDF.js asosidagi ichki viewer (flipbook.js dagi PDF.js lazy-load
  infrastrukturasi qayta ishlatiladi) — sahifa navigatsiyasi, fullscreen,
  klaviatura, swipe (mobil). PPT/PPTX fayllar uchun:
  `https://view.officeapps.live.com/op/embed.aspx?src=<public url>` iframe.
- `presentations.pdf_key` kengaytmasiga qarab viewer tanlanadi (`.pdf` → ichki,
  `.ppt/.pptx` → office viewer). Upload validatsiyasi shu 3 formatga ruxsat
  beradi; `page_count` PPTX uchun 0 bo'lishi mumkin (viewer o'zi ko'rsatadi).

### 4. Videolar

- Katalog: YouTube thumbnail (`i.ytimg.com/vi/<id>/hqdefault.jpg`), sarlavha,
  davomiylik badge.
- Player sahifasi: 16:9 responsive youtube-nocookie iframe, chiroyli ramka,
  tavsif bloki, "Orqaga" navigatsiya.

### 5. Test rejimi (o'quv rejimi)

- `GET /api/tests/quiz/:id` savollarni qaytaradi (hozirgidek, to'g'ri javob
  bilan — bu o'quv rejimi, imtihon emas).
- Client: tasodifiy 20 savol tanlanadi (savollar > 20 bo'lsa), variantlar
  aralashtiriladi.
- Vaqt: cheklovsiz, o'tgan vaqt hisoblagichi (MM:SS yuqorida).
- Javob belgilaganda: darhol to'g'ri (yashil) / noto'g'ri (qizil, to'g'risi
  yashil ko'rsatiladi) highlight + micro-animatsiya, ~1.2s dan keyin keyingi
  savolga silliq o'tish (slide animatsiya). Javob o'zgartirib bo'lmaydi.
- Progress bar + savol schyotchigi.
- Yakun: to'g'ri/noto'g'ri sonlari, foiz, sarflangan vaqt, natija ringi
  (animatsiyali), savollar tahlili, "Qayta ishlash" tugmasi.
- Anti-cheat/fullscreen bu rejimda olib tashlanadi (o'quv rejimi).
- Natija localStorage tarixiga yoziladi.

### 6. Telegram bot

- Mavjud kitob CRUD oqimi saqlanadi. `material_type` (0007 ustuni) asosida
  taqdimot (PDF/PPTX fayl), video (YouTube URL), test (.txt fayl, mavjud
  parser) qo'shish oqimlari to'ldiriladi. Ro'yxat/o'chirish/publish har tur
  uchun. Owner + `telegram_admins` ruxsati (mavjud tizim).

### 7. Xavfsizlik

- **Rate limit**: yangi `functions/_middleware.js` — barcha `/api/*` uchun IP
  bosh (CF-Connecting-IP) asosida sliding-window limit (D1 yoki xotira emas —
  D1 `rate_limits` jadvali additive migratsiyada; yozish faqat POST/PUT/DELETE
  va auth endpointlarga, GET uchun yengil limit).
- **Server-side authz audit**: barcha yozuvchi endpointlarda `requireAuth`
  (admin) yoki Telegram webhook secret tekshiruvi borligini tekshirish/tuzatish.
- **Security headerlar**: `_headers` fayli (Pages) — CSP, X-Frame-Options,
  X-Content-Type-Options, Referrer-Policy, Permissions-Policy.
- **Secretlar**: kodda hardcoded secret yo'qligini audit; `.dev.vars.example`
  yangilanadi; timing-safe taqqoslash login'da.
- **Upload validatsiyasi**: fayl turi/hajmi cheklovi (PDF/PNG/JPG/PPTX,
  max hajm), fayl nomi sanitizatsiyasi.
- **DDoS**: Cloudflare darajasida — foydalanuvchi uchun dashboard checklist
  (Bot Fight Mode, rate limiting rule, WAF managed rules).

### 8. Kod tozalash

- app.js qayta yoziladi, view modullar saqlanadi; CSS dublikatlar olib
  tashlanadi; log fayllar, eskirgan hujjatlar (handoff.md) o'chiriladi;
  DEPLOY.md yangilanadi (db:init:remote tuzoq olib tashlanadi); schema.sql
  DROP olib tashlanadi (faqat CREATE IF NOT EXISTS); README yangilanadi;
  barcha uz-lotin UI matnlari grammatik tekshiriladi.

## Tekshirish rejasi

1. `npm test` — barcha unit testlar.
2. Lokal `wrangler pages dev` — har bo'lim DOM tekshiruvi (desktop + mobil
   viewport), console xatolarsiz.
3. Production deploy'dan keyin dl-library.uz da smoke test.
