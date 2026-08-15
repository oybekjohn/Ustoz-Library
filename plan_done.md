# DL-Library — loyiha holati va bajarilgan ishlar jurnali

> **Bu faylning 1-qismi — loyihaning HOZIRGI holati.** Yangi funksiya
> qo'shishdan oldin shu qismni o'qing: nima ishlayapti, qayerda turadi,
> nimaga tegmaslik kerak.
> 2-qism — relizlar tarixi (nima qachon qilingan).
>
> Kod qaysi faylda ekanini bilish uchun: [docs/KOD-TUZILISHI.md](./docs/KOD-TUZILISHI.md)

---

# 1-QISM: HOZIRGI HOLAT

**Tekshirilgan sana:** 2026-08-09 · **Versiya:** 7.0.1 · **Holat:** production'da ishlayapti

## 1.1. Umumiy ma'lumot

| | |
|---|---|
| Sayt | https://dl-library.uz |
| Admin panel | https://dl-library.uz/admin |
| Repo | github.com/oybekjohn/Ustoz-Library (`master` → avtomatik deploy) |
| Hosting | Cloudflare Pages + Functions |
| Baza | Cloudflare D1 (`ustoz-library-db`) |
| Fayllar | Cloudflare R2 (`ustoz-library-files`) |
| Testlar | 47 ta, 100% o'tadi (`npm test`) |
| Zaxira | Har kuni avtomatik → R2 `backups/` ([qo'llanma](./docs/ZAXIRA.md)) |

## 1.2. Bazadagi kontent (2026-08-08 holati)

| Tur | Soni | Izoh |
|---|---|---|
| Kitoblar | 158 | Barchasi faol (`archived = 0`) |
| Taqdimotlar | 3 | Hammasi nashr etilgan |
| Video darslar | 1 | Nashr etilgan |
| Testlar | 2 | Nashr etilgan, jami 38 ta savol |
| Bot adminlari | 1 | Owner'dan tashqari |

## 1.3. Sayt — nima ishlayapti

**Muhim:** sayt hozir **ro'yxatdan o'tishsiz** ishlaydi. "Google orqali kirish"
tugmasi bosilganda faqat "Bu funksiya hali mavjud emas" degan xabar chiqadi.
Progress (o'qilgan sahifa, ko'rilgan slayd, test natijalari) brauzerda
(`localStorage`, kalit: `dl_progress_v1`) saqlanadi.

| Bo'lim | Holat | Tafsilot |
|---|---|---|
| 📚 Kitoblar | ✅ | Grid 12 tadan, sahifalash, qidiruv, 10 ta kategoriya filtri (emoji bilan), har kitobda QR kod, `?book=<id>` havolasi orqali to'g'ridan-to'g'ri ochish |
| 📊 Taqdimotlar | ✅ | PDF — ichki viewer (klaviatura, swipe, to'liq ekran, progress); PPT/PPTX — Microsoft Office viewer orqali |
| 🎥 Videolar | ✅ | YouTube (nocookie) pleyer, thumbnail'li kartochkalar |
| 📝 Testlar | ✅ | Har urinishda tasodifiy 20 savol, vaqt cheklovsiz (sarflangan vaqt sanaladi), javob belgilanganda darhol to'g'ri/noto'g'ri, oxirida natija va tahlil |
| ♿ Maxsus imkoniyatlar | ✅ | Shrift 100–200%, yuqori kontrast, kulrang rejim, harflar oralig'i, havolalarni ajratish, rasmlarni yashirish |
| 🌙 Tema | ✅ | Yorug'/tungi, brauzerda saqlanadi |
| 🌐 Til | ✅ | UZ / RU / EN — butun interfeys va material metadatasi |
| 📱 Mobil | ✅ | Pastki menyu, gorizontal scroll yo'q |

## 1.4. Telegram bot — nima ishlayapti

`/start` bosilganda 6 ta tugma chiqadi:

```
📚 Kitoblar        📊 Taqdimotlar
🎥 Videolar        📝 Testlar
👤 Adminlar        ℹ️ Bot haqida
```

**Asosiy tamoyil — "yopishqoq bo'lim":** bo'lim bir marta tanlanadi, keyin
ketma-ket istagancha material yuboriladi. Boshqa bo'limga o'tish uchungina
menyuga qaytiladi.

| Bo'lim | Siz nima qilasiz | Tizim nima qiladi |
|---|---|---|
| 📚 Kitob | Kategoriya tanlaysiz → PDF yuborasiz → muqova rasmini yuborasiz | AI metadata tayyorlaydi, siz ko'rib **tasdiqlaysiz** |
| 📊 Taqdimot | Faqat faylni yuborasiz (PDF/PPT/PPTX) | Sarlavha, tavsif, kategoriya — hammasi avtomatik. 1-sahifa muqova bo'ladi. **Tasdiqlash so'ralmaydi**, darhol saytga chiqadi |
| 🎥 Video | Faqat YouTube havolasini yuborasiz | Uch tilli nom va tavsif avtomatik. Takroriy havola rad etiladi |
| 📝 Test | Savollarni yuborasiz (.txt fayl yoki oddiy matn) | Faqat mavzu nomini so'raydi, uch tilli nom va tavsifni o'zi yozadi |
| 👤 Adminlar | Telegram ID kiritasiz | Admin qo'shish/o'chirish (**faqat owner**) |
| ℹ️ Bot haqida | — | Versiya, AI provayder/model + "🔍 AI ulanishini tekshirish" tugmasi |

**Rollar:** owner (`TELEGRAM_OWNER_ID`) — hamma narsa; admin — faqat material
qo'shish. Materiallarni o'chirish/yashirish faqat owner uchun.

**Test fayl formati:**
```
Savol matni?
================
Birinchi variant
================
#To'g'ri variant
================
Uchinchi variant

+++++

Keyingi savol?
...
```
`+++++` savollarni ajratadi, `#` to'g'ri javobni belgilaydi (aynan bitta),
`====` qatorlari e'tiborga olinmaydi.

## 1.5. Admin panel — nima ishlayapti

4 ta tab: Kitoblar · Taqdimotlar · Video darslar · Testlar.

Header'da **"✨ AI bilan qo'shish"** tugmasi:
- **Yoqilgan** (standart): PDF tanlaysiz / YouTube havolasini qo'yasiz /
  mavzu nomini yozasiz → "Ma'lumotlarni tayyorlash" → formalar avtomatik
  to'ladi → siz tekshirib **Saqlash** bosasiz.
- **O'chirilgan**: AI bloklari yashiriladi, hech qanday AI so'rovi
  yuborilmaydi, hamma maydon qo'lda to'ldiriladi.

Tanlov brauzerda saqlanadi (`dl_admin_ai_enabled`).

## 1.6. AI sozlamalari

| | |
|---|---|
| Provayder | Anthropic (to'g'ridan-to'g'ri Claude API) |
| Model | `claude-haiku-4-5-20251001` |
| Zaxira | Kalit ishlamasa avtomatik OpenRouter'ga o'tadi |
| Xato bo'lsa | Oqim to'xtamaydi — nom fayl nomidan olinadi |

AI **faqat** metadata (uch tilli sarlavha, tavsif, kategoriya) uchun
ishlatiladi. Uning javobi hech qachon kod yoki so'rov sifatida
bajarilmaydi — `stripMarkup()` barcha HTML teglarini o'chiradi.

## 1.7. Ma'lumotlar bazasi jadvallari

**Faol ishlatiladi:** `books`, `presentations`, `videos`, `tests`,
`test_questions`, `test_options`, `telegram_sessions`, `telegram_admins`,
`telegram_updates`, `rate_limits`

**Bo'sh, keyingi reliz uchun turibdi** (Google profil bilan birga
ishlatiladi): `users`, `user_sessions`, `user_progress`, `test_attempts`,
`test_answers`, `test_violations`, `user_telegram_links`,
`account_link_tokens`, `telegram_webapp_sessions`

> Bu jadvallarni o'chirmang — keyingi relizda kerak bo'ladi.

## 1.8. API endpointlari

| Yo'l | Kirish | Tavsif |
|---|---|---|
| `GET /api/books` | ochiq | Faol kitoblar |
| `POST/PUT/DELETE /api/books[/:id]` | admin | Kitob CRUD |
| `GET /api/presentations` · `/videos` · `/tests` | ochiq | Nashr etilganlar |
| `POST/PUT/DELETE` shu yo'llarda | admin | Material CRUD |
| `POST /api/{tur}/:id/publish` | admin | Nashr etish/yashirish |
| `GET /api/tests/quiz/:id` | ochiq | Test uchun tasodifiy 20 savol |
| `POST /api/tests/parse` | admin | `.txt` testni tekshirish |
| `POST /api/ai/analyze` | admin | AI metadata (alohida rate limit) |
| `POST /api/upload` | admin | R2 ga fayl yuklash |
| `POST /api/auth/login` · `logout` · `GET me` | — | Admin sessiyasi |
| `POST /api/telegram` | webhook secret | Bot |
| `GET /files/*` | ochiq | R2 fayllari (faqat ruxsat etilgan papkalar) |

`/api/user-auth/google/*` — mavjud, lekin **o'chirilgan** (keyingi reliz).

## 1.9. Xavfsizlik holati

| Himoya | Holat |
|---|---|
| Rate limiting | ✅ o'qish 120/daq, yozish 30/daq, login 10/10daq, AI 20/5daq |
| Barcha yozuvchi endpointlarda auth | ✅ |
| XSS himoyasi | ✅ escape + AI javobidan teglar o'chiriladi |
| Security headerlar | ✅ CSP, HSTS, X-Frame-Options, nosniff, COOP |
| Tashqi CDN | ✅ yo'q — barcha kutubxonalar `/js/vendor/` da |
| npm zaifliklari | ✅ 0 ta |
| Xatolik xabarlari | ✅ ichki tafsilot oshkor qilinmaydi |

**Qo'lda qilinishi kerak** (Cloudflare dashboard): Bot Fight Mode,
WAF rate limiting qoidasi. Batafsil: [docs/SECURITY.md](./docs/SECURITY.md)

## 1.10. Production muhit o'zgaruvchilari

Cloudflare Pages > Settings > Environment variables da 14 ta secret:
`ADMIN_USERNAME`, `ADMIN_PASSWORD`, `SESSION_SECRET`,
`AI_METADATA_PROVIDER`, `ANTHROPIC_API_KEY`, `ANTHROPIC_METADATA_MODEL`,
`OPENROUTER_API_KEY`, `OPENROUTER_METADATA_MODEL`, `PUBLIC_SITE_URL`,
`TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`, `TELEGRAM_OWNER_ID`,
`TELEGRAM_ALLOWED_USER_IDS`, `TELEGRAM_MAX_PDF_MB`

## 1.11. ⚠️ Yangi funksiya qo'shishdan oldin bilish kerak

1. **Reliz tartibi majburiy:**
   ```
   npm test
   package.json da versiyani oshiring
   npm run stamp          ← BU QADAMNI TASHLAB KETMANG
   git push origin master
   ```
   Sabab: Cloudflare Pages fayllarni 4 soat keshlaydi va `_headers` dagi
   qisqaroq qiymatni e'tiborga olmaydi. `stamp` bo'lmasa foydalanuvchilarda
   eski va yangi kod aralashadi (avval shu muammo bo'lgan).

2. **Baza sxemasi o'zgarsa:** avval migratsiya (`migrations/` ga yangi fayl
   + `wrangler d1 execute --remote`), keyin kod push. `schema.sql` faqat
   yangi bo'sh baza uchun.

3. **GitHub Actions'dagi `CLOUDFLARE_API_TOKEN` da D1 yozish ruxsati yo'q** —
   migratsiyalar avtomatik qo'llanmaydi, qo'lda ishga tushiriladi.

4. **`js/vendor/` papkasini tahrirlamang** — tashqi kutubxonalar.

5. **AI javobini tozalash (`stripMarkup`) ni olib tashlamang** — XSS himoyasi.

6. **Fon animatsiyasida "sprite" optimizatsiyasini qayta urinmang** — sinab
   ko'rilgan va o'lchov bo'yicha gradientdan sekinroq chiqqan (sabab kodda
   izohlangan).

## 1.12. Keyingi rejadagi ishlar

- **Google orqali kirish** — backend kodi tayyor turibdi
  (`/api/user-auth/google/*`), faqat `GOOGLE_CLIENT_ID` va
  `GOOGLE_CLIENT_SECRET` kerak. Foydalanuvchi profilida test natijalari,
  o'qilgan kitoblar va slaydlar saqlanadi. Bazadagi bo'sh jadvallar shu
  uchun tayyor.
  > Eslatma: foydalanuvchining Google Cloud akkaunti express rejimda va
  > kartasi billing tekshiruvidan o'tmaydi — OAuth client uchun boshqa
  > Gmail akkaunt kerak bo'ladi.
- Telegram Mini App ichida testlarni ishlash.
- Cloudflare dashboard xavfsizlik sozlamalari (Bot Fight Mode, WAF).

---

# 2-QISM: RELIZLAR TARIXI

## v7.1.5 — Interfeys nuqsonlari (footer, yopishqoq qidiruv, kartalar), 2026-08-15

Egasi aytgan uchta nuqson tuzatildi. Faqat lokalda sinaldi.

- [x] **Footer pastda turadi** — videolar, testlar va taqdimotlar bo'limida
      kontent kam bo'lgani uchun footer sahifa o'rtasiga chiqib qolardi.
      `body` endi ustunli flex, `#main-content { flex: 1 0 auto }`,
      `.footer { flex-shrink: 0 }`. O'lchov: uchala bo'limda footer'ning
      pastki qirrasi 900px = oyna balandligi, ya'ni aynan pastda.
      ⚠️ Bunda `.navbar` ning sticky'si buzildi (flex bola bo'lib qoldi) —
      shuning uchun sticky `.site-header` ga ko'chirildi.
