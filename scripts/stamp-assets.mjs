/**
 * Asset versiyalash (cache busting).
 *
 * Muammo: Cloudflare Pages statik fayllarga o'zining `max-age=14400`
 * qiymatini majburan qo'yadi va `_headers` dagi qisqaroq qiymatni
 * e'tiborga olmaydi. Natijada deploydan keyin foydalanuvchilarda eski va
 * yangi modullar aralashib qolishi mumkin.
 *
 * Yechim: har relizda barcha ichki JS/CSS havolalariga `?v=<versiya>`
 * qo'shamiz. HTML har doim yangi olinadi, shuning uchun versiya
 * o'zgarishi bilan brauzer barcha modullarni qaytadan yuklaydi.
 *
 * Ishga tushirish: npm run stamp   (package.json versiyasidan oladi)
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const version = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')).version;

// Versiya qo'yiladigan fayllar: ichki JS importlari va HTML havolalari.
const TARGETS = [
  'public/index.html',
  'public/admin/index.html',
  'public/js/app.js',
  'public/js/presentation-viewer.js',
  'public/js/pdf-thumb.js',
  'public/admin/ai-assist.js',
];

// Mos keladi: `./toast.js`, `js/app.js`, `css/style.css`, `/js/vendor/...`
// Vendor fayllari versiyalanmaydi — ular allaqachon immutable.
const ASSET_PATTERN = /(["'])((?:\.{1,2}\/|\/)?[A-Za-z0-9._/-]+\.(?:js|css))(\?v=[^"']*)?\1/g;

// Faqat o'z fayllarimiz (tashqi URL yoki data: emas)
function shouldStamp(assetPath) {
  if (assetPath.includes('/vendor/')) return false;
  if (/^(https?:)?\/\//.test(assetPath)) return false;
  return true;
}

let changed = 0;
for (const relativePath of TARGETS) {
  const filePath = join(ROOT, relativePath);
  const source = readFileSync(filePath, 'utf8');

  const updated = source.replace(ASSET_PATTERN, (match, quote, assetPath) => {
    if (!shouldStamp(assetPath)) return match;
    return `${quote}${assetPath}?v=${version}${quote}`;
  });

  if (updated !== source) {
    writeFileSync(filePath, updated);
    changed++;
    console.log(`stamped: ${relativePath}`);
  }
}

console.log(`\nVersiya ${version} — ${changed} ta fayl yangilandi.`);
