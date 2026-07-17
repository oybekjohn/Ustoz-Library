# Telegram orqali kitob yuklash

Bot shu Cloudflare Pages Functions loyihasining ichida ishlaydi. PDF va muqova R2 ga,
metadata esa mavjud D1 `books` jadvaliga yoziladi. Alohida server kerak emas.

## Bot oqimi

1. `Kitob yuklash` tugmasi bosiladi.
2. Kategoriya inline tugmalardan tanlanadi.
3. Bot PDF kitobni kutadi.
4. PDF kelgach bot JPG, PNG yoki WEBP muqovani kutadi.
5. Tanlangan AI provayder PDFdan nom, muallif, yil, sahifalar, til va 3 tildagi
   tavsifni tayyorlaydi.
6. Bot ikkala faylni R2 ga, metadata'ni D1 ga yozib `Bajarildi!` xabarini yuboradi.

Telegram'ning odatiy Bot API serveri fayllarni 20 MB gacha yuklab beradi. Shu sababli
standart limit 19 MB, muqova limiti 8 MB.

## 1. Bot va D1 ni tayyorlash

BotFather orqali bot yarating va tokenni oling. Production D1 bazasiga yangi jadvallarni
bir marta qo'shing:

```bash
npm run db:telegram:remote
```

Bu migratsiya mavjud `books` jadvalini va kitoblarni o'chirmaydi.

## 2. Cloudflare secrets

Cloudflare Dashboard -> Workers & Pages -> `ustoz-library` -> Settings ->
Environment variables bo'limiga quyidagilarni Secret sifatida qo'shing:

```text
TELEGRAM_BOT_TOKEN=<BotFather tokeni>
TELEGRAM_WEBHOOK_SECRET=<uzun tasodifiy satr>
TELEGRAM_ALLOWED_USER_IDS=<sizning Telegram user ID'ingiz>
AI_METADATA_PROVIDER=mock
PUBLIC_SITE_URL=https://ustoz-library.pages.dev
```

Ruxsat berilmagan foydalanuvchi botga `/start` yuborsa, bot uning Telegram user ID sini
ko'rsatadi. Bir nechta admin bo'lsa ID larni vergul bilan yozing:
`123456789,987654321`.

## 3. AI provayderni tanlash

Bot kodi o'zgarmaydi; `AI_METADATA_PROVIDER` qiymatini almashtirish kifoya.

### OpenAI

```text
AI_METADATA_PROVIDER=openai
OPENAI_API_KEY=<key>
OPENAI_METADATA_MODEL=<PDF input va structured output qo'llaydigan model>
```

### Google Gemini

```text
AI_METADATA_PROVIDER=gemini
GEMINI_API_KEY=<key>
GEMINI_METADATA_MODEL=<PDF input va JSON output qo'llaydigan model>
```

### Anthropic Claude

```text
AI_METADATA_PROVIDER=anthropic
ANTHROPIC_API_KEY=<key>
ANTHROPIC_METADATA_MODEL=<PDF document input qo'llaydigan model>
```

`mock` rejimi API xarajatisiz oqimni sinaydi. U fayl nomidan vaqtinchalik metadata
yaratadi; keyin admin panel orqali tahrirlash mumkin.

## 4. Deploy va webhook

GitHub'ga push qiling va Cloudflare deploy tugashini kuting. So'ng lokal terminalda
token va webhook secretni environment variable qilib webhookni bir marta o'rnating:

```bash
npm run telegram:webhook -- https://ustoz-library.pages.dev
```

Webhook manzili: `POST /api/telegram`. U faqat Telegram yuboradigan
`X-Telegram-Bot-Api-Secret-Token` headerini qabul qiladi.

## Lokal tekshirish

```bash
npm run db:telegram:local
npm run dev
npm test
```

Telegram public HTTPS webhook talab qiladi. Shu sabab lokal botni real Telegram bilan
sinash uchun tunnel kerak; oddiy sayt va API testlari esa localhostda ishlaydi.
