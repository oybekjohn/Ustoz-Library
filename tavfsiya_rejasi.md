# Ustoz tavsiyalari — tahlil va amalga oshirish rejasi

**Sana:** 2026-08-08 · **Sayt versiyasi:** 6.0.0 · **Holat:** muhokama uchun, kodga hali tegilmagan

Bu hujjat ustozning har bir tavsiyasini saytning **hozirgi haqiqiy holati**
bilan solishtiradi. Har bir band uchun: hozir qanday, nima qilish kerak,
qancha vaqt oladi va nima to'siq bo'lishi mumkin.

Tekshiruv usuli: saytning o'zida (dl-library.uz) o'lchov o'tkazildi va
production bazasidan so'rovlar olindi — taxmin emas, aniq raqamlar.

---

## QISQACHA XULOSA

| # | Tavsiya | Hozirgi holat | Xulosa |
|---|---|---|---|
| 1 | Kitob nomlari yarim ko'rinadi | ✅ **Tasdiqlandi** — 2 qatordan keyin kesiladi | Tuzatamiz |
| 2 | "ai" → "Sun'iy intellekt" | ✅ **Allaqachon tuzatilgan** (v5.0.0) | Ustoz eski versiyani ko'rgan |
| 3 | "it" → "IT" | ✅ **Allaqachon tuzatilgan** (v5.0.0) | Ustoz eski versiyani ko'rgan |
| 4 | Bo'lim nomlari bold + katta harf | Hozir: 600 qalinlik, oddiy harf | Tuzatamiz (savol bor) |
| 5 | 3 ta yangi bo'lim qo'shish | Kategoriya sifatida bor, lekin **bo'sh** | Qaror kerak |
| 6 | AI-agentlar bo'limi mazmuni | Yo'q | **Aniqlik kerak** |
| 7 | SI-o'qish bo'limi mazmuni | Yo'q | Qilsa bo'ladi |
| 8 | Fan dasturlari bo'limi | Kategoriya bor, 0 ta material | Qilsa bo'ladi |
| 9 | Fanlar kesimida tashkil qilish | Yo'q — faqat kategoriya bor | Qilsa bo'ladi |
| 10 | Shriftlar hira | ✅ **Tasdiqlandi** — kontrast 3.12 (talab 4.5) | Tuzatamiz |
| 11 | Bo'lim ranglari yorqinroq | Xuddi shu muammo | Tuzatamiz |
| 12 | Zaxira nusxa saqlash | ❌ **Yo'q** — jiddiy xavf | Qilamiz |
| — | Test natijalarini saqlash | ⚠️ Faqat brauzerda | **Google login kerak** |

---

## 1-GURUH: DIZAYN TUZATISHLARI

Bular tez, xavfsiz va bir kunda bajariladi. Kontent talab qilmaydi.

### 1.1. Kitob nomlari kesilmoqda (1-band) ✅ tasdiqlandi

**O'lchov:** kartochkada nom uchun 47px joy ajratilgan, lekin uzun nomlarga
94px kerak. `-webkit-line-clamp: 2` qoidasi 2 qatordan keyin kesib tashlaydi.

Misol: *"Shaxsiy kompyuterda ishlashni o'rganing: ShK da ishlash..."* — yarmi ko'rinmaydi.

**Yechim variantlari:**

| Variant | Ijobiy | Salbiy |
|---|---|---|
| A) 3 qatorga oshirish | Ko'pchilik nom to'liq sig'adi | Juda uzun nomlar baribir kesiladi |
| B) To'liq ko'rsatish | Hech narsa yashirilmaydi | Kartochkalar turli balandlikda, grid buziladi |
| C) 3 qator + sichqoncha tutilganda to'liq | Chiroyli va to'liq | Telefonda "sichqoncha tutish" yo'q |
| **D) 3 qator + nom bosilsa kitob ochiladi** | Grid tekis, nom bosiladi | — |

**Tavsiyam: A + D** — 3 qatorga oshiramiz va kartochka balandligini
tenglashtiramiz. Nomni bosish allaqachon kitobni ochadi.

**Vaqt:** 1 soat.

### 1.2. "ai" va "it" yozuvlari (2, 3-band) — allaqachon bajarilgan

Saytni tekshirdim, hozir shunday ko'rinadi:

