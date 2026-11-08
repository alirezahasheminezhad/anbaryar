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
        const EMBEDDED_ESTELAM_HTML = decodeEmbeddedHTML(EMBEDDED_ESTELAM_B64);

        const EmbeddedToolView = ({ type }) => {
            // «مدیریت خرید کاربران» طبق درخواست کاربر کاملاً حذف شد؛ این کامپوننت فقط برای «استعلام» باقی مانده.
            const srcDoc = EMBEDDED_ESTELAM_HTML;
            const label = 'استعلام';
            return (
                <div className="space-y-3" dir="rtl">
                    <div className="bg-[#f6f6f5] rounded-[30px] p-4 flex items-center gap-3">
                        <div className="w-11 h-11 rounded-full bg-white text-[#e5654a] flex items-center justify-center shrink-0"><FileText size={18}/></div>
                        <div><h3 className="font-black text-slate-800">استعلام</h3><p className="text-[11px] text-slate-400 mt-0.5">ابزار مستقل استعلام قیمت/کالا — در یک محیط ایزوله اجرا می‌شود</p></div>
                    </div>
                    <div className="w-full h-[calc(100vh-200px)] min-h-[640px] bg-[#ededec] rounded-[32px] overflow-hidden">
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

