//## ═══ app/11-mother-bag-stock.jsx ═══
//## موجودی کیسه‌ی مادر/کیسه‌ی خالی (EmptyBagPanel، MotherBagStockView).
//## ترتیب فایل‌ها در build.py مهم است؛ همه‌ی بخش‌ها یک scope مشترک دارند.
        // پنل کیسه‌های خالیِ آنالیز: به تفکیک نام کالا؛ «موجود» = برگشته و در انبار، «در راه برگشت» = ارسال‌شده و هنوز برنگشته
        const EmptyBagPanel = ({ orders, stock }) => {
            const pending = {};
            (orders || []).filter(o => o.status === 'sent').forEach(o => (o.emptyBagsExpected || []).forEach(b => {
                pending[b.name] = (pending[b.name] || 0) + (Number(b.qty) || 0);
            }));
            const available = {};
            (stock || []).forEach(s => { available[s.name] = (Number(s.qty) || 0); });
            const names = Array.from(new Set([...Object.keys(available), ...Object.keys(pending)]));
            if (names.length === 0) return null;
            return (
                <div className="p-4 pb-0">
                    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                        <div className="font-black text-slate-800 text-sm mb-2">کیسه‌های خالی آنالیز (به تفکیک نام کالا)</div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs text-right">
                                <thead className="text-slate-500 border-b">
                                    <tr><th className="py-1.5">کالا</th><th className="py-1.5">موجود در انبار</th><th className="py-1.5">در راه برگشت از پردازش</th></tr>
                                </thead>
                                <tbody>
                                    {names.map(n => (
                                        <tr key={n} className="border-b last:border-0">
                                            <td className="py-1.5 font-bold text-slate-700">{n}</td>
                                            <td className="py-1.5 font-black text-emerald-700">{formatNumber(available[n] || 0)}</td>
                                            <td className="py-1.5 font-black text-amber-700">{formatNumber(pending[n] || 0)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-2">«در راه» تا وقتی ثبت برگشت نشود، به «موجود» اضافه نمی‌شود.</div>
                    </div>
                </div>
            );
        };

        const MotherBagStockView = ({ settings, onSaveSettings, invoices, items, onEditInvoice }) => {
            const stock = settings?.motherBagStock || [];
            const [purchaseAmount, setPurchaseAmount] = useState({});
            const [expandedId, setExpandedId] = useState(null);

            const updateStock = (next) => onSaveSettings({ ...settings, motherBagStock: next });

            const updateRow = (id, field, value) => {
                const numericFields = ['qty', 'bagKg', 'motherKg'];
                updateStock(stock.map(r => r.id === id ? { ...r, [field]: numericFields.includes(field) ? (Number(value) || 0) : value } : r));
            };
            const addRow = () => {
                updateStock([...stock, { id: 'mbs' + Date.now(), color: 'رنگ جدید', colorHex: '#cccccc', product: '', qty: 0, bagKg: 5, motherKg: 30, descriptionEnabled: true, descriptionTemplate: DEFAULT_MOTHER_BAG_TEMPLATE }]);
            };
            const deleteRow = (id) => {
                if (!confirm('این ردیف از موجودی کیسه مادر حذف شود؟')) return;
                updateStock(stock.filter(r => r.id !== id));
            };
            const applyPurchase = (id) => {
                const amount = Number(purchaseAmount[id]) || 0;
                if (amount <= 0) return;
                updateStock(stock.map(r => r.id === id ? { ...r, qty: (Number(r.qty) || 0) + amount } : r));
                setPurchaseAmount(prev => ({ ...prev, [id]: '' }));
            };

            // رزرو کیسه‌ی مادر — دقیقاً مثل رزروِ خودِ موجودی انبار: هر ردیفِ فاکتورِ «رزرو»ی هنوز‌نرفته (qty-shippedQty)
            // که سابیده‌ی ۵ کیلویی باشد، به‌نسبت ۶ تا ۱ به رنگ/محصولِ متناظرش (از روی نام) اضافه می‌شود. برخلاف
            // پاپ‌آپِ تأییدِ لحظه‌ی ارسال (که فقط مضربِ دقیقِ ۶ را حساب می‌کند)، اینجا برای نمایشِ «رزرو شده» حتی
            // مقدارِ کسری هم حساب می‌شود، چون همان مقدار هم واقعاً سهمی از کیسه‌ی مادر را رزرو کرده.
            const reservationByStockId = useMemo(() => {
                const map = {};
                (invoices || []).filter(inv => inv.status === 'pending').forEach(inv => {
                    (inv.items || []).forEach(it => {
                        if (it.isManual) return;
                        const name = String(it.name || '');
                        // محدود به کالاهایی که کلمه‌ی «سابیده» دارند نیست — هر کالایی که در همین لیست (با هر
                        // نامی) ثبت شده، رزروش هم حساب می‌شود؛ کالاهای ثبت‌نشده اصلاً در این مجموعه شمرده نمی‌شوند.
                        const stockEntry = findMotherBagStockFor(name, stock);
                        if (!stockEntry) return;
                        const totalQty = Number(it.qty) || 0;
                        const perUnitKg = totalQty > 0 ? (Number(it.weight) || 0) / totalQty : 0;
                        if (Math.abs(perUnitKg - getMotherBagCfg(stockEntry).bagKg) > 0.05) return;
                        const remain = totalQty - (Number(it.shippedQty) || 0);
                        if (remain <= 0.0001) return;
                        const motherBagsEq = remain / getMotherBagCfg(stockEntry).perMother;
                        if (!map[stockEntry.id]) map[stockEntry.id] = { total: 0, rows: [] };
                        map[stockEntry.id].total += motherBagsEq;
                        map[stockEntry.id].rows.push({ invoice: inv, itemName: name, remainBags: remain, motherBagsEq });
                    });
                });
                return map;
            }, [invoices, stock]);

            return (
                <div className="p-4 space-y-4">
                    <div className="bg-indigo-50 border border-indigo-100 rounded-3xl p-4 text-xs text-indigo-800 leading-6">
                        هر بار که کیسه‌ی مادر خالی خریدی، همین‌جا به تفکیک رنگ تعدادش را اضافه کن. فاکتورهای «رزرو» هم همین‌جا به‌عنوان «رزرو شده» از موجودی آزاد کم می‌شوند — دقیقاً مثل رزروِ خودِ موجودی انبار. کسرِ واقعی (فیزیکی) موجودی فقط موقع «تایید نهایی/ثبت ارسال» انجام می‌شود؛ اگر موجودیِ آزاد کافی نباشد، مثل خودِ انبار هشدار کسری می‌دهد ولی جلوی ثبت را نمی‌گیرد.
                        <br/><b>نکته:</b> فیلد «محصول» هر ردیف همان کالایی است که توضیحاتِ فاکتور را کنترل می‌کند — نیازی نیست نام کالا حتماً «سابیده» داشته باشد؛ مثلاً می‌توانی «فلفل قرمز ایرانی درجه یک» را هم همین‌جا اضافه کنی تا فرمولِ «هر ۶ کیسه = ۳۰ کیلو = ۱ کیسه مادر» برایش هم در توضیحاتِ فاکتور اعمال شود. روی فیلدِ «محصول» کلیک کن تا لیستِ کالاهای موجودی انبار باز شود و از همان‌جا با جستجو انتخاب کنی — دیگر لازم نیست اسم را عیناً و حرف‌به‌حرف تایپ کنی.
                    </div>
                    <div className="flex justify-end">
                        <button onClick={addRow} className="px-4 py-2 rounded-full bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition">+ افزودن رنگ جدید</button>
                    </div>
                    <div className="grid gap-3">
                        {stock.map(r => {
                            const reservation = reservationByStockId[r.id];
                            const reserved = reservation?.total || 0;
                            const physical = Number(r.qty) || 0;
                            const free = physical - reserved;
                            const cfg = getMotherBagCfg(r);
                            const exampleText = applyMotherBagTemplate(r.descriptionTemplate, { COUNT: 10, KG: cfg.motherKg, BAGS: 10 * cfg.perMother, WEIGHT: 10 * cfg.motherKg });
                            return (
                                <MotherBagRow
                                    key={r.id}
                                    r={r}
                                    items={items}
                                    reservation={reservation}
                                    physical={physical}
                                    free={free}
                                    exampleText={exampleText}
                                    updateRow={updateRow}
                                    deleteRow={deleteRow}
                                    purchaseAmount={purchaseAmount}
                                    setPurchaseAmount={setPurchaseAmount}
                                    applyPurchase={applyPurchase}
                                    expandedId={expandedId}
                                    setExpandedId={setExpandedId}
                                    onEditInvoice={onEditInvoice}
                                />
                            );
                        })}
                        {stock.length === 0 && <div className="text-center text-sm text-slate-400 py-8">هنوز رنگی ثبت نشده — با «+ افزودن رنگ جدید» شروع کن.</div>}
                    </div>
                </div>
            );
        };

