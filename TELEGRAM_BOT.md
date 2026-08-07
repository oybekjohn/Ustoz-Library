# DL-Library Telegram bot qo'llanmasi

Bot orqali kutubxona materiallari (kitob, taqdimot, video, test) to'g'ridan-
to'g'ri serverga yuklanadi va boshqariladi.

## Rollar

- **Owner** (`TELEGRAM_OWNER_ID`): barcha imkoniyatlar — material qo'shish,
  ro'yxatlar, tahrirlash, o'chirish, publish/unpublish, adminlarni boshqarish.
- **Admin** (owner tomonidan qo'shiladi): material qo'shish.

Botga faqat ruxsat berilgan foydalanuvchilar kira oladi.

## Sozlash

1. BotFather'dan token oling → `TELEGRAM_BOT_TOKEN` secretiga qo'ying.
2. `TELEGRAM_WEBHOOK_SECRET` uchun tasodifiy satr yarating.
3. `TELEGRAM_OWNER_ID` — o'z Telegram user ID raqamingiz.
4. Webhook o'rnatish: `npm run telegram:webhook`

## Material qo'shish

**Menyu**: `Material qo'shish` → tur tanlanadi:

| Tur | Oqim |
|---|---|
| 📚 Kitob (PDF) | kategoriya → PDF → AI metadata + preview → muqova → tasdiqlash |
| 📊 Prezentatsiya | kategoriya → PDF/PPT/PPTX fayl → sarlavha → tavsif → saytga chiqadi |
| 🎥 Video dars | kategoriya → YouTube havola → sarlavha → tavsif → saytga chiqadi |
| 📝 Test | kategoriya → .txt fayl (quyidagi format) → sarlavha → tavsif → saytga chiqadi |

Taqdimot/video/test darhol `published = 1` holatda saytga chiqadi.
Fayl hajmi limiti: `TELEGRAM_MAX_PDF_MB` (standart 19 MB — Telegram bot API
20 MB dan katta faylni bermaydi).

### Test .txt formati (UTF-8)

```text
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

- `+++++` (kamida 5 ta plyus) — savollarni ajratadi.
- `====` qatorlari — vizual ajratgich, e'tiborga olinmaydi.
- `#` bilan boshlangan variant — to'g'ri javob (aynan 1 ta bo'lishi shart).
- Har savolda kamida 2 ta variant bo'lishi kerak.
- Xato bo'lsa bot qaysi savolda muammo borligini aytadi.

## Materiallarni boshqarish (faqat owner)

**Menyu**: `Materiallarni boshqarish` → tur tanlanadi → ro'yxat:

- ✅ / 🚫 — saytda ko'rinadi / yashirilgan
- Element ustiga bosib: **publish/unpublish**, **o'chirish** (tasdiqlash
  bilan; fayllari R2 dan ham o'chadi), kitoblarda qo'shimcha: tahrirlash,
  PDF/muqova almashtirish, qidiruv.

## Adminlarni boshqarish (faqat owner)

`Adminlar` menyusi: qo'shish / o'chirish / ro'yxat (Telegram user ID bo'yicha).
