# DL-Library ta'lim platformasi: amalga oshirish rejasi

## 1. Hujjat holati

- Holat: tasdiqlash uchun loyiha rejasi, implementatsiya boshlanmagan.
- Lokal loyiha: `E:\Ustoz-Library`.
- Boshlang'ich Git commit: `070cd9f` (`Remove Telegram group management`).
- Production: Cloudflare Pages + D1 + R2, `https://dl-library.uz`.
- Reja yozilgan sana: 2026-08-05.
- Ushbu hujjat tasdiqlanmaguncha kod, D1 va production muhitiga o'zgartirish kiritilmaydi.

## 2. Maqsad

Mavjud elektron kutubxonani quyidagi imkoniyatlarga ega ta'lim platformasiga aylantirish:

1. PDF kitoblarni o'qish va o'qish progressini saqlash.
2. PDF prezentatsiyalarni slayd ko'rinishida o'qish va progressni saqlash.
3. Admin yuklagan matn formatidan test yaratish va foydalanuvchiga vaqtli test ishlatish.
4. YouTube video darslarni sayt ichida ko'rsatish va ko'rish progressini saqlash.
5. Google akkaunti orqali kirish va shaxsiy profil ochish.
6. Profil orqali o'qilgan kitoblar, slaydlar, videolar va test natijalarini ko'rish.
7. Testlarni asosiy sayt bilan bir xil engine asosida Telegram Mini App ichida ham ishlash.
8. Ownerga Telegram bot orqali kitob, prezentatsiya, test va video materiallarini boshqarish imkonini berish.

## 3. Mavjud tizimni saqlash talablari

- Mavjud 151 ta production kitob va ularning R2 fayllari saqlanishi shart.
- Mavjud kitob CRUD, admin login va Telegram orqali kitob yuklash ishlashda davom etishi shart.
- `books` jadvali buzilmasligi va qayta yaratilmasligi kerak.
- Yangi migratsiyalar faqat qo'shuvchi yoki orqaga mos bo'lishi kerak.
- Productionda `npm run db:init:remote` ishlatilmasin: joriy `schema.sql` ichida `DROP TABLE IF EXISTS books` bor.
- Yangi production migratsiyasi alohida, masalan `migrations/0005_learning_platform.sql` bo'ladi.
- Admin autentifikatsiyasi va foydalanuvchi Google autentifikatsiyasi bir-biridan ajratiladi.

## 4. Tasdiqlangan mahsulot qarorlari

### 4.1. Prezentatsiya

- Admin prezentatsiyani PDF formatida yuklaydi.
- PDFning har bir sahifasi bitta slayd hisoblanadi.
- Sahifalar soni AI ishlatmasdan PDF kutubxonasi orqali olinadi.
- Foydalanuvchi slaydlarni oldinga/orqaga o'tkazadi, fullscreen va zoom ishlatadi.
- Oxirgi ko'rilgan slayd va ko'rilgan slaydlar foizi profilga saqlanadi.

### 4.2. Test import formati

Admin UTF-8 kodirovkadagi `.txt` fayl yuklaydi. Format:

```text
Savol matni?
================
Birinchi variant
================
Ikkinchi variant
================
#To'g'ri variant
================
To'rtinchi variant

+++++

Keyingi savol?
================
...
```

Parser qoidalari:

1. Faqat `+` belgilaridan iborat, kamida 5 belgili qator savollarni ajratadi.
2. Faqat `=` belgilaridan iborat qatorlar vizual separator bo'lib, parser tomonidan tashlanadi.
3. Har blokdagi birinchi bo'sh bo'lmagan matn savol hisoblanadi.
4. Keyingi bo'sh bo'lmagan matnlar javob variantlari hisoblanadi.
5. Birinchi ko'rinadigan belgisi `#` bo'lgan variant to'g'ri javob hisoblanadi.
6. Saqlashda `#` belgisi variant matnidan olib tashlanadi.
7. Har savolda kamida 2 ta variant va aynan 1 ta to'g'ri javob bo'lishi shart.
8. Noto'g'ri blok topilsa import to'xtaydi va savol raqami hamda xato sababi ko'rsatiladi.
9. Apostrof, o'zbek lotin/kirill, rus va ingliz matnlari UTF-8 holida saqlanadi.
10. V1 da bir nechta to'g'ri javobli savol qo'llab-quvvatlanmaydi.

Admin importdan keyin testni saqlashdan oldin preview ko'radi:

- savollar soni;
- har bir savol va variantlar;
- to'g'ri javob belgilanishi;
- parser ogohlantirishlari.

### 4.3. Test oynasini almashtirish

- Test boshlanishida fullscreen so'raladi.
- Birinchi qoidabuzarlikda ogohlantirish beriladi.
- Ikkinchi qoidabuzarlikda oxirgi ogohlantirish beriladi.
- Uchinchi qoidabuzarlikda test avtomatik yakunlanadi.
- `visibilitychange`, `window.blur` va `fullscreenchange` bitta hodisa uchun takroriy sanalmasligi kerak; 1-1.5 soniyalik deduplikatsiya qo'llanadi.
- Qoidabuzarliklar soni va vaqti serverda saqlanadi.

Muhim cheklov: oddiy veb-brauzer operatsion tizim yoki boshqa telefon yordamida olingan skrinshotni 100% bloklay olmaydi. Sayt faqat nusxalashni cheklaydi, fullscreen nazorat qiladi, watermark ko'rsatadi va oynadan chiqishni qayd etadi.

### 4.4. Asosiy sayt navigatsiyasi

- DL-Libraryning asosiy va tavsiya etiladigan foydalanish muhiti `https://dl-library.uz` sayti bo'ladi.
- Public saytning default bo'limi `Kitoblar` bo'ladi; mavjud kitob katalogi birinchi ochilishda saqlanadi.
- Desktop header tarkibi: sayt logosi va `DL-Library` nomi, `Kitoblar`, `Taqdimotlar`, `Videolar`, `Testlar`, til, tema va profil/login boshqaruvi.
- Aktiv bo'lim vizual ajratiladi va sahifa yangilanganda joriy route saqlanadi.
- Header sticky bo'lishi mumkin, lekin kontent balandligini ortiqcha egallamasligi va viewer fullscreen rejimiga xalaqit bermasligi kerak.
- Public navigatsiyada admin panel ko'rsatilmaydi; admin panel avvalgidek alohida `/admin` orqali ochiladi.
- Saytdagi UI matnlari `uz`, `ru`, `en` tillarida bo'ladi. Material metadata tanlangan tilga mos ustundan olinadi.
- Til tanlovi anonymous user uchun local storage/cookie, login user uchun profil `locale` qiymati bilan eslab qolinadi.
- Tema `light`, `dark` va zarur bo'lsa `system` qiymatlaridan foydalanadi; tanlov anonymous user uchun lokal, login user uchun profilga bog'lanishi mumkin.
- Tema almashganda sahifa qayta yuklanmaydi va ranglar miltillamasligi uchun boshlang'ich tema HTML renderidan oldin aniqlanadi.
- Profil holati: anonymous userga ixcham `Google orqali kirish`, login userga avatar yoki profil iconi va profil menyusi ko'rsatiladi.

Responsive tartib:

- desktopda logo chapda, asosiy bo'limlar markazda, til/tema/profil o'ngda joylashadi;
- tor desktop va planshetda nav qisqaradi, lekin asosiy to'rtta bo'lim yashirinib qolmaydi yoki bitta tushunarli menyuga o'tadi;
- mobileda yuqori panelda logo, til, tema va profil qoladi;
- mobileda `Kitoblar`, `Taqdimotlar`, `Videolar`, `Testlar` pastki bar yoki ixcham menyuda beriladi;
- pastki navigatsiya viewer/testning asosiy boshqaruvlarini yopmaydi va fullscreen rejimida yashiriladi;
- barcha header matnlari uchala tilda sig'ishi, overlap va layout shift bo'lmasligi tekshiriladi.

### 4.5. Telegram Mini App mahsulot qarori

- Telegram Mini App qo'shimcha qulaylik, saytning o'rnini bosuvchi asosiy platforma emas.
- Saytda Mini App haqida katta banner, takroriy modal, majburiy taklif yoki har sahifada reklama ko'rsatilmaydi.
- `Telegramda ishlash` imkoniyati faqat test kartasi/detailidagi kichik ikkilamchi action, test start ekranidagi bir qator eslatma yoki profil sozlamalaridagi akkaunt bog'lash qismida ko'rsatiladi.
- Vizual ustuvorlikda saytdagi `Testni boshlash` primary, `Telegramda ishlash` secondary yoki text-link ko'rinishida bo'ladi.
- Foydalanuvchi Telegram variantini yopsa yoki e'tiborsiz qoldirsa, sayt ishlashiga hech qanday to'siq bo'lmaydi.
- Telegram bot orqali test tanlanganda Telegram ichidagi Mini App ochiladi va mavjud web test runnerning mobilga mos komponentlaridan foydalanadi.
- Savollarni ketma-ket oddiy bot xabarlari va inline keyboard orqali ishlash V1 ga kirmaydi; bu timer, anti-cheat va umumiy test engine takrorlanishini oldini oladi.
- Mini Appda Telegramning o'z headeri borligi sabab saytning to'liq desktop headeri takrorlanmaydi. Ichki ko'rinishda ixcham title/back, til va profil holati yetarli.
- Mini App sayt bilan bir xil test API, scoring, attempt, timer va natija modelidan foydalanadi.
- Mini App ishlamasa yoki Telegram tashqi browserga yo'naltirsa, foydalanuvchi testning sayt URLini ochib davom eta olishi kerak.

## 5. Rollar va ruxsatlar

### 5.1. Sayt foydalanuvchisi

- Google orqali kiradi.
- O'z profilini ko'radi.
- Kitob, prezentatsiya va video progressini saqlaydi.
- Test boshlaydi va faqat o'z urinishlarini ko'radi.
- Boshqa foydalanuvchining progressi yoki javoblarini ko'ra olmaydi.

### 5.2. Anonymous foydalanuvchi

- Ro'yxatdan o'tmasdan saytning barcha public imkoniyatlaridan to'liq foydalanadi.
- Kitob o'qiydi, prezentatsiya ko'radi, video ko'radi va test ishlaydi.
- Test natijasini finishdan keyin joriy oynada ko'radi.
- Faoliyat tarixi, progress va test natijasi profilga saqlanmaydi.
- Keyin Google orqali kirsa, oldingi anonymous faoliyat avtomatik ravishda profilga ko'chirilmaydi.
- Prezentatsiya, video yoki test ochilganda natijalar saqlanmasligi haqida sariq ogohlantirish ko'radi.

### 5.3. Admin

- Mavjud admin login/parol orqali `/admin`ga kiradi.
- Kitoblarni boshqarishda davom etadi.
- Prezentatsiyalarni CRUD qiladi.
- Video darslarni CRUD qiladi.
- Testlarni import, preview, tahrir, publish/unpublish va delete qiladi.
- Test natijalarining umumiy ro'yxatini ko'rishi keyingi bosqichda qo'shiladi.

