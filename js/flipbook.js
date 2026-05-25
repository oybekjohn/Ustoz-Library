/* ============================================
   USTOZ KUTUBXONASI — Flipbook Reader
   PDF.js + StPageFlip integration
   Dual mode: flipbook on http(s), iframe on file://
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
// Lightweight page flip sound using Web Audio API
function createFlipSound() {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

    return function playFlip() {
      // Create a short "swish" sound
      const duration = 0.25;
      const now = audioCtx.currentTime;

      // White noise burst for paper sound
      const bufferSize = audioCtx.sampleRate * duration;
      const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
      const data = buffer.getChannelData(0);

      for (let i = 0; i < bufferSize; i++) {
        const t = i / audioCtx.sampleRate;
        // Envelope: quick attack, fast decay
        const envelope = Math.exp(-t * 18) * 0.3;
        // Filtered noise for paper-like sound
        data[i] = (Math.random() * 2 - 1) * envelope;
      }

      const source = audioCtx.createBufferSource();
      source.buffer = buffer;

      // Bandpass filter for paper-like quality
      const filter = audioCtx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 3000;
      filter.Q.value = 0.8;

      // Gain control
      const gain = audioCtx.createGain();
      gain.gain.value = 0.15;

      source.connect(filter);
      filter.connect(gain);
      gain.connect(audioCtx.destination);

      source.start(now);
      source.stop(now + duration);
    };
  } catch (e) {
    return function() {}; // Fallback: no sound
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
    qrContainer.innerHTML = `<img src="${qrImage}" alt="QR Code" class="flipbook-qr__img" onerror="this.parentElement.style.display='none'">`;
    qrContainer.style.display = 'block';
  } else if (qrContainer) {
    qrContainer.style.display = 'none';
  }

  // Choose mode based on protocol
  if (isLocalFile) {
    openIframeMode(file, container, loading, pageInfo);
  } else {
    await openFlipbookMode(file, container, loading, pageInfo);
  }
}

// ---------- IFRAME MODE (for file:// protocol) ----------
function openIframeMode(file, container, loading, pageInfo) {
  loading.style.display = 'none';
  if (pageInfo) pageInfo.textContent = '';

  // Hide flipbook nav buttons in iframe mode
  const navBtns = document.querySelectorAll('.flipbook-nav-btn');
  navBtns.forEach(btn => btn.style.display = 'none');

  // Create iframe for browser's built-in PDF viewer
  container.innerHTML = '';
  const iframe = document.createElement('iframe');
  iframe.src = file;
  iframe.style.cssText = `
    width: 100%;
    height: 100%;
    min-height: 70vh;
    border: none;
    border-radius: 8px;
    background: #fff;
  `;
  iframe.title = flipbookState.currentBookTitle;
  container.appendChild(iframe);
}

// ---------- FLIPBOOK MODE (for http/https) ----------
async function openFlipbookMode(file, container, loading, pageInfo) {
  // Init sound on first interaction
  if (!playFlipSound) {
    playFlipSound = createFlipSound();
  }

  // Show nav buttons
  const navBtns = document.querySelectorAll('.flipbook-nav-btn');
  navBtns.forEach(btn => btn.style.display = '');

  // Show loading
  loading.style.display = 'flex';
  container.innerHTML = '';

  try {
    // Load PDF — encode URL for http/https (spaces, Cyrillic in filenames)
    const pdfUrl = encodeURI(file);
    const loadingTask = pdfjsLib.getDocument(pdfUrl);
    flipbookState.pdfDoc = await loadingTask.promise;
    flipbookState.totalPages = flipbookState.pdfDoc.numPages;
    flipbookState.renderedPages.clear();

    // Determine page dimensions from first page
    const firstPage = await flipbookState.pdfDoc.getPage(1);
    const viewport = firstPage.getViewport({ scale: 1 });
    const pageRatio = viewport.height / viewport.width;

    // Calculate container size
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

    // Create page elements
    container.innerHTML = '';

    for (let i = 0; i < flipbookState.totalPages; i++) {
      const pageDiv = document.createElement('div');
      pageDiv.className = 'flipbook-page';
      pageDiv.dataset.pageNum = i + 1;

      // Loading placeholder
      const placeholder = document.createElement('div');
      placeholder.className = 'flipbook-page__loading';
      placeholder.innerHTML = `<span>${i + 1}</span>`;
      pageDiv.appendChild(placeholder);

      container.appendChild(pageDiv);
    }

    // Hide loading
    loading.style.display = 'none';

    // Initialize StPageFlip
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

    // Render visible pages
    await renderPage(1);
    if (flipbookState.totalPages > 1) await renderPage(2);

    // Events
    flipbookState.pageFlip.on('flip', async (e) => {
      playFlipSound && playFlipSound();
      flipbookState.currentPage = e.data;
      updatePageInfo();

      // Pre-render nearby pages
      const pg = e.data + 1;
      for (let i = Math.max(1, pg - 1); i <= Math.min(flipbookState.totalPages, pg + 3); i++) {
        await renderPage(i);
      }
    });

    flipbookState.currentPage = 0;
    updatePageInfo();

  } catch (error) {
    console.error('PDF yuklashda xatolik:', error);
    loading.innerHTML = `
      <div style="text-align:center;color:var(--text-muted);">
        <div style="font-size:2rem;margin-bottom:12px;">⚠️</div>
        <div>PDF faylni yuklashda xatolik</div>
        <div style="font-size:0.85rem;margin-top:8px;opacity:0.7;">${error.message}</div>
      </div>
    `;
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

    const ctx = canvas.getContext('2d');
    await page.render({ canvasContext: ctx, viewport: viewport }).promise;

    // Find the page element and replace placeholder
    const pageElements = document.querySelectorAll('.flipbook-page');
    const pageEl = pageElements[pageNum - 1];
    if (pageEl) {
      pageEl.innerHTML = '';
      canvas.style.width = '100%';
      canvas.style.height = '100%';
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
    if (container) container.innerHTML = '';

    // Restore nav buttons visibility
    const navBtns = document.querySelectorAll('.flipbook-nav-btn');
    navBtns.forEach(btn => btn.style.display = '');
  }, 400);
}

// ---------- Download Current ----------
function downloadFromFlipbook() {
  if (flipbookState.currentBookFile) {
    const a = document.createElement('a');
    a.href = encodeURI(flipbookState.currentBookFile);
    a.download = '';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
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
