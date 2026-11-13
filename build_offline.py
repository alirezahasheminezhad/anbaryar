#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""ساخت نسخه‌ی کاملاً آفلاین + PWA از روی فایل HTML کناری (بدون نیاز به Node/npm).

این اسکریپت هر فایل .html کنار خودش را (ترجیحاً index.html) برمی‌دارد، تمام
پیش‌نیازهای اینترنتی آن (کتابخانه‌های CDN، Tailwind، فونت) را خودش دانلود و
داخل فایل جاسازی می‌کند و در پایان یک فایل تک‌فایلی آفلاین به‌همراه فایل‌های
PWA (manifest / sw.js / آیکن) می‌سازد.

نام خودِ این فایل مهم نیست؛ کافی است کنار یک فایل .html باشد و اجرا شود:
    python build_offline.py                 # ورودی/خروجی خودکار
    python build_offline.py in.html out.html

فقط Python 3.8+ لازم است (کتابخانه‌ی استاندارد). دانلودها کش می‌شوند
(.offline-cache) تا اجرای بعدی سریع و بدون اینترنت باشد. اگر اینترنت نبود و
مخزن کامل (node_modules) کنار فایل بود، از همان به‌صورت خودکار استفاده می‌شود.

خروجی:
  • <name>-offline.html  → با دو بار کلیک، کاملاً آفلاین در هر مرورگری.
  • manifest.webmanifest / sw.js / pwa-icon.svg / pwa-icon-512.png
      → اگر همین پوشه روی https سرو شود، برنامه به‌صورت PWA قابل نصب است
        (کروم/اج: دکمه‌ی Install) و با service worker آفلاین هم کار می‌کند.