- [x] **Qidiruv paneli header o'rnida qotadi** — avval panel header ostiga
      yopishardi va header doim tepada turardi. Endi header yopishqoq emas:
      u oddiy kontent kabi yuqoriga chiqib ketadi, qidiruv va filtrlar
      paneli esa `position: sticky; top: 0` bilan sahifa tepasiga yetganda
      o'sha yerda qotadi. **Panelning ko'rinishi umuman o'zgarmaydi** —
      balandlik, qidiruv maydoni va filtrlar uchala holatda ham bir xil
      (1280px: 138 / 40 / 74 px). Hammasi CSS bilan, JS ishtirokisiz.

      > Birinchi urinishda men buni noto'g'ri tushunib, panelni
      > kichraytirib ichiga bo'lim tugmalarini qo'ygan edim. Egasi
      > tugmalar tepada qotib turishi kerak emasligini aytdi —
      > `.controls__logo`, `.controls__nav` va `.is-scrolled` bilan
      > bog'liq barcha kod olib tashlandi.

- [x] **Panel foni shishasimon** — avval `--bg-body` bilan to'liq bo'yalgani
      uchun bu bo'lim atrofidagi sahifadan oqroq ko'rinardi va orqadagi
      neyron animatsiyani to'sib qo'yardi. Endi yarim shaffof
      (`--bg-controls`) + `backdrop-filter: blur(14px)`. Qidiruv maydoni
      va filtr tugmalarining ranglariga tegilmadi.

      Alpha ikki qarama-qarshi talab orasida tanlangan: past bo'lsa
      animatsiya yaxshi ko'rinadi, lekin panel ostidan surilayotgan
      kartochkalar matni sizib chiqadi va kontrast tushadi.
      O'lchangan (eng yomon holat — yorqin zarracha aynan matn ortida):

      | Rejim | Alpha | Animatsiya | Qidiruv | Filtr | AA (4.5) |
      |---|---|---|---|---|---|
      | Yorug' | 0.55 | 45% | 13.48 | 6.69 | ✅ |
      | Tungi  | 0.75 | 25% | 8.27 | 4.91 | ✅ |

      Tungi rejimda alpha 0.75 dan pasaytirilmasin — 0.70 da filtr matni
      4.42 ga tushadi va AA dan o'tmaydi. `backdrop-filter` ni
      qo'llamaydigan brauzerlar uchun `@supports` bilan to'liq fon
      zaxirasi qo'yilgan.

