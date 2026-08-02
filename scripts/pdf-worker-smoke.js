import { PDFDocument, StandardFonts } from 'pdf-lib';
import { inspectPdfFirstPages } from '../functions/_lib/pdf.js';

export default {
  async fetch() {
    const pdf = await PDFDocument.create();
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const page = pdf.addPage([400, 400]);
    page.drawText('Cloudflare PDF parser smoke test', { x: 40, y: 340, font, size: 18 });
    const bytes = await pdf.save({ useObjectStreams: false });
    const result = await inspectPdfFirstPages(bytes.buffer, 2);
    return Response.json(result);
  },
};