"""
import base64
import json
import re
import struct
import subprocess
import sys
import time
import urllib.request
import zlib
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
# کنسول ویندوز پیش‌فرض cp1252 است و فارسی/ایموجی را چاپ نمی‌کند؛ UTF-8 اجباری.
for _stream in (sys.stdout, sys.stderr):
    if hasattr(_stream, 'reconfigure'):
        _stream.reconfigure(encoding='utf-8', errors='replace')
CACHE_DIR = SCRIPT_DIR / '.offline-cache'
UA = ('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 '
      '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36')
RETRIES = 3
RETRY_DELAY = 1.5
FONT_CSS_URL = ('https://fonts.googleapis.com/css2?family=Vazirmatn:'
                'wght@100;300;400;500;700;900&display=swap')

# نگاشت CDN → مسیر UMD داخل node_modules (فقط برای حالت fallback بدون اینترنت)
LIB_FALLBACK = [
    ('unpkg.com/react@', 'react/umd/react.production.min.js'),
    ('unpkg.com/react-dom@', 'react-dom/umd/react-dom.production.min.js'),
    ('cdn.sheetjs.com/xlsx', 'xlsx/dist/xlsx.full.min.js'),
    ('unpkg.com/lucide', 'lucide/dist/umd/lucide.min.js'),
    ('html2canvas', 'html2canvas/dist/html2canvas.min.js'),
]


def log(msg):
    print(msg, flush=True)


def human(n):
    for unit in ('B', 'KB', 'MB', 'GB'):
        if n < 1024:
            return f'{n:.2f} {unit}'
        n /= 1024
    return f'{n:.2f} TB'


def fetch(url, binary=False):
    """دانلود با retry و کش محلی؛ فقط پاسخ معتبر کش می‌شود."""
    CACHE_DIR.mkdir(exist_ok=True)
    key = base64.urlsafe_b64encode(url.encode()).decode() + ('.bin' if binary else '.txt')
    cache = CACHE_DIR / key
    if cache.exists():
        data = cache.read_bytes()
        if binary or looks_like_script(url, data.decode('utf-8', 'replace')):
            return data if binary else data.decode('utf-8')
        cache.unlink()  # کش خراب → دانلود تازه
    last = None
    for attempt in range(1, RETRIES + 1):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': UA})
            with urllib.request.urlopen(req, timeout=90) as res:
                data = res.read()
            if not binary:
                text = data.decode('utf-8')
                looks_like_script(url, text)
            cache.write_bytes(data)
            return data if binary else data.decode('utf-8')
        except Exception as e:  # noqa: BLE001 - عمدی: retry روی هر خطای شبکه
            last = e
            if attempt < RETRIES:
                log(f'    ⚠ تلاش {attempt} ناموفق ({e})، تلاش دوباره...')
                time.sleep(RETRY_DELAY)
    raise RuntimeError(f'دانلود ناموفق برای {url} → {last}')


def looks_like_script(url, text):
    head = (text or '')[:2000].strip().lower()
    if not head:
        raise RuntimeError(f'پاسخ خالی بود: {url}')
    if head.startswith(('<!doctype html', '<html')) or '<head>' in head or '<title>' in head:
        raise RuntimeError(f'به‌جای JS یک صفحه HTML برگشت (آدرس نامعتبر): {url}')
    if len(text.encode('utf-8')) < 1024:
        raise RuntimeError(f'حجم پاسخ مشکوکانه کم بود: {url}')
    return True


def lib_fallback(url):
    """اگر دانلود نشد و node_modules کنار فایل بود، از UMD محلی استفاده کن."""
    for needle, rel in LIB_FALLBACK:
        if needle in url:
            p = SCRIPT_DIR / 'node_modules' / rel
            if p.exists():
                log(f'    ↳ استفاده از نسخه محلی (بدون اینترنت): {rel}')
                return p.read_text(encoding='utf-8')
    return None


def replace_first(html, needle, replacement):
    """جایگزینی امن با اندیس (بدون تفسیر الگوهای ویژه)."""
    i = html.find(needle)
    if i == -1:
        return html
    return html[:i] + replacement + html[i + len(needle):]


def external_scripts(html):
    return [(m.group(0), m.group(2)) for m in re.finditer(
        r'<script\b([^>]*?)\ssrc=["\'](https?://[^"\']+)["\']([^>]*)>\s*</script>', html, re.I)]


def inline_font(html):
    """اگر فونت گوگل به‌صورت @import/link بود، Base64 کن (در انباریار از قبل هست)."""
    has = re.search(r'@import\s+url\([\'"]?https://fonts\.googleapis\.com', html) or \
        re.search(r'<link[^>]*fonts\.googleapis\.com', html)
    if not has:
        return html
    log('  ⏳ جاسازی فونت وزیرمتن...')
    css = fetch(FONT_CSS_URL)
    for fu in sorted(set(re.findall(r'url\((https://fonts\.gstatic\.com/[^)]+)\)', css))):
        buf = fetch(fu, binary=True)
        mime = 'font/woff2' if fu.endswith('.woff2') else 'font/woff'
        css = css.replace(fu, f'data:{mime};base64,{base64.b64encode(buf).decode()}')
    html = re.sub(r'@import\s+url\([\'"]?https://fonts\.googleapis\.com[^)]*\)\s*;?', css, html)
    html = re.sub(r'<link[^>]*fonts\.googleapis\.com[^>]*>\s*', '', html)
    return html


def tailwind_static_css(html, input_path):
    """fallback بدون اینترنت: کامپایل CSS با tailwind محلی و کانفیگِ خودِ فایل."""
    cli = SCRIPT_DIR / 'node_modules' / 'tailwindcss' / 'lib' / 'cli.js'
    node = 'node'
    if not cli.exists():
        return None
    m = re.search(r'<script src="https://cdn\.tailwindcss\.com"></script>\s*<script>([\s\S]*?)</script>', html)
    if not m:
        return None
    cfg = re.sub(r'^\s*tailwind\.config\s*=', '', m.group(1).strip()).rstrip(';')
    tmp_cfg = CACHE_DIR / 'tw.config.js'
    tmp_in = CACHE_DIR / 'tw.input.css'
    tmp_out = CACHE_DIR / 'tw.out.css'
    CACHE_DIR.mkdir(exist_ok=True)
    tmp_cfg.write_text('module.exports = ' + cfg + ';\nmodule.exports.content = [' +
                       json.dumps(str(input_path)) + '];\n', encoding='utf-8')
    tmp_in.write_text('@tailwind base;\n@tailwind components;\n@tailwind utilities;\n', encoding='utf-8')
    proc = subprocess.run([node, str(cli), '-c', str(tmp_cfg), '-i', str(tmp_in),
                           '-o', str(tmp_out), '--minify'], cwd=SCRIPT_DIR,
                          capture_output=True, text=True)
    if proc.returncode != 0:
        return None
    return tmp_out.read_text(encoding='utf-8')


def write_pwa_sidecars(out_dir, out_name):
    """manifest / sw.js / آیکن‌ها را کنار خروجی می‌سازد تا پوشه روی https قابل نصب باشد."""
    icon_svg = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">'
                '<rect width="512" height="512" rx="96" fill="#14214f"/>'
                '<g fill="none" stroke="#f47125" stroke-width="28" stroke-linejoin="round" stroke-linecap="round">'
                '<path d="M256 96 400 176v160L256 416 112 336V176Z"/>'
                '<path d="M112 176 256 256 400 176"/><path d="M256 256v160"/></g>'
                '<circle cx="256" cy="256" r="34" fill="#fde9d9"/></svg>')
    (out_dir / 'pwa-icon.svg').write_text(icon_svg, encoding='utf-8')
    (out_dir / 'pwa-icon-512.png').write_bytes(make_icon_png(512))
    manifest = {
        'name': 'انبار یار', 'short_name': 'انبار یار',
        'description': 'مدیریت هوشمند موجودی، فاکتور فروش و خرید کالا',
        'lang': 'fa', 'dir': 'rtl', 'start_url': './' + out_name, 'scope': './',
        'display': 'standalone', 'orientation': 'any',
        'background_color': '#f5f8fc', 'theme_color': '#14214f',
        'icons': [
            {'src': './pwa-icon.svg', 'sizes': '192x192', 'type': 'image/svg+xml', 'purpose': 'any'},
            {'src': './pwa-icon.svg', 'sizes': '512x512', 'type': 'image/svg+xml', 'purpose': 'any'},
            {'src': './pwa-icon.svg', 'sizes': 'any', 'type': 'image/svg+xml', 'purpose': 'any'},
            {'src': './pwa-icon-512.png', 'sizes': '512x512', 'type': 'image/png', 'purpose': 'any maskable'},
        ],
    }
    (out_dir / 'manifest.webmanifest').write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding='utf-8')
    sw = """/* Service worker ساخت خودکار: پوسته را precache می‌کند تا PWA آفلاین کار کند. */
