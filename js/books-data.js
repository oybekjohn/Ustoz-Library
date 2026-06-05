/* ============================================
   USTOZ KUTUBXONASI — Kitoblar ma'lumotlari
   Yangi kitob qo'shish uchun shu faylga yozing
   ============================================ */

const BOOKS_DATA = [
  {
    id: 1,
    title: {
      uz: "Axborot texnologiyalari sohasida ilmiy tadqiqotlar metodologiyasi",
      ru: "Методология научных исследований в области информационных технологий",
      en: "Research Methodology in Information Technologies"
    },
    author: "Ayupov R.X.",
    year: 2024,
    category: "monografiya",
    language: "uz",
    pages: null,
    file: "books/kitob1 monografiya.pdf",
    cover: "books/pics/kitob1.png",
    qr: "books/pics/kitob1qr.png",
    description: {
      uz: "Axborot texnologiyalari sohasida ilmiy tadqiqotlar metodologiyasi bo'yicha monografiya",
      ru: "Монография по методологии научных исследований в области информационных технологий",
      en: "Monograph on research methodology in information technologies"
    }
  },
  {
    id: 2,
    title: {
      uz: "Glossariy — Axborot texnologiyalari atamalari",
      ru: "Глоссарий — Терминология информационных технологий",
      en: "Glossary — Information Technology Terms"
    },
    author: "Ayupov R.X.",
    year: 2025,
    category: "lugat",
    language: "uz",
    pages: null,
    file: "books/kitob2 Глоссарий Рак Техн-RTU-лотин 2025.pdf",
    cover: "books/pics/kitob2.png",
    qr: "books/pics/kitob2qr.png",
    description: {
      uz: "Axborot texnologiyalari sohasidagi atamalar lug'ati (lotin yozuvida)",
      ru: "Глоссарий терминов в области информационных технологий (латиница)",
      en: "Glossary of information technology terms (Latin script)"
    }
  },
  {
    id: 3,
    title: {
      uz: "Ta'limda axborot texnologiyalari — Darslik",
      ru: "Информационные технологии в образовании — Учебник",
      en: "Information Technologies in Education — Textbook"
    },
    author: "Ayupov R.X.",
    year: 2021,
    category: "darslik",
    language: "ru",
    pages: null,
    file: "books/kitob3 Инф тех в обр-Дарслик-2021 март.pdf",
    cover: "books/pics/kitob3.png",
    qr: "books/pics/kitob3qr.png",
    description: {
      uz: "Oliy ta'lim muassasalari uchun axborot texnologiyalari darsligi",
      ru: "Учебник по информационным технологиям в образовании для вузов",
      en: "Textbook on information technologies in education for universities"
    }
  },
  {
    id: 4,
    title: {
      uz: "Ta'limda axborot texnologiyalari — O'quv qo'llanma (UzGUMYa)",
      ru: "Информационные технологии в образовании — Учебник для УзГУМЯ",
      en: "Information Technologies in Education — Textbook for UzSWLU"
    },
    author: "Ayupov R.X.",
    year: 2022,
    category: "darslik",
    language: "ru",
    pages: null,
    file: "books/kitob4 Инф_тех_в_образовании_УЧЕБНИК_для_УзГУМЯ.pdf",
    cover: "books/pics/kitob4.png",
    qr: "books/pics/kitob4qr.png",
    description: {
      uz: "O'zbekiston Davlat Jahon Tillari Universiteti uchun darslik",
      ru: "Учебник для Узбекского государственного университета мировых языков",
      en: "Textbook for Uzbekistan State World Languages University"
    }
  },
  {
    id: 5,
    title: {
      uz: "Sun'iy intellektning dasturiy vositalari",
      ru: "Программные средства искусственного интеллекта",
      en: "Software Tools of Artificial Intelligence"
    },
    author: "Ayupov R.X., Maxmudova M.A.",
    year: 2026,
    category: "qollanma",
    language: "ru",
    pages: null,
    file: "books/kitob5 Прогр сред ИИ-2026-rus-Oxigisi.pdf",
    cover: "books/pics/kitob5.png",
    qr: "books/pics/kitob5qr.png",
    description: {
      uz: "Sun'iy intellekt dasturiy vositalari bo'yicha o'quv-uslubiy qo'llanma. Renessans Ta'lim Universiteti",
      ru: "Учебно-методическое пособие по программным средствам искусственного интеллекта. Университет Ренессанс",
      en: "Teaching manual on software tools of artificial intelligence. Renaissance University"
    }
  },
  {
    id: 6,
    title: {
      uz: "Google ekotizimining smart ilovalari va ulardan foydalanish",
      ru: "Умные приложения экосистемы Google и их использование",
      en: "Smart Applications of Google Ecosystem and Their Usage"
    },
    author: "Ayupov R.X., Fayzullayev J.J., Shakarov A.R.",
    year: 2026,
    category: "qollanma",
    language: "uz",
    pages: null,
    file: "books/kitob6 Google Ekotizimi-qo'llqnma-2026.pdf",
    cover: "books/pics/kitob6.png",
    qr: "books/pics/kitob6qr.png",
    description: {
      uz: "Google ekotizimining smart ilovalari va ulardan foydalanish bo'yicha o'quv qo'llanma. Renessans Ta'lim Universiteti",
      ru: "Учебное пособие по умным приложениям экосистемы Google и их использованию. Университет Ренессанс",
      en: "Teaching manual on smart applications of Google ecosystem. Renaissance University"
    }
  },
  {
    id: 7,
    title: {
      uz: "Scratch grafik dasturlash muhiti va unda ishlash asoslari",
      ru: "Среда графического программирования Scratch и основы работы в ней",
      en: "Scratch Graphical Programming Environment and Its Fundamentals"
    },
    author: "Ayupov R.X., Fayzullayev J.J., Shakarov A.R.",
    year: 2026,
    category: "qollanma",
    language: "uz",
    pages: null,
    file: "books/kitob7 O'quv uslubiy qo'llanma-Oxirgisi-Scratch-2026.pdf",
    cover: "books/pics/kitob7.png",
    qr: "books/pics/kitob7qr.png",
    description: {
      uz: "Scratch grafik dasturlash muhiti va unda ishlash asoslari bo'yicha o'quv-uslubiy qo'llanma. Renessans Ta'lim Universiteti",
      ru: "Учебно-методическое пособие по среде графического программирования Scratch. Университет Ренессанс",
      en: "Teaching manual on Scratch graphical programming environment. Renaissance University"
    }
  }
];
