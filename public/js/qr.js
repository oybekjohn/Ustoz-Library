/* ============================================================
   DL-library.uz — QR kod generatsiyasi

   Har bir kitob uchun QR kod avtomatik yasaladi. QR ichida
   kitobning to'g'ridan-to'g'ri havolasi (?book=<id>) turadi:
   telefon bilan skanerlansa, o'sha kitob darhol ochiladi.

   Kutubxona: qrcode-generator — /js/vendor/ papkasida (o'z
   serverimizda, tashqi CDN'ga bog'liq emas).
   ============================================================ */

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
