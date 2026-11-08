#!/usr/bin/env python3
"""ساخت index.html از روی src/ — فقط به هم‌چسباندنِ بخش‌ها به ترتیبِ MODULES.

استفاده:
    python3 build.py            # ساخت index.html
    python3 build.py --check    # فقط بررسی هم‌خوانی index.html با src/ (برای CI)

سرخط‌های توضیحی هر بخش با `//##` (یا `<!--##`) شروع می‌شوند و هنگام ساخت حذف می‌شوند،
پس توضیح‌دادن یا مرتب‌کردنِ آن‌ها هرگز رفتار برنامه را تغییر نمی‌دهد.
"""
import sys
from pathlib import Path

ROOT = Path(__file__).parent
SRC = ROOT / "src"
OUT = ROOT / "index.html"

# ترتیب مهم است: همه‌ی بخش‌های .jsx داخل «یک» تگ <script type="text/babel"> قرار می‌گیرند
# و scope مشترک دارند، پس جابه‌جاییِ بی‌دقت ترتیبِ تعریف‌ها (const) را می‌شکند.
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

def build():
    return "".join(read_part(m) for m in MODULES)

if __name__ == "__main__":
    html = build()
    if "--check" in sys.argv:
        if OUT.read_text(encoding="utf-8") != html:
            sys.exit("index.html با src/ هم‌خوان نیست — python3 build.py را اجرا کن و commit کن.")
        print("OK: index.html is in sync with src/")
    else:
        OUT.write_text(html, encoding="utf-8", newline="")
        print(f"built {OUT.name}: {len(html):,} chars from {len(MODULES)} parts")
