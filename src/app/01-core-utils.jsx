//## ═══ app/01-core-utils.jsx ═══
//## ابزارهای پایه: ارقام فارسی، فرمت عدد، badge اقلام، چاپ در پنجره‌ی جدید، عدد به حروف، کمک‌های انبار/خرید در راه.
//## ترتیب فایل‌ها در build.py مهم است؛ همه‌ی بخش‌ها یک scope مشترک دارند.
        // --- Utilities & Globals ---
        const { useState, useEffect, useMemo, useRef } = React;
        const { createRoot } = ReactDOM;
        
        // Destructure Icons
        const { 
          Download, Upload, Search, FileSpreadsheet, PackageOpen, 
          Plus, Tag, Box, Hash, Layers, Package, Trash2, Minus, 
          Truck, X, Check, Lock, ShieldCheck, CloudCheck, WifiOff, AlertTriangle,
          LayoutDashboard, FileText, History, Scale, Store, Clock,
          Eye, Edit3, FilePlus, Info, Save, RefreshCw, Pencil, ClipboardList, CheckSquare, Square,
          Calendar, User, PackageX, ArrowUpRight, ArrowDownLeft, Edit, Settings, CheckCircle,
          Printer, LayoutList, Table2, ChevronDown, ChevronUp, ChevronLeft, RotateCcw, Pin, PinOff,
          Image: ImageIcon, ExternalLink, Warehouse, Handshake, ArrowLeftRight, Factory,
          BadgeDollarSign, GitMerge, CalendarClock, Bell, UserX, Users, Wrench, FileBarChart,
          Calculator, Landmark, Filter
        } = window.lucideReact;

        const generateId = () => {
            if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
            return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 9);
        };

        // دسترس‌پذیری مشترک همه‌ی مودال‌ها: بستن با Escape، به‌دام‌انداختن Tab داخل مودال،
        // بازگرداندن فوکوس به عنصر قبلی هنگام بسته‌شدن، قفل اسکرول پس‌زمینه و نقش‌های ARIA.
        // یک پشته‌ی سراسری نگه می‌داریم تا وقتی چند مودال روی هم بازند، Escape فقط بالاترین را ببندد.
        const AY_DIALOG_STACK = [];
        const useDialogA11y = (onClose, opts = {}) => {
            const ref = useRef(null);
            const onCloseRef = useRef(onClose);
            onCloseRef.current = onClose;
            useEffect(() => {
                const node = ref.current;
                if (!node) return;
                const token = {};
                AY_DIALOG_STACK.push(token);
                const prevFocus = document.activeElement;
                if (AY_DIALOG_STACK.length === 1) document.body.style.overflow = 'hidden';
                if (!node.hasAttribute('role')) node.setAttribute('role', 'dialog');
                node.setAttribute('aria-modal', 'true');
                if (!node.hasAttribute('tabindex')) node.setAttribute('tabindex', '-1');
                const focusables = () => Array.from(node.querySelectorAll(
                    'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),[tabindex]:not([tabindex="-1"])'
                )).filter(el => el.getClientRects().length > 0);
                if (!node.contains(document.activeElement)) {
                    const target = (opts.initialFocusRef && opts.initialFocusRef.current) || focusables()[0] || node;
                    if (target && target.focus) target.focus();
                }
                const onKey = (e) => {
                    if (AY_DIALOG_STACK[AY_DIALOG_STACK.length - 1] !== token) return;
                    if (e.key === 'Escape' && opts.closeOnEscape !== false) {
                        e.stopPropagation();
                        if (onCloseRef.current) onCloseRef.current();
                    } else if (e.key === 'Tab') {
                        const f = focusables();
                        if (f.length === 0) { e.preventDefault(); node.focus(); return; }
                        const first = f[0], last = f[f.length - 1];
                        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
                        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
                        else if (!node.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
                    }
                };
                document.addEventListener('keydown', onKey, true);
                return () => {
                    document.removeEventListener('keydown', onKey, true);
                    const i = AY_DIALOG_STACK.indexOf(token);
                    if (i > -1) AY_DIALOG_STACK.splice(i, 1);
                    if (AY_DIALOG_STACK.length === 0) document.body.style.overflow = '';
                    if (prevFocus && prevFocus.focus) prevFocus.focus();
                };
            }, []);
            return ref;
        };

        // ارسال Toast از هر جای برنامه (حتی توابعِ غیرکامپوننت مثل چاپ) بدونِ نیاز به context.
        const notifyToast = (msg, action, duration) => window.dispatchEvent(new CustomEvent('anbaryar:toast', { detail: { msg, action, duration } }));
        
        // تبدیل ارقام فارسی/عربی داخل یک رشته به ارقام انگلیسی و یکسان‌سازی جداکننده اعشار
        const toEnglishDigits = (val) => {
            if (val === null || val === undefined) return val;
            return String(val)
                .replace(/[۰-۹]/g, ch => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(ch)))
                .replace(/[٠-٩]/g, ch => String('٠١٢٣٤٥٦٧٨٩'.indexOf(ch)))
                .replace(/[٫،]/g, '.');
        };

        // تبدیل ارقام انگلیسی به فارسی؛ برای یکدست نگه‌داشتن نمایش تاریخ‌های آزاد (فیلد «تاریخ» فاکتور) با بقیه‌ی برنامه
        const toPersianDigits = (val) => {
            if (val === null || val === undefined) return val;
            return String(val).replace(/[0-9]/g, ch => '۰۱۲۳۴۵۶۷۸۹'[Number(ch)]);
        };

        // یکدست‌سازی فیلد آزاد «تاریخ» فاکتور: هر فرمتی که کاربر وارد کند (رقم فارسی/انگلیسی، با یا بدون صفر
        // ابتدایی روز/ماه، جداکننده / یا -) را به شکل ثابت «سال/ماه دورقمی/روز دورقمی» با ارقام فارسی برمی‌گرداند.
        // این یکدست‌سازی لازم است چون در چند جای برنامه (تشخیص «آخرین تاریخ فاکتور مشتری»، مرتب‌سازی برای ادغام
        // اسناد) این رشته به‌صورت متنی/الفبایی مقایسه می‌شود نه به‌صورت تاریخ واقعی؛ بدون صفر ابتدایی، مثلاً
        // «۱۴۰۴/۶/۹» به‌اشتباه از «۱۴۰۴/۱۲/۱» «بزرگ‌تر» (جدیدتر) محاسبه می‌شود چون کاراکتر «۶» از «۱» بزرگ‌تر است.
        const normalizeInvoiceDateStr = (val) => {
            if (!val) return val;
            const raw = toEnglishDigits(val).trim();
            const parts = raw.split(/[\/\-]/).map(p => p.trim()).filter(Boolean);
            if (parts.length !== 3 || parts.some(p => !/^\d+$/.test(p))) return toPersianDigits(raw);
            const [y, m, d] = parts;
            const canonical = `${y}/${m.padStart(2, '0')}/${d.padStart(2, '0')}`;
            return toPersianDigits(canonical);
        };


        // این تابع جایگزین Number()/parseFloat() خام در محاسباتِ وزن، قیمت و مقدار شده است تا:
        //  - ارقام فارسی/عربی درست خوانده شوند
        //  - جداکننده هزارگان (مثل ,) بدون از بین رفتن نقطه‌ی اعشار حذف شود
        //  - چند نقطه‌ی متوالی یا کاراکترهای اضافه باعث محاسبه‌ی غلط (مثل خرابی ضرب وزن اعشاری در قیمت) نشود
        const parseDecimal = (val) => {
            if (val === null || val === undefined || val === '') return 0;
            if (typeof val === 'number') return isFinite(val) ? val : 0;
            let s = toEnglishDigits(val).trim();
            s = s.replace(/[^0-9.\-]/g, '');
            const parts = s.split('.');
            if (parts.length > 2) s = parts.slice(0, -1).join('') + '.' + parts[parts.length - 1];
            const n = parseFloat(s);
            return isFinite(n) ? n : 0;
        };

        const formatNumber = (num) => {
            if (!num && num !== 0) return "";
            let n = typeof num === 'number' ? num : parseDecimal(num);
            if (!isFinite(n)) return "";
            // گرد کردن به ۳ رقم اعشار برای حذف باقی‌مانده‌های میکروسکوپیِ محاسبات اعشاری جاوااسکریپت
            // (مثلاً ۹.۱ × ۵۰۰۰ که گاهی به‌جای ۴۵۵۰۰ دقیقاً، عددی مثل ۴۵۴۹۹.۹۹۹۹۹۹۹۹۹۹۹۹۹۶ تولید می‌شود؛
            // بدون این گرد کردن، جداکننده‌ی هزارگان زیر روی رقم‌های اعشار هم اعمال و عدد کاملاً بی‌معنی می‌شد)
            n = Math.round(n * 1000) / 1000;
            const parts = n.toString().split('.');
            parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
            return parts.join('.');
        };

        // نمایش کالا در فاکتور/خرید/پردازش/امانی:
        // - رکوردهای «در انتظار» (هنوز نهایی/ارسال/دریافت نشده): نام + برند + تگ + واحد + وزن کیسه، همه از روی اطلاعات
        //   فعلیِ کالا در انبار خوانده می‌شوند (چون هنوز چیزی نهایی نشده، منطقی است اگر کاربر این‌ها را در انبار ویرایش کند همین‌جا هم به‌روز شود)
        // - رکوردهای نهایی/تاریخی (گزارش‌ها): همان اطلاعاتی که در لحظه‌ی ثبت ذخیره شده حفظ می‌شود (سند تاریخی دست‌نخورده می‌ماند)
        //   ولی اگر الان کالا در انبار با نام/برند/تگ دیگری شناخته می‌شود، یک یادداشت کوچک برای اطلاع کاربر اضافه می‌شود
        const resolveItemDisplay = (it, inventoryItems, isPending) => {
            if (!it || !it.itemId || !Array.isArray(inventoryItems)) return { name: it?.name || '', note: null, display: it };
            const current = inventoryItems.find(x => x.id === it.itemId);
            if (!current) return { name: it.name, note: null, display: it }; // کالا از انبار حذف شده؛ فقط اطلاعات ثبت‌شده باقی می‌ماند
            if (isPending) {
                const display = { ...it, name: current.name, brand: current.brand, tag: current.tag, unit: current.unit, bagWeight: current.bagWeight };
                return { name: current.name, note: null, display };
            }
            const diffs = [];
            if (current.name !== it.name) diffs.push(`نام: ${current.name}`);
            if (current.brand !== it.brand) diffs.push(`برند: ${current.brand || '—'}`);
            if (current.tag !== it.tag) diffs.push(`تگ: ${current.tag || '—'}`);
            return { name: it.name, note: diffs.length > 0 ? `الان: ${diffs.join('، ')}` : null, display: it };
        };
        // یک کامپوننت کوچک برای نمایش یکدست نام + یادداشتِ تغییرات (در صورت وجود)
        const ItemNameLabel = ({ it, inventoryItems, isPending, className }) => {
            const { name, note } = resolveItemDisplay(it, inventoryItems, isPending);
            return (
                <span className={className}>
                    {name}
                    {note && <span className="text-[9px] text-amber-500 bg-amber-50 border border-amber-200 px-1 rounded mr-1" title="اطلاعات این کالا در انبار تغییر کرده است">{note}</span>}
                </span>
            );
        };


        // برای مواردی که چند کالا اسم یکسان دارند (مثلاً «زردچوبه سابیده» با دو برند/کیسه‌بندی متفاوت)،
        // این تابع یک خط جزئیات شامل برند، تگ، واحد، وزن کیسه و موجودی می‌سازد تا در لیست‌های جستجو
        // به‌راحتی بتوان کالای درست را از بین موارد مشابه تشخیص داد.
        const itemDetailParts = (item) => {
            const parts = [];
            if (item.brand) parts.push(`برند: ${item.brand}`);
            if (item.tag) parts.push(item.tag);
            if (item.bagWeight) parts.push(item.bagWeight >= 1000 ? `کیسه ${item.bagWeight/1000} کیلویی` : `کیسه ${formatNumber(item.bagWeight)} گرمی`);
            if (item.unit) parts.push(`واحد: ${item.unit}`);
            return parts;
        };

        // برای این‌که در لیست پیشنهادهای جستجو، کالاهای هم‌اسم ولی با برند/تگ متفاوت (مثلاً «زردچوبه قلم» هندی
        // در برابر اتیوپی، یا «۱۰ کیلویی» در برابر «۵ کیلویی») راحت‌تر از هم تشخیص داده شوند، به هر مقدار متنیِ
        // برند/تگ همیشه یک رنگ ثابت (بر اساس خودِ متن، نه تصادفی) اختصاص می‌دهیم؛ یعنی هر بار همون کلمه رو
        // دیدی، همون رنگ رو می‌بینی — چشم سریع‌تر بین گزینه‌های شبیه‌به‌هم فرق می‌ذاره و احتمال اشتباه کمتر می‌شه.
        const BADGE_COLOR_PALETTE = [
            'bg-rose-100 text-rose-700 border-rose-200',
            'bg-amber-100 text-amber-700 border-amber-200',
            'bg-emerald-100 text-emerald-700 border-emerald-200',
            'bg-sky-100 text-sky-700 border-sky-200',
            'bg-violet-100 text-violet-700 border-violet-200',
            'bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200',
            'bg-lime-100 text-lime-700 border-lime-200',
            'bg-cyan-100 text-cyan-700 border-cyan-200',
            'bg-orange-100 text-orange-700 border-orange-200',
            'bg-teal-100 text-teal-700 border-teal-200',
        ];
        // خیلی وقت‌ها فرق اصلیِ بین چند کالای هم‌اسم، توی خودِ کلمهٔ آخرِ اسم (مثل «طاها» یا «پاکستانی») نوشته
        // شده، نه توی برند/تگ (که ممکنه خالی یا یکسان باشن، مثلاً همه «عمومی»). این تابع بین چند اسمِ مشابه،
        // بخش مشترکِ اول رو پیدا می‌کنه و فقط بخشِ متفاوتِ آخر رو برمی‌گردونه تا همون تکه رنگی/برجسته بشه.
        const splitNameDiff = (allNames, name) => {
            const words = String(name || '').trim().split(/\s+/);
            if (!allNames || allNames.length < 2) return { prefix: name, diff: '' };
            const wordLists = allNames.map(n => String(n || '').trim().split(/\s+/));
            const minLen = Math.min(...wordLists.map(w => w.length));
            let common = 0;
            for (let i = 0; i < minLen; i++) {
                const w = wordLists[0][i];
                if (wordLists.every(ws => ws[i] === w)) common++;
                else break;
            }
            // اگر کل اسم مشترک بود (یعنی این کالا کاملاً هم‌اسمِ بقیه‌ست)، چیزی برای برجسته‌کردن نیست
            if (common >= words.length) return { prefix: name, diff: '' };
            return { prefix: words.slice(0, common).join(' '), diff: words.slice(common).join(' ') };
        };
        const stringToBadgeColor = (text) => {
            const s = String(text || '');
            let hash = 0;
            for (let i = 0; i < s.length; i++) hash = (hash * 31 + s.charCodeAt(i)) | 0;
            return BADGE_COLOR_PALETTE[Math.abs(hash) % BADGE_COLOR_PALETTE.length];
        };
        // چیپ‌های متمایزکننده‌ی کالا: برند و تگ هرکدام با رنگ ثابتِ خودشون، و وزن کیسه با یک رنگ خنثی مشخص.
        const ItemDistinguishBadges = ({ item, size = 'xs' }) => {
            const txt = size === 'xs' ? 'text-[9px]' : 'text-[10px]';
            const pad = size === 'xs' ? 'px-1.5 py-0' : 'px-1.5 py-0.5';
            const bagWeightLabel = item.bagWeight ? (item.bagWeight >= 1000 ? `${item.bagWeight/1000} کیلویی` : `${formatNumber(item.bagWeight)} گرمی`) : null;
            if (!item.brand && !item.tag && !bagWeightLabel) return null;
            return (
                <span className="inline-flex items-center gap-1 flex-wrap">
                    {item.brand && <span className={`${txt} ${pad} rounded font-bold border ${stringToBadgeColor(item.brand)}`}>{item.brand}</span>}
                    {item.tag && <span className={`${txt} ${pad} rounded font-bold border ${stringToBadgeColor(item.tag)}`}>{item.tag}</span>}
                    {bagWeightLabel && <span className={`${txt} ${pad} rounded font-bold border bg-slate-100 text-slate-600 border-slate-200`}>{bagWeightLabel}</span>}
                </span>
            );
        };


        // چاپ از طریق یک پنجره‌ی مستقل: چون این برنامه گاهی داخل یک iframe/پیش‌نمایش محدودشده اجرا می‌شود،
        // فراخوانی مستقیم window.print() ممکن است توسط مرورگر مسدود شود و دکمه‌ی «چاپ» عملاً کاری نکند.
        // به‌جای آن، محتوای قابل‌چاپ را در یک پنجره‌ی تازه (خارج از هر محدودیتی) باز می‌کنیم و از همان‌جا چاپ می‌گیریم.
        // ارتفاعِ ناحیه‌ی قابل‌چاپِ هر سایز کاغذ (میلی‌متر، پرتره) منهای حاشیه‌ی 0.8cm بالا/پایین، به پیکسل CSS
        // (96px هر اینچ): قبلاً این عدد با اندازه‌گیریِ واحد vh در لحظه‌ی چاپ حدس زده می‌شد که در کروم همیشه
        // دقیقاً اندازه‌ی واقعیِ کاغذ را برنمی‌گرداند (گاهی اندازه‌ی خودِ پنجره را می‌دهد که از کاغذ بزرگ‌تر
        // است) و همین باعث می‌شد محتوا فکر کند جا دارد ولی در چاپ واقعی چند میلی‌متر اضافه بیاید و یک صفحه‌ی
        // دومِ تقریباً خالی بسازد. حالا این عدد مستقیماً از رویِ سایز واقعیِ کاغذِ انتخاب‌شده محاسبه می‌شود.
        const PX_PER_MM = 96 / 25.4;
        const PAPER_HEIGHT_MM = { A4: 297, A5: 210 };
        const printElementInNewWindow = (el, docTitle, paperSize) => {
            if (!el) return;
            const paper = PAPER_HEIGHT_MM[paperSize] ? paperSize : 'A4';
            const printableHeightPx = Math.floor((PAPER_HEIGHT_MM[paper] - 16) * PX_PER_MM);
            const printWin = window.open('', '_blank', 'width=900,height=1200');
            if (!printWin) {
                notifyToast('مرورگر اجازه‌ی باز شدن پنجره‌ی چاپ را نداد. لطفاً باز شدن پنجره‌های بازشو (Pop-up) را برای این صفحه مجاز کنید، یا از دکمه‌ی دانلود عکس (JPEG/PNG) استفاده کنید و همان فایل را چاپ بگیرید.');
                return;
            }
            printWin.document.write(`<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
<meta charset="utf-8" />
<title>${docTitle || 'چاپ'}</title>
<style>
  @font-face{font-family:'Vazirmatn';src:url(data:font/woff2;base64,${window.__VAZIRMATN_FONT_B64}) format('woff2');font-weight:100 900;font-style:normal;font-display:swap;}
  * { box-sizing: border-box; }
  body { font-family: 'Vazirmatn', sans-serif; margin: 0; padding: 8px; background: #fff; line-height: 1.3; }
  table { border-collapse: collapse; }
  /* ارتفاع html/body برابر ناحیه‌ی قابل‌چاپ و overflow:hidden → هر چه بیرون بزند صفحه‌ی دوم نمی‌سازد (فاکتور همیشه تک‌صفحه) */
  @media print { body { padding: 0; } html, body { height: ${printableHeightPx - 1}px; overflow: hidden; } #fit-root { break-after: avoid; page-break-after: avoid; } @page { size: ${paper}; margin: 0.8cm; } }
</style>
</head>
<body><div id="fit-root">${el.outerHTML}</div>
<script>
  // فاکتور با هر تعداد ردیف باید در یک برگه جا شود: اگر بلندتر از ناحیه‌ی چاپ بود، به نسبتِ لازم کوچک می‌شود.
  // سایز کاغذ از همین پنجره‌ی چاپ (${paper}) تعیین شده، پس ارتفاع قابل‌چاپ دقیقاً از روی آن محاسبه می‌شود،
  // نه با حدس‌زدنِ واحد vh (shortcut: فقط یک صفحه؛ اگر ردیف‌ها خیلی زیاد شوند ریزتر می‌شود).
  (function () {
    var root = document.getElementById('fit-root');
    var maxH = ${printableHeightPx};
    function fit() {
      root.style.zoom = 1;
      var z = 1;
      if (root.getBoundingClientRect().height > maxH) {
        z = Math.max(0.1, maxH / root.getBoundingClientRect().height);
        root.style.zoom = z;
        // حاشیه‌ی اطمینان: خطوط ۱px و گردکردن‌ها با زوم کوچک دقیقاً خطی کوچک نمی‌شوند، پس تا جا شدن کامل کمی کوچک‌تر می‌کنیم
        while (root.getBoundingClientRect().height > maxH - 2 && z > 0.1) { z *= 0.97; root.style.zoom = z; }
      }
    }
    window.addEventListener('beforeprint', fit);
    window.addEventListener('afterprint', function () { root.style.zoom = 1; });
    var mq = window.matchMedia('print');
    if (mq.addEventListener) mq.addEventListener('change', function (e) { if (e.matches) fit(); });
    // اگر فونت وزیرمتن (base64) دیرتر از محاسبه‌ی اول کامل لود شود، چیدمان کمی بزرگ‌تر می‌شود و همین
    // چند میلی‌متر اضافه باعث یک صفحه‌ی دومِ تقریباً خالی در چاپ می‌شود؛ پس بعد از لود کامل فونت دوباره fit می‌کنیم.
    fit();
    (document.fonts ? document.fonts.ready : Promise.resolve()).then(fit).catch(function(){}).then(function () { window.__readyToPrint = true; });
  })();
<\/script>
</body>
</html>`);
            printWin.document.close();
            const triggerPrint = () => { printWin.focus(); printWin.print(); };
            const waitFontsThenPrint = () => {
                const startedAt = Date.now();
                const check = () => {
                    if (printWin.closed) return;
                    if (printWin.__readyToPrint || Date.now() - startedAt > 1500) { triggerPrint(); return; }
                    setTimeout(check, 50);
                };
                check();
            };
            if (printWin.document.readyState === 'complete') {
                setTimeout(waitFontsThenPrint, 150);
            } else {
                printWin.onload = () => setTimeout(waitFontsThenPrint, 150);
            }
        };

        // تبدیل یک canvas رنگی به نسخه‌ی سیاه‌وسفیدِ تمیز — برای چاپگرهای غیررنگی، تا به‌جای خاکستریِ
        // نامنظم و کدرِ خودکارِ چاپگر، یک خروجی با پس‌زمینه‌ی سفیدِ یکدست و متن/خطوط مشکی واضح داشته باشیم.
        const canvasToBlackAndWhite = (canvas) => {
            const ctx = canvas.getContext('2d');
            const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const d = imgData.data;
            for (let i = 0; i < d.length; i += 4) {
                const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
                // افزایش کنتراست حول محور خاکستری، سپس روشن‌های نزدیک به سفید را کاملاً سفید می‌کنیم
                let v = (gray - 128) * 1.6 + 128;
                v = Math.max(0, Math.min(255, v));
                if (v > 232) v = 255;
                d[i] = d[i + 1] = d[i + 2] = v;
            }
            ctx.putImageData(imgData, 0, 0);
            return canvas;
        };

        const numberToPersianWords = (number) => {
            if (number === 0) return 'صفر';
            const nav = ["", "یک", "دو", "سه", "چهار", "پنج", "شش", "هفت", "هشت", "نه"];
            const dah = ["", "", "بیست", "سی", "چهل", "پنجاه", "شصت", "هفتاد", "هشتاد", "نود"];
            const sad = ["", "صد", "دویست", "سیصد", "چهارصد", "پانصد", "ششصد", "هفتصد", "هشتصد", "نهصد"];
            const bases = ["", "هزار", "میلیون", "میلیارد"];
            
            const splitHundreds = (n) => {
                if (n === 0) return "";
                if (n < 10) return nav[n];
                if (n < 20) return ["ده", "یازده", "دوازده", "سیزده", "چهارده", "پانزده", "شانزده", "هفده", "هجده", "نوزده"][n-10];
                if (n < 100) return dah[Math.floor(n/10)] + (n%10 ? " و " + nav[n%10] : "");
                return sad[Math.floor(n/100)] + (n%100 ? " و " + splitHundreds(n%100) : "");
            };
            
            let str = "", i = 0;
            while (number > 0) {
                let chunk = number % 1000;
                if (chunk > 0) {
                    str = splitHundreds(chunk) + (bases[i] ? " " + bases[i] : "") + (str ? " و " + str : "");
                }
                number = Math.floor(number / 1000);
                i++;
            }
            return str;
        };

        const FormattedInput = ({ value, onChange, className, placeholder, required, autoFocus, disabled }) => {
            const handleChange = (e) => {
                let rawValue = toEnglishDigits(e.target.value).replace(/[^0-9.]/g, '');
                // فقط اولین نقطه‌ی اعشار معتبر است؛ بقیه حذف می‌شوند تا مقدار همیشه یک عدد معتبر باشد
                const firstDot = rawValue.indexOf('.');
                if (firstDot !== -1) rawValue = rawValue.slice(0, firstDot + 1) + rawValue.slice(firstDot + 1).replace(/\./g, '');
                onChange(rawValue);
            };
            return (
                <input type="text" inputMode="numeric" className={className} placeholder={placeholder} value={formatNumber(value)} onChange={handleChange} required={required} autoFocus={autoFocus} disabled={disabled} />
            );
        };

        const displayGrams = (g) => g >= 1000 ? `${g/1000} کیلوگرم` : `${formatNumber(g)} گرم`;

        // مقدار رزروشده هر کالا از سفارش‌های آنالیز/پردازش که هنوز ارسال نشده‌اند (status: reserved).
        // این اقلام هنوز فیزیکاً از انبار کسر نشده‌اند، اما باید مثل فاکتورهای «در انتظار» از موجودیِ
        // قابل‌فروش/قابل‌رزرو کسر شوند تا دوباره برای فروش یا ارسال دیگری در نظر گرفته نشوند.
        const WAREHOUSE_COLOR_OPTIONS = ['slate', 'indigo', 'red', 'emerald', 'blue', 'orange', 'purple', 'pink', 'teal', 'amber'];
        const WAREHOUSE_COLOR_STYLES = {
            slate:   { bg: 'bg-slate-100',   text: 'text-slate-600',   border: 'border-slate-200',   dot: 'bg-slate-500' },
            indigo:  { bg: 'bg-indigo-50',    text: 'text-indigo-700',  border: 'border-indigo-200',  dot: 'bg-indigo-500' },
            red:     { bg: 'bg-red-50',       text: 'text-red-600',     border: 'border-red-200',     dot: 'bg-red-500' },
            emerald: { bg: 'bg-emerald-50',   text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
            blue:    { bg: 'bg-blue-50',      text: 'text-blue-600',    border: 'border-blue-200',    dot: 'bg-blue-500' },
            orange:  { bg: 'bg-orange-50',    text: 'text-orange-600',  border: 'border-orange-200',  dot: 'bg-orange-500' },
            purple:  { bg: 'bg-purple-50',    text: 'text-purple-600',  border: 'border-purple-200',  dot: 'bg-purple-500' },
            pink:    { bg: 'bg-pink-50',      text: 'text-pink-600',    border: 'border-pink-200',    dot: 'bg-pink-500' },
            teal:    { bg: 'bg-teal-50',      text: 'text-teal-700',    border: 'border-teal-200',    dot: 'bg-teal-500' },
            amber:   { bg: 'bg-amber-50',     text: 'text-amber-700',   border: 'border-amber-200',   dot: 'bg-amber-500' },
        };
        const getWarehouseById = (warehouses, id) => (warehouses || []).find(w => w.id === id) || null;
        const WarehouseBadge = ({ warehouse, size = 'sm' }) => {
            if (!warehouse) return <span className="text-[10px] text-slate-500 whitespace-nowrap">— بدون انبار —</span>;
            const st = WAREHOUSE_COLOR_STYLES[warehouse.color] || WAREHOUSE_COLOR_STYLES.slate;
            return (
                <span className={`inline-flex items-center gap-1 ${st.bg} ${st.text} border ${st.border} rounded-md font-bold ${size === 'sm' ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-1'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`}></span>{warehouse.name}
                </span>
            );
        };

        // مجموع مقدارِ خرید‌های «در راه» (هنوز وارد انبار فیزیکی نشده) به تفکیک کالا؛ این مقدار جزو موجودی واقعی نیست
        // اما متعلق به کاربر است و باید جدا از موجودی فیزیکی و رزروهای دیگر نمایش داده شود
        const getPurchaseIncomingMap = (purchases) => {
            const map = {};
            (purchases || []).filter(p => p.status === 'in_transit').forEach(p => {
                (p.items || []).forEach(i => {
                    const key = i.itemId || `manual:${i.name}|${i.brand || ''}|${i.tag || ''}`;
                    map[key] = (map[key] || 0) + (Number(i.qty) || 0);
                });
            });
            return map;
        };

        // از میان خریدهای «در راه»، فقط آن‌هایی که کاربر صراحتاً علامت زده «برای پیش‌فروش جزو موجودی حساب شود»
        const getPurchaseSellableIncomingMap = (purchases) => {
            const map = {};
            (purchases || []).filter(p => p.status === 'in_transit' && p.countAsStock).forEach(p => {
                (p.items || []).forEach(i => {
                    if (!i.itemId) return; // کالای دستی/جدید بدون شناسه قابل پیش‌فروش نیست
                    map[i.itemId] = (map[i.itemId] || 0) + (Number(i.qty) || 0);
                });
            });
            return map;
        };

        const getProcessingReservedMap = (processingOrders) => {
            const map = {};
            (processingOrders || []).filter(o => o.status === 'reserved').forEach(o => {
                (o.items || []).forEach(i => {
                    if (!i.itemId) return;
                    map[i.itemId] = (map[i.itemId] || 0) + (Number(i.qty) || 0);
                });
            });
            return map;
        };

