# Kod tuzilishi — nimani qayerdan topish mumkin

Bu hujjat loyihaga qaytganingizda kerakli faylni tez topish uchun.
Barcha fayllar ichida o'zbekcha izohlar bor.

---

## Sayt tuzilishi (foydalanuvchi ko'radigan qism)

```
HEADER   →  logo, bo'limlar menyusi, til, ♿ maxsus imkoniyatlar, tema, kirish
MAIN
  1-bo'lim  Hero      — universitet haqida, kontaktlar, statistika
  2-bo'lim  Controls  — qidiruv va kategoriya filtrlari
  3-bo'lim  Books     — kitoblar gridi va sahifalash
  4-bo'lim  Dynamic   — taqdimot / video / test (menyudan tanlanadi)
FOOTER   →  mualliflik, maxfiylik siyosati
```

Bu tuzilma `public/index.html` da xuddi shu tartibda va shu nomlar
bilan izohlangan.

---

## Frontend (foydalanuvchi qismi) — `public/`

| Fayl | Nima qiladi |
|---|---|
| `index.html` | Sahifa skeleti: Header → Main (4 bo'lim) → Footer |
| `css/style.css` | Asosiy dizayn: ranglar, kartochkalar, tugmalar, mobil moslashuv |
| `css/accessibility.css` | **Faqat** ko'zi ojizlar uchun: panel, yuqori kontrast, kulrang rejim |
| `js/app.js` | **Bosh fayl.** Tarjimalar, kategoriyalar, bo'limlar almashuvi, kitoblar gridi |
| `js/accessibility.js` | Maxsus imkoniyatlar paneli mantiqi |
| `js/theme.js` | Yorug'/tungi rejim |
| `js/toast.js` | O'ng yuqoridan chiqadigan xabarchalar |
| `js/flipbook.js` | Kitob o'quvchi (PDF, zoom, mundarija) |
| `js/presentation-viewer.js` | Taqdimot slaydlari (PDF ichki, PPTX Office viewer) |
| `js/video-player.js` | YouTube video sahifasi |
| `js/test-runner.js` | Test rejimi: 20 savol, taymer, animatsiyalar, natija |
| `js/pdf-thumb.js` | Taqdimot muqovasini PDF dan rasmga chizish |
| `js/qr.js` | Kitoblar uchun QR kod |
| `js/neural-bg.js` | Orqa fondagi animatsiya (tezlik uchun optimallashtirilgan) |
| `js/local-progress.js` | Progressni brauzerda saqlash |
| `js/vendor/` | Tashqi kutubxonalar (PDF.js, QR) — **o'zgartirmang** |

## Admin panel — `public/admin/`

| Fayl | Nima qiladi |
|---|---|
| `index.html` | Panel skeleti: 4 ta tab (kitob, taqdimot, video, test) |
| `admin.js` | CRUD amallari, ro'yxatlar, formalar |
| `ai-assist.js` | "✨ AI bilan qo'shish" toggle va formalarni avtomatik to'ldirish |
| `admin.css` | Panel dizayni |

## Backend (server qismi) — `functions/`

| Papka / fayl | Nima qiladi |
|---|---|
| `api/_middleware.js` | **Barcha API so'rovlari shu yerdan o'tadi**: rate limit, xavfsizlik headerlari |
| `api/books/` | Kitoblar API (ro'yxat, qo'shish, tahrirlash, o'chirish) |
| `api/presentations/`, `api/videos/`, `api/tests/` | Mos material turlari API |
| `api/tests/quiz/[id].js` | Test rejimi uchun tasodifiy 20 savol |
| `api/ai/analyze.js` | Admin panel uchun AI yordamchisi |
| `api/upload.js` | Fayllarni R2 ga yuklash |
| `api/telegram.js` | Telegram bot webhook (kirish nuqtasi) |
| `files/[[path]].js` | R2 dan fayl berish (faqat ruxsat etilgan papkalar) |

### Backend yordamchi modullar — `functions/_lib/`

| Fayl | Nima qiladi |
|---|---|
| `auth.js` | Admin sessiyasi (imzolangan cookie) |
| `http.js` | Umumiy javob formatlari, kategoriyalar ro'yxati |
| `books.js` | Kitob validatsiyasi va baza amallari |
| `telegram.js` | Bot asosiy mantiqi: menyu, kitob qo'shish, adminlar |
| `telegram-core.js` | Bot uchun umumiy funksiyalar (xabar yuborish, sessiya) |
| `telegram-materials.js` | Bot orqali taqdimot, video, test qo'shish |
| `pdf.js` | PDF sahifalar sonini olish, birinchi sahifani ajratish |
| `storage.js` | R2 fayl kalitlari va yuklash |
| `test-parser.js` | `.txt` test faylini savollarga ajratish |
| `youtube.js`, `youtube-meta.js` | YouTube havolasini tekshirish va ma'lumot olish |

### AI qismi — `functions/_lib/ai/`

| Fayl | Nima qiladi |
|---|---|
| `index.js` | Kitob metadatasi uchun provayder tanlash |
| `text-json.js` | Matn asosida JSON qaytaruvchi umumiy qatlam + zaxira zanjiri |
| `content.js` | Taqdimot, video, test uchun uch tilli sarlavha va tavsif |
| `common.js` | Promptlar va javobni tozalash (xavfsizlik uchun muhim) |
| `providers/` | Har bir AI provayder uchun alohida fayl |

---

## Ma'lumotlar bazasi

- `schema.sql` — **faqat yangi, bo'sh baza uchun**
- `migrations/` — mavjud bazani bosqichma-bosqich yangilash
- Productionda har doim `migrations/` ishlatiladi

---

## Muhim eslatmalar

1. **Reliz qilishdan oldin** `npm run stamp` ishga tushiring — aks holda
   foydalanuvchilarda eski kod qolib ketadi (sabab: `docs/SECURITY.md`).
2. **`js/vendor/` papkasini qo'lda tahrirlamang** — bu tashqi kutubxonalar.
3. **AI javoblari har doim tozalanadi** (`ai/content.js` dagi `stripMarkup`) —
   bu himoyani olib tashlamang, u XSS hujumidan saqlaydi.
4. Xavfsizlik qoidalari: `docs/SECURITY.md`.