- [x] **Qotganda faqat filtrlar qoladi** — panel tepaga yopishganda
      qidiruv maydoni yashirinadi, bo'lim filtrlari qoladi. Panel
      138 → 88px ga pasayadi (mobil: 228 → 178px).

      Qotganlikni aniqlash uchun paneldan **oldinga** balandligi 0
      bo'lgan `#controls-sentinel` qo'yilgan. Panelning o'zini o'lchab
      bo'lmaydi: yopishgach `top` doim 0 bo'lib qoladi. Sentinel
      oldinda turgani muhim — qidiruv yashirinib panel pasayganda unga
      ta'sir qilmaydi, aks holda "yashirdi → pasaydi → ko'rindi"
      tsikli hosil bo'lardi.

      `display: none` ataylab tanlandi: maydon fokus tartibidan ham
      chiqadi (tekshirildi: `offsetParent === null`), aks holda
      ko'rinmas input'ga Tab bilan tushib qolinardi. Foydalanuvchi
      qidiruvga yozayotgan bo'lsa `:focus-within` uni yo'qolishdan
      saqlaydi.

      > Dastlab `IntersectionObserver` bilan yozilgandi — u brauzer
      > panelida umuman ishga tushmadi (0 marta chaqirildi), chunki
      > kadrlar render qilinmaydi. Mavjud scroll tinglovchisiga
      > qo'shildi: qo'shimcha xarajat yo'q va o'lchab bo'ladi.