### 5.4. Owner Telegram admini

- Mavjud Telegram kitob boshqaruvi o'zgarmaydi.
- Owner Telegram ID Cloudflare secret/config orqali yagona yuqori huquqli boshqaruvchi sifatida belgilanadi.
- Owner kitob, taqdimot, test va videolarni bot orqali to'liq CRUD qiladi: yaratish, ro'yxat/qidirish, ko'rish, tahrirlash, publish/unpublish va o'chirish.
- Faqat owner `Adminlar` bo'limini ko'radi hamda DL-Library adminlarini qo'shadi, ro'yxatini ko'radi va o'chiradi.
- Ownerni bot ichidan o'chirish yoki uning rolini pasaytirish mumkin emas.
- Bot menyusidagi `Materiallarni boshqarish` orqali `Kitoblar`, `Taqdimotlar`, `Videolar`, `Testlar` turini tanlaydi.
- Prezentatsiya PDF, test TXT yoki matn, video YouTube link orqali yuboriladi.
- Har bir material D1/R2 ga yozilishidan oldin preview va `Tasdiqlayman`, `Tahrirlayman`, `Bekor qilaman` oqimidan o'tadi.
- Botdagi admin huquqi public user yoki Google profil huquqiga avtomatik tenglashtirilmaydi.

### 5.5. Oddiy DL-Library Telegram admini

- Owner qo'shgan `library` roldagi admin bot orqali yangi kitob, taqdimot, test va video joylay oladi.
- Oddiy admin boshqalarning materiallar ro'yxatini, mavjud kitoblarni yoki `Adminlar` bo'limini ko'rmaydi.
- Oddiy admin mavjud materialni tahrirlay, publish/unpublish qila yoki o'chira olmaydi.
- Oddiy admin yaratgan material ham preview va tasdiqlash oqimidan o'tadi; huquq bekor qilinsa keyingi callback yoki xabar darhol rad etiladi.
- Zarur bo'lsa kelajakda material turi bo'yicha alohida permission qo'shiladi, lekin V1 da bitta `library` roli barcha to'rt turdagi yangi materialni joylaydi.

### 5.6. Telegram foydalanuvchisi

- Telegram foydalanuvchisi bot tomonidan doimiy `telegram_user_id` orqali aniqlanadi.
- U Google profilini bir martalik xavfsiz link bilan bog'lashi yoki anonim davom etishi mumkin.
- Bog'langan userning Mini App test natijasi, statistikasi va progressi saytdagi o'sha `users.id` profiliga yoziladi.
- Bog'lanmagan user testni anonim ishlaydi; natija joriy Mini App sessiyasida ko'rsatiladi, profil tarixiga yozilmaydi.
- Bot hech qachon foydalanuvchidan doimiy ichki profil ID, Google ID yoki parolni qo'lda yozishni so'ramaydi.

## 6. Tasdiqlangan access qarori

- Saytga kirish va barcha public materiallardan foydalanish uchun ro'yxatdan o'tish majburiy emas.
- Anonymous foydalanuvchi kitob, prezentatsiya, video va testdan to'liq foydalanadi.
- Google login faqat faoliyat tarixini, progressni va test natijalarini uzoq muddat saqlash uchun kerak.
- Profil faqat Google orqali kirgan foydalanuvchiga ochiladi.
- Anonymous foydalanuvchi testni tugatgach natijani darhol ko'radi, lekin natija profil tarixiga yozilmaydi.
- Anonymous testning serverdagi texnik attempt ma'lumoti scoring va anti-cheat uchun vaqtincha saqlanib, retention muddati tugagach avtomatik o'chiriladi.
- Login qilish kontentni ochish uchun to'siq bo'lmasligi kerak.
- Telegram Mini Appdan foydalanish ham majburiy emas va saytning asosiy oqimida chalg'ituvchi darajada tavsiya qilinmaydi.
- Telegram akkaunti Google profiliga ulanmagan holatda Mini App anonymous qoidalari bilan ishlaydi.

## 7. Yuqori darajali arxitektura

```text
Browser
  |- Public katalog va viewerlar
  |- Google login
  |- Profil
  |- Test runner
  |- Admin panel
  |
Cloudflare Pages Functions
  |- Public content API
  |- Admin CRUD API
  |- Google OAuth callback
  |- Progress API
  |- Test attempt engine
  |
  +--> D1: metadata, users, progress, attempts, answers
  +--> R2: kitob PDF, prezentatsiya PDF, cover fayllari
  +--> Google OAuth
  +--> YouTube IFrame Player API (browser tomonda)

Telegram bot
  |- Material boshqaruvi (owner/admin)
  |- Test katalogi va profil statistikasi
  |- Mini App deep-link ochish
  |
Telegram Mini App
  |- Ixcham test katalogi va test runner
  |- Telegram initData orqali sessiya
  |- Saytdagi umumiy API va test engine
  |
Cloudflare Pages Functions
  |- Telegram webhook
  |- Mini App auth va account-link endpointlari
  +--> mavjud D1/R2 va learning platform modullari
```

Arxitektura modular monolit bo'lib qoladi. Bot webhooki, sayt va Mini App bir xil Cloudflare backend hamda domain helperlardan foydalanadi; yangi mikroservis yoki alohida server kiritilmaydi.

## 8. D1 ma'lumotlar modeli

Quyidagi jadvallar yangi migratsiya orqali qo'shiladi. Nomlar implementatsiya paytida kod uslubiga mos aniqlashtirilishi mumkin.

### 8.1. `users`

- `id INTEGER PRIMARY KEY AUTOINCREMENT`
- `google_sub TEXT NOT NULL UNIQUE`
- `email TEXT NOT NULL UNIQUE`
- `display_name TEXT NOT NULL`
- `avatar_url TEXT`
- `locale TEXT`
- `created_at TEXT NOT NULL`
- `last_login_at TEXT NOT NULL`

Indekslar: `email`, `google_sub`.

### 8.2. `user_sessions`

- `token_hash TEXT PRIMARY KEY`
- `user_id INTEGER NOT NULL`
- `expires_at TEXT NOT NULL`
- `created_at TEXT NOT NULL`
- `last_seen_at TEXT`
- `user_agent TEXT`

Sessiya tokenining o'zi D1 ga yozilmaydi, faqat SHA-256 hash saqlanadi. Cookie `HttpOnly`, `Secure`, `SameSite=Lax` bo'ladi.

### 8.3. `presentations`

- `id INTEGER PRIMARY KEY AUTOINCREMENT`
- `title_uz`, `title_ru`, `title_en`
- `description_uz`, `description_ru`, `description_en`
- `category TEXT NOT NULL`
- `language TEXT NOT NULL`
- `page_count INTEGER NOT NULL`
- `pdf_key TEXT NOT NULL`
- `cover_key TEXT`
- `published INTEGER NOT NULL DEFAULT 0`
- `created_at`, `updated_at`

Indekslar: `category`, `published`, `created_at`.

### 8.4. `videos`

- `id INTEGER PRIMARY KEY AUTOINCREMENT`
- `title_uz`, `title_ru`, `title_en`
- `description_uz`, `description_ru`, `description_en`
- `category TEXT NOT NULL`
- `language TEXT NOT NULL`
- `youtube_url TEXT NOT NULL`
- `youtube_video_id TEXT NOT NULL`
- `cover_key TEXT`
- `duration_seconds INTEGER`
- `published INTEGER NOT NULL DEFAULT 0`
- `created_at`, `updated_at`

Server YouTube URL dan video ID ni ajratib validatsiya qiladi. `youtube.com/watch`, `youtu.be`, `youtube.com/embed` formatlari qo'llanadi.

### 8.5. `tests`

- `id INTEGER PRIMARY KEY AUTOINCREMENT`
- `title_uz`, `title_ru`, `title_en`
- `description_uz`, `description_ru`, `description_en`
- `category TEXT NOT NULL`
- `language TEXT NOT NULL`
- `duration_minutes INTEGER NOT NULL`
- `passing_percent INTEGER NOT NULL DEFAULT 60`
- `max_attempts INTEGER` (`NULL` cheksiz)
- `shuffle_questions INTEGER NOT NULL DEFAULT 1`
- `shuffle_options INTEGER NOT NULL DEFAULT 1`
- `violation_limit INTEGER NOT NULL DEFAULT 3`
- `show_answers_after_finish INTEGER NOT NULL DEFAULT 1`
- `published INTEGER NOT NULL DEFAULT 0`
- `created_at`, `updated_at`

### 8.6. `test_questions`

- `id INTEGER PRIMARY KEY AUTOINCREMENT`
- `test_id INTEGER NOT NULL`
- `position INTEGER NOT NULL`
- `question_text TEXT NOT NULL`
- `created_at TEXT NOT NULL`

Indeks va constraint: `(test_id, position)` unique.

### 8.7. `test_options`

- `id INTEGER PRIMARY KEY AUTOINCREMENT`
- `question_id INTEGER NOT NULL`
- `position INTEGER NOT NULL`
- `option_text TEXT NOT NULL`
- `is_correct INTEGER NOT NULL DEFAULT 0`

Public test API `is_correct` maydonini finishdan oldin hech qachon qaytarmaydi.

### 8.8. `test_attempts`

- `id INTEGER PRIMARY KEY AUTOINCREMENT`
- `test_id INTEGER NOT NULL`
- `user_id INTEGER` (Google user uchun; anonymous attemptda `NULL`)
- `anonymous_token_hash TEXT` (faqat anonymous attempt uchun)
- `channel TEXT NOT NULL DEFAULT 'web'`: `web` yoki `telegram_mini_app`
- `status TEXT NOT NULL`: `in_progress`, `submitted`, `expired`, `terminated`
- `started_at TEXT NOT NULL`
- `expires_at TEXT NOT NULL`
- `submitted_at TEXT`
- `correct_count INTEGER`
- `total_count INTEGER`
- `score_percent REAL`
- `passed INTEGER`
- `violation_count INTEGER NOT NULL DEFAULT 0`
- `finish_reason TEXT`
- `question_order_json TEXT NOT NULL`
- `option_order_json TEXT NOT NULL`
- `retention_until TEXT` (anonymous attemptni avtomatik tozalash vaqti)

Constraint: `user_id` yoki `anonymous_token_hash`dan aynan bittasi mavjud bo'lishi kerak.

Indekslar: `(user_id, started_at)`, `anonymous_token_hash`, `(test_id, status)`, `expires_at`, `retention_until`.

Anonymous attempt qoidalari:

- xavfsiz random token browserning `HttpOnly` cookie yoki server bergan opaque tokeni bilan bog'lanadi;
- tokenning faqat SHA-256 hash qiymati D1 da saqlanadi;
- natija profilga yoki `user_progress`ga yozilmaydi;
- result faqat shu anonymous browser sessiyasiga ko'rsatiladi;
- attempt va answers tavsiya etilgan 24 soatlik retentiondan keyin cleanup qilinadi;
- login qilganda anonymous attempt user akkauntiga avtomatik ko'chirilmaydi.

### 8.9. `test_answers`

