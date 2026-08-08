import {
  arrayBufferToBase64,
  buildMetadataPrompt,
  normalizeMetadata,
  parseJsonText,
  readJsonResponse,
} from '../common.js';
import { resolveOpenRouterModel } from '../text-json.js';

function outputText(payload) {
  const text = payload?.choices?.[0]?.message?.content;
  if (typeof text === 'string' && text.trim()) return text;
  throw new Error("OpenRouter matnli natija qaytarmadi");
}

export async function analyzeWithOpenRouter({
  env,
  pdfBuffer,
  firstPagesPdfBuffer,
  fileName,
  categoryName,
  pageCount,
  firstPagesText,
}) {
  if (!env.OPENROUTER_API_KEY) throw new Error("OPENROUTER_API_KEY sozlanmagan");
  const model = resolveOpenRouterModel(env);
  const hasTextLayer = Boolean(firstPagesText?.trim());

  const content = [{
    type: 'text',
    text: [
      buildMetadataPrompt(categoryName, {
        pageCount,
        sourceMode: hasTextLayer ? 'first_pages_text' : 'pdf_file',
      }),
      hasTextLayer
        ? `\nPDF 1-2 sahifa matni:\n${firstPagesText}`
        : '\nPDF matn layeri topilmadi. Faqat titul/muqova sahifalaridan kitob nomi, muallif va yilni aniqlang.',
    ].join('\n'),
  }];

  if (!hasTextLayer) {
    content.push({
      type: 'file',
      file: {
        filename: fileName,
        file_data: `data:application/pdf;base64,${arrayBufferToBase64(firstPagesPdfBuffer || pdfBuffer)}`,
      },
    });
  }

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': env.PUBLIC_SITE_URL || 'https://ustoz-library.pages.dev',
      'X-OpenRouter-Title': env.OPENROUTER_SITE_TITLE || 'DL Library Robot',
      'X-OpenRouter-Metadata': 'enabled',
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content }],
      plugins: [
        { id: 'response-healing' },
        { id: 'file-parser', pdf: { engine: 'cloudflare-ai' } },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
      max_tokens: 1400,
    }),
  });

  const payload = await readJsonResponse(response, 'OpenRouter');
  return normalizeMetadata(parseJsonText(outputText(payload)), fileName);
}
