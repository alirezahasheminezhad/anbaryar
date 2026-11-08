# معماری «انبار یار»

برنامه یک فایل HTML واحد (`index.html`) است که بدون سرور و آفلاین کار می‌کند: React 18 + Babel-standalone + Tailwind (CDN)،
داده‌ها فقط در مرورگر (localStorage + IndexedDB با قفل رمزنگاری‌شده). برای نگه‌داری، سورس به بخش‌های کوچک در `src/` شکسته شده
و `build.py` آن‌ها را **فقط به‌هم می‌چسباند** (هیچ تبدیل/کامپایلی نیست). خروجی نسخه‌ی اول با فایل اصلیِ کاربر **بایت‌به‌بایت یکسان** بود.

## جریان کار
```
ویرایش src/…  →  python3 build.py  →  index.html  →  git commit/push
```
CI (`.github/workflows/check.yml`) با `python3 build.py --check` مطمئن می‌شود `index.html` با `src/` هم‌خوان است.

## قاعده‌ی مهم scope
همه‌ی فایل‌های `src/app/*.jsx` داخل **یک** تگ `<script type="text/babel">` می‌روند و scope مشترک دارند
(مثل یک فایل بزرگ). پس `import/export` نداریم و ترتیب در `MODULES` (در `build.py`) مهم است: هر `const` باید قبل از اولین اجرای استفاده‌اش تعریف شود
(برای کامپوننت‌ها معمولاً مشکلی نیست چون در زمان render صدا زده می‌شوند). فایل جدید = یک خط در `MODULES`.

