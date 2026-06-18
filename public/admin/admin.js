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

  $('#book-form').addEventListener('submit', saveBook);
  $('#reset-form').addEventListener('click', resetForm);
  $('#search').addEventListener('input', renderBooks);
}

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
