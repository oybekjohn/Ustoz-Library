/**
 * DL-library — ma'lumotlar bazasi zaxira nusxasi.
 *
 * NIMA QILADI:
 *   1. Production D1 bazasini to'liq SQL faylga eksport qiladi
 *   2. Eksport haqiqatan ma'lumot saqlaganini tekshiradi
 *   3. Uni R2 ning `backups/` papkasiga yuklaydi
 *   4. 30 kundan eski nusxalarni kompyuterdan o'chiradi
 *
 * Eslatma: R2 dagi fayllar (PDF, muqovalar) alohida zaxiralanmaydi —
 * ularning kalitlari baza ichida saqlanadi, ya'ni bazadan qaysi fayl
 * kerakligini har doim aniqlash mumkin.
 *
 * XAVFSIZLIK:
 *   Zaxira faylida shaxsiy ma'lumotlar bor (Telegram ID lari, IP manzillar),
 *   shuning uchun u HECH QACHON ochiq git repositoriyaga qo'yilmaydi.
 *   `backups/` papkasi .gitignore da.
 *
 * ISHGA TUSHIRISH:
 *   npm run backup            — zaxira olish va R2 ga yuklash
 *   npm run backup -- --local — faqat kompyuterga saqlash (R2 ga yuklamaydi)
 */

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, statSync, unlinkSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const WRANGLER = join(ROOT, 'node_modules', 'wrangler', 'bin', 'wrangler.js');

const DB_NAME = 'ustoz-library-db';
const BUCKET = 'ustoz-library-files';
const BACKUP_DIR = join(ROOT, 'backups');
const RETENTION_DAYS = 30;

const localOnly = process.argv.includes('--local');

/** wrangler buyrug'ini ishga tushiradi va natijani matn sifatida qaytaradi. */
function wrangler(args, { silent = false } = {}) {
  return execFileSync(process.execPath, [WRANGLER, ...args], {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: silent ? ['ignore', 'pipe', 'pipe'] : ['ignore', 'pipe', 'inherit'],
    maxBuffer: 64 * 1024 * 1024,
  });
}

function bugunSana() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

function olchamKb(filePath) {
  return Math.round(statSync(filePath).size / 1024);
}

// ---------- 1. Bazani eksport qilish ----------

function bazaniEksportQil() {
  if (!existsSync(BACKUP_DIR)) mkdirSync(BACKUP_DIR, { recursive: true });

  const fayl = join(BACKUP_DIR, `dl-library-${bugunSana()}.sql`);
  console.log(`\n📦 Baza eksport qilinmoqda: ${DB_NAME}`);

  wrangler(['d1', 'export', DB_NAME, '--remote', `--output=${fayl}`]);

  if (!existsSync(fayl) || statSync(fayl).size < 1024) {
    throw new Error('Eksport fayli juda kichik yoki yaratilmadi — zaxira ishonchsiz');
  }

  console.log(`✅ Eksport tayyor: ${olchamKb(fayl)} KB`);
  return fayl;
}

/** Zaxira haqiqatan ma'lumot saqlaganini tekshiradi (bo'sh fayl xavfli). */
function eksportniTekshir(fayl) {
  const matn = execFileSync(process.execPath, ['-e',
    `process.stdout.write(require('fs').readFileSync(${JSON.stringify(fayl)},'utf8').slice(0,2000000))`,
  ], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });

  const kitoblar = (matn.match(/^INSERT INTO "?books"? /gm) || []).length;
  const jadvallar = (matn.match(/^CREATE TABLE /gm) || []).length;

  console.log(`   Jadvallar: ${jadvallar} ta, kitoblar: ${kitoblar} ta`);
  if (jadvallar === 0) {
    throw new Error("Zaxirada birorta jadval yo'q — eksport muvaffaqiyatsiz");
  }
  return { jadvallar, kitoblar };
}

// ---------- 2. R2 ga yuklash ----------

function r2gaYukla(fayl) {
  const kalit = `backups/${bugunSana()}/baza.sql`;
  console.log(`\n☁️  R2 ga yuklanmoqda: ${kalit}`);

  wrangler([
    'r2', 'object', 'put', `${BUCKET}/${kalit}`,
    '--file', fayl,
    '--remote',
    '--content-type', 'application/sql',
  ]);

  console.log('✅ R2 ga saqlandi');
  return kalit;
}

// ---------- 3. Eski zaxiralarni tozalash ----------

function eskilarniTozala() {
  if (!existsSync(BACKUP_DIR)) return;

  const chegara = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
  let ochirildi = 0;

  for (const nom of readdirSync(BACKUP_DIR)) {
    const yol = join(BACKUP_DIR, nom);
    if (statSync(yol).mtimeMs < chegara) {
      unlinkSync(yol);
      ochirildi++;
    }
  }

  if (ochirildi > 0) {
    console.log(`\n🗑  ${ochirildi} ta eski zaxira o'chirildi (${RETENTION_DAYS} kundan oshgan)`);
  }
}

// ---------- Asosiy oqim ----------

try {
  console.log('═══════════════════════════════════════');
  console.log('  DL-library — zaxira nusxa olish');
  console.log('═══════════════════════════════════════');

  const fayl = bazaniEksportQil();
  const statistika = eksportniTekshir(fayl);

  if (!localOnly) {
    r2gaYukla(fayl);
  } else {
    console.log('\n(--local rejimi: R2 ga yuklanmadi)');
  }

  eskilarniTozala();

  console.log('\n═══════════════════════════════════════');
  console.log('✅ ZAXIRA TAYYOR');
  console.log(`   Fayl: ${fayl}`);
  console.log(`   Hajmi: ${olchamKb(fayl)} KB`);
  console.log(`   Ichida: ${statistika.jadvallar} jadval, ${statistika.kitoblar} kitob`);
  if (!localOnly) console.log(`   R2: backups/${bugunSana()}/baza.sql`);
  console.log('═══════════════════════════════════════\n');
} catch (error) {
  console.error('\n❌ ZAXIRA OLINMADI');
  console.error(`   Sabab: ${error.message}`);
  console.error('\n   Nima qilish kerak:');
  console.error('   1. npx wrangler whoami  — tizimga kirganingizni tekshiring');
  console.error('   2. Kirmagan bo\'lsangiz: npx wrangler login');
  console.error('   3. Qayta urinib ko\'ring: npm run backup\n');
  process.exit(1);
}
