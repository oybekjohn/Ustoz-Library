/* ============================================
   DL-LIBRARY.UZ вЂ” Application Main Engine
   Renessans Ta'lim Universiteti Raqamli Kutubxona
   ============================================ */

import { checkAuthState, currentUser } from './auth.js';
import { initThemeToggle } from './theme.js';
import { initPresentationViewer } from './presentation-viewer.js';
import { initVideoPlayer } from './video-player.js';
import { initTestRunner } from './test-runner.js';
import { initProfilePage } from './profile.js';
import { initTelegramMiniApp } from './telegram-mini-app.js';

// ---------- Internationalization (i18n) ----------
const translations = {
  uz: {
    siteTitle: "DL-library.uz",
    heroName: "DL-library.uz",
    heroTitle: "Renessans Ta'lim Universiteti вЂ” Raqamli Kutubxona",
    heroBio: "Ushbu elektron kutubxona Renessans ta'lim universiteti Matematika va Iqtisod fakul'tetining Axborot texnologiyalari kafedrasi jamoasi tomonidan yaratilgan bo'lib, uning asosiy maqsadi talabalarga fan dasturlarini, fanlar bo'yicha uslubiy qo'llanmalarni, o'quv qo'llanmalarni, darsliklarni va monografiyalarni taqdim etishdir. Undan tashqari saytga talabalar uchun qiziq bo'lgan mavzular bo'yicha ham bir qancha adabiyotlar jam qilingan.",
    heroContact: "Agar siz elektron kutubxonadagi biror bir kitobni yuklab olmoqchi bo'lsangiz, quyidagi kontaktlarga murojaat qiling:",
    searchPlaceholder: "Kitob nomini qidirish...",
    filterAll: "Barchasi",
    statBooks: "Umumiy kitoblar",
    btnRead: "рџ“– O'qish",
    btnDownloadQr: "рџ“± QR yuklab olish",
    noResults: "Topilmadi",
    noResultsDesc: "Boshqa kalit so'z bilan qidirib ko'ring",
    footerText: "Barcha huquqlar himoyalangan",
    footerUniversity: "Ushbu sayt mualliflari RTU AT kafedrasi o'qituvchilari Ravshan Ayupov va Oybek Xushvaqtov"
  },
  ru: {
    siteTitle: "DL-library.uz",
    heroName: "DL-library.uz",
    heroTitle: "РЈРЅРёРІРµСЂСЃРёС‚РµС‚ Р РµРЅРµСЃСЃР°РЅСЃ вЂ” Р¦РёС„СЂРѕРІР°СЏ Р‘РёР±Р»РёРѕС‚РµРєР°",
    heroBio: "Р”Р°РЅРЅР°СЏ СЌР»РµРєС‚СЂРѕРЅРЅР°СЏ Р±РёР±Р»РёРѕС‚РµРєР° СЃРѕР·РґР°РЅР° РєРѕР»Р»РµРєС‚РёРІРѕРј РєР°С„РµРґСЂС‹ РРЅС„РѕСЂРјР°С†РёРѕРЅРЅС‹С… С‚РµС…РЅРѕР»РѕРіРёР№ С„Р°РєСѓР»СЊС‚РµС‚Р° РњР°С‚РµРјР°С‚РёРєРё Рё Р­РєРѕРЅРѕРјРёРєРё Р РµРЅРµСЃСЃР°РЅСЃ СѓРЅРёРІРµСЂСЃРёС‚РµС‚Р° РѕР±СЂР°Р·РѕРІР°РЅРёСЏ. РћСЃРЅРѕРІРЅР°СЏ С†РµР»СЊ вЂ” РїСЂРµРґРѕСЃС‚Р°РІР»РµРЅРёРµ СЃС‚СѓРґРµРЅС‚Р°Рј СѓС‡РµР±РЅС‹С… РїСЂРѕРіСЂР°РјРј, РјРµС‚РѕРґРёС‡РµСЃРєРёС… РїРѕСЃРѕР±РёР№, СѓС‡РµР±РЅРёРєРѕРІ Рё РјРѕРЅРѕРіСЂР°С„РёР№.",
    heroContact: "Р•СЃР»Рё РІС‹ С…РѕС‚РёС‚Рµ СЃРєР°С‡Р°С‚СЊ РєРЅРёРіСѓ РёР· СЌР»РµРєС‚СЂРѕРЅРЅРѕР№ Р±РёР±Р»РёРѕС‚РµРєРё, РѕР±СЂР°С‚РёС‚РµСЃСЊ РїРѕ СЃР»РµРґСѓСЋС‰РёРј РєРѕРЅС‚Р°РєС‚Р°Рј:",
    searchPlaceholder: "РџРѕРёСЃРє...",
    filterAll: "Р’СЃРµ",
    statBooks: "Р’СЃРµРіРѕ РєРЅРёРі",
    btnRead: "рџ“– Р§РёС‚Р°С‚СЊ",
    btnDownloadQr: "рџ“± РЎРєР°С‡Р°С‚СЊ QR",
    noResults: "РќРµ РЅР°Р№РґРµРЅРѕ",
    noResultsDesc: "РџРѕРїСЂРѕР±СѓР№С‚Рµ РґСЂСѓРіРѕРµ РєР»СЋС‡РµРІРѕРµ СЃР»РѕРІРѕ",
    footerText: "Р’СЃРµ РїСЂР°РІР° Р·Р°С‰РёС‰РµРЅС‹",
    footerUniversity: "РђРІС‚РѕСЂС‹ СЃР°Р№С‚Р° вЂ” РїСЂРµРїРѕРґР°РІР°С‚РµР»Рё РєР°С„РµРґСЂС‹ РРў RTU Р Р°РІС€Р°РЅ РђСЋРїРѕРІ Рё РћР№Р±РµРє РҐСѓС€РІР°РєС‚РѕРІ"
  },
  en: {
    siteTitle: "DL-library.uz",
    heroName: "DL-library.uz",
    heroTitle: "Renaissance University of Education вЂ” Digital Library",
    heroBio: "This digital library was created by the Information Technology Department of the Faculty of Mathematics and Economics at Renaissance University of Education.",
    heroContact: "If you would like to download a book from the digital library, please contact us via:",
    searchPlaceholder: "Search...",
    filterAll: "All",
    statBooks: "Total Books",
    btnRead: "рџ“– Read",
    btnDownloadQr: "рџ“± Download QR",
    noResults: "No items found",
    noResultsDesc: "Try a different keyword",
    footerText: "All rights reserved",
    footerUniversity: "Site authors вЂ” RTU IT Department lecturers Ravshan Ayupov and Oybek Xushvaqtov"
  }
};

