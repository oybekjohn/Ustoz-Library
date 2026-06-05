/* ============================================
   DL-LIBRARY.UZ — Flipbook Reader
   PDF.js canvas rendering (no download, no iframe)
   Dual mode: flipbook (StPageFlip) or scroll view
   ============================================ */

// ---------- Detect protocol ----------
const isLocalFile = window.location.protocol === 'file:';

// ---------- Flipbook State ----------
const flipbookState = {
  pdfDoc: null,
  pageFlip: null,
  totalPages: 0,
  currentPage: 0,
  renderedPages: new Map(),
  isLoading: false,
  currentBookFile: '',
  currentBookTitle: '',
  currentBookQr: '',
  scale: 1.2
};

// ---------- Page Flip Sound ----------
function createFlipSound() {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

    return function playFlip() {
      const duration = 0.25;
      const now = audioCtx.currentTime;

      const bufferSize = audioCtx.sampleRate * duration;
      const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
      const data = buffer.getChannelData(0);

      for (let i = 0; i < bufferSize; i++) {
        const t = i / audioCtx.sampleRate;
        const envelope = Math.exp(-t * 18) * 0.3;
        data[i] = (Math.random() * 2 - 1) * envelope;
      }

      const source = audioCtx.createBufferSource();
      source.buffer = buffer;

      const filter = audioCtx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 3000;
      filter.Q.value = 0.8;

      const gain = audioCtx.createGain();
      gain.gain.value = 0.15;

      source.connect(filter);
      filter.connect(gain);
      gain.connect(audioCtx.destination);

      source.start(now);
      source.stop(now + duration);
    };
  } catch (e) {
    return function() {};
  }
}

let playFlipSound = null;

// ---------- Open Flipbook ----------
async function openFlipbook(file, title, qrImage) {
  flipbookState.currentBookFile = file;
  flipbookState.currentBookTitle = title;
  flipbookState.currentBookQr = qrImage || '';

  const modal = document.getElementById('flipbook-modal');
  const modalTitle = document.getElementById('flipbook-title');
  const container = document.getElementById('flipbook-container');
  const loading = document.getElementById('flipbook-loading');
  const pageInfo = document.getElementById('flipbook-page-info');
  const qrContainer = document.getElementById('flipbook-qr');

  modalTitle.textContent = title;
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';

  // Show QR code if available
  if (qrImage && qrContainer) {
    qrContainer.innerHTML = `<img src="${qrImage}" alt="QR Code" class="flipbook-qr__img" onerror="this.parentElement.style.display='none'" draggable="false">`;
    qrContainer.style.display = 'block';
  } else if (qrContainer) {
    qrContainer.style.display = 'none';
  }

  // Try best rendering mode available
  const hasPageFlip = typeof window.St !== 'undefined' && typeof window.St.PageFlip === 'function';
  const hasPdfJs = typeof pdfjsLib !== 'undefined';

  if (hasPageFlip && hasPdfJs && !isLocalFile) {
    // Best mode: flipbook with page turning (http/https only)
    await openFlipbookMode(file, container, loading, pageInfo);
  } else if (hasPdfJs) {
    // Canvas scroll mode (try PDF.js, fallback to iframe)
    await openScrollMode(file, container, loading, pageInfo);
  } else {
    // Last resort: secure iframe
    openSecureIframe(file, container, loading, pageInfo);
  }
}

