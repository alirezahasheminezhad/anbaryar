//## ═══ app/20-reports.jsx ═══
//## گزارش‌ها: موجودی مادر، ارسال‌های جزئی، خروجی امروز، گردش کالا، سررسیدها و پیگیری (RemindersView).
//## ترتیب فایل‌ها در build.py مهم است؛ همه‌ی بخش‌ها یک scope مشترک دارند.
        // گزارش مرکزی موجودی — مرجع اصلی نمایش وضعیت موجودی سیستم؛ تمام اعداد از همان توابع مرکزیِ موجود
        // (reservedCounts در سطح App، getPurchaseIncomingMap، getPurchaseSellableIncomingMap) گرفته می‌شود
        // تا هیچ منطق موازی/تکراری ساخته نشود و عدد این جدول با بقیه‌ی برنامه همیشه یکی بماند.
        const InventoryMasterView = ({ items, reservedCounts, purchases, warehouses }) => {
            const [search, setSearch] = useState('');
            const [sortBy, setSortBy] = useState('name-asc');
            const incomingMap = useMemo(() => getPurchaseIncomingMap(purchases), [purchases]);
            const sellableIncomingMap = useMemo(() => getPurchaseSellableIncomingMap(purchases), [purchases]);

            const rows = useMemo(() => {
                const term = search.trim().toLocaleLowerCase('fa-IR');
                let list = (items || []).map(it => {
                    const physical = Number(it.quantity) || 0;
                    const reserved = Number(reservedCounts?.[it.id]) || 0;
                    const available = physical - reserved;
                    const incoming = Number(incomingMap[it.id]) || 0;
                    const sellableIncoming = Number(sellableIncomingMap[it.id]) || 0;
                    const finalSellable = available + sellableIncoming;
                    return { it, physical, reserved, available, incoming, sellableIncoming, finalSellable };
                });
                if (term) {
                    list = list.filter(r => smartSearchMatch(`${r.it.name} ${r.it.brand || ''} ${r.it.tag || ''}`, term));
                }
                const cmp = {
                    'name-asc': (a, b) => String(a.it.name).localeCompare(String(b.it.name), 'fa'),
                    'name-desc': (a, b) => String(b.it.name).localeCompare(String(a.it.name), 'fa'),
                    'available-asc': (a, b) => a.available - b.available,
                    'available-desc': (a, b) => b.available - a.available,
                    'physical-asc': (a, b) => a.physical - b.physical,
                    'physical-desc': (a, b) => b.physical - a.physical,
                    'final-asc': (a, b) => a.finalSellable - b.finalSellable,
                    'final-desc': (a, b) => b.finalSellable - a.finalSellable,
                }[sortBy] || (() => 0);
                return list.sort(cmp);
            }, [items, reservedCounts, incomingMap, sellableIncomingMap, search, sortBy]);

            const SortHeader = ({ label, keyAsc, keyDesc, className = '' }) => {
                const active = sortBy === keyAsc || sortBy === keyDesc;
                const nextSort = sortBy === keyDesc ? keyAsc : keyDesc;
                return (
                    <th className={`p-2 font-bold cursor-pointer select-none whitespace-nowrap ${className}`} onClick={() => setSortBy(nextSort)}>
                        <span className={active ? 'text-indigo-600' : ''}>{label} {active ? (sortBy === keyDesc ? '↓' : '↑') : ''}</span>
                    </th>
                );
            };

            return (
                <div className="max-w-6xl mx-auto space-y-3">
                    <div className="flex flex-wrap gap-2 items-center">
                        <div className="relative flex-1 min-w-[200px]">
                            <Search className="absolute right-2.5 top-2.5 text-slate-400" size={14}/>
                            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="جستجوی کالا..." className="w-full p-2 pr-8 rounded-full border border-slate-200 bg-white text-xs outline-none focus:border-indigo-400" />
                        </div>
                        <span className="text-[11px] text-slate-400 font-bold whitespace-nowrap bg-white border border-slate-200 px-2.5 py-1.5 rounded-full">{formatNumber(rows.length)} کالا</span>
                        <button onClick={() => exportInventoryMasterToExcel(rows)} className="flex items-center gap-1 bg-emerald-600 text-white px-3.5 py-2 rounded-full text-xs font-bold whitespace-nowrap hover:bg-emerald-700 transition" title="Export بر اساس فیلتر/مرتب‌سازی فعلی"><Download size={14}/> Excel</button>
                    </div>
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-[11px]">
                                <thead className="bg-slate-50 text-slate-400 sticky top-0">
                                    <tr>
                                        <SortHeader label="کالا" keyAsc="name-asc" keyDesc="name-desc" className="text-right" />
                                        <th className="p-2 text-center font-bold">واحد</th>
                                        <SortHeader label="فیزیکی" keyAsc="physical-asc" keyDesc="physical-desc" className="text-center" />
                                        <th className="p-2 text-center font-bold">رزرو</th>
                                        <SortHeader label="آزاد" keyAsc="available-asc" keyDesc="available-desc" className="text-center" />
                                        <th className="p-2 text-center font-bold">در راه</th>
                                        <th className="p-2 text-center font-bold">پیش‌فروش</th>
                                        <SortHeader label="قابل فروش نهایی" keyAsc="final-asc" keyDesc="final-desc" className="text-center" />
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {rows.length === 0 && <tr><td colSpan="8" className="p-8 text-center text-slate-400">کالایی یافت نشد</td></tr>}
                                    {rows.map(r => (
                                        <tr key={r.it.id} className="hover:bg-slate-50">
                                            <td className="p-2">
                                                <div className="font-bold text-slate-700 flex items-center gap-1.5 flex-wrap">
                                                    {r.it.name}
                                                    <ItemDistinguishBadges item={r.it} size="xs" />
                                                </div>
                                            </td>
                                            <td className="p-2 text-center">
                                                <span className="px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-bold text-[10px]">{r.it.unit || '—'}</span>
                                                {r.it.bagWeight > 0 && <div className="text-[9px] text-slate-400 mt-0.5">≈ {formatNumber(r.physical * (Number(r.it.bagWeight) / 1000))} kg</div>}
                                            </td>
                                            <td className="p-2 text-center font-bold">{formatNumber(r.physical)}</td>
                                            <td className="p-2 text-center text-amber-600 font-bold">{r.reserved > 0 ? formatNumber(r.reserved) : '—'}</td>
                                            <td className={`p-2 text-center font-black ${r.available < 0 ? 'text-red-600' : 'text-emerald-700'}`}>{formatNumber(r.available)}</td>
                                            <td className="p-2 text-center text-blue-600 font-bold">{r.incoming > 0 ? formatNumber(r.incoming) : '—'}</td>
                                            <td className="p-2 text-center text-teal-600 font-bold">{r.sellableIncoming > 0 ? formatNumber(r.sellableIncoming) : '—'}</td>
                                            <td className={`p-2 text-center font-black ${r.finalSellable < 0 ? 'text-red-600' : 'text-indigo-700'}`}>{formatNumber(r.finalSellable)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <div className="text-[10px] text-slate-400 px-1">فیزیکی: موجودی واقعیِ انبار · رزرو: فاکتورهای در انتظار + سفارش‌های آنالیز رزروشده · آزاد: فیزیکی − رزرو · در راه: خریدهای ثبت‌شده و هنوز نرسیده · پیش‌فروش: از همان «در راه»، سهمیه‌ی علامت‌خورده برای پیش‌فروش · قابل فروش نهایی: آزاد + پیش‌فروش. همه‌ی این اعداد از همان منبع مرکزی برنامه محاسبه می‌شوند که در بقیه‌ی صفحات هم استفاده می‌شود.</div>
                </div>
            );
        };

        // بارهای نیمه‌رفته — مدیریتی: فقط ردیف‌هایی که shippedQty > 0 && remainingQty > 0، بر اساس همان
        // سیستم ارسال چندمرحله‌ای موجود (it.qty / it.shippedQty) که در بقیه‌ی برنامه هم استفاده می‌شود.
        // بارهای نیمه‌رفته — حالا به‌ازای هر مشتری یک بخشِ باز/بسته‌شونده (پیش‌فرض بسته)، و وزن هم کنار تعداد
        // اضافه شد (کل/رفته/باقی‌مانده به کیلوگرم)، از همان وزنِ واقعیِ ثبت‌شده روی خودِ فاکتور و محموله‌ها.
        const PartialShipmentsView = ({ invoices }) => {
            const [search, setSearch] = useState('');
            const [openCustomers, setOpenCustomers] = useState({});
            const rows = useMemo(() => {
                const map = {};
                (invoices || []).forEach(inv => {
                    if (inv.status === 'cancelled') return;
                    (inv.items || []).forEach(it => {
                        const total = Number(it.qty) || 0;
                        const shipped = Number(it.shippedQty) || 0;
                        const remaining = total - shipped;
                        if (!(shipped > 0.0001 && remaining > 0.0001)) return;
                        const key = `${(inv.customer || '').trim()}|${it.itemId || it.name}`;
                        if (!map[key]) map[key] = { customer: inv.customer || 'بدون نام', itemName: it.name, total: 0, shipped: 0, remaining: 0, totalWeight: 0, shippedWeight: 0, invoiceIds: [], hasManualWeight: false };
                        map[key].total += total; map[key].shipped += shipped; map[key].remaining += remaining;
                        map[key].totalWeight += getItemEffectiveWeight(it);
                        map[key].shippedWeight += (it.shipments || []).reduce((s, sh) => s + (Number(sh.weight) || 0), 0);
                        map[key].invoiceIds.push(inv.id);
                        if ((it.shipments || []).some(sh => sh.weightManual)) map[key].hasManualWeight = true;
                    });
                });
                let list = Object.values(map).map(r => ({ ...r, remainingWeight: r.totalWeight - r.shippedWeight }));
                if (search.trim()) list = list.filter(r => smartSearchMatch(`${r.customer} ${r.itemName}`, search));
                return list.sort((a, b) => b.remaining - a.remaining);
            }, [invoices, search]);

            const byCustomer = useMemo(() => {
                const map = {};
                rows.forEach(r => {
                    if (!map[r.customer]) map[r.customer] = { customer: r.customer, items: [], remaining: 0, remainingWeight: 0 };
                    map[r.customer].items.push(r);
                    map[r.customer].remaining += r.remaining;
                    map[r.customer].remainingWeight += r.remainingWeight;
                });
                return Object.values(map).sort((a, b) => b.remainingWeight - a.remainingWeight);
            }, [rows]);

            const toggleCustomer = (name) => setOpenCustomers(prev => ({ ...prev, [name]: !prev[name] }));

            return (
                <div className="max-w-5xl mx-auto space-y-3">
                    <div className="relative">
                        <Search className="absolute right-2.5 top-2.5 text-slate-400" size={14}/>
                        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="جستجوی مشتری یا کالا..." className="w-full p-2 pr-8 rounded-full border border-slate-200 bg-white text-xs outline-none focus:border-indigo-400" />
                    </div>
                    {byCustomer.length === 0 && <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center text-slate-400 text-sm">فعلاً باری نیمه‌رفته وجود ندارد</div>}
                    <div className="space-y-2">
                        {byCustomer.map(group => {
                            const isOpen = !!openCustomers[group.customer];
                            return (
                                <div key={group.customer} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                                    <button onClick={() => toggleCustomer(group.customer)} className="w-full p-3 flex items-center justify-between hover:bg-slate-50 text-right">
                                        <div className="flex items-center gap-2">
                                            <ChevronDown size={15} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}/>
                                            <span className="font-bold text-slate-700 text-xs">{group.customer}</span>
                                            <span className="text-[10px] text-slate-400">({group.items.length} کالا)</span>
                                        </div>
                                        <div className="flex items-center gap-3 text-[10px] font-bold">
                                            <span className="text-amber-600">{formatNumber(group.remaining)} باقی‌مانده</span>
                                            <span className="text-amber-500">{formatNumber(group.remainingWeight)} kg</span>
                                        </div>
                                    </button>
                                    {isOpen && (
                                        <table className="w-full text-[11px] border-t border-slate-100">
                                            <thead className="bg-slate-50 text-slate-400">
                                                <tr>
                                                    <th className="p-2 text-right font-bold">کالا</th>
                                                    <th className="p-2 text-center font-bold">کل (تعداد)</th><th className="p-2 text-center font-bold">رفته</th><th className="p-2 text-center font-bold">باقی‌مانده</th>
                                                    <th className="p-2 text-center font-bold">کل (وزن kg)</th><th className="p-2 text-center font-bold">رفته (وزن)</th><th className="p-2 text-center font-bold">باقی‌مانده (وزن)</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {group.items.map((r, idx) => (
                                                    <tr key={idx} className="hover:bg-slate-50">
                                                        <td className="p-2">{r.itemName} {r.hasManualWeight && <span className="text-amber-600" title="حداقل یکی از ارسال‌های این ردیف وزن دستی داشته">🖊</span>}</td>
                                                        <td className="p-2 text-center font-bold">{formatNumber(r.total)}</td>
                                                        <td className="p-2 text-center text-emerald-600 font-bold">{formatNumber(r.shipped)}</td>
                                                        <td className="p-2 text-center text-amber-600 font-black">{formatNumber(r.remaining)}</td>
                                                        <td className="p-2 text-center font-bold">{formatNumber(r.totalWeight)}</td>
                                                        <td className="p-2 text-center text-emerald-600 font-bold">{formatNumber(r.shippedWeight)}</td>
                                                        <td className="p-2 text-center text-amber-600 font-black">{formatNumber(r.remainingWeight)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            );
        };

        // خروج امروز — «امروز» اینجا همیشه تاریخِ واقعیِ سیستم است (جدا و مستقل از مبنای تاریخِ دستیِ تسویه
        // که در پاپ‌آپ «ثبت ارسال» تعریف شده)؛ عمداً به آن مبنا وابسته نیست.
        const TodayExitsView = ({ invoices }) => {
            const todayFa = useMemo(() => new Date().toLocaleDateString('fa-IR'), []);
            const rows = useMemo(() => {
                const out = [];
                (invoices || []).forEach(inv => {
                    if (inv.status === 'cancelled') return;
                    (inv.items || []).forEach(it => {
                        if (it.shipments && it.shipments.length > 0) {
                            it.shipments.forEach(sh => {
                                if (sh.date !== todayFa) return;
                                out.push({ invoiceId: inv.id, customer: inv.customer, itemName: it.name, qty: Number(sh.qty) || 0, weight: Number(sh.weight) || 0, amount: (Number(sh.weight) || 0) * (Number(sh.price) || 0), status: 'بخشی/تکمیلی', time: null, weightManual: !!sh.weightManual });
                            });
                        } else if (inv.status === 'completed' && inv.date === todayFa) {
                            out.push({ invoiceId: inv.id, customer: inv.customer, itemName: it.name, qty: Number(it.qty) || 0, weight: getItemEffectiveWeight(it), amount: getItemEffectiveTotal(it), status: 'کامل', time: inv.timestamp });
                        }
                    });
                });
                return out.sort((a, b) => (b.time || 0) - (a.time || 0));
            }, [invoices, todayFa]);
            const totals = useMemo(() => rows.reduce((acc, r) => ({ qty: acc.qty + r.qty, weight: acc.weight + r.weight, amount: acc.amount + r.amount }), { qty: 0, weight: 0, amount: 0 }), [rows]);
            return (
                <div className="max-w-5xl mx-auto space-y-3">
                    <div className="text-[11px] text-slate-400 bg-amber-50 border border-amber-200 rounded-xl p-2.5">
                        «راننده» و «بارگیری» هنوز به‌عنوان فیلد در سیستم ثبت نمی‌شوند — اگر لازم دارید در فرم ثبت ارسال اضافه شود، بگویید تا فاز بعد اضافه‌اش کنم.
                    </div>
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                        <table className="w-full text-[11px]">
                            <thead className="bg-slate-50 text-slate-400">
                                <tr><th className="p-2 text-right font-bold">مشتری</th><th className="p-2 text-right font-bold">شماره سند</th><th className="p-2 text-right font-bold">کالا</th><th className="p-2 text-center font-bold">تعداد</th><th className="p-2 text-center font-bold">وزن</th><th className="p-2 text-center font-bold">مبلغ</th><th className="p-2 text-center font-bold">وضعیت</th></tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {rows.length === 0 && <tr><td colSpan="7" className="p-8 text-center text-slate-400">امروز هنوز خروجی ثبت نشده</td></tr>}
                                {rows.map((r, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50">
                                        <td className="p-2 font-bold text-slate-700">{r.customer}</td>
                                        <td className="p-2 text-slate-400 font-mono">#{r.invoiceId.slice(-6)}</td>
                                        <td className="p-2">{r.itemName}</td>
                                        <td className="p-2 text-center">{formatNumber(r.qty)}</td>
                                        <td className="p-2 text-center">{formatNumber(r.weight)} {r.weightManual && <span className="text-amber-600" title="وزن دستی">🖊</span>}</td>
                                        <td className="p-2 text-center font-bold text-emerald-700">{formatNumber(r.amount)}</td>
                                        <td className="p-2 text-center"><span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${r.status === 'کامل' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>{r.status}</span></td>
                                    </tr>
                                ))}
                            </tbody>
                            {rows.length > 0 && (
                                <tfoot className="bg-slate-50 font-black text-slate-700">
                                    <tr><td className="p-2" colSpan="3">جمع خروج امروز</td><td className="p-2 text-center">{formatNumber(totals.qty)}</td><td className="p-2 text-center">{formatNumber(totals.weight)}</td><td className="p-2 text-center text-emerald-700">{formatNumber(totals.amount)}</td><td></td></tr>
                                </tfoot>
                            )}
                        </table>
                    </div>
                </div>
            );
        };

        // کجا رفت؟ — گردش کامل موجودی یک کالا، از روی همان Transaction/History واقعی سیستم (نه داده‌ی ساختگی)،
        // دسته‌بندی‌شده بر اساس نوع تراکنش. برای جزئیاتِ تک‌تکِ تراکنش‌ها (که خودشان به سند مبدا لینک می‌شوند)
        // از همان HistoryModal موجود سیستم استفاده می‌شود (Drill-down واقعی، بدون ساخت سیستم موازی).
        const ItemFlowView = ({ items, transactions, onOpenHistory }) => {
            const [search, setSearch] = useState('');
            const [selectedId, setSelectedId] = useState('');
            const matches = useMemo(() => {
                if (!search.trim()) return [];
                return (items || []).filter(it => smartSearchMatch(`${it.name} ${it.brand || ''} ${it.tag || ''}`, search)).slice(0, 8);
            }, [items, search]);
            const selectedItem = (items || []).find(i => i.id === selectedId) || null;
            const CATEGORY_MAP = {
                'PURCHASE_RECEIVE': 'خرید (ورودی)', 'PURCHASE_DELETE_REVERSAL': 'خرید (ورودی)',
                'PROCESS_SEND': 'ارسال به پردازش (خروجی)', 'PROCESS_RETURN': 'بازگشت از پردازش (ورودی)', 'PROCESS_DELETE_REVERSAL': 'پردازش (برگشت)',
                'CONSIGN_BORROW_IN': 'امانی گرفته‌شده (ورودی)', 'CONSIGN_LEND_RETURN': 'امانی گرفته‌شده (ورودی)',
                'CONSIGN_LEND_OUT': 'امانی داده‌شده (خروجی)', 'CONSIGN_BORROW_RETURN': 'امانی داده‌شده (خروجی)', 'CONSIGN_DELETE_REVERSAL': 'امانی (برگشت)',
                'SALE': 'فروش (خروجی)', 'ADJUSTMENT': 'اصلاح شمارش موجودی', 'ADD': 'افزایش دستی', 'IMPORT': 'ورود اکسل/محک',
            };
            const breakdown = useMemo(() => {
                if (!selectedItem) return null;
                const list = (transactions || []).filter(t => t.itemId === selectedItem.id);
                const cats = {};
                list.forEach(t => {
                    const label = CATEGORY_MAP[t.type] || 'سایر';
                    cats[label] = (cats[label] || 0) + (Number(t.quantity) || 0);
                });
                return { count: list.length, cats };
            }, [selectedItem, transactions]);
            return (
                <div className="max-w-3xl mx-auto space-y-3">
                    <div className="relative">
                        <Search className="absolute right-2.5 top-2.5 text-slate-400" size={14}/>
                        <input value={search} onChange={e => { setSearch(e.target.value); setSelectedId(''); }} placeholder="نام کالا را جستجو کنید..." className="w-full p-2.5 pr-8 rounded-full border border-slate-200 bg-white text-sm outline-none focus:border-indigo-400" />
                        {matches.length > 0 && !selectedId && (
                            <div className="mt-1 bg-white border border-slate-200 rounded-xl shadow-sm divide-y divide-slate-100 overflow-hidden">
                                {matches.map(it => (
                                    <button key={it.id} onClick={() => { setSelectedId(it.id); setSearch(`${it.name}${it.brand ? ' ' + it.brand : ''}`); }} className="w-full text-right p-2 text-xs hover:bg-slate-50 flex items-center justify-between">
                                        <span>{it.name} {it.brand}</span><span className="text-slate-400">موجودی: {formatNumber(it.quantity)}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    {selectedItem && breakdown && (
                        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-4 space-y-2">
                            <div className="font-bold text-slate-800 flex items-center gap-2"><Package size={16} className="text-indigo-600"/> {selectedItem.name} {selectedItem.brand}</div>
                            {Object.keys(breakdown.cats).length === 0 && <div className="text-slate-400 text-sm py-4 text-center">هیچ تراکنشی برای این کالا ثبت نشده</div>}
                            {Object.entries(breakdown.cats).map(([label, qty]) => (
                                <div key={label} className="flex justify-between items-center text-sm py-1 border-b border-slate-50">
                                    <span className="text-slate-500">{label}</span>
                                    <span className={`font-bold ${qty >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{qty >= 0 ? '+' : ''}{formatNumber(qty)}</span>
                                </div>
                            ))}
                            <div className="flex justify-between items-center pt-2 mt-1 border-t-2 border-indigo-100">
                                <span className="font-black text-indigo-800">موجودی فعلی</span>
                                <span className="font-black text-indigo-800 text-lg">{formatNumber(selectedItem.quantity)}</span>
                            </div>
                            <button onClick={() => onOpenHistory && onOpenHistory(selectedItem)} className="w-full mt-2 py-2.5 rounded-full bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition flex items-center justify-center gap-1.5"><Eye size={13}/> مشاهده تک‌تک تراکنش‌ها ({breakdown.count}) و اسناد مربوطه</button>
                        </div>
                    )}
                </div>
            );
        };

        const RemindersView = ({ invoices, onSettleInvoice, onEditInvoice, inventoryItems, appSettings, onSaveSettings }) => {
            const [tab, setTab] = useState('due');
            const [printInv, setPrintInv] = useState(null);
            const [inactivityDays, setInactivityDays] = useState(Number(appSettings.customerInactivityDays ?? 30));

            const dueInvoices = useMemo(() => {
                return (invoices || [])
                    .filter(inv => inv.dueDate && inv.status !== 'cancelled' && inv.paymentStatus !== 'settled')
                    .map(inv => ({ ...inv, _urgency: getDueUrgency(inv.dueDate), _diff: daysDiffFromToday(inv.dueDate) }))
                    .sort((a, b) => a._diff - b._diff);
            }, [invoices]);

            const overdueCount = dueInvoices.filter(i => i._urgency === 'overdue').length;
            const todayCount = dueInvoices.filter(i => i._urgency === 'today').length;
            const soonCount = dueInvoices.filter(i => i._urgency === 'soon').length;

            const customerStats = useMemo(() => {
                const map = {};
                (invoices || []).forEach(inv => {
                    const name = (inv.customer || '').trim();
                    if (!name || inv.status === 'cancelled') return;
                    const ts = inv.timestamp || 0;
                    const prev = map[name];
                    const isNewer = !prev || ts >= prev.lastTs;
                    map[name] = { name, lastTs: prev ? Math.max(prev.lastTs, ts) : ts, lastDate: isNewer ? inv.date : prev.lastDate, lastInvoice: isNewer ? inv : prev.lastInvoice, invoiceCount: (prev?.invoiceCount || 0) + 1 };
                });
                return Object.values(map)
                    .map(c => ({ ...c, daysSince: c.lastTs ? Math.floor((Date.now() - c.lastTs) / 86400000) : null }))
                    .filter(c => c.daysSince !== null && c.daysSince >= inactivityDays)
                    .sort((a, b) => b.daysSince - a.daysSince);
            }, [invoices, inactivityDays]);

            const saveThreshold = (v) => {
                const n = Math.max(1, parseInt(v) || 30);
                setInactivityDays(n);
                onSaveSettings({ ...appSettings, customerInactivityDays: n });
            };

            const urgencyStyle = (u) => u === 'overdue' ? 'bg-red-50 border-red-200 text-red-700' : u === 'today' ? 'bg-amber-50 border-amber-200 text-amber-700' : u === 'soon' ? 'bg-yellow-50 border-yellow-200 text-yellow-700' : 'bg-slate-50 border-slate-200 text-slate-600';
            const urgencyLabel = (u) => u === 'overdue' ? 'گذشته' : u === 'today' ? 'امروز' : u === 'soon' ? 'تا ۳ روز آینده' : 'آینده';

            return (
                <div className="max-w-5xl mx-auto space-y-4">
                    <div className="flex gap-2">
                        <button onClick={() => setTab('due')} className={`px-4 py-2 rounded-full text-xs font-bold border flex items-center gap-1.5 transition ${tab === 'due' ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-900/20' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}>
                            <CalendarClock size={14}/> سررسید تسویه/چک ({dueInvoices.length})
                        </button>
                        <button onClick={() => setTab('customers')} className={`px-4 py-2 rounded-full text-xs font-bold border flex items-center gap-1.5 transition ${tab === 'customers' ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-900/20' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}>
                            <UserX size={14}/> پیگیری مشتریان راکد ({customerStats.length})
                        </button>
                    </div>

                    {tab === 'due' && (
                        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                            <div className="bg-slate-50 border-b border-slate-100 p-4 flex flex-wrap items-center gap-3 text-xs font-bold">
                                <span className="text-red-600">🔴 گذشته: {overdueCount}</span>
                                <span className="text-amber-600">🟠 امروز: {todayCount}</span>
                                <span className="text-yellow-600">🟡 تا ۳ روز آینده: {soonCount}</span>
                                <span className="text-slate-400 font-medium mr-auto">سررسید بر اساس تقویم شمسی دقیق (با احتساب کبیسه) محاسبه می‌شود</span>
                            </div>
                            <div className="divide-y divide-slate-100">
                                {dueInvoices.length === 0 && <div className="p-10 text-center text-slate-400 text-sm">هیچ فاکتور نسیه‌ای با سررسید ثبت‌شده و تسویه‌نشده وجود ندارد.</div>}
                                {dueInvoices.map(inv => (
                                    <div key={inv.id} className="p-4 flex flex-wrap items-center justify-between gap-3">
                                        <div className="min-w-0">
                                            <div className="font-bold text-slate-800 text-sm flex items-center gap-1.5 flex-wrap">
                                                {inv.customer || 'بدون نام مشتری'}
                                                {inv.status === 'pending' ? <span className="text-[9px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-bold border border-amber-200">رزرو</span> : <span className="text-[9px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-bold border border-emerald-200">قطعی</span>}
                                            </div>
                                            <div className="text-[10px] text-slate-400 mt-0.5">فاکتور #{inv.id.slice(-6)} · صادر شده {inv.date}</div>
                                            {inv.settlementTerm && <div className="text-[10px] text-slate-500 mt-0.5">شرایط: {inv.settlementTerm}</div>}
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${urgencyStyle(inv._urgency)}`}>
                                                📅 {formatJalali(inv.dueDate)} · {urgencyLabel(inv._urgency)}{inv._urgency === 'overdue' ? ` (${Math.abs(inv._diff)} روز)` : ''}
                                            </span>
                                            <button onClick={() => setPrintInv(inv)} className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50" title="چاپ فاکتور"><Printer size={14}/></button>
                                            <button onClick={() => onEditInvoice(inv)} className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50" title="ویرایش فاکتور"><Edit3 size={14}/></button>
                                            <button onClick={() => onSettleInvoice([inv.id], 'settled')} className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-[10px] font-bold hover:bg-emerald-700">تسویه شد</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {tab === 'customers' && (
                        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                            <div className="bg-slate-50 border-b border-slate-100 p-4 flex flex-wrap items-center gap-3">
                                <span className="text-xs font-bold text-slate-600">مشتریانی که بیش از این مدت خرید نکرده‌اند:</span>
                                <input type="number" min="1" value={inactivityDays} onChange={e => saveThreshold(e.target.value)} className="w-20 p-1.5 border border-slate-200 rounded-lg text-xs text-center" />
                                <span className="text-xs text-slate-400">روز</span>
                            </div>
                            <div className="divide-y divide-slate-100">
                                {customerStats.length === 0 && <div className="p-10 text-center text-slate-400 text-sm">مشتری راکدی با این آستانه پیدا نشد.</div>}
                                {customerStats.map(c => (
                                    <div key={c.name} className="p-4 flex flex-wrap items-center justify-between gap-3">
                                        <div className="min-w-0">
                                            <div className="font-bold text-slate-800 text-sm">{c.name}</div>
                                            <div className="text-[10px] text-slate-400 mt-0.5">{c.invoiceCount} فاکتور ثبت‌شده · آخرین خرید: {c.lastDate || '—'}</div>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold border bg-rose-50 border-rose-200 text-rose-700">
                                                ⏳ {c.daysSince} روز از آخرین خرید
                                            </span>
                                            {c.lastInvoice && <button onClick={() => setPrintInv(c.lastInvoice)} className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50" title="چاپ فاکتور آخر"><Printer size={14}/></button>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    {printInv && <PrintInvoiceModal invoice={printInv} settings={appSettings} inventoryItems={inventoryItems} onClose={() => setPrintInv(null)} />}
                </div>
            );
        };