const state = {
  books: [],
  filteredBooks: [],
  currentLang: 'uz',
  currentCategory: 'all',
  searchQuery: '',
  currentPage: 1,
  booksPerPage: 12,
  activeView: 'books' // 'books', 'presentations', 'videos', 'tests', 'profile'
};

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

document.addEventListener('DOMContentLoaded', async () => {
  initThemeToggle();
  await checkAuthState();
  renderUserAuthSlot();

  initNavigation();
  loadBooks();
  setupEventListeners();

  // Telegram Mini App Context check
  initTelegramMiniApp();
});

function renderUserAuthSlot() {
  const slot = $('#user-auth-slot');
  if (!slot) return;

  if (currentUser) {
    slot.innerHTML = `
      <div class="user-profile-badge" id="user-profile-badge" style="cursor:pointer; display:flex; align-items:center; gap:8px;">
        <img src="${currentUser.avatarUrl || '/img/default-avatar.png'}" style="width:32px; height:32px; border-radius:50%; object-fit:cover;" />
        <span style="font-weight:600; font-size:0.9rem;">${currentUser.displayName.split(' ')[0]}</span>
      </div>
    `;
    document.getElementById('user-profile-badge').onclick = () => switchView('profile');
  } else {
    slot.innerHTML = `
      <button id="btn-google-login" class="btn btn-sm btn-outline-google" title="Tez kunda ulanadi" style="opacity: 0.7; cursor: default;">Google orqali kirish</button>
    `;
    // Hozircha hech narsa qilmaydi вЂ” tugma dekorativ
  }
}

