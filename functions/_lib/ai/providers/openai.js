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

export async function analyzeWithOpenAI({ env, pdfBuffer, fileName, categoryName, pageCount }) {
  if (!env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY sozlanmagan");
  const model = env.OPENAI_METADATA_MODEL;
  if (!model) throw new Error("OPENAI_METADATA_MODEL sozlanmagan");

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
        content: [
          { type: 'input_text', text: buildMetadataPrompt(categoryName, { pageCount }) },
          {
            type: 'input_file',
            filename: fileName,
            file_data: `data:application/pdf;base64,${arrayBufferToBase64(pdfBuffer)}`,
          },
        ],
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
