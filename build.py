#!/usr/bin/env python3
"""ساخت index.html از روی src/ — به‌هم‌چسباندنِ بخش‌ها به ترتیبِ MODULES و پیش‌کامپایلِ JSX.

استفاده:
    npm install                 # یک‌بار: نصب @babel/standalone برای پیش‌کامپایل
    python3 build.py            # ساخت index.html (JSX از پیش کامپایل می‌شود)
    python3 build.py --check    # فقط بررسی هم‌خوانی index.html با src/ (برای CI)

بلوکِ <script type="text/babel"> هنگام ساخت به JS ساده (React.createElement) کامپایل می‌شود
تا مرورگر دیگر به Babel نیاز نداشته باشد (حذفِ ~۵۰۰KB و هشدارِ deopt و بارِ اولِ سریع‌تر).
سرخط‌های توضیحیِ هر بخش با `//##` (یا `<!--##`) شروع می‌شوند و هنگام ساخت حذف می‌شوند،
پس توضیح‌دادن یا مرتب‌کردنِ آن‌ها هرگز رفتار برنامه را تغییر نمی‌دهد.
"""
import re
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).parent
SRC = ROOT / "src"
OUT = ROOT / "index.html"

# ترتیب مهم است: همه‌ی بخش‌های .jsx داخل «یک» تگ <script> قرار می‌گیرند و scope مشترک دارند،
# پس جابه‌جاییِ بی‌دقت ترتیبِ تعریف‌ها (const) را می‌شکند.
MODULES = [
    "00-html-head.html",
    "assets/vazirmatn-font.js",
    "01-html-styles.html",
    "app/01-core-utils.jsx",
    "app/02-toast-confirm.jsx",
    "app/03-print-modals.jsx",
    "app/04-excel-services.jsx",
    "app/05-storage-security.jsx",
    "app/06-calculations.jsx",
    "app/07-header.jsx",
    "app/08-mahak-import.jsx",
    "app/09-mother-bag-row.jsx",
    "app/10-app-docs.jsx",
    "app/11-mother-bag-stock.jsx",
    "app/12-navigation-critical-stats.jsx",
    "app/13-pending-outputs.jsx",
    "app/14-inventory.jsx",
    "app/15-invoice-modals.jsx",
    "app/16-pos.jsx",
    "app/17-invoice-history.jsx",
    "app/18-notes-jalali.jsx",
    "app/19-purchase-modals-check-rass.jsx",
    "app/20-reports.jsx",
    "app/21-offline-build-settings.jsx",
    "app/22-purchase-view.jsx",
    "app/23-processing.jsx",
    "app/24-consignment.jsx",
    "app/25-security-ui.jsx",
    "app/26-embedded-tools-head.jsx",
    "assets/estelam-app.js",
    "app/27-embedded-tools.jsx",
    "app/28-app-root.jsx",
    "app/29-boot.jsx",
    "99-html-tail.html",
]

def read_part(name):
    lines = (SRC / name).read_text(encoding="utf-8").splitlines(keepends=True)
    while lines and lines[0].lstrip().startswith(("//##", "<!--##")):
        lines.pop(0)
    return "".join(lines)

def concat():
    return "".join(read_part(m) for m in MODULES)

# بلوکِ Babel از <script type="text/babel"> تا </script></body></html> (انتهای فایل) کشیده می‌شود.
BABEL_BLOCK = re.compile(r'<script type="text/babel">([\s\S]*?)</script>\s*</body>\s*</html>')

def compile_jsx(jsx):
    node = shutil.which("node")
    if not node:
        sys.exit("خطا: node پیدا نشد. پیش‌کامپایلِ JSX به Node.js نیاز دارد؛ سپس: npm install")
    proc = subprocess.run(
        [node, str(ROOT / "tools" / "compile-jsx.js")],
        input=jsx, text=True, capture_output=True, encoding="utf-8",
    )
    if proc.returncode != 0:
        sys.exit("خطای کامپایل JSX:\n" + (proc.stderr or proc.stdout))
    return proc.stdout

def build():
    html = concat()
    m = BABEL_BLOCK.search(html)
    if not m:
        sys.exit('خطا: بلوک <script type="text/babel"> در خروجی پیدا نشد.')
    compiled = compile_jsx(m.group(1))
    return html[:m.start()] + "<script>\n" + compiled + "\n</script>\n</body>\n</html>" + html[m.end():]

if __name__ == "__main__":
    html = build()
    if "--check" in sys.argv:
        if OUT.read_text(encoding="utf-8") != html:
            sys.exit("index.html با src/ هم‌خوان نیست — python3 build.py را اجرا کن و commit کن.")
        print("OK: index.html is in sync with src/")
    else:
        OUT.write_text(html, encoding="utf-8", newline="")
        print(f"built {OUT.name}: {len(html):,} chars from {len(MODULES)} parts (JSX precompiled)")