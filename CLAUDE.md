# CLAUDE.md — راهنمای سریع برای نشست‌های بعدی (برای مصرف توکن کمتر)

**پروژه:** «انبار یار» — برنامه‌ی فارسی RTL انبار/فاکتور، تک‌فایل HTML (React 18؛ JSX هنگام build با Babel در Node پیش‌کامپایل می‌شود، بدون Babel در مرورگر). مالک: Alireza.

## قبل از هر کاری
1. `docs/ARCHITECTURE.md` را بخوان (نقشه‌ی فایل‌ها) — کل `index.html` را هرگز نخوان (۱٫۹MB؛ بخش اعظمش base64 است).
2. فقط ماژولِ مربوط را از `src/app/` بخوان/ویرایش کن. قوانین مالی/انبار در `src/app/10-app-docs.jsx` (`APP_DOCS_MD`) است.
3. پیدا کردن چیزها: `grep -n "نام" src/app/*.jsx`.

## گردش کار تغییر
1. ویرایش `src/…` (نه `index.html`!).
2. یک‌بار `npm install` (وابستگی `@babel/standalone` برای پیش‌کامپایل؛ `package-lock.json` را commit کن).
3. `python3 build.py` (JSX را با `tools/compile-jsx.js` در Node به `React.createElement` تبدیل و در `index.html` درج می‌کند).
4. `python3 build.py --check` (هم‌خوانی بایت‌به‌بایت؛ CI هم همین را اجرا می‌کند).
5. `APP_BUILD` (در `05-storage-security.jsx`) و نسخه/تاریخ `APP_DOCS_VERSION` + متن مستندات (`10-app-docs.jsx`) را به‌روز کن.
6. commit + push روی `main`؛ در پیام commit بنویس چه چیزی و چرا. اگر هر ویژگی/باگ جدید یا تصمیم مهمی بود، به بخش «تاریخچه» پایین اضافه کن.

## قواعد ثابت (ترجیحات کاربر)
- UI فارسی RTL، فونت Vazirmatn، بدون وابستگی اجباری به سرور؛ همه‌چیز در همین یک فایل نهایی.
- صحتِ منطق انبار/مالی مهم‌تر از زیبایی است. تغییر ظاهری = فقط لایه‌ی بصری، بدون تغییر منطق.
- کد بخش‌بندی‌شده با کامنت فارسی؛ ماژول‌ها یک scope مشترک دارند (بدون import/export)، ترتیب `MODULES` در `build.py` مهم است.
- جستجوی اقلام همیشه با `smartSearchMatch` (نرمال‌سازی ی/ک و نیم‌فاصله)، نه `.includes()` خام.
- ورودی عددی: `step="any"` (اعشار مجاز). ناوبری فقط با `navigateTo()` (editingInvoice را ریست می‌کند).
- حذف/تأیید خطرناک → مودال تأیید سفارشی (`useConfirm`) و در موارد حساس با شمارش معکوس؛ نه `window.confirm`.

