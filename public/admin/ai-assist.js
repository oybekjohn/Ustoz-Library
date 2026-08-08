/* ============================================
   DL-library.uz — Admin panel AI yordamchisi
   Header'dagi "AI bilan qo'shish" tugmasi yoqilganda
   formalarni Claude AI to'ldiradi. O'chirilganda barcha
   maydonlar qo'lda kiritiladi (AI so'rov yuborilmaydi).
   ============================================ */

const STORAGE_KEY = 'dl_admin_ai_enabled';

const state = {
  enabled: localStorage.getItem(STORAGE_KEY) !== 'off',
};

const $ = (sel) => document.querySelector(sel);

// ---------- Toggle ----------

function applyToggleState() {
  const btn = $('#ai-toggle');
  if (btn) {
    btn.classList.toggle('is-on', state.enabled);
    btn.setAttribute('aria-pressed', String(state.enabled));
  }
  document.querySelectorAll('.ai-assist').forEach((box) => {
    box.classList.toggle('is-hidden', !state.enabled);
  });
}

export function initAiToggle() {
  const btn = $('#ai-toggle');
  if (!btn) return;

  btn.addEventListener('click', () => {
    state.enabled = !state.enabled;
    localStorage.setItem(STORAGE_KEY, state.enabled ? 'on' : 'off');
    applyToggleState();
    if (state.enabled) btn.classList.add('is-pulsing');
    setTimeout(() => btn.classList.remove('is-pulsing'), 600);
  });

  applyToggleState();
}

export function isAiEnabled() {
  return state.enabled;
}

// ---------- Holat ko'rsatkichi ----------

const LOADING_STEPS = {
  file: ['Fayl o‘qilmoqda…', 'Matn ajratilmoqda…', 'AI tahlil qilmoqda…', 'Uch tilli matn tayyorlanmoqda…'],
  link: ['Havola tekshirilmoqda…', 'Video ma’lumoti olinmoqda…', 'AI tahlil qilmoqda…', 'Uch tilli matn tayyorlanmoqda…'],
  topic: ['Mavzu o‘qilmoqda…', 'AI tahlil qilmoqda…', 'Uch tilli matn tayyorlanmoqda…'],
};

function startLoading(statusEl, kind = 'file') {
  const steps = LOADING_STEPS[kind] || LOADING_STEPS.file;
  statusEl.className = 'ai-status is-loading';
  statusEl.innerHTML = `
    <span class="ai-spinner" aria-hidden="true"></span>
    <span class="ai-status__text">${steps[0]}</span>
  `;
  const textEl = statusEl.querySelector('.ai-status__text');
  let index = 0;
  const timer = setInterval(() => {
    index = (index + 1) % steps.length;
    textEl.textContent = steps[index];
  }, 1800);
  return () => clearInterval(timer);
}

function showSuccess(statusEl, message) {
  statusEl.className = 'ai-status is-success';
  statusEl.textContent = `✅ ${message}`;
}

function showError(statusEl, message) {
  statusEl.className = 'ai-status is-error';
  statusEl.textContent = `⚠️ ${message}`;
}

/** Maydonni to'ldiradi va qisqa "to'ldirildi" animatsiyasini ko'rsatadi. */
function fillField(id, value) {
  const el = document.getElementById(id);
  if (!el || value === undefined || value === null || value === '') return;
  el.value = value;
  el.classList.add('is-ai-filled');
  setTimeout(() => el.classList.remove('is-ai-filled'), 1200);
}

// ---------- API ----------

async function callAnalyze(payload, { asForm = false } = {}) {
  const options = { method: 'POST', credentials: 'same-origin' };
  if (asForm) {
    options.body = payload;
  } else {
    options.headers = { 'Content-Type': 'application/json' };
    options.body = JSON.stringify(payload);
  }

  const response = await fetch('/api/ai/analyze', options);
  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.ok) {
    throw new Error(data?.error || `Xatolik (${response.status})`);
  }
  return data;
}

/** Umumiy oqim: yuklanish -> so'rov -> maydonlarni to'ldirish. */
async function runAssist({ statusEl, button, request, onSuccess, loadingKind = 'file' }) {
  const stopLoading = startLoading(statusEl, loadingKind);
  button.disabled = true;
  button.classList.add('is-busy');

  try {
    const data = await request();
    onSuccess(data);
    showSuccess(statusEl, "Ma'lumotlar to'ldirildi. Tekshirib, Saqlash tugmasini bosing.");
  } catch (err) {
    showError(statusEl, err.message || "AI tahlili bajarilmadi. Ma'lumotlarni qo'lda kiriting.");
  } finally {
    stopLoading();
    button.disabled = false;
    button.classList.remove('is-busy');
  }
}

// ---------- Bo'limlar ----------

