// ساخت نسخه‌ی آفلاین تک‌فایلی از روی index.html — بدون هیچ دانلود از CDN.
// همه‌ی کتابخانه‌ها از node_modules (npm ci) و CSS تیلویند از پیش کامپایل می‌شود،
// بنابراین خروجی دقیقاً تکرارپذیر است و به اینترنت/منطقه‌ی کاربر وابسته نیست.
// استفاده: npm ci && python build.py && node tools/build-offline.js
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const OUT = path.join(DIST, 'anbar-yar-offline.html');

const LIBS = [
  ['https://unpkg.com/react@18.2.0/umd/react.production.min.js', 'react/umd/react.production.min.js'],
  ['https://unpkg.com/react-dom@18.2.0/umd/react-dom.production.min.js', 'react-dom/umd/react-dom.production.min.js'],
  ['https://cdn.sheetjs.com/xlsx-0.20.0/package/dist/xlsx.full.min.js', 'xlsx/dist/xlsx.full.min.js'],
  ['https://unpkg.com/lucide@latest/dist/umd/lucide.min.js', 'lucide/dist/umd/lucide.min.js'],
  ['https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js', 'html2canvas/dist/html2canvas.min.js'],
];

function fail(msg) { console.error('خطا: ' + msg); process.exit(1); }

let html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

// ۱) تیلویند: بلوک play CDN + کانفیگ inline -> یک <style> از پیش کامپایل‌شده.
fs.mkdirSync(DIST, { recursive: true });
const cssOut = path.join(DIST, 'offline.css');
const tw = spawnSync(process.execPath, [
  path.join(ROOT, 'node_modules', 'tailwindcss', 'lib', 'cli.js'),
  '-c', path.join(ROOT, 'tools', 'tailwind.offline.config.js'),
  '-i', path.join(ROOT, 'tools', 'offline-input.css'),
  '-o', cssOut, '--minify',
], { cwd: ROOT, encoding: 'utf8' });
if (tw.status !== 0) fail('کامپایل Tailwind ناموفق:\n' + (tw.stderr || tw.stdout));
const css = fs.readFileSync(cssOut, 'utf8');
const twBlock = /<script src="https:\/\/cdn\.tailwindcss\.com"><\/script>\s*<script>[\s\S]*?<\/script>/;
if (!twBlock.test(html)) fail('بلوک Tailwind play CDN در index.html پیدا نشد.');
html = html.replace(twBlock, () => '<style>\n' + css + '\n</style>');

// ۲) کتابخانه‌ها: تگ <script src> -> اسکریپت inline از node_modules.
for (const [url, rel] of LIBS) {
  const file = path.join(ROOT, 'node_modules', rel);
  if (!fs.existsSync(file)) fail('کتابخانه نصب نیست: ' + rel + ' (npm ci را اجرا کن)');
  const tag = '<script src="' + url + '"></script>';
  if (!html.includes(tag)) fail('تگ اسکریپت پیدا نشد: ' + url);
  const code = fs.readFileSync(file, 'utf8').replace(/<\/script>/gi, '<\\/script>');
  // جایگزین تابعی تا $& / $' داخل کد UMD به‌عنوان الگوی replace تفسیر نشود.
  html = html.replace(tag, () => '<script>\n/* inlined offline: ' + url + ' */\n' + code + '\n</script>');
}

// ۳) ارجاع‌های PWA (manifest/آیکن) در تک‌فایلی معنا ندارند و 404 می‌دهند؛ حذف می‌شوند.
html = html.replace(/<link[^>]*rel="(manifest|icon|apple-touch-icon)"[^>]*>\s*/gi, '');

// ۴) بررسی نهایی: هیچ وابستگی اینترنتی نباید باقی بماند.
// فقط تگ‌های کاملِ واقعی (بلافاصله بسته می‌شوند) تا کامنت‌های داخل سورس اشتباه گرفته نشوند.
const leftoverScripts = [...html.matchAll(/<script\s+src=["'](https?:\/\/[^"']+)["']\s*>\s*<\/script>/gi)].map(m => m[1]);
if (leftoverScripts.length) fail('اسکریپت خارجی باقی مانده: ' + leftoverScripts.join(' ، '));
const leftoverCss = [...html.matchAll(/<link[^>]*href=["'](https?:\/\/[^"']+\.css[^"']*)["']/gi)].map(m => m[1]);
if (leftoverCss.length) fail('استایل خارجی باقی مانده: ' + leftoverCss.join(' ، '));

fs.writeFileSync(OUT, html, 'utf8');
const mb = (Buffer.byteLength(html, 'utf8') / 1024 / 1024).toFixed(2);
console.log('built dist/anbar-yar-offline.html: ' + mb + ' MB (کاملاً آفلاین، بدون وابستگی خارجی)');