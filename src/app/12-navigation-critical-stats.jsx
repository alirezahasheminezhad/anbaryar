//## ═══ app/12-navigation-critical-stats.jsx ═══
//## ناوبری (VIEW_GROUPS، GroupTabs، Sidebar)، اقلام بحرانی، آمار موجودی.
//## ترتیب فایل‌ها در build.py مهم است؛ همه‌ی بخش‌ها یک scope مشترک دارند.
        const VIEW_GROUPS = [
            { id: 'flows', label: 'گردش کالا', tabs: [{ id: 'purchases', group: 'flows', label: 'گردش کالا', icon: ArrowDownLeft }, { id: 'processing', label: 'آنالیز / پردازش', icon: RefreshCw }, { id: 'consignments', label: 'امانی (قرض بار)', icon: Handshake }] },
            { id: 'reports', label: 'مرکز گزارش‌ها', tabs: [{ id: 'inventory-master', group: 'reports', label: 'مرکز گزارش‌ها', icon: Table2 }, { id: 'today-exits', label: 'خروج امروز', icon: Truck }, { id: 'partial-shipments', label: 'بارهای نیمه‌رفته', icon: PackageOpen }, { id: 'mother-bag-stock', label: 'موجودی کیسه مادر', icon: Layers }, { id: 'item-flow', label: 'کجا رفت؟ (گردش کالا)', icon: FileBarChart }] },
            { id: 'settings', label: 'تنظیمات', tabs: [{ id: 'settings', label: 'تنظیمات برنامه', icon: Settings }, { id: 'backup', label: 'پشتیبان‌گیری کلی', icon: Save }, { id: 'docs', label: 'مستندات', icon: FileText }] },
        ];
        const getViewGroup = (v) => VIEW_GROUPS.find(g => g.tabs.some(t => t.id === v));
        const GroupTabs = ({ view, setView }) => {
            const g = getViewGroup(view);
            if (!g) return null;
            return (
                <div className="no-print mb-5 bg-white rounded-2xl border border-slate-200 shadow-sm p-1.5 flex gap-1 overflow-x-auto" role="tablist" aria-label={g.label}>
                    {g.tabs.map(t => (
                        <button key={t.id} role="tab" aria-selected={view === t.id} onClick={() => setView(t.id)} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap border-r-4 transition-all cursor-pointer ${view === t.id ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/20 border-brass-400' : 'border-transparent text-slate-600 hover:bg-indigo-50 hover:text-indigo-700'}`}><t.icon size={16}/>{t.label}</button>
                    ))}
                </div>
            );
        };

        const Sidebar = ({ view, setView, items, invoices, reservedCounts, lowStockThreshold = 100 }) => {
            const menu = [
                { id: 'dashboard', label: 'داشبورد و موجودی', icon: LayoutDashboard },
                { id: 'mahak-import', label: 'همگام‌سازی موجودی محک', icon: FileSpreadsheet },
                { id: 'pos', label: 'فاکتور فروش (وزنی)', icon: Scale },
                { id: 'history', label: 'گزارش فاکتورها', icon: History },
                { id: 'purchases', label: 'خرید کالا (در راه)', icon: ArrowDownLeft },
                { id: 'reminders', label: 'سررسیدها و پیگیری', icon: Bell },
                { id: 'check-rass', label: 'راس‌گیری چک', icon: Landmark },
                { id: 'inventory-master', label: 'گزارش مرکزی موجودی', icon: Table2 },
                { id: 'estelam', label: 'استعلام', icon: FileText },
                { id: 'notes', label: 'یادداشت‌ها', icon: ClipboardList },
                { id: 'settings', group: 'settings', label: 'تنظیمات', icon: Settings },
            ];
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
            return (
                <div className="w-full md:w-64 bg-white text-slate-600 flex flex-col md:h-screen md:sticky md:top-0 z-40 no-print shrink-0 md:m-2 md:rounded-3xl md:border md:border-slate-200/70 shadow-md shadow-indigo-900/5 overflow-hidden">
                    <div className="hidden md:block h-[3px] w-full bg-gradient-to-l from-indigo-700 via-brass-400 to-indigo-700 shrink-0" />
                    <div className="p-5 flex items-center gap-3 text-slate-800 border-b border-slate-100">
                        <div className="bg-gradient-to-br from-brass-400 to-brass-600 p-2 rounded-xl shadow-lg shadow-brass-900/20 ring-1 ring-brass-300/40"><Store size={22} className="text-white"/></div>
                        <div><h1 className="font-bold text-lg tracking-tight">انبار یار</h1><p className="text-[10px] text-brass-500/90 tracking-wide">نسخه جامع</p></div>
                    </div>
                    {/* رفع باگ ساید‌بار: با اضافه‌شدن آیتم‌های جدید، تعداد کل آیتم‌ها از ارتفاع صفحه بیشتر شده بود؛
                        قبلاً overflow-visible بود (یعنی هیچ اسکرولی نداشت) و آیتم‌های پایینی از صفحه بیرون/روی هم می‌افتادند.
                        حالا خودِ منو در دسکتاپ به‌صورت مستقل اسکرول می‌شود، هدر بالا ثابت می‌ماند. */}
                    <nav className="flex-1 min-h-0 p-3 space-y-2 overflow-x-auto flex md:flex-col md:overflow-y-auto md:overflow-x-visible">
                        {menu.map(item => (
                            <React.Fragment key={item.id}>
                                {item.id === 'settings' && criticalItems.length > 0 && (
                                    /* فقط یک دکمه با تعداد نشان داده می‌شود؛ لیست کامل با کلیک، در یک
                                       بخش/صفحه‌ی جداگانه (view === 'critical') باز می‌شود، نه از قبل داخل ساید‌بار. */
                                    <button
                                        type="button"
                                        onClick={() => setView('critical')}
                                        className={`w-full flex items-center justify-between gap-2 text-xs font-bold rounded-xl p-3 md:my-1 shrink-0 border transition-colors cursor-pointer ${view === 'critical' ? 'bg-red-100 border-red-300 text-red-800' : 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100'}`}
                                    >
                                        <span className="flex items-center gap-1.5"><AlertTriangle size={14}/> بارهای بحرانی ({criticalItems.length})</span>
                                        <ChevronLeft size={14} className="opacity-70"/>
                                    </button>
                                )}
                                <button onClick={() => setView(item.id)} className={`flex items-center gap-3 pr-3 pl-4 py-3 rounded-xl transition-all w-full text-sm font-medium whitespace-nowrap border-r-4 cursor-pointer ${(item.group ? getViewGroup(view)?.id === item.group : view === item.id) ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/30 border-brass-400' : item.id === 'reminders' && dueAlertCount > 0 ? 'border-transparent text-amber-700 bg-amber-50 hover:bg-amber-100' : 'border-transparent text-slate-600 hover:bg-indigo-50 hover:text-indigo-700'}`}>
                                    <item.icon size={18} /> {item.label}
                                    {item.id === 'reminders' && dueAlertCount > 0 && <span className={`mr-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full ${view === 'reminders' ? 'bg-white/20 text-white' : 'bg-amber-200 text-amber-800'}`}>{dueAlertCount}</span>}
                                </button>
                            </React.Fragment>
                        ))}
                    </nav>
                </div>
            );
        };

        const CriticalItemsView = ({ items, reservedCounts, onSelectItem, criticalMutes = {}, onToggleMute, lowStockThreshold = 100, criticalGroups = [], onSaveCriticalGroups }) => {
            const [sort, setSort] = React.useState('severity');
            const [selectedGroupId, setSelectedGroupId] = React.useState(null);
            const [newGroupName, setNewGroupName] = React.useState('');
            const [manageItemId, setManageItemId] = React.useState(null);
            const now = Date.now();
            const criticalItems = (items || []).filter(i => {
                const reserved = (reservedCounts && reservedCounts[i.id]) || 0;
                const low = getLowStockState(i, reserved, lowStockThreshold);
                return Number(i.quantity) <= 0 || low.isLowStock;
            }).map(i => {
                const reserved = (reservedCounts && reservedCounts[i.id]) || 0;
                const available = Number(i.quantity) - Number(reserved);
                const low = getLowStockState(i, reserved, lowStockThreshold);
                const muteUntil = Number(criticalMutes[i.id] || 0);
                const muted = muteUntil === -1 || muteUntil > now;
                return {...i, available, muted, muteUntil, lowState: low};
            }).sort((a,b) => {
                if (sort === 'newest') return (b.lastUpdated||0)-(a.lastUpdated||0);
                if (sort === 'name') return (a.name||'').localeCompare(b.name||'', 'fa');
                return a.available-b.available;
            });
            const visibleItems = selectedGroupId ? criticalItems.filter(i => (criticalGroups.find(g=>g.id===selectedGroupId)?.itemIds||[]).includes(i.id)) : criticalItems;
            const activeCount = criticalItems.filter(x => !x.muted).length;
            const toggle = (id, mode) => onToggleMute && onToggleMute(id, mode);
            const saveGroups = (groups) => onSaveCriticalGroups && onSaveCriticalGroups(groups);
            const addGroup = () => {
                const name = newGroupName.trim();
                if (!name) return;
                saveGroups([...criticalGroups, { id: generateId(), name, itemIds: [] }]);
                setNewGroupName('');
            };
            const deleteGroup = (id) => {
                saveGroups(criticalGroups.filter(g => g.id !== id));
                if (selectedGroupId === id) setSelectedGroupId(null);
            };
            const toggleItemInGroup = (groupId, itemId) => {
                saveGroups(criticalGroups.map(g => g.id !== groupId ? g : { ...g, itemIds: g.itemIds.includes(itemId) ? g.itemIds.filter(x => x !== itemId) : [...g.itemIds, itemId] }));
            };
            return (
                <div className="space-y-4">
                    <div className="bg-white rounded-3xl border border-red-100 shadow-sm p-4">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                            <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0"><AlertTriangle size={19}/></div><div><div className="flex items-center gap-2"><h3 className="font-black text-red-700">بارهای بحرانی</h3><span className="px-2.5 py-1 rounded-full bg-red-100 text-red-700 text-[10px] font-bold">{activeCount} هشدار فعال</span></div><p className="text-[11px] text-slate-400 mt-1">Mute فقط اعلان را خاموش می‌کند؛ وضعیت واقعی موجودی تغییر نمی‌کند.</p></div></div>
                            <select value={sort} onChange={e=>setSort(e.target.value)} className="border border-slate-200 rounded-full px-3.5 py-2 text-xs font-bold bg-slate-50"><option value="severity">شدیدترین کمبود</option><option value="newest">جدیدترین تغییر</option><option value="name">نام کالا</option></select>
                        </div>
                    </div>
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-3.5">
                        <div className="text-[11px] font-bold text-slate-500 mb-2">شخصی‌سازی — گروه‌بندی بارهای بحرانی (مثلاً «سابیده‌ها»)</div>
                        <div className="flex flex-wrap items-center gap-1.5">
                            <button onClick={()=>setSelectedGroupId(null)} className={`px-3 py-1.5 rounded-full text-[11px] font-bold border transition ${!selectedGroupId ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>همه</button>
                            {criticalGroups.map(g => (
                                <span key={g.id} className={`flex items-center gap-1 rounded-full border text-[11px] font-bold transition ${selectedGroupId===g.id ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>
                                    <button onClick={()=>setSelectedGroupId(g.id)} className="pl-1 pr-3 py-1.5">{g.name} ({g.itemIds.length})</button>
                                    <button onClick={()=>deleteGroup(g.id)} title="حذف گروه" className={`pl-2 pr-1 py-1.5 ${selectedGroupId===g.id ? 'text-white/70 hover:text-white' : 'text-slate-400 hover:text-rose-600'}`}><X size={12}/></button>
                                </span>
                            ))}
                            <input value={newGroupName} onChange={e=>setNewGroupName(e.target.value)} onKeyDown={e=>{ if(e.key==='Enter') addGroup(); }} placeholder="نام گروه جدید…" className="h-8 px-3 border border-slate-200 rounded-full text-[11px] outline-none focus:border-indigo-400 w-32" />
                            <button onClick={addGroup} className="h-8 px-3 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 text-[11px] font-bold hover:bg-indigo-100">+ افزودن گروه</button>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                        {visibleItems.length===0 && <div className="xl:col-span-2 bg-white rounded-3xl border border-slate-200 p-16 text-center text-slate-400">{selectedGroupId ? 'در این گروه، در حال حاضر کالای بحرانی وجود ندارد.' : 'در حال حاضر کالای بحرانی وجود ندارد.'}</div>}
                        {visibleItems.map(i => (
                            <div key={i.id} className={`bg-white rounded-3xl border shadow-sm p-4 transition ${i.muted ? 'border-slate-200 opacity-75' : 'border-red-100'}`}>
                                <div className="flex items-start justify-between gap-3">
                                    <button onClick={()=>onSelectItem&&onSelectItem(i)} className="text-right flex-1">
                                        <div className="font-black text-slate-800">{i.name}{i.brand ? ` (${i.brand})` : ''}</div>
                                        <div className="text-[10px] text-slate-400 mt-1">{[i.tag,i.unit].filter(Boolean).join(' • ')}</div>
                                        {i.lowState && <div className="text-[10px] text-orange-600 mt-1 font-bold">هشدار: {formatNumber(i.lowState.threshold)} {i.lowState.mode === 'weight' ? 'کیلوگرم' : (i.unit || 'واحد')} • فعلی: {formatNumber(i.lowState.value)} {i.lowState.mode === 'weight' ? 'کیلوگرم' : ''}</div>}
                                    </button>
                                    <div className={`text-left px-3 py-2 rounded-2xl ${i.available<0?'bg-red-50':'bg-orange-50'}`}><div className={`font-black text-lg ${i.available<0?'text-red-600':'text-orange-600'}`}>{formatNumber(i.available)}</div><div className="text-[9px] text-slate-400">موجودی آزاد</div></div>
                                </div>
                                {criticalGroups.length > 0 && (
                                    <div className="mt-2 flex flex-wrap items-center gap-1 relative">
                                        {criticalGroups.filter(g=>g.itemIds.includes(i.id)).map(g => (
                                            <span key={g.id} className="text-[9px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100 px-2 py-0.5 rounded-full">{g.name}</span>
                                        ))}
                                        <button onClick={()=>setManageItemId(manageItemId===i.id?null:i.id)} className="text-[9px] font-bold text-slate-400 border border-dashed border-slate-300 px-2 py-0.5 rounded-full hover:bg-slate-50">+ گروه</button>
                                        {manageItemId===i.id && (
                                            <div className="absolute top-full right-0 mt-1 z-10 bg-white border border-slate-200 rounded-xl shadow-lg p-2 min-w-[140px]">
                                                {criticalGroups.map(g => (
                                                    <label key={g.id} className="flex items-center gap-2 text-[11px] font-bold text-slate-600 px-1.5 py-1 rounded-lg hover:bg-slate-50 cursor-pointer whitespace-nowrap">
                                                        <input type="checkbox" className="accent-indigo-600" checked={g.itemIds.includes(i.id)} onChange={()=>toggleItemInGroup(g.id, i.id)} /> {g.name}
                                                    </label>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                                <div className="mt-3 flex items-center justify-between gap-2">
                                    <div className="text-[10px] text-slate-500">رزرو: <b>{formatNumber((reservedCounts&&reservedCounts[i.id])||0)}</b> • فیزیکی: <b>{formatNumber(i.quantity)}</b></div>
                                    <div className="flex gap-1.5">
                                        <button onClick={()=>toggle(i.id, i.muted ? 'unmute' : 'mute')} className={`px-3 py-1.5 rounded-full text-[10px] font-bold border transition ${i.muted?'bg-emerald-50 text-emerald-700 border-emerald-200':'bg-slate-50 text-slate-600 border-slate-200'}`}>{i.muted?'🔔 Unmute':'🔕 Mute'}</button>
                                        {!i.muted && <button onClick={()=>toggle(i.id,'snooze')} className="px-3 py-1.5 rounded-full text-[10px] font-bold border bg-amber-50 text-amber-700 border-amber-200">⏰ تا ۱ ساعت</button>}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            );
        };

        const InventoryStats = ({ items, invoices, processingOrders, purchases }) => {
            const totalItems = items.length;
            const totalPhysical = items.reduce((acc, curr) => acc + curr.quantity, 0);
            
            // Calculate total reserved quantity from pending invoices
            const invoiceReserved = invoices
                .filter(inv => inv.status === 'pending')
                .reduce((acc, inv) => {
                     return acc + inv.items.reduce((sum, i) => sum + (i.isManual ? 0 : i.qty), 0);
                }, 0);
            // + مقدار رزروشده برای سفارش‌های آنالیز/پردازش که هنوز ارسال نشده‌اند
            const processingReservedMap = getProcessingReservedMap(processingOrders);
            const processingReserved = Object.values(processingReservedMap).reduce((a, b) => a + b, 0);
            const totalReserved = invoiceReserved + processingReserved;

            const availableQuantity = totalPhysical - totalReserved;

            // مقدار خریدهای «در راه» که هنوز فیزیکی وارد انبار نشده‌اند؛ متعلق به شماست اما جزو موجودی واقعی نیست
            const purchaseIncomingMap = getPurchaseIncomingMap(purchases);
            const totalIncoming = Object.values(purchaseIncomingMap).reduce((a, b) => a + b, 0);
            // از میان همان «در راه»ها، مقداری که کاربر گفته برای پیش‌فروش جزو موجودی قابل‌فروش حساب شود
            const sellableIncomingMap = getPurchaseSellableIncomingMap(purchases);
            const totalSellableIncoming = Object.values(sellableIncomingMap).reduce((a, b) => a + b, 0);

            return (
                <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
                    <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex flex-col justify-between">
                        <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mb-2"><Layers size={14}/></div>
                        <p className="text-slate-400 text-xs mb-1">تنوع کالا</p>
                        <p className="text-xl font-black text-slate-700">{totalItems}</p>
                    </div>
                    <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex flex-col justify-between">
                        <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mb-2"><PackageOpen size={14}/></div>
                        <p className="text-slate-400 text-xs mb-1">موجودی فیزیکی کل</p>
                        <p className="text-xl font-black text-slate-700">{formatNumber(totalPhysical)}</p>
                    </div>
                    <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100 shadow-sm flex flex-col justify-between">
                        <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mb-2"><Truck size={14} /></div>
                        <p className="text-amber-600 text-xs mb-1">در صف خروج</p>
                        <p className="text-xl font-black text-amber-700">{formatNumber(totalReserved)}</p>
                    </div>
                    <div className="bg-sky-50 rounded-2xl p-4 border border-sky-100 shadow-sm flex flex-col justify-between">
                        <div className="w-8 h-8 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center mb-2"><ArrowDownLeft size={14} /></div>
                        <p className="text-sky-600 text-xs mb-1">خرید در راه (نرسیده)</p>
                        <p className="text-xl font-black text-sky-700">{formatNumber(totalIncoming)}</p>
                    </div>
                    <div className="bg-teal-50 rounded-2xl p-4 border border-teal-100 shadow-sm flex flex-col justify-between">
                        <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-600 flex items-center justify-center mb-2"><Package size={14} /></div>
                        <p className="text-teal-600 text-xs mb-1">قابل پیش‌فروش (در راه)</p>
                        <p className="text-xl font-black text-teal-700">{formatNumber(totalSellableIncoming)}</p>
                    </div>
                    <div className="bg-gradient-to-br from-brass-500 to-brass-600 rounded-2xl p-4 text-white shadow-lg shadow-brass-900/20 flex flex-col justify-between">
                        <div className="w-8 h-8 rounded-full bg-white/20 text-white flex items-center justify-center mb-2"><CheckCircle size={14}/></div>
                        <p className="text-white/80 text-xs mb-1">موجودی قابل فروش</p>
                        <p className="text-2xl font-black">{formatNumber(availableQuantity)}</p>
                    </div>
                </div>
            );
        };

