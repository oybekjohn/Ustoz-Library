# Zaxira nusxa va tiklash qo'llanmasi

Oxirgi tekshiruv: 2026-08-09 — zaxira olindi, R2 ga yuklandi va qaytarib
o'qildi (517 KB, 19 jadval, 158 kitob).

---

## Nima zaxiralanadi

| Nima | Zaxira | Qayerda |
|---|---|---|
| Baza (kitoblar, testlar, savollar, taqdimotlar) | ✅ Har kuni | R2 `backups/` + kompyuteringiz |
| Kod | ✅ Doim | GitHub |
| Fayllar (PDF, muqovalar) | ⚠️ Qisman | R2 da asl nusxa; kalitlari baza zaxirasida |

**Fayllar haqida:** PDF fayllarning o'zi alohida zaxiralanmaydi (juda katta).
Lekin baza zaxirasida har bir faylning kalitini saqlaymiz — ya'ni nima
yo'qolganini har doim aniqlash mumkin. Asl PDF fayllar sizning
kompyuteringizda ham turishi kerak.

---

## Zaxira olish

### Avtomatik (har kuni)

GitHub Actions har kuni Toshkent vaqti bilan ~06:00 da zaxira oladi.
Holatini ko'rish: **GitHub → Actions → "Kunlik zaxira nusxa"**.

### Qo'lda (istalgan vaqtda)

```bash
npm run backup
```

Bu:
1. Bazani to'liq eksport qiladi
2. Ma'lumot borligini tekshiradi (bo'sh fayl saqlanmaydi)
3. R2 ga yuklaydi: `backups/YYYY-MM-DD/baza.sql`
4. Kompyuterdagi 30 kundan eski nusxalarni tozalaydi

Faqat kompyuterga saqlash (R2 ga yuklamasdan):

```bash
npm run backup -- --local
```

Fayl `backups/` papkasida paydo bo'ladi.

---

## ⚠️ Muhim: zaxirani ochiq joyga qo'ymang

Zaxira faylida **shaxsiy ma'lumotlar** bor:
- Telegram foydalanuvchi ID lari va ismlari
- IP manzillar (rate limit jadvalida)

Shuning uchun:
- `backups/` papkasi `.gitignore` da — git'ga tushmaydi
- GitHub Actions artifact sifatida ham saqlanmaydi (repo ochiq)
- R2 yopiq — faqat siz kira olasiz

Agar zaxirani boshqa joyga ko'chirsangiz (Google Drive, tashqi disk),
uni **shaxsiy papkada** saqlang.

---

## Zaxiradan tiklash

### 1-holat: bitta jadval yoki bir nechta yozuv yo'qolgan

Zaxira faylini oching, kerakli `INSERT` qatorlarini toping va qo'lda
bajaring:

```bash
npx wrangler d1 execute ustoz-library-db --remote --command "INSERT INTO books ..."
```

### 2-holat: butun baza yo'qolgan yoki buzilgan

```bash
# 1. Eng oxirgi zaxirani R2 dan oling
npx wrangler r2 object get ustoz-library-files/backups/2026-08-09/baza.sql \
  --file tiklash.sql --remote

# 2. Bazaga qaytaring
npx wrangler d1 execute ustoz-library-db --remote --file=tiklash.sql

# 3. Tekshiring
npx wrangler d1 execute ustoz-library-db --remote \
  --command "SELECT COUNT(*) FROM books"
```

> ⚠️ Tiklashdan oldin **joriy holatni ham zaxiralang** (`npm run backup`) —
> aks holda tiklash noto'g'ri chiqsa orqaga qaytolmaysiz.

### 3-holat: Cloudflare akkaunti butunlay yo'qolgan

Bu eng og'ir holat. Kerak bo'ladi:
1. Yangi Cloudflare akkaunt
2. Yangi D1 baza va R2 bucket yaratish (`DEPLOY.md` ga qarang)
3. Oxirgi zaxirani yangi bazaga yuklash
4. PDF fayllarni kompyuteringizdagi nusxadan qayta yuklash
   (`npm run catalog:sync:remote`)

**Shuning uchun:** oyda kamida bir marta `npm run backup` ni qo'lda ishga
tushirib, chiqqan faylni Cloudflare'dan **tashqarida** (kompyuteringiz,
tashqi disk yoki Google Drive) saqlab qo'ying.

---

## Zaxira ishlayotganini tekshirish

Oyda bir marta shuni qiling — zaxira "bor" bo'lishi yetarli emas, u
**tiklanishi** ham kerak:

```bash
# Eng oxirgi zaxirani R2 dan olib ko'ring
npx wrangler r2 object get ustoz-library-files/backups/YYYY-MM-DD/baza.sql \
  --file tekshiruv.sql --remote

# Ichida kitoblar borligini tasdiqlang
grep -c "INSERT INTO \"books\"" tekshiruv.sql
```

158 ga yaqin son chiqsa — zaxira sog'lom.

---

## Agar avtomatik zaxira ishlamasa

GitHub Actions'dagi `CLOUDFLARE_API_TOKEN` da D1 o'qish va R2 yozish
ruxsati bo'lishi kerak. Hozirgi tokenda D1 yozish ruxsati yo'qligi
ma'lum (migratsiyalar shu sababli qo'lda qilinadi) — zaxira uchun
o'qish yetarli, lekin ishlamasa tokenni yangilash kerak:

1. https://dash.cloudflare.com/profile/api-tokens → **Create Token**
2. Ruxsatlar: **D1 → Read**, **Workers R2 Storage → Edit**, **Pages → Edit**
3. GitHub → Settings → Secrets → `CLOUDFLARE_API_TOKEN` ni yangilang

Token yangilanmaguncha **oyda bir marta qo'lda** `npm run backup` qiling —
bu ham yetarli himoya.
