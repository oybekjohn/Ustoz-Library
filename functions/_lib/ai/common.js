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

export function buildMetadataPrompt(categoryName) {
  return `PDF kitobni tahlil qiling va faqat JSON qaytaring.

Talablar:
- Kitob nomini o'zbek, rus va ingliz tillarida yozing. Asl nomni mazmunini buzmasdan tarjima qiling.
- Barcha mualliflarni kitobda ko'rsatilgan tartibda bitta satrda yozing.
- Nashr yilini va PDF sahifalar sonini aniqlang. Topilmasa null qaytaring.
- Asosiy tilni faqat uz, ru yoki en qiymatlaridan biri bilan belgilang.
- 3 tildagi tavsif kitob mazmuniga tayansin, har biri 2-4 gap bo'lsin.
- Ma'lumot topilmasa taxmin qilmang; muallif uchun "Noma'lum" yozing.
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

function cleanText(value, fallback = '', maxLength = 4000) {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim();
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
