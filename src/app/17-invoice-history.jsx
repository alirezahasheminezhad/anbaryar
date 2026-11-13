//## ═══ app/17-invoice-history.jsx ═══
//## تاریخچه و گزارش فاکتورها (InvoiceHistory).
//## ترتیب فایل‌ها در build.py مهم است؛ همه‌ی بخش‌ها یک scope مشترک دارند.
        const InvoiceHistory = ({ invoices, settings, onEdit, inventoryItems, onUpdateDate, purchases, processingOrders }) => {
            const [searchTerm, setSearchTerm] = useState('');
            const [editingDateId, setEditingDateId] = useState(null);
            const [editingDateVal, setEditingDateVal] = useState('');
            const [printInv, setPrintInv] = useState(null);
            // فاکتورهای فروش، خرید کالا (در راه/دریافت‌شده) و آنالیز/پردازش، هر سه در همین بخش گزارش‌ها قابل مشاهده باشند
            const [reportTab, setReportTab] = useState('sales'); // sales | purchases | processing
            const [purchaseSearch, setPurchaseSearch] = useState('');
            const [processingSearch, setProcessingSearch] = useState('');
            const filteredPurchasesReport = useMemo(() => {
                const list = Array.isArray(purchases) ? purchases : [];
                const term = purchaseSearch.trim();
                const res = term ? list.filter(p => p.supplier.includes(term) || (p.description||'').includes(term)) : list;
                return [...res].sort((a,b) => b.timestamp - a.timestamp);
            }, [purchases, purchaseSearch]);
            const filteredProcessingReport = useMemo(() => {
                const list = Array.isArray(processingOrders) ? processingOrders : [];
                const term = processingSearch.trim();
                const res = term ? list.filter(o => (o.recipient||'').includes(term) || (o.description||'').includes(term)) : list;
                return [...res].sort((a,b) => b.timestamp - a.timestamp);
            }, [processingOrders, processingSearch]);
            // گزارش «پیش‌فروش از بار در راه»: از میان کالاهایی که برای پیش‌فروش قبل از رسیدن، جزو موجودی قابل‌فروش حساب شده‌اند،
            // چقدرش تاکنون واقعاً فروخته/رزرو شده (یعنی موجودیِ فیزیکیِ خالص کالا از صفر کمتر رفته و از همان سهمیه «در راه» کسر شده)
            const presaleReport = useMemo(() => {
                const sellableIncomingMap = getPurchaseSellableIncomingMap(purchases);
                const processingReservedMap = getProcessingReservedMap(processingOrders);
                const invoiceReservedMap = {};
                (invoices || []).filter(inv => inv.status === 'pending').forEach(inv => {
                    (inv.items || []).forEach(it => {
                        if (!it.itemId) return;
                        invoiceReservedMap[it.itemId] = (invoiceReservedMap[it.itemId] || 0) + (Number(it.qty) || 0);
                    });
                });
                return Object.keys(sellableIncomingMap).map(itemId => {
                    const invItem = (inventoryItems || []).find(i => i.id === itemId);
                    const sellableIncoming = sellableIncomingMap[itemId] || 0;
                    const reserved = (invoiceReservedMap[itemId] || 0) + (processingReservedMap[itemId] || 0);
                    const physicalFree = (invItem ? invItem.quantity : 0) - reserved;
                    const soldFromIncoming = physicalFree < 0 ? Math.min(sellableIncoming, -physicalFree) : 0;
                    const remainingPresellable = Math.max(0, sellableIncoming - soldFromIncoming);
                    return { itemId, name: invItem ? invItem.name : '(کالای حذف‌شده)', brand: invItem ? invItem.brand : '', tag: invItem ? invItem.tag : '', unit: invItem ? invItem.unit : 'عدد', sellableIncoming, soldFromIncoming, remainingPresellable };
                }).filter(r => r.sellableIncoming > 0).sort((a, b) => b.soldFromIncoming - a.soldFromIncoming);
            }, [purchases, processingOrders, invoices, inventoryItems]);
            // فیلتر چندمرحله‌ای (بند ۶): کالا/برند، مشتری (همان جستجو)، از‌تاریخ، تا‌تاریخ، وضعیت — همه قابل ترکیب،
            // و روی همان لیستِ واقعیِ فاکتورها اعمال می‌شود.
            const [filterItemText, setFilterItemText] = useState('');
            const [filterFrom, setFilterFrom] = useState('');
            const [filterTo, setFilterTo] = useState('');
            const [filterStatus, setFilterStatus] = useState('all');
            const [showFilters, setShowFilters] = useState(false);
            const jalaliDateKey = (val) => { const p = parseJalaliDisplayDate(val); return p ? p.jy * 10000 + p.jm * 100 + p.jd : null; };
            const activeFilterCount = [filterItemText, filterFrom, filterTo, filterStatus !== 'all' ? '1' : ''].filter(Boolean).length;
            const filteredInvoices = useMemo(() => {
                const term = searchTerm.toLowerCase().trim();
                let list = !term ? invoices : invoices.filter(inv =>
                    inv.customer.toLowerCase().includes(term) ||
                    (inv.description && inv.description.toLowerCase().includes(term)) ||
                    inv.date.includes(term) ||
                    (inv.items || []).some(it =>
                        (it.name && it.name.toLowerCase().includes(term)) ||
                        (it.brand && it.brand.toLowerCase().includes(term)) ||
                        (it.tag && it.tag.toLowerCase().includes(term))
                    )
                );
                if (filterItemText.trim()) {
                    list = list.filter(inv => (inv.items || []).some(it => smartSearchMatch(`${it.name} ${it.brand || ''} ${it.tag || ''}`, filterItemText)));
                }
                if (filterStatus !== 'all') list = list.filter(inv => (inv.status || 'completed') === filterStatus);
                const fromKey = jalaliDateKey(filterFrom), toKey = jalaliDateKey(filterTo);
                if (fromKey !== null) list = list.filter(inv => { const k = jalaliDateKey(inv.date); return k !== null && k >= fromKey; });
                if (toKey !== null) list = list.filter(inv => { const k = jalaliDateKey(inv.date); return k !== null && k <= toKey; });
                return list;
            }, [invoices, searchTerm, filterItemText, filterStatus, filterFrom, filterTo]);
            const [sortBy, setSortBy] = useState('date');
            const invWeight = inv => (inv.items || []).reduce((s, it) => s + getItemEffectiveWeight(it), 0);
            const sortedInvoices = useMemo(() => {
                const list = [...filteredInvoices];
                if (sortBy === 'customer') return list.sort((a, b) => a.customer.localeCompare(b.customer, 'fa'));
                if (sortBy === 'item') {
                    const firstItemName = inv => (inv.items && inv.items[0] && inv.items[0].name) || '';
                    return list.sort((a, b) => firstItemName(a).localeCompare(firstItemName(b), 'fa'));
                }
                if (sortBy === 'date-old') return list.sort((a, b) => a.timestamp - b.timestamp);
                if (sortBy === 'amount-desc') return list.sort((a, b) => (b.totalPrice || 0) - (a.totalPrice || 0));
                if (sortBy === 'amount-asc') return list.sort((a, b) => (a.totalPrice || 0) - (b.totalPrice || 0));
                if (sortBy === 'weight-desc') return list.sort((a, b) => invWeight(b) - invWeight(a));
                if (sortBy === 'weight-asc') return list.sort((a, b) => invWeight(a) - invWeight(b));
                return list.sort((a, b) => b.timestamp - a.timestamp);
            }, [filteredInvoices, sortBy]);

            // انتخاب چند سند + جمع انتخاب‌شده‌ها (بند ۷) — جمع‌ها از همان موتور محاسباتی مشترک (getItemEffectiveWeight/Total)
            const [selectedIds, setSelectedIds] = useState([]);
            const toggleSelect = (id) => setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
            const selectedInvoices = useMemo(() => sortedInvoices.filter(inv => selectedIds.includes(inv.id)), [sortedInvoices, selectedIds]);
            const selectionTotals = useMemo(() => selectedInvoices.reduce((acc, inv) => {
                const qty = (inv.items || []).reduce((s, it) => s + (Number(it.qty) || 0), 0);
                return { count: acc.count + 1, qty: acc.qty + qty, weight: acc.weight + invWeight(inv), amount: acc.amount + (inv.totalPrice || 0) };
            }, { count: 0, qty: 0, weight: 0, amount: 0 }), [selectedInvoices]);
            const [showSelectionReport, setShowSelectionReport] = useState(false);

            const startEditDate = (inv) => {
                setEditingDateId(inv.id);
                setEditingDateVal(inv.date);
            };

            const saveEditDate = (inv) => {
                const normalized = normalizeInvoiceDateStr(editingDateVal.trim());
                if (normalized && normalized !== inv.date) {
                    onUpdateDate && onUpdateDate(inv.id, inv.date, normalized);
                }
                setEditingDateId(null);
                setEditingDateVal('');
            };

            return (
                <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden flex-1 flex flex-col h-full shadow-sm">
                    {/* تب‌های گزارش: فاکتورهای فروش، خرید کالا (در راه/دریافت‌شده) و آنالیز/پردازش — تا این تاریخچه‌های مهم هم کنار فاکتورها در همین بخش گزارش‌ها دیده شوند */}
                    <div className="p-3 border-b border-slate-100 bg-white flex gap-2 overflow-x-auto">
                        <button onClick={() => setReportTab('sales')} className={`flex items-center gap-1.5 px-4 py-2 rounded-full font-bold text-sm whitespace-nowrap transition ${reportTab === 'sales' ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-900/20' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}><FileText size={15}/> فاکتورهای فروش <span className={`text-[10px] px-1.5 rounded-full ${reportTab==='sales'?'bg-white/20':'bg-white'}`}>{invoices.length}</span></button>
                        <button onClick={() => setReportTab('purchases')} className={`flex items-center gap-1.5 px-4 py-2 rounded-full font-bold text-sm whitespace-nowrap transition ${reportTab === 'purchases' ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-900/20' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}><Truck size={15}/> خرید کالا (در راه) <span className={`text-[10px] px-1.5 rounded-full ${reportTab==='purchases'?'bg-white/20':'bg-white'}`}>{(purchases||[]).length}</span></button>
                        <button onClick={() => setReportTab('presale')} className={`flex items-center gap-1.5 px-4 py-2 rounded-full font-bold text-sm whitespace-nowrap transition ${reportTab === 'presale' ? 'bg-teal-600 text-white shadow-sm shadow-teal-900/20' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}><Package size={15}/> پیش‌فروش از بار در راه <span className={`text-[10px] px-1.5 rounded-full ${reportTab==='presale'?'bg-white/20':'bg-white'}`}>{presaleReport.length}</span></button>
                        <button onClick={() => setReportTab('processing')} className={`flex items-center gap-1.5 px-4 py-2 rounded-full font-bold text-sm whitespace-nowrap transition ${reportTab === 'processing' ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-900/20' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}><RefreshCw size={15}/> آنالیز / پردازش <span className={`text-[10px] px-1.5 rounded-full ${reportTab==='processing'?'bg-white/20':'bg-white'}`}>{(processingOrders||[]).length}</span></button>
                    </div>
                    {reportTab === 'sales' && (<>
                    <div className="p-4 border-b border-slate-100 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="font-bold text-slate-700 flex items-center gap-2"><div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center"><FileText size={15}/></div> لیست فاکتورها <span className="text-xs font-normal text-slate-400 bg-white px-2.5 py-1 rounded-full border border-slate-200">{sortedInvoices.length} مورد</span></div>
                        <div className="flex gap-2 w-full sm:w-auto">
                            <div className="relative flex-1 sm:w-72"><Search size={18} className="absolute right-3 top-2.5 text-slate-400"/><input className="w-full border border-slate-200 rounded-full py-2 pr-10 pl-3 text-sm focus:outline-none focus:border-indigo-400 bg-slate-50 focus:bg-white transition-colors" placeholder="جستجو (نام کالا، مشتری، تاریخ، توضیحات)..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /></div>
                            <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="bg-white border border-slate-200 rounded-full py-2 px-3 text-sm text-slate-600 font-bold outline-none focus:border-indigo-500 transition-colors">
                                <option value="date">جدیدترین</option>
                                <option value="date-old">قدیمی‌ترین</option>
                                <option value="customer">مرتب‌سازی: مشتری (A→Z)</option>
                                <option value="item">مرتب‌سازی: نام بار/کالا (A→Z)</option>
                                <option value="amount-desc">بیشترین مبلغ</option>
                                <option value="amount-asc">کمترین مبلغ</option>
                                <option value="weight-desc">بیشترین وزن</option>
                                <option value="weight-asc">کمترین وزن</option>
                            </select>
                            <button onClick={() => setShowFilters(v => !v)} className={`flex items-center gap-1 px-3.5 py-2 rounded-full text-xs font-bold whitespace-nowrap border transition ${activeFilterCount > 0 ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}><Filter size={14}/> فیلتر {activeFilterCount > 0 ? `(${activeFilterCount})` : ''}</button>
                            <button onClick={() => exportInvoicesToExcel(selectedIds.length > 0 ? selectedInvoices : sortedInvoices, selectedIds.length > 0 ? 'فاکتورهای_منتخب' : 'گزارش_فاکتورها')} className="flex items-center gap-1 bg-emerald-600 text-white px-3.5 py-2 rounded-full text-xs font-bold whitespace-nowrap hover:bg-emerald-700 transition" title="خروجی ساده — یک ردیف به‌ازای هر فاکتور"><Download size={14}/> Excel ساده</button>
                            <button onClick={() => exportInvoicesFullReport(selectedIds.length > 0 ? selectedInvoices : sortedInvoices, selectedIds.length > 0 ? 'گزارش_کامل_منتخب' : 'گزارش_کامل')} className="flex items-center gap-1 bg-indigo-900 text-white px-3.5 py-2 rounded-full text-xs font-bold whitespace-nowrap hover:bg-indigo-800 transition" title="۵ شیت: ساده، تفکیک مشتری، تفکیک کالا، گزارش مالی، گزارش کسری — بر اساس فیلتر/انتخابِ فعلی"><FileBarChart size={14}/> گزارش کامل (۵ شیت)</button>
                        </div>
                    </div>
                    {showFilters && (
                        <div className="p-3 border-b border-slate-100 bg-indigo-50/50 flex flex-wrap gap-2 items-end">
                            <div>
                                <label className="text-[9px] text-slate-500 font-bold block mb-0.5">کالا/برند</label>
                                <input value={filterItemText} onChange={e => setFilterItemText(e.target.value)} placeholder="مثلاً زردچوبه" className="p-1.5 rounded-lg border border-slate-200 text-xs w-32" />
                            </div>
                            <div>
                                <label className="text-[9px] text-slate-500 font-bold block mb-0.5">از تاریخ</label>
                                <input value={filterFrom} onChange={e => setFilterFrom(e.target.value)} placeholder="1404/06/01" className="p-1.5 rounded-lg border border-slate-200 text-xs w-24" />
                            </div>
                            <div>
                                <label className="text-[9px] text-slate-500 font-bold block mb-0.5">تا تاریخ</label>
                                <input value={filterTo} onChange={e => setFilterTo(e.target.value)} placeholder="1404/06/20" className="p-1.5 rounded-lg border border-slate-200 text-xs w-24" />
                            </div>
                            <div>
                                <label className="text-[9px] text-slate-500 font-bold block mb-0.5">وضعیت</label>
                                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="p-1.5 rounded-lg border border-slate-200 text-xs">
                                    <option value="all">همه</option>
                                    <option value="completed">کامل</option>
                                    <option value="pending">در انتظار/بخشی</option>
                                </select>
                            </div>
                            {activeFilterCount > 0 && <button onClick={() => { setFilterItemText(''); setFilterFrom(''); setFilterTo(''); setFilterStatus('all'); }} className="text-[10px] text-red-500 font-bold hover:underline mb-1.5">پاک‌کردن فیلترها</button>}
                            <span className="text-[10px] text-indigo-600 font-bold mb-1.5 mr-auto">نمایش {formatNumber(sortedInvoices.length)} سند</span>
                        </div>
                    )}
                    {selectedIds.length > 0 && (
                        <div className="p-3 bg-indigo-50 border-b border-indigo-100 flex flex-wrap items-center gap-4 text-[11px] font-bold text-indigo-800">
                            <span>{formatNumber(selectionTotals.count)} سند انتخاب شد</span>
                            <span>{formatNumber(selectionTotals.qty)} عدد/کیسه</span>
                            <span>{formatNumber(selectionTotals.weight)} کیلو</span>
                            <span>مبلغ کل: {formatNumber(selectionTotals.amount)} تومان</span>
                            <button onClick={() => setShowSelectionReport(true)} className="flex items-center gap-1 bg-indigo-600 text-white px-2.5 py-1 rounded-lg hover:bg-indigo-700"><FileBarChart size={12}/> گزارش انتخاب‌شده‌ها</button>
                            <button onClick={() => setSelectedIds([])} className="text-red-500 hover:underline">لغو انتخاب</button>
                        </div>
                    )}
                    <div className="overflow-y-auto flex-1">
                        <table className="w-full text-sm text-right">
                            <thead className="bg-white text-slate-400 sticky top-0 z-10 shadow-sm text-xs"><tr><th className="p-4 font-medium w-8"></th><th className="p-4 font-medium">شماره/تاریخ</th><th className="p-4 font-medium">مشتری</th><th className="p-4 font-medium">وضعیت</th><th className="p-4 font-medium">مبلغ کل</th><th className="p-4 font-medium"></th></tr></thead>
                            <tbody className="divide-y divide-slate-50">
                                {sortedInvoices.length === 0 && <tr><td colSpan={7} className="p-10 text-center text-slate-400">خالی</td></tr>}
                                {sortedInvoices.map(inv => (
                                    <tr key={inv.id} className={`hover:bg-slate-50 transition-colors ${inv.status === 'pending' ? 'bg-amber-50/40' : ''} ${selectedIds.includes(inv.id) ? 'bg-indigo-50/60' : ''}`}>
                                        <td className="p-4" onClick={e => e.stopPropagation()}><input type="checkbox" checked={selectedIds.includes(inv.id)} onChange={() => toggleSelect(inv.id)} className="w-4 h-4" /></td>
                                        <td className="p-4">
                                            {editingDateId === inv.id ? (
                                                <div className="flex items-center gap-1">
                                                    <input
                                                        className="border border-orange-400 rounded-lg px-2 py-1 text-sm font-bold text-slate-700 w-32 focus:outline-none focus:border-orange-500 bg-orange-50"
                                                        value={editingDateVal}
                                                        onChange={e => setEditingDateVal(e.target.value)}
                                                        onKeyDown={e => { if(e.key === 'Enter') saveEditDate(inv); if(e.key === 'Escape') setEditingDateId(null); }}
                                                        autoFocus
                                                        dir="ltr"
                                                    />
                                                    <button onClick={() => saveEditDate(inv)} className="p-1 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600" title="ذخیره"><Check size={14}/></button>
                                                    <button onClick={() => setEditingDateId(null)} className="p-1 bg-slate-200 text-slate-600 rounded-lg hover:bg-slate-300" title="انصراف"><X size={14}/></button>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-1 group">
                                                    <div className="font-bold text-slate-700">{inv.date}</div>
                                                    {inv.dateChangeLogs && inv.dateChangeLogs.length > 0 && (
                                                        <span className="text-[9px] text-orange-500 bg-orange-50 px-1.5 py-0.5 rounded-full border border-orange-200 font-bold" title={`${inv.dateChangeLogs.length} بار ویرایش شده`}>✎ {inv.dateChangeLogs.length}</span>
                                                    )}
                                                    {inv.dateManuallySet && (
                                                        <span className="text-[9px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full border border-amber-200 font-bold" title={`این فاکتور با تاریخِ دستیِ «${inv.date}» ثبت شده${inv.realEntryTimestamp ? ` — روزِ واقعیِ ثبت: ${formatJalali(new Date(inv.realEntryTimestamp).toISOString(), true)}` : ''}`}>دستی</span>
                                                    )}
                                                    <button onClick={() => startEditDate(inv)} className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-orange-400 hover:text-orange-600 hover:bg-orange-50 rounded" title="ویرایش تاریخ"><Pencil size={12}/></button>
                                                </div>
                                            )}
                                            <div className="text-[10px] text-slate-400 font-mono mt-0.5 opacity-60">{inv.id.split('-')[2]}</div>
                                            {inv.firstShipmentDate && (
                                                <div className="text-[9px] text-emerald-600 font-bold mt-0.5 flex items-center gap-1"><Truck size={9}/> ارسال: {inv.firstShipmentDate}{inv.lastShipmentDate && inv.lastShipmentDate !== inv.firstShipmentDate ? ` تا ${inv.lastShipmentDate}` : ''}</div>
                                            )}
                                        </td>
                                        <td className="p-4 font-bold text-slate-800">
                                            <div className="flex items-center gap-1.5">
                                                {inv.customer}
                                                {inv.changeLogs && inv.changeLogs.length > 0 && (
                                                    <span
                                                        className="text-[9px] text-violet-600 bg-violet-50 px-1.5 py-0.5 rounded-full border border-violet-200 font-bold cursor-help"
                                                        title={`${inv.changeLogs.length} بار ویرایش شده. آخرین علت: ${inv.changeLogs[inv.changeLogs.length-1].reason || 'ثبت نشده'}`}
                                                    >✎ {inv.changeLogs.length} ویرایش</span>
                                                )}
                                            </div>
                                            {inv.changeLogs && inv.changeLogs.length > 0 && (
                                                <div className="text-[10px] text-slate-400 mt-0.5 max-w-[220px] truncate" title={inv.changeLogs[inv.changeLogs.length-1].reason}>
                                                    علت آخرین تغییر: {inv.changeLogs[inv.changeLogs.length-1].reason || '—'}
                                                </div>
                                            )}
                                        </td>
                                        <td className="p-4">
                                            {inv.status === 'pending' ? <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded-lg text-[10px] font-bold border border-amber-200">رزرو / در انتظار</span> : <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded-lg text-[10px] font-bold border border-emerald-200">تکمیل شده</span>}
                                            {inv.status === 'pending' && (inv.items||[]).some(it => (Number(it.shippedQty)||0) > 0) && (() => {
                                                const goneCount = (inv.items||[]).filter(it => (Number(it.qty)||0) - (Number(it.shippedQty)||0) <= 0.0001 && (Number(it.shippedQty)||0) > 0).length;
                                                return <div className="mt-1"><span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-lg text-[9px] font-bold border border-blue-200">{goneCount} از {(inv.items||[]).length} قلم رفته</span></div>;
                                            })()}
                                            {/* برچسب «چندمرحله‌ای»: هر وقت حداقل یکی از ردیف‌های این فاکتور بیش از یک محموله‌ی جداگانه (با احتمال وزن/فی متفاوت)
                                                داشته باشد — چه فاکتور هنوز رزرو باشد چه کاملاً تکمیل شده — تا در «مشاهده» بشود ریزِ هر بخش را دید. */}
                                            {(inv.items||[]).some(it => it.shipments && it.shipments.length > 1) && (
                                                <div className="mt-1"><span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-lg text-[9px] font-bold border border-purple-200" title="حداقل یک قلم این فاکتور در چند مرحله‌ی جدا (احتمالاً با وزن/قیمت متفاوت) ارسال شده — برای ریز آن روی «مشاهده» بزنید">چندمرحله‌ای</span></div>
                                            )}
                                        </td>
                                        <td className="p-4 font-black text-slate-700 text-base">{formatNumber(inv.totalPrice)} <span className="text-[9px] font-normal text-slate-400">تومان</span></td>
                                        <td className="p-4 text-left">
                                            <div className="flex items-center gap-2 justify-end">
                                                <button onClick={() => setPrintInv(inv)} className="text-slate-600 hover:bg-slate-50 hover:border-slate-200 px-3 py-1.5 rounded-lg border border-transparent transition-all font-medium text-xs flex items-center gap-1"><Printer size={12}/> چاپ</button>
                                                {onEdit && <button onClick={() => onEdit(inv)} className="text-amber-600 hover:bg-amber-50 hover:border-amber-200 px-3 py-1.5 rounded-lg border border-transparent transition-all font-medium text-xs flex items-center gap-1"><Pencil size={12}/> ویرایش</button>}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    </>)}
                    {reportTab === 'purchases' && (<>
                    <div className="p-4 border-b border-slate-100 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="font-bold text-slate-700 flex items-center gap-2"><Truck size={20} className="text-indigo-600"/> تاریخچه خرید کالا <span className="text-xs font-normal text-slate-400 bg-white px-2 py-0.5 rounded border border-slate-200">{filteredPurchasesReport.length} مورد</span></div>
                        <div className="relative flex-1 sm:w-72"><Search size={18} className="absolute right-3 top-2.5 text-slate-400"/><input className="w-full border border-slate-200 rounded-full py-2 pr-10 pl-3 text-sm focus:outline-none focus:border-indigo-400 bg-slate-50 focus:bg-white transition-colors" placeholder="جستجو فروشنده/توضیحات..." value={purchaseSearch} onChange={e => setPurchaseSearch(e.target.value)} /></div>
                    </div>
                    <div className="overflow-y-auto flex-1">
                        <table className="w-full text-sm text-right">
                            <thead className="bg-white text-slate-400 sticky top-0 z-10 shadow-sm text-xs"><tr><th className="p-4 font-medium">تاریخ</th><th className="p-4 font-medium">فروشنده</th><th className="p-4 font-medium">اقلام</th><th className="p-4 font-medium">وضعیت</th><th className="p-4 font-medium">مبلغ</th></tr></thead>
                            <tbody className="divide-y divide-slate-50">
                                {filteredPurchasesReport.length === 0 && <tr><td colSpan={5} className="p-10 text-center text-slate-400">خالی</td></tr>}
                                {filteredPurchasesReport.map(p => {
                                    const pRowTotal = (it) => (Number(it.weight) || 0) > 0 ? (Number(it.weight) || 0) * (Number(it.price) || 0) : (Number(it.qty) || 0) * (Number(it.price) || 0);
                                    const pTotal = p.totalPrice || p.items.reduce((s, it) => s + pRowTotal(it), 0);
                                    return (
                                    <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="p-4 font-bold text-slate-700">{p.date}</td>
                                        <td className="p-4 font-bold text-slate-800">{p.supplier}</td>
                                        <td className="p-4 text-xs text-slate-500">{p.items.map((it, idx) => (<span key={idx} className="inline-block ml-2"><ItemNameLabel it={it} inventoryItems={inventoryItems} isPending={p.status === 'in_transit'} /> ×{formatNumber(it.qty)}{it.weight > 0 && <span className="text-slate-400"> ({formatNumber(it.weight)}kg)</span>}</span>))}</td>
                                        <td className="p-4">{p.status === 'in_transit' ? <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded-lg text-[10px] font-bold border border-amber-200">در راه</span> : <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded-lg text-[10px] font-bold border border-emerald-200">دریافت‌شده</span>}</td>
                                        <td className="p-4 font-black text-slate-700">{pTotal > 0 ? <>{formatNumber(pTotal)} <span className="text-[9px] font-normal text-slate-400">تومان</span></> : '—'}</td>
                                    </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    </>)}
                    {reportTab === 'presale' && (<>
                    <div className="p-4 border-b border-slate-100 bg-slate-50">
                        <div className="font-bold text-slate-700 flex items-center gap-2"><Package size={20} className="text-teal-600"/> پیش‌فروش از بار در راه <span className="text-xs font-normal text-slate-400 bg-white px-2 py-0.5 rounded border border-slate-200">{presaleReport.length} کالا</span></div>
                        <p className="text-[11px] text-slate-400 mt-1">فقط کالاهایی اینجا هستند که هنگام ثبت خرید «در راه»، تیک «جزو موجودی قابل‌فروش حساب شود» برایشان زده شده. ستون «فروخته‌شده از این محل» یعنی از همان سهمیه در راه، تا این لحظه چقدر پیش‌فروش/رزرو شده است (تخمینی بر اساس منفی‌شدن موجودی فیزیکی خالص).</p>
                    </div>
                    <div className="overflow-y-auto flex-1">
                        <table className="w-full text-sm text-right">
                            <thead className="bg-white text-slate-400 sticky top-0 z-10 shadow-sm text-xs"><tr><th className="p-4 font-medium">کالا</th><th className="p-4 font-medium">کل قابل پیش‌فروش (در راه)</th><th className="p-4 font-medium">فروخته‌شده از این محل</th><th className="p-4 font-medium">باقیمانده قابل پیش‌فروش</th></tr></thead>
                            <tbody className="divide-y divide-slate-50">
                                {presaleReport.length === 0 && <tr><td colSpan={4} className="p-10 text-center text-slate-400">فعلاً هیچ باری برای پیش‌فروش علامت‌گذاری نشده</td></tr>}
                                {presaleReport.map(r => (
                                    <tr key={r.itemId} className="hover:bg-slate-50 transition-colors">
                                        <td className="p-4">
                                            <div className="font-bold text-slate-800">{r.name}</div>
                                            <div className="text-[10px] text-slate-400">{[r.brand, r.tag].filter(Boolean).join(' • ')}</div>
                                        </td>
                                        <td className="p-4"><span className="bg-sky-50 text-sky-700 px-2 py-1 rounded-lg text-[11px] font-bold border border-sky-200">{formatNumber(r.sellableIncoming)} {r.unit}</span></td>
                                        <td className="p-4">{r.soldFromIncoming > 0 ? <span className="bg-orange-50 text-orange-700 px-2 py-1 rounded-lg text-[11px] font-bold border border-orange-200">{formatNumber(r.soldFromIncoming)} {r.unit}</span> : <span className="text-slate-300">—</span>}</td>
                                        <td className="p-4"><span className="bg-emerald-50 text-emerald-700 px-2 py-1 rounded-lg text-[11px] font-bold border border-emerald-200">{formatNumber(r.remainingPresellable)} {r.unit}</span></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    </>)}
                    {reportTab === 'processing' && (<>
                    <div className="p-4 border-b border-slate-100 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="font-bold text-slate-700 flex items-center gap-2"><RefreshCw size={20} className="text-indigo-600"/> تاریخچه آنالیز / پردازش <span className="text-xs font-normal text-slate-400 bg-white px-2 py-0.5 rounded border border-slate-200">{filteredProcessingReport.length} مورد</span></div>
                        <div className="relative flex-1 sm:w-72"><Search size={18} className="absolute right-3 top-2.5 text-slate-400"/><input className="w-full border border-slate-200 rounded-full py-2 pr-10 pl-3 text-sm focus:outline-none focus:border-indigo-400 bg-slate-50 focus:bg-white transition-colors" placeholder="جستجو مقصد/توضیحات..." value={processingSearch} onChange={e => setProcessingSearch(e.target.value)} /></div>
                    </div>
                    <div className="overflow-y-auto flex-1">
                        <table className="w-full text-sm text-right">
                            <thead className="bg-white text-slate-400 sticky top-0 z-10 shadow-sm text-xs"><tr><th className="p-4 font-medium">تاریخ</th><th className="p-4 font-medium">مقصد / کارگاه</th><th className="p-4 font-medium">اقلام</th><th className="p-4 font-medium">وضعیت</th><th className="p-4 font-medium">ارزش</th></tr></thead>
                            <tbody className="divide-y divide-slate-50">
                                {filteredProcessingReport.length === 0 && <tr><td colSpan={5} className="p-10 text-center text-slate-400">خالی</td></tr>}
                                {filteredProcessingReport.map(o => {
                                    const oItems = o.status === 'returned' && o.returnedItems ? o.returnedItems : o.items;
                                    const oTotal = oItems.reduce((s, it) => s + (Number(it.weight) || 0) * (Number(it.price) || 0), 0);
                                    return (
                                    <tr key={o.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="p-4 font-bold text-slate-700">{o.date}</td>
                                        <td className="p-4 font-bold text-slate-800">{o.recipient}</td>
                                        <td className="p-4 text-xs text-slate-500">{oItems.map((it, idx) => (<span key={idx} className="inline-block ml-2"><ItemNameLabel it={it} inventoryItems={inventoryItems} isPending={o.status === 'reserved'} /> ×{formatNumber(it.qty)}{it.weight > 0 && <span className="text-slate-400"> ({formatNumber(it.weight)}kg)</span>}</span>))}</td>
                                        <td className="p-4">
                                            {o.status === 'reserved' && <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded-lg text-[10px] font-bold border border-slate-200">رزرو</span>}
                                            {o.status === 'sent' && <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-lg text-[10px] font-bold border border-blue-200">در حال پردازش</span>}
                                            {o.status === 'returned' && <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded-lg text-[10px] font-bold border border-emerald-200">برگشته / تکمیل</span>}
                                        </td>
                                        <td className="p-4 font-black text-slate-700">{oTotal > 0 ? <>{formatNumber(oTotal)} <span className="text-[9px] font-normal text-slate-400">تومان</span></> : '—'}</td>
                                    </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    </>)}
                    {printInv && <PrintInvoiceModal invoice={invoices.find(i => i.id === printInv.id) || printInv} settings={settings} inventoryItems={inventoryItems} onClose={() => setPrintInv(null)} />}
                    {showSelectionReport && (
                        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowSelectionReport(false)}>
                            <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
                                <div className="p-4 border-b border-slate-100 flex justify-between items-center shrink-0">
                                    <h3 className="font-bold text-slate-800 flex items-center gap-2"><FileBarChart size={18} className="text-indigo-600"/> گزارش {formatNumber(selectionTotals.count)} سند انتخاب‌شده</h3>
                                    <button onClick={() => setShowSelectionReport(false)} className="bg-slate-50 p-2 rounded-full hover:bg-red-50 hover:text-red-500"><X size={18}/></button>
                                </div>
                                <div className="overflow-y-auto flex-1 p-4 space-y-2">
                                    {selectedInvoices.map(inv => (
                                        <div key={inv.id} className="p-2.5 rounded-xl border border-slate-100 flex justify-between items-center text-xs">
                                            <div><span className="font-bold text-slate-700">{inv.customer}</span> <span className="text-slate-400">· {inv.date}</span></div>
                                            <div className="flex gap-3 text-slate-500">
                                                <span>{formatNumber((inv.items||[]).reduce((s,it)=>s+(Number(it.qty)||0),0))} عدد</span>
                                                <span>{formatNumber(invWeight(inv))} کیلو</span>
                                                <span className="font-bold text-emerald-700">{formatNumber(inv.totalPrice||0)} تومان</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="p-4 border-t border-slate-100 bg-slate-50 grid grid-cols-3 gap-2 text-center shrink-0">
                                    <div><div className="text-[10px] text-slate-400 font-bold">جمع تعداد</div><div className="font-black text-slate-800">{formatNumber(selectionTotals.qty)}</div></div>
                                    <div><div className="text-[10px] text-slate-400 font-bold">جمع وزن</div><div className="font-black text-slate-800">{formatNumber(selectionTotals.weight)}</div></div>
                                    <div><div className="text-[10px] text-slate-400 font-bold">جمع مبلغ</div><div className="font-black text-emerald-700">{formatNumber(selectionTotals.amount)}</div></div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            );
        };

