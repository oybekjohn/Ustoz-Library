/* ============================================
   DL-library.uz — Taqdimot (slayd) vieweri
   PDF — ichki PDF.js viewer (canvas, swipe, fullscreen).
   PPT/PPTX — Microsoft Office online embed viewer.
   Progress localStorage'da saqlanadi.
   ============================================ */

import { saveItemProgress, getItemProgress } from './local-progress.js?v=7.1.2';

const PDFJS_URL = '/js/vendor/pdf.min.js';
const PDFJS_WORKER_URL = '/js/vendor/pdf.worker.min.js';

const TEXTS = {
  uz: {
    loading: 'Slaydlar yuklanmoqda...',
    slide: 'Slayd',
    fullscreen: "To'liq ekran",
    loadError: "Slaydlarni ochishda xatolik yuz berdi. Keyinroq urinib ko'ring.",
    officeHint: "Taqdimot Microsoft Office viewer orqali ochilmoqda.",
  },
  ru: {
    loading: 'Загрузка слайдов...',
    slide: 'Слайд',
    fullscreen: 'Во весь экран',
    loadError: 'Не удалось открыть слайды. Попробуйте позже.',
    officeHint: 'Презентация открывается через Microsoft Office viewer.',
  },
  en: {
    loading: 'Loading slides...',
    slide: 'Slide',
    fullscreen: 'Fullscreen',
    loadError: 'Failed to open slides. Please try again later.',
    officeHint: 'The presentation opens via the Microsoft Office viewer.',
  },
};

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

export async function initPresentationViewer(pres, containerEl, { lang = 'uz' } = {}) {
  const tr = TEXTS[lang] || TEXTS.uz;
  const title = pres[`title_${lang}`] || pres.title_uz || '';
  const fileUrl = pres.pdf_key ? `/files/${pres.pdf_key}` : '';
  const ext = (pres.pdf_key || '').split('.').pop().toLowerCase();

  if (ext === 'ppt' || ext === 'pptx') {
    renderOfficeViewer(containerEl, fileUrl, title, tr);
    saveItemProgress('presentations', pres.id, { opened: true });
    return;
  }

  renderPdfViewer(pres, containerEl, fileUrl, title, tr);
}

