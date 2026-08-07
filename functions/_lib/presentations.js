/**
 * Presentations DB and Validation Helper
 */

export function validatePresentationInput(data) {
  const errors = [];
  if (!data.title_uz || typeof data.title_uz !== 'string' || !data.title_uz.trim()) {
    errors.push("title_uz bo'sh bo'lmasligi kerak");
  }
  if (!data.category || typeof data.category !== 'string') {
    errors.push("category ko'rsatilishi shart");
  }
  if (!data.pdf_key || typeof data.pdf_key !== 'string') {
    errors.push("pdf_key ko'rsatilishi shart");
  }
  const isPptx = /\.pptx?$/i.test(data.pdf_key || '');
  // PDF uchun sahifalar soni majburiy; PPT/PPTX Office viewerda ochilgani
  // uchun page_count 0 bo'lishi mumkin.
  if (!isPptx && (typeof data.page_count !== 'number' || data.page_count <= 0)) {
    errors.push("page_count noldan katta bo'lishi kerak");
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
