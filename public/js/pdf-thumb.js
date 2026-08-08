/* ============================================
   DL-library.uz — PDF muqova (thumbnail) renderi
   Taqdimotning birinchi sahifasi kichik PDF sifatida
   saqlanadi; kartochkada uni PDF.js orqali rasm qilib
   chizamiz. Server tomonda rasm generatsiya qilish
   Cloudflare Workers muhitida mumkin emas.
   ============================================ */

const PDFJS_URL = '/js/vendor/pdf.min.js';
const PDFJS_WORKER_URL = '/js/vendor/pdf.worker.min.js';

let pdfJsPromise = null;

export function loadPdfJs() {
  if (typeof window.pdfjsLib !== 'undefined') return Promise.resolve(window.pdfjsLib);
  if (pdfJsPromise) return pdfJsPromise;

  pdfJsPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = PDFJS_URL;
    script.onload = () => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL;
      resolve(window.pdfjsLib);
    };
    script.onerror = reject;
    document.head.appendChild(script);
  });
  return pdfJsPromise;
}

export function isPdfUrl(url) {
  return /\.pdf($|\?)/i.test(String(url || ''));
}

const RENDER_TIMEOUT_MS = 15_000;

function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(`${label}: vaqt tugadi`)), ms)),
  ]);
}

/**
 * PDF ning 1-sahifasini canvas'ga chizadi.
 * Kartochka ko'rinish maydoniga kirganda chaqiriladi (lazy).
 * Har qanday holatda ham skelet animatsiyasi olib tashlanadi.
 */
export async function renderPdfThumb(url, containerEl, { maxWidth = 480 } = {}) {
  try {
    const pdfjsLib = await withTimeout(loadPdfJs(), RENDER_TIMEOUT_MS, 'PDF.js yuklash');
    const doc = await withTimeout(pdfjsLib.getDocument(url).promise, RENDER_TIMEOUT_MS, 'PDF ochish');
    const page = await doc.getPage(1);

    const base = page.getViewport({ scale: 1 });
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const scale = (maxWidth / base.width) * dpr;
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    canvas.className = 'pdf-thumb';

    // Canvas avval DOMga qo'yiladi: ajratilgan (detached) canvasda
    // page.render() ba'zi brauzerlarda umuman yakunlanmaydi.
    containerEl.innerHTML = '';
    containerEl.appendChild(canvas);

    await withTimeout(
      page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise,
      RENDER_TIMEOUT_MS,
      'PDF chizish',
    );

    containerEl.classList.remove('material-card__media--loading');
    doc.destroy?.();
    return true;
  } catch (err) {
    console.error('PDF thumbnail render error:', err);
    // Muqova chizilmasa ham kartochka bo'sh qolmasligi kerak
    containerEl.classList.remove('material-card__media--loading');
    containerEl.classList.add('material-card__media--placeholder');
    containerEl.innerHTML = '<span class="material-card__media-icon">📊</span>';
    return false;
  }
}

/** Element ko'rinish maydoniga kirganda bir marta render qiladi. */
export function lazyRenderPdfThumb(url, containerEl, options) {
  if (!('IntersectionObserver' in window)) {
    renderPdfThumb(url, containerEl, options);
    return;
  }
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      observer.disconnect();
      renderPdfThumb(url, containerEl, options);
    }
  }, { rootMargin: '200px' });
  observer.observe(containerEl);
}
