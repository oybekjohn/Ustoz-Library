import {
  arrayBufferToBase64,
  buildMetadataPrompt,
  normalizeMetadata,
  parseJsonText,
  readJsonResponse,
} from '../common.js';
import { resolveAnthropicModel } from '../text-json.js';

export async function analyzeWithAnthropic({
  env,
  pdfBuffer,
  firstPagesPdfBuffer,
  firstPagesText,
  fileName,
  categoryName,
  pageCount,
}) {
  if (!env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY sozlanmagan");
  const model = resolveAnthropicModel(env);
  const hasTextLayer = Boolean(firstPagesText?.trim());
  const content = [];

  if (!hasTextLayer) {
    const sourcePdf = firstPagesPdfBuffer || pdfBuffer;
    content.push({
      type: 'document',
      source: {
        type: 'base64',
        media_type: 'application/pdf',
        data: arrayBufferToBase64(sourcePdf),
      },
    });
  }

  content.push({
    type: 'text',
    text: [
      buildMetadataPrompt(categoryName, {
        pageCount,
        sourceMode: hasTextLayer ? 'first_pages_text' : 'pdf_file',
      }),
      hasTextLayer
        ? `\nPDF 1-2 sahifa matni:\n${firstPagesText}`
        : '\nPDF matn layeri topilmadi. Yuborilgan 1-2 sahifani vizual tahlil qiling.',
      '\nJSON markdown blokisiz qaytarilsin.',
    ].join('\n'),
  });

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      max_tokens: 1400,
      temperature: 0.2,
      messages: [{
        role: 'user',
        content,
      }],
    }),
  });

  const payload = await readJsonResponse(response, 'Anthropic');
  const text = payload?.content?.find((item) => item.type === 'text')?.text;
  if (!text) throw new Error("Anthropic matnli natija qaytarmadi");
  return normalizeMetadata(parseJsonText(text), fileName);
}
