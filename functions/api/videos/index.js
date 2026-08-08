/**
 * /api/videos
 * GET: List published videos
 * POST: Create new video (Admin)
 */

import { requireAuth } from '../../_lib/auth.js';
import { validateVideoInput } from '../../_lib/videos.js';

export async function onRequestGet(context) {
  const { env, request } = context;
  const url = new URL(request.url);
  const category = url.searchParams.get('category');
  const language = url.searchParams.get('language');
  const all = url.searchParams.get('all') === '1';

  // Admin so'rovida autentifikatsiya talab qilinadi
  if (all) {
    const session = await requireAuth(request, env);
    if (!session) {
      return new Response(JSON.stringify({ error: 'Avtorizatsiya talab qilinadi' }), { status: 401 });
    }
  }

  let sql = `SELECT * FROM videos WHERE 1 = 1`;
  const params = [];

  if (!all) sql += ` AND published = 1`;
  if (category) {
    sql += ` AND category = ?`;
    params.push(category);
  }
  if (language) {
    sql += ` AND language = ?`;
    params.push(language);
  }

  sql += ` ORDER BY created_at DESC`;

  try {
    const { results } = await env.DB.prepare(sql).bind(...params).all();
    return new Response(JSON.stringify({ videos: results || [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.error('API xatosi:', err?.message || err);
    return new Response(JSON.stringify({ error: 'Server xatosi' }), { status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' } });
  }
}

export async function onRequestPost(context) {
  const { env, request } = context;
  const session = await requireAuth(request, env);
  if (!session) {
    return new Response(JSON.stringify({ error: 'Avtorizatsiya talab qilinadi' }), { status: 401 });
  }

  try {
    const body = await request.json();
    const validation = validateVideoInput(body);
    if (!validation.valid) {
      return new Response(JSON.stringify({ errors: validation.errors }), { status: 400 });
    }

    const now = new Date().toISOString();
    const res = await env.DB.prepare(
      `INSERT INTO videos
       (title_uz, title_ru, title_en, description_uz, description_ru, description_en, category, language, youtube_url, youtube_video_id, cover_key, duration_seconds, published, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      body.title_uz.trim(),
      body.title_ru ? body.title_ru.trim() : null,
      body.title_en ? body.title_en.trim() : null,
      body.description_uz ? body.description_uz.trim() : null,
      body.description_ru ? body.description_ru.trim() : null,
      body.description_en ? body.description_en.trim() : null,
      body.category,
      body.language || 'uz',
      body.youtube_url.trim(),
      validation.youtubeVideoId,
      body.cover_key || null,
      body.duration_seconds || null,
      body.published ? 1 : 0,
      now,
      now
    ).run();

    return new Response(JSON.stringify({ success: true, id: res.meta.last_row_id }), { status: 201 });
  } catch (err) {
    console.error('API xatosi:', err?.message || err);
    return new Response(JSON.stringify({ error: 'Server xatosi' }), { status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' } });
  }
}

