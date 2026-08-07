/* ============================================
   DL-library.uz — Toast bildirishnomalari
   O'ng yuqori burchakdan ingichka panel bo'lib
   chiqadi va biroz turgach qaytib kirib ketadi.
   ============================================ */

let toastRoot = null;

function ensureRoot() {
  if (toastRoot && document.body.contains(toastRoot)) return toastRoot;
  toastRoot = document.createElement('div');
  toastRoot.className = 'toast-root';
  toastRoot.setAttribute('aria-live', 'polite');
  document.body.appendChild(toastRoot);
  return toastRoot;
}

const TOAST_ICONS = {
  info: 'ℹ️',
  success: '✅',
  warning: '⚠️',
  error: '❌',
};

/**
 * Toast ko'rsatish.
 * @param {string} message - matn
 * @param {{type?: 'info'|'success'|'warning'|'error', duration?: number}} [opts]
 */
export function showToast(message, opts = {}) {
  const { type = 'info', duration = 3200 } = opts;
  const root = ensureRoot();

  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.innerHTML = `
    <span class="toast__icon">${TOAST_ICONS[type] || TOAST_ICONS.info}</span>
    <span class="toast__text"></span>
  `;
  toast.querySelector('.toast__text').textContent = message;
  root.appendChild(toast);

  // Kirish animatsiyasi (element DOM'ga o'rnashgach klass qo'shiladi)
  setTimeout(() => toast.classList.add('toast--visible'), 30);

  const hide = () => {
    toast.classList.remove('toast--visible');
    toast.addEventListener('transitionend', () => toast.remove(), { once: true });
    // transitionend kelmasa ham tozalash
    setTimeout(() => toast.remove(), 600);
  };

  const timer = setTimeout(hide, duration);
  toast.addEventListener('click', () => {
    clearTimeout(timer);
    hide();
  });
}
