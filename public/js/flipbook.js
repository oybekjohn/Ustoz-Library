/* ============================================
   DL-LIBRARY.UZ — PDF o'quvchi (reader)
   Bitta katta sahifa + zoom (50%–400%).
   To'liq ekran, yuklab olishsiz (xavfsiz canvas).
   PDF.js bilan render qilinadi; file:// uchun iframe zaxira.
   ============================================ */

const isLocalFile = window.location.protocol === 'file:';

const reader = {
  pdfDoc: null,
  totalPages: 0,
  pageNum: 1,
  zoom: 1,        // foydalanuvchi zoom darajasi (1 = ekranga moslangan)
  fitScale: 1,    // sahifani ekranga sig'diruvchi masshtab
  renderTask: null,
  file: '',
  title: '',
  mode: 'pdf'     // 'pdf' | 'iframe'
};

const ZOOM_MIN = 0.5;
const ZOOM_MAX = 4;
const ZOOM_STEP = 1.25;

let rendering = false;   // hozir render ketyaptimi
let dirty = false;       // render tugagach yana render kerakmi (eng so'nggi holatni chizish uchun)

// ---------- Ochish ----------
async function openFlipbook(file, title, qrImage) {
  reader.file = file;
  reader.title = title;
  // Oldingi yopishning kechiktirilgan tozalovi yangi hujjatni o'chirib yubormasligi uchun
  if (reader.closeTimer) { clearTimeout(reader.closeTimer); reader.closeTimer = null; }

  const modal = document.getElementById('flipbook-modal');
  const modalTitle = document.getElementById('flipbook-title');
  const qrContainer = document.getElementById('flipbook-qr');

  modalTitle.textContent = title;
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';

  // QR kodni ko'rsatish
  if (qrImage && qrContainer) {
    qrContainer.innerHTML = `<img src="${qrImage}" alt="QR Code" class="flipbook-qr__img" onerror="this.parentElement.style.display='none'" draggable="false">`;
    qrContainer.style.display = 'block';
  } else if (qrContainer) {
    qrContainer.style.display = 'none';
  }

  const hasPdfJs = typeof pdfjsLib !== 'undefined';
  if (hasPdfJs && !isLocalFile) {
    await openPdfReader(file);
  } else {
    openSecureIframe(file);
  }
}

// ---------- PDF reader (bitta sahifa + zoom) ----------
async function openPdfReader(file) {
  reader.mode = 'pdf';
  const container = document.getElementById('flipbook-container');
  const loading = document.getElementById('flipbook-loading');

  showControls(true);
  loading.style.display = 'flex';
  container.innerHTML = '';
  container.className = 'reader-scroll';

  try {
    const task = pdfjsLib.getDocument(encodeURI(file));
    reader.pdfDoc = await task.promise;
    reader.totalPages = reader.pdfDoc.numPages;
    reader.pageNum = 1;
    reader.zoom = 1;

    await computeFitScale();
    scheduleRender();
    updatePageInfo();
    updateZoomInfo();
  } catch (err) {
    console.warn('PDF yuklashda xatolik:', err && err.message);
    openSecureIframe(file);
  }
}

// Joriy sahifani ekranga to'liq sig'diradigan masshtabni hisoblaydi
async function computeFitScale() {
  if (!reader.pdfDoc) return;
  const page = await reader.pdfDoc.getPage(reader.pageNum);
  const vp = page.getViewport({ scale: 1 });
  const body = document.getElementById('flipbook-body');
  const availW = Math.max(240, body.clientWidth - 32);
  const availH = Math.max(240, body.clientHeight - 32);
  reader.fitScale = Math.min(availW / vp.width, availH / vp.height);
}

// Eng so'nggi holatni (sahifa + zoom) render qilishni kafolatlaydi.
// Render ketayotgan bo'lsa, uni bekor qilib, tugagach eng yangi holat bilan qayta chizadi.
function scheduleRender() {
  if (rendering) {
    dirty = true;
    if (reader.renderTask) { try { reader.renderTask.cancel(); } catch (e) {} }
    return;
  }
  doRender();
}

