//## ═══ app/13-pending-outputs.jsx ═══
//## خروجی‌های در انتظار: جزئیات سند، گزارش خروجی‌های در انتظار، PendingOrders.
//## ترتیب فایل‌ها در build.py مهم است؛ همه‌ی بخش‌ها یک scope مشترک دارند.
        const DocumentDetailsModal = ({ row, onClose, inventoryItems = [] }) => {
            const dialogRef = useDialogA11y(onClose);
            if (!row || !row.data) return null;
            const { kind, data } = row;
            const meta = {
                purchase: { title: 'جزئیات خرید در راه', party: data.supplier || '—', date: data.date },
                processing: { title: 'جزئیات بار / پردازش', party: data.recipient || '—', date: data.date },
                consignment: { title: data.direction === 'borrowed' ? 'جزئیات امانی گرفته‌شده' : 'جزئیات امانی داده‌شده', party: data.party || '—', date: data.date }
            };
            const m = meta[kind] || { title: 'جزئیات سند', party: '—', date: '—' };
            const rows = Array.isArray(data.items) ? data.items : [];
            const rowTotal = it => { const w=parseDecimal(it.weight),q=parseDecimal(it.qty),p=parseDecimal(it.price); return (w>0?w:q)*p; };
            const total = data.totalPrice || rows.reduce((s,it)=>s+rowTotal(it),0);
            return <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm z-[9997] flex items-center justify-center p-4">
                <div ref={dialogRef} className="bg-white rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden" onClick={e=>e.stopPropagation()}>
                    <div className="bg-gradient-to-l from-indigo-700 to-indigo-600 text-white px-6 py-5 flex items-center justify-between gap-3"><div className="flex items-center gap-3"><div className="w-11 h-11 rounded-2xl bg-white/15 ring-1 ring-white/25 flex items-center justify-center"><FileText size={20}/></div><div><h3 className="font-black text-lg">{m.title}</h3><div className="text-[11px] text-indigo-100 mt-0.5">{m.party} • {m.date || '—'}</div></div></div><button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition" aria-label="بستن"><X size={20}/></button></div>
                    <div className="p-5 max-h-[70vh] overflow-y-auto bg-slate-50/60">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4 text-xs">
                            <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-sm"><span className="text-[10px] font-bold text-slate-400">طرف حساب</span><b className="block mt-1 text-sm font-black text-slate-800">{m.party}</b></div>
                            <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-sm"><span className="text-[10px] font-bold text-slate-400">تاریخ</span><b className="block mt-1 text-sm font-black text-slate-800">{data.date || '—'}</b></div>
                            <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-sm"><span className="text-[10px] font-bold text-slate-400">اقلام</span><b className="block mt-1 text-sm font-black text-slate-800">{rows.length} قلم</b></div>
                            <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-sm"><span className="text-[10px] font-bold text-slate-400">مبلغ</span><b className="block mt-1 text-sm font-black text-slate-800">{total ? `${formatNumber(total)} تومان` : '—'}</b></div>
                        </div>
                        {data.description && <div className="mb-4 p-3 rounded-xl bg-slate-50 border text-xs text-slate-600"><b>توضیحات:</b> {data.description}</div>}
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-2 overflow-x-auto"><table className="w-full text-xs border-collapse"><thead className="border-b-2 border-slate-800 text-slate-800 font-black"><tr><th className="p-2 text-right">کالا</th><th className="p-2 text-center">تعداد</th><th className="p-2 text-center">وزن</th><th className="p-2 text-center">قیمت</th><th className="p-2 text-left">کل</th></tr></thead><tbody className="divide-y divide-slate-100">
                            {rows.map((it,i)=><tr key={i} className="even:bg-slate-50/70"><td className="p-2 font-bold text-slate-700"><ItemNameLabel it={it} inventoryItems={inventoryItems} isPending={kind!=='purchase' || data.status==='in_transit'} /></td><td className="p-2 text-center">{formatNumber(it.qty || 0)}</td><td className="p-2 text-center">{it.weight ? formatNumber(it.weight) : '—'}</td><td className="p-2 text-center">{it.price ? formatNumber(it.price) : '—'}</td><td className="p-2 text-left font-bold">{rowTotal(it) ? formatNumber(rowTotal(it)) : '—'}</td></tr>)}
                            {rows.length===0&&<tr><td colSpan="5" className="p-8 text-center text-slate-400">قلمی ثبت نشده است.</td></tr>}
                        </tbody></table></div>
                    </div>
                    <div className="p-3 border-t bg-slate-50 flex justify-end"><button onClick={onClose} className="px-5 py-2.5 rounded-full bg-slate-800 text-white text-xs font-bold hover:bg-slate-900 transition">بستن</button></div>
                </div>
            </div>;
        };

        // گزارش جامع خروجی‌های در انتظار: هر ردیفِ کالا در فاکتورهای «در انتظار» و سفارش‌های پردازش
        // «هنوز ارسال‌نشده» را جمع می‌کند و اجازه می‌دهد بر اساس کالا، بر اساس مشتری/گیرنده، یا به‌صورت
        // یک جدول کامل و ترکیبی دید بزنی — دقیقاً برای پرسش‌هایی مثل «این تعداد زردچوبه قراره بره برای
        // کدوم فاکتورا». فقط چیزهایی که واقعاً «قراره از انبار خارج بشن و هنوز نرفته‌اند» شمرده می‌شوند
        // (فاکتورهای در انتظار با مانده مثبت، و سفارش‌های پردازشِ رزروشده که هنوز ارسال نشده‌اند)؛
        // خریدهای در راه (که در حال ورود هستند، نه خروج) و امانی‌های در انتظار برگشت (که از قبل خارج
        // شده‌اند و منتظر خروج نیستند) در این گزارش نمی‌آیند چون معنای «قراره خارج بشود» ندارند.
        const PendingOutputsReportModal = ({ invoices, processingOrders, inventoryItems, onClose, onViewDoc }) => {
            const dialogRef = useDialogA11y(onClose);
            const [query, setQuery] = useState('');
            const [groupBy, setGroupBy] = useState('item'); // item | party | table

            const rows = useMemo(() => {
                const out = [];
                (invoices || []).filter(inv => inv.status === 'pending').forEach(inv => {
                    (inv.items || []).forEach(it => {
                        const remaining = (Number(it.qty) || 0) - (Number(it.shippedQty) || 0);
                        if (remaining <= 0.0001) return;
                        const display = resolveItemDisplay(it, inventoryItems, true);
                        out.push({
                            itemKey: it.itemId || normalizeMahakName(display.name || it.name || 'کالای متفرقه'),
                            itemName: display.name || it.name || 'کالای متفرقه',
                            qty: remaining, unit: it.unit || '', weight: getItemRemainingWeight(it),
                            party: inv.customer || '—', docLabel: 'فاکتور', docId: inv.id,
                            date: inv.date, kind: 'invoice', raw: inv,
                        });
                    });
                });
                (processingOrders || []).filter(o => o.status === 'reserved').forEach(o => {
                    (o.items || []).forEach(it => {
                        const qty = Number(it.qty) || 0;
                        if (qty <= 0.0001) return;
                        out.push({
                            itemKey: it.itemId || normalizeMahakName(it.name || 'کالای متفرقه'),
                            itemName: it.name || 'کالای متفرقه',
                            qty, unit: it.unit || '', weight: Number(it.weight) || 0,
                            party: o.recipient || '—', docLabel: 'آنالیز / پردازش', docId: o.id,
                            date: o.date, kind: 'processing', raw: o,
                        });
                    });
                });
                return out;
            }, [invoices, processingOrders, inventoryItems]);

            const q = normalizeMahakName(query);
            const filteredRows = q ? rows.filter(r => normalizeMahakName(r.itemName).includes(q) || normalizeMahakName(r.party).includes(q)) : rows;

            const byItem = useMemo(() => {
                const map = {};
                filteredRows.forEach(r => {
                    if (!map[r.itemKey]) map[r.itemKey] = { itemName: r.itemName, unit: r.unit, total: 0, totalWeight: 0, sources: [] };
                    map[r.itemKey].total += r.qty;
                    map[r.itemKey].totalWeight += (r.weight || 0);
                    map[r.itemKey].sources.push(r);
                });
                return Object.values(map).sort((a, b) => b.total - a.total);
            }, [filteredRows]);

            const byParty = useMemo(() => {
                const map = {};
                filteredRows.forEach(r => {
                    const key = r.party || '—';
                    if (!map[key]) map[key] = { party: key, totalDocs: new Set(), totalWeight: 0, items: [] };
                    map[key].totalDocs.add(`${r.kind}-${r.docId}`);
                    map[key].totalWeight += (r.weight || 0);
                    map[key].items.push(r);
                });
                return Object.values(map).map(g => ({ ...g, totalDocs: g.totalDocs.size })).sort((a, b) => b.items.length - a.items.length);
            }, [filteredRows]);

            const [expanded, setExpanded] = useState(() => new Set());
            const toggleExpand = (key) => setExpanded(prev => { const next = new Set(prev); if (next.has(key)) next.delete(key); else next.add(key); return next; });

            const totalW = filteredRows.reduce((s, r) => s + (r.weight || 0), 0);
            const docCount = new Set(filteredRows.map(r => `${r.kind}-${r.docId}`)).size;
            const maxItemTotal = Math.max(1, ...byItem.map(g => g.total));
            const srcRow = (s, i, main, sub) => (
                <button key={i} onClick={()=>onViewDoc && onViewDoc(s)} className="w-full text-right px-4 py-2.5 flex items-center justify-between gap-3 hover:bg-indigo-50 transition">
                    <div className="min-w-0"><div className="font-bold text-slate-700 text-xs truncate">{main}</div><div className="text-[10px] text-slate-400 mt-0.5">{sub}</div></div>
                    <span className="font-black text-slate-700 text-xs shrink-0">{formatNumber(s.qty)} {s.unit}{s.weight > 0 && <span className="text-slate-400 font-medium"> ({formatNumber(s.weight)} kg)</span>}</span>
                </button>
            );
            return (
                <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div ref={dialogRef} className="bg-white rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl animate-in zoom-in-95 overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="bg-gradient-to-l from-indigo-700 to-indigo-600 text-white px-6 py-5 flex justify-between items-center shrink-0">
                            <div className="flex items-center gap-3"><div className="w-11 h-11 rounded-2xl bg-white/15 ring-1 ring-white/25 flex items-center justify-center"><FileBarChart size={20}/></div><div><h3 className="font-black text-lg">گزارش جامع خروجی‌های در انتظار</h3><div className="text-[11px] text-indigo-100 mt-0.5">هر کالا قراره برای کدام فاکتور یا گیرنده برود</div></div></div>
                            <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition" aria-label="بستن"><X size={20}/></button>
                        </div>
                        <div className="px-5 pt-4 pb-3 border-b border-slate-100 shrink-0 space-y-3 bg-slate-50/60">
                            <div className="grid grid-cols-3 gap-2.5">
                                {[['کالای متفاوت',byItem.length,'text-indigo-700'],['سند در انتظار',docCount,'text-amber-600'],['وزن کل (kg)',formatNumber(totalW),'text-emerald-700']].map(([k,v,c])=>(<div key={k} className="bg-white rounded-2xl border border-slate-200 shadow-sm px-4 py-3"><div className="text-[10px] font-bold text-slate-400">{k}</div><div className={`text-xl font-black mt-1 ${c}`}>{v}</div></div>))}
                            </div>
                            <div className="flex flex-col md:flex-row gap-2.5">
                                <div className="flex-1 flex items-center gap-2 bg-white border border-slate-200 rounded-full px-4 py-2.5"><Search size={16} className="text-slate-400 shrink-0"/><input autoFocus value={query} onChange={e=>setQuery(e.target.value)} placeholder="جستجو در نام کالا یا مشتری..." className="flex-1 bg-transparent outline-none text-sm"/></div>
                                <div className="flex gap-1 bg-white border border-slate-200 rounded-full p-1">
                                    {[{k:'item',l:'بر اساس کالا'},{k:'party',l:'بر اساس مشتری'},{k:'table',l:'جدول کامل'}].map(t => (<button key={t.k} type="button" onClick={()=>setGroupBy(t.k)} className={`px-4 py-1.5 rounded-full text-xs font-black transition whitespace-nowrap ${groupBy===t.k?'bg-indigo-600 text-white shadow':'text-slate-600 hover:bg-slate-100'}`}>{t.l}</button>))}
                                </div>
                            </div>
                        </div>
                        <div className="p-5 overflow-y-auto flex-1 space-y-2.5">
                            {filteredRows.length === 0 && <div className="text-center text-sm text-slate-400 py-10">چیزی برای خروج در انتظار پیدا نشد.</div>}
                            {groupBy === 'item' && byItem.map(g => (
                                <div key={g.itemName} className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm">
                                    <button type="button" onClick={()=>toggleExpand(g.itemName)} className="w-full p-3.5 hover:bg-slate-50 text-right">
                                        <div className="flex items-center justify-between gap-2"><div className="flex items-center gap-2 min-w-0"><ChevronDown size={15} className={`text-slate-400 transition-transform shrink-0 ${expanded.has(g.itemName)?'rotate-180':''}`}/><span className="font-black text-slate-800 text-sm truncate">{g.itemName}</span><span className="text-[10px] text-slate-400 shrink-0">{g.sources.length} سند</span></div>
                                        <span className="text-xs font-black bg-amber-100 text-amber-800 px-3 py-1 rounded-full shrink-0">{formatNumber(+g.total.toFixed(2))} {g.unit}{g.totalWeight > 0 && ` • ${formatNumber(g.totalWeight)} kg`}</span></div>
                                        <div className="mt-2.5 h-1.5 rounded-full bg-slate-100 overflow-hidden"><div className="h-full rounded-full bg-gradient-to-l from-amber-400 to-amber-500" style={{width: `${Math.max(4, (g.total / maxItemTotal) * 100)}%`}}/></div>
                                    </button>
                                    {expanded.has(g.itemName) && <div className="border-t border-slate-100 divide-y divide-slate-100 bg-slate-50/50">{g.sources.map((s, i) => srcRow(s, i, `${s.docLabel} — ${s.party}`, s.date))}</div>}
                                </div>
                            ))}
                            {groupBy === 'party' && byParty.map(g => (
                                <div key={g.party} className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm">
                                    <button type="button" onClick={()=>toggleExpand(g.party)} className="w-full flex items-center justify-between gap-2 p-3.5 hover:bg-slate-50">
                                        <div className="flex items-center gap-2 min-w-0"><ChevronDown size={15} className={`text-slate-400 transition-transform shrink-0 ${expanded.has(g.party)?'rotate-180':''}`}/><span className="font-black text-slate-800 text-sm truncate">{g.party}</span><span className="text-[10px] text-slate-400 shrink-0">{g.totalDocs} سند</span></div>
                                        <span className="text-xs font-black bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full shrink-0">{g.items.length} قلم{g.totalWeight > 0 && ` • ${formatNumber(g.totalWeight)} kg`}</span>
                                    </button>
                                    {expanded.has(g.party) && <div className="border-t border-slate-100 divide-y divide-slate-100 bg-slate-50/50">{g.items.map((s, i) => srcRow(s, i, s.itemName, `${s.docLabel} • ${s.date}`))}</div>}
                                </div>
                            ))}
                            {groupBy === 'table' && (
                                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-2 overflow-x-auto">
                                    <table className="w-full text-xs border-collapse">
                                        <thead><tr className="border-b-2 border-slate-800 text-slate-800"><th className="p-2.5 text-right font-black">کالا</th><th className="p-2.5 text-right font-black">مشتری / گیرنده</th><th className="p-2.5 text-right font-black">نوع</th><th className="p-2.5 text-right font-black">تاریخ</th><th className="p-2.5 text-left font-black">تعداد</th><th className="p-2.5 text-left font-black">وزن (kg)</th></tr></thead>
                                        <tbody>
                                            {[...filteredRows].sort((a,b)=>String(a.itemName).localeCompare(String(b.itemName),'fa')).map((s, i) => (
                                                <tr key={i} className="even:bg-slate-50/70 hover:bg-indigo-50 cursor-pointer" onClick={()=>onViewDoc && onViewDoc(s)}>
                                                    <td className="p-2.5 font-bold text-slate-800">{s.itemName}</td><td className="p-2.5 text-slate-600">{s.party}</td><td className="p-2.5 text-slate-400">{s.docLabel}</td><td className="p-2.5 text-slate-400">{s.date}</td>
                                                    <td className="p-2.5 text-left font-black">{formatNumber(s.qty)} {s.unit}</td><td className="p-2.5 text-left font-black text-indigo-700">{s.weight > 0 ? formatNumber(s.weight) : '—'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            );
        };

        const PendingOrders = ({ invoices, onFinalizeShipment, onCancel, onEdit, settings, inventoryItems, purchases, processingOrders, consignments, onNavigate, onDeleteConsignment, onManageConsignment }) => {
            const pendingInvoices = invoices.filter(inv => inv.status === 'pending');
            const inTransitPurchases = (purchases || []).filter(p => p.status === 'in_transit');
            const activeProcessing = (processingOrders || []).filter(o => o.status === 'reserved' || o.status === 'sent');
            const pendingConsignments = (consignments || []).filter(c => c.status === 'pending');
            const [printInv, setPrintInv] = useState(null); const [detailRow, setDetailRow] = useState(null);
            // فاکتوری که پاپ‌آپ «تایید نهایی/ثبت ارسال» برایش باز است (مدیریت بار به‌بار + قیمت/وزن تغییرکرده +
            // سررسید، همه اینجا و فقط اینجا پرسیده می‌شود — نه در صفحه‌ی مشاهده و نه در ویرایش)
            const [confirmingInv, setConfirmingInv] = useState(null);
            const [pendingFilter, setPendingFilter] = useState('all');
            const [showOutputsReport, setShowOutputsReport] = useState(false);
            const totalCount = pendingInvoices.length + inTransitPurchases.length + activeProcessing.length + pendingConsignments.length;

            const getPendingRowTs = (item) => {
                if (!item) return 0;
                const raw = item.timestamp ?? item.createdAt ?? item.updatedAt ?? item.dateTimestamp ?? 0;
                if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
                const n = Number(raw);
                if (Number.isFinite(n) && n > 0) return n;
                const parsed = Date.parse(String(raw || ''));
                return Number.isFinite(parsed) ? parsed : 0;
            };

            const combined = useMemo(() => {
                const rows = [
                    ...pendingInvoices.map(inv => ({ kind: 'invoice', ts: getPendingRowTs(inv), data: inv })),
                    ...inTransitPurchases.map(p => ({ kind: 'purchase', ts: getPendingRowTs(p), data: p })),
                    ...activeProcessing.map(o => ({ kind: 'processing', ts: getPendingRowTs(o), data: o })),
                    ...pendingConsignments.map(c => ({ kind: 'consignment', ts: getPendingRowTs(c), data: c })),
                ];
                let filtered = rows;
                if (pendingFilter === 'invoice') filtered = rows.filter(r => r.kind === 'invoice');
                else if (pendingFilter === 'purchase') filtered = rows.filter(r => r.kind === 'purchase');
                else if (pendingFilter === 'processing') filtered = rows.filter(r => r.kind === 'processing');
                else if (pendingFilter === 'consignment') filtered = rows.filter(r => r.kind === 'consignment');
                return filtered.sort((a,b) => pendingFilter === 'oldest' ? a.ts-b.ts : b.ts-a.ts);
            }, [pendingInvoices, inTransitPurchases, activeProcessing, pendingConsignments, pendingFilter]);

            const kindMeta = {
                invoice: { label: 'فاکتور در انتظار', badge: 'bg-amber-100 text-amber-800 border-amber-200', icon: Truck },
                purchase: { label: 'خرید در راه', badge: 'bg-sky-100 text-sky-700 border-sky-200', icon: ArrowDownLeft },
                processing: { label: 'آنالیز / ارسال', badge: 'bg-purple-100 text-purple-700 border-purple-200', icon: RefreshCw },
                consignment_borrowed: { label: 'امانی گرفته‌شده (باید برگردد)', badge: 'bg-teal-100 text-teal-700 border-teal-200', icon: Handshake },
                consignment_lent: { label: 'امانی داده‌شده (منتظر برگشت)', badge: 'bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200', icon: Handshake },
            };

            const tiles = [
                { key: 'all', label: 'همه', count: totalCount, cls: 'text-slate-700' },
                { key: 'invoice', label: 'فاکتور رزرو', count: pendingInvoices.length, cls: 'text-amber-600' },
                { key: 'purchase', label: 'خرید در راه', count: inTransitPurchases.length, cls: 'text-sky-600' },
                { key: 'processing', label: 'آنالیز / ارسال', count: activeProcessing.length, cls: 'text-purple-600' },
                { key: 'consignment', label: 'امانی', count: pendingConsignments.length, cls: 'text-teal-600' },
            ];
            const docCard = (key, accent, badge, label, title, date, items, onDetail, extra) => (
                <div key={key} className={`bg-white border border-slate-200 border-r-4 ${accent} rounded-2xl p-4 shadow-sm hover:shadow-md transition-all`}>
                    <div className="flex justify-between items-start gap-3 mb-3">
                        <div className="min-w-0"><span className={`inline-block mb-1.5 text-[10px] px-2 py-0.5 rounded-full border font-black ${badge}`}>{label}</span><div className="font-black text-slate-800 text-sm truncate">{title}</div></div>
                        <div className="text-left shrink-0"><div className="flex items-center gap-1 text-[10px] text-slate-400 font-bold"><Calendar size={11}/> {date}</div><div className="mt-1 text-[10px] font-black text-slate-500 bg-slate-100 rounded-full px-2 py-0.5 w-fit mr-auto">{items.length} قلم</div></div>
                    </div>
                    <div className="flex flex-wrap gap-1.5 pt-3 border-t border-dashed border-slate-200">
                        {items.map((it, idx) => (<span key={idx} className="inline-flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[11px]"><ItemNameLabel it={it} inventoryItems={inventoryItems} isPending={true} className="font-bold text-slate-700" /><b className="text-indigo-700">×{formatNumber(it.qty || 0)}</b></span>))}
                    </div>
                    <div className="mt-3 flex justify-end items-center gap-2 flex-wrap">{extra}<button type="button" onClick={onDetail} className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-slate-800 hover:bg-slate-900 text-white text-[11px] font-black transition"><Eye size={13}/> جزئیات بار</button></div>
                </div>
            );

            return (
                <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm h-full flex flex-col">
                    <div className="bg-gradient-to-l from-indigo-700 via-indigo-600 to-indigo-800 text-white px-5 py-5 shrink-0">
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                            <div className="flex items-center gap-3"><div className="w-11 h-11 rounded-2xl bg-white/15 ring-1 ring-white/25 flex items-center justify-center"><Truck size={20}/></div><div><div className="font-black text-lg">خروجی‌های در انتظار</div><div className="text-[11px] text-indigo-100 mt-0.5">هنوز نهایی یا تحویل نشده‌اند • {totalCount} مورد</div></div></div>
                            <button type="button" onClick={()=>setShowOutputsReport(true)} className="flex items-center gap-1.5 text-xs font-black bg-white text-indigo-700 hover:bg-indigo-50 px-4 py-2.5 rounded-full shadow-sm transition"><FileBarChart size={14}/> گزارش جامع خروجی‌ها</button>
                        </div>
                    </div>
                    <div className="px-4 pt-4 shrink-0">
                        <div className="grid grid-cols-5 gap-2">
                            {tiles.map(t => (
                                <button key={t.key} type="button" onClick={() => setPendingFilter(t.key)} className={`rounded-2xl border px-2 py-2.5 text-center transition-all ${pendingFilter===t.key ? 'bg-indigo-50 border-indigo-300 ring-2 ring-indigo-200' : 'bg-white border-slate-200 hover:bg-slate-50'}`}>
                                    <div className={`text-lg font-black leading-none ${t.cls}`}>{t.count}</div>
                                    <div className="text-[10px] font-bold text-slate-500 mt-1.5 leading-4">{t.label}</div>
                                </button>
                            ))}
                        </div>
                        <div className="flex items-center gap-2 mt-3 text-[11px]"><span className="text-slate-400 font-bold">مرتب‌سازی:</span>
                            {[{key:'newest',label:'جدیدترین'},{key:'oldest',label:'قدیمی‌ترین'}].map(s => (<button key={s.key} type="button" onClick={()=>setPendingFilter(s.key)} className={`px-3 py-1 rounded-full border font-bold transition ${pendingFilter===s.key?'bg-slate-800 text-white border-slate-800':'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>{s.label}</button>))}
                        </div>
                    </div>
                    <div className="p-4 space-y-3 overflow-y-auto flex-1 custom-scrollbar">
                        {combined.length === 0 ? (
                            <div className="h-40 flex flex-col items-center justify-center text-slate-300"><PackageX size={48} className="mb-2" strokeWidth={1.5} /><p className="text-sm font-bold text-slate-400">هیچ موردی در صف نیست</p></div>
                        ) : (
                            combined.map((row) => {
                                if (row.kind === 'invoice') {
                                    const inv = row.data;
                                    return (
                                        <div key={`inv-${inv.id}`} className="bg-white border border-slate-200 border-r-4 border-amber-400 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all">
                                            <div className="flex justify-between items-start gap-3 mb-3">
                                                <div className="min-w-0"><span className={`inline-block mb-1.5 text-[10px] px-2 py-0.5 rounded-full border font-black ${kindMeta.invoice.badge}`}>{kindMeta.invoice.label}</span><div className="font-black text-slate-800 text-sm truncate">{inv.customer}</div></div>
                                                <div className="text-left shrink-0"><div className="flex items-center gap-1 text-[10px] text-slate-400 font-bold"><Calendar size={11}/> {inv.date}</div><div className="mt-1 text-[10px] font-black text-amber-700 bg-amber-50 border border-amber-100 rounded-full px-2 py-0.5 w-fit mr-auto">{inv.items.length} قلم</div></div>
                                            </div>
                                            <div className="flex flex-wrap gap-1.5 pt-3 border-t border-dashed border-slate-200">
                                                {inv.items.map((i, idx) => (
                                                    <span key={idx} className="inline-flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[11px]">
                                                        <ItemNameLabel it={i} inventoryItems={inventoryItems} isPending={true} className="font-bold text-slate-700" />
                                                        {(() => { const b = resolveItemDisplay(i, inventoryItems, true).display.brand; return b && b !== 'متفرقه' && (<span className="bg-indigo-50 text-indigo-600 text-[9px] px-1.5 py-0.5 rounded border border-indigo-100 font-bold">{b}</span>); })()}
                                                        <b className="text-indigo-700">×{formatNumber(i.qty || 0)}</b>
                                                    </span>
                                                ))}
                                            </div>
                                            <div className="mt-3 flex items-center gap-2 flex-wrap">
                                                <button onClick={() => setConfirmingInv(inv)} className="flex-1 min-w-[120px] py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl flex items-center justify-center gap-1.5 text-xs font-black transition shadow-sm"><Check size={15}/> تایید نهایی</button>
                                                <button onClick={() => onEdit(inv)} className="w-10 h-10 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-xl flex items-center justify-center transition border border-blue-100" title="ویرایش" aria-label="ویرایش"><Edit3 size={15}/></button>
                                                <button onClick={() => setPrintInv(inv)} className="w-10 h-10 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-xl flex items-center justify-center transition border border-indigo-100" title="چاپ" aria-label="چاپ"><Printer size={15}/></button>
                                                <button onClick={() => onCancel(inv.id)} className="w-10 h-10 bg-red-50 text-red-500 hover:bg-red-100 rounded-xl flex items-center justify-center transition border border-red-100" title="لغو فاکتور" aria-label="لغو فاکتور"><X size={15}/></button>
                                            </div>
                                        </div>
                                    );
                                }
                                if (row.kind === 'purchase') { const x = row.data; return docCard(`pur-${x.id}`, 'border-sky-400', kindMeta.purchase.badge, kindMeta.purchase.label, x.supplier, x.date, x.items, () => setDetailRow({kind:'purchase',data:x})); }
                                if (row.kind === 'consignment') { const c = row.data; const cm = kindMeta[c.direction === 'borrowed' ? 'consignment_borrowed' : 'consignment_lent']; return docCard(`cons-${c.id}`, c.direction === 'borrowed' ? 'border-teal-400' : 'border-fuchsia-400', cm.badge, cm.label, c.party, c.date, c.items, () => setDetailRow({kind:'consignment',data:c}), (<><button type="button" onClick={() => onManageConsignment && onManageConsignment(c)} className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-[11px] font-black transition"><Edit3 size={13}/> ویرایش</button><button type="button" onClick={() => onDeleteConsignment && onDeleteConsignment(c.id)} className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-red-50 border border-red-100 hover:bg-red-100 text-red-600 text-[11px] font-black transition"><Trash2 size={13}/> حذف</button></>)); }
                                const o = row.data;
                                return docCard(`proc-${o.id}`, 'border-purple-400', kindMeta.processing.badge, kindMeta.processing.label, o.recipient, o.date, o.items, () => setDetailRow({kind:'processing',data:o}));
                            })
                        )}
                    </div>
                    {printInv && <PrintInvoiceModal invoice={printInv} settings={settings} inventoryItems={inventoryItems} onClose={() => setPrintInv(null)} />}
                    {detailRow && <DocumentDetailsModal row={detailRow} inventoryItems={inventoryItems} onClose={() => setDetailRow(null)} />}
                    {showOutputsReport && <PendingOutputsReportModal invoices={invoices} processingOrders={processingOrders} inventoryItems={inventoryItems} onClose={()=>setShowOutputsReport(false)} onViewDoc={(s)=>{ setDetailRow({kind:s.kind, data:s.raw}); setShowOutputsReport(false); }}/>}
                    {confirmingInv && (
                        <ConfirmShipmentModal
                            invoice={invoices.find(i => i.id === confirmingInv.id) || confirmingInv}
                            invoices={invoices}
                            motherBagStock={settings?.motherBagStock}
                            onClose={() => setConfirmingInv(null)}
                            onSubmit={async (invId, decisions, dueOverride, motherBagConsumptions) => { await onFinalizeShipment(invId, decisions, dueOverride, motherBagConsumptions); setConfirmingInv(null); }}
                        />
                    )}
                </div>
            );
        };