// ---------- SCROLL MODE (secure canvas rendering, no iframe) ----------
async function openScrollMode(file, container, loading, pageInfo) {
  loading.style.display = 'flex';
  container.innerHTML = '';

  // Hide flipbook nav buttons in scroll mode
  const navBtns = document.querySelectorAll('.flipbook-nav-btn');
  navBtns.forEach(btn => btn.style.display = 'none');

  try {
    const pdfUrl = isLocalFile ? file : encodeURI(file);
    const loadingTask = pdfjsLib.getDocument(pdfUrl);
    flipbookState.pdfDoc = await loadingTask.promise;
    flipbookState.totalPages = flipbookState.pdfDoc.numPages;

    loading.style.display = 'none';

    // Create scrollable container
    container.style.cssText = `
      width: 100%;
      height: 100%;
      overflow-y: auto;
      overflow-x: hidden;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      padding: 16px;
      -webkit-user-select: none;
      user-select: none;
    `;

    if (pageInfo) pageInfo.textContent = `1 / ${flipbookState.totalPages}`;

    // Render all pages as canvases (secure — no download option)
    for (let i = 1; i <= flipbookState.totalPages; i++) {
      const page = await flipbookState.pdfDoc.getPage(i);

      // Calculate scale to fit container width
      const modalBody = document.getElementById('flipbook-body');
      const availW = modalBody.clientWidth - 48;
      const viewport = page.getViewport({ scale: 1 });
      const scale = Math.min(availW / viewport.width, 2);
      const scaledViewport = page.getViewport({ scale });

      const canvas = document.createElement('canvas');
      canvas.width = scaledViewport.width;
      canvas.height = scaledViewport.height;
      canvas.style.cssText = `
        max-width: 100%;
        height: auto;
        border-radius: 4px;
        box-shadow: 0 2px 12px rgba(0,0,0,0.15);
        background: #fff;
        display: block;
        -webkit-user-select: none;
        user-select: none;
        pointer-events: none;
      `;
      canvas.setAttribute('draggable', 'false');

      // Wrap canvas in a protected div
      const wrapper = document.createElement('div');
      wrapper.className = 'scroll-page-wrapper';
      wrapper.style.cssText = `
        position: relative;
        -webkit-user-select: none;
        user-select: none;
      `;
      wrapper.setAttribute('data-page', i);

      // Add transparent overlay to prevent right-click save on canvas
      const overlay = document.createElement('div');
      overlay.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 2;
        background: transparent;
        -webkit-user-select: none;
        user-select: none;
      `;
      overlay.addEventListener('contextmenu', (e) => e.preventDefault());

      wrapper.appendChild(canvas);
      wrapper.appendChild(overlay);
      container.appendChild(wrapper);

      const ctx = canvas.getContext('2d');
      await page.render({ canvasContext: ctx, viewport: scaledViewport }).promise;

      // Update loading progress
      if (loading.querySelector('.flipbook-loading__text')) {
        loading.querySelector('.flipbook-loading__text').textContent =
          `Sahifalar yuklanmoqda... ${i}/${flipbookState.totalPages}`;
      }
    }

    // Track scroll position for page info
    container.addEventListener('scroll', () => {
      const wrappers = container.querySelectorAll('.scroll-page-wrapper');
      let currentVisible = 1;
      for (const w of wrappers) {
        const rect = w.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        if (rect.top < containerRect.top + containerRect.height / 2) {
          currentVisible = parseInt(w.dataset.page);
        }
      }
      if (pageInfo) pageInfo.textContent = `${currentVisible} / ${flipbookState.totalPages}`;
    }, { passive: true });

  } catch (error) {
    console.warn('PDF.js xatolik (file:// CORS cheklovi):', error.message);
    // Fallback: secure iframe with toolbar hidden (for file:// protocol)
    openSecureIframe(file, container, loading, pageInfo);
  }
}

// ---------- SECURE IFRAME FALLBACK (file:// only, toolbar hidden) ----------
function openSecureIframe(file, container, loading, pageInfo) {
  loading.style.display = 'none';
  if (pageInfo) pageInfo.textContent = '';

  const navBtns = document.querySelectorAll('.flipbook-nav-btn');
  navBtns.forEach(btn => btn.style.display = 'none');

  container.innerHTML = '';
  container.style.cssText = 'width:100%;height:100%;position:relative;';

  // Use #toolbar=0 to hide Chrome PDF viewer toolbar (download/print buttons)
  const iframe = document.createElement('iframe');
  iframe.src = file + '#toolbar=0&navpanes=0&scrollbar=1&view=FitH';
  iframe.style.cssText = `
    width: 100%;
    height: 100%;
    min-height: 70vh;
    border: none;
    border-radius: 8px;
    background: #fff;
  `;
  iframe.title = flipbookState.currentBookTitle;

  // Overlay to block right-click on iframe
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 3;
    background: transparent;
    cursor: default;
  `;
  overlay.addEventListener('contextmenu', (e) => e.preventDefault());
  // Allow click-through for scrolling but block context menu
  overlay.addEventListener('mousedown', (e) => {
    if (e.button === 2) { e.preventDefault(); return false; }
    // Allow left click to pass through to iframe for scrolling
    overlay.style.pointerEvents = 'none';
    setTimeout(() => { overlay.style.pointerEvents = 'auto'; }, 300);
  });

  container.appendChild(iframe);
  container.appendChild(overlay);
}

// ---------- FLIPBOOK MODE (for http/https with StPageFlip) ----------
async function openFlipbookMode(file, container, loading, pageInfo) {
  if (!playFlipSound) {
    playFlipSound = createFlipSound();
  }

  // Show nav buttons
  const navBtns = document.querySelectorAll('.flipbook-nav-btn');
  navBtns.forEach(btn => btn.style.display = '');

  loading.style.display = 'flex';
  container.innerHTML = '';
  container.style.cssText = '';

  try {
    const pdfUrl = encodeURI(file);
    const loadingTask = pdfjsLib.getDocument(pdfUrl);
    flipbookState.pdfDoc = await loadingTask.promise;
    flipbookState.totalPages = flipbookState.pdfDoc.numPages;
    flipbookState.renderedPages.clear();

    const firstPage = await flipbookState.pdfDoc.getPage(1);
    const viewport = firstPage.getViewport({ scale: 1 });
    const pageRatio = viewport.height / viewport.width;

    const modalBody = document.getElementById('flipbook-body');
    const availW = modalBody.clientWidth - 40;
    const availH = modalBody.clientHeight - 20;

    let pageW = Math.min(availW / 2, 500);
    let pageH = pageW * pageRatio;

    if (pageH > availH) {
      pageH = availH;
      pageW = pageH / pageRatio;
    }

    flipbookState.scale = pageW / viewport.width;

    container.innerHTML = '';

    for (let i = 0; i < flipbookState.totalPages; i++) {
      const pageDiv = document.createElement('div');
      pageDiv.className = 'flipbook-page';
      pageDiv.dataset.pageNum = i + 1;

      const placeholder = document.createElement('div');
      placeholder.className = 'flipbook-page__loading';
      placeholder.innerHTML = `<span>${i + 1}</span>`;
      pageDiv.appendChild(placeholder);

      container.appendChild(pageDiv);
    }

    loading.style.display = 'none';

    flipbookState.pageFlip = new St.PageFlip(container, {
      width: Math.round(pageW),
      height: Math.round(pageH),
      size: 'fixed',
      minWidth: 200,
      minHeight: 280,
      maxWidth: 700,
      maxHeight: 1000,
      showCover: true,
      maxShadowOpacity: 0.5,
      mobileScrollSupport: true,
      useMouseEvents: true,
      flippingTime: 800,
      usePortrait: window.innerWidth < 768,
      autoSize: false,
      drawShadow: true,
      startPage: 0
    });

    flipbookState.pageFlip.loadFromHTML(container.querySelectorAll('.flipbook-page'));

    await renderPage(1);
    if (flipbookState.totalPages > 1) await renderPage(2);

    flipbookState.pageFlip.on('flip', async (e) => {
      playFlipSound && playFlipSound();
      flipbookState.currentPage = e.data;
      updatePageInfo();

      const pg = e.data + 1;
      for (let i = Math.max(1, pg - 1); i <= Math.min(flipbookState.totalPages, pg + 3); i++) {
        await renderPage(i);
      }
    });

    flipbookState.currentPage = 0;
    updatePageInfo();

  } catch (error) {
    console.error('PDF yuklashda xatolik:', error);
    // Fallback to scroll mode instead of iframe
    await openScrollMode(file, container, loading, pageInfo);
  }
}

// ---------- Render PDF Page ----------
async function renderPage(pageNum) {
  if (flipbookState.renderedPages.has(pageNum)) return;
  if (!flipbookState.pdfDoc) return;

  flipbookState.renderedPages.set(pageNum, true);

  try {
    const page = await flipbookState.pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale: flipbookState.scale });

    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    canvas.setAttribute('draggable', 'false');

    const ctx = canvas.getContext('2d');
    await page.render({ canvasContext: ctx, viewport: viewport }).promise;

    const pageElements = document.querySelectorAll('.flipbook-page');
    const pageEl = pageElements[pageNum - 1];
    if (pageEl) {
      pageEl.innerHTML = '';
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      canvas.style.pointerEvents = 'none';
      canvas.style.userSelect = 'none';
      canvas.style.webkitUserSelect = 'none';
      pageEl.appendChild(canvas);
    }
  } catch (e) {
    console.error(`${pageNum}-sahifani renderda xatolik:`, e);
  }
}

