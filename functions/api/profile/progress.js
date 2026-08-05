/**
 * GET /api/profile/progress?type=book|presentation|video
 */
import { getCurrentUser } from '../../_lib/user-auth.js';

export async function onRequestGet(context) {
  const { env, request } = context;
  const url = new URL(request.url);
  const type = url.searchParams.get('type') || 'book';

  const user = await getCurrentUser(env, request);
  if (!user) {
    return new Response(JSON.stringify({ error: "Avtorizatsiyadan o'tilmagan" }), { status: 401 });
  }

  try {
    let sql = '';

    if (type === 'book') {
      sql = `SELECT p.*, b.title_uz, b.author, b.cover_key, b.pages
             FROM user_progress p
             JOIN books b ON p.item_id = b.id
             WHERE p.user_id = ? AND p.item_type = 'book'
             ORDER BY p.last_opened_at DESC`;
    } else if (type === 'presentation') {
      sql = `SELECT p.*, pr.title_uz, pr.cover_key, pr.page_count as pages
             FROM user_progress p
             JOIN presentations pr ON p.item_id = pr.id
             WHERE p.user_id = ? AND p.item_type = 'presentation'
             ORDER BY p.last_opened_at DESC`;
    } else if (type === 'video') {
      sql = `SELECT p.*, v.title_uz, v.cover_key, v.youtube_video_id, v.duration_seconds
             FROM user_progress p
             JOIN videos v ON p.item_id = v.id
             WHERE p.user_id = ? AND p.item_type = 'video'
             ORDER BY p.last_opened_at DESC`;
    }

    const { results } = await env.DB.prepare(sql).bind(user.id).all();

    return new Response(JSON.stringify({ progress: results || [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
