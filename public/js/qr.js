/* ============================================
   DL-library.uz — QR kod (avtomatik generatsiya)
   qrcode-generator (CDN) asosida. Kitob uchun QR
   ommaviy chuqur havolani (?book=<id>) kodlaydi.
   ============================================ */

function bookDeepLink(id) {
  return `${location.origin}${location.pathname}?book=${id}`;
}

// QR ni data URL (PNG) ko'rinishida qaytaradi
function makeQrDataUrl(text, cellSize = 4, margin = 8) {
  if (typeof qrcode === 'undefined') return '';
  try {
    const qr = qrcode(0, 'M');
    qr.addData(text);
    qr.make();
    return qr.createDataURL(cellSize, margin);
  } catch (e) {
    return '';
  }
}

function bookQrDataUrl(id) {
  return makeQrDataUrl(bookDeepLink(id));
}

// QR ni PNG fayl sifatida yuklab olish
function downloadQr(id, filename) {
  const dataUrl = makeQrDataUrl(bookDeepLink(id), 8, 16);
  if (!dataUrl) return;
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename || `QR_book_${id}.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
