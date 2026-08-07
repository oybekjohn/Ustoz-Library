/* ============================================
   DL-LIBRARY.UZ — Asosiy ilova
   Renessans Ta'lim Universiteti — Raqamli kutubxona
   Barcha bo'limlar ro'yxatdan o'tishsiz ishlaydi.
   ============================================ */

import { initThemeToggle } from './theme.js';
import { showToast } from './toast.js';
import { initPresentationViewer } from './presentation-viewer.js';
import { initVideoPlayer } from './video-player.js';
import { initTestRunner } from './test-runner.js';
import { initTelegramMiniApp } from './telegram-mini-app.js';

// ---------- Tarjimalar (i18n) ----------
const translations = {
  uz: {
    siteTitle: "DL-library.uz — Raqamli kutubxona",
    heroName: "DL-library.uz",
    heroTitle: "Renessans Ta'lim Universiteti — Raqamli kutubxona",
    heroBio: "Ushbu elektron kutubxona Renessans ta'lim universiteti Matematika va iqtisod fakultetining Axborot texnologiyalari kafedrasi jamoasi tomonidan yaratilgan bo'lib, uning asosiy maqsadi talabalarga fan dasturlarini, fanlar bo'yicha uslubiy qo'llanmalarni, o'quv qo'llanmalarni, darsliklarni va monografiyalarni taqdim etishdir. Bundan tashqari, saytda talabalar uchun qiziqarli mavzulardagi bir qancha adabiyotlar ham jamlangan.",
    heroContact: "Elektron kutubxonadagi biror kitobni yuklab olmoqchi bo'lsangiz, quyidagi kontaktlarga murojaat qiling:",
    searchPlaceholder: "Kitob nomini qidirish...",
    filterAll: "Barchasi",
    statBooks: "Jami kitoblar",
    btnRead: "📖 O'qish",
    btnDownloadQr: "📱 QR yuklab olish",
    noResults: "Hech narsa topilmadi",
    noResultsDesc: "Boshqa kalit so'z bilan qidirib ko'ring",
    footerText: "Barcha huquqlar himoyalangan",
    footerUniversity: "Sayt mualliflari — RTU AT kafedrasi o'qituvchilari Ravshan Ayupov va Oybek Xushvaqtov",
    navBooks: "📚 Kitoblar",
    navPresentations: "📊 Taqdimotlar",
    navVideos: "🎥 Videolar",
    navTests: "📝 Testlar",
    comingSoon: "Bu funksiya hali mavjud emas",
    loading: "Yuklanmoqda...",
    back: "◀ Orqaga",
    presTitle: "📊 Taqdimotlar",
    presEmpty: "Hozircha taqdimotlar yo'q. Tez orada qo'shiladi!",
    presOpen: "Slaydlarni ko'rish",
    presSlides: "slayd",
    videosTitle: "🎥 Video darslar",
    videosEmpty: "Hozircha video darslar yo'q. Tez orada qo'shiladi!",
    videoOpen: "▶ Videoni ko'rish",
    testsTitle: "📝 Bilimni tekshirish testlari",
    testsEmpty: "Hozircha testlar yo'q. Tez orada qo'shiladi!",
    testStart: "🚀 Testni boshlash",
    testQuestions: "savol",
    loadError: "Ma'lumotlarni yuklashda xatolik yuz berdi. Sahifani yangilab ko'ring.",
    qrLabel: "Skanerlang va kitobni oching",
    pageOf: (c, t, n) => `Sahifa ${c} / ${t} (jami ${n} ta kitob)`,
    prev: "Oldingi",
    next: "Keyingi",
  },
  ru: {
    siteTitle: "DL-library.uz — Цифровая библиотека",
    heroName: "DL-library.uz",
    heroTitle: "Университет образования Ренессанс — Цифровая библиотека",
    heroBio: "Данная электронная библиотека создана коллективом кафедры Информационных технологий факультета Математики и экономики университета образования Ренессанс. Основная цель — предоставление студентам учебных программ, методических пособий, учебников и монографий. Кроме того, на сайте собран ряд материалов на темы, интересные студентам.",
    heroContact: "Если вы хотите скачать книгу из электронной библиотеки, свяжитесь с нами:",
    searchPlaceholder: "Поиск по названию книги...",
    filterAll: "Все",
    statBooks: "Всего книг",
    btnRead: "📖 Читать",
    btnDownloadQr: "📱 Скачать QR",
    noResults: "Ничего не найдено",
    noResultsDesc: "Попробуйте другое ключевое слово",
    footerText: "Все права защищены",
    footerUniversity: "Авторы сайта — преподаватели кафедры ИТ RTU Равшан Аюпов и Ойбек Хушвактов",
    navBooks: "📚 Книги",
    navPresentations: "📊 Презентации",
    navVideos: "🎥 Видео",
    navTests: "📝 Тесты",
    comingSoon: "Эта функция пока недоступна",
    loading: "Загрузка...",
    back: "◀ Назад",
    presTitle: "📊 Презентации",
    presEmpty: "Презентаций пока нет. Скоро появятся!",
    presOpen: "Открыть слайды",
    presSlides: "слайдов",
    videosTitle: "🎥 Видеоуроки",
    videosEmpty: "Видеоуроков пока нет. Скоро появятся!",
    videoOpen: "▶ Смотреть видео",
    testsTitle: "📝 Тесты для проверки знаний",
    testsEmpty: "Тестов пока нет. Скоро появятся!",
    testStart: "🚀 Начать тест",
    testQuestions: "вопросов",
    loadError: "Ошибка загрузки данных. Обновите страницу.",
    qrLabel: "Отсканируйте и откройте книгу",
    pageOf: (c, t, n) => `Страница ${c} из ${t} (всего ${n} книг)`,
    prev: "Назад",
    next: "Вперёд",
  },
  en: {
    siteTitle: "DL-library.uz — Digital Library",
    heroName: "DL-library.uz",
    heroTitle: "Renaissance University of Education — Digital Library",
    heroBio: "This digital library was created by the Information Technology Department of the Faculty of Mathematics and Economics at Renaissance University of Education. Its main goal is to provide students with curricula, study guides, textbooks and monographs. The site also offers a range of materials on topics of interest to students.",
    heroContact: "If you would like to download a book from the digital library, please contact us:",
    searchPlaceholder: "Search books...",
    filterAll: "All",
    statBooks: "Total books",
    btnRead: "📖 Read",
    btnDownloadQr: "📱 Download QR",
    noResults: "Nothing found",
    noResultsDesc: "Try a different keyword",
    footerText: "All rights reserved",
    footerUniversity: "Site authors — RTU IT Department lecturers Ravshan Ayupov and Oybek Xushvaqtov",
    navBooks: "📚 Books",
    navPresentations: "📊 Slides",
    navVideos: "🎥 Videos",
    navTests: "📝 Tests",
    comingSoon: "This feature is not available yet",
    loading: "Loading...",
    back: "◀ Back",
    presTitle: "📊 Presentations",
    presEmpty: "No presentations yet. Coming soon!",
    presOpen: "Open slides",
    presSlides: "slides",
    videosTitle: "🎥 Video lessons",
    videosEmpty: "No videos yet. Coming soon!",
    videoOpen: "▶ Watch video",
    testsTitle: "📝 Knowledge tests",
    testsEmpty: "No tests yet. Coming soon!",
    testStart: "🚀 Start test",
    testQuestions: "questions",
    loadError: "Failed to load data. Please refresh the page.",
    qrLabel: "Scan to open the book",
    pageOf: (c, t, n) => `Page ${c} of ${t} (total ${n} books)`,
    prev: "Prev",
    next: "Next",
  },
};

