/**
 * Profile Dashboard Client
 */
import { currentUser, logoutUser } from './auth.js';

export async function initProfilePage(containerEl) {
  if (!currentUser) {
    containerEl.innerHTML = `
      <div class="profile-card text-center" style="padding: 3rem;">
        <h2 style="margin-bottom: 1rem;">👤 Profil</h2>
        <p style="color: var(--text-muted); max-width: 400px; margin: 0 auto 1.5rem;">
          Profil sahifasi keyingi versiyada Google akkaunt orqali kirganingizda faollashadi.
          Hozircha barcha materiallar (kitoblar, prezentatsiyalar, videolar va testlar) profilsiz ishlatilishi mumkin.
        </p>
        <div style="padding: 1rem; background: var(--bg-hover); border-radius: 12px; display: inline-block;">
          <p style="margin: 0; font-size: 0.9rem;">🔜 Tez kunda: progress saqlash, test natijalari tarixi va Telegram ulanishi</p>
        </div>
      </div>
    `;
    return;
  }

  containerEl.innerHTML = `
    <div class="profile-header-card">
      <img src="${currentUser.avatarUrl || '/img/default-avatar.png'}" class="profile-avatar" alt="Avatar" />
      <div class="profile-info">
        <h2>${currentUser.displayName}</h2>
        <p>${currentUser.email}</p>
      </div>
      <button id="btn-logout" class="btn btn-secondary" style="margin-left: auto;">Chiqish 🚪</button>
    </div>

    <div class="profile-tabs-nav">
      <button class="tab-btn active" data-tab="summary">Umumiy ko'rinish</button>
      <button class="tab-btn" data-tab="books">Kitoblarim</button>
      <button class="tab-btn" data-tab="presentations">Prezentatsiyalarim</button>
      <button class="tab-btn" data-tab="videos">Videolarim</button>
      <button class="tab-btn" data-tab="tests">Test natijalarim</button>
      <button class="tab-btn" data-tab="telegram">Telegram ulanishi</button>
    </div>

    <div class="profile-tab-content" id="profile-tab-content">
      <div class="loading-spinner">Yuklanmoqda...</div>
    </div>
  `;

  document.getElementById('btn-logout').addEventListener('click', logoutUser);

  const tabBtns = containerEl.querySelectorAll('.tab-btn');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      loadTabContent(btn.dataset.tab);
    });
  });

  loadTabContent('summary');
}

async function loadTabContent(tabName) {
  const contentEl = document.getElementById('profile-tab-content');
  contentEl.innerHTML = '<div class="loading-spinner">Yuklanmoqda...</div>';

  try {
    if (tabName === 'summary') {
      const res = await fetch('/api/profile/summary');
      const data = await res.json();
      contentEl.innerHTML = `
        <div class="stats-grid">
          <div class="stat-card">📚 <h3>${data.stats.booksCount}</h3> <p>O'qilayotgan kitoblar</p></div>
          <div class="stat-card">📊 <h3>${data.stats.presentationsCount}</h3> <p>Ko'rilayotgan taqdimotlar</p></div>
          <div class="stat-card">🎥 <h3>${data.stats.videosCount}</h3> <p>Ko'rilgan videolar</p></div>
          <div class="stat-card">📝 <h3>${data.stats.testsCount}</h3> <p>Ishlangan testlar</p></div>
        </div>
      `;
    } else if (tabName === 'books' || tabName === 'presentations' || tabName === 'videos') {
      const singular = tabName === 'books' ? 'book' : (tabName === 'presentations' ? 'presentation' : 'video');
      const res = await fetch(`/api/profile/progress?type=${singular}`);
      const data = await res.json();

      if (!data.progress || data.progress.length === 0) {
        contentEl.innerHTML = `<p class="empty-state">Hozircha hech narsa yo'q.</p>`;
        return;
      }

      contentEl.innerHTML = `
        <div class="history-grid">
          ${data.progress.map(item => `
            <div class="history-item-card">
              <h4>${item.title_uz}</h4>
              <div class="progress-bar-bg"><div class="progress-bar-fill" style="width:${item.progress_percent}%"></div></div>
              <p>${item.progress_percent}% ko'rilgan (Oxirgi pozitsiya: ${item.position_value})</p>
            </div>
          `).join('')}
        </div>
      `;
    } else if (tabName === 'tests') {
      const res = await fetch('/api/profile/test-attempts');
      const data = await res.json();

      if (!data.attempts || data.attempts.length === 0) {
        contentEl.innerHTML = `<p class="empty-state">Hozircha ishlangan testlar yo'q.</p>`;
        return;
      }

      contentEl.innerHTML = `
        <div class="attempts-list">
          ${data.attempts.map(att => `
            <div class="attempt-item-card">
              <div class="attempt-title-row">
                <h4>${att.title_uz}</h4>
                <span class="badge ${att.passed ? 'badge-success' : 'badge-danger'}">${att.score_percent}% ${att.passed ? '✅ Passed' : '❌ Failed'}</span>
              </div>
              <p>Ball: ${att.correct_count} / ${att.total_count} | Kanal: ${att.channel === 'telegram_mini_app' ? '📱 Telegram' : '🌐 Web'}</p>
              <small>Sana: ${new Date(att.started_at).toLocaleString()}</small>
            </div>
          `).join('')}
        </div>
      `;
    } else if (tabName === 'telegram') {
      const res = await fetch('/api/profile/summary');
      const data = await res.json();

      if (data.telegramLink) {
        contentEl.innerHTML = `
          <div class="telegram-link-card">
            <h3> Telegram Akkaunti Bog'langan</h3>
            <p>Foydalanuvchi: <strong>@${data.telegramLink.telegram_username || 'Noma\'lum'}</strong> (${data.telegramLink.telegram_first_name || ''})</p>
            <p>Bog'langan vaqti: ${new Date(data.telegramLink.linked_at).toLocaleString()}</p>
            <button id="btn-unlink-tg" class="btn btn-danger">Uzish (Unlink)</button>
          </div>
        `;
        document.getElementById('btn-unlink-tg').onclick = async () => {
          if (confirm("Telegram akkauntini uzishni tasdiqlaysizmi?")) {
            await fetch('/api/telegram/link', { method: 'DELETE' });
            loadTabContent('telegram');
          }
        };
      } else {
        contentEl.innerHTML = `
          <div class="telegram-link-card">
            <h3>Telegram Akkauntini Ulash</h3>
            <p>Telegram Mini App orqali ishlangan testlar natijasi avtomatik ushbu profilga saqlanishi uchun akkauntni ulashingiz mumkin.</p>
            <button id="btn-create-tg-link" class="btn btn-primary">Ulash kodi olish 🔗</button>
            <div id="tg-link-result" style="margin-top: 15px;"></div>
          </div>
        `;

        document.getElementById('btn-create-tg-link').onclick = async () => {
          const lRes = await fetch('/api/telegram/link-token', { method: 'POST' });
          const lData = await lRes.json();
          if (lData.rawToken) {
            const deepLink = `https://t.me/dl_library_robot?start=link_${lData.rawToken}`;
            document.getElementById('tg-link-result').innerHTML = `
              <p>Tugmani bosib Telegram botga o'ting va tasdiqlang:</p>
              <a href="${deepLink}" target="_blank" class="btn btn-success">Telegram Botda Ochish 🤖</a>
            `;
          }
        };
      }
    }
  } catch (err) {
    contentEl.innerHTML = `<p class="error-msg">Yuklashda xatolik yuz berdi.</p>`;
  }
}
