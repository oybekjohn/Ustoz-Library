/* ============================================
   DL-LIBRARY.UZ — PDF o'quvchi (reader)
   Bitta katta sahifa + zoom (50%–400%).
   To'liq ekran, yuklab olishsiz (xavfsiz canvas).
   PDF.js bilan render qilinadi; file:// uchun iframe zaxira.
   TOC: pdf.js outline (B) + foydalanuvchi belgilagan sahifa (C).
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

// TOC holati
const toc = {
  isOpen: false,
  type: null,          // null | 'outline' | 'custom'
  outline: [],         // pdf.js outline (B)
  customPage: null,    // foydalanuvchi belgilagan sahifa raqami (C)
  customCanvas: null,  // custom toc sahifa canvasi
};

const ZOOM_MIN = 0.5;
const ZOOM_MAX = 4;
const ZOOM_STEP = 1.25;

let rendering = false;
let dirty = false;

// ---------- Ochish ----------
async function openFlipbook(file, title, qrImage) {
  reader.file = file;
  reader.title = title;

  if (reader.closeTimer) { clearTimeout(reader.closeTimer); reader.closeTimer = null; }

  // TOC holatini tozalash
  toc.isOpen = false;
  toc.type = null;
  toc.outline = [];
  toc.customPage = null;
  toc.customCanvas = null;

  const modal = document.getElementById('flipbook-modal');
  const modalTitle = document.getElementById('flipbook-title');
  const qrContainer = document.getElementById('flipbook-qr');
  const tocPanel = document.getElementById('flipbook-toc');
  const tocBtn = document.getElementById('toggle-toc-btn');

  modalTitle.textContent = title;
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';

  // TOC panelni yashirish
  if (tocPanel) tocPanel.style.display = 'none';
  if (tocBtn) tocBtn.classList.remove('toc-active');

  // QR
  if (qrImage && qrContainer) {
    qrContainer.innerHTML = `<img src="${qrImage}" alt="QR Code" class="flipbook-qr__img" onerror="this.parentElement.style.display='none'" draggable="false">`;
    qrContainer.style.display = 'block';
  } else if (qrContainer) {
    qrContainer.style.display = 'none';
  }

  // Lazy load PDF.js
  if (typeof window.pdfjsLib === 'undefined' && !isLocalFile) {
    const loading = document.getElementById('flipbook-loading');
    if (loading) loading.style.display = 'flex';
    try {
      await loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js');
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    } catch (e) {
      console.error('PDF.js yuklashda xatolik', e);
    }
  }

  const hasPdfJs = typeof window.pdfjsLib !== 'undefined';
  if (hasPdfJs && !isLocalFile) {
    await openPdfReader(file);
  } else {
    openSecureIframe(file);
  }
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

// ---------- PDF reader ----------
async function openPdfReader(file) {
  reader.mode = 'pdf';
  const container = document.getElementById('flipbook-container');
  const loading = document.getElementById('flipbook-loading');

  showControls(true);
  loading.style.display = 'flex';
  container.innerHTML = '';
  container.className = 'reader-scroll';

  try {
    const task = window.pdfjsLib.getDocument(encodeURI(file));
    reader.pdfDoc = await task.promise;
    reader.totalPages = reader.pdfDoc.numPages;
    reader.pageNum = 1;
    reader.zoom = 1;

    await computeFitScale();
    scheduleRender();
    updatePageInfo();
    updateZoomInfo();

    // B: PDF outline (mundarija) ni yuklash
    await loadPdfOutline();

  } catch (err) {
    console.warn('PDF yuklashda xatolik:', err && err.message);
    openSecureIframe(file);
  }
}

// ---- Ekranga to'liq sig'diruvchi masshtab ----
async function computeFitScale() {
  if (!reader.pdfDoc) return;
  const page = await reader.pdfDoc.getPage(reader.pageNum);
  const vp = page.getViewport({ scale: 1 });
  // Endi reader wrapper ni o'lchaymiz (toc panel ochiq bo'lsa kichikroq)
  const wrapper = document.querySelector('.flipbook-reader-wrapper') ||
                  document.getElementById('flipbook-body');
  const availW = Math.max(240, wrapper.clientWidth - 32);
  const availH = Math.max(240, wrapper.clientHeight - 32);
  reader.fitScale = Math.min(availW / vp.width, availH / vp.height);
}

// ---------- B: PDF Outline (rasmiy mundarija) ----------
async function loadPdfOutline() {
  if (!reader.pdfDoc) return;
  try {
    const outline = await reader.pdfDoc.getOutline();
    if (outline && outline.length > 0) {
      toc.type = 'outline';
      toc.outline = outline;
      // Outline bor — TOC tugmasini sezilarli qilish
      const tocBtn = document.getElementById('toggle-toc-btn');
      if (tocBtn) {
        tocBtn.title = 'Mundarija mavjud — ko\'rish';
        tocBtn.style.borderColor = 'var(--primary-500)';
      }
    } else {
      toc.type = null; // Outline yo'q — C rejim
    }
  } catch (e) {
    toc.type = null;
  }
}

// Outline item sahifasini aniqlash (destination yoki action orqali)
async function resolveOutlineDest(item) {
  try {
    let dest = item.dest;
    if (typeof dest === 'string') {
      dest = await reader.pdfDoc.getDestination(dest);
    }
    if (!dest || !dest[0]) return null;
    const pageRef = dest[0];
    // pageIndex 0-based, pageNum 1-based
    const pageIndex = await reader.pdfDoc.getPageIndex(pageRef);
    return pageIndex + 1;
  } catch (e) {
    return null;
  }
}

// ---------- TOC Panel toggle ----------
function toggleTocPanel() {
  toc.isOpen = !toc.isOpen;
  const tocPanel = document.getElementById('flipbook-toc');
  const tocBtn = document.getElementById('toggle-toc-btn');

  if (toc.isOpen) {
    tocPanel.style.display = 'flex';
    if (tocBtn) tocBtn.classList.add('toc-active');
    renderTocContent();
  } else {
    tocPanel.style.display = 'none';
    if (tocBtn) tocBtn.classList.remove('toc-active');
  }

  // Toc panel kengligiga ko'ra fitScale ni qayta hisoblash
  setTimeout(async () => {
    await computeFitScale();
    scheduleRender();
  }, 320);
}

// ---------- TOC Content render ----------
async function renderTocContent() {
  const contentEl = document.getElementById('flipbook-toc-content');
  if (!contentEl) return;

  if (toc.type === 'outline' && toc.outline.length > 0) {
    // B: PDF outline ko'rsatish
    contentEl.innerHTML = '';
    const ul = document.createElement('div');
    ul.className = 'toc-outline-list';
    await renderOutlineItems(ul, toc.outline, 0);
    contentEl.appendChild(ul);

  } else if (toc.type === 'custom' && toc.customPage) {
    // C: Foydalanuvchi belgilagan sahifa canvas ko'rsatish
    contentEl.innerHTML = '';
    await renderCustomTocPage(contentEl, toc.customPage);

  } else {
    // Hech nima yo'q — yo'riqnoma
    contentEl.innerHTML = `
      <div style="padding:16px;text-align:center;color:var(--text-muted);font-size:0.82rem;line-height:1.7;">
        <div style="font-size:2rem;margin-bottom:8px;">📋</div>
        <p>Bu PDF da avtomatik mundarija topilmadi.</p>
        <p style="margin-top:8px;">Mundarija sahifasiga o'ting va <strong>"Joriy sahifani mundarija qilish"</strong> tugmasini bosing.</p>
      </div>
    `;
  }
}

// PDF outline itemlarini rekursiv render qilish
async function renderOutlineItems(container, items, depth) {
  for (const item of items) {
    const div = document.createElement('div');
    div.className = 'toc-item';
    div.style.setProperty('--toc-depth', depth);

    // Sahifa raqamini aniqlash
    const pageNum = await resolveOutlineDest(item);

    div.innerHTML = `
      <span class="toc-item__title">${escapeHtml(item.title || '—')}</span>
      ${pageNum ? `<span class="toc-item__page">${pageNum}</span>` : ''}
    `;

    if (pageNum) {
      div.addEventListener('click', () => goToPageInReader(pageNum));
    }

    container.appendChild(div);

    // Bolalar (ichki outline)
    if (item.items && item.items.length > 0) {
      await renderOutlineItems(container, item.items, depth + 1);
    }
  }
}

// Joriy sahifada TOC item ni highlight qilish
function updateTocActiveItem() {
  if (!toc.isOpen || toc.type !== 'outline') return;
  document.querySelectorAll('.toc-item').forEach(el => {
    el.classList.remove('active');
  });
  // Hozirgi sahifaga mos yoki undan kichik eng yaqin item ni active qilish
  const items = document.querySelectorAll('.toc-item[data-page]');
  // data-page attributi yo'q, lekin event listener orqali sahifaga o'tamiz
  // Oddiy yondashuv: active classni goToPageInReader da belgilaymiz
}

// C: Custom TOC sahifasini chap panelda render qilish
async function renderCustomTocPage(container, pageNum) {
  if (!reader.pdfDoc) return;

  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'position:relative;width:100%;height:100%;overflow:hidden;display:flex;flex-direction:column;';

  // Sahifa canvasini render qilish
  try {
    const page = await reader.pdfDoc.getPage(pageNum);
    const vp = page.getViewport({ scale: 1 });
    const panelWidth = 240; // toc panelning taxminiy kengligi
    const scale = panelWidth / vp.width;
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    canvas.style.cssText = `width:100%;height:auto;display:block;cursor:pointer;`;
    canvas.title = 'Ushbu sahifaga o\'tish uchun bosing';

    const ctx = canvas.getContext('2d', { alpha: false });
    await page.render({ canvasContext: ctx, viewport }).promise;

    canvas.addEventListener('click', () => goToPageInReader(pageNum));

    const scrollArea = document.createElement('div');
    scrollArea.style.cssText = 'flex:1;overflow-y:auto;padding:8px;';
    scrollArea.appendChild(canvas);

    // Navigation: oldingi/keyingi sahifani ko'rish
    const navBar = document.createElement('div');
    navBar.className = 'toc-page-nav';
    navBar.innerHTML = `
      <button onclick="navigateCustomToc(-1)" title="Oldingi sahifa">◀</button>
      <span>Sahifa ${pageNum}</span>
      <button onclick="navigateCustomToc(1)" title="Keyingi sahifa">▶</button>
      <button onclick="goToPageInReader(${pageNum})" 
              style="padding:0 8px;width:auto;font-size:0.75rem;background:var(--gradient-primary);border-color:transparent;color:#fff;">
        O'qishga o'tish
      </button>
    `;

    wrapper.appendChild(scrollArea);
    wrapper.appendChild(navBar);
    container.appendChild(wrapper);

    toc.customCanvas = canvas;
  } catch (e) {
    container.innerHTML = `<div style="padding:16px;color:var(--text-muted);font-size:0.82rem;">Sahifani ko'rsatib bo'lmadi.</div>`;
  }
}

// Custom TOC sahifasini + 1 yoki - 1 siljitish
async function navigateCustomToc(delta) {
  if (!toc.customPage) return;
  const newPage = Math.max(1, Math.min(reader.totalPages, toc.customPage + delta));
  toc.customPage = newPage;
  const contentEl = document.getElementById('flipbook-toc-content');
  if (contentEl) {
    contentEl.innerHTML = '';
    await renderCustomTocPage(contentEl, newPage);
  }
}

// ---------- C: Joriy sahifani mundarija sifatida belgilash ----------
function setCurrentPageAsToc() {
  toc.type = 'custom';
  toc.customPage = reader.pageNum;
  const contentEl = document.getElementById('flipbook-toc-content');
  if (contentEl) {
    contentEl.innerHTML = '';
    renderCustomTocPage(contentEl, reader.pageNum);
  }
}

// ---------- Reader da sahifaga o'tish ----------
function goToPageInReader(pageNum) {
  if (!reader.pdfDoc) return;
  const p = Math.max(1, Math.min(reader.totalPages, pageNum));
  reader.pageNum = p;
  scheduleRender();
  updatePageInfo();

  // TOC da active item highlight
  document.querySelectorAll('.toc-item').forEach(el => el.classList.remove('active'));
  const allItems = document.querySelectorAll('.toc-item');
  // Hozircha sahifaga click qilingan item ni highlight qilish
  // (next render da yangilanadi)
}

// ---------- Render ----------
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
    container.scrollTop = 0;
    container.scrollLeft = Math.max(0, (canvas.offsetWidth - container.clientWidth) / 2);

    // Sahifa o'zganda TOC da active item ni yangilash
    syncTocActiveItem();

  } catch (e) {
    if (!(e && e.name === 'RenderingCancelledException')) {
      console.error('Render xatosi:', e);
    }
  } finally {
    reader.renderTask = null;
    rendering = false;
    if (dirty) doRender();
  }
}

// TOC outline da joriy sahifaga mos itemni active qilish
function syncTocActiveItem() {
  if (!toc.isOpen || toc.type !== 'outline') return;
  // Barcha toc-item lar orasidan joriy sahifaga eng yaqin (<=) bo'lganini topish
  // Hozircha sahifa raqami to'g'ridan-to'g'ri saqlanmagan, keyingi bosqichda
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

function showControls(show) {
  document.querySelectorAll('.flipbook-nav-btn').forEach(b => b.style.display = show ? '' : 'none');
  const zoom = document.getElementById('flipbook-zoom');
  if (zoom) zoom.style.display = show ? 'flex' : 'none';
}

// ---------- Iframe zaxira ----------
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

  // TOC tozalash
  toc.isOpen = false;
  toc.type = null;
  toc.outline = [];
  toc.customPage = null;
  const tocPanel = document.getElementById('flipbook-toc');
  const tocBtn = document.getElementById('toggle-toc-btn');
  if (tocPanel) tocPanel.style.display = 'none';
  if (tocBtn) {
    tocBtn.classList.remove('toc-active');
    tocBtn.style.borderColor = '';
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

// ---------- To'liq ekran ----------
function toggleFlipbookFullscreen() {
  const modal = document.querySelector('#flipbook-modal .flipbook-modal-content');
  if (document.fullscreenElement) {
    document.exitFullscreen().catch(() => {});
  } else if (modal && modal.requestFullscreen) {
    modal.requestFullscreen().catch(() => {});
  }
}

// ---------- Resize ----------
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

// ---------- QR chuqur havola ----------
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

// ---------- Utility ----------
function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}