// Kategoriya nomlari (kalitlar backend CATEGORIES bilan bir xil)
const CATEGORY_LABELS = {
  it: { uz: "Axborot texnologiyalari", ru: "Информационные технологии", en: "IT" },
  ai: { uz: "Sun'iy intellekt", ru: "Искусственный интеллект", en: "AI" },
  iqtisodiyot: { uz: "Iqtisodiyot", ru: "Экономика", en: "Economics" },
  biznes: { uz: "Biznes", ru: "Бизнес", en: "Business" },
  salomatlik: { uz: "Salomatlik", ru: "Здоровье", en: "Health" },
  bogdorchilik: { uz: "Bog'dorchilik", ru: "Садоводство", en: "Gardening" },
  fandastur: { uz: "Fan dasturlari", ru: "Учебные программы", en: "Curricula" },
  ai_darslar: { uz: "AI darslar", ru: "Уроки AI", en: "AI lessons" },
  ai_agentlar: { uz: "AI agentlar", ru: "AI-агенты", en: "AI agents" },
  boshqa: { uz: "Boshqa", ru: "Прочее", en: "Other" },
};

const VIEWS = ['books', 'presentations', 'videos', 'tests'];

const state = {
  books: [],
  filteredBooks: [],
  currentLang: localStorage.getItem('dl_lang') || 'uz',
  currentCategory: 'all',
  searchQuery: '',
  currentPage: 1,
  booksPerPage: 12,
  activeView: 'books',
};

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

