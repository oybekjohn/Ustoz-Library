/**
 * POST /api/tests/parse
 * TXT faylni import preview uchun tahlil qiladi (faqat admin)
 */
import { parseTestTxt } from '../../_lib/test-parser.js';
import { requireAuth } from '../../_lib/auth.js';

export async function onRequestPost(context) {
  const { request, env } = context;

  const session = await requireAuth(request, env);
  if (!session) {
    return new Response(JSON.stringify({ error: 'Avtorizatsiya talab qilinadi' }), { status: 401 });
  }

  try {
    const contentType = request.headers.get('Content-Type') || '';
    let textContent = '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file');
      if (!file || typeof file === 'string') {
        return new Response(JSON.stringify({ errors: [{ message: "TXT fayl tanlanmagan" }] }), { status: 400 });
      }
      textContent = await file.text();
    } else {
      textContent = await request.text();
    }

    if (!textContent || !textContent.trim()) {
      return new Response(JSON.stringify({ errors: [{ message: "Fayl matni bo'sh" }] }), { status: 400 });
    }

    const result = parseTestTxt(textContent);
    if (!result.success) {
      return new Response(JSON.stringify({ success: false, errors: result.errors }), { status: 400 });
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.error('API xatosi:', err?.message || err);
    return new Response(JSON.stringify({ error: 'Server xatosi' }), { status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' } });
  }
}