// ---------- Page Navigation ----------
function flipPrev() {
  if (flipbookState.pageFlip) {
    flipbookState.pageFlip.flipPrev();
  }
}

function flipNext() {
  if (flipbookState.pageFlip) {
    flipbookState.pageFlip.flipNext();
  }
}

function updatePageInfo() {
  const el = document.getElementById('flipbook-page-info');
  if (el && flipbookState.totalPages > 0) {
    const current = flipbookState.currentPage + 1;
    el.textContent = `${current} / ${flipbookState.totalPages}`;
  }
}

// ---------- Close Flipbook ----------
function closeFlipbook() {
  const modal = document.getElementById('flipbook-modal');
  modal.classList.remove('active');
  document.body.style.overflow = '';

  setTimeout(() => {
    if (flipbookState.pageFlip) {
      flipbookState.pageFlip.destroy();
      flipbookState.pageFlip = null;
    }
    flipbookState.pdfDoc = null;
    flipbookState.renderedPages.clear();
    const container = document.getElementById('flipbook-container');
    if (container) {
      container.innerHTML = '';
      container.style.cssText = '';
    }

    // Restore nav buttons visibility
    const navBtns = document.querySelectorAll('.flipbook-nav-btn');
    navBtns.forEach(btn => btn.style.display = '');
  }, 400);
}

