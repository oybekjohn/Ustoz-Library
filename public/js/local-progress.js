/* ============================================
   DL-library.uz — Lokal progress (localStorage)
   Ro'yxatdan o'tishsiz rejimda o'qish/ko'rish
   progressi va test natijalari shu yerda saqlanadi.
   Keyingi relizda Google profil paydo bo'lganda bu
   ma'lumotlar serverga ko'chirish uchun tayyor formatda.
   ============================================ */

const STORAGE_KEY = 'dl_progress_v1';

function loadAll() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const data = raw ? JSON.parse(raw) : null;
    if (data && typeof data === 'object') return data;
  } catch (e) { /* buzilgan JSON — qaytadan boshlaymiz */ }
  return { books: {}, presentations: {}, videos: {}, testResults: [] };
}

function saveAll(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) { /* localStorage to'lgan/yopiq — jim o'tamiz */ }
}

/** Element progressini saqlash (kitob sahifasi, slayd raqami, ...). */
export function saveItemProgress(itemType, itemId, progress) {
  const data = loadAll();
  const bucket = data[itemType] || (data[itemType] = {});
  bucket[itemId] = {
    ...(bucket[itemId] || {}),
    ...progress,
    updatedAt: new Date().toISOString(),
  };
  saveAll(data);
}

/** Element progressini o'qish (bo'lmasa null). */
export function getItemProgress(itemType, itemId) {
  const data = loadAll();
  return (data[itemType] && data[itemType][itemId]) || null;
}

/** Test natijasini tarixga qo'shish (oxirgi 50 tasi saqlanadi). */
export function saveTestResult(result) {
  const data = loadAll();
  data.testResults = data.testResults || [];
  data.testResults.unshift({ ...result, finishedAt: new Date().toISOString() });
  data.testResults = data.testResults.slice(0, 50);
  saveAll(data);
}

/** Test natijalari tarixi. */
export function getTestResults() {
  return loadAll().testResults || [];
}