export function t() {
  return translations[state.currentLang] || translations.uz;
}

export function catLabel(key) {
  const entry = CATEGORY_LABELS[key];
  if (!entry) return key;
  return entry[state.currentLang] || entry.uz;
}

export function localized(row, field) {
  if (!row) return '';
  return row[`${field}_${state.currentLang}`] || row[`${field}_uz`] || '';
}

// ---------- Ishga tushirish ----------
document.addEventListener('DOMContentLoaded', () => {
  initThemeToggle();
  initTelegramMiniApp();
  initLanguage();
  initGoogleLoginPlaceholder();
  initNavigation();
  initScrollTop();
  setupBookControls();
  updateStaticTexts();

  loadBooks().then(() => {
    // QR chuqur havolasi: ?book=<id>
    const bookId = new URLSearchParams(location.search).get('book');
    if (bookId) openBookById(bookId);
  });

  // Boshlang'ich ko'rinish: URL hash saqlanadi (#presentations, ...)
  const initial = location.hash.replace('#', '');
  switchView(VIEWS.includes(initial) ? initial : 'books', { updateHash: false });

  window.addEventListener('hashchange', () => {
    const view = location.hash.replace('#', '');
    if (VIEWS.includes(view) && view !== state.activeView) {
      switchView(view, { updateHash: false });
    }
  });
});

// ---------- Google login (hozircha o'chirilgan) ----------
function initGoogleLoginPlaceholder() {
  const slot = $('#user-auth-slot');
  if (!slot) return;
  slot.addEventListener('click', (e) => {
    if (e.target.closest('#btn-google-login')) {
      showToast(t().comingSoon, { type: 'info' });
    }
  });
}

// ---------- Til ----------
function initLanguage() {
  $$('.lang-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.lang === state.currentLang);
    btn.addEventListener('click', () => {
      $$('.lang-btn').forEach((item) => item.classList.remove('active'));
      btn.classList.add('active');
      state.currentLang = btn.dataset.lang || 'uz';
      localStorage.setItem('dl_lang', state.currentLang);
      updateStaticTexts();
      renderFilters();
      renderStats();
      applyBookFilters();
      // Aktiv bo'lim kitoblardan boshqa bo'lsa, uni qayta chizamiz
      if (state.activeView !== 'books') renderActiveView();
    });
  });
}

// ---------- Navigatsiya ----------
function initNavigation() {
  $$('.nav-tab-btn, .mobile-nav-btn').forEach((btn) => {
    btn.addEventListener('click', () => switchView(btn.dataset.view));
  });

  const logoBtn = $('#nav-logo-btn');
  if (logoBtn) {
    logoBtn.addEventListener('click', (e) => {
      e.preventDefault();
      switchView('books');
    });
  }
}

function switchView(viewName, { updateHash = true } = {}) {
  state.activeView = viewName;
  if (updateHash) {
    history.replaceState(null, '', viewName === 'books' ? '#' : `#${viewName}`);
  }

  $$('.nav-tab-btn, .mobile-nav-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.view === viewName);
  });

  const isBooks = viewName === 'books';
  toggleSection('#books-section-view', isBooks);
  toggleSection('#hero', isBooks);
  toggleSection('#controls', isBooks);
  toggleSection('#dynamic-view-section', !isBooks);

  if (!isBooks) renderActiveView();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function toggleSection(sel, visible) {
  const node = $(sel);
  if (node) node.style.display = visible ? '' : 'none';
}

function renderActiveView() {
  const container = $('#dynamic-view-container');
  if (!container) return;
  container.innerHTML = `<div class="loading-spinner">${t().loading}</div>`;
  if (state.activeView === 'presentations') renderPresentationsView(container);
  if (state.activeView === 'videos') renderVideosView(container);
  if (state.activeView === 'tests') renderTestsView(container);
}

