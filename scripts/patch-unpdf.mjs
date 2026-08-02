import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const filePath = join(process.cwd(), 'node_modules', 'unpdf', 'dist', 'pdfjs.mjs');
let source = readFileSync(filePath, 'utf8');
let changed = false;

for (const [original, replacement] of [
  ['this._isSameOrigin=', 'PDFWorker._isSameOrigin='],
  ['this._createCDNWrapper=', 'PDFWorker._createCDNWrapper='],
]) {
  if (source.includes(original)) {
    source = source.replace(original, replacement);
    changed = true;
  } else if (!source.includes(replacement)) {
    throw new Error(`unpdf patch target topilmadi: ${original}`);
  }
}

if (changed) writeFileSync(filePath, source, 'utf8');
console.log(`unpdf Cloudflare patch: ${changed ? 'applied' : 'already applied'}`);
