# Holat va qo'lda bajariladigan ishlar

Oxirgi yangilanish: 2026-08-08, v5.0.0 production'da.

---

## Sizdan kutilayotgan yagona ish (5 daqiqa)

**Cloudflare dashboard xavfsizlik sozlamalari** — bular kod bilan yoqilmaydi:

1. **Security → Bots → Bot Fight Mode: ON** (bepul, botlarni to'sadi)
2. **Security → WAF → Rate limiting rules** → yangi qoida:
   `URI Path contains /api/` → 100 so'rov / 1 daqiqa / IP → **Block**
3. **SSL/TLS → Overview → Full (strict)** tanlanganini tekshiring

Batafsil: [docs/SECURITY.md](./docs/SECURITY.md)

---

## Avval kutilayotgan, endi bajarilgan ishlar

| Ish | Holat |
|---|---|
| D1 migratsiyasi 0008 (`books.archived`, `rate_limits`) | ✅ Production'ga qo'llandi |
| Claude AI ulanishi | ✅ OpenRouter orqali `anthropic/claude-haiku-4.5` |
| `AI_METADATA_PROVIDER`, `OPENROUTER_METADATA_MODEL`, `TELEGRAM_OWNER_ID` | ✅ Production secretlariga qo'yildi |
| npm zaifliklari (6 ta) | ✅ wrangler 4.120.0 → 0 ta zaiflik |

---

## Telegram bot — qanday ishlatiladi

`/start` bosing, so'ng bo'limni tanlang. **Bo'lim tanlangach ketma-ket
material yuboraverasiz** — har safar qayta tanlash shart emas.

| Bo'lim | Nima qilasiz | Tizim nima qiladi |
|---|---|---|
| 📚 Kitoblar | Kategoriya tanlab PDF yuborasiz | AI ma'lumot tayyorlaydi, siz muqova yuborib tasdiqlaysiz |
| 📊 Taqdimotlar | Faqat faylni yuborasiz (PDF/PPT/PPTX) | Sarlavha, tavsif, kategoriya — hammasi avtomatik. 1-sahifa muqova bo'ladi. Tasdiqlash so'ralmaydi |
| 🎥 Videolar | Faqat YouTube havolasini yuborasiz | Uch tilli nom va tavsif avtomatik. Takroriy havola qabul qilinmaydi |
| 📝 Testlar | Savollarni yuborasiz (.txt yoki matn) | Faqat mavzu nomini so'raydi, qolganini o'zi yozadi |

Boshqa bo'limga o'tish: asosiy menyudan tanlang yoki "🔄 Boshqa bo'limga o'tish".
Materiallarni boshqarish (yashirish/o'chirish): bo'lim ochilganda
"⚙️ Ro'yxat va boshqaruv" tugmasi (faqat owner uchun).

---

## Admin panel — AI yordamchisi

`/admin` da yuqori o'ng burchakda **"✨ AI bilan qo'shish"** tugmasi:

- **Yoqilgan** (standart): har bo'limda AI bloki chiqadi. PDF tanlaysiz /
  YouTube havolasini qo'yasiz / mavzu nomini yozasiz → "✨ Ma'lumotlarni
  tayyorlash" → formalar avtomatik to'ladi → siz tekshirib **Saqlash** bosasiz.
- **O'chirilgan**: AI bloklari yashiriladi, hech qanday AI so'rovi
  yuborilmaydi, hamma maydon qo'lda to'ldiriladi.

Tanlov brauzerda eslab qolinadi.

---

## Reliz qilish tartibi (kelajakda kerak bo'ladi)

Kod o'zgargach:

```bash
npm test
npm version patch --no-git-tag-version   # yoki minor/major
npm run stamp                            # asset versiyalarini yangilaydi
git add -A && git commit -m "..." && git push origin master
```

`npm run stamp` muhim: Cloudflare Pages fayllarni 4 soat keshlaydi va
`_headers` dagi qisqaroq qiymatni e'tiborga olmaydi. Versiya qo'yilmasa
foydalanuvchilarda eski va yangi kod aralashib qolishi mumkin.

Baza sxemasi o'zgarsa: avval `npm run db:v4:remote` (yoki yangi migratsiya),
keyin `git push`.