- `attempt_id INTEGER NOT NULL`
- `question_id INTEGER NOT NULL`
- `selected_option_id INTEGER`
- `is_correct INTEGER`
- `answered_at TEXT`
- primary key: `(attempt_id, question_id)`

`is_correct` server finish qilganda hisoblanadi. Client yuborgan ballga ishonilmaydi.

Anonymous `test_answers` yozuvlari ham parent attempt bilan birga retention cleanup orqali o'chiriladi.

### 8.10. `test_violations`

- `id INTEGER PRIMARY KEY AUTOINCREMENT`
- `attempt_id INTEGER NOT NULL`
- `event_type TEXT NOT NULL`
- `occurred_at TEXT NOT NULL`
- `client_context_json TEXT`

### 8.11. `user_progress`

- `user_id INTEGER NOT NULL`
- `item_type TEXT NOT NULL`: `book`, `presentation`, `video`
- `item_id INTEGER NOT NULL`
- `progress_percent REAL NOT NULL DEFAULT 0`
- `position_value REAL NOT NULL DEFAULT 0`
- `completed INTEGER NOT NULL DEFAULT 0`
- `started_at TEXT NOT NULL`
- `last_opened_at TEXT NOT NULL`
- `completed_at TEXT`
- primary key: `(user_id, item_type, item_id)`

`position_value` ma'nosi:

- book: oxirgi sahifa;
- presentation: oxirgi slayd;
- video: oxirgi soniya.

Completion mezoni V1:

- kitob/prezentatsiya: sahifalarning kamida 80 foizi ko'rilgan;
- video: davomiylikning kamida 80 foizi ko'rilgan;
- test: finish qilingan, natija alohida `test_attempts`da saqlanadi.

### 8.12. `user_telegram_links`

- `telegram_user_id TEXT PRIMARY KEY`
- `user_id INTEGER NOT NULL UNIQUE`
- `telegram_username TEXT`
- `telegram_first_name TEXT`
- `telegram_last_name TEXT`
- `linked_at TEXT NOT NULL`
- `last_seen_at TEXT`
- `revoked_at TEXT`

Qoidalar:

- bitta aktiv Telegram akkaunti faqat bitta Google profiliga bog'lanadi;
- bitta Google profiliga V1 da faqat bitta aktiv Telegram akkaunti bog'lanadi;
- Telegram username identifikator emas, faqat ko'rsatish uchun metadata;
- asosiy tashqi identifikator o'zgarmaydigan `telegram_user_id` bo'ladi;
- unlink qilinganda tarix o'chmaydi, faqat Telegram orqali profilga kirish bekor qilinadi.

### 8.13. `account_link_tokens`

- `token_hash TEXT PRIMARY KEY`
- `user_id INTEGER NOT NULL`
- `purpose TEXT NOT NULL DEFAULT 'telegram_link'`
- `expires_at TEXT NOT NULL`
- `used_at TEXT`
- `created_at TEXT NOT NULL`

Token qoidalari:

- kriptografik random, qisqa muddatli va bir martalik bo'ladi;
- tavsiya etilgan amal qilish muddati 5-10 daqiqa;
- D1 ga tokenning o'zi emas, SHA-256 hash yoziladi;
- Telegram deep-link parametriga sig'adigan base64url format ishlatiladi;
- muvaffaqiyatli ulanishdan keyin token qayta ishlatilmaydi;
- token boshqa user yoki boshqa Telegram akkauntiga ko'chirilsa server uni rad etadi.

### 8.14. `telegram_webapp_sessions`

- `token_hash TEXT PRIMARY KEY`
- `telegram_user_id TEXT NOT NULL`
- `user_id INTEGER` (akkaunt bog'langan bo'lsa)
- `expires_at TEXT NOT NULL`
- `created_at TEXT NOT NULL`
- `last_seen_at TEXT`

Mini App har API so'rovida xom Telegram ma'lumotini ishonchli deb qabul qilmaydi. Backend Telegram `initData` imzosini tekshiradi, so'ng qisqa muddatli server sessiyasi beradi. Sessiya muddati tugagach qayta autentifikatsiya qilinadi.

Indekslar: `telegram_user_id`, `user_id`, `expires_at`.

### 8.15. Mavjud `telegram_sessions`ni kengaytirish

Bot kitob oqimi uchun D1 da mavjud `telegram_sessions` state machine ishlatiladi. Yangi alohida in-memory state yoki ikkinchi raqobat qiluvchi draft jadvali yaratilmaydi. Additive migratsiya orqali zarur maydonlar qo'shiladi:

- `material_type TEXT`: `book`, `presentation`, `test`, `video`;
- mavjud `pending_metadata TEXT` turga mos validatsiyalangan JSON metadata/settings uchun umumlashtiriladi;
- mavjud `pending_pdf_key TEXT` kitob va taqdimotning vaqtinchalik PDF fayli uchun qayta ishlatiladi;
- `pending_source_key TEXT`: vaqtinchalik TXT R2 keyi yoki YouTube kabi manba identifikatori;
- `pending_cover_key TEXT` mavjud maydonidan cover uchun qayta foydalanish;
- `updated_at TEXT` va kerak bo'lsa `expires_at TEXT` cleanup uchun;
- testning bir nechta text xabarini yig'ish uchun payload ichida limitlangan buffer yoki alohida vaqtinchalik R2 text object.

State nomlari material bilan aniq prefiks qilinadi, masalan `presentation_awaiting_pdf`, `test_awaiting_source`, `video_awaiting_url`, `material_awaiting_confirm`. Eski kitob state nomlari migratsiyada buzilmaydi. Worker qayta ishga tushsa ham owner oqimni davom ettira oladi; muddati o'tgan draft va vaqtinchalik R2 fayllari cleanup qilinadi.

### 8.16. Mavjud `telegram_admins`ni kengaytirish

Productiondagi mavjud adminlar saqlanadi. Jadval drop/recreate qilinmaydi; additive migratsiya zarur metadata va kelajakdagi permission uchun quyidagilarni qo'shishi mumkin:

- `last_name TEXT`;
- `role TEXT NOT NULL DEFAULT 'library'`;
- `updated_at TEXT`;

Owner D1 jadvalidagi oddiy record bilan belgilanmaydi; uning IDsi xavfsiz Cloudflare konfiguratsiyasidan olinadi. Mavjud barcha `telegram_admins` qatorlari `library` rolida qoladi. Admin listda username bo'lmasa first/last name va Telegram ID ko'rsatiladi. Role tekshiruvi faqat tugmani yashirishga emas, har bir callback va message handlerga server tomonda qo'llanadi.

## 9. Google OAuth

### 9.1. Kerakli Cloudflare secretlar

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI=https://dl-library.uz/api/user-auth/google/callback`
- `USER_SESSION_SECRET`
- `TELEGRAM_BOT_TOKEN` (mavjud secret, kodga yozilmaydi)
- `TELEGRAM_WEBAPP_URL`
- `TELEGRAM_WEBAPP_SESSION_SECRET`
- `YOUTUBE_API_KEY` (bot orqali video metadata olish uchun)
- AI metadata provider keylari faqat tanlangan providerga mos Cloudflare secret sifatida saqlanadi.

### 9.2. Endpointlar

- `GET /api/user-auth/google/start`
- `GET /api/user-auth/google/callback`
- `POST /api/user-auth/logout`
- `GET /api/user/me`

### 9.3. Xavfsizlik

- OAuth `state` qiymati majburiy va bir martalik bo'ladi.
- Redirect faqat oldindan ruxsat berilgan lokal pathga bo'ladi; tashqi open redirect taqiqlanadi.
- Google `sub` foydalanuvchining asosiy tashqi identifikatori bo'ladi.
- Email o'zgarsa ham akkaunt `google_sub` orqali topiladi.
- Admin cookie nomi bilan user cookie nomi bir xil bo'lmasligi kerak.
- Mavjud admin cookie `session`; yangi user cookie masalan `dl_user_session` bo'ladi.
- Logout faqat user cookie ni o'chiradi, admin sessiyasiga tegmaydi.

### 9.4. Google profilini Telegramga bog'lash

Tavsiya etilgan oqim:

1. Login user profil sahifasida `Telegram akkauntini ulash`ni bosadi.
2. Backend 5-10 daqiqalik bir martalik token yaratadi.
3. Sayt `https://t.me/dl_library_robot?start=link_TOKEN` deep-linkini ochadi.
4. Bot Telegram `from.id` va tokenni backendda tekshirtiradi.
5. Tasdiqdan keyin `telegram_user_id` joriy `users.id` bilan bog'lanadi va token bekor qilinadi.
6. Sayt profilida bog'langan Telegram username/ismi va `Uzish` actioni ko'rsatiladi.

Botdan boshlangan alternativ oqimda `Profilni ulash` tugmasi saytning login talab qiluvchi account-link sahifasini ochadi. Google login tugagach xuddi shu bir martalik token orqali bog'lanadi. Foydalanuvchidan ID ni qo'lda kiritish talab qilinmaydi.

## 10. API rejasi

### 10.1. Prezentatsiyalar

- `GET /api/presentations` - faqat published ro'yxat.
- `GET /api/presentations/:id` - public detail.
- `POST /api/presentations` - admin create.
- `PUT /api/presentations/:id` - admin update.
- `DELETE /api/presentations/:id` - admin delete va R2 cleanup.
- `POST /api/upload` - `presentation` PDF va `presentation-cover` turlarini qabul qilishga kengaytiriladi.

### 10.2. Videolar

- `GET /api/videos`
- `GET /api/videos/:id`
- `POST /api/videos` - admin.
- `PUT /api/videos/:id` - admin.
- `DELETE /api/videos/:id` - admin.

### 10.3. Test admin API

- `POST /api/tests/parse` - admin `.txt` import, faqat preview; D1 ga yozmaydi.
- `POST /api/tests` - admin validatsiyadan o'tgan test va savollarni transaction/batch bilan saqlaydi.
- `GET /api/tests/admin` - admin published va draft testlar.
- `PUT /api/tests/:id` - metadata/settings update.
- `DELETE /api/tests/:id` - test va savollarni delete.
- `POST /api/tests/:id/publish` - publish/unpublish.

Parse endpoint limitlari:

- faqat `.txt` va `text/plain`;
- UTF-8;
- tavsiya etilgan maksimum 2 MB;
- maksimum 1000 savol;
- maksimum 10 variant/savol;
- savol va variant uzunliklari serverda cheklanadi.

### 10.4. Test runner API

- `GET /api/tests` - published testlar, javoblarsiz.
- `GET /api/tests/:id` - metadata va settings, javoblarsiz.
- `POST /api/tests/:id/attempts` - yangi attempt boshlash.
- `GET /api/test-attempts/:id` - o'z attemptini tiklash.
- `PUT /api/test-attempts/:id/answers/:questionId` - javobni autosave qilish.
- `POST /api/test-attempts/:id/violations` - qoidabuzarlikni saqlash.
- `POST /api/test-attempts/:id/finish` - server-side finish va natija.
- `GET /api/test-attempts/:id/result` - faqat finished attempt natijasi.

Har endpoint attempt egasini serverda tekshiradi:

