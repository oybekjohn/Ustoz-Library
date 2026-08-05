/**
 * User Progress Tracking Helper
 */

export async function upsertUserProgress(env, userId, itemType, itemId, progressPercent, positionValue) {
  if (!userId || !itemType || !itemId) return null;

  const validTypes = ['book', 'presentation', 'video'];
  if (!validTypes.includes(itemType)) return null;

  const clampedProgress = Math.max(0, Math.min(100, Math.round(progressPercent * 100) / 100));
  const isCompleted = clampedProgress >= 80 ? 1 : 0;
  const now = new Date().toISOString();

  // Progress kamaymasligi kerak, lekin oxirgi pozitsiya va vaqt yangilanadi
  const existing = await env.DB.prepare(
    `SELECT progress_percent, completed FROM user_progress
     WHERE user_id = ? AND item_type = ? AND item_id = ?`
  ).bind(userId, itemType, itemId).first();

  let finalProgress = clampedProgress;
  let finalCompleted = isCompleted;

  if (existing) {
    finalProgress = Math.max(existing.progress_percent, clampedProgress);
    finalCompleted = existing.completed || isCompleted;

    await env.DB.prepare(
      `UPDATE user_progress
       SET progress_percent = ?, position_value = ?, completed = ?, last_opened_at = ?,
           completed_at = CASE WHEN ? = 1 AND completed_at IS NULL THEN ? ELSE completed_at END
       WHERE user_id = ? AND item_type = ? AND item_id = ?`
    ).bind(finalProgress, positionValue, finalCompleted, now, finalCompleted, now, userId, itemType, itemId).run();
  } else {
    await env.DB.prepare(
      `INSERT INTO user_progress
       (user_id, item_type, item_id, progress_percent, position_value, completed, started_at, last_opened_at, completed_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(userId, itemType, itemId, finalProgress, positionValue, finalCompleted, now, now, finalCompleted ? now : null).run();
  }

  return {
    userId,
    itemType,
    itemId,
    progressPercent: finalProgress,
    positionValue,
    completed: Boolean(finalCompleted)
  };
}
