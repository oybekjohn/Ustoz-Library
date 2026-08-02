# Telegram guruh boshqaruvi

Guruh funksiyalari kutubxona va AI oqimidan alohida ishlaydi. Telefonlarni aniqlash,
qidirish va tarixni import qilishda AI API ishlatilmaydi.

## Birinchi sozlash

1. Botni guruhga administrator qiling.
2. `Invite Users` va `Ban Users` huquqlarini yoqing.
3. Owner guruh ichida `/guruh_ulash` buyrug'ini yuboradi.
4. Telefon raqamlar topigi ichida `/telefon_topik` buyrug'ini yuboradi.
5. Owner botning shaxsiy chatidagi `Adminlar` bo'limidan `Guruh admini` rolini tanlaydi.
6. Har bir moderator botning shaxsiy chatida `/start` bosadi.

Yangi a'zolarni moderator tasdiqlashi uchun guruhga kirish havolasi `Join Request`
rejimida yaratilishi kerak. Bot join requestlarni o'zi yaratmaydi, faqat kelgan
so'rovlarni moderatorlarga yuboradi.

## Guruh buyruqlari

- `/tel` - barcha kontaktlarni alifbo tartibidagi oddiy ro'yxatda chiqaradi; hamma ishlata oladi.
- `/start_tel` - `/tel` buyrug'ini yoqadi; moderatorlar uchun.
- `/stop_tel` - `/tel` buyrug'ini vaqtincha to'xtatadi; moderatorlar uchun.
- `/tel_yoq` va `/tel_toxtat` - eski, ishlashda davom etadigan buyruq nomlari.
- `/kontakt_qosh Ism yoki kasb | +998901234567` - kontakt qo'shadi.
- `/kontakt_ochir KONTAKT_ID` - kontaktni o'chiradi.
- `/moderatorlar` - guruh moderatorlarini ko'rsatadi.
- `/moderator_qosh TELEGRAM_ID Ism` - moderator qo'shadi; faqat owner.
- `/moderator_ochir TELEGRAM_ID` - moderatorni o'chiradi; faqat owner.
- `/guruh_holati` - topik va `/tel` holatini ko'rsatadi.
- `/tel_import` - tarix importi uchun shaxsiy chat buyrug'ini beradi.

## Telefon topigi

Bot ism yoki kasb bo'yicha telefon so'ralganini lokal qoidalar bilan aniqlaydi.
`doktor`, `duxtir`, `duktir`, `do'ktir`, `shifokor`, `vrach` va ularning
ko'plik-kelishik shakllari bitta `doktor` qidiruv tushunchasi sifatida ishlaydi.
Mos kontaktlarning har birini so'rov xabariga reply qiladi:

```text
Oybek shifokor  +998901234567, +998907654321
```

Faqat bitta kontakt topilsa, javob ostidagi `✅` va `❌` tugmalari kontakt
ishonchliligini saqlaydi. Bir nechta kontakt topilsa, barchasi bitta reply xabarda
qator qilib, tugmalarsiz yuboriladi. Mos kontakt topilmasa bot javob bermaydi.
Bir foydalanuvchining bitta kontakt uchun faqat oxirgi bahosi hisoblanadi.
`Noto'g'ri` deb belgilangan ism uchun keyin yangi raqam yuborilsa, moderatorga eski va
yangi ma'lumot ko'rsatiladi. Moderator tasdiqlagach eski kontakt yangisiga almashtiriladi.

Yangi telefon, Telegram kontakti yoki rasm yuborilsa, barcha moderatorlarga shaxsiy
tasdiqlash kartasi boradi. Birinchi qaror bergan moderator so'rovni yakunlaydi va
qolgan moderatorlardagi kartalar o'chiriladi.

## Eski tarixni import qilish

1. Telegram Desktop orqali telefon topigi tarixini `JSON` formatida eksport qiling.
2. Media fayllarni eksportdan o'chiring.
3. Guruhda `/tel_import` buyrug'ini yuboring.
4. Bot bergan `/tel_import GURUH_ID` buyrug'ini botning shaxsiy chatiga yuboring.
5. `result.json` faylini yuboring va previewni tasdiqlang.

Bitta import uchun limit: 19 MB va 5000 ta kontakt. Mavjud telefon raqami import
vaqtida qayta yozilmaydi.
