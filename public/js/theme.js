/* ============================================================
   DL-library.uz — Yorug'/tungi rejim (tema)

   Foydalanuvchi tanlagan rejim localStorage'da saqlanadi va
   sahifa ochilishi bilan darhol qo'llanadi.
   ============================================================ */

// Sahifa chizilishidan OLDIN temani qo'yamiz — aks holda oq ekran
// bir lahzaga "miltillab" ketadi (flash of wrong theme).
(function () {
  const savedTheme = localStorage.getItem('dl_theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
})();

/** Header'dagi tema almashtirish tugmasini ishga tushiradi. */
export function initThemeToggle() {
  const toggleBtn = document.getElementById('theme-toggle-btn');
  if (!toggleBtn) return;

  // Tugma ikonkasi va skrinrider uchun matnni yangilaydi
  const updateIcon = (theme) => {
    const isDark = theme === 'dark';
    toggleBtn.textContent = isDark ? '☀️' : '🌙';
    toggleBtn.setAttribute(
      'aria-label',
      isDark ? "Yorug' rejimga o'tish" : "Tungi rejimga o'tish",
    );
  };

  updateIcon(document.documentElement.getAttribute('data-theme') || 'light');

  toggleBtn.addEventListener('click', () => {
    const active = document.documentElement.getAttribute('data-theme') || 'light';
    const next = active === 'dark' ? 'light' : 'dark';

    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('dl_theme', next);
    updateIcon(next);
  });
}