```
💻 IT              🤖 Sun'iy intellekt      📈 Iqtisodiyot
💼 Biznes va Tadbirkorlik                   💊 Salomatlik va Kosmetika
🌱 Bog'dorchilik   📋 Fan dasturlari        🎓 SI darslar
🧠 SI agentlar     📚 Boshqa
```

Bu 5-avgustdagi versiyada kichik harfda (`ai`, `it`) chiqardi — 8-avgustda
tuzatilgan. Ustoz saytni undan oldin ko'rgan bo'lishi mumkin.

**Ammo aniqlashtirish kerak:** hozir `SI darslar` va `SI agentlar` deb
yozilgan. Ustoz `AI-agentlar` va `SI-o'qish` deb nomlashni taklif qilyapti.
Nomlashda birxillik kerak: yo hamma joyda **SI**, yo hamma joyda **AI**.

### 1.3. Shriftlar hira ko'rinadi (10, 11-band) ✅ tasdiqlandi

Bu ustozning eng asosli e'tirozi. Kontrast nisbatini o'lchadim:

| Element | Rang | Kontrast | Talab | Natija |
|---|---|---|---|---|
| Kitob muallifi | `#8888aa` | 3.42 | 4.5 | ❌ |
| Statistika yozuvlari | `#8888aa` | 3.42 | 4.5 | ❌ |
| Sahifa raqami | `#8888aa` | 3.12 | 4.5 | ❌ |
| QR yozuvi | `#8888aa` | 3.42 | 4.5 | ❌ |
| Footer matni | `#8888aa` | 3.12 | 4.5 | ❌ |
| Menyu (aktiv emas) | `#8888aa` | 3.12 | 4.5 | ❌ |
| Kitob nomi | `#1a1a2e` | 17.06 | 4.5 | ✅ |
| Hero matni | `#4a4a6a` | 7.74 | 4.5 | ✅ |

**Sabab:** `--text-muted: #8888aa` o'zgaruvchisi juda och. U 6 xil joyda
ishlatiladi va hammasi talabdan past.

**Bu shunchaki go'zallik masalasi emas** — WCAG AA standarti 4.5 talab
qiladi. DGU olishda accessibility auditidan o'tish uchun bu tuzatilishi shart.

**Yechim:** `#8888aa` → `#5a5a78` (kontrast 3.12 → 6.1) va qalinlikni
500 dan 600 ga oshirish. Bitta o'zgaruvchini o'zgartirish butun saytga
ta'sir qiladi.

**Vaqt:** 2 soat (tungi rejim uchun ham tekshirish bilan).

### 1.4. Bo'lim nomlari bold va katta harf (4-band)

Hozir: `Kitoblar`, `Taqdimotlar` — qalinlik 600, oddiy yozuv.

**Aniqlashtirish kerak** (savol pastda): ustoz
- (a) `KITOBLAR` — butunlay katta harf, yoki
- (b) **Kitoblar** — faqat qalinroq va yirikroq
demoqchimi?

O'zbek tilida butunlay katta harf o'qishni biroz qiyinlashtiradi
(ayniqsa `TAQDIMOTLAR`, `SUN'IY INTELLEKT` kabi uzun so'zlarda), lekin
ustoz shuni xohlasa — qilamiz.

**Vaqt:** 30 daqiqa.

---

## 2-GURUH: YANGI BO'LIMLAR (5, 6, 7, 8, 9-band)

Bu eng katta va eng ko'p qaror talab qiladigan qism.

### 2.1. Hozirgi holat

Saytda **4 ta bo'lim** bor: Kitoblar · Taqdimotlar · Videolar · Testlar.

Ustoz aytgan uchta nom — `Fan dasturlari`, `SI darslar`, `SI agentlar` —
hozir **kategoriya** sifatida mavjud (kitoblarni filtrlash uchun), lekin
**bo'lim** emas.

**Muhim:** bazadan tekshirdim — bu uch kategoriyada **bitta ham material
yo'q**:

| Kategoriya | Kitoblar soni |
|---|---|
| IT | 73 |
| Iqtisodiyot | 22 |
| Biznes | 20 |
| Salomatlik | 17 |
| Bog'dorchilik | 15 |
| Boshqa | 7 |
| Sun'iy intellekt | 4 |
| **Fan dasturlari** | **0** |
| **SI darslar** | **0** |
| **SI agentlar** | **0** |

Ya'ni bo'limlarni yaratish — nolladan kontent to'plashni anglatadi.

### 2.2. Menyuda joy muammosi

4 ta bo'lim + 3 ta yangi = **7 ta bo'lim**. Bu header'ga sig'maydi,
ayniqsa mobil telefonda (pastki menyuda 4 ta joy bor).

**Uch variant:**

**A) Tekis 7 ta bo'lim**
```
Kitoblar · Fan dasturlari · Taqdimotlar · Videolar · Testlar · SI-o'qish · AI-agentlar
```
- ➕ Hammasi bir bosishda
- ➖ Header tor, mobilda ikki qatorga tushadi, kichik ekranda chalkash

