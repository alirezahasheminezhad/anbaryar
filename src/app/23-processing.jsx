//## ═══ app/23-processing.jsx ═══
//## آنالیز/پردازش برون‌سپاری (آسیاب): مودال‌ها، گزارش کلی، ProcessingView.
//## ترتیب فایل‌ها در build.py مهم است؛ همه‌ی بخش‌ها یک scope مشترک دارند.
        // --- آنالیز / پردازش (Outsourced Processing) ---
        const ReturnProcessingModal = ({ items, onClose, onSubmit, expectedBags = [] }) => {
            const toast = useToast();
            // تعداد کیسه‌های خالی برگشتیِ واقعی؛ پیش‌فرض همان تعداد «در انتظار» است و کاربر باید عدد واقعی را وارد کند
            const [bagRows, setBagRows] = useState(() => (expectedBags || []).map(b => ({ name: b.name, unit: b.unit || 'کیسه', expected: Number(b.qty) || 0, qty: String(Number(b.qty) || 0) })));
            const blankRow = { itemId: '', name: '', brand: '', tag: '', unit: 'عدد', qty: '', weight: '', price: '' };
            const [rows, setRows] = useState([{ ...blankRow }]);
            const addRow = () => setRows([...rows, { ...blankRow }]);
            const removeRow = (idx) => setRows(rows.filter((_, i) => i !== idx));
            const updateRow = (idx, field, val) => setRows(rows.map((r, i) => i === idx ? { ...r, [field]: val } : r));
            const selectExisting = (idx, itemId) => {
                const it = items.find(i => i.id === itemId);
                if (!it) { updateRow(idx, 'itemId', ''); return; }
                setRows(rows.map((r, i) => i === idx ? { ...r, itemId: it.id, name: it.name, brand: it.brand, tag: it.tag, unit: it.unit } : r));
            };
            const submit = () => {
                const valid = rows.filter(r => r.name && Number(r.qty) > 0).map(r => ({ itemId: r.itemId || null, name: r.name, brand: r.brand, tag: r.tag || 'عمومی', unit: r.unit || 'عدد', qty: Number(r.qty), weight: Number(r.weight) || 0, price: Number(r.price) || 0 }));
                if (valid.length === 0) return toast.show('حداقل یک قلم بازگشتی را با نام و مقدار مشخص کنید');
                onSubmit(valid, bagRows.map(b => ({ name: b.name, qty: Number(b.qty) || 0 })).filter(b => b.qty > 0));
            };
            return (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl p-5 w-full max-w-3xl shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="font-black text-slate-800 flex items-center gap-3"><div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center"><RefreshCw size={16}/></div> ثبت بازگشت از پردازش</h3>
                            <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 transition"><X size={18} className="text-slate-400 hover:text-red-500"/></button>
                        </div>
                        <p className="text-xs text-slate-400 mb-3">مشخص کنید چه کالا/محصولی (مثلاً پودر) و به چه مقداری از پردازش برگشته؛ به انبار اضافه می‌شود. وزن و قیمت اختیاری‌اند و فقط برای محاسبه ارزش این محموله استفاده می‌شوند.</p>
                        <div className="space-y-2.5">
                            {rows.map((r, idx) => (
                                <div key={idx} className="bg-slate-50 border border-slate-100 rounded-xl p-3">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <select className="flex-1 min-w-[160px] p-2 border border-slate-200 rounded-lg text-sm outline-none bg-white" value={r.itemId} onChange={e => selectExisting(idx, e.target.value)}>
                                            <option value="">— کالای جدید / تعریف دستی —</option>
                                            {items.map(it => <option key={it.id} value={it.id}>{it.name} {itemDetailParts(it).length > 0 ? '(' + itemDetailParts(it).join(' • ') + ')' : ''} #{it.id.slice(-6)}</option>)}
                                        </select>
                                        {!r.itemId && (
                                            <>
                                                <input className="flex-1 min-w-[160px] p-2 border border-slate-200 rounded-lg text-sm outline-none" placeholder="نام محصول بازگشتی (مثلا پودر زردچوبه)" value={r.name} onChange={e => updateRow(idx, 'name', e.target.value)}/>
                                                <input className="w-24 p-2 border border-slate-200 rounded-lg text-sm outline-none" placeholder="برند" value={r.brand} onChange={e => updateRow(idx, 'brand', e.target.value)}/>
                                            </>
                                        )}
                                        {rows.length > 1 && <button onClick={() => removeRow(idx)} className="text-red-400 hover:text-red-600 shrink-0"><Trash2 size={16}/></button>}
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2 mt-2">
                                        <input type="number" min="0" step="any" className="w-24 p-2 border border-slate-200 rounded-lg text-sm outline-none text-center font-bold" placeholder="تعداد" value={r.qty} onChange={e => updateRow(idx, 'qty', e.target.value)}/>
                                        <input className="w-20 p-2 border border-slate-200 rounded-lg text-sm outline-none text-center" placeholder="واحد" value={r.unit} onChange={e => updateRow(idx, 'unit', e.target.value)}/>
                                        <input type="number" min="0" step="any" className="w-28 p-2 border border-indigo-200 rounded-lg text-sm outline-none text-center font-black text-indigo-700 bg-indigo-50" placeholder="وزن (کیلوگرم)" value={r.weight} onChange={e => updateRow(idx, 'weight', e.target.value)}/>
                                    </div>
                                </div>
                            ))}
                            <button onClick={addRow} className="w-full py-2.5 border-2 border-dashed border-slate-200 rounded-full text-slate-400 text-sm font-bold hover:border-indigo-300 hover:text-indigo-500 transition">+ افزودن ردیف دیگر</button>
                            {bagRows.length > 0 && (
                                <div className="border-2 border-amber-200 bg-amber-50/60 rounded-xl p-3 space-y-2">
                                    <div className="text-xs font-black text-amber-800">کیسه‌های خالی که برگشته‌اند (به تفکیک نام کالا)</div>
                                    <div className="text-[10px] text-amber-700">پیشنهاد بر اساس تعداد کیسه‌های ارسال‌شده‌ی همین کالاست. عدد واقعیِ برگشتی را وارد کنید؛ فقط همین تعداد به موجودی کیسه‌های خالی همان نام اضافه می‌شود.</div>
                                    {bagRows.map((b, i) => (
                                        <div key={b.name} className="flex flex-wrap items-center gap-2 bg-white border border-amber-100 rounded-lg p-2">
                                            <span className="text-xs font-bold text-slate-700 flex-1 min-w-[140px]">{b.name} <span className="text-[10px] text-slate-400">(در انتظار: {formatNumber(b.expected)} {b.unit})</span></span>
                                            <input type="number" min="0" step="1" className="w-28 p-2 border border-amber-200 rounded-lg text-sm outline-none text-center font-black" placeholder="تعداد برگشتی" value={b.qty} onChange={e => setBagRows(prev => prev.map((x, j) => j === i ? { ...x, qty: e.target.value } : x))}/>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <button onClick={submit} className="w-full py-3 bg-emerald-600 text-white rounded-full font-bold hover:bg-emerald-700 transition shadow-sm shadow-emerald-900/20">تایید بازگشت و افزودن به انبار</button>
                        </div>
                    </div>
                </div>
            );
        };

        const EditProcessingModal = ({ order, items, onClose, onSave }) => {
            const toast = useToast();
            const [recipient, setRecipient] = useState(order.recipient);
            const [date, setDate] = useState(order.date);
            const [description, setDescription] = useState(order.description || '');
            const [cart, setCart] = useState(order.items.map(it => ({ ...it })));
            const [search, setSearch] = useState('');
            const itemsEditable = order.status === 'reserved'; // بعد از ارسال، اقلام از انبار کسر شده‌اند؛ برای حفظ صحت موجودی فقط قبل از ارسال قابل ویرایش‌اند
            const filtered = search ? items.filter(i => smartItemMatch(i, search)) : [];
            const addToCart = (item) => {
                if (cart.find(c => c.itemId === item.id)) return;
                setCart([...cart, { itemId: item.id, name: item.name, brand: item.brand, tag: item.tag, unit: item.unit, qty: 1, weight: 0, stock: item.quantity }]);
                setSearch('');
            };
            const updateQty = (idx, qty) => setCart(cart.map((c, i) => i === idx ? { ...c, qty: parseDecimal(qty) } : c));
            const updateWeight = (idx, weight) => setCart(cart.map((c, i) => i === idx ? { ...c, weight: parseDecimal(weight) } : c));
            const removeCartItem = (idx) => setCart(cart.filter((_, i) => i !== idx));
            const rowTotal = (c) => parseDecimal(c.weight) * parseDecimal(c.price);
            const cartTotal = cart.reduce((s, c) => s + rowTotal(c), 0);
            const submit = () => {
                if (!recipient) return toast.show('مقصد / کارگاه پردازش را وارد کنید');
                if (cart.length === 0) return toast.show('حداقل یک قلم لازم است');
                onSave({ ...order, recipient, date, description, items: cart });
            };
            return (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl p-5 w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="font-black text-slate-800 flex items-center gap-3"><div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center"><Edit3 size={16}/></div> ویرایش سفارش آنالیز/پردازش</h3>
                            <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 transition"><X size={18} className="text-slate-400 hover:text-red-500"/></button>
                        </div>
                        {!itemsEditable && (
                            <div className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3">
                                این سفارش قبلاً ارسال شده و از موجودی کسر شده است؛ برای حفظ صحت موجودی، فقط مقصد/تاریخ/توضیحات قابل ویرایش است، نه ردیف اقلام.
                            </div>
                        )}
                        <div className="grid grid-cols-2 gap-2.5 mb-3">
                            <input className="col-span-2 w-full p-2.5 border border-slate-200 rounded-lg outline-none focus:border-indigo-500" placeholder="مقصد / کارگاه پردازش" value={recipient} onChange={e => setRecipient(e.target.value)}/>
                            <input className="w-full p-2.5 border border-slate-200 rounded-lg outline-none" value={date} onChange={e => setDate(e.target.value)} dir="ltr"/>
                            <input className="w-full p-2.5 border border-slate-200 rounded-lg outline-none" placeholder="توضیحات" value={description} onChange={e => setDescription(e.target.value)}/>
                        </div>
                        {itemsEditable && (
                            <div className="relative mb-3">
                                <Search className="absolute right-3 top-3 text-slate-400" size={18}/>
                                <input className="w-full pl-3 pr-10 py-2.5 rounded-full border border-slate-200 bg-white outline-none focus:border-indigo-500" placeholder="افزودن کالای دیگر از انبار..." value={search} onChange={e => setSearch(e.target.value)}/>
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
                        )}
                        <div className="text-[10px] text-slate-400 grid grid-cols-[1fr_76px_88px_28px] gap-2 px-1 mb-1">
                            <span>کالا</span><span className="text-center">تعداد</span><span className="text-center">وزن (Kg)</span><span></span>
                        </div>
                        <div className="space-y-2 mb-2">
                            {cart.map((c, idx) => (
                                <div key={idx} className="grid grid-cols-[1fr_76px_88px_100px_28px] items-center gap-2 bg-slate-50 border border-slate-100 rounded-lg p-2">
                                    <div className="min-w-0">
                                        <ItemNameLabel it={c} inventoryItems={items} isPending={itemsEditable} className="font-bold text-slate-700 text-sm truncate" />
                                        <div className="text-[10px] text-slate-400 truncate">{itemDetailParts(resolveItemDisplay(c, items, itemsEditable).display).join(' • ')}</div>
                                    </div>
                                    <input type="number" min="0" step="any" disabled={!itemsEditable} className="w-full p-2 border border-slate-200 rounded-lg text-center text-base font-bold disabled:bg-slate-100 disabled:text-slate-400" value={c.qty} onChange={e => updateQty(idx, e.target.value)}/>
                                    <input type="number" min="0" step="any" disabled={!itemsEditable} className="w-full p-2 border border-indigo-200 rounded-lg text-center text-base font-black text-indigo-700 bg-indigo-50 disabled:bg-slate-100 disabled:text-slate-400" placeholder="وزن" value={c.weight || ''} onChange={e => updateWeight(idx, e.target.value)}/>
                                    <FormattedInput className="w-full p-2 border border-slate-200 rounded-lg text-center text-base font-bold" placeholder="قیمت" value={c.price || ''} onChange={val => updatePrice(idx, val)}/>
                                    {itemsEditable && <button onClick={() => removeCartItem(idx)} className="text-red-400 hover:text-red-600"><X size={16}/></button>}
                                </div>
                            ))}
                        </div>
                        {cartTotal > 0 && <div className="text-left text-sm font-bold text-slate-600 mb-3">جمع ارزش: <span className="text-indigo-600">{formatNumber(cartTotal)} تومان</span></div>}
                        <button onClick={submit} className="w-full py-3 bg-indigo-600 text-white rounded-full font-bold hover:bg-indigo-700 transition shadow-sm shadow-indigo-900/20">ذخیره تغییرات</button>
                    </div>
                </div>
            );
        };

        const ProcessingMergeModal = ({ record, candidates, onClose, onSubmit }) => {
            const [selected, setSelected] = useState([]);
            const toggle = id => setSelected(prev => prev.includes(id) ? prev.filter(x=>x!==id) : [...prev,id]);
            const itemLabel = it => { const d=itemDetailParts(it); return d.length ? `${it.name} — ${d.join(' • ')}` : it.name; };
            const renderItems = (items=[]) => items.map((it,i)=><div key={i} className="flex justify-between gap-2 py-1 border-b border-slate-100 last:border-0"><span className="font-bold text-slate-700 text-[10px] truncate">{itemLabel(it)}</span><span className="text-[9px] text-slate-500 shrink-0">×{formatNumber(it.qty)}{it.weight>0?` · ${formatNumber(it.weight)}kg`:''}</span></div>);
            return <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl p-5 w-full max-w-3xl shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e=>e.stopPropagation()}>
                    <div className="flex items-center justify-between mb-2"><h3 className="font-black text-slate-800 flex items-center gap-3"><div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center"><Layers size={16}/></div> ادغام آنالیزهای {record.recipient}</h3><button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition"><X size={17}/></button></div>
                    <p className="text-[10px] text-slate-400 mb-3">فقط اسناد هم‌مقصد و هم‌وضعیت ادغام می‌شوند؛ اثر موجودی دوباره محاسبه نمی‌شود.</p>
                    <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 mb-3"><div className="font-black text-indigo-800 text-sm mb-2">سند اصلی · #{record.id.slice(-6)} · {record.date}</div><div className="bg-white rounded-lg border border-indigo-100 px-3">{renderItems(record.items)}</div></div>
                    <div className="text-xs font-black text-slate-700 mb-2">اسناد قابل ادغام</div>
                    <div className="space-y-2 max-h-[45vh] overflow-y-auto">
                        {candidates.map(c=><div key={c.id} className={`rounded-xl border overflow-hidden ${selected.includes(c.id)?'border-indigo-300 bg-indigo-50/50':'border-slate-200 bg-slate-50'}`}><label className="flex items-start gap-3 p-3 cursor-pointer"><input type="checkbox" className="accent-indigo-600 mt-1" checked={selected.includes(c.id)} onChange={()=>toggle(c.id)}/><div><div className="font-bold text-sm text-slate-700">{c.date} · #{c.id.slice(-6)} · {c.recipient}</div><div className="text-[10px] text-slate-400 mt-1">{c.items?.length||0} قلم · {c.status==='reserved'?'رزرو':c.status==='sent'?'در حال پردازش':'برگشته'}</div></div></label><div className="px-3 pb-3"><div className="bg-white rounded-lg border border-slate-200 px-3">{renderItems(c.items)}</div></div></div>)}
                        {candidates.length===0 && <div className="text-center text-slate-400 py-8 text-sm">سند قابل ادغامی پیدا نشد.</div>}
                    </div>
                    <button disabled={!selected.length} onClick={()=>onSubmit([record.id,...selected])} className="w-full mt-3 py-3 rounded-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-bold transition shadow-sm shadow-indigo-900/20">ادغام {selected.length+1} سند</button>
                </div>
            </div>;
        };

        // --- گزارش کلی آنالیز/پردازش (همان الگوی نمایش گزارش کلی امانی، برای سفارش‌های هنوز برنگشته) ---
        const ProcessingSummaryModal = ({ summary, onClose }) => {
            const [mode, setMode] = useState('sent');
            const data = summary[mode] || { parties: [], totalWeight: 0, totalQty: 0 };
            const isSent = mode === 'sent';
            const title = isSent ? 'گزارش کلی در حال پردازش' : 'گزارش کلی رزروشده (هنوز ارسال نشده)';
            const emptyText = isSent ? 'در حال حاضر هیچ باری نزد کارگاه‌های پردازش نیست.' : 'در حال حاضر سفارش رزروشده‌ای وجود ندارد.';
            return (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[75] flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl max-w-[96vw] w-fit min-w-[min(1000px,96vw)] shadow-2xl overflow-hidden max-h-[92vh] flex flex-col" onClick={e=>e.stopPropagation()}>
                        <div className="p-4 border-b bg-slate-50 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0"><RefreshCw size={18}/></div>
                                <div><h3 className="font-black text-slate-800">{title}</h3>
                                <p className="text-[10px] text-slate-400 mt-1">هر کارگاه/مقصد پردازش جداگانه نمایش داده شده و جمع کل مانده‌ی همان مقصد نیز مشخص است.</p></div>
                            </div>
                            <button onClick={onClose} className="p-2 hover:bg-white rounded-full transition"><X size={18}/></button>
                        </div>

                        <div className="p-4 border-b flex flex-wrap gap-2">
                            <button onClick={()=>setMode('sent')} className={`px-4 py-2 rounded-full text-xs font-bold transition ${mode==='sent'?'bg-indigo-600 text-white shadow-sm shadow-indigo-900/20':'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'}`}>
                                در حال پردازش (نزد کارگاه) · {formatNumber(summary.sent?.totalWeight||0)} کیلو
                            </button>
                            <button onClick={()=>setMode('reserved')} className={`px-4 py-2 rounded-full text-xs font-bold transition ${mode==='reserved'?'bg-slate-700 text-white shadow-sm':'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                                رزروشده (هنوز ارسال نشده) · {formatNumber(summary.reserved?.totalWeight||0)} کیلو
                            </button>
                        </div>

                        <div className="p-4 overflow-y-auto">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
                                <div className="bg-slate-50 border rounded-xl p-3">
                                    <div className="text-[10px] text-slate-400">تعداد مقصد/کارگاه</div>
                                    <div className="font-black text-lg text-slate-800">{formatNumber(data.parties.length)}</div>
                                </div>
                                <div className={`border rounded-xl p-3 ${isSent ? 'bg-indigo-50 border-indigo-100' : 'bg-slate-100 border-slate-200'}`}>
                                    <div className="text-[10px] text-slate-500">وزن کل</div>
                                    <div className={`font-black text-lg ${isSent ? 'text-indigo-700' : 'text-slate-700'}`}>{formatNumber(data.totalWeight)} کیلو</div>
                                </div>
                                <div className="bg-slate-50 border rounded-xl p-3">
                                    <div className="text-[10px] text-slate-400">تعداد کل</div>
                                    <div className="font-black text-lg text-slate-800">{formatNumber(data.totalQty)} عدد</div>
                                </div>
                                <div className="bg-slate-50 border rounded-xl p-3">
                                    <div className="text-[10px] text-slate-400">وضعیت</div>
                                    <div className="font-bold text-sm text-slate-700">{isSent ? 'نزد کارگاه پردازش است' : 'هنوز از انبار خارج نشده'}</div>
                                </div>
                            </div>

                            {data.parties.length === 0 ? (
                                <div className="text-center text-slate-400 py-12 border border-dashed border-slate-200 rounded-2xl">{emptyText}</div>
                            ) : (
                                <div className="space-y-4">
                                    {data.parties.map((party, i) => (
                                        <div key={party.party + i} className="rounded-2xl border border-slate-200 overflow-hidden bg-white shadow-sm">
                                            <div className={`px-4 py-3 flex items-center justify-between gap-3 ${isSent ? 'bg-indigo-50' : 'bg-slate-50'} border-b`}>
                                                <div className="min-w-0">
                                                    <div className={`font-black text-base ${isSent ? 'text-indigo-900' : 'text-slate-800'}`}>{party.party || 'نامشخص'}</div>
                                                    <div className="text-[10px] text-slate-500 mt-0.5">{party.items.length} قلم</div>
                                                </div>
                                                <div className="text-left shrink-0">
                                                    <div className={`font-black text-lg ${isSent ? 'text-indigo-700' : 'text-slate-700'}`}>{formatNumber(party.weight)} کیلو</div>
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
                                                <span className="text-slate-500">جمع {party.party}</span>
                                                <span className={isSent ? 'text-indigo-700' : 'text-slate-700'}>{formatNumber(party.weight)} کیلو · {formatNumber(party.qty)} عدد</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="p-3 border-t bg-slate-50 flex justify-between items-center gap-3">
                            <div className="text-xs font-black text-slate-700">جمع کل {isSent ? 'نزد کارگاه‌ها' : 'رزروشده'}: <span className={isSent ? 'text-indigo-700' : 'text-slate-700'}>{formatNumber(data.totalWeight)} کیلو · {formatNumber(data.totalQty)} عدد</span></div>
                            <button onClick={onClose} className="px-5 py-2.5 rounded-full bg-slate-800 text-white text-xs font-bold hover:bg-slate-900 transition">بستن</button>
                        </div>
                    </div>
                </div>
            );
        };

        const ProcessingView = ({ items, orders, onAdd, onSend, onCancel, onReturn, onEdit, onDelete, onMerge }) => {
            const toast = useToast();
            const confirmAction = useConfirm();
            const [cart, setCart] = useState([]);
            const [recipient, setRecipient] = useState('');
            const [date, setDate] = useState(new Date().toLocaleDateString('fa-IR'));
            const [description, setDescription] = useState('');
            const [search, setSearch] = useState('');
            const [returnOrder, setReturnOrder] = useState(null);
            const [editingOrder, setEditingOrder] = useState(null);
            const [printOrder, setPrintOrder] = useState(null);
            const [mergeOrder, setMergeOrder] = useState(null);
            const [showProcessingSummary, setShowProcessingSummary] = useState(false);
            const mergeCandidatesFor = (record) => (orders || []).filter(o => o.id !== record.id && o.status === record.status && String(o.recipient||'').trim().toLocaleLowerCase('fa-IR') === String(record.recipient||'').trim().toLocaleLowerCase('fa-IR') && !o.mergedFromIds);

            const filtered = search ? items.filter(i => smartItemMatch(i, search)) : [];

            // گزارش کلی: سفارش‌های «در حال پردازش» (نزد کارگاه) و «رزروشده» (هنوز ارسال نشده) هرکدام
            // بر اساس مقصد/کارگاه گروه‌بندی می‌شوند تا معلوم باشد چه چیزی کجاست — دقیقاً همان الگوی گزارش کلی امانی
            const processingSummary = useMemo(() => {
                const build = (status) => {
                    const partyMap = new Map();
                    let totalWeight = 0, totalQty = 0;
                    (orders||[]).filter(o => o.status === status).forEach(o => {
                        const partyKey = String(o.recipient||'').trim() || '—';
                        const party = partyMap.get(partyKey) || { party: partyKey, qty: 0, weight: 0, items: new Map() };
                        (o.items||[]).forEach(it => {
                            const k = it.itemId || `${it.name}|${it.brand || ''}|${it.tag || ''}`;
                            const qty = Number(it.qty) || 0;
                            const weight = Number(it.weight) || 0;
                            if (qty <= 0 && weight <= 0) return;
                            const item = party.items.get(k) || { name: it.name, brand: it.brand || '', tag: it.tag || '', qty: 0, weight: 0 };
                            item.qty += qty; item.weight += weight;
                            party.items.set(k, item);
                            party.qty += qty; party.weight += weight;
                            totalQty += qty; totalWeight += weight;
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
                return { sent: build('sent'), reserved: build('reserved') };
            }, [orders]);

            const addToCart = (item) => {
                if (cart.find(c => c.itemId === item.id)) return;
                setCart([...cart, { itemId: item.id, name: item.name, brand: item.brand, tag: item.tag, unit: item.unit, qty: 1, weight: 0, price: 0, stock: item.quantity }]);
                setSearch('');
            };
            const updateQty = (idx, qty) => setCart(cart.map((c, i) => i === idx ? { ...c, qty: parseDecimal(qty) } : c));
            const updateWeight = (idx, weight) => setCart(cart.map((c, i) => i === idx ? { ...c, weight: parseDecimal(weight) } : c));
            const removeCart = (idx) => setCart(cart.filter((_, i) => i !== idx));
            const rowTotal = (c) => parseDecimal(c.weight) * parseDecimal(c.price);
            const cartTotal = cart.reduce((s, c) => s + rowTotal(c), 0);
            const cartWeight = cart.reduce((s, c) => s + (Number(c.weight) || 0), 0);

            const submit = async (sendNow) => {
                if (cart.length === 0) return toast.show('سبد ارسال خالی است');
                if (!recipient) return toast.show('مقصد / کارگاه پردازش را وارد کنید');
                const over = cart.find(c => c.qty > c.stock);
                if (over && !(await confirmAction(`موجودی «${over.name}» کافی نیست. ادامه می‌دهید؟`))) return;
                onAdd({ id: generateId(), recipient, date, description, items: cart, status: sendNow ? 'sent' : 'reserved', timestamp: Date.now() });
                setCart([]); setRecipient(''); setDescription('');
            };

            const groups = { reserved: [], sent: [], returned: [] };
            [...orders].sort((a, b) => b.timestamp - a.timestamp).forEach(o => { if (groups[o.status]) groups[o.status].push(o); });

            const OrderCard = ({ o }) => (
                <div className={`border rounded-xl p-3 ${o.status === 'reserved' ? 'bg-slate-50/60 border-slate-200' : o.status === 'sent' ? 'bg-blue-50/40 border-blue-200' : 'bg-emerald-50/30 border-emerald-100'}`}>
                    <div className="flex justify-between items-start mb-1.5">
                        <div>
                            <div className="font-bold text-slate-800">{o.recipient}</div>
                            <div className="text-[10px] text-slate-400 flex items-center gap-1"><Calendar size={10}/> {o.date}</div>
                        </div>
                        {o.status === 'reserved' && <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded-lg text-[10px] font-bold border border-slate-200">رزرو</span>}
                        {o.status === 'sent' && <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-lg text-[10px] font-bold border border-blue-200">در حال پردازش (آسیاب)</span>}
                        {o.status === 'returned' && <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded-lg text-[10px] font-bold border border-emerald-200">برگشته / تکمیل</span>}
                    </div>
                    <div className="text-xs text-slate-500 mb-2">
                        <span className="text-slate-400">ارسالی: </span>
                        {o.items.map((it, idx) => (<span key={idx} className="inline-block ml-2"><ItemNameLabel it={it} inventoryItems={items} isPending={o.status === 'reserved'} /> ×{formatNumber(it.qty)}{it.weight > 0 && <span className="text-slate-400"> ({formatNumber(it.weight)} کیلو)</span>}</span>))}
                    </div>
                    {o.status === 'returned' && o.returnedItems && (
                        <div className="text-xs text-emerald-700 mb-2 bg-emerald-50 rounded-lg p-2 border border-emerald-100">
                            <span className="font-bold">بازگشتی ({o.returnedDate}): </span>
                            {o.returnedItems.map((it, idx) => (<span key={idx} className="inline-block ml-2"><ItemNameLabel it={it} inventoryItems={items} isPending={false} /> ×{formatNumber(it.qty)}{it.weight > 0 && <span className="text-emerald-500"> ({formatNumber(it.weight)} کیلو)</span>}</span>))}
                        </div>
                    )}
                    {o.description && <div className="text-[11px] text-slate-400 mb-2">{o.description}</div>}
                    <div className="flex gap-2 mb-1.5">
                        <button onClick={() => setPrintOrder(o)} className="flex-1 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg text-xs font-bold border border-indigo-100 flex items-center justify-center gap-1"><Printer size={13}/> چاپ</button>
                        <button onClick={() => setEditingOrder(o)} className="flex-1 py-1.5 bg-slate-50 text-slate-600 hover:bg-slate-100 rounded-lg text-xs font-bold border border-slate-200 flex items-center justify-center gap-1"><Edit3 size={13}/> ویرایش</button>
                        <button onClick={() => setMergeOrder(o)} className="flex-1 py-1.5 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-lg text-xs font-bold border border-purple-100 flex items-center justify-center gap-1"><Layers size={13}/> ادغام</button>
                        <button onClick={() => onDelete(o.id)} className="flex-1 py-1.5 bg-red-50 text-red-500 hover:bg-red-100 rounded-lg text-xs font-bold border border-red-100 flex items-center justify-center gap-1"><Trash2 size={13}/> حذف</button>
                    </div>
                    {o.status === 'reserved' && (
                        <div className="flex gap-2">
                            <button onClick={() => onSend(o.id)} className="flex-1 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-xs font-bold border border-blue-100 flex items-center justify-center gap-1"><Truck size={13}/> ارسال شد</button>
                            <button onClick={() => onCancel(o.id)} className="flex-1 py-1.5 bg-amber-50 text-amber-600 hover:bg-amber-100 rounded-lg text-xs font-bold border border-amber-100 flex items-center justify-center gap-1"><X size={13}/> لغو</button>
                        </div>
                    )}
                    {o.status === 'sent' && (
                        <button onClick={() => setReturnOrder(o)} className="w-full py-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg text-xs font-bold border border-emerald-100 flex items-center justify-center gap-1"><Check size={13}/> ثبت بازگشت از پردازش</button>
                    )}
                </div>
            );

            return (
                <div className="flex flex-col lg:flex-row gap-6">
                    <div className="lg:w-1/3 bg-white rounded-3xl border border-slate-200 flex flex-col overflow-hidden shadow-sm shrink-0">
                        <div className="p-4 bg-slate-50 border-b border-slate-100 space-y-3">
                            <div className="relative">
                                <Search className="absolute right-3 top-3 text-slate-400" size={18}/>
                                <input className="w-full pl-3 pr-10 py-2.5 rounded-full border border-slate-200 bg-white outline-none focus:border-indigo-500" placeholder="جستجوی کالا برای ارسال..." value={search} onChange={e => setSearch(e.target.value)}/>
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
                            <input className="w-full p-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-500" placeholder="مقصد / کارگاه پردازش *" value={recipient} onChange={e => setRecipient(e.target.value)}/>
                            <div className="flex gap-2">
                                <input className="w-1/2 p-2.5 border border-slate-200 rounded-lg text-sm outline-none" value={date} onChange={e => setDate(e.target.value)} dir="ltr"/>
                                <input className="w-1/2 p-2.5 border border-slate-200 rounded-lg text-sm outline-none" placeholder="توضیحات" value={description} onChange={e => setDescription(e.target.value)}/>
                            </div>
                        </div>
                        {cart.length > 0 && (
                            <div className="text-[10px] text-slate-400 grid grid-cols-[1fr_76px_88px_100px_28px] gap-1.5 px-3 pt-2">
                                <span>کالا</span><span className="text-center">تعداد</span><span className="text-center">وزن</span><span className="text-center">قیمت/کیلو</span><span></span>
                            </div>
                        )}
                        <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-[120px]">
                            {cart.length === 0 && <div className="text-center text-slate-300 text-sm py-8">سبد ارسال خالی است</div>}
                            {cart.map((c, idx) => (
                                <div key={idx} className="bg-slate-50 border border-slate-100 rounded-lg p-2">
                                    <div className="grid grid-cols-[1fr_76px_88px_100px_28px] items-center gap-1.5">
                                        <div className="min-w-0">
                                            <div className="font-bold text-slate-700 text-sm truncate">{c.name}</div>
                                            <div className="text-[10px] text-slate-400 truncate">موجودی: {formatNumber(c.stock)}{itemDetailParts(c).length > 0 && ` • ${itemDetailParts(c).join(' • ')}`}</div>
                                        </div>
                                        <input type="number" min="0" step="any" title="تعداد" className="w-full p-2 border border-slate-200 rounded-lg text-center text-base font-bold" value={c.qty} onChange={e => updateQty(idx, e.target.value)}/>
                                        <input type="number" min="0" step="any" title="وزن (کیلوگرم)" placeholder="وزن" className="w-full p-2 border border-indigo-200 rounded-lg text-center text-base font-black text-indigo-700 bg-indigo-50" value={c.weight || ''} onChange={e => updateWeight(idx, e.target.value)}/>
                                        <FormattedInput className="w-full p-2 border border-slate-200 rounded-lg text-center text-base font-bold" placeholder="قیمت" value={c.price || ''} onChange={val => updatePrice(idx, val)}/>
                                        <button onClick={() => removeCart(idx)} className="text-red-400 hover:text-red-600"><X size={16}/></button>
                                    </div>
                                    {rowTotal(c) > 0 && <div className="text-left text-[10px] font-bold text-emerald-600 mt-1">جمع ردیف: {formatNumber(rowTotal(c))} تومان</div>}
                                </div>
                            ))}
                        </div>
                        {cartTotal > 0 && (
                            <div className="px-3 pb-1 text-left text-xs font-bold text-slate-500">
                                {cartWeight > 0 && <div className="text-slate-400 font-normal">وزن کل: {formatNumber(cartWeight)} کیلوگرم</div>}
                                جمع ارزش ارسالی: <span className="text-indigo-600">{formatNumber(cartTotal)} تومان</span>
                            </div>
                        )}
                        <div className="p-3 border-t border-slate-100 flex gap-2">
                            <button onClick={() => submit(false)} className="flex-1 py-3 border-2 border-slate-300 text-slate-600 bg-slate-50 rounded-xl font-bold text-sm hover:bg-slate-100 transition">ثبت رزرو</button>
                            <button onClick={() => submit(true)} className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm flex justify-center items-center gap-2"><Truck size={16}/> ارسال فوری</button>
                        </div>
                    </div>
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4 content-start">
                        <div className="md:col-span-3 flex justify-end items-start">
                            <button type="button" onClick={()=>setShowProcessingSummary(true)} className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700"><RefreshCw size={14}/> گزارش کلی</button>
                        </div>
                        <div className="bg-white rounded-3xl border border-slate-200 p-3 shadow-sm">
                            <div className="font-bold text-slate-600 text-sm mb-3 flex items-center gap-1.5"><ClipboardList size={15}/> رزرو‌شده ({groups.reserved.length})</div>
                            <div className="space-y-2">{groups.reserved.length === 0 ? <div className="text-center text-slate-300 text-xs py-6">خالی</div> : groups.reserved.map(o => <OrderCard key={o.id} o={o}/>)}</div>
                        </div>
                        <div className="bg-white rounded-3xl border border-slate-200 p-3 shadow-sm">
                            <div className="font-bold text-blue-600 text-sm mb-3 flex items-center gap-1.5"><RefreshCw size={15}/> در حال پردازش ({groups.sent.length})</div>
                            <div className="space-y-2">{groups.sent.length === 0 ? <div className="text-center text-slate-300 text-xs py-6">خالی</div> : groups.sent.map(o => <OrderCard key={o.id} o={o}/>)}</div>
                        </div>
                        <div className="bg-white rounded-3xl border border-slate-200 p-3 shadow-sm">
                            <div className="font-bold text-emerald-600 text-sm mb-3 flex items-center gap-1.5"><CheckCircle size={15}/> برگشته ({groups.returned.length})</div>
                            <div className="space-y-2">{groups.returned.length === 0 ? <div className="text-center text-slate-300 text-xs py-6">خالی</div> : groups.returned.map(o => <OrderCard key={o.id} o={o}/>)}</div>
                        </div>
                    </div>
                    {showProcessingSummary && <ProcessingSummaryModal summary={processingSummary} onClose={()=>setShowProcessingSummary(false)} />}
                    {returnOrder && <ReturnProcessingModal items={items} expectedBags={returnOrder.emptyBagsExpected || []} onClose={() => setReturnOrder(null)} onSubmit={(returnedItems, bagsReturned) => { onReturn(returnOrder.id, returnedItems, bagsReturned); setReturnOrder(null); }}/>}
                    {editingOrder && <EditProcessingModal order={editingOrder} items={items} onClose={() => setEditingOrder(null)} onSave={(o) => { onEdit(o); setEditingOrder(null); }}/>}
                    {mergeOrder && <ProcessingMergeModal record={mergeOrder} candidates={mergeCandidatesFor(mergeOrder)} onClose={() => setMergeOrder(null)} onSubmit={(ids) => { onMerge(ids); setMergeOrder(null); }}/>}
                    {printOrder && <PrintOrderModal
                        title="سند آنالیز / پردازش"
                        badge={printOrder.status === 'reserved' ? 'رزرو' : printOrder.status === 'sent' ? 'در حال پردازش' : '✓ برگشته / تکمیل'}
                        badgeColor={printOrder.status === 'reserved' ? {bg:'#f1f5f9',text:'#475569',border:'#e2e8f0'} : printOrder.status === 'sent' ? {bg:'#dbeafe',text:'#1e40af',border:'#93c5fd'} : {bg:'#d1fae5',text:'#065f46',border:'#a7f3d0'}}
                        rows={[{label:'مقصد / کارگاه پردازش', value: printOrder.recipient}, {label:'وضعیت', value: printOrder.status === 'reserved' ? 'رزرو' : printOrder.status === 'sent' ? 'در حال پردازش' : 'برگشته/تکمیل'}]}
                        itemsList={printOrder.status === 'returned' && printOrder.returnedItems ? printOrder.returnedItems : printOrder.items}
                        inventoryItems={items}
                        isPending={printOrder.status === 'reserved'}
                        description={printOrder.description}
                        docId={printOrder.id}
                        docDate={printOrder.date}
                        onClose={() => setPrintOrder(null)}
                    />}
                </div>
            );
        };