- login user uchun `user_id` va user session;
- anonymous user uchun xavfsiz anonymous attempt tokeni.

Anonymous finish natijasi profil API lariga kiritilmaydi va retentiondan keyin o'chiriladi.

### 10.5. Progress va profil

- `PUT /api/progress/:itemType/:itemId` - debounced progress update.
- `GET /api/profile/summary`
- `GET /api/profile/progress?type=book|presentation|video`
- `GET /api/profile/test-attempts`

Progress qiymati kamaytirilmaydi, lekin oxirgi position yangilanadi. Server item mavjudligini tekshiradi.

### 10.6. Telegram Mini App va account-link API

- `POST /api/telegram/webapp/session` - Telegram `initData`ni tekshiradi va qisqa server sessiyasi beradi.
- `POST /api/telegram/link-token` - login user uchun bir martalik deep-link tokeni yaratadi.
- `POST /api/telegram/link/complete` - bot tomonidan Telegram ID bilan ulashni yakunlaydi.
- `DELETE /api/telegram/link` - login userning Telegram bog'lanishini bekor qiladi.
- `GET /api/telegram/me` - Mini App uchun Telegram va bog'langan profil holati.
- `GET /api/telegram/profile/summary` - faqat bog'langan user uchun sayt profilidagi umumiy statistika.
- `POST /api/telegram/test-link/:testId` - saytdan ma'lum testni Mini Appda ochish uchun qisqa signed/deep-link tokeni.

Xavfsizlik talablari:

- `Telegram.WebApp.initDataUnsafe` qiymatiga autentifikatsiya sifatida ishonilmaydi;
- backend xom `initData`ning hash/signature va `auth_date` qiymatini bot tokeni asosida tekshiradi;
- eski yoki replay qilingan `initData` rad etiladi;
- Telegram bot tokeni, account-link tokeni yoki Mini App sessiyasi URL loglarida ochiq qolmasligi kerak;
- Mini App API userning bog'langan `user_id` qiymatini clientdan qabul qilmaydi, uni server sessiyasidan oladi;
- testning correct answerlari Mini Appga ham finishdan oldin yuborilmaydi.

### 10.7. Telegram bot orqali material boshqaruvi

Bot umumiy admin CRUD endpointlarini to'g'ridan-to'g'ri public credential bilan chaqirmaydi. Telegram admin ID serverda tekshiriladi va bot uchun ajratilgan ichki service/helper qatlamidan foydalaniladi.

#### 10.7.1. Tugmalar va navigatsiya tamoyili

- Botning doim ko'rinadigan bosh menyusi Telegram `ReplyKeyboardMarkup` oddiy tugmalari bilan quriladi.
- Bosh menyu ichidagi ro'yxat, pagination, material tanlash, tahrirlash, publish va o'chirish kabi kontekstli amallar `InlineKeyboardMarkup` bilan beriladi.
- Foydalanuvchi callback matnlarini qo'lda yozmaydi; matn faqat nom, tavsif, qidiruv so'zi, URL yoki test manbasi kerak bo'lgan bosqichda so'raladi.
- Har bir ichki menyuda `Orqaga`, uzoq jarayonda `Bekor qilish` mavjud bo'ladi.
- `/start` joriy eskirgan draftni xavfsiz tozalab, rolga mos bosh menyuni qayta ko'rsatadi; `/cancel` faqat joriy jarayonni bekor qiladi.
- Bir xil callback takroran bosilsa duplicate record yoki duplicate delete yuz bermaydi.
- Eski xabardagi callback material allaqachon o'zgargan/o'chirilgan bo'lsa, bot tushunarli xabar berib menyuni yangilaydi.

Owner bosh menyusi, oddiy Reply Keyboard:

```text
Materiallarni boshqarish
Adminlar          Bot haqida
```

Oddiy DL-Library admini bosh menyusi:

```text
Material qo'shish
Bot haqida
```

Owner `Materiallarni boshqarish`ni bosganda:

```text
Kitoblar          Taqdimotlar
Videolar          Testlar
Orqaga
```

Oddiy admin `Material qo'shish`ni bosganda xuddi shu to'rtta material turi chiqadi, lekin keyingi oynada faqat `Yangi qo'shish` oqimi ochiladi.

#### 10.7.2. Umumiy material CRUD menyusi

Owner material turini tanlaganda inline amallar:

```text
Yangi qo'shish
Ro'yxat           Qidirish
Orqaga
```

Ro'yxat talablari:

- materiallar oxirgi yangilangan sana bo'yicha pagination bilan chiqadi;
- har sahifada 5-10 ta ixcham inline item bo'ladi;
- item matnida nom va `Draft`/`Published` holati ko'rinadi;
- `Oldingi` va `Keyingi` tugmalari faqat kerak bo'lganda chiqadi;
- qidiruv title_uz/title_ru/title_en va material ID bo'yicha ishlaydi;
- bir nechta natija topilsa tanlash ro'yxati, bitta natija topilsa detail ochiladi;
- hech narsa topilmasa CRUD holati o'zgarmaydi va bosh menyuga qaytish beriladi.

Material detailidagi umumiy inline amallar:

```text
Tahrirlash
Publish / Unpublish
Fayl yoki manbani almashtirish
Muqovani almashtirish
O'chirish
Orqaga
```

- Material turiga tegishli bo'lmagan tugma yashiriladi: masalan YouTube videoda PDF almashtirish bo'lmaydi.
- `O'chirish` ikki bosqichli confirm bilan ishlaydi: `Ha, o'chirish` va `Yo'q, qaytish`.
- Delete avval record va bog'liq ma'lumotlarni tekshiradi, keyin D1 hamda tegishli R2 obyektlarini boshqariladigan cleanup qiladi.
- `Publish` faqat majburiy metadata va fayl/manba valid bo'lganda ruxsat etiladi.
- Tahrir yoki fayl almashtirishdan keyin yangi preview ko'rsatiladi; owner confirm qilmaguncha avvalgi production qiymat o'zgarmaydi.

#### 10.7.3. Kitoblar CRUD

Kitoblar menyusi mavjud ishlaydigan oqimni saqlaydi va bir xil umumiy navigatsiyaga ulanadi:

- `Yangi qo'shish`: kategoriya -> PDF -> AI metadata -> muqova -> preview -> confirm;
- `Ro'yxat`: pagination bilan kitoblar;
- `Qidirish`: uch tildagi nom, muallif yoki ID;
- `Tahrirlash`: title_uz/ru/en, authors, year, pages, category, description_uz/ru/en;
- `PDF almashtirish`: yangi PDF page count va metadata tekshiruvi, so'ng confirm;
- `Muqovani almashtirish`: rasm validatsiyasi va preview;
- `O'chirish`: ikki bosqichli tasdiq va R2 cleanup.

Mavjud kitoblarning public URLlari keraksiz o'zgartirilmaydi. Kitob CRUD regressiyasi yangi umumiy material menyusiga o'tishda alohida smoke test qilinadi.

#### 10.7.4. Taqdimotlar CRUD

Prezentatsiya oqimi:

1. `Material qo'shish` -> `Taqdimot` -> kategoriya.
2. Bot PDF so'raydi va Telegramdan faylni oladi.
3. Sahifalar soni AI ishlatmasdan PDF library orqali aniqlanadi.
4. Avval 1-2 sahifaning text layeri olinadi; text yetarli bo'lmasa mavjud PDF vision fallback ishlatiladi.
5. AI faqat metadata uchun `title_uz/ru/en`, `description_uz/ru/en` va kerakli qo'shimcha maydonlarni strukturali JSONda qaytaradi.
6. Admin cover yuboradi yoki mavjud rasmni tanlaydi.
7. Bot preview chiqaradi; confirmdan keyin PDF/cover R2 ga, metadata D1 ga yoziladi.

Mavjud taqdimotni boshqarish:

- ro'yxat/qidirish va detail preview;
- title_uz/ru/en, description_uz/ru/en, category va language tahriri;
- PDF almashtirilganda page count qayta hisoblanadi;
- cover almashtirish;
- draft/published holatini almashtirish;
- delete oldidan active progress yozuvlari soni haqida ownerga ogohlantirish, so'ng D1/R2 cleanup.

Telegram Bot API orqali yuklab olinadigan fayl limiti sabab botdagi PDF uchun amaliy maksimum `19 MB` qilinadi. Kattaroq prezentatsiya admin panel orqali yuklanadi; bot foydalanuvchiga aniq xabar va `/admin` yo'lini ko'rsatadi.

#### 10.7.5. Testlar CRUD

Test yaratish oqimi:

1. `Material qo'shish` -> `Test` -> kategoriya va til.
2. Admin UTF-8 `.txt` yuboradi yoki bir/necha text xabar yuborib `Tugatdim`ni bosadi.
3. Sayt admin paneli bilan aynan bir xil `test-parser` ishlaydi.
4. Bot savollar soni, xatolar va ixcham previewni ko'rsatadi; xatoda savol raqami beriladi.
5. Admin davomiylik, o'tish foizi, urinish limiti va shuffle holatini tanlaydi.
6. `Tasdiqlayman`dan keyin test draft yoki published holatda transaction bilan saqlanadi.

Mavjud testni boshqarish:

- ro'yxat/qidirish va test detail: savollar soni, duration, passing percent, status;
- title_uz/ru/en, description_uz/ru/en, category, language tahriri;
- duration, passing percent, max attempts, shuffle va violation limitini tugmalar/matn orqali o'zgartirish;
- `.txt` fayl yoki text manbasini qayta import qilish;
- qayta import alohida previewdan o'tadi va confirmdan keyin savol/variantlarni transaction bilan almashtiradi;
- draft/published holatini almashtirish;
- o'chirishdan oldin mavjud attemptlar sonini ko'rsatish va ikki bosqichli confirm.

Published test savollarini almashtirish tarixiy attemptlarni buzmasligi kerak. Implementatsiyada attempt snapshot mavjud tartiblarni saqlaydi; xavfsiz almashtirish imkoni bo'lmasa yangi test versiyasi yaratiladi va eski versiya unpublish qilinadi.

#### 10.7.6. Videolar CRUD

Video yaratish oqimi:

1. `Material qo'shish` -> `Video` -> kategoriya -> YouTube link.
2. Backend URLdan video IDni ajratadi va ruxsat etilgan YouTube formatini validatsiya qiladi.
3. YouTube Data API orqali original title, description, thumbnail va duration olinadi.
4. AI yoqilgan bo'lsa original metadata uch tildagi qisqa, grammatik to'g'ri title/descriptionga moslashtiriladi; AI ishlamasa original metadata bilan tahrirlash previewi beriladi.
5. Admin previewda title/description/cover/durationni ko'radi, tahrirlaydi va tasdiqlaydi.

Mavjud videoni boshqarish:

- ro'yxat/qidirish va detail preview;
- title_uz/ru/en, description_uz/ru/en, category va language tahriri;
- YouTube URLni almashtirish va yangi ID/metadata/durationni qayta validatsiya qilish;
- YouTube thumbnail yoki owner yuborgan coverni tanlash/almashtirish;
- draft/published holatini almashtirish;
- ikki bosqichli delete; faqat DL-Librarydagi metadata/cover o'chadi, YouTube videosiga tegilmaydi.

