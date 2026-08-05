/**
 * Telegram Mini App Shell Adapter
 */
import { initTestRunner } from './test-runner.js';

export async function initTelegramMiniApp() {
  const tg = window.Telegram?.WebApp;
  if (!tg) return false;

  tg.ready();
  tg.expand();

  document.body.classList.add('telegram-mini-app-mode');

  const initData = tg.initData;
  if (!initData) return false;

  try {
    const res = await fetch('/api/telegram/webapp/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initData })
    });

    if (res.ok) {
      const data = await res.json();
      console.log('Telegram WebApp Session active:', data);
    }
  } catch (err) {
    console.error('Telegram WebApp auth error:', err);
  }

  // Telegram BackButton event
  tg.BackButton.show();
  tg.BackButton.onClick(() => {
    if (confirm("Mini Appdan chiqishni tasdiqlaysizmi?")) {
      tg.close();
    }
  });

  return true;
}
