import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { parseTestTxt } from '../functions/_lib/test-parser.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const BUCKET = 'ustoz-library-files';
const DB = 'ustoz-library-db';
const mode = process.argv.includes('--remote') ? '--remote' : '--local';
const WRANGLER = join(ROOT, 'node_modules', 'wrangler', 'bin', 'wrangler.js');

function wrangler(args) {
  return execFileSync(process.execPath, [WRANGLER, ...args], { cwd: ROOT, stdio: 'inherit' });
}

function sqlStr(v) {
  if (v === null || v === undefined || v === '') return 'NULL';
  if (typeof v === 'number') return String(v);
  return `'${String(v).replace(/'/g, "''")}'`;
}

console.log('🚀 Seeding demo slide and demo test...');

// 1. R2 Presentation upload
const presKey = 'presentations/demo_slide.pdf';
const presPath = join(ROOT, 'demo-sources', 'Demp_slide.pdf');
console.log(`⬆️ Uploading presentation to R2: ${presKey}`);
wrangler(['r2', 'object', 'put', `${BUCKET}/${presKey}`, '--file', presPath, '--content-type', 'application/pdf', mode]);

const sqlStatements = [];

// 2. Presentations table seed
sqlStatements.push(`DELETE FROM presentations WHERE id = 1;`);
sqlStatements.push(
  `INSERT INTO presentations (id, title_uz, description_uz, category, language, page_count, pdf_key, published) ` +
  `VALUES (1, 'Axborot Texnologiyalari va Sun''iy Intellekt Taqdimoti', 'Renessans Ta''lim Universiteti o''quv slayd materiallari (9 slayd)', 'it', 'uz', 9, ${sqlStr(presKey)}, 1);`
);

// 3. Tests table seed
const txtContent = readFileSync(join(ROOT, 'demo-sources', 'Demo_test.txt'), 'utf8');
const parsed = parseTestTxt(txtContent);

if (!parsed.success) {
  console.error('❌ Test parsing failed:', parsed.errors);
  process.exit(1);
}

console.log(`📝 Parsed ${parsed.questions.length} questions for demo test`);

sqlStatements.push(`DELETE FROM test_options WHERE question_id IN (SELECT id FROM test_questions WHERE test_id = 1);`);
sqlStatements.push(`DELETE FROM test_questions WHERE test_id = 1;`);
sqlStatements.push(`DELETE FROM tests WHERE id = 1;`);

sqlStatements.push(
  `INSERT INTO tests (id, title_uz, description_uz, category, language, duration_minutes, passing_percent, published) ` +
  `VALUES (1, 'Axborot Texnologiyalari va Iqtisodiyot Tizimlari Testi', 'Axborot texnologiyalari, iqtisodiy modellashtirish va dasturiy vositalar bo''yicha sinov testi', 'it', 'uz', 30, 60, 1);`
);

let qId = 1;
let optId = 1;

for (const q of parsed.questions) {
  sqlStatements.push(
    `INSERT INTO test_questions (id, test_id, position, question_text) VALUES (${qId}, 1, ${q.position}, ${sqlStr(q.questionText)});`
  );

  for (const opt of q.options) {
    sqlStatements.push(
      `INSERT INTO test_options (id, question_id, position, option_text, is_correct) VALUES (${optId}, ${qId}, ${opt.position}, ${sqlStr(opt.text)}, ${opt.isCorrect ? 1 : 0});`
    );
    optId++;
  }
  qId++;
}

// Write temp SQL file and execute in D1
const tmpSql = join(ROOT, '_demo_seed_tmp.sql');
writeFileSync(tmpSql, sqlStatements.join('\n'), 'utf8');

console.log(`🗄️ Executing SQL statements on D1 (${sqlStatements.length} queries)...`);
try {
  wrangler(['d1', 'execute', DB, mode, '--file', tmpSql]);
} finally {
  unlinkSync(tmpSql);
}

console.log('✅ Demo sources successfully seeded!');
