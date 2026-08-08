/* ============================================
   DL-library.uz — PDF muqova (thumbnail) renderi
   Taqdimotning birinchi sahifasi kichik PDF sifatida
   saqlanadi; kartochkada uni PDF.js orqali rasm qilib
   chizamiz. Server tomonda rasm generatsiya qilish
   Cloudflare Workers muhitida mumkin emas.
   ============================================ */

const PDFJS_URL = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
const PDFJS_WORKER_URL = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

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

/**
 * PDF ning 1-sahifasini canvas'ga chizadi.
 * Kartochka ko'rinish maydoniga kirganda chaqiriladi (lazy).
 */
export async function renderPdfThumb(url, containerEl, { maxWidth = 480 } = {}) {
  try {
    const pdfjsLib = await loadPdfJs();
    const doc = await pdfjsLib.getDocument(url).promise;
    const page = await doc.getPage(1);

    const base = page.getViewport({ scale: 1 });
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const scale = (maxWidth / base.width) * dpr;
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    canvas.className = 'pdf-thumb';

    await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;

    containerEl.innerHTML = '';
    containerEl.appendChild(canvas);
    containerEl.classList.remove('material-card__media--loading');
    doc.destroy?.();
    return true;
  } catch (err) {
    console.error('PDF thumbnail render error:', err);
    containerEl.classList.remove('material-card__media--loading');
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