**B) Guruhlash (tavsiyam)**
```
Kitoblar · O'quv materiallari ▾ · SI-o'qish · AI-agentlar
                └─ Fan dasturlari, Taqdimotlar, Videolar, Testlar
```
- ➕ Header toza, mantiqiy guruhlangan
- ➖ Bir qo'shimcha bosish kerak

**C) Ikki qatorli menyu**
```
Asosiy:   Kitoblar · SI-o'qish · AI-agentlar
Materiallar: Fan dasturlari · Taqdimotlar · Videolar · Testlar
```
- ➕ Hammasi ko'rinadi, guruhlangan
- ➖ Header balandroq bo'ladi

### 2.3. Har bir yangi bo'lim uchun texnik yechim

**Fan dasturlari (8-band)** — eng oson.
Ustoz talab qilgan format: har fan uchun bitta PDF, ichida uch tilli
variant, mansabdorlar ismisiz, hamma uchun ochiq.

Texnik jihatdan bu — kitoblarga o'xshash PDF. Ikki yo'l bor:
- Mavjud `books` jadvalidan foydalanib, `fandastur` kategoriyasiga qo'yish
  (bugun ishlaydi, kod o'zgarmaydi)
- Alohida bo'lim qilish (chiroyliroq, lekin yangi jadval va kod kerak)

**SI-o'qish (7-band)** — o'rtacha murakkab.
Ustoz bu yerga fan dasturi, taqdimotlar, uslubiy qo'llanmalar, darsliklar,
ma'ruza matnlari, amaliy/laboratoriya vazifalari va mustaqil ish
topshiriqlarini qo'yishni xohlaydi.

Bu **bir necha xil material turini bitta mavzu ostida** ko'rsatishni
talab qiladi. Ya'ni "SI-o'qish" — bu alohida material turi emas, balki
**mavzu bo'yicha yig'ma sahifa**.

**AI-agentlar (6-band)** — ❓ **aniqlik kerak**.
Ustoz: *"kerakli fanlarni o'qitishga mo'ljallangan agentlar yoki agentlar
jamoasi joylashtiriladi"*.

Bu nimani anglatishi menga tushunarsiz. Ehtimol variantlar:
- ChatGPT/Claude'da yaratilgan maxsus agentlarga **havolalar** ro'yxati?
- Sayt ichida ishlaydigan **suhbat oynasi** (chat)?
- Agentlar haqida **qo'llanma/hujjatlar**?

Har biri butunlay boshqacha ish hajmi. **Savol pastda.**

### 2.4. Fanlar kesimida tashkil qilish (9-band)

Ustoz taqdimot, video va testlarni **fanlar bo'yicha** guruhlashni
xohlaydi. Hozir ular faqat kategoriya (IT, Iqtisodiyot...) bo'yicha
ajratilgan — "fan" tushunchasi yo'q.

**Kerak bo'ladi:** yangi "Fanlar" ro'yxati (masalan: "Axborot
texnologiyalari", "Ma'lumotlar bazasi", "Dasturlash asoslari"...) va har
bir materialni fanga bog'lash.

Shundan keyin talaba: *fanni tanlaydi → o'sha fanning dasturi, taqdimotlari,
videolari va testlari bir joyda ko'rinadi.*

Bu ustozning umumiy g'oyasiga eng mos keladigan yechim.

**Vaqt:** 3-4 kun (baza o'zgarishi, admin panel, bot, sayt).

---

## 3-GURUH: TEST NATIJALARINI SAQLASH ⚠️ eng muhim texnik to'siq

Ustoz (2-ro'yxat, 3-band): *"Testlar bo'limida talabalar testni yechib
qanday baho olganliklarini bilish va natijalarni saqlash imkoniyatlari
yaratilgan bo'lishi kerak"*.

**Hozir qanday:** test yechilgandan keyin natija ko'rsatiladi (to'g'ri/
noto'g'ri soni, foiz, sarflangan vaqt, savollar tahlili) va **faqat o'sha
brauzerda** saqlanadi.

**Muammosi:**
- Talaba boshqa qurilmadan kirsa — natijasi yo'q
- Brauzer tarixi tozalansa — natija yo'qoladi
- **O'qituvchi kim qanday baho olganini ko'ra olmaydi**

**Sabab:** natijani odamga bog'lash uchun talaba tizimga kirishi kerak.
Hozir sayt ro'yxatdan o'tishsiz ishlaydi.

**Yechim:** Google orqali kirish. Buning uchun:
- Backend kodi **allaqachon yozilgan** va turibdi (`/api/user-auth/google/*`)
- Bazadagi jadvallar **allaqachon tayyor** (`users`, `test_attempts`, ...)
- Faqat **Google OAuth kaliti** kerak

**To'siq:** sizning Google Cloud akkauntingiz "express" rejimda va karta
billing tekshiruvidan o'tmadi (`OR_BACR2_44` xatosi). **Boshqa Gmail
akkaunt kerak** — u yerda karta so'ralmaydi, OAuth kaliti bepul.

**Vaqt:** kalit bo'lsa — 2 kun (login, profil sahifasi, o'qituvchi uchun
natijalar jadvali).

---

## 4-GURUH: ZAXIRA NUSXA (12-band) ❌ hozir yo'q — jiddiy xavf

Ustoz haq: *"Sayt tasodifiy holda yo'qolib ketmasligi uchun uning nusxasini
biror ishonchli joyda saqlab qo'yish kerak"*.

**Hozirgi holat:**

| Nima | Zaxira | Xavf |
|---|---|---|
| Kod | ✅ GitHub'da | Xavfsiz |
| Baza (158 kitob, testlar, savollar) | ❌ **yo'q** | Yo'qolsa — qaytarib bo'lmaydi |
| Fayllar (PDF, muqovalar) | ❌ **yo'q** | Yo'qolsa — qaytarib bo'lmaydi |

Agar bazada xato buyruq ishlasa yoki akkaunt bloklansa — **158 ta kitob va
barcha testlar butunlay yo'qoladi**.

**Taklif qilayotgan yechim:**
1. Har kuni avtomatik: baza to'liq eksport qilinadi (`.sql` fayl) va R2 ning
   alohida "backup" papkasiga saqlanadi
2. Haftada bir marta: shu eksport GitHub'ga ham yuklanadi (ikkinchi nusxa)
3. Fayllar (PDF) uchun: oyda bir marta ro'yxat va nusxa
4. Oxirgi 30 kunlik nusxalar saqlanadi

Bu GitHub Actions orqali bepul ishlaydi.

**Vaqt:** 1 kun. **Bu birinchi navbatda qilinishi kerak deb hisoblayman.**

---

## 5-GURUH: KONTENT TALABLARI (kod emas)

Ustozning quyidagi tavsiyalari **kod bilan bog'liq emas** — bular
material tayyorlash qoidalari. Lekin ba'zilari saytga qo'shimcha
imkoniyat talab qiladi:

| Ustoz talabi | Kod kerakmi | Izoh |
|---|---|---|
| Fan dasturi PDF ichida 3 tilda | ❌ | Fayl tayyorlashda |
| Mansabdorlar ismi bo'lmasin | ❌ | Fayl tayyorlashda |
| Taqdimot 30-35 slayd | ❌ | Tayyorlashda |
| Slaydlarda matn yorqin va yirik | ❌ | Tayyorlashda |
| Slayd oxirida test nomi ko'rsatilsin | ⚠️ **ha** | Taqdimotni test bilan bog'lash foydali bo'lardi |
| Taqdimot havolasi PDF ichida | ⚠️ | Bizda to'g'ridan-to'g'ri yuklash bor — yaxshiroq |

### Taqdimot joylashtirish haqida taklifim

Ustoz taqdimot **havolasini PDF ichiga** joylashtirishni taklif qilyapti
(tavsif + havola).

Bizda **yaxshiroq imkoniyat bor**: taqdimotni to'g'ridan-to'g'ri saytga
yuklash mumkin va u brauzerda ochiladi — talaba hech qayerga o'tmaydi,
havola buzilmaydi, mualliflik saqlanadi.

Lekin ustozning usuli ham kerak bo'lishi mumkin (masalan, fayl juda katta
bo'lsa yoki Google Drive'da tursa). **Ikkalasini ham qo'llab-quvvatlashni
taklif qilaman:**
- Fayl kichik bo'lsa → saytga yuklaymiz, ichida ochiladi
- Fayl katta yoki tashqarida bo'lsa → tavsif + havola ko'rsatamiz

Bu haqda ustoz bilan kelishib olish kerak.

---

## AMALGA OSHIRISH TARTIBI (taklif)

Men quyidagi tartibni tavsiya qilaman — arzon va xavfsizdan boshlab:

### 1-bosqich: tezkor tuzatishlar (1-2 kun) — hozir boshlash mumkin
- Zaxira nusxa tizimi (eng muhim — ma'lumot yo'qolishidan saqlaydi)
- Shriftlarni yorqinlashtirish (10, 11-band)
- Kitob nomlari to'liq ko'rinishi (1-band)
- Bo'lim nomlari bold/katta harf (4-band)
- SI/AI nomlashda birxillik (2, 3-band)

**Bularni bugunoq qilsam bo'ladi — faqat "ha" deng.**

### 2-bosqich: fanlar tizimi (3-4 kun)
- "Fanlar" ro'yxati qo'shiladi
- Har material fanga bog'lanadi
- Fan sahifasi: bitta fan bo'yicha hamma material bir joyda
- Fan dasturlari bo'limi

### 3-bosqich: yangi bo'limlar (2-3 kun)
- Menyu qayta tashkil qilinadi (variant tanlangandan keyin)
- SI-o'qish bo'limi
- AI-agentlar bo'limi (mazmuni aniqlangandan keyin)

### 4-bosqich: talaba profili (2 kun, Google kaliti kerak)
- Google orqali kirish
- Test natijalari saqlanadi
- O'qituvchi uchun natijalar jadvali

---

## SIZDAN KERAK BO'LGAN MA'LUMOTLAR

Quyidagilarni aniqlashtirsangiz, ishni boshlaymiz:

**1. AI-agentlar bo'limi — nima bo'ladi?**
Ustozning "agentlar joylashtiriladi" degani nimani anglatadi? Havolalar
ro'yxatimi, sayt ichidagi suhbatmi yoki qo'llanmalarmi?

**2. Nomlashda birxillik: SI yoki AI?**
Hozir aralash: kategoriya "Sun'iy intellekt", lekin "SI darslar",
"SI agentlar". Ustoz "AI-agentlar" va "SI-o'qish" deb yozgan. Qaysi
biri bo'lsin?

**3. "Katta harflar" — qanday?**
`KITOBLAR` (butunlay katta) yoki **Kitoblar** (qalin va yirikroq)?

**4. Menyu tuzilishi — qaysi variant?**
Yuqoridagi A / B / C variantlaridan qaysi biri?

**5. Fanlar ro'yxati**
Kafedrada qaysi fanlar o'qitiladi? Ro'yxatini bersangiz, "Fanlar" tizimini
shunga moslab qurdiraman.

**6. Google login qo'shamizmi?**
Test natijalarini saqlash uchun kerak. Boshqa Gmail akkaunt topa olasizmi?

**7. Taqdimotlar: yuklash yoki havola?**
Saytga to'g'ridan-to'g'ri yuklaymizmi yoki ustoz aytgandek PDF ichida
havola bo'ladimi? (Ikkalasini ham qila olaman.)

---

## USTOZGA QAYTA SAVOL BERISHNI TAVSIYA QILAMAN

Ustozga quyidagilarni aytish foydali bo'lardi:

1. **2 va 3-band allaqachon tuzatilgan** — saytni qayta ko'rishlarini
   so'rang (brauzerni yangilash kerak bo'lishi mumkin).
2. **10-band bo'yicha ular mutlaqo haq** — o'lchov ham shuni ko'rsatdi.
   Bu nafaqat go'zallik, balki DGU uchun ham majburiy.
3. **Test natijalarini saqlash uchun talabalar tizimga kirishi kerak** —
   bu ularga ma'qulmi? Chunki bu talabadan Google akkaunt talab qiladi.
4. **AI-agentlar bo'limi haqida aniqroq tushuntirish so'rash.**
5. **Fanlar ro'yxatini so'rash** — bu butun tuzilmaning asosi bo'ladi.
