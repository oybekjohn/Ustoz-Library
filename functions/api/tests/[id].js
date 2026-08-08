/**
 * /api/tests/:id
 * GET: Test detail (public)
 * PUT: Update test metadata (admin)
 * DELETE: Delete test and all questions (admin)
 * POST /api/tests/:id/publish - toggle publish (admin)
 */
import { requireAuth } from '../../_lib/auth.js';

export async function onRequestGet(context) {
  const { env, params } = context;
  const id = params.id;

  try {
    const test = await env.DB.prepare(
      `SELECT t.*, (SELECT COUNT(*) FROM test_questions q WHERE q.test_id = t.id) as question_count
       FROM tests t WHERE t.id = ?`
    ).bind(id).first();

    if (!test) {
      return new Response(JSON.stringify({ error: 'Test topilmadi' }), { status: 404 });
    }

    return new Response(JSON.stringify(test), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.error('API xatosi:', err?.message || err);
    return new Response(JSON.stringify({ error: 'Server xatosi' }), { status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' } });
  }
}

export async function onRequestPut(context) {
  const { env, params, request } = context;
  const session = await requireAuth(request, env);
  if (!session) {
    return new Response(JSON.stringify({ error: 'Avtorizatsiya talab qilinadi' }), { status: 401 });
  }

  const id = params.id;

  try {
    const body = await request.json();
    const now = new Date().toISOString();

    await env.DB.prepare(
      `UPDATE tests
       SET title_uz = ?, title_ru = ?, title_en = ?,
           description_uz = ?, description_ru = ?, description_en = ?,
           category = ?, language = ?,
           duration_minutes = ?, passing_percent = ?, max_attempts = ?,
           shuffle_questions = ?, shuffle_options = ?,
           violation_limit = ?, show_answers_after_finish = ?,
           published = ?, updated_at = ?
       WHERE id = ?`
    ).bind(
      body.title_uz, body.title_ru || null, body.title_en || null,
      body.description_uz || null, body.description_ru || null, body.description_en || null,
      body.category, body.language || 'uz',
      body.duration_minutes || 15, body.passing_percent || 60, body.max_attempts || null,
      body.shuffle_questions !== false ? 1 : 0,
      body.shuffle_options !== false ? 1 : 0,
      body.violation_limit || 3,
      body.show_answers_after_finish !== false ? 1 : 0,
      body.published ? 1 : 0,
      now, id
    ).run();

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err) {
    console.error('API xatosi:', err?.message || err);
    return new Response(JSON.stringify({ error: 'Server xatosi' }), { status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' } });
  }
}

export async function onRequestDelete(context) {
  const { env, params, request } = context;
  const session = await requireAuth(request, env);
  if (!session) {
    return new Response(JSON.stringify({ error: 'Avtorizatsiya talab qilinadi' }), { status: 401 });
  }

  const id = params.id;

  try {
    const test = await env.DB.prepare(`SELECT id FROM tests WHERE id = ?`).bind(id).first();
    if (!test) {
      return new Response(JSON.stringify({ error: 'Test topilmadi' }), { status: 404 });
    }

    // Cascade delete — test_questions va test_options ham o'chadi (FOREIGN KEY ON DELETE CASCADE)
    await env.DB.prepare(`DELETE FROM tests WHERE id = ?`).bind(id).run();

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err) {
    console.error('API xatosi:', err?.message || err);
    return new Response(JSON.stringify({ error: 'Server xatosi' }), { status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' } });
  }
}