function renderBackButton(container, onBack) {
  const bar = document.createElement('div');
  bar.className = 'view-back-bar';
  const btn = document.createElement('button');
  btn.className = 'btn btn-secondary back-btn';
  btn.textContent = t().back;
  btn.addEventListener('click', onBack);
  bar.appendChild(btn);
  container.appendChild(bar);
}

// ---------- Taqdimotlar bo'limi ----------
async function renderPresentationsView(container) {
  try {
    const res = await fetch('/api/presentations');
    const data = await res.json();
    const items = data.presentations || [];

    if (items.length === 0) {
      container.innerHTML = `<div class="empty-state"><div class="empty-state__icon">📊</div><p>${t().presEmpty}</p></div>`;
      return;
    }

    container.innerHTML = `
      <h2 class="view-title">${t().presTitle}</h2>
      <div class="content-cards-grid"></div>
    `;
    const grid = container.querySelector('.content-cards-grid');

    items.forEach((p) => {
      const title = localized(p, 'title');
      const desc = localized(p, 'description');
      const cover = p.cover_key ? `/files/${p.cover_key}` : '';
      const card = document.createElement('article');
      card.className = 'material-card material-card--clickable';
      card.innerHTML = `
        <div class="material-card__media ${cover ? '' : 'material-card__media--placeholder'}">
          ${cover ? `<img src="${cover}" alt="" loading="lazy" />` : '<span class="material-card__media-icon">📊</span>'}
          ${p.page_count > 0 ? `<span class="material-card__count">${p.page_count} ${t().presSlides}</span>` : ''}
        </div>
        <div class="material-card__body">
          <span class="cat-chip" data-cat="${p.category}">${catLabel(p.category)}</span>
          <h3 class="material-card__title"></h3>
          <p class="material-card__desc"></p>
          <button class="btn btn-primary btn-block">${t().presOpen}</button>
        </div>
      `;
      card.querySelector('.material-card__title').textContent = title;
      card.querySelector('.material-card__desc').textContent = desc;
      card.querySelector('button').addEventListener('click', () => {
        container.innerHTML = '';
        renderBackButton(container, () => renderPresentationsView(container));
        const target = document.createElement('div');
        container.appendChild(target);
        initPresentationViewer(p, target, { lang: state.currentLang });
      });
      grid.appendChild(card);
    });
  } catch (err) {
    console.error('Presentations load error:', err);
    container.innerHTML = `<p class="error-msg">${t().loadError}</p>`;
  }
}

// ---------- Videolar bo'limi ----------
async function renderVideosView(container) {
  try {
    const res = await fetch('/api/videos');
    const data = await res.json();
    const items = data.videos || [];

    if (items.length === 0) {
      container.innerHTML = `<div class="empty-state"><div class="empty-state__icon">🎥</div><p>${t().videosEmpty}</p></div>`;
      return;
    }

    container.innerHTML = `
      <h2 class="view-title">${t().videosTitle}</h2>
      <div class="content-cards-grid"></div>
    `;
    const grid = container.querySelector('.content-cards-grid');

    items.forEach((v) => {
      const title = localized(v, 'title');
      const desc = localized(v, 'description');
      const thumb = `https://i.ytimg.com/vi/${v.youtube_video_id}/hqdefault.jpg`;
      const card = document.createElement('article');
      card.className = 'material-card material-card--clickable';
      card.innerHTML = `
        <div class="material-card__media material-card__media--video">
          <img src="${thumb}" alt="" loading="lazy" />
          <span class="material-card__play">▶</span>
          ${v.duration_seconds ? `<span class="material-card__count">${formatDuration(v.duration_seconds)}</span>` : ''}
        </div>
        <div class="material-card__body">
          <span class="cat-chip" data-cat="${v.category}">${catLabel(v.category)}</span>
          <h3 class="material-card__title"></h3>
          <p class="material-card__desc"></p>
          <button class="btn btn-primary btn-block">${t().videoOpen}</button>
        </div>
      `;
      card.querySelector('.material-card__title').textContent = title;
      card.querySelector('.material-card__desc').textContent = desc;
      const open = () => {
        container.innerHTML = '';
        renderBackButton(container, () => renderVideosView(container));
        const target = document.createElement('div');
        container.appendChild(target);
        initVideoPlayer(v, target, { lang: state.currentLang });
      };
      card.querySelector('button').addEventListener('click', open);
      card.querySelector('.material-card__media').addEventListener('click', open);
      grid.appendChild(card);
    });
  } catch (err) {
    console.error('Videos load error:', err);
    container.innerHTML = `<p class="error-msg">${t().loadError}</p>`;
  }
}