- [x] **Kitob kartasi ixchamlandi** — ichki matnlar tiqilib qolgandi va
      QR tugmasining yarmi kesilardi. Tugma matni "📱 QR yuklab olish" dan
      "📱 QR" ga qisqardi (3 tilda), ichki bo'shliqlar va shrift o'lchamlari
      kamaydi, tugmalar `flex-wrap` bilan joylashadi. Natija: karta
      626 → 545px, tugmalar to'liq sig'adi, 4 ustun saqlanib qoldi.
      Mobil (375px): karta 554px, QR tugmasi 140px, kesilish yo'q.
- [x] Gorizontal scroll yo'q (desktop ham, mobil ham), 47/47 test o'tdi.

## v7.0.1 — Zaxira tizimi va o'qish qulayligi (ustoz tavsiyalari, 1-bosqich), 2026-08-09

- [x] **Zaxira nusxa tizimi** (12-band) — avval umuman yo'q edi:
      `npm run backup` bazani eksport qiladi, ichida ma'lumot borligini
      tekshiradi va R2 ga yuklaydi; har kuni avtomatik ham ishlaydi.
      Sinovdan o'tkazildi: 517 KB, 19 jadval, 158 kitob — R2 ga yuklanib,
      qaytarib o'qildi. Qo'llanma: `docs/ZAXIRA.md`.