const CACHE = 'anbaryar-offline-auto';
const SHELL = ['./', './%s', './manifest.webmanifest', './pwa-icon.svg', './pwa-icon-512.png'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const req = e.request; if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (req.mode === 'navigate') { e.respondWith(fetch(req).then((r) => { const c = r.clone(); caches.open(CACHE).then((x) => x.put('./%s', c)); return r; }).catch(() => caches.match('./%s'))); return; }
  if (url.origin === self.location.origin) { e.respondWith(caches.match(req).then((h) => h || fetch(req))); }
});
""" % (out_name, out_name, out_name)
    (out_dir / 'sw.js').write_text(sw, encoding='utf-8')


def make_icon_png(size=512):
    """آیکن PNG را بدون هیچ کتابخانه‌ای (zlib/struct) رسم می‌کند."""
    s = size / 512.0
    segs = [((256, 96), (400, 176)), ((400, 176), (400, 336)), ((400, 336), (256, 416)),
            ((256, 416), (112, 336)), ((112, 336), (112, 176)), ((112, 176), (256, 96)),
            ((112, 176), (256, 256)), ((256, 256), (400, 176)), ((256, 256), (256, 416))]
    navy, brass, cream = (20, 33, 79), (244, 113, 37), (253, 233, 217)

    def dist_seg(px, py, a, b):
        ax, ay = a; bx, by = b
        dx, dy = bx - ax, by - ay
        t = max(0.0, min(1.0, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)))
        cx, cy = ax + t * dx, ay + t * dy
        return ((px - cx) ** 2 + (py - cy) ** 2) ** 0.5

    rows = []
    for y in range(size):
        row = bytearray()
        for x in range(size):
            px, py = x / s, y / s
            # گوشه‌های گرد
            r = 96
            cx = min(max(px, r), 512 - r); cy = min(max(py, r), 512 - r)
            if (px - cx) ** 2 + (py - cy) ** 2 > r * r:
                row += bytes((0, 0, 0, 0)); continue
            if (px - 256) ** 2 + (py - 256) ** 2 <= 34 * 34:
                row += bytes((*cream, 255)); continue
            if min(dist_seg(px, py, a, b) for a, b in segs) <= 14:
                row += bytes((*brass, 255)); continue
            row += bytes((*navy, 255))
        rows.append(b'\x00' + bytes(row))
    raw = b''.join(rows)

    def chunk(tag, data):
        c = struct.pack('>I', len(data)) + tag + data
        return c + struct.pack('>I', zlib.crc32(tag + data) & 0xffffffff)

    ihdr = struct.pack('>IIBBBBB', size, size, 8, 6, 0, 0, 0)
    return (b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', ihdr) +
            chunk(b'IDAT', zlib.compress(raw, 9)) + chunk(b'IEND', b''))


def pick_input():
    if len(sys.argv) > 1:
        return Path(sys.argv[1]).resolve()
    pref = SCRIPT_DIR / 'index.html'
    if pref.exists():
        return pref
    for p in sorted(SCRIPT_DIR.glob('*.html')):
        if not p.name.endswith('-offline.html') and not p.name.startswith('local-test'):
            return p.resolve()
    raise RuntimeError('هیچ فایل .html کنار اسکریپت پیدا نشد.')


def main():
    src = pick_input()
    out = Path(sys.argv[2]).resolve() if len(sys.argv) > 2 else src.with_name(src.stem + '-offline.html')
    log(f'📦 ورودی: {src.name}\n🎯 خروجی: {out.name}\n')
    html = src.read_text(encoding='utf-8')

    # ۱) Tailwind: play CDN را inline کن (JIT حفظ می‌شود)؛ در نبود اینترنت CSS ثابت کامپایل کن.
    tw_tag = '<script src="https://cdn.tailwindcss.com"></script>'
    if tw_tag in html:
        log('  ⏳ Tailwind...')
        try:
            code = fetch('https://cdn.tailwindcss.com')
            html = replace_first(html, tw_tag, '<script>\n/* inlined offline: tailwind */\n' +
                                 code.replace('</script>', '<\\/script>') + '\n</script>')
            log('     ✅ play CDN جاسازی شد (JIT حفظ شد).')
        except Exception as e:  # noqa: BLE001
            log(f'    ⚠ دانلود Tailwind ناموفق ({e})؛ تلاش برای کامپایل محلی...')
            css = tailwind_static_css(html, src)
            if css is None:
                raise RuntimeError('Tailwind نه دانلود شد نه کامپایل محلی ممکن بود.')
            html = re.sub(r'<script src="https://cdn\.tailwindcss\.com"></script>\s*<script>[\s\S]*?</script>',
                          lambda: '<style>\n' + css + '\n</style>', html, count=1)
            log('     ✅ CSS ثابت کامپایل و جاسازی شد.')

    # ۲) بقیه کتابخانه‌های خارجی
    scripts = external_scripts(html)
    log(f'🔗 {len(scripts)} کتابخانه خارجی پیدا شد.')
    for tag, url in scripts:
        log(f'  ⏳ {url}')
        try:
            code = fetch(url)
        except Exception as e:  # noqa: BLE001
            code = lib_fallback(url)
            if code is None:
                raise RuntimeError(f'دانلود ناموفق و نسخه محلی هم نبود: {url} ({e})')
        log(f'     ✅ {human(len(code.encode("utf-8")))}')
        html = replace_first(html, tag, '<script>\n/* inlined offline: ' + url + ' */\n' +
                             code.replace('</script>', '<\\/script>') + '\n</script>')

    # ۳) فونت + پاک‌سازی وابستگی‌های مرده
    html = inline_font(html)
    html = re.sub(r'<script\s+type=["\']importmap["\']>[\s\S]*?</script>\s*', '', html, flags=re.I)
    html = re.sub(r'<link\s+rel=["\']stylesheet["\']\s+href=["\']/index\.css["\']\s*/?>\s*', '', html, flags=re.I)
    html = re.sub(r'<script\s+type=["\']module["\']\s+src=["\']/index\.tsx["\']\s*></script>\s*', '', html, flags=re.I)

    # ۴) PWA: آیکن/manifest/sw کنار خروجی + بازنویسی لینک‌های head به همان‌ها
    write_pwa_sidecars(out.parent, out.name)
    html = re.sub(r'<link[^>]*rel="manifest"[^>]*>', '<link rel="manifest" href="./manifest.webmanifest" />', html)
    html = re.sub(r'<link[^>]*rel="icon"[^>]*>', '<link rel="icon" type="image/svg+xml" href="./pwa-icon.svg" />', html)
    html = re.sub(r'<link[^>]*rel="apple-touch-icon"[^>]*>', '<link rel="apple-touch-icon" href="./pwa-icon-512.png" />', html)

    # ۵) بررسی نهایی
    left = external_scripts(html)
    if left:
        raise RuntimeError('هنوز اسکریپت خارجی باقی مانده: ' + ', '.join(u for _, u in left))
    out.write_text(html, encoding='utf-8')
    log(f'\n✅ ساخته شد: {out.name} ({human(out.stat().st_size)})')
    log('   • اجرای آفلاین: همین فایل را دو بار کلیک کنید (بدون اینترنت).')
    log('   • نصب PWA: همین پوشه را روی https سرو کنید و در کروم/اج دکمه Install را بزنید.')
    log('     (روی file:// دکمه نصب ظاهر نمی‌شود؛ نصب فقط از https ممکن است.)')


if __name__ == '__main__':
    try:
        main()
    except Exception as e:  # noqa: BLE001
        log(f'\n❌ خطا: {e}')
        sys.exit(1)