async function doRender() {
  if (!reader.pdfDoc) return;
  rendering = true;
  dirty = false;

  const container = document.getElementById('flipbook-container');
  const loading = document.getElementById('flipbook-loading');
  const num = reader.pageNum;
  const zoom = reader.zoom;

  try {
    const page = await reader.pdfDoc.getPage(num);

    const dpr = window.devicePixelRatio || 1;
    const displayScale = reader.fitScale * zoom;
    const viewport = page.getViewport({ scale: displayScale * dpr });

    const canvas = document.createElement('canvas');
    canvas.className = 'reader-canvas';
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    canvas.style.width = Math.floor(viewport.width / dpr) + 'px';
    canvas.style.height = Math.floor(viewport.height / dpr) + 'px';
    canvas.setAttribute('draggable', 'false');

    const ctx = canvas.getContext('2d', { alpha: false });
    reader.renderTask = page.render({ canvasContext: ctx, viewport });
    await reader.renderTask.promise;

    container.innerHTML = '';
    container.appendChild(canvas);
    if (loading) loading.style.display = 'none';
    // Kengligi ekrandan katta bo'lsa — gorizontal markazga
    container.scrollTop = 0;
    container.scrollLeft = Math.max(0, (canvas.offsetWidth - container.clientWidth) / 2);
  } catch (e) {
    if (!(e && e.name === 'RenderingCancelledException')) {
      console.error('Render xatosi:', e);
    }
  } finally {
    reader.renderTask = null;
    rendering = false;
    if (dirty) doRender();   // oraliqda yangi holat so'ralgan — eng yangisini chizamiz
  }
}

// ---------- Sahifalar bo'ylab harakat ----------
function flipNext() {
  if (reader.mode !== 'pdf') return;
  if (reader.pageNum < reader.totalPages) {
    reader.pageNum++;
    scheduleRender();
    updatePageInfo();
  }
}

function flipPrev() {
  if (reader.mode !== 'pdf') return;
  if (reader.pageNum > 1) {
    reader.pageNum--;
    scheduleRender();
    updatePageInfo();
  }
}

function updatePageInfo() {
  const el = document.getElementById('flipbook-page-info');
  if (el) el.textContent = reader.totalPages ? `${reader.pageNum} / ${reader.totalPages}` : '—';
}

// ---------- Zoom ----------
function zoomIn() { setZoom(reader.zoom * ZOOM_STEP); }
function zoomOut() { setZoom(reader.zoom / ZOOM_STEP); }
function zoomFit() { setZoom(1); }

function setZoom(z) {
  if (reader.mode !== 'pdf') return;
  reader.zoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z));
  scheduleRender();
  updateZoomInfo();
}

function updateZoomInfo() {
  const el = document.getElementById('flipbook-zoom-level');
  if (el) el.textContent = Math.round(reader.zoom * 100) + '%';
}

// Boshqaruv tugmalarini ko'rsatish/yashirish (PDF rejimida — ko'rinadi)
function showControls(show) {
  document.querySelectorAll('.flipbook-nav-btn').forEach(b => b.style.display = show ? '' : 'none');
  const zoom = document.getElementById('flipbook-zoom');
  if (zoom) zoom.style.display = show ? 'flex' : 'none';
}

// ---------- Iframe zaxira (faqat file:// uchun) ----------
function openSecureIframe(file) {
  reader.mode = 'iframe';
  const container = document.getElementById('flipbook-container');
  const loading = document.getElementById('flipbook-loading');
  const pageInfo = document.getElementById('flipbook-page-info');

  loading.style.display = 'none';
  if (pageInfo) pageInfo.textContent = '';
  showControls(false);

  container.className = '';
  container.innerHTML = '';
  container.style.cssText = 'width:100%;height:100%;position:relative;';

  const iframe = document.createElement('iframe');
  iframe.src = file + '#toolbar=0&navpanes=0&scrollbar=1&view=FitH';
  iframe.style.cssText = 'width:100%;height:100%;min-height:80vh;border:none;background:#fff;';
  iframe.title = reader.title;

  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:absolute;inset:0;z-index:3;background:transparent;';
  overlay.addEventListener('contextmenu', (e) => e.preventDefault());
  overlay.addEventListener('mousedown', (e) => {
    if (e.button === 2) { e.preventDefault(); return false; }
    overlay.style.pointerEvents = 'none';
    setTimeout(() => { overlay.style.pointerEvents = 'auto'; }, 300);
  });

  container.appendChild(iframe);
  container.appendChild(overlay);
}