- [x] Zaxira fayllari `.gitignore` da va CI artifact sifatida saqlanmaydi —
      ichida Telegram ID va IP manzillar bor, repo esa ochiq.
- [x] **Matn kontrasti** (10, 11-band) — yorug' rejim tungi rejimning rangini
      ishlatib turgan ekan, natijada 3.12 kontrast (talab 4.5). Endi har bir
      rejim uchun alohida rang. O'lchov: 20/20 element o'tdi, eng pasti 5.08.
- [x] **Kitob nomlari** (1-band) — 2 qatordan keyin kesilardi. Endi kesish
      yo'q: eng kami 3 qator, kerak bo'lsa o'sadi, qatorlar tekis qoladi.
- [x] **Bo'lim nomlari** (4-band) — qalinlik 600 → 700, o'lcham kattalashdi;
      filtrlar, muallif, statistika, footer ham qalinroq.
- [x] Tavsiyalar tahlili: `tavfsiya_rejasi.md`.

> Eslatma: 2 va 3-band (ai → Sun'iy intellekt, it → IT) v5.0.0 da
> allaqachon tuzatilgan edi.

## v6.0.0 — Maxsus imkoniyatlar, Claude API va tezlik, 2026-08-08

- [x] **Ko'zi ojizlar uchun panel** (header'dagi ♿): shrift 100–200%, yuqori
      kontrast (qora fon + sariq matn), kulrang rejim, harflar oralig'i,
      havolalarni ajratish, rasmlarni yashirish, tiklash. Sozlamalar
      saqlanadi va til bilan birga o'zgaradi.