function initNavigation() {
  // Desktop tabs
  const tabBtns = $$('.nav-tab-btn');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      switchView(btn.dataset.view);
    });
  });

  // Mobile bottom nav
  const mobileNavBtns = $$('.mobile-nav-btn');
  mobileNavBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      switchView(btn.dataset.view);
    });
  });

  const logoBtn = $('#nav-logo-btn');
  if (logoBtn) {
    logoBtn.addEventListener('click', (e) => {
      e.preventDefault();
      switchView('books');
    });
  }
}

function switchView(viewName) {
  state.activeView = viewName;

  const booksSection = $('#books-section-view');
  const heroSection = $('#hero');
  const controlsSection = $('#controls');
  const dynamicViewSection = $('#dynamic-view-section');
  const dynamicContainer = $('#dynamic-view-container');

  // Active tab button update вЂ” desktop tabs
  $$('.nav-tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === viewName);
  });

  // Active tab button update вЂ” mobile bottom nav
  $$('.mobile-nav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === viewName);
  });

  if (viewName === 'books') {
    if (booksSection) booksSection.style.display = 'block';
    if (heroSection) heroSection.style.display = 'block';
    if (controlsSection) controlsSection.style.display = 'block';
    if (dynamicViewSection) dynamicViewSection.style.display = 'none';
  } else {
    if (booksSection) booksSection.style.display = 'none';
    if (heroSection) heroSection.style.display = 'none';
    if (controlsSection) controlsSection.style.display = 'none';
    if (dynamicViewSection) dynamicViewSection.style.display = 'block';

    dynamicContainer.innerHTML = '<div class="loading-spinner">Yuklanmoqda...</div>';

    if (viewName === 'presentations') renderPresentationsView(dynamicContainer);
    if (viewName === 'videos') renderVideosView(dynamicContainer);
    if (viewName === 'tests') renderTestsView(dynamicContainer);
    if (viewName === 'profile') initProfilePage(dynamicContainer);
  }
}

// ---------- Presentations View ----------
async function renderPresentationsView(container) {
  try {
    const res = await fetch('/api/presentations');
    const data = await res.json();
    const items = data.presentations || [];

    if (items.length === 0) {
      container.innerHTML = `<div class="empty-state">рџ“Љ Taqdimotlar mavjud emas.</div>`;
      return;
    }

    container.innerHTML = `
      <h2 class="view-title">рџ“Љ Prezentatsiyalar va Taqdimotlar</h2>
      <div class="content-cards-grid">
        ${items.map(p => {
          const pdfUrl = p.pdf_key ? (p.pdf_key.startsWith('/') ? p.pdf_key : `/files/${p.pdf_key}`) : '';
          return `
          <div class="material-card">
            <div class="material-card-header">
              <h3>${p.title_uz}</h3>
              <span class="badge badge-info">${p.page_count} slayd</span>
            </div>
            <p>${p.description_uz || ''}</p>
            <button class="btn btn-primary btn-open-pres" data-id="${p.id}" data-pdf="${pdfUrl}" data-pages="${p.page_count}">Slaydlarni ko'rish рџ“–</button>
          </div>
        `;
        }).join('')}
      </div>
    `;

    container.querySelectorAll('.btn-open-pres').forEach(btn => {
      btn.onclick = () => {
        const id = btn.dataset.id;
        const pageCount = Number(btn.dataset.pages);
        const pdfUrl = btn.dataset.pdf;
        container.innerHTML = `
          <button class="btn btn-secondary back-btn" id="btn-back-pres">в—Ђ Orqaga</button>
          <div id="pres-viewer-target" style="margin-top:15px;"></div>
        `;
        document.getElementById('btn-back-pres').onclick = () => renderPresentationsView(container);
        initPresentationViewer(id, pdfUrl, pageCount, document.getElementById('pres-viewer-target'));
      };
    });
  } catch (err) {
    container.innerHTML = `<p class="error-msg">Taqdimotlarni yuklashda xatolik</p>`;
  }
}

