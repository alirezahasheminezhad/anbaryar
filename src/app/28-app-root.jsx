//## ═══ app/28-app-root.jsx ═══
//## کامپوننت ریشه‌ی App: state سراسری، handlerهای ثبت/ویرایش/حذف و مسیریابی بین view‌ها.
//## ترتیب فایل‌ها در build.py مهم است؛ همه‌ی بخش‌ها یک scope مشترک دارند.
        const App = () => {
            const [view, setView] = useState('dashboard');
            const [items, setItems] = useState([]);
            const [invoices, setInvoices] = useState([]);
            const [notes, setNotes] = useState([]);
            const [transactions, setTransactions] = useState([]);
            const [purchases, setPurchases] = useState([]);
            const [processingOrders, setProcessingOrders] = useState([]);
            const [consignments, setConsignments] = useState([]);
            const [consignFocus, setConsignFocus] = useState(''); // نام طرفی که از «خروجی‌های در انتظار» به صفحه‌ی امانی می‌رویم تا لیست روی همان فیلتر شود
            const [lastSaved, setLastSaved] = useState(null);
            const [loading, setLoading] = useState(true);
            const [searchTerm, setSearchTerm] = useState('');
            const [editingItem, setEditingItem] = useState(null);
            const [historyItem, setHistoryItem] = useState(null);
            const [mergeItem, setMergeItem] = useState(null); // بار پایه‌ای که ادغام از کنارش شروع شده
            const [excelPreview, setExcelPreview] = useState(null); // پیش‌نمایش ورود اکسل قبل از اعمال روی موجودی
            const [countingItem, setCountingItem] = useState(null); // کالایی که در حال شمارش فیزیکی موجودی آن هستیم
            const [editingInvoice, setEditingInvoice] = useState(null);
            const [viewInvoice, setViewInvoice] = useState(null); const [viewDocument, setViewDocument] = useState(null);
            // رفتن به یک صفحه‌ی «معمولی» (نه از مسیر صریح «ویرایش فاکتور»)؛ همیشه ابتدا editingInvoice پاک می‌شود.
            // باگ مهم قبلی: چون سایدبار مستقیماً setView خام را صدا می‌زد، اگر کاربر وارد ویرایش یک فاکتور می‌شد و
            // بدون ذخیره از طریق سایدبار جای دیگری می‌رفت، editingInvoice ست‌شده باقی می‌ماند. بعد با کلیک روی
            // «فاکتور فروش (وزنی)» برای صدور یک فاکتور کاملاً جدید، در واقع بی‌خبر همان فاکتور قدیمی در حال ویرایش بود
            // و ذخیره‌ی «فاکتور جدید» به‌جای ثبت مستقل، به‌عنوان ویرایش همان فاکتور قدیمی اعمال و باعث محاسبه‌ی
            // نادرست موجودی (برگشت/کسر اشتباه) می‌شد. navigateTo تضمین می‌کند هر پیمایش عادی این حالت را ریست کند.
            const navigateTo = (v) => { setEditingInvoice(null); setView(v); };
            const [appSettings, setAppSettings] = useState(loadSettings());
            const [inventoryViewMode, setInventoryViewMode] = useState('card'); // 'card' | 'table'
            const [showSecurityCenter, setShowSecurityCenter] = useState(false);
            useEffect(()=>{
                const fn=()=>setShowSecurityCenter(true);
                window.addEventListener('anbaryar:open-security',fn);
                return ()=>window.removeEventListener('anbaryar:open-security',fn);
            },[]);
            useEffect(()=>{
                let timer=null;
                const schedule=()=>{
                    if(timer) clearTimeout(timer);
                    const configured=Number(appSettings.autoLockMinutes||0);
                    if(!configured) return;
                    const remaining=trustedUnlockRemaining();
                    const delay=remaining>0 ? remaining : configured*60000;
                    timer=setTimeout(()=>window.dispatchEvent(new Event('anbaryar:lock')), Math.max(1000, delay));
                };
                schedule();
                const fn=()=>schedule();
                window.addEventListener('anbaryar:auto-lock-changed',fn);
                window.addEventListener('anbaryar:trusted-unlock-refreshed',fn);
                return ()=>{if(timer)clearTimeout(timer);window.removeEventListener('anbaryar:auto-lock-changed',fn);window.removeEventListener('anbaryar:trusted-unlock-refreshed',fn)};
            },[appSettings.autoLockMinutes]);
            const toast = useToast();
            const confirmAction = useConfirm();

            useEffect(() => {
                let alive = true;
                (async () => {
                    const d = await loadDataSecure();
                    if (!alive) return;
                    setItems(d.items); setInvoices(d.invoices); setNotes(d.notes); setTransactions(d.transactions);
                    setPurchases(d.purchases); setProcessingOrders(d.processingOrders); setConsignments(d.consignments);
                    setLoading(false);
                })();
                return () => { alive = false; };
            }, []);


            useEffect(() => {
                if(!loading) {
                    saveData(items, invoices, notes, transactions, purchases, processingOrders, consignments);
                    setLastSaved(new Date());
                }
            }, [items, invoices, notes, transactions, purchases, processingOrders, consignments, loading]);

            const logTransaction = (item, type, quantity, newStock, invoiceId, recipient, desc, txId) => {
                const id = txId || generateId();
                const newTx = { id, itemId: item.id, itemName: item.name, type, quantity, currentStock: newStock, date: Date.now(), invoiceId, recipient, description: desc };
                setTransactions(prev => [newTx, ...prev]);
                return id;
            };

            // افزودن یک دسته کالا به انبار (خرید دریافت‌شده / بازگشت از پردازش) - کالای موجود را افزایش می‌دهد یا کالای جدید می‌سازد
            const addItemsToInventory = (baseItems, incomingItems, refId, refName, txType, note, meta) => {
                const newItems = [...baseItems];
                // meta (اختیاری): از یک خرید/بار می‌آید — منبع (خرید/آسیاب)، انبار مقصد، وزن کیسه و کسری هر کیسه
                // این‌ها روی کالای موجود/جدید هم اعمال می‌شوند تا اطلاعات آخرین محموله همراه کالا ثبت بماند
                const metaFields = meta ? {
                    ...(meta.warehouseId ? { warehouseId: meta.warehouseId } : {}),
                    ...(meta.bagWeight != null ? { bagWeight: meta.bagWeight } : {}),
                    ...(meta.deductionPerBag != null ? { deductionPerBag: meta.deductionPerBag } : {}),
                    ...(meta.source ? { lastSource: meta.source } : {}),
                } : {};
                incomingItems.forEach(c => {
                    let idx = c.itemId ? newItems.findIndex(i => i.id === c.itemId) : -1;
                    if (idx === -1) idx = newItems.findIndex(i => i.name === c.name && i.brand === (c.brand || '') && i.tag === (c.tag || ''));
                    if (idx > -1) {
                        const newStock = newItems[idx].quantity + c.qty;
                        logTransaction(newItems[idx], txType, c.qty, newStock, refId, refName, note);
                        newItems[idx] = { ...newItems[idx], ...metaFields, quantity: newStock, lastUpdated: Date.now() };
                    } else {
                        const newItem = { id: generateId(), name: c.name, brand: c.brand || '', tag: c.tag || 'عمومی', quantity: c.qty, unit: c.unit || 'عدد', lastUpdated: Date.now(), ...metaFields };
                        logTransaction(newItem, txType, c.qty, c.qty, refId, refName, note);
                        newItems.unshift(newItem);
                    }
                });
                return newItems;
            };

            // کسر یک دسته کالا از انبار (ارسال به پردازش)
            const deductItemsFromInventory = (baseItems, outgoingItems, refId, refName, txType, note) => {
                const newItems = [...baseItems];
                outgoingItems.forEach(c => {
                    const idx = newItems.findIndex(i => i.id === c.itemId);
                    if (idx > -1) {
                        const newStock = newItems[idx].quantity - c.qty;
                        logTransaction(newItems[idx], txType, -c.qty, newStock, refId, refName, note);
                        newItems[idx] = { ...newItems[idx], quantity: newStock, lastUpdated: Date.now() };
                    }
                });
                return newItems;
            };

            // برگرداندن اقلامی که قبلاً به انبار اضافه شده بودند (برای لغو/حذف یک خرید دریافت‌شده یا یک بازگشت از پردازش)
            // برخلاف deductItemsFromInventory، اینجا اگر itemId نبود (کالای دستیِ خریدِ خارج از انبار) از روی نام/برند/تگ هم پیدا می‌شود
            const reverseItemsFromInventory = (baseItems, addedItems, refId, refName, txType, note) => {
                const newItems = [...baseItems];
                addedItems.forEach(c => {
                    let idx = c.itemId ? newItems.findIndex(i => i.id === c.itemId) : -1;
                    if (idx === -1) idx = newItems.findIndex(i => i.name === c.name && i.brand === (c.brand || '') && i.tag === (c.tag || ''));
                    if (idx > -1) {
                        const newStock = newItems[idx].quantity - c.qty;
                        logTransaction(newItems[idx], txType, -c.qty, newStock, refId, refName, note);
                        newItems[idx] = { ...newItems[idx], quantity: newStock, lastUpdated: Date.now() };
                    }
                });
                return newItems;
            };

            // --- خرید و کالای در راه ---
            const handleAddPurchase = (p) => {
                if (p.status === 'received') {
                    setItems(prev => addItemsToInventory(prev, p.items, p.id, p.supplier, 'PURCHASE_RECEIVE', 'خرید و دریافت فوری', p));
                    setPurchases(prev => [{ ...p, receivedDate: new Date().toLocaleDateString('fa-IR') }, ...prev]);
                } else {
                    setPurchases(prev => [p, ...prev]);
                }
            };
            const handleReceivePurchase = (id) => {
                const p = purchases.find(x => x.id === id);
                if (!p) return;
                // محافظ ضد تکرار: اگر این خرید قبلاً دریافت شده (مثلاً به‌خاطر کلیک دوباره یا اجرای همزمان از دو تب)،
                // دوباره به موجودی اضافه نشود؛ چون هر خرید فقط یک‌بار مجاز است «دریافت» شود.
                if (p.status === 'received') return;
                setItems(prev => addItemsToInventory(prev, p.items, p.id, p.supplier, 'PURCHASE_RECEIVE', 'دریافت خرید (در راه)', p));
                setPurchases(prev => prev.map(x => x.id === id ? { ...x, status: 'received', receivedDate: new Date().toLocaleDateString('fa-IR') } : x));
            };
            const handleCancelPurchase = async (id) => {
                const p = purchases.find(x => x.id === id);
                if (!p) return;
                if (p.status === 'received') { toast.show('خریدهای دریافت‌شده قابل لغو نیستند.'); return; }
                if (await confirmAction('لغو این خرید؟')) setPurchases(prev => prev.filter(x => x.id !== id));
            };
            // ویرایش خرید: اگر هنوز «در راه» است (وارد انبار نشده)، آزادانه قابل ویرایش (اقلام هم)؛
            // اگر «دریافت‌شده» است، فقط فروشنده/تاریخ/توضیحات قابل ویرایش‌اند تا موجودی به‌هم نریزد (خودِ EditPurchaseModal این محدودیت را اعمال می‌کند)
            const handleEditPurchase = (updated) => {
                const old = purchases.find(x => x.id === updated.id);
                if (!old) return;
                if (old.status === 'received') {
                    // اقلام دست‌نخورده می‌ماند (توسط مودال قفل شده)، فقط متادیتا ذخیره می‌شود
                    setPurchases(prev => prev.map(x => x.id === updated.id ? { ...x, supplier: updated.supplier, date: updated.date, description: updated.description } : x));
                } else {
                    setPurchases(prev => prev.map(x => x.id === updated.id ? { ...updated } : x));
                }
            };
            // حذف خرید: اگر قبلاً دریافت شده و وارد انبار شده، همان مقدار از انبار کم می‌شود تا موجودی درست بماند
            const handleDeletePurchase = async (id) => {
                const p = purchases.find(x => x.id === id);
                if (!p) return;
                if (p.status === 'received') {
                    if (!(await confirmAction(`این خرید قبلاً دریافت و وارد انبار شده است. با حذف آن، همان مقدار از موجودی انبار کم می‌شود. ادامه می‌دهید؟`))) return;
                    setItems(prev => reverseItemsFromInventory(prev, p.items, p.id, p.supplier, 'PURCHASE_DELETE_REVERSAL', 'حذف خرید دریافت‌شده (برگشت موجودی)'));
                } else {
                    if (!(await confirmAction('این خرید حذف شود؟'))) return;
                }
                setPurchases(prev => prev.filter(x => x.id !== id));
            };
            // تسویه (پرداخت) یک یا چند خرید به‌صورت هم‌زمان — برای «تسویه گروهی» در لیست خریدها
            const handleSettlePurchase = (ids, status) => {
                const idSet = new Set(ids);
                setPurchases(prev => prev.map(x => idSet.has(x.id) ? { ...x, paymentStatus: status, settledDate: status === 'settled' ? new Date().toLocaleDateString('fa-IR') : undefined } : x));
            };
            // تسویه فاکتور فروش با مشتری — برای گزارش تطبیق خرید/فروش هر طرف‌حساب
            const handleSettleInvoice = (ids, status) => {
                const idSet = new Set(ids);
                setInvoices(prev => prev.map(x => idSet.has(x.id) ? { ...x, paymentStatus: status, settledDate: status === 'settled' ? new Date().toLocaleDateString('fa-IR') : undefined } : x));
            };

            // --- آنالیز / پردازش ---
            // کیسه‌های خالیِ هر کالا: با ارسال بار به پردازش، همان تعداد کیسه‌ی همان نام (بدون رنگ و بدون کیسه‌ی مادر) خالی می‌شود
            // و باید برگردد. این تعداد فقط «در انتظار برگشت» است و تا وقتی برگشتنش ثبت نشده، به موجودی اضافه نمی‌شود.
            const computeExpectedEmptyBags = (orderItems) => {
                const map = {};
                (orderItems || []).forEach(it => {
                    const name = String(it.name || '').trim();
                    const qty = Number(it.qty) || 0;
                    if (!name || qty <= 0) return;
                    if (!map[name]) map[name] = { name, unit: it.unit || 'کیسه', qty: 0 };
                    map[name].qty += qty;
                });
                return Object.values(map);
            };
            const handleAddProcessing = (o) => {
                if (o.status === 'sent') {
                    setItems(prev => deductItemsFromInventory(prev, o.items, o.id, o.recipient, 'PROCESS_SEND', 'ارسال به پردازش (آنالیز)'));
                    setProcessingOrders(prev => [{ ...o, sentDate: new Date().toLocaleDateString('fa-IR'), emptyBagsExpected: computeExpectedEmptyBags(o.items) }, ...prev]);
                } else {
                    setProcessingOrders(prev => [o, ...prev]);
                }
            };
            const handleSendProcessing = (id) => {
                const o = processingOrders.find(x => x.id === id);
                if (!o) return;
                // محافظ ضد تکرار: مثل دریافت خرید، این سفارش نباید دوباره ارسال (و دوباره از انبار کسر) شود
                if (o.status !== 'reserved') return;
                setItems(prev => deductItemsFromInventory(prev, o.items, o.id, o.recipient, 'PROCESS_SEND', 'ارسال به پردازش (آنالیز)'));
                setProcessingOrders(prev => prev.map(x => x.id === id ? { ...x, status: 'sent', sentDate: new Date().toLocaleDateString('fa-IR'), emptyBagsExpected: computeExpectedEmptyBags(o.items) } : x));
            };
            const handleCancelProcessing = async (id) => {
                const o = processingOrders.find(x => x.id === id);
                if (!o) return;
                if (o.status !== 'reserved') { toast.show('فقط سفارش‌های رزروشده (هنوز ارسال‌نشده) قابل لغو هستند.'); return; }
                if (await confirmAction('لغو این سفارش پردازش؟')) setProcessingOrders(prev => prev.filter(x => x.id !== id));
            };
            const handleReturnProcessing = (id, returnedItems, bagsReturned) => {
                const o = processingOrders.find(x => x.id === id);
                if (!o) return;
                setItems(prev => addItemsToInventory(prev, returnedItems, o.id, o.recipient, 'PROCESS_RETURN', 'بازگشت از پردازش (آنالیز)'));
                setProcessingOrders(prev => prev.map(x => x.id === id ? { ...x, status: 'returned', returnedItems, returnedDate: new Date().toLocaleDateString('fa-IR'), emptyBagsReturned: Array.isArray(bagsReturned) ? bagsReturned : [] } : x));
                // کیسه‌های خالیِ برگشتیِ هر نام به موجودی کیسه‌های خالیِ همان نام اضافه می‌شود
                if (Array.isArray(bagsReturned) && bagsReturned.length) {
                    const next = [...(appSettings.emptyBagStock || [])];
                    bagsReturned.forEach(b => {
                        const i = next.findIndex(x => x.name === b.name);
                        if (i >= 0) next[i] = { ...next[i], qty: (Number(next[i].qty) || 0) + (Number(b.qty) || 0) };
                        else next.push({ name: b.name, qty: Number(b.qty) || 0 });
                    });
                    const mergedSettings = { ...appSettings, emptyBagStock: next };
                    setAppSettings(mergedSettings);
                    saveSettings(mergedSettings);
                }
            };
            // ویرایش سفارش پردازش: اگر هنوز «رزرو» است (از انبار کسر نشده)، آزادانه قابل ویرایش؛
            // اگر ارسال/برگشت شده، فقط مقصد/تاریخ/توضیحات قابل ویرایش‌اند (مودال این را اعمال می‌کند)
            const handleEditProcessing = (updated) => {
                const old = processingOrders.find(x => x.id === updated.id);
                if (!old) return;
                if (old.status !== 'reserved') {
                    setProcessingOrders(prev => prev.map(x => x.id === updated.id ? { ...x, recipient: updated.recipient, date: updated.date, description: updated.description } : x));
                } else {
                    setProcessingOrders(prev => prev.map(x => x.id === updated.id ? { ...updated } : x));
                }
            };
            // حذف سفارش پردازش: بسته به وضعیت، اثرات آن روی انبار به‌طور کامل برگردانده می‌شود
            const handleDeleteProcessing = async (id) => {
                const o = processingOrders.find(x => x.id === id);
                if (!o) return;
                if (o.status === 'reserved') {
                    if (!(await confirmAction('این سفارش حذف شود؟'))) return;
                } else if (o.status === 'sent') {
                    if (!(await confirmAction('این سفارش قبلاً ارسال و از انبار کسر شده است. با حذف آن، همان مقدار به موجودی انبار برمی‌گردد. ادامه می‌دهید؟'))) return;
                    setItems(prev => addItemsToInventory(prev, o.items, o.id, o.recipient, 'PROCESS_DELETE_REVERSAL', 'حذف سفارش ارسال‌شده (برگشت موجودی مواد اولیه)'));
                } else if (o.status === 'returned') {
                    if (!(await confirmAction('این سفارش قبلاً ارسال و بازگشت داده شده است. با حذف آن، محصولِ بازگشتی از انبار کم و موادِ اولیه ارسالی به انبار برمی‌گردد. ادامه می‌دهید؟'))) return;
                    setItems(prev => {
                        let next = reverseItemsFromInventory(prev, o.returnedItems || [], o.id, o.recipient, 'PROCESS_DELETE_REVERSAL', 'حذف سفارش برگشته (کسر محصول بازگشتی)');
                        next = addItemsToInventory(next, o.items, o.id, o.recipient, 'PROCESS_DELETE_REVERSAL', 'حذف سفارش برگشته (برگشت مواد اولیه)');
                        return next;
                    });
                    // کیسه‌های خالیِ برگشت‌خورده‌ی این سفارش هم از موجودی کیسه‌های خالیِ همان نام کم می‌شوند
                    if (Array.isArray(o.emptyBagsReturned) && o.emptyBagsReturned.length) {
                        const next = [...(appSettings.emptyBagStock || [])];
                        o.emptyBagsReturned.forEach(b => {
                            const i = next.findIndex(x => x.name === b.name);
                            if (i >= 0) next[i] = { ...next[i], qty: (Number(next[i].qty) || 0) - (Number(b.qty) || 0) };
                        });
                        const mergedSettings = { ...appSettings, emptyBagStock: next };
                        setAppSettings(mergedSettings);
                        saveSettings(mergedSettings);
                    }
                }
                setProcessingOrders(prev => prev.filter(x => x.id !== id));
            };

            const handleMergeProcessing = async (ids) => {
                const uniqueIds=[...new Set(ids||[])]; if(uniqueIds.length<2) return;
                const selected=processingOrders.filter(o=>uniqueIds.includes(o.id)); if(selected.length!==uniqueIds.length) return;
                const first=selected[0];
                const sameRecipient=selected.every(o=>String(o.recipient||'').trim().toLocaleLowerCase('fa-IR')===String(first.recipient||'').trim().toLocaleLowerCase('fa-IR'));
                const sameStatus=selected.every(o=>o.status===first.status);
                if(!sameRecipient || !sameStatus){ toast.show('فقط آنالیزهای هم‌مقصد و هم‌وضعیت قابل ادغام هستند.'); return; }
                if(!(await confirmAction(`این ${selected.length} سند آنالیز با هم ادغام شوند؟ موجودی انبار دوباره تغییر نمی‌کند.`))) return;
                const mergeItems=(rows)=>{ const map=new Map(); (rows||[]).forEach(it=>{ const k=it.itemId||`${it.name}|${it.brand||''}|${it.tag||''}`; const old=map.get(k); if(!old) map.set(k,{...it,qty:Number(it.qty)||0,weight:Number(it.weight)||0}); else map.set(k,{...old,qty:(Number(old.qty)||0)+(Number(it.qty)||0),weight:(Number(old.weight)||0)+(Number(it.weight)||0)}); }); return [...map.values()]; };
                const merged={...first,id:generateId(),date:selected.map(o=>o.date).sort()[0]||first.date,description:`ادغام ${selected.length} سند آنالیز — ${first.recipient}`,items:mergeItems(selected.flatMap(o=>o.items||[])),returnedItems:first.status==='returned'?mergeItems(selected.flatMap(o=>o.returnedItems||[])):undefined,timestamp:Date.now(),mergedFromIds:selected.map(o=>o.id),mergedAt:new Date().toLocaleDateString('fa-IR')};
                setProcessingOrders(prev=>[merged,...prev.filter(o=>!uniqueIds.includes(o.id))]);
                toast.show(`آنالیزها ادغام شدند؛ ${selected.length} سند به یک سند تجمیعی تبدیل شد.`);
            };

            // --- امانی (قرض بار): گرفتن امانی مثل دریافت خرید (افزایش فوری) و دادن امانی مثل ارسال به پردازش (کسر فوری) رفتار می‌کند ---
            const handleAddConsignment = (c) => {
                if (c.direction === 'borrowed') {
                    setItems(prev => addItemsToInventory(prev, c.items, c.id, c.party, 'CONSIGN_BORROW_IN', 'دریافت امانی (باید برگردد)'));
                } else {
                    setItems(prev => deductItemsFromInventory(prev, c.items, c.id, c.party, 'CONSIGN_LEND_OUT', 'ارسال امانی (باید برگردد)'));
                }
                setConsignments(prev => [c, ...prev]);
            };
            // برگشت امانی می‌تواند چندمرحله‌ای باشد و با تعداد کمتر/بیشتر از حد ثبت‌شده انجام شود؛
            // این تابع فقط همان محموله‌ای که همین الان رد و بدل شده را روی موجودی اعمال می‌کند و آن را به برگشتی‌های قبلی این رکورد اضافه (تجمیع) می‌کند.
            // وقتی جمع برگشتی‌ها برای همه ردیف‌ها به مقدار ثبت‌شده رسید (یا بیشتر شد)، رکورد کامل/برگشته حساب می‌شود؛ در غیر این صورت همچنان «در جریان» می‌ماند تا بعداً هم بشود برگشت زد.
            // نکته‌ی کلیدیِ داینامیک بودن: اگر جمعِ برگشتی از مقدار ثبت‌شده‌ی اولیه بیشتر شود («مازاد»)، این مازاد دیگر فقط یک برچسب نیست —
            // به‌صورت خودکار یک سند امانیِ جدید و مستقل در جهتِ معکوس (بدهکار⇄بستانکار) ساخته می‌شود که خودش هم می‌تواند بعداً دادوستد/برگشت جزئی داشته باشد
            // (و اگر آن هم روزی مازاد پیدا کند، همین منطق دوباره برایش اجرا و یک سند جدیدِ دیگر در جهت معکوس ساخته می‌شود — یعنی زنجیره‌ای از تسویه‌های متوالی).
            // اثر فیزیکیِ کل مقدار رد و بدل‌شده (حتی مازاد) همین‌جا و یک‌بار روی انبار اعمال می‌شود؛ سند جدید صرفاً دفترداریِ آن مازاد است و دوباره روی انبار اثر نمی‌گذارد.
            const handleReturnConsignment = (id, returnedItems) => {
                const c = consignments.find(x => x.id === id);
                if (!c) return;
                if (c.direction === 'borrowed') {
                    setItems(prev => deductItemsFromInventory(prev, returnedItems, c.id, c.party, 'CONSIGN_BORROW_RETURN', 'برگشت امانیِ گرفته‌شده به طرف'));
                } else {
                    setItems(prev => addItemsToInventory(prev, returnedItems, c.id, c.party, 'CONSIGN_LEND_RETURN', 'برگشت امانیِ داده‌شده از طرف'));
                }
                const itemKey = (it) => it.itemId || `${it.name}|${it.brand || ''}|${it.tag || ''}`;
                const prevCumulative = (c.returnedItems || []).map(it => ({ ...it }));
                const rawCumulative = prevCumulative.map(it => ({ ...it }));
                returnedItems.forEach(r => {
                    const idx = rawCumulative.findIndex(it => itemKey(it) === itemKey(r));
                    if (idx > -1) {
                        rawCumulative[idx] = { ...rawCumulative[idx], qty: (Number(rawCumulative[idx].qty) || 0) + (Number(r.qty) || 0), weight: (Number(rawCumulative[idx].weight) || 0) + (Number(r.weight) || 0) };
                    } else {
                        rawCumulative.push({ ...r });
                    }
                });
                // نسخه‌ی «سقف‌خورده» که روی خودِ سند اصلی ذخیره می‌شود: هیچ‌وقت از مقدار ثبت‌شده‌ی همان قلم بیشتر نمی‌شود
                // (چون هر چه بیشتر از سقف باشد، به سند جدیدِ جهت‌معکوس منتقل شده است)
                const cappedCumulative = rawCumulative.map(it => {
                    const orig = c.items.find(o => itemKey(o) === itemKey(it));
                    const origQty = orig ? (Number(orig.qty) || 0) : 0;
                    return { ...it, qty: Math.min(Number(it.qty) || 0, origQty) };
                });
                // مازادِ تازه‌ایجادشده در همین برگشت (نه کل مازاد تاریخی) به تفکیک قلم
                const surplusItems = [];
                c.items.forEach(orig => {
                    const key = itemKey(orig);
                    const origQty = Number(orig.qty) || 0;
                    if (origQty <= 0) return;
                    const rawQty = (rawCumulative.find(it => itemKey(it) === key)?.qty) || 0;
                    const prevQty = (prevCumulative.find(it => itemKey(it) === key)?.qty) || 0;
                    const newSurplusTotal = Math.max(0, rawQty - origQty);
                    const prevSurplusTotal = Math.max(0, prevQty - origQty);
                    const deltaSurplus = newSurplusTotal - prevSurplusTotal;
                    if (deltaSurplus > 0) {
                        const unitWeight = orig.weight ? (Number(orig.weight) || 0) / origQty : 0;
                        surplusItems.push({ itemId: orig.itemId || null, name: orig.name, brand: orig.brand || '', tag: orig.tag || 'عمومی', unit: orig.unit || 'عدد', qty: deltaSurplus, weight: +(unitWeight * deltaSurplus).toFixed(3) });
                    }
                });
                const fullyReturned = c.items.every(orig => {
                    const capped = cappedCumulative.find(it => itemKey(it) === itemKey(orig));
                    return (capped ? Number(capped.qty) || 0 : 0) >= (Number(orig.qty) || 0);
                });
                const todayFa = new Date().toLocaleDateString('fa-IR');
                setConsignments(prev => {
                    let next = prev.map(x => x.id === id ? { ...x, status: fullyReturned ? 'returned' : 'pending', returnedItems: cappedCumulative, returnedDate: todayFa } : x);
                    if (surplusItems.length > 0) {
                        const newDirection = c.direction === 'borrowed' ? 'lent' : 'borrowed';
                        const surplusTotal = surplusItems.reduce((s, it) => s + (Number(it.weight) || 0) * (Number(it.price) || 0), 0);
                        const newRecord = {
                            id: generateId(),
                            direction: newDirection,
                            party: c.party,
                            date: todayFa,
                            description: `ایجاد خودکار از مازادِ برگشتِ امانی «${c.party}» (سند مبدأ #${c.id.slice(-6)})`,
                            items: surplusItems,
                            status: 'pending',
                            timestamp: Date.now(),
                            returnedItems: [],
                            sourceConsignmentId: c.id,
                            autoGenerated: true,
                        };
                        next = [newRecord, ...next];
                    }
                    return next;
                });
            };
            // ویرایش امانی: طرف‌حساب/تاریخ/توضیحات/تسویه آزادانه ویرایش می‌شوند. اگر تعداد/وزن ردیف‌ها هم تغییر کند
            // (برای اصلاح مقداری که در لحظه ثبت اشتباه بوده)، فقط مابه‌التفاوت (نه کل عدد) روی موجودی انبار اعمال می‌شود
            // تا صحت موجودی حفظ شود؛ اقلام حذف‌شده یا اضافه‌شده هم به همین ترتیب با کل مقدارشان لحاظ می‌شوند.
            const handleEditConsignment = (updated) => {
                const original = consignments.find(x => x.id === updated.id);
                if (!original) return;
                const itemKey = (it) => it.itemId || `${it.name}|${it.brand || ''}|${it.tag || ''}`;
                const oldMap = {}; (original.items || []).forEach(it => { oldMap[itemKey(it)] = it; });
                const newMap = {}; (updated.items || []).forEach(it => { newMap[itemKey(it)] = it; });
                const allKeys = new Set([...Object.keys(oldMap), ...Object.keys(newMap)]);
                setItems(prev => {
                    let next = prev;
                    allKeys.forEach(k => {
                        const oldIt = oldMap[k], newIt = newMap[k];
                        const oldQty = oldIt ? (Number(oldIt.qty) || 0) : 0;
                        const newQty = newIt ? (Number(newIt.qty) || 0) : 0;
                        const delta = newQty - oldQty;
                        if (delta === 0) return;
                        const base = newIt || oldIt;
                        const deltaItem = { ...base, qty: Math.abs(delta) };
                        if (original.direction === 'borrowed') {
                            // امانی گرفته‌شده در ثبت اولیه موجودی را افزایش داده بود؛ اصلاح به همان جهت دنبال می‌شود
                            next = delta > 0
                                ? addItemsToInventory(next, [deltaItem], updated.id, updated.party, 'CONSIGN_EDIT_ADJUST', 'اصلاح تعداد امانی گرفته‌شده (افزایش)')
                                : deductItemsFromInventory(next, [deltaItem], updated.id, updated.party, 'CONSIGN_EDIT_ADJUST', 'اصلاح تعداد امانی گرفته‌شده (کاهش)');
                        } else {
                            // امانی داده‌شده در ثبت اولیه موجودی را کم کرده بود؛ اصلاح برعکس آن دنبال می‌شود
                            next = delta > 0
                                ? deductItemsFromInventory(next, [deltaItem], updated.id, updated.party, 'CONSIGN_EDIT_ADJUST', 'اصلاح تعداد امانی داده‌شده (افزایش)')
                                : addItemsToInventory(next, [deltaItem], updated.id, updated.party, 'CONSIGN_EDIT_ADJUST', 'اصلاح تعداد امانی داده‌شده (کاهش)');
                        }
                    });
                    return next;
                });
                setConsignments(prev => prev.map(x => x.id === updated.id ? { ...x, party: updated.party, date: updated.date, description: updated.description, items: updated.items } : x));
            };
            // حذف امانی: اثرات آن روی انبار (چه اثر ابتدایی، چه اثر هر برگشتی/برگشت‌های جزئی که تاکنون ثبت شده) به‌طور کامل خنثی می‌شود.
            // چون برگشت می‌تواند چندمرحله‌ای باشد، ملاک وجود یا نبود برگشتی، خودِ آرایه returnedItems است، نه صرفاً status
            const handleDeleteConsignment = async (id) => {
                const c = consignments.find(x => x.id === id);
                if (!c) return;
                const hasReturns = (c.returnedItems || []).length > 0;
                if (!hasReturns) {
                    if (!(await confirmAction('این امانی حذف شود؟ اثر آن روی موجودی انبار برگردانده می‌شود.', { countdown: 5 }))) return;
                    setItems(prev => c.direction === 'borrowed'
                        ? deductItemsFromInventory(prev, c.items, c.id, c.party, 'CONSIGN_DELETE_REVERSAL', 'حذف امانیِ گرفته‌شده (برگشت موجودی)')
                        : addItemsToInventory(prev, c.items, c.id, c.party, 'CONSIGN_DELETE_REVERSAL', 'حذف امانیِ داده‌شده (برگشت موجودی)'));
                } else {
                    if (!(await confirmAction('برای این امانی، برگشت (کامل یا جزئی) تاکنون ثبت شده است. با حذف آن، اثر ثبت اولیه و هر برگشتی خنثی می‌شود. ادامه می‌دهید؟', { countdown: 5 }))) return;
                    setItems(prev => {
                        let next = c.direction === 'borrowed'
                            ? addItemsToInventory(prev, c.returnedItems, c.id, c.party, 'CONSIGN_DELETE_REVERSAL', 'حذف امانی برگشته (خنثی‌سازی برگشت)')
                            : reverseItemsFromInventory(prev, c.returnedItems, c.id, c.party, 'CONSIGN_DELETE_REVERSAL', 'حذف امانی برگشته (خنثی‌سازی برگشت)');
                        next = c.direction === 'borrowed'
                            ? reverseItemsFromInventory(next, c.items, c.id, c.party, 'CONSIGN_DELETE_REVERSAL', 'حذف امانی برگشته (خنثی‌سازی ثبت اولیه)')
                            : addItemsToInventory(next, c.items, c.id, c.party, 'CONSIGN_DELETE_REVERSAL', 'حذف امانی برگشته (خنثی‌سازی ثبت اولیه)');
                        return next;
                    });
                }
                setConsignments(prev => prev.filter(x => x.id !== id));
            };
            // ادغام چند سند امانی هم‌طرف‌حساب و هم‌جهت؛ چون اسناد از قبل روی موجودی اثر گذاشته‌اند،
            // در ادغام هیچ تغییر جدیدی روی موجودی اعمال نمی‌شود و فقط دفتر امانی به یک سند تجمیعی تبدیل می‌شود.
            const handleMergeConsignments = async (ids) => {
                const uniqueIds = [...new Set(ids || [])];
                if (uniqueIds.length < 2) return;
                const selected = consignments.filter(c => uniqueIds.includes(c.id));
                if (selected.length !== uniqueIds.length) return;
                const first = selected[0];
                const sameParty = selected.every(c => normalizePartyName(c.party).toLocaleLowerCase('fa-IR') === normalizePartyName(first.party).toLocaleLowerCase('fa-IR'));
                const sameDirection = selected.every(c => c.direction === first.direction);
                if (!sameParty || !sameDirection) { toast.show('فقط امانی‌های هم‌طرف‌حساب و هم‌جهت قابل ادغام هستند.'); return; }
                if (!(await confirmAction(`این ${selected.length} سند امانی با هم ادغام شوند؟ موجودی انبار دوباره تغییر نمی‌کند.`))) return;

                const mergeItems = (rows) => {
                    const map = new Map();
                    rows.forEach(it => {
                        const k = consignmentItemKey(it);
                        const old = map.get(k);
                        if (!old) map.set(k, { ...it, qty: Number(it.qty)||0, weight: Number(it.weight)||0 });
                        else {
                            const oldQty = Number(old.qty)||0, newQty = Number(it.qty)||0;
                            const totalQty = oldQty + newQty;
                            const totalWeight = (Number(old.weight)||0) + (Number(it.weight)||0);
                            map.set(k, { ...old, qty: totalQty, weight: totalWeight });
                        }
                    });
                    return [...map.values()];
                };
                const merged = {
                    ...first,
                    id: generateId(),
                    party: first.party,
                    date: selected.map(c=>c.date).sort()[0] || first.date,
                    description: `ادغام ${selected.length} سند امانی — ${first.party}`,
                    items: mergeItems(selected.flatMap(c => c.items || [])),
                    returnedItems: mergeItems(selected.flatMap(c => c.returnedItems || [])),
                    status: 'pending',
                    timestamp: Date.now(),
                    mergedFromIds: selected.map(c=>c.id),
                    mergedAt: new Date().toLocaleDateString('fa-IR')
                };
                // وضعیت را از روی برگشتی‌ها دوباره محاسبه می‌کنیم تا سند تجمیعی درست باشد.
                const returnedMap = {};
                (merged.returnedItems || []).forEach(it => { returnedMap[consignmentItemKey(it)] = (returnedMap[consignmentItemKey(it)]||0) + (Number(it.qty)||0); });
                merged.status = (merged.items || []).every(it => (returnedMap[consignmentItemKey(it)]||0) >= (Number(it.qty)||0)) ? 'returned' : 'pending';
                setConsignments(prev => [merged, ...prev.filter(c => !uniqueIds.includes(c.id))]);
                toast.show(`امانی‌ها ادغام شدند؛ ${selected.length} سند به یک سند تجمیعی تبدیل شد.`);
            };

            const handleAdd = (name, brand, tag, qty, unit, deductionPerBag, bagWeight, warehouseId) => {
                const norm = s => (s || '').trim();
                setItems(prev => {
                    const idx = prev.findIndex(i => i.name === norm(name) && i.brand === norm(brand) && i.tag === norm(tag));
                    if (idx > -1) {
                        const newItems = [...prev]; const old = newItems[idx];
                        const newStock = old.quantity + qty;
                        logTransaction(old, 'ADD', qty, newStock, undefined, undefined, 'افزایش دستی');
                        newItems[idx] = { ...old, quantity: newStock, lastUpdated: Date.now(), ...(deductionPerBag !== null && { deductionPerBag, deductionDate: new Date().toLocaleDateString('fa-IR') }), ...(bagWeight !== null && { bagWeight }), ...(warehouseId !== undefined && warehouseId !== '' && { warehouseId }) };
                        return newItems;
                    }
                    const newItem = { id: generateId(), name: norm(name), brand: norm(brand), tag: norm(tag), quantity: qty, unit, warehouseId: warehouseId || '', lastUpdated: Date.now(), ...(deductionPerBag !== null && { deductionPerBag, deductionDate: new Date().toLocaleDateString('fa-IR') }), ...(bagWeight !== null && { bagWeight }) };
                    logTransaction(newItem, 'ADD', qty, qty, undefined, undefined, 'تعریف جدید');
                    return [newItem, ...prev];
                });
            };

            const handleUpdateQuantity = (id, delta) => {
                const item = items.find(i => i.id === id);
                if (!item) return;
                // موجودی می‌تواند منفی شود؛ دیگر به صفر محدود نمی‌شود چون گاهی آمار واقعی انبار منفی است
                const newStock = item.quantity + delta;
                const appliedDelta = delta;
                if (appliedDelta !== 0) {
                    logTransaction(item, appliedDelta > 0 ? 'ADD' : 'SALE', appliedDelta, newStock, undefined, undefined, 'تغییر سریع');
                    setItems(prev => prev.map(i => i.id === id ? { ...i, quantity: newStock, lastUpdated: Date.now() } : i));
                }
            };

            const handleDelete = (id, name) => {
                const item = items.find(i => i.id === id);
                if (!item) return;
                // Soft delete with undo
                const deletedItem = { ...item };
                const deleteTxId = generateId();
                logTransaction(item, 'DELETE', -item.quantity, 0, undefined, undefined, 'حذف کالا', deleteTxId);
                setItems(prev => prev.filter(i => i.id !== id));
                toast && toast.show(`🗑 کالای "${name || item.name}" حذف شد`, {
                    label: '↩ بازگردانی',
                    fn: () => {
                        setItems(prev => [deletedItem, ...prev]);
                        // فقط همان تراکنشِ «حذف»ی که همین الان ساختیم را برمی‌داریم؛ نه هر چیز دیگری که
                        // ممکن است در همین فاصله (۵ ثانیه‌ای نمایش Toast) به آرایه تراکنش‌ها اضافه شده باشد.
                        setTransactions(prev => prev.filter(t => t.id !== deleteTxId));
                    }
                }, 5000);
            };

            const handleSaveItem = (upd) => {
                const orig = items.find(i => i.id === upd.id);
                const { _changeReason, ...cleanUpd } = upd;
                if (orig) {
                    if (orig.quantity !== cleanUpd.quantity) logTransaction(cleanUpd, 'UPDATE', cleanUpd.quantity - orig.quantity, cleanUpd.quantity, undefined, undefined, _changeReason || 'ویرایش دستی موجودی');
                    else logTransaction(cleanUpd, 'EDIT', 0, cleanUpd.quantity, undefined, undefined, 'ویرایش مشخصات');
                }
                setItems(prev => prev.map(i => i.id === cleanUpd.id ? { ...cleanUpd, lastUpdated: Date.now() } : i));
            };

            // شمارش فیزیکی موجودی: برخلاف ویرایش دستی معمولی، این تراکنش با نوع مجزای ADJUSTMENT ثبت می‌شود
            // تا در گزارش‌ها و تاریخچه از سایر تغییرات (فروش، خرید، ویرایش دستی و...) قابل تفکیک باشد.
            const handleAdjustInventory = (itemId, countedQty, reason) => {
                const item = items.find(i => i.id === itemId);
                if (!item) return;
                const diff = countedQty - (Number(item.quantity) || 0);
                if (diff !== 0) {
                    logTransaction(item, 'ADJUSTMENT', diff, countedQty, undefined, undefined, reason);
                    setItems(prev => prev.map(i => i.id === itemId ? { ...i, quantity: countedQty, lastUpdated: Date.now() } : i));
                    toast.show(`✅ شمارش ثبت شد — اختلاف ${diff > 0 ? '+' : ''}${formatNumber(diff)} اصلاح شد`);
                } else {
                    toast.show('موجودی سیستم با شمارش مطابقت داشت — تغییری اعمال نشد');
                }
                setCountingItem(null);
            };

            // ادغام/ترکیب چند بار انبار در یک بار نهایی.
            // - بارهای دارای رزرو اصلاً به این تابع نمی‌رسند (در پاپ‌آپ فیلتر شده‌اند)؛ اینجا هم دوباره برای اطمینان بررسی می‌شود.
            // - تاریخچه‌ی تراکنش‌های بارهای حذف‌شده، به بار نهایی منتقل می‌شود تا سابقه از دست نرود.
            const handleMergeInventory = ({ baseId, groupIds, qtyMode, manualQty, weightMode, manualWeight, selectedWeightId, finalName, finalBrand, finalTag, finalWarehouseId }) => {
                const group = groupIds.map(id => items.find(i => i.id === id)).filter(Boolean);
                if (group.length < 2) { toast.show('حداقل ۲ بار برای ادغام لازم است'); return; }
                const reservedOne = group.find(it => (reservedCounts[it.id] || 0) > 0);
                if (reservedOne) { toast.show(`بار «${reservedOne.name}» رزرو دارد و قابل ادغام نیست`); return; }
                const base = items.find(i => i.id === baseId);
                if (!base) return;

                const totalQty = qtyMode === 'manual' ? parseDecimal(manualQty) : group.reduce((s, it) => s + (Number(it.quantity) || 0), 0);
                let totalWeightKg;
                if (weightMode === 'manual') totalWeightKg = parseDecimal(manualWeight);
                else if (weightMode === 'selected') { const wi = items.find(i => i.id === selectedWeightId); totalWeightKg = wi ? getInventoryWeightKg(wi) : 0; }
                else totalWeightKg = group.reduce((s, it) => s + getInventoryWeightKg(it), 0);

                const unit = String(base.unit || '').trim().toLowerCase();
                const isKgUnit = unit === 'کیلو' || unit === 'کیلوگرم' || unit === 'kg';
                // اگر واحد کیسه/کارتن/عدد است و هم تعداد و هم وزن نهایی مشخص است، وزن هر کیسه از روی همین دو مقدار بازمحاسبه می‌شود
                // تا داده‌ی موجودی خراب نشود؛ اگر تعداد صفر بود (مثلاً کیسه‌شماری این بار خالی/نامعلوم بود)، وزنِ کیسه‌ی قبلیِ بار نهایی حفظ می‌شود.
                let bagWeightG = base.bagWeight || null;
                if (!isKgUnit && totalQty > 0 && totalWeightKg > 0) {
                    bagWeightG = Math.round((totalWeightKg * 1000) / totalQty);
                }

                const mergedFromInfo = group.filter(it => it.id !== baseId).map(it => ({ id: it.id, name: it.name, brand: it.brand || '', tag: it.tag || '', quantity: it.quantity, weightKg: getInventoryWeightKg(it) }));

                const mergedItem = {
                    ...base,
                    name: finalName || base.name,
                    brand: finalBrand !== undefined ? finalBrand : base.brand,
                    tag: finalTag !== undefined ? finalTag : base.tag,
                    quantity: totalQty,
                    ...(bagWeightG ? { bagWeight: bagWeightG } : {}),
                    warehouseId: finalWarehouseId !== undefined ? finalWarehouseId : base.warehouseId,
                    lastUpdated: Date.now(),
                    mergeHistory: [...(base.mergeHistory || []), { mergedAt: new Date().toLocaleString('fa-IR'), sources: mergedFromInfo }],
                };

                const removedIds = group.filter(it => it.id !== baseId).map(it => it.id);

                logTransaction(base, 'UPDATE', totalQty - (Number(base.quantity) || 0), totalQty, undefined, undefined, `ادغام با ${removedIds.length} بار دیگر`);
                removedIds.forEach(id => {
                    const it = items.find(i => i.id === id);
                    if (it) logTransaction(it, 'DELETE', -(Number(it.quantity) || 0), 0, undefined, undefined, `ادغام‌شده در «${mergedItem.name}»`);
                });

                setItems(prev => prev.filter(i => !removedIds.includes(i.id)).map(i => i.id === baseId ? mergedItem : i));
                // تاریخچه‌ی تراکنش‌های بارهای حذف‌شده هم به بار نهایی منتقل می‌شود تا از گزارش کامل کالا حذف نشود.
                // برای اینکه سند اصلی از دید حسابرسی خراب نشود، itemId اصلی هر تراکنش در originalItemId نگه داشته می‌شود
                // (فقط بار اول که ادغام می‌شود؛ اگر تراکنش قبلاً از یک ادغام دیگر آمده، originalItemId قبلی حفظ می‌شود).
                setTransactions(prev => prev.map(t => removedIds.includes(t.itemId) ? { ...t, itemId: baseId, itemName: mergedItem.name, originalItemId: t.originalItemId || t.itemId, mergeEventId: mergedItem.mergeHistory[mergedItem.mergeHistory.length - 1] ? `${baseId}-${mergedItem.mergeHistory.length}` : undefined } : t));

                // رفع باگ مهم: تا اینجا فقط «انبار» و «تاریخچه» به بار نهایی اشاره می‌کردند، ولی اسناد امانی/خرید/پردازش
                // که قبلاً به بارهای حذف‌شده اشاره می‌کردند، عوض نمی‌شدند. همین باعث می‌شد گزارش‌هایی که بر اساس
                // itemId گروه‌بندی می‌کنند (مثل «گزارش کلی امانی») بارِ ادغام‌شده را گم کنند یا اشتباه محاسبه کنند.
                // اینجا itemId داخل اقلامِ همه‌ی این اسناد هم به baseId منتقل می‌شود، دقیقاً مثل کاری که با تراکنش‌ها شد.
                const remapItemId = (arr) => (arr || []).map(it => removedIds.includes(it.itemId) ? { ...it, itemId: baseId, originalItemId: it.originalItemId || it.itemId } : it);
                setConsignments(prev => prev.map(c => ({ ...c, items: remapItemId(c.items), returnedItems: remapItemId(c.returnedItems) })));
                setPurchases(prev => prev.map(p => ({ ...p, items: remapItemId(p.items) })));
                setProcessingOrders(prev => prev.map(o => ({ ...o, items: remapItemId(o.items), returnedItems: remapItemId(o.returnedItems) })));

                toast.show(`✅ ${group.length} بار با موفقیت در «${mergedItem.name}» ادغام شدند`);
                setMergeItem(null);
            };

            // ابزار تعمیر یک‌بارِ داده‌های قدیمی: ادغام‌هایی که قبل از رفع باگ بالا انجام شده بودند،
            // هنوز در امانی/خرید/پردازش به itemId قدیمیِ حذف‌شده اشاره می‌کنند. این تابع از روی
            // mergeHistory هر بار (که مشخص می‌کند کدام بارهای قدیمی داخل آن ادغام شده‌اند) یک نقشه
            // «itemId قدیمی → itemId فعلی» می‌سازد و سراغ اسناد قدیمی می‌رود تا آن‌ها را هم اصلاح کند.
            const buildMergeIdMap = () => {
                const map = {};
                items.forEach(it => { (it.mergeHistory || []).forEach(ev => { (ev.sources || []).forEach(src => { if (src?.id) map[src.id] = it.id; }); }); });
                return map;
            };
            const handleRepairMergedReferences = async () => {
                const idMap = buildMergeIdMap();
                const currentIds = new Set(items.map(i => i.id));
                const isOrphan = (it) => it?.itemId && !currentIds.has(it.itemId) && idMap[it.itemId];
                const remap = (arr) => (arr || []).map(it => isOrphan(it) ? { ...it, itemId: idMap[it.itemId], originalItemId: it.originalItemId || it.itemId } : it);

                let previewCount = 0;
                consignments.forEach(c => { (c.items||[]).forEach(it => { if (isOrphan(it)) previewCount++; }); (c.returnedItems||[]).forEach(it => { if (isOrphan(it)) previewCount++; }); });
                purchases.forEach(p => { (p.items||[]).forEach(it => { if (isOrphan(it)) previewCount++; }); });
                processingOrders.forEach(o => { (o.items||[]).forEach(it => { if (isOrphan(it)) previewCount++; }); (o.returnedItems||[]).forEach(it => { if (isOrphan(it)) previewCount++; }); });

                if (previewCount === 0) { toast.show('هیچ مرجع خراب/قدیمی پیدا نشد — چیزی برای تعمیر نبود'); return; }
                if (!(await confirmAction(`${previewCount} مرجع قدیمی (مربوط به ادغام‌های قبلی) در امانی/خرید/پردازش پیدا شد. اصلاح شوند؟ موجودی انبار تغییر نمی‌کند، فقط ارجاع‌های داخلی درست می‌شوند.`))) return;

                setConsignments(prev => prev.map(c => ({ ...c, items: remap(c.items), returnedItems: remap(c.returnedItems) })));
                setPurchases(prev => prev.map(p => ({ ...p, items: remap(p.items) })));
                setProcessingOrders(prev => prev.map(o => ({ ...o, items: remap(o.items), returnedItems: remap(o.returnedItems) })));
                toast.show(`✅ ${previewCount} مرجع قدیمی اصلاح شد`);
            };


            // منطق واحد اثر فاکتور روی موجودی: فقط وضعیت «completed» موجودی فیزیکی را تغییر می‌دهد.
            // رزرو/pending صرفاً موجودی آزاد را محدود می‌کند و هیچ کسر فیزیکی ندارد.
            // در ویرایش، فقط اختلاف اثر فاکتور قبلی و جدید اعمال می‌شود؛ بنابراین کسر دوباره اتفاق نمی‌افتد.
            const reconcileInvoiceStock = (baseItems, oldInvoice, newInvoice) => {
                const oldMap = {};
                const newMap = {};
                // اگر بخشی از یک ردیف قبلاً با «ثبت ارسال» جداگانه از انبار کسر شده (shippedQty)، همان بخش اینجا
                // دوباره کسر نشود؛ فقط مابقیِ هنوز کسرنشده (qty - shippedQty) به‌عنوان اثرِ «تکمیل‌شدن» فاکتور لحاظ می‌شود.
                (oldInvoice?.status === 'completed' ? (oldInvoice.items || []) : []).forEach(i => {
                    if (i?.isManual || !i?.itemId) return;
                    oldMap[i.itemId] = (oldMap[i.itemId] || 0) + ((Number(i.qty) || 0) - (Number(i.shippedQty) || 0));
                });
                (newInvoice?.status === 'completed' ? (newInvoice.items || []) : []).forEach(i => {
                    if (i?.isManual || !i?.itemId) return;
                    newMap[i.itemId] = (newMap[i.itemId] || 0) + ((Number(i.qty) || 0) - (Number(i.shippedQty) || 0));
                });
                const allIds = new Set([...Object.keys(oldMap), ...Object.keys(newMap)]);
                const txs = [];
                const nextItems = baseItems.map(item => {
                    if (!allIds.has(item.id)) return item;
                    const oldQty = Number(oldMap[item.id]) || 0;
                    const newQty = Number(newMap[item.id]) || 0;
                    const delta = oldQty - newQty;
                    if (!delta) return item;
                    const nextStock = Number(item.quantity || 0) + delta;
                    txs.push({
                        id: generateId(), itemId: item.id, itemName: item.name,
                        type: delta > 0 ? 'ADD' : 'SALE', quantity: delta, currentStock: nextStock, date: Date.now(),
                        invoiceId: newInvoice?.id || oldInvoice?.id, recipient: newInvoice?.customer || oldInvoice?.customer,
                        description: oldInvoice ? 'اصلاح اثر موجودی فاکتور پس از ویرایش' : 'فروش مستقیم'
                    });
                    return { ...item, quantity: nextStock, lastUpdated: Date.now() };
                });
                return { items: nextItems, transactions: txs };
            };

            const handleFinalize = (inv) => {
                const finalInvoice = (!inv.snapshotLoadingCostPerTon && inv.status === 'completed')
                    ? { ...inv, snapshotLoadingCostPerTon: appSettings.loadingCostPerTon }
                    : inv;
                const previousInvoice = editingInvoice ? invoices.find(x => x.id === finalInvoice.id) || editingInvoice : null;
                const reconciled = reconcileInvoiceStock(items, previousInvoice, finalInvoice);
                setItems(reconciled.items);
                if (reconciled.transactions.length) setTransactions(prev => [...reconciled.transactions, ...prev]);
                setInvoices(prev => {
                    const filtered = editingInvoice ? prev.filter(i => i.id !== finalInvoice.id) : prev;
                    return [...filtered, finalInvoice];
                });
                setEditingInvoice(null);
                setView('dashboard');
            };

            const handleCancelPending = async (id) => {
                // تایمر ۵ ثانیه‌ای روی دکمه‌ی تایید تا حذف بارِ در انتظار ارسال، تصادفی/عجولانه انجام نشود
                if (await confirmAction('این بار حذف شود؟ این عملیات قابل بازگشت نیست.', { countdown: 5 })) setInvoices(prev => prev.filter(i => i.id !== id));
            };

            // «تایید نهایی / ثبت ارسال»ِ یک فاکتورِ رزرو — به‌صورت یک‌جا (batch) روی همه‌ی ردیف‌ها اعمال می‌شود
            // (نه با چند فراخوانی جدا که به‌خاطر state بسته‌شده‌ی قدیمی باعث از دست رفتن تغییرات می‌شد).
            // decisions: آرایه‌ای هم‌طول با invoice.items؛ برای هر ردیف: { ship: مقدار ارسالی الان (عدد),
            // cancelRemainder: باقی‌مانده‌ی بعد از این ارسال لغو/حذف شود؟, weight?, price?: قیمت/وزن جایگزین برای همین بخش }.
            // dueDateOverride (اختیاری): اگر کاربر در پاپ‌آپ تصمیم گرفت مبنای سررسید عوض شود، سررسید جدید (ISO) اینجا می‌آید.
            const handleFinalizeInvoiceWithShipments = async (invoiceId, decisions, dueDateOverride, motherBagConsumptions) => {
                const inv = invoices.find(i => i.id === invoiceId);
                if (!inv) return;

                let nextItemsPool = items;
                let nextTransactions = transactions;

                const nextInvoiceItems = inv.items.map((it, idx) => {
                    const dec = decisions[idx] || {};
                    let out = { ...it };
                    const already = Number(it.shippedQty) || 0;
                    const totalQty = Number(it.qty) || 0;
                    const remaining = totalQty - already;
                    const shipQty = Math.min(Math.max(0, Number(dec.ship) || 0), remaining);

                    if (shipQty > 0) {
                        // وزن/قیمتِ همین بخشِ ارسالی: پیش‌فرض به‌نسبت سهم از وزن/قیمت کل ردیف، مگر کاربر
                        // به‌خاطر تغییر واقعی وزن/قیمت هنگام تحویل، مقدار دیگری وارد کرده باشد
                        const ratio = totalQty > 0 ? (shipQty / totalQty) : 0;
                        const defaultWeight = (Number(it.weight) || 0) * ratio;
                        const shipmentWeight = (dec.weight !== undefined && dec.weight !== null && dec.weight !== '') ? Number(dec.weight) : defaultWeight;
                        const shipmentPrice = (dec.price !== undefined && dec.price !== null && dec.price !== '') ? Number(dec.price) : (Number(it.price) || 0);
                        // پرچم‌های وزن/قیمتِ دستی — تا در گزارش‌ها بشود دید کدام ارسال واقعاً دست‌کاری‌شده بوده، نه فقط
                        // نسبتِ خودکار (بند ۳: تفاوت وزن محاسبه‌شده / وزن دستی / وزن نهایی مورد استفاده)
                        const shipmentRecord = { id: generateId(), qty: shipQty, weight: shipmentWeight, price: shipmentPrice, date: new Date().toLocaleDateString('fa-IR'), weightManual: !!dec.weightManual, priceManual: !!dec.priceManual, calculatedWeight: defaultWeight };
                        out.shippedQty = already + shipQty;
                        out.shipments = [...(it.shipments || []), shipmentRecord];

                        // کسر فیزیکی از انبار فقط برای ردیف‌های متصل به یک کالای واقعی (نه ردیف دستی/متفرقه)
                        if (!it.isManual && it.itemId) {
                            const invItem = nextItemsPool.find(i2 => i2.id === it.itemId);
                            if (invItem) {
                                const nextStock = (Number(invItem.quantity) || 0) - shipQty;
                                nextItemsPool = nextItemsPool.map(i2 => i2.id === invItem.id ? { ...i2, quantity: nextStock, lastUpdated: Date.now() } : i2);
                                const tx = { id: generateId(), itemId: invItem.id, itemName: invItem.name, type: 'SALE', quantity: -shipQty, currentStock: nextStock, date: Date.now(), invoiceId, recipient: inv.customer, description: `ارسال بار فاکتور (${formatNumber(shipQty)} از ${formatNumber(totalQty)})` };
                                nextTransactions = [tx, ...nextTransactions];
                            }
                        }
                    }

                    // انصراف از باقی‌مانده: چیزی که ارسال نشده هیچ‌وقت حساب/فاکتور نمی‌شود (چون واقعاً رفته
                    // نبوده)؛ به‌جای دستکاری وزن/تعداد کل ردیف (که باعث محاسبه‌ی نادرست می‌شد)، فقط از حالت
                    // «رزرو» خارجش می‌کنیم. اگر اصلاً چیزی از این ردیف نرفته باشد، کل ردیف از فاکتور حذف می‌شود.
                    const shippedNow = Number(out.shippedQty) || 0;
                    const remainingAfterShip = totalQty - shippedNow;
                    let removeRow = false;
                    if (dec.cancelRemainder && remainingAfterShip > 0.0001) {
                        if (shippedNow <= 0.0001) {
                            removeRow = true;
                        } else {
                            out.shippedQty = totalQty; // دیگر چیزی از این ردیف رزرو باقی نمی‌ماند
                            out.remainderCancelledQty = (Number(it.remainderCancelledQty) || 0) + remainingAfterShip;
                        }
                    }
                    return removeRow ? null : out;
                }).filter(Boolean);

                const itemsSubtotal = nextInvoiceItems.reduce((s, it) => s + getItemEffectiveTotal(it), 0);
                const totalWeight = nextInvoiceItems.reduce((s, it) => s + getItemEffectiveWeight(it), 0);
                const incrementKg = appSettings.loadingWeightIncrementKg ?? 1000;
                const threshold = appSettings.loadingWeightRoundUpThreshold ?? 0.9;
                const minWeightKg = appSettings.loadingMinWeightEnabled ? (appSettings.loadingMinWeightKg || 0) : 0;
                const loadingCostAmount = inv.includeLoadingCost ? calculateLoadingCost(totalWeight, appSettings.loadingCostPerTon, incrementKg, threshold, minWeightKg) : (inv.loadingCostAmount || 0);
                const totalPrice = itemsSubtotal + (inv.includeLoadingCost ? loadingCostAmount : 0);
                // قبلاً ردیف‌های دستی/متفرقه همیشه «رفته» فرض می‌شدند چون در پاپ‌آپ ثبت ارسال قابل تصمیم‌گیری نبودند؛
                // حالا که همان ردیف‌ها هم وارد گردش کار ارسال جزئی شده‌اند، باید مثل بقیه بر اساس باقی‌مانده‌ی واقعی‌شان سنجیده شوند.
                const allShipped = nextInvoiceItems.length > 0 && nextInvoiceItems.every(it => ((Number(it.qty) || 0) - (Number(it.shippedQty) || 0)) <= 0.0001);
                // تاریخ فاکتور (زمانی که ثبتش کردی) با تاریخِ واقعیِ ارسال فرق دارد و باید جدا از هم ذخیره و
                // نشان داده شوند؛ چون معمول است که فاکتور امروز زده شود ولی بار چند روز بعد برود. اینجا،
                // فقط وقتی این بار واقعاً چیزی «رفته» (نه فقط لغو شده)، تاریخ ارسال ثبت/به‌روزرسانی می‌شود؛
                // اولین باری که چیزی می‌رود firstShipmentDate ثابت می‌ماند، و هر ارسال بعدی lastShipmentDate را جلو می‌برد.
                const prevShippedTotal = (inv.items || []).reduce((s, it) => s + (Number(it.shippedQty) || 0), 0);
                const nextShippedTotal = nextInvoiceItems.reduce((s, it) => s + (Number(it.shippedQty) || 0), 0);
                const shippedSomethingNow = nextShippedTotal > prevShippedTotal + 0.0001;
                const todayFa = new Date().toLocaleDateString('fa-IR');

                const nextInvoice = {
                    ...inv,
                    items: nextInvoiceItems,
                    loadingCostAmount,
                    totalPrice,
                    ...(dueDateOverride !== undefined ? { dueDate: dueDateOverride } : {}),
                    ...(shippedSomethingNow ? { firstShipmentDate: inv.firstShipmentDate || todayFa, lastShipmentDate: todayFa } : {}),
                    ...(allShipped ? { status: 'completed', snapshotLoadingCostPerTon: inv.snapshotLoadingCostPerTon !== undefined ? inv.snapshotLoadingCostPerTon : appSettings.loadingCostPerTon } : {}),
                };
                const nextInvoices = invoices.map(i => i.id === invoiceId ? nextInvoice : i);

                setItems(nextItemsPool);
                setTransactions(nextTransactions);
                setInvoices(nextInvoices);
                await saveData(nextItemsPool, nextInvoices, notes, nextTransactions, purchases, processingOrders, consignments);

                // کسرِ موجودی کیسه‌ی مادر (خالی): همان مقداری که در پاپ‌آپ «تأیید مصرف کیسه‌ی مادر» تأیید شد،
                // از موجودیِ همان رنگ/محصول در appSettings.motherBagStock کم می‌شود. اگر کافی نبود هم مثل
                // خودِ انبار اجازه‌ی منفی‌شدن داده می‌شود (چون کاربر قبلاً در همان پاپ‌آپ هشدار را دیده و تأیید کرده).
                if (Array.isArray(motherBagConsumptions) && motherBagConsumptions.length) {
                    const currentStock = appSettings.motherBagStock || [];
                    const nextStock = currentStock.map(s => {
                        const match = motherBagConsumptions.find(c => c.stockId === s.id);
                        return match ? { ...s, qty: (Number(s.qty) || 0) - (Number(match.motherBags) || 0) } : s;
                    });
                    const mergedSettings = { ...appSettings, motherBagStock: nextStock };
                    setAppSettings(mergedSettings);
                    saveSettings(mergedSettings);
                }

                setLastSaved(new Date());
                toast.show(allShipped ? '✅ بار نهایی شد؛ اثر موجودی و مبلغ اعمال شد.' : '🚚 بخشی از بار ثبت شد؛ باقی‌مانده همچنان رزرو است.');
            };


            // File & Backup Logic
            // ورود اکسل دیگر مستقیم روی موجودی اعمال نمی‌شود؛ ابتدا یک پیش‌نمایش (Preview) ساخته می‌شود
            // که کاربر برای هر ردیف تصمیم می‌گیرد: جمع بزند، جایگزین کند یا نادیده بگیرد.
            const handleFileUpload = async (e) => {
                if (e.target.files?.[0]) {
                try {
                    const parsed = await parseExcelFile(e.target.files[0]);
                    const rows = parsed.filter(p => p.name && p.quantity !== undefined).map(p => {
                        const existing = items.find(i => i.name === p.name?.trim() && i.brand === (p.brand||'').trim() && i.tag === (p.tag||'عمومی').trim());
                        return {
                            key: generateId(),
                            parsed: p,
                            existingId: existing ? existing.id : null,
                            oldQty: existing ? Number(existing.quantity) || 0 : null,
                            newQty: Number(p.quantity) || 0,
                            // پیش‌فرض: اگر کالا از قبل وجود دارد، جمع زده شود (رفتار قبلی)؛ اگر جدید است، اضافه شود
                            action: existing ? 'sum' : 'add',
                        };
                    });
                    if (rows.length === 0) { toast.show('ردیف معتبری در فایل پیدا نشد'); }
                    else setExcelPreview(rows);
                } catch(e) { toast.show('خطا در فایل'); }
                e.target.value = '';
                }
            };

            const handleConfirmExcelImport = (rows) => {
                setItems(prev => {
                    const next = [...prev];
                    rows.forEach(r => {
                        if (r.action === 'ignore') return;
                        const p = r.parsed;
                        const idx = r.existingId ? next.findIndex(i => i.id === r.existingId) : -1;
                        if (idx > -1) {
                            const item = next[idx];
                            const finalQty = r.action === 'replace' ? r.newQty : (Number(item.quantity) || 0) + r.newQty;
                            logTransaction(item, 'IMPORT', finalQty - (Number(item.quantity) || 0), finalQty, undefined, undefined, r.action === 'replace' ? 'اکسل (جایگزینی)' : 'اکسل (جمع)');
                            next[idx] = { ...item, quantity: finalQty, lastUpdated: Date.now() };
                        } else {
                            const newItem = { id: generateId(), name: p.name.trim(), brand: (p.brand||'').trim(), tag: (p.tag||'عمومی').trim(), quantity: r.newQty, unit: p.unit||'عدد', lastUpdated: Date.now() };
                            logTransaction(newItem, 'IMPORT', r.newQty, r.newQty, undefined, undefined, 'اکسل (جدید)');
                            next.unshift(newItem);
                        }
                    });
                    return next;
                });
                setExcelPreview(null);
                toast.show('اکسل با موفقیت اعمال شد');
            };

            const getIDBAll = async (dbName, storeName) => {
                try {
                    if (!window.indexedDB) return [];
                    const db = await new Promise((resolve, reject) => { const req=indexedDB.open(dbName); req.onsuccess=()=>resolve(req.result); req.onerror=()=>reject(req.error); });
                    if (!db.objectStoreNames.contains(storeName)) { db.close(); return []; }
                    const values = await new Promise((resolve, reject) => { const tx=db.transaction(storeName,'readonly'); const req=tx.objectStore(storeName).getAll(); req.onsuccess=()=>resolve(req.result||[]); req.onerror=()=>reject(req.error); });
                    db.close(); return values;
                } catch(err) { console.warn('Backup IDB read failed', dbName, storeName, err); return []; }
            };
            const restoreIDBAll = async (dbName, storeName, values) => {
                try {
                    if(!window.indexedDB || !Array.isArray(values)) return;
                    const db=await new Promise((resolve,reject)=>{const req=indexedDB.open(dbName);req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});
                    if(!db.objectStoreNames.contains(storeName)){db.close();return;}
                    await new Promise((resolve,reject)=>{const tx=db.transaction(storeName,'readwrite'); const st=tx.objectStore(storeName); st.clear(); values.forEach(v=>st.put(v)); tx.oncomplete=resolve; tx.onerror=()=>reject(tx.error);});
                    db.close();
                }catch(err){console.warn('Backup IDB restore failed',dbName,storeName,err);}
            };
            const handleMahakApplySync = async (preparedRows, nextMappings, syncMeta, itemsToRemove = [], removeMode = 'delete') => {
                const finalMappings = {...nextMappings};
                setItems(prev => {
                    let next = [...prev];
                    preparedRows.forEach(r => {
                        const convertedQty = Number(r.converted.value) || 0;
                        if (r.existingItemId) {
                            const idx = next.findIndex(i => i.id === r.existingItemId);
                            if (idx < 0) return;
                            const old = next[idx];
                            const delta = convertedQty - (Number(old.quantity) || 0);
                            logTransaction(old, 'IMPORT', delta, convertedQty, undefined, undefined, `همگام‌سازی محک — ${r.mahakName}`);
                            next[idx] = {...old, quantity:convertedQty, ...(r.saveBagWeight && r.converted.weightKg > 0 ? { bagWeight: r.converted.weightKg * 1000 } : {}), lastUpdated:Date.now()};
                        } else {
                            const kgFallback = r.autoCreate === true;
                            const defaultMahakWarehouseId = (appSettings?.warehouses || []).find(w => String(w?.name || '').trim() === 'سوله گرجی علیا')?.id || '';
                            const newItem = {
                                id: generateId(), name:r.finalName, brand:'', tag:'عمومی',
                                warehouseId: r.targetWarehouseId || defaultMahakWarehouseId,
                                quantity:convertedQty, unit:kgFallback ? 'کیلوگرم' : (r.targetUnit || 'کیسه'),
                                bagWeight: kgFallback ? null : (r.converted.weightKg > 0 ? r.converted.weightKg * 1000 : null),
                                lastUpdated:Date.now()
                            };
                            logTransaction(newItem, 'IMPORT', convertedQty, convertedQty, undefined, undefined, `همگام‌سازی محک — کالای جدید: ${r.mahakName}`);
                            next.unshift(newItem);
                            finalMappings[r.normalized] = {
                                mahakName:r.mahakName, itemId:newItem.id, mode:'existing', targetName:newItem.name,
                                targetUnit:newItem.unit, weightKg:kgFallback ? 0 : (newItem.bagWeight ? newItem.bagWeight/1000 : 0), updatedAt:Date.now()
                            };
                        }
                    });
                    // حذف بارهایی که کاربر در همگام‌سازی محک صریحاً تأیید کرده (چون دیگر در محک نیستند).
                    // قبل از حذفِ واقعی، یک تراکنش MAHAK_REMOVED با موجودیِ لحظه‌ی حذف ثبت می‌شود تا در
                    // تاریخچه‌ی کالا همیشه معلوم باشد چرا و با چه موجودی‌ای حذف شده — نه یک حذفِ بی‌اثر.
                    (itemsToRemove || []).forEach(rem => {
                        const idx = next.findIndex(i => i.id === rem.id);
                        if (idx < 0) return;
                        if (removeMode === 'zero') {
                            const oldQ = Number(next[idx].quantity) || 0;
                            if (oldQ === 0) return;
                            logTransaction(next[idx], 'IMPORT', -oldQ, 0, undefined, undefined, 'همگام‌سازی محک — در محک موجودی صفر است یا در فایل نیست');
                            next[idx] = {...next[idx], quantity:0, lastUpdated:Date.now()};
                            return;
                        }
                        logTransaction(next[idx], 'MAHAK_REMOVED', -(Number(next[idx].quantity) || 0), 0, undefined, undefined, 'حذف‌شده از محک هنگام همگام‌سازی');
                        next.splice(idx, 1);
                    });
                    return next;
                });
                const mergedSettings = {...appSettings, mahakMappings:finalMappings, mahakLastSync:syncMeta?.importedAt || new Date().toISOString(), mahakLastAutoCreatedCount:Number(syncMeta?.autoCreatedCount||0)};
                setAppSettings(mergedSettings); saveSettings(mergedSettings);
                const createdCount = Number(syncMeta?.autoCreatedCount||0);
                const removedCount = (itemsToRemove || []).length;
                toast.show(`همگام‌سازی محک انجام شد: ${preparedRows.length} ردیف${createdCount ? ` | ${createdCount} کالای جدید خودکار ساخته شد` : ''}${removedCount ? ` | ${removedCount} کالا چون در محک نبود ${removeMode === 'zero' ? 'صفر شد' : 'حذف شد'}` : ''}`);
            };
            const handleSystemBackup = async () => {
                try {
                    const local = {};
                    for(let i=0;i<localStorage.length;i++){ const k=localStorage.key(i); if(k && k!==TRUSTED_UNLOCK_KEY) local[k]=localStorage.getItem(k); }
                    let secureEnvelope=null; try { secureEnvelope=await idbGet(IDB_DATA_KEY); } catch(e) {}
                    const data = {
                        format:'ANBARYAR_FULL_BACKUP', version:2, appBuild:APP_BUILD, schemaVersion:APP_SCHEMA_VERSION, date:new Date().toISOString(),
                        data:{items,invoices,notes,transactions,purchases,processingOrders,consignments},
                        settings:appSettings, localStorage:local, securityConfig:getSecurityConfig(), secureEnvelope,
                        embedded:{
                            estelamLocal:localStorage.getItem('freightAppData_v2'),
                            userPurchasesLocal:{autoBackup:localStorage.getItem('autoBackup'),theme:localStorage.getItem('theme')},
                            invDb:{products:await getIDBAll('InvDB_v4','products'),history:await getIDBAll('InvDB_v4','history')}
                        }
                    };
                    const blob=new Blob([JSON.stringify(data)],{type:'application/json'}); const url=URL.createObjectURL(blob); const a=document.createElement('a');
                    a.href=url; a.download=`AnbarYar-Full-Backup-${new Date().toLocaleDateString('fa-IR').replace(/\//g,'-')}-${new Date().toTimeString().slice(0,5).replace(/:/g,'-')}.aybackup.json`;
                    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url); toast.show('پشتیبان کامل تمام برنامه ساخته شد'); return true;
                } catch(err){ console.error(err); toast.show('ساخت پشتیبان کامل ناموفق بود'); return false; }
            };

            const handleSystemRestore = (e) => {
                const file = e.target.files?.[0];
                if(!file) return;
                const reader = new FileReader();
                reader.onload = async (evt) => {
                    try {
                        const raw = JSON.parse(evt.target?.result || 'null');
                        // پشتیبانی از چند نسل فرمت بکاپ: بکاپ کامل جدید، payload مستقیم،
                        // و فایل‌هایی که داده‌ها را داخل data قرار داده‌اند.
                        const source = raw?.format === 'ANBARYAR_FULL_BACKUP'
                            ? (raw.data || {})
                            : (raw?.data && (raw.data.items || raw.data.invoices) ? raw.data : raw);
                        const restored = normalizeData(JSON.parse(JSON.stringify(source || {})));
                        const hasCoreData = Array.isArray(restored.items) && Array.isArray(restored.invoices);
                        if(!hasCoreData) throw new Error('ساختار بکاپ شناخته نشد یا فایل داده‌های اصلی را ندارد.');

                        const ok = await confirmAction('بازگردانی پشتیبان انجام شود؟ اطلاعات فعلی جایگزین می‌شود. قبل از جایگزینی یک پشتیبان خودکار ساخته می‌شود.');
                        if(!ok) return;

                        // ابتدا یک نسخه از وضعیت فعلی نگه می‌داریم؛ خرابی بکاپ خارجی نباید
                        // باعث از دست رفتن اطلاعات فعلی شود.
                        const preBackupOk = await handleSystemBackup();
                        if(preBackupOk === false) throw new Error('ساخت بکاپ قبل از بازیابی ناموفق بود.');

                        // داده خام بکاپ را با ساختار نرمال‌شده وارد state می‌کنیم.
                        setItems(restored.items);
                        setInvoices(restored.invoices);
                        setNotes(restored.notes);
                        setTransactions(restored.transactions);
                        setPurchases(restored.purchases);
                        setProcessingOrders(restored.processingOrders);
                        setConsignments(restored.consignments);

                        if(raw?.format === 'ANBARYAR_FULL_BACKUP' && raw.settings && typeof raw.settings === 'object') {
                            const merged = { ...appSettings, ...raw.settings };
                            setAppSettings(merged);
                            saveSettings(merged);
                        } else if(raw?.settings && typeof raw.settings === 'object') {
                            const merged = { ...appSettings, ...raw.settings };
                            setAppSettings(merged);
                            saveSettings(merged);
                        }

                        // نکته مهم: secureEnvelope و securityConfig بکاپ خارجی الزاماً با
                        // کلید/رمز همین اجرای برنامه ساخته نشده‌اند. بنابراین آن‌ها را کورکورانه
                        // جایگزین نمی‌کنیم؛ داده بازیابی‌شده را با کلید امنیتی فعلی دوباره ذخیره می‌کنیم.
                        await saveData(
                            restored.items,
                            restored.invoices,
                            restored.notes,
                            restored.transactions,
                            restored.purchases,
                            restored.processingOrders,
                            restored.consignments
                        );

                        // ابزارهای داخلیِ بکاپ کامل همچنان برگردانده شوند، ولی کلید امنیتی/ورود موقت دست‌نخورده بماند.
                        if(raw?.localStorage && typeof raw.localStorage === 'object') {
                            Object.entries(raw.localStorage).forEach(([k,v]) => {
                                if(k === TRUSTED_UNLOCK_KEY || k === SECURITY_KEY || k === STORAGE_KEY) return;
                                try { localStorage.setItem(k,v); } catch(e) {}
                            });
                        }
                        if(raw?.embedded?.estelamLocal != null) {
                            try { localStorage.setItem('freightAppData_v2', raw.embedded.estelamLocal); } catch(e) {}
                        }
                        if(raw?.embedded?.userPurchasesLocal) {
                            Object.entries(raw.embedded.userPurchasesLocal).forEach(([k,v]) => {
                                if(v != null) try { localStorage.setItem(k,v); } catch(e) {}
                            });
                        }
                        if(raw?.embedded?.invDb) {
                            await restoreIDBAll('InvDB_v4','products',raw.embedded.invDb.products || []);
                            await restoreIDBAll('InvDB_v4','history',raw.embedded.invDb.history || []);
                        }

                        toast.show('✅ بازیابی کامل انجام شد و اطلاعات با امنیت فعلی برنامه ذخیره شد. برای اطمینان یک بار برنامه را بازخوانی کنید.');
                    } catch(err) {
                        console.error('System restore failed:', err);
                        toast.show('❌ بازیابی انجام نشد: ' + (err?.message || 'فایل نامعتبر یا خراب است'));
                    } finally {
                        e.target.value = '';
                    }
                };
                reader.onerror = () => { e.target.value = ''; toast.show('❌ خواندن فایل بکاپ انجام نشد.'); };
                reader.readAsText(file);
            };

            const [warehouseFilter, setWarehouseFilter] = useState('');
            const filteredItems = useMemo(() => items.filter(i => smartItemMatch(i, searchTerm) && (!warehouseFilter || (warehouseFilter === '__none__' ? !i.warehouseId : i.warehouseId === warehouseFilter))), [items, searchTerm, warehouseFilter]);
            const grouped = useMemo(() => {
                const g = {}; filteredItems.forEach(i => { if(!g[i.name]) g[i.name]=[]; g[i.name].push(i); });
                return g;
            }, [filteredItems]);

            const reservedCounts = useMemo(() => {
                const c = {};
                // فقط بخشِ «نرفته»‌ی هر ردیف (qty - shippedQty) رزرو محسوب می‌شود؛ بخشی که با «ثبت ارسال» رفته، دیگر رزرو نیست
                invoices.filter(inv => inv.status === 'pending').forEach(inv => inv.items.forEach(i => { if(!i.isManual) { const remain = (Number(i.qty)||0) - (Number(i.shippedQty)||0); if (remain > 0) c[i.itemId] = (c[i.itemId]||0) + remain; } }));
                // رزرو ناشی از سفارش‌های آنالیز/پردازش که هنوز ارسال نشده‌اند (status: reserved)
                const processingReservedMap = getProcessingReservedMap(processingOrders);
                Object.keys(processingReservedMap).forEach(id => { c[id] = (c[id]||0) + processingReservedMap[id]; });
                return c;
            }, [invoices, processingOrders]);

            // شناسایی بارهای کاملاً تکراری (هم‌نام، هم‌برند، هم‌تگ) که معمولاً باید با «ادغام کالا» یکی شوند؛
            // مثلاً وقتی یک کالا چند بار به‌اشتباه دستی یا از اکسل دوباره ثبت شده باشد.
            const duplicateItemGroups = useMemo(() => {
                const map = {};
                items.forEach(it => {
                    const key = normalizeMahakName(`${it.name}|${it.brand || ''}|${it.tag || ''}`);
                    if (!map[key]) map[key] = [];
                    map[key].push(it);
                });
                return Object.values(map).filter(g => g.length > 1);
            }, [items]);

            const getTitle = () => {
                switch(view) {
                    case 'mahak-import': return 'همگام‌سازی موجودی محک';
                    case 'mother-bag-stock': return 'موجودی کیسه مادر';
                    case 'pos': return editingInvoice ? 'ویرایش فاکتور' : 'صدور فاکتور';
                    case 'history': return 'گزارش فاکتورها';
                    case 'purchases': return 'خرید کالا (در راه)';
                    case 'processing': return 'آنالیز / پردازش';
                    case 'consignments': return 'امانی (قرض بار)';
                    case 'estelam': return 'استعلام';
                    case 'backup': return 'پشتیبان‌گیری کلی';
                    case 'notes': return 'یادداشت‌ها';
                    case 'settings': return 'تنظیمات';
                    case 'critical': return 'بارهای بحرانی';
                    case 'reminders': return 'سررسیدها و پیگیری مشتریان';
                    case 'check-rass': return 'راس‌گیری چک';
                    case 'inventory-master': return 'گزارش مرکزی موجودی';
                    case 'today-exits': return '🚚 خروج امروز';
                    case 'partial-shipments': return 'بارهای نیمه‌رفته';
                    case 'item-flow': return 'کجا رفت؟ (گردش کالا)';
                    default: return 'داشبورد';
                }
            };

            const handleUpdateInvoiceDate = (invoiceId, oldDate, newDate) => {
                const now = new Date().toLocaleDateString('fa-IR');
                setInvoices(prev => prev.map(inv => {
                    if (inv.id !== invoiceId) return inv;
                    const log = { from: oldDate, to: newDate, changedAt: now };
                    const logs = Array.isArray(inv.dateChangeLogs) ? [...inv.dateChangeLogs, log] : [log];
                    return { ...inv, date: newDate, dateChangeLogs: logs };
                }));
            };

            const handleSaveSettings = (s) => {
                const nextSettings = { ...loadSettings(), ...s, criticalMutes: s.criticalMutes || appSettings.criticalMutes || {} };
                setAppSettings(nextSettings);
                saveSettings(nextSettings);
                // فاکتورهای pending همچنان از نرخ جدید استفاده می‌کنند (بدون snapshot)
                // فاکتورهای completed که هنوز snapshot ندارند، نرخ فعلی را به عنوان نرخ تاریخی ثبت می‌کنیم
                setInvoices(prev => prev.map(inv => {
                    if (inv.status === 'completed' && inv.snapshotLoadingCostPerTon === undefined) {
                        // فاکتورهای قدیمی که snapshot نداشتند: از نرخ قبلی (قبل از تغییر) استفاده می‌کنیم
                        return { ...inv, snapshotLoadingCostPerTon: appSettings.loadingCostPerTon };
                    }
                    return inv;
                }));
            };

            return (
                <div className="app-shell flex flex-col md:flex-row min-h-screen font-[Vazirmatn]">
                    <Sidebar view={view} setView={navigateTo} items={items} invoices={invoices} reservedCounts={reservedCounts} lowStockThreshold={appSettings.lowStockThreshold ?? 100} />
                    <main className="flex-1 p-4 md:p-8 overflow-y-auto h-screen">
                        <Header lastSaved={lastSaved} title={getTitle()} />
                        <GroupTabs view={view} setView={navigateTo} />
                        <div className="h-5"></div>
                        {view === 'dashboard' && (
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                                <div className="lg:col-span-9 flex flex-col gap-6">
                                    <InventoryStats items={items} invoices={invoices} processingOrders={processingOrders} purchases={purchases} />

                                    {/* Excel/Backup Actions */}
                                    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-3 flex flex-col sm:flex-row gap-3">
                                        <div className="relative flex-1">
                                            <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
                                            <input className="w-full bg-slate-50 border border-slate-100 rounded-full py-2.5 pr-11 pl-4 text-sm outline-none focus:border-indigo-300 focus:bg-white transition" placeholder="جستجو در کالاها..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)}/>
                                        </div>
                                        {(appSettings.warehouses || []).length > 0 && (
                                            <div className="relative">
                                                <select className="h-full bg-slate-50 border border-slate-100 rounded-full py-2.5 pr-8 pl-3 text-sm font-bold text-slate-600 outline-none focus:border-indigo-300 appearance-none" value={warehouseFilter} onChange={e => setWarehouseFilter(e.target.value)}>
                                                    <option value="">همه انبارها</option>
                                                    <option value="__none__">بدون انبار</option>
                                                    {appSettings.warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                                                </select>
                                                <Warehouse className="absolute right-3 top-3 text-slate-400 pointer-events-none" size={16}/>
                                            </div>
                                        )}
                                        <div className="flex gap-2 flex-wrap">
                                            {/* View Mode Toggle */}
                                            <div className="flex bg-slate-50 border border-slate-100 rounded-full overflow-hidden shadow-sm">
                                                <button onClick={() => setInventoryViewMode('card')} className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold transition rounded-full ${inventoryViewMode === 'card' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:bg-white'}`}><LayoutList size={15}/> کارت</button>
                                                <button onClick={() => setInventoryViewMode('table')} className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold transition rounded-full ${inventoryViewMode === 'table' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:bg-white'}`}><Table2 size={15}/> جدول</button>
                                            </div>
                                            <button onClick={handleSystemBackup} className="flex items-center gap-1 bg-slate-800 text-white px-3.5 py-2 rounded-full text-xs font-bold hover:bg-slate-900 transition"><Save size={16}/> بکاپ</button>
                                            <label className="flex items-center gap-1 bg-slate-50 border border-slate-100 px-3.5 py-2 rounded-full cursor-pointer text-xs font-bold hover:bg-white transition"><Upload size={16}/> بازگردانی <input type="file" className="hidden" onChange={handleSystemRestore}/></label>
                                            <button onClick={()=>exportToExcel(items, appSettings.warehouses)} className="flex items-center gap-1 bg-emerald-600 text-white px-3.5 py-2 rounded-full text-xs font-bold hover:bg-emerald-700 transition"><Download size={16}/> خروجی</button>
                                            <label className="flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 px-3.5 py-2 rounded-full cursor-pointer text-xs font-bold hover:bg-emerald-100 transition"><FileSpreadsheet size={16}/> ورود اکسل <input type="file" className="hidden" onChange={handleFileUpload}/></label>
                                            <button onClick={()=>navigateTo('mahak-import')} className="flex items-center gap-1 bg-brass-500 text-white px-3.5 py-2 rounded-full text-xs font-black hover:bg-brass-600 transition"><FileSpreadsheet size={16}/> همگام‌سازی محک</button>
                                        </div>
                                    </div>

                                    <AddItemForm onAdd={handleAdd} items={items} warehouses={appSettings.warehouses} />
                                    
                                    <div className="space-y-4">
                                        {Object.keys(grouped).sort().map(name => (
                                            <InventoryGroup key={name} name={name} items={grouped[name]} reservedCounts={reservedCounts} onUpdateQuantity={handleUpdateQuantity} onDelete={handleDelete} onEdit={setEditingItem} onShowHistory={setHistoryItem} onMerge={setMergeItem} onCount={setCountingItem} viewMode={inventoryViewMode} lowStockThreshold={appSettings.lowStockThreshold ?? 100} warehouses={appSettings.warehouses} />
                                        ))}
                                    </div>
                                </div>
                                <div className="lg:col-span-3 h-full">
                                    <PendingOrders invoices={invoices} onFinalizeShipment={handleFinalizeInvoiceWithShipments} onCancel={handleCancelPending} onEdit={(inv)=>{setEditingInvoice(inv); setView('pos');}} settings={appSettings} inventoryItems={items} purchases={purchases} processingOrders={processingOrders} consignments={consignments} onNavigate={navigateTo} onDeleteConsignment={handleDeleteConsignment} onManageConsignment={(c)=>{ setConsignFocus(c.party || ''); navigateTo('consignments'); }} />
                                </div>
                            </div>
                        )}
                        {view === 'mahak-import' && <AYErrorBoundary><MahakImportView items={items} settings={appSettings} onSaveSettings={handleSaveSettings} onApplySync={handleMahakApplySync} onBackup={handleSystemBackup} onClose={()=>navigateTo('dashboard')} /></AYErrorBoundary>}
                        {view === 'mother-bag-stock' && <AYErrorBoundary><MotherBagStockView settings={appSettings} onSaveSettings={handleSaveSettings} invoices={invoices} items={items} onEditInvoice={(inv)=>{setEditingInvoice(inv); setView('pos');}} /></AYErrorBoundary>}
                        {view === 'pos' && <AYErrorBoundary><POS key={editingInvoice ? editingInvoice.id : 'new'} items={items} invoices={invoices} processingOrders={processingOrders} purchases={purchases} initialData={editingInvoice} onFinalize={handleFinalize} settings={appSettings} onUpdateSettings={handleSaveSettings} onFinalizeShipment={handleFinalizeInvoiceWithShipments} /></AYErrorBoundary>}
                        {view === 'history' && <AYErrorBoundary><InvoiceHistory invoices={invoices} settings={appSettings} onEdit={(inv)=>{setEditingInvoice(inv); setView('pos');}} inventoryItems={items} onUpdateDate={handleUpdateInvoiceDate} purchases={purchases} processingOrders={processingOrders} /></AYErrorBoundary>}
                        {view === 'purchases' && <AYErrorBoundary><PurchaseView items={items} purchases={purchases} warehouses={appSettings.warehouses} onAdd={handleAddPurchase} onReceive={handleReceivePurchase} onCancel={handleCancelPurchase} onEdit={handleEditPurchase} onDelete={handleDeletePurchase} /></AYErrorBoundary>}
                        {view === 'processing' && <AYErrorBoundary><EmptyBagPanel orders={processingOrders} stock={appSettings.emptyBagStock} /></AYErrorBoundary>}
                        {view === 'processing' && <AYErrorBoundary><ProcessingView items={items} orders={processingOrders} onAdd={handleAddProcessing} onSend={handleSendProcessing} onCancel={handleCancelProcessing} onReturn={handleReturnProcessing} onEdit={handleEditProcessing} onDelete={handleDeleteProcessing} onMerge={handleMergeProcessing} /></AYErrorBoundary>}
                        {view === 'consignments' && <AYErrorBoundary><ConsignmentView items={items} consignments={consignments} onAdd={handleAddConsignment} onReturn={handleReturnConsignment} onEdit={handleEditConsignment} onDelete={handleDeleteConsignment} onMerge={handleMergeConsignments} focusParty={consignFocus} /></AYErrorBoundary>}
                        {view === 'estelam' && <AYErrorBoundary><EmbeddedToolView type="estelam" /></AYErrorBoundary>}
                        {view === 'backup' && (
                            <div className="max-w-4xl mx-auto">
                                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
                                    <div className="flex items-center gap-3"><div className="bg-indigo-100 text-indigo-600 p-3 rounded-2xl"><Save size={22}/></div><div><h2 className="text-xl font-black text-slate-800">پشتیبان‌گیری کلی</h2><p className="text-xs text-slate-400 mt-1">تمام اطلاعات، تنظیمات و داده‌های ابزارهای داخلی در یک فایل ذخیره می‌شوند.</p></div></div>
                                    <div className="grid md:grid-cols-2 gap-3 mt-5"><div className="rounded-2xl bg-slate-50 border border-slate-100 p-4 text-xs text-slate-600 leading-6"><b>شامل:</b> کالاها، فاکتورها، خرید، بار در راه، امانی، پردازش، یادداشت‌ها، تنظیمات و داده‌های ابزارهای داخلی.</div><div className="rounded-2xl bg-emerald-50 border border-emerald-100 p-4 text-xs text-emerald-700 leading-6"><b>امنیت:</b> کلید ورود موقت ۳۰ دقیقه‌ای در Backup ذخیره نمی‌شود.</div></div>
                                    <div className="flex flex-wrap gap-3 mt-5"><button onClick={handleSystemBackup} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 rounded-full text-sm font-black transition"><Save size={18}/> ساخت پشتیبان کامل</button><label className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-5 py-3 rounded-full text-sm font-black cursor-pointer hover:bg-slate-50 transition"><Upload size={18}/> بازیابی<input type="file" accept=".json,.aybackup" className="hidden" onChange={handleSystemRestore}/></label></div>
                                </div>
                                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 mt-5">
                                    <div className="flex items-center gap-3"><div className="bg-teal-100 text-teal-600 p-3 rounded-2xl"><Wrench size={22}/></div><div><h2 className="text-xl font-black text-slate-800">تعمیر ارجاع‌های ادغام قدیمی</h2><p className="text-xs text-slate-400 mt-1">اگر قبل از این نسخه، بارهایی را ادغام کرده بودی که هنوز در امانی/خرید/پردازش گم می‌شدند، اینجا یک‌باره اصلاح می‌شود.</p></div></div>
                                    <button onClick={handleRepairMergedReferences} className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-5 py-3 rounded-full text-sm font-black mt-4 transition"><Wrench size={18}/> بررسی و تعمیر ارجاع‌های قدیمی</button>
                                </div>
                                {duplicateItemGroups.length > 0 && (
                                    <div className="bg-white rounded-3xl border border-amber-200 shadow-sm p-6 mt-5">
                                        <div className="flex items-center gap-3"><div className="bg-amber-100 text-amber-600 p-3 rounded-2xl"><AlertTriangle size={22}/></div><div><h2 className="text-xl font-black text-slate-800">بارهای کاملاً تکراری ({duplicateItemGroups.length} گروه)</h2><p className="text-xs text-slate-400 mt-1">این بارها دقیقاً هم‌نام/هم‌برند/هم‌تگ هستند (مثلاً از ثبت دستی یا ورود اکسل تکراری) — پیشنهاد می‌شود با «ادغام کالا» یکی شوند تا در سرچ چند بار نمایش داده نشوند.</p></div></div>
                                        <div className="space-y-2 mt-4">
                                            {duplicateItemGroups.map((g, idx) => (
                                                <div key={idx} className="flex items-center justify-between gap-2 bg-amber-50 border border-amber-100 rounded-xl p-3 text-sm">
                                                    <div>
                                                        <span className="font-bold text-slate-700">{g[0].name}</span>
                                                        <ItemDistinguishBadges item={g[0]}/>
                                                        <span className="text-xs text-amber-700 mr-2 font-bold">{g.length} نسخهٔ تکراری</span>
                                                    </div>
                                                    <button onClick={() => setMergeItem(g[0])} className="text-xs bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 rounded-lg font-bold shrink-0">ادغام کن</button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                        {view === 'notes' && <AYErrorBoundary><Notes notes={notes} onUpdateNotes={setNotes} /></AYErrorBoundary>}
                        {view === 'docs' && <AYErrorBoundary><AppDocsView /></AYErrorBoundary>}
                        {view === 'reminders' && <AYErrorBoundary><RemindersView invoices={invoices} onSettleInvoice={handleSettleInvoice} onEditInvoice={(inv)=>{setEditingInvoice(inv); setView('pos');}} inventoryItems={items} appSettings={appSettings} onSaveSettings={handleSaveSettings} /></AYErrorBoundary>}
                        {view === 'check-rass' && <AYErrorBoundary><CheckRassView invoices={invoices} appSettings={appSettings} onSaveSettings={handleSaveSettings} /></AYErrorBoundary>}
                        {view === 'inventory-master' && <AYErrorBoundary><InventoryMasterView items={items} reservedCounts={reservedCounts} purchases={purchases} warehouses={appSettings.warehouses} /></AYErrorBoundary>}
                        {view === 'today-exits' && <AYErrorBoundary><TodayExitsView invoices={invoices} /></AYErrorBoundary>}
                        {view === 'partial-shipments' && <AYErrorBoundary><PartialShipmentsView invoices={invoices} /></AYErrorBoundary>}
                        {view === 'item-flow' && <AYErrorBoundary><ItemFlowView items={items} transactions={transactions} onOpenHistory={setHistoryItem} /></AYErrorBoundary>}
                        {view === 'settings' && <AYErrorBoundary><SettingsView settings={appSettings} onSave={handleSaveSettings} /></AYErrorBoundary>}
                        {view === 'critical' && <AYErrorBoundary><CriticalItemsView items={items} reservedCounts={reservedCounts} lowStockThreshold={appSettings.lowStockThreshold ?? 100} criticalMutes={appSettings.criticalMutes || {}} criticalGroups={appSettings.criticalGroups || []} onSaveCriticalGroups={(groups)=>{ setAppSettings(prev=>{ const next={...prev, criticalGroups: groups}; saveSettings(next); return next; }); }} onToggleMute={(id,mode)=>{ setAppSettings(prev=>{ const m={...(prev.criticalMutes||{})}; if(mode==='unmute') delete m[id]; else if(mode==='snooze') m[id]=Date.now()+3600000; else m[id]=-1; const next={...prev,criticalMutes:m}; saveSettings(next); return next; }); }} onSelectItem={(item) => { setSearchTerm(`${item.name}${item.brand ? ' ' + item.brand : ''}`); navigateTo('dashboard'); }} /></AYErrorBoundary>}
                    </main>
                    {editingItem && <EditItemModal item={editingItem} invoices={invoices} processingOrders={processingOrders} purchases={purchases} warehouses={appSettings.warehouses} onClose={()=>setEditingItem(null)} onSave={handleSaveItem} />}
                    {historyItem && <HistoryModal item={historyItem} transactions={transactions} invoices={invoices} purchases={purchases} processingOrders={processingOrders} consignments={consignments} onViewDocument={(row)=>{ if(!row) return; if(row.kind==='invoice') setViewInvoice(row.data); else setViewDocument(row); }} onClose={()=>setHistoryItem(null)} />}
                    {mergeItem && <MergeInventoryModal baseItem={mergeItem} items={items} reservedCounts={reservedCounts} warehouses={appSettings.warehouses} onClose={()=>setMergeItem(null)} onConfirm={handleMergeInventory} />}
                    {excelPreview && <ExcelImportPreviewModal rows={excelPreview} onClose={()=>setExcelPreview(null)} onConfirm={handleConfirmExcelImport} />}
                    {countingItem && <InventoryCountModal item={countingItem} onClose={()=>setCountingItem(null)} onConfirm={handleAdjustInventory} />}
                    {viewDocument && <DocumentDetailsModal row={viewDocument} inventoryItems={items} onClose={()=>setViewDocument(null)} />}
                    {viewInvoice && <PrintInvoiceModal invoice={viewInvoice} settings={appSettings} onClose={()=>setViewInvoice(null)} inventoryItems={items} />}
                    {showSecurityCenter && <SecurityCenter appSettings={appSettings} setAppSettings={setAppSettings} onClose={()=>setShowSecurityCenter(false)} />}
                </div>
            );
        };
