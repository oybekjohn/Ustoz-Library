/* ============================================
   DL-LIBRARY.UZ — Application Logic
   Renessans Ta'lim Universiteti Raqamli Kutubxona
   ============================================ */

// ---------- Internationalization (i18n) ----------
const translations = {
  uz: {
    siteTitle: "DL-library.uz",
    heroName: "DL-library.uz",
    heroTitle: "Renessans Ta'lim Universiteti — Raqamli Kutubxona",
    heroBio: "Ushbu elektron kutubxona Renessans ta'lim universiteti Matematika va Iqtisod fakul'tetining Axborot texnologiyalari kafedrasi jamoasi tomonidan yaratilgan bo'lib, uning asosiy maqsadi talabalarga fan dasturlarini, fanlar bo'yicha uslubiy qo'llanmalarni, o'quv qo'llanmalarni, darsliklarni va monografiyalarni taqdim etishdir. Undan tashqari saytga talabalar uchun qiziq bo'lgan mavzular bo'yicha ham bir qancha adabiyotlar jam qilingan.",
    heroContact: "Agar siz elektron kutubxonadagi biror bir kitobni yuklab olmoqchi bo'lsangiz, quyidagi kontaktlarga murojaat qiling:",
    searchPlaceholder: "Kitob nomini qidirish...",
    filterAll: "Barchasi",
    statBooks: "Umumiy kitoblar",
    btnRead: "📖 O'qish",
    btnDownloadQr: "📱 QR yuklab olish",
    noResults: "Kitob topilmadi",
    noResultsDesc: "Boshqa kalit so'z bilan qidirib ko'ring",
    footerText: "Barcha huquqlar himoyalangan",
    footerUniversity: "Ushbu sayt mualliflari RTU AT kafedrasi o'qituvchilari Ravshan Ayupov va Oybek Xushvaqtov"
  },
  ru: {
    siteTitle: "DL-library.uz",
    heroName: "DL-library.uz",
    heroTitle: "Университет Ренессанс — Цифровая Библиотека",
    heroBio: "Данная электронная библиотека создана коллективом кафедры Информационных технологий факультета Математики и Экономики Ренессанс университета образования. Основная цель — предоставление студентам учебных программ, методических пособий, учебников и монографий. Кроме того, на сайте собрана литература по интересным для студентов темам.",
    heroContact: "Если вы хотите скачать книгу из электронной библиотеки, обратитесь по следующим контактам:",
    searchPlaceholder: "Поиск по названию книги...",
    filterAll: "Все",
    statBooks: "Всего книг",
    btnRead: "📖 Читать",
    btnDownloadQr: "📱 Скачать QR",
    noResults: "Книги не найдены",
    noResultsDesc: "Попробуйте другое ключевое слово",
    footerText: "Все права защищены",
    footerUniversity: "Авторы сайта — преподаватели кафедры ИТ RTU Равшан Аюпов и Ойбек Хушвактов"
  },
  en: {
    siteTitle: "DL-library.uz",
    heroName: "DL-library.uz",
    heroTitle: "Renaissance University of Education — Digital Library",
    heroBio: "This digital library was created by the Information Technology Department of the Faculty of Mathematics and Economics at Renaissance University of Education. Its main purpose is to provide students with syllabi, methodological manuals, textbooks, and monographs. Additionally, the site features a collection of literature on topics of interest to students.",
    heroContact: "If you would like to download a book from the digital library, please contact us via:",
    searchPlaceholder: "Search for a book...",
    filterAll: "All",
    statBooks: "Total Books",
    btnRead: "📖 Read",
    btnDownloadQr: "📱 Download QR",
    noResults: "No books found",
    noResultsDesc: "Try a different keyword",
    footerText: "All rights reserved",
    footerUniversity: "Site authors — RTU IT Department lecturers Ravshan Ayupov and Oybek Xushvaqtov"
  }
};