// ---------- Videos View ----------
async function renderVideosView(container) {
  try {
    const res = await fetch('/api/videos');
    const data = await res.json();
    const items = data.videos || [];

    if (items.length === 0) {
      container.innerHTML = `<div class="empty-state">рџЋҐ Video darslar mavjud emas.</div>`;
      return;
    }

    container.innerHTML = `
      <h2 class="view-title">рџЋҐ Video Darslar</h2>
      <div class="content-cards-grid">
        ${items.map(v => `
          <div class="material-card">
            <div class="material-card-header">
              <h3>${v.title_uz}</h3>
              <span class="badge badge-secondary">YouTube</span>
            </div>
            <p>${v.description_uz || ''}</p>
            <button class="btn btn-primary btn-open-video" data-id="${v.id}" data-yt="${v.youtube_video_id}" data-duration="${v.duration_seconds || 0}">Videoni ko'rish в–¶</button>
          </div>
        `).join('')}
      </div>
    `;

    container.querySelectorAll('.btn-open-video').forEach(btn => {
      btn.onclick = () => {
        const id = btn.dataset.id;
        const ytId = btn.dataset.yt;
        const duration = Number(btn.dataset.duration);

        container.innerHTML = `
          <button class="btn btn-secondary back-btn" id="btn-back-video">в—Ђ Orqaga</button>
          <div id="video-player-target" style="margin-top:15px;"></div>
        `;
        document.getElementById('btn-back-video').onclick = () => renderVideosView(container);
        initVideoPlayer(id, ytId, duration, document.getElementById('video-player-target'));
      };
    });
  } catch (err) {
    container.innerHTML = `<p class="error-msg">Videolarni yuklashda xatolik</p>`;
  }
}

// ---------- Tests View ----------
async function renderTestsView(container) {
  try {
    const res = await fetch('/api/tests');
    const data = await res.json();
    const items = data.tests || [];

    if (items.length === 0) {
      container.innerHTML = `<div class="empty-state">рџ“ќ Hozircha faol testlar yo'q.</div>`;
      return;
    }

    container.innerHTML = `
      <h2 class="view-title">рџ“ќ Bilimni Tekshirish Testlari</h2>
      <div class="content-cards-grid">
        ${items.map(t => `
          <div class="material-card">
            <div class="material-card-header">
              <h3>${t.title_uz}</h3>
              <span class="badge badge-warning">вЏі ${t.duration_minutes} daqiqa</span>
            </div>
            <p>${t.description_uz || ''}</p>
            <p><small>Savollar soni: ${t.question_count || 0} ta | O'tish bali: ${t.passing_percent}%</small></p>
            <div style="display:flex; gap:10px; margin-top:10px;">
              <button class="btn btn-primary btn-start-test-run" data-id="${t.id}">Testni boshlash рџљЂ</button>
            </div>
          </div>
        `).join('')}
      </div>
    `;

    container.querySelectorAll('.btn-start-test-run').forEach(btn => {
      btn.onclick = () => {
        const testId = btn.dataset.id;
        container.innerHTML = `
          <button class="btn btn-secondary back-btn" id="btn-back-tests">в—Ђ Orqaga</button>
          <div id="test-runner-target" style="margin-top:15px;"></div>
        `;
        document.getElementById('btn-back-tests').onclick = () => renderTestsView(container);
        initTestRunner(testId, document.getElementById('test-runner-target'));
      };
    });
  } catch (err) {
    container.innerHTML = `<p class="error-msg">Testlarni yuklashda xatolik</p>`;
  }
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
  } catch (e) {
    console.error('Books load error:', e);
  }
}

