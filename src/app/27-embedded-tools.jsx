//## ═══ app/27-embedded-tools.jsx ═══
//## رمزگشایی و نمایش افزونه‌های داخلی (EmbeddedToolView).
//## ترتیب فایل‌ها در build.py مهم است؛ همه‌ی بخش‌ها یک scope مشترک دارند.
        const decodeEmbeddedHTML = (b64) => {
            try {
                const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
                return new TextDecoder('utf-8').decode(bytes);
            } catch (e) {
                return decodeURIComponent(escape(atob(b64)));
            }
        };
        // هم‌رنگ‌سازی با سیستم طراحی انبار یار (آبی/سرمه‌ای). فقط رنگ‌ها و متغیرهای CSS در لحظه‌ی بارگذاری عوض می‌شوند؛
        // منطق و ساختار برنامه‌ی استعلام دست‌نخورده می‌ماند. اگر رنگ‌های اصلی آن عوض شد، این جدول را به‌روز کنید.
        const ESTELAM_COLOR_MAP = [['#111','#14214f'],['#e5654a','#1d5eea'],['#c94a29','#1749c2'],['#fdece6','#e0e9ff'],['#efefed','#eef2f8'],['#ededec','#e9eff6'],['#f6f6f5','#f5f8fc'],['#a3a3a0','#6b7a94'],['#a9a9a6','#6b7a94']];
        const themeEstelamHTML = (html) => {
            let out = html;
            ESTELAM_COLOR_MAP.forEach(([a, b]) => { out = out.replace(new RegExp(a + '(?![0-9a-fA-F])', 'gi'), b); });
            const vars = '<style>:root{--bg:#e9eff6;--bg-soft:#f5f8fc;--ink:#14214f;--ink-soft:#4b5b78;--ink-faint:#6b7a94;--line:#e1e8f2;--line-soft:#eef2f8;--primary:#1d5eea;--primary-dark:#1749c2;--primary-light:#e0e9ff;--teal:#1d5eea;--teal-soft:#e0e9ff;--tile:#f5f8fc;--radius:24px;--shadow:0 1px 2px rgba(20,33,79,.04),0 8px 24px -10px rgba(20,33,79,.14)}</style>';
            return out.includes('</head>') ? out.replace('</head>', vars + '</head>') : vars + out;
        };
        const EMBEDDED_ESTELAM_HTML = themeEstelamHTML(decodeEmbeddedHTML(EMBEDDED_ESTELAM_B64));

        const EmbeddedToolView = ({ type }) => {
            // «مدیریت خرید کاربران» طبق درخواست کاربر کاملاً حذف شد؛ این کامپوننت فقط برای «استعلام» باقی مانده.
            const srcDoc = EMBEDDED_ESTELAM_HTML;
            const label = 'استعلام';
            return (
                <div className="space-y-3" dir="rtl">
                    <div className="bg-white rounded-3xl shadow-sm p-4 flex items-center gap-3">
                        <div className="w-11 h-11 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0"><FileText size={18}/></div>
                        <div><h3 className="font-black text-slate-800">استعلام</h3><p className="text-[11px] text-slate-400 mt-0.5">ابزار مستقل استعلام قیمت/کالا — در یک محیط ایزوله اجرا می‌شود</p></div>
                    </div>
                    <div className="w-full h-[calc(100vh-200px)] min-h-[640px] bg-slate-100 rounded-3xl overflow-hidden">
                    <iframe
                        title={label}
                        srcDoc={srcDoc}
                        className="w-full h-full border-0 bg-white"
                        style={{ display:'block', width:'100%', height:'100%', border:0 }}
                        allow="clipboard-read; clipboard-write; downloads"
                    />
                    </div>
                </div>
            );
        };

