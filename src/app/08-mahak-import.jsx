//## ═══ app/08-mahak-import.jsx ═══
//## ورود/همگام‌سازی از محک: نرمال‌سازی نام، smartSearchMatch، MahakImportView، parseMahakExcelFile.
//## ترتیب فایل‌ها در build.py مهم است؛ همه‌ی بخش‌ها یک scope مشترک دارند.
        // ------------------------------------------------------------------
        // همگام‌سازی هوشمند موجودی محک
        // فقط دو ستون «نام کامل کالا» و «موجودي» استفاده می‌شوند.
        // بقیه ستون‌های فایل محک عمداً نادیده گرفته می‌شوند.
        // ------------------------------------------------------------------
        const normalizeMahakName = (value) => String(value || '')
            .replace(/[يى]/g, 'ی').replace(/ك/g, 'ک')
            .replace(/[ۀة]/g, 'ه').replace(/[ؤ]/g, 'و')
            .replace(/[إأٱ]/g, 'ا')
            .replace(/[\u064B-\u065F\u0670]/g, '')
            .replace(/[۰-۹]/g, ch => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(ch)))
            .replace(/[٠-٩]/g, ch => String('٠١٢٣٤٥٦٧٨٩'.indexOf(ch)))
            .replace(/[\u200c\u200d]/g, ' ')
            .replace(/[^\u0600-\u06FFa-zA-Z0-9]+/g, ' ')
            .trim().replace(/\s+/g, ' ').toLocaleLowerCase('fa-IR');

        // جستجوی هوشمند کالا: قبل از مقایسه، متن جستجو و نام/برند/تگ کالا یکسان‌سازی می‌شوند
        // تا تفاوت‌های ی/ي عربی، ک/ك عربی، نیم‌فاصله، فاصله‌های اضافه و بزرگی/کوچکی حروف باعث
        // نیامدن کالا در نتایج جستجو نشوند (مثلاً هنگام فروش یا افزودن کالا به فاکتور).
        const smartSearchMatch = (haystack, needle) => {
            const n = normalizeMahakName(needle);
            if (!n) return true;
            return normalizeMahakName(haystack).includes(n);
        };

        // نسخهٔ بهترِ جستجو برای دراپ‌داون‌های افزودن/فروش کالا: مشکل حالت قبلی این بود که کل عبارتِ جستجو
        // باید عیناً داخل «یک» فیلد (فقط نام یا فقط تگ) پیدا می‌شد؛ پس اگر کسی مثلاً «۲۵ کیلویی» را می‌زد ولی
        // این عبارت دقیقاً به همین شکل (با همون فاصله‌ها) در تگ ذخیره نشده بود، یا اگر می‌خواست با برند جستجو کند،
        // نتیجه‌ای پیدا نمی‌شد. اینجا عبارتِ جستجو به کلمه تقسیم می‌شود و هر کلمه می‌تواند در «هرکدام» از
        // نام/برند/تگ (مجموعِ هر سه با هم) پیدا شود؛ ترتیب کلمات هم مهم نیست.
        const smartItemMatch = (item, needle) => {
            const n = normalizeMahakName(needle);
            if (!n) return true;
            const words = n.split(' ').filter(Boolean);
            const haystack = normalizeMahakName([item.name, item.brand, item.tag].filter(Boolean).join(' '));
            return words.every(w => haystack.includes(w));
        };

        const mahakSimilarity = (a, b) => {
            const aa = normalizeMahakName(a).split(' ').filter(Boolean);
            const bb = normalizeMahakName(b).split(' ').filter(Boolean);
            if (!aa.length || !bb.length) return 0;
            const sa = new Set(aa), sb = new Set(bb);
            let common = 0; sa.forEach(x => { if (sb.has(x)) common++; });
            return common / new Set([...aa, ...bb]).size;
        };

        // نکته‌ی مهم: قبلاً اگر واحد فعلی کالا هنوز «کیلوگرم» بود، حتی اگر وزن کیسه هم برایش ثبت شده بود،
        // سیستم همیشه وارد حالت kg می‌شد و وزن کیسه را نادیده می‌گرفت. این باعث می‌شد کالاهایی که کاربر
        // برایشان وزن کیسه تعریف کرده ولی هنوز واحدشان را رسماً به «کیسه» تغییر نداده، در Sync بعدی باز هم
        // به‌صورت خام کیلوگرمی وارد شوند. پارامتر forcePackage همین را جبران می‌کند: وقتی صریحاً true باشد
        // (یعنی کاربر در پاپ‌آپ تأیید کرده)، وزن کیسه بر واحد فعلی اولویت دارد.
        const getMahakTargetMode = (item, explicitWeightKg, forcePackage) => {
            const weightKg = Number(explicitWeightKg) > 0 ? Number(explicitWeightKg) : (Number(item?.bagWeight) > 0 ? Number(item.bagWeight) / 1000 : 0);
            const unit = String(item?.unit || '').trim().toLowerCase();
            if (forcePackage && weightKg > 0) return { kind: 'package', weightKg };
            if (unit === 'کیلو' || unit === 'کیلوگرم' || unit === 'kg') return { kind: 'kg', weightKg: 1 };
            if (weightKg > 0) return { kind: 'package', weightKg };
            return { kind: 'unknown', weightKg: 0 };
        };

        const convertMahakKgToTarget = (kg, item, explicitWeightKg, forcePackage, mahakQty2) => {
            const n = Number(kg);
            if (!Number.isFinite(n)) return { ok:false, value:0, reason:'موجودی محک عددی نیست.' };
            const mode = getMahakTargetMode(item, explicitWeightKg, forcePackage);
            if (mode.kind === 'kg') return { ok:true, value:n, mode:'kg', remainder:0, weightKg:1 };
            // رفع باگِ مهم: قبلاً برای هر کالای غیرکیلویی همیشه تعداد کیسه/کارتن از رویِ کیلوگرم کل تقسیم بر
            // «حدسِ» وزنِ هر کیسه حساب می‌شد؛ اگر این حدس با وزنِ واقعیِ بسته‌بندیِ محک کمی فرق می‌داشت (یا
            // اصلاً برای آن کالا ثبت نشده بود)، عددِ نهایی غلط بود یا اصلاً تبدیل انجام نمی‌شد. خودِ فایلِ
            // خروجیِ محک برای همین کالاها یک ستونِ دوم («موجودی ۲») دارد که همان تعدادِ دقیقِ کیسه/کارتن را
            // به‌طور مستقیم و بدون نیاز به حدسِ وزن می‌دهد؛ وقتی این عدد موجود و مثبت باشد، همیشه همان مبنا
            // قرار می‌گیرد — دقیق‌تر از هر تقسیمی است، چون خودِ محک همین عدد را حساب کرده.
            if (mode.kind === 'package') {
                const value = n / mode.weightKg;
                const rounded = Math.abs(value - Math.round(value)) < 1e-9 ? Math.round(value) : Number(value.toFixed(4));
                const remainder = n - (Math.floor(value) * mode.weightKg);
                return { ok:true, value:rounded, mode:'package', remainder: remainder > 1e-9 ? Number(remainder.toFixed(4)) : 0, weightKg:mode.weightKg };
            }
            // ستون «موجودی ۲» محک فقط وقتی مبنا می‌شود که وزن کیسه‌ای تعریف نشده باشد؛ اگر وزن کیسه را خودت
            // مشخص کرده‌ای (مثلاً ۱۰ کیلو)، همان وزن اولویت دارد — محک کیسه‌های ناهم‌وزن را در یک عدد جمع می‌زند.
            const directQty2 = Number(mahakQty2);
            if (Number.isFinite(directQty2) && directQty2 > 0) {
                return { ok:true, value:directQty2, mode:'package-direct', remainder:0, weightKg:mode.weightKg || 0 };
            }
            return { ok:false, value:0, reason:'واحد کالا کیلو نیست، وزن بسته/کارتن هم تعریف نشده و فایل محک برای این ردیف تعداد مستقیم (موجودی ۲) نداده است.' };
        };

        const MahakImportView = ({ items, settings, onSaveSettings, onApplySync, onBackup, onClose }) => {
            const toast = useToast();
            const confirmAction = useConfirm();
            const [rows, setRows] = useState([]);
            const [fileName, setFileName] = useState('');
            const [step, setStep] = useState(1);
            const [busy, setBusy] = useState(false);
            const [openLinkRow, setOpenLinkRow] = useState(null);
            const [linkSearch, setLinkSearch] = useState('');
            // شناسه مواردی که هنگام ورود به بازبینی خطادار بودند را ثابت نگه می‌داریم؛
            // با اصلاح وزن، ردیف از جلوی چشم کاربر به پایین لیست نمی‌پرد.
            const [pinnedReviewIds, setPinnedReviewIds] = useState([]);
            // «محک منبع اصلی است»: وقتی فعال باشد، هر باری که قبلاً از محک لینک شده بود ولی در فایل جدید
            // دیگر نیست (یعنی از محک حذف شده)، کاندید حذف از انبار خودمان هم می‌شود — البته فقط بعد از
            // نمایش صریح لیست و تأیید کاربر، نه خودکار و بی‌صدا.
            const [mahakIsMaster, setMahakIsMasterRaw] = useState(() => { try { return localStorage.getItem('anbaryar_mahak_master') !== '0'; } catch(e) { return true; } });
            const setMahakIsMaster = (v) => { setMahakIsMasterRaw(v); try { localStorage.setItem('anbaryar_mahak_master', v ? '1' : '0'); } catch(e) {} };
            const [nonPositiveRows, setNonPositiveRows] = useState([]);
            const [removeMode, setRemoveMode] = useState('zero');
            const [extraIncludedIds, setExtraIncludedIds] = useState(() => new Set());
            // اقلامی که کاربر صریحاً از حذف خودکار مستثنی کرده (یعنی تیک آن‌ها را برداشته)
            const [removalExcludedIds, setRemovalExcludedIds] = useState(() => new Set());
            const mappings = settings?.mahakMappings || {};

            const readFile = async (file) => {
                setBusy(true);
                try {
                    const parsedResult = await parseMahakExcelFile(file);
                    const parsed = parsedResult.rows;
                    setNonPositiveRows(parsedResult.nonPositiveRows || []); setRemovalExcludedIds(new Set()); setExtraIncludedIds(new Set());
                    const next = parsed.map((r, idx) => {
                        const norm = normalizeMahakName(r.mahakName);
                        const mappedId = mappings[norm]?.itemId;
                        const mappedItem = mappedId ? items.find(i => i.id === mappedId) : null;
                        let exact = null;
                        let isAmbiguous = false;
                        // اولویت با تطبیق دقیق نام است؛ لینک قدیمی فقط وقتی استفاده می‌شود که نام دقیق پیدا نشود.
                        const exactMatches = items.filter(i => normalizeMahakName(i.name) === norm);
                        if (exactMatches.length === 1) exact = exactMatches[0];
                        else if (exactMatches.length > 1) {
                            if (mappedItem && exactMatches.some(m => m.id === mappedItem.id)) exact = mappedItem;
                            else isAmbiguous = true;
                        } else exact = mappedItem;
                        // فقط کالاهای دارای موجودی مثبت در پیشنهادها/جستجوی لینک نمایش داده می‌شوند؛
                        // چون کاربر نمی‌خواهد کالاهای صفر موجودی مزاحم انتخاب باشند.
                        const candidatePool = items.filter(i => Number(i.quantity) > 0 || i.id === mappedItem?.id);
                        const suggestionCandidates = [...candidatePool]
                            .map(i => ({ item:i, score:mahakSimilarity(r.mahakName, i.name) }))
                            .filter(x => x.score > 0)
                            .sort((a,b)=>b.score-a.score).slice(0,5);
                        // نکته‌ی مهم (رفع باگ آمار اشتباه Sync): قبلاً اگر یک‌بار وزن کیسه/کارتن برای این نام محک
                        // در mappings ذخیره می‌شد، همان عدد قدیمی برای همیشه در Syncهای بعدی هم استفاده می‌شد — حتی
                        // اگر کاربر بعداً وزن واقعی کیسه را در تعریف خود کالا اصلاح/درست کرده باشد. نتیجه این بود که
                        // عدد تبدیل‌شده (تعداد کارتن) همیشه بر مبنای وزن قدیمی و غلط حساب می‌شد (مثلاً ۴۴ به‌جای ۳۷).
                        // چون وزن کیسه‌ی ثبت‌شده روی خود کالا منبع اصلی و به‌روز است، همیشه همان در اولویت است؛
                        // فقط وقتی کالا فعلاً هیچ وزن کیسه‌ای ندارد از عدد قبلاً ذخیره‌شده در mapping استفاده می‌شود.
                        const initialWeight = (exact?.bagWeight ? Number(exact.bagWeight)/1000 : null) ?? mappings[norm]?.weightKg ?? '';
                        const mode = exact ? (mappings[norm]?.mode || 'existing') : 'existing';
                        // اگر کالای متصل‌شده هنوز واحدش «کیلوگرم» است ولی از قبل وزن کیسه هم برایش ثبت شده،
                        // باید از کاربر بپرسیم آیا از این به بعد بر مبنای همون وزن کیسه به تعداد تبدیل شود یا نه —
                        // مگر اینکه قبلاً یک‌بار برای همین کالا این تصمیم گرفته و ذخیره شده باشد (useBagWeightMode)،
                        // که در آن صورت دیگر دوباره سؤال نمی‌شود و همون تصمیم قبلی به‌طور خودکار اعمال می‌شود.
                        const exactUnit = String(exact?.unit || '').trim();
                        const hasKgUnitWithBagWeight = !!exact && Number(exact.bagWeight) > 0 && (exactUnit === 'کیلوگرم' || exactUnit === 'کیلو');
                        const savedDecision = mappings[norm]?.useBagWeightMode;
                        const forcePackage = savedDecision === true ? true : (savedDecision === false ? false : (hasKgUnitWithBagWeight ? null : false));
                        return {
                            id:`mahak-row-${idx}-${Date.now()}`,
                            mahakName:r.mahakName,
                            mahakKg:r.quantity,
                            mahakQty2:r.quantity2,
                            mahakUnit2:r.unit2,
                            normalized:norm,
                            itemId:exact?.id || '',
                            targetName:exact?.name || r.mahakName,
                            targetUnit:exact?.unit || 'کیسه',
                            weightKg:initialWeight,
                            mode,
                            isAmbiguous,
                            forcePackage,
                            suggestionCandidates,
                        };
                    });
                    // جلوگیری از تداخل: اگر چند ردیف محک به یک کالا وصل شده‌اند، ردیفی که نامش دقیقاً با نام کالاست صاحب آن کالاست
                    // و بقیه جدا می‌شوند (تا ردیف آخرِ فایل بی‌صدا روی موجودیِ درست ننشیند).
                    const byItem = new Map();
                    next.forEach(r => { if (r.itemId) { if (!byItem.has(r.itemId)) byItem.set(r.itemId, []); byItem.get(r.itemId).push(r); } });
                    let detachedCount = 0;
                    byItem.forEach((list, itemId) => {
                        if (list.length < 2) return;
                        const it = items.find(i => i.id === itemId);
                        const owner = list.find(r => r.normalized === normalizeMahakName(it?.name));
                        list.forEach(r => {
                            if (!owner) { r.conflictNote = `چند ردیف محک به «${it?.name}» وصل‌اند؛ یکی را به کالای دیگر وصل کن.`; return; }
                            if (r === owner) return;
                            r.conflictNote = `لینک قبلی به «${it?.name}» بود که مالِ ردیف «${owner.mahakName}» است؛ جدا شد.`;
                            r.itemId = ''; r.targetName = r.mahakName; r.targetUnit = 'کیلوگرم'; r.weightKg = ''; r.forcePackage = false; detachedCount++;
                        });
                    });
                    setRows(next); setFileName(file.name || 'فایل محک'); setStep(2);
                    if (detachedCount) setTimeout(() => toast.show(`${detachedCount} ردیف چون با ردیف دیگری روی یک کالا تداخل داشتند جدا شدند؛ در تطبیق تعیین‌تکلیفشان کن.`), 600);
                    toast.show(`فایل محک خوانده شد: ${parsedResult.totalRows} ردیف؛ ${parsedResult.zeroRows} ردیف صفر/منفی (برای صفر کردن موجودی) و ${next.length} ردیف مثبت وارد تطبیق شد.`);
                } catch (e) {
                    console.error(e);
                    // پیام خطای واقعی را هم نشان می‌دهیم (نه فقط یک پیام کلی)، چون قبلاً وقتی مشکلی پیش می‌آمد
                    // (مثلاً کتابخانه‌ی Excel هنوز بارگذاری نشده، یا ستون‌ها پیدا نشدند، یا فایل خراب بود)،
                    // همه در یک پیام یکسان و مبهم گم می‌شدند و تشخیص علت واقعی سخت بود.
                    toast.show(`فایل محک خوانده نشد: ${e?.message || 'خطای نامشخص'}`);
                } finally { setBusy(false); }
            };

            const updateRow = (id, patch) => setRows(prev => prev.map(r => r.id === id ? {...r, ...patch} : r));

            const unresolved = rows.filter(r => {
                const item = items.find(i => i.id === r.itemId);
                return r.mode === 'new' ? !r.targetName : !item;
            });
            // ردیف‌های «مبهم» (چند کالای هم‌نام در انبار وجود دارد و سیستم نمی‌داند کدام منظور است) نباید
            // هیچ‌وقت با دکمه‌ی سریعِ «همه را کالای جدید بساز» رد شوند؛ چون این دقیقاً همان چیزی است که هر بار
            // یک کپی جدید و تکراری از کالای موجود می‌سازد. این‌ها را جدا نگه می‌داریم تا کاربر مجبور به
            // انتخاب دستیِ کالای درست (یا ادغام کالاهای تکراری) شود.
            const unresolvedAmbiguous = unresolved.filter(r => r.isAmbiguous);
            const unresolvedNew = unresolved.filter(r => !r.isAmbiguous);
            // پرش به اولین ردیفِ تعیین‌تکلیف‌نشده (بعد از رفع، دکمه خودکار به مورد بعدی می‌رود)
            const jumpToUnresolved = () => {
                const r = unresolved[0]; if (!r) return;
                const el = document.getElementById('mahak-row-' + r.id);
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            };
            const unresolvedBanner = unresolved.length > 0 && (
                <div className="sticky top-0 z-20 mb-4 flex items-center justify-between gap-3 flex-wrap rounded-2xl border-2 border-amber-400 bg-amber-100 px-4 py-3 shadow-md">
                    <div className="flex items-center gap-2 font-black text-amber-900 text-sm"><AlertTriangle size={18}/> {unresolved.length} کالا هنوز تعیین‌تکلیف نشده است{unresolvedAmbiguous.length > 0 ? ` (${unresolvedAmbiguous.length} مورد مبهم: چند کالای هم‌نام)` : ''}</div>
                    <button type="button" onClick={jumpToUnresolved} className="text-xs font-black bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-xl">برو به مورد بعدی</button>
                </div>
            );

            // ردیف‌هایی که کالای متصل‌شده‌شان وزن کیسه دارد ولی هنوز واحدش «کیلوگرم» است و قبلاً هیچ تصمیمی
            // (بله/خیر) برایشان ذخیره نشده. این‌ها باید قبل از اعمال Sync، صریحاً (تک‌تک یا یکجا) تأیید شوند.
            const pendingBagWeightRows = rows.filter(r => r.forcePackage === null);

            // اگر «محک منبع اصلی» فعال باشد: هر itemId که قبلاً از یک sync محک لینک شده بود (یعنی در
            // mahakMappings ثبت شده)، ولی نامِ محکِ متناظرش دیگر در همین فایل جدید دیده نمی‌شود، یعنی از
            // محک حذف شده. این‌ها را جدا لیست می‌کنیم تا قبل از هر حذفی، صریح به کاربر نشان داده شوند.
            // کالاهایی که به بیش از یک ردیف محک وصل شده‌اند
            const targetConflicts = (() => {
                const g = new Map();
                rows.forEach(r => { if (r.mode === 'existing' && r.itemId) { if (!g.has(r.itemId)) g.set(r.itemId, []); g.get(r.itemId).push(r); } });
                return [...g.entries()].filter(([, l]) => l.length > 1).map(([id, l]) => ({ item: items.find(i => i.id === id), rows: l })).filter(x => x.item);
            })();
            const positiveTargetIds = new Set(rows.filter(r => r.mode === 'existing' && r.itemId).map(r => r.itemId));
            // «محک منبع اصلی است»: کالایی که در محک صفر/منفی است، یا قبلاً لینک بوده و حالا در فایل نیست
            const staleCandidates = useMemo(() => {
                if (!mahakIsMaster || rows.length === 0) return [];
                const out = new Map();
                const add = (item, mahakName, reason) => {
                    if (!item || positiveTargetIds.has(item.id) || out.has(item.id)) return;
                    if (removeMode === 'zero' && (Number(item.quantity) || 0) === 0) return;
                    out.set(item.id, { item, mahakName, reason });
                };
                const fileNorms = new Set(rows.map(r => r.normalized));
                nonPositiveRows.forEach(z => {
                    const norm = normalizeMahakName(z.mahakName); fileNorms.add(norm);
                    const mapped = mappings[norm]?.itemId ? items.find(i => i.id === mappings[norm].itemId) : null;
                    if (mapped) { add(mapped, z.mahakName, 'zero'); return; }
                    items.filter(i => normalizeMahakName(i.name) === norm).forEach(i => add(i, z.mahakName, 'zero'));
                });
                Object.values(mappings).forEach(m => {
                    if (!m?.itemId) return;
                    if (fileNorms.has(normalizeMahakName(m.mahakName))) return;
                    add(items.find(i => i.id === m.itemId), m.mahakName, 'missing');
                });
                return [...out.values()];
            }, [mahakIsMaster, rows, items, mappings, nonPositiveRows, removeMode]);
            // کالاهایی که هرگز به محک لینک نشده‌اند و در فایل هم نیستند (ممکن است کالای داخلی خودت باشند؛ پیش‌فرض دست‌نخورده)
            const neverLinkedItems = useMemo(() => {
                if (!mahakIsMaster || rows.length === 0) return [];
                const linked = new Set(Object.values(mappings).map(m => m?.itemId).filter(Boolean));
                const touched = new Set([...positiveTargetIds, ...staleCandidates.map(c => c.item.id)]);
                return items.filter(i => !touched.has(i.id) && !linked.has(i.id) && (removeMode === 'delete' || (Number(i.quantity) || 0) !== 0));
            }, [mahakIsMaster, rows, items, mappings, staleCandidates, removeMode]);
            const pendingRemovals = [
                ...staleCandidates.filter(c => !removalExcludedIds.has(c.item.id)).map(c => c.item),
                ...neverLinkedItems.filter(i => extraIncludedIds.has(i.id))
            ];
const conversionErrors = rows.filter(r => {
                // ردیف‌های واقعاً unresolved قرار است در مرحله نهایی با یک تأیید کلی
                // به‌عنوان کالای جدیدِ کیلوگرمی ساخته شوند؛ بنابراین نباید دکمه
                // «ادامه به بازبینی» را به خاطر نداشتن itemId قفل کنند.
                if (r.mode === 'existing' && !r.itemId) return false;
                if (r.mode === 'new') {
                    const pseudo = { unit:r.targetUnit, bagWeight:Number(r.weightKg||0)*1000 };
                    return !convertMahakKgToTarget(r.mahakKg, pseudo, r.weightKg, r.forcePackage === true, r.mahakQty2).ok;
                }
                const item = items.find(i => i.id === r.itemId);
                return item ? !convertMahakKgToTarget(r.mahakKg, item, r.weightKg, r.forcePackage === true, r.mahakQty2).ok : false;
            });
            const readyRows = rows.filter(r => {
                if (r.mode === 'new') return !!r.targetName && !!convertMahakKgToTarget(r.mahakKg, {unit:r.targetUnit, bagWeight:Number(r.weightKg||0)*1000}, r.weightKg, r.forcePackage === true, r.mahakQty2).ok;
                const item = items.find(i => i.id === r.itemId);
                return !!item && !!convertMahakKgToTarget(r.mahakKg, item, r.weightKg, r.forcePackage === true, r.mahakQty2).ok;
            });

            const defaultMahakWarehouseId = (settings?.warehouses || []).find(w => String(w?.name || '').trim() === 'سوله گرجی علیا')?.id || '';
            const chooseSuggestion = (r, item) => updateRow(r.id, { mode:'existing', itemId:item.id, targetName:item.name, targetUnit:item.unit || 'کیسه', weightKg: item.bagWeight ? Number(item.bagWeight)/1000 : r.weightKg, targetWarehouseId:item.warehouseId || r.targetWarehouseId || defaultMahakWarehouseId });

            const saveMappingForRow = (r, itemId, weightKg, mode) => {
                const next = {...mappings};
                next[r.normalized] = {
                    mahakName:r.mahakName,
                    itemId:mode==='existing' ? itemId : null,
                    mode,
                    targetName:r.targetName,
                    targetUnit:r.targetUnit || 'کیسه',
                    weightKg:Number(weightKg)||0,
                    updatedAt:Date.now()
                };
                return next;
            };

            const applySync = async () => {
                if (targetConflicts.length) {
                    toast.show(`${targetConflicts.length} کالا به بیش از یک ردیف محک وصل شده (${targetConflicts.slice(0,3).map(c => c.item.name).join('، ')}). اول هر ردیف را به کالای جداگانه وصل کن.`);
                    setStep(2); return;
                }
                if (conversionErrors.length) {
                    toast.show('ردیف‌های دارای خطای تبدیل را ابتدا اصلاح کنید.'); return;
                }
                if (!readyRows.length && !unresolved.length) {
                    toast.show('هیچ ردیف قابل Sync وجود ندارد.'); return;
                }
                if (unresolvedAmbiguous.length) {
                    toast.show(`${unresolvedAmbiguous.length} ردیف چون چند کالای هم‌نام در انبار پیدا شد، باید دستی مشخص شوند (نمی‌توان خودکار حدس زد) — لطفاً از لیست بازبینی، کالای درست را برای آن‌ها انتخاب کنید یا اول کالاهای تکراری را در Backup ادغام کنید.`);
                    setStep(2); return;
                }
                if (pendingBagWeightRows.length) {
                    toast.show(`${pendingBagWeightRows.length} کالا هنوز مشخص نشده که بر مبنای وزن کیسه تبدیل بشن یا کیلوگرم بمونن — از جعبه‌ی آبی بالای لیست، تک‌تک یا با «تأیید همه» جواب بده.`);
                    setStep(2); return;
                }
                let autoCreateUnresolved = false;
                if (unresolvedNew.length) {
                    autoCreateUnresolved = await confirmAction(
                        `${unresolvedNew.length} کالا هنوز تعیین تکلیف نشده‌اند.\n\nآیا این موارد با همان نام محک، به‌عنوان کالای جدید ساخته شوند و موجودی‌شان بر مبنای خودِ کیلوگرم محک ثبت شود؟\n\nبعد از ساخت، لینک هرکدام ذخیره می‌شود تا Syncهای بعدی سریع و خودکار انجام شوند.`,
                        { danger:false }
                    );
                    if (!autoCreateUnresolved) { setStep(2); return; }
                }
                // «محک منبع اصلی است»: قبل از حذف واقعیِ هر بار از انبار، یک تأیید نهایی و صریح با اسم و
                // موجودیِ دقیقِ هرکدام گرفته می‌شود — حتی اگر کاربر از قبل توی چک‌باکس‌های مرحله بازبینی
                // تیک زده باشد، چون این عملیات غیرقابل‌بازگشت (حذف کالا) است.
                const itemsToRemove = pendingRemovals;
                if (itemsToRemove.length) {
                    const list = itemsToRemove.slice(0, 15).map(x => `• ${x.name} — موجودی فعلی: ${formatNumber(x.quantity)} ${x.unit || ''}`).join('\n');
                    const more = itemsToRemove.length > 15 ? `\n... و ${itemsToRemove.length - 15} مورد دیگر` : '';
                    const confirmed = await confirmAction(
                        removeMode === 'delete'
                            ? `${itemsToRemove.length} کالای زیر از انبار حذف می‌شوند:\n\n${list}${more}\n\nاین کار قابل بازگشت نیست (فقط با بازیابی بکاپ). ادامه می‌دی؟`
                            : `موجودی ${itemsToRemove.length} کالای زیر صفر می‌شود (خود کالا می‌ماند):\n\n${list}${more}\n\nادامه می‌دی؟`,
                        { danger: removeMode === 'delete' }
                    );
                    if (!confirmed) { setStep(2); return; }
                }
                setBusy(true);
                try {
                    const nextMappings = {...mappings};
                    const prepared = [...readyRows].map(r => {
                        const existing = r.mode==='existing' ? items.find(i=>i.id===r.itemId) : null;
                        const target = existing || { name:r.targetName, unit:r.targetUnit || 'کیسه', bagWeight:Number(r.weightKg||0)*1000 };
                        const converted = convertMahakKgToTarget(r.mahakKg, target, r.weightKg, r.forcePackage === true, r.mahakQty2);
                        const finalName = existing ? existing.name : r.targetName.trim();
                        if (!finalName || !converted.ok) throw new Error(`ردیف نامعتبر: ${r.mahakName}`);
                        nextMappings[r.normalized] = { mahakName:r.mahakName, itemId:existing?.id || null, mode:r.mode, targetName:finalName, targetUnit:r.targetUnit || target.unit || 'کیسه', weightKg:Number(converted.weightKg||r.weightKg||0), useBagWeightMode: r.forcePackage === true, updatedAt:Date.now() };
                        return {...r, finalName, converted, existingItemId:existing?.id || null, targetWarehouseId:r.targetWarehouseId || defaultMahakWarehouseId};
                    });
                    if (autoCreateUnresolved) {
                        unresolvedNew.forEach(r => prepared.push({...r, mode:'new', finalName:String(r.mahakName||'').trim(), targetUnit:'کیلوگرم', targetWarehouseId:r.targetWarehouseId || defaultMahakWarehouseId, autoCreate:true, existingItemId:null, converted:{ok:true,value:Number(r.mahakKg)||0,mode:'kg',remainder:0,weightKg:1}}));
                    }
                    // اقلامی که باید حذف شوند را از نقشه‌ی لینک‌ها هم پاک می‌کنیم تا محکِ بعدی دوباره سراغشان نرود
                    if (removeMode === 'delete') itemsToRemove.forEach(x => {
                        Object.keys(nextMappings).forEach(k => { if (nextMappings[k]?.itemId === x.id) delete nextMappings[k]; });
                    });
                    const backupOk = await onBackup();
                    if (backupOk === false) throw new Error('ساخت بکاپ قبل از Sync ناموفق بود؛ برای حفظ امنیت موجودی، Sync متوقف شد.');
                    await onApplySync(prepared, nextMappings, {fileName, importedAt:new Date().toISOString(), sourceRows:rows.length, autoCreatedCount:autoCreateUnresolved ? unresolvedNew.length : 0}, itemsToRemove, removeMode);
                    setStep(4);
                } catch (e) { console.error(e); toast.show(`اعمال Sync انجام نشد: ${e.message || 'خطا'}`); }
                finally { setBusy(false); }
            };
            return (
                <div className="max-w-[1500px] mx-auto">
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="p-5 bg-slate-50 border-b flex items-center justify-between gap-3">
                            <div>
                                <h2 className="font-black text-xl text-slate-800 flex items-center gap-2"><FileSpreadsheet className="text-emerald-600"/> همگام‌سازی موجودی محک</h2>
                                <p className="text-xs text-slate-500 mt-1">«نام کامل کالا» و «موجودی» (کیلوگرم) خوانده می‌شود؛ اگر ستون‌های «موجودی ۲» و «واحد ۲» هم در فایل باشند، همان تعداد دقیق کیسه/کارتن مستقیماً استفاده می‌شود. قیمت‌ها و ستون‌های مالی نادیده گرفته می‌شوند.</p>
                            </div>
                            {onClose && <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-200"><X size={18}/></button>}
                        </div>

                        <div className="p-5 border-b bg-white">
                            <div className="flex flex-wrap gap-2 text-xs font-bold">
                                {[['1','فایل محک'],['2','تطبیق و وزن'],['3','بازبینی'],['4','انجام شد']].map(([n,t]) => <div key={n} className={`px-3 py-2 rounded-xl border ${step===Number(n) ? 'bg-indigo-600 text-white border-indigo-600' : step>Number(n) ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-400 border-slate-200'}`}>{n}. {t}</div>)}
                            </div>
                        </div>

                        {step===1 && (
                            <div className="p-8 text-center">
                                <div className="mx-auto w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4"><Upload size={28}/></div>
                                <h3 className="font-black text-lg text-slate-800">فایل خروجی محک را انتخاب کنید</h3>
                                <p className="text-xs text-slate-500 mt-2 mb-6">فایل با ساختار نمونه‌ی فعلی محک قابل خواندن است. «نام کامل کالا» و «موجودی» (کیلوگرم) مبنا هستند؛ اگر فایل ستون «موجودی ۲» (تعداد دقیق کیسه/کارتن) را هم داشته باشد، همان عدد مستقیم محک مبنای تبدیل قرار می‌گیرد — نه حدسِ وزنِ هر کیسه. اگر «محک منبع اصلی است» تیک باشد، کالاهایی که در محک صفر هستند یا در فایل نیستند هم (بعد از نمایش لیست و تأیید تو) صفر می‌شوند. موارد تعیین‌تکلیف‌نشده را در مرحله نهایی می‌توانید یکجا به‌عنوان کالای جدید بسازید.</p>
                                <label className={`inline-flex items-center gap-2 px-5 py-3 rounded-2xl font-black text-sm cursor-pointer ${busy?'bg-slate-300':'bg-emerald-600 hover:bg-emerald-700'} text-white`}>
                                    <FileSpreadsheet size={18}/> {busy?'در حال خواندن...':'انتخاب فایل محک'}
                                    <input type="file" accept=".xlsx,.xls" className="hidden" disabled={busy} onChange={e=>{const f=e.target.files?.[0]; if(f) readFile(f); e.target.value='';}}/>
                                </label>
                                <label className="mt-5 flex items-start gap-2 max-w-md mx-auto text-right bg-amber-50 border border-amber-200 rounded-2xl p-3 cursor-pointer">
                                    <input type="checkbox" checked={mahakIsMaster} onChange={e=>setMahakIsMaster(e.target.checked)} className="mt-1 w-4 h-4 accent-amber-600 shrink-0"/>
                                    <span className="text-[11px] text-amber-800 leading-5"><b>محک منبع اصلیِ موجودی است.</b> اگر فعال باشد، کالاهایی که در محک صفر هستند یا قبلاً لینک بوده و در این فایل نیستند، موجودی‌شان صفر می‌شود (یا اگر بخواهی حذف می‌شوند). قبل از هر تغییر، لیست کامل نشانت داده می‌شود و می‌توانی تک‌تک تیک را برداری. این انتخاب یادآوری می‌شود.</span>
                                </label>
                                {settings?.mahakLastSync && <div className="mt-6 text-xs text-slate-400">آخرین Sync: {new Date(settings.mahakLastSync).toLocaleString('fa-IR')}</div>}
                            </div>
                        )}

                        {step===2 && (
                            <div className="p-5">
                                {unresolvedBanner}
                                <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-4">
                                    <div className="rounded-xl bg-slate-50 border p-3"><div className="text-[10px] text-slate-400">تعداد ردیف</div><div className="font-black text-lg">{rows.length}</div></div>
                                    <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-3"><div className="text-[10px] text-emerald-500">آماده</div><div className="font-black text-lg text-emerald-700">{readyRows.length}</div></div>
                                    <div className="rounded-xl bg-amber-50 border border-amber-100 p-3"><div className="text-[10px] text-amber-500">نیازمند بررسی</div><div className="font-black text-lg text-amber-700">{unresolved.length}</div></div>
                                    <div className="rounded-xl bg-red-50 border border-red-100 p-3"><div className="text-[10px] text-red-500">خطای تبدیل</div><div className="font-black text-lg text-red-700">{conversionErrors.length}</div></div>
                                    <div className="rounded-xl bg-indigo-50 border border-indigo-100 p-3"><div className="text-[10px] text-indigo-500">فایل</div><div className="font-bold text-xs text-indigo-700 truncate" title={fileName}>{fileName}</div></div>
                                </div>
                                {pendingBagWeightRows.length > 0 && (
                                    <div className="rounded-2xl border border-sky-300 bg-sky-50 p-4 mb-4">
                                        <div className="flex items-center justify-between gap-2 flex-wrap">
                                            <div className="flex items-center gap-2 font-black text-sky-700 text-sm"><Info size={18}/> {pendingBagWeightRows.length} کالا وزن کیسه دارد ولی واحدش هنوز کیلوگرمه — بر مبنای وزن کیسه به تعداد تبدیل شود؟</div>
                                            <div className="flex gap-2">
                                                <button type="button" onClick={()=>setRows(prev => prev.map(r => r.forcePackage===null ? {...r, forcePackage:true} : r))} className="text-[10px] font-bold bg-sky-600 hover:bg-sky-700 text-white px-3 py-1.5 rounded-lg">تأیید همه (تبدیل به کیسه)</button>
                                                <button type="button" onClick={()=>setRows(prev => prev.map(r => r.forcePackage===null ? {...r, forcePackage:false} : r))} className="text-[10px] font-bold bg-white border border-sky-300 text-sky-700 px-3 py-1.5 rounded-lg">رد همه (کیلوگرم بماند)</button>
                                            </div>
                                        </div>
                                        <p className="text-[10px] text-sky-500 mt-1 mb-3">این تصمیم برای هر کالا فقط یک‌بار پرسیده می‌شود؛ از این به بعد Syncهای بعدی همین کالا خودکار همین تصمیم را به‌کار می‌برند (قابل تغییر از همین‌جا).</p>
                                        <div className="space-y-1.5 max-h-56 overflow-y-auto">
                                            {pendingBagWeightRows.map(r => {
                                                const linkedItem = items.find(i => i.id === r.itemId);
                                                const bagWeightKg = linkedItem?.bagWeight > 0 ? Number(linkedItem.bagWeight) / 1000 : 0;
                                                const estQty = bagWeightKg > 0 ? +(Number(r.mahakKg) / bagWeightKg).toFixed(2) : 0;
                                                return (
                                                    <div key={r.id} className="flex items-center justify-between gap-2 bg-white border border-sky-100 rounded-xl p-2 text-xs">
                                                        <div className="min-w-0">
                                                            <div className="font-bold text-slate-700 truncate">{r.mahakName}</div>
                                                            <div className="text-[9px] text-slate-400">{formatNumber(r.mahakKg)} کیلو ÷ {formatNumber(bagWeightKg)} کیلو = <b className="text-sky-700">{formatNumber(estQty)} کیسه</b></div>
                                                        </div>
                                                        <div className="flex gap-1 shrink-0">
                                                            <button type="button" onClick={()=>updateRow(r.id,{forcePackage:true})} className="text-[10px] font-bold bg-sky-600 hover:bg-sky-700 text-white px-2.5 py-1 rounded-lg">تبدیل به کیسه</button>
                                                            <button type="button" onClick={()=>updateRow(r.id,{forcePackage:false})} className="text-[10px] font-bold bg-white border border-slate-200 text-slate-500 px-2.5 py-1 rounded-lg">کیلوگرم بماند</button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                                {targetConflicts.length > 0 && (
                                    <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 mb-4">
                                        <div className="flex items-center gap-2 font-black text-amber-800 text-sm"><AlertTriangle size={18}/> {targetConflicts.length} کالای انبار به بیش از یک ردیف محک وصل شده</div>
                                        <p className="text-[10px] text-amber-700 mt-1 mb-2">تا هر ردیف محک به کالای جداگانه‌ای وصل نشود، Sync اعمال نمی‌شود؛ وگرنه ردیف آخر روی بقیه می‌نشست و موجودی غلط می‌شد.</p>
                                        {targetConflicts.map(c => <div key={c.item.id} className="bg-white border border-amber-100 rounded-xl p-2 text-xs mb-1"><b>{c.item.name}</b> ← {c.rows.map(r => `${r.mahakName} (${formatNumber(r.mahakKg)} kg)`).join(' | ')}</div>)}
                                    </div>
                                )}
                                {mahakIsMaster && (staleCandidates.length > 0 || neverLinkedItems.length > 0) && (
                                    <div className="rounded-2xl border border-red-300 bg-red-50 p-4 mb-4">
                                        <div className="flex items-center gap-2 font-black text-red-700 text-sm"><AlertTriangle size={18}/> {staleCandidates.length} کالا در محک موجودی ندارند یا در فایل نیستند</div>
                                        <div className="flex gap-4 flex-wrap my-2 text-[11px] font-bold text-slate-700">
                                            <label className="flex items-center gap-1 cursor-pointer"><input type="radio" checked={removeMode==='zero'} onChange={()=>setRemoveMode('zero')}/> موجودی صفر شود، کالا بماند (پیشنهادی)</label>
                                            <label className="flex items-center gap-1 cursor-pointer"><input type="radio" checked={removeMode==='delete'} onChange={()=>setRemoveMode('delete')}/> خود کالا حذف شود</label>
                                        </div>
                                        <div className="space-y-1.5 max-h-56 overflow-y-auto">
                                            {staleCandidates.map(({item, mahakName, reason}) => {
                                                const checked = !removalExcludedIds.has(item.id);
                                                return (
                                                    <label key={item.id} className="flex items-center gap-2 bg-white border border-red-100 rounded-xl p-2 cursor-pointer">
                                                        <input type="checkbox" checked={checked} onChange={e => setRemovalExcludedIds(prev => { const next = new Set(prev); if (e.target.checked) next.delete(item.id); else next.add(item.id); return next; })} className="w-4 h-4 accent-red-600 shrink-0"/>
                                                        <div className="min-w-0 flex-1">
                                                            <div className="font-bold text-xs text-slate-700 truncate">{item.name}</div>
                                                            <div className="text-[9px] text-slate-400">موجودی فعلی: <b className={Number(item.quantity)>0 ? 'text-red-600' : ''}>{formatNumber(item.quantity)} {item.unit||''}</b> — {reason==='zero' ? 'در محک صفر است' : 'قبلاً لینک بوده و در فایل نیست'}: {mahakName}</div>
                                                        </div>
                                                        <span className={`text-[9px] font-bold px-2 py-1 rounded-lg shrink-0 ${checked ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-500'}`}>{checked ? (removeMode==='delete' ? 'حذف می‌شود' : 'صفر می‌شود') : 'دست‌نخورده'}</span>
                                                    </label>
                                                );
                                            })}
                                        </div>
                                        {neverLinkedItems.length > 0 && (
                                            <details className="mt-3">
                                                <summary className="text-[11px] font-bold text-slate-600 cursor-pointer">{neverLinkedItems.length} کالای دیگر که هرگز به محک لینک نشده‌اند و در فایل هم نیستند (پیش‌فرض دست‌نخورده)</summary>
                                                <div className="space-y-1.5 max-h-48 overflow-y-auto mt-2">
                                                    {neverLinkedItems.map(item => (
                                                        <label key={item.id} className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl p-2 cursor-pointer">
                                                            <input type="checkbox" checked={extraIncludedIds.has(item.id)} onChange={e => setExtraIncludedIds(prev => { const next = new Set(prev); if (e.target.checked) next.add(item.id); else next.delete(item.id); return next; })} className="w-4 h-4 accent-red-600 shrink-0"/>
                                                            <div className="min-w-0 flex-1 font-bold text-xs text-slate-700 truncate">{item.name} <span className="text-[9px] text-slate-400 font-normal">— {formatNumber(item.quantity)} {item.unit||''}</span></div>
                                                        </label>
                                                    ))}
                                                </div>
                                            </details>
                                        )}
                                    </div>
                                )}
                                {(() => {
                                    // بررسی وزن کیسه‌ها: برای کالاهایی که وزن کیسه مشخص است، کیلوی محک ÷ وزن کیسه = تعداد را نشان می‌دهد؛
                                    // با تغییر وزن (یا تعداد واقعی) نتیجه عوض می‌شود و با Sync روی خود کالا هم ذخیره می‌شود.
                                    const bagRows = rows.filter(r => Number(r.weightKg) > 0 && Number(r.mahakKg) > 0 && !['کیلوگرم','کیلو'].includes(r.targetUnit));
                                    if (!bagRows.length) return null;
                                    return (
                                    <details className="mb-3 rounded-2xl border border-sky-200 bg-sky-50/50 p-3" open={bagRows.some(r => Number(r.mahakQty2) > 0 && Math.abs(Number(r.mahakQty2) - Number(r.mahakKg)/Number(r.weightKg)) > 0.5)}>
                                        <summary className="text-xs font-black text-sky-700 cursor-pointer">🧮 بررسی وزن کیسه‌ها ({bagRows.length} کالا) — درست است؟ یا دستی اصلاح کن</summary>
                                        <div className="space-y-2 mt-3 max-h-72 overflow-y-auto">
                                            {bagRows.map(r => {
                                                const w = Number(r.weightKg), kg = Number(r.mahakKg), calc = kg / w, q2 = Number(r.mahakQty2) || 0;
                                                const mismatch = q2 > 0 && Math.abs(q2 - calc) > 0.5;
                                                return (
                                                <div key={r.id} className={`grid grid-cols-2 md:grid-cols-12 gap-2 items-end bg-white rounded-xl border p-2 ${mismatch ? 'border-amber-300' : 'border-slate-200'}`}>
                                                    <div className="col-span-2 md:col-span-4 min-w-0"><div className="font-bold text-xs text-slate-700 truncate" title={r.mahakName}>{r.mahakName}</div><div className="text-[10px] text-slate-400">محک: <b>{formatNumber(kg)}</b> kg{q2 > 0 && <> — ستون ۲ محک: <b>{formatNumber(q2)}</b></>}</div></div>
                                                    <div className="md:col-span-2"><label className="text-[9px] text-slate-400 block">وزن هر کیسه (kg)</label><input type="number" min="0" step="any" value={r.weightKg} onChange={e => updateRow(r.id, { weightKg: e.target.value, saveBagWeight: true })} className="w-full p-1.5 rounded-lg border border-slate-200 text-xs text-center font-black" /></div>
                                                    <div className="md:col-span-2"><label className="text-[9px] text-slate-400 block">تعداد = کیلو ÷ وزن</label><div className="font-black text-sm text-indigo-700">{formatNumber(Math.round(calc * 100) / 100)}</div></div>
                                                    <div className="md:col-span-2"><label className="text-[9px] text-slate-400 block">یا تعداد واقعی را بزن</label><input type="number" min="0" step="any" placeholder="تعداد" onChange={e => { const c = Number(e.target.value); if (c > 0) updateRow(r.id, { weightKg: Number((kg / c).toFixed(4)), saveBagWeight: true }); }} className="w-full p-1.5 rounded-lg border border-slate-200 text-xs text-center" /></div>
                                                    <div className="col-span-2 md:col-span-2 text-[9px] leading-4">{mismatch && <span className="text-amber-700 font-bold">⚠️ محک {formatNumber(q2)} کیسه گفته (کیسه‌ها هم‌وزن نیستند)</span>}{r.saveBagWeight && <span className="text-emerald-700 font-bold block">✓ با Sync روی کالا ذخیره می‌شود</span>}</div>
                                                </div>);
                                            })}
                                        </div>
                                    </details>);
                                })()}
                                <div className="space-y-2 max-h-[62vh] overflow-y-auto pr-1">
                                    {rows.map(r=>{
                                        const item = items.find(i=>i.id===r.itemId);
                                        const target = r.mode==='new' ? {unit:r.targetUnit, bagWeight:Number(r.weightKg||0)*1000} : item;
                                        const conv = convertMahakKgToTarget(r.mahakKg, target, r.weightKg, r.forcePackage === true, r.mahakQty2);
                                        return <div key={r.id} id={`mahak-row-${r.id}`} className={`rounded-2xl border p-3 ${!conv.ok?'border-red-200 bg-red-50/30':!item && r.mode!=='new'?'border-amber-400 bg-amber-50/40 ring-2 ring-amber-200':'border-slate-200 bg-white'}`}>
                                            <div className="grid grid-cols-1 xl:grid-cols-12 gap-3 items-center">
                                                <div className="xl:col-span-2 min-w-0"><div className="font-black text-sm text-slate-800 truncate" title={r.mahakName}>{r.mahakName}</div><div className="text-[10px] text-slate-400 mt-1">محک: <b>{formatNumber(r.mahakKg)}</b> kg{Number(r.mahakQty2) > 0 && <> — <b className="text-indigo-600">{formatNumber(r.mahakQty2)}</b> {r.mahakUnit2 || ''} (مستقیم از محک)</>}</div></div>
                                                <div className="xl:col-span-2">
                                                    <div className="flex gap-1 mb-1"><button onClick={()=>updateRow(r.id,{mode:'existing'})} className={`flex-1 px-2 py-1.5 rounded-lg text-[10px] font-bold border ${r.mode==='existing'?'bg-indigo-600 text-white border-indigo-600':'bg-white text-slate-500 border-slate-200'}`}>کالای فعلی</button><button onClick={()=>updateRow(r.id,{mode:'new',targetName:r.targetName||r.mahakName,targetUnit:r.targetUnit||'کیسه',weightKg:r.weightKg||''})} className={`flex-1 px-2 py-1.5 rounded-lg text-[10px] font-bold border ${r.mode==='new'?'bg-emerald-600 text-white border-emerald-600':'bg-white text-slate-500 border-slate-200'}`}>ایجاد جدید</button></div>
                                                    {r.mode==='existing' ? (() => {
                                                        const selected = items.find(i=>i.id===r.itemId);
                                                        const q = openLinkRow===r.id ? normalizeMahakName(linkSearch) : '';
                                                        const linkCandidates = items
                                                            // در بخش لینک‌کردن محک، کل لیست کالاهای انبار قابل جستجو است؛
                                                            // موجودی صفر نیز نباید باعث مخفی‌شدن کالا شود.
                                                            .filter(i => !q || normalizeMahakName([
                                                                i.name, i.brand, i.tag, i.unit,
                                                                i.bagWeight ? String(i.bagWeight) : ''
                                                            ].filter(Boolean).join(' ')).includes(q))
                                                            .sort((a,b) => {
                                                                if (a.id===r.itemId) return -1;
                                                                if (b.id===r.itemId) return 1;
                                                                return String(a.name||'').localeCompare(String(b.name||''),'fa');
                                                            });
                                                        const linkAllNames = linkCandidates.slice(0, 60).map(x => x.name);
                                                        return <div className="relative">
                                                            <button type="button" onClick={()=>{setOpenLinkRow(openLinkRow===r.id?null:r.id);setLinkSearch('');}} className="w-full p-2 rounded-lg bg-white border border-slate-200 text-xs font-bold outline-none text-right flex items-center justify-between gap-2">
                                                                <span className="truncate">{selected ? selected.name : '— انتخاب / لینک کالا —'}</span><ChevronDown size={13} className="shrink-0 text-slate-400"/>
                                                            </button>
                                                            {openLinkRow===r.id && <div className="absolute z-[80] top-full mt-1 right-0 w-[min(520px,95vw)] bg-white border border-slate-200 rounded-xl shadow-2xl p-2">
                                                                <div className="flex items-center gap-2 mb-2">
                                                                    <Search size={14} className="text-slate-400 shrink-0"/>
                                                                    <input autoFocus value={linkSearch} onChange={e=>setLinkSearch(e.target.value)} placeholder="جستجو در نام، برند، تگ، واحد..." className="flex-1 p-2 rounded-lg bg-slate-50 border border-slate-200 text-xs outline-none"/>
                                                                </div>
                                                                <div className="max-h-64 overflow-y-auto space-y-1">
                                                                    {linkCandidates.length===0 ? <div className="p-4 text-center text-xs text-slate-400">کالایی با این عبارت پیدا نشد.</div> : linkCandidates.slice(0, 60).map(it=>{ const { prefix, diff } = splitNameDiff(linkAllNames, it.name); return <button key={it.id} type="button" onClick={()=>{updateRow(r.id,{itemId:it.id,targetName:it.name,targetUnit:it.unit||'کیسه',weightKg:it.bagWeight?Number(it.bagWeight)/1000:r.weightKg});setOpenLinkRow(null);setLinkSearch('');}} className={`w-full text-right p-2 rounded-lg border ${it.id===r.itemId?'border-indigo-300 bg-indigo-50':'border-transparent hover:border-slate-200 hover:bg-slate-50'}`}>
                                                                        <div className="font-black text-xs text-slate-800">{prefix}{diff && <span className={`mr-1 px-1 rounded border ${stringToBadgeColor(diff)}`}>{diff}</span>}</div>
                                                                        <div className="mt-1 flex items-center gap-1 flex-wrap"><ItemDistinguishBadges item={it}/>{getWarehouseById(settings?.warehouses || [], it.warehouseId)?.name && <span className="text-[9px] px-1.5 py-0 rounded font-bold border bg-slate-100 text-slate-600 border-slate-200">{getWarehouseById(settings?.warehouses || [], it.warehouseId).name}</span>}</div>
                                                                    </button>; })}
                                                                </div>
                                                            </div>}
                                                        </div>;
                                                    })() : <input value={r.targetName} onChange={e=>updateRow(r.id,{targetName:e.target.value})} className="w-full p-2 rounded-lg bg-white border border-slate-200 text-xs font-bold outline-none" placeholder="نام کالای جدید"/>}
                                                </div>
                                                <div className="xl:col-span-2"><label className="text-[9px] text-slate-400 block mb-1">واحد داخلی</label><select value={r.targetUnit} onChange={e=>updateRow(r.id,{targetUnit:e.target.value})} className="w-full p-2 rounded-lg bg-white border border-slate-200 text-xs font-bold"><option value="کیسه">کیسه</option><option value="کارتن">کارتن</option><option value="بسته">بسته</option><option value="عدد">عدد</option><option value="کیلوگرم">کیلوگرم</option><option value="کیلو">کیلو</option></select></div>
                                                <div className="xl:col-span-2"><label className="text-[9px] text-slate-400 block mb-1">وزن هر بسته/کارتن (kg)</label><input type="number" min="0" step="any" disabled={conv.mode==='package-direct'} value={r.weightKg} onChange={e=>updateRow(r.id,{weightKg:e.target.value})} className="w-full p-2 rounded-lg bg-white border border-slate-200 text-xs font-black text-center disabled:bg-slate-100 disabled:text-slate-400" placeholder="مثلاً 5"/>
                                                    {conv.mode==='package-direct' && <div className="text-[9px] text-indigo-600 font-bold mt-1">عدد مستقیم محک استفاده می‌شود؛ نیازی به وزن حدسی نیست</div>}
                                                    {conv.mode!=='package-direct' && item && Number(item.bagWeight) > 0 && Math.abs(Number(r.weightKg||0) - Number(item.bagWeight)/1000) > 1e-6 && <div className="text-[9px] text-amber-700 font-bold mt-1">⚠️ با وزن ثبت‌شده‌ی خود کالا ({formatNumber(Number(item.bagWeight)/1000)} kg) فرق دارد</div>}
                                                </div>
                                                <div className="xl:col-span-2"><div className={`rounded-xl p-2 border ${conv.ok?'bg-slate-50 border-slate-200':'bg-red-50 border-red-200'}`}><div className="text-[9px] text-slate-400">نتیجه تبدیل{conv.mode==='package-direct' && <span className="text-indigo-500"> (مستقیم از محک)</span>}</div>{conv.ok?<><div className="font-black text-indigo-700 text-base">{formatNumber(conv.value)} {r.targetUnit}</div>{conv.remainder>0&&<div className="text-[9px] text-amber-700 mt-1">مانده: {formatNumber(conv.remainder)} kg</div>}</>:<div className="text-[9px] font-bold text-red-600 leading-5">{conv.reason}</div>}</div></div>
                                                <div className="xl:col-span-2 text-left">
                                                    {r.mode==='existing' && !r.itemId && r.suggestionCandidates?.length>0 && <div className="mb-1 text-[9px] text-slate-400">پیشنهاد نزدیک — با جزئیات:</div>}
                                                    {r.mode==='existing' && !r.itemId && (r.suggestionCandidates||[]).map(sg=><button key={sg.item.id} onClick={()=>chooseSuggestion(r,sg.item)} className="block w-full text-right text-[9px] px-2 py-1.5 rounded-lg border border-indigo-100 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 mb-1" title={`${sg.item.name} | شباهت ${Math.round(sg.score*100)}%`}>
                                                        <div className="font-black truncate">{sg.item.name} <span className="opacity-60">({Math.round(sg.score*100)}%)</span></div>
                                                        <div className="mt-1"><ItemDistinguishBadges item={sg.item}/></div>
                                                    </button>)}
                                                    {r.mode==='existing' && r.itemId && <div className="text-[9px] text-emerald-600 font-bold">✓ متصل به کالای فعلی</div>}
                                                    {r.conflictNote && <div className="text-[9px] text-amber-700 font-bold mt-1">⚠️ {r.conflictNote}</div>}
                                                    {r.mode==='new' && <div className="text-[9px] text-blue-600 font-bold">✓ کالای جدید ساخته می‌شود</div>}
                                                </div>
                                            </div>
                                        </div>;
                                    })}
                                </div>
                                <div className="flex justify-between items-center gap-3 mt-5"><button onClick={()=>{setRows([]);setStep(1);}} className="px-4 py-2 rounded-xl border text-xs font-bold">انتخاب فایل دیگر</button><div className="text-[10px] text-slate-400">{conversionErrors.length>0 ? `${conversionErrors.length} مورد تبدیل نیاز به بررسی دارد؛ اما بازبینی قفل نمی‌شود.` : unresolvedAmbiguous.length>0 ? `⚠️ ${unresolvedAmbiguous.length} مورد چون هم‌نام با چند کالای انبار است، باید دستی انتخاب شود.` : unresolvedNew.length>0 ? `${unresolvedNew.length} مورد هنوز تعیین تکلیف نشده؛ در مرحله نهایی می‌توانید یکجا کالای جدید بسازید.` : 'همه موارد آماده‌اند.'}</div><button disabled={busy} onClick={()=>{setPinnedReviewIds([...conversionErrors.map(r=>r.id), ...unresolvedAmbiguous.map(r=>r.id)]);setStep(3);}} className="px-5 py-3 rounded-xl bg-indigo-600 text-white text-xs font-black disabled:opacity-40">ادامه به بازبینی</button></div>
                            </div>
                        )}

                        {step===3 && (() => {
                            const pinnedRows = pinnedReviewIds.map(id=>rows.find(r=>r.id===id)).filter(Boolean);
                            const normalRows = rows.filter(r=>!pinnedReviewIds.includes(r.id));
                            return (
                            <div className="p-6">
                                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-4 text-xs text-amber-800 leading-6"><b>قبل از اعمال:</b> موجودی فعلی کالاهای انتخاب‌شده با مقدار تبدیل‌شده‌ی محک <b>جایگزین</b> می‌شود، نه اینکه به موجودی قبلی اضافه شود. قبل از این کار یک بکاپ کامل خودکار ساخته می‌شود.</div>{conversionErrors.length>0 && <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-4 mb-4 text-xs text-red-800 leading-6 shadow-sm"><div className="font-black text-sm mb-2">🚨 نیاز به اصلاح {conversionErrors.length} مورد — این موردها جداگانه در ابتدای صفحه آمده‌اند</div><div>کالای مشکل‌دار: <b className="text-red-900">{conversionErrors.map(r=>r.mahakName).join('، ')}</b></div><div className="mt-1 text-red-700">همین‌جا واحد و وزن را تعیین کنید؛ بعد از اصلاح، دکمه نهایی خودکار فعال می‌شود.</div></div>}
                                {unresolvedBanner}<div className="grid grid-cols-1 lg:grid-cols-4 gap-3 mb-5">
                                    <div className="bg-slate-50 rounded-2xl border p-4"><div className="text-[10px] text-slate-400">ردیف‌های مثبت محک</div><div className="text-2xl font-black text-slate-800">{rows.length}</div></div>
                                    <div className="bg-indigo-50 rounded-2xl border border-indigo-100 p-4"><div className="text-[10px] text-indigo-500">آماده بروزرسانی</div><div className="text-2xl font-black text-indigo-700">{readyRows.length}</div></div>
                                    <div className="bg-amber-50 rounded-2xl border border-amber-100 p-4"><div className="text-[10px] text-amber-500">تعیین‌تکلیف‌نشده</div><div className="text-sm font-black text-amber-700 mt-1">{unresolved.length}</div></div>
                                     <div className="bg-emerald-50 rounded-2xl border border-emerald-100 p-4"><div className="text-[10px] text-emerald-500">منبع موجودی</div><div className="text-sm font-black text-emerald-700 mt-1">محک</div></div>
                                </div>
                                <div className="space-y-2">{[...pinnedRows, ...normalRows].map((r,reviewIndex)=>{const item=r.mode==='existing'?items.find(i=>i.id===r.itemId):null;const target=r.mode==='new'?{unit:r.targetUnit,bagWeight:Number(r.weightKg||0)*1000}:item;const conv=convertMahakKgToTarget(r.mahakKg,target,r.weightKg,r.forcePackage===true,r.mahakQty2);const isConversionError=!conv.ok;return <React.Fragment key={r.id}>{reviewIndex===0 && pinnedRows.length>0 && <div className="sticky top-0 z-10 bg-red-600 text-white rounded-xl px-4 py-3 text-xs font-black shadow-lg">🚨 مواردی که هنگام ورود به بازبینی نیاز به اصلاح داشتند — همین‌جا بمانید و بعد تأیید نهایی بزنید ({pinnedRows.length} مورد)</div>}{reviewIndex===pinnedRows.length && pinnedRows.length>0 && <div className="mt-5 pt-4 border-t-2 border-slate-200 bg-slate-50 rounded-xl px-4 py-3 text-xs font-black text-slate-700">✓ سایر {normalRows.length} ردیف بازبینی نهایی</div>}<div key={r.id} id={`mahak-row-${r.id}`} className={`rounded-2xl border p-3 ${conv.ok?(unresolved.some(u=>u.id===r.id)?'border-amber-400 bg-amber-50/40 ring-2 ring-amber-200':'border-slate-200 bg-white'):'border-red-300 bg-red-50'}`}><div className="grid grid-cols-1 lg:grid-cols-7 gap-2 items-center"><div className="lg:col-span-2"><div className="font-black text-sm">{r.mahakName}</div><div className="text-[10px] text-slate-500">محک: {formatNumber(r.mahakKg)} kg</div>{r.isAmbiguous && <div className="text-[9px] font-black text-amber-700 bg-amber-100 border border-amber-300 rounded px-1.5 py-0.5 mt-1 inline-block">⚠️ چند کالای هم‌نام در انبار پیدا شد — باید دستی انتخاب کنی، وگرنه دوباره تکراری ساخته می‌شود</div>}</div><div><label className="text-[9px] text-slate-400 block mb-1">روش</label><div className="flex gap-1"><button onClick={()=>updateRow(r.id,{mode:'existing'})} className={`flex-1 px-2 py-2 rounded-lg text-[10px] font-bold border ${r.mode==='existing'?'bg-indigo-600 text-white':'bg-white'}`}>کالای فعلی</button><button onClick={()=>updateRow(r.id,{mode:'new',targetName:r.targetName||r.mahakName,targetWarehouseId:r.targetWarehouseId||defaultMahakWarehouseId})} className={`flex-1 px-2 py-2 rounded-lg text-[10px] font-bold border ${r.mode==='new'?'bg-emerald-600 text-white':'bg-white'}`}>جدید</button></div></div><div>{r.mode==='existing'?(() => { const selected=items.find(i=>i.id===r.itemId); const q=openLinkRow===r.id?normalizeMahakName(linkSearch):''; const linkCandidates=items.filter(i=>!q||normalizeMahakName([i.name,i.brand,i.tag,i.unit,i.bagWeight?String(i.bagWeight):''].filter(Boolean).join(' ')).includes(q)).sort((a,b)=>{if(a.id===r.itemId)return -1;if(b.id===r.itemId)return 1;return String(a.name||'').localeCompare(String(b.name||''),'fa');}); const shownCandidates=linkCandidates.slice(0,40); const allNames=shownCandidates.map(x=>x.name); return <div className="relative"><button type="button" onClick={()=>{setOpenLinkRow(openLinkRow===r.id?null:r.id);setLinkSearch('');}} className="w-full p-2 rounded-lg bg-white border border-slate-200 text-xs font-bold outline-none text-right flex items-center justify-between gap-2"><span className="truncate">{selected?selected.name:'— انتخاب کالا —'}</span><ChevronDown size={13} className="shrink-0 text-slate-400"/></button>{openLinkRow===r.id && <div className="absolute z-[80] top-full mt-1 right-0 w-[min(420px,90vw)] bg-white border border-slate-200 rounded-xl shadow-2xl p-2"><div className="flex items-center gap-2 mb-2"><Search size={14} className="text-slate-400 shrink-0"/><input autoFocus value={linkSearch} onChange={e=>setLinkSearch(e.target.value)} placeholder="جستجو در نام، برند، تگ..." className="flex-1 p-2 rounded-lg bg-slate-50 border border-slate-200 text-xs outline-none"/></div><div className="max-h-56 overflow-y-auto space-y-1">{shownCandidates.length===0?<div className="p-4 text-center text-xs text-slate-400">کالایی پیدا نشد.</div>:shownCandidates.map(it=>{const {prefix,diff}=splitNameDiff(allNames,it.name);return <button key={it.id} type="button" onClick={()=>{updateRow(r.id,{itemId:it.id,targetName:it.name,targetUnit:it.unit||'کیسه',weightKg:it.bagWeight?Number(it.bagWeight)/1000:r.weightKg});setOpenLinkRow(null);setLinkSearch('');}} className={`w-full text-right p-2 rounded-lg border ${it.id===r.itemId?'border-indigo-300 bg-indigo-50':'border-transparent hover:border-slate-200 hover:bg-slate-50'}`}><div className="font-black text-xs text-slate-800">{prefix}{diff && <span className={`mr-1 px-1 rounded border ${stringToBadgeColor(diff)}`}>{diff}</span>}</div><div className="mt-1"><ItemDistinguishBadges item={it}/></div></button>;})}</div></div>}</div>; })():<input value={r.targetName} onChange={e=>updateRow(r.id,{targetName:e.target.value})} className="w-full p-2 rounded-lg border text-xs" placeholder="نام کالای جدید"/>}</div>{r.mode==='new' && <div><select value={r.targetWarehouseId || defaultMahakWarehouseId || ''} onChange={e=>updateRow(r.id,{targetWarehouseId:e.target.value})} className="w-full p-2 rounded-lg border text-xs"><option value="">— بدون انبار —</option>{(settings?.warehouses || []).map(w=><option key={w.id} value={w.id}>{w.name}</option>)}</select><div className="text-[8px] text-slate-400 mt-1">انبار کالای جدید</div></div>}<div><select value={r.targetUnit} onChange={e=>updateRow(r.id,{targetUnit:e.target.value,weightKg:(e.target.value==='کیلوگرم'||e.target.value==='کیلو')?'':r.weightKg})} className="w-full p-2 rounded-lg border text-xs"><option value="کیسه">کیسه</option><option value="کارتن">کارتن</option><option value="بسته">بسته</option><option value="عدد">عدد</option><option value="کیلوگرم">کیلوگرم</option><option value="کیلو">کیلو</option></select></div><div><input type="number" min="0" step="any" disabled={r.targetUnit==='کیلوگرم'||r.targetUnit==='کیلو'} value={r.weightKg} onChange={e=>updateRow(r.id,{weightKg:e.target.value})} className="w-full p-2 rounded-lg border text-xs text-center disabled:bg-slate-100" placeholder={r.targetUnit==='کیلوگرم'||r.targetUnit==='کیلو'?'نیاز نیست':'وزن هر بسته (kg)'}/></div><div className={`p-2 rounded-lg text-center text-xs font-black ${conv.ok?'bg-emerald-50 text-emerald-700':'bg-red-100 text-red-700'}`}>{conv.ok?`${formatNumber(conv.value)} ${r.targetUnit}`:conv.reason}</div></div></div></React.Fragment>})}</div>
                                <div className="flex justify-between items-center mt-5"><button onClick={()=>setStep(2)} className="px-4 py-2 rounded-xl border text-xs font-bold">بازگشت به تطبیق</button><button disabled={busy || conversionErrors.length>0} onClick={applySync} title={conversionErrors.length>0?'موارد مشکل‌دار در ابتدای همین صفحه جداگانه نمایش داده شده‌اند. همان‌جا اصلاحشان کنید.':''} className="px-5 py-3 rounded-xl bg-emerald-600 text-white text-xs font-black disabled:opacity-50">{busy?'در حال اعمال...':conversionErrors.length>0 ? `نیاز به اصلاح ${conversionErrors.length} مورد` : unresolved.length ? `اعمال Sync + تعیین تکلیف ${unresolved.length} مورد` : 'ساخت بکاپ و اعمال همگام‌سازی'}</button></div>
                            </div>
                            );
                        })()}

                        {step===4 && (
                            <div className="p-10 text-center"><div className="mx-auto w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4"><CheckCircle size={42}/></div><h3 className="font-black text-2xl text-slate-800">همگام‌سازی محک با موفقیت انجام شد</h3><p className="text-sm text-slate-500 mt-2">موجودی‌ها جایگزین شدند، مپینگ‌ها ذخیره شدند و بکاپ قبل از Sync ساخته شد.</p><div className="mt-6 flex justify-center gap-2"><button onClick={()=>{setStep(1);setRows([]);setFileName('');}} className="px-5 py-3 rounded-xl bg-indigo-600 text-white text-xs font-black">Sync بعدی</button><button onClick={onClose} className="px-5 py-3 rounded-xl border text-xs font-bold">بازگشت به داشبورد</button></div></div>
                        )}
                    </div>
                </div>
            );
        };

        const parseMahakExcelFile = (file) => new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = e => {
                try {
                    // اگر این خطا در نسخه‌ی آفلاین دیده شود، یعنی هنگام ساخت آفلاین، فایل کتابخانه‌ی
                    // Excel درست دانلود/جاسازی نشده (مثلاً پاسخ خرابی در .offline-cache ذخیره شده است).
                    if (!window.XLSX) throw new Error('کتابخانه Excel بارگذاری نشده است. اگر از نسخه‌ی آفلاین استفاده می‌کنید، پوشه‌ی .offline-cache را پاک کنید و دوباره build-offline.js را اجرا کنید.');
                    const data = e.target?.result;
                    if (!data) throw new Error('فایل Excel خالی یا غیرقابل‌خواندن است.');
                    const wb = XLSX.read(data, { type:'array', cellDates:false, raw:true });
                    if (!wb.SheetNames || !wb.SheetNames.length) throw new Error('هیچ Sheetای در فایل Excel پیدا نشد.');
                    const sheet = wb.Sheets[wb.SheetNames[0]];
                    if (!sheet) throw new Error('Sheet اول فایل قابل خواندن نیست.');

                    // ابتدا هدرها را به‌صورت ماتریسی پیدا می‌کنیم تا وجود ستون‌های خالی/اضافی یا فاصله‌های انتهای هدر مشکلی ایجاد نکند.
                    const matrix = XLSX.utils.sheet_to_json(sheet, { header:1, defval:'', raw:true });
                    let headerIndex = -1, nameCol = -1, qtyCol = -1, qty2Col = -1, unit2Col = -1;
                    const wantedName = normalizeMahakName('نام کامل کالا');
                    const wantedQty  = normalizeMahakName('موجودی');
                    const wantedQty2 = normalizeMahakName('موجودی 2');
                    const wantedUnit2 = normalizeMahakName('واحد 2');
                    for (let r = 0; r < Math.min(matrix.length, 20); r++) {
                        const row = Array.isArray(matrix[r]) ? matrix[r] : [];
                        const normalized = row.map(v => normalizeMahakName(v));
                        const n = normalized.findIndex(v => v === wantedName);
                        const q = normalized.findIndex(v => v === wantedQty);
                        if (n >= 0 && q >= 0) {
                            headerIndex = r; nameCol = n; qtyCol = q;
                            qty2Col = normalized.findIndex(v => v === wantedQty2);
                            unit2Col = normalized.findIndex(v => v === wantedUnit2);
                            break;
                        }
                    }
                    if (headerIndex < 0) throw new Error('ستون‌های «نام کامل کالا» و «موجودی» پیدا نشدند.');

                    const parseNum = (raw) => {
                        if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null;
                        const cleaned = String(raw ?? '').trim()
                            .replace(/[۰-۹]/g, ch=>String('۰۱۲۳۴۵۶۷۸۹'.indexOf(ch)))
                            .replace(/[٠-٩]/g, ch=>String('٠١٢٣٤٥٦٧٨٩'.indexOf(ch)))
                            .replace(/٫/g,'.').replace(/[,٬،\s\u00a0]/g,'').replace(/\u2212/g,'-');
                        if (cleaned === '') return null;
                        const n = Number(cleaned);
                        return Number.isFinite(n) ? n : null;
                    };
                    // نام‌ها دقیقاً مثل فایل محک خوانده می‌شوند، فقط ی/ک عربی فارسی و فاصله‌های اضافه تمیز می‌شود.
                    const cleanName = (v) => String(v ?? '').replace(/ي/g,'ی').replace(/ك/g,'ک').replace(/\s+/g,' ').trim();

                    const allRows = [];
                    for (let r = headerIndex + 1; r < matrix.length; r++) {
                        const row = Array.isArray(matrix[r]) ? matrix[r] : [];
                        const rawName = cleanName(row[nameCol]);
                        const q = parseNum(row[qtyCol]);
                        if (!rawName || q === null) continue;
                        const q2 = qty2Col >= 0 ? parseNum(row[qty2Col]) : null;
                        const unit2 = unit2Col >= 0 ? cleanName(row[unit2Col]) : '';
                        allRows.push({mahakName:rawName, quantity:q, quantity2:q2, unit2});
                    }
                    // اگر یک نام دو بار در فایل آمده باشد، جمعشان ثبت می‌شود (نه اینکه ردیف آخر بقیه را پاک کند).
                    const mergedMap = new Map();
                    allRows.forEach(r => {
                        const k = normalizeMahakName(r.mahakName);
                        const e = mergedMap.get(k);
                        if (!e) { mergedMap.set(k, {...r}); return; }
                        e.quantity += r.quantity;
                        if (e.quantity2 !== null || r.quantity2 !== null) e.quantity2 = (e.quantity2 || 0) + (r.quantity2 || 0);
                    });
                    const uniqRows = [...mergedMap.values()];
                    const nonPositiveRows = uniqRows.filter(r => r.quantity <= 0);
                    const positiveRows = uniqRows.filter(r => r.quantity > 0);
                    if (!positiveRows.length) throw new Error('هیچ ردیف با موجودی مثبت در فایل محک پیدا نشد.');
                    const zeroRows = nonPositiveRows.length;
                    resolve({ rows: positiveRows, nonPositiveRows, totalRows: allRows.length, zeroRows });
                } catch(err){ reject(err); }
            };
            reader.onerror = () => reject(reader.error || new Error('خطا در خواندن فایل'));
            reader.readAsArrayBuffer(file);
        });