// ---------- Download Disabled ----------
function downloadFromFlipbook() {
  return false;
}

// ---------- Fullscreen Flipbook ----------
function toggleFlipbookFullscreen() {
  const modal = document.querySelector('#flipbook-modal .flipbook-modal-content');
  if (document.fullscreenElement) {
    document.exitFullscreen();
  } else if (modal) {
    modal.requestFullscreen();
  }
}

// ---------- Keyboard Navigation ----------
document.addEventListener('keydown', (e) => {
  const modal = document.getElementById('flipbook-modal');
  if (!modal || !modal.classList.contains('active')) return;

  switch(e.key) {
    case 'ArrowLeft':
      flipPrev();
      break;
    case 'ArrowRight':
      flipNext();
      break;
    case 'Escape':
      closeFlipbook();
      break;
  }
});

// ---------- Handle URL parameter for QR ----------
function checkUrlBookParam() {
  const params = new URLSearchParams(window.location.search);
  const bookId = params.get('book');
  if (bookId) {
    const book = BOOKS_DATA.find(b => b.id === parseInt(bookId));
    if (book) {
      const lang = state ? state.currentLang : 'uz';
      const title = book.title[lang] || book.title.uz;
      setTimeout(() => {
        openFlipbook(book.file, title, book.qr);
      }, 800);
    }
  }
}
