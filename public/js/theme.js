/**
 * Theme & Language Persistence Manager
 */

(function () {
  const savedTheme = localStorage.getItem('dl_theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
})();

export function initThemeToggle() {
  const toggleBtn = document.getElementById('theme-toggle-btn');
  if (!toggleBtn) return;

  const updateIcon = (theme) => {
    toggleBtn.innerHTML = theme === 'dark' ? '☀️' : '🌙';
    toggleBtn.setAttribute('title', theme === 'dark' ? 'Yorug\' rejim' : 'Tungi rejim');
  };

  const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
  updateIcon(currentTheme);

  toggleBtn.addEventListener('click', () => {
    const active = document.documentElement.getAttribute('data-theme') || 'light';
    const next = active === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('dl_theme', next);
    updateIcon(next);
  });
}
