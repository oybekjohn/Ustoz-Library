# Ertalab bajariladigan ishlar (2026-08-08)

Tunda qilingan ishlar production'ga chiqdi va **sayt to'liq ishlayapti**.
Quyidagi 2 ta ish sizning parolingiz/ruxsatingizni talab qilgani uchun
qolib ketdi. Ikkalasi ham majburiy emas — sayt ularsiz ham ishlayapti.

---

## 1. D1 migratsiyasi (5 daqiqa) — TAVSIYA ETILADI

**Muammo:** GitHub Actions'dagi `CLOUDFLARE_API_TOKEN` secret'ida faqat
Pages deploy ruxsati bor, D1 yozish ruxsati yo'q. Shu sababli
`migrations/0008_catalog_v4.sql` production bazasiga qo'llanmadi
(xato: `Authentication error [code: 10000]`).

**Hozirgi holat:** Kod bunga tayyor — `books.archived` ustuni bo'lmasa,
avtomatik eski so'rovga qaytadi. Sayt normal ishlayapti. Faqat 2 narsa
kutmoqda: kitob arxivlash imkoniyati va login brute-force himoyasining
D1 qismi (xotiradagi rate limit allaqachon ishlayapti).

**Yechim — variant A (eng oson, terminalda):**

```bash
npx wrangler login
```

Brauzer ochiladi → Cloudflare'ga kiring → "Allow" bosing. So'ng:

```bash
npm run db:v4:remote
```

**Yechim — variant B (GitHub token'ni tuzatish, bir marta):**

1. https://dash.cloudflare.com/profile/api-tokens → **Create Token**
2. "Edit Cloudflare Workers" shablonini tanlang, unga qo'shimcha ravishda
   **D1 → Edit** ruxsatini qo'shing.
3. Yaratilgan tokenni nusxalang.
4. https://github.com/oybekjohn/Ustoz-Library/settings/secrets/actions →
   `CLOUDFLARE_API_TOKEN` → **Update** → yangi tokenni qo'ying.

Shundan keyin har deploy'da migratsiyalar avtomatik qo'llanadi.

---

## 2. Kitoblar katalogini yangilash (ixtiyoriy)

**Hozir:** Production'da eski **151 ta kitob** ko'rinib turibdi (hammasi
joyida, hech narsa yo'qolmagan).

**Agar** `books.json` dagi yangi 14 talik katalogga o'tmoqchi bo'lsangiz
(eski 151 tasi o'chmaydi, faqat arxivga tushadi):

```bash
npm run catalog:sync:remote
```

⚠️ Buni **faqat 1-qadamdagi migratsiyadan keyin** ishga tushiring
(`archived` ustuni kerak).

Keyinchalik fikringiz o'zgarsa, orqaga qaytarish oson — bitta SQL:
`UPDATE books SET archived = 0;`

---

## 3. Cloudflare dashboard xavfsizlik sozlamalari (5 daqiqa, tavsiya)

Bular kod bilan yoqilmaydi — dashboard'dan bosiladi:

1. **Security → Bots → Bot Fight Mode: ON** (bepul, botlarni to'sadi)
2. **Security → WAF → Rate limiting rules** → yangi qoida:
   `URI Path contains /api/` → 100 so'rov / 1 daqiqa / IP → **Block**
3. **SSL/TLS → Overview → Full (strict)** rejimini tekshiring

Batafsil: [docs/SECURITY.md](./docs/SECURITY.md)

---

## Nima ishlayapti (tekshirilgan)

| Bo'lim | Holat |
|---|---|
| Kitoblar gridi | ✅ 12 tadan, QR kodlar, 13 sahifa (151 kitob) |
| Google login tugmasi | ✅ "Bu funksiya hali mavjud emas" toast |
| Taqdimotlar | ✅ PDF.js viewer, 9 slayd, progress saqlanadi |
| Videolar | ✅ YouTube thumbnail + zamonaviy pleyer |
| Testlar | ✅ 20 savol, taymer, darhol javob feedback |
| Mobil (375px) | ✅ gorizontal scroll yo'q, pastki nav ishlaydi |
| Xavfsizlik headerlari | ✅ CSP, HSTS, X-Frame-Options |
| Unit testlar | ✅ 41/41 |