## تاریخچه‌ی مهم (خلاصه)
- نسخه‌ی اولیه‌ی این ریپو = فایل `index_1_2_2.html` که کاربر فرستاد (APP_BUILD 10.5، مستندات v7.4). تقسیم به `src/` بایت‌به‌بایت بدون تغییر رفتار بود.
- یادآوری: حافظه‌ی نشست‌های قبلی از `index_1_2_3.html` (v20) نام می‌برد؛ اگر کاربر نسخه‌ی جدیدتری داد، تفاوتش را روی ماژول‌های `src/` اعمال کن و `index.html` را از `build.py` بساز.
- انتشار: ریپو public است و GitHub Pages از `main` / root سرو می‌شود → https://alirezahasheminezhad.github.io/anbaryar/ (با هر push روی main خودکار به‌روز می‌شود؛ `index.html` ساخته‌شده باید commit شود). API گیت‌هاب از داخل نشست مسدود است؛ تنظیمات Pages را فقط خود کاربر در Settings تغییر می‌دهد.
- 2026-11-08 (build 10.6، docs v7.5): «تولید و کپی توضیحات» پاپ‌آپ شد: کلیدهای نمایش بخش‌ها + حالت محاسبه‌ی وزن/تعداد با انتخاب دستیِ «دو دسته» وقتی تقسیم گرد نیست؛ فقط روی متن اثر دارد (`16-pos.jsx`، `splitWeightIntoBags` در `06-calculations.jsx`، تست: `node tools/check-split.js`).
- 2026-11-13 (build 10.7، docs v7.6): رفع باگ لود نسخه‌ی وب (بک‌تیک‌های escape‌نشده داخل APP_DOCS_MD در 10-app-docs.jsx کل برنامه را می‌شکست؛ داخل آن متن هرگز بک‌تیک خام ننویس). بازطراحی صفحه‌ی اول مطابق اسکرین‌شات مرجع (Medicore): Sidebar/Header حذف و TopNav (07-header.jsx) جایگزین شد؛ پالت indigo→آبی/سرمه‌ای؛ کارت‌های آمار، چیپ‌های فیلتر انبار/نمایش، جدول با ستون وضعیت و نوار قابل‌فروش؛ نمای پیش‌فرض اقلام «جدول»؛ فرم افزودن کالا با دکمه‌ی «+ افزودن کالا» باز می‌شود. فقط لایه‌ی بصری؛ منطق دست‌نخورده. بعد از تأیید کاربر سراغ بقیه‌ی صفحه‌ها برو. قبل از push همیشه یک رندر محلی بگیر (React/Babel/lucide را از npm بیاور، CDNها از نشست بسته‌اند).
- 2026-11-13 (build 10.8): پیش‌کامپایل JSX هنگام build (`tools/compile-jsx.js` + `@babel/standalone` در Node، preset-react classic). تگ `text/babel` و CDNِ Babel حذف شد؛ خروجی `<script>` معمولی است. `build.py --check` بایت‌به‌بایت مقایسه می‌کند؛ CI حالا `npm ci` + setup-node دارد. سازنده‌ی آفلاینِ داخل برنامه با این تغییر سازگار است.
- 2026-11-13 (build 10.9، docs v7.7): اجرای گزارش حرفه‌ای (۱۸ مورد). امنیت: حذف آینه‌ی plaintext در localStorage وقتی رمز فعال است (05-storage-security.jsx)؛ کلید ورود موقت به sessionStorage منتقل شد (با بستن تب پاک می‌شود)؛ رمز opt-in شد (دکمه‌ی «دمو» در setup + بنر یادآور در App + فعال‌سازی از SecurityCenter وقتی رمزی نیست)؛ حداقل رمز ۸ + سنجه‌ی قدرت؛ فرم تغییر رمز ماسک‌دار. داده: شاخص ذخیره صادقانه (await/catch + state خطا) + debounce ۴۰۰ms. UX: دیالوگ‌های بومی→Toast/Confirm؛ دسترس‌پذیری مودال‌ها (useDialogA11y/DialogFrame)؛ اعتبارسنجی درون‌خطی مشتری POS؛ empty-state داشبورد؛ مسیریابی سبک hash (Back/Refresh/Deep-link، با محافظت از editingInvoice)؛ مرز آستانه‌ی کمبود `<` شد؛ نشانگر وضعیت آیکن+متن در کارت‌ها؛ سررسید POS «تنظیم دقیق» تاشو. نکته: vendor کردن کامل CDNها (آفلاینِ واقعیِ بار اول) به دلیل ریسک/حجم انجام نشد؛ precompile بخش اصلیِ کندی را حل کرد و سازنده‌ی آفلاین همچنان نسخه‌ی خودبسنده می‌سازد.
- 2026-11-14 (build 10.10، docs v7.8): یکسان‌سازی سیستم دیزاین در همه‌ی ماژول‌ها (پس‌زمینه‌ی مودال‌ها slate-950/50 و چاپ /70، گردی‌ها به مقیاس rounded-2xl/3xl، حذف hex hardcoded و سایه‌های روشنِ خارج از پالت، نگاشت رنگ یادداشت‌ها به پالت معنایی)؛ تکمیل دسترس‌پذیری مودال‌های inline در POS با DialogFrame (Escape/focus-trap/role). تست لایو توسط کاربر انجام می‌شود; قبل از push رندر محلی گرفته شد.
- 2026-11-14 (build 10.11، docs v7.9): ساخت آفلاین توسط خود گیتهاب: `tools/build-offline.js` + `tools/tailwind.offline.config.js` + `.github/workflows/offline.yml` → `dist/anbar-yar-offline.html` تک‌فایلیِ بدون هیچ fetch از CDN (کتابخانه‌ها از node_modules، تیلویند از پیش کامپایل؛ جایگزینِ replace تابعی تا `$&` داخل UMD خراب نشود). devDeps جدید: react/react-dom/xlsx/lucide/html2canvas/tailwindcss (lock به‌روز شد). PWA: `manifest.webmanifest` + `sw.js` + `assets/pwa-icon.svg/png`؛ ثبت SW فقط روی https; نصب از Edge/Chrome به‌عنوان اپ ویندوز. خروجی آفلاین محلاً رندر و syntax-check شد (۸/۸ اسکریپت، صفر درخواست خارجی).
- 2026-11-14 (build 10.11 تکمیلی): workflow حالا خروجی آفلاین را به یک Release غلتان به نام `offline-latest` هم upload می‌کند (gh release upload --clobber) تا همیشه در Releases باشد؛ آیکن‌های manifest اندازه‌های 192/512 گرفتند تا نصب کروم تضمین شود. اسکریپت `build_offline.py` (فقط stdlib، نام فایل مهم نیست، کنار هر .html کار می‌کند) پیش‌نیازها را خودش دانلود/کش می‌کند (fallback بدون اینترنت به node_modules + کامپایل tailwind)، خروجی آفلاین + sidecarهای PWA (manifest/sw/آیکن svg و pngِ رسم‌شده با zlib) می‌دهد؛ محلاً اجرا و رندر شد (JIT فعال، ۱۰/۱۰ اسکریپت سالم). نکته: نصب PWA فقط از https ممکن است، نه از فایل دانلودشده‌ی file://.
- 2026-11-14 (build 10.12): آیکن‌های PWA به PNG واقعیِ 192x192 و 512x512 تبدیل شدند (همان آرت‌ورک 1024 با resample خالص پایتون، بدون کتابخانه) تا شرط آیکنِ نصب کروم/اج روی ویندوز قطعی شود؛ manifest حالا png 192/512 (any) + png 512 (maskable) + svg (any) دارد؛ sw.js cache به v10.12 و SHELL شامل آیکن 192 شد; `build_offline.py` هم sidecarهای 192/512 را می‌سازد. خروجی Release (offline-latest) محلاً دانلود و رندر شد: ۸/۸ اسکریپت سالم، صفر درخواست شبکه، فونت base64 و تیلویند static داخل فایل.
