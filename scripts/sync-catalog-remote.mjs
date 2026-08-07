/**
 * Production katalog sinxronizatsiyasi (yo'qotishsiz).
 *
 * Nima qiladi:
 *   1. books.json dagi kitoblarning PDF va muqova fayllarini R2 ga yuklaydi.
 *   2. Production D1 da barcha mavjud kitoblarni archived = 1 qiladi.
 *   3. books.json dagi kitoblarni YANGI id bilan (AUTOINCREMENT) qo'shadi.
 *
 * Hech narsa o'chirilmaydi: eski kitoblar va ularning R2 fayllari arxivda
 * qoladi. Skript idempotent: qayta ishga tushirilsa, o'zi qo'shgan faol
 * kitoblarni yangilari bilan almashtiradi.
 *
 * Ishga tushirish:  node scripts/sync-catalog-remote.mjs [--local]
 * (standart: --remote, ya'ni production)
 */

import { readFileSync, writeFileSync, unlinkSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join, basename, extname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DB = 'ustoz-library-db';
const BUCKET = 'ustoz-library-files';
const isLocal = process.argv.includes('--local');
const WRANGLER = join(ROOT, 'node_modules', 'wrangler', 'bin', 'wrangler.js');

function wrangler(args) {
  return execFileSync(process.execPath, [WRANGLER, ...args], { cwd: ROOT, stdio: 'inherit' });
}

function slug(name) {
  return name.normalize('NFKD').replace(/[^\w.\- ]+/g, '').trim().replace(/\s+/g, '_').toLowerCase().slice(0, 50);
}

function sqlStr(v) {
  if (v === null || v === undefined || v === '') return 'NULL';
  if (typeof v === 'number') return String(v);
  return `'${String(v).replace(/'/g, "''")}'`;
}

const data = JSON.parse(readFileSync(join(ROOT, 'books.json'), 'utf8'));
const books = data.books || [];
if (books.length === 0) {
  console.error('books.json bo\'sh — hech narsa qilinmadi.');
  process.exit(1);
}

const modeFlag = isLocal ? '--local' : '--remote';
console.log(`\n📚 ${books.length} ta kitob ${isLocal ? 'LOKAL' : 'PRODUCTION'} muhitga sinxronlanadi.\n`);

// 1. R2 ga fayllarni yuklash
for (const b of books) {
  const pdfPath = join(ROOT, b.file);
  const coverPath = b.cover ? join(ROOT, b.cover) : null;

  const pdfKey = `books/migrated-${b.id}-${slug(basename(b.file, extname(b.file)))}${extname(b.file) || '.pdf'}`;
  const coverKey = coverPath ? `covers/migrated-${b.id}${extname(b.cover) || '.png'}` : null;
  b._pdfKey = pdfKey;
  b._coverKey = coverKey;

  if (!existsSync(pdfPath)) {
    console.error(`❌ PDF topilmadi: ${pdfPath}`);
    process.exit(1);
  }

  console.log(`⬆️  [${b.id}] ${pdfKey}`);
  wrangler(['r2', 'object', 'put', `${BUCKET}/${pdfKey}`, '--file', pdfPath, modeFlag, '--content-type', 'application/pdf']);

  if (coverPath && existsSync(coverPath)) {
    console.log(`⬆️  [${b.id}] ${coverKey}`);
    wrangler(['r2', 'object', 'put', `${BUCKET}/${coverKey}`, '--file', coverPath, modeFlag, '--content-type', 'image/png']);
  } else {
    b._coverKey = null;
  }
}

// 2 + 3. D1: eski katalogni arxivlash va yangi kitoblarni qo'shish
const statements = [
  // Skript avval qo'shgan faol nusxalarni olib tashlaymiz (idempotentlik)
  `DELETE FROM books WHERE archived = 0 AND file_key LIKE 'books/migrated-%';`,
  // Qolgan barcha faol (eski) kitoblarni arxivlaymiz
  `UPDATE books SET archived = 1 WHERE archived = 0;`,
];

for (const b of books) {
  statements.push(
    `INSERT INTO books (title_uz, title_ru, title_en, author, year, category, language, pages, file_key, cover_key, description_uz, description_ru, description_en, archived) VALUES (` +
    [
      sqlStr(b.title.uz), sqlStr(b.title.ru), sqlStr(b.title.en),
      sqlStr(b.author), b.year || 'NULL', sqlStr(b.category), sqlStr(b.language || 'uz'),
      b.pages || 'NULL', sqlStr(b._pdfKey), sqlStr(b._coverKey),
      sqlStr(b.description?.uz), sqlStr(b.description?.ru), sqlStr(b.description?.en),
      0,
    ].join(', ') + ');'
  );
}

const sqlFile = join(ROOT, '_sync_catalog_tmp.sql');
writeFileSync(sqlFile, statements.join('\n'), 'utf8');

console.log(`\n🗄️  D1 katalog yangilanmoqda (${books.length} ta kitob)...`);
try {
  wrangler(['d1', 'execute', DB, modeFlag, '--file', sqlFile]);
} finally {
  unlinkSync(sqlFile);
}

console.log(`\n✅ Katalog sinxronlandi: ${books.length} ta faol kitob, eskilari arxivda.`);