function formatDuration(totalSec) {
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${String(sec).padStart(2, '0')}`;
}

// ---------- Testlar bo'limi ----------
async function renderTestsView(container) {
  try {
    const res = await fetch('/api/tests');
    const data = await res.json();
    const items = data.tests || [];

    if (items.length === 0) {
      container.innerHTML = `<div class="empty-state"><div class="empty-state__icon">📝</div><p>${t().testsEmpty}</p></div>`;
      return;
    }

    container.innerHTML = `
      <h2 class="view-title">${t().testsTitle}</h2>
      <div class="content-cards-grid"></div>
    `;
    const grid = container.querySelector('.content-cards-grid');

    items.forEach((test) => {
      const title = localized(test, 'title');
      const desc = localized(test, 'description');
      const shownCount = Math.min(20, test.question_count || 0);
      const card = document.createElement('article');
      card.className = 'material-card material-card--clickable';
      card.innerHTML = `
        <div class="material-card__media material-card__media--placeholder material-card__media--test">
          <span class="material-card__media-icon">📝</span>
          <span class="material-card__count">${shownCount} ${t().testQuestions}</span>
        </div>
        <div class="material-card__body">
          <span class="cat-chip" data-cat="${test.category}">${catLabel(test.category)}</span>
          <h3 class="material-card__title"></h3>
          <p class="material-card__desc"></p>
          <button class="btn btn-primary btn-block">${t().testStart}</button>
        </div>
      `;
      card.querySelector('.material-card__title').textContent = title;
      card.querySelector('.material-card__desc').textContent = desc;
      card.querySelector('button').addEventListener('click', () => {
        container.innerHTML = '';
        renderBackButton(container, () => renderTestsView(container));
        const target = document.createElement('div');
        container.appendChild(target);
        initTestRunner(test, target, { lang: state.currentLang });
      });
      grid.appendChild(card);
    });
  } catch (err) {
    console.error('Tests load error:', err);
    container.innerHTML = `<p class="error-msg">${t().loadError}</p>`;
  }
}

// ---------- Kitoblar ----------
async function loadBooks() {
  try {
    const res = await fetch('/api/books', { headers: { Accept: 'application/json' } });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || 'API xatosi');

    state.books = data.books || [];
    state.filteredBooks = [...state.books];
    renderFilters();
    renderStats();
    renderBooks();
  } catch (e) {
    console.error('Books load error:', e);
    const grid = $('#books-grid');
    if (grid) {
      grid.innerHTML = `<div class="no-results"><div class="no-results__icon">📚</div><div class="no-results__text">${t().loadError}</div></div>`;
    }
  }
}

function openBookById(bookId) {
  const book = state.books.find((b) => String(b.id) === String(bookId));
  if (!book) return;
  switchView('books');
  openBookReader(book);
}

function openBookReader(book) {
  const fileUrl = book.file || (book.file_key ? `/files/${book.file_key}` : '');
  const title = getLocalizedTitle(book, state.currentLang);
  const qrDataUrl = typeof window.bookQrDataUrl === 'function' ? window.bookQrDataUrl(book.id) : '';
  if (typeof window.openFlipbook === 'function' && fileUrl) {
    window.openFlipbook(fileUrl, title, qrDataUrl);
  }
}

function renderBooks() {
  const grid = $('#books-grid');
  if (!grid) return;
  const tr = t();

  if (state.filteredBooks.length === 0) {
    grid.innerHTML = `
      <div class="no-results">
        <div class="no-results__icon">📚</div>
        <div class="no-results__text">${tr.noResults}</div>
        <div class="no-results__desc">${tr.noResultsDesc}</div>
      </div>
    `;
    renderPagination();
    return;
  }

  const start = (state.currentPage - 1) * state.booksPerPage;
  const pageBooks = state.filteredBooks.slice(start, start + state.booksPerPage);

  grid.innerHTML = '';
  pageBooks.forEach((b, i) => {
    const title = getLocalizedTitle(b, state.currentLang);
    const desc = getLocalizedDesc(b, state.currentLang);
    const coverUrl = b.cover || (b.cover_key ? `/files/${b.cover_key}` : '');
    const qrDataUrl = typeof window.bookQrDataUrl === 'function' ? window.bookQrDataUrl(b.id) : '';

    const card = document.createElement('article');
    card.className = 'book-card';
    card.style.animationDelay = `${Math.min(i, 8) * 50}ms`;
    card.innerHTML = `
      <div class="book-card__cover-wrapper">
        ${coverUrl
          ? `<img src="${coverUrl}" class="book-card__cover" alt="" loading="lazy" />`
          : '<div class="book-card__cover book-card__cover--placeholder">📚</div>'}
        <span class="book-card__badge book-card__badge--${b.category || 'boshqa'}">${catLabel(b.category)}</span>
        ${b.language ? `<span class="book-card__lang-badge">${b.language}</span>` : ''}
      </div>
      <div class="book-card__body">
        <h3 class="book-card__title"></h3>
        <div class="book-card__meta">
          ${b.year ? `<span class="book-card__year">📅 ${b.year}</span>` : ''}
          <span class="book-card__author">👤 <span class="book-card__author-name"></span></span>
        </div>
        ${desc ? '<p class="book-card__desc"></p>' : ''}
        ${qrDataUrl ? `
          <div class="book-card__qr">
            <img src="${qrDataUrl}" class="book-card__qr-img" alt="QR" loading="lazy" draggable="false" />
            <span class="book-card__qr-label">${tr.qrLabel}</span>
          </div>` : ''}
        <div class="book-card__actions">
          <button class="btn btn--primary btn-read-book">${tr.btnRead}</button>
          <button class="btn btn--secondary btn-download-qr">${tr.btnDownloadQr}</button>
        </div>
      </div>
    `;
    card.querySelector('.book-card__title').textContent = title;
    card.querySelector('.book-card__author-name').textContent = b.author || '';
    const descNode = card.querySelector('.book-card__desc');
    if (descNode) descNode.textContent = desc;
    card.querySelector('.book-card__title').addEventListener('click', () => openBookReader(b));
    card.querySelector('.book-card__cover-wrapper').addEventListener('click', () => openBookReader(b));
    card.querySelector('.btn-read-book').addEventListener('click', () => openBookReader(b));
    card.querySelector('.btn-download-qr').addEventListener('click', () => {
      if (typeof window.downloadQr === 'function') {
        window.downloadQr(b.id, `QR_${title}.png`);
      }
    });
    grid.appendChild(card);
  });

  renderPagination();
}

function getLocalizedDesc(book, lang) {
  if (book.description && typeof book.description === 'object') {
    return book.description[lang] || book.description.uz || '';
  }
  return book.description_uz || '';
}

function renderPagination() {
  const pagination = $('#pagination');
  const paginationInfo = $('#pagination-info');
  if (!pagination || !paginationInfo) return;

  const totalItems = state.filteredBooks.length;
  const totalPages = Math.ceil(totalItems / state.booksPerPage);

  if (totalItems === 0 || totalPages <= 1) {
    paginationInfo.innerHTML = '';
    pagination.innerHTML = '';
    return;
  }

  const tr = t();
  const current = state.currentPage;

  paginationInfo.innerHTML = `<span class="pagination-info-text">${tr.pageOf(current, totalPages, totalItems)}</span>`;

  let buttonsHtml = `
    <button class="pagination-btn pagination-btn--prev" data-page="${current - 1}" ${current === 1 ? 'disabled' : ''}>◀ ${tr.prev}</button>
  `;
  for (let i = 1; i <= totalPages; i++) {
    buttonsHtml += `<button class="pagination-btn ${i === current ? 'active' : ''}" data-page="${i}">${i}</button>`;
  }
  buttonsHtml += `
    <button class="pagination-btn pagination-btn--next" data-page="${current + 1}" ${current === totalPages ? 'disabled' : ''}>${tr.next} ▶</button>
  `;

  pagination.innerHTML = buttonsHtml;
}

function setupBookControls() {
  const searchInput = $('#search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      state.searchQuery = e.target.value.toLowerCase().trim();
      state.currentPage = 1;
      applyBookFilters();
    });
  }

  // Pagination — delegatsiya (DOM dinamik yangilanadi)
  document.addEventListener('click', (event) => {
    const btn = event.target.closest('#pagination [data-page]');
    if (!btn || btn.disabled) return;
    const page = Number(btn.dataset.page);
    const totalPages = Math.ceil(state.filteredBooks.length / state.booksPerPage);
    if (!page || page < 1 || page > totalPages) return;
    state.currentPage = page;
    renderBooks();
    $('#books-section-view')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}

function applyBookFilters() {
  const query = state.searchQuery;
  state.filteredBooks = state.books.filter((b) => {
    const title = getLocalizedTitle(b, state.currentLang);
    const author = b.author || '';
    const categoryOk = state.currentCategory === 'all' || b.category === state.currentCategory;
    const queryOk = !query || [title, author, b.category || ''].join(' ').toLowerCase().includes(query);
    return categoryOk && queryOk;
  });
  if ((state.currentPage - 1) * state.booksPerPage >= state.filteredBooks.length) {
    state.currentPage = 1;
  }
  renderStats();
  renderBooks();
}

function getLocalizedTitle(book, lang) {
  if (book.title && typeof book.title === 'object') {
    return book.title[lang] || book.title.uz || book.title.ru || book.title.en || '';
  }
  return book.title_uz || book.title || '';
}

// ---------- Statik matnlar ----------
function updateStaticTexts() {
  const tr = t();
  document.title = tr.siteTitle;
  const map = {
    '#hero-name': tr.heroName,
    '#hero-title': tr.heroTitle,
    '#hero-bio': tr.heroBio,
    '#hero-contact-text': tr.heroContact,
    '#footer-rights': tr.footerText,
    '#footer-university': tr.footerUniversity,
  };
  Object.entries(map).forEach(([selector, text]) => {
    const node = $(selector);
    if (node) node.textContent = text;
  });

  const searchInput = $('#search-input');
  if (searchInput) searchInput.placeholder = tr.searchPlaceholder;

  // Navigatsiya yorliqlari
  const navLabels = {
    books: tr.navBooks,
    presentations: tr.navPresentations,
    videos: tr.navVideos,
    tests: tr.navTests,
  };
  $$('.nav-tab-btn').forEach((btn) => {
    const label = navLabels[btn.dataset.view];
    if (label) btn.textContent = label;
  });
  $$('.mobile-nav-btn').forEach((btn) => {
    const label = navLabels[btn.dataset.view];
    if (!label) return;
    const [icon, ...words] = label.split(' ');
    btn.innerHTML = `<span class="mobile-nav-icon">${icon}</span><span>${words.join(' ')}</span>`;
  });
}

function renderStats() {
  const stats = $('#stats');
  const count = $('#search-count');
  const tr = t();
  if (count) count.textContent = `${state.filteredBooks.length}/${state.books.length}`;
  if (!stats) return;
  stats.innerHTML = `
    <div class="stat-card">
      <div class="stat-card__number">${state.books.length}</div>
      <div class="stat-card__label">${tr.statBooks}</div>
    </div>
  `;
}

function renderFilters() {
  const filters = $('#filters');
  if (!filters) return;
  const tr = t();
  const categories = Array.from(new Set(state.books.map((b) => b.category).filter(Boolean)));
  filters.innerHTML = [
    `<button class="filter-btn ${state.currentCategory === 'all' ? 'active' : ''}" data-category="all">${tr.filterAll}</button>`,
    ...categories.map(
      (c) => `<button class="filter-btn ${state.currentCategory === c ? 'active' : ''}" data-category="${c}">${catLabel(c)}</button>`
    ),
  ].join('');
  filters.querySelectorAll('.filter-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      filters.querySelectorAll('.filter-btn').forEach((item) => item.classList.remove('active'));
      btn.classList.add('active');
      state.currentCategory = btn.dataset.category || 'all';
      state.currentPage = 1;
      applyBookFilters();
    });
  });
}

// ---------- Yuqoriga qaytish tugmasi ----------
function initScrollTop() {
  const btn = $('#scroll-top');
  if (!btn) return;
  window.addEventListener('scroll', () => {
    btn.classList.toggle('visible', window.scrollY > 600);
  });
  btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
}