function renderBooks() {
  const grid = $('#books-grid');
  if (!grid) return;
  const t = translations[state.currentLang];
  const lang = state.currentLang;

  if (state.filteredBooks.length === 0) {
    grid.innerHTML = `
      <div class="no-results">
        <div class="no-results__icon">рџ“љ</div>
        <div class="no-results__text">${t.noResults}</div>
      </div>
    `;
    return;
  }

  const start = (state.currentPage - 1) * state.booksPerPage;
  const end = Math.min(start + state.booksPerPage, state.filteredBooks.length);
  const pageBooks = state.filteredBooks.slice(start, end);

  // Helper: kitob nomini olish (API title: {uz,ru,en} yoki title_uz formatida kelishi mumkin)
  const getTitle = (b) => {
    if (b.title && typeof b.title === 'object') return b.title[lang] || b.title.uz || '';
    return b.title_uz || b.title || '';
  };

  // Helper: muqova URL (API cover: '/files/...' yoki cover_key formatida kelishi mumkin)
  const getCover = (b) => {
    if (b.cover) return b.cover;
    if (b.cover_key) return `/files/${b.cover_key}`;
    return '';
  };

  // Helper: PDF fayl URL (API file: '/files/...' yoki file_key formatida kelishi mumkin)
  const getFile = (b) => {
    if (b.file) return b.file;
    if (b.file_key) return `/files/${b.file_key}`;
    return '';
  };

  grid.innerHTML = pageBooks.map(b => {
    const title = getTitle(b);
    const coverUrl = getCover(b);
    const fileUrl = getFile(b);
    const coverImg = coverUrl
      ? `<img src="${coverUrl}" class="book-card-cover" alt="${title}" loading="lazy" />`
      : `<div class="book-card-cover book-card-cover--placeholder">рџ“љ</div>`;

    return `
    <div class="book-card">
      ${coverImg}
      <div class="book-card-body">
        <h4 class="book-card-title">${title}</h4>
        <p class="book-card-author">${b.author || ''}</p>
        <div class="book-card-actions">
          <button class="btn btn-sm btn-primary btn-read-book" data-id="${b.id}" data-file="${fileUrl}">${t.btnRead}</button>
          <button class="btn btn-sm btn-secondary btn-download-qr" data-id="${b.id}" data-title="${title}">${t.btnDownloadQr}</button>
        </div>
      </div>
    </div>
  `;
  }).join('');

  grid.querySelectorAll('.btn-read-book').forEach(btn => {
    btn.onclick = () => {
      const bookId = btn.dataset.id;
      const pdfUrl = btn.dataset.file;
      if (typeof window.openFlipbook === 'function') {
        window.openFlipbook(pdfUrl, btn.closest('.book-card').querySelector('h4').textContent, bookId);
      }
    };
  });

  grid.querySelectorAll('.btn-download-qr').forEach(btn => {
    btn.onclick = () => {
      const bookId = btn.dataset.id;
      const bookTitle = btn.dataset.title;
      if (typeof window.downloadQr === 'function') {
        window.downloadQr(bookId, `QR_${bookTitle}.png`);
      }
    };
  });

  renderPagination();
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

  const lang = state.currentLang;
  const current = state.currentPage;

  // Pagination info text
  let infoText = `Sahifa ${current} / ${totalPages} (Jami ${totalItems} ta kitob)`;
  if (lang === 'ru') infoText = `Страница ${current} из ${totalPages} (Всего ${totalItems} книг)`;
  if (lang === 'en') infoText = `Page ${current} of ${totalPages} (Total ${totalItems} books)`;

  paginationInfo.innerHTML = `<span class="pagination-info-text">${infoText}</span>`;

  // Buttons HTML
  let buttonsHtml = '';

  // Previous button
  const prevLabel = lang === 'ru' ? 'Назад' : (lang === 'en' ? 'Prev' : 'Oldingi');
  buttonsHtml += `
    <button class="pagination-btn pagination-btn--prev" data-page="${current - 1}" ${current === 1 ? 'disabled' : ''}>
      ◀ ${prevLabel}
    </button>
  `;

  // Page number buttons
  for (let i = 1; i <= totalPages; i++) {
    buttonsHtml += `
      <button class="pagination-btn ${i === current ? 'active' : ''}" data-page="${i}">
        ${i}
      </button>
    `;
  }

  // Next button
  const nextLabel = lang === 'ru' ? 'Вперед' : (lang === 'en' ? 'Next' : 'Keyingi');
  buttonsHtml += `
    <button class="pagination-btn pagination-btn--next" data-page="${current + 1}" ${current === totalPages ? 'disabled' : ''}>
      ${nextLabel} ▶
    </button>
  `;

  pagination.innerHTML = buttonsHtml;
}

