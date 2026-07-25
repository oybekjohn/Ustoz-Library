import {
  BOOK_METADATA_SCHEMA,
  arrayBufferToBase64,
  buildMetadataPrompt,
  normalizeMetadata,
  parseJsonText,
  readJsonResponse,
} from '../common.js';

export async function analyzeWithGemini({
  env,
  pdfBuffer,
  firstPagesPdfBuffer,
  firstPagesText,
  fileName,
  categoryName,
  pageCount,
}) {
  if (!env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY sozlanmagan");
  const model = env.GEMINI_METADATA_MODEL;
  if (!model) throw new Error("GEMINI_METADATA_MODEL sozlanmagan");

  const hasTextLayer = Boolean(firstPagesText?.trim());
  const parts = [{
    text: [
      buildMetadataPrompt(categoryName, {
        pageCount,
        sourceMode: hasTextLayer ? 'first_pages_text' : 'pdf_file',
      }),
      hasTextLayer ? `\nPDF 1-2 sahifa matni:\n${firstPagesText}` : '',
    ].join('\n'),
  }];
  if (!hasTextLayer) {
    parts.push({
      inlineData: {
        mimeType: 'application/pdf',
        data: arrayBufferToBase64(firstPagesPdfBuffer || pdfBuffer),
      },
    });
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'x-goog-api-key': env.GEMINI_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{
        parts,
      }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseJsonSchema: BOOK_METADATA_SCHEMA,
      },
    }),
  });

  const payload = await readJsonResponse(response, 'Gemini');
  const text = payload?.candidates?.[0]?.content?.parts?.find((part) => part.text)?.text;
  if (!text) throw new Error("Gemini matnli natija qaytarmadi");
  return normalizeMetadata(parseJsonText(text), fileName);
}