// ---------- Yopish ----------
function closeFlipbook() {
  const modal = document.getElementById('flipbook-modal');
  modal.classList.remove('active');
  document.body.style.overflow = '';

  if (document.fullscreenElement) {
    document.exitFullscreen().catch(() => {});
  }

  dirty = false;
  if (reader.renderTask) { try { reader.renderTask.cancel(); } catch (e) {} }

  reader.closeTimer = setTimeout(() => {
    reader.closeTimer = null;
    reader.pdfDoc = null;
    reader.totalPages = 0;
    reader.pageNum = 1;
    reader.zoom = 1;
    const container = document.getElementById('flipbook-container');
    if (container) {
      container.innerHTML = '';
      container.className = '';
      container.style.cssText = '';
    }
  }, 350);
}

// ---------- To'liq ekran (brauzer) ----------
function toggleFlipbookFullscreen() {
  const modal = document.querySelector('#flipbook-modal .flipbook-modal-content');
  if (document.fullscreenElement) {
    document.exitFullscreen().catch(() => {});
  } else if (modal && modal.requestFullscreen) {
    modal.requestFullscreen().catch(() => {});
  }
}

// ---------- O'lcham o'zgarganda qayta moslash ----------
let resizeTimer;
function refit() {
  if (reader.mode !== 'pdf' || !reader.pdfDoc) return;
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(async () => {
    await computeFitScale();
    scheduleRender();
  }, 180);
}

window.addEventListener('resize', () => {
  const modal = document.getElementById('flipbook-modal');
  if (modal && modal.classList.contains('active')) refit();
});

document.addEventListener('fullscreenchange', () => {
  const modal = document.getElementById('flipbook-modal');
  if (modal && modal.classList.contains('active')) refit();
});

// ---------- Klaviatura ----------
document.addEventListener('keydown', (e) => {
  const modal = document.getElementById('flipbook-modal');
  if (!modal || !modal.classList.contains('active')) return;

  switch (e.key) {
    case 'ArrowLeft':
    case 'ArrowUp':
    case 'PageUp':
      e.preventDefault(); flipPrev(); break;
    case 'ArrowRight':
    case 'ArrowDown':
    case 'PageDown':
      e.preventDefault(); flipNext(); break;
    case '+':
    case '=':
      e.preventDefault(); zoomIn(); break;
    case '-':
    case '_':
      e.preventDefault(); zoomOut(); break;
    case '0':
      e.preventDefault(); zoomFit(); break;
    case 'Escape':
      closeFlipbook(); break;
  }
});

// ---------- Ctrl + g'ildirak bilan zoom ----------
document.addEventListener('wheel', (e) => {
  const modal = document.getElementById('flipbook-modal');
  if (!modal || !modal.classList.contains('active')) return;
  if (reader.mode !== 'pdf') return;
  if (!e.ctrlKey) return;
  e.preventDefault();
  if (e.deltaY < 0) zoomIn(); else zoomOut();
}, { passive: false });

// ---------- QR chuqur havola (?book=<id>) ----------
function checkUrlBookParam() {
  const params = new URLSearchParams(window.location.search);
  const bookId = params.get('book');
  if (!bookId) return;
  const list = (typeof state !== 'undefined' && state.books) ? state.books : [];
  const book = list.find(b => b.id === parseInt(bookId, 10));
  if (book) {
    const lang = (typeof state !== 'undefined') ? state.currentLang : 'uz';
    const title = book.title[lang] || book.title.uz;
    const qr = (typeof bookQrDataUrl === 'function') ? bookQrDataUrl(book.id) : '';
    setTimeout(() => openFlipbook(book.file, title, qr), 600);
  }
}
