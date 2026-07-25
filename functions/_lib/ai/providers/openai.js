import {
  BOOK_METADATA_SCHEMA,
  arrayBufferToBase64,
  buildMetadataPrompt,
  normalizeMetadata,
  parseJsonText,
  readJsonResponse,
} from '../common.js';

function outputText(response) {
  for (const item of response.output || []) {
    for (const content of item.content || []) {
      if (content.type === 'output_text' && content.text) return content.text;
    }
  }
  throw new Error("OpenAI matnli natija qaytarmadi");
}

export async function analyzeWithOpenAI({
  env,
  pdfBuffer,
  firstPagesPdfBuffer,
  firstPagesText,
  fileName,
  categoryName,
  pageCount,
}) {
  if (!env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY sozlanmagan");
  const model = env.OPENAI_METADATA_MODEL;
  if (!model) throw new Error("OPENAI_METADATA_MODEL sozlanmagan");

  const hasTextLayer = Boolean(firstPagesText?.trim());
  const content = [{
    type: 'input_text',
    text: [
      buildMetadataPrompt(categoryName, {
        pageCount,
        sourceMode: hasTextLayer ? 'first_pages_text' : 'pdf_file',
      }),
      hasTextLayer ? `\nPDF 1-2 sahifa matni:\n${firstPagesText}` : '',
    ].join('\n'),
  }];
  if (!hasTextLayer) {
    content.push({
      type: 'input_file',
      filename: fileName,
      file_data: `data:application/pdf;base64,${arrayBufferToBase64(firstPagesPdfBuffer || pdfBuffer)}`,
    });
  }

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      input: [{
        role: 'user',
        content,
      }],
      text: {
        format: {
          type: 'json_schema',
          name: 'book_metadata',
          strict: true,
          schema: BOOK_METADATA_SCHEMA,
        },
      },
    }),
  });

  const payload = await readJsonResponse(response, 'OpenAI');
  return normalizeMetadata(parseJsonText(outputText(payload)), fileName);
}
