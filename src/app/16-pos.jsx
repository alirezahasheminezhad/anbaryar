//## ═══ app/16-pos.jsx ═══
//## صدور فاکتور فروش (POS): سبد، هشدار افت قیمت، هزینه‌ی بارگیری، سررسید، ثبت نهایی.
//## ترتیب فایل‌ها در build.py مهم است؛ همه‌ی بخش‌ها یک scope مشترک دارند.
        const POS = ({ items, invoices, processingOrders, purchases, initialData, onFinalize, settings, onUpdateSettings, onFinalizeShipment }) => {
            const [cart, setCart] = useState(initialData?.items || []);
            // نسخه‌ی زنده‌ی همین فاکتور از آرایه‌ی invoices — برای اینکه بدانیم آیا این یک فاکتورِ رزروِ
            // موجود است و باید دکمه‌ی «ثبت نهایی» به‌جای ذخیره‌ی معمولی، پاپ‌آپ «تایید نهایی/ارسال» را باز کند
            const liveInvoice = initialData ? (invoices.find(i => i.id === initialData.id) || initialData) : null;
            const [showFinalizeShipmentModal, setShowFinalizeShipmentModal] = useState(false);
            const [customer, setCustomer] = useState(initialData?.customer || '');
            const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false);
            const [date, setDate] = useState(initialData?.date || new Date().toLocaleDateString('fa-IR'));
            // مقدار اولیه‌ی تاریخ (هنگام باز شدن فرم) — برای تشخیص اینکه کاربر همین حالا/همین جلسه واقعاً تاریخ را
            // دستی عوض کرده یا نه (نه اینکه صرفاً یک فاکتور قدیمی را بدون تغییر تاریخ ویرایش می‌کند).
            const initialDateRef = useRef(initialData?.date || new Date().toLocaleDateString('fa-IR'));
            const [description, setDescription] = useState(initialData?.description || '');
            const [search, setSearch] = useState('');
            const [showSearchDropdown, setShowSearchDropdown] = useState(false);
            const [showConfirm, setShowConfirm] = useState(false);
            const [pendingMode, setPendingMode] = useState(false);
            const [showLoadingReview, setShowLoadingReview] = useState(false);
            // پاپ‌آپ «تولید و کپی توضیحات»: کلیدهای نمایش بخش‌ها + حالت محاسبه‌ی وزن/تعداد (فقط روی متن، نه روی فاکتور)
            const DESC_DEFAULTS = { weight: true, brand: true, tag: true, motherBag: true, totals: false };
            const [showDescModal, setShowDescModal] = useState(false);
            const [descOpts, setDescOpts] = useState(DESC_DEFAULTS);
            const [descTab, setDescTab] = useState('view'); // 'view' | 'calc'
            const [calcRows, setCalcRows] = useState({}); // itemId → { weight?, qty?, choice? ('split'|'none') }
            const [loadingReviewMode, setLoadingReviewMode] = useState(false);
            // انتخاب فقط برای همین فاکتور؛ هیچ ترجیحی برای مشتری ذخیره نمی‌شود. موقع ویرایش یک فاکتور قبلی،
            // همان انتخابِ قبلی‌اش حفظ می‌شود (نه همیشه روشن)؛ فقط برای فاکتور کاملاً جدید پیش‌فرض روشن است.
            const [includeLoadingCostChoice, setIncludeLoadingCostChoice] = useState(initialData ? (initialData.includeLoadingCost !== false) : true);
            // مهلت/شرایط تسویه فقط برای همین فاکتور؛ مثل «نقدی»، «۱۵ روز»، «۱ ماه» یا هر متن دستی.
            const [settlementTerm, setSettlementTerm] = useState(initialData?.settlementTerm || '');
            // سررسید دقیق تسویه/چک (تاریخ ISO داخلی، ورودی و نمایش برای کاربر بر مبنای تقویم شمسی دقیق)
            const [dueDate, setDueDate] = useState(initialData?.dueDate || '');
            const initialDueJ = toJalaliInput(initialData?.dueDate || '');
            const [dueJYear, setDueJYear] = useState(initialDueJ.jy || '');
            const [dueJMonth, setDueJMonth] = useState(initialDueJ.jm || '');
            const [dueJDay, setDueJDay] = useState(initialDueJ.jd || '');
            const updateDueDate = (jy, jm, jd) => setDueDate(jy && jm && jd ? fromJalaliInput(jy, jm, jd) : '');
            // اگر با تغییر سال/ماه، روزِ فعلاً انتخاب‌شده دیگر در آن ماه معنا نداشته باشد (مثلاً ۳۰ اسفند بعد از
            // خروج از سال کبیسه)، به آخرین روز معتبر همان ماه محدود می‌شود تا سررسید بی‌صدا یک روز جابه‌جا نشود.
            const updateDueDateClamped = (jy, jm, jd) => {
                const maxD = daysInJalaliMonth(jy, jm);
                const clampedD = jd && Number(jd) > maxD ? String(maxD) : jd;
                if (clampedD !== jd) setDueJDay(clampedD);
                updateDueDate(jy, jm, clampedD);
            };
            // محاسبه‌ی سریع سررسید: کاربر فقط تعداد روز را می‌نویسد (مثلاً ۶۰) و می‌گوید شمارش از امروز باشد
            // یا از فردا؛ نتیجه فقط برای پرکردن اولیه‌ی فیلدهای سال/ماه/روز بالاست، بعدش مثل قبل کاملاً دستی
            // قابل ویرایش می‌ماند (متن آزاد «مهلت تسویه» هم کاملاً مستقل و دست‌نخورده باقی می‌ماند).
            const [quickDueDays, setQuickDueDays] = useState('');
            const [quickDueBase, setQuickDueBase] = useState('today');
            // رفع باگ: قبلاً همیشه از new Date() واقعی حساب می‌کرد، حتی وقتی تاریخ فاکتور دستی تغییر کرده بود.
            // حالا Base Date مرکزی همیشه «تاریخ فاکتور» (فیلد date همین فرم) است — از نگاه کاربر، هرچه در فیلد
            // «تاریخ» نوشته شده همان «امروزِ» این سند است، چه واقعاً امروز باشد چه دستی عوض شده باشد. اگر با
            // امروزِ واقعیِ سیستم فرق داشت، قبل از محاسبه یک‌بار تاییدیه گرفته می‌شود تا سهوی نباشد.
            const applyQuickDueDays = async () => {
                const n = parseInt(quickDueDays, 10);
                if (!n || n <= 0) return;
                if (isJalaliDateStrDifferentFromToday(date)) {
                    const todayDisplay = formatJalali(new Date().toISOString());
                    const ok = await confirmAction(`تاریخ این فاکتور «${date}» است، نه امروزِ واقعی «${todayDisplay}». سررسید بر همین مبنای تاریخِ فاکتور محاسبه خواهد شد. تایید می‌کنید؟`, { danger: false });
                    if (!ok) return;
                }
                const invDateParsed = parseJalaliDisplayDate(date);
                let baseDate = new Date();
                if (invDateParsed) {
                    const g = jalaliToGregorian(invDateParsed.jy, invDateParsed.jm, invDateParsed.jd);
                    baseDate = new Date(g.gy, g.gm - 1, g.gd);
                }
                // شمارش شامل روز شروع است: در حالت «تاریخ فاکتور»، خودِ آن روز، روز اول شمرده می‌شود (پس N روز
                // یعنی تاریخ فاکتور + N-1)؛ در حالت «روز بعد»، روز بعد از فاکتور روز اول است (یعنی + N).
                const offsetDays = quickDueBase === 'tomorrow' ? n : (n - 1);
                const base = new Date(baseDate);
                base.setDate(base.getDate() + offsetDays);
                const j = toJalaliInput(base.toISOString());
                setDueJYear(j.jy); setDueJMonth(j.jm); setDueJDay(j.jd);
                updateDueDate(j.jy, j.jm, j.jd);
            };
            const [showManualModal, setShowManualModal] = useState(false);
            // علت ویرایش فاکتور: هنگام ویرایش یک فاکتور موجود، از کاربر علت تغییر پرسیده می‌شود و در
            // invoice.changeLogs ذخیره می‌گردد تا در گزارش فاکتورها و پرینت/جزئیات قابل مشاهده باشد.
            const [changeReason, setChangeReason] = useState('');
            const isEditMode = !!initialData;
            const [editingCartItem, setEditingCartItem] = useState(null);
            const [cartEditSuggestions, setCartEditSuggestions] = useState([]);
            const [showCartEditSugg, setShowCartEditSugg] = useState(false);
            const [showPrint, setShowPrint] = useState(false);
            const searchRef = useRef(null);
            const toast = useToast();
            const confirmAction = useConfirm();
            // آیا کاربر همین جلسه، تاریخ فاکتور را واقعاً نسبت به مقدار اولیه‌ی فرم تغییر داده؟ (نه صرفاً اینکه
            // فاکتور قدیمی باز شده و تاریخِ قدیمی‌اش طبیعتاً با امروز فرق دارد)
            const dateChangedThisSession = useMemo(() => {
                const a = parseJalaliDisplayDate(date);
                const b = parseJalaliDisplayDate(initialDateRef.current);
                if (!a || !b) return date !== initialDateRef.current;
                return !(a.jy === b.jy && a.jm === b.jm && a.jd === b.jd);
            }, [date]);
            // Base Date مرکزی این فاکتور: فقط وقتی که کاربر همین جلسه تاریخ را عوض کرده و آن تاریخِ جدید هم با
            // امروزِ واقعی سیستم فرق دارد، «تاریخ دستی» در نظر گرفته می‌شود.
            const dateIsManualNonToday = dateChangedThisSession && isJalaliDateStrDifferentFromToday(date);

            // هشدار خروج با تغییرات ذخیره‌نشده: اگر سبد فروش خالی نباشد (فاکتور جدید) یا نسبت به حالت
            // اولیه‌اش تغییر کرده باشد (ویرایش فاکتور موجود)، با بستن/رفرش تب همان هشدار استاندارد
            // مرورگر نشان داده می‌شود تا اطلاعات به‌اشتباه از دست نرود.
            const posInitialSnapshotRef = useRef(JSON.stringify({ items: initialData?.items || [], customer: initialData?.customer || '', description: initialData?.description || '' }));
            useEffect(() => {
                const hasUnsavedWork = isEditMode
                    ? JSON.stringify({ items: cart, customer, description }) !== posInitialSnapshotRef.current
                    : cart.length > 0;
                if (!hasUnsavedWork) return;
                const handleBeforeUnload = (e) => { e.preventDefault(); e.returnValue = ''; };
                window.addEventListener('beforeunload', handleBeforeUnload);
                return () => window.removeEventListener('beforeunload', handleBeforeUnload);
            }, [cart, customer, description, isEditMode]);

            // یادداشت‌های مهم/توجه فاکتور: کتابخانه‌ای از یادداشت‌های آماده (ذخیره‌شده در تنظیمات کلی برنامه)
            // که کاربر می‌تواند برای هر فاکتور، هرکدام را انتخاب/عدم انتخاب کند. متن نهایی انتخاب‌شده‌ها
            // به‌صورت اسنپ‌شات روی خودِ فاکتور ذخیره می‌شود (notices) تا ویرایش بعدی کتابخانه، فاکتورهای قبلی را تغییر ندهد.
            const standardNotices = settings.standardNotices || [];
            const [showNotices, setShowNotices] = useState(false);
            // برای فاکتور جدید (بدون initialData)، همه‌ی یادداشت‌های استاندارد به‌صورت پیش‌فرض تیک‌خورده‌اند
            // تا کاربر مجبور نباشد هر بار دستی انتخابشان کند؛ برای ویرایش فاکتور موجود، همان انتخاب‌های
            // ذخیره‌شده‌ی قبلی (noticeIds) حفظ می‌شود.
            const [selectedNoticeIds, setSelectedNoticeIds] = useState(
                initialData?.noticeIds || standardNotices.map(n => n.id)
            );
            const [newNoticeText, setNewNoticeText] = useState('');
            const [editingNoticeId, setEditingNoticeId] = useState(null);
            const [editingNoticeText, setEditingNoticeText] = useState('');

            const toggleNotice = (id) => setSelectedNoticeIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

            const addStandardNotice = () => {
                const text = newNoticeText.trim();
                if (!text) return;
                const id = 'ntc-' + Date.now();
                onUpdateSettings && onUpdateSettings({ ...settings, standardNotices: [...standardNotices, { id, text }] });
                setSelectedNoticeIds(prev => [...prev, id]);
                setNewNoticeText('');
            };
            const startEditNotice = (n) => { setEditingNoticeId(n.id); setEditingNoticeText(n.text); };
            const saveEditNotice = () => {
                const text = editingNoticeText.trim();
                if (!text) { setEditingNoticeId(null); return; }
                onUpdateSettings && onUpdateSettings({ ...settings, standardNotices: standardNotices.map(n => n.id === editingNoticeId ? { ...n, text } : n) });
                setEditingNoticeId(null); setEditingNoticeText('');
            };
            const deleteNotice = (id) => {
                onUpdateSettings && onUpdateSettings({ ...settings, standardNotices: standardNotices.filter(n => n.id !== id) });
                setSelectedNoticeIds(prev => prev.filter(x => x !== id));
            };
            const getSelectedNoticeTexts = () => selectedNoticeIds.map(id => standardNotices.find(n => n.id === id)?.text).filter(Boolean);

            const processingReservedMap = getProcessingReservedMap(processingOrders);
            const sellableIncomingMap = useMemo(() => getPurchaseSellableIncomingMap(purchases), [purchases]);
            const getRealStock = (item) => {
                const invoiceReserved = invoices.filter(inv => inv.status === 'pending' && inv.id !== initialData?.id).reduce((acc, inv) => {
                    const found = inv.items.find(i => i.itemId === item.id);
                    return acc + (found ? found.qty : 0);
                }, 0);
                const reserved = invoiceReserved + (processingReservedMap[item.id] || 0);
                return item.quantity - reserved + (sellableIncomingMap[item.id] || 0);
            };

            const filtered = items.filter(i => smartItemMatch(i, search));
            const customerSuggestions = useMemo(() => {
                const term = normalizePartyName(customer);
                const seen = new Map();
                (invoices || []).forEach(inv => {
                    const name = normalizePartyName(inv.customer);
                    if (!name) return;
                    const key = name.toLocaleLowerCase('fa-IR');
                    if (!term || key.includes(term.toLocaleLowerCase('fa-IR'))) {
                        if (!seen.has(key)) seen.set(key, { name, count: 0, lastDate: inv.date || '' });
                        const x = seen.get(key); x.count++; if (String(inv.date || '') > String(x.lastDate || '')) x.lastDate = inv.date;
                    }
                });
                return [...seen.values()].sort((a,b) => b.count - a.count).slice(0, 8);
            }, [invoices, customer]);

            // در حالت ویرایش، مقدار «stock» ذخیره‌شده روی هر ردیف سبد ممکن است مربوط به لحظه صدور اولیه‌ی
            // فاکتور باشد و با موجودی فعلی انبار هم‌خوان نباشد. این افکت یک‌بار (هنگام باز شدن ویرایش)
            // آن را با موجودیِ واقعیِ به‌روز (با احتساب رزروهای سایر فاکتورها، به‌جز خودِ همین فاکتور) هم‌گام می‌کند
            // تا هشدار «موجودی آزاد» و محاسبه‌ی نهایی موجودی هنگام ذخیره، درست و بدون خطا انجام شود.
            useEffect(() => {
                if (!initialData) return;
                setCart(prevCart => prevCart.map(c => {
                    if (c.isManual) return c;
                    const invItem = items.find(i => i.id === c.itemId);
                    if (!invItem) return c;
                    return { ...c, stock: getRealStock(invItem) };
                }));
                // eslint-disable-next-line react-hooks/exhaustive-deps
            }, [initialData?.id]);

            const addToCart = (item) => {
                const exist = cart.find(c => c.itemId === item.id);
                if (!exist) {
                    setCart([...cart, { itemId: item.id, name: item.name, brand: item.brand, tag: item.tag, unit: item.unit, qty: 1, weight: 0, price: 0, stock: getRealStock(item), isManual: false, deductionPerBag: item.deductionPerBag || null, deductionDate: item.deductionDate || null, bagWeight: item.bagWeight || null }]);
                }
                setSearch('');
                searchRef.current?.focus();
            };

            const addManualItem = (manualItem, linkedInventoryItem) => {
                if (linkedInventoryItem) {
                    const exist = cart.find(c => c.itemId === linkedInventoryItem.id);
                    if (exist) {
                        setCart(cart.map(c => c.itemId === linkedInventoryItem.id ? { ...c, qty: parseDecimal(manualItem.qty), weight: parseDecimal(manualItem.weight), price: parseDecimal(manualItem.price) } : c));
                    } else {
                        setCart([...cart, { itemId: linkedInventoryItem.id, name: linkedInventoryItem.name, brand: linkedInventoryItem.brand, tag: linkedInventoryItem.tag, unit: manualItem.unit || linkedInventoryItem.unit, qty: parseDecimal(manualItem.qty), weight: parseDecimal(manualItem.weight), price: parseDecimal(manualItem.price), stock: getRealStock(linkedInventoryItem), isManual: false, deductionPerBag: linkedInventoryItem.deductionPerBag || null, deductionDate: linkedInventoryItem.deductionDate || null, bagWeight: linkedInventoryItem.bagWeight || null }]);
                    }
                } else {
                    // توضیحات این ردیف کاملاً اختیاری است؛ اگر کاربر چیزی ننویسد، خالی می‌ماند و به‌صورت خودکار
                    // برچسب «دستی» تکراری (که قبلاً کنار برچسب خودکارِ «(دستی)» باعث نمایش «دستی دستی» می‌شد) اضافه نمی‌شود
                    setCart([...cart, { itemId: `manual-${generateId()}`, name: manualItem.name, brand: 'متفرقه', tag: (manualItem.tag || '').trim(), unit: manualItem.unit || 'عدد', qty: parseDecimal(manualItem.qty), weight: parseDecimal(manualItem.weight), price: parseDecimal(manualItem.price), stock: 99999, isManual: true }]);
                }
                setShowManualModal(false);
            };

            const updateCart = (id, field, val) => setCart(cart.map(c => c.itemId === id ? { ...c, [field]: Math.max(0, parseDecimal(val)) } : c));
            const removeCart = (id) => setCart(cart.filter(c => c.itemId !== id));
            const getItemsTotal = () => cart.reduce((sum, item) => sum + (item.weight * item.price), 0);
            const getCartWeight = () => cart.reduce((a, b) => a + (Number(b.weight) || 0), 0);
            const getLoadingCostAmount = () => calculateLoadingCost(getCartWeight(), settings.loadingCostPerTon || 0, settings.loadingWeightIncrementKg ?? 1000, settings.loadingWeightRoundUpThreshold ?? 0.9, settings.loadingMinWeightEnabled ? (settings.loadingMinWeightKg || 0) : 0);
            const getAppliedLoadingCostAmount = () => includeLoadingCostChoice ? getLoadingCostAmount() : 0;
            const getTotal = () => getItemsTotal() + getAppliedLoadingCostAmount();

            // تولید خودکار متن توضیحات فاکتور از روی اقلام سبد خرید (برای اعلام به انبار / انتشار در فضای مجازی)
            // هر کالا در یک خط جدا با یک بولت مشخص می‌شود تا در کپی/پیست به تلگرام، اینستاگرام و... مرتب و خوانا بماند،
            // و در انتها یک خط جمع‌بندی (تعداد قلم، تعداد کیسه، وزن کل) اضافه می‌شود.
            // o: کدام بخش‌ها نمایش داده شوند (پیش‌فرض = رفتار قبلی). calcRows: اصلاحِ دستیِ وزن/تعداد فقط برای همین متن.
            const generateAutoDescription = (o = DESC_DEFAULTS) => {
                if (cart.length === 0) return '';
                const eff = cart.map(c => { const ov = calcRows[c.itemId]; return ov ? { ...c, weight: ov.weight ?? c.weight, qty: ov.qty ?? c.qty, _choice: ov.choice } : c; });
                const RLM = '\u200F'; // اول هر خط، تا در تلگرام/واتساپ همه‌ی خط‌ها راست‌چین بمانند
                const blocks = eff.map(item => {
                    // تعیین اینکه آیا این ردیف باید معادل کیسه‌ی مادر بگیرد یا نه، دیگر هیچ ربطی به داشتنِ
                    // کلمه‌ی «سابیده» در نام/تگ ندارد: فقط کالایی که کاربر خودش در «موجودی کیسه مادر» ثبت/لینک
                    // کرده باشد (با هر نامی — مثلاً «فلفل قرمز ایرانی درجه یک») همان فرمول (هر ۶ واحد = یک
                    // کیسه‌ی مادر) را می‌گیرد؛ کالاهایی که در آن لیست ثبت نشده‌اند، هیچ معادل‌سازیِ خودکاری نمی‌گیرند.
                    const motherBagEntry = findMotherBagStockFor(item.name, settings?.motherBagStock);
                    const motherBagDescOn = motherBagEntry ? (motherBagEntry.descriptionEnabled !== false) : false;
                    const isGround = o.motherBag && motherBagDescOn && item.weight > 0;
                    // هر کالا یک بلوک: نامِ کالا در سطر اول، و هر مشخصه (تعداد / وزن / معادل کیسه مادر) در سطر جدا
                    const details = [];
                    // سطر اول مثل قبل با جزئیات: «۱۵۰ کیسه ۵ کیلویی نامِ کالا» — وزن هر کیسه = وزن کل ÷ تعداد (فقط اگر عدد گرد/تمیز شد)
                    const perBag = item.qty > 0 && item.weight > 0 ? item.weight / item.qty : 0;
                    const perBagClean = perBag > 0 && Math.abs(perBag * 100 - Math.round(perBag * 100)) < 1e-6;
                    // انتخاب دستی «دو دسته» برای وقتی که تقسیم گرد نیست (مثلاً ۱ کیسه ۳۴ و ۲ کیسه ۳۳ کیلویی)
                    const sp = splitWeightIntoBags(item.weight, item.qty);
                    const splitText = item._choice === 'split' && !sp.clean && sp.groups.length ? sp.groups.map(g => `${formatNumber(g.count)} کیسه ${formatNumber(g.kg)} کیلویی`).join(' و ') + ' ' : null;
                    const qtyText = splitText ?? (item.qty ? `${formatNumber(item.qty)} کیسه${perBagClean ? ` ${formatNumber(Math.round(perBag * 100) / 100)} کیلویی` : ''} ` : '');
                    if (o.weight && item.weight > 0) details.push(`وزن کل: ${formatNumber(item.weight)} کیلوگرم`);
                    // ریز جزئیاتِ ثبت‌شده در موجودی انبار (برند / مشخصه) — مقدارهای عمومی و تکراریِ نام نمایش داده نمی‌شوند
                    const extra = (v) => { v = String(v || '').trim(); return v && !['متفرقه', 'عمومی'].includes(v) && !String(item.name || '').includes(v) ? v : ''; };
                    if (o.brand && extra(item.brand)) details.push(`برند: ${extra(item.brand)}`);
                    // کالای ثبت‌شده در «موجودی کیسه مادر»: سطر مشخصه و عنوان از قالب‌های خودِ ردیف ساخته می‌شود
                    const tplVars = { BAGS: formatNumber(item.qty || 0), PERBAG: perBagClean ? formatNumber(Math.round(perBag * 100) / 100) : '', NAME: item.name || '', BRAND: extra(item.brand), TAG: extra(item.tag), WEIGHT: formatNumber(item.weight || 0) };
                    if (o.tag && extra(item.tag)) details.push(motherBagEntry ? applyMotherBagTemplate(motherBagEntry.tagTemplate, tplVars, DEFAULT_TAG_TEMPLATE) : `مشخصه: ${extra(item.tag)}`);
                    const titleText = motherBagEntry && item.qty && perBagClean ? applyMotherBagTemplate(motherBagEntry.titleTemplate, tplVars, DEFAULT_TITLE_TEMPLATE) : null;
                    if (isGround) {
                        // معادل‌سازی کیسه‌های ورودی (مثلاً ۵ کیلویی) با کیسه‌های مادر ۳۰ کیلویی، بر اساس وزن کل —
                        // متن دقیق از قالبِ خودِ محصول (اگر تعریف شده) یا قالبِ پیش‌فرض ساخته می‌شود.
                        const MOTHER_BAG_KG = getMotherBagCfg(motherBagEntry).motherKg;
                        const motherBags = item.weight / MOTHER_BAG_KG;
                        const isWhole = Math.abs(motherBags - Math.round(motherBags)) < 0.001;
                        const motherBagsText = isWhole ? formatNumber(Math.round(motherBags)) : motherBags.toFixed(2);
                        details.push(applyMotherBagTemplate(motherBagEntry?.descriptionTemplate, { COUNT: motherBagsText, KG: MOTHER_BAG_KG, BAGS: formatNumber(item.qty || 0), WEIGHT: formatNumber(item.weight) }));
                    }
                    return [`▪️ ${titleText ?? `${qtyText}${item.name || ''}`}`, ...details.filter(Boolean).map(d => `   ◽ ${d}`)].map(l => RLM + l).join('\n');
                });
                const text = blocks.join('\n' + RLM + '┄┄┄┄┄┄┄┄┄┄┄┄┄┄\n');
                if (!o.totals) return text;
                const bags = eff.reduce((a, b) => a + (Number(b.qty) || 0), 0), kg = eff.reduce((a, b) => a + (Number(b.weight) || 0), 0);
                return `${text}\n${RLM}━━━━━━━━━━━━━━\n${RLM}📦 جمع کل: ${formatNumber(eff.length)} قلم${bags ? ` | ${formatNumber(bags)} کیسه` : ''} | ${formatNumber(kg)} کیلوگرم`;
            };

            const handleCopyDescription = () => {
                if (cart.length === 0) { toast.show('سبد خرید خالی است'); return; }
                setCalcRows({}); setDescTab('view'); setShowDescModal(true);
            };
            const commitDescription = async () => {
                const text = generateAutoDescription(descOpts);
                setDescription(text);
                setShowDescModal(false);
                try {
                    await navigator.clipboard.writeText(text);
                    toast.show('📋 توضیحات تولید و در کلیپ‌بورد کپی شد');
                } catch (err) {
                    toast.show('توضیحات تولید شد (کپی خودکار ممکن نشد، از روی متن کپی کنید)');
                }
            };

            const openLoadingReview = (isPending) => {
                setLoadingReviewMode(!!isPending);
                setShowLoadingReview(true);
            };

            // هشدار افت قیمت: برای هر قلم سبد (غیردستی)، آخرین قیمتی که همین کالا قبلاً به همین مشتری
            // (در فاکتورهای تکمیل‌شده) فروخته شده را پیدا می‌کند؛ اگر قیمت فعلی کمتر از آن باشد، هشدار می‌دهد
            // تا فروشنده متوجه شود دارد ارزان‌تر از قبل به همین مشتری می‌فروشد (می‌تواند تأیید یا اصلاح کند).
            const priceDropWarnings = useMemo(() => {
                const customerKey = normalizePartyName(customer).toLocaleLowerCase('fa-IR');
                if (!customerKey) return [];
                const lastPriceFor = (itemId) => {
                    let best = null;
                    (invoices || []).forEach(inv => {
                        if (inv.status !== 'completed') return;
                        if (initialData && inv.id === initialData.id) return; // خود همین فاکتور در حالت ویرایش نادیده گرفته شود
                        if (normalizePartyName(inv.customer).toLocaleLowerCase('fa-IR') !== customerKey) return;
                        const found = (inv.items || []).find(it => it.itemId === itemId && Number(it.price) > 0);
                        if (!found) return;
                        if (!best || (inv.timestamp || 0) > best.timestamp) best = { price: Number(found.price), date: inv.date, timestamp: inv.timestamp || 0 };
                    });
                    return best;
                };
                const warnings = [];
                cart.forEach(item => {
                    if (item.isManual || !item.itemId || !(Number(item.price) > 0)) return;
                    const prev = lastPriceFor(item.itemId);
                    if (prev && Number(item.price) < prev.price) {
                        warnings.push({ itemId: item.itemId, name: item.name, newPrice: Number(item.price), previousPrice: prev.price, previousDate: prev.date });
                    }
                });
                return warnings;
            }, [cart, customer, invoices, initialData]);
            const [showPriceDropReview, setShowPriceDropReview] = useState(false);
            const [pendingCheckMode, setPendingCheckMode] = useState(null);
            // پیش‌بینی مصرف کیسه‌ی مادر همین‌جا (موقع ثبت سفارش/رزرو یا ثبت نهایی) هم باید دیده شود — دقیقاً با
            // همان فرمول/موتورِ مشترک «تایید نهایی/ثبت ارسال» (getMotherBagPrediction) — تا از همین الان معلوم
            // باشد که ممکن است کیسه‌ی مادر کم بیاوری، نه فقط موقع ارسالِ واقعیِ بار. در این مرحله فقط هشدار/
            // پیش‌بینی نشان داده می‌شود؛ خودِ موجودیِ کیسه‌ی مادر فقط موقع «تایید نهایی/ثبت ارسالِ واقعی» کم می‌شود
            // (همان‌جا که خودِ موجودی انبار هم واقعاً کسر می‌شود)، نه موقع رزرو.
            const [motherBagReviewPOS, setMotherBagReviewPOS] = useState(null);

            const checkMotherBagsAndProceedPOS = (isPending) => {
                const preds = [];
                cart.forEach((it, idx) => {
                    if (it.isManual) return;
                    const pred = getMotherBagPrediction(it, Number(it.qty) || 0, settings?.motherBagStock);
                    if (pred) preds.push({ idx, ...pred });
                });
                if (preds.length > 0) { setMotherBagReviewPOS({ preds, isPending }); return; }
                openLoadingReview(isPending);
            };

            const proceedAfterPriceCheck = (isPending) => {
                const negatives = cart.filter(c => !c.isManual && c.qty > c.stock);
                if (negatives.length > 0) {
                    setShowConfirm(true);
                } else {
                    checkMotherBagsAndProceedPOS(isPending);
                }
            };

            const handleCheck = async (isPending) => {
                if (cart.length === 0) return toast.show('سبد خرید خالی است');
                if (!customer) return toast.show('نام مشتری را وارد کنید');
                const zeroWeight = cart.find(c => c.weight <= 0);
                if (zeroWeight) return toast.show(`وزن برای کالای "${zeroWeight.name}" وارد نشده است.`);
                if (isEditMode && !changeReason.trim()) return toast.show('لطفاً علت این ویرایش را در کادر مربوطه بنویسید.');
                // تاریخ فاکتور دستی: اگر کاربر تاریخ فاکتور را طوری تغییر داده که با امروزِ واقعی سیستم فرق دارد،
                // قبل از ثبت یک‌بار از او تایید می‌گیریم تا سهوی نباشد؛ بعد از تایید، محاسبات (Timestamp، سررسید،
                // گزارش‌ها) دقیقاً بر مبنای همین تاریخ دستی انجام می‌شود، نه تاریخ واقعی سیستم.
                if (dateIsManualNonToday) {
                    const todayDisplay = formatJalali(new Date().toISOString());
                    const ok = await confirmAction(`تاریخ این فاکتور «${date}» است، در حالی که امروزِ واقعی «${todayDisplay}» می‌باشد. یعنی دارید این فاکتور را با یک تاریخ دستیِ متفاوت از امروز ثبت می‌کنید و همه‌ی محاسبات (سررسید، گزارش‌ها و ...) بر همین مبنا خواهد بود. تایید می‌کنید؟`, { danger: false });
                    if (!ok) return;
                }
                setPendingMode(isPending);
                if (priceDropWarnings.length > 0) {
                    setPendingCheckMode(isPending);
                    setShowPriceDropReview(true);
                    return;
                }
                proceedAfterPriceCheck(isPending);
            };

            const finalizeCore = (confirmed, isPending, ov) => {
                if (!confirmed) return setShowConfirm(false);
                const changeLogs = isEditMode
                    ? [...(initialData.changeLogs || []), { changedAt: new Date().toLocaleString('fa-IR'), reason: changeReason.trim() }]
                    : (initialData?.changeLogs || []);
                const loadingCostAmount = includeLoadingCostChoice ? getLoadingCostAmount() : 0;
                // Base Date مرکزی این فاکتور: اگر تاریخ فاکتور دستی و متفاوت از امروزِ واقعی است (و کاربر تاییدش کرده)،
                // Timestamp واقعی هم از همان تاریخِ دستی ساخته می‌شود تا محاسبات وابسته به تاریخ (سررسید، آمار مشتری،
                // مرتب‌سازی گزارش‌ها) هم واقعاً بر همان مبنا باشند، نه تاریخ واقعی سیستم.
                const manualTimestamp = dateIsManualNonToday ? jalaliDisplayDateToTimestamp(date) : null;
                const finalTimestamp = isEditMode
                    ? (dateIsManualNonToday && manualTimestamp ? manualTimestamp : (initialData?.timestamp || Date.now()))
                    : (dateIsManualNonToday && manualTimestamp ? manualTimestamp : Date.now());
                // فقط برای یادآوری در گزارش‌ها: این فاکتور با تاریخِ دستیِ متفاوت از امروز ثبت شده است.
                const dateManuallySet = dateIsManualNonToday ? true : (isEditMode ? (initialData?.dateManuallySet || false) : false);
                // تاریخ واقعیِ روزی که این فاکتور واقعاً ثبت شد (سیستمی، نه چیزی که کاربر در فیلد «تاریخ» نوشته).
                // فقط وقتی تاریخ برای اولین‌بار دستی می‌شود ثبت می‌شود و بعد از آن دست‌نخورده می‌ماند، تا در
                // گزارش‌ها بشود گفت «این سند واقعاً چه روزی وارد سیستم شده»، حتی اگر بارها ویرایش شود.
                const realEntryTimestamp = dateManuallySet ? (initialData?.realEntryTimestamp || Date.now()) : undefined;
                // «طول مهلت تسویه‌ی اصلی» فقط یک‌بار قفل می‌شود و در ارسال‌های بعدی (پاپ‌آپ ثبت ارسال) دست‌نخورده
                // می‌ماند. اما اگر خودِ کاربر همین‌جا در فرم فاکتور، سررسید را عوض کند (یا برای اولین‌بار تعیین کند)،
                // این یعنی تصمیم تازه‌ای گرفته و باید دوباره از روی همین سررسیدِ جدید محاسبه شود، نه قفلِ قبلی.
                const dueDateChangedHere = (initialData?.dueDate || '') !== (dueDate || '');
                let originalTermDays = (!dueDateChangedHere) ? initialData?.originalTermDays : undefined;
                if (originalTermDays === undefined && dueDate) {
                    const dayMs = 86400000;
                    const startOfDay = (t) => { const dt = new Date(t); dt.setHours(0, 0, 0, 0); return dt.getTime(); };
                    originalTermDays = Math.round((startOfDay(dueDate) - startOfDay(finalTimestamp)) / dayMs);
                }
                if (!dueDate) originalTermDays = undefined;
                onFinalize({ id: initialData?.id || generateId(), date, customer, items: cart, description: (ov?.description ?? description), settlementTerm: String(ov?.settlementTerm ?? settlementTerm).trim(), dueDate: dueDate || undefined, originalTermDays, includeLoadingCost: includeLoadingCostChoice, loadingCostAmount, totalPrice: getItemsTotal() + loadingCostAmount, timestamp: finalTimestamp, status: isPending ? 'pending' : 'completed', changeLogs, dateManuallySet, realEntryTimestamp, dateChangeLogs: initialData?.dateChangeLogs, snapshotLoadingCostPerTon: includeLoadingCostChoice ? (isPending ? initialData?.snapshotLoadingCostPerTon : (initialData?.snapshotLoadingCostPerTon ?? settings.loadingCostPerTon)) : undefined, noticeIds: selectedNoticeIds, notices: getSelectedNoticeTexts() });
                if (!initialData) { setCart([]); setCustomer(''); setDescription(''); setSettlementTerm(''); }
                setShowConfirm(false);
                setShowLoadingReview(false);
                if(!initialData) toast.show(isPending ? 'فاکتور به لیست انتظار اضافه شد.' : 'فاکتور نهایی شد.');
            };

            // نحوه‌ی تسویه (نقدی/چک) دیگر پاپ‌آپِ جداگانه‌ی بعدی نیست — همین‌جا، داخل همان پاپ‌آپ «هزینه بارگیری»،
            // به‌عنوان یک دکمه‌ی سریع برای پرکردن «مهلت/شرایط تسویه» اضافه می‌شود؛ یک پاپ‌آپ به‌جای دو تا.
            const [quickPayKind, setQuickPayKind] = useState(null);
            const applyQuickPay = (kind) => {
                setQuickPayKind(k => k === kind ? null : kind);
                if (kind === 'cash' && !String(settlementTerm).trim()) setSettlementTerm('نقدی');
                if (kind === 'cheque' && !String(settlementTerm).trim()) setSettlementTerm('چک ثبتی');
            };

            const confirmLoadingAndFinalize = () => {
                let newDesc = description;
                if (quickPayKind) {
                    const d = dueDate ? formatJalali(dueDate) : '';
                    const line = quickPayKind === 'cash' ? 'نحوه تسویه: نقدی' : ('نحوه تسویه: چک ثبتی' + (d ? ` — تاریخ تسویه: ${d}` : ''));
                    const base = String(description || '').replace(/^نحوه تسویه:.*(\r?\n|$)/gm, '').trim();
                    newDesc = base ? base + '\n' + line : line;
                }
                finalizeCore(true, loadingReviewMode, { description: newDesc });
            };

            return (
                <div className="flex flex-col h-[calc(100vh-72px)] min-h-0">
                    <div className="bg-white rounded-3xl border border-slate-200 flex flex-col overflow-hidden shadow-lg relative flex-1">
                        <div className="px-6 py-4 flex justify-between items-center bg-gradient-to-l from-indigo-700 via-indigo-700 to-indigo-800 text-white relative overflow-hidden shrink-0">
                            <div className="absolute -left-10 -top-14 w-44 h-44 rounded-full bg-white/5 pointer-events-none"></div>
                            <div className="absolute left-24 -bottom-16 w-32 h-32 rounded-full bg-white/5 pointer-events-none"></div>
                            <div className="flex items-center gap-3 relative">
                                <div className="w-10 h-10 rounded-2xl bg-white/15 ring-1 ring-white/20 flex items-center justify-center"><Scale size={19}/></div>
                                <div>
                                    <div className="font-black text-base leading-tight">{initialData ? 'ویرایش فاکتور' : 'صدور فاکتور وزنی'}</div>
                                    <div className="text-[11px] text-indigo-200 mt-0.5">{initialData ? 'تغییرات را اعمال و ذخیره کنید' : 'مشتری و اقلام را وارد کنید، وزن و قیمت خودکار جمع می‌شود'}</div>
                                </div>
                            </div>
                            <div className="relative text-indigo-50 text-xs font-bold bg-white/10 ring-1 ring-white/15 px-3.5 py-1.5 rounded-full tabular-nums">{date}</div>
                        </div>
                        <div className="flex-1 overflow-y-auto min-h-0 bg-slate-50/60">
                        <div className="px-6 pt-3 pb-3 bg-white border-b border-slate-100 flex flex-col gap-2.5">
                            <div className="grid grid-cols-1 sm:grid-cols-[1fr_200px] gap-2.5">
                                <div className="relative">
                                    <label className="block text-[11px] font-bold text-slate-500 mb-1">نام مشتری <span className="text-rose-500">*</span></label>
                                    <input className="w-full h-9 px-4 rounded-2xl border border-slate-200 bg-slate-50/70 text-sm font-bold text-slate-800 placeholder:font-normal placeholder:text-slate-400 outline-none transition focus:bg-white focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100" placeholder="نام یا عنوان مشتری…" value={customer} onFocus={() => setShowCustomerSuggestions(true)} onChange={e => { setCustomer(e.target.value); setShowCustomerSuggestions(true); }} />
                                    {showCustomerSuggestions && customerSuggestions.length > 0 && (
                                        <div className="absolute z-40 top-full mt-2 right-0 left-0 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden">
                                            {customerSuggestions.map(c => (
                                                <button type="button" key={c.name} onMouseDown={() => { setCustomer(c.name); setShowCustomerSuggestions(false); }} className="w-full text-right px-4 py-2.5 hover:bg-indigo-50 border-b border-slate-50 last:border-0">
                                                    <div className="font-bold text-xs text-slate-700">✓ {c.name}</div>
                                                    <div className="text-[9px] text-slate-400">قبلاً {c.count} فاکتور · آخرین ثبت: {c.lastDate || '—'} · با همین نام ذخیره شود</div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div className="flex flex-col items-stretch">
                                    <label className="block text-[11px] font-bold text-slate-500 mb-1">تاریخ فاکتور</label>
                                    <input className={`w-full h-9 px-4 rounded-2xl border text-sm font-bold text-center tabular-nums outline-none transition focus:bg-white focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 ${dateIsManualNonToday ? 'border-amber-400 bg-amber-50' : 'border-slate-200 bg-slate-50/70'}`} placeholder="تاریخ" value={date} onChange={e => setDate(e.target.value)} onBlur={e => setDate(normalizeInvoiceDateStr(e.target.value))} title="فرمت: سال/ماه/روز — نیازی به صفر ابتدایی یا ارقام فارسی نیست، خودکار یکدست می‌شود" />
                                    {dateIsManualNonToday && <div className="text-[10px] text-amber-600 font-bold mt-1.5 flex items-center gap-1.5">📌 تاریخ دستی (غیر از امروز) <button type="button" onClick={() => setDate(new Date().toLocaleDateString('fa-IR'))} className="text-indigo-600 underline hover:text-indigo-800">بازگشت به امروز</button></div>}
                                    {!dateChangedThisSession && isJalaliDateStrDifferentFromToday(date) && initialData?.dateManuallySet && <div className="text-[10px] text-amber-500 font-bold mt-1.5">📌 قبلاً به‌صورت دستی ثبت شده</div>}
                                </div>
                            </div>
                            <div className="flex gap-2.5">
                                <div className="relative flex-1">
                                    <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
                                    <input
                                        ref={searchRef}
                                        className="w-full h-9 pl-4 pr-12 rounded-2xl border border-slate-200 bg-slate-50/70 text-sm outline-none transition placeholder:text-slate-400 focus:bg-white focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                                        placeholder="جستجوی کالا برای افزودن به فاکتور..."
                                        value={search}
                                        onChange={e => { setSearch(e.target.value); setShowSearchDropdown(true); }}
                                        onFocus={() => setShowSearchDropdown(true)}
                                        onBlur={() => setTimeout(() => setShowSearchDropdown(false), 150)}
                                    />
                                    {showSearchDropdown && search.trim() && (
                                        <div className="absolute z-30 mt-2 w-full bg-white border border-slate-200 rounded-2xl shadow-2xl max-h-72 overflow-y-auto">
                                            {filtered.length === 0 && (
                                                <div className="p-3 text-[11px] text-slate-400 text-center">کالایی یافت نشد — می‌توانید از «افزودن دستی» استفاده کنید</div>
                                            )}
                                            {(() => { const shownList = filtered.slice(0, 25); const allNames = shownList.map(x => x.name); return shownList.map(item => {
                                                const stock = getRealStock(item);
                                                const incomingSellable = sellableIncomingMap[item.id] || 0;
                                                const { prefix, diff } = splitNameDiff(allNames, item.name);
                                                return (
                                                    <div key={item.id} onMouseDown={() => { addToCart(item); setShowSearchDropdown(false); }} className="px-3 py-2 border-b border-slate-50 last:border-0 hover:bg-indigo-50 cursor-pointer transition flex justify-between items-center gap-2">
                                                        <div className="min-w-0">
                                                            <div className="font-bold text-slate-700 text-xs truncate">{prefix}{diff && <span className={`mr-1 px-1 rounded border ${stringToBadgeColor(diff)}`}>{diff}</span>}</div>
                                                            <div className="mt-0.5"><ItemDistinguishBadges item={item}/></div>
                                                            <div className="text-[9px] text-slate-300 font-mono truncate">#{item.id.slice(-6)}</div>
                                                        </div>
                                                        <div className="flex flex-col items-end gap-1 shrink-0">
                                                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${stock > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>موجودی آزاد: {stock}</span>
                                                            {incomingSellable > 0 && <span className="text-[9px] px-1.5 py-0.5 rounded font-bold bg-sky-100 text-sky-700 flex items-center gap-0.5"><Truck size={9}/> {incomingSellable} در راه — می‌خواهید از آن بفروشید؟</span>}
                                                        </div>
                                                    </div>
                                                );
                                            }); })()}
                                        </div>
                                    )}
                                </div>
                                <button onClick={() => setShowManualModal(true)} className="h-9 px-5 bg-white text-indigo-700 rounded-2xl border border-indigo-200 font-bold text-xs flex items-center justify-center gap-2 hover:bg-indigo-50 hover:border-indigo-300 transition whitespace-nowrap shadow-sm"><FilePlus size={16}/> افزودن دستی</button>
                            </div>
                        </div>
                        <div className="px-6 pt-3">
                            <button type="button" onClick={() => setShowNotices(s => !s)} className={`w-full flex items-center justify-between px-4 py-2 bg-amber-50 hover:bg-amber-100/70 border border-amber-200/80 transition text-amber-800 ${showNotices ? 'rounded-t-2xl' : 'rounded-2xl'}`}>
                                <span className="flex items-center gap-2 text-xs font-bold">
                                    <AlertTriangle size={15}/> توجه / یادداشت‌های مهم فاکتور
                                    {selectedNoticeIds.length > 0 && <span className="bg-amber-200 text-amber-800 rounded-full px-1.5 leading-4 text-[10px]">{selectedNoticeIds.length}</span>}
                                </span>
                                <ChevronDown size={16} className={`transition-transform ${showNotices ? 'rotate-180' : ''}`}/>
                            </button>
                            {showNotices && (
                                <div className="p-3 bg-amber-50/60 space-y-1.5 border border-t-0 border-amber-200/80 rounded-b-2xl">
                                    {standardNotices.length === 0 && (
                                        <div className="text-[10px] text-amber-600/80 text-center py-1">یادداشتی ثبت نشده — از کادر پایین یک یادداشت آماده اضافه کنید (مثلاً: بارها تحویل مشهد است)</div>
                                    )}
                                    {standardNotices.map(n => (
                                        <div key={n.id} className="flex items-center gap-1.5 bg-white border border-amber-200 rounded-lg px-2 py-1">
                                            <input type="checkbox" className="accent-amber-600 shrink-0" checked={selectedNoticeIds.includes(n.id)} onChange={() => toggleNotice(n.id)} />
                                            {editingNoticeId === n.id ? (
                                                <>
                                                    <input autoFocus className="flex-1 text-[11px] p-1 border border-amber-300 rounded outline-none" value={editingNoticeText} onChange={e => setEditingNoticeText(e.target.value)} onKeyDown={e => e.key === 'Enter' && saveEditNotice()} />
                                                    <button onClick={saveEditNotice} className="text-emerald-600 shrink-0" title="ذخیره"><Check size={13}/></button>
                                                    <button onClick={() => setEditingNoticeId(null)} className="text-slate-400 shrink-0" title="انصراف"><X size={13}/></button>
                                                </>
                                            ) : (
                                                <>
                                                    <span className="flex-1 text-[11px] text-slate-700">{n.text}</span>
                                                    <button onClick={() => startEditNotice(n)} className="text-indigo-400 hover:text-indigo-600 shrink-0" title="ویرایش"><Pencil size={12}/></button>
                                                    <button onClick={() => deleteNotice(n.id)} className="text-red-300 hover:text-red-500 shrink-0" title="حذف از کتابخانه"><X size={13}/></button>
                                                </>
                                            )}
                                        </div>
                                    ))}
                                    <div className="flex gap-1.5 pt-0.5">
                                        <input className="flex-1 text-[11px] p-1.5 border border-amber-300 rounded-lg outline-none bg-white" placeholder="یادداشت آماده جدید بنویسید..." value={newNoticeText} onChange={e => setNewNoticeText(e.target.value)} onKeyDown={e => e.key === 'Enter' && addStandardNotice()} />
                                        <button onClick={addStandardNotice} className="px-2.5 bg-amber-600 text-white rounded-lg text-[11px] font-bold hover:bg-amber-700 whitespace-nowrap">افزودن</button>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="px-6 py-3">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-black text-slate-800 text-sm flex items-center gap-2"><span className="w-1.5 h-4 rounded-full bg-indigo-600"></span> اقلام فاکتور</h3>
                            <span className="text-[11px] font-bold text-slate-500 bg-white border border-slate-200 rounded-full px-3 py-1">{formatNumber(cart.length)} قلم</span>
                          </div>
                          <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-x-auto">
                            <table className="w-full text-right text-sm min-w-[720px]">
                                <thead className="bg-slate-50 text-slate-500 text-[11px] font-bold border-b border-slate-200"><tr><th className="px-5 py-2">شرح کالا</th><th className="px-2 py-2 w-24 text-center">تعداد</th><th className="px-2 py-2 w-32 text-center">وزن (Kg)</th><th className="px-2 py-2 w-44 text-center">فی (تومان)</th><th className="px-2 py-2 w-40 text-center">جمع کل</th><th className="px-2 py-2 w-20"></th></tr></thead>
                                <tbody className="divide-y divide-slate-100">
                                    {cart.map((item) => {
                                        // Calculate deduction footnote: qty (bags) * deductionPerBag (grams) -> kg
                                        const deducGrams = item.deductionPerBag && item.qty > 0 ? item.qty * item.deductionPerBag : 0;
                                        const deducKg = deducGrams / 1000;
                                        const incomingSellable = !item.isManual ? (sellableIncomingMap[item.itemId] || 0) : 0;
                                        return (
                                        <tr key={item.itemId} className={`hover:bg-indigo-50/30 transition ${item.isManual ? 'bg-amber-50/40' : 'bg-white'}`}>
                                            <td className="px-5 py-2 align-middle">
                                                <div className="flex items-center gap-1.5 flex-wrap leading-tight">
                                                    <ItemNameLabel it={item} inventoryItems={items} isPending={true} className="font-bold text-slate-700" />
                                                    {(() => { const d = resolveItemDisplay(item, items, true).display; return (
                                                        <span className="inline-flex items-center gap-1 flex-wrap">
                                                            {d.brand && <span className={`text-[9px] px-1.5 py-0 rounded font-bold border ${stringToBadgeColor(d.brand)}`}>{d.brand}</span>}
                                                            {d.tag && <span className={`text-[9px] px-1.5 py-0 rounded font-bold border ${stringToBadgeColor(d.tag)}`}>{d.tag}</span>}
                                                        </span>
                                                    ); })()}
                                                    {item.isManual && <span className="text-[10px] text-slate-400">(دستی)</span>}
                                                    {!item.isManual && item.qty > item.stock && <span className="text-[10px] text-red-500 font-bold">⚠️ آزاد: {item.stock}</span>}
                                                    {incomingSellable > 0 && <span className="text-[9px] text-sky-700 bg-sky-50 border border-sky-200 px-1.5 py-0.5 rounded font-bold flex items-center gap-0.5"><Truck size={9}/> شامل {incomingSellable} از بارِ در راه</span>}
                                                    {item.sourced && <span className="text-[9px] text-purple-700 bg-purple-50 border border-purple-200 px-1.5 py-0.5 rounded font-bold">🛒 خریداری از: {item.sourceParty || '—'}{item.sourcePrice > 0 && ` (${formatNumber(item.sourcePrice)} ت)`}{item.sourceSettlement && <span className={item.sourceSettlement === 'settled' ? 'text-emerald-700' : 'text-red-500'}> · {item.sourceSettlement === 'settled' ? 'تسویه‌شده' : 'تسویه‌نشده'}</span>}</span>}
                                                </div>
                                                {(deducGrams > 0 || item.bagWeight > 0) && (
                                                    <div className="text-[9px] text-blue-600 mt-0.5 leading-snug">
                                                        {deducGrams > 0 && <>📋 {item.qty}×{formatNumber(item.deductionPerBag)}گ = {deducKg % 1 === 0 ? deducKg : deducKg.toFixed(2)} کیلو کسری{item.bagWeight > 0 && <span className="text-slate-300"> • </span>}</>}
                                                        {item.bagWeight > 0 && <span className="text-slate-400">📦 کیسه {item.bagWeight >= 1000 ? `${item.bagWeight/1000}کیلو` : `${formatNumber(item.bagWeight)}گرم`}</span>}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-2 py-1.5"><input type="number" min="0" step="any" className="w-full h-9 px-2 border border-slate-200 rounded-xl text-center font-bold text-slate-700 bg-white outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100" value={item.qty} onChange={e => updateCart(item.itemId, 'qty', e.target.value)} /></td>
                                            <td className="px-2 py-1.5"><input type="number" min="0" step="any" className="w-full h-9 px-2 border border-indigo-200 rounded-xl text-center font-black text-indigo-700 bg-indigo-50/70 outline-none transition focus:bg-white focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100" value={item.weight} onChange={e => updateCart(item.itemId, 'weight', e.target.value)} placeholder="0" /></td>
                                            <td className="px-2 py-1.5"><FormattedInput className="w-full h-9 px-2 border border-slate-200 rounded-xl text-center font-bold text-slate-700 bg-white outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100" value={item.price} onChange={val => updateCart(item.itemId, 'price', val)} placeholder="0" /></td>
                                            <td className="px-2 py-1.5 text-center"><div className="font-black text-emerald-600 tabular-nums text-[15px]">{formatNumber(item.weight * item.price)}</div></td>
                                            <td className="px-2 py-1.5 text-center">
                                                <div className="flex gap-1.5 items-center justify-center">
                                                    <button onClick={() => setEditingCartItem({...item, _originalItemId: item.itemId})} className="text-indigo-400 hover:text-indigo-700 hover:bg-indigo-50 w-7 h-7 rounded-xl flex items-center justify-center transition" title="ویرایش"><Pencil size={14}/></button>
                                                    <button onClick={() => removeCart(item.itemId)} className="text-rose-400 hover:text-rose-600 hover:bg-rose-50 w-7 h-7 rounded-xl flex items-center justify-center transition" title="حذف"><X size={15}/></button>
                                                </div>
                                            </td>
                                        </tr>
                                        );
                                    })}
                                    {cart.length === 0 && <tr><td colSpan="6" className="py-8 text-center"><div className="mx-auto w-11 h-11 rounded-2xl bg-slate-100 text-slate-300 flex items-center justify-center mb-2"><ClipboardList size={22}/></div><div className="text-sm font-bold text-slate-400">فاکتور خالی است</div><div className="text-[11px] text-slate-400 mt-1">از کادر جستجوی بالا کالا اضافه کنید</div></td></tr>}
                                </tbody>
                            </table>
                          </div>
                        </div>
                        <div className="px-6 pb-4 flex flex-col gap-3">
                            {isEditMode && (
                                <div className="px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-2xl flex flex-col sm:flex-row sm:items-center gap-3">
                                    <label className="text-xs font-bold text-amber-800 flex items-center gap-1.5 whitespace-nowrap"><Pencil size={14}/> علت ویرایش *</label>
                                    <input className="flex-1 min-w-0 h-9 px-4 rounded-xl border border-amber-300 text-sm bg-white outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-100" placeholder="مثلاً اصلاح وزن، تغییر قیمت، برگشت کالا و ..." value={changeReason} onChange={e => setChangeReason(e.target.value)} />
                                    {initialData?.changeLogs?.length > 0 && <span className="text-[11px] text-amber-700 whitespace-nowrap font-bold">{initialData.changeLogs.length} ویرایش قبلی</span>}
                                </div>
                            )}
                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-4 flex flex-col gap-2.5">
                                    <div className="flex items-center justify-between gap-3">
                                        <h3 className="font-black text-slate-800 text-sm flex items-center gap-2"><span className="w-1.5 h-4 rounded-full bg-indigo-600"></span> توضیحات / یادداشت</h3>
                                        <button type="button" onClick={handleCopyDescription} className="flex items-center gap-1.5 text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-xl hover:bg-indigo-100 transition" title="تولید خودکار توضیحات از روی اقلام سبد و کپی">
                                            <ClipboardList size={14}/> تولید و کپی توضیحات
                                        </button>
                                    </div>
                                    <textarea className="w-full flex-1 p-3 border border-slate-200 rounded-2xl text-sm leading-6 bg-slate-50/70 focus:bg-white focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 outline-none resize-y min-h-[160px] transition placeholder:text-slate-400" placeholder="توضیحات مربوط به این فاکتور... (یا از دکمه «تولید و کپی توضیحات» استفاده کنید)" value={description} onChange={e => setDescription(e.target.value)}></textarea>
                                    <div className="flex flex-wrap gap-2">
                                        <span className="text-[10px] text-slate-400 self-center">نمایش/عدم‌نمایش توضیحات در چاپ را موقع چاپ، از تنظیمات پیش‌نمایش («نمایش اطلاعات») انتخاب کنید.</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-[11px] text-amber-700 font-bold select-none bg-amber-50 border border-amber-100 rounded-2xl px-3 py-2">
                                        <Truck size={15}/> هزینه بارگیری برای همه مشتری‌ها خودکار لحاظ می‌شود
                                    </div>
                                </div>
                                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-3.5 flex flex-col gap-2">
                                    <h3 className="font-black text-slate-800 text-sm flex items-center gap-2"><span className="w-1.5 h-4 rounded-full bg-indigo-600"></span> تسویه و سررسید</h3>
                                    <div>
                                        <label className="text-[11px] font-bold text-slate-500 flex items-center gap-1.5 mb-1"><Clock size={13}/> مهلت تسویه / شرایط پرداخت</label>
                                        <input className="w-full h-9 px-4 border border-slate-200 rounded-2xl text-sm bg-slate-50/70 focus:bg-white focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 outline-none transition placeholder:text-slate-400" placeholder="مثلاً: نقدی، ۱۵ روز، ۱ ماه، پایان ماه..." value={settlementTerm} onChange={e => setSettlementTerm(e.target.value)} />
                                    </div>
                                    <div className="rounded-2xl bg-indigo-50/50 border border-indigo-100 p-2.5 flex flex-col gap-2">
                                        <label className="text-[11px] font-bold text-indigo-700 flex items-center gap-1.5" title="این محاسبه فقط برای پرکردن سریع فیلدهای پایین است؛ بعدش هم کاملاً قابل ویرایش دستی است."><CalendarClock size={14}/> سررسید دقیق (تسویه/چک) — اختیاری</label>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <input type="number" min="1" inputMode="numeric" value={quickDueDays} onChange={e => setQuickDueDays(e.target.value)} placeholder="مثلاً 60" className="w-24 h-8 px-2 border border-indigo-200 rounded-xl text-sm text-center font-bold bg-white outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100" />
                                            <span className="text-[11px] font-bold text-indigo-600 whitespace-nowrap">روز، از</span>
                                            <select value={quickDueBase} onChange={e => setQuickDueBase(e.target.value)} className="h-8 px-3 border border-indigo-200 rounded-xl text-xs font-bold bg-white outline-none focus:border-indigo-400"><option value="today">تاریخ فاکتور</option><option value="tomorrow">روز بعد از فاکتور</option></select>
                                            <button type="button" onClick={applyQuickDueDays} className="h-8 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold whitespace-nowrap shadow-sm transition active:scale-95">محاسبه سررسید</button>
                                        </div>
                                        <div className="grid grid-cols-3 gap-2" dir="rtl">
                                            <input inputMode="numeric" value={dueJYear} onChange={e => { const v = e.target.value.replace(/\D/g, ''); setDueJYear(v); updateDueDateClamped(v, dueJMonth, dueJDay); }} placeholder="سال" className="h-8 px-2 border border-indigo-200 rounded-xl text-sm text-center font-bold bg-white outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100" />
                                            <select value={dueJMonth} onChange={e => { setDueJMonth(e.target.value); updateDueDateClamped(dueJYear, e.target.value, dueJDay); }} className="h-8 px-2 border border-indigo-200 rounded-xl text-sm font-bold bg-white outline-none focus:border-indigo-400"><option value="">ماه</option>{Array.from({length:12},(_,i)=><option key={i+1} value={i+1}>{i+1}</option>)}</select>
                                            <select value={dueJDay} onChange={e => { setDueJDay(e.target.value); updateDueDate(dueJYear, dueJMonth, e.target.value); }} className="h-8 px-2 border border-indigo-200 rounded-xl text-sm font-bold bg-white outline-none focus:border-indigo-400"><option value="">روز</option>{Array.from({length:daysInJalaliMonth(dueJYear,dueJMonth)},(_,i)=><option key={i+1} value={i+1}>{i+1}</option>)}</select>
                                        </div>
                                        {dueDate && <div className="text-xs text-indigo-700 font-bold bg-white border border-indigo-100 rounded-xl px-3 py-1.5">سررسید: {formatJalali(dueDate)} {(() => { const u = getDueUrgency(dueDate); const diff = daysDiffFromToday(dueDate); if (u === 'overdue') return `• ${formatNumber(Math.abs(diff))} روز گذشته`; if (u === 'today') return '• امروز'; return `• ${formatNumber(diff)} روز دیگر`; })()}</div>}
                                    </div>
                                    {(settlementTerm || dueDate || quickDueDays) && (
                                        <button type="button" onClick={() => { setSettlementTerm(''); setDueDate(''); setDueJYear(''); setDueJMonth(''); setDueJDay(''); setQuickDueDays(''); }} className="self-start flex items-center gap-1.5 text-[11px] font-bold text-rose-600 bg-rose-50 border border-rose-100 px-3.5 py-2 rounded-xl hover:bg-rose-100 transition" title="حذف کامل مهلت تسویه و سررسید این فاکتور">
                                            <Trash2 size={13}/> حذف کامل تسویه و سررسید
                                        </button>
                                    )}
                                </div>
                            </div>
                            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden grid grid-cols-1 md:grid-cols-[1fr_auto]">
                                <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 content-center text-xs">
                                    <div className="flex justify-between items-center gap-4 pb-2.5 border-b border-dashed border-slate-200"><span className="text-slate-500">وزن کل</span><strong className="text-slate-800 text-sm tabular-nums">{formatNumber(getCartWeight())} کیلوگرم</strong></div>
                                    <div className="flex justify-between items-center gap-4 pb-2.5 border-b border-dashed border-slate-200"><span className="text-slate-500">جمع اقلام</span><strong className="text-slate-800 text-sm tabular-nums">{formatNumber(getItemsTotal())} تومان</strong></div>
                                    <div className="flex justify-between items-center gap-4 pb-2.5 border-b border-dashed border-slate-200 text-amber-700">
                                        <label className="flex items-center gap-2 cursor-pointer select-none" title="لغو/فعال‌سازی سریع هزینه بارگیری برای همین فاکتور">
                                            <input type="checkbox" className="accent-amber-600 w-4 h-4" checked={includeLoadingCostChoice} onChange={e => setIncludeLoadingCostChoice(e.target.checked)} />
                                            <span className={includeLoadingCostChoice ? 'font-bold' : 'line-through text-slate-400'}>🚛 هزینه بارگیری</span>
                                        </label>
                                        <strong className={`text-sm tabular-nums ${includeLoadingCostChoice ? '' : 'text-slate-400 line-through'}`}>{formatNumber(getAppliedLoadingCostAmount())} تومان</strong>
                                    </div>
                                    <div className="flex justify-between items-center gap-4 pb-2.5 border-b border-dashed border-slate-200 text-indigo-700"><span>💳 مهلت تسویه</span><strong className="text-sm">{settlementTerm.trim() || 'تعیین نشده'}</strong></div>
                                    {dueDate && <div className="flex justify-between items-center gap-4 text-indigo-700 sm:col-span-2"><span>📅 سررسید دقیق</span><strong className="text-sm">{formatJalali(dueDate)}</strong></div>}
                                </div>
                                <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 text-white p-4 md:min-w-[300px] flex flex-col justify-center">
                                    <div className="text-[11px] text-indigo-200 font-bold">جمع کل فاکتور</div>
                                    <div className="mt-1 flex items-baseline gap-1.5"><strong className="text-3xl font-black tabular-nums tracking-tight">{formatNumber(getTotal())}</strong><span className="text-sm font-bold text-indigo-200">تومان</span></div>
                                    <div className="text-[10px] text-indigo-200/90 mt-2 leading-5">{numberToPersianWords(getTotal())} تومان</div>
                                </div>
                            </div>
                        </div>
                        </div>
                        <div className="px-6 py-2.5 bg-white border-t border-slate-200 shadow-[0_-8px_24px_-12px_rgba(15,23,42,0.12)] z-20 shrink-0 flex flex-col lg:flex-row lg:items-center gap-3">
                            <div className="flex items-center justify-between lg:justify-start gap-4 lg:min-w-[220px]">
                                <div>
                                    <div className="text-[10px] font-bold text-slate-400">جمع کل · {formatNumber(cart.length)} قلم</div>
                                    <div className="font-black text-lg text-indigo-700 tabular-nums leading-tight">{formatNumber(getTotal())} <span className="text-xs font-bold text-slate-400">تومان</span></div>
                                </div>
                            </div>
                            <div className="flex gap-2.5 flex-1">
                                <button onClick={() => handleCheck(true)} className="flex-1 h-12 border-2 border-amber-300 text-amber-800 bg-amber-50 rounded-2xl font-bold text-sm hover:bg-amber-100 hover:border-amber-400 transition active:scale-[0.98] flex justify-center items-center gap-2"><Clock size={18}/> {initialData ? 'ذخیره تغییرات (رزرو)' : 'ثبت سفارش (رزرو)'}</button>
                                <button onClick={() => (isEditMode && liveInvoice?.status === 'pending') ? setShowFinalizeShipmentModal(true) : handleCheck(false)} className="flex-1 h-12 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-sm shadow-lg shadow-emerald-600/25 transition active:scale-[0.98] flex justify-center items-center gap-2"><Check size={18}/> ثبت نهایی (تحویل)</button>
                                {cart.length > 0 && customer && <button onClick={() => setShowPrint(true)} className="h-12 px-5 bg-slate-800 hover:bg-slate-900 text-white rounded-2xl font-bold text-sm transition active:scale-[0.98] flex justify-center items-center gap-2 shadow-md" title="پیش‌نمایش و چاپ"><Printer size={18}/> <span className="hidden sm:inline">پیش‌نمایش و چاپ</span></button>}
                            </div>
                        </div>
                        {showFinalizeShipmentModal && liveInvoice && (
                            <ConfirmShipmentModal
                                invoice={liveInvoice}
                                invoices={invoices}
                                motherBagStock={settings?.motherBagStock}
                                onClose={() => setShowFinalizeShipmentModal(false)}
                                onSubmit={async (invId, decisions, dueOverride, motherBagConsumptions) => { await onFinalizeShipment(invId, decisions, dueOverride, motherBagConsumptions); setShowFinalizeShipmentModal(false); }}
                            />
                        )}
                        {showPriceDropReview && (
                            <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
                                <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-rose-200" onClick={e => e.stopPropagation()}>
                                    <div className="bg-rose-50 border-b border-rose-200 p-4 flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center"><AlertTriangle size={22}/></div>
                                        <div><h3 className="font-black text-rose-900">قیمت پایین‌تر از خرید قبلی همین مشتری</h3><p className="text-[11px] text-rose-700 mt-0.5">برای «{customer}» این کالاها قبلاً با قیمت بالاتری فروخته شده‌اند.</p></div>
                                    </div>
                                    <div className="p-4 space-y-2 max-h-[50vh] overflow-y-auto">
                                        {priceDropWarnings.map(w => (
                                            <div key={w.itemId} className="rounded-xl border border-rose-100 bg-rose-50/50 p-3">
                                                <div className="font-bold text-slate-800 text-sm mb-2">{w.name}</div>
                                                <div className="flex items-center justify-between gap-3 text-xs">
                                                    <div className="text-slate-500">
                                                        قیمت قبلی{w.previousDate ? ` (${w.previousDate})` : ''}: <strong className="text-slate-700">{formatNumber(w.previousPrice)} تومان</strong>
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-rose-600 font-bold">قیمت جدید:</span>
                                                        <FormattedInput className="w-28 p-1.5 border border-rose-200 rounded-lg text-center font-bold text-rose-700 bg-white" value={cart.find(c => c.itemId === w.itemId)?.price || ''} onChange={val => updateCart(w.itemId, 'price', val)} placeholder="0" />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="p-4 bg-slate-50 border-t flex gap-2">
                                        <button onClick={() => setShowPriceDropReview(false)} className="flex-1 py-3 rounded-xl border-2 border-slate-200 text-slate-600 font-bold hover:bg-slate-100">بازگشت و ویرایش</button>
                                        <button onClick={() => { setShowPriceDropReview(false); proceedAfterPriceCheck(pendingCheckMode); }} className="flex-1 py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black">تأیید و ادامه</button>
                                    </div>
                                </div>
                            </div>
                        )}
                        {showLoadingReview && (() => {
                            const actualWeight = getCartWeight();
                            const loadingIncrementKg = settings.loadingWeightIncrementKg ?? 1000;
                            const loadingRoundUpThreshold = settings.loadingWeightRoundUpThreshold ?? 0.9;
                            const roundedWeight = roundWeightToIncrement(actualWeight, loadingIncrementKg, loadingRoundUpThreshold);
                            const rate = Number(settings.loadingCostPerTon || 0);
                            const loadingMinWeightKg = settings.loadingMinWeightEnabled ? (settings.loadingMinWeightKg || 0) : 0;
                            const calculated = calculateLoadingCost(actualWeight, rate, loadingIncrementKg, loadingRoundUpThreshold, loadingMinWeightKg);
                            return <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
                                <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-amber-200" onClick={e => e.stopPropagation()}>
                                    <div className="bg-amber-50 border-b border-amber-200 p-4 flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center"><Truck size={22}/></div>
                                        <div className="flex-1"><h3 className="font-black text-amber-900">هزینه بارگیری و تسویه فاکتور</h3><p className="text-[11px] text-amber-700 mt-0.5">برای مشتری «{customer}» هزینه بارگیری لحاظ شود؟</p></div>
                                        <button onClick={() => setShowLoadingReview(false)} className="w-8 h-8 rounded-lg hover:bg-amber-100 text-amber-700 flex items-center justify-center transition shrink-0" title="بستن"><X size={16}/></button>
                                    </div>
                                    <div className="p-4 space-y-3">
                                        <label className={`flex items-center justify-between gap-3 rounded-xl border-2 p-3 cursor-pointer select-none transition ${includeLoadingCostChoice ? 'bg-amber-50 border-amber-300' : 'bg-slate-50 border-slate-200'}`}>
                                            <div className="flex items-center gap-2">
                                                <input type="checkbox" className="accent-amber-600 w-5 h-5" checked={includeLoadingCostChoice} onChange={e => setIncludeLoadingCostChoice(e.target.checked)} />
                                                <div>
                                                    <div className={`text-sm font-black ${includeLoadingCostChoice ? 'text-amber-900' : 'text-slate-700'}`}>محاسبه هزینه بارگیری در این فاکتور</div>
                                                    <div className="text-[10px] text-slate-500 mt-0.5">این انتخاب فقط برای همین فاکتور اعمال می‌شود.</div>
                                                </div>
                                            </div>
                                            <Truck size={20} className={includeLoadingCostChoice ? 'text-amber-600' : 'text-slate-400'} />
                                        </label>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                            <div className="p-3 rounded-xl bg-slate-50 border"><span className="text-[10px] text-slate-400">وزن واقعی بار</span><b className="block mt-1 text-slate-800">{formatNumber(actualWeight)} kg</b></div>
                                            <div className="p-3 rounded-xl bg-slate-50 border"><span className="text-[10px] text-slate-400">وزن محاسباتی</span><b className="block mt-1 text-slate-800">{formatNumber(roundedWeight)} kg</b></div>
                                            <div className="p-3 rounded-xl bg-slate-50 border"><span className="text-[10px] text-slate-400">نرخ</span><b className="block mt-1 text-slate-800">{formatNumber(rate)} ت/تن</b></div>
                                            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200"><span className="text-[10px] text-amber-600">هزینه محاسبه‌شده</span><b className="block mt-1 text-amber-800">{formatNumber(calculated)} تومان</b></div>
                                        </div>
                                        <div className="text-[10px] text-slate-500 bg-slate-50 border rounded-xl p-3">وزن طبق واحد گرد کردن تنظیم‌شده (اکنون {formatNumber(settings.loadingWeightIncrementKg ?? 1000)} کیلوگرم) گرد شده و هزینه بر اساس نرخ فعلی تنظیمات محاسبه شده است.</div>
                                        {loadingMinWeightKg > 0 && actualWeight < loadingMinWeightKg && (
                                            <div className="text-[10px] text-blue-700 bg-blue-50 border border-blue-200 rounded-xl p-3">ℹ️ چون وزن این بار ({formatNumber(actualWeight)} کیلو) از آستانه‌ی حداقل وزن برای بارگیری ({formatNumber(loadingMinWeightKg)} کیلو) کمتر است، هزینه‌ی بارگیری صفر محاسبه شد.</div>
                                        )}
                                        <div className={`text-xs font-bold rounded-xl p-3 border ${includeLoadingCostChoice ? 'text-amber-800 bg-amber-50 border-amber-200' : 'text-slate-600 bg-slate-50 border-slate-200'}`}>
                                            {includeLoadingCostChoice ? '🚛 هزینه بارگیری برای این فاکتور در مبلغ نهایی محاسبه می‌شود.' : '🚛 هزینه بارگیری برای این فاکتور محاسبه نمی‌شود و مبلغ فاکتور فقط شامل جمع اقلام است.'}
                                        </div>
                                        <div className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-3">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Clock size={17} className="text-indigo-600"/>
                                                <div className="font-black text-indigo-900">تسویه فاکتور</div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2 mb-2.5">
                                                <button type="button" onClick={() => applyQuickPay('cash')} className={`py-2 rounded-lg font-black text-xs transition ${quickPayKind === 'cash' ? 'bg-emerald-600 text-white' : 'bg-white border border-emerald-200 text-emerald-700 hover:bg-emerald-50'}`}>💵 نقدی</button>
                                                <button type="button" onClick={() => applyQuickPay('cheque')} className={`py-2 rounded-lg font-black text-xs transition ${quickPayKind === 'cheque' ? 'bg-indigo-600 text-white' : 'bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-50'}`}>🧾 چک ثبتی</button>
                                            </div>
                                            <label className="text-[10px] text-indigo-700 font-bold block mb-1">مهلت / شرایط تسویه</label>
                                            <input className="w-full p-2.5 rounded-lg border border-indigo-200 bg-white text-sm outline-none focus:border-indigo-500" placeholder="مثلاً: نقدی، ۱۵ روز، ۱ ماه، پایان ماه..." value={settlementTerm} onChange={e => setSettlementTerm(e.target.value)} />
                                            {quickPayKind === 'cheque' && (
                                                <div className="mt-2.5">
                                                    <div className="text-[10px] text-indigo-700 font-bold mb-1">تاریخ تسویه (اختیاری)</div>
                                                    <div className="flex gap-1.5" dir="ltr">
                                                        <input inputMode="numeric" placeholder="سال" value={dueJYear} onChange={e => { const v = e.target.value.replace(/\D/g, '').slice(0, 4); setDueJYear(v); updateDueDateClamped(v, dueJMonth, dueJDay); }} className="w-1/3 p-1.5 rounded-lg border border-indigo-200 text-xs text-center outline-none"/>
                                                        <input inputMode="numeric" placeholder="ماه" value={dueJMonth} onChange={e => { const v = e.target.value.replace(/\D/g, '').slice(0, 2); setDueJMonth(v); updateDueDateClamped(dueJYear, v, dueJDay); }} className="w-1/3 p-1.5 rounded-lg border border-indigo-200 text-xs text-center outline-none"/>
                                                        <input inputMode="numeric" placeholder="روز" value={dueJDay} onChange={e => { const v = e.target.value.replace(/\D/g, '').slice(0, 2); setDueJDay(v); updateDueDateClamped(dueJYear, dueJMonth, v); }} className="w-1/3 p-1.5 rounded-lg border border-indigo-200 text-xs text-center outline-none"/>
                                                    </div>
                                                    {dueDate && <div className="text-[10px] text-indigo-600 mt-1.5">سررسید: <b>{formatJalali(dueDate)}</b></div>}
                                                </div>
                                            )}
                                            <div className="text-[9px] text-indigo-500 mt-1.5">این مقدار فقط برای همین فاکتور ثبت می‌شود و برای مشتری ذخیره نمی‌شود.</div>
                                        </div>
                                    </div>
                                    <div className="p-4 bg-slate-50 border-t flex gap-2">
                                        <button onClick={() => setShowLoadingReview(false)} className="px-5 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-100 transition">انصراف</button>
                                        <button onClick={() => confirmLoadingAndFinalize()} className={`flex-1 py-3 rounded-xl text-white font-black ${includeLoadingCostChoice ? 'bg-amber-600 hover:bg-amber-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
                                            {includeLoadingCostChoice ? `تأیید و ثبت فاکتور با ${formatNumber(calculated)} تومان هزینه بارگیری` : 'تأیید و ثبت فاکتور بدون هزینه بارگیری'}
                                        </button>
                                    </div>
                                </div>
                            </div>;
                        })()}
                        {showConfirm && <div className="absolute inset-0 bg-white/90 backdrop-blur-sm z-50 flex items-center justify-center p-6"><div className="bg-white border-2 border-red-100 rounded-2xl shadow-2xl max-w-md w-full p-6"><div className="bg-red-50 w-12 h-12 rounded-full flex items-center justify-center text-red-500 mb-4 mx-auto"><AlertTriangle size={24}/></div><h3 className="text-xl font-black text-center text-slate-800 mb-2">هشدار کسری موجودی</h3><p className="text-center text-slate-500 text-sm mb-6">موجودی آزاد برای درخواست شما کافی نیست. تایید باعث منفی شدن موجودی می‌شود.</p><div className="flex gap-3"><button onClick={() => setShowConfirm(false)} className="flex-1 py-3 border border-slate-200 rounded-xl text-slate-600 font-bold hover:bg-slate-50">لغو</button><button onClick={() => { setShowConfirm(false); checkMotherBagsAndProceedPOS(pendingMode); }} className="flex-1 py-3 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600">تایید و ادامه</button></div></div></div>}
                        {motherBagReviewPOS && (
                            <div className="absolute inset-0 bg-white/90 backdrop-blur-sm z-50 flex items-center justify-center p-6">
                                <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-amber-200">
                                    <div className="bg-amber-50 border-b border-amber-200 p-4 flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center"><PackageOpen size={22}/></div>
                                        <div><h3 className="font-black text-amber-900">پیش‌بینی مصرف کیسه‌ی مادر</h3><p className="text-[11px] text-amber-700 mt-0.5">تعداد کیسه‌ی ۵ کیلویی این ردیف‌ها مضربی از ۶ (۳۰ کیلو) است — همین الان، {motherBagReviewPOS.isPending ? 'موقع رزرو' : 'موقع ثبت نهایی'}، پیش‌بینی مصرف کیسه‌ی مادر را ببین.</p></div>
                                    </div>
                                    <div className="p-4 space-y-2 max-h-[50vh] overflow-y-auto">
                                        {motherBagReviewPOS.preds.map(w => (
                                            <div key={w.idx} className={`rounded-xl border p-3 text-xs ${w.shortfall > 0 ? 'border-red-200 bg-red-50/40' : 'border-amber-100 bg-amber-50/50'}`}>
                                                <div className="font-bold text-slate-800 mb-1">{w.name}</div>
                                                <div className="text-slate-600">{formatNumber(w.bags)} کیسه‌ی ۵ کیلویی (= {formatNumber(w.totalKg)} کیلو)</div>
                                                <div className="text-amber-700 font-black mt-1">پیش‌بینی مصرف: {formatNumber(w.motherBags)} کیسه‌ی مادر</div>
                                                {w.stockEntry ? (
                                                    w.shortfall > 0
                                                        ? <div className="text-red-600 font-bold mt-1 flex items-center gap-1"><AlertTriangle size={12}/> موجودی کیسه‌ی مادر «{w.stockEntry.color}» کافی نیست — موجودی فعلی: {formatNumber(w.availableQty)}، کسری: {formatNumber(w.shortfall)}</div>
                                                        : <div className="text-emerald-700 mt-1">موجودی کیسه‌ی مادر «{w.stockEntry.color}» کافی است (فعلاً: {formatNumber(w.availableQty)})</div>
                                                ) : (
                                                    <div className="text-slate-400 mt-1">این محصول در لیست «موجودی کیسه مادر» ثبت نشده — کسری محاسبه نمی‌شود.</div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                    <div className="p-4 bg-slate-50 border-t flex gap-2">
                                        <button onClick={() => setMotherBagReviewPOS(null)} className="flex-1 py-3 rounded-xl border-2 border-slate-200 text-slate-600 font-bold hover:bg-slate-100">بازگشت و ویرایش</button>
                                        <button onClick={() => { const isPending = motherBagReviewPOS.isPending; setMotherBagReviewPOS(null); openLoadingReview(isPending); }} className="flex-1 py-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black">متوجه شدم، ادامه</button>
                                    </div>
                                </div>
                            </div>
                        )}
                        {showDescModal && (() => {
                            const previewText = generateAutoDescription(descOpts);
                            const toggles = [['weight', 'وزن کل'], ['brand', 'برند'], ['tag', 'مشخصه'], ['motherBag', 'معادل کیسه مادر'], ['totals', 'جمع کل (قلم / کیسه / وزن)']];
                            const setRow = (id, patch) => setCalcRows(r => ({ ...r, [id]: { ...r[id], ...patch } }));
                            const tabCls = (t) => `flex-1 py-2 rounded-xl text-xs font-black transition ${descTab === t ? 'bg-indigo-600 text-white shadow' : 'text-slate-500 hover:bg-white'}`;
                            return <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4" onClick={() => setShowDescModal(false)}>
                                <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-200" onClick={e => e.stopPropagation()}>
                                    <div className="px-5 py-3 border-b flex items-center justify-between">
                                        <h3 className="font-black text-slate-800 text-sm flex items-center gap-2"><ClipboardList size={16}/> تولید و کپی توضیحات</h3>
                                        <button type="button" onClick={() => setShowDescModal(false)} className="text-slate-400 hover:text-slate-700 text-lg leading-none px-2">✕</button>
                                    </div>
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-5 overflow-auto">
                                        <div className="flex flex-col gap-3">
                                            <div className="flex gap-1 bg-slate-100 p-1 rounded-2xl">
                                                <button type="button" className={tabCls('view')} onClick={() => setDescTab('view')}>نمایش اطلاعات</button>
                                                <button type="button" className={tabCls('calc')} onClick={() => setDescTab('calc')}>محاسبه وزن / تعداد</button>
                                            </div>
                                            {descTab === 'view' ? (
                                                <div className="flex flex-col gap-2">
                                                    {toggles.map(([k, label]) => (
                                                        <label key={k} className="flex items-center gap-2 text-sm font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 cursor-pointer select-none">
                                                            <input type="checkbox" checked={!!descOpts[k]} onChange={e => setDescOpts(o => ({ ...o, [k]: e.target.checked }))} className="w-4 h-4 accent-indigo-600"/> {label}
                                                        </label>
                                                    ))}
                                                    <div className="text-[11px] text-slate-400 leading-5">خاموش‌کردن هر بخش فقط متن را کوتاه می‌کند؛ اطلاعات فاکتور تغییری نمی‌کند.</div>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col gap-2">
                                                    <div className="text-[11px] text-slate-500 leading-5">وزن کل و تعداد را بنویسید تا وزن هر کیسه حساب شود. این اصلاح فقط روی متن توضیحات اثر دارد، نه روی ردیف‌های فاکتور.</div>
                                                    {cart.map(c => {
                                                        const ov = calcRows[c.itemId] || {};
                                                        const w = ov.weight ?? c.weight, q = ov.qty ?? c.qty;
                                                        const sp = splitWeightIntoBags(w, q);
                                                        const inCls = 'w-full h-9 px-3 rounded-xl border border-slate-300 text-sm bg-white outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100';
                                                        return <div key={c.itemId} className="border border-slate-200 rounded-2xl p-3 flex flex-col gap-2 bg-slate-50/60">
                                                            <div className="font-black text-xs text-slate-800">{c.name}</div>
                                                            <div className="grid grid-cols-2 gap-2">
                                                                <label className="text-[11px] text-slate-500 font-bold">وزن کل (کیلو)<input type="number" step="any" min="0" className={inCls} value={w || ''} onChange={e => setRow(c.itemId, { weight: parseDecimal(e.target.value) })}/></label>
                                                                <label className="text-[11px] text-slate-500 font-bold">تعداد کیسه<input type="number" step="any" min="0" className={inCls} value={q || ''} onChange={e => setRow(c.itemId, { qty: parseDecimal(e.target.value) })}/></label>
                                                            </div>
                                                            {w > 0 && q > 0 && (sp.clean
                                                                ? <div className="text-xs font-bold text-emerald-700">✓ {formatNumber(q)} کیسه {formatNumber(sp.perBag)} کیلویی</div>
                                                                : <div className="text-xs bg-amber-50 border border-amber-200 rounded-xl p-2 flex flex-col gap-1.5">
                                                                    <div className="font-bold text-amber-800">تقسیم گرد نمی‌شود (حدود {formatNumber(Math.round(sp.perBag * 100) / 100)} کیلو برای هر کیسه). کدام در متن بیاید؟</div>
                                                                    {sp.groups.length > 0 && <label className="flex items-center gap-2 cursor-pointer"><input type="radio" className="accent-indigo-600" checked={ov.choice === 'split'} onChange={() => setRow(c.itemId, { choice: 'split' })}/> دو دسته: {sp.groups.map(g => `${formatNumber(g.count)} کیسه ${formatNumber(g.kg)} کیلویی`).join(' و ')}</label>}
                                                                    <label className="flex items-center gap-2 cursor-pointer"><input type="radio" className="accent-indigo-600" checked={ov.choice !== 'split'} onChange={() => setRow(c.itemId, { choice: 'none' })}/> فقط تعداد کیسه، بدون وزن هر کیسه</label>
                                                                </div>)}
                                                        </div>;
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            <div className="text-xs font-black text-slate-700">پیش‌نمایش متن</div>
                                            <textarea readOnly value={previewText} className="w-full flex-1 min-h-[300px] p-3 border border-slate-200 rounded-2xl text-sm leading-7 bg-slate-50 outline-none resize-none" dir="rtl"/>
                                        </div>
                                    </div>
                                    <div className="px-5 py-3 border-t flex justify-end gap-2">
                                        <button type="button" onClick={() => setShowDescModal(false)} className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition">انصراف</button>
                                        <button type="button" onClick={commitDescription} className="px-4 py-2 rounded-xl text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 transition flex items-center gap-1.5"><ClipboardList size={14}/> درج در توضیحات و کپی</button>
                                    </div>
                                </div>
                            </div>;
                        })()}
                        {showManualModal && <ManualItemModal onClose={() => setShowManualModal(false)} onAdd={addManualItem} items={items} />}
                        {showPrint && <PrintInvoiceModal invoice={{id: initialData?.id || 'draft', date, customer, items: cart, description, settlementTerm, dueDate, includeLoadingCost: includeLoadingCostChoice, loadingCostAmount: includeLoadingCostChoice ? getLoadingCostAmount() : 0, totalPrice: getTotal(), status: initialData?.status || 'draft', notices: getSelectedNoticeTexts()}} settings={settings} inventoryItems={items} onClose={() => setShowPrint(false)} />}
                        {editingCartItem && (
                            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                                <div className="bg-white rounded-2xl p-5 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="font-bold text-slate-800 flex items-center gap-2"><Pencil size={16} className="text-indigo-500"/> ویرایش ردیف فاکتور</h3>
                                        <button onClick={() => setEditingCartItem(null)}><X size={18} className="text-slate-400 hover:text-red-500"/></button>
                                    </div>
                                    <div className="space-y-3">
                                        <div className="relative">
                                            <label className="text-[10px] text-slate-500 font-bold block mb-1">نام کالا {!editingCartItem.isManual && <span className="text-emerald-600">(متصل به انبار)</span>}{editingCartItem.isManual && <span className="text-amber-600">(دستی — بدون کسر از انبار)</span>}</label>
                                            <input
                                                className="w-full p-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-400 bg-slate-50 font-bold"
                                                value={editingCartItem.name}
                                                onChange={e => {
                                                    const val = e.target.value;
                                                    setEditingCartItem({...editingCartItem, name: val});
                                                    if (val.length > 1) {
                                                        const allMatches = items.filter(i => smartSearchMatch(i.name, val)).slice(0, 6);
                                                        setCartEditSuggestions(allMatches);
                                                        setShowCartEditSugg(allMatches.length > 0);
                                                    } else {
                                                        setCartEditSuggestions([]); setShowCartEditSugg(false);
                                                    }
                                                }}
                                                onFocus={() => editingCartItem.name.length > 1 && cartEditSuggestions.length > 0 && setShowCartEditSugg(true)}
                                                onBlur={() => setTimeout(() => setShowCartEditSugg(false), 150)}
                                                autoComplete="off"
                                            />
                                            {showCartEditSugg && cartEditSuggestions.length > 0 && (
                                                <div className="absolute z-10 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                                    {cartEditSuggestions.map(s => (
                                                        <button
                                                            key={s.id}
                                                            type="button"
                                                            onClick={() => {
                                                                setEditingCartItem({
                                                                    ...editingCartItem,
                                                                    itemId: s.id,
                                                                    name: s.name,
                                                                    brand: s.brand,
                                                                    tag: s.tag,
                                                                    unit: s.unit,
                                                                    isManual: false,
                                                                    stock: getRealStock(s),
                                                                    deductionPerBag: s.deductionPerBag || null,
                                                                    deductionDate: s.deductionDate || null,
                                                                    bagWeight: s.bagWeight || null,
                                                                });
                                                                setShowCartEditSugg(false);
                                                            }}
                                                            className="w-full text-right px-3 py-2 text-sm hover:bg-indigo-50 border-b border-slate-50 last:border-0 flex justify-between items-center gap-2"
                                                        >
                                                            <span className="font-bold text-slate-700 truncate">{s.name}</span>
                                                            <span className="text-[10px] text-left shrink-0 flex items-center gap-1"><ItemDistinguishBadges item={s}/> <span className="text-slate-300 font-mono">#{s.id.slice(-6)}</span></span>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                            {!editingCartItem.isManual && editingCartItem.itemId !== editingCartItem._originalItemId && (
                                                <p className="text-[10px] text-emerald-600 mt-1">✓ این ردیف اکنون به کالای دیگری از انبار متصل شد و کسر موجودی از همان کالا انجام می‌شود.</p>
                                            )}
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <label className="text-[10px] text-slate-500 font-bold block mb-1">برند</label>
                                                <input className="w-full p-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-400 bg-slate-50" value={editingCartItem.brand || ''} onChange={e => setEditingCartItem({...editingCartItem, brand: e.target.value})} />
                                            </div>
                                            <div>
                                                <label className="text-[10px] text-slate-500 font-bold block mb-1">تگ / مدل</label>
                                                <input className="w-full p-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-400 bg-slate-50" value={editingCartItem.tag || ''} onChange={e => setEditingCartItem({...editingCartItem, tag: e.target.value})} />
                                            </div>
                                        </div>
                                        <div className="border-t border-dashed border-slate-200 pt-3 grid grid-cols-2 gap-2.5">
                                            <div>
                                                <label className="text-[10px] text-slate-500 font-bold block mb-1">تعداد (کیسه)</label>
                                                <input type="number" min="0" step="any" className="w-full p-2 border border-slate-200 rounded-lg text-center font-bold text-slate-700 outline-none focus:border-indigo-400 bg-slate-50" value={editingCartItem.qty} onChange={e => setEditingCartItem({...editingCartItem, qty: Math.max(0, Number(e.target.value) || 0)})} />
                                            </div>
                                            <div>
                                                <label className="text-[10px] text-slate-500 font-bold block mb-1">وزن (کیلوگرم)</label>
                                                <input type="number" min="0" step="any" className="w-full p-2 border border-indigo-200 rounded-lg text-center font-black text-indigo-700 bg-indigo-50 outline-none focus:border-indigo-400" value={editingCartItem.weight} onChange={e => setEditingCartItem({...editingCartItem, weight: Math.max(0, Number(e.target.value) || 0)})} placeholder="0" />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-[10px] text-slate-500 font-bold block mb-1">قیمت هر کیلو (تومان)</label>
                                            <FormattedInput className="w-full p-2 border border-slate-200 rounded-lg text-center font-bold text-slate-700 outline-none focus:border-indigo-400 bg-slate-50" value={editingCartItem.price} onChange={val => setEditingCartItem({...editingCartItem, price: Number(val)})} placeholder="0" />
                                        </div>
                                        {editingCartItem.qty > 0 && editingCartItem.weight > 0 && (
                                            <div className="bg-emerald-50 p-2.5 rounded-lg border border-emerald-100 text-sm text-center">
                                                <span className="text-slate-500">جمع کل: </span>
                                                <span className="font-black text-emerald-600">{formatNumber(editingCartItem.weight * editingCartItem.price)} تومان</span>
                                            </div>
                                        )}
                                        {editingCartItem.deductionPerBag > 0 && editingCartItem.qty > 0 && (
                                            <div className="bg-blue-50 p-2.5 rounded-lg border border-blue-100 text-[10px] text-blue-700">
                                                📋 <strong>پاورقی کسری:</strong> {editingCartItem.qty} کیسه × {formatNumber(editingCartItem.deductionPerBag)}گ = <strong>{((editingCartItem.qty * editingCartItem.deductionPerBag) / 1000).toFixed(3)} کیلوگرم</strong>
                                            </div>
                                        )}
                                        <div className="border-t border-dashed border-slate-200 pt-3">
                                            <label className="flex items-center gap-2 text-xs font-bold text-purple-700 cursor-pointer select-none mb-2">
                                                <input type="checkbox" className="accent-purple-600 w-4 h-4" checked={!!editingCartItem.sourced} onChange={e => setEditingCartItem({...editingCartItem, sourced: e.target.checked})} />
                                                🛒 این کالا را خودم از تامین‌کننده/شخص دیگری خریداری کردم
                                            </label>
                                            {editingCartItem.sourced && (
                                                <div className="space-y-2 bg-purple-50 border border-purple-100 rounded-lg p-2.5">
                                                    <div>
                                                        <label className="text-[10px] text-purple-600 font-bold block mb-1">خریداری‌شده از (نام فروشگاه/شخص)</label>
                                                        <input className="w-full p-2 border border-purple-200 rounded-lg text-sm outline-none focus:border-purple-400 bg-white" value={editingCartItem.sourceParty || ''} onChange={e => setEditingCartItem({...editingCartItem, sourceParty: e.target.value})} placeholder="مثلاً: آقای فلانی" />
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <div>
                                                            <label className="text-[10px] text-purple-600 font-bold block mb-1">قیمت خرید (هر کیلو)</label>
                                                            <FormattedInput className="w-full p-2 border border-purple-200 rounded-lg text-sm outline-none focus:border-purple-400 bg-white text-center" value={editingCartItem.sourcePrice || 0} onChange={val => setEditingCartItem({...editingCartItem, sourcePrice: Number(val)})} placeholder="0" />
                                                        </div>
                                                        <div>
                                                            <label className="text-[10px] text-purple-600 font-bold block mb-1">وضعیت تسویه با او</label>
                                                            <select className="w-full p-2 border border-purple-200 rounded-lg text-sm outline-none focus:border-purple-400 bg-white" value={editingCartItem.sourceSettlement || 'unsettled'} onChange={e => setEditingCartItem({...editingCartItem, sourceSettlement: e.target.value})}>
                                                                <option value="unsettled">تسویه‌نشده</option>
                                                                <option value="settled">تسویه‌شده</option>
                                                            </select>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] text-purple-600 font-bold block mb-1">یادداشت (اختیاری)</label>
                                                        <input className="w-full p-2 border border-purple-200 rounded-lg text-sm outline-none focus:border-purple-400 bg-white" value={editingCartItem.sourceNote || ''} onChange={e => setEditingCartItem({...editingCartItem, sourceNote: e.target.value})} placeholder="مثلاً: نقدی تسویه شد" />
                                                    </div>
                                                    <p className="text-[9px] text-purple-500">این اطلاعات فقط برای یادآوری خودتان است و در محاسبه فاکتور دخالتی ندارد. در پرینت هم پیش‌فرض مخفی است — هنگام چاپ از «نمایش اطلاعات» فعالش کنید.</p>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex gap-2 mt-2">
                                            <button onClick={() => setEditingCartItem(null)} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-slate-500 font-bold text-sm hover:bg-slate-50">لغو</button>
                                            <button onClick={() => {
                                                const { _originalItemId, ...toSave } = editingCartItem;
                                                setCart(cart.map(c => c.itemId === _originalItemId ? toSave : c));
                                                setEditingCartItem(null);
                                            }} className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 shadow-lg shadow-indigo-200">ذخیره</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            );
        };