function initBookAssist() {
  const button = $('#ai-book-run');
  const fileInput = $('#ai-book-file');
  const statusEl = $('#ai-book-status');
  if (!button || !fileInput || !statusEl) return;

  button.addEventListener('click', () => {
    const file = fileInput.files?.[0];
    if (!file) {
      showError(statusEl, 'Avval PDF faylni tanlang.');
      return;
    }
    runAssist({
      statusEl,
      button,
      request: () => {
        const form = new FormData();
        form.append('kind', 'book');
        form.append('file', file);
        return callAnalyze(form, { asForm: true });
      },
      onSuccess: (data) => {
        const m = data.meta || {};
        fillField('f-title-uz', m.title?.uz);
        fillField('f-title-ru', m.title?.ru);
        fillField('f-title-en', m.title?.en);
        fillField('f-author', m.author);
        fillField('f-year', m.year);
        fillField('f-pages', m.pages || data.pageCount);
        fillField('f-desc-uz', m.description?.uz);
        fillField('f-desc-ru', m.description?.ru);
        fillField('f-desc-en', m.description?.en);
        if (m.language) fillField('f-language', m.language);
        // Tanlangan PDF ni asosiy fayl maydoniga ham qo'yamiz
        const mainInput = $('#f-pdf');
        if (mainInput) {
          const transfer = new DataTransfer();
          transfer.items.add(file);
          mainInput.files = transfer.files;
        }
      },
    });
  });
}

function initPresentationAssist() {
  const button = $('#ai-pres-run');
  const fileInput = $('#ai-pres-file');
  const statusEl = $('#ai-pres-status');
  if (!button || !fileInput || !statusEl) return;

  button.addEventListener('click', () => {
    const file = fileInput.files?.[0];
    if (!file) {
      showError(statusEl, 'Avval PDF faylni tanlang.');
      return;
    }
    runAssist({
      statusEl,
      button,
      request: () => {
        const form = new FormData();
        form.append('kind', 'presentation');
        form.append('file', file);
        return callAnalyze(form, { asForm: true });
      },
      onSuccess: (data) => {
        const m = data.meta || {};
        fillField('pres-title-uz', m.title?.uz);
        fillField('pres-title-ru', m.title?.ru);
        fillField('pres-title-en', m.title?.en);
        fillField('pres-desc-uz', m.description?.uz);
        fillField('pres-desc-ru', m.description?.ru);
        fillField('pres-desc-en', m.description?.en);
        if (m.category) fillField('pres-category', m.category);
        const mainInput = $('#pres-pdf');
        if (mainInput) {
          const transfer = new DataTransfer();
          transfer.items.add(file);
          mainInput.files = transfer.files;
        }
      },
    });
  });
}

function initVideoAssist() {
  const button = $('#ai-vid-run');
  const urlInput = $('#ai-vid-url');
  const statusEl = $('#ai-vid-status');
  if (!button || !urlInput || !statusEl) return;

  button.addEventListener('click', () => {
    const url = urlInput.value.trim();
    if (!url) {
      showError(statusEl, 'YouTube havolasini kiriting.');
      return;
    }
    runAssist({
      statusEl,
      button,
      loadingKind: 'link',
      request: () => callAnalyze({ kind: 'video', url }),
      onSuccess: (data) => {
        const m = data.meta || {};
        fillField('vid-title-uz', m.title?.uz);
        fillField('vid-title-ru', m.title?.ru);
        fillField('vid-title-en', m.title?.en);
        fillField('vid-desc-uz', m.description?.uz);
        fillField('vid-desc-ru', m.description?.ru);
        fillField('vid-desc-en', m.description?.en);
        if (m.category) fillField('vid-category', m.category);
        fillField('vid-url', url);
      },
    });
  });
}

function initTestAssist() {
  const button = $('#ai-test-run');
  const topicInput = $('#ai-test-topic');
  const statusEl = $('#ai-test-status');
  if (!button || !topicInput || !statusEl) return;

  button.addEventListener('click', async () => {
    const topic = topicInput.value.trim();
    if (!topic) {
      showError(statusEl, 'Mavzu nomini kiriting.');
      return;
    }

    // Tanlangan .txt fayl bo'lsa, savollar ham kontekstga qo'shiladi
    let text = '';
    const txtFile = $('#test-txt-file')?.files?.[0];
    if (txtFile) {
      try { text = await txtFile.text(); } catch { /* ixtiyoriy */ }
    }

    runAssist({
      statusEl,
      button,
      loadingKind: 'topic',
      request: () => callAnalyze({ kind: 'test', topic, text }),
      onSuccess: (data) => {
        const m = data.meta || {};
        fillField('test-title-uz', m.title?.uz);
        fillField('test-desc-uz', m.description?.uz);
        fillField('test-desc-ru', m.description?.ru);
        fillField('test-desc-en', m.description?.en);
        if (m.category) fillField('test-category', m.category);
      },
    });
  });
}

export function initAiAssist() {
  initAiToggle();
  initBookAssist();
  initPresentationAssist();
  initVideoAssist();
  initTestAssist();
}
