/* ============================================================
   DL-library.uz — MAXSUS IMKONIYATLAR (Accessibility)

   Ko'zi ojiz va zaif ko'ruvchi foydalanuvchilar uchun panel:
     • shrift o'lchamini kattalashtirish/kichraytirish
     • yuqori kontrast rejimi (qora fon, sariq matn)
     • kulrang (grayscale) rejim
     • harflar orasidagi masofani kengaytirish
     • havolalarni ajratib ko'rsatish
     • rasmlarni yashirish (matnga e'tibor qaratish)
     • barcha sozlamalarni tiklash

   Tanlangan sozlamalar localStorage'da saqlanadi va sahifa
   qayta yuklanganda tiklanadi.
   ============================================================ */

const STORAGE_KEY = 'dl_a11y_v1';

// Shrift o'lchami darajalari (foizda). 100% — odatiy holat.
const FONT_STEPS = [100, 115, 130, 150, 175, 200];

// Boshlang'ich (standart) sozlamalar
const DEFAULT_SETTINGS = {
  fontStep: 0,        // FONT_STEPS massividagi indeks
  contrast: false,    // yuqori kontrast
  grayscale: false,   // kulrang rejim
  spacing: false,     // harf/qator oralig'i kengaytirilgan
  highlightLinks: false,
  hideImages: false,
};

let settings = { ...DEFAULT_SETTINGS };

// ---------- Saqlash va o'qish ----------

function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch (e) {
    // Buzilgan ma'lumot — standart sozlamalardan boshlaymiz
  }
  return { ...DEFAULT_SETTINGS };
}

function saveSettings() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    // localStorage yopiq bo'lsa ham panel ishlashda davom etadi
  }
}

// ---------- Sozlamalarni sahifaga qo'llash ----------

function applySettings() {
  const root = document.documentElement;

  // Shrift o'lchami CSS o'zgaruvchisi orqali butun saytga ta'sir qiladi
  root.style.setProperty('--a11y-font-scale', `${FONT_STEPS[settings.fontStep]}%`);

  root.classList.toggle('a11y-contrast', settings.contrast);
  root.classList.toggle('a11y-grayscale', settings.grayscale);
  root.classList.toggle('a11y-spacing', settings.spacing);
  root.classList.toggle('a11y-links', settings.highlightLinks);
  root.classList.toggle('a11y-no-images', settings.hideImages);

  updateButtonStates();
}

/** Panel tugmalarining bosilgan/bosilmagan holatini yangilaydi. */
function updateButtonStates() {
  const map = {
    'a11y-contrast': settings.contrast,
    'a11y-grayscale': settings.grayscale,
    'a11y-spacing': settings.spacing,
    'a11y-links': settings.highlightLinks,
    'a11y-images': settings.hideImages,
  };

  for (const [id, active] of Object.entries(map)) {
    const btn = document.getElementById(id);
    if (!btn) continue;
    btn.classList.toggle('is-active', active);
    btn.setAttribute('aria-pressed', String(active));
  }

  const label = document.getElementById('a11y-font-value');
  if (label) label.textContent = `${FONT_STEPS[settings.fontStep]}%`;
}

// ---------- Panel HTML ----------

const PANEL_TEXTS = {
  uz: {
    open: 'Maxsus imkoniyatlar',
    title: 'Maxsus imkoniyatlar',
    close: 'Yopish',
    fontSize: 'Shrift o‘lchami',
    decrease: 'Kichraytirish',
    increase: 'Kattalashtirish',
    contrast: 'Yuqori kontrast',
    grayscale: 'Kulrang rejim',
    spacing: 'Harflar oralig‘i',
    links: 'Havolalarni ajratish',
    images: 'Rasmlarni yashirish',
    reset: 'Sozlamalarni tiklash',
    hint: 'Sozlamalar brauzeringizda saqlanadi.',
  },
  ru: {
    open: 'Специальные возможности',
    title: 'Специальные возможности',
    close: 'Закрыть',
    fontSize: 'Размер шрифта',
    decrease: 'Уменьшить',
    increase: 'Увеличить',
    contrast: 'Высокий контраст',
    grayscale: 'Чёрно-белый режим',
    spacing: 'Межбуквенный интервал',
    links: 'Выделить ссылки',
    images: 'Скрыть изображения',
    reset: 'Сбросить настройки',
    hint: 'Настройки сохраняются в браузере.',
  },
  en: {
    open: 'Accessibility',
    title: 'Accessibility options',
    close: 'Close',
    fontSize: 'Font size',
    decrease: 'Decrease',
    increase: 'Increase',
    contrast: 'High contrast',
    grayscale: 'Grayscale',
    spacing: 'Letter spacing',
    links: 'Highlight links',
    images: 'Hide images',
    reset: 'Reset settings',
    hint: 'Settings are stored in your browser.',
  },
};

