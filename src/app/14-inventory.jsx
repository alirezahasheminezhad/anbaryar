//## ═══ app/14-inventory.jsx ═══
//## موجودی کالا: کارت/گروه اقلام، ادغام، افزودن/ویرایش، تاریخچه، شمارش موجودی، پیش‌نمایش اکسل.
//## ترتیب فایل‌ها در build.py مهم است؛ همه‌ی بخش‌ها یک scope مشترک دارند.
        // آستانه هشدار موجودی: عمومی یا اختصاصی برای هر کالا؛ مبنا می‌تواند تعداد یا وزن باشد.
        const getInventoryWeightKg = (item) => {
            const qty = Number(item?.quantity) || 0;
            const bagWeightKg = Number(item?.bagWeight) > 0 ? Number(item.bagWeight) / 1000 : 0;
            if (bagWeightKg > 0) return qty * bagWeightKg;
            const unit = String(item?.unit || '').trim().toLowerCase();
            if (unit === 'کیلو' || unit === 'کیلوگرم' || unit === 'kg') return qty;
            if (unit === 'تن' || unit === 'ton' || unit === 'tons') return qty * 1000;
            return 0;
        };
        const getLowStockState = (item, reserved = 0, globalThreshold = 100) => {
            const custom = item?.lowStockCustomThreshold != null && Number(item.lowStockCustomThreshold) > 0;
            const threshold = custom ? Number(item.lowStockCustomThreshold) : Number(globalThreshold || 0);
            const mode = custom ? (item.lowStockThresholdMode || 'quantity') : 'quantity';
            const availableQty = Math.max(0, (Number(item?.quantity) || 0) - (Number(reserved) || 0));
            if (mode === 'weight') {
                const bagWeightKg = Number(item?.bagWeight) > 0 ? Number(item.bagWeight) / 1000 : 0;
                const unit = String(item?.unit || '').trim().toLowerCase();
                let reservedWeightKg = 0;
                if (bagWeightKg > 0) reservedWeightKg = (Number(reserved) || 0) * bagWeightKg;
                else if (unit === 'کیلو' || unit === 'کیلوگرم' || unit === 'kg') reservedWeightKg = Number(reserved) || 0;
                else if (unit === 'تن' || unit === 'ton' || unit === 'tons') reservedWeightKg = (Number(reserved) || 0) * 1000;
                const availableWeightKg = Math.max(0, getInventoryWeightKg(item) - reservedWeightKg);
                return { isLowStock: availableWeightKg > 0 && availableWeightKg <= threshold, threshold, mode, value: availableWeightKg };
            }
            return { isLowStock: availableQty > 0 && availableQty <= threshold, threshold, mode, value: availableQty };
        };

        const InventoryItemCard = ({ item, reserved, onUpdateQuantity, onDelete, onEdit, onShowHistory, onMerge, onCount, grouped, lowStockThreshold = 2, warehouses }) => {
            const colorMap = {
                'default': 'bg-slate-100 text-slate-600 border-slate-200',
                'red': 'bg-red-50 text-red-600 border-red-100',
                'green': 'bg-emerald-50 text-emerald-600 border-emerald-100',
                'blue': 'bg-blue-50 text-blue-600 border-blue-100',
                'orange': 'bg-orange-50 text-orange-600 border-orange-100',
                'purple': 'bg-purple-50 text-purple-600 border-purple-100',
            };
            const getTagColor = (tag) => {
                if (!tag || tag === 'عمومی') return colorMap['default'];
                const colors = ['red', 'green', 'blue', 'orange', 'purple'];
                return colorMap[colors[tag.length % colors.length]];
            };

            const availableStock = item.quantity - reserved;
            const lowState = getLowStockState(item, reserved, lowStockThreshold);
            const isLowStock = lowState.isLowStock;
            const isZeroStock = item.quantity <= 0;

            return (
                <div className={`group bg-white rounded-xl p-3 border hover:shadow-md transition-all flex flex-col ${isZeroStock ? 'border-red-200 bg-red-50/20' : isLowStock ? 'border-orange-200 bg-orange-50/20' : 'border-slate-100 hover:border-indigo-200'} ${!grouped ? 'mb-3 shadow-sm' : 'w-full'}`}>
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 h-full">
                        <div className="flex-1 w-full sm:w-auto flex items-center gap-3 overflow-hidden cursor-pointer" onClick={() => onEdit(item)}>
                            {!grouped && (
                                <div className="font-bold text-slate-800 text-lg truncate min-w-[120px] hover:text-indigo-600 transition">{item.name}</div>
                            )}
                            <div className="flex flex-wrap items-center gap-2 text-sm w-full sm:w-auto">
                                <div className={`flex items-center gap-1 px-2 py-1 rounded-md border text-xs font-bold ${getTagColor(item.tag)}`}><Tag size={12} />{item.tag}</div>
                                {item.brand && <div className="flex items-center gap-1 text-slate-500 bg-slate-50 px-2 py-1 rounded-md border border-slate-200 text-xs font-medium"><Layers size={12} />{item.brand}</div>}
                                {item.warehouseId && <WarehouseBadge warehouse={getWarehouseById(warehouses, item.warehouseId)} />}
                            </div>
                        </div>
                        <div className="w-full sm:w-auto mt-2 sm:mt-0">
                            <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                                <div className={`flex items-center rounded-xl p-1 border ${reserved > 0 ? 'bg-amber-50 border-amber-200' : isZeroStock ? 'bg-red-50 border-red-200' : isLowStock ? 'bg-orange-50 border-orange-200' : 'bg-slate-50 border-slate-200'}`}>
                                    <button onClick={() => onUpdateQuantity(item.id, -1)} className="w-8 h-8 flex items-center justify-center bg-white border border-slate-200 hover:bg-red-50 hover:text-red-500 hover:border-red-200 rounded-lg text-slate-500 transition-all active:scale-95 shadow-sm"><Minus size={14} strokeWidth={2.5}/></button>
                                    <div className="min-w-[80px] flex flex-col items-center justify-center px-2 cursor-default">
                                        <div className={`text-lg font-black tabular-nums ${isZeroStock ? 'text-red-500' : isLowStock ? 'text-orange-500' : reserved > 0 ? 'text-amber-700' : 'text-slate-700'}`}>{availableStock}</div>
                                        <div className="flex items-center gap-1 text-[9px] text-slate-400 font-bold -mt-1">
                                            <span>{item.unit || 'عدد'}</span>
                                            {reserved > 0 && <span className="inline-flex items-center gap-0.5 whitespace-nowrap text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded-full ml-1" title={`${reserved} عدد رزرو شده`}><Lock size={8} /> {reserved}</span>}
                                        </div>
                                    </div>
                                    <button onClick={() => onUpdateQuantity(item.id, 1)} className="w-8 h-8 flex items-center justify-center bg-white border border-slate-200 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200 rounded-lg text-slate-500 transition-all active:scale-95 shadow-sm"><Plus size={14} strokeWidth={2.5}/></button>
                                </div>
                                <div className="w-px h-8 bg-slate-100 mx-1 hidden sm:block"></div>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => onEdit(item)} className="w-9 h-9 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 border border-transparent hover:border-indigo-100 rounded-xl transition-all" title="ویرایش موجودی"><Edit3 size={18} /></button>
                                    <button onClick={() => onShowHistory(item)} className="w-9 h-9 flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 border border-transparent hover:border-blue-100 rounded-xl transition-all" title="گزارش کامل کالا"><History size={18} /></button>
                                    {onCount && (
                                        <button onClick={(e) => { e.stopPropagation(); onCount(item); }} className="w-9 h-9 flex items-center justify-center text-slate-400 hover:text-teal-600 hover:bg-teal-50 border border-transparent hover:border-teal-100 rounded-xl transition-all" title="شمارش فیزیکی موجودی (Inventory Count)"><ClipboardList size={18} /></button>
                                    )}
                                    {onMerge && (
                                        reserved > 0
                                            ? <div className="w-9 h-9 flex items-center justify-center text-slate-200 cursor-not-allowed" title="این بار رزرو دارد و قابل ادغام نیست"><GitMerge size={18} /></div>
                                            : <button onClick={(e) => { e.stopPropagation(); onMerge(item); }} className="w-9 h-9 flex items-center justify-center text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 border border-transparent hover:border-emerald-100 rounded-xl transition-all" title="ادغام با بار(های) دیگر"><GitMerge size={18} /></button>
                                    )}
                                    <button onClick={(e) => { e.stopPropagation(); onDelete(item.id, item.name); }} className="w-9 h-9 flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 border border-transparent hover:border-red-100 rounded-xl transition-all" title="حذف"><Trash2 size={18} /></button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            );
        };

        const InventoryGroup = ({ name, items, reservedCounts, onUpdateQuantity, onDelete, onEdit, onShowHistory, onMerge, onCount, viewMode, lowStockThreshold = 2, warehouses }) => {
            const [collapsed, setCollapsed] = useState(false);
            const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
            const hasLowStock = items.some(item => getLowStockState(item, reservedCounts[item.id] || 0, lowStockThreshold).isLowStock);
            const hasZeroStock = items.some(item => item.quantity <= 0);

            return (
                <div className="border-t border-slate-100 animate-in fade-in duration-500">
                    <div className={`px-6 py-3.5 flex items-center justify-between cursor-pointer select-none transition-colors ${hasZeroStock ? 'bg-red-50/60' : hasLowStock ? 'bg-orange-50/60' : 'bg-slate-50/70'}`} onClick={() => setCollapsed(c => !c)}>
                        <div className="flex items-center gap-2">
                            <div className="bg-white p-1.5 rounded-lg border border-slate-200 text-indigo-600 shadow-sm"><Package size={18} /></div>
                            <h3 className="font-black text-slate-700 text-lg">{name}</h3>
                            <span className="text-xs text-slate-400 font-medium mr-2 bg-slate-100 px-2 py-0.5 rounded-full">{items.length} مدل</span>
                            {hasZeroStock && <span className="text-[10px] font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full border border-red-200">⚠ اتمام موجودی</span>}
                            {!hasZeroStock && hasLowStock && <span className="text-[10px] font-bold text-orange-600 bg-orange-100 px-2 py-0.5 rounded-full border border-orange-200">موجودی کم</span>}
                        </div>
                        <div className="flex items-center gap-2">
                            <div className={`px-3 py-1 rounded-lg text-sm font-bold border ${hasZeroStock?'bg-red-50 text-red-600 border-red-200':hasLowStock?'bg-orange-50 text-orange-600 border-orange-200':'bg-indigo-50 text-indigo-700 border-indigo-100'}`}>مجموع: {totalQuantity.toLocaleString()}</div>
                            <div className="text-slate-400">{collapsed ? <ChevronDown size={18}/> : <ChevronUp size={18}/>}</div>
                        </div>
                    </div>
                    {!collapsed && (
                        viewMode === 'table' ? (
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[760px] table-fixed text-sm text-right">
                                    <colgroup>{[13,14,11,8,8,10,6,9,21].map((w,i)=><col key={i} style={{width:w+'%'}}/>)}</colgroup>
                                    <thead className="text-slate-400 text-[11px] tracking-wide border-b border-slate-100">
                                        <tr>
                                            <th className="whitespace-nowrap px-3 py-3.5 font-medium">برند / مدل</th>
                                            <th className="whitespace-nowrap px-3 py-3.5 font-medium">تگ</th>
                                            <th className="whitespace-nowrap px-3 py-3.5 font-medium">انبار</th>
                                            <th className="whitespace-nowrap px-3 py-3.5 text-center font-medium">موجودی</th>
                                            <th className="whitespace-nowrap px-3 py-3.5 text-center font-medium">رزرو</th>
                                            <th className="whitespace-nowrap px-3 py-3.5 text-center font-medium">قابل فروش</th>
                                            <th className="whitespace-nowrap px-3 py-3.5 text-center font-medium">واحد</th>
                                            <th className="whitespace-nowrap px-3 py-3.5 text-center font-medium">وضعیت</th>
                                            <th className="whitespace-nowrap px-3 py-3.5 text-center font-medium">عملیات</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {items.map(item => {
                                            const reserved = reservedCounts[item.id] || 0;
                                            const avail = item.quantity - reserved;
                                            const itemLowState = getLowStockState(item, reserved, lowStockThreshold);
                                            return (
                                                <tr key={item.id} className={`hover:bg-slate-50 transition ${item.quantity <= 0 ? 'bg-red-50/30' : itemLowState.isLowStock ? 'bg-orange-50/30' : ''}`}>
                                                    <td className="px-3 py-3.5 font-bold text-slate-700">{item.brand || '—'}</td>
                                                    <td className="px-3 py-3.5"><span title={item.tag} className="inline-block max-w-full truncate align-middle text-xs bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full font-medium">{item.tag}</span></td>
                                                    <td className="px-3 py-3.5 whitespace-nowrap"><WarehouseBadge warehouse={getWarehouseById(warehouses, item.warehouseId)} /></td>
                                                    <td className="px-3 py-3.5 text-center font-black tabular-nums text-slate-700">{item.quantity}</td>
                                                    <td className="px-3 py-3.5 text-center">
                                                        {reserved > 0 ? <span className="inline-flex items-center gap-1 whitespace-nowrap text-xs text-amber-800 bg-amber-50 px-2.5 py-1 rounded-full font-bold tabular-nums"><Lock size={11}/>{reserved}</span> : <span className="text-slate-400">—</span>}
                                                    </td>
                                                    <td className="px-3 py-3.5 text-center">
                                                        <div className="flex flex-col items-center gap-1.5">
                                                            <span className={`font-black text-base tabular-nums ${avail <= 0 ? 'text-red-500' : itemLowState.isLowStock ? 'text-orange-500' : 'text-indigo-900'}`}>{avail}</span>
                                                            <div className="w-16 h-1 rounded-full bg-slate-100 overflow-hidden" aria-hidden="true"><div className={`h-full rounded-full ${avail <= 0 ? 'bg-red-400' : itemLowState.isLowStock ? 'bg-orange-400' : 'bg-indigo-600'}`} style={{ width: `${item.quantity > 0 ? Math.max(0, Math.min(100, avail / item.quantity * 100)) : 0}%` }}/></div>
                                                        </div>
                                                    </td>
                                                    <td className="px-3 py-3.5 text-center text-xs text-slate-500">{item.unit||'عدد'}</td>
                                                    <td className="px-3 py-3.5 text-center">
                                                        <span className={`inline-block text-[11px] font-bold px-3 py-1 rounded-full ${item.quantity <= 0 || avail <= 0 ? 'bg-red-50 text-red-600' : itemLowState.isLowStock ? 'bg-orange-50 text-orange-600' : 'bg-indigo-50 text-indigo-700'}`}>{item.quantity <= 0 || avail <= 0 ? 'اتمام' : itemLowState.isLowStock ? 'کم‌موجودی' : 'موجود'}</span>
                                                    </td>
                                                    <td className="px-3 py-3.5">
                                                        <div className="flex flex-wrap items-center gap-1 justify-center">
                                                            <button onClick={() => onUpdateQuantity(item.id, -1)} className="w-7 h-7 flex items-center justify-center bg-white border border-slate-200 hover:bg-red-50 hover:text-red-500 rounded-lg text-slate-400 transition active:scale-95"><Minus size={12}/></button>
                                                            <button onClick={() => onUpdateQuantity(item.id, 1)} className="w-7 h-7 flex items-center justify-center bg-white border border-slate-200 hover:bg-emerald-50 hover:text-emerald-600 rounded-lg text-slate-400 transition active:scale-95"><Plus size={12}/></button>
                                                            <button onClick={() => onEdit(item)} className="w-7 h-7 flex items-center justify-center text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"><Edit3 size={13}/></button>
                                                            <button onClick={() => onShowHistory(item)} className="w-7 h-7 flex items-center justify-center text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"><History size={13}/></button>
                                                            {onCount && <button onClick={(e) => { e.stopPropagation(); onCount(item); }} className="w-7 h-7 flex items-center justify-center text-slate-500 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition" title="شمارش فیزیکی موجودی"><ClipboardList size={13}/></button>}
                                                            {onMerge && (reserved > 0
                                                                ? <div className="w-7 h-7 flex items-center justify-center text-slate-300 cursor-not-allowed" title="این بار رزرو دارد و قابل ادغام نیست"><GitMerge size={13}/></div>
                                                                : <button onClick={(e) => { e.stopPropagation(); onMerge(item); }} className="w-7 h-7 flex items-center justify-center text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition" title="ادغام با بار(های) دیگر"><GitMerge size={13}/></button>)}
                                                            <button onClick={(e) => { e.stopPropagation(); onDelete(item.id); }} className="w-7 h-7 flex items-center justify-center text-slate-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition"><Trash2 size={13}/></button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="px-4 py-4 bg-slate-50/40 flex flex-col gap-3">
                                {items.map(item => (
                                    <InventoryItemCard key={item.id} item={item} reserved={reservedCounts[item.id] || 0} onUpdateQuantity={onUpdateQuantity} onDelete={onDelete} onEdit={onEdit} onShowHistory={onShowHistory} onMerge={onMerge} onCount={onCount} grouped={true} lowStockThreshold={lowStockThreshold} warehouses={warehouses} />
                                ))}
                            </div>
                        )
                    )}
                </div>
            );
        };

        // پاپ‌آپ ادغام/ترکیب بارها: از کنار یک بار در انبار باز می‌شود، اجازه می‌دهد چند بار دیگر
        // (با جستجو بر اساس نام/برند/تگ/کد) انتخاب و همه در یک بار نهایی خلاصه شوند.
        // بارهای رزروشده (در فاکتور، پردازش و ...) اصلاً در لیست جستجو نشان داده نمی‌شوند تا فاکتورهای
        // در انتظار خراب نشوند.
        const MergeInventoryModal = ({ baseItem, items, reservedCounts, warehouses, onClose, onConfirm }) => {
            const toast = useToast();
            const [search, setSearch] = useState('');
            const [selectedIds, setSelectedIds] = useState([]); // بارهای اضافه‌شده به ادغام (به‌جز خودِ baseItem)
            const [finalBaseId, setFinalBaseId] = useState(baseItem.id); // کدام بار، هویت/بار نهایی باشد
            const [qtyMode, setQtyMode] = useState('sum'); // sum | manual
            const [manualQty, setManualQty] = useState('');
            const [weightMode, setWeightMode] = useState('sum'); // sum | manual | selected
            const [manualWeight, setManualWeight] = useState('');
            const [selectedWeightId, setSelectedWeightId] = useState(baseItem.id);
            const [finalName, setFinalName] = useState(baseItem.name);
            const [finalBrand, setFinalBrand] = useState(baseItem.brand || '');
            const [finalTag, setFinalTag] = useState(baseItem.tag || '');
            const [finalWarehouseId, setFinalWarehouseId] = useState(baseItem.warehouseId || '');

            const isReserved = (it) => (reservedCounts && reservedCounts[it.id]) > 0;

            // انتخاب «بار نهایی» باید نام/برند/تگ/انبار پایین فرم را هم با همان بار هماهنگ کند؛
            // قبلاً فقط finalBaseId عوض می‌شد و این فیلدها همچنان مقدار baseItem اولیه را نشان می‌دادند.
            const applyFinalBase = (it) => {
                setFinalBaseId(it.id);
                setFinalName(it.name || '');
                setFinalBrand(it.brand || '');
                setFinalTag(it.tag || '');
                setFinalWarehouseId(it.warehouseId || '');
            };

            const candidates = useMemo(() => {
                const q = search.trim();
                return (items || []).filter(it => {
                    if (it.id === baseItem.id) return false;
                    if (selectedIds.includes(it.id)) return false;
                    if (isReserved(it)) return false; // بار رزروشده اصلاً قابل انتخاب نیست
                    if (!q) return true;
                    const hay = `${it.name || ''} ${it.brand || ''} ${it.tag || ''} ${it.id || ''}`;
                    return smartSearchMatch(hay, q);
                }).slice(0, 30);
            }, [items, search, selectedIds, reservedCounts]);

            const selectedItems = useMemo(() => (items || []).filter(it => selectedIds.includes(it.id)), [items, selectedIds]);
            const group = useMemo(() => [baseItem, ...selectedItems], [baseItem, selectedItems]);

            const addToMerge = (it) => { setSelectedIds(prev => [...prev, it.id]); setSearch(''); };
            const removeFromMerge = (id) => {
                setSelectedIds(prev => prev.filter(x => x !== id));
                if (finalBaseId === id) applyFinalBase(baseItem);
                if (selectedWeightId === id) setSelectedWeightId(baseItem.id);
            };

            const totalQtySum = group.reduce((s, it) => s + (Number(it.quantity) || 0), 0);
            const totalWeightSum = group.reduce((s, it) => s + getInventoryWeightKg(it), 0);

            const canMerge = group.length >= 2;

            const handleSubmit = () => {
                if (!canMerge) { toast.show('حداقل ۲ بار برای ادغام لازم است'); return; }
                if (qtyMode === 'manual' && parseDecimal(manualQty) <= 0) { toast.show('تعداد نهایی را وارد کنید'); return; }
                if (weightMode === 'manual' && parseDecimal(manualWeight) <= 0) { toast.show('وزن نهایی را وارد کنید'); return; }
                onConfirm({
                    baseId: finalBaseId,
                    groupIds: group.map(it => it.id),
                    qtyMode, manualQty,
                    weightMode, manualWeight, selectedWeightId,
                    finalName: finalName.trim(), finalBrand: finalBrand.trim(), finalTag: finalTag.trim(),
                    finalWarehouseId,
                });
            };

            return (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl p-6 w-full max-w-2xl shadow-2xl animate-in zoom-in-95 max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-5">
                            <h3 className="font-black text-lg text-slate-800 flex items-center gap-3"><div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center"><GitMerge size={17}/></div> ادغام / ترکیب بارها</h3>
                            <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 transition"><X size={20} className="text-slate-400 hover:text-red-500"/></button>
                        </div>

                        {/* بارهای انتخاب‌شده برای ادغام */}
                        <div className="mb-4">
                            <div className="text-xs text-slate-500 mb-2">بارهایی که ادغام می‌شوند ({group.length})</div>
                            <div className="space-y-2">
                                {group.map(it => (
                                    <div key={it.id} className={`flex items-center justify-between gap-2 p-2.5 rounded-xl border ${it.id === finalBaseId ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 bg-slate-50'}`}>
                                        <div className="min-w-0">
                                            <div className="font-bold text-sm text-slate-700 truncate">{it.name} {it.id === finalBaseId && <span className="text-[10px] text-emerald-600 font-black">(بار نهایی)</span>}</div>
                                            <div className="text-[10px] text-slate-400">{[it.brand, it.tag, `${formatNumber(it.quantity)} ${it.unit || 'عدد'}`, `${formatNumber(getInventoryWeightKg(it))} kg`].filter(Boolean).join(' | ')}</div>
                                        </div>
                                        <div className="flex items-center gap-1 shrink-0">
                                            {it.id !== finalBaseId && (
                                                <button type="button" onClick={() => applyFinalBase(it)} className="text-[10px] px-2 py-1 rounded-lg border border-slate-200 bg-white text-slate-500 hover:border-emerald-300 hover:text-emerald-600">این بار نهایی باشد</button>
                                            )}
                                            {it.id !== baseItem.id && (
                                                <button type="button" onClick={() => removeFromMerge(it.id)} className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg"><X size={14}/></button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* جستجو و افزودن بار جدید به ادغام */}
                        <div className="mb-5 relative">
                            <div className="text-xs text-slate-500 mb-2">افزودن بار برای ادغام (جستجو بر اساس نام، برند، تگ یا کد)</div>
                            <div className="relative">
                                <Search className="absolute right-3 top-3 text-slate-400" size={16}/>
                                <input className="w-full p-2.5 pr-9 border rounded-full bg-white outline-none focus:border-emerald-500 text-sm" placeholder="جستجو در انبار..." value={search} onChange={e => setSearch(e.target.value)} />
                            </div>
                            {search && (
                                <div className="mt-2 border border-slate-200 rounded-xl max-h-48 overflow-y-auto divide-y divide-slate-50">
                                    {candidates.length === 0 ? (
                                        <div className="p-3 text-center text-xs text-slate-400">باری با این عبارت پیدا نشد (بارهای رزروشده نشان داده نمی‌شوند)</div>
                                    ) : candidates.map(it => (
                                        <button key={it.id} type="button" onClick={() => addToMerge(it)} className="w-full text-right p-2.5 hover:bg-emerald-50 transition flex items-center justify-between gap-2">
                                            <div className="min-w-0">
                                                <div className="font-bold text-sm text-slate-700 truncate">{it.name}</div>
                                                <div className="text-[10px] text-slate-400">{[it.brand, it.tag, `${formatNumber(it.quantity)} ${it.unit || 'عدد'}`, `${formatNumber(getInventoryWeightKg(it))} kg`, getWarehouseById(warehouses, it.warehouseId)?.name].filter(Boolean).join(' | ')}</div>
                                            </div>
                                            <Plus size={14} className="text-emerald-500 shrink-0"/>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {canMerge && (
                            <>
                                {/* تعداد نهایی */}
                                <div className="mb-4 p-3 bg-slate-50 rounded-xl border border-slate-100">
                                    <div className="text-xs font-bold text-slate-600 mb-2">تعداد نهایی</div>
                                    <div className="flex gap-2 mb-2">
                                        <button type="button" onClick={() => setQtyMode('sum')} className={`flex-1 px-2 py-2 rounded-lg text-xs font-bold border ${qtyMode === 'sum' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-500 border-slate-200'}`}>جمع همه ({formatNumber(totalQtySum)})</button>
                                        <button type="button" onClick={() => setQtyMode('manual')} className={`flex-1 px-2 py-2 rounded-lg text-xs font-bold border ${qtyMode === 'manual' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-500 border-slate-200'}`}>دستی</button>
                                    </div>
                                    {qtyMode === 'manual' && <input type="number" min="0" step="any" className="w-full p-2 border rounded-lg text-sm text-center outline-none focus:border-indigo-500" placeholder="تعداد نهایی" value={manualQty} onChange={e => setManualQty(e.target.value)} />}
                                </div>

                                {/* وزن نهایی */}
                                <div className="mb-4 p-3 bg-slate-50 rounded-xl border border-slate-100">
                                    <div className="text-xs font-bold text-slate-600 mb-2">وزن نهایی (کیلوگرم)</div>
                                    <div className="flex gap-2 mb-2">
                                        <button type="button" onClick={() => setWeightMode('sum')} className={`flex-1 px-2 py-2 rounded-lg text-xs font-bold border ${weightMode === 'sum' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-500 border-slate-200'}`}>جمع همه ({formatNumber(totalWeightSum)})</button>
                                        <button type="button" onClick={() => setWeightMode('manual')} className={`flex-1 px-2 py-2 rounded-lg text-xs font-bold border ${weightMode === 'manual' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-500 border-slate-200'}`}>دستی</button>
                                        <button type="button" onClick={() => setWeightMode('selected')} className={`flex-1 px-2 py-2 rounded-lg text-xs font-bold border ${weightMode === 'selected' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-500 border-slate-200'}`}>وزن یکی از بارها</button>
                                    </div>
                                    {weightMode === 'manual' && <input type="number" min="0" step="any" className="w-full p-2 border rounded-lg text-sm text-center outline-none focus:border-indigo-500" placeholder="وزن نهایی (kg)" value={manualWeight} onChange={e => setManualWeight(e.target.value)} />}
                                    {weightMode === 'selected' && (
                                        <select className="w-full p-2 border rounded-lg text-sm outline-none focus:border-indigo-500" value={selectedWeightId} onChange={e => setSelectedWeightId(e.target.value)}>
                                            {group.map(it => <option key={it.id} value={it.id}>{it.name} — {formatNumber(getInventoryWeightKg(it))} kg</option>)}
                                        </select>
                                    )}
                                </div>

                                {/* مشخصات بار نهایی */}
                                <div className="mb-5 p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                                    <div className="text-xs font-bold text-slate-600 mb-1">مشخصات بار نهایی</div>
                                    <input className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-500" placeholder="نام" value={finalName} onChange={e => setFinalName(e.target.value)} />
                                    <div className="flex gap-2">
                                        <input className="flex-1 p-2.5 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-500" placeholder="برند" value={finalBrand} onChange={e => setFinalBrand(e.target.value)} />
                                        <input className="flex-1 p-2.5 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-500" placeholder="تگ" value={finalTag} onChange={e => setFinalTag(e.target.value)} />
                                    </div>
                                    <select className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-500" value={finalWarehouseId} onChange={e => setFinalWarehouseId(e.target.value)}>
                                        <option value="">— بدون انبار —</option>
                                        {(warehouses || []).map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                                    </select>
                                </div>
                            </>
                        )}

                        <div className="flex gap-2">
                            <button type="button" onClick={onClose} className="flex-1 py-2.5 border rounded-full text-slate-500 hover:bg-slate-50 transition">لغو</button>
                            <button type="button" onClick={handleSubmit} disabled={!canMerge} className="flex-1 py-2.5 bg-emerald-600 disabled:bg-slate-300 text-white rounded-full hover:bg-emerald-700 transition shadow-lg shadow-emerald-900/20 font-bold flex items-center justify-center gap-1.5"><GitMerge size={16}/> ادغام نهایی</button>
                        </div>
                    </div>
                </div>
            );
        };

        const AddItemForm = ({ onAdd, items, warehouses }) => {
            const [d, setD] = useState({ name: '', brand: '', tag: '', qty: '', unit: 'عدد', deductionPerBag: '', deductionUnit: 'g', bagWeight: '', bagWeightUnit: 'g', warehouseId: '' });
            const [suggestions, setSuggestions] = useState([]);
            const [showSugg, setShowSugg] = useState(false);
            const wrapRef = useRef(null);

            useEffect(() => {
                const handler = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setShowSugg(false); };
                document.addEventListener('mousedown', handler);
                return () => document.removeEventListener('mousedown', handler);
            }, []);

            const handleNameChange = (val) => {
                setD({...d, name: val});
                if (val.trim().length > 1 && items && items.length > 0) {
                    const seen = new Set();
                    const matches = items.filter(item => smartSearchMatch(item.name, val)).filter(item => {
                        const key = item.name + '|' + item.brand + '|' + item.tag;
                        if (seen.has(key)) return false;
                        seen.add(key); return true;
                    }).slice(0, 6);
                    setSuggestions(matches);
                    setShowSugg(matches.length > 0);
                } else {
                    setSuggestions([]); setShowSugg(false);
                }
            };

            const selectSugg = (item) => {
                setD({ name: item.name, brand: item.brand || '', tag: item.tag || '', qty: '', unit: item.unit || 'عدد', deductionPerBag: '', deductionUnit: 'g', bagWeight: '', bagWeightUnit: 'g', warehouseId: item.warehouseId || '' });
                setShowSugg(false);
            };

            const submit = (e) => {
                e.preventDefault();
                if (!d.name || !d.qty) return;
                // Convert to grams for uniform storage
                const deducG = d.deductionPerBag ? (d.deductionUnit === 'kg' ? Number(d.deductionPerBag) * 1000 : Number(d.deductionPerBag)) : null;
                const bagWG  = d.bagWeight      ? (d.bagWeightUnit === 'kg' ? Number(d.bagWeight) * 1000      : Number(d.bagWeight))      : null;
                onAdd(d.name, d.brand, d.tag || 'عمومی', Number(d.qty), d.unit, deducG, bagWG, d.warehouseId);
                setD({ ...d, qty: '', brand: '', tag: '', deductionPerBag: '', deductionUnit: 'g', bagWeight: '', bagWeightUnit: 'g' });
                setShowSugg(false);
            };
            return (
                <div ref={wrapRef} className="relative z-20 mb-6">
                <form onSubmit={submit} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm shrink-0">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3 mb-3">
                    <div className="md:col-span-2 relative">
                        <input className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-500" placeholder="نام کالا (مثلا: زردچوبه)" value={d.name} onChange={e => handleNameChange(e.target.value)} onFocus={() => d.name.length > 1 && suggestions.length > 0 && setShowSugg(true)} required autoComplete="off" />
                        {showSugg && suggestions.length > 0 && (
                            <div className="absolute top-full mt-1 right-0 w-full bg-white border border-slate-200 rounded-xl shadow-2xl z-50 overflow-y-auto max-h-[60vh]">
                                <div className="bg-indigo-50 px-3 py-1.5 text-[10px] text-indigo-600 font-bold border-b border-slate-100 flex items-center gap-1">
                                    <Box size={10}/> پیشنهاد از موجودی انبار
                                </div>
                                {suggestions.map(s => (
                                    <div key={s.id} onClick={() => selectSugg(s)} className="px-3 py-2.5 hover:bg-indigo-50 cursor-pointer border-b border-slate-50 last:border-0 flex justify-between items-center">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-slate-700 text-sm">{s.name}</span>
                                            <div className="flex items-center gap-1 mt-0.5">
                                                <ItemDistinguishBadges item={s}/>
                                            </div>
                                        </div>
                                        <span className="text-[9px] text-indigo-400 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">انتخاب</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="md:col-span-2"><input className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-500" placeholder="برند" value={d.brand} onChange={e => setD({...d, brand: e.target.value})} /></div>
                    <div className="md:col-span-2"><input className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-500" placeholder="تگ / وزن / مدل" value={d.tag} onChange={e => setD({...d, tag: e.target.value})} /></div>
                    <div className="md:col-span-2"><input type="number" min="0" step="any" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-base outline-none focus:border-indigo-500 text-center font-bold" placeholder="تعداد" value={d.qty} onChange={e => setD({...d, qty: e.target.value})} required /></div>
                    <div className="md:col-span-2">
                        <select className="w-full h-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-500" value={d.warehouseId} onChange={e => setD({...d, warehouseId: e.target.value})}>
                            <option value="">— بدون انبار —</option>
                            {(warehouses || []).map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                        </select>
                    </div>
                    <div className="md:col-span-2"><button className="w-full h-full bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition shadow-lg shadow-indigo-200 flex items-center justify-center gap-2"><Plus size={18}/> افزودن</button></div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 border-t border-dashed border-slate-200 pt-3">
                        <div className="flex items-start gap-2">
                            <div className="bg-amber-100 p-1.5 rounded-lg mt-5"><Info size={14} className="text-amber-600"/></div>
                            <div className="flex-1">
                                <label className="text-[10px] text-amber-700 font-bold block mb-1">کسری هر کیسه/بسته — فقط اطلاعاتی</label>
                                <div className="flex gap-1">
                                    <input type="number" min="0" step="any" className="flex-1 p-2 bg-amber-50 border border-amber-200 rounded-lg text-sm outline-none focus:border-amber-400 text-center" placeholder="مقدار" value={d.deductionPerBag} onChange={e => setD({...d, deductionPerBag: e.target.value})} />
                                    <select className="p-2 bg-amber-50 border border-amber-200 rounded-lg text-sm outline-none focus:border-amber-400 font-bold text-amber-700 cursor-pointer" value={d.deductionUnit} onChange={e => setD({...d, deductionUnit: e.target.value})}>
                                        <option value="g">گرم</option>
                                        <option value="kg">کیلوگرم</option>
                                    </select>
                                </div>
                                {d.deductionPerBag && <p className="text-[9px] text-amber-500 mt-1">= {d.deductionUnit === 'kg' ? formatNumber(Number(d.deductionPerBag) * 1000) + ' گرم' : formatNumber(Number(d.deductionPerBag)) + ' گرم'}</p>}
                            </div>
                        </div>
                        <div className="flex items-start gap-2">
                            <div className="bg-slate-100 p-1.5 rounded-lg mt-5"><Package size={14} className="text-slate-500"/></div>
                            <div className="flex-1">
                                <label className="text-[10px] text-slate-500 font-bold block mb-1">وزن کیسه / کارتن — اختیاری</label>
                                <div className="flex gap-1">
                                    <input type="number" min="0" step="any" className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-slate-400 text-center" placeholder="مقدار" value={d.bagWeight} onChange={e => setD({...d, bagWeight: e.target.value})} />
                                    <select className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-slate-400 font-bold text-slate-600 cursor-pointer" value={d.bagWeightUnit} onChange={e => setD({...d, bagWeightUnit: e.target.value})}>
                                        <option value="g">گرم</option>
                                        <option value="kg">کیلوگرم</option>
                                    </select>
                                </div>
                                {d.bagWeight && <p className="text-[9px] text-slate-400 mt-1">= {d.bagWeightUnit === 'kg' ? formatNumber(Number(d.bagWeight) * 1000) + ' گرم' : formatNumber(Number(d.bagWeight)) + ' گرم'}</p>}
                            </div>
                        </div>
                    </div>
                    {(d.deductionPerBag || d.bagWeight) && (
                        <div className="mt-2 p-2 bg-amber-50 rounded-lg border border-amber-100 text-[10px] text-amber-700 flex items-center gap-1">
                            <Info size={10}/>
                            این اطلاعات صرفاً جنبه اطلاعاتی دارند و در فاکتور به عنوان پاورقی نمایش داده می‌شوند. هیچ تأثیری در وزن یا قیمت فاکتور ندارند.
                        </div>
                    )}
                </form>
                </div>
            );
        };

        const HistoryModal = ({ item, transactions, invoices, purchases = [], processingOrders = [], consignments = [], onViewDocument, onClose }) => {
            const history = transactions.filter(t => t.itemId === item.id).sort((a, b) => b.date - a.date);
            // وزنِ واقعیِ هر تراکنش را از روی همان سندِ متصل به آن پیدا می‌کند (نه یک محاسبه‌ی جدید) — چون خودِ
            // Transaction Log فقط تعداد را ذخیره می‌کند؛ وزن واقعی همیشه روی خودِ سند (فاکتور/خرید/پردازش/امانی) هست.
            const findTxWeight = (t) => {
                if (!t.invoiceId) return null;
                const findRow = (list) => { const doc = list.find(x => x.id === t.invoiceId); if (!doc) return undefined; return (doc.items || []).find(i => (i.itemId || i.id) === item.id); };
                const invRow = findRow(invoices);
                if (invRow) return getItemEffectiveWeight(invRow);
                const pRow = findRow(purchases); if (pRow) return Number(pRow.weight) || 0;
                const poRow = findRow(processingOrders); if (poRow) return Number(poRow.weight) || 0;
                const cRow = findRow(consignments); if (cRow) return Number(cRow.weight) || 0;
                return null;
            };
            const historyWithWeight = history.map(t => ({ ...t, _weight: findTxWeight(t) }));
            const totalWeight = historyWithWeight.reduce((s, t) => s + (t._weight || 0), 0);
            const getIcon = (type) => {
                if(type==='ADD') return <Plus size={20} className="text-blue-500"/>;
                if(type==='SALE') return <ArrowUpRight size={20} className="text-emerald-500"/>;
                if(type==='UPDATE') return <Edit size={20} className="text-slate-500"/>;
                if(type==='DELETE') return <Trash2 size={20} className="text-red-500"/>;
                if(type==='PURCHASE_RECEIVE') return <ArrowDownLeft size={20} className="text-indigo-500"/>;
                if(type==='PROCESS_SEND') return <Truck size={20} className="text-amber-500"/>;
                if(type==='PROCESS_RETURN') return <RefreshCw size={20} className="text-emerald-500"/>;
                if(type==='ADJUSTMENT') return <ClipboardList size={20} className="text-teal-500"/>;
                if(type==='MAHAK_REMOVED') return <Trash2 size={20} className="text-red-500"/>;
                if(type==='CONSIGN_BORROW_IN' || type==='CONSIGN_LEND_RETURN') return <Handshake size={20} className="text-teal-500"/>;
                if(type==='CONSIGN_LEND_OUT' || type==='CONSIGN_BORROW_RETURN') return <Handshake size={20} className="text-fuchsia-500"/>;
                return <History size={20} className="text-slate-400"/>;
            };
            const getTypeLabel = (type) => {
                const map = { 'ADD': 'افزایش موجودی', 'SALE': 'فروش / خروج', 'UPDATE': 'ویرایش موجودی', 'DELETE': 'حذف کالا', 'IMPORT': 'ورود اکسل', 'ADJUSTMENT': 'اصلاح شمارش موجودی', 'MAHAK_REMOVED': 'حذف‌شده هنگام همگام‌سازی محک', 'PURCHASE_RECEIVE': 'دریافت خرید', 'PROCESS_SEND': 'ارسال به پردازش', 'PROCESS_RETURN': 'بازگشت از پردازش', 'PURCHASE_EDIT': 'ویرایش خرید', 'PURCHASE_DELETE_REVERSAL': 'حذف خرید (برگشت موجودی)', 'PROCESS_EDIT': 'ویرایش سفارش پردازش', 'PROCESS_DELETE_REVERSAL': 'حذف سفارش پردازش (برگشت موجودی)', 'CONSIGN_BORROW_IN': 'دریافت امانی', 'CONSIGN_LEND_OUT': 'ارسال امانی', 'CONSIGN_BORROW_RETURN': 'برگشت امانیِ گرفته‌شده', 'CONSIGN_LEND_RETURN': 'برگشت امانیِ داده‌شده', 'CONSIGN_DELETE_REVERSAL': 'حذف امانی (برگشت موجودی)' };
                return map[type] || 'تراکنش';
            };
            return (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
                        <div className="bg-white p-5 border-b border-slate-100 flex justify-between items-center shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0"><History size={18}/></div>
                                <div><h3 className="font-black text-xl text-slate-800">تاریخچه کالا</h3>
                                <p className="text-sm text-slate-500 mt-1 font-medium">{item.name} | {item.brand}</p>
                                {totalWeight > 0 && <p className="text-xs text-indigo-600 font-bold mt-1">جمع وزنِ قابل‌ردیابی از این تراکنش‌ها: {formatNumber(totalWeight)} کیلوگرم</p>}</div>
                            </div>
                            <button onClick={onClose} className="bg-slate-50 p-2.5 rounded-full hover:bg-red-50 hover:text-red-500 transition"><X size={20}/></button>
                        </div>
                        <div className="overflow-y-auto flex-1 bg-slate-50/50 p-4 space-y-3">
                            {historyWithWeight.length === 0 ? <div className="text-center py-10 text-slate-400">بدون تراکنش</div> : historyWithWeight.map(t => (
                                <div key={t.id} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center gap-4">
                                    <div className={`p-3 rounded-2xl shrink-0 ${t.quantity > 0 ? 'bg-blue-50' : t.quantity < 0 ? 'bg-emerald-50' : 'bg-slate-50'}`}>{getIcon(t.type)}</div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start mb-1">
                                            <span className="font-bold text-slate-700">{getTypeLabel(t.type)}</span>
                                            <span className="text-[10px] text-slate-400 font-mono" dir="ltr">{new Date(t.date).toLocaleDateString('fa-IR')} {new Date(t.date).toLocaleTimeString('fa-IR', {hour:'2-digit', minute:'2-digit'})}</span>
                                        </div>
                                        <div className="text-sm text-slate-500 flex flex-col gap-1">
                                            {t.recipient && <span className="font-medium text-slate-800">{t.type === 'SALE' ? 'مشتری:' : 'توسط:'} {t.recipient}</span>}
                                            {t.description && <span className="text-xs opacity-80">{t.description}</span>}
                                            {t.invoiceId && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const inv=invoices.find(x=>x.id===t.invoiceId);
                                                        const row=inv?{kind:'invoice',data:inv}:purchases.find(x=>x.id===t.invoiceId)?{kind:'purchase',data:purchases.find(x=>x.id===t.invoiceId)}:processingOrders.find(x=>x.id===t.invoiceId)?{kind:'processing',data:processingOrders.find(x=>x.id===t.invoiceId)}:consignments.find(x=>x.id===t.invoiceId)?{kind:'consignment',data:consignments.find(x=>x.id===t.invoiceId)}:null;
                                                        onViewDocument && onViewDocument(row);
                                                    }}
                                                    className="w-fit flex items-center gap-1 text-[11px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-200 px-2 py-1 rounded-lg hover:bg-indigo-100 transition mt-1"
                                                >
                                                    <Eye size={11}/> مشاهده سند مربوطه
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    <div className="text-center min-w-[80px] border-r border-slate-100 pr-4">
                                        <div className={`text-xl font-black mb-1 dir-ltr ${t.quantity > 0 ? 'text-blue-600' : t.quantity < 0 ? 'text-red-500' : 'text-slate-400'}`}>{t.quantity > 0 ? '+' : ''}{t.quantity}</div>
                                        {t._weight != null && t._weight > 0 && <div className="text-[10px] text-indigo-500 font-bold mb-1">{formatNumber(t._weight)} kg</div>}
                                        <div className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">موجودی: {t.currentStock}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            );
        };

        const EditItemModal = ({ item, invoices, processingOrders, purchases, warehouses, onClose, onSave }) => {
            const toast = useToast();
            const [data, setData] = useState({ ...item });
            const [modifyAmount, setModifyAmount] = useState('');
            const [changeReason, setChangeReason] = useState('');
            const [useCustomLowStock, setUseCustomLowStock] = useState(item.lowStockCustomThreshold != null && Number(item.lowStockCustomThreshold) > 0);
            const [customLowStockThreshold, setCustomLowStockThreshold] = useState(String(item.lowStockCustomThreshold || ''));
            const [customLowStockMode, setCustomLowStockMode] = useState(item.lowStockThresholdMode || 'quantity');
            // local state for unit selectors (display only, stored in grams)
            const [deducDispVal, setDeducDispVal] = useState(() => item.deductionPerBag ? String(item.deductionPerBag) : '');
            const [deducUnit, setDeducUnit]       = useState('g');
            const [bagWDispVal, setBagWDispVal]   = useState(() => item.bagWeight ? String(item.bagWeight) : '');
            const [bagWUnit, setBagWUnit]         = useState('g');

            const invoiceReserved = invoices.filter(inv => inv.status === 'pending').reduce((acc, inv) => {
                 const found = inv.items.find(i => i.itemId === item.id);
                 return acc + (found ? found.qty : 0);
            }, 0);
            const processingReservedMap = getProcessingReservedMap(processingOrders);
            const millReserved = processingReservedMap[item.id] || 0;
            const reservedCount = invoiceReserved + millReserved;
            const availableCount = data.quantity - reservedCount;
            const purchaseIncomingMap = getPurchaseIncomingMap(purchases);
            const incomingCount = purchaseIncomingMap[item.id] || 0;
            const sellableIncomingMap = getPurchaseSellableIncomingMap(purchases);
            const sellableIncomingCount = sellableIncomingMap[item.id] || 0;

            const handleSubmit = (e) => {
                e.preventDefault();
                if (data.quantity !== item.quantity && !changeReason.trim()) {
                    toast.show('لطفاً علت تغییر موجودی را بنویسید.');
                    return;
                }
                const deducG = deducDispVal ? (deducUnit === 'kg' ? Number(deducDispVal) * 1000 : Number(deducDispVal)) : null;
                const bagWG  = bagWDispVal  ? (bagWUnit === 'kg'  ? Number(bagWDispVal) * 1000  : Number(bagWDispVal))  : null;
                const customThreshold = Number(String(customLowStockThreshold).replace(/[^0-9.]/g, '')) || 0;
                const saved = { ...data,
                    ...(deducG !== null ? { deductionPerBag: deducG, deductionDate: new Date().toLocaleDateString('fa-IR') } : { deductionPerBag: null, deductionDate: null }),
                    ...(bagWG !== null ? { bagWeight: bagWG } : { bagWeight: null }),
                    lowStockCustomThreshold: useCustomLowStock && customThreshold > 0 ? customThreshold : null,
                    lowStockThresholdMode: useCustomLowStock && customThreshold > 0 ? customLowStockMode : null,
                    _changeReason: changeReason.trim()
                };
                onSave(saved); onClose();
            };
            const handleModify = (sign) => {
                const amt = parseDecimal(modifyAmount); if (!amt) return;
                // موجودی می‌تواند منفی شود (مثلاً وقتی آمار واقعی انبار منفی است)؛ دیگر جلوی این حالت گرفته نمی‌شود
                const newQty = data.quantity + (sign * amt);
                setData({ ...data, quantity: newQty }); setModifyAmount('');
            };

            const toGrams = (val, unit) => val ? (unit === 'kg' ? Number(val) * 1000 : Number(val)) : 0;
            const displayGrams = (g) => g >= 1000 ? `${g/1000} کیلوگرم` : `${g} گرم`;

            return (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-6 w-full max-w-3xl shadow-2xl animate-in zoom-in-95 max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-5"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center"><Edit3 size={18}/></div><h3 className="font-black text-lg text-slate-800">ویرایش کالا</h3></div><button type="button" onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 transition"><X size={20} className="text-slate-400 hover:text-red-500"/></button></div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="space-y-4">
                                <div><label className="text-xs text-slate-500 mb-1 block">نام کالا</label><input className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-500" value={data.name} onChange={e => setData({...data, name: e.target.value})} required /></div>
                                <div className="flex gap-2">
                                    <div className="flex-1"><label className="text-xs text-slate-500 mb-1 block">برند</label><input className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-500" value={data.brand} onChange={e => setData({...data, brand: e.target.value})} /></div>
                                    <div className="flex-1"><label className="text-xs text-slate-500 mb-1 block">تگ / مدل</label><input className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-500" value={data.tag} onChange={e => setData({...data, tag: e.target.value})} /></div>
                                </div>
                                <div>
                                    <label className="text-xs text-slate-500 mb-1 block flex items-center gap-1"><Warehouse size={12}/> انبار محل نگهداری</label>
                                    <select className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-500" value={data.warehouseId || ''} onChange={e => setData({...data, warehouseId: e.target.value})}>
                                        <option value="">— بدون انبار —</option>
                                        {(warehouses || []).map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                                    </select>
                                </div>
                                <div className="bg-orange-50 p-3 rounded-xl border border-orange-200">
                                    <div className="flex items-center justify-between gap-3 mb-2">
                                        <label className="text-xs text-orange-800 font-bold flex items-center gap-1.5"><AlertTriangle size={13}/> آستانه هشدار همین کالا</label>
                                        <label className="flex items-center gap-1.5 text-[10px] font-bold text-orange-700 cursor-pointer"><input type="checkbox" checked={useCustomLowStock} onChange={e=>setUseCustomLowStock(e.target.checked)}/> شخصی‌سازی</label>
                                    </div>
                                    {!useCustomLowStock ? <p className="text-[10px] text-orange-600 bg-white/70 rounded-lg p-2 border border-orange-100">این کالا از آستانه عمومی تنظیمات استفاده می‌کند.</p> : (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            <div><label className="text-[10px] text-orange-700 block mb-1">آستانه</label><input type="number" min="0.001" step="any" value={customLowStockThreshold} onChange={e=>setCustomLowStockThreshold(e.target.value)} className="w-full p-2.5 rounded-lg border border-orange-200 bg-white text-sm font-bold outline-none focus:border-orange-500" placeholder="مثلاً ۲۰۰۰"/></div>
                                            <div><label className="text-[10px] text-orange-700 block mb-1">مبنای هشدار</label><select value={customLowStockMode} onChange={e=>setCustomLowStockMode(e.target.value)} className="w-full p-2.5 rounded-lg border border-orange-200 bg-white text-sm font-bold outline-none"><option value="quantity">تعداد / واحد کالا ({data.unit || 'عدد'})</option><option value="weight">وزن (کیلوگرم)</option></select></div>
                                        </div>
                                    )}
                                    {useCustomLowStock && customLowStockMode==='weight' && <p className="text-[10px] text-orange-600 mt-2">مثلاً برای هشدار زیر ۲ تن، <b>۲۰۰۰ کیلوگرم</b> وارد کنید. برای کالای کیسه‌ای وزن هر کیسه باید ثبت شده باشد.</p>}
                                </div>
                                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                                    <div className="flex justify-between items-center text-sm"><span className="text-slate-500">کل موجودی فیزیکی:</span><span className="font-bold text-slate-700">{formatNumber(data.quantity)}</span></div>
                                    {invoiceReserved > 0 && <div className="flex justify-between items-center text-xs pr-2"><span className="text-amber-600 flex items-center gap-1"><Lock size={11}/> رزرو فروش:</span><span className="font-bold text-amber-700">{formatNumber(invoiceReserved)}</span></div>}
                                    {millReserved > 0 && <div className="flex justify-between items-center text-xs pr-2"><span className="text-blue-600 flex items-center gap-1"><RefreshCw size={11}/> رزرو آسیاب/پردازش:</span><span className="font-bold text-blue-700">{formatNumber(millReserved)}</span></div>}
                                    <div className="border-t border-slate-200 pt-2 flex justify-between items-center text-sm"><span className="text-emerald-600 font-bold">موجودی آزاد:</span><span className="font-black text-emerald-700 text-lg">{formatNumber(availableCount)}</span></div>
                                    {incomingCount > 0 && <div className="border-t border-dashed border-sky-200 pt-2 flex justify-between items-center text-sm"><span className="text-sky-600 font-bold flex items-center gap-1"><Truck size={12}/> خرید در راه (هنوز نرسیده):</span><span className="font-black text-sky-700">{formatNumber(incomingCount)}</span></div>}
                                    {sellableIncomingCount > 0 && <div className="flex justify-between items-center text-sm"><span className="text-teal-600 font-bold flex items-center gap-1"><Package size={12}/> از این مقدار، قابل پیش‌فروش:</span><span className="font-black text-teal-700">{formatNumber(sellableIncomingCount)}</span></div>}
                                </div>
                                <div className="bg-indigo-50 p-3 rounded-xl border border-indigo-100">
                                    <label className="text-xs text-indigo-800 font-bold mb-2 block">افزایش/کاهش موجودی</label>
                                    <div className="flex gap-2">
                                        <input type="number" step="any" className="w-full p-2 rounded-lg border border-indigo-200 text-center font-bold text-slate-700 outline-none" placeholder="تعداد" value={modifyAmount} onChange={e => setModifyAmount(e.target.value)}/>
                                        <button type="button" onClick={() => handleModify(1)} className="bg-emerald-500 text-white px-3 rounded-lg hover:bg-emerald-600 font-bold text-lg">+</button>
                                        <button type="button" onClick={() => handleModify(-1)} className="bg-red-500 text-white px-3 rounded-lg hover:bg-red-600 font-bold text-lg">-</button>
                                    </div>
                                    <p className="text-[10px] text-indigo-400 mt-1 text-center">عدد وارد شده به موجودی فعلی اضافه یا کم می‌شود.</p>
                                </div>
                                <div>
                                    <label className="text-xs text-slate-500 mb-1 block">ویرایش مستقیم کل موجودی</label>
                                    <div className="flex gap-2">
                                        <input type="number" step="any" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none font-bold text-center" value={data.quantity} onChange={e => setData({...data, quantity: parseDecimal(e.target.value)})} required />
                                        <input className="w-1/3 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none text-center" value={data.unit} onChange={e => setData({...data, unit: e.target.value})} placeholder="واحد" />
                                    </div>
                                </div>
                                {data.quantity !== item.quantity && (
                                    <div className="bg-rose-50 p-3 rounded-xl border border-rose-200">
                                        <label className="text-xs text-rose-700 font-bold mb-1.5 block flex items-center gap-1.5"><Pencil size={12}/> علت این تغییر موجودی *</label>
                                        <textarea className="w-full p-2 rounded-lg border border-rose-200 text-sm bg-white outline-none focus:border-rose-400 resize-y" rows={2} style={{minHeight: '40px'}} placeholder="مثلاً: اصلاح شمارش، کسری هنگام تحویل، ورود دستی بدون فاکتور و ..." value={changeReason} onChange={e => setChangeReason(e.target.value)} required />
                                    </div>
                                )}
                            </div>

                            {/* Deduction & Bag Weight Section */}
                            <div className="space-y-3">
                                <p className="text-xs font-bold text-slate-600 flex items-center gap-1.5"><Info size={13} className="text-amber-500"/> اطلاعات کسری و بسته‌بندی</p>

                                {/* Deduction per bag */}
                                <div>
                                    <label className="text-[10px] text-amber-700 font-bold block mb-1.5">کسری هر کیسه/بسته — فقط اطلاعاتی</label>
                                    <div className="flex gap-1.5">
                                        <input type="number" min="0" step="any" className="flex-1 p-2 bg-amber-50 border border-amber-200 rounded-lg text-sm outline-none focus:border-amber-400 text-center" placeholder="مقدار" value={deducDispVal} onChange={e => setDeducDispVal(e.target.value)} />
                                        <select className="p-2 bg-amber-50 border border-amber-200 rounded-lg text-sm outline-none font-bold text-amber-700 cursor-pointer" value={deducUnit} onChange={e => setDeducUnit(e.target.value)}>
                                            <option value="g">گرم</option>
                                            <option value="kg">کیلوگرم</option>
                                        </select>
                                    </div>
                                    {deducDispVal && <p className="text-[9px] text-amber-500 mt-1">= {formatNumber(toGrams(deducDispVal, deducUnit))} گرم ذخیره می‌شود</p>}
                                    {data.deductionPerBag && !deducDispVal && <p className="text-[9px] text-slate-400 mt-1">مقدار قبلی: {displayGrams(data.deductionPerBag)} {data.deductionDate && `(ثبت: ${data.deductionDate})`}</p>}
                                </div>

                                {/* Bag Weight */}
                                <div>
                                    <label className="text-[10px] text-slate-500 font-bold block mb-1.5">وزن کیسه / کارتن — اختیاری</label>
                                    <div className="flex gap-1.5">
                                        <input type="number" min="0" step="any" className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-slate-400 text-center" placeholder="مقدار" value={bagWDispVal} onChange={e => setBagWDispVal(e.target.value)} />
                                        <select className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none font-bold text-slate-600 cursor-pointer" value={bagWUnit} onChange={e => setBagWUnit(e.target.value)}>
                                            <option value="g">گرم</option>
                                            <option value="kg">کیلوگرم</option>
                                        </select>
                                    </div>
                                    {bagWDispVal && <p className="text-[9px] text-slate-400 mt-1">= {formatNumber(toGrams(bagWDispVal, bagWUnit))} گرم ذخیره می‌شود</p>}
                                    {data.bagWeight && !bagWDispVal && <p className="text-[9px] text-slate-400 mt-1">مقدار قبلی: {displayGrams(data.bagWeight)}</p>}
                                    {(() => {
                                        // وقتی کالا فعلاً بر مبنای کیلوگرم است (مثلاً از محک وارد شده) و الان وزن کیسه را
                                        // مشخص می‌کنی، این دکمه فقط «موجودی فعلی» را از کیلوگرم به تعداد کیسه تبدیل
                                        // می‌کند: تعداد = کیلوگرم موجود ÷ وزن هر کیسه. این کار روی خودِ موجودی الان
                                        // اثر می‌گذارد، نه روی فاکتورها/خریدهای قبلی — چون آن‌ها با وزن واقعیِ همان
                                        // لحظه ثبت شده‌اند (که ممکن است کمی با ۵۰ کیلوی فرضی فرق داشته باشد) و
                                        // تغییر عقب‌رونده‌ی آن‌ها می‌تواند حساب‌وکتاب مالیِ قبلی را به‌هم بزند.
                                        const bagWeightG = bagWDispVal ? toGrams(bagWDispVal, bagWUnit) : (data.bagWeight || 0);
                                        const isKgUnit = data.unit === 'کیلوگرم' || data.unit === 'کیلو';
                                        if (!isKgUnit || !bagWeightG) return null;
                                        const bagWeightKg = bagWeightG / 1000;
                                        const newQty = +(data.quantity / bagWeightKg).toFixed(2);
                                        return (
                                            <div className="mt-2 bg-sky-50 border border-sky-200 rounded-lg p-2">
                                                <p className="text-[9px] text-sky-700 leading-4">تبدیل به کیسه: {formatNumber(data.quantity)} کیلوگرم ÷ {formatNumber(bagWeightKg)} کیلوگرم = <b>{formatNumber(newQty)} کیسه</b>. این فقط روی موجودی فعلی اثر می‌گذارد؛ فاکتورها/خریدهای قبلی دست‌نخورده می‌مانند چون با وزن واقعی همون موقع ثبت شده‌اند.</p>
                                                <button type="button" onClick={() => { if (!changeReason.trim()) setChangeReason(`تبدیل واحد از کیلوگرم به کیسه (وزن هر کیسه ${formatNumber(bagWeightKg)} کیلو)`); setData(d => ({ ...d, quantity: newQty, unit: 'کیسه' })); }} className="mt-1.5 text-[10px] font-bold bg-sky-600 hover:bg-sky-700 text-white px-2.5 py-1 rounded-lg">تبدیل موجودی فعلی به کیسه</button>
                                            </div>
                                        );
                                    })()}
                                </div>

                                <div className="p-2 bg-amber-50 rounded-lg border border-amber-100 text-[10px] text-amber-600 flex items-start gap-1">
                                    <Info size={10} className="mt-0.5 shrink-0"/>
                                    این اطلاعات صرفاً اطلاعاتی هستند — در فاکتور پاورقی نشان داده می‌شوند و روی محاسبات تأثیر ندارند.
                                </div>
                            </div>
                        </div>
                        <button className="w-full mt-5 py-3.5 bg-indigo-600 text-white rounded-full font-bold shadow-lg shadow-indigo-900/20 hover:bg-indigo-700 transition">ذخیره نهایی</button>
                    </form>
                </div>
            );
        };

        const ManualItemModal = ({ onClose, onAdd, items }) => {
            const toast = useToast();
            const [data, setData] = useState({ name: '', qty: '', weight: '', price: '', unit: 'عدد', tag: '' });
            const [linkedItem, setLinkedItem] = useState(null);
            const [suggestions, setSuggestions] = useState([]);
            const [showSugg, setShowSugg] = useState(false);
            const handleNameChange = (val) => {
                setData({...data, name: val});
                if (linkedItem && linkedItem.name !== val) setLinkedItem(null);
                if (val.length > 1 && items && items.length) {
                    const matches = items.filter(i => smartSearchMatch(i.name, val)).slice(0, 6);
                    setSuggestions(matches);
                    setShowSugg(matches.length > 0);
                } else {
                    setSuggestions([]); setShowSugg(false);
                }
            };
            const selectSugg = (item) => {
                setLinkedItem(item);
                setData({...data, name: item.name, unit: item.unit || data.unit});
                setShowSugg(false);
            };
            const submit = (e) => {
                e.preventDefault();
                if(!data.name || !data.weight || !data.price) return toast.show('لطفا اطلاعات را کامل وارد کنید');
                onAdd(data, linkedItem);
            };
            return (
                <div className="absolute inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <form onSubmit={submit} className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in-95">
                        <div className="flex items-center justify-center gap-2.5 mb-5"><div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center"><FilePlus size={16}/></div><h3 className="font-black text-lg text-center">ثبت کالای متفرقه</h3></div>
                        <div className="space-y-3">
                            <div className="relative">
                                <input className="w-full p-2.5 border rounded-lg outline-none focus:border-indigo-500" placeholder="نام کالا" value={data.name} onChange={e=>handleNameChange(e.target.value)} onFocus={() => data.name.length > 1 && suggestions.length > 0 && setShowSugg(true)} onBlur={() => setTimeout(() => setShowSugg(false), 150)} autoComplete="off" autoFocus required />
                                {showSugg && suggestions.length > 0 && (
                                    <div className="absolute z-10 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                        {suggestions.map(s => (
                                            <button key={s.id} type="button" onClick={() => selectSugg(s)} className="w-full text-right px-3 py-2 text-sm hover:bg-indigo-50 border-b border-slate-50 last:border-0 flex justify-between items-center gap-2">
                                                <span className="font-bold text-slate-700">{s.name}</span>
                                                <ItemDistinguishBadges item={s}/>
                                            </button>
                                        ))}
                                    </div>
                                )}
                                {linkedItem ? (
                                    <p className="text-[10px] text-emerald-600 mt-1">✓ به کالای «{linkedItem.name}» در انبار متصل شد — موجودی از انبار کسر می‌شود.</p>
                                ) : (
                                    <p className="text-[10px] text-amber-500 mt-1">این ردیف کاملاً دستی است و از موجودی انبار کسر نمی‌شود. برای اتصال به انبار، از پیشنهادها انتخاب کنید.</p>
                                )}
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <input type="number" min="0" step="any" className="w-full p-2.5 border rounded-lg outline-none focus:border-indigo-500 text-center" placeholder="تعداد" value={data.qty} onChange={e=>setData({...data, qty: e.target.value})} required />
                                <input className="w-full p-2.5 border rounded-lg outline-none focus:border-indigo-500 text-center" placeholder="واحد" value={data.unit} onChange={e=>setData({...data, unit: e.target.value})} />
                                <input type="number" min="0" step="any" className="w-full p-2.5 border rounded-lg outline-none focus:border-indigo-500 text-center" placeholder="وزن کل (کیلوگرم)" value={data.weight} onChange={e=>setData({...data, weight: e.target.value})} required />
                                <FormattedInput className="w-full p-2.5 border rounded-lg outline-none focus:border-indigo-500 text-center" placeholder="فی (تومان)" value={data.price} onChange={val => setData({...data, price: val})} required={true} />
                            </div>
                            <div>
                                {/* توضیحات اختیاری این ردیف؛ برخلاف قبل، اگر خالی گذاشته شود هیچ برچسبی مثل «دستی» به‌صورت خودکار اضافه نمی‌شود */}
                                <input className="w-full p-2.5 border rounded-lg outline-none focus:border-indigo-500 text-sm" placeholder="توضیحات (اختیاری)" value={data.tag} onChange={e=>setData({...data, tag: e.target.value})} />
                            </div>
                            <div className="flex gap-2 mt-4">
                                <button type="button" onClick={onClose} className="flex-1 py-2.5 border rounded-full text-slate-500 hover:bg-slate-50 transition">لغو</button>
                                <button className="flex-1 py-2.5 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition shadow-lg shadow-indigo-900/20 font-bold">افزودن</button>
                            </div>
                        </div>
                    </form>
                </div>
            );
        };

        // پیش‌نمایش ورود اکسل: قبل از اعمال روی موجودی، برای هر ردیف نشان می‌دهد کالا جدید است یا موجود،
        // و کاربر انتخاب می‌کند: جمع بزند، جایگزین کند یا نادیده بگیرد.
        const ExcelImportPreviewModal = ({ rows: initialRows, onClose, onConfirm }) => {
            const [rows, setRows] = useState(initialRows);
            const setAction = (key, action) => setRows(prev => prev.map(r => r.key === key ? { ...r, action } : r));
            const newCount = rows.filter(r => !r.existingId).length;
            const matchCount = rows.filter(r => r.existingId).length;
            return (
                <div className="absolute inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl p-5 w-full max-w-2xl shadow-2xl max-h-[85vh] flex flex-col">
                        <div className="flex items-center justify-center gap-2.5 mb-1"><div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center"><FileSpreadsheet size={16}/></div><h3 className="font-black text-lg text-center">پیش‌نمایش ورود اکسل</h3></div>
                        <p className="text-xs text-slate-500 text-center mb-3">{rows.length} ردیف — {matchCount} مطابق با کالای موجود، {newCount} کالای جدید. قبل از اعمال روی موجودی بررسی کنید.</p>
                        <div className="overflow-y-auto flex-1 border rounded-2xl divide-y">
                            {rows.map(r => (
                                <div key={r.key} className="p-2.5 flex items-center gap-2 text-xs">
                                    <div className="flex-1 min-w-0">
                                        <div className="font-bold text-slate-700 truncate">{r.parsed.name} {r.parsed.brand ? `(${r.parsed.brand})` : ''}</div>
                                        {r.existingId ? (
                                            <div className="text-slate-500">موجودی فعلی: <b>{formatNumber(r.oldQty)}</b> ← اکسل: <b>{formatNumber(r.newQty)}</b></div>
                                        ) : (
                                            <div className="text-amber-600">کالای جدید — موجودی: <b>{formatNumber(r.newQty)}</b></div>
                                        )}
                                    </div>
                                    {r.existingId ? (
                                        <div className="flex gap-1 shrink-0">
                                            <button type="button" onClick={()=>setAction(r.key,'sum')} className={`px-2.5 py-1 rounded-full border text-[10px] font-bold transition ${r.action==='sum'?'bg-indigo-600 text-white border-indigo-600':'border-slate-200 text-slate-500'}`}>جمع کن</button>
                                            <button type="button" onClick={()=>setAction(r.key,'replace')} className={`px-2.5 py-1 rounded-full border text-[10px] font-bold transition ${r.action==='replace'?'bg-indigo-600 text-white border-indigo-600':'border-slate-200 text-slate-500'}`}>جایگزین کن</button>
                                            <button type="button" onClick={()=>setAction(r.key,'ignore')} className={`px-2.5 py-1 rounded-full border text-[10px] font-bold transition ${r.action==='ignore'?'bg-slate-600 text-white border-slate-600':'border-slate-200 text-slate-500'}`}>نادیده بگیر</button>
                                        </div>
                                    ) : (
                                        <div className="flex gap-1 shrink-0">
                                            <button type="button" onClick={()=>setAction(r.key,'add')} className={`px-2.5 py-1 rounded-full border text-[10px] font-bold transition ${r.action==='add'?'bg-emerald-600 text-white border-emerald-600':'border-slate-200 text-slate-500'}`}>اضافه کن</button>
                                            <button type="button" onClick={()=>setAction(r.key,'ignore')} className={`px-2.5 py-1 rounded-full border text-[10px] font-bold transition ${r.action==='ignore'?'bg-slate-600 text-white border-slate-600':'border-slate-200 text-slate-500'}`}>نادیده بگیر</button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                        <div className="flex gap-2 mt-4">
                            <button type="button" onClick={onClose} className="flex-1 py-2.5 border rounded-full text-slate-500 hover:bg-slate-50 transition">لغو</button>
                            <button type="button" onClick={()=>onConfirm(rows)} className="flex-1 py-2.5 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition shadow-lg shadow-indigo-900/20 font-bold">تأیید و اعمال روی موجودی</button>
                        </div>
                    </div>
                </div>
            );
        };

        // شمارش فیزیکی موجودی (Inventory Count): موجودی سیستم را در برابر شمارش/وزن واقعی نشان می‌دهد
        // و در صورت اختلاف، با ثبت علت، یک تراکنش مجزا از نوع ADJUSTMENT ایجاد می‌کند تا از تراکنش‌های
        // معمولیِ ویرایش دستی قابل تفکیک باشد.
        // معیار اصلیِ اصلاح، «تعداد» است (نه وزن) چون وزن هر کیسه ثابت نیست؛ وزن فقط به‌عنوان یک هشدارِ
        // مقایسه‌ای اختیاری نشان داده می‌شود (اگر وزن کیسه برای کالا ثبت شده باشد) تا اگر تعداد درست بود
        // ولی وزنِ واقعیِ توزین‌شده خیلی با وزنِ موردانتظار فرق داشت، کاربر متوجه بشود (مثلاً کیسه‌ای گم شده
        // یا وزن کیسه‌ها عوض شده)، بدون این‌که خودِ وزن روی محاسبه‌ی تعداد اثر بگذارد.
        const InventoryCountModal = ({ item, onClose, onConfirm }) => {
            const [counted, setCounted] = useState(String(item.quantity ?? ''));
            const [actualWeight, setActualWeight] = useState('');
            const [reason, setReason] = useState('');
            const countedNum = parseDecimal(counted);
            const diff = (Number.isFinite(countedNum) ? countedNum : 0) - (Number(item.quantity) || 0);
            const hasDiff = counted !== '' && diff !== 0;
            const bagWeightKg = Number(item.bagWeight) > 0 ? Number(item.bagWeight) / 1000 : 0;
            const expectedWeight = bagWeightKg > 0 && Number.isFinite(countedNum) ? countedNum * bagWeightKg : 0;
            const actualWeightNum = parseDecimal(actualWeight);
            const hasWeightCheck = bagWeightKg > 0 && actualWeight !== '' && Number.isFinite(actualWeightNum);
            const weightDiffPercent = hasWeightCheck && expectedWeight > 0 ? ((actualWeightNum - expectedWeight) / expectedWeight) * 100 : 0;
            const weightMismatch = hasWeightCheck && Math.abs(weightDiffPercent) >= 3; // بیش از ۳٪ اختلاف = هشدار
            const submit = (e) => {
                e.preventDefault();
                if (counted === '' || !Number.isFinite(countedNum)) return;
                if (hasDiff && !reason.trim()) return;
                onConfirm(item.id, countedNum, reason.trim() || 'شمارش موجودی — بدون اختلاف');
            };
            return (
                <div className="absolute inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <form onSubmit={submit} className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95">
                        <div className="flex items-center justify-center gap-2.5 mb-1"><div className="w-9 h-9 rounded-full bg-teal-100 text-teal-600 flex items-center justify-center"><ClipboardList size={16}/></div><h3 className="font-black text-lg text-center">شمارش موجودی</h3></div>
                        <p className="text-xs text-slate-500 text-center mb-4">{item.name} {item.brand ? `(${item.brand})` : ''}</p>
                        <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 mb-3 flex justify-between items-center text-sm">
                            <span className="text-slate-500">موجودی سیستم (تعداد):</span>
                            <span className="font-bold text-slate-700">{formatNumber(item.quantity)} {item.unit || ''}</span>
                        </div>
                        <div className="mb-3">
                            <label className="text-xs text-slate-500 mb-1 block">تعداد شمارش‌شده — معیار اصلی</label>
                            <input type="number" step="any" autoFocus className="w-full p-2.5 border rounded-lg outline-none focus:border-teal-500 text-center font-bold text-lg" value={counted} onChange={e=>setCounted(e.target.value)} required />
                        </div>
                        {hasDiff && (
                            <div className={`rounded-xl p-3 border mb-3 text-sm font-bold text-center ${diff > 0 ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-rose-50 border-rose-200 text-rose-700'}`}>
                                اختلاف تعداد: {diff > 0 ? '+' : ''}{formatNumber(diff)} {item.unit || ''}
                            </div>
                        )}
                        {bagWeightKg > 0 && (
                            <div className="mb-3 bg-sky-50 rounded-xl p-3 border border-sky-100">
                                <div className="flex justify-between items-center text-xs mb-2">
                                    <span className="text-sky-700 font-bold">وزن موردانتظار با این تعداد:</span>
                                    <span className="font-bold text-sky-800">{formatNumber(+expectedWeight.toFixed(2))} کیلو</span>
                                </div>
                                <label className="text-[10px] text-sky-600 mb-1 block">وزن واقعیِ توزین‌شده (اختیاری — فقط برای مقایسه، روی تعداد اثر ندارد)</label>
                                <input type="number" step="any" className="w-full p-2 rounded-lg border border-sky-200 text-sm outline-none focus:border-sky-400 text-center" placeholder="مثلاً ۹۸۲" value={actualWeight} onChange={e=>setActualWeight(e.target.value)} />
                                {weightMismatch && (
                                    <p className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-1.5 mt-2 flex items-start gap-1">
                                        <AlertTriangle size={11} className="mt-0.5 shrink-0"/> تعداد درست ثبت می‌شود، ولی وزن واقعی حدود {Math.abs(weightDiffPercent).toFixed(1)}٪ با وزن موردانتظار فرق دارد — شاید وزن کیسه‌ها عوض شده یا جایی کسری/گم‌شدگی دارید. این فقط هشدار است و تعداد را تغییر نمی‌دهد.
                                    </p>
                                )}
                            </div>
                        )}
                        {hasDiff && (
                            <div className="mb-3">
                                <label className="text-xs text-rose-700 font-bold mb-1 block">علت اختلاف تعداد *</label>
                                <textarea className="w-full p-2 rounded-lg border border-rose-200 text-sm bg-white outline-none focus:border-rose-400 resize-y" rows={2} placeholder="مثلاً: کسری باسکول، خطای شمارش قبلی و..." value={reason} onChange={e=>setReason(e.target.value)} required />
                            </div>
                        )}
                        <div className="flex gap-2 mt-2">
                            <button type="button" onClick={onClose} className="flex-1 py-2.5 border rounded-full text-slate-500 hover:bg-slate-50 transition">لغو</button>
                            <button className="flex-1 py-2.5 bg-teal-600 text-white rounded-full hover:bg-teal-700 transition shadow-lg shadow-teal-900/20 font-bold">ثبت شمارش</button>
                        </div>
                    </form>
                </div>
            );
        };