// ---------- Office (PPT/PPTX) viewer ----------
function renderOfficeViewer(containerEl, fileUrl, title, tr) {
  const absoluteUrl = new URL(fileUrl, location.origin).href;
  const embedUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(absoluteUrl)}`;

  containerEl.innerHTML = `
    <section class="pres-viewer" id="pres-viewer-box">
      <header class="pres-viewer__header">
        <h2 class="pres-viewer__title"></h2>
        <button class="btn btn-icon pres-viewer__fs" title="${tr.fullscreen}">⛶</button>
      </header>
      <div class="pres-viewer__office-wrap">
        <iframe class="pres-viewer__office-frame" src="${embedUrl}" allowfullscreen></iframe>
      </div>
      <p class="pres-viewer__hint">${tr.officeHint}</p>
    </section>
  `;
  containerEl.querySelector('.pres-viewer__title').textContent = title;
  containerEl.querySelector('.pres-viewer__fs').addEventListener('click', () => {
    toggleFullscreen(containerEl.querySelector('#pres-viewer-box'));
  });
}

// ---------- PDF viewer (ichki) ----------
async function renderPdfViewer(pres, containerEl, fileUrl, title, tr) {
  containerEl.innerHTML = `
    <section class="pres-viewer" id="pres-viewer-box">
      <header class="pres-viewer__header">
        <h2 class="pres-viewer__title"></h2>
        <div class="pres-viewer__header-right">
          <span class="pres-viewer__counter" id="pres-counter">— / —</span>
          <button class="btn btn-icon pres-viewer__fs" title="${tr.fullscreen}">⛶</button>
        </div>
      </header>
      <div class="pres-viewer__progress"><div class="pres-viewer__progress-fill" id="pres-progress-fill"></div></div>
      <div class="pres-viewer__stage" id="pres-stage">
        <div class="pres-viewer__loading" id="pres-loading">
          <div class="flipbook-spinner"></div>
          <p>${tr.loading}</p>
        </div>
        <canvas class="pres-viewer__canvas" id="pres-canvas" hidden></canvas>
        <button class="pres-viewer__nav pres-viewer__nav--prev" id="pres-prev" aria-label="Oldingi slayd">‹</button>
        <button class="pres-viewer__nav pres-viewer__nav--next" id="pres-next" aria-label="Keyingi slayd">›</button>
      </div>
    </section>
  `;
  containerEl.querySelector('.pres-viewer__title').textContent = title;

  const stage = containerEl.querySelector('#pres-stage');
  const canvas = containerEl.querySelector('#pres-canvas');
  const counter = containerEl.querySelector('#pres-counter');
  const progressFill = containerEl.querySelector('#pres-progress-fill');
  const loadingEl = containerEl.querySelector('#pres-loading');
  const prevBtn = containerEl.querySelector('#pres-prev');
  const nextBtn = containerEl.querySelector('#pres-next');
  const fsBtn = containerEl.querySelector('.pres-viewer__fs');
  const box = containerEl.querySelector('#pres-viewer-box');

  let pdfDoc = null;
  let pageNum = 1;
  let rendering = false;
  let pendingPage = null;

  try {
    if (typeof window.pdfjsLib === 'undefined') {
      await loadScript(PDFJS_URL);
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL;
    }
    pdfDoc = await window.pdfjsLib.getDocument(fileUrl).promise;
  } catch (err) {
    console.error('PDF load error:', err);
    stage.innerHTML = `<p class="error-msg">${tr.loadError}</p>`;
    return;
  }

  const total = pdfDoc.numPages;

  // Oxirgi ko'rilgan slayddan davom etish
  const saved = getItemProgress('presentations', pres.id);
  if (saved && saved.slide >= 1 && saved.slide <= total) {
    pageNum = saved.slide;
  }

  loadingEl.hidden = true;
  canvas.hidden = false;

  async function renderPage(num) {
    if (rendering) {
      pendingPage = num;
      return;
    }
    rendering = true;
    try {
      const page = await pdfDoc.getPage(num);
      const stageWidth = stage.clientWidth || 800;
      const stageHeight = Math.max(stage.clientHeight, 320) || 600;
      const baseViewport = page.getViewport({ scale: 1 });
      const scale = Math.min(stageWidth / baseViewport.width, stageHeight / baseViewport.height);
      const dpr = window.devicePixelRatio || 1;
      const viewport = page.getViewport({ scale: scale * dpr });

      canvas.width = viewport.width;
      canvas.height = viewport.height;
      canvas.style.width = `${viewport.width / dpr}px`;
      canvas.style.height = `${viewport.height / dpr}px`;

      await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
    } finally {
      rendering = false;
      if (pendingPage !== null) {
        const next = pendingPage;
        pendingPage = null;
        renderPage(next);
      }
    }
  }

  function updateUi() {
    counter.textContent = `${pageNum} / ${total}`;
    progressFill.style.width = `${(pageNum / total) * 100}%`;
    prevBtn.disabled = pageNum <= 1;
    nextBtn.disabled = pageNum >= total;
  }

  function goTo(num) {
    if (num < 1 || num > total || num === pageNum) return;
    pageNum = num;
    updateUi();
    renderPage(pageNum);
    saveItemProgress('presentations', pres.id, {
      slide: pageNum,
      totalSlides: total,
      percent: Math.round((pageNum / total) * 100),
    });
  }

  prevBtn.addEventListener('click', () => goTo(pageNum - 1));
  nextBtn.addEventListener('click', () => goTo(pageNum + 1));
  fsBtn.addEventListener('click', () => toggleFullscreen(box));

  // Klaviatura
  const keyHandler = (e) => {
    if (!document.body.contains(box)) {
      document.removeEventListener('keydown', keyHandler);
      return;
    }
    if (e.key === 'ArrowLeft') goTo(pageNum - 1);
    if (e.key === 'ArrowRight' || e.key === ' ') goTo(pageNum + 1);
  };
  document.addEventListener('keydown', keyHandler);

  // Mobil swipe
  let touchStartX = null;
  stage.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
  }, { passive: true });
  stage.addEventListener('touchend', (e) => {
    if (touchStartX === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX;
    touchStartX = null;
    if (Math.abs(dx) < 45) return;
    if (dx < 0) goTo(pageNum + 1);
    else goTo(pageNum - 1);
  }, { passive: true });

  // O'lcham o'zgarganda qayta chizish
  let resizeTimer = null;
  const resizeHandler = () => {
    if (!document.body.contains(box)) {
      window.removeEventListener('resize', resizeHandler);
      return;
    }
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => renderPage(pageNum), 200);
  };
  window.addEventListener('resize', resizeHandler);
  document.addEventListener('fullscreenchange', () => {
    setTimeout(() => renderPage(pageNum), 100);
  });

  updateUi();
  renderPage(pageNum);
  saveItemProgress('presentations', pres.id, { slide: pageNum, totalSlides: total });
}

function toggleFullscreen(el) {
  if (!el) return;
  if (document.fullscreenElement) {
    document.exitFullscreen().catch(() => {});
  } else if (el.requestFullscreen) {
    el.requestFullscreen().catch(() => {});
  }
}
