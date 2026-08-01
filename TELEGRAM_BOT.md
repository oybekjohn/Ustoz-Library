# Telegram orqali kutubxonani boshqarish

Bot Cloudflare Pages Functions ichida ishlaydi. PDF va muqovalar R2 ga, kitob
metadata ma'lumotlari va bot session holatlari D1 ga yoziladi.

## Asosiy menyu

- `Kitoblarni boshqarish`: faqat owner create, list, search, read, update va delete qiladi.
- `Adminlar`: faqat owner admin qo'shadi, rol belgilaydi, ro'yxatni ko'radi va o'chiradi.
- `Bot haqida`: versiya, sayt, faol AI provider/model va fayl limitlarini ko'rsatadi.

`DL Library admini` faqat yangi kitob yuklaydi va o'zi yuklayotgan kitob previewini
ko'radi. U mavjud kitoblar, qidiruv, tahrirlash va adminlar ro'yxatiga kira olmaydi.
`Guruh admini` esa faqat guruh boshqaruvi funksiyalariga kira oladi.

## Yangi kitob qo'shish

1. `Kitoblarni boshqarish` -> `Kitob yuklash` bosiladi.
2. Kategoriya inline tugmalardan tanlanadi.
3. PDF yuboriladi.
4. Sahifalar soni `pdfjs-dist` orqali, AI ishlatmasdan aniqlanadi.
5. PDFning 1-2-sahifasidan text layer o'qiladi.
6. Text topilsa AI'ga faqat shu text yuboriladi.
7. Text topilmasa `pdf-lib` faqat dastlabki ikki sahifalik PDF yaratadi va vision
   tahlil uchun AI'ga shu kichik PDF yuboriladi.
8. AI uch tildagi nom va tavsif, mualliflar hamda yilni JSON ko'rinishida qaytaradi.
9. Bot metadata va tayyor 1:1, 1024x1024 muqova promptini yuboradi.
10. Admin promptni istalgan image AI'da ishlatib, muqovani botga yuboradi.
11. Bot muqova va metadata previewini ko'rsatadi.
12. `Tasdiqlayman`, `Tahrirlayman`, `Muqova prompti` yoki `Bekor qilaman`
    orqali jarayon yakunlanadi.

Metadata D1 `books` jadvaliga faqat admin tasdiqlagandan keyin yoziladi.

## Kitob CRUD

`Kitoblarni boshqarish` bo'limida:

- kitoblar sahifalangan ro'yxatda ko'rsatiladi;
- ID, nom yoki muallif bo'yicha qidiriladi;
- barcha nomlar, muallif, yil, sahifalar soni, kategoriya va tavsiflar tahrirlanadi;
- PDF va muqova alohida almashtiriladi;
- delete alohida tasdiqdan keyin bajariladi va D1 yozuvi bilan birga R2 fayllari
  ham o'chiriladi.

## Fayl limitlari

Telegram Bot API orqali yuklab olinadigan PDF uchun standart limit 19 MB.
Muqova JPG, PNG yoki WEBP bo'lishi va 8 MB dan oshmasligi kerak.

## D1 migratsiyalari

Yangi production baza uchun:

```bash
npm run db:telegram:remote
npm run db:telegram-preview:remote
npm run db:telegram-crud:remote
```

Mavjud production bazada dastlabki ikki migratsiya bajarilgan bo'lsa, faqat:

```bash
npm run db:telegram-crud:remote
```

Migratsiyalar mavjud kitoblarni o'chirmaydi.

## Cloudflare secrets

Cloudflare Dashboard -> Workers & Pages -> `ustoz-library` -> Settings ->
Environment variables bo'limida:

```text
TELEGRAM_BOT_TOKEN=<BotFather tokeni>
TELEGRAM_WEBHOOK_SECRET=<uzun tasodifiy satr>
TELEGRAM_ALLOWED_USER_IDS=<vergul bilan ajratilgan Telegram ID lar>
TELEGRAM_OWNER_ID=5252931517
AI_METADATA_PROVIDER=anthropic
ANTHROPIC_API_KEY=<secret>
ANTHROPIC_METADATA_MODEL=claude-haiku-4-5
PUBLIC_SITE_URL=https://dl-library.uz
```

`ANTHROPIC_API_KEY` oddiy variable emas, Cloudflare encrypted secret sifatida
saqlanishi kerak. Kalit kodga yoki Git repositoryga yozilmaydi.

## Boshqa AI providerlar

Provider adapterlari saqlangan. `AI_METADATA_PROVIDER` qiymatini va tegishli secret/model
qiymatlarini almashtirish kifoya:

```text
AI_METADATA_PROVIDER=openrouter
OPENROUTER_API_KEY=<secret>
OPENROUTER_METADATA_MODEL=<model>
```

```text
AI_METADATA_PROVIDER=openai
OPENAI_API_KEY=<secret>
OPENAI_METADATA_MODEL=<model>
```

```text
AI_METADATA_PROVIDER=gemini
GEMINI_API_KEY=<secret>
GEMINI_METADATA_MODEL=<model>
```

Har bir provider text layer mavjud bo'lsa PDF faylini yubormaydi.

## Lokal tekshirish

```bash
npm run db:telegram:local
npm run db:telegram-preview:local
npm run db:telegram-crud:local
npm test
npm run dev
```

Real Telegram webhook public HTTPS manzil talab qiladi. Production webhook:
`POST /api/telegram`.
