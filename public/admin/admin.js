/* ============================================
   DL-library.uz — Admin panel logikasi
   ============================================ */

const $ = (s) => document.querySelector(s);
let BOOKS = [];

const CAT_NAMES = {
  it: 'IT', ai: "Sun'iy intellekt", iqtisodiyot: 'Iqtisodiyot',
  biznes: 'Biznes va Tadbirkorlik', salomatlik: 'Salomatlik va Kosmetika',
  bogdorchilik: "Bog'dorchilik", fandastur: 'Fan dasturlari',
  ai_darslar: 'SI darslar', ai_agentlar: 'SI agentlar', boshqa: 'Boshqa',
};

// ---------- API yordamchisi ----------
async function api(path, opts = {}) {
  const res = await fetch(path, {
    headers: opts.body && !(opts.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {},
    ...opts,
  });
  let data = {};
  try { data = await res.json(); } catch {}
  if (!res.ok || data.ok === false) {
    throw new Error(data.error || `Xatolik (${res.status})`);
  }
  return data;
}

// ---------- Boshlash ----------
document.addEventListener('DOMContentLoaded', async () => {
  setupLogin();
  setupDashboard();
  try {
    const me = await api('/api/auth/me');
    if (me.authenticated) showDashboard(me.user);
    else showLogin();
  } catch {
    showLogin();
  }
});

function showLogin() {
  $('#login-view').classList.remove('hidden');
  $('#dash-view').classList.add('hidden');
}

async function showDashboard(user) {
  $('#login-view').classList.add('hidden');
  $('#dash-view').classList.remove('hidden');
  $('#who').textContent = user ? `👤 ${user.username}` : '';
  await loadBooks();
}

// ---------- Login ----------
function setupLogin() {
  $('#login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    $('#login-error').textContent = '';
    try {
      const data = await api('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          username: $('#login-username').value,
          password: $('#login-password').value,
        }),
      });
      showDashboard(data.user);
    } catch (err) {
      $('#login-error').textContent = err.message;
    }
  });
}

// ---------- Dashboard ----------
function setupDashboard() {
  $('#logout-btn').addEventListener('click', async () => {
    try { await api('/api/auth/logout', { method: 'POST' }); } catch {}
    showLogin();
  });

  $('#logout-btn').addEventListener('click', async () => {
    try { await api('/api/auth/logout', { method: 'POST' }); } catch {}
    showLogin();
  });

  // Admin Tab Switcher
  const tabs = document.querySelectorAll('.admin-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      document.querySelectorAll('.admin-tab-pane').forEach(p => p.style.display = 'none');
      const pane = document.getElementById(tab.dataset.tab);
      if (pane) pane.style.display = 'block';

      if (tab.dataset.tab === 'tab-presentations') loadAdminPresentations();
      if (tab.dataset.tab === 'tab-videos') loadAdminVideos();
      if (tab.dataset.tab === 'tab-tests') loadAdminTests();
    });
  });

  $('#book-form').addEventListener('submit', saveBook);
  $('#reset-form').addEventListener('click', resetForm);
  $('#search').addEventListener('input', renderBooks);

  setupPresentationForm();
  setupVideoForm();
  setupTestForm();
}

let parsedTestQuestions = null;

function setupPresentationForm() {
  const form = $('#pres-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    $('#pres-form-error').textContent = '';
    const pdfFile = $('#pres-pdf').files[0];
    if (!pdfFile) {
      $('#pres-form-error').textContent = 'PDF fayl tanlanmagan';
      return;
    }

    try {
      // 1. Upload PDF
      const pdfFd = new FormData();
      pdfFd.append('file', pdfFile);
      pdfFd.append('type', 'presentation');
      const pdfRes = await fetch('/api/upload', { method: 'POST', body: pdfFd });
      const pdfData = await pdfRes.json();
      if (!pdfRes.ok || !pdfData.ok) throw new Error(pdfData.error || 'PDF yuklashda xatolik');

      // 2. Upload Cover (optional)
      let coverKey = null;
      const coverFile = $('#pres-cover').files[0];
      if (coverFile) {
        const coverFd = new FormData();
        coverFd.append('file', coverFile);
        coverFd.append('type', 'presentation-cover');
        const coverRes = await fetch('/api/upload', { method: 'POST', body: coverFd });
        const coverData = await coverRes.json();
        if (coverRes.ok && coverData.ok) coverKey = coverData.key;
      }

      // 3. Create presentation record
      const body = {
        title_uz: $('#pres-title-uz').value,
        title_ru: $('#pres-title-ru').value,
        title_en: $('#pres-title-en').value,
        category: $('#pres-category').value,
        page_count: pdfData.pageCount || 10,
        pdf_key: pdfData.key,
        cover_key: coverKey,
        published: 1
      };

      const res = await fetch('/api/presentations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!res.ok) throw new Error("Prezentatsiyani saqlashda xatolik");

      alert("Prezentatsiya saqlandi!");
      form.reset();
      loadAdminPresentations();
    } catch (err) {
      $('#pres-form-error').textContent = err.message;
    }
  });
}