#### 10.7.7. Adminlar CRUD

`Adminlar` bosh menyusi faqat ownerga ko'rinadi. Inline menyu:

```text
Admin qo'shish
Adminlar ro'yxati
Admin o'chirish
Orqaga
```

- `Admin qo'shish`: owner Telegram user xabarini forward qiladi yoki numeric Telegram ID yuboradi; bot `getChat` orqali mavjud bo'lsa username, first name va last nameni oladi.
- Confirm oynasida adminning ismi, username, Telegram ID va `DL-Library admini` roli ko'rsatiladi.
- `Tasdiqlayman`dan keyin admin D1 ga upsert qilinadi; duplicate admin ikkinchi marta yaratilmaydi.
- `Adminlar ro'yxati`: ism/username, Telegram ID, rol va qo'shilgan sana bilan pagination.
- `Admin o'chirish`: ro'yxatdan tanlash yoki ID, so'ng ikki bosqichli confirm.
- Owner o'zini yoki owner konfiguratsiyasini o'chira olmaydi.
- Oddiy admin `Adminlar` matnini qo'lda yuborsa ham server owner IDni tekshiradi va rad etadi.
- Admin o'chirilganda uning ochiq material drafti cleanup qilinadi va keyingi callbacklari darhol bloklanadi.

#### 10.7.8. Bot haqida

`Bot haqida` oddiy Reply Keyboard tugmasi bo'ladi va quyidagilarni ko'rsatadi:

- bot versiyasi va vazifasi;
- user roli: owner yoki DL-Library admini;
- qo'llab-quvvatlanadigan materiallar;
- PDF/TXT limitlari;
- metadata AI provider/model nomi, lekin secret yoki API key emas;
- sahifa/slayd soni AI ishlatmasdan aniqlanishi;
- qisqa `/cancel` va yordam ma'lumoti.

Barcha material oqimlari uchun:

- confirmdan oldin production D1/R2 ga yakuniy record yozilmaydi;
- vaqtinchalik fayllar bekor qilish yoki timeoutdan keyin cleanup qilinadi;
- bir admin sessiyasidagi material state boshqa admin/user state bilan aralashmaydi;
- AI xatosi materialni yo'qotmaydi, qo'lda tahrirlashga o'tkazadi;
- bot status xabarlari bir necha marta bosilganda idempotent bo'lishi kerak.

## 11. Admin panel UX

Admin panel mavjud sokin ish interfeysi uslubida kengaytiriladi. Yuqori navigatsiyada tablar:

- Kitoblar
- Prezentatsiyalar
- Testlar
- Video darslar

### 11.1. Prezentatsiya formasi

- uch tildagi nom;
- uch tildagi tavsif;
- kategoriya va til;
- PDF;
- cover;
- draft/published holati;
- PDF yuklangach aniqlangan slaydlar soni.

### 11.2. Video formasi

- uch tildagi nom/tavsif;
- kategoriya va til;
- YouTube URL;
- cover ixtiyoriy;
- URL kiritilganda embed preview;
- draft/published.

### 11.3. Test formasi

1. Test nomi, tavsifi, kategoriya va til.
2. Davomiylik, o'tish foizi, urinish limiti.
3. Savollar/variantlarni aralashtirish togglelari.
4. `.txt` fayl yuklash.
5. Parser preview.
6. Xatolar bo'lsa saqlash bloklanadi.
7. Draft saqlash va alohida publish.

Test savollarini V1 da admin panel ichida bittalab tahrirlash tavsiya etiladi. Agar bu scope juda kattalashsa, V1 da xato savolni TXT faylda tuzatib qayta import qilish bilan cheklash mumkin.

## 12. Public sayt UX

Asosiy navigatsiya:

- chap: sayt logosi va `DL-Library` nomi;
- markaz: `Kitoblar` (default), `Taqdimotlar`, `Videolar`, `Testlar`;
- o'ng: `UZ/RU/EN`, tema va profil/login.

Kontent metadata saytning mavjud `uz/ru/en` til almashtirish tizimiga ulanadi. Test savollari esa admin import qilgan asl tilda chiqadi.

Route va holat qoidalari:

- `/` yoki mavjud katalog route `Kitoblar`ni ochadi;
- `Taqdimotlar`, `Videolar`, `Testlar` browser back/forward bilan to'g'ri ishlaydigan alohida route yoki barqaror query/hash route oladi;
- tanlangan til va tema route almashganda yo'qolmaydi;
- header katalog API javobini kutmasdan render bo'ladi;
- logo va sayt nomini bosish default `Kitoblar` bo'limiga qaytaradi;
- klaviatura focus, aria-label, active state va yetarli rang kontrasti ta'minlanadi.

### 12.1. Headerning desktop va mobil holati

Desktop:

- balandligi ixcham va barqaror bo'ladi;
- logo/nom birinchi viewportda aniq ko'rinadi;
- navigatsiya linklari bir qatorga sig'adi, matn siqilib yoki kesilib qolmaydi;
- til selector uchta alohida katta tugma o'rniga ixcham selector/menyu bo'lishi mumkin;
- tema familiar quyosh/oy iconi bilan, tooltip va accessibility label bilan beriladi;
- login holatiga qarab Google login yoki avatar/profile menu bir xil joyni egallaydi.

Mobile:

- yuqori header logo, til, tema va profilni ixcham saqlaydi;
- to'rtta asosiy bo'lim thumb-friendly pastki navigatsiyada ko'rsatiladi yoki accessibilityni saqlagan ixcham menyuga o'tadi;
- active tab icon va label bilan ajratiladi;
- uzun ruscha/inglizcha label tugmalar chegarasidan chiqmaydi;
- soft keyboard, Telegram WebView safe-area va telefon notch maydonlari hisobga olinadi;
- test yoki viewer fullscreen rejimida public navigatsiya yashirilib, faqat material boshqaruvlari qoladi.

### 12.2. Telegramni kichik qo'shimcha variant sifatida ko'rsatish

- Katalog headerida doimiy katta Telegram CTA bo'lmaydi.
- Test kartasida asosiy action `Testni boshlash`; uning yonida yoki detail ichida kichik Telegram icon + `Telegramda` secondary action bo'lishi mumkin.
- Test start ekranida bir martalik ixcham matn ishlatilishi mumkin: `Ushbu testni Telegramda ham ishlashingiz mumkin.`
- Bu eslatma sariq anonymous warning bilan aralashmaydi, modal ochmaydi va test boshlashni kechiktirmaydi.
- Mobileda joy yetmasa Telegram action overflow menyuga yoki detail qismiga o'tadi.
- Profil sozlamalarida `Telegram akkaunti` qatori bog'langan/bog'lanmagan holat va ulash/uzish actionini ko'rsatadi.
- Telegram taklifi yopilganini shu browser sessiyasida eslab qolish mumkin; har safar takroriy ko'rsatilmaydi.
- Analyticsda sayt testi va Mini App testi `channel` bilan farqlanadi, ammo foydalanuvchi profilida natijalar umumiy ro'yxatda chiqadi.

### 12.3. Anonymous progress ogohlantirishi

Anonymous foydalanuvchi prezentatsiya, video yoki testni ochganda browserning native `alert()` oynasi emas, sayt dizayniga mos kichik sariq warning component ko'rsatiladi.

Component talablari:

- och sariq fon, yetarli kontrastli qora/to'q matn va warning icon;
- viewer/test toolbariga yaqin, kontentni yopmaydigan sticky yoki inline joylashuv;
- matn: `Profilga kirmagansiz. Ushbu faoliyat natijasi va progressingiz saqlanmaydi.`;
- `Google orqali kirish` CTA tugmasi;
- kichik yopish iconi bo'lishi mumkin, lekin keyingi yangi material yoki test ochilganda yana chiqadi;
- mobileda ekran kengligiga sig'adi va boshqaruv tugmalarini yopmaydi;
- sariq component modal emas, test yoki videoni boshlashni majburan to'xtatmaydi;
- login user uchun umuman ko'rsatilmaydi;
- warning ko'rsatish viewer va testning yuklanishini sekinlashtirmaydi.

Testda warning start ekranida ko'rsatiladi va anonymous holat davom etsa test toolbarida ixcham indikator qoladi. Prezentatsiya va videoda viewer ochilishi bilan bir marta ko'rsatiladi.

### 12.4. Prezentatsiya viewer

- Mavjud PDF.js reader logikasidan qayta foydalanish.
- Alohida `presentation mode`: bitta PDF sahifa bitta slayd.
- Oldingi/keyingi tugmalari va klaviatura chap/o'ng strelkalari.
- Joriy slayd / jami slayd.
- Fullscreen, zoom va mobile swipe.
- Har ko'rilgan slayd session ichidagi `Set`ga yoziladi.
- Login user progressi serverga 3-5 soniya debounce bilan yuboriladi.
- Login user qayta ochganda oxirgi slayddan davom ettirish taklif qilinadi.
- Anonymous user slaydlarni cheklovsiz ko'radi, lekin viewer yopilgach progress profilga saqlanmaydi.

### 12.5. YouTube viewer

- Server validatsiya qilgan `youtube_video_id` bilan `youtube-nocookie.com` iframe.
- YouTube IFrame Player API orqali `play`, `pause`, `ended`, current time va duration olinadi.
- Login user uchun har 10-15 soniyada progress yangilanadi.
- Video 80 foiz ko'rilganda completed.
- Brauzer yoki YouTube API cheklovi sabab progress yozilmasa video baribir ko'rilishi kerak.
- Anonymous user video darsni to'liq ko'radi, lekin progress profilga yozilmaydi.

### 12.6. Kitob progressi

- Mavjud `openFlipbook` API kitob ID ni ham qabul qiladigan qilinadi.
- Sahifa o'zgarganda login qilgan user progressi debounce bilan saqlanadi.
- Anonymous user uchun viewer avvalgidek ishlaydi, faqat progress serverga yozilmaydi.

### 12.7. Profil

Profil bo'limlari:

- Davom ettirish
- Kitoblarim
- Prezentatsiyalarim
- Video darslarim
- Test natijalarim

Har elementda nom, cover, progress foizi, oxirgi ochilgan vaqt va davom ettirish tugmasi bo'ladi. Test kartasida score, passed/failed, vaqt va urinish sanasi ko'rsatiladi.

Profil summaryda Telegram orqali ochilgan test alohida shovqinli bo'limga ajratilmaydi; kerak bo'lsa natijada kichik `Telegram` source belgisi ko'rsatiladi. Profil sozlamasida Telegram akkauntini xavfsiz ulash va uzish mavjud bo'ladi.

## 13. Test runner va anti-cheat

### 13.1. Test boshlash

1. Test login user va anonymous user uchun ochiq bo'ladi.
2. Anonymous userga natija saqlanmasligi haqida sariq warning ko'rsatiladi.
3. Login user uchun server urinish limiti va mavjud faol attemptni tekshiradi.
4. Anonymous user uchun server vaqtinchalik token bilan ephemeral attempt yaratadi.
5. Server `started_at` va `expires_at` yaratadi.
6. Server savollar va variantlar tartibini bir marta random qilib attemptda saqlaydi.
7. Browser foydalanuvchi tugmani bosganda Fullscreen API ni chaqiradi.
8. Savollar to'g'ri javob belgisisiz yuboriladi.

