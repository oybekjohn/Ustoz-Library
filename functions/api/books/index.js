import { ok, error, rowToBook } from '../../_lib/http.js';
import { requireAuth } from '../../_lib/auth.js';
import { createBook, validateBook } from '../../_lib/books.js';

// GET /api/books — faol (arxivlanmagan) kitoblar (ommaviy)
export async function onRequestGet({ env }) {
  let results;
  try {
    ({ results } = await env.DB
      .prepare('SELECT * FROM books WHERE archived = 0 ORDER BY created_at DESC, id DESC')
      .all());
  } catch {
    // 0008 migratsiyasi hali ishga tushmagan bo'lsa (archived ustuni yo'q)
    ({ results } = await env.DB
      .prepare('SELECT * FROM books ORDER BY created_at DESC, id DESC')
      .all());
  }
  return ok({ books: (results || []).map(rowToBook) });
}

// POST /api/books — yangi kitob (faqat admin)
export async function onRequestPost({ request, env }) {
  const session = await requireAuth(request, env);
  if (!session) return error('Avtorizatsiya talab qilinadi', 401);

  let b;
  try {
    b = await request.json();
  } catch {
    return error("Noto'g'ri so'rov", 400);
  }

  const v = validateBook(b);
  if (v) return error(v, 422);

  return ok({ book: await createBook(env, b) });
}