async function loadAdminPresentations() {
  const container = $('#pres-admin-list');
  try {
    const res = await fetch('/api/presentations');
    const data = await res.json();
    const items = data.presentations || [];
    container.innerHTML = items.map(p => `
      <div style="padding:10px; border-bottom:1px solid #eee; display:flex; justify-content:space-between;">
        <span><strong>${p.title_uz}</strong> (${p.page_count} slayd)</span>
        <button onclick="deletePresentation(${p.id})" class="btn btn--danger btn--sm">O'chirish</button>
      </div>
    `).join('') || '<p>Prezentatsiyalar yo\'q</p>';
  } catch (err) {
    container.textContent = 'Xatolik';
  }
}

window.deletePresentation = async function(id) {
  if (confirm("O'chirishni tasdiqlaysizmi?")) {
    await fetch(`/api/presentations/${id}`, { method: 'DELETE' });
    loadAdminPresentations();
  }
};

function setupVideoForm() {
  const form = $('#video-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    $('#vid-form-error').textContent = '';

    try {
      const body = {
        title_uz: $('#vid-title-uz').value,
        youtube_url: $('#vid-url').value,
        category: $('#vid-category').value,
        published: 1
      };

      const res = await fetch('/api/videos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || errData.errors?.[0] || "Videoni saqlashda xatolik");
      }

      alert("Video saqlandi!");
      form.reset();
      loadAdminVideos();
    } catch (err) {
      $('#vid-form-error').textContent = err.message;
    }
  });
}

async function loadAdminVideos() {
  const container = $('#vid-admin-list');
  try {
    const res = await fetch('/api/videos');
    const data = await res.json();
    const items = data.videos || [];
    container.innerHTML = items.map(v => `
      <div style="padding:10px; border-bottom:1px solid #eee; display:flex; justify-content:space-between;">
        <span><strong>${v.title_uz}</strong> (${v.youtube_video_id})</span>
        <button onclick="deleteVideo(${v.id})" class="btn btn--danger btn--sm">O'chirish</button>
      </div>
    `).join('') || '<p>Videolar yo\'q</p>';
  } catch (err) {
    container.textContent = 'Xatolik';
  }
}

window.deleteVideo = async function(id) {
  if (confirm("O'chirishni tasdiqlaysizmi?")) {
    await fetch(`/api/videos/${id}`, { method: 'DELETE' });
    loadAdminVideos();
  }
};

