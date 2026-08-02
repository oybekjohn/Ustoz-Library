const MAX_EXTRACTED_TEXT_CHARS = 8000;

function compactText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function toUint8Array(value) {
  if (value instanceof Uint8Array) return value.slice();
  return new Uint8Array(value).slice();
}

function ensureMathSumPrecise() {
  if (typeof Math.sumPrecise === 'function') return;
  Object.defineProperty(Math, 'sumPrecise', {
    configurable: true,
    value(values) {
      let sum = 0;
      let correction = 0;
      for (const value of values) {
        const adjusted = Number(value) - correction;
        const next = sum + adjusted;
        correction = (next - sum) - adjusted;
        sum = next;
      }
      return sum;
    },
  });
}

async function inspectTextLayer(pdfBuffer, maxPages, parserLoader) {
  ensureMathSumPrecise();
  const { getDocumentProxy } = await parserLoader();
  let document;

  try {
    document = await getDocumentProxy(toUint8Array(pdfBuffer), {
      disableFontFace: true,
      isEvalSupported: false,
      useWorkerFetch: false,
    });

    const pageCount = document.numPages || null;
    const pagesToRead = Math.min(Math.max(1, maxPages), pageCount || maxPages);
    const chunks = [];

    for (let pageNumber = 1; pageNumber <= pagesToRead; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      const text = compactText(
        content.items
          .filter((item) => typeof item.str === 'string')
          .map((item) => item.str)
          .join(' '),
      );
      if (text) chunks.push(`--- ${pageNumber}-sahifa ---\n${text}`);
    }

    return {
      pageCount,
      firstPagesText: chunks.join('\n\n').slice(0, MAX_EXTRACTED_TEXT_CHARS),
    };
  } finally {
    await document?.loadingTask?.destroy?.();
  }
}

async function pageCountWithPdfLib(pdfBuffer) {
  const { PDFDocument } = await import('pdf-lib');
  const document = await PDFDocument.load(pdfBuffer, {
    ignoreEncryption: true,
    updateMetadata: false,
  });
  return document.getPageCount();
}

export async function inspectPdfFirstPages(pdfBuffer, maxPages = 2, options = {}) {
  const parserLoader = options.parserLoader || (() => import('unpdf'));
  try {
    return await inspectTextLayer(pdfBuffer, maxPages, parserLoader);
  } catch (parserError) {
    try {
      const pageCount = await pageCountWithPdfLib(pdfBuffer);
      console.warn(JSON.stringify({
        event: 'pdf_text_parser_fallback',
        error: parserError?.message || String(parserError),
        pageCount,
      }));
      return { pageCount, firstPagesText: '' };
    } catch (fallbackError) {
      throw new Error(
        `PDF parser xatosi: ${parserError?.message || 'noma’lum xatolik'}; `
        + `sahifa soni ham olinmadi: ${fallbackError?.message || 'noma’lum xatolik'}`,
        { cause: fallbackError },
      );
    }
  }
}

export async function createFirstPagesPdf(pdfBuffer, maxPages = 2) {
  const { PDFDocument } = await import('pdf-lib');
  const source = await PDFDocument.load(pdfBuffer, {
    ignoreEncryption: true,
    updateMetadata: false,
  });
  const pageIndexes = Array.from(
    { length: Math.min(Math.max(1, maxPages), source.getPageCount()) },
    (_, index) => index,
  );
  const target = await PDFDocument.create();
  const pages = await target.copyPages(source, pageIndexes);
  for (const page of pages) target.addPage(page);
  const bytes = await target.save({
    addDefaultPage: false,
    useObjectStreams: false,
    updateFieldAppearances: false,
  });
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}