// ---------- Kategoriyalar (YAGONA MANBA: filter, badge, stat shu yerdan) ----------
// `stat: true` bo'lgan kategoriyalar bosh sahifa statistikasida ko'rsatiladi (umumiy + shular).
// Yangi kategoriya qo'shish uchun shu ro'yxatga bitta qator qo'shing — qolgani avtomatik.
const CATEGORIES = [
  { key: 'it',           emoji: '💻', uz: 'IT',                      ru: 'IT',                           en: 'IT',                          stat: true  },
  { key: 'ai',           emoji: '🤖', uz: "Sun'iy intellekt",        ru: 'Искусственный интеллект',      en: 'Artificial Intelligence',     stat: true  },
  { key: 'iqtisodiyot',  emoji: '📈', uz: 'Iqtisodiyot',             ru: 'Экономика',                    en: 'Economics',                   stat: true  },
  { key: 'biznes',       emoji: '💼', uz: 'Biznes va Tadbirkorlik',  ru: 'Бизнес и предпринимательство', en: 'Business & Entrepreneurship', stat: true  },
  { key: 'salomatlik',   emoji: '💊', uz: 'Salomatlik va Kosmetika', ru: 'Здоровье и косметика',         en: 'Health & Cosmetics',          stat: false },
  { key: 'bogdorchilik', emoji: '🌱', uz: "Bog'dorchilik",           ru: 'Садоводство',                  en: 'Gardening',                   stat: false },
  { key: 'fandastur',    emoji: '📋', uz: 'Fan dasturlari',          ru: 'Учебные программы',            en: 'Syllabi',                     stat: false },
  { key: 'ai_darslar',   emoji: '🎓', uz: 'SI darslar',              ru: 'Уроки ИИ',                     en: 'AI Lessons',                  stat: false },
  { key: 'ai_agentlar',  emoji: '🧠', uz: 'SI agentlar',             ru: 'ИИ-агенты',                    en: 'AI Agents',                   stat: false },
  { key: 'boshqa',       emoji: '📚', uz: 'Boshqa',                  ru: 'Другое',                       en: 'Other',                       stat: false }
];

// Kategoriya kalitidan joriy tildagi nomini qaytaradi
function catName(key) {
  const c = CATEGORIES.find(x => x.key === key);
  return c ? c[state.currentLang] : key;
}

// ---------- Application State ----------
const state = {
  books: [],
  filteredBooks: [],
  currentLang: 'uz',
  currentTheme: 'light',
  currentCategory: 'all',
  searchQuery: '',
  currentPage: 1,
  booksPerPage: 12
};

// ---------- DOM Helpers ----------
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

// ---------- Initialize ----------
document.addEventListener('DOMContentLoaded', () => {
  loadPreferences();
  applyTheme();
  applyLanguage();
  loadBooks();
  setupEventListeners();
  setupContentProtection();
});

// ---------- Content Protection ----------
function setupContentProtection() {
  // Disable right-click context menu
  document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    return false;
  });

  // Disable keyboard shortcuts for saving, printing, viewing source
  document.addEventListener('keydown', (e) => {
    // Ctrl+S, Ctrl+P, Ctrl+U, Ctrl+Shift+I, F12
    if (
      (e.ctrlKey && (e.key === 's' || e.key === 'S' || e.key === 'p' || e.key === 'P' || e.key === 'u' || e.key === 'U')) ||
      (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j' || e.key === 'C' || e.key === 'c')) ||
      e.key === 'F12' ||
      (e.ctrlKey && e.key === 'a') ||
      (e.key === 'PrintScreen')
    ) {
      e.preventDefault();
      return false;
    }
  });

  // Disable text selection on book content
  document.addEventListener('selectstart', (e) => {
    if (e.target.closest('.book-card') || e.target.closest('.flipbook-overlay')) {
      e.preventDefault();
      return false;
    }
  });

  // Disable drag on images
  document.addEventListener('dragstart', (e) => {
    if (e.target.tagName === 'IMG' || e.target.closest('.book-card')) {
      e.preventDefault();
      return false;
    }
  });
}

// ---------- Load Books (backend API) ----------
async function loadBooks() {
  try {
    const res = await fetch('/api/books', { headers: { 'Accept': 'application/json' } });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || 'API xatosi');

    state.books = data.books || [];
    state.filteredBooks = [...state.books];
    renderBooks();
    renderStats();

    // Check URL param for QR code deep link
    if (typeof checkUrlBookParam === 'function') {
      checkUrlBookParam();
    }
  } catch (e) {
    $('#books-grid').innerHTML = `
      <div class="no-results">
        <div class="no-results__icon">⚠️</div>
        <div class="no-results__text">Kitoblar ma'lumotlarini yuklab bo'lmadi</div>
        <div class="no-results__text" style="font-size:0.9rem;margin-top:8px;">${e.message}</div>
      </div>
    `;
  }
}

