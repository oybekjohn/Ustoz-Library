/**
 * /api/videos/:id
 * GET (ommaviy), PUT/DELETE (faqat admin)
 */
import { extractYouTubeId } from '../../_lib/youtube.js';
import { requireAuth } from '../../_lib/auth.js';

export async function onRequestGet(context) {
  const { env, params } = context;
  const id = params.id;

  try {
    const item = await env.DB.prepare(`SELECT * FROM videos WHERE id = ?`).bind(id).first();
    if (!item) {
      return new Response(JSON.stringify({ error: "Video topilmadi" }), { status: 404 });
    }
    return new Response(JSON.stringify(item), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    console.error('API xatosi:', err?.message || err);
    return new Response(JSON.stringify({ error: 'Server xatosi' }), { status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' } });
  }
}

export async function onRequestPut(context) {
  const { env, params, request } = context;
  const id = params.id;

  const session = await requireAuth(request, env);
  if (!session) {
    return new Response(JSON.stringify({ error: 'Avtorizatsiya talab qilinadi' }), { status: 401 });
  }

  try {
    const body = await request.json();
    const videoId = extractYouTubeId(body.youtube_url);
    if (!videoId) {
      return new Response(JSON.stringify({ error: "YouTube URL yaroqli emas" }), { status: 400 });
    }

    const now = new Date().toISOString();
    await env.DB.prepare(
      `UPDATE videos
       SET title_uz = ?, title_ru = ?, title_en = ?,
           description_uz = ?, description_ru = ?, description_en = ?,
           category = ?, language = ?, youtube_url = ?, youtube_video_id = ?,
           cover_key = ?, duration_seconds = ?, published = ?, updated_at = ?
       WHERE id = ?`
    ).bind(
      body.title_uz, body.title_ru || null, body.title_en || null,
      body.description_uz || null, body.description_ru || null, body.description_en || null,
      body.category, body.language || 'uz', body.youtube_url, videoId,
      body.cover_key || null, body.duration_seconds || null, body.published ? 1 : 0, now, id
    ).run();

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err) {
    console.error('API xatosi:', err?.message || err);
    return new Response(JSON.stringify({ error: 'Server xatosi' }), { status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' } });
  }
}

export async function onRequestDelete(context) {
  const { env, params, request } = context;
  const id = params.id;

  const session = await requireAuth(request, env);
  if (!session) {
    return new Response(JSON.stringify({ error: 'Avtorizatsiya talab qilinadi' }), { status: 401 });
  }

  try {
    const item = await env.DB.prepare(`SELECT cover_key FROM videos WHERE id = ?`).bind(id).first();
    if (!item) {
      return new Response(JSON.stringify({ error: "Video topilmadi" }), { status: 404 });
    }

    await env.DB.prepare(`DELETE FROM videos WHERE id = ?`).bind(id).run();

    if (env.BUCKET && item.cover_key) {
      await env.BUCKET.delete(item.cover_key).catch(() => {});
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err) {
    console.error('API xatosi:', err?.message || err);
    return new Response(JSON.stringify({ error: 'Server xatosi' }), { status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' } });
  }
}
