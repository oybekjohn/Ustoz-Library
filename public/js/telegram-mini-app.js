/* ============================================
   DL-library.uz — Telegram Mini App moslashuvi
   Sayt Telegram WebApp ichida ochilsa, uni to'liq
   ekranga kengaytiradi. Sessiya bog'lash keyingi
   relizda (Google profil bilan birga) qo'shiladi.
   ============================================ */

export function initTelegramMiniApp() {
  const tg = window.Telegram?.WebApp;
  if (!tg) return false;

  tg.ready();
  tg.expand();
  document.body.classList.add('telegram-mini-app-mode');
  return true;
}
