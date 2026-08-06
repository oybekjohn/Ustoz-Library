import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join, basename, extname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DB = 'ustoz-library-db';
const mode = process.argv.includes('--remote') ? '--remote' : '--local';
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

const inserts = [];
for (const b of books) {
  const pdfKey = `books/migrated-${b.id}-${slug(basename(b.file, extname(b.file)))}${extname(b.file) || '.pdf'}`;
  const coverKey = b.cover ? `covers/migrated-${b.id}${extname(b.cover) || '.png'}` : null;

  inserts.push(
    `INSERT OR REPLACE INTO books (id, title_uz, title_ru, title_en, author, year, category, language, pages, file_key, cover_key, description_uz, description_ru, description_en) VALUES (` +
    [
      b.id, sqlStr(b.title.uz), sqlStr(b.title.ru), sqlStr(b.title.en),
      sqlStr(b.author), b.year || 'NULL', sqlStr(b.category), sqlStr(b.language || 'uz'),
      b.pages || 'NULL', sqlStr(pdfKey), sqlStr(coverKey),
      sqlStr(b.description?.uz), sqlStr(b.description?.ru), sqlStr(b.description?.en),
    ].join(', ') + ');'
  );
}

const sqlFile = join(ROOT, '_update_books_tmp.sql');
writeFileSync(sqlFile, inserts.join('\n'), 'utf8');

console.log(`🗄️ Updating ${inserts.length} books in D1 database...`);
try {
  wrangler(['d1', 'execute', DB, mode, '--file', sqlFile]);
} finally {
  unlinkSync(sqlFile);
}
console.log('✅ All 12 books successfully updated in D1!');
