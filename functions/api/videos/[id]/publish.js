/**
 * POST /api/videos/:id/publish
 * Toggle publish/unpublish a video (admin only)
 */
import { requireAuth } from '../../../_lib/auth.js';

export async function onRequestPost(context) {
  const { env, params, request } = context;
  const session = await requireAuth(request, env);
  if (!session) {
    return new Response(JSON.stringify({ error: 'Avtorizatsiya talab qilinadi' }), { status: 401 });
  }

  const id = params.id;

  try {
    const item = await env.DB.prepare(
      `SELECT id, published FROM videos WHERE id = ?`
    ).bind(id).first();

    if (!item) {
      return new Response(JSON.stringify({ error: 'Video topilmadi' }), { status: 404 });
    }

    const newPublished = item.published ? 0 : 1;
    const now = new Date().toISOString();
    await env.DB.prepare(
      `UPDATE videos SET published = ?, updated_at = ? WHERE id = ?`
    ).bind(newPublished, now, id).run();

    return new Response(JSON.stringify({
      success: true,
      published: newPublished === 1,
      message: newPublished === 1 ? "Video nashr qilindi" : "Video yashirildi"
    }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