- [x] To'liq WCAG o'tishi: "asosiy kontentga o'tish" havolasi, semantik
      belgilar (header/main/section/footer), har bir ikonka tugmasiga ARIA
      nomi, klaviatura fokusi, Escape bilan yopish, `prefers-reduced-motion`.
      Audit toza: nomsiz tugma, alt matnsiz rasm, labelsiz input yo'q.
- [x] **To'g'ridan-to'g'ri Claude API** ga o'tildi (avval xato bilan
      OpenRouter tavsiya qilingan edi). Provayder zaxira zanjiri qo'shildi.
      Botga "🔍 AI ulanishini tekshirish" tugmasi qo'shildi.
- [x] **Tezlik:** fon animatsiyasi 30 kadr/sek, nuqtalar soni ekranga
      moslashadi, sahifa ko'rinmasa yoki modal ochilsa to'xtaydi. Shriftlar
      CSS `@import` (bloklovchi) o'rniga asinxron `<link>` orqali.
- [x] `index.html` Header → Main (4 bo'lim) → Footer tuzilishida qayta
      yozildi, hamma joyda o'zbekcha izohlar.
- [x] `docs/KOD-TUZILISHI.md` — har bir fayl nima qilishi jadvali.

## v5.0.0 — Claude AI avtomatizatsiyasi va xavfsizlik auditi, 2026-08-08

- [x] Kategoriya filtrlari (10 ta, emoji bilan) va animatsion statistika qatori (5 karta) tiklandi — `app.js` qayta yozilganda soddalashtirib yuborilgan edi.
- [x] Hero matni taqdimot, video va testlarni ham eslatadigan qilib yangilandi (uz/ru/en).
- [x] Claude Haiku ulandi (OpenRouter orqali `anthropic/claude-haiku-4.5`); yangi `ai/text-json.js` va `ai/content.js` modullari.
- [x] Telegram bot qayta ishlandi: asosiy menyuda bo'limlar, yopishqoq bo'lim (ketma-ket yuborish), taqdimot va video to'liq avtomatik, test faqat mavzu nomini so'raydi.
- [x] Taqdimot muqovasi 1-sahifadan olinadi (kichik PDF), kartochkada PDF.js bilan chiziladi (lazy yuklash + skelet animatsiya).
- [x] Admin panelda AI yordamchisi: animatsion toggle, yuklanish animatsiyasi, formalarni avtomatik to'ldirish; yangi `/api/ai/analyze` endpointi (alohida rate limit bilan).
- [x] Xavfsizlik auditi: admin paneldagi saqlangan XSS yopildi, autentifikatsiyasiz bazaga yozadigan o'lik endpointlar o'chirildi, PDF.js va QR kutubxonalari o'z domenga ko'chirildi (supply chain), xatolik xabarlari tozalandi, so'rov tanasi cheklandi, npm zaifliklari 6 dan 0 ga tushdi.
- [x] Asset versiyalash (`npm run stamp`) — Cloudflare Pages keshi tufayli eski va yangi kod aralashib qolishi bartaraf etildi.
- [x] 47 ta unit test 100% o'tadi (prompt injection himoyasi testlari bilan).

## v4.0.0 — Public platforma (auth'siz reliz), 2026-08-08

- [x] `app.js` dagi encoding buzilishi (mojibake) tuzatildi, fayl toza qayta yozildi (uz/ru/en i18n, hash routing).
- [x] Kitoblar gridi asl dizaynga qaytarildi: muqova, kategoriya/til badge, QR kod kartada, pagination (12 tadan), `?book=` deep link.
- [x] Google login tugmasi "Bu funksiya hali mavjud emas" toast ko'rsatadi (o'ng yuqoridan slide-in/out); OAuth backend keyingi relizgacha dormant.
- [x] Barcha bo'limlar ro'yxatdan o'tishsiz ishlaydi; progress localStorage'da (`dl_progress_v1`).
- [x] Taqdimotlar: ichki PDF.js slayd vieweri (swipe, klaviatura, fullscreen, progress); PPT/PPTX — Office embed viewer.
- [x] Videolar: zamonaviy YouTube (nocookie) pleyer sahifasi.
- [x] Testlar: tasodifiy 20 savol, vaqt cheklovsiz + sarflangan vaqt hisoblagichi, javobda darhol to'g'ri/noto'g'ri, animatsiyalar, natija ringi va tahlil; `/api/tests/quiz/:id` N+1 dan 3 so'rovga optimallashtirildi.
- [x] Telegram bot: taqdimot/video/test qo'shish va boshqarish (publish/unpublish, o'chirish) oqimlari; `telegram-core.js` ajratildi.
- [x] Xavfsizlik: API rate limiting, login brute-force himoyasi (D1), CSP/HSTS va boshqa headerlar, `/files/` allowlist, taqdimot/video PUT/DELETE'dagi ochiq auth teshigi yopildi, timing-safe login.
- [x] Migratsiya 0008 (books.archived + rate_limits) va yo'qotishsiz katalog sinxronizatsiya skripti (`catalog:sync:remote`).
- [x] Kod tozalash: schema.sql DROP olib tashlandi, eskirgan fayllar o'chirildi, README/DEPLOY/TELEGRAM_BOT/SECURITY hujjatlari yangilandi, uz-lotin matnlari tuzatildi.
- [x] 41 ta unit test 100% o'tadi.

