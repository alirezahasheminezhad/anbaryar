//## ═══ app/24-consignment.jsx ═══
//## امانی (قرض بار): ابزار طرف‌حساب، ادغام، گزارش کلی، ConsignmentView، بازگشت/ویرایش امانی.
//## ترتیب فایل‌ها در build.py مهم است؛ همه‌ی بخش‌ها یک scope مشترک دارند.
        // --- ابزارهای مدیریت طرف‌حساب امانی ---
        const normalizePartyName = (value) => String(value || '').trim().replace(/\s+/g, ' ');
        const consignmentItemKey = (it) => it?.itemId || `${it?.name || ''}|${it?.brand || ''}|${it?.tag || ''}`;
        const ConsignmentMergeModal = ({ record, candidates, onClose, onSubmit }) => {
            const [selected, setSelected] = useState([]);
            const toggle = id => setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
            const itemLabel = (it) => {
                const details = itemDetailParts(it);
                return details.length ? `${it.name} — ${details.join(' • ')}` : it.name;
            };
            const renderItems = (items, returnedItems=[]) => {
                const returnedMap = {};
                (returnedItems || []).forEach(it => {
                    const k = it.itemId || `${it.name}|${it.brand || ''}|${it.tag || ''}`;
                    returnedMap[k] = (returnedMap[k] || 0) + (Number(it.qty) || 0);
                });
                return (items || []).map((it, i) => {
                    const k = it.itemId || `${it.name}|${it.brand || ''}|${it.tag || ''}`;
                    const ret = returnedMap[k] || 0;
                    return <div key={i} className="flex items-center justify-between gap-2 py-1.5 border-b border-slate-100 last:border-0">
                        <span className="font-bold text-slate-700 text-[11px] min-w-0 truncate">{itemLabel(it)}</span>
                        <span className="shrink-0 text-[10px] text-slate-500">×{formatNumber(it.qty)}{it.weight > 0 ? ` · ${formatNumber(it.weight)}kg` : ''}{ret > 0 ? ` · برگشتی ${formatNumber(ret)}` : ''}</span>
                    </div>;
                });
            };
            const shown = [record, ...candidates.filter(c => selected.includes(c.id))];
            const totalRows = shown.reduce((sum,c) => sum + (c.items || []).length, 0);
            return (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl p-5 w-full max-w-3xl shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="font-black text-slate-800 flex items-center gap-3"><div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center"><Layers size={16}/></div> ادغام امانی‌های {record.party}</h3>
                            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition"><X size={17}/></button>
                        </div>
                        <p className="text-[10px] text-slate-400 mb-3">قبل از ادغام، اقلام هر سند کامل نمایش داده می‌شوند تا دقیقاً مشخص باشد چه چیزی با چه چیزی ادغام می‌شود. این بخش هیچ مبلغی ندارد.</p>
                        <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 mb-3">
                            <div className="font-black text-indigo-800 text-sm mb-2">سند اصلی — #{record.id.slice(-6)} · {record.date}</div>
                            <div className="bg-white rounded-lg border border-indigo-100 px-3">{renderItems(record.items, record.returnedItems)}</div>
                        </div>
                        <div className="text-xs font-black text-slate-700 mb-2">اسناد قابل ادغام</div>
                        <div className="space-y-2 max-h-[45vh] overflow-y-auto">
                            {candidates.map(c => {
                                const selectedNow = selected.includes(c.id);
                                return <div key={c.id} className={`rounded-xl border overflow-hidden ${selectedNow ? 'border-indigo-300 bg-indigo-50/50' : 'border-slate-200 bg-slate-50'}`}>
                                    <label className="flex items-start gap-3 p-3 cursor-pointer">
                                        <input type="checkbox" className="accent-indigo-600 mt-1" checked={selectedNow} onChange={() => toggle(c.id)}/>
                                        <div className="flex-1 min-w-0">
                                            <div className="font-bold text-sm text-slate-700">{c.date} · #{c.id.slice(-6)} · {c.party}</div>
                                            <div className="text-[10px] text-slate-400 mt-1">{(c.items||[]).length} قلم</div>
                                        </div>
                                    </label>
                                    <div className="px-3 pb-3"><div className="bg-white rounded-lg border border-slate-200 px-3">{renderItems(c.items, c.returnedItems)}</div></div>
                                </div>;
                            })}
                            {candidates.length === 0 && <div className="text-center text-slate-400 py-8 text-sm">سند قابل ادغامی پیدا نشد.</div>}
                        </div>
                        <div className="mt-3 bg-slate-50 border border-slate-200 rounded-xl p-2 text-[10px] text-slate-500">{selected.length ? `در مجموع ${selected.length + 1} سند با ${totalRows} ردیف وارد ادغام می‌شوند.` : 'برای شروع، اسناد موردنظر را تیک بزنید.'}</div>
                        <button disabled={selected.length === 0} onClick={() => onSubmit([record.id, ...selected])} className="w-full mt-3 py-3 rounded-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-bold transition shadow-sm shadow-indigo-900/20">ادغام {selected.length + 1} سند</button>
                    </div>
                </div>
            );
        };

        const ConsignmentSummaryModal = ({ summary, onClose }) => {
            const [mode, setMode] = useState('owed');
            const data = summary[mode] || { parties: [], totalWeight: 0, totalQty: 0 };
            const isOwed = mode === 'owed';
            const title = isOwed ? 'گزارش بدهی امانی' : 'گزارش طلب امانی';
            const emptyText = isOwed ? 'در حال حاضر بدهی امانی بازی وجود ندارد.' : 'در حال حاضر طلب امانی بازی وجود ندارد.';
            return (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[75] flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl max-w-[96vw] w-fit min-w-[min(1000px,96vw)] shadow-2xl overflow-hidden max-h-[92vh] flex flex-col" onClick={e=>e.stopPropagation()}>
                        <div className="p-4 border-b bg-slate-50 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0"><Scale size={18}/></div>
                                <div><h3 className="font-black text-slate-800">{title}</h3>
                                <p className="text-[10px] text-slate-400 mt-1">هر طرف‌حساب جداگانه نمایش داده شده و جمع کل مانده‌ی همان طرف‌حساب نیز مشخص است.</p></div>
                            </div>
                            <button onClick={onClose} className="p-2 hover:bg-white rounded-full transition"><X size={18}/></button>
                        </div>

                        <div className="p-4 border-b flex flex-wrap gap-2">
                            <button onClick={()=>setMode('owed')} className={`px-4 py-2 rounded-full text-xs font-bold transition ${mode==='owed'?'bg-sky-600 text-white shadow-sm':'bg-sky-50 text-sky-700 hover:bg-sky-100'}`}>
                                بدهی ما · {formatNumber(summary.owed?.totalWeight||0)} کیلو
                            </button>
                            <button onClick={()=>setMode('receivable')} className={`px-4 py-2 rounded-full text-xs font-bold transition ${mode==='receivable'?'bg-purple-600 text-white shadow-sm':'bg-purple-50 text-purple-700 hover:bg-purple-100'}`}>
                                طلب ما · {formatNumber(summary.receivable?.totalWeight||0)} کیلو
                            </button>
                        </div>

                        <div className="p-4 overflow-y-auto">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
                                <div className="bg-slate-50 border rounded-xl p-3">
                                    <div className="text-[10px] text-slate-400">تعداد طرف‌حساب</div>
                                    <div className="font-black text-lg text-slate-800">{formatNumber(data.parties.length)}</div>
                                </div>
                                <div className={`border rounded-xl p-3 ${isOwed ? 'bg-sky-50 border-sky-100' : 'bg-purple-50 border-purple-100'}`}>
                                    <div className="text-[10px] text-slate-500">وزن کل</div>
                                    <div className={`font-black text-lg ${isOwed ? 'text-sky-700' : 'text-purple-700'}`}>{formatNumber(data.totalWeight)} کیلو</div>
                                </div>
                                <div className="bg-slate-50 border rounded-xl p-3">
                                    <div className="text-[10px] text-slate-400">تعداد کل</div>
                                    <div className="font-black text-lg text-slate-800">{formatNumber(data.totalQty)} عدد</div>
                                </div>
                                <div className="bg-slate-50 border rounded-xl p-3">
                                    <div className="text-[10px] text-slate-400">وضعیت</div>
                                    <div className="font-bold text-sm text-slate-700">{isOwed ? 'کالا نزد ماست' : 'کالا نزد طرف‌حساب است'}</div>
                                </div>
                            </div>

                            {data.parties.length === 0 ? (
                                <div className="text-center text-slate-400 py-12 border border-dashed border-slate-200 rounded-2xl">{emptyText}</div>
                            ) : (
                                <div className="space-y-4">
                                    {data.parties.map((party, i) => (
                                        <div key={party.party + i} className="rounded-2xl border border-slate-200 overflow-hidden bg-white shadow-sm">
                                            <div className={`px-4 py-3 flex items-center justify-between gap-3 ${isOwed ? 'bg-sky-50' : 'bg-purple-50'} border-b`}>
                                                <div className="min-w-0">
                                                    <div className={`font-black text-base ${isOwed ? 'text-sky-900' : 'text-purple-900'}`}>{party.party || 'نامشخص'}</div>
                                                    <div className="text-[10px] text-slate-500 mt-0.5">{party.items.length} قلم مانده</div>
                                                </div>
                                                <div className="text-left shrink-0">
                                                    <div className={`font-black text-lg ${isOwed ? 'text-sky-700' : 'text-purple-700'}`}>{formatNumber(party.weight)} کیلو</div>
                                                    <div className="text-[10px] text-slate-500">{formatNumber(party.qty)} عدد</div>
                                                </div>
                                            </div>

                                            <div className="divide-y divide-slate-100">
                                                {party.items.map((it, j) => (
                                                    <div key={j} className="px-4 py-3">
                                                        <div className="flex flex-wrap items-start justify-between gap-2">
                                                            <div className="min-w-0">
                                                                <div className="font-black text-slate-800 text-sm">{it.name}</div>
                                                                {it.details && <div className="text-[10px] text-slate-400 mt-0.5">{it.details}</div>}
                                                            </div>
                                                            <div className="text-left shrink-0 bg-slate-50 rounded-lg px-2.5 py-1.5">
                                                                <div className="font-black text-slate-700 text-xs">{formatNumber(it.weight)} کیلو</div>
                                                                <div className="text-[9px] text-slate-400">{formatNumber(it.qty)} عدد</div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            <div className="px-4 py-2 bg-slate-50 border-t flex justify-between items-center text-[10px] font-bold">
                                                <span className="text-slate-500">جمع مانده {party.party}</span>
                                                <span className={isOwed ? 'text-sky-700' : 'text-purple-700'}>{formatNumber(party.weight)} کیلو · {formatNumber(party.qty)} عدد</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="p-3 border-t bg-slate-50 flex justify-between items-center gap-3">
                            <div className="text-xs font-black text-slate-700">جمع کل {isOwed ? 'بدهی ما' : 'طلب ما'}: <span className={isOwed ? 'text-sky-700' : 'text-purple-700'}>{formatNumber(data.totalWeight)} کیلو · {formatNumber(data.totalQty)} عدد</span></div>
                            <button onClick={onClose} className="px-5 py-2.5 rounded-full bg-slate-800 text-white text-xs font-bold hover:bg-slate-900 transition">بستن</button>
                        </div>
                    </div>
                </div>
            );
        };

        const ConsignmentView = ({ items, consignments, onAdd, onReturn, onEdit, onDelete, onMerge, focusParty }) => {
            const toast = useToast();
            const confirmAction = useConfirm();
            const [direction, setDirection] = useState('borrowed'); // borrowed: گرفته‌ام | lent: داده‌ام
            const [cart, setCart] = useState([]);
            const [party, setParty] = useState('');
            const [date, setDate] = useState(new Date().toLocaleDateString('fa-IR'));
            const [description, setDescription] = useState('');
            const [search, setSearch] = useState('');
            const [searchTerm, setSearchTerm] = useState(focusParty || '');
            const [returnRecord, setReturnRecord] = useState(null);
            const [editingRecord, setEditingRecord] = useState(null);
            const [printRecord, setPrintRecord] = useState(null);
            const [sortBy, setSortBy] = useState('newest');
            const [priorityFilter, setPriorityFilter] = useState('all');
            const [statusFilter, setStatusFilter] = useState('all'); // all | pending | returned
            const [priority, setPriority] = useState('normal');
            const [showPartySuggestions, setShowPartySuggestions] = useState(false);
            const [mergeRecord, setMergeRecord] = useState(null);
            const [showConsignmentSummary, setShowConsignmentSummary] = useState(false);

            const partySuggestions = useMemo(() => {
                const term = normalizePartyName(party);
                const seen = new Map();
                (consignments || []).forEach(c => {
                    const name = normalizePartyName(c.party);
                    if (!name) return;
                    const key = name.toLocaleLowerCase('fa-IR');
                    if (!term || name.toLocaleLowerCase('fa-IR').includes(term.toLocaleLowerCase('fa-IR'))) {
                        if (!seen.has(key)) seen.set(key, { name, count: 0, pending: 0 });
                        const x = seen.get(key); x.count++; if (c.status === 'pending') x.pending++;
                    }
                });
                return [...seen.values()].sort((a,b) => b.pending - a.pending || b.count - a.count).slice(0, 6);
            }, [consignments, party]);
            const mergeCandidatesFor = (record) => (consignments || []).filter(c =>
                c.id !== record.id &&
                c.direction === record.direction &&
                normalizePartyName(c.party).toLocaleLowerCase('fa-IR') === normalizePartyName(record.party).toLocaleLowerCase('fa-IR') &&
                !c.sourceConsignmentId && !c.autoGenerated &&
                !(consignments || []).some(ch => ch.sourceConsignmentId === c.id)
            );


            const filtered = search ? items.filter(i => smartItemMatch(i, search)) : [];

            const addToCart = (item) => {
                if (cart.find(c => c.itemId === item.id)) return;
                setCart([...cart, { itemId: item.id, name: item.name, brand: item.brand, tag: item.tag, unit: item.unit, qty: 1, weight: 0, stock: item.quantity }]);
                setSearch('');
            };
            const updateQty = (idx, qty) => setCart(cart.map((c, i) => i === idx ? { ...c, qty: parseDecimal(qty) } : c));
            const updateWeight = (idx, weight) => setCart(cart.map((c, i) => i === idx ? { ...c, weight: parseDecimal(weight) } : c));
            const removeCart = (idx) => setCart(cart.filter((_, i) => i !== idx));
            const cartWeight = cart.reduce((s, c) => s + (Number(c.weight) || 0), 0);

            const submit = async () => {
                if (cart.length === 0) return toast.show('سبد کالا خالی است');
                if (!party) return toast.show('نام طرف حساب (فروشگاه/شخص) را وارد کنید');
                if (direction === 'lent') {
                    const over = cart.find(c => c.qty > c.stock);
                    if (over && !(await confirmAction(`موجودی «${over.name}» کافی نیست. ادامه می‌دهید؟`))) return;
                }
                onAdd({ id: generateId(), direction, party, date, description, items: cart, status: 'pending', timestamp: Date.now(), priority });
                setCart([]); setParty(''); setDescription(''); setPriority('normal');
            };

            const filteredList = useMemo(() => {
                const term = searchTerm.trim();
                let list = term ? consignments.filter(c => c.party.includes(term) || (c.description || '').includes(term)) : consignments;
                if (priorityFilter !== 'all') list = list.filter(c => (c.priority || 'normal') === priorityFilter);
                if (statusFilter !== 'all') list = list.filter(c => c.status === statusFilter);
                const rank={urgent:4,high:3,normal:2,low:1};
                return [...list].sort((a,b)=> sortBy==='priority' ? (rank[b.priority||'normal']-rank[a.priority||'normal'] || b.timestamp-a.timestamp) : sortBy==='oldest' ? a.timestamp-b.timestamp : b.timestamp-a.timestamp);
            }, [consignments, searchTerm, priorityFilter, statusFilter, sortBy]);

            const dirMeta = {
                borrowed: { label: 'امانی گرفته‌ام', icon: ArrowDownLeft, color: 'sky', desc: 'کالا الان وارد انبار شما شده؛ هنگام برگشت از انبار کم می‌شود' },
                lent:     { label: 'امانی داده‌ام',   icon: ArrowUpRight, color: 'purple', desc: 'کالا الان از انبار شما خارج شده؛ هنگام برگشت به انبار اضافه می‌شود' },
            };
            // مانده/مازاد هر امانی: چون برگشت می‌تواند چندمرحله‌ای و با تعداد متفاوت از ثبت اولیه باشد،
            // این تابع جمع برگشتی‌های تاکنون را با مقدار ثبت‌شده مقایسه می‌کند تا «باقیمانده» یا «مازاد/طلب» هرکدام مشخص شود
            const itemKey = (it) => it.itemId || `${it.name}|${it.brand || ''}|${it.tag || ''}`;
            const consignBalance = (c) => {
                const returnedMap = {};
                (c.returnedItems || []).forEach(it => { returnedMap[itemKey(it)] = (returnedMap[itemKey(it)] || 0) + (Number(it.qty) || 0); });
                let remaining = 0, surplus = 0;
                c.items.forEach(it => {
                    const ret = returnedMap[itemKey(it)] || 0;
                    const orig = Number(it.qty) || 0;
                    if (ret < orig) remaining += (orig - ret); else surplus += (ret - orig);
                });
                return { remaining, surplus };
            };
            const consignmentSummary = useMemo(() => {
                const build = (direction) => {
                    const partyMap = new Map();
                    let totalWeight = 0, totalQty = 0;
                    (consignments||[]).filter(c => c.direction === direction && c.status === 'pending').forEach(c => {
                        const returnedMap = {};
                        (c.returnedItems||[]).forEach(it => {
                            const k = itemKey(it);
                            returnedMap[k] = returnedMap[k] || { qty: 0, weight: 0 };
                            returnedMap[k].qty += Number(it.qty) || 0;
                            returnedMap[k].weight += Number(it.weight) || 0;
                        });

                        const partyKey = normalizePartyName(c.party).replace(/\s+/g, ' ').trim() || '—';
                        const party = partyMap.get(partyKey) || { party: partyKey, qty: 0, weight: 0, items: new Map() };

                        (c.items||[]).forEach(it => {
                            const k = itemKey(it);
                            const ret = returnedMap[k] || { qty: 0, weight: 0 };
                            const qty = Math.max(0, (Number(it.qty)||0) - ret.qty);
                            const weight = Math.max(0, (Number(it.weight)||0) - ret.weight);
                            if (qty <= 0 && weight <= 0) return;

                            const item = party.items.get(k) || {
                                name: it.name,
                                brand: it.brand || '',
                                tag: it.tag || '',
                                qty: 0,
                                weight: 0
                            };
                            item.qty += qty;
                            item.weight += weight;
                            party.items.set(k, item);
                            party.qty += qty;
                            party.weight += weight;
                            totalQty += qty;
                            totalWeight += weight;
                        });

                        if (party.qty > 0 || party.weight > 0) partyMap.set(partyKey, party);
                    });

                    const parties = [...partyMap.values()]
                        .map(p => ({
                            ...p,
                            items: [...p.items.values()]
                                .sort((a,b) => b.weight - a.weight || b.qty - a.qty)
                                .map(it => ({ ...it, details: [it.brand, it.tag].filter(Boolean).join(' • ') }))
                        }))
                        .sort((a,b) => b.weight - a.weight || b.qty - a.qty || a.party.localeCompare(b.party, 'fa'));

                    return { parties, totalWeight, totalQty };
                };
                return { owed: build('borrowed'), receivable: build('lent') };
            }, [consignments]);

            return (
                <div className="flex flex-col lg:flex-row gap-6">
                    <div className="lg:w-1/3 bg-white rounded-3xl border border-slate-200 flex flex-col overflow-hidden shadow-sm shrink-0">
                        <div className="p-4 bg-slate-50 border-b border-slate-100 space-y-3">
                            <select value={priorityFilter} onChange={e=>setPriorityFilter(e.target.value)} className="px-3 py-1.5 bg-white border border-slate-200 rounded-full text-xs font-bold"><option value="all">همه اولویت‌ها</option><option value="urgent">فوری</option><option value="high">مهم</option><option value="normal">عادی</option><option value="low">⚪ کم</option></select><select value={sortBy} onChange={e=>setSortBy(e.target.value)} className="px-3 py-1.5 bg-white border border-slate-200 rounded-full text-xs font-bold"><option value="newest">جدیدترین بالا</option><option value="oldest">قدیمی‌ترین</option><option value="priority">اولویت</option><option value="due">نزدیک‌ترین موعد</option></select><div className="flex bg-white border border-slate-200 rounded-full overflow-hidden shadow-sm text-xs font-bold">
                                <button onClick={() => setDirection('borrowed')} className={`flex-1 py-2 flex items-center justify-center gap-1.5 rounded-full transition ${direction === 'borrowed' ? 'bg-sky-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}><ArrowDownLeft size={14}/> امانی گرفته‌ام</button>
                                <button onClick={() => setDirection('lent')} className={`flex-1 py-2 flex items-center justify-center gap-1.5 rounded-full transition ${direction === 'lent' ? 'bg-purple-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}><ArrowUpRight size={14}/> امانی داده‌ام</button>
                            </div>
                            <p className="text-[10px] text-slate-400 leading-relaxed px-0.5">{dirMeta[direction].desc}</p>
                            <div className="relative">
                                <Search className="absolute right-3 top-3 text-slate-400" size={18}/>
                                <input className="w-full pl-3 pr-10 py-2.5 rounded-full border border-slate-200 bg-white outline-none focus:border-indigo-500" placeholder="جستجوی کالا از انبار..." value={search} onChange={e => setSearch(e.target.value)}/>
                                {filtered.length > 0 && (
                                    <div className="absolute top-full mt-1 right-0 w-full bg-white border border-slate-200 rounded-xl shadow-2xl z-30 max-h-56 overflow-y-auto">
                                        {filtered.slice(0, 8).map(item => (
                                            <div key={item.id} onClick={() => addToCart(item)} className="px-3 py-2.5 hover:bg-indigo-50 cursor-pointer border-b border-slate-50 last:border-0 text-sm">
                                                <div className="font-bold text-slate-700 leading-5 truncate">{item.name}</div>
                                                <div className="mt-1 text-[10px] text-slate-400 leading-5 whitespace-normal break-words">
                                                    <ItemDistinguishBadges item={item}/>
                                                    <span className="font-bold text-slate-500">موجودی: {formatNumber(item.quantity)}</span>
                                                    <span className="text-slate-300 font-mono mr-1">#{item.id.slice(-6)}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="relative">
                                <input className="w-full p-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-500" placeholder={direction === 'borrowed' ? 'از چه کسی/فروشگاهی گرفته‌اید؟ *' : 'به چه کسی/مشتری داده‌اید؟ *'} value={party} onFocus={() => setShowPartySuggestions(true)} onChange={e => { setParty(e.target.value); setShowPartySuggestions(true); }}/>
                                {showPartySuggestions && partySuggestions.length > 0 && (
                                    <div className="absolute z-40 top-full mt-1 right-0 left-0 bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden">
                                        {partySuggestions.map(p => (
                                            <button type="button" key={p.name} onMouseDown={() => { setParty(p.name); setShowPartySuggestions(false); }} className="w-full text-right px-3 py-2 hover:bg-indigo-50 border-b border-slate-50 last:border-0">
                                                <div className="font-bold text-sm text-slate-700">✓ {p.name}</div>
                                                <div className="text-[10px] text-slate-400">{p.count} سند · {p.pending} در جریان · ذخیره با همین نام</div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="flex gap-2">
                                <input className="w-1/2 p-2.5 border border-slate-200 rounded-lg text-sm outline-none" value={date} onChange={e => setDate(e.target.value)} dir="ltr"/>
                                <input className="w-1/2 p-2.5 border border-slate-200 rounded-lg text-sm outline-none" placeholder="توضیحات" value={description} onChange={e => setDescription(e.target.value)}/>
                            </div>
                        </div>
                        {cart.length > 0 && (
                            <div className="text-[10px] text-slate-400 grid grid-cols-[1fr_76px_88px_28px] gap-1.5 px-3 pt-2">
                                <span>کالا</span><span className="text-center">تعداد</span><span className="text-center">وزن</span><span></span>
                            </div>
                        )}
                        <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-[120px]">
                            {cart.length === 0 && <div className="text-center text-slate-300 text-sm py-8">سبد کالا خالی است</div>}
                            {cart.map((c, idx) => (
                                <div key={idx} className="bg-slate-50 border border-slate-100 rounded-lg p-2">
                                    <div className="grid grid-cols-[1fr_76px_88px_28px] items-center gap-1.5">
                                        <div className="min-w-0">
                                            <div className="font-bold text-slate-700 text-sm truncate">{c.name}</div>
                                            <div className="text-[10px] text-slate-400 truncate">موجودی: {formatNumber(c.stock)}{itemDetailParts(c).length > 0 && ` • ${itemDetailParts(c).join(' • ')}`}</div>
                                        </div>
                                        <input type="number" min="0" step="any" title="تعداد" className="w-full p-2 border border-slate-200 rounded-lg text-center text-base font-bold" value={c.qty} onChange={e => updateQty(idx, e.target.value)}/>
                                        <input type="number" min="0" step="any" title="وزن (کیلوگرم)" placeholder="وزن" className="w-full p-2 border border-indigo-200 rounded-lg text-center text-base font-black text-indigo-700 bg-indigo-50" value={c.weight || ''} onChange={e => updateWeight(idx, e.target.value)}/>
                                        <button onClick={() => removeCart(idx)} className="text-red-400 hover:text-red-600"><X size={16}/></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        {cartWeight > 0 && <div className="px-3 pb-1 text-left text-xs font-bold text-slate-500">وزن کل: <span className="text-slate-700">{formatNumber(cartWeight)} کیلوگرم</span></div>}
                        <div className="p-3 border-t border-slate-100">
                            <button onClick={submit} className={`w-full py-3 text-white rounded-xl font-bold text-sm flex justify-center items-center gap-2 transition ${direction === 'borrowed' ? 'bg-sky-600 hover:bg-sky-700' : 'bg-purple-600 hover:bg-purple-700'}`}><Handshake size={16}/> ثبت {dirMeta[direction].label}</button>
                        </div>
                    </div>
                    <div className="flex-1 bg-white rounded-3xl border border-slate-200 overflow-hidden flex flex-col shadow-sm">
                        <div className="p-4 border-b border-slate-100 bg-slate-50 flex flex-col gap-3">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div className="font-bold text-slate-700 flex items-center gap-2"><Handshake size={20} className="text-indigo-600"/> لیست امانی‌ها <span className="text-xs font-normal text-slate-400 bg-white px-2 py-0.5 rounded border border-slate-200">{filteredList.length} مورد</span></div>
                                <div className="flex items-center gap-2 w-full sm:w-auto"><div className="relative flex-1 sm:w-64"><Search size={16} className="absolute right-3 top-2.5 text-slate-400"/><input className="w-full border border-slate-200 rounded-xl py-2 pr-9 pl-3 text-sm outline-none focus:border-indigo-500" placeholder="جستجو طرف حساب/توضیحات..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}/></div><button type="button" onClick={()=>setShowConsignmentSummary(true)} className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700"><Scale size={14}/> گزارش کلی</button></div>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                <div className="flex bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm text-xs font-bold">
                                    <button onClick={() => setStatusFilter('all')} className={`px-3 py-1.5 ${statusFilter === 'all' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>همه</button>
                                    <button onClick={() => setStatusFilter('pending')} className={`px-3 py-1.5 ${statusFilter === 'pending' ? 'bg-amber-500 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>در جریان</button>
                                    <button onClick={() => setStatusFilter('returned')} className={`px-3 py-1.5 ${statusFilter === 'returned' ? 'bg-emerald-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>برگشته</button>
                                </div>
                                
                            </div>
                        </div>
                        <div className="overflow-y-auto flex-1 p-3 space-y-2">
                            {filteredList.length === 0 && <div className="text-center text-slate-300 py-10">خالی</div>}
                            {filteredList.map(c => {
                                const meta = dirMeta[c.direction] || dirMeta.borrowed;
                                const { remaining, surplus } = consignBalance(c);
                                const sourceRecord = c.sourceConsignmentId ? consignments.find(x => x.id === c.sourceConsignmentId) : null;
                                const childRecords = consignments.filter(x => x.sourceConsignmentId === c.id);
                                return (
                                <div key={c.id} className={`border rounded-xl p-3 ${c.status === 'pending' ? (c.direction === 'borrowed' ? 'bg-sky-50/40 border-sky-200' : 'bg-purple-50/40 border-purple-200') : 'bg-white border-slate-100'}`}>
                                    <div className="flex justify-between items-start mb-1.5">
                                        <div className="flex items-start gap-2">
                                            <div>
                                                <div className="font-bold text-slate-800">{c.party}</div>
                                                <div className="text-[10px] text-slate-400 flex items-center gap-1"><Calendar size={10}/> {c.date}</div>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end gap-1">
                                            <span className={`px-2 py-1 rounded-lg text-[10px] font-bold border flex items-center gap-1 ${c.direction === 'borrowed' ? 'bg-sky-100 text-sky-700 border-sky-200' : 'bg-purple-100 text-purple-700 border-purple-200'}`}><meta.icon size={11}/> {meta.label}</span>
                                            {c.status === 'pending' ? <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded-lg text-[10px] font-bold border border-amber-200">در جریان{(c.returnedItems || []).length > 0 ? ' (بخشی برگشته)' : ''}</span> : <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded-lg text-[10px] font-bold border border-emerald-200">برگشته/تکمیل</span>}<span className="px-2 py-1 rounded-lg text-[10px] font-bold bg-slate-50 text-slate-500 border border-slate-200">{(c.priority||'normal')==='urgent'?'فوری':(c.priority||'normal')==='high'?'مهم':(c.priority||'normal')==='low'?'⚪ کم':'عادی'}</span>
                                            {remaining > 0 && <span className="bg-orange-50 text-orange-600 px-2 py-1 rounded-lg text-[10px] font-bold border border-orange-200">مانده کالا: {formatNumber(remaining)}</span>}
                                            {surplus > 0 && <span className="bg-fuchsia-50 text-fuchsia-600 px-2 py-1 rounded-lg text-[10px] font-bold border border-fuchsia-200">مازاد/طلب شما: {formatNumber(surplus)}</span>}
                                        </div>
                                    </div>
                                    <div className="text-xs text-slate-500 mb-2">
                                        {c.items.map((it, idx) => (<span key={idx} className="inline-block ml-2 mb-0.5"><ItemNameLabel it={it} inventoryItems={items} isPending={c.status === 'pending'} /> <b className="text-slate-700">×{formatNumber(it.qty)}</b>{it.weight > 0 && <span className="text-slate-400"> ({formatNumber(it.weight)} کیلو)</span>}</span>))}
                                    </div>
                                    {c.returnedItems && c.returnedItems.length > 0 && (
                                        <div className="text-xs text-emerald-700 mb-2 bg-emerald-50 rounded-lg p-2 border border-emerald-100">
                                            <span className="font-bold">برگشتی تاکنون ({c.returnedDate}): </span>
                                            {c.returnedItems.map((it, idx) => (<span key={idx} className="inline-block ml-2"><ItemNameLabel it={it} inventoryItems={items} isPending={false} /> ×{formatNumber(it.qty)}</span>))}
                                        </div>
                                    )}
                                    {c.autoGenerated && sourceRecord && (
                                        <div className="text-[11px] text-fuchsia-700 mb-2 bg-fuchsia-50 rounded-lg p-2 border border-fuchsia-100 flex items-center gap-1">
                                            <Handshake size={12}/> این سند به‌صورت خودکار از مازادِ برگشتِ سند <b>«{sourceRecord.party}» (#{sourceRecord.id.slice(-6)})</b> ساخته شده — از اینجا به بعد مستقل و قابل دادوستد است.
                                        </div>
                                    )}
                                    {childRecords.length > 0 && (
                                        <div className="text-[11px] text-orange-700 mb-2 bg-orange-50 rounded-lg p-2 border border-orange-100 flex items-center gap-1">
                                            <ArrowUpRight size={12}/> از مازادِ این سند، {childRecords.length} سند جدید (بدهکار/بستانکار متقابل) ساخته شده که در لیست جداگانه قابل مشاهده و دادوستد است.
                                        </div>
                                    )}
                                    {c.description && <div className="text-[11px] text-slate-400 mb-2">{c.description}</div>}
                                    <div className="flex gap-2 mb-1.5">
                                        <button onClick={() => setPrintRecord(c)} className="flex-1 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg text-xs font-bold border border-indigo-100 flex items-center justify-center gap-1"><Printer size={13}/> چاپ</button>
                                        <button onClick={() => setEditingRecord(c)} className="flex-1 py-1.5 bg-slate-50 text-slate-600 hover:bg-slate-100 rounded-lg text-xs font-bold border border-slate-200 flex items-center justify-center gap-1"><Edit3 size={13}/> ویرایش</button>
                                        <button onClick={() => setMergeRecord(c)} className="flex-1 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-xs font-bold border border-indigo-100 flex items-center justify-center gap-1"><Layers size={13}/> ادغام</button>
                                        <button onClick={() => onDelete(c.id)} className="flex-1 py-1.5 bg-red-50 text-red-500 hover:bg-red-100 rounded-lg text-xs font-bold border border-red-100 flex items-center justify-center gap-1"><Trash2 size={13}/> حذف</button>
                                    </div>
                                    {c.status === 'pending' && (
                                        <button onClick={() => setReturnRecord(c)} className="w-full py-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg text-xs font-bold border border-emerald-100 flex items-center justify-center gap-1"><Check size={13}/> ثبت برگشت به طرف</button>
                                    )}
                                </div>
                                );
                            })}
                        </div>
                    </div>
                    {showConsignmentSummary && <ConsignmentSummaryModal summary={consignmentSummary} onClose={()=>setShowConsignmentSummary(false)} />}
                    {returnRecord && <ReturnConsignmentModal record={returnRecord} onClose={() => setReturnRecord(null)} onSubmit={(returnedItems) => { onReturn(returnRecord.id, returnedItems); setReturnRecord(null); }}/>}
                    {editingRecord && <EditConsignmentModal record={editingRecord} items={items} onClose={() => setEditingRecord(null)} onSave={(c) => { onEdit(c); setEditingRecord(null); }}/>}
                    {mergeRecord && <ConsignmentMergeModal record={mergeRecord} candidates={mergeCandidatesFor(mergeRecord)} onClose={() => setMergeRecord(null)} onSubmit={(ids) => { onMerge(ids); setMergeRecord(null); }}/>}
                    {printRecord && <PrintOrderModal
                        title="سند امانی"
                        badge={printRecord.status === 'pending' ? `${dirMeta[printRecord.direction].label} (در جریان)` : '✓ برگشته/تکمیل'}
                        badgeColor={printRecord.status === 'pending' ? {bg:'#f0f9ff',text:'#0369a1',border:'#bae6fd'} : {bg:'#d1fae5',text:'#065f46',border:'#a7f3d0'}}
                        rows={[{label:'طرف حساب', value: printRecord.party}, {label:'نوع', value: dirMeta[printRecord.direction].label}, {label:'وضعیت', value: printRecord.status === 'pending' ? 'در جریان' : 'برگشته/تکمیل'}]}
                        itemsList={printRecord.status === 'returned' && printRecord.returnedItems ? printRecord.returnedItems : printRecord.items}
                        inventoryItems={items}
                        isPending={printRecord.status === 'pending'}
                        description={printRecord.description}
                        docId={printRecord.id}
                        docDate={printRecord.date}
                        onClose={() => setPrintRecord(null)}
                    />}
                </div>
            );
        };

        // ثبت برگشت امانی: جدا از «بازگشت از پردازش» چون اینجا صرفاً همان کالای امانی برمی‌گردد، نه محصول پردازش‌شده.
        // مقدار برگشتی هر ردیف پیش‌فرض «باقیمانده» تا این لحظه است، ولی آزادانه قابل تغییر است تا برگشت با تعداد بیشتر/کمتر از حد ثبت‌شده هم ثبت شود؛
        // چون این برگشت می‌تواند چندمرحله‌ای باشد، مودال هربار فقط همین محموله را می‌گیرد و منطق تجمیع/مانده در handleReturnConsignment انجام می‌شود.
        const ReturnConsignmentModal = ({ record, onClose, onSubmit }) => {
            const toast = useToast();
            const itemKey = (it) => it.itemId || `${it.name}|${it.brand || ''}|${it.tag || ''}`;
            const alreadyReturnedQty = (it) => {
                const r = (record.returnedItems || []).find(x => itemKey(x) === itemKey(it));
                return r ? (Number(r.qty) || 0) : 0;
            };
            const [rows, setRows] = useState(record.items.map(it => {
                const returned = alreadyReturnedQty(it);
                const remaining = Math.max(0, (Number(it.qty) || 0) - returned);
                return { itemId: it.itemId || '', name: it.name, brand: it.brand || '', tag: it.tag || '', unit: it.unit || 'عدد', qty: remaining, weight: it.weight || '', originalQty: Number(it.qty) || 0, alreadyReturned: returned };
            }));
            const dirLabel = record.direction === 'borrowed' ? 'امانی گرفته‌شده (به طرف برمی‌گردد)' : 'امانی داده‌شده (از طرف برمی‌گردد)';
            const updateRow = (idx, field, val) => setRows(rows.map((r, i) => i === idx ? { ...r, [field]: val } : r));
            const removeRow = (idx) => setRows(rows.filter((_, i) => i !== idx));
            const submit = () => {
                const valid = rows.filter(r => Number(r.qty) > 0).map(r => ({ itemId: r.itemId || null, name: r.name, brand: r.brand, tag: r.tag || 'عمومی', unit: r.unit || 'عدد', qty: Number(r.qty), weight: Number(r.weight) || 0 }));
                if (valid.length === 0) return toast.show('حداقل یک ردیف را با مقدار برگشتی مشخص کنید');
                onSubmit(valid);
            };
            return (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl p-5 w-full max-w-3xl shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="font-black text-slate-800 flex items-center gap-3"><div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center"><Check size={16}/></div> ثبت برگشت {dirLabel} — {record.party}</h3>
                            <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 transition"><X size={18} className="text-slate-400 hover:text-red-500"/></button>
                        </div>
                        <p className="text-xs text-slate-400 mb-3">مقدار واقعی که همین الان رد و بدل شده را وارد کنید؛ می‌تواند کمتر یا بیشتر از باقیمانده باشد. اگر کمتر بدهید، بقیه به‌عنوان مانده باز می‌ماند و بعداً هم می‌توانید دوباره برگشت بزنید. اگر بیشتر بدهید، این سند دقیقاً تا سقف مقدار ثبت‌شده تسویه می‌شود و مازاد آن به‌صورت خودکار یک سند امانیِ جدید و مستقل در جهتِ معکوس (بدهکار⇄بستانکار) می‌سازد که خودش هم قابل دادوستد و برگشت جزئی است. هیچ عملیات آنالیز/پردازشی روی این کالا انجام نمی‌شود.</p>
                        <div className="space-y-2.5">
                            {rows.map((r, idx) => (
                                <div key={idx} className="bg-slate-50 border border-slate-100 rounded-2xl p-3">
                                    <div className="flex items-center justify-between gap-2 mb-1.5">
                                        <div className="font-bold text-slate-700 text-sm truncate">{r.name} {itemDetailParts(r).length > 0 && <span className="text-slate-400 font-normal text-xs">({itemDetailParts(r).join(' • ')})</span>}</div>
                                        <span className="text-[10px] text-slate-400 shrink-0">ثبت اولیه: {formatNumber(r.originalQty)} · قبلاً برگشته: {formatNumber(r.alreadyReturned)}</span>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <input type="number" min="0" step="any" className="w-24 p-2 border border-slate-200 rounded-xl text-sm outline-none text-center font-bold" placeholder="تعداد برگشتی" value={r.qty} onChange={e => updateRow(idx, 'qty', e.target.value)}/>
                                        <input className="w-20 p-2 border border-slate-200 rounded-xl text-sm outline-none text-center" placeholder="واحد" value={r.unit} onChange={e => updateRow(idx, 'unit', e.target.value)}/>
                                        <input type="number" min="0" step="any" className="w-28 p-2 border border-indigo-200 rounded-xl text-sm outline-none text-center font-black text-indigo-700 bg-indigo-50" placeholder="وزن (کیلوگرم)" value={r.weight} onChange={e => updateRow(idx, 'weight', e.target.value)}/>
                                        <button onClick={() => removeRow(idx)} className="text-red-400 hover:text-red-600 mr-auto p-1.5 rounded-full hover:bg-red-50 transition"><Trash2 size={16}/></button>
                                    </div>
                                </div>
                            ))}
                            {rows.length === 0 && <div className="text-center text-slate-300 text-sm py-6">ردیفی برای برگشت باقی نمانده</div>}
                            <button onClick={submit} className="w-full py-3 bg-emerald-600 text-white rounded-full font-bold hover:bg-emerald-700 transition shadow-sm shadow-emerald-900/20">تایید برگشت</button>
                        </div>
                    </div>
                </div>
            );
        };

        const EditConsignmentModal = ({ record, items, onClose, onSave }) => {
            const toast = useToast();
            const [party, setParty] = useState(record.party);
            const [date, setDate] = useState(record.date);
            const [description, setDescription] = useState(record.description || '');
            const [cart, setCart] = useState(record.items.map(it => ({ ...it })));
            const [search, setSearch] = useState('');
            const filtered = search ? items.filter(i => smartItemMatch(i, search)) : [];
            const addExisting = (item) => {
                if (cart.find(c => c.itemId === item.id)) return;
                setCart([...cart, { itemId: item.id, name: item.name, brand: item.brand, tag: item.tag, unit: item.unit, qty: 1, weight: 0 }]);
                setSearch('');
            };
            const updateQty = (idx, qty) => setCart(cart.map((c, i) => i === idx ? { ...c, qty: parseDecimal(qty) } : c));
            const updateWeight = (idx, weight) => setCart(cart.map((c, i) => i === idx ? { ...c, weight: parseDecimal(weight) } : c));
            const removeCartItem = (idx) => setCart(cart.filter((_, i) => i !== idx));
            const submit = () => {
                if (!party) return toast.show('نام طرف حساب را وارد کنید');
                if (cart.length === 0) return toast.show('حداقل یک قلم لازم است');
                onSave({ ...record, party, date, description, items: cart, priority: record.priority || 'normal' });
            };
            return (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl p-5 w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="font-black text-slate-800 flex items-center gap-3"><div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center"><Edit3 size={16}/></div> ویرایش امانی</h3>
                            <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 transition"><X size={18} className="text-slate-400 hover:text-red-500"/></button>
                        </div>
                        <div className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-2xl px-3 py-2 mb-3">
                            چون این رکورد از قبل روی موجودی اثر گذاشته، طرف‌حساب/تاریخ/توضیحات آزادانه قابل ویرایش‌اند. اگر تعداد/وزن واقعی امانی با آنچه ثبت شده فرق دارد (مثلاً بیشتر یا کمتر از حد اولیه گرفته/داده‌اید)، همین‌جا اصلاح کنید — فقط مابه‌التفاوت به‌صورت خودکار و صحیح روی موجودی انبار اعمال می‌شود، نه کل عدد.
                        </div>
                        <div className="grid grid-cols-2 gap-2.5 mb-3">
                            <input className="col-span-2 w-full p-2.5 border border-slate-200 rounded-lg outline-none focus:border-indigo-500" placeholder="طرف حساب" value={party} onChange={e => setParty(e.target.value)}/>
                            <input className="w-full p-2.5 border border-slate-200 rounded-lg outline-none" value={date} onChange={e => setDate(e.target.value)} dir="ltr"/>
                            <input className="w-full p-2.5 border border-slate-200 rounded-lg outline-none" placeholder="توضیحات" value={description} onChange={e => setDescription(e.target.value)}/>
                        </div>
                        <div className="relative mb-3">
                            <Search className="absolute right-3 top-3 text-slate-400" size={18}/>
                            <input className="w-full pl-3 pr-10 py-2.5 rounded-full border border-slate-200 bg-white outline-none focus:border-indigo-500" placeholder="افزودن کالای دیگر از انبار..." value={search} onChange={e => setSearch(e.target.value)}/>
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
                        <div className="text-[10px] text-slate-400 grid grid-cols-[1fr_76px_88px_100px_28px] gap-2 px-1 mb-1">
                            <span>کالا</span><span className="text-center">تعداد</span><span className="text-center">وزن (Kg)</span><span className="text-center">قیمت هر کیلو</span><span></span>
                        </div>
                        <div className="space-y-2 mb-2">
                            {cart.map((c, idx) => (
                                <div key={idx} className="grid grid-cols-[1fr_76px_88px_100px_28px] items-center gap-2 bg-slate-50 border border-slate-100 rounded-lg p-2">
                                    <div className="min-w-0">
                                        <ItemNameLabel it={c} inventoryItems={items} isPending={true} className="font-bold text-slate-700 text-sm truncate" />
                                        <div className="text-[10px] text-slate-400 truncate">{itemDetailParts(resolveItemDisplay(c, items, true).display).join(' • ')}</div>
                                    </div>
                                    <input type="number" min="0" step="any" className="w-full p-2 border border-slate-200 rounded-lg text-center text-base font-bold outline-none focus:border-indigo-500" value={c.qty} onChange={e => updateQty(idx, e.target.value)}/>
                                    <input type="number" min="0" step="any" className="w-full p-2 border border-indigo-200 rounded-lg text-center text-base font-black text-indigo-700 bg-indigo-50 outline-none focus:border-indigo-500" value={c.weight || ''} onChange={e => updateWeight(idx, e.target.value)}/>
                                    <button onClick={() => removeCartItem(idx)} className="text-red-400 hover:text-red-600 justify-self-center"><X size={16}/></button>
                                </div>
                            ))}
                        </div>
                        <button onClick={submit} className="w-full py-3 bg-indigo-600 text-white rounded-full font-bold hover:bg-indigo-700 transition shadow-sm shadow-indigo-900/20">ذخیره تغییرات</button>
                    </div>
                </div>
            );
        };

