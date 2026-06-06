# DL-library.uz — Cloudflare'ga o'rnatish qo'llanmasi

Statik sayt endi **to'liq backend + admin panelli** ilovaga aylantirildi:

| Qatlam | Texnologiya |
|--------|-------------|
| Frontend (sayt + admin) | Cloudflare **Pages** (`public/`) |
| Backend API | Cloudflare **Pages Functions** (`functions/`) |
| Kitoblar bazasi | Cloudflare **D1** (SQLite) |
| Fayllar (PDF, muqova) | Cloudflare **R2** |
| Admin login | Imzolangan cookie (oddiy parol) |
| QR kod | Avtomatik (kitob havolasidan) |

---

## 0. Talablar

- Node.js 18+ (sizda 24 ✅)
- Cloudflare akkaunti (bepul reja yetarli)

```bash
npm install
npx wrangler login        # brauzerda Cloudflare'ga kirish
```

> Eslatma: bu buyruqni terminalda o'zingiz bajaring (brauzer ochiladi).
> Claude Code ichida: `! npx wrangler login`

---

## 1. D1 bazasini yaratish

```bash
npx wrangler d1 create ustoz-library-db
```

Buyruq bergan `database_id` ni **`wrangler.toml`** ichidagi
`REPLACE_WITH_D1_DATABASE_ID` o'rniga yozing.

So'ng jadvalni yarating:

```bash
# Lokal (sinov uchun):
npm run db:init:local
# Haqiqiy Cloudflare uchun:
npm run db:init:remote
```

## 2. R2 bucket yaratish

```bash
npx wrangler r2 bucket create ustoz-library-files
```

## 3. Maxfiy qiymatlar (secrets)

`.dev.vars.example` ni nusxalab **`.dev.vars`** yarating (lokal uchun):

```
ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "KuchliParol123!"
SESSION_SECRET = "uzun-tasodifiy-satr"
```

`SESSION_SECRET` uchun tasodifiy satr: `node -e "console.log(crypto.randomUUID()+crypto.randomUUID())"`

---

## 4. Lokal sinov

```bash
npm run dev
```

Brauzerda: `http://localhost:8788` (sayt) va `http://localhost:8788/admin` (panel).

Mavjud 7 kitobni lokal bazaga ko'chirish:

```bash
npm run migrate:local
```

---

## 5. Cloudflare'ga deploy

### A) Tez yo'l — buyruq orqali

```bash
npm run deploy           # public/ ni Pages'ga yuklaydi
```

Birinchi marta loyiha nomi so'raladi (masalan `ustoz-library`).

### B) GitHub orqali (tavsiya — har push'da avtomatik deploy)

1. Cloudflare dashboard → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**
2. `oybekjohn/Ustoz-Library` repozitoriysini tanlang
3. Build sozlamalari:
   - **Build command:** (bo'sh qoldiring)
   - **Build output directory:** `public`
4. **Settings → Functions → Bindings:**
   - D1 binding: nomi `DB` → `ustoz-library-db`
   - R2 binding: nomi `BUCKET` → `ustoz-library-files`
5. **Settings → Environment variables (Production)** ga *Secret* sifatida:
   - `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `SESSION_SECRET`

### Haqiqiy bazaga migratsiya (bir marta)

```bash
npm run db:init:remote     # jadval (agar hali yaratilmagan bo'lsa)
npm run migrate:remote     # 7 kitobni R2 + D1 ga yuklaydi
```

---

## 6. Ishlatish

- **Sayt:** `https://<loyiha>.pages.dev/`
- **Admin:** `https://<loyiha>.pages.dev/admin`
  - Login/parol = `ADMIN_USERNAME` / `ADMIN_PASSWORD`
  - Kitob qo'shish: maydonlarni to'ldiring, PDF va muqovani tanlang, **Saqlash**.
  - QR kod avtomatik hosil bo'ladi (kitob sahifasiga havola).

---

## Loyiha tuzilishi

```
public/                 # Pages static output
  index.html            # sayt
  css/ js/ pictures/
  admin/                # admin panel (index.html, admin.js, admin.css)
functions/              # backend API (Pages Functions)
  _lib/                 # auth.js, http.js (yordamchilar)
  api/
    auth/               # login, logout, me
    books/              # ro'yxat, yaratish, tahrirlash, o'chirish
    upload.js           # R2 ga fayl yuklash
  files/[[path]].js     # R2 dan fayl uzatish
schema.sql              # D1 jadvali
wrangler.toml           # Cloudflare konfiguratsiyasi
scripts/migrate.mjs     # eski kitoblarni ko'chirish
books/ books.json       # migratsiya manbasi (deploy qilinmaydi)
```

## API qisqacha

| Method | Yo'l | Kirish | Tavsif |
|--------|------|--------|--------|
| GET | `/api/books` | ommaviy | Barcha kitoblar |
| GET | `/api/books/:id` | ommaviy | Bitta kitob |
| POST | `/api/books` | admin | Yangi kitob |
| PUT | `/api/books/:id` | admin | Tahrirlash |
| DELETE | `/api/books/:id` | admin | O'chirish |
| POST | `/api/upload` | admin | R2 ga fayl (pdf/cover) |
| GET | `/files/:key` | ommaviy | R2 fayli |
| POST | `/api/auth/login` · `logout` · GET `me` | — | Sessiya |