### 13.2. Timer

- Asosiy vaqt serverdagi `expires_at` hisoblanadi.
- Client timer faqat ko'rsatish uchun.
- Sahifa yangilansa timer qayta boshlanmaydi.
- Server vaqti tugagan attempt uchun yangi javob qabul qilmaydi va `expired` finish qiladi.
- Client vaqt tugaganda avtomatik finish endpointini chaqiradi.

### 13.3. Javoblarni saqlash

- Har variant tanlanganda serverga autosave.
- Bir savolga javob qayta tanlansa upsert qilinadi.
- Network xatosida UI javobni lokal navbatda saqlab, qayta urinadi.
- Finishdan oldin pending javoblar yuboriladi.
- Ball faqat serverdagi `is_correct` orqali hisoblanadi.

### 13.4. Qoidabuzarliklar

Qayd qilinadigan hodisalar:

- tab hidden;
- boshqa oynaga focus o'tishi;
- fullscreen rejimidan chiqish;
- reload/leave urinishi;
- taqiqlangan copy/print shortcut urinishi (statistik hodisa sifatida).

Sanksiya:

- 1-hodisa: ogohlantirish;
- 2-hodisa: oxirgi ogohlantirish;
- 3-hodisa: `terminated` va avtomatik finish.

### 13.5. Nusxalashni qiyinlashtirish

- `copy`, `cut`, `paste`, `contextmenu`, `dragstart` hodisalarini test konteynerida bloklash;
- `user-select: none`;
- `Ctrl/Cmd+C`, `A`, `P`, `S`, `U` kombinatsiyalarini bloklash;
- print CSS da test kontentini yashirish;
- ekranda user email/display name va joriy vaqtli yarim shaffof watermark;
- savol/variant tartibini har attempt uchun random qilish.

Developer Tools va OS screenshotni to'liq bloklashga urinilmaydi, chunki bu web platformada ishonchli va halol yechim emas.

### 13.6. Finish va natija

- Finish bosilganda tasdiqlash modal oynasi.
- Server attemptni atomik/idempotent yakunlaydi.
- Takroriy finish bir xil natijani qaytaradi.
- Natija darhol ko'rsatiladi:
  - to'g'ri javoblar soni;
  - jami savollar;
  - foiz;
  - o'tdi/o'tmadi;
  - sarflangan vaqt;
  - har savolda user javobi va to'g'ri javob.
- `show_answers_after_finish=0` bo'lsa faqat umumiy natija chiqadi; default `1`.
- Anonymous user ham shu natijani joriy sessiyada darhol ko'radi, ammo natija profil tarixiga yozilmaydi.

### 13.7. Telegram Mini App test runner

- Mini App alohida test mantiqini yaratmaydi; `test-runner` UI va `test-engine` backend imkon qadar umumiy ishlatiladi.
- Attempt yaratilganda `channel='telegram_mini_app'` yoziladi.
- Bog'langan Telegram user uchun attempt `user_id`ga bog'lanadi; bog'lanmagan user uchun anonymous token ishlatiladi.
- Timer serverdagi `started_at` va `expires_at`ga asoslanadi; Telegram oynasi yopilib qayta ochilsa vaqt boshidan boshlanmaydi.
- Mini App yopilishidan oldin javoblar har tanlovda autosave qilinadi.
- Telegram WebView fullscreen/visibility eventlari oddiy browserdan farq qilishi mumkin. Qo'llab-quvvatlanadigan eventlar qayd qilinadi, lekin platforma bermaydigan nazoratlar sabab user noto'g'ri terminate qilinmaydi.
- Webdagi 3 violation siyosati Mini Appga faqat ishonchli eventlar mavjud bo'lsa qo'llanadi; server timer, copy cheklovi va correct answerni yashirish esa bir xil qoladi.
- Telegram Back Button test davomida darhol chiqib ketmasdan oldin tasdiqlash so'raydi; chiqib ketilgan attempt qayta ochilganda davom etadi.
- Telegram Main Button faqat aniq actionlarda, masalan `Yakunlash` uchun ishlatiladi; sahifadagi normal button bilan ikki marta submit bo'lmasligi ta'minlanadi.
- Mini App theme parametrlari platforma ranglariga moslashishi mumkin, ammo kontrast va DL-Library branding saqlanadi.
- Desktop Telegram, Android va iOS Telegram WebView alohida smoke testdan o'tadi.

## 14. Fayl va storage qoidalari

- Kitob va prezentatsiya PDF fayllari R2 da alohida prefixlarda:
  - `books/...`
  - `presentations/...`
  - `covers/presentations/...`
- Delete paytida faqat shu recordga tegishli R2 obyektlari o'chiriladi.
- Yangi fayl muvaffaqiyatli yozilmaguncha eski fayl o'chirilmaydi.
- DB write yiqilsa yangi orphan R2 fayl cleanup qilinadi.
- PDF MIME, `%PDF-` signature va hajm serverda tekshiriladi.
- Prezentatsiya uchun dastlabki limit 40 MB tavsiya qilinadi; owner tasdiqlashi kerak.
- YouTube video R2 ga yuklanmaydi, faqat URL va video ID saqlanadi.

## 15. Xavfsizlik va maxfiylik

- Barcha mutation endpointlar server-side admin, user session yoki anonymous attempt tokenini tekshiradi.
- Admin va Google user auth alohida cookie hamda helperlardan foydalanadi.
- SQL faqat prepared statement orqali.
- Public API hech qachon testning `is_correct` qiymatini finishdan oldin bermaydi.
- Test attempt boshqa user tomonidan ID ni taxmin qilish orqali ochilmasligi kerak.
- OAuth secret, session secret va client secret Gitga yozilmaydi.
- Profil API faqat joriy user ma'lumotini qaytaradi.
- YouTube URL HTMLga to'g'ridan-to'g'ri yozilmaydi; faqat validatsiyalangan video ID ishlatiladi.
- User display name va email HTMLga chiqarishda escape qilinadi.
- Rate limitning kamida sodda D1/time-window yoki Cloudflare konfiguratsiya rejasi auth va test start endpointlarida bo'lishi kerak.
- Privacy sahifasida Google profilidan qaysi ma'lumotlar olinishi yoziladi: sub, email, ism, avatar.
- Privacy matnida Telegram akkaunti bog'lansa `telegram_user_id`, username va display name saqlanishi ham ko'rsatiladi.
- Telegram Mini App `initData` serverda Telegram ko'rsatmasiga muvofiq tekshiriladi; clientdagi user object autentifikatsiya uchun yetarli emas.
- Account-link va test deep-link tokenlari qisqa muddatli, signed/random va bir martalik bo'ladi.
- Bot admin callbacklari callback yuborgan Telegram ID, kutilgan state va material draft egasi bilan tekshiriladi.
- AI providerga PDFning to'liq fayli yuborilmaydi; avval text layer, zarur bo'lsa faqat 1-2 sahifa ishlatiladi.

### 15.1. Mavjud ma'lumotlarni himoyalash

- Barcha D1 migratsiyalar additive bo'ladi; mavjud jadvalni `DROP`, `RENAME` yoki destructive rebuild qilish taqiqlanadi, alohida tasdiqlangan zarurat bundan mustasno.
- Production migratsiyadan oldin D1 export/backup va asosiy jadvallar row count snapshot olinadi.
- Deploydan oldin va keyin `books`, `telegram_admins` va R2 kitob obyektlari tekshiriladi.
- Yangi feature xatosi mavjud kitob API, admin panel yoki Telegram webhookni yiqitmasligi uchun modul chegaralari saqlanadi.
- Yangi kontent delete operatsiyasi tasdiqlash talab qiladi; DB record muvaffaqiyatli yangilanmaguncha eski R2 fayl o'chirilmaydi.
- Migration va deploy alohida bosqichlarda, orqaga mos tartibda bajariladi.
- Preview deployment va lokal D1 testidan o'tmagan kod productionga chiqmaydi.
- Productionda `schema.sql` ishlatilmaydi va mavjud kitoblar qayta seed qilinmaydi.

### 15.2. Tezlik va optimallashtirish

- Yangi test, presentation, video va profile JavaScript modullari faqat tegishli view ochilganda lazy-load qilinadi.
- PDF.js faqat kitob yoki prezentatsiya viewer ochilganda yuklanadi.
- YouTube IFrame API faqat video viewer ochilganda yuklanadi; katalog sahifasida iframe yaratilmaydi.
- Katalog API lar pagination, limit va kerakli ustunlarni tanlab olish bilan ishlaydi; barcha og'ir recordlar bir so'rovda olinmaydi.
- D1 ning barcha asosiy filter/join maydonlariga reja bo'yicha indeks qo'yiladi.
- Progress write lar debounce/throttle qilinadi; har scroll yoki har soniyada D1 ga yozilmaydi.
- Cover rasmlar optimallashtirilgan o'lcham va formatda beriladi, `loading="lazy"` ishlatiladi.
- R2 public fayllari va statik assetlar uchun to'g'ri `Cache-Control`, ETag va Cloudflare CDN caching ishlatiladi.
- Test start API faqat joriy attempt uchun kerakli savollarni qaytaradi; correct answer va ortiqcha admin metadata yuborilmaydi.
- Profil ma'lumotlari pagination bilan olinadi va tab ochilmaguncha og'ir history yuklanmaydi.
- Loading, empty va error holatlari layoutni siljitmaydigan barqaror o'lchamlarda bo'ladi.
- Katta PDF yuklanishi saytning asosiy katalog renderini bloklamaydi.
- Target: oddiy katalogning LCP ko'rsatkichi yaxshi 4G sharoitida 2.5 soniyadan oshmasligi, interaktiv elementlar esa material yuklanishidan mustaqil ishlashi.
- Performance browser profiling va desktop/mobile smoke orqali deploydan oldin tekshiriladi.

## 16. Kod fayllari rejasi

### 16.1. Yangi backend helperlar

- `functions/_lib/user-auth.js`
- `functions/_lib/presentations.js`
- `functions/_lib/videos.js`
- `functions/_lib/test-parser.js`
- `functions/_lib/test-engine.js`
- `functions/_lib/progress.js`
- `functions/_lib/youtube.js`
- `functions/_lib/telegram-auth.js`
- `functions/_lib/telegram-link.js`
- `functions/_lib/telegram-materials.js`

### 16.2. Yangi API papkalari

- `functions/api/user-auth/`
- `functions/api/user/`
- `functions/api/presentations/`
- `functions/api/videos/`
- `functions/api/tests/`
- `functions/api/test-attempts/`
- `functions/api/progress/`
- `functions/api/profile/`
- `functions/api/telegram/`

### 16.3. Frontend

