/**
 * Presentation Slide Viewer & Progress Tracker
 */
import { currentUser } from './auth.js';

let currentSlide = 1;
let totalSlides = 1;
let presentationId = null;
let progressTimer = null;

export function renderAnonymousWarning(containerEl) {
  // Hozircha o'chirilgan — keyingi versiyada Google OAuth bilan birga qaytariladi
}

export function initPresentationViewer(id, pdfUrl, pageCount, containerEl) {
  presentationId = id;
  totalSlides = pageCount || 1;
  currentSlide = 1;

  // renderAnonymousWarning — hozircha o'chirilgan

  containerEl.innerHTML += `
    <div class="presentation-viewer-box" id="pres-viewer-box">
      <div class="pres-slide-display" id="pres-slide-display">
        <iframe src="${pdfUrl}#page=1" id="pres-pdf-iframe" width="100%" height="500px" style="border:none;"></iframe>
      </div>
      <div class="pres-toolbar">
        <button id="pres-prev-btn" class="btn btn-secondary">◀ Oldingi</button>
        <span class="pres-page-info">Slayd <strong id="pres-current-page">1</strong> / ${totalSlides}</span>
        <button id="pres-next-btn" class="btn btn-secondary">Keyingi ▶</button>
        <button id="pres-fullscreen-btn" class="btn btn-icon" title="To'liq ekran">⛶</button>
      </div>
    </div>
  `;

  const prevBtn = document.getElementById('pres-prev-btn');
  const nextBtn = document.getElementById('pres-next-btn');
  const iframe = document.getElementById('pres-pdf-iframe');
  const pageDisplay = document.getElementById('pres-current-page');
  const fsBtn = document.getElementById('pres-fullscreen-btn');

  const updateSlide = (newSlide) => {
    if (newSlide < 1 || newSlide > totalSlides) return;
    currentSlide = newSlide;
    pageDisplay.textContent = currentSlide;
    iframe.src = `${pdfUrl}#page=${currentSlide}`;

    scheduleProgressSave();
  };

  prevBtn.addEventListener('click', () => updateSlide(currentSlide - 1));
  nextBtn.addEventListener('click', () => updateSlide(currentSlide + 1));

  fsBtn.addEventListener('click', () => {
    const box = document.getElementById('pres-viewer-box');
    if (box.requestFullscreen) box.requestFullscreen();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') updateSlide(currentSlide - 1);
    if (e.key === 'ArrowRight') updateSlide(currentSlide + 1);
  });
}

function scheduleProgressSave() {
  if (!currentUser || !presentationId) return;

  clearTimeout(progressTimer);
  progressTimer = setTimeout(async () => {
    const percent = (currentSlide / totalSlides) * 100;
    try {
      await fetch(`/api/progress/presentation/${presentationId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          progress_percent: percent,
          position_value: currentSlide
        })
      });
    } catch (err) {
      console.error('Progress save error:', err);
    }
  }, 3000);
}
