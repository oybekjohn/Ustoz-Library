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

export async function inspectPdfFirstPages(pdfBuffer, maxPages = 2) {
  ensureMathSumPrecise();
  const { getDocumentProxy } = await import('unpdf');
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
  } catch (error) {
    throw new Error(`PDF parser xatosi: ${error?.message || 'noma’lum xatolik'}`, {
      cause: error,
    });
  } finally {
    await document?.loadingTask?.destroy?.();
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
