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
    qr: "books/pics/kitob1qr.jpg",
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
    qr: "books/pics/kitob2qr.jpg",
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
    qr: "books/pics/kitob3qr.jpg",
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
    qr: "books/pics/kitob4qr.jpg",
    description: {
      uz: "O'zbekiston Davlat Jahon Tillari Universiteti uchun darslik",
      ru: "Учебник для Узбекского государственного университета мировых языков",
      en: "Textbook for Uzbekistan State World Languages University"
    }
  }
];