function panelMarkup(t) {
  return `
    <div class="a11y-panel__header">
      <h2 class="a11y-panel__title">♿ ${t.title}</h2>
      <button type="button" class="a11y-panel__close" id="a11y-close" aria-label="${t.close}">✕</button>
    </div>

    <div class="a11y-panel__group">
      <span class="a11y-panel__label">${t.fontSize}</span>
      <div class="a11y-font-controls">
        <button type="button" class="a11y-btn a11y-btn--icon" id="a11y-font-down" aria-label="${t.decrease}">А−</button>
        <output class="a11y-font-value" id="a11y-font-value" aria-live="polite">100%</output>
        <button type="button" class="a11y-btn a11y-btn--icon" id="a11y-font-up" aria-label="${t.increase}">А+</button>
      </div>
    </div>

    <div class="a11y-panel__group">
      <button type="button" class="a11y-btn" id="a11y-contrast" aria-pressed="false">
        <span aria-hidden="true">◐</span> ${t.contrast}
      </button>
      <button type="button" class="a11y-btn" id="a11y-grayscale" aria-pressed="false">
        <span aria-hidden="true">⬤</span> ${t.grayscale}
      </button>
      <button type="button" class="a11y-btn" id="a11y-spacing" aria-pressed="false">
        <span aria-hidden="true">↔</span> ${t.spacing}
      </button>
      <button type="button" class="a11y-btn" id="a11y-links" aria-pressed="false">
        <span aria-hidden="true">🔗</span> ${t.links}
      </button>
      <button type="button" class="a11y-btn" id="a11y-images" aria-pressed="false">
        <span aria-hidden="true">🖼</span> ${t.images}
      </button>
    </div>

    <button type="button" class="a11y-btn a11y-btn--reset" id="a11y-reset">↺ ${t.reset}</button>
    <p class="a11y-panel__hint">${t.hint}</p>
  `;
}

// ---------- Panelni ochish/yopish ----------

let panelEl = null;
let toggleEl = null;

function openPanel() {
  if (!panelEl) return;
  panelEl.hidden = false;
  toggleEl?.setAttribute('aria-expanded', 'true');
  // Klaviatura foydalanuvchisi uchun fokusni panel ichiga olib kiramiz
  document.getElementById('a11y-close')?.focus();
}

function closePanel() {
  if (!panelEl) return;
  panelEl.hidden = true;
  toggleEl?.setAttribute('aria-expanded', 'false');
  toggleEl?.focus();
}

function togglePanel() {
  if (!panelEl) return;
  if (panelEl.hidden) openPanel();
  else closePanel();
}

// ---------- Hodisalarni ulash ----------

function bindPanelEvents() {
  document.getElementById('a11y-close')?.addEventListener('click', closePanel);

  document.getElementById('a11y-font-up')?.addEventListener('click', () => {
    settings.fontStep = Math.min(settings.fontStep + 1, FONT_STEPS.length - 1);
    saveSettings();
    applySettings();
  });

  document.getElementById('a11y-font-down')?.addEventListener('click', () => {
    settings.fontStep = Math.max(settings.fontStep - 1, 0);
    saveSettings();
    applySettings();
  });

  // Kalit-qiymat juftliklari: tugma id -> sozlama nomi
  const toggles = {
    'a11y-contrast': 'contrast',
    'a11y-grayscale': 'grayscale',
    'a11y-spacing': 'spacing',
    'a11y-links': 'highlightLinks',
    'a11y-images': 'hideImages',
  };

  for (const [id, key] of Object.entries(toggles)) {
    document.getElementById(id)?.addEventListener('click', () => {
      settings[key] = !settings[key];
      saveSettings();
      applySettings();
    });
  }

  document.getElementById('a11y-reset')?.addEventListener('click', () => {
    settings = { ...DEFAULT_SETTINGS };
    saveSettings();
    applySettings();
  });
}

/** Escape tugmasi panelni yopadi, tashqariga bosish ham. */
function bindGlobalEvents() {
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && panelEl && !panelEl.hidden) closePanel();
  });

  document.addEventListener('click', (event) => {
    if (!panelEl || panelEl.hidden) return;
    if (panelEl.contains(event.target) || toggleEl?.contains(event.target)) return;
    closePanel();
  });
}

// ---------- Ishga tushirish ----------

/**
 * Maxsus imkoniyatlar panelini yaratadi va saqlangan sozlamalarni tiklaydi.
 * @param {string} lang - joriy til (uz | ru | en)
 */
export function initAccessibility(lang = 'uz') {
  const t = PANEL_TEXTS[lang] || PANEL_TEXTS.uz;

  toggleEl = document.getElementById('a11y-toggle');
  panelEl = document.getElementById('a11y-panel');
  if (!toggleEl || !panelEl) return;

  toggleEl.setAttribute('aria-label', t.open);
  toggleEl.setAttribute('aria-expanded', 'false');
  panelEl.innerHTML = panelMarkup(t);
  panelEl.hidden = true;

  toggleEl.addEventListener('click', togglePanel);
  bindPanelEvents();
  bindGlobalEvents();

  // Saqlangan sozlamalarni qo'llaymiz
  settings = loadSettings();
  applySettings();
}

/** Til almashganda panel matnlarini yangilaydi. */
export function updateAccessibilityLanguage(lang) {
  if (!panelEl) return;
  const t = PANEL_TEXTS[lang] || PANEL_TEXTS.uz;
  const wasOpen = !panelEl.hidden;

  toggleEl?.setAttribute('aria-label', t.open);
  panelEl.innerHTML = panelMarkup(t);
  bindPanelEvents();
  applySettings();

  panelEl.hidden = !wasOpen;
}
