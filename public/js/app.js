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
    filterFandastur: "📋 Fan dasturlar",
    filterDarslik: "📘 Darsliklar",
    filterMonografiya: "📕 Monografiyalar",
    filterQollanma: "📗 Qo'llanmalar",
    filterLugat: "📙 Lug'atlar",
    filterBoshqa: "📓 Boshqa",
    statBooks: "Umumiy kitoblar",
    statFandastur: "Fan dasturlar",
    statDarslik: "Darsliklar",
    statMonografiya: "Monografiyalar",
    statQollanma: "Qo'llanmalar",
    statLugat: "Lug'atlar",
    statBoshqa: "Boshqalar",
    btnRead: "📖 O'qish",
    btnDownloadQr: "📱 QR yuklab olish",
    noResults: "Kitob topilmadi",
    noResultsDesc: "Boshqa kalit so'z bilan qidirib ko'ring",
    footerText: "Barcha huquqlar himoyalangan",
    footerUniversity: "Renessans Ta'lim Universiteti — Axborot texnologiyalari kafedrasi",
    categoryNames: {
      fandastur: "Fan dastur",
      darslik: "Darslik",
      monografiya: "Monografiya",
      qollanma: "Qo'llanma",
      lugat: "Lug'at",
      boshqa: "Boshqa"
    }
  },
  ru: {
    siteTitle: "DL-library.uz",
    heroName: "DL-library.uz",
    heroTitle: "Университет Ренессанс — Цифровая Библиотека",
    heroBio: "Данная электронная библиотека создана коллективом кафедры Информационных технологий факультета Математики и Экономики Ренессанс университета образования. Основная цель — предоставление студентам учебных программ, методических пособий, учебников и монографий. Кроме того, на сайте собрана литература по интересным для студентов темам.",
    heroContact: "Если вы хотите скачать книгу из электронной библиотеки, обратитесь по следующим контактам:",
    searchPlaceholder: "Поиск по названию книги...",
    filterAll: "Все",
    filterFandastur: "📋 Учебные программы",
    filterDarslik: "📘 Учебники",
    filterMonografiya: "📕 Монографии",
    filterQollanma: "📗 Пособия",
    filterLugat: "📙 Словари",
    filterBoshqa: "📓 Другие",
    statBooks: "Всего книг",
    statFandastur: "Учебные программы",
    statDarslik: "Учебники",
    statMonografiya: "Монографии",
    statQollanma: "Пособия",
    statLugat: "Словари",
    statBoshqa: "Другие",
    btnRead: "📖 Читать",
    btnDownloadQr: "📱 Скачать QR",
    noResults: "Книги не найдены",
    noResultsDesc: "Попробуйте другое ключевое слово",
    footerText: "Все права защищены",
    footerUniversity: "Университет Ренессанс — Кафедра информационных технологий",
    categoryNames: {
      fandastur: "Учебная программа",
      darslik: "Учебник",
      monografiya: "Монография",
      qollanma: "Пособие",
      lugat: "Словарь",
      boshqa: "Другое"
    }
  },
  en: {
    siteTitle: "DL-library.uz",
    heroName: "DL-library.uz",
    heroTitle: "Renaissance University of Education — Digital Library",
    heroBio: "This digital library was created by the Information Technology Department of the Faculty of Mathematics and Economics at Renaissance University of Education. Its main purpose is to provide students with syllabi, methodological manuals, textbooks, and monographs. Additionally, the site features a collection of literature on topics of interest to students.",
    heroContact: "If you would like to download a book from the digital library, please contact us via:",
    searchPlaceholder: "Search for a book...",
    filterAll: "All",
    filterFandastur: "📋 Syllabi",
    filterDarslik: "📘 Textbooks",
    filterMonografiya: "📕 Monographs",
    filterQollanma: "📗 Manuals",
    filterLugat: "📙 Glossaries",
    filterBoshqa: "📓 Other",
    statBooks: "Total Books",
    statFandastur: "Syllabi",
    statDarslik: "Textbooks",
    statMonografiya: "Monographs",
    statQollanma: "Manuals",
    statLugat: "Glossaries",
    statBoshqa: "Others",
    btnRead: "📖 Read",
    btnDownloadQr: "📱 Download QR",
    noResults: "No books found",
    noResultsDesc: "Try a different keyword",
    footerText: "All rights reserved",
    footerUniversity: "Renaissance University of Education — IT Department",
    categoryNames: {
      fandastur: "Syllabus",
      darslik: "Textbook",
      monografiya: "Monograph",
      qollanma: "Manual",
      lugat: "Glossary",
      boshqa: "Other"
    }
  }
};