- `public/js/auth.js`
- `public/js/progress.js`
- `public/js/presentation-viewer.js`
- `public/js/video-player.js`
- `public/js/test-runner.js`
- `public/js/profile.js`
- `public/js/header.js`
- `public/js/theme.js`
- `public/js/telegram-mini-app.js`
- kerak bo'lsa alohida `public/test.html`, `public/profile.html`, `public/presentation.html`.

Mini App uchun imkon qadar alohida dublikat sahifa yaratilmaydi. Mavjud test route Telegram contextni aniqlab compact shellni yoqadi; umumiy test component, API client va style tokenlar qayta ishlatiladi.

Mavjud sahifani bitta juda katta `app.js`ga aylantirmaslik kerak. Har katta feature alohida modul/faylda bo'ladi.

### 16.4. O'zgartiriladigan mavjud fayllar

- `public/index.html`
- `public/js/app.js`
- `public/js/flipbook.js`
- `public/css/style.css`
- `public/admin/index.html`
- `public/admin/admin.js`
- `public/admin/admin.css`
- `functions/api/upload.js`
- `schema.sql` (faqat yangi install uchun yangi jadvallarni aks ettirish)
- `package.json`
- `README.md`, `DEPLOY.md`
- yangi migration va test fayllari.
- Telegram botning mavjud webhook/handler fayllari va BotFather Mini App sozlash yo'riqnomasi.

## 17. Implementatsiya bosqichlari

### Bosqich 0. Xavfsiz boshlash

- `master` va production commit mosligini tekshirish.
- D1 production backup/export olish.
- R2 obyektlar ro'yxatini yoki statistik snapshotni olish.
- Alohida `codex/learning-platform` branch yaratish.
- Mavjud testlarni baseline sifatida ishlatish.
- Hech qachon mavjud user o'zgarishlarini revert qilmaslik.

Natija: rollback uchun commit, DB backup va boshlang'ich test natijasi mavjud.

### Bosqich 1. Schema va domain helperlar

- `0005_learning_platform.sql` yozish.
- Barcha yangi jadvallar va indekslar.
- Lokal D1 ga migratsiya.
- Repository/helperlar va validatsiya.
- Parser unit testlari.

Natija: UI siz turib barcha model va parser testlari ishlaydi.

### Bosqich 2. Google login va user sessiyasi

- Google Cloud OAuth client sozlash yo'riqnomasi.
- Start/callback/logout/me endpointlari.
- D1 user va user session.
- Public responsive header: logo/nom, Kitoblar, Taqdimotlar, Videolar, Testlar, UZ/RU/EN, tema va login/profile holati.
- Mobile yuqori panel va asosiy bo'limlar navigatsiyasi.
- Til/tema persistence va accessibility holatlari.
- Auth security testlari.

Natija: Google bilan kirish, refreshdan keyin sessiya, logout ishlaydi; admin login buzilmaydi.

### Bosqich 3. Prezentatsiya CRUD va viewer

- Admin presentation tab/form/list.
- PDF/cover upload va page count.
- Public list/detail.
- Slide viewer va mobile holat.
- Presentation progress.

Natija: admin PDF yuklaydi, publish qiladi, user slayd ko'radi va davom ettiradi.

### Bosqich 4. Video CRUD va player

- YouTube URL parser/validator.
- Admin CRUD va embed preview.
- Public list/detail/player.
- IFrame API progress.

Natija: YouTube link admin orqali qo'shiladi, sayt ichida ochiladi va progress saqlanadi.

### Bosqich 5. Test import va admin boshqaruvi

- TXT parser.
- Parse error va preview UI.
- Test settings.
- Batch/transaction orqali save.
- Draft/publish/delete.

Natija: berilgan namuna 2 savol, har biri 4 variant va `#` bilan belgilangan to'g'ri javob bilan import bo'ladi.

### Bosqich 6. Test runner

- Attempt start/resume.
- Random order snapshot.
- Autosave answers.
- Server-authoritative timer.
- Fullscreen va 3 violation siyosati.
- Finish, scoring va result review.

Natija: test qoidalari server va client testlari bilan ishlaydi; to'g'ri javob finishdan oldin chiqmaydi.

### Bosqich 7. Kitob progressi va profil

- Mavjud readerga book ID va progress hook.
- Unified profile summary.
- Continue cards va history.
- Empty/loading/error states.

Natija: barcha to'rt faoliyat turi user profilida ko'rinadi.

### Bosqich 8. Telegram account-link va Mini App

- `user_telegram_links`, link token va Mini App session migratsiyasi/helperlari.
- Telegram `initData` server-side validatsiyasi.
- Sayt profilidan bir martalik deep-link bilan akkaunt bog'lash/uzish.
- Botdagi `Profilni ulash`, `Anonim davom etish`, `/profil` va test katalogi.
- Sayt test detailida past ustuvorlikdagi `Telegramda` secondary action.
- Existing test runner uchun compact Telegram shell.
- Server-authoritative timer, autosave, finish va profile sync.
- Web va Mini App urinishlarini `channel` orqali ajratish.

Natija: sayt asosiy oqim bo'lib qoladi; xohlagan foydalanuvchi testni Mini Appda ishlaydi va bog'langan bo'lsa natija o'sha profilga yoziladi.

### Bosqich 9. Telegram bot orqali material va admin CRUD

- Rolga mos oddiy Reply Keyboard bosh menyusi va ichki Inline Keyboardlar.
- Owner uchun `Materiallarni boshqarish`, `Adminlar`, `Bot haqida`.
- Oddiy admin uchun `Material qo'shish`, `Bot haqida`.
- Kitob, taqdimot, test va video uchun yaratish, ro'yxat, qidirish, detail, tahrirlash, publish/unpublish va delete oqimlari.
- Owner-only admin qo'shish, ro'yxat va o'chirish oqimlari.
- Mavjud kitob CRUDni yangi umumiy menyuga regressiyasiz ulash.
- Taqdimot PDF page count, text-first metadata, cover, preview/edit/confirm.
- Test `.txt` va text-message import, umumiy parser, settings va preview.
- YouTube Data API metadata, optional AI translation/adaptation, preview.
- Telegram 19 MB limit va kattaroq PDF uchun admin panel fallbacki.
- Draft state, timeout cleanup, callback authorization va idempotency testlari.

Natija: owner to'rtta material turini bot orqali to'liq CRUD qiladi va adminlarni boshqaradi; oddiy admin faqat yangi material joylaydi; barcha yozuvlar tasdiqdan keyin mavjud D1/R2 modeliga tushadi.

### Bosqich 10. QA, deploy va monitoring

- Barcha unit/integration testlar.
- Playwright desktop/mobile oqimlari.
- Admin CRUD smoke.
- OAuth production callback smoke.
- Telegram Mini App Android/iOS/Desktop smoke va account-link security testi.
- Bot Reply/Inline menyulari, barcha material CRUD, admin CRUD, rol cheklovi va preview/confirm smoke.
- D1 backupdan keyin remote migratsiya.
- Cloudflare deploy.
- Production smoke va loglarni tekshirish.

Natija: regression yo'q, production URL va asosiy user flows ishlaydi.

## 18. Test strategiyasi

### 18.1. Unit testlar

- TXT parser: normal sample.
- `+++++` atrofida bo'sh qatorlar.
- Turli uzunlikdagi `====` separatorlar.
- ` #Javob` kabi leading whitespace.
- To'g'ri javobsiz blok.
- Ikki `#` javobli blok.
- 1 variantli blok.
- UTF-8 kirill/lotin/apostrof.
- YouTube URL parser barcha ruxsat etilgan formatlar.
- Progress percent va completion.
- Score va passing percent.
- Expired/terminated/idempotent finish.
- Telegram initData valid/invalid/expired signature.
- Account-link token hash, expiry, one-time use va replay.
- YouTube Data API metadata normalization va API fallback.
- Botdagi presentation/test/video draft state transitionlari.

### 18.2. API/integration testlar

- Anonymous user testni boshlashi, tugatishi va joriy sessiyada natijani ko'rishi mumkin.
- Anonymous test natijasi profil endpointlarida ko'rinmaydi.
- Anonymous attempt tokenisiz boshqa anonymous attempt ochilmaydi.
- Retention cleanup eski anonymous attempt va answers yozuvlarini o'chiradi.
- User boshqa user attemptini ko'ra olmaydi.
- Public test JSON ichida `is_correct` yo'q.
- Admin bo'lmagan user CRUD qila olmaydi.
- Presentation delete R2 cleanup qiladi.
- Test save savol/variantlar bilan to'liq yoki umuman yozilmaydi.
- Uchinchi violation attemptni terminate qiladi.
- Timer tugagach answer qabul qilinmaydi.
- Bog'langan Telegram user attempti to'g'ri `user_id` profiliga yoziladi.
- Bog'lanmagan Telegram user anonymous attempt bo'lib qoladi.
- Client boshqa `user_id` yuborib profilni almashtira olmaydi.
- Bir martalik link token ikkinchi marta ishlamaydi.
- Invalid yoki eskirgan Telegram initData sessiya olmaydi.
- Mini App finish va web finish bir xil scoring natijasini beradi.
- Telegram admin bo'lmagan user material yaratish callbacklarini ishlata olmaydi.
- Botda confirm qilinmagan material published record yaratmaydi.
- Owner kitob/taqdimot/video/test ro'yxati, qidiruvi, tahriri, publish/unpublish va delete amallarini bajara oladi.
- Oddiy `library` admin ro'yxat/detail/admin CRUD callbacklarini qo'lda yuborsa ham 403/rad javobi oladi.
- Admin o'chirilgach avval yuborilgan callback ham ishlamaydi.
- Bir callback ikki marta bosilganda duplicate material yoki takroriy delete bo'lmaydi.
- Test savollarini qayta import qilish eski attempt snapshotini buzmaydi.

### 18.3. Browser testlar

- Google OAuth mock bilan login flow.
- Presentation next/prev/fullscreen/mobile.
- YouTube embed nonblank va progress event.
- Test start -> answers -> finish -> result.
- Tab change 1/2 warning, 3 auto-finish.
- Refreshdan keyin bir xil attempt va qolgan vaqt.
- Profileda barcha activity ko'rinishi.
- Anonymous test, prezentatsiya va videoda sariq warning chiqishi; login userda chiqmasligi.
- Warning mobileda viewer yoki test boshqaruvlarini yopmasligi.
- Desktop va mobileda elementlar overlap qilmasligi.
- Lazy-loaded PDF.js va YouTube API katalogning dastlabki yuklanishiga kirmasligi.
- Desktop header va mobile navigatsiyada barcha to'rtta bo'lim, til, tema va profil ishlashi.
- UZ/RU/EN uzun label holatlarida header overlap qilmasligi.
- `Telegramda` action primary web CTAni bosib ketmasligi va yopilganda qayta bezovta qilmasligi.
- Telegram Mini Appda login/link/anonymous/test/resume/finish oqimlari.
- Mini App compact shell Telegram header yoki safe-area bilan overlap qilmasligi.
- Owner Reply Keyboardda `Materiallarni boshqarish`, `Adminlar`, `Bot haqida`ni ko'rishi.
- Oddiy admin faqat `Material qo'shish` va `Bot haqida`ni ko'rishi.
- To'rtta material turidagi list/search/detail/edit/publish/delete Inline Keyboard oqimlari.
- Pagination, `Orqaga`, `Bekor qilish` va ikki bosqichli delete confirm.