function setupTestForm() {
  const parseBtn = $('#btn-parse-txt');
  if (!parseBtn) return;

  parseBtn.addEventListener('click', async () => {
    $('#test-form-error').textContent = '';
    const file = $('#test-txt-file').files[0];
    if (!file) {
      $('#test-form-error').textContent = 'TXT fayl tanlanmagan';
      return;
    }

    const fd = new FormData();
    fd.append('file', file);

    try {
      const res = await fetch('/api/tests/parse', { method: 'POST', body: fd });
      const data = await res.json();

      if (!res.ok || !data.success) {
        parsedTestQuestions = null;
        $('#btn-save-test').disabled = true;
        const errMsgs = (data.errors || []).map(e => `[${e.questionNumber || 'Xato'}]: ${e.message}`).join('<br>');
        $('#test-parse-preview').innerHTML = `<div style="color:red;">❌ Parsing xatosi:<br>${errMsgs}</div>`;
        return;
      }

      parsedTestQuestions = data.questions;
      $('#btn-save-test').disabled = false;
      $('#test-parse-preview').innerHTML = `
        <div style="color:green; background:#f6ffed; padding:10px; border-radius:6px;">
          ✅ ${data.totalQuestions} ta savol xatosiz tahlil qilindi! Saqlash tugmasini bosishingiz mumkin.
        </div>
      `;
    } catch (err) {
      $('#test-form-error').textContent = err.message;
    }
  });

  $('#test-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!parsedTestQuestions) return;

    try {
      const body = {
        title_uz: $('#test-title-uz').value,
        category: $('#test-category').value,
        duration_minutes: Number($('#test-duration').value) || 15,
        passing_percent: Number($('#test-passing').value) || 60,
        max_attempts: $('#test-max-att').value ? Number($('#test-max-att').value) : null,
        published: 1,
        questions: parsedTestQuestions
      };

      const res = await fetch('/api/tests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!res.ok) throw new Error("Testni saqlashda xatolik");

      alert("Test saqlandi va e'lon qilindi!");
      $('#test-form').reset();
      parsedTestQuestions = null;
      $('#btn-save-test').disabled = true;
      $('#test-parse-preview').innerHTML = '';
      loadAdminTests();
    } catch (err) {
      $('#test-form-error').textContent = err.message;
    }
  });
}

async function loadAdminTests() {
  const container = $('#tests-admin-list');
  try {
    const res = await fetch('/api/tests');
    const data = await res.json();
    const items = data.tests || [];
    container.innerHTML = items.map(t => `
      <div style="padding:10px; border-bottom:1px solid #eee; display:flex; justify-content:space-between;">
        <span><strong>${t.title_uz}</strong> (${t.question_count} savol, ${t.duration_minutes} min)</span>
        <button onclick="deleteTest(${t.id})" class="btn btn--danger btn--sm">O'chirish</button>
      </div>
    `).join('') || '<p>Testlar yo\'q</p>';
  } catch (err) {
    container.textContent = 'Xatolik';
  }
}

window.deleteTest = async function(id) {
  if (confirm("Testni o'chirishni tasdiqlaysizmi?")) {
    await fetch(`/api/tests/${id}`, { method: 'DELETE' });
    loadAdminTests();
  }
};

// ---------- Kitoblarni yuklash ----------
async function loadBooks() {
  try {
    const data = await api('/api/books');
    BOOKS = data.books || [];
    renderBooks();
  } catch (e) {
    $('#books-list').textContent = 'Yuklashda xatolik: ' + e.message;
  }
}

function renderBooks() {
  const q = ($('#search').value || '').toLowerCase().trim();
  const list = BOOKS.filter(b => {
    if (!q) return true;
    return [b.title.uz, b.title.ru, b.title.en, b.author].join(' ').toLowerCase().includes(q);
  });
  $('#count').textContent = BOOKS.length;

  if (!list.length) { $('#books-list').innerHTML = '<p style="color:var(--muted)">Kitob yo\'q</p>'; return; }

  $('#books-list').innerHTML = list.map(b => `
    <div class="book-row">
      <img class="book-row__cover" src="${b.cover || ''}" alt="" onerror="this.style.visibility='hidden'">
      <div class="book-row__info">
        <div class="book-row__title">${esc(b.title.uz)}</div>
        <div class="book-row__meta">
          <span class="tag">${CAT_NAMES[b.category] || b.category}</span>
          <span class="tag">${(b.language || '').toUpperCase()}</span>
          👤 ${esc(b.author)} · 📅 ${b.year || '—'}
        </div>
      </div>
      <div class="book-row__actions">
        <button class="btn btn--sm" onclick="editBook(${b.id})">✏️</button>
        <button class="btn btn--sm btn--danger" onclick="deleteBook(${b.id})">🗑</button>
      </div>
    </div>
  `).join('');
}

