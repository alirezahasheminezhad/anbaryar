//## ═══ app/09-mother-bag-row.jsx ═══
//## ردیف تنظیمات کیسه‌ی مادر (MotherBagRow).
//## ترتیب فایل‌ها در build.py مهم است؛ همه‌ی بخش‌ها یک scope مشترک دارند.
        // ------------------------------------------------------------------
        // موجودی کیسه‌ی مادر (خالی): هر کیسه‌ی مادر با خرید اضافه می‌شود و موقع «تایید نهایی/ثبت ارسال»ِ
        // محصولات سابیده‌ی ۵ کیلویی (وقتی تعداد کیسه مضرب ۶ باشد)، به تعداد پیش‌بینی‌شده کسر می‌شود.
        // این موجودی کاملاً جدا از موجودی اصلی کالاهاست؛ هیچ محاسبه‌ی قبلی به آن وابسته نیست.
        // ------------------------------------------------------------------
        // ردیفِ تکی‌ی موجودی کیسه مادر — به‌صورت کامپوننتِ جدا دراومده تا فیلدِ «محصول» بتونه یک
        // دراپ‌داونِ قابل‌جستجو (از روی نام‌های واقعیِ موجودی انبار) داشته باشه، بدون اینکه لازم باشه
        // کاربر اسمِ دقیقِ کالا رو حرف‌به‌حرف تایپ کنه. همون smartItemMatch که برای پیشنهادِ «افزودن کالا»
        // استفاده می‌شه اینجا هم استفاده شده تا رفتار برای کاربر آشنا و یکدست باشه.
        const MotherBagRow = ({ r, items, reservation, physical, free, exampleText, updateRow, deleteRow, purchaseAmount, setPurchaseAmount, applyPurchase, expandedId, setExpandedId, onEditInvoice }) => {
            const [showProductSugg, setShowProductSugg] = useState(false);
            const productWrapRef = useRef(null);
            const reserved = reservation?.total || 0;

            useEffect(() => {
                const handler = (e) => { if (productWrapRef.current && !productWrapRef.current.contains(e.target)) setShowProductSugg(false); };
                document.addEventListener('mousedown', handler);
                return () => document.removeEventListener('mousedown', handler);
            }, []);

            // لیستِ نام‌های یکتای کالاهای موجودی انبار؛ اگر چیزی تایپ شده باشه فیلتر می‌شه (نام/برند/تگ،
            // کلمه‌به‌کلمه)، وگرنه (روی فوکوسِ خالی) کل لیست به‌عنوانِ یک دراپ‌داونِ «باز شونده» نشون داده می‌شه.
            const productSuggestions = useMemo(() => {
                if (!items || !items.length) return [];
                const q = r.product || '';
                const seen = new Set();
                return items.filter(it => it.name && (!q.trim() || smartItemMatch(it, q))).filter(it => {
                    if (seen.has(it.name)) return false;
                    seen.add(it.name); return true;
                }).sort((a, b) => String(a.name).localeCompare(String(b.name), 'fa')).slice(0, 40);
            }, [items, r.product]);

            const selectProduct = (name) => {
                updateRow(r.id, 'product', name);
                setShowProductSugg(false);
            };

            return (
                <div className={`rounded-2xl border p-4 ${free < 0 ? 'border-red-200 bg-red-50/30' : physical <= 0 ? 'border-amber-200 bg-amber-50/20' : 'border-slate-200 bg-white'}`}>
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                        <div className="md:col-span-1 flex items-center justify-center">
                            <input type="color" value={r.colorHex || '#cccccc'} onChange={e => updateRow(r.id, 'colorHex', e.target.value)} className="w-9 h-9 rounded-lg border-none cursor-pointer" />
                        </div>
                        <div className="md:col-span-2">
                            <label className="text-[10px] text-slate-400 block mb-1">نام رنگ</label>
                            <input value={r.color || ''} onChange={e => updateRow(r.id, 'color', e.target.value)} className="w-full p-2 rounded-lg border border-slate-200 text-xs font-bold" />
                        </div>
                        <div className="md:col-span-2 relative" ref={productWrapRef}>
                            <label className="text-[10px] text-slate-400 block mb-1">محصول</label>
                            <input
                                value={r.product || ''}
                                onChange={e => { updateRow(r.id, 'product', e.target.value); setShowProductSugg(true); }}
                                onFocus={() => setShowProductSugg(true)}
                                className="w-full p-2 rounded-lg border border-slate-200 text-xs"
                                placeholder="جستجو یا انتخاب از موجودی انبار..."
                                autoComplete="off"
                            />
                            {showProductSugg && productSuggestions.length > 0 && (() => {
                                // دقیقاً همان الگوی دراپ‌داونِ «جستجوی کالا» در فروش بار: وقتی چند کالا اسم مشترک
                                // دارند (مثلاً «زردچوبه قلم» و «زردچوبه سابیده» و «زردچوبه ۲۵ کیلویی»)، بخشِ مشترکِ
                                // نام معمولی نشان داده می‌شود و فقط تکه‌ی متفاوت‌کننده با یک چیپِ رنگی برجسته می‌شود؛
                                // به‌علاوه‌ی برند/تگ/وزن کیسه (ItemDistinguishBadges) و موجودیِ فیزیکی، تا با چشم هم
                                // اشتباهِ انتخابِ تگِ غلط پیش نیاید.
                                const allNames = productSuggestions.map(x => x.name);
                                return (
                                <div className="absolute top-full mt-1 right-0 w-[26rem] max-w-[90vw] bg-white border border-slate-200 rounded-xl shadow-2xl z-50 overflow-y-auto max-h-80">
                                    <div className="bg-indigo-50 px-3 py-1.5 text-[10px] text-indigo-600 font-bold border-b border-slate-100 flex items-center gap-1 sticky top-0">
                                        <Box size={10}/> پیشنهاد از موجودی انبار — برای جلوگیری از اشتباهِ تگ، جزئیات کامل نشان داده می‌شود
                                    </div>
                                    {productSuggestions.map(it => {
                                        const { prefix, diff } = splitNameDiff(allNames, it.name);
                                        return (
                                            <div key={it.id} onClick={() => selectProduct(it.name)} className="px-3 py-2 border-b border-slate-50 last:border-0 hover:bg-indigo-50 cursor-pointer transition flex justify-between items-center gap-2">
                                                <div className="min-w-0">
                                                    <div className="font-bold text-slate-700 text-xs truncate">{prefix}{diff && <span className={`mr-1 px-1 rounded border ${stringToBadgeColor(diff)}`}>{diff}</span>}</div>
                                                    <div className="mt-0.5"><ItemDistinguishBadges item={it}/></div>
                                                </div>
                                                <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded font-bold bg-slate-100 text-slate-600">موجودی: {formatNumber(it.quantity || 0)}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                                );
                            })()}
                        </div>
                        <div className="md:col-span-1">
                            <label className="text-[10px] text-slate-400 block mb-1">فیزیکی</label>
                            <div className="font-black text-base text-slate-700">{formatNumber(physical)}</div>
                        </div>
                        <div className="md:col-span-1">
                            <label className="text-[10px] text-slate-400 block mb-1">رزرو</label>
                            <button type="button" disabled={reserved <= 0} onClick={() => setExpandedId(expandedId === r.id ? null : r.id)} className={`font-black text-base ${reserved > 0 ? 'text-amber-600 underline decoration-dotted cursor-pointer' : 'text-slate-300'}`}>{formatNumber(Math.round(reserved * 100) / 100)}</button>
                        </div>
                        <div className="md:col-span-2">
                            <label className="text-[10px] text-slate-400 block mb-1">موجودی آزاد</label>
                            <div className={`font-black text-lg ${free < 0 ? 'text-red-600' : 'text-emerald-700'}`}>{formatNumber(Math.round(free * 100) / 100)}</div>
                        </div>
                        <div className="md:col-span-2">
                            <label className="text-[10px] text-slate-400 block mb-1">ثبت خرید (+)</label>
                            <div className="flex gap-1">
                                <input type="number" min="0" step="1" value={purchaseAmount[r.id] ?? ''} onChange={e => setPurchaseAmount(prev => ({ ...prev, [r.id]: e.target.value }))} className="w-full p-2 rounded-lg border border-slate-200 text-xs text-center" placeholder="تعداد" />
                                <button onClick={() => applyPurchase(r.id)} className="px-2 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold hover:bg-emerald-100">افزودن</button>
                            </div>
                        </div>
                        <div className="md:col-span-1 flex items-center justify-center">
                            <button onClick={() => deleteRow(r.id)} className="text-rose-500 hover:text-rose-700 text-xs font-bold">حذف</button>
                        </div>
                    </div>

                    {expandedId === r.id && reservation?.rows?.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5">
                            <div className="text-[10px] text-slate-400 font-bold mb-1">بارهای رزرو که روی این رنگ حساب شده‌اند:</div>
                            {reservation.rows.map((row, i) => (
                                <div key={i} className="flex items-center justify-between gap-2 bg-amber-50/60 border border-amber-100 rounded-lg px-2.5 py-1.5 text-[11px]">
                                    <div className="min-w-0">
                                        <span className="font-bold text-slate-700">{row.invoice.customer}</span>
                                        <span className="text-slate-400"> — {row.itemName} — {formatNumber(row.remainBags)} کیسه (≈{formatNumber(Math.round(row.motherBagsEq * 100) / 100)} کیسه مادر)</span>
                                    </div>
                                    {onEditInvoice && <button onClick={() => onEditInvoice(row.invoice)} className="shrink-0 px-2 py-1 rounded-lg bg-white border border-amber-200 text-amber-700 font-bold hover:bg-amber-100">ویرایش بار</button>}
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-1 md:grid-cols-12 gap-3 items-start">
                        <div className="md:col-span-12 flex flex-wrap items-end gap-3">
                            <div><label className="text-[10px] text-slate-400 block mb-1">وزن هر کیسه ورودی (kg)</label><input type="number" min="0" step="any" value={r.bagKg ?? 5} onChange={e => updateRow(r.id, 'bagKg', e.target.value)} className="w-28 p-2 rounded-lg border border-slate-200 text-xs text-center font-bold" /></div>
                            <div><label className="text-[10px] text-slate-400 block mb-1">وزن هر کیسه مادر (kg)</label><input type="number" min="0" step="any" value={r.motherKg ?? 30} onChange={e => updateRow(r.id, 'motherKg', e.target.value)} className="w-28 p-2 rounded-lg border border-slate-200 text-xs text-center font-bold" /></div>
                            <div className="text-[10px] text-slate-500 pb-2">فرمول: هر <b>{formatNumber(getMotherBagCfg(r).perMother)}</b> کیسه = {formatNumber(getMotherBagCfg(r).motherKg)} کیلو = ۱ کیسه مادر (اگر مضرب نباشد: وزن کل ÷ {formatNumber(getMotherBagCfg(r).motherKg)})</div>
                        </div>
                        <div className="md:col-span-3 flex items-center">
                            <label className="flex items-center gap-1.5 text-[11px] text-slate-600 font-bold cursor-pointer select-none">
                                <input type="checkbox" className="accent-indigo-600" checked={r.descriptionEnabled !== false} onChange={e => updateRow(r.id, 'descriptionEnabled', e.target.checked)} />
                                معادل‌سازی در توضیحات فاکتور
                            </label>
                        </div>
                        <div className="md:col-span-12 grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                                <label className="text-[10px] text-slate-400 block mb-1">قالب سطر اول (جای‌گذاری: {'{BAGS}'} تعداد کیسه، {'{PERBAG}'} وزن هر کیسه، {'{NAME}'} نام کالا، {'{BRAND}'} برند، {'{TAG}'} مشخصه)</label>
                                <input disabled={r.descriptionEnabled === false} value={r.titleTemplate ?? DEFAULT_TITLE_TEMPLATE} onChange={e => updateRow(r.id, 'titleTemplate', e.target.value)} className="w-full p-2 rounded-lg border border-slate-200 text-xs disabled:bg-slate-100 disabled:text-slate-400" />
                                <div className="text-[10px] text-slate-400 mt-1">مثال زنده: «{applyMotherBagTemplate(r.titleTemplate, exampleVars(r), DEFAULT_TITLE_TEMPLATE)}»</div>
                            </div>
                            <div>
                                <label className="text-[10px] text-slate-400 block mb-1">قالب سطر مشخصه (جای‌گذاری: {'{TAG}'} مشخصه، {'{PERBAG}'} وزن هر کیسه)</label>
                                <input disabled={r.descriptionEnabled === false} value={r.tagTemplate ?? DEFAULT_TAG_TEMPLATE} onChange={e => updateRow(r.id, 'tagTemplate', e.target.value)} className="w-full p-2 rounded-lg border border-slate-200 text-xs disabled:bg-slate-100 disabled:text-slate-400" />
                                <div className="text-[10px] text-slate-400 mt-1">مثال زنده: «{applyMotherBagTemplate(r.tagTemplate, exampleVars(r), DEFAULT_TAG_TEMPLATE)}»</div>
                            </div>
                        </div>
                        <div className="md:col-span-12 rounded-lg bg-slate-50 border border-slate-200 p-2 text-[11px] text-slate-600 whitespace-pre-line leading-6" dir="rtl">
                            <div className="text-[10px] text-slate-400 mb-1">پیش‌نمایش نهایی توضیحات فاکتور (با داده‌ی نمونه):</div>
                            {r.descriptionEnabled === false ? 'معادل‌سازی غیرفعال است.' : (() => { const v = exampleVars(r); return [`▪️ ${applyMotherBagTemplate(r.titleTemplate, v, DEFAULT_TITLE_TEMPLATE)}`, `   ◽ وزن کل: ${v.WEIGHT} کیلوگرم`, `   ◽ برند: ${v.BRAND}`, `   ◽ ${applyMotherBagTemplate(r.tagTemplate, v, DEFAULT_TAG_TEMPLATE)}`, `   ◽ ${applyMotherBagTemplate(r.descriptionTemplate, v)}`].join('\n'); })()}
                        </div>
                        <div className="md:col-span-9">
                            <label className="text-[10px] text-slate-400 block mb-1">متن توضیحات (جای‌گذاری: {'{COUNT}'} تعداد کیسه مادر، {'{KG}'} وزن کیسه مادر، {'{BAGS}'} تعداد کیسه ورودی، {'{WEIGHT}'} وزن کل)</label>
                            <input disabled={r.descriptionEnabled === false} value={r.descriptionTemplate ?? DEFAULT_MOTHER_BAG_TEMPLATE} onChange={e => updateRow(r.id, 'descriptionTemplate', e.target.value)} className="w-full p-2 rounded-lg border border-slate-200 text-xs disabled:bg-slate-100 disabled:text-slate-400" />
                            <div className="text-[10px] text-slate-400 mt-1">مثال (برای {formatNumber(10 * getMotherBagCfg(r).perMother)} کیسه‌ی {formatNumber(getMotherBagCfg(r).bagKg)} کیلویی = {formatNumber(10 * getMotherBagCfg(r).motherKg)} کیلو): «{exampleText}»</div>
                        </div>
                    </div>
                </div>
            );
        };