---

## Arxiv: v3 → v4 o'tishdagi dastlabki bosqichlar (2026-08-05/06)

> Quyidagilar — kutubxonani o'quv platformasiga aylantirish paytidagi
> ish jurnali. Ba'zi qismlari (masalan, Google OAuth va test-attempts
> oqimi) keyinchalik v4/v5 da o'chirilgan yoki qayta yozilgan.
> Joriy holat uchun **1-QISM** ga qarang.

## Bosqich 0: Xavfsiz boshlash
- [x] Baseline snapshot tekshirildi: git commit `070cd9f7a81c98ba28ca50ab4b9e70a31001c9c0` (`Remove Telegram group management`).
- [x] Yangi ishchi branch yaratildi: `codex/learning-platform`.
- [x] Mavjud 23 ta unit testlar muvaffaqiyatli o'tdi (100% pass rate, 0 failure).
- [x] `plan_done.md` boshlang'ich jurnali shakllantirildi.

## Bosqich 1: Schema va Domain Helperlar
- [x] `migrations/0005_learning_platform.sql` migratsiya fayli yaratildi. 14 ta yangi jadval va barcha indekslar qo'shildi.
- [x] Lokal D1 ma'lumotlar bazasida migratsiya ishga tushirildi (`npx wrangler d1 execute ustoz-library-db --local --file=./migrations/0005_learning_platform.sql`), 42 ta SQL buyrug'i bajarildi.
- [x] `package.json` fayliga `db:learning:local` va `db:learning:remote` skriptlari qo'shildi.
- [x] Backend domain helper modullari yaratildi: `test-parser.js`, `youtube.js`, `user-auth.js`, `test-engine.js`, `telegram-auth.js`, `telegram-link.js`, `presentations.js`, `videos.js`, `progress.js`.

## Bosqich 2: Google Login va User Sessiyasi
- [x] Google OAuth API endpointlari yaratildi: `functions/api/user-auth/google/start.js`, `callback.js`, `logout.js`, `functions/api/user/me.js`.
- [x] Sessiya tokenlarini SHA-256 bilan hash qilish va `dl_user_session` cookie xavfsiz mexanizmi joriy etildi.
- [x] Client JS modullari yaratildi: `public/js/auth.js`, `public/js/theme.js`.

