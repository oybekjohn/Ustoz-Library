# DL-Library (O'quv Platformasi)

Ustoz Ravshan Ayupov va Oybek Xushvaqtov tomonidan RTU talabalari uchun yaratilgan o'quv platformasi. Dastlab elektron kutubxona sifatida boshlangan loyiha kengaytirilib, endilikda taqdimotlar, video darsliklar va onlayn test sinovlarini ham o'z ichiga oladi.

## Imkoniyatlar
- **Kitoblar**: PDF formatidagi kitoblarni o'qish (lazy-loaded PDF.js orqali, progress saqlanadi).
- **Taqdimotlar**: PDF formatidagi taqdimotlar.
- **Videolar**: YouTube embed orqali interaktiv video darslar.
- **Testlar**: Bir nechta variantli interaktiv testlar (o'tish balli, vaqt cheklovi kabi parametrlar bilan).
- **Google OAuth**: Talabalar o'z Google akkauntlari bilan kirib, progress va test natijalarini saqlab borishadi.
- **Admin Panel**: Materiallar va testlarni boshqarish uchun veb-interfeys.
- **Telegram Bot**: Materiallarni to'g'ridan-to'g'ri bot orqali serverga yuklash (owner va belgilangan adminlar uchun).

## Stack
- Frontend: Vanilla JS, HTML, CSS
- Backend: Cloudflare Pages Functions
- Ma'lumotlar bazasi: Cloudflare D1 (SQLite)
- Fayl ombori: Cloudflare R2 (S3)

## Qo'llanmalar
- [Cloudflare deploy qo'llanmasi](./DEPLOY.md)
- [Telegram orqali material yuklash](./TELEGRAM_BOT.md)
