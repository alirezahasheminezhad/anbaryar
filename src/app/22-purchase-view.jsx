//## ═══ app/22-purchase-view.jsx ═══
//## خرید کالا و کالای در راه (PurchaseView).
//## ترتیب فایل‌ها در build.py مهم است؛ همه‌ی بخش‌ها یک scope مشترک دارند.
        const PurchaseView = ({ items, purchases, warehouses, onAdd, onReceive, onCancel, onEdit, onDelete }) => {
            const toast = useToast();
            const [cart, setCart] = useState([]);
            const [supplier, setSupplier] = useState('');
            const [date, setDate] = useState(new Date().toLocaleDateString('fa-IR'));
            const [description, setDescription] = useState('');
            const [search, setSearch] = useState('');
            const [showNewItem, setShowNewItem] = useState(false);
            const [searchTerm, setSearchTerm] = useState('');
            const [editingPurchase, setEditingPurchase] = useState(null);
            const [printPurchase, setPrintPurchase] = useState(null);
            const [sortBy, setSortBy] = useState('newest');
            const [priorityFilter, setPriorityFilter] = useState('all');
            // منبع ورود کالا به انبار: همیشه خرید از فروشگاه/تامین‌کننده (تولید داخلی/آسیاب از بخش آنالیز/پردازش انجام می‌شود، نه اینجا)
            const source = 'purchase';
            const [warehouseId, setWarehouseId] = useState('');
            const [bagWeight, setBagWeight] = useState('');
            const [bagWeightUnit, setBagWeightUnit] = useState('g');
            const [deductionPerBag, setDeductionPerBag] = useState('');
            const [deductionUnit, setDeductionUnit] = useState('g');
            // فقط برای «در راه»: آیا این بار هرچند نرسیده، برای پیش‌فروش جزو موجودی قابل‌فروش حساب بشود؟
            const [countAsStock, setCountAsStock] = useState(false);
            const [priority, setPriority] = useState('normal');
            const filtered = search ? items.filter(i => smartItemMatch(i, search)) : [];

            const addExisting = (item) => {
                if (cart.find(c => c.itemId === item.id)) return;
                setCart([...cart, { itemId: item.id, name: item.name, brand: item.brand, tag: item.tag, unit: item.unit, qty: 1, weight: 0 }]);
                setSearch('');
            };
            const addNew = (d) => {
                setCart([...cart, { itemId: null, name: d.name, brand: d.brand || '', tag: d.tag || 'عمومی', unit: d.unit || 'عدد', qty: Number(d.qty) || 1, weight: Number(d.weight) || 0, price: Number(d.price) || 0 }]);
                setShowNewItem(false);
            };
            const updateQty = (idx, qty) => setCart(cart.map((c, i) => i === idx ? { ...c, qty: parseDecimal(qty) } : c));
            const updateWeight = (idx, weight) => setCart(cart.map((c, i) => i === idx ? { ...c, weight: parseDecimal(weight) } : c));
            const removeCart = (idx) => setCart(cart.filter((_, i) => i !== idx));
            const cartWeight = cart.reduce((s, c) => s + (Number(c.weight) || 0), 0);
            const cartTotal = cart.reduce((s, c) => s + ((Number(c.price) || 0) * (Number(c.qty) || 0)), 0);

            const submit = (asReceived) => {
                if (cart.length === 0) return toast.show('سبد خرید خالی است');
                if (!supplier) return toast.show('نام فروشنده/تامین‌کننده را وارد کنید');
                const deducG = deductionPerBag ? (deductionUnit === 'kg' ? Number(deductionPerBag) * 1000 : Number(deductionPerBag)) : null;
                const bagWG  = bagWeight      ? (bagWeightUnit === 'kg' ? Number(bagWeight) * 1000      : Number(bagWeight))      : null;
                onAdd({
                    id: generateId(), supplier, date, description, items: cart, totalPrice: cartTotal,
                    status: asReceived ? 'received' : 'in_transit', timestamp: Date.now(), priority,
                    source, warehouseId: warehouseId || null, bagWeight: bagWG, deductionPerBag: deducG,
                    countAsStock: !asReceived ? countAsStock : false,
                });
                setCart([]); setSupplier(''); setDescription(''); setCountAsStock(false); setPriority('normal');
                toast.show(asReceived ? '✓ خرید ثبت و مستقیم به انبار اضافه شد' : 'خرید به عنوان «در راه» ثبت شد. وقتی رسید، از لیست کنارش «دریافت شد» را بزنید.');
            };

            const filteredPurchases = useMemo(() => {
                const term = searchTerm.trim();
                let list = term ? purchases.filter(p => p.supplier.includes(term) || (p.description || '').includes(term)) : purchases;
                if (priorityFilter !== 'all') list = list.filter(p => (p.priority || 'normal') === priorityFilter);
                const rank = {urgent:4,high:3,normal:2,low:1};
                return [...list].sort((a,b)=> sortBy==='priority' ? (rank[b.priority||'normal']-rank[a.priority||'normal'] || b.timestamp-a.timestamp) : sortBy==='oldest' ? a.timestamp-b.timestamp : b.timestamp-a.timestamp);
            }, [purchases, searchTerm, priorityFilter, sortBy]);

            return (
                <div className="flex flex-col lg:flex-row gap-6">
                    <div className="lg:w-1/3 bg-white rounded-3xl border border-slate-200 flex flex-col overflow-hidden shadow-sm shrink-0">
                        <div className="p-4 bg-slate-50 border-b border-slate-100 space-y-3">
                            <div className="relative">
                                <Search className="absolute right-3 top-3 text-slate-400" size={18}/>
                                <input className="w-full pl-3 pr-10 py-2.5 rounded-full border border-slate-200 bg-white outline-none focus:border-indigo-500" placeholder="جستجوی کالای موجود در انبار..." value={search} onChange={e => setSearch(e.target.value)}/>
                                {filtered.length > 0 && (
                                    <div className="absolute top-full mt-1 right-0 w-full bg-white border border-slate-200 rounded-xl shadow-2xl z-30 max-h-56 overflow-y-auto">
                                        {(() => { const allNames = filtered.slice(0, 8).map(x => x.name); return filtered.slice(0, 8).map(item => { const { prefix, diff } = splitNameDiff(allNames, item.name); return (
                                            <div key={item.id} onClick={() => addExisting(item)} className="px-3 py-2 hover:bg-indigo-50 cursor-pointer border-b border-slate-50 last:border-0 text-sm flex justify-between items-center gap-2">
                                                <span className="font-bold text-slate-700 truncate">{prefix}{diff && <span className={`mr-1 px-1 rounded border ${stringToBadgeColor(diff)}`}>{diff}</span>}</span>
                                                <span className="text-xs text-left shrink-0 flex items-center gap-1"><ItemDistinguishBadges item={item}/> <span className="text-slate-300 font-mono">#{item.id.slice(-6)}</span></span>
                                            </div>
                                        ); }); })()}
                                    </div>
                                )}
                            </div>
                            <button onClick={() => setShowNewItem(true)} className="w-full py-2.5 bg-indigo-50 text-indigo-700 rounded-full border border-indigo-200 font-bold text-sm flex items-center justify-center gap-2 hover:bg-indigo-100 transition"><FilePlus size={16}/> کالای جدید (خارج از انبار)</button>
                            <input className="w-full p-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-500" placeholder="نام فروشنده / تامین‌کننده *" value={supplier} onChange={e => setSupplier(e.target.value)}/>
                            <div className="flex gap-2">
                                <input className="w-1/2 p-2.5 border border-slate-200 rounded-lg text-sm outline-none" value={date} onChange={e => setDate(e.target.value)} dir="ltr"/>
                                <input className="w-1/2 p-2.5 border border-slate-200 rounded-lg text-sm outline-none" placeholder="توضیحات" value={description} onChange={e => setDescription(e.target.value)}/>
                            </div>
                            <div>
                                <label className="text-[10px] text-slate-400 font-bold block mb-1">انبار مقصد</label>
                                <select className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-500" value={warehouseId} onChange={e => setWarehouseId(e.target.value)}>
                                    <option value="">— بدون انبار —</option>
                                    {(warehouses || []).map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-2 border-t border-dashed border-slate-200 pt-2">
                                <div>
                                    <label className="text-[10px] text-amber-700 font-bold block mb-1">کسری هر کیسه</label>
                                    <div className="flex gap-1">
                                        <input type="number" min="0" step="any" className="flex-1 min-w-0 p-2 bg-amber-50 border border-amber-200 rounded-lg text-sm outline-none focus:border-amber-400 text-center" placeholder="مقدار" value={deductionPerBag} onChange={e => setDeductionPerBag(e.target.value)} />
                                        <select className="p-2 bg-amber-50 border border-amber-200 rounded-lg text-sm outline-none focus:border-amber-400 font-bold text-amber-700 cursor-pointer" value={deductionUnit} onChange={e => setDeductionUnit(e.target.value)}>
                                            <option value="g">گرم</option>
                                            <option value="kg">کیلوگرم</option>
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] text-slate-500 font-bold block mb-1">وزن کیسه/کارتن</label>
                                    <div className="flex gap-1">
                                        <input type="number" min="0" step="any" className="flex-1 min-w-0 p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-slate-400 text-center" placeholder="مقدار" value={bagWeight} onChange={e => setBagWeight(e.target.value)} />
                                        <select className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-slate-400 font-bold text-slate-600 cursor-pointer" value={bagWeightUnit} onChange={e => setBagWeightUnit(e.target.value)}>
                                            <option value="g">گرم</option>
                                            <option value="kg">کیلوگرم</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                            <label className="flex items-start gap-2 bg-sky-50 border border-sky-200 rounded-lg p-2.5 cursor-pointer">
                                <input type="checkbox" className="mt-0.5 accent-sky-600 w-4 h-4 shrink-0" checked={countAsStock} onChange={e => setCountAsStock(e.target.checked)} />
                                <span className="text-[11px] text-sky-700 leading-relaxed"><b>فقط برای «در راه»:</b> این مقدار هرچند نرسیده، جزو موجودی قابل‌فروش حساب شود (برای پیش‌فروش قبل از رسیدن بار)</span>
                            </label>
                        </div>
                        {cart.length > 0 && (
                            <div className="text-[10px] text-slate-400 grid grid-cols-[1fr_76px_88px_28px] gap-1.5 px-3 pt-2">
                                <span>کالا</span><span className="text-center">تعداد</span><span className="text-center">وزن</span><span></span>
                            </div>
                        )}
                        <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-[120px]">
                            {cart.length === 0 && <div className="text-center text-slate-300 text-sm py-8">سبد خرید خالی است</div>}
                            {cart.map((c, idx) => (
                                <div key={idx} className="bg-slate-50 border border-slate-100 rounded-lg p-2">
                                    <div className="grid grid-cols-[1fr_76px_88px_28px] items-center gap-1.5">
                                        <div className="min-w-0">
                                            <div className="font-bold text-slate-700 text-sm truncate">{c.name}{!c.itemId && <span className="text-[9px] text-indigo-500 bg-indigo-50 px-1 rounded mr-1">جدید</span>}</div>
                                            <div className="text-[10px] text-slate-400 truncate">{itemDetailParts(c).join(' • ')}</div>
                                        </div>
                                        <input type="number" min="0" step="any" title="تعداد (کیسه)" className="w-full p-2 border border-slate-200 rounded-lg text-center text-base font-bold" value={c.qty} onChange={e => updateQty(idx, e.target.value)}/>
                                        <input type="number" min="0" step="any" title="وزن (کیلوگرم)" placeholder="وزن" className="w-full p-2 border border-indigo-200 rounded-lg text-center text-base font-black text-indigo-700 bg-indigo-50" value={c.weight || ''} onChange={e => updateWeight(idx, e.target.value)}/>
                                        <button onClick={() => removeCart(idx)} className="text-red-400 hover:text-red-600"><X size={16}/></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        {cartTotal > 0 && (
                            <div className="px-3 pb-1 text-left text-xs font-bold text-slate-500">
                                {cartWeight > 0 && <div className="text-slate-400 font-normal">وزن کل: {formatNumber(cartWeight)} کیلوگرم</div>}
                                جمع خرید: <span className="text-indigo-600">{formatNumber(cartTotal)} تومان</span>
                            </div>
                        )}
                        <div className="p-3 border-t border-slate-100 flex gap-2">
                            <button onClick={() => submit(false)} className="flex-1 py-3 border-2 border-amber-400 text-amber-700 bg-amber-50 rounded-xl font-bold text-sm hover:bg-amber-100 flex justify-center items-center gap-2"><Truck size={16}/> ثبت «در راه»</button>
                            <button onClick={() => submit(true)} className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm flex justify-center items-center gap-2"><Check size={16}/> دریافت فوری</button>
                        </div>
                    </div>
                    <div className="flex-1 bg-white rounded-3xl border border-slate-200 overflow-hidden flex flex-col shadow-sm">
                        <div className="p-4 border-b border-slate-100 bg-slate-50 flex flex-col gap-3">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div className="font-bold text-slate-700 flex items-center gap-2"><ArrowDownLeft size={20} className="text-indigo-600"/> لیست خریدها <span className="text-xs font-normal text-slate-400 bg-white px-2 py-0.5 rounded border border-slate-200">{filteredPurchases.length} مورد</span></div>
                                <div className="relative w-full sm:w-64"><Search size={16} className="absolute right-3 top-2.5 text-slate-400"/><input className="w-full border border-slate-200 rounded-xl py-2 pr-9 pl-3 text-sm outline-none focus:border-indigo-500" placeholder="جستجو فروشنده/توضیحات..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}/></div>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                <div className="flex bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm text-xs font-bold">
                                <select value={priorityFilter} onChange={e=>setPriorityFilter(e.target.value)} className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold"><option value="all">همه اولویت‌ها</option><option value="urgent">فوری</option><option value="high">مهم</option><option value="normal">عادی</option><option value="low">⚪ کم</option></select><select value={sortBy} onChange={e=>setSortBy(e.target.value)} className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold"><option value="newest">جدیدترین بالا</option><option value="oldest">قدیمی‌ترین</option><option value="priority">اولویت</option><option value="due">نزدیک‌ترین موعد</option></select></div>
                            </div>
                        </div>
                        <div className="overflow-y-auto flex-1 p-3 space-y-2">
                            {filteredPurchases.length === 0 && <div className="text-center text-slate-300 py-10">خالی</div>}
                            {filteredPurchases.map(p => {
                                const pRowTotal = (it) => (Number(it.weight) || 0) > 0 ? (Number(it.weight) || 0) * (Number(it.price) || 0) : (Number(it.qty) || 0) * (Number(it.price) || 0);
                                const pTotal = p.totalPrice || p.items.reduce((s, it) => s + pRowTotal(it), 0);
                                return (
                                <div key={p.id} className={`border rounded-xl p-3 ${p.status === 'in_transit' ? 'bg-amber-50/40 border-amber-200' : 'bg-white border-slate-100'}`}>
                                    <div className="flex justify-between items-start mb-1.5">
                                        <div className="flex items-start gap-2">
                                            <div>
                                                <div className="font-bold text-slate-800">{p.supplier}</div>
                                                <div className="text-[10px] text-slate-400 flex items-center gap-1"><Calendar size={10}/> {p.date}</div>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end gap-1">
                                            {p.status === 'in_transit' ? <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded-lg text-[10px] font-bold border border-amber-200 flex items-center gap-1"><Truck size={11}/> در راه</span> : <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded-lg text-[10px] font-bold border border-emerald-200">دریافت‌شده</span>}<span className={`px-2 py-1 rounded-lg text-[10px] font-bold border ${(p.priority||'normal')==='urgent'?'bg-red-50 text-red-600 border-red-200':(p.priority||'normal')==='high'?'bg-orange-50 text-orange-600 border-orange-200':'bg-slate-50 text-slate-500 border-slate-200'}`}>{(p.priority||'normal')==='urgent'?'فوری':(p.priority||'normal')==='high'?'مهم':(p.priority||'normal')==='low'?'⚪ کم':'عادی'}</span>
                                        </div>
                                    </div>
                                    <div className="text-xs text-slate-500 mb-2">
                                        {p.items.map((it, idx) => (<span key={idx} className="inline-block ml-2 mb-0.5"><ItemNameLabel it={it} inventoryItems={items} isPending={p.status === 'in_transit'} /> <b className="text-slate-700">×{formatNumber(it.qty)}</b>{it.weight > 0 && <span className="text-slate-400"> ({formatNumber(it.weight)} کیلو)</span>}</span>))}
                                    </div>
                                    {pTotal > 0 && <div className="text-xs font-bold text-indigo-600 mb-2">جمع مبلغ: {formatNumber(pTotal)} تومان</div>}
                                    {p.description && <div className="text-[11px] text-slate-400 mb-2">{p.description}</div>}
                                    <div className="flex gap-2 mb-1.5">
                                        <button onClick={() => setPrintPurchase(p)} className="flex-1 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg text-xs font-bold border border-indigo-100 flex items-center justify-center gap-1"><Printer size={13}/> چاپ</button>
                                        <button onClick={() => setEditingPurchase(p)} className="flex-1 py-1.5 bg-slate-50 text-slate-600 hover:bg-slate-100 rounded-lg text-xs font-bold border border-slate-200 flex items-center justify-center gap-1"><Edit3 size={13}/> ویرایش</button>
                                        <button onClick={() => onDelete(p.id)} className="flex-1 py-1.5 bg-red-50 text-red-500 hover:bg-red-100 rounded-lg text-xs font-bold border border-red-100 flex items-center justify-center gap-1"><Trash2 size={13}/> حذف</button>
                                    </div>
                                    <div className="flex gap-2">
                                        {p.status === 'in_transit' && (<>
                                            <button onClick={() => onReceive(p.id)} className="flex-1 py-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg text-xs font-bold border border-emerald-100 flex items-center justify-center gap-1"><Check size={13}/> دریافت شد</button>
                                            <button onClick={() => onCancel(p.id)} className="flex-1 py-1.5 bg-amber-50 text-amber-600 hover:bg-amber-100 rounded-lg text-xs font-bold border border-amber-100 flex items-center justify-center gap-1"><X size={13}/> لغو</button>
                                        </>)}
                                    </div>
                                </div>
                                );
                            })}
                        </div>
                    </div>
                    {showNewItem && <NewPurchaseItemModal onClose={() => setShowNewItem(false)} onAdd={addNew}/>}
                    {editingPurchase && <EditPurchaseModal purchase={editingPurchase} items={items} onClose={() => setEditingPurchase(null)} onSave={(p) => { onEdit(p); setEditingPurchase(null); }}/>}
                    {printPurchase && <PrintOrderModal
                        title="سند خرید کالا"
                        badge={printPurchase.status === 'in_transit' ? 'در راه' : '✓ دریافت‌شده'}
                        badgeColor={printPurchase.status === 'in_transit' ? {bg:'#fef3c7',text:'#92400e',border:'#fde68a'} : {bg:'#d1fae5',text:'#065f46',border:'#a7f3d0'}}
                        rows={[{label:'فروشنده / تامین‌کننده', value: printPurchase.supplier}, {label:'وضعیت', value: printPurchase.status === 'in_transit' ? 'در راه' : 'دریافت‌شده'}]}
                        itemsList={printPurchase.items}
                        inventoryItems={items}
                        isPending={printPurchase.status === 'in_transit'}
                        description={printPurchase.description}
                        docId={printPurchase.id}
                        docDate={printPurchase.date}
                        onClose={() => setPrintPurchase(null)}
                    />}
                </div>
            );
        };

