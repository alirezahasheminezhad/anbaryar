//## ═══ app/07-header.jsx ═══
//## کامپوننت Header (نوار بالا).
//## ترتیب فایل‌ها در build.py مهم است؛ همه‌ی بخش‌ها یک scope مشترک دارند.
        // --- Components ---

        const Header = ({ lastSaved, title }) => {
            const isOnline = navigator.onLine;
            return (
                <header className="bg-white/90 backdrop-blur-md rounded-2xl md:rounded-3xl border border-slate-200/70 shadow-md shadow-indigo-900/5 sticky top-2 md:top-4 z-30 no-print mb-1">
                    <div className="w-full px-4 md:px-6 py-3 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                            <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 p-2 rounded-2xl text-white shadow-md shadow-indigo-900/20 ring-1 ring-brass-300/40 shrink-0">
                                <PackageOpen size={18} />
                            </div>
                            <div className="shrink-0 leading-tight">
                                <h1 className="text-sm font-bold text-slate-800 leading-tight tracking-tight">انبار یار</h1>
                                <p className="text-[10px] text-slate-400 font-medium leading-tight">مدیریت هوشمند موجودی</p>
                            </div>
                            {title && (
                                <>
                                    <div className="h-8 w-px bg-gradient-to-b from-transparent via-slate-300 to-transparent mx-1 shrink-0 hidden sm:block"></div>
                                    <h2 className="text-base font-bold text-slate-700 truncate hidden sm:block">{title}</h2>
                                </>
                            )}
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                            {lastSaved && (
                                <div className="flex items-center gap-1.5 text-[10px] font-medium text-emerald-600 bg-emerald-50 px-2.5 py-1.5 rounded-full border border-emerald-100">
                                    <CloudCheck size={12} />
                                    <span>ذخیره شد {lastSaved.toLocaleTimeString('fa-IR')}</span>
                                </div>
                            )}
                            <button onClick={()=>window.dispatchEvent(new Event('anbaryar:open-security'))} title="امنیت و قفل برنامه" className="p-2.5 rounded-2xl border transition bg-slate-50 border-slate-200 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 cursor-pointer"><ShieldCheck size={15}/></button>
                            {!isOnline && (
                                <div className="flex items-center gap-1 text-slate-400 text-xs" title="حالت آفلاین"><WifiOff size={14} /></div>
                            )}
                        </div>
                    </div>
                    {title && <h2 className="sm:hidden px-4 pb-3 text-base font-bold text-slate-700 truncate">{title}</h2>}
                </header>
            );
        };