## Bosqich 3: Prezentatsiya CRUD va Viewer
- [x] Prezentatsiya API endpointlari yaratildi: `functions/api/presentations/index.js`, `functions/api/presentations/[id].js`.
- [x] Slayd bo'yicha prezentatsiya viewer yaratildi (`public/js/presentation-viewer.js`) va progress avtomatik yozilishi ta'minlandi.

## Bosqich 4: Video CRUD va Player
- [x] Video darslar API endpointlari yaratildi: `functions/api/videos/index.js`, `functions/api/videos/[id].js`.
- [x] YouTube player va progress tracker yaratildi (`public/js/video-player.js`).

## Bosqich 5: Test Import va Admin Boshqaruvi
- [x] TXT test parser endpoint yaratildi: `functions/api/tests/parse.js`.
- [x] Test yaratish, sozlamalar va savol/variantlarni transaction bilan yozish endpointi yaratildi: `functions/api/tests/index.js`.
- [x] Admin Panel UX (`public/admin/index.html`, `public/admin/admin.js`) 4 ta bo'lim (`Kitoblar`, `Prezentatsiyalar`, `Video darslar`, `Testlar`) bilan to'liq kengaytirildi va `.txt` import parse preview qo'shildi.

## Bosqich 6: Test Runner va Anti-Cheat Engine
- [x] Test runner API va scoring mantiqi yaratildi:
  - `functions/api/test-attempts/index.js` (Urinish boshlash, random tartib, timer, retention)
  - `functions/api/test-attempts/[id].js` (Urinish holati va to'g'ri javoblarsiz savollar)
  - `functions/api/test-attempts/[id]/answers/[questionId].js` (Javobni autosave qilish)
  - `functions/api/test-attempts/[id]/violations.js` (Anti-cheat recording va 3-ogohlantirishda auto-terminate)
  - `functions/api/test-attempts/[id]/finish.js` (Server-side scoring va idempotent submit)
  - `functions/api/test-attempts/[id]/result.js` (Natijalar tahlili va ko'rsatish)
- [x] Interactive test runner va anti-cheat mijoz komponenti yaratildi (`public/js/test-runner.js`).

## Bosqich 7: Unified User Profile va Kitob Progressi
- [x] Debounced progress yozish endpointi yaratildi: `functions/api/progress/[itemType]/[itemId].js`.
- [x] Foydalanuvchi birhushiy profili va statistikasi API endpoints yaratildi: `functions/api/profile/summary.js`, `progress.js`, `test-attempts.js`.
- [x] Birlashtirilgan profil dashboard UI yaratildi (`public/js/profile.js`).

## Bosqich 8: Telegram Account Link va Mini App Shell
- [x] Telegram bir martalik deep-link token generation va verify endpoints yaratildi: `functions/api/telegram/link-token.js`, `link/complete.js`, `link.js`.
- [x] Telegram WebApp `initData` HMAC-SHA256 validatsiyasi va sessiya berish yaratildi: `functions/api/telegram/webapp/session.js`.
- [x] Telegram Mini App UI adaptori yaratildi (`public/js/telegram-mini-app.js`).

## Bosqich 9: Telegram Bot Integratsiyasi
- [x] `functions/_lib/telegram.js` fayliga `/start link_TOKEN` orqali Telegram akkauntini Google profili bilan bir martalik deep-link orqali avtomatik bog'lash imkoniyati qo'shildi.

## Bosqich 10: Integratsiya va Testlash
- [x] UI navigatsiya, tablar (`Kitoblar`, `Taqdimotlar`, `Videolar`, `Testlar`) va profil bo'limlari `public/index.html`, `public/js/app.js` va `public/css/style.css` fayllarida to'liq birlashtirildi.
- [x] Barcha 37 ta unit testlar **100% muvaffaqiyatli** o'tdi (0 failure, 0 skipped).