// ---------- Render Books ----------
function renderBooks() {
  const grid = $('#books-grid');
  const t = translations[state.currentLang];

  if (state.filteredBooks.length === 0) {
    grid.innerHTML = `
      <div class="no-results">
        <div class="no-results__icon">📚</div>
        <div class="no-results__text">${t.noResults}</div>
        <div class="no-results__text" style="font-size:0.9rem;margin-top:8px;">${t.noResultsDesc}</div>
      </div>
    `;
    updateSearchCount(0);
    renderPagination();
    return;
  }

  // Pagination hisoblash
  const total = state.filteredBooks.length;
  const totalPages = Math.ceil(total / state.booksPerPage);
  // Sahifa chegarasidan chiqib ketmasin
  if (state.currentPage > totalPages) state.currentPage = totalPages;
  if (state.currentPage < 1) state.currentPage = 1;

  const start = (state.currentPage - 1) * state.booksPerPage;
  const end = Math.min(start + state.booksPerPage, total);
  const pageBooks = state.filteredBooks.slice(start, end);

  grid.innerHTML = pageBooks.map((book, index) => {
    const title = book.title[state.currentLang] || book.title.uz;
    const desc = book.description[state.currentLang] || book.description.uz;
    const catLabel = catName(book.category);
    const langLabel = book.language.toUpperCase();
    const qrSrc = (typeof bookQrDataUrl === 'function') ? bookQrDataUrl(book.id) : '';
    const escapedTitle = escapeAttr(title);

    return `
      <div class="book-card" style="animation-delay:${index * 0.06}s" data-book-id="${book.id}">
        <div class="book-card__cover-wrapper" onclick="openBookById(${book.id})" title="${t.btnRead}">
          <img
            class="book-card__cover"
            src="${book.cover}"
            alt="${escapedTitle}"
            loading="lazy"
            onerror="this.style.display='none'"
            draggable="false"
          />
          <span class="book-card__badge book-card__badge--${book.category}">${catLabel}</span>
          <span class="book-card__lang-badge">${langLabel}</span>
        </div>
        <div class="book-card__body">
          <h3 class="book-card__title" onclick="openBookById(${book.id})" title="${t.btnRead}">${title}</h3>
          <div class="book-card__meta">
            <span class="book-card__author">👤 ${book.author}</span>
            <span class="book-card__year">📅 ${book.year}</span>
          </div>
          <p class="book-card__desc">${desc}</p>
          ${qrSrc ? `
          <div class="book-card__qr">
            <img src="${qrSrc}" alt="QR Code" class="book-card__qr-img" onerror="this.parentElement.style.display='none'" draggable="false">
            <span class="book-card__qr-label">📱 QR Code</span>
          </div>
          ` : ''}
          <div class="book-card__actions">
            <button class="btn btn--primary" onclick="openBookById(${book.id})" title="${t.btnRead}">
              ${t.btnRead}
            </button>
            ${qrSrc ? `
            <button class="btn btn--secondary" onclick="downloadQrById(${book.id})" title="${t.btnDownloadQr}">
              📱
            </button>
            ` : ''}
          </div>
        </div>
      </div>
    `;
  }).join('');

  updateSearchCount(total);
  renderPagination();
}

