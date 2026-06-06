// Umumiy HTTP yordamchilari (Pages Functions)

export function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...(init.headers || {}),
    },
  });
}

export function error(message, status = 400, extra = {}) {
  return json({ ok: false, error: message, ...extra }, { status });
}

export function ok(data = {}) {
  return json({ ok: true, ...data });
}

// Kategoriya validatsiyasi (frontend bilan bir xil)
export const CATEGORIES = ['fandastur', 'darslik', 'monografiya', 'qollanma', 'lugat', 'boshqa'];
export const LANGUAGES = ['uz', 'ru', 'en'];

// DB qatorini frontend kutadigan shaklga o'tkazadi
export function rowToBook(row) {
  return {
    id: row.id,
    title: { uz: row.title_uz, ru: row.title_ru || '', en: row.title_en || '' },
    author: row.author,
    year: row.year,
    category: row.category,
    language: row.language,
    pages: row.pages,
    file: `/files/${row.file_key}`,
    cover: row.cover_key ? `/files/${row.cover_key}` : '',
    description: { uz: row.description_uz || '', ru: row.description_ru || '', en: row.description_en || '' },
  };
}