## نقشه‌ی بخش‌ها
| فایل | حجم | محتوا |
|---|---|---|
| `src/00-html-head.html` | 4 KB | سربرگ HTML: CDNها (React، Babel، Tailwind، SheetJS، Lucide، html2canvas) و تنظیمات Tailwind (پالت رنگ ink-navy/brass). (خطوط 1–64 نسخه‌ی اولیه) |
| `src/assets/vazirmatn-font.js` | 144 KB | فونت Vazirmatn (base64) — ویرایش نکن |
| `src/01-html-styles.html` | 10 KB | CSS سراسری، importmap، <body>، راه‌اندازی آیکن‌ها و باز شدن تگ <script type=text/babel>. (خطوط 66–225 نسخه‌ی اولیه) |
| `src/app/01-core-utils.jsx` | 28 KB | ابزارهای پایه: ارقام فارسی، فرمت عدد، badge اقلام، چاپ در پنجره‌ی جدید، عدد به حروف، کمک‌های انبار/خرید در راه. |
| `src/app/02-toast-confirm.jsx` | 5 KB | سیستم Toast و مودال تأیید سفارشی (جایگزین window.confirm، با شمارش معکوس). |
| `src/app/03-print-modals.jsx` | 56 KB | چاپ/خروجی فاکتور (PrintInvoiceModal) و چاپ عمومی خرید/پردازش (PrintOrderModal). |
| `src/app/04-excel-services.jsx` | 11 KB | سرویس‌های اکسل: خروجی موجودی/فاکتورها و خواندن فایل اکسل. |
| `src/app/05-storage-security.jsx` | 16 KB | ذخیره‌سازی (localStorage + IndexedDB رمزنگاری‌شده)، قفل امنیتی، تنظیمات، loadData/saveData. |
| `src/app/06-calculations.jsx` | 12 KB | قوانین محاسبه: هزینه‌ی بارگیری، وزن مؤثر ردیف، کیسه‌ی مادر و قالب‌های توضیحات. |
| `src/app/07-header.jsx` | 3 KB | کامپوننت Header (نوار بالا). |
| `src/app/08-mahak-import.jsx` | 83 KB | ورود/همگام‌سازی از محک: نرمال‌سازی نام، smartSearchMatch، MahakImportView، parseMahakExcelFile. |
| `src/app/09-mother-bag-row.jsx` | 17 KB | ردیف تنظیمات کیسه‌ی مادر (MotherBagRow). |
| `src/app/10-app-docs.jsx` | 29 KB | مستندات داخلی برنامه (APP_DOCS_MD) و AppDocsView. با هر تغییر، نسخه/تاریخ این مستندات را به‌روز کن. |
| `src/app/11-mother-bag-stock.jsx` | 10 KB | موجودی کیسه‌ی مادر/کیسه‌ی خالی (EmptyBagPanel، MotherBagStockView). |
| `src/app/12-navigation-critical-stats.jsx` | 24 KB | ناوبری (VIEW_GROUPS، GroupTabs، Sidebar)، اقلام بحرانی، آمار موجودی. |
| `src/app/13-pending-outputs.jsx` | 34 KB | خروجی‌های در انتظار: جزئیات سند، گزارش خروجی‌های در انتظار، PendingOrders. |
| `src/app/14-inventory.jsx` | 94 KB | موجودی کالا: کارت/گروه اقلام، ادغام، افزودن/ویرایش، تاریخچه، شمارش موجودی، پیش‌نمایش اکسل. |
| `src/app/15-invoice-modals.jsx` | 61 KB | مودال جزئیات فاکتور (InvoiceDetailsModal) و تأیید ارسال (ConfirmShipmentModal). |
| `src/app/16-pos.jsx` | 110 KB | صدور فاکتور فروش (POS): سبد، هشدار افت قیمت، هزینه‌ی بارگیری، سررسید، ثبت نهایی. |
| `src/app/17-invoice-history.jsx` | 42 KB | تاریخچه و گزارش فاکتورها (InvoiceHistory). |
| `src/app/18-notes-jalali.jsx` | 30 KB | ابزار تاریخ جلالی/سررسید (toJalaliInput، getDueUrgency …) و یادداشت‌ها (Notes). |
| `src/app/19-purchase-modals-check-rass.jsx` | 52 KB | مودال‌های خرید (NewPurchaseItemModal، EditPurchaseModal) و راس‌گیری چک (CheckRassView). |
| `src/app/20-reports.jsx` | 38 KB | گزارش‌ها: موجودی مادر، ارسال‌های جزئی، خروجی امروز، گردش کالا، سررسیدها و پیگیری (RemindersView). |
| `src/app/21-offline-build-settings.jsx` | 35 KB | ساخت نسخه‌ی آفلاین از داخل برنامه و صفحه‌ی تنظیمات (SettingsView). |
| `src/app/22-purchase-view.jsx` | 23 KB | خرید کالا و کالای در راه (PurchaseView). |
| `src/app/23-processing.jsx` | 50 KB | آنالیز/پردازش برون‌سپاری (آسیاب): مودال‌ها، گزارش کلی، ProcessingView. |
| `src/app/24-consignment.jsx` | 59 KB | امانی (قرض بار): ابزار طرف‌حساب، ادغام، گزارش کلی، ConsignmentView، بازگشت/ویرایش امانی. |
| `src/app/25-security-ui.jsx` | 12 KB | صفحه‌ی قفل، مرکز امنیت، SecurityGate و AYErrorBoundary. |
| `src/app/26-embedded-tools-head.jsx` | 0 KB | سرآیند افزونه‌های داخلی (استعلام و مدیریت خرید کاربران در iframe). |
| `src/assets/estelam-app.js` | 719 KB | برنامه‌ی «استعلام» (base64) — ویرایش نکن |
| `src/app/27-embedded-tools.jsx` | 2 KB | رمزگشایی و نمایش افزونه‌های داخلی (EmbeddedToolView). |
| `src/app/28-app-root.jsx` | 112 KB | کامپوننت ریشه‌ی App: state سراسری، handlerهای ثبت/ویرایش/حذف و مسیریابی بین view‌ها. |
| `src/app/29-boot.jsx` | 0 KB | راه‌اندازی: لاگ خطاها و render ریشه. |
| `src/99-html-tail.html` | 0 KB | بستن تگ‌های script/body/html. (خطوط 10684–10686 نسخه‌ی اولیه) |

## کجا دنبال چه چیزی بگردم؟
- باگ محاسبه‌ی هزینه‌ی بارگیری / وزن → `06-calculations.jsx`
- ذخیره/بازیابی/قفل داده → `05-storage-security.jsx`
- صدور فاکتور (سبد، افت قیمت، سررسید) → `16-pos.jsx`
- موجودی، ادغام، تاریخچه‌ی کالا → `14-inventory.jsx`
- ارسال/خروجی‌های در انتظار → `13-pending-outputs.jsx`، `15-invoice-modals.jsx`
- امانی / آنالیز-پردازش / خرید در راه → `24-`، `23-`، `22-`
- منطق ثبت/حذف/ویرایش سراسری (reconcile موجودی) → `28-app-root.jsx`
- جستجوی اقلام (نرمال‌سازی ی/ک و نیم‌فاصله) → `smartSearchMatch` در `08-mahak-import.jsx`
- مستندات کامل داخلیِ برنامه (قوانین مالی/انبار) → `10-app-docs.jsx` (متن `APP_DOCS_MD`)
