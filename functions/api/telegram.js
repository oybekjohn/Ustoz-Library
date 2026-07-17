import { error, ok } from '../_lib/http.js';
import {
  claimTelegramUpdate,
  finishTelegramUpdate,
  handleTelegramUpdate,
} from '../_lib/telegram.js';

function safeEqual(left, right) {
  if (!left || !right || left.length !== right.length) return false;
  let diff = 0;
  for (let i = 0; i < left.length; i++) diff |= left.charCodeAt(i) ^ right.charCodeAt(i);
  return diff === 0;
}

// Telegram webhook: POST /api/telegram
export async function onRequestPost({ request, env, waitUntil }) {
  if (!env.TELEGRAM_WEBHOOK_SECRET) return error('Telegram webhook sozlanmagan', 503);
  const secret = request.headers.get('X-Telegram-Bot-Api-Secret-Token') || '';
  if (!safeEqual(secret, env.TELEGRAM_WEBHOOK_SECRET)) return error('Ruxsat berilmadi', 403);

  let update;
  try {
    update = await request.json();
  } catch {
    return error("Noto'g'ri Telegram update", 400);
  }
  if (!Number.isSafeInteger(update?.update_id)) return error("update_id yo'q", 400);

  const claimed = await claimTelegramUpdate(env, update.update_id);
  if (!claimed) return ok({ duplicate: true });

  try {
    const result = await handleTelegramUpdate(env, update);
    if (result.background) {
      waitUntil((async () => {
        try {
          await result.background();
          await finishTelegramUpdate(env, update.update_id, 'completed');
        } catch (backgroundError) {
          await finishTelegramUpdate(env, update.update_id, 'failed', String(backgroundError?.message || backgroundError).slice(0, 1000));
        }
      })());
    } else {
      await finishTelegramUpdate(env, update.update_id, 'completed');
    }
  } catch (handlerError) {
    await finishTelegramUpdate(env, update.update_id, 'failed', String(handlerError?.message || handlerError).slice(0, 1000));
  }

  return ok();
}