function setupEventListeners() {
  const searchInput = $('#search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      state.searchQuery = e.target.value.toLowerCase().trim();
      state.currentPage = 1;
      applyBookFilters();
    });
  }

  $$('.lang-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.lang-btn').forEach(item => item.classList.remove('active'));
      btn.classList.add('active');
      state.currentLang = btn.dataset.lang || 'uz';
      updateStaticTexts();
      renderFilters();
      applyBookFilters();
    });
  });

  const pagination = $('#pagination');
  if (pagination) {
    pagination.addEventListener('click', (event) => {
      const btn = event.target.closest('[data-page]');
      if (!btn || btn.disabled) return;
      state.currentPage = Number(btn.dataset.page) || 1;
      renderBooks();
      $('#books-section-view')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }
}

function applyBookFilters() {
  const lang = state.currentLang;
  const query = state.searchQuery;
  state.filteredBooks = state.books.filter(b => {
    const title = getLocalizedTitle(b, lang);
    const author = b.author || '';
    const categoryOk = state.currentCategory === 'all' || b.category === state.currentCategory;
    const queryOk = !query || [title, author, b.category || ''].join(' ').toLowerCase().includes(query);
    return categoryOk && queryOk;
  });
  renderBooks();
}

function getLocalizedTitle(book, lang) {
  if (book.title && typeof book.title === 'object') {
    return book.title[lang] || book.title.uz || book.title.ru || book.title.en || '';
  }
  return book.title_uz || book.title || '';
}

function updateStaticTexts() {
  const t = translations[state.currentLang] || translations.uz;
  document.title = t.siteTitle;
  const map = {
    '#hero-name': t.heroName,
    '#hero-title': t.heroTitle,
    '#hero-bio': t.heroBio,
    '#hero-contact-text': t.heroContact,
    '#footer-rights': t.footerText,
    '#footer-university': t.footerUniversity,
  };
  Object.entries(map).forEach(([selector, text]) => {
    const node = $(selector);
    if (node) node.textContent = text;
  });
  const searchInput = $('#search-input');
  if (searchInput) searchInput.placeholder = t.searchPlaceholder;
}

function renderStats() {
  const stats = $('#stats');
  const count = $('#search-count');
  const t = translations[state.currentLang] || translations.uz;
  if (count) count.textContent = `${state.filteredBooks.length}/${state.books.length}`;
  if (!stats) return;
  stats.innerHTML = `
    <div class="stat-card">
      <div class="stat-card__number">${state.books.length}</div>
      <div class="stat-card__label">${t.statBooks}</div>
    </div>
  `;
}

function renderFilters() {
  const filters = $('#filters');
  if (!filters) return;
  const t = translations[state.currentLang] || translations.uz;
  const categories = Array.from(new Set(state.books.map(book => book.category).filter(Boolean)));
  filters.innerHTML = [
    `<button class="filter-btn active" data-category="all">${t.filterAll}</button>`,
    ...categories.map(category => `<button class="filter-btn" data-category="${category}">${category}</button>`),
  ].join('');
  filters.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      filters.querySelectorAll('.filter-btn').forEach(item => item.classList.remove('active'));
      btn.classList.add('active');
      state.currentCategory = btn.dataset.category || 'all';
      state.currentPage = 1;
      applyBookFilters();
    });
  });
}

