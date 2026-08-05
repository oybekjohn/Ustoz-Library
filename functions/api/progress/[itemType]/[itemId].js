/**
 * PUT /api/progress/:itemType/:itemId
 * Save user progress (debounced from browser)
 */
import { getCurrentUser } from '../../../_lib/user-auth.js';
import { upsertUserProgress } from '../../../_lib/progress.js';

export async function onRequestPut(context) {
  const { env, params, request } = context;
  const { itemType, itemId } = params;

  const user = await getCurrentUser(env, request);

  if (!user) {
    return new Response(JSON.stringify({ saved: false, reason: 'anonymous' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const body = await request.json();
    const progressPercent = typeof body.progress_percent === 'number' ? body.progress_percent : 0;
    const positionValue = typeof body.position_value === 'number' ? body.position_value : 0;

    const result = await upsertUserProgress(env, user.id, itemType, Number(itemId), progressPercent, positionValue);

    return new Response(JSON.stringify({ saved: true, progress: result }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
