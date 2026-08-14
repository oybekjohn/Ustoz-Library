# DL-Library — Claude uchun ish qoidalari

Bu fayl har bir sessiyada avtomatik o'qiladi. Maqsad: **sifatni pasaytirmasdan
token sarfini kamaytirish** va kontekst oynasi to'lib qolmasligi.

Loyiha holati: [plan_done.md](./plan_done.md) · Fayllar xaritasi:
[docs/KOD-TUZILISHI.md](./docs/KOD-TUZILISHI.md)

---

## 1. Modellarni taqsimlash

Har bir ish uchun mos model tanlanadi. Og'ir ishga arzon model — sifat tushadi;
yengil ishga qimmat model — pul isrof bo'ladi.

| Ish turi | Model | Nega |
|---|---|---|
| Arxitektura qarorlari, xavfsizlik, nozik xatolarni tuzatish, baza/production'ga tegadigan ish, yakuniy tekshiruv | **Opus 5** (asosiy sessiya) | Xato qimmatga tushadi |
| Aniq spetsifikatsiya bo'yicha kod yozish, test yozish, chegarasi aniq refaktoring | **Sonnet** (`subagent_type: general-purpose`, `model: sonnet`) | Yetarli sifat, arzonroq |
| Fayl qidirish, nom almashtirish, hujjat jadvali tuzish, loglarni ko'rish, formatlash | **Haiku** (`model: haiku`) | Mexanik ish, aql talab qilmaydi |

**Subagentning asosiy foydasi:** uning butun ishi *o'z* kontekstida ketadi,
menga faqat qisqa xulosa qaytadi. Ya'ni 20 ta faylni ko'rib chiqish menga
20 ta faylni emas, bir abzats xulosani beradi.

### Qachon subagentga bermaslik kerak

- Ish 1-2 ta fayl bilan cheklangan bo'lsa — o'zim tezroq qilaman
- Kontekst muhim bo'lsa (avvalgi muhokamalarga tayanadigan ish)
- Production'ga yoki bazaga o'zgartirish kiritadigan ish

---

## 2. Kontekstni tejash qoidalari

Bu sessiyada kontekst nimadan to'lgani aniqlangan. Sabablari va yechimlari:

### ❌ Eng katta sabab: fayllarni skript bilan o'zgartirish

`npm run stamp` 4 ta faylni qayta yozadi va har biri **to'liq** kontekstga
tushadi (`index.html` 342 qator, `app.js` 793 qator...). Bu 4 marta
takrorlangan — mingdan ortiq qator behuda.

**Qoida:** `npm run stamp` faqat **reliz oldidan bir marta**, commit qilishdan
oldin ishga tushiriladi. Ish jarayonida emas.

### ❌ Katta fayllarni to'liq o'qish

`style.css` 3267 qator, `telegram.js` 1342 qator. Ularni to'liq o'qish shart emas.

**Qoida:**
- Avval `grep -n` bilan kerakli joyni top, keyin `Read` ga `offset`+`limit` ber
- Butun faylni faqat qayta yozayotganda o'qi

### ❌ Bir xil tekshiruvni qayta-qayta bajarish

Bu sessiyada kontrast o'lchovi ~8 marta ishga tushdi, har biri katta JSON qaytardi.

**Qoida:** bitta tekshiruvda hamma narsani o'lchab, **qisqa** natija qaytar.
`JSON.stringify(x, null, 1)` o'rniga faqat muhim raqamlarni chiqar.

### ❌ Uzun buyruq natijalari

**Qoida:** `| tail -5`, `| grep -E "..."`, `| head -20` bilan cheklab qo'y.
Masalan `npm test 2>&1 | grep -E "^ℹ (tests|pass|fail)"` — 3 qator yetadi.

### ❌ Eskirgan vazifalar ro'yxati

Tugagan vazifalar har bir chaqiruvda qayta yuklanadi.

**Qoida:** bosqich tugagach, vazifalarni `status: deleted` bilan o'chir.
Ro'yxatda 10 tadan ko'p vazifa turmasin.

---

## 3. Ish tartibi (har doim)

1. **Rejani ayt** — uzun ishdan oldin qisqacha nima qilishimni yozaman
2. **Aniq savol bor bo'lsa boshida so'rayman**, keyin to'xtamasdan bajaraman
3. **Tekshirmasdan "bajarildi" demayman** — o'lchov yoki test natijasi bilan
4. **Xato qilsam ochiq aytaman**, yashirmayman

---

## 4. Bu loyihadagi tuzoqlar (allaqachon vaqt yegan)

| Tuzoq | Nima qilish kerak |
|---|---|
| Cloudflare Pages `_headers` dagi qisqa `max-age` ni e'tiborga olmaydi | Har relizda versiyani oshirib `npm run stamp` |
| GitHub'dagi Cloudflare token'da D1 yozish ruxsati yo'q | Migratsiyalarni qo'lda ishga tushirish |
| Repo **ochiq (public)** | Zaxira, IP, Telegram ID hech qachon commit qilinmaydi |
| Brauzer paneli yashirin ishlaydi | CSS `transition` qotib qoladi — rang o'lchashdan oldin `transition:none` qo'y. Canvas render va FPS bu yerda o'lchanmaydi |
| Fon animatsiyasidagi "sprite" optimizatsiyasi | Sinab ko'rilgan, gradientdan sekinroq — qayta urinma |

---

## 5. Reliz tartibi

```bash
npm test                                  # 47 ta test o'tishi shart
# package.json da versiyani oshiring
npm run stamp                             # BIR MARTA, shu yerda
git add -A && git commit && git push origin master
```

Baza sxemasi o'zgarsa: avval migratsiya (`--remote`), keyin kod push.

Zaxira: `npm run backup` — oyda kamida bir marta qo'lda ham.