### 18.4. Regression

- Mavjud 23 test o'tishi shart.
- Kitob katalogi, admin kitob CRUD va Telegram PDF yuklash smoke testdan o'tishi shart.
- Mavjud kitob URL va R2 file endpointlari o'zgarmasligi kerak.

## 19. Acceptance mezonlari

Feature quyidagi barcha shartlar bajarilganda tayyor hisoblanadi:

1. Admin PDF prezentatsiyani yaratadi, preview ko'radi, publish qiladi va delete qila oladi.
2. User prezentatsiyani slayd ko'rinishida desktop/mobileda o'qiydi.
3. Login user oxirgi slayddan davom ettira oladi.
4. Admin berilgan TXT namunasini xatosiz import qiladi.
5. Parser xato faylni savol raqami bilan rad etadi.
6. Test finishdan oldin to'g'ri javob browserga berilmaydi.
7. Timer sahifa refreshida qayta boshlanmaydi.
8. Birinchi va ikkinchi oyna almashish ogohlantiradi, uchinchisi auto-finish qiladi.
9. Finishdan keyin natija va to'g'ri javoblar darhol chiqadi.
10. Admin YouTube link qo'shadi va video saytda responsive playerda ochiladi.
11. Google user profilida kitob, prezentatsiya, video va test tarixi chiqadi.
12. Lokal va production migratsiya mavjud kitoblarni o'chirmaydi.
13. Mavjud kitob/admin/Telegram funksiyalarida regression bo'lmaydi.
14. Secretlar Git repositoryga tushmaydi.
15. Anonymous user login qilmasdan test, prezentatsiya va videodan to'liq foydalanadi.
16. Anonymous userga sariq, non-blocking warning natija/progress saqlanmasligini aytadi.
17. Anonymous test natijasi finishdan keyin chiqadi, lekin profilga saqlanmaydi.
18. Login user uchun warning chiqmaydi va progress profilga yoziladi.
19. Production deploydan oldin backup olinadi va 151+ mavjud kitobdan hech biri o'chmaydi.
20. Yangi modullar katalogning dastlabki yuklanishini bloklamaydi va og'ir viewer kutubxonalari lazy-load bo'ladi.
21. Public headerda logo/nom, Kitoblar, Taqdimotlar, Videolar, Testlar, uch til, tema va profil desktop/mobileda ishlaydi.
22. `Kitoblar` default bo'lim bo'lib qoladi va mavjud kitob katalogi regressiyaga uchramaydi.
23. Telegram tavsiyasi kichik secondary action bo'ladi; katta banner, majburiy modal yoki takroriy reklama chiqmaydi.
24. Telegram Mini App saytdagi bir xil test engine, server timer va scoringdan foydalanadi.
25. Telegram profiliga bog'langan user natijasi saytdagi Google profilida ko'rinadi; anonymous natija profilga yozilmaydi.
26. Account-link foydalanuvchidan ID so'ramasdan, qisqa muddatli bir martalik token bilan bajariladi.
27. Bot admin prezentatsiya PDF, test TXT/text va YouTube video linkini preview/edit/confirm orqali qo'sha oladi.
28. Telegramdagi 19 MBdan katta PDF uchun bot xato qilmaydi, admin panel orqali yuklash yo'lini bildiradi.
29. Telegram initData serverda validatsiya qilinadi va bot/admin secretlar repositoryga tushmaydi.
30. Bot ownerga oddiy tugmalarda `Materiallarni boshqarish`, `Adminlar` va `Bot haqida` menyusini ko'rsatadi.
31. `Materiallarni boshqarish` ichida `Kitoblar`, `Taqdimotlar`, `Videolar`, `Testlar` mavjud.
32. Owner har bir materialni yaratish, ro'yxat/qidirish, ko'rish, tahrirlash, publish/unpublish va o'chirish orqali boshqaradi.
33. Oddiy DL-Library admini oddiy `Material qo'shish` tugmasi orqali barcha to'rt turdan yangi material joylaydi, lekin mavjud materiallar va adminlarni ko'rmaydi.
34. Owner admin qo'shish, ro'yxatini ko'rish va o'chirishni inline tugmalar orqali bajaradi; ownerni o'chirib bo'lmaydi.
35. Material va admin delete amali ikki bosqichli confirm bilan ishlaydi, takroriy callback duplicate amal bajarmaydi.

## 20. Deploy tartibi

1. Branchda implementatsiya va test.
2. D1 lokal migration va smoke.
3. Production D1 backup.
4. Git commit/push.
5. Cloudflare preview deployment.
6. Previewda UI/API smoke.
7. Productionga additive D1 migration.
8. Production Pages deploy.
9. Google OAuth production redirect tekshiruvi.
10. Telegram webhook, Mini App URL va BotFather menu button production sozlamalari.
11. D1 counts, R2 access, `/api/books`, yangi API va `dl-library.uz` HTTP smoke.

Cloudflare yangi Functions kodi D1 migratsiyadan oldin yangi jadvallarga murojaat qilsa xato berishi mumkin. Shu sabab deploy compatibility ikki bosqichli bo'lishi kerak:

- avval yangi jadvallar bo'lmasa eski funksiyalar ishlashda davom etadigan kod yoki avval additive migration;
- keyin yangi UI ni publish qilish.

## 21. Rollback

- Frontend/Functions rollback: oldingi muvaffaqiyatli Cloudflare deploymentga qaytish.
- Git rollback: revert commit, `reset --hard` ishlatmaslik.
- D1 rollback: yangi jadvallar additive bo'lgani uchun eski kod ularga tegmaydi; ma'lumotni darhol drop qilmaslik.
- Jiddiy data xatosida migration oldidan olingan D1 backupdan tiklash.
- R2 yangi prefixlari mavjud kitob prefixlariga tegmaydi.

## 22. Scope tashqarisida

V1 ga kirmaydi:

- PPTX ni serverda PDFga konvertatsiya qilish.
- Video faylni bevosita R2 ga yuklash va transkodlash.
- Telegram chatida savollarni bittalab inline keyboard bilan ishlash; V1 da test faqat Mini Appda ishlanadi.
- Mini Appni sayt o'rniga asosiy public platformaga aylantirish.
- Sertifikat yaratish.
- Pullik obuna/payment.
- Guruh/kurs/sinf boshqaruvi.
- Proctoring uchun kamera/mikrofon yozuvi.
- Skrinshotni 100% bloklash.
- Bir nechta to'g'ri javobli test.
- AI orqali test generatsiya qilish.

Bu imkoniyatlar keyingi bosqichlarda alohida talab va reja bilan qo'shiladi.

## 23. Implementatsiyadan oldin owner tasdiqlashi kerak bo'lgan defaultlar

Quyidagilar hozir tavsiya sifatida qabul qilingan:

1. Barcha public materiallar va test login qilmasdan to'liq ishlaydi; login faqat tarix/progressni saqlash uchun kerak.
2. Prezentatsiya PDF limiti 40 MB.
3. Test TXT limiti 2 MB va 1000 savol.
4. Default o'tish bali 60 foiz.
5. Default urinishlar soni cheksiz, admin o'zgartira oladi.
6. Savollar va variantlar default aralashtiriladi.
7. 3-qoidabuzarlikda test avtomatik tugaydi.
8. Finishdan keyin to'g'ri javoblar darhol ko'rsatiladi.
9. Kitob/prezentatsiya/video 80 foizga yetganda completed.
10. Test savollarini admin panelda bittalab tahrirlash V1 ga kirishi yoki qayta import bilan cheklanishi.
11. Anonymous attempt retention muddati 24 soat.
12. Anonymous warning sariq, non-blocking component bo'ladi va `Google orqali kirish` CTA sini ko'rsatadi.
13. Sayt asosiy platforma; Telegram Mini App faqat kichik secondary imkoniyat sifatida ko'rsatiladi.
14. Public header tartibi: `Kitoblar`, `Taqdimotlar`, `Videolar`, `Testlar`; default `Kitoblar`.
15. Telegram Mini App native chat test emas, umumiy web test runnerning compact shelli bo'ladi.
16. Telegram PDF yuklash amaliy limiti 19 MB; kattaroq fayl web admin panelga yo'naltiriladi.
17. Account-link tokeni 10 daqiqa amal qiladi va bir martalik bo'ladi.
18. YouTube metadata uchun YouTube Data API, tarjima/moslashtirish uchun mavjud provider abstraction ishlatiladi.
19. Telegram owner to'liq material/admin CRUD qiladi; `library` admin faqat yangi material create qiladi.
20. Bosh menyu Reply Keyboard, ichki kontekstli amallar Inline Keyboard bilan quriladi.

## 24. Boshqa AI uchun boshlash ko'rsatmasi

Ushbu rejani amalga oshiradigan agent quyidagi tartibni buzmasin:

1. Avval repo, `git status`, `git log`, `schema.sql`, auth, upload, book CRUD va testlarni qayta o'qisin.
2. `reja.md` tasdiqlanganini userdan tekshirsin.
3. Darhol productionga tegmasin; avval branch, local migration va test.
4. Mavjud `books` jadvali yoki R2 kitob fayllarini o'chirmasin.
5. `schema.sql`ni productionda ishga tushirmasin.
6. Google va boshqa secretlarni kodga yozmasin.
7. Har bosqichni alohida test qilib, keyin keyingi bosqichga o'tsin.
8. Userdan Google OAuth credentials faqat OAuth bosqichiga kelganda so'ralsin.
9. Testning to'g'ri javoblarini public/start API responsega qo'shmasin.
10. Screenshotni to'liq bloklash mumkin deb va'da bermasin.
11. Yakunda commit, push, Cloudflare deployment va D1 migration holatini aniq hisobot qilsin.
12. Avval sayt headeri, kataloglar, viewerlar, test va profilni yakunlasin; Telegram integratsiyasini web engine barqarorlashgandan keyin boshlasin.
13. Mini App uchun test engine yoki correct-answer mantiqini dublikat qilmasin.
14. Telegram userni username yoki qo'lda kiritilgan ID bilan emas, validatsiyalangan `telegram_user_id` bilan aniqlasin.
15. Saytda Telegramni katta banner/modal bilan targ'ib qilmasin; faqat rejalashtirilgan secondary actionlardan foydalansin.
16. Mavjud `telegram_sessions`, webhook update deduplication va owner/admin tekshiruvlarini o'qib, ular bilan mos additive o'zgarish qilsin.
17. Owner va `library` admin menyularini bir xil ko'rsatmasin; har callbackda server-side rolni qayta tekshirsin.
18. Kitob, taqdimot, video va test CRUDning list/search/edit/publish/delete oqimlarini faqat UI darajasida emas, integration testlar bilan yopib chiqsin.

## 25. Tasdiqlash

Owner ushbu hujjatni ko'rib chiqadi. Implementatsiya faqat owner aniq `tasdiqlayman, boshla` yoki mazmunan teng buyruq bergandan keyin boshlanadi.
