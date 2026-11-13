//## ═══ app/15-invoice-modals.jsx ═══
//## مودال جزئیات فاکتور (InvoiceDetailsModal) و تأیید ارسال (ConfirmShipmentModal).
//## ترتیب فایل‌ها در build.py مهم است؛ همه‌ی بخش‌ها یک scope مشترک دارند.
        const InvoiceDetailsModal = ({ invoice, onClose, settings, inventoryItems }) => {
            const dialogRef = useDialogA11y(onClose);
            // حالت نمایشِ «فقط باقی‌مانده»: صرفاً یک فیلترِ نمایشی برای گرفتن اسکرین‌شات/نگاهِ سریع تمیز است؛
            // هیچ داده‌ای تغییر نمی‌کند و ردیف‌هایی که کاملاً «رفته‌اند» موقتاً از این لیست پنهان می‌شوند.
            const [screenshotMode, setScreenshotMode] = useState(false);
            if (!invoice) return null;
            const isPendingInvoice = invoice.status === 'pending';
            // حتی بعد از تکمیل‌شدنِ کامل فاکتور (status: completed)، اگر روزی برایش ارسال چندمرحله‌ای ثبت شده
            // باشد، باید بشود دید که هر بخش با چه وزن/قیمتی رفته — نه فقط تا وقتی که هنوز رزرو/در انتظار است.
            const hasAnyShipmentHistory = invoice.items.some(it => it.shipments && it.shipments.length > 0);
            const remainingOf = (it) => (Number(it.qty) || 0) - (Number(it.shippedQty) || 0);
            const totalWeight = invoice.items.reduce((sum, item) => sum + getItemEffectiveWeight(item), 0);
            // Use snapshot cost if available (finalized invoices), otherwise current settings (pending)
            const effectiveCostPerTon = invoice.snapshotLoadingCostPerTon !== undefined 
                ? invoice.snapshotLoadingCostPerTon 
                : (settings || {}).loadingCostPerTon || 0;
            const s = { loadingCostPerTon: effectiveCostPerTon };
            const loadingIncrementKg = (settings || {}).loadingWeightIncrementKg ?? 1000;
            const loadingRoundUpThreshold = (settings || {}).loadingWeightRoundUpThreshold ?? 0.9;
            const loadingMinWeightKg = (settings || {}).loadingMinWeightEnabled ? ((settings || {}).loadingMinWeightKg || 0) : 0;
            const roundedWeight = roundWeightToIncrement(totalWeight, loadingIncrementKg, loadingRoundUpThreshold);
            const loadingCost = invoice.includeLoadingCost ? (invoice.loadingCostAmount || 0) : calculateLoadingCost(totalWeight, s.loadingCostPerTon, loadingIncrementKg, loadingRoundUpThreshold, loadingMinWeightKg);

            // Enrich invoice items with current inventory data for legacy invoices
            const enrichedItems = invoice.items.map(it => {
                if (it.isManual) return it;
                // If item already has deduction info, use it
                if (it.deductionPerBag || it.bagWeight) return it;
                // Otherwise look up from inventory
                const invItem = inventoryItems && inventoryItems.find(i => i.id === it.itemId);
                if (invItem && (invItem.deductionPerBag || invItem.bagWeight)) {
                    return { ...it, deductionPerBag: invItem.deductionPerBag || null, deductionDate: invItem.deductionDate || null, bagWeight: invItem.bagWeight || null, _enrichedFromInventory: true };
                }
                return it;
            });
            return (
                <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div ref={dialogRef} className="bg-white rounded-3xl max-w-[96vw] w-fit min-w-[min(900px,96vw)] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                        <div className="relative bg-gradient-to-l from-indigo-700 to-indigo-600 text-white px-6 py-5 flex justify-between items-start gap-4">
                            <div className="flex items-center gap-3"><div className="w-11 h-11 rounded-2xl bg-white/15 ring-1 ring-white/25 flex items-center justify-center"><FileText size={20}/></div><div><h3 className="font-black text-lg">جزئیات فاکتور</h3><div className="text-[11px] text-indigo-100 mt-0.5">{invoice.customer} • {invoice.date}</div></div></div>
                            <div className="flex items-center gap-3"><span className={`px-3 py-1 rounded-full text-[11px] font-black ${isPendingInvoice?'bg-amber-300 text-amber-950':invoice.status==='cancelled'?'bg-red-200 text-red-900':'bg-emerald-300 text-emerald-950'}`}>{isPendingInvoice?'رزرو / در انتظار':invoice.status==='cancelled'?'لغو شده':'تکمیل شده'}</span><button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition" aria-label="بستن"><X size={20}/></button></div>
                        </div>
                        <div className="p-5 max-h-[75vh] overflow-y-auto bg-slate-50/60">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                                {[['مشتری',invoice.customer,'text-slate-800'],['تاریخ فاکتور',invoice.date,'text-slate-800'],['مهلت تسویه',invoice.settlementTerm||'تعیین نشده','text-indigo-700'],['تاریخ ارسال',invoice.firstShipmentDate?(invoice.firstShipmentDate===invoice.lastShipmentDate?invoice.firstShipmentDate:invoice.firstShipmentDate+' تا '+invoice.lastShipmentDate):'—','text-emerald-700']].map(([k,v,c])=>(
                                    <div key={k} className="bg-white rounded-2xl border border-slate-200 px-4 py-3 shadow-sm"><div className="text-[10px] text-slate-400 font-bold">{k}</div><div className={`text-sm font-black mt-1 ${c}`}>{v}</div></div>
                                ))}
                            </div>
                            <div className="grid md:grid-cols-2 gap-3 mb-4">
                                <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm"><div className="text-[10px] text-slate-400 font-bold mb-1.5">توضیحات</div><p className="text-xs text-slate-700 leading-6">{invoice.description || '---'}</p></div>
                                {invoice.notices && invoice.notices.length > 0 && (
                                    <div className="bg-amber-50 rounded-2xl border border-amber-200 p-4"><div className="text-amber-700 font-black text-xs flex items-center gap-1 mb-1.5"><AlertTriangle size={13}/> توجه</div><ul className="text-xs text-amber-800 list-disc pr-4 space-y-0.5 leading-6">{invoice.notices.map((n, i) => <li key={i}>{n}</li>)}</ul></div>
                                )}
                            </div>
                            {isPendingInvoice && invoice.items.length > 0 && (
                                <label className="flex items-center gap-2 mb-3 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-full px-4 py-2 cursor-pointer w-fit">
                                    <input type="checkbox" className="accent-indigo-600 w-4 h-4" checked={screenshotMode} onChange={e => setScreenshotMode(e.target.checked)} />
                                    حالت اسکرین‌شات: مخفی‌کردن ردیف‌هایی که کاملاً «رفته‌اند»
                                </label>
                            )}
                            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-2 overflow-x-auto">
                            <table className="w-full text-xs text-right border-collapse">
                                <thead className="border-b-2 border-slate-800 text-slate-800 font-black"><tr><th className="p-2.5">کالا</th><th className="p-2.5 text-center">تعداد</th><th className="p-2.5 text-center">وزن (kg)</th><th className="p-2.5 text-center">قیمت</th><th className="p-2.5 text-left">کل</th>{(isPendingInvoice || hasAnyShipmentHistory) && <th className="p-2.5 text-center">وضعیت ارسال</th>}</tr></thead>
                                <tbody className="divide-y divide-slate-200">
                                    {enrichedItems.map((item, idx) => {
                                        const rItem = resolveItemDisplay(item, inventoryItems, invoice.status === 'pending').display;
                                        const shippable = isPendingInvoice;
                                        const shipped = Number(item.shippedQty) || 0;
                                        const remaining = remainingOf(item);
                                        const fullyGone = shippable && remaining <= 0.0001 && shipped > 0;
                                        if (screenshotMode && fullyGone) return null;
                                        return (
                                        <tr key={idx} className={`${fullyGone ? 'opacity-40' : ''} even:bg-slate-50/70 align-top`}>
                                            <td className="p-2.5">
                                                <ItemNameLabel it={item} inventoryItems={inventoryItems} isPending={invoice.status === 'pending'} className="font-bold text-slate-700" />
                                                <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                                                    {rItem.brand && rItem.brand !== 'متفرقه' && (
                                                        <span className="text-[9px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded border border-indigo-100 font-bold">{rItem.brand}</span>
                                                    )}
                                                    <span className="text-[9px] text-slate-400">{rItem.tag}</span>
                                                    {item.sourced && <span className="text-[9px] text-purple-700 bg-purple-50 border border-purple-200 px-1.5 py-0.5 rounded font-bold">از: {item.sourceParty || '—'}{item.sourcePrice > 0 && ` (${formatNumber(item.sourcePrice)} ت)`} · {item.sourceSettlement === 'settled' ? 'تسویه‌شده' : 'تسویه‌نشده'}</span>}
                                                </div>
                                            </td>
                                            <td className="p-2.5 text-center">{item.qty}</td>
                                            <td className="p-2.5 text-center">
                                                {item.weight}
                                                {(() => {
                                                    // فقط یک تخمینِ نمایشی و غیرمخرب: اگر کالای متناظر الان یک «وزن کیسه»
                                                    // ثبت‌شده دارد، همین وزنِ واقعیِ ثبت‌شده در همین فاکتور (که هیچ‌وقت
                                                    // دست نمی‌خورد) را بر آن تقسیم می‌کنیم تا تعداد کیسه‌ی تقریبی را نشان
                                                    // بدهیم. عدد اصلی فاکتور (qty/weight/قیمت) کاملاً دست‌نخورده می‌ماند.
                                                    const invItem = !item.isManual && inventoryItems && inventoryItems.find(i => i.id === item.itemId);
                                                    const bagWeightKg = invItem?.bagWeight > 0 ? Number(invItem.bagWeight) / 1000 : 0;
                                                    if (!bagWeightKg || !(Number(item.weight) > 0)) return null;
                                                    const estBags = Number(item.weight) / bagWeightKg;
                                                    return <div className="text-[9px] text-sky-500 mt-0.5">≈ {formatNumber(+estBags.toFixed(2))} کیسه</div>;
                                                })()}
                                            </td>
                                            <td className="p-2.5 text-center">{formatNumber(item.price)}</td>
                                            <td className="p-2.5 text-left font-bold">{formatNumber(getItemEffectiveTotal(item))}</td>
                                            {(isPendingInvoice || hasAnyShipmentHistory) && (
                                                <td className="p-2.5 text-center">
                                                    {!shippable && !(item.shipments && item.shipments.length > 0) && <span className="text-slate-300 text-[10px]">—</span>}
                                                    {shippable && (
                                                        <div className="flex flex-wrap items-center justify-center gap-1">
                                                            {fullyGone && <span className="text-[9px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded-full font-bold border border-slate-300">✓ ارسال شده</span>}
                                                            {!fullyGone && shipped > 0 && (
                                                                <>
                                                                    <span className="text-[9px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-bold border border-emerald-200">✓ رفته: {formatNumber(shipped)}</span>
                                                                    <span className="text-[9px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-bold border border-amber-200">باقی‌مانده: {formatNumber(remaining)}</span>
                                                                </>
                                                            )}
                                                            {shipped === 0 && <span className="text-[9px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-bold border border-amber-200">رزرو</span>}
                                                        </div>
                                                    )}
                                                    {item.shipments && item.shipments.length > 0 && (
                                                        <div className="mt-1 text-right space-y-0.5">
                                                            {item.shipments.map((sh, sIdx) => (
                                                                <div key={sh.id || sIdx} className="text-[9px] text-slate-400 bg-slate-50 border border-slate-100 rounded px-1.5 py-0.5">
                                                                    محموله {sIdx + 1} — {sh.date}: {formatNumber(sh.qty)} عدد، {formatNumber(sh.weight)} کیلو {sh.weightManual ? <span className="text-amber-600 font-bold">(✎ وزن دستی{sh.calculatedWeight != null ? `، به‌نسبت می‌شد ${formatNumber(sh.calculatedWeight)}` : ''})</span> : <span className="text-slate-300">(به‌نسبت)</span>}، فی {formatNumber(sh.price)} {sh.priceManual && <span className="text-amber-600 font-bold">(✎ قیمت دستی)</span>}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </td>
                                            )}
                                        </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                            </div>
                            <div className="mt-4 grid md:grid-cols-2 gap-3">
                                <div className="rounded-2xl bg-white border border-slate-200 shadow-sm px-5 py-4 flex justify-between items-center"><span className="text-xs font-bold text-slate-500">وزن کل اقلام</span><span className="text-lg font-black text-slate-800">{formatNumber(totalWeight)} <span className="text-xs font-medium text-slate-400">کیلوگرم</span></span></div>
                                <div className="rounded-2xl bg-gradient-to-l from-indigo-700 to-indigo-600 text-white shadow-md shadow-indigo-900/20 px-5 py-4 flex justify-between items-center"><span className="text-xs font-bold text-indigo-100">مبلغ کل فاکتور</span><span className="text-xl font-black">{formatNumber(invoice.totalPrice)} <span className="text-xs font-medium text-indigo-200">تومان</span></span></div>
                                {screenshotMode && <div className="md:col-span-2 text-[10px] text-amber-600">* ردیف‌های کاملاً ارسال‌شده در این نما مخفی‌اند؛ مبلغ/وزن بالا مربوط به کل فاکتور است.</div>}
                            </div>
                            {loadingCost > 0 && (
                                <div className="mt-5 pt-4 border-t-2 border-dashed border-amber-300">
                                    <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
                                        <div className="flex items-center gap-2 mb-3 text-amber-800 font-bold text-sm">
                                            <Truck size={16} className="text-amber-600"/>
                                            <span>یادداشت هزینه بارگیری</span>
                                            {invoice.includeLoadingCost ? (
                                                <span className="text-[9px] text-amber-800 bg-amber-200 px-2 py-0.5 rounded-full font-bold border border-amber-300">جزو مبلغ فاکتور محاسبه شده</span>
                                            ) : (
                                                <span className="text-[9px] text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full font-medium border border-amber-200">پاورقی – خارج از مبلغ فاکتور</span>
                                            )}
                                            {invoice.snapshotLoadingCostPerTon !== undefined && (
                                                <span className="text-[9px] text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full font-medium border border-emerald-200">نرخ ثبت‌شده در زمان صدور</span>
                                            )}
                                            {invoice.snapshotLoadingCostPerTon === undefined && invoice.status === 'pending' && (
                                                <span className="text-[9px] text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full font-medium border border-blue-200">نرخ جاری (رزرو)</span>
                                            )}
                                        </div>
                                        <div className="text-xs text-amber-800 space-y-1.5">
                                            <div className="flex justify-between"><span>وزن واقعی:</span><span className="font-bold">{formatNumber(totalWeight)} کیلوگرم</span></div>
                                            <div className="flex justify-between"><span>وزن گرد‌شده (مبنای محاسبه):</span><span className="font-bold">{formatNumber(roundedWeight)} kg = {roundedWeight / 1000} تن</span></div>
                                            <div className="flex justify-between"><span>نرخ بارگیری:</span><span className="font-bold">{formatNumber(s.loadingCostPerTon)} تومان/تن</span></div>
                                            <div className="flex justify-between items-center pt-2 mt-1 border-t border-amber-300 text-amber-900">
                                                <span className="font-bold text-sm">{invoice.includeLoadingCost ? 'هزینه بارگیری (داخل مبلغ فاکتور):' : 'هزینه بارگیری (جداگانه):'}</span>
                                                <span className="font-black text-lg">{formatNumber(loadingCost)} تومان</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        {invoice.dateManuallySet && (
                            <div className="mt-4 bg-amber-50 rounded-xl p-3 border border-amber-200 text-amber-800 text-xs font-bold space-y-0.5">
                                <div className="flex items-center gap-2"><span></span><span>این فاکتور با یک تاریخِ دستی (متفاوت از تاریخِ واقعیِ ثبت) صادر شده — محاسبات و گزارش‌ها بر همین تاریخِ دستی هستند.</span></div>
                                {invoice.realEntryTimestamp && (
                                    <div className="pr-5 text-amber-600 font-medium">تاریخِ نوشته‌شده روی سند: {invoice.date} — روزِ واقعیِ ثبت در سیستم: {formatJalali(new Date(invoice.realEntryTimestamp).toISOString(), true)}</div>
                                )}
                            </div>
                        )}
                        {invoice.dateChangeLogs && invoice.dateChangeLogs.length > 0 && (
                            <div className="mt-4 pt-4 border-t-2 border-dashed border-orange-200">
                                <div className="bg-orange-50 rounded-xl p-4 border border-orange-200">
                                    <div className="flex items-center gap-2 mb-3 text-orange-800 font-bold text-sm">
                                        <Calendar size={16} className="text-orange-600"/>
                                        <span>تاریخچه تغییر تاریخ فاکتور</span>
                                        <span className="text-[9px] text-orange-600 bg-orange-100 px-2 py-0.5 rounded-full font-medium border border-orange-200">پاورقی – ثبت تغییرات</span>
                                    </div>
                                    <div className="space-y-2">
                                        {invoice.dateChangeLogs.map((log, idx) => (
                                            <div key={idx} className="text-xs text-orange-800 bg-white rounded-lg px-3 py-2 border border-orange-100 flex items-center gap-2">
                                                <span className="text-orange-400"></span>
                                                <span>در تاریخ <strong>{log.changedAt}</strong>، تاریخ فاکتور از <strong className="text-red-600">{log.from}</strong> به <strong className="text-emerald-600">{log.to}</strong> تغییر کرد</span>
                                                {log.changedBy && <span className="text-orange-400 text-[10px]">— {log.changedBy}</span>}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                        {invoice.changeLogs && invoice.changeLogs.length > 0 && (
                            <div className="mt-4 pt-4 border-t-2 border-dashed border-violet-200">
                                <div className="bg-violet-50 rounded-xl p-4 border border-violet-200">
                                    <div className="flex items-center gap-2 mb-3 text-violet-800 font-bold text-sm">
                                        <Pencil size={16} className="text-violet-600"/>
                                        <span>تاریخچه ویرایش فاکتور و علت تغییر</span>
                                        <span className="text-[9px] text-violet-600 bg-violet-100 px-2 py-0.5 rounded-full font-medium border border-violet-200">{invoice.changeLogs.length} بار ویرایش</span>
                                    </div>
                                    <div className="space-y-2">
                                        {invoice.changeLogs.map((log, idx) => (
                                            <div key={idx} className="text-xs text-violet-800 bg-white rounded-lg px-3 py-2 border border-violet-100">
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="font-bold text-violet-500">ویرایش {idx+1}</span>
                                                    <span className="text-violet-400">{log.changedAt}</span>
                                                </div>
                                                <div className="text-slate-700">{log.reason || 'علتی ثبت نشده است'}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                        {enrichedItems.some(it => it.deductionPerBag || it.bagWeight) && (
                                <div className="mt-4 pt-4 border-t-2 border-dashed border-blue-200">
                                    <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                                        <div className="flex items-center gap-2 mb-3 text-blue-800 font-bold text-sm">
                                            <Info size={16} className="text-blue-600"/>
                                            <span>اطلاعات کسری و بسته‌بندی</span>
                                            <span className="text-[9px] text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full font-medium border border-blue-200">پاورقی – فقط جنبه اطلاعاتی</span>
                                            {enrichedItems.some(it => it._enrichedFromInventory) && (
                                                <span className="text-[9px] text-violet-700 bg-violet-100 px-2 py-0.5 rounded-full font-medium border border-violet-200">داده از انبار جاری</span>
                                            )}
                                        </div>
                                        <div className="space-y-3">
                                            {enrichedItems.filter(it => it.deductionPerBag || it.bagWeight).map((it, idx) => {
                                                const deducGrams = it.deductionPerBag && it.qty > 0 ? it.qty * it.deductionPerBag : 0;
                                                const deducKg = deducGrams / 1000;
                                                return (
                                                <div key={idx} className="text-xs text-blue-800 bg-white rounded-lg p-3 border border-blue-100 flex flex-col gap-1.5">
                                                    <span className="font-bold text-blue-900 text-sm">{it.name} {it.brand && `(${it.brand})`}</span>
                                                    {it.deductionPerBag && (
                                                        <div className="space-y-1">
                                                            <span className="flex items-center gap-1">کسری هر کیسه: <strong>{formatNumber(it.deductionPerBag)} گرم</strong> {it.deductionDate && `— ثبت شده در تاریخ ${it.deductionDate}`}</span>
                                                            {it.qty > 0 && (
                                                                <div className="bg-blue-100 rounded-lg px-3 py-2 border border-blue-200 text-blue-900">
                                                                    <div className="font-bold text-xs mb-1">محاسبه کسری کل:</div>
                                                                    <div className="font-mono text-sm">
                                                                        {it.qty} کیسه × {formatNumber(it.deductionPerBag)} گرم = {formatNumber(deducGrams)} گرم
                                                                    </div>
                                                                    <div className="font-black text-base text-blue-800 mt-1">
                                                                        معادل <span className="text-red-600">{deducKg % 1 === 0 ? deducKg : deducKg.toFixed(3)} کیلوگرم</span> کسری می‌شود
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                    {it.bagWeight && <span>وزن کیسه/کارتن: <strong>{it.bagWeight >= 1000 ? `${it.bagWeight/1000} کیلوگرم` : `${formatNumber(it.bagWeight)} گرم`}</strong></span>}
                                                    {it.deductionPerBag && <span className="text-blue-500 text-[10px]">⚠ این اطلاعات صرفاً برای مطلع ماندن شما ثبت شده و در محاسبات تأثیری ندارد.</span>}
                                                </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            );
        };

        // پاپ‌آپ «تایید نهایی / ثبت ارسال»: تنها جایی که برای یک فاکتورِ رزرو مشخص می‌شود چقدر از هر ردیف
        // واقعاً رفته، چقدر باقی می‌ماند (رزرو) یا اصلاً منصرف می‌شویم، و قیمت/وزنِ همان بخشِ رفته عوض شده یا نه.
        // اگر فاکتور سررسیدِ تسویه داشته باشد، در پایان می‌پرسد مبنای سررسید همان تاریخ فاکتور بماند یا از
        // همین امروز (تاریخِ ارسال واقعی) دوباره حساب شود.
        const ConfirmShipmentModal = ({ invoice, onClose, onSubmit, invoices, motherBagStock }) => {
            const dialogRef = useDialogA11y(onClose);
            const remainingOf = (it) => (Number(it.qty) || 0) - (Number(it.shippedQty) || 0);
            // همه‌ی ردیف‌های فاکتور (چه متصل به انبار، چه دستی/متفرقه) اگر چیزی از آن‌ها هنوز نرفته باشد،
            // همین‌جا برای تصمیم‌گیری (کامل/بخشی/لغو + تغییر وزن و قیمت همان بخش) نمایش داده می‌شوند.
            // ردیف‌هایی که قبلاً به‌طور کامل رفته‌اند، دیگر لازم نیست دوباره تصمیمی برایشان گرفته شود.
            const shippableIdx = useMemo(() => (invoice?.items || []).map((it, idx) => ({ it, idx })).filter(({ it }) => remainingOf(it) > 0.0001), [invoice]);
            const doneIdx = useMemo(() => (invoice?.items || []).map((it, idx) => ({ it, idx })).filter(({ it }) => remainingOf(it) <= 0.0001), [invoice]);

            const [modes, setModes] = useState(() => {
                const m = {}; shippableIdx.forEach(({ idx }) => { m[idx] = 'full'; }); return m;
            });
            const [qtys, setQtys] = useState(() => {
                const q = {}; shippableIdx.forEach(({ it, idx }) => { q[idx] = String(remainingOf(it)); }); return q;
            });
            const [hasChange, setHasChange] = useState({});
            const [weights, setWeights] = useState({});
            const [prices, setPrices] = useState({});
            const [priceDropReview, setPriceDropReview] = useState(null); // آرایه‌ی هشدارها، وقتی باز است
            // پیش‌بینی مصرف «کیسه مادر»: محصولات سابیده با کیسه‌های ۵ کیلویی، هر ۶ کیسه (۳۰ کیلو) داخل
            // یک کیسه‌ی مادر می‌رود. وقتی تعداد کیسه‌ی ۵ کیلویی ارسالی دقیقاً مضربی از ۶ باشد، قبل از ثبت نهایی
            // یک پاپ‌آپ تأیید نشان می‌دهیم که چند کیسه‌ی مادر پیش‌بینی می‌شود مصرف شود — فقط هشدار/تأیید است،
            // به‌خودی‌خود موجودی کیسه‌ی مادر را کم نمی‌کند (آن انباری جداگانه‌ای در این سیستم ندارد).
            const [motherBagReview, setMotherBagReview] = useState(null);

            const hasDueDate = !!invoice?.dueDate;
            const termDays = useMemo(() => {
                if (!hasDueDate) return null;
                // اگر «طول مهلت اصلی» از زمان ثبت فاکتور قفل شده باشد (فاکتورهای جدید)، همیشه همان مبنا قرار می‌گیرد
                // تا با هر بار جابه‌جا کردن سررسید بر مبنای «امروز»، مهلت هی طولانی‌تر نشود. برای فاکتورهای قدیمی‌تر
                // که این مقدار را ندارند، مثل قبل از فاصله‌ی فعلیِ سررسید تا تاریخ ثبت فاکتور محاسبه می‌شود.
                if (invoice.originalTermDays !== undefined && invoice.originalTermDays !== null) return invoice.originalTermDays;
                if (!invoice.timestamp) return null;
                const startOfDay = x => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
                const due = new Date(invoice.dueDate);
                const created = new Date(invoice.timestamp);
                if (Number.isNaN(due.getTime()) || Number.isNaN(created.getTime())) return null;
                return Math.round((startOfDay(due) - startOfDay(created)) / 86400000);
            }, [hasDueDate, invoice?.dueDate, invoice?.timestamp, invoice?.originalTermDays]);
            // مبنای سررسید تسویه: 'invoice' (بدون تغییر) | 'today' (امروز واقعی) | 'manual' (تاریخ دستی انتخابی کاربر).
            // رفع باگ: وقتی کاربر «تاریخ دستی» را انتخاب می‌کند، محاسبه‌ی سررسید باید دقیقاً از همان تاریخِ دستی
            // انجام شود، نه از تاریخ واقعی سیستم (new Date()). فقط حالت «امروز» مجاز است از new Date() استفاده کند.
            const [dueBasis, setDueBasis] = useState('invoice');
            const todayJForManualDue = useMemo(() => toJalaliInput(new Date().toISOString()), []);
            const [manualDueJY, setManualDueJY] = useState(todayJForManualDue.jy);
            const [manualDueJM, setManualDueJM] = useState(todayJForManualDue.jm);
            const [manualDueJD, setManualDueJD] = useState(todayJForManualDue.jd);
            const manualBaseIso = useMemo(() => {
                if (!manualDueJY || !manualDueJM || !manualDueJD) return null;
                return fromJalaliInput(manualDueJY, manualDueJM, manualDueJD);
            }, [manualDueJY, manualDueJM, manualDueJD]);
            const setManualDueDayClamped = (jy, jm, jd) => {
                const maxD = daysInJalaliMonth(jy, jm);
                const clamped = jd && Number(jd) > maxD ? String(maxD) : jd;
                if (clamped !== jd) setManualDueJD(clamped);
            };
            // پیش‌نمایشِ مبنای «امروز» — همیشه از new Date() واقعی حساب می‌شود، صرف‌نظر از اینکه کدام رادیو انتخاب شده،
            // فقط برای نمایش متن آن گزینه به کاربر.
            const todayPreviewDueIso = useMemo(() => {
                if (termDays === null) return null;
                const base = new Date(); base.setDate(base.getDate() + termDays); return base.toISOString();
            }, [termDays]);
            // Base Date مرکزی این پاپ‌آپ: «امروز واقعی» فقط برای dueBasis === 'today' استفاده می‌شود؛
            // برای 'manual' همیشه از تاریخ انتخابی کاربر استفاده می‌شود (calculationBaseDate = selectedManualDate)
            // و new Date() اصلاً در این مسیر فراخوانی نمی‌شود.
            const recomputedDueIso = useMemo(() => {
                if (termDays === null) return null;
                if (dueBasis === 'today') return todayPreviewDueIso;
                if (dueBasis === 'manual') {
                    if (!manualBaseIso) return null;
                    const base = new Date(manualBaseIso);
                    if (Number.isNaN(base.getTime())) return null;
                    base.setDate(base.getDate() + termDays);
                    return base.toISOString();
                }
                return null;
            }, [termDays, dueBasis, manualBaseIso, todayPreviewDueIso]);

            // همان قانونِ «قیمت پایین‌تر از قبل به همین مشتری» که هنگام ثبت فاکتور هست، اینجا هم روی
            // قیمتِ اختصاصیِ همان بخشِ ارسالی بررسی می‌شود (فقط وقتی کاربر صریحاً قیمت تازه‌ای وارد کرده باشد)
            const lastPriceFor = (itemId) => {
                if (!invoice) return null;
                const customerKey = normalizePartyName(invoice.customer).toLocaleLowerCase('fa-IR');
                if (!customerKey) return null;
                let best = null;
                (invoices || []).forEach(inv => {
                    if (inv.status !== 'completed') return;
                    if (inv.id === invoice.id) return;
                    if (normalizePartyName(inv.customer).toLocaleLowerCase('fa-IR') !== customerKey) return;
                    const found = (inv.items || []).find(it => it.itemId === itemId && Number(it.price) > 0);
                    if (!found) return;
                    if (!best || (inv.timestamp || 0) > best.timestamp) best = { price: Number(found.price), date: inv.date, timestamp: inv.timestamp || 0 };
                });
                return best;
            };

            if (!invoice) return null;
            const isShippingSomethingToday = shippableIdx.some(({ idx }) => modes[idx] !== 'cancel' && Number(qtys[idx]) > 0);
            const showDueStep = hasDueDate && termDays !== null && isShippingSomethingToday;

            const buildDecisions = () => {
                const decisions = {};
                shippableIdx.forEach(({ it, idx }) => {
                    const mode = modes[idx];
                    const remaining = remainingOf(it);
                    if (mode === 'cancel') {
                        decisions[idx] = { ship: 0, cancelRemainder: true };
                    } else {
                        const q = mode === 'partial' ? Math.min(Math.max(0, Number(qtys[idx]) || 0), remaining) : remaining;
                        const weightManual = hasChange[idx] && weights[idx] !== '' && weights[idx] !== undefined;
                        const priceManual = hasChange[idx] && prices[idx] !== '' && prices[idx] !== undefined;
                        decisions[idx] = {
                            ship: q,
                            weight: weightManual ? Number(weights[idx]) : undefined,
                            price: priceManual ? Number(prices[idx]) : undefined,
                            // پرچم‌های دستی/محاسبه‌شده: همان جواب همین چک‌باکس «وزن/قیمت این بخش فرق دارد؟» که کاربر همین‌جا می‌زند،
                            // تا در گزارش‌ها هم بماند و بعداً بشود فهمید کدام ارسال‌ها واقعاً دستی اصلاح شده‌اند.
                            weightManual, priceManual,
                        };
                    }
                });
                return decisions;
            };

            const doSubmit = (motherBagConsumptions) => {
                const decisions = buildDecisions();
                const dueOverride = showDueStep && dueBasis !== 'invoice' && recomputedDueIso ? recomputedDueIso : undefined;
                onSubmit(invoice.id, decisions, dueOverride, motherBagConsumptions);
            };

            const checkMotherBagsAndProceed = () => {
                const preds = [];
                shippableIdx.forEach(({ it, idx }) => {
                    if (modes[idx] === 'cancel') return;
                    const q = modes[idx] === 'partial' ? Math.min(Math.max(0, Number(qtys[idx]) || 0), remainingOf(it)) : remainingOf(it);
                    const pred = getMotherBagPrediction(it, q, motherBagStock);
                    if (pred) preds.push({ idx, ...pred });
                });
                if (preds.length > 0) { setMotherBagReview(preds); return; }
                doSubmit();
            };

            const confirmMotherBagsAndSubmit = () => {
                const consumptions = (motherBagReview || [])
                    .filter(p => p.stockEntry)
                    .map(p => ({ stockId: p.stockEntry.id, product: p.stockEntry.product, motherBags: p.motherBags }));
                setMotherBagReview(null);
                doSubmit(consumptions.length ? consumptions : undefined);
            };

            const submit = () => {
                const warnings = [];
                shippableIdx.forEach(({ it, idx }) => {
                    if (modes[idx] === 'cancel' || !hasChange[idx]) return;
                    const newPrice = prices[idx] !== '' && prices[idx] !== undefined ? Number(prices[idx]) : null;
                    if (newPrice === null) return;
                    const prev = lastPriceFor(it.itemId);
                    if (prev && newPrice < prev.price) warnings.push({ idx, name: it.name, newPrice, previousPrice: prev.price, previousDate: prev.date });
                });
                if (warnings.length > 0) { setPriceDropReview(warnings); return; }
                checkMotherBagsAndProceed();
            };

            return (
                <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
                    <div ref={dialogRef} className="bg-white rounded-3xl shadow-2xl max-w-[96vw] w-fit min-w-[min(1100px,96vw)] max-h-[92vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="bg-gradient-to-l from-emerald-600 to-emerald-700 text-white px-4 py-3 flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-2.5 font-black text-xs"><div className="w-7 h-7 rounded-full bg-white/15 flex items-center justify-center"><Check size={14}/></div> تایید نهایی / ثبت ارسال — {invoice.customer}</div>
                            <button onClick={onClose} className="p-1.5 rounded-full hover:bg-white/15 transition text-white/80 hover:text-white"><X size={18}/></button>
                        </div>
                        <div className="p-2.5 overflow-auto flex-1">
                            <p className="text-[10px] text-slate-500 bg-slate-50 border border-slate-200 rounded-lg p-1.5 mb-2">
                                برای هر قلم (چه از انبار، چه دستی/متفرقه): کامل رفته (پیش‌فرض) / بخشی رفته (باقی‌مانده رزرو می‌ماند) / نمی‌رود (لغو باقی‌مانده). در صورت تغییر وزن یا قیمتِ همان بخش، تیک «تغییر کرده» را بزنید تا فیلدهای وزن/فی فعال شوند.
                            </p>
                            <table className="w-full text-[11px] border-collapse">
                                <thead className="bg-slate-100 text-slate-500">
                                    <tr>
                                        <th className="p-1.5 text-right rounded-r-lg">کالا</th>
                                        <th className="p-1.5 text-center">باقی‌مانده</th>
                                        <th className="p-1.5 text-center">وضعیت</th>
                                        <th className="p-1.5 text-center">مقدار امروز</th>
                                        <th className="p-1.5 text-center">تغییر وزن/قیمت؟</th>
                                        <th className="p-1.5 text-center">وزن این بخش (Kg)</th>
                                        <th className="p-1.5 text-center rounded-l-lg">فی این بخش (تومان)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {shippableIdx.map(({ it, idx }) => {
                                        const remaining = remainingOf(it);
                                        const already = Number(it.shippedQty) || 0;
                                        const mode = modes[idx];
                                        return (
                                            <tr key={idx}>
                                                <td className="p-1.5 align-top">
                                                    <div className="font-bold text-slate-700 whitespace-nowrap">{it.name}{(it.isManual || !it.itemId) && <span className="text-[9px] text-slate-400 font-normal"> (دستی)</span>}</div>
                                                    {it.brand && it.brand !== 'متفرقه' && <div className="text-indigo-500 text-[9px]">{it.brand}</div>}
                                                    {already > 0 && <div className="text-emerald-600 text-[9px] font-bold">قبلاً رفته: {formatNumber(already)}</div>}
                                                </td>
                                                <td className="p-1.5 text-center font-bold text-slate-600 whitespace-nowrap">{formatNumber(remaining)}</td>
                                                <td className="p-1.5">
                                                    <div className="flex gap-0.5 justify-center">
                                                        {[['full', 'کامل'], ['partial', 'بخشی'], ['cancel', 'لغو']].map(([val, label]) => (
                                                            <label key={val} className={`px-2 py-0.5 rounded-full text-[9px] font-bold border cursor-pointer transition whitespace-nowrap ${mode === val ? (val === 'cancel' ? 'bg-red-600 text-white border-red-600' : 'bg-emerald-600 text-white border-emerald-600') : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>
                                                                <input type="radio" className="hidden" checked={mode === val} onChange={() => setModes(m => ({ ...m, [idx]: val }))} />
                                                                {label}
                                                            </label>
                                                        ))}
                                                    </div>
                                                </td>
                                                <td className="p-1.5 text-center">
                                                    <input type="number" disabled={mode !== 'partial'} value={mode === 'partial' ? (qtys[idx] ?? '') : (mode === 'cancel' ? 0 : remaining)} onChange={e => setQtys(q => ({ ...q, [idx]: e.target.value }))} max={remaining} min={0} className="w-14 border border-slate-300 rounded-lg px-1 py-0.5 text-[11px] text-center outline-none focus:border-indigo-500 disabled:bg-slate-50 disabled:text-slate-400" />
                                                </td>
                                                <td className="p-1.5 text-center">
                                                    <input type="checkbox" disabled={mode === 'cancel'} className="accent-indigo-600 w-4 h-4 disabled:opacity-30" checked={!!hasChange[idx]} onChange={e => setHasChange(h => ({ ...h, [idx]: e.target.checked }))} />
                                                </td>
                                                <td className="p-1.5 text-center">
                                                    <FormattedInput disabled={!hasChange[idx] || mode === 'cancel'} className="w-16 border border-slate-300 rounded-lg px-1 py-0.5 text-[11px] text-center outline-none focus:border-indigo-500 disabled:bg-slate-50 disabled:text-slate-400" value={weights[idx] ?? ''} onChange={val => setWeights(w => ({ ...w, [idx]: val }))} placeholder="به‌نسبت" />
                                                </td>
                                                <td className="p-1.5 text-center">
                                                    <FormattedInput disabled={!hasChange[idx] || mode === 'cancel'} className="w-20 border border-slate-300 rounded-lg px-1 py-0.5 text-[11px] text-center outline-none focus:border-indigo-500 disabled:bg-slate-50 disabled:text-slate-400" value={prices[idx] ?? ''} onChange={val => setPrices(p => ({ ...p, [idx]: val }))} placeholder={String(it.price)} />
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                            {doneIdx.length > 0 && (
                                <div className="text-[9px] text-slate-500 bg-emerald-50 border border-emerald-200 rounded-lg p-1.5 mt-2">
                                    <span className="font-bold text-emerald-700">✓ {doneIdx.length} ردیف قبلاً به‌طور کامل ارسال شده</span> و نیازی به تصمیم جدید ندارد: {doneIdx.map(({ it }) => it.name).join('، ')}
                                </div>
                            )}
                            {showDueStep && (
                                <div className="border-2 border-indigo-200 bg-indigo-50/60 rounded-xl p-2 mt-2">
                                    <div className="text-[11px] font-bold text-indigo-800 mb-1.5 flex items-center gap-1.5"><CalendarClock size={13}/> مبنای سررسید تسویه چی باشه؟</div>
                                    <div className="flex flex-wrap gap-1.5">
                                        <label className={`flex items-center gap-1.5 p-1.5 rounded-lg border cursor-pointer text-[11px] ${dueBasis === 'invoice' ? 'bg-white border-indigo-400 font-bold' : 'border-transparent text-slate-500'}`}>
                                            <input type="radio" checked={dueBasis === 'invoice'} onChange={() => setDueBasis('invoice')} />
                                            بدون تغییر (همان سررسید فعلی) — {formatJalali(invoice.dueDate)}
                                        </label>
                                        <label className={`flex items-center gap-1.5 p-1.5 rounded-lg border cursor-pointer text-[11px] ${dueBasis === 'today' ? 'bg-white border-indigo-400 font-bold' : 'border-transparent text-slate-500'}`}>
                                            <input type="radio" checked={dueBasis === 'today'} onChange={() => setDueBasis('today')} />
                                            مبنای امروز (تاریخ همین ارسال) + {termDays} روز مهلت اصلی — سررسید جدید: {formatJalali(todayPreviewDueIso)}
                                        </label>
                                        <label className={`flex items-center gap-1.5 p-1.5 rounded-lg border cursor-pointer text-[11px] ${dueBasis === 'manual' ? 'bg-white border-indigo-400 font-bold' : 'border-transparent text-slate-500'}`}>
                                            <input type="radio" checked={dueBasis === 'manual'} onChange={() => setDueBasis('manual')} />
                                            مبنای تاریخ دستی + {termDays} روز مهلت اصلی
                                        </label>
                                    </div>
                                    {dueBasis === 'manual' && (
                                        <div className="mt-1.5 p-1.5 rounded-lg bg-white border border-indigo-200">
                                            <div className="text-[9px] text-indigo-500 mb-1">تاریخ مبنا را انتخاب کنید — همه‌ی محاسبات سررسید دقیقاً از همین تاریخ انجام می‌شود:</div>
                                            <div className="grid grid-cols-3 gap-1" dir="rtl">
                                                <input inputMode="numeric" value={manualDueJY} onChange={e => { const v = e.target.value.replace(/\D/g, ''); setManualDueJY(v); setManualDueDayClamped(v, manualDueJM, manualDueJD); }} placeholder="سال" className="p-1 border border-indigo-200 rounded-lg text-[11px] text-center bg-white" />
                                                <select value={manualDueJM} onChange={e => { setManualDueJM(e.target.value); setManualDueDayClamped(manualDueJY, e.target.value, manualDueJD); }} className="p-1 border border-indigo-200 rounded-lg text-[11px] bg-white"><option value="">ماه</option>{Array.from({length:12},(_,i)=><option key={i+1} value={i+1}>{i+1}</option>)}</select>
                                                <select value={manualDueJD} onChange={e => setManualDueJD(e.target.value)} className="p-1 border border-indigo-200 rounded-lg text-[11px] bg-white"><option value="">روز</option>{Array.from({length:daysInJalaliMonth(manualDueJY,manualDueJM)},(_,i)=><option key={i+1} value={i+1}>{i+1}</option>)}</select>
                                            </div>
                                            {manualBaseIso && termDays !== null ? (
                                                <div className="text-[9px] text-indigo-600 font-bold mt-1">
                                                    سررسید جدید: {formatJalali(recomputedDueIso)}
                                                    <span className="text-slate-400 font-medium"> ({formatNumber(Math.abs(daysDiffFromToday(manualBaseIso)))} روز {daysDiffFromToday(manualBaseIso) >= 0 ? 'بعد از' : 'قبل از'} امروز به‌عنوان تاریخ مبنا)</span>
                                                </div>
                                            ) : (
                                                <div className="text-[9px] text-red-500 font-bold mt-1">تاریخ دستی را کامل انتخاب کنید</div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                        <div className="p-2.5 border-t border-slate-100 flex gap-2 shrink-0">
                            <button onClick={onClose} className="flex-1 py-2.5 border border-slate-200 rounded-full text-slate-600 text-sm font-bold hover:bg-slate-50 transition">انصراف</button>
                            <button onClick={submit} className="flex-1 py-2.5 bg-emerald-600 text-white rounded-full text-sm font-bold hover:bg-emerald-700 transition shadow-sm shadow-emerald-900/20">ثبت</button>
                        </div>
                    </div>
                    {priceDropReview && (
                        <DialogFrame onClose={() => setPriceDropReview(null)} closeOnBackdrop={false} backdropClassName="fixed inset-0 bg-slate-950/50 backdrop-blur-sm z-[80] flex items-center justify-center p-4" panelClassName="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-rose-200" label="هشدار کاهش قیمت">
                                <div className="bg-rose-50 border-b border-rose-200 p-4 flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center"><AlertTriangle size={22}/></div>
                                    <div><h3 className="font-black text-rose-900">قیمت پایین‌تر از خرید قبلی همین مشتری</h3><p className="text-[11px] text-rose-700 mt-0.5">برای «{invoice.customer}» این کالاها قبلاً با قیمت بالاتری فروخته شده‌اند.</p></div>
                                </div>
                                <div className="p-4 space-y-2 max-h-[50vh] overflow-y-auto">
                                    {priceDropReview.map(w => (
                                        <div key={w.idx} className="rounded-xl border border-rose-100 bg-rose-50/50 p-3 text-xs">
                                            <div className="font-bold text-slate-800 mb-1">{w.name}</div>
                                            <div className="text-slate-500">قیمت قبلی{w.previousDate ? ` (${w.previousDate})` : ''}: <strong className="text-slate-700">{formatNumber(w.previousPrice)} تومان</strong></div>
                                            <div className="text-rose-600 font-bold">قیمت واردشده الان: {formatNumber(w.newPrice)} تومان</div>
                                        </div>
                                    ))}
                                </div>
                                <div className="p-4 bg-slate-50 border-t flex gap-2">
                                    <button onClick={() => setPriceDropReview(null)} className="flex-1 py-3 rounded-xl border-2 border-slate-200 text-slate-600 font-bold hover:bg-slate-100">بازگشت و ویرایش</button>
                                    <button onClick={() => { setPriceDropReview(null); checkMotherBagsAndProceed(); }} className="flex-1 py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black">تأیید و ادامه</button>
                                </div>
                        </DialogFrame>
                    )}
                    {motherBagReview && (
                        <DialogFrame onClose={() => setMotherBagReview(null)} closeOnBackdrop={false} backdropClassName="fixed inset-0 bg-slate-950/50 backdrop-blur-sm z-[80] flex items-center justify-center p-4" panelClassName="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-amber-200" label="تأیید مصرف کیسه مادر">
                                <div className="bg-amber-50 border-b border-amber-200 p-4 flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center"><PackageOpen size={22}/></div>
                                    <div><h3 className="font-black text-amber-900">تأیید مصرف کیسه‌ی مادر</h3><p className="text-[11px] text-amber-700 mt-0.5">تعداد کیسه‌ی ۵ کیلویی این ردیف‌ها دقیقاً مضربی از ۶ (۳۰ کیلو) است؛ پیش‌بینی مصرف کیسه‌ی مادر را تأیید کنید.</p></div>
                                </div>
                                <div className="p-4 space-y-2 max-h-[50vh] overflow-y-auto">
                                    {motherBagReview.map(w => (
                                        <div key={w.idx} className={`rounded-xl border p-3 text-xs ${w.shortfall > 0 ? 'border-red-200 bg-red-50/40' : 'border-amber-100 bg-amber-50/50'}`}>
                                            <div className="font-bold text-slate-800 mb-1">{w.name}</div>
                                            <div className="text-slate-600">{formatNumber(w.bags)} کیسه‌ی ۵ کیلویی (= {formatNumber(w.totalKg)} کیلو)</div>
                                            <div className="text-amber-700 font-black mt-1">پیش‌بینی مصرف: {formatNumber(w.motherBags)} کیسه‌ی مادر</div>
                                            {w.stockEntry ? (
                                                w.shortfall > 0
                                                    ? <div className="text-red-600 font-bold mt-1 flex items-center gap-1"><AlertTriangle size={12}/> موجودی کیسه‌ی مادر «{w.stockEntry.color}» کافی نیست — موجودی فعلی: {formatNumber(w.availableQty)}، کسری: {formatNumber(w.shortfall)} (بعد از ثبت منفی می‌شود)</div>
                                                    : <div className="text-emerald-700 mt-1">موجودی کیسه‌ی مادر «{w.stockEntry.color}» بعد از این ارسال: {formatNumber(w.availableQty - w.motherBags)}</div>
                                            ) : (
                                                <div className="text-slate-400 mt-1">این محصول در لیست «موجودی کیسه مادر» ثبت نشده — کسری محاسبه نمی‌شود.</div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                                <div className="p-4 bg-slate-50 border-t flex gap-2">
                                    <button onClick={() => setMotherBagReview(null)} className="flex-1 py-3 rounded-xl border-2 border-slate-200 text-slate-600 font-bold hover:bg-slate-100">بازگشت و ویرایش</button>
                                    <button onClick={confirmMotherBagsAndSubmit} className="flex-1 py-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black">تأیید مصرف و ثبت ارسال</button>
                                </div>
                        </DialogFrame>
                    )}
                </div>
            );
        };

