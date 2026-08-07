# DL-library.uz — Cloudflare deploy qo'llanmasi

| Qatlam | Texnologiya |
|--------|-------------|
| Frontend (sayt + admin) | Cloudflare **Pages** (`public/`) |
| Backend API | Cloudflare **Pages Functions** (`functions/`) |
| Baza | Cloudflare **D1** (`ustoz-library-db`) |
| Fayllar (PDF, muqova) | Cloudflare **R2** (`ustoz-library-files`) |

Production: **https://dl-library.uz** — `master` branchga har push avtomatik
deploy bo'ladi (GitHub integratsiyasi).

---

## 1. Birinchi marta sozlash (yangi muhit uchun)

```bash
npm install
npx wrangler login
npx wrangler d1 create ustoz-library-db      # id ni wrangler.toml ga yozing
npx wrangler r2 bucket create ustoz-library-files
```

Secrets: `.dev.vars.example` ni `.dev.vars` deb nusxalang (lokal) va Cloudflare
dashboard > Pages > Settings > Environment variables ga qo'ying (production).

`SESSION_SECRET` uchun: `node -e "console.log(crypto.randomUUID()+crypto.randomUUID())"`

## 2. Baza migratsiyalari

> ⚠️ **MUHIM**: `schema.sql` faqat YANGI (bo'sh) baza uchun. Productionda
> ma'lumot bor — u yerda faqat `migrations/` fayllari ishlatiladi.
> Barcha migratsiyalar qo'shuvchi (additive), ma'lumotni o'chirmaydi.

```bash
# Yangi bo'sh baza (lokal):
npm run db:init:local

# Mavjud bazani bosqichma-bosqich yangilash:
npm run db:learning:local     # 0005 — o'quv platformasi jadvallari
npm run db:v4:local           # 0008 — archived ustuni + rate_limits

# Production (mavjud baza):
npm run db:v4:remote
```

## 3. Kitoblar katalogini production bilan sinxronlash

`books.json` dagi katalogni productionga chiqarish (yo'qotishsiz — eski
kitoblar o'chirilmaydi, `archived = 1` bo'ladi):

```bash
npm run catalog:sync:remote
```

Skript avval PDF/muqova fayllarni R2 ga yuklaydi, so'ng D1 da eski kitoblarni
arxivlab, yangilarini qo'shadi. Qayta ishga tushirish xavfsiz (idempotent).

## 4. Lokal ishlash

```bash
npm run dev        # http://localhost:8788 (sayt), /admin (panel)
npm test           # unit testlar
```

## 5. Production deploy

`master` ga push qiling — Cloudflare Pages avtomatik build va deploy qiladi:

```bash
git push origin master
```

Deploy holati: Cloudflare dashboard → Workers & Pages → ustoz-library →
Deployments.

**Tartib muhim**: sxema o'zgargan relizlarda avval `npm run db:v4:remote`
(migratsiya), keyin `git push` (kod) — eski kod yangi ustunlarga zarar
qilmaydi, yangi kod esa ustunlar tayyor bo'lishini kutadi.

## 6. Telegram webhook

Bot tokeni o'zgarganda yoki birinchi sozlashda:

```bash
npm run telegram:webhook
```

## API qisqacha

| Method | Yo'l | Kirish | Tavsif |
|--------|------|--------|--------|
| GET | `/api/books` | ommaviy | Faol kitoblar |
| POST/PUT/DELETE | `/api/books[...]` | admin | Kitob CRUD |
| GET | `/api/presentations` | ommaviy | Nashr etilgan taqdimotlar |
| POST/PUT/DELETE | `/api/presentations[...]` | admin | Taqdimot CRUD |
| GET | `/api/videos` | ommaviy | Nashr etilgan videolar |
| POST/PUT/DELETE | `/api/videos[...]` | admin | Video CRUD |
| GET | `/api/tests` | ommaviy | Nashr etilgan testlar |
| GET | `/api/tests/quiz/:id` | ommaviy | Tasodifiy 20 savol (o'quv rejimi) |
| POST | `/api/tests` · `/api/tests/parse` | admin | Test yaratish / TXT tahlil |
| POST | `/api/upload` | admin | R2 ga fayl yuklash |
| GET | `/files/:key` | ommaviy | R2 fayllari (allowlist prefikslar) |
| POST | `/api/telegram` | webhook secret | Telegram bot webhook |
