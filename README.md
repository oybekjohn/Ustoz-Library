# DL-Library — o'quv platformasi

Ustoz Ravshan Ayupov va Oybek Xushvaqtov tomonidan RTU talabalari uchun
yaratilgan o'quv platformasi: [dl-library.uz](https://dl-library.uz).

Barcha bo'limlar **ro'yxatdan o'tishsiz** ishlaydi. Google orqali kirish va
shaxsiy profil (progress va natijalarni saqlash) keyingi katta relizda
qo'shiladi.

## Imkoniyatlar

- **Kitoblar** — PDF kitoblar katalogi: qidiruv, kategoriya filtrlari,
  sahifalash, har bir kitob uchun QR kod va ichki o'quvchi (PDF.js).
- **Taqdimotlar** — PDF slaydlar ichki viewerda (swipe, klaviatura,
  to'liq ekran); PPT/PPTX fayllar Office viewer orqali ochiladi.
- **Videolar** — YouTube video darslar zamonaviy pleyerda.
- **Testlar** — har urinishda tasodifiy 20 ta savol, vaqt cheklovsiz
  (sarflangan vaqt hisoblanadi), javob belgilanganda darhol to'g'ri/noto'g'ri
  ko'rsatiladi, yakunda natijalar tahlili.
- **Telegram bot** — kitob, taqdimot, video va testlarni bot orqali qo'shish
  va boshqarish (owner va tayinlangan adminlar uchun).
- **Admin panel** — `/admin` sahifasida materiallarni veb orqali boshqarish.

O'qish progressi va test natijalari hozircha brauzer `localStorage`'ida
saqlanadi va keyingi relizda profilga ko'chiriladi.

## Stack

| Qatlam | Texnologiya |
|---|---|
| Frontend | Vanilla JS (ES modules), HTML, CSS |
| Backend | Cloudflare Pages Functions |
| Baza | Cloudflare D1 (SQLite) |
| Fayllar | Cloudflare R2 |
| Deploy | GitHub push → Cloudflare Pages (avtomatik) |

## Ishga tushirish (lokal)

```bash
npm install
cp .dev.vars.example .dev.vars   # qiymatlarni to'ldiring
npm run db:init:local            # yangi bo'sh baza uchun
npm run dev                      # http://localhost:8788
```

Mavjud lokal bazani v4 ga yangilash: `npm run db:v4:local`.

## Maxsus imkoniyatlar (ko'zi ojizlar uchun)

Header'dagi ♿ tugmasi orqali: shrift o'lchamini 200% gacha kattalashtirish,
yuqori kontrast (qora fon, sariq matn), kulrang rejim, harflar oralig'ini
kengaytirish, havolalarni ajratish, rasmlarni yashirish. Sozlamalar
brauzerda saqlanadi.

Sayt klaviatura bilan to'liq boshqariladi, skrinriderlar uchun ARIA
belgilari qo'yilgan va `prefers-reduced-motion` sozlamasi hurmat qilinadi.

## Qo'llanmalar

- [Kod tuzilishi — nimani qayerdan topish](./docs/KOD-TUZILISHI.md)
- [Deploy qo'llanmasi](./DEPLOY.md)
- [Telegram bot qo'llanmasi](./TELEGRAM_BOT.md)
- [Xavfsizlik](./docs/SECURITY.md)
- [Holat va qo'lda bajariladigan ishlar](./ERTALAB.md)