// ---------- Pagination ----------
function renderPagination() {
  const paginationEl = $('#pagination');
  const infoEl = $('#pagination-info');
  if (!paginationEl) return;

  const total = state.filteredBooks.length;
  const totalPages = Math.ceil(total / state.booksPerPage);

  // Info matni
  if (infoEl) {
    if (total === 0) {
      infoEl.textContent = '';
    } else {
      const start = (state.currentPage - 1) * state.booksPerPage + 1;
      const end = Math.min(state.currentPage * state.booksPerPage, total);
      infoEl.textContent = `${start}–${end} / ${total} ta kitob`;
    }
  }

  // 1 sahifa bo'lsa pagination ko'rsatma
  if (totalPages <= 1) {
    paginationEl.innerHTML = '';
    return;
  }

  const cp = state.currentPage;
  let html = '';

  // Oldingi tugma
  html += `<button class="pagination__btn" onclick="goToPage(${cp - 1})" ${cp === 1 ? 'disabled' : ''} aria-label="Oldingi">‹</button>`;

  // Sahifa raqamlari
  const pages = getPaginationRange(cp, totalPages);
  for (const p of pages) {
    if (p === '...') {
      html += `<span class="pagination__dots">…</span>`;
    } else {
      html += `<button class="pagination__btn ${p === cp ? 'active' : ''}" onclick="goToPage(${p})" aria-label="${p}-sahifa">${p}</button>`;
    }
  }

  // Keyingi tugma
  html += `<button class="pagination__btn" onclick="goToPage(${cp + 1})" ${cp === totalPages ? 'disabled' : ''} aria-label="Keyingi">›</button>`;

  paginationEl.innerHTML = html;
}

// Delta window bilan pagination raqamlari (1 ... 4 5 6 ... 10)
function getPaginationRange(current, total) {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const range = [];
  const delta = 1; // joriy sahifa atrofida nechta raqam

  range.push(1);
  if (current - delta > 2) range.push('...');

  for (let i = Math.max(2, current - delta); i <= Math.min(total - 1, current + delta); i++) {
    range.push(i);
  }

  if (current + delta < total - 1) range.push('...');
  range.push(total);

  return range;
}

function goToPage(page) {
  const totalPages = Math.ceil(state.filteredBooks.length / state.booksPerPage);
  if (page < 1 || page > totalPages) return;
  state.currentPage = page;
  renderBooks();
  // Kitoblar seksiyasiga scroll (controls qismining ostiga)
  const booksSection = document.querySelector('.books-section');
  if (booksSection) {
    const offset = booksSection.getBoundingClientRect().top + window.scrollY - 100;
    window.scrollTo({ top: offset, behavior: 'smooth' });
  }
}

// ---------- Open Book by ID ----------
function openBookById(id) {
  const book = state.books.find(b => b.id === id);
  if (!book) return;
  const title = book.title[state.currentLang] || book.title.uz;
  const qr = (typeof bookQrDataUrl === 'function') ? bookQrDataUrl(book.id) : '';
  openFlipbook(book.file, title, qr);
}

// ---------- QR Code Download by ID ----------
function downloadQrById(id) {
  const book = state.books.find(b => b.id === id);
  if (!book) return;
  const title = book.title[state.currentLang] || book.title.uz;
  const name = `QR_${title.replace(/[^a-zA-Z0-9Ѐ-ӿ\s]/g, '').replace(/\s+/g, '_').substring(0, 50)}.png`;
  if (typeof downloadQr === 'function') downloadQr(book.id, name);
}

// ---------- Search & Filter ----------
function handleSearch(query) {
  state.searchQuery = query.toLowerCase().trim();
  applyFilters();
}

function handleCategoryFilter(category) {
  state.currentCategory = category;
  renderFilters();
  applyFilters();
}

function applyFilters() {
  state.filteredBooks = state.books.filter(book => {
    if (state.currentCategory !== 'all' && book.category !== state.currentCategory) {
      return false;
    }
    if (state.searchQuery) {
      const searchIn = [
        book.title.uz, book.title.ru, book.title.en,
        book.description.uz, book.description.ru, book.description.en,
        book.author
      ].join(' ').toLowerCase();
      return searchIn.includes(state.searchQuery);
    }
    return true;
  });
  // Filter yoki qidiruv o'zgarganda 1-sahifaga qayt
  state.currentPage = 1;
  renderBooks();
}

function updateSearchCount(count) {
  const el = $('#search-count');
  if (el) el.textContent = count + ' / ' + state.books.length;
}

// ---------- Theme ----------
function toggleTheme() {
  state.currentTheme = state.currentTheme === 'dark' ? 'light' : 'dark';
  applyTheme();
  savePreferences();
}

function applyTheme() {
  document.documentElement.setAttribute('data-theme', state.currentTheme);
  const btn = $('#theme-toggle');
  if (btn) btn.textContent = state.currentTheme === 'dark' ? '☀️' : '🌙';
}

// ---------- Language ----------
function setLanguage(lang) {
  state.currentLang = lang;
  state.currentPage = 1;
  applyLanguage();
  renderBooks();
  savePreferences();
}

