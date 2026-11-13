//## ═══ app/19-purchase-modals-check-rass.jsx ═══
//## مودال‌های خرید (NewPurchaseItemModal، EditPurchaseModal) و راس‌گیری چک (CheckRassView).
//## ترتیب فایل‌ها در build.py مهم است؛ همه‌ی بخش‌ها یک scope مشترک دارند.
        // ------------------------------------------------------------------
        // مودال‌های خرید و تنظیمات — در نسخه قبلی تعریف نشده بودند و همین باعث
        // می‌شد با کلیک روی «خریدها»/«تنظیمات» React خطا بدهد و صفحه سفید شود.
        // ------------------------------------------------------------------
        const NewPurchaseItemModal = ({ onClose, onAdd }) => {
            const [data,setData]=useState({name:'',brand:'',tag:'عمومی',unit:'عدد',qty:1,weight:0,price:0});
            const submit=()=>{ if(!data.name.trim()) return alert('نام کالا را وارد کنید.'); onAdd({...data,name:data.name.trim(),qty:Number(data.qty)||1,weight:Number(data.weight)||0,price:Number(data.price)||0}); };
            return <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[70] flex items-center justify-center p-4"><div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden" onClick={e=>e.stopPropagation()}>
                <div className="p-5 border-b flex items-center justify-between"><div className="flex items-center gap-3"><div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center"><FilePlus size={16}/></div><div><h3 className="font-black text-slate-800">افزودن کالای جدید به خرید</h3><p className="text-[10px] text-slate-400 mt-1">این کالا فعلاً در فهرست موجودی نیست و همراه خرید ثبت می‌شود.</p></div></div><button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 transition"><X size={18}/></button></div>
                <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-3">
                    <label className="md:col-span-2 text-xs font-bold">نام کالا<input autoFocus value={data.name} onChange={e=>setData({...data,name:e.target.value})} className="mt-1 w-full p-3 rounded-xl border border-slate-200 outline-none focus:border-indigo-500"/></label>
                    <label className="text-xs font-bold">برند<input value={data.brand} onChange={e=>setData({...data,brand:e.target.value})} className="mt-1 w-full p-3 rounded-xl border border-slate-200"/></label>
                    <label className="text-xs font-bold">تگ<input value={data.tag} onChange={e=>setData({...data,tag:e.target.value})} className="mt-1 w-full p-3 rounded-xl border border-slate-200"/></label>
                    <label className="text-xs font-bold">واحد<select value={data.unit} onChange={e=>setData({...data,unit:e.target.value})} className="mt-1 w-full p-3 rounded-xl border border-slate-200 bg-white"><option>عدد</option><option>کیلوگرم</option><option>تن</option><option>کیسه</option><option>کارتن</option></select></label>
                    <label className="text-xs font-bold">تعداد<input type="number" min="0" value={data.qty} onChange={e=>setData({...data,qty:e.target.value})} className="mt-1 w-full p-3 rounded-xl border border-slate-200"/></label>
                    <label className="text-xs font-bold">وزن کل<input type="number" min="0" value={data.weight} onChange={e=>setData({...data,weight:e.target.value})} className="mt-1 w-full p-3 rounded-xl border border-slate-200"/></label>
                    <label className="text-xs font-bold">فی / قیمت<input type="number" min="0" value={data.price} onChange={e=>setData({...data,price:e.target.value})} className="mt-1 w-full p-3 rounded-xl border border-slate-200"/></label>
                </div>
                <div className="p-4 bg-slate-50 border-t flex gap-2"><button onClick={onClose} className="flex-1 py-3 rounded-full border bg-white font-bold text-slate-500 hover:bg-slate-100 transition">لغو</button><button onClick={submit} className="flex-1 py-3 rounded-full bg-indigo-600 text-white font-black hover:bg-indigo-700 transition">افزودن به سبد</button></div>
            </div></div>;
        };

        const EditPurchaseModal = ({ purchase, items, onClose, onSave }) => {
            const received=purchase?.status==='received';
            const [supplier,setSupplier]=useState(purchase?.supplier||''); const [date,setDate]=useState(purchase?.date||''); const [description,setDescription]=useState(purchase?.description||'');
            const [priority,setPriority]=useState(purchase?.priority||'normal'); const [countAsStock,setCountAsStock]=useState(!!purchase?.countAsStock);
            const [expectedDate,setExpectedDate]=useState(purchase?.expectedDate||'');
            const [status,setStatus]=useState(purchase?.status||'in_transit');
            const save=()=>onSave({...purchase,supplier:supplier.trim(),date,description,priority,countAsStock,expectedDate,status});
            return <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[70] flex items-center justify-center p-4"><div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden" onClick={e=>e.stopPropagation()}>
                <div className="p-5 border-b flex justify-between items-center"><div className="flex items-center gap-3"><div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center"><Edit3 size={16}/></div><div><h3 className="font-black text-slate-800">ویرایش خرید در راه</h3><p className="text-[10px] text-slate-400 mt-1">{received?'خرید دریافت‌شده است؛ اقلام برای جلوگیری از تغییر موجودی قفل هستند.':'اطلاعات بار، اولویت و وضعیت را ویرایش کنید.'}</p></div></div><button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 transition"><X size={18}/></button></div>
                <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-3">
                    <label className="text-xs font-bold">فروشنده / تأمین‌کننده<input value={supplier} onChange={e=>setSupplier(e.target.value)} className="mt-1 w-full p-3 rounded-xl border border-slate-200"/></label>
                    <label className="text-xs font-bold">تاریخ<input value={date} onChange={e=>setDate(e.target.value)} className="mt-1 w-full p-3 rounded-xl border border-slate-200" dir="ltr"/></label>
                    <label className="text-xs font-bold">تاریخ مورد انتظار<input type="date" disabled={received} value={expectedDate} onChange={e=>setExpectedDate(e.target.value)} className="mt-1 w-full p-3 rounded-xl border border-slate-200"/></label>
                    <label className="text-xs font-bold">اولویت<select value={priority} onChange={e=>setPriority(e.target.value)} className="mt-1 w-full p-3 rounded-xl border border-slate-200 bg-white"><option value="urgent">فوری</option><option value="high">مهم</option><option value="normal">عادی</option><option value="low">⚪ کم</option></select></label>
                    {!received&&<label className="text-xs font-bold">وضعیت<select value={status} onChange={e=>setStatus(e.target.value)} className="mt-1 w-full p-3 rounded-xl border border-slate-200 bg-white"><option value="in_transit">در راه</option><option value="delayed">⚠ تأخیر</option><option value="cancelled">✕ لغو</option></select></label>}
                    {!received&&<label className="flex items-center gap-2 p-3 rounded-xl bg-sky-50 border border-sky-100 text-xs font-bold"><input type="checkbox" checked={countAsStock} onChange={e=>setCountAsStock(e.target.checked)}/> در محاسبه قابل‌پیش‌فروش لحاظ شود</label>}
                    <label className="md:col-span-2 text-xs font-bold">توضیحات<textarea value={description} onChange={e=>setDescription(e.target.value)} className="mt-1 w-full min-h-28 p-3 rounded-xl border border-slate-200"/></label>
                </div>
                <div className="px-5 pb-5"><div className="rounded-2xl bg-slate-50 border p-3 text-xs text-slate-500">تعداد اقلام: <b>{(purchase?.items||[]).length}</b> — تغییر اقلام خرید دریافت‌شده برای جلوگیری از به‌هم‌ریختن موجودی غیرفعال است.</div></div>
                <div className="p-4 bg-slate-50 border-t flex gap-2"><button onClick={onClose} className="flex-1 py-3 rounded-full border bg-white font-bold text-slate-500 hover:bg-slate-100 transition">لغو</button><button onClick={save} className="flex-1 py-3 rounded-full bg-indigo-600 text-white font-black hover:bg-indigo-700 transition">ذخیره تغییرات</button></div>
            </div></div>;
        };

        // «سررسیدها و پیگیری مشتریان» — بخش جداگانه (نه فقط لیست منفعل داخل سفارش‌های در انتظار):
        // ۱) فاکتورهای نسیه‌ای که سررسید تسویه/چک برایشان ثبت شده و هنوز تسویه نشده‌اند، بر اساس فاصله‌ی
        //    دقیق روز تا امروز (بر مبنای تقویم شمسی دقیق، شامل کبیسه) به گذشته/امروز/تا ۳ روز آینده/آینده تفکیک می‌شوند.
        // ۲) مشتریانی که بیش از آستانه‌ی قابل‌تنظیمی از آخرین خریدشان گذشته، برای پیگیری فروش از دست رفته لیست می‌شوند.
        // راس‌گیری چک: میانگین وزنی تاریخ وصول چند چک با مبالغ و سررسیدهای مختلف.
        // فرمول: برای هر چک، فاصله‌ی روز بین «تاریخ مبنا» و «سررسید چک» را در مبلغ آن چک ضرب می‌کنیم،
        // مجموع این حاصل‌ضرب‌ها را بر مجموع مبلغ همه‌ی چک‌ها تقسیم می‌کنیم و عدد به‌دست‌آمده (میانگین روز) را
        // به تاریخ مبنا اضافه می‌کنیم تا «تاریخ راس» به دست بیاید.
        const CheckRassView = ({ invoices, appSettings, onSaveSettings }) => {
            const toast = useToast();
            const startOfDay = x => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
            const safeDate = s => { if (!s) return null; const d = new Date(s); return Number.isNaN(d.getTime()) ? null : d; };
            const todayJ = useMemo(() => toJalaliInput(new Date().toISOString()), []);
            const [invoiceId, setInvoiceId] = useState('');
            const [invoiceSearch, setInvoiceSearch] = useState('');
            const [manualTotal, setManualTotal] = useState('');
            const [shiftDays, setShiftDays] = useState('0');
            const [baseMode, setBaseMode] = useState('today'); // 'today' | 'invoice' | 'invoiceDue' | 'manual'
            const [baseJY, setBaseJY] = useState(todayJ.jy);
            const [baseJM, setBaseJM] = useState(todayJ.jm);
            const [baseJD, setBaseJD] = useState(todayJ.jd);
            const setBaseDayClamped = (jy, jm, jd) => {
                const maxD = daysInJalaliMonth(jy, jm);
                const clamped = jd && Number(jd) > maxD ? String(maxD) : jd;
                if (clamped !== jd) setBaseJD(clamped);
            };
            const makeRow = () => ({ id: generateId(), label: '', amount: '', jy: '', jm: '', jd: '' });
            const [rows, setRows] = useState([makeRow(), makeRow()]);
            const updateRow = (id, patch) => setRows(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r));
            const removeRow = (id) => setRows(prev => prev.filter(r => r.id !== id));
            const addRow = () => setRows(prev => [...prev, makeRow()]);
            const clearAll = () => { if (!confirm('همه‌ی ردیف‌های چک پاک شوند؟')) return; setRows([makeRow(), makeRow()]); };

            // فاکتورهای غیرِ لغوشده، جدیدترین اول؛ با جستجوی مشتری/تاریخ/شماره
            const invoiceOptions = useMemo(() => {
                const term = invoiceSearch.trim();
                if (!term) return [];
                return (invoices || [])
                    .filter(inv => inv.status !== 'cancelled')
                    .filter(inv => smartSearchMatch(`${inv.customer || ''} ${inv.date || ''} ${inv.id || ''}`, term))
                    .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
                    .slice(0, 8);
            }, [invoices, invoiceSearch]);
            const selectedInvoice = useMemo(() => (invoices || []).find(inv => inv.id === invoiceId) || null, [invoices, invoiceId]);
            const customerLabel = selectedInvoice ? (selectedInvoice.customer || 'بدون نام') : (invoiceSearch.trim() || 'بدون نام');

            // کل مبلغ فاکتور: از خودِ فاکتور (شامل هزینه‌ی بارگیری) یا مبلغ دستی وقتی فاکتوری انتخاب نشده
            const invoiceTotal = selectedInvoice ? (Number(selectedInvoice.totalPrice) || 0) : (parseDecimal(manualTotal) || 0);
            const invoiceLoading = selectedInvoice && selectedInvoice.includeLoadingCost ? (Number(selectedInvoice.loadingCostAmount) || 0) : 0;
            // تغییر محلی تاریخ‌های فاکتور (فقط در همین صفحه، هیچ‌چیز در خودِ فاکتور ذخیره یا تغییر نمی‌کند)
            const shift = Number(shiftDays) || 0;
            const addDays = (d, n) => { if (!d) return null; const x = new Date(d); x.setDate(x.getDate() + n); return x; };
            const invoiceDueRaw = selectedInvoice ? safeDate(selectedInvoice.dueDate) : null;
            const invoiceDueObj = addDays(invoiceDueRaw, shift);
            const invoiceDateObj = selectedInvoice && selectedInvoice.timestamp ? addDays(new Date(selectedInvoice.timestamp), shift) : null;

            // تاریخ مبنا: امروز، تاریخ صدور فاکتور (با تغییر محلی)، سررسید فاکتور (با تغییر محلی)، یا تاریخ دستی
            const baseIso = useMemo(() => {
                if (baseMode === 'today') return new Date().toISOString();
                if (baseMode === 'invoice') return invoiceDateObj ? invoiceDateObj.toISOString() : null;
                if (baseMode === 'invoiceDue') return invoiceDueObj ? invoiceDueObj.toISOString() : null;
                if (!baseJY || !baseJM || !baseJD) return null;
                return fromJalaliInput(baseJY, baseJM, baseJD) || null;
            }, [baseMode, baseJY, baseJM, baseJD, invoiceDateObj, invoiceDueObj]);
            const baseDateObj = baseIso ? safeDate(baseIso) : null;
            const baseValid = !!baseDateObj;

            // تحلیل کامل راس‌گیری: همه‌ی اعداد، توزیع، زمان‌بندی و کنترل‌های منطقی از همین یک memo می‌آیند
            const analysis = useMemo(() => {
                const detail = rows.map(r => {
                    const amount = parseDecimal(r.amount) || 0;
                    const hasDate = !!(r.jy && r.jm && r.jd);
                    let dueObj = null, dueIso = null;
                    if (hasDate) {
                        const iso = fromJalaliInput(r.jy, r.jm, r.jd);
                        const d = safeDate(iso);
                        if (d) { dueObj = d; dueIso = iso; }
                    }
                    let status = 'empty';
                    if (amount > 0 && dueObj) status = 'ok';
                    else if (amount > 0 || hasDate) status = 'incomplete';
                    const days = status === 'ok' && baseValid ? Math.round((startOfDay(dueObj) - startOfDay(baseDateObj)) / 86400000) : null;
                    return { ...r, amount, dueObj, dueIso, status, days, weighted: days === null ? 0 : amount * days };
                });

                const ok = detail.filter(d => d.status === 'ok');
                const checkTotal = ok.reduce((s, d) => s + d.amount, 0);
                const totalWeighted = ok.reduce((s, d) => s + d.weighted, 0);
                const avgDays = baseValid && checkTotal > 0 ? Math.round(totalWeighted / checkTotal) : null;
                let rassDateObj = null;
                if (avgDays !== null) {
                    rassDateObj = new Date(startOfDay(baseDateObj));
                    rassDateObj.setDate(rassDateObj.getDate() + avgDays);
                }

                // تفکیک روزانه (هر سررسید یک‌بار) و زمان‌بندی تجمعی
                const dayMap = {};
                ok.forEach(d => {
                    const k = startOfDay(d.dueObj);
                    if (!dayMap[k]) dayMap[k] = { time: k, amount: 0, count: 0 };
                    dayMap[k].amount += d.amount; dayMap[k].count += 1;
                });
                const dayList = Object.values(dayMap).sort((a, b) => a.time - b.time);
                let running = 0;
                const schedule = dayList.map(x => {
                    running += x.amount;
                    return { ...x, cumulative: running, sharePct: checkTotal ? x.amount / checkTotal * 100 : 0, cumPct: checkTotal ? running / checkTotal * 100 : 0 };
                });
                const topDay = dayList.reduce((best, x) => (!best || x.amount > best.amount ? x : best), null);
                const topCheck = ok.reduce((best, x) => (!best || x.amount > best.amount ? x : best), null);

                // تفکیک ماهانه (شمسی)
                const monthMap = {};
                ok.forEach(d => {
                    const j = toJalaliInput(d.dueObj.toISOString());
                    const key = `${j.jy}/${String(j.jm).padStart(2, '0')}`;
                    if (!monthMap[key]) monthMap[key] = { key, amount: 0, count: 0 };
                    monthMap[key].amount += d.amount; monthMap[key].count += 1;
                });
                const monthList = Object.values(monthMap).sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0))
                    .map(m => ({ ...m, sharePct: checkTotal ? m.amount / checkTotal * 100 : 0 }));

                const firstDue = schedule.length ? new Date(schedule[0].time) : null;
                const lastDue = schedule.length ? new Date(schedule[schedule.length - 1].time) : null;
                const spanDays = firstDue && lastDue ? Math.round((lastDue - firstDue) / 86400000) : 0;

                // کنترل‌های منطقی
                const issues = [];
                const diff = invoiceTotal - checkTotal;
                const diffAbs = Math.abs(diff);
                if (!invoiceTotal) issues.push({ level: 'info', text: 'کل مبلغ فاکتور مشخص نشده؛ مقایسه‌ی چک‌ها با فاکتور انجام نشد.' });
                if (checkTotal === 0) issues.push({ level: 'error', text: 'هیچ چک کاملی (مبلغ و تاریخ) ثبت نشده است.' });
                if (invoiceTotal > 0 && checkTotal > 0 && diffAbs >= 1) {
                    issues.push({ level: 'error', text: diff > 0
                        ? `جمع چک‌ها ${formatNumber(diffAbs)} کمتر از کل فاکتور است (کسری پوشش).`
                        : `جمع چک‌ها ${formatNumber(diffAbs)} بیشتر از کل فاکتور است (مازاد).` });
                }
                const incompleteCount = detail.filter(d => d.status === 'incomplete').length;
                if (incompleteCount) issues.push({ level: 'warn', text: `${formatNumber(incompleteCount)} ردیف ناقص است (مبلغ یا تاریخ خالی مانده).` });
                if (!baseValid) issues.push({ level: 'warn', text: 'تاریخ مبنا کامل نیست؛ میانگین روز و تاریخ راس محاسبه نشد.' });
                if (invoiceDateObj) {
                    const before = ok.filter(d => startOfDay(d.dueObj) < startOfDay(invoiceDateObj)).length;
                    if (before) issues.push({ level: 'error', text: `${formatNumber(before)} چک سررسیدشان قبل از تاریخ صدور فاکتور است.` });
                }
                if (invoiceDueObj) {
                    const after = ok.filter(d => startOfDay(d.dueObj) > startOfDay(invoiceDueObj)).length;
                    if (after) issues.push({ level: 'warn', text: `${formatNumber(after)} چک بعد از سررسید فاکتور است.` });
                    if (rassDateObj && startOfDay(rassDateObj) > startOfDay(invoiceDueObj)) issues.push({ level: 'warn', text: 'تاریخ راس نهایی بعد از سررسید فاکتور است.' });
                }
                if (baseValid) {
                    const past = ok.filter(d => d.days < 0).length;
                    if (past) issues.push({ level: 'warn', text: `${formatNumber(past)} چک نسبت به تاریخ مبنا سررسیدش گذشته است.` });
                }
                const seen = {}; const dupKeys = new Set();
                ok.forEach(d => { const k = `${startOfDay(d.dueObj)}|${d.amount}`; if (seen[k]) dupKeys.add(k); seen[k] = true; });
                if (dupKeys.size) issues.push({ level: 'warn', text: `${formatNumber(dupKeys.size)} مورد احتمالاً تکراری (همان مبلغ در همان روز سررسید).` });
                if (spanDays > 180) issues.push({ level: 'info', text: `بازه‌ی سررسیدها ${formatNumber(spanDays)} روز است (بیش از ۶ ماه).` });

                const hasError = issues.some(i => i.level === 'error');
                const hasWarn = issues.some(i => i.level === 'warn');
                let verdict;
                if (checkTotal === 0 && incompleteCount === 0) verdict = { key: 'none', label: 'بدون چک' };
                else if (hasError) verdict = { key: 'bad', label: 'ناهمخوان' };
                else if (hasWarn) verdict = { key: 'warn', label: 'نیاز به بررسی' };
                else verdict = { key: 'ok', label: invoiceTotal > 0 ? 'منطقی' : 'منطقی (بدون مقایسه با فاکتور)' };

                return {
                    detail, ok, checkTotal, totalWeighted, avgDays, rassDateObj, schedule, monthList,
                    topDay, topCheck, firstDue, lastDue, spanDays, diff, diffAbs,
                    coveragePct: invoiceTotal ? (checkTotal / invoiceTotal) * 100 : null,
                    incompleteCount, issues, verdict,
                };
            }, [rows, baseDateObj, baseValid, invoiceTotal, invoiceDateObj, invoiceDueObj, shift]);

            const a = analysis;
            const verdictTone = {
                ok: 'bg-emerald-50 border-emerald-300 text-emerald-700',
                warn: 'bg-amber-50 border-amber-300 text-amber-700',
                bad: 'bg-red-50 border-red-300 text-red-700',
                none: 'bg-slate-50 border-slate-200 text-slate-600',
            }[a.verdict.key];
            const issueTone = { error: 'bg-red-50 border-red-200 text-red-700', warn: 'bg-amber-50 border-amber-200 text-amber-700', info: 'bg-slate-50 border-slate-200 text-slate-600' };
            const fmtDay = (t) => formatJalali(new Date(t).toISOString());
            const fmtPct = (p) => `${formatNumber(Math.round(p * 10) / 10)}٪`;
            const diffText = a.diff === 0 ? 'کاملاً منطبق' : a.diff > 0 ? `کسری ${formatNumber(a.diffAbs)}` : `مازاد ${formatNumber(a.diffAbs)}`;

            const buildSummary = () => {
                const lines = [];
                lines.push('راس‌گیری چک');
                lines.push(`تاریخ مبنا: ${baseValid ? formatJalali(baseIso) : 'نامشخص'}`);
                if (selectedInvoice) {
                    lines.push(`فاکتور: ${customerLabel} | تاریخ: ${selectedInvoice.date || '—'} | کل: ${formatNumber(invoiceTotal)}${invoiceLoading ? ` (شامل بارگیری ${formatNumber(invoiceLoading)})` : ''}`);
                    lines.push(`مهلت تسویه: ${selectedInvoice.settlementTerm || 'تعیین نشده'} | سررسید فاکتور: ${invoiceDueRaw ? formatJalali(invoiceDueRaw.toISOString()) : 'بدون موعد'}${shift ? ` (تغییر محلی ${formatNumber(shift)} روز)` : ''}`);
                } else {
                    lines.push(`مشتری: ${customerLabel}`);
                    if (invoiceTotal) lines.push(`کل مبلغ فاکتور: ${formatNumber(invoiceTotal)}`);
                }
                lines.push(`تعداد چک: ${formatNumber(a.ok.length)} | جمع مبلغ چک‌ها: ${formatNumber(a.checkTotal)}`);
                if (invoiceTotal) lines.push(`وضعیت پوشش: ${diffText} | پوشش: ${a.coveragePct !== null ? fmtPct(a.coveragePct) : '—'}`);
                if (a.avgDays !== null) lines.push(`میانگین وزنی: ${formatNumber(a.avgDays)} روز | تاریخ راس: ${formatJalali(a.rassDateObj.toISOString())}`);
                if (a.monthList.length) lines.push('تفکیک ماهانه: ' + a.monthList.map(m => `${m.key} = ${formatNumber(m.amount)} (${formatNumber(m.count)} چک)`).join('، '));
                if (a.topDay) lines.push(`سنگین‌ترین سررسید: ${fmtDay(a.topDay.time)} با ${formatNumber(a.topDay.amount)}`);
                lines.push(`نتیجه: ${a.verdict.label}`);
                if (a.issues.length) lines.push('موارد: ' + a.issues.map(i => i.text).join(' | '));
                return lines.join('\n');
            };
            const copySummary = async () => {
                try { await navigator.clipboard.writeText(buildSummary()); toast.show('خلاصه‌ی راس‌گیری کپی شد.'); }
                catch (e) { toast.show('کپی انجام نشد.'); }
            };

            return (
                <div className="max-w-5xl mx-auto space-y-4">
                    {/* ۱) فاکتور یا مشتری */}
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-4 space-y-3">
                        <div className="text-[11px] font-bold text-indigo-800 flex items-center gap-1.5"><FileText size={13}/> فاکتور یا مشتری</div>
                        <div className="grid md:grid-cols-2 gap-2 items-start">
                            <div className="space-y-1.5">
                                <input value={invoiceSearch} onChange={e => { setInvoiceSearch(e.target.value); setInvoiceId(''); }} placeholder="نام مشتری یا تاریخ فاکتور را تایپ کن..." className="w-full p-2 rounded-xl border border-slate-200 text-xs outline-none focus:border-indigo-400" />
                                {!selectedInvoice && invoiceOptions.length > 0 && (
                                    <div className="border border-slate-200 rounded-xl bg-white divide-y divide-slate-100 overflow-hidden">
                                        {invoiceOptions.map(inv => (
                                            <button key={inv.id} onClick={() => { setInvoiceId(inv.id); setInvoiceSearch(inv.customer || ''); }} className="w-full text-right p-2 text-xs hover:bg-slate-50 flex items-center justify-between gap-2">
                                                <span className="font-bold text-slate-700">{inv.customer || 'بدون نام'}</span>
                                                <span className="text-slate-400 text-[10px]">{`${inv.date || '—'} | ${formatNumber(Number(inv.totalPrice) || 0)}`}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                                {selectedInvoice
                                    ? <button onClick={() => { setInvoiceId(''); }} className="text-[10px] text-red-500 font-bold">لغو انتخاب فاکتور (ادامه با مبلغ و نام دستی)</button>
                                    : <div className="text-[10px] text-slate-400">اگر فاکتور پیدا نشد، همین نام را به‌عنوان مشتری دلخواه استفاده می‌کنیم و مبلغ را دستی وارد می‌کنی.</div>}
                            </div>
                            {!selectedInvoice && (
                                <div>
                                    <div className="text-[10px] text-slate-400 mb-1">کل مبلغ فاکتور (دستی)</div>
                                    <FormattedInput value={manualTotal} onChange={setManualTotal} className="w-full p-2 border border-slate-200 rounded-xl text-xs text-center" placeholder="مبلغ کل فاکتور" />
                                </div>
                            )}
                        </div>
                        {selectedInvoice && (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px] bg-slate-50 border border-slate-100 rounded-xl p-3">
                                <div><div className="text-[10px] text-slate-400">مشتری</div><div className="font-bold text-slate-700">{customerLabel}</div></div>
                                <div><div className="text-[10px] text-slate-400">تاریخ صدور فاکتور</div><div className="font-bold text-slate-700">{selectedInvoice.date || '—'}{shift ? ` → ${invoiceDateObj ? formatJalali(invoiceDateObj.toISOString()) : ''}` : ''}</div></div>
                                <div><div className="text-[10px] text-slate-400">کل مبلغ فاکتور</div><div className="font-black text-indigo-700">{formatNumber(invoiceTotal)}</div>{invoiceLoading > 0 && <div className="text-[9px] text-slate-400">شامل بارگیری {formatNumber(invoiceLoading)}</div>}</div>
                                <div><div className="text-[10px] text-slate-400">وضعیت</div><div className="font-bold text-slate-700">{selectedInvoice.status === 'pending' ? 'در انتظار' : 'کامل'} / {selectedInvoice.paymentStatus === 'settled' ? 'تسویه شده' : 'تسویه نشده'}</div></div>
                                <div className="col-span-2"><div className="text-[10px] text-slate-400">مهلت / شرایط تسویه</div><div className="font-bold text-slate-700">{selectedInvoice.settlementTerm || 'تعیین نشده'}</div></div>
                                <div className="col-span-2"><div className="text-[10px] text-slate-400">سررسید فاکتور (ذخیره‌شده در فاکتور)</div><div className="font-bold text-slate-700">{formatJalali(selectedInvoice.dueDate)}{shift && invoiceDueObj ? ` → در این بخش: ${formatJalali(invoiceDueObj.toISOString())}` : ''}</div></div>
                            </div>
                        )}
                    </div>

                    {/* ۲) تاریخ مبنا */}
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-4">
                        <div className="text-[11px] font-bold text-indigo-800 mb-2 flex items-center gap-1.5"><CalendarClock size={13}/> تاریخ مبنا</div>
                        <div className="flex flex-wrap gap-1.5">
                            {[['today', 'امروز'], ['invoice', 'تاریخ صدور فاکتور'], ['invoiceDue', 'سررسید فاکتور'], ['manual', 'تاریخ دستی']].map(([val, lbl]) => (
                                <label key={val} className={`flex items-center gap-1.5 p-1.5 rounded-lg border cursor-pointer text-[11px] ${baseMode === val ? 'bg-indigo-50 border-indigo-400 font-bold text-indigo-700' : 'border-slate-200 text-slate-500'}`}>
                                    <input type="radio" checked={baseMode === val} onChange={() => setBaseMode(val)} /> {lbl}
                                </label>
                            ))}
                        </div>
                        {(baseMode === 'invoice' || baseMode === 'invoiceDue') && (
                            <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
                                <span className="text-slate-600 font-bold">تغییر محلی تاریخ فاکتور (روز):</span>
                                <input inputMode="numeric" value={shiftDays} onChange={e => setShiftDays(e.target.value.replace(/[^0-9-]/g, ''))} className="w-20 p-1.5 border border-indigo-200 rounded-lg text-center bg-white" />
                                <span className="text-[10px] text-slate-400">مثلاً ۲ = دو روز بعد از تاریخ فاکتور. فقط در همین صفحه اعمال می‌شود و فاکتور تغییر نمی‌کند.</span>
                            </div>
                        )}
                        {baseMode === 'manual' && (
                            <div className="mt-2 grid grid-cols-3 gap-1 max-w-xs" dir="rtl">
                                <input inputMode="numeric" value={baseJY} onChange={e => { const v = e.target.value.replace(/\D/g, ''); setBaseJY(v); setBaseDayClamped(v, baseJM, baseJD); }} placeholder="سال" className="p-1.5 border border-indigo-200 rounded-lg text-[11px] text-center bg-white" />
                                <select value={baseJM} onChange={e => { setBaseJM(e.target.value); setBaseDayClamped(baseJY, e.target.value, baseJD); }} className="p-1.5 border border-indigo-200 rounded-lg text-[11px] bg-white"><option value="">ماه</option>{Array.from({length:12},(_,i)=><option key={i+1} value={i+1}>{i+1}</option>)}</select>
                                <select value={baseJD} onChange={e => setBaseJD(e.target.value)} className="p-1.5 border border-indigo-200 rounded-lg text-[11px] bg-white"><option value="">روز</option>{Array.from({length:daysInJalaliMonth(baseJY,baseJM)},(_,i)=><option key={i+1} value={i+1}>{i+1}</option>)}</select>
                            </div>
                        )}
                        {baseValid && <div className="text-[10px] text-slate-400 mt-1.5">مبنا: {formatJalali(baseIso)}</div>}
                        {!baseValid && baseMode === 'manual' && <div className="text-[10px] text-red-500 font-bold mt-1.5">تاریخ مبنا را کامل انتخاب کنید</div>}
                        {!baseValid && (baseMode === 'invoice' || baseMode === 'invoiceDue') && <div className="text-[10px] text-red-500 font-bold mt-1.5">برای این مبنا، ابتدا فاکتور (با تاریخ معتبر) را انتخاب کنید</div>}
                    </div>

                    {/* ۳) لیست چک‌ها */}
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="bg-slate-50 border-b border-slate-100 p-3 flex items-center justify-between gap-2">
                            <div className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5"><Landmark size={13}/> لیست چک‌ها ({formatNumber(a.ok.length)} کامل)</div>
                            <div className="flex items-center gap-1.5">
                                <button onClick={clearAll} className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-500 text-[10px] font-bold">پاک کردن همه</button>
                                <button onClick={addRow} className="px-2.5 py-1.5 rounded-lg bg-indigo-600 text-white text-[10px] font-bold flex items-center gap-1"><Plus size={12}/> افزودن چک</button>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-[11px]">
                                <thead className="bg-slate-50 text-slate-400">
                                    <tr>
                                        <th className="p-2 text-right font-bold">عنوان/شماره چک</th>
                                        <th className="p-2 text-center font-bold">مبلغ</th>
                                        <th className="p-2 text-center font-bold">تاریخ سررسید چک</th>
                                        <th className="p-2 text-center font-bold">فاصله از مبنا (روز)</th>
                                        <th className="p-2 text-center font-bold">مبلغ × روز</th>
                                        <th className="p-2 text-center font-bold">سهم از کل چک‌ها</th>
                                        <th className="p-2 text-center font-bold">وضعیت</th>
                                        <th className="p-2"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {a.detail.map((r, idx) => (
                                        <tr key={r.id}>
                                            <td className="p-1.5"><input value={r.label} onChange={e => updateRow(r.id, { label: e.target.value })} placeholder={`مثلاً چک شماره ${idx + 1}`} className="w-full p-1.5 border border-slate-200 rounded-lg text-[11px]" /></td>
                                            <td className="p-1.5"><FormattedInput value={r.amount} onChange={val => updateRow(r.id, { amount: val })} className="w-28 p-1.5 border border-slate-200 rounded-lg text-[11px] text-center" placeholder="مبلغ" /></td>
                                            <td className="p-1.5">
                                                <div className="grid grid-cols-3 gap-0.5" dir="rtl">
                                                    <input inputMode="numeric" value={r.jy} onChange={e => updateRow(r.id, { jy: e.target.value.replace(/\D/g,'') })} placeholder="سال" className="w-12 p-1 border border-slate-200 rounded text-[10px] text-center" />
                                                    <select value={r.jm} onChange={e => updateRow(r.id, { jm: e.target.value })} className="p-1 border border-slate-200 rounded text-[10px]"><option value="">ماه</option>{Array.from({length:12},(_,i)=><option key={i+1} value={i+1}>{i+1}</option>)}</select>
                                                    <select value={r.jd} onChange={e => updateRow(r.id, { jd: e.target.value })} className="p-1 border border-slate-200 rounded text-[10px]"><option value="">روز</option>{Array.from({length:daysInJalaliMonth(r.jy,r.jm)},(_,i)=><option key={i+1} value={i+1}>{i+1}</option>)}</select>
                                                </div>
                                            </td>
                                            <td className="p-1.5 text-center font-bold">{r.status === 'ok' && r.days !== null ? formatNumber(r.days) : '—'}</td>
                                            <td className="p-1.5 text-center font-bold text-indigo-700">{r.status === 'ok' && r.days !== null ? formatNumber(r.weighted) : '—'}</td>
                                            <td className="p-1.5 text-center text-slate-600">{r.status === 'ok' && a.checkTotal ? fmtPct(r.amount / a.checkTotal * 100) : '—'}</td>
                                            <td className="p-1.5 text-center">
                                                {r.status === 'ok' && <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">کامل</span>}
                                                {r.status === 'incomplete' && <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200">ناقص</span>}
                                                {r.status === 'empty' && <span className="text-slate-300">—</span>}
                                            </td>
                                            <td className="p-1.5 text-center"><button onClick={() => removeRow(r.id)} className="p-1 rounded-lg hover:bg-red-50 text-red-400"><Trash2 size={13}/></button></td>
                                        </tr>
                                    ))}
                                    {a.detail.length === 0 && <tr><td colSpan="8" className="p-6 text-center text-slate-400">هیچ چکی اضافه نشده</td></tr>}
                                </tbody>
                                {a.ok.length > 0 && (
                                    <tfoot className="bg-slate-50 font-black text-slate-700">
                                        <tr>
                                            <td className="p-2">جمع ({formatNumber(a.ok.length)} چک)</td>
                                            <td className="p-2 text-center">{formatNumber(a.checkTotal)}</td>
                                            <td></td>
                                            <td className="p-2 text-center">{a.avgDays !== null ? `میانگین ${formatNumber(a.avgDays)}` : '—'}</td>
                                            <td className="p-2 text-center text-indigo-700">{a.avgDays !== null ? formatNumber(a.totalWeighted) : '—'}</td>
                                            <td className="p-2 text-center">۱۰۰٪</td>
                                            <td colSpan="2"></td>
                                        </tr>
                                    </tfoot>
                                )}
                            </table>
                        </div>
                    </div>

                    {/* ۴) خلاصه‌ی اعداد کلیدی */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        <div className="bg-white rounded-3xl border border-slate-200 p-4 text-center">
                            <div className="text-[10px] text-slate-400 font-bold mb-1">کل مبلغ فاکتور</div>
                            <div className="text-sm font-black text-slate-800">{invoiceTotal ? formatNumber(invoiceTotal) : '—'}</div>
                            {invoiceLoading > 0 && <div className="text-[9px] text-slate-400 mt-0.5">شامل بارگیری {formatNumber(invoiceLoading)}</div>}
                        </div>
                        <div className="bg-white rounded-3xl border border-slate-200 p-4 text-center">
                            <div className="text-[10px] text-slate-400 font-bold mb-1">جمع مبلغ چک‌ها</div>
                            <div className="text-sm font-black text-indigo-700">{formatNumber(a.checkTotal)}</div>
                            <div className="text-[9px] text-slate-400 mt-0.5">{formatNumber(a.ok.length)} چک کامل</div>
                        </div>
                        <div className="bg-white rounded-3xl border border-slate-200 p-4 text-center">
                            <div className="text-[10px] text-slate-400 font-bold mb-1">پوشش فاکتور</div>
                            <div className={`text-sm font-black ${a.diff === 0 && invoiceTotal ? 'text-emerald-700' : a.diff > 0 ? 'text-amber-600' : a.diff < 0 ? 'text-red-600' : 'text-slate-800'}`}>{a.coveragePct !== null ? fmtPct(a.coveragePct) : '—'}</div>
                            <div className="text-[9px] text-slate-400 mt-0.5">{invoiceTotal ? diffText : 'مبلغ فاکتور نامشخص'}</div>
                        </div>
                        <div className="bg-white rounded-3xl border border-slate-200 p-4 text-center">
                            <div className="text-[10px] text-slate-400 font-bold mb-1">میانگین روز (راس)</div>
                            <div className="text-sm font-black text-slate-800">{a.avgDays !== null ? `${formatNumber(a.avgDays)} روز` : '—'}</div>
                            <div className="text-[9px] text-slate-400 mt-0.5">میانگین وزنی بر اساس مبلغ</div>
                        </div>
                        <div className="bg-white rounded-2xl border-2 border-emerald-200 p-4 text-center">
                            <div className="text-[10px] text-emerald-600 font-bold mb-1">تاریخ راس نهایی</div>
                            <div className="text-sm font-black text-emerald-700">{a.rassDateObj ? formatJalali(a.rassDateObj.toISOString()) : '—'}</div>
                        </div>
                        <div className="bg-white rounded-3xl border border-slate-200 p-4 text-center">
                            <div className="text-[10px] text-slate-400 font-bold mb-1">بازه‌ی سررسیدها</div>
                            <div className="text-[11px] font-bold text-slate-700">{a.firstDue ? `${formatJalali(a.firstDue.toISOString())} تا ${formatJalali(a.lastDue.toISOString())}` : '—'}</div>
                            {a.firstDue && <div className="text-[9px] text-slate-400 mt-0.5">{formatNumber(a.spanDays)} روز</div>}
                        </div>
                    </div>

                    {/* ۵) بزرگ‌ترین‌ها */}
                    {a.ok.length > 0 && (
                        <div className="grid md:grid-cols-2 gap-3">
                            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-4">
                                <div className="text-[11px] font-bold text-slate-700 mb-2">بزرگ‌ترین چک</div>
                                <div className="flex justify-between text-xs"><span className="text-slate-500">مبلغ</span><span className="font-black text-slate-800">{formatNumber(a.topCheck.amount)}</span></div>
                                <div className="flex justify-between text-xs mt-1"><span className="text-slate-500">سررسید</span><span className="font-bold text-slate-700">{formatJalali(a.topCheck.dueIso)}</span></div>
                                <div className="flex justify-between text-xs mt-1"><span className="text-slate-500">عنوان</span><span className="text-slate-700">{a.topCheck.label || '—'}</span></div>
                            </div>
                            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-4">
                                <div className="text-[11px] font-bold text-slate-700 mb-2">سنگین‌ترین روز سررسید</div>
                                <div className="flex justify-between text-xs"><span className="text-slate-500">تاریخ</span><span className="font-bold text-slate-700">{fmtDay(a.topDay.time)}</span></div>
                                <div className="flex justify-between text-xs mt-1"><span className="text-slate-500">مبلغ آن روز</span><span className="font-black text-slate-800">{formatNumber(a.topDay.amount)} ({fmtPct(a.checkTotal ? a.topDay.amount / a.checkTotal * 100 : 0)})</span></div>
                                <div className="flex justify-between text-xs mt-1"><span className="text-slate-500">تعداد چک آن روز</span><span className="text-slate-700">{formatNumber(a.topDay.count)}</span></div>
                            </div>
                        </div>
                    )}

                    {/* ۶) زمان‌بندی وصول به ترتیب تاریخ */}
                    {a.schedule.length > 0 && (
                        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                            <div className="bg-slate-50 border-b border-slate-100 p-3 text-[11px] font-bold text-slate-700">زمان‌بندی وصول (به ترتیب تاریخ سررسید)</div>
                            <table className="w-full text-[11px]">
                                <thead className="bg-slate-50 text-slate-400">
                                    <tr><th className="p-2 text-right font-bold">سررسید</th><th className="p-2 text-center font-bold">تعداد چک</th><th className="p-2 text-center font-bold">مبلغ همان روز</th><th className="p-2 text-center font-bold">سهم از کل</th><th className="p-2 text-center font-bold">تجمعی</th><th className="p-2 text-center font-bold">تجمعی %</th></tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {a.schedule.map(s => (
                                        <tr key={s.time} className="hover:bg-slate-50">
                                            <td className="p-2 font-bold text-slate-700">{fmtDay(s.time)}</td>
                                            <td className="p-2 text-center">{formatNumber(s.count)}</td>
                                            <td className="p-2 text-center font-bold">{formatNumber(s.amount)}</td>
                                            <td className="p-2 text-center">{fmtPct(s.sharePct)}</td>
                                            <td className="p-2 text-center text-indigo-700 font-bold">{formatNumber(s.cumulative)}</td>
                                            <td className="p-2 text-center">{fmtPct(s.cumPct)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* ۷) تفکیک ماهانه */}
                    {a.monthList.length > 0 && (
                        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                            <div className="bg-slate-50 border-b border-slate-100 p-3 text-[11px] font-bold text-slate-700">تفکیک ماهانه (شمسی)</div>
                            <table className="w-full text-[11px]">
                                <thead className="bg-slate-50 text-slate-400">
                                    <tr><th className="p-2 text-right font-bold">سال/ماه</th><th className="p-2 text-center font-bold">تعداد چک</th><th className="p-2 text-center font-bold">مبلغ</th><th className="p-2 text-center font-bold">سهم از کل</th></tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {a.monthList.map(m => (
                                        <tr key={m.key} className="hover:bg-slate-50">
                                            <td className="p-2 font-bold text-slate-700">{m.key}</td>
                                            <td className="p-2 text-center">{formatNumber(m.count)}</td>
                                            <td className="p-2 text-center font-bold">{formatNumber(m.amount)}</td>
                                            <td className="p-2 text-center">{fmtPct(m.sharePct)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* ۸) کنترل منطقی و نتیجه */}
                    <div className={`rounded-2xl border-2 p-4 space-y-2 ${verdictTone}`}>
                        <div className="flex items-center justify-between gap-2">
                            <div className="font-black text-sm flex items-center gap-1.5"><Scale size={15}/> نتیجه‌ی راس‌گیری: {a.verdict.label}</div>
                            <button onClick={copySummary} className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 text-[10px] font-bold flex items-center gap-1"><ClipboardList size={12}/> کپی خلاصه</button>
                        </div>
                        {a.issues.length === 0 && <div className="text-xs">هیچ مغایرتی پیدا نشد؛ چک‌ها با فاکتور و تاریخ‌ها سازگارند.</div>}
                        {a.issues.map((i, idx) => (
                            <div key={idx} className={`flex items-start gap-2 text-[11px] border rounded-xl p-2 bg-white ${issueTone[i.level]}`}>
                                {i.level === 'info' ? <Info size={13} className="shrink-0 mt-0.5"/> : <AlertTriangle size={13} className="shrink-0 mt-0.5"/>}
                                <span>{i.text}</span>
                            </div>
                        ))}
                    </div>

                    <div className="text-[10px] text-slate-400 px-1 leading-6">
                        راس‌گیری یعنی به‌جای چند چک با تاریخ‌های مختلف، یک تاریخ واحد (میانگین وزنی بر اساس مبلغ) برای کل مبلغ محاسبه شود؛ فرمول: مجموع(مبلغ هر چک × فاصله‌ی روزِ آن از تاریخ مبنا) ÷ مجموع مبالغ = میانگین روز، که به تاریخ مبنا اضافه می‌شود.
                        پوشش فاکتور = جمع چک‌ها ÷ کل مبلغ فاکتور. ردیف «ناقص» ردیفی است که فقط مبلغ یا فقط تاریخ دارد و در محاسبه‌ها نمی‌آید. کنترل‌ها شامل: کسری/مازاد نسبت به فاکتور، چک قبل از تاریخ فاکتور، چک بعد از سررسید فاکتور، راس بعد از سررسید، سررسید گذشته نسبت به مبنا، چک‌های تکراری و بازه‌ی طولانی سررسیدها.
                    </div>
                </div>
            );
        };

