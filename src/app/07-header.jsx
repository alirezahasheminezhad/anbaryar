//## ═══ app/07-header.jsx ═══
//## TopNav: نوار بالای صفحه (لوگو، منوی گرد شناور، اعلان بحرانی، قفل). جایگزین Sidebar/Header قدیمی.
//## ترتیب فایل‌ها در build.py مهم است؛ همه‌ی بخش‌ها یک scope مشترک دارند.
        // --- Components ---

        const TopNav = ({ view, setView, items, invoices, reservedCounts, lowStockThreshold = 100, lastSaved, saveError, cloudAccount = null, cloudSyncStatus = 'idle' }) => {
            const [moreOpen, setMoreOpen] = useState(false);
            const [cloudOpen, setCloudOpen] = useState(false);
            const moreRef = useRef(null);
            const cloudRef = useRef(null);
            useEffect(() => {
                const h = (e) => {
                    if (moreRef.current && !moreRef.current.contains(e.target)) setMoreOpen(false);
                    if (cloudRef.current && !cloudRef.current.contains(e.target)) setCloudOpen(false);
                };
                document.addEventListener('mousedown', h);
                return () => document.removeEventListener('mousedown', h);
            }, []);
            const isOnline = navigator.onLine;
            const cloudUser = cloudAccount?.user || null;
            const googleIdentity = (cloudAccount?.identities || []).find(identity => identity.provider === 'google');
            const cloudProviders = cloudUser?.app_metadata?.providers || [];
            const isGoogleConnected = !!googleIdentity ||
                cloudUser?.app_metadata?.provider === 'google' ||
                cloudProviders.includes('google') ||
                cloudUser?.user_metadata?.provider === 'google';
            const googleProfile = googleIdentity?.identity_data || {};
            const cloudAvatar = googleProfile.avatar_url || googleProfile.picture ||
                cloudUser?.user_metadata?.avatar_url || cloudUser?.user_metadata?.picture || '';
            const cloudEmail = cloudUser?.email || googleProfile.email || '';
            const cloudStatusLabel = cloudSyncStatus === 'synced' ? 'همگام‌سازی به‌روز' :
                cloudSyncStatus === 'syncing' ? 'در حال همگام‌سازی…' :
                cloudSyncStatus === 'offline' ? 'آفلاین؛ اطلاعات محلی محفوظ است' :
                cloudSyncStatus === 'conflict' ? 'نیاز به انتخاب نسخه' :
                cloudSyncStatus === 'error' ? 'خطا در همگام‌سازی' : 'وضعیت همگام‌سازی بررسی نشده';
            const cloudDot = isGoogleConnected ? 'bg-emerald-500' :
                cloudUser?.is_anonymous ? 'bg-amber-400' : 'bg-slate-400';

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
                            <div ref={cloudRef} className="relative">
                                <button onClick={() => setCloudOpen(open => !open)} aria-haspopup="menu" aria-expanded={cloudOpen}
                                    className={`relative w-10 h-10 rounded-full bg-white shadow-sm border flex items-center justify-center overflow-hidden transition cursor-pointer ${isGoogleConnected ? 'border-emerald-200 ring-2 ring-emerald-50' : 'border-slate-100 hover:border-indigo-200'}`}
                                    aria-label="وضعیت اتصال ابری انبار یار" title={isGoogleConnected ? 'حساب Google متصل است' : 'اتصال حساب Google'}>
                                    {isGoogleConnected && cloudAvatar
                                        ? <img src={cloudAvatar} alt="عکس پروفایل Google" referrerPolicy="no-referrer" className="w-full h-full object-cover"/>
                                        : <Cloud size={19} className={isGoogleConnected ? 'text-emerald-600' : 'text-slate-500'}/>}
                                    <span className={`absolute bottom-0.5 left-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-white ${cloudDot}`}/>
                                </button>
                                {cloudOpen && (
                                    <div role="menu" dir="rtl" className="absolute left-0 top-full mt-2 w-72 max-w-[85vw] rounded-2xl bg-white border border-slate-100 shadow-xl p-3 z-50">
                                        <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                                            <div className="w-11 h-11 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden shrink-0">
                                                {isGoogleConnected && cloudAvatar ? <img src={cloudAvatar} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover"/> : <Cloud size={20} className="text-slate-500"/>}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-black text-slate-800">{isGoogleConnected ? 'حساب Google متصل' : cloudUser?.is_anonymous ? 'حساب موقت این دستگاه' : 'اتصال ابری انبار یار'}</p>
                                                <p dir="ltr" className="text-[11px] text-slate-500 truncate text-right mt-0.5">{cloudEmail || (cloudUser?.is_anonymous ? 'هنوز به Google متصل نشده' : 'برای مشاهده وضعیت، تنظیمات را باز کنید')}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 px-1 py-3 text-xs text-slate-600">
                                            <span className={`w-2 h-2 rounded-full shrink-0 ${cloudSyncStatus === 'error' || cloudSyncStatus === 'conflict' ? 'bg-amber-500' : cloudSyncStatus === 'synced' ? 'bg-emerald-500' : cloudSyncStatus === 'syncing' ? 'bg-blue-500' : 'bg-slate-300'}`}/>
                                            {cloudStatusLabel}
                                        </div>
                                        <button onClick={() => { setCloudOpen(false); setView('backup'); }} className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-3 transition">
                                            {isGoogleConnected ? 'مدیریت اتصال و همگام‌سازی' : 'اتصال Google و تنظیمات ابری'}
                                        </button>
                                    </div>
                                )}
                            </div>
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
