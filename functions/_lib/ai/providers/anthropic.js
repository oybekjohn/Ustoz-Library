import {
  arrayBufferToBase64,
  buildMetadataPrompt,
  normalizeMetadata,
  parseJsonText,
  readJsonResponse,
} from '../common.js';

export async function analyzeWithAnthropic({ env, pdfBuffer, fileName, categoryName }) {
  if (!env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY sozlanmagan");
  const model = env.ANTHROPIC_METADATA_MODEL;
  if (!model) throw new Error("ANTHROPIC_METADATA_MODEL sozlanmagan");

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      max_tokens: 2500,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'document',
            source: {
              type: 'base64',
              media_type: 'application/pdf',
              data: arrayBufferToBase64(pdfBuffer),
            },
          },
          {
            type: 'text',
            text: `${buildMetadataPrompt(categoryName)}\nJSON markdown blokisiz qaytarilsin.`,
          },
        ],
      }],
    }),
  });

  const payload = await readJsonResponse(response, 'Anthropic');
  const text = payload?.content?.find((item) => item.type === 'text')?.text;
  if (!text) throw new Error("Anthropic matnli natija qaytarmadi");
  return normalizeMetadata(parseJsonText(text), fileName);
}