// ---------- Forma: tahrirlash ----------
function editBook(id) {
  const b = BOOKS.find(x => x.id === id);
  if (!b) return;
  $('#book-id').value = b.id;
  $('#f-title-uz').value = b.title.uz || '';
  $('#f-title-ru').value = b.title.ru || '';
  $('#f-title-en').value = b.title.en || '';
  $('#f-author').value = b.author || '';
  $('#f-year').value = b.year || '';
  $('#f-pages').value = b.pages || '';
  $('#f-category').value = b.category || 'boshqa';
  $('#f-language').value = b.language || 'uz';
  $('#f-desc-uz').value = b.description.uz || '';
  $('#f-desc-ru').value = b.description.ru || '';
  $('#f-desc-en').value = b.description.en || '';
  $('#f-pdf').value = '';
  $('#f-cover').value = '';
  $('#form-title').textContent = '✏️ Kitobni tahrirlash';
  $('#pdf-hint').textContent = '(o\'zgartirmasangiz eski fayl qoladi)';
  $('#reset-form').classList.remove('hidden');
  renderQrPreview(b.id);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function resetForm() {
  $('#book-form').reset();
  $('#book-id').value = '';
  $('#form-title').textContent = "➕ Yangi kitob qo'shish";
  $('#pdf-hint').textContent = '(majburiy)';
  $('#reset-form').classList.add('hidden');
  $('#form-error').textContent = '';
  $('#form-progress').classList.add('hidden');
  renderQrPreview(null);
}

function renderQrPreview(id) {
  const box = $('#qr-box');
  if (!id || typeof qrcode === 'undefined') {
    box.innerHTML = id ? '—' : "<span style='font-size:11px'>Saqlangach hosil bo'ladi</span>";
    return;
  }
  const link = `${location.origin}/?book=${id}`;
  const qr = qrcode(0, 'M'); qr.addData(link); qr.make();
  box.innerHTML = `<img src="${qr.createDataURL(4, 8)}" alt="QR">`;
}

// ---------- Fayl yuklash ----------
async function uploadFile(file, type) {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('type', type);
  const data = await api('/api/upload', { method: 'POST', body: fd });
  return data.key;
}

// ---------- Saqlash ----------
async function saveBook(e) {
  e.preventDefault();
  $('#form-error').textContent = '';
  const prog = $('#form-progress');
  const saveBtn = $('#save-btn');
  const id = $('#book-id').value;
  const isEdit = !!id;

  const pdfFile = $('#f-pdf').files[0];
  const coverFile = $('#f-cover').files[0];

  if (!isEdit && !pdfFile) {
    $('#form-error').textContent = 'Yangi kitob uchun PDF fayl majburiy';
    return;
  }

  saveBtn.disabled = true;
  prog.classList.remove('hidden', 'ok');

  try {
    const payload = {
      title: { uz: $('#f-title-uz').value.trim(), ru: $('#f-title-ru').value.trim(), en: $('#f-title-en').value.trim() },
      author: $('#f-author').value.trim(),
      year: $('#f-year').value ? parseInt($('#f-year').value, 10) : null,
      pages: $('#f-pages').value ? parseInt($('#f-pages').value, 10) : null,
      category: $('#f-category').value,
      language: $('#f-language').value,
      description: { uz: $('#f-desc-uz').value.trim(), ru: $('#f-desc-ru').value.trim(), en: $('#f-desc-en').value.trim() },
    };

    if (pdfFile) {
      prog.textContent = '⏳ PDF yuklanmoqda…';
      payload.file_key = await uploadFile(pdfFile, 'pdf');
    }
    if (coverFile) {
      prog.textContent = '⏳ Muqova yuklanmoqda…';
      payload.cover_key = await uploadFile(coverFile, 'cover');
    }

    prog.textContent = '⏳ Saqlanmoqda…';
    if (isEdit) {
      await api(`/api/books/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
    } else {
      await api('/api/books', { method: 'POST', body: JSON.stringify(payload) });
    }

    prog.textContent = '✅ Saqlandi';
    prog.classList.add('ok');
    resetForm();
    await loadBooks();
  } catch (err) {
    $('#form-error').textContent = err.message;
    prog.classList.add('hidden');
  } finally {
    saveBtn.disabled = false;
  }
}

// ---------- O'chirish ----------
async function deleteBook(id) {
  const b = BOOKS.find(x => x.id === id);
  if (!confirm(`"${b ? b.title.uz : id}" kitobini o'chirilsinmi?`)) return;
  try {
    await api(`/api/books/${id}`, { method: 'DELETE' });
    await loadBooks();
  } catch (e) {
    alert('Xatolik: ' + e.message);
  }
}

// ---------- Utility ----------
function esc(s) {
  const d = document.createElement('div');
  d.textContent = s || '';
  return d.innerHTML;
}

// global (onclick uchun)
window.editBook = editBook;
window.deleteBook = deleteBook;