// ---------- Application State ----------
const state = {
  books: [],
  filteredBooks: [],
  currentLang: 'uz',
  currentTheme: 'light',
  currentCategory: 'all',
  searchQuery: ''
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
    updateStats();

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
    return;
  }

  grid.innerHTML = state.filteredBooks.map((book, index) => {
    const title = book.title[state.currentLang] || book.title.uz;
    const desc = book.description[state.currentLang] || book.description.uz;
    const catName = t.categoryNames[book.category] || book.category;
    const langLabel = book.language.toUpperCase();
    const qrSrc = (typeof bookQrDataUrl === 'function') ? bookQrDataUrl(book.id) : '';
    const escapedTitle = escapeAttr(title);

    return `
      <div class="book-card" style="animation-delay:${index * 0.08}s" data-book-id="${book.id}">
        <div class="book-card__cover-wrapper" onclick="openBookById(${book.id})" title="${t.btnRead}">
          <img
            class="book-card__cover"
            src="${book.cover}"
            alt="${escapedTitle}"
            loading="lazy"
            onerror="this.style.display='none'"
            draggable="false"
          />
          <span class="book-card__badge book-card__badge--${book.category}">${catName}</span>
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

  updateSearchCount(state.filteredBooks.length);
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
  const name = `QR_${title.replace(/[^a-zA-Z0-9\u0400-\u04FF\s]/g, '').replace(/\s+/g, '_').substring(0, 50)}.png`;
  if (typeof downloadQr === 'function') downloadQr(book.id, name);
}

// ---------- Search & Filter ----------
function handleSearch(query) {
  state.searchQuery = query.toLowerCase().trim();
  applyFilters();
}

function handleCategoryFilter(category) {
  state.currentCategory = category;
  $$('.filter-btn[data-category]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.category === category);
  });
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
  applyLanguage();
  renderBooks();
  updateStats();
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
  setText('stat-books-label', t.statBooks);
  setText('stat-fandastur-label', t.statFandastur);
  setText('stat-darslik-label', t.statDarslik);
  setText('stat-monografiya-label', t.statMonografiya);
  setText('stat-qollanma-label', t.statQollanma);
  setText('stat-lugat-label', t.statLugat);
  setText('stat-boshqa-label', t.statBoshqa);
  setText('footer-rights', t.footerText);
  setText('footer-university', t.footerUniversity);

  const searchInput = $('#search-input');
  if (searchInput) searchInput.placeholder = t.searchPlaceholder;

  const filterMap = {
    all: t.filterAll, fandastur: t.filterFandastur, darslik: t.filterDarslik,
    monografiya: t.filterMonografiya, qollanma: t.filterQollanma,
    lugat: t.filterLugat, boshqa: t.filterBoshqa
  };
  $$('.filter-btn[data-category]').forEach(btn => {
    const cat = btn.dataset.category;
    if (filterMap[cat]) btn.textContent = filterMap[cat];
  });

  document.title = `${t.siteTitle} — ${t.heroTitle}`;
}

// ---------- Stats ----------
function updateStats() {
  const books = state.books;
  const totalBooks = books.length;
  const totalFandastur = books.filter(b => b.category === 'fandastur').length;
  const totalDarslik = books.filter(b => b.category === 'darslik').length;
  const totalMonografiya = books.filter(b => b.category === 'monografiya').length;
  const totalQollanma = books.filter(b => b.category === 'qollanma').length;
  const totalLugat = books.filter(b => b.category === 'lugat').length;
  const totalBoshqa = books.filter(b => b.category === 'boshqa').length;

  animateNumber('stat-books-num', totalBooks);
  animateNumber('stat-fandastur-num', totalFandastur);
  animateNumber('stat-darslik-num', totalDarslik);
  animateNumber('stat-monografiya-num', totalMonografiya);
  animateNumber('stat-qollanma-num', totalQollanma);
  animateNumber('stat-lugat-num', totalLugat);
  animateNumber('stat-boshqa-num', totalBoshqa);
}

function animateNumber(id, target) {
  const el = document.getElementById(id);
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

  // Category filters
  $$('.filter-btn[data-category]').forEach(btn => {
    btn.addEventListener('click', () => handleCategoryFilter(btn.dataset.category));
  });

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
      state.currentTheme = prefs.theme || 'dark';
    }
  } catch (e) {}
}

// ---------- Utility ----------
function escapeAttr(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML.replace(/'/g, '&#39;').replace(/"/g, '&quot;');
}
