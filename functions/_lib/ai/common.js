export const BOOK_METADATA_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['title', 'author', 'year', 'pages', 'language', 'description'],
  properties: {
    title: {
      type: 'object',
      additionalProperties: false,
      required: ['uz', 'ru', 'en'],
      properties: {
        uz: { type: 'string' },
        ru: { type: 'string' },
        en: { type: 'string' },
      },
    },
    author: { type: 'string' },
    year: { type: ['integer', 'null'] },
    pages: { type: ['integer', 'null'] },
    language: { type: 'string', enum: ['uz', 'ru', 'en'] },
    description: {
      type: 'object',
      additionalProperties: false,
      required: ['uz', 'ru', 'en'],
      properties: {
        uz: { type: 'string' },
        ru: { type: 'string' },
        en: { type: 'string' },
      },
    },
  },
};

export function buildMetadataPrompt(categoryName, options = {}) {
  const pageLine = Number.isInteger(options.pageCount)
    ? `- PDF sahifalar soni oldindan aniqlandi: ${options.pageCount}. JSON ichidagi pages qiymati aynan ${options.pageCount} bo'lsin.`
    : "- PDF sahifalar soni oldindan aniqlanmagan bo'lsa, topilmasa null qaytaring.";
  const sourceLine = options.sourceMode === 'first_pages_text'
    ? 'Sizga PDFning faqat 1-2 sahifasidan olingan matn beriladi. Kitob nomi, muallif va yilni shu matndan ajrating.'
    : 'Sizga PDF yoki uning tahlil qilingan sahifalari beriladi. Kitob nomi, muallif va yilni asosan titul/muqova sahifalaridan ajrating.';

  return `PDF kitobni tahlil qiling va faqat JSON qaytaring.

Talablar:
- JSON shakli aynan shunday bo'lsin: {"title":{"uz":"","ru":"","en":""},"author":"","year":null,"pages":null,"language":"uz","description":{"uz":"","ru":"","en":""}}
- title.uz kitob nomining grammatik va imlo jihatdan to'g'ri o'zbekcha tarjimasi bo'lsin. Faqat o'zbek lotin yozuvidan foydalaning, kirill harflarini ishlatmang.
- title.ru kitob nomining grammatik va imlo jihatdan to'g'ri ruscha tarjimasi bo'lsin. Rus kirill yozuvidan foydalaning.
- title.en kitob nomining tabiiy, grammatik va imlo jihatdan to'g'ri inglizcha tarjimasi bo'lsin.
- Uch tildagi nomlarda asl ma'noni saqlang, so'zma-so'z noto'g'ri tarjima qilmang. Ismlar, familiyalar va maxsus nomlarni asossiz tarjima qilmang.
- Barcha mualliflarni kitobda ko'rsatilgan tartibda bitta satrda yozing.
- Nashr yilini aniqlang. Topilmasa null qaytaring.
- ${pageLine}
- Asosiy tilni faqat uz, ru yoki en qiymatlaridan biri bilan belgilang.
- description.uz grammatik va imlo jihatdan to'g'ri o'zbek lotin yozuvida bo'lsin.
- description.ru grammatik va imlo jihatdan to'g'ri rus tilida, kirill yozuvida bo'lsin.
- description.en grammatik va imlo jihatdan to'g'ri, tabiiy ingliz tilida bo'lsin.
- Har bir tavsif alohida bitta tugallangan gapdan va 20-25 ta so'zdan iborat bo'lsin. 22 ta so'zni maqsad qiling, ro'yxat yoki sarlavha yozmang.
- Tavsiflar kitob nomi va tanlangan kategoriya mazmuniga tayansin. Manbada yo'q aniq faktlar, natijalar yoki va'dalarni to'qib chiqarmang.
- JSONni qaytarishdan oldin uch tildagi nom va tavsiflarni ichki ravishda qayta o'qib, grammatika, imlo va til yozuvini tekshiring.
- Ma'lumot topilmasa taxmin qilmang; muallif uchun "Noma'lum" yozing.
- ${sourceLine}
- Tanlangan kategoriya: ${categoryName}. Kategoriyani o'zgartirmang.`;
}

export function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

export function parseJsonText(text) {
  const value = String(text || '').trim();
  const fenced = value.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return JSON.parse(fenced ? fenced[1] : value);
}

/**
 * Model javobidagi HTML/boshqaruv belgilarini olib tashlaydi.
 * PDF ichidagi matn ishonchsiz manba: prompt injection orqali javobga
 * `<img onerror=...>` kabi qiymat tushishi mumkin, bu esa keyinchalik
 * admin panelida saqlangan XSS ga aylanadi.
 */
function stripMarkup(value) {
  const withoutTags = String(value ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/[<>]/g, ' ');

  let result = '';
  for (const ch of withoutTags) {
    const code = ch.codePointAt(0);
    result += (code < 32 || code === 127) ? ' ' : ch;
  }
  return result;
}

function cleanText(value, fallback = '', maxLength = 4000) {
  const text = stripMarkup(value).replace(/\s+/g, ' ').trim();
  return (text || fallback).slice(0, maxLength);
}

function nullableInteger(value, min, max) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < min || number > max) return null;
  return number;
}

export function normalizeMetadata(raw, fileName = 'Kitob') {
  const sourceTitle = cleanText(fileName.replace(/\.pdf$/i, ''), 'Kitob', 300);
  const title = raw?.title || {};
  const titleUz = cleanText(title.uz, cleanText(title.ru, cleanText(title.en, sourceTitle, 300), 300), 300);
  const titleRu = cleanText(title.ru, titleUz, 300);
  const titleEn = cleanText(title.en, titleUz, 300);
  const description = raw?.description || {};
  const language = ['uz', 'ru', 'en'].includes(raw?.language) ? raw.language : 'uz';

  return {
    title: { uz: titleUz, ru: titleRu, en: titleEn },
    author: cleanText(raw?.author, "Noma'lum", 500),
    year: nullableInteger(raw?.year, 1900, 2100),
    pages: nullableInteger(raw?.pages, 1, 100000),
    language,
    description: {
      uz: cleanText(description.uz, '', 4000),
      ru: cleanText(description.ru, '', 4000),
      en: cleanText(description.en, '', 4000),
    },
  };
}

export async function readJsonResponse(response, providerName) {
  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new Error(`${providerName} JSON javob qaytarmadi (${response.status})`);
  }
  if (!response.ok) {
    const message = payload?.error?.message || payload?.error || `HTTP ${response.status}`;
    throw new Error(`${providerName}: ${message}`);
  }
  return payload;
}
