/* ============================================
   USTOZ KUTUBXONASI — Application Logic
   Professor Ayupov R.H. Online Library
   ============================================ */

// ---------- Internationalization (i18n) ----------
const translations = {
  uz: {
    siteTitle: "Ustoz Kutubxonasi",
    heroName: "Ayupov Ravshan Hamdamovich",
    heroTitle: "Professor, texnika fanlari doktori",
    heroBio: "Axborot texnologiyalari va ta'lim sohasidagi yetakchi mutaxassis. Quyida professorning barcha ilmiy asarlari, darsliklari va monografiyalari jamlangan.",
    searchPlaceholder: "Kitob nomini qidirish...",
    filterAll: "Barchasi",
    filterDarslik: "📘 Darsliklar",
    filterMonografiya: "📕 Monografiyalar",
    filterQollanma: "📗 Qo'llanmalar",
    filterLugat: "📙 Lug'atlar",
    filterBoshqa: "📓 Boshqa",
    statBooks: "Kitoblar",
    statDarslik: "Darsliklar",
    statMonografiya: "Monografiyalar",
    statYears: "Yillar",
    btnRead: "📖 O'qish",
    btnDownload: "⬇ Yuklab olish",
    btnQr: "QR",
    noResults: "Kitob topilmadi",
    noResultsDesc: "Boshqa kalit so'z bilan qidirib ko'ring",
    footerText: "Barcha huquqlar himoyalangan",
    footerMadeWith: "Yaratilgan",
    categoryNames: {
      darslik: "Darslik",
      monografiya: "Monografiya",
      qollanma: "Qo'llanma",
      lugat: "Lug'at",
      boshqa: "Boshqa"
    }
  },
  ru: {
    siteTitle: "Библиотека Устоза",
    heroName: "Аюпов Равшан Хамдамович",
    heroTitle: "Профессор, доктор технических наук",
    heroBio: "Ведущий специалист в области информационных технологий и образования. Ниже собраны все научные труды, учебники и монографии профессора.",
    searchPlaceholder: "Поиск по названию книги...",
    filterAll: "Все",
    filterDarslik: "📘 Учебники",
    filterMonografiya: "📕 Монографии",
    filterQollanma: "📗 Пособия",
    filterLugat: "📙 Словари",
    filterBoshqa: "📓 Другие",
    statBooks: "Книги",
    statDarslik: "Учебники",
    statMonografiya: "Монографии",
    statYears: "Годы",
    btnRead: "📖 Читать",
    btnDownload: "⬇ Скачать",
    btnQr: "QR",
    noResults: "Книги не найдены",
    noResultsDesc: "Попробуйте другое ключевое слово",
    footerText: "Все права защищены",
    footerMadeWith: "Создано с",
    categoryNames: {
      darslik: "Учебник",
      monografiya: "Монография",
      qollanma: "Пособие",
      lugat: "Словарь",
      boshqa: "Другое"
    }
  },
  en: {
    siteTitle: "Ustoz Library",
    heroName: "Ayupov Ravshan Khamdamovich",
    heroTitle: "Professor, Doctor of Technical Sciences",
    heroBio: "A leading expert in information technology and education. Below you will find all the professor's scientific works, textbooks, and monographs.",
    searchPlaceholder: "Search for a book...",
    filterAll: "All",
    filterDarslik: "📘 Textbooks",
    filterMonografiya: "📕 Monographs",
    filterQollanma: "📗 Manuals",
    filterLugat: "📙 Glossaries",
    filterBoshqa: "📓 Other",
    statBooks: "Books",
    statDarslik: "Textbooks",
    statMonografiya: "Monographs",
    statYears: "Years",
    btnRead: "📖 Read",
    btnDownload: "⬇ Download",
    btnQr: "QR",
    noResults: "No books found",
    noResultsDesc: "Try a different keyword",
    footerText: "All rights reserved",
    footerMadeWith: "Made with",
    categoryNames: {
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
  currentTheme: 'dark',
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
});

// ---------- Load Books ----------
function loadBooks() {
  // BOOKS_DATA is loaded from js/books-data.js (works on file:// and https://)
  if (typeof BOOKS_DATA !== 'undefined') {
    state.books = BOOKS_DATA;
    state.filteredBooks = [...state.books];
    renderBooks();
    updateStats();

    // Check URL param for QR code deep link
    if (typeof checkUrlBookParam === 'function') {
      checkUrlBookParam();
    }
  } else {
    $('#books-grid').innerHTML = `
      <div class="no-results">
        <div class="no-results__icon">⚠️</div>
        <div class="no-results__text">Kitoblar ma'lumotlari topilmadi</div>
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
    const qrSrc = book.qr || '';
    const escapedTitle = escapeAttr(title);

    return `
      <div class="book-card" style="animation-delay:${index * 0.08}s" data-book-id="${book.id}">
        <div class="book-card__cover-wrapper">
          <img
            class="book-card__cover"
            src="${book.cover}"
            alt="${escapedTitle}"
            loading="lazy"
            onerror="this.style.display='none'"
          />
          <span class="book-card__badge book-card__badge--${book.category}">${catName}</span>
          <span class="book-card__lang-badge">${langLabel}</span>
        </div>
        <div class="book-card__body">
          <h3 class="book-card__title">${title}</h3>
          <div class="book-card__meta">
            <span class="book-card__author">👤 ${book.author}</span>
            <span class="book-card__year">📅 ${book.year}</span>
          </div>
          <p class="book-card__desc">${desc}</p>
          ${qrSrc ? `
          <div class="book-card__qr">
            <img src="${qrSrc}" alt="QR Code" class="book-card__qr-img" onerror="this.parentElement.style.display='none'">
            <span class="book-card__qr-label">📱 QR Code</span>
          </div>
          ` : ''}
          <div class="book-card__actions">
            <button class="btn btn--primary" onclick="openFlipbook(decodeURIComponent('${encodeURIComponent(book.file)}'), '${escapedTitle}', '${qrSrc}')" title="${t.btnRead}">
              ${t.btnRead}
            </button>
            <a class="btn btn--secondary" href="${encodeURI(book.file)}" download title="${t.btnDownload}">
              ⬇
            </a>
          </div>
        </div>
      </div>
    `;
  }).join('');

  updateSearchCount(state.filteredBooks.length);
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
  setText('stat-books-label', t.statBooks);
  setText('stat-darslik-label', t.statDarslik);
  setText('stat-monografiya-label', t.statMonografiya);
  setText('stat-years-label', t.statYears);
  setText('footer-rights', t.footerText);
  setText('footer-made', t.footerMadeWith);

  const searchInput = $('#search-input');
  if (searchInput) searchInput.placeholder = t.searchPlaceholder;

  const filterMap = {
    all: t.filterAll, darslik: t.filterDarslik, monografiya: t.filterMonografiya,
    qollanma: t.filterQollanma, lugat: t.filterLugat, boshqa: t.filterBoshqa
  };
  $$('.filter-btn[data-category]').forEach(btn => {
    const cat = btn.dataset.category;
    if (filterMap[cat]) btn.textContent = filterMap[cat];
  });

  document.title = `${t.heroName} — ${t.siteTitle}`;
}

// ---------- Stats ----------
function updateStats() {
  const books = state.books;
  const totalBooks = books.length;
  const totalDarslik = books.filter(b => b.category === 'darslik').length;
  const totalMonografiya = books.filter(b => b.category === 'monografiya').length;
  const years = [...new Set(books.map(b => b.year))];
  const yearRange = years.length > 1 ? `${Math.min(...years)}-${Math.max(...years)}` : (years[0] || '—');

  animateNumber('stat-books-num', totalBooks);
  animateNumber('stat-darslik-num', totalDarslik);
  animateNumber('stat-monografiya-num', totalMonografiya);

  const yearEl = document.getElementById('stat-years-num');
  if (yearEl) yearEl.textContent = yearRange;
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
    localStorage.setItem('ustoz_prefs', JSON.stringify({
      lang: state.currentLang,
      theme: state.currentTheme
    }));
  } catch (e) {}
}

function loadPreferences() {
  try {
    const prefs = JSON.parse(localStorage.getItem('ustoz_prefs'));
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
