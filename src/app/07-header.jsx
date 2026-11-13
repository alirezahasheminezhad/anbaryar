//## ═══ app/07-header.jsx ═══
//## TopNav: نوار بالای صفحه (لوگو، منوی گرد شناور، اعلان بحرانی، قفل). جایگزین Sidebar/Header قدیمی.
//## ترتیب فایل‌ها در build.py مهم است؛ همه‌ی بخش‌ها یک scope مشترک دارند.
        // --- Components ---

        const TopNav = ({ view, setView, items, invoices, reservedCounts, lowStockThreshold = 100, lastSaved, saveError }) => {
            const [moreOpen, setMoreOpen] = useState(false);
            const moreRef = useRef(null);
            useEffect(() => {
                const h = (e) => { if (moreRef.current && !moreRef.current.contains(e.target)) setMoreOpen(false); };
                document.addEventListener('mousedown', h);
                return () => document.removeEventListener('mousedown', h);
            }, []);
            const isOnline = navigator.onLine;

            // آیتم‌های اصلی در خودِ نوار؛ بقیه زیر «بیشتر». id/برچسب‌ها همان منوی قبلی ساید‌بار است.
            const primary = [
                { id: 'dashboard', label: 'داشبورد' },
                { id: 'pos', label: 'فاکتور فروش' },
                { id: 'history', label: 'فاکتورها' },
                { id: 'purchases', label: 'خرید کالا' },
                { id: 'reminders', label: 'سررسیدها' },
                { id: 'inventory-master', label: 'گزارش‌ها' },
            ];
            const more = [
                { id: 'mahak-import', label: 'همگام‌سازی موجودی محک', icon: FileSpreadsheet },
                { id: 'check-rass', label: 'راس‌گیری چک', icon: Landmark },
                { id: 'estelam', label: 'استعلام', icon: FileText },
                { id: 'notes', label: 'یادداشت‌ها', icon: ClipboardList },
                { id: 'settings', group: 'settings', label: 'تنظیمات', icon: Settings },
            ];
            const isActive = (item) => item.group ? getViewGroup(view)?.id === item.group : view === item.id;
            const go = (id) => { setMoreOpen(false); setView(id); };

            // اعلان فعال سررسید: تعداد فاکتورهای نسیه‌ی تسویه‌نشده که سررسیدشان امروز یا گذشته است
            const dueAlertCount = (invoices || []).filter(inv => {
                if (!inv.dueDate || inv.status === 'cancelled' || inv.paymentStatus === 'settled') return false;
                const u = getDueUrgency(inv.dueDate);
                return u === 'overdue' || u === 'today';
            }).length;
            // بارهای بحرانی: صفر/منفی یا رسیدن موجودی آزاد به آستانه هشدار عمومی/اختصاصی کالا
            const settings = loadSettings();
            const muteMap = settings.criticalMutes || {};
            const now = Date.now();
            const criticalItems = (items || []).filter(i => {
                const reserved = (reservedCounts && reservedCounts[i.id]) || 0;
                const low = getLowStockState(i, reserved, lowStockThreshold);
                const isCritical = Number(i.quantity) <= 0 || low.isLowStock;
                const muteUntil = Number(muteMap[i.id] || 0);
                const isMuted = muteUntil === -1 || muteUntil > now;
                return isCritical && !isMuted;
            });
            const moreActive = more.some(isActive) || view === 'critical';
            const iconBtn = 'relative w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-slate-600 hover:text-indigo-700 transition cursor-pointer';

            return (
                <header className="no-print shrink-0 px-4 md:px-8 pt-4 pb-1 relative z-40">
                    <div className="max-w-[1400px] mx-auto flex flex-wrap md:flex-nowrap items-center justify-between gap-3">
                        <button onClick={() => go('dashboard')} aria-label="انبار یار، رفتن به داشبورد" className="flex items-center gap-2.5 shrink-0 cursor-pointer">
                            <span className="w-10 h-10 rounded-xl bg-indigo-900 text-white flex items-center justify-center"><Warehouse size={20}/></span>
                            <span className="hidden sm:block text-right leading-tight">
                                <span className="block text-base font-black text-indigo-900">انبار یار</span>
                                <span className="block text-[11px] text-slate-500">مدیریت هوشمند موجودی</span>
                            </span>
                        </button>

                        <nav aria-label="ناوبری اصلی" className="order-last basis-full md:order-none md:basis-auto md:flex-1 min-w-0 flex justify-center">
                            <div ref={moreRef} className="relative max-w-full bg-white/95 backdrop-blur rounded-full shadow-md px-2 py-1.5 flex items-center gap-1">
                                <div className="flex items-center gap-1 overflow-x-auto min-w-0">
                                    {primary.map(item => (
                                        <button key={item.id} onClick={() => go(item.id)} aria-current={isActive(item) ? 'page' : undefined}
                                            className={`h-10 px-4 rounded-full text-sm whitespace-nowrap transition cursor-pointer ${isActive(item) ? 'font-black text-indigo-900 bg-indigo-50' : item.id === 'reminders' && dueAlertCount > 0 ? 'font-bold text-amber-700 bg-amber-50 hover:bg-amber-100' : 'font-medium text-slate-500 hover:text-indigo-900 hover:bg-slate-100'}`}>
                                            {item.label}
                                            {item.id === 'reminders' && dueAlertCount > 0 && <span className="mr-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-200 text-amber-800">{dueAlertCount}</span>}
                                        </button>
                                    ))}
                                </div>
                                <button onClick={() => setMoreOpen(o => !o)} aria-haspopup="menu" aria-expanded={moreOpen}
                                    className={`h-10 px-3.5 rounded-full text-sm whitespace-nowrap shrink-0 flex items-center gap-1 transition cursor-pointer ${moreActive ? 'font-black text-indigo-900 bg-indigo-50' : 'font-medium text-slate-500 hover:text-indigo-900 hover:bg-slate-100'}`}>
                                    بیشتر <ChevronDown size={14} className={moreOpen ? 'rotate-180 transition' : 'transition'}/>
                                </button>
                                {moreOpen && (
                                    <div role="menu" className="absolute top-full left-0 mt-2 w-60 bg-white rounded-2xl shadow-xl border border-slate-100 p-1.5 z-50">
                                        {more.map(item => (
                                            <button key={item.id} role="menuitem" onClick={() => go(item.id)}
                                                className={`w-full flex items-center gap-2.5 px-3 h-11 rounded-xl text-sm text-right transition cursor-pointer ${isActive(item) ? 'font-black text-indigo-900 bg-indigo-50' : 'font-medium text-slate-600 hover:bg-slate-100'}`}>
                                                <item.icon size={16}/> {item.label}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </nav>

                        <div className="flex items-center gap-2 shrink-0">
                            {saveError ? (
                                <div className="hidden xl:flex items-center gap-1.5 h-9 text-[11px] font-bold text-red-700 bg-red-50 px-3 rounded-full" title="آخرین ذخیره‌سازی ناموفق بود؛ از پشتیبان‌گیری یک نسخه‌ی خارجی بگیرید.">
                                    <AlertTriangle size={13} /> ذخیره ناموفق
                                </div>
                            ) : lastSaved && (
                                <div className="hidden xl:flex items-center gap-1.5 h-9 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-3 rounded-full">
                                    <CloudCheck size={13} /> ذخیره شد {lastSaved.toLocaleTimeString('fa-IR')}
                                </div>
                            )}
                            {!isOnline && <div className="text-slate-400" title="حالت آفلاین"><WifiOff size={16} /></div>}
                            <button onClick={() => setView('critical')} className={iconBtn} aria-label={criticalItems.length > 0 ? `بارهای بحرانی (${criticalItems.length})` : 'بارهای بحرانی'} title="بارهای بحرانی">
                                <Bell size={18}/>
                                {criticalItems.length > 0 && <span className="absolute top-2 left-2.5 w-2.5 h-2.5 rounded-full bg-red-500 ring-2 ring-white"/>}
                            </button>
                            <button onClick={() => window.dispatchEvent(new Event('anbaryar:open-security'))} className={iconBtn} aria-label="امنیت و قفل برنامه" title="امنیت و قفل برنامه"><ShieldCheck size={18}/></button>
                        </div>
                    </div>
                </header>
            );
        };
