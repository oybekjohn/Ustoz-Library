/**
 * /api/presentations/:id
 * GET (ommaviy), PUT/DELETE (faqat admin)
 */
import { requireAuth } from '../../_lib/auth.js';

export async function onRequestGet(context) {
  const { env, params } = context;
  const id = params.id;

  try {
    const item = await env.DB.prepare(`SELECT * FROM presentations WHERE id = ?`).bind(id).first();
    if (!item) {
      return new Response(JSON.stringify({ error: "Prezentatsiya topilmadi" }), { status: 404 });
    }
    return new Response(JSON.stringify(item), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
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
    const now = new Date().toISOString();

    await env.DB.prepare(
      `UPDATE presentations
       SET title_uz = ?, title_ru = ?, title_en = ?,
           description_uz = ?, description_ru = ?, description_en = ?,
           category = ?, language = ?, page_count = ?, pdf_key = ?, cover_key = ?, published = ?, updated_at = ?
       WHERE id = ?`
    ).bind(
      body.title_uz, body.title_ru || null, body.title_en || null,
      body.description_uz || null, body.description_ru || null, body.description_en || null,
      body.category, body.language || 'uz', body.page_count, body.pdf_key, body.cover_key || null,
      body.published ? 1 : 0, now, id
    ).run();

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
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
    const item = await env.DB.prepare(`SELECT pdf_key, cover_key FROM presentations WHERE id = ?`).bind(id).first();
    if (!item) {
      return new Response(JSON.stringify({ error: "Prezentatsiya topilmadi" }), { status: 404 });
    }

    // DB record o'chirish
    await env.DB.prepare(`DELETE FROM presentations WHERE id = ?`).bind(id).run();

    // R2 obyektlarini tozalash (agar R2 mavjud bo'lsa)
    if (env.BUCKET) {
      if (item.pdf_key) await env.BUCKET.delete(item.pdf_key).catch(() => {});
      if (item.cover_key) await env.BUCKET.delete(item.cover_key).catch(() => {});
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
