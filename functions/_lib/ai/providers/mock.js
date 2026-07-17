import { normalizeMetadata } from '../common.js';

export async function analyzeWithMock({ fileName }) {
  const title = fileName.replace(/\.pdf$/i, '').replace(/[_-]+/g, ' ').trim() || 'Kitob';
  return normalizeMetadata({
    title: { uz: title, ru: title, en: title },
    author: "Noma'lum",
    year: null,
    pages: null,
    language: 'uz',
    description: {
      uz: "AI provayder ulanmagan. Ma'lumotni admin panelda tahrirlang.",
      ru: 'AI-провайдер не подключен. Отредактируйте данные в панели администратора.',
      en: 'AI provider is not connected. Edit the metadata in the admin panel.',
    },
  }, fileName);
}
