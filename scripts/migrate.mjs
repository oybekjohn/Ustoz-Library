/* ============================================
   DL-library.uz — Migratsiya skripti
   books.json + books/ papkadagi fayllarni
   Cloudflare R2 (fayllar) va D1 (metama'lumot) ga ko'chiradi.

   Foydalanish:
     node scripts/migrate.mjs --local     (lokal `wrangler pages dev` uchun)
     node scripts/migrate.mjs --remote    (haqiqiy Cloudflare uchun)
   ============================================ */

import { readFileSync, writeFileSync, existsSync, unlinkSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join, basename, extname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const BUCKET = 'ustoz-library-files';
const DB = 'ustoz-library-db';

const mode = process.argv.includes('--remote') ? '--remote' : '--local';
const WRANGLER = join(ROOT, 'node_modules', 'wrangler', 'bin', 'wrangler.js');

function wrangler(args) {
  // Node orqali to'g'ridan-to'g'ri chaqiramiz (Windows'da .cmd/shell muammosini chetlab o'tadi)
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

function r2Put(key, localPath, contentType) {
  if (!existsSync(localPath)) {
    console.warn(`  ⚠️  Fayl topilmadi, o'tkazib yuborildi: ${localPath}`);
    return false;
  }
  console.log(`  ⬆️  R2: ${key}`);
  wrangler(['r2', 'object', 'put', `${BUCKET}/${key}`, '--file', localPath, '--content-type', contentType, mode]);
  return true;
}

function ctOf(path) {
  const e = extname(path).toLowerCase();
  return { '.pdf': 'application/pdf', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' }[e] || 'application/octet-stream';
}

// ---------- Boshlash ----------
const data = JSON.parse(readFileSync(join(ROOT, 'books.json'), 'utf8'));
const books = data.books || [];
console.log(`\n📚 ${books.length} ta kitob topildi. Rejim: ${mode}\n`);

const inserts = [];

for (const b of books) {
  console.log(`▶ [${b.id}] ${b.title.uz}`);

  // PDF
  const pdfLocal = join(ROOT, b.file);
  const pdfKey = `books/migrated-${b.id}-${slug(basename(b.file, extname(b.file)))}.pdf`;
  const pdfOk = r2Put(pdfKey, pdfLocal, ctOf(b.file));
  if (!pdfOk) { console.warn(`  ⛔ PDF yo'q — kitob o'tkazib yuborildi\n`); continue; }

  // Muqova
  let coverKey = null;
  if (b.cover) {
    const coverLocal = join(ROOT, b.cover);
    const ck = `covers/migrated-${b.id}${extname(b.cover) || '.png'}`;
    if (r2Put(ck, coverLocal, ctOf(b.cover))) coverKey = ck;
  }

  inserts.push(
    `INSERT OR REPLACE INTO books (id, title_uz, title_ru, title_en, author, year, category, language, pages, file_key, cover_key, description_uz, description_ru, description_en) VALUES (` +
    [
      b.id, sqlStr(b.title.uz), sqlStr(b.title.ru), sqlStr(b.title.en),
      sqlStr(b.author), b.year || 'NULL', sqlStr(b.category), sqlStr(b.language || 'uz'),
      b.pages || 'NULL', sqlStr(pdfKey), sqlStr(coverKey),
      sqlStr(b.description?.uz), sqlStr(b.description?.ru), sqlStr(b.description?.en),
    ].join(', ') + ');'
  );
  console.log('');
}

if (!inserts.length) {
  console.log('Hech narsa ko\'chirilmadi.');
  process.exit(0);
}

// D1 ga yozish
const sqlFile = join(ROOT, '_migrate_tmp.sql');
writeFileSync(sqlFile, inserts.join('\n'), 'utf8');
console.log(`🗄️  D1 ga ${inserts.length} ta yozuv qo'shilmoqda…`);
try {
  wrangler(['d1', 'execute', DB, mode, '--file', sqlFile]);
} finally {
  unlinkSync(sqlFile);
}

console.log('\n✅ Migratsiya tugadi.\n');
