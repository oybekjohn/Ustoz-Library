/**
 * POST /api/tests/parse
 * Parses TXT file for test import preview
 */
import { parseTestTxt } from '../../_lib/test-parser.js';

export async function onRequestPost(context) {
  const { request } = context;

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
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
