const MAX_EXTRACTED_TEXT_CHARS = 8000;

function compactText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function ensureDomMatrix() {
  if (globalThis.DOMMatrix) return;
  globalThis.DOMMatrix = class DOMMatrix {
    constructor(init) {
      const values = Array.isArray(init) ? init : [];
      this.a = values[0] ?? 1;
      this.b = values[1] ?? 0;
      this.c = values[2] ?? 0;
      this.d = values[3] ?? 1;
      this.e = values[4] ?? 0;
      this.f = values[5] ?? 0;
      this.m11 = this.a;
      this.m12 = this.b;
      this.m21 = this.c;
      this.m22 = this.d;
      this.m41 = this.e;
      this.m42 = this.f;
      this.is2D = true;
      this.isIdentity = this.a === 1 && this.b === 0 && this.c === 0 && this.d === 1 && this.e === 0 && this.f === 0;
    }

    multiplySelf() { return this; }
    preMultiplySelf() { return this; }
    translateSelf(x = 0, y = 0) { this.e += x; this.f += y; this.m41 = this.e; this.m42 = this.f; return this; }
    scaleSelf() { return this; }
    rotateSelf() { return this; }
    invertSelf() { return this; }
    transformPoint(point = {}) { return { x: point.x ?? 0, y: point.y ?? 0, z: point.z ?? 0, w: point.w ?? 1 }; }
  };
}

async function loadPdfJs() {
  ensureDomMatrix();
  return import('pdfjs-dist/legacy/build/pdf.mjs');
}

export async function inspectPdfFirstPages(pdfBuffer, maxPages = 2) {
  const pdfjsLib = await loadPdfJs();
  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(pdfBuffer),
    disableFontFace: true,
    isEvalSupported: false,
    useWorkerFetch: false,
  });
  const document = await loadingTask.promise;

  const pageCount = document.numPages || null;
  const pagesToRead = Math.min(maxPages, pageCount || maxPages);
  const chunks = [];

  for (let pageNumber = 1; pageNumber <= pagesToRead; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const content = await page.getTextContent();
    const text = compactText(content.items.map((item) => item.str).join(' '));
    if (text) chunks.push(`--- ${pageNumber}-sahifa ---\n${text}`);
  }

  await loadingTask.destroy();

  return {
    pageCount,
    firstPagesText: chunks.join('\n\n').slice(0, MAX_EXTRACTED_TEXT_CHARS),
  };
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
