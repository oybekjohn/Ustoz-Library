/**
 * POST /api/tests/:id/publish
 * Toggle publish/unpublish a test (admin only)
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
    const test = await env.DB.prepare(
      `SELECT id, published FROM tests WHERE id = ?`
    ).bind(id).first();

    if (!test) {
      return new Response(JSON.stringify({ error: 'Test topilmadi' }), { status: 404 });
    }

    // Publish qilishdan oldin kamida 1 ta savol borligini tekshir
    if (!test.published) {
      const qCount = await env.DB.prepare(
        `SELECT COUNT(*) as cnt FROM test_questions WHERE test_id = ?`
      ).bind(id).first();

      if (!qCount || qCount.cnt === 0) {
        return new Response(JSON.stringify({ error: "Publish qilish uchun kamida 1 ta savol kerak" }), { status: 400 });
      }
    }

    const newPublished = test.published ? 0 : 1;
    const now = new Date().toISOString();

    await env.DB.prepare(
      `UPDATE tests SET published = ?, updated_at = ? WHERE id = ?`
    ).bind(newPublished, now, id).run();

    return new Response(JSON.stringify({
      success: true,
      published: newPublished === 1,
      message: newPublished === 1 ? "Test nashr qilindi" : "Test yashirildi"
    }), { status: 200 });
  } catch (err) {
    console.error('API xatosi:', err?.message || err);
    return new Response(JSON.stringify({ error: 'Server xatosi' }), { status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' } });
  }
}