function applyLanguage() {
  const t = translations[state.currentLang];

  $$('.lang-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.lang === state.currentLang);
  });

  const setText = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  };

  setText('hero-name', t.heroName);
  setText('hero-title', t.heroTitle);
  setText('hero-bio', t.heroBio);
  setText('hero-contact-text', t.heroContact);
  setText('footer-rights', t.footerText);
  setText('footer-university', t.footerUniversity);

  const searchInput = $('#search-input');
  if (searchInput) searchInput.placeholder = t.searchPlaceholder;

  // Filter va statistika kategoriyalardan dinamik quriladi (joriy tilga ko'ra)
  renderFilters();
  renderStats();

  document.title = `${t.siteTitle} — ${t.heroTitle}`;
}

// ---------- Filterlarni qurish (Barchasi + kategoriyalar) ----------
function renderFilters() {
  const wrap = $('#filters');
  if (!wrap) return;
  const t = translations[state.currentLang];

  let html = `<button class="filter-btn ${state.currentCategory === 'all' ? 'active' : ''}" data-category="all">${t.filterAll}</button>`;
  for (const c of CATEGORIES) {
    const active = state.currentCategory === c.key ? 'active' : '';
    html += `<button class="filter-btn ${active}" data-category="${c.key}">${c.emoji} ${c[state.currentLang]}</button>`;
  }
  wrap.innerHTML = html;

  wrap.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => handleCategoryFilter(btn.dataset.category));
  });
}

// ---------- Statistika: umumiy + `stat: true` kategoriyalar ----------
function renderStats() {
  const wrap = $('#stats');
  if (!wrap) return;
  const t = translations[state.currentLang];

  const cards = [{ num: state.books.length, label: t.statBooks }];
  for (const c of CATEGORIES) {
    if (!c.stat) continue;
    cards.push({
      num: state.books.filter(b => b.category === c.key).length,
      label: c[state.currentLang]
    });
  }

  wrap.innerHTML = cards.map(c => `
    <div class="stat">
      <div class="stat__number" data-target="${c.num}">0</div>
      <div class="stat__label">${c.label}</div>
    </div>
  `).join('');

  wrap.querySelectorAll('.stat__number').forEach(el => {
    animateNumber(el, parseInt(el.dataset.target, 10) || 0);
  });
}

function animateNumber(el, target) {
  if (!el) return;
  const duration = 800;
  const start = performance.now();
  function step(now) {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(eased * target);
    if (progress < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

// ---------- Scroll to Top ----------
function setupScrollTop() {
  const btn = $('#scroll-top');
  if (!btn) return;
  window.addEventListener('scroll', () => {
    btn.classList.toggle('visible', window.scrollY > 400);
  }, { passive: true });
  btn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

// ---------- Event Listeners ----------
function setupEventListeners() {
  // Search
  const searchInput = $('#search-input');
  let searchTimeout;
  searchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => handleSearch(e.target.value), 200);
  });

  // Category filter tugmalari renderFilters() ichida bog'lanadi (dinamik)

  // Language
  $$('.lang-btn').forEach(btn => {
    btn.addEventListener('click', () => setLanguage(btn.dataset.lang));
  });

  // Theme
  $('#theme-toggle').addEventListener('click', toggleTheme);

  // Flipbook modal close on overlay click
  const flipModal = document.getElementById('flipbook-modal');
  if (flipModal) {
    flipModal.addEventListener('click', (e) => {
      if (e.target === flipModal) closeFlipbook();
    });
  }

  // Scroll to top
  setupScrollTop();
}

// ---------- Preferences ----------
function savePreferences() {
  try {
    localStorage.setItem('dl_library_prefs', JSON.stringify({
      lang: state.currentLang,
      theme: state.currentTheme
    }));
  } catch (e) {}
}

function loadPreferences() {
  try {
    const prefs = JSON.parse(localStorage.getItem('dl_library_prefs'));
    if (prefs) {
      state.currentLang = prefs.lang || 'uz';
      state.currentTheme = prefs.theme || 'light';
    }
  } catch (e) {}
}

// ---------- Utility ----------
function escapeAttr(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML.replace(/'/g, '&#39;').replace(/"/g, '&quot;');
}
