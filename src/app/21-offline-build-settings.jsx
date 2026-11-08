//## ═══ app/21-offline-build-settings.jsx ═══
//## ساخت نسخه‌ی آفلاین از داخل برنامه و صفحه‌ی تنظیمات (SettingsView).
//## ترتیب فایل‌ها در build.py مهم است؛ همه‌ی بخش‌ها یک scope مشترک دارند.
        // ===== ساخت نسخه‌ی آفلاین از داخل خود برنامه =====
        // نسخه‌ی در حال اجرا را (با همان کدِ فعلی) برمی‌دارد، هر <script src="https://..."> را پیدا و دانلود و داخل فایل جاسازی می‌کند،
        // فونت‌های احتمالی را Base64 می‌کند و یک فایل HTML تک‌فایلی می‌سازد که بدون اینترنت اجرا می‌شود.
        const offlineArrayBufferToBase64 = (buf) => {
            const bytes = new Uint8Array(buf);
            let bin = '';
            const CHUNK = 0x8000;
            for (let i = 0; i < bytes.length; i += CHUNK) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
            return btoa(bin);
        };
        const offlineFetchText = async (url) => {
            const res = await fetch(url);
            if (!res.ok) throw new Error(`دانلود ناموفق (HTTP ${res.status}): ${url}`);
            return res.text();
        };
        const offlineAssertScript = (url, text) => {
            const head = String(text || '').slice(0, 2000).trim().toLowerCase();
            if (!head) throw new Error(`پاسخ خالی بود: ${url}`);
            if (head.startsWith('<!doctype html') || head.startsWith('<html') || head.includes('<head>') || head.includes('<title>')) {
                throw new Error(`به‌جای فایل جاوااسکریپت، صفحه‌ی HTML برگشت (آدرس معتبر نیست): ${url}`);
            }
            if (text.length < 1024) throw new Error(`حجم پاسخ مشکوکانه کم بود: ${url}`);
        };
        const buildOfflineHtml = async (log) => {
            log('📸 برداشتن نسخه‌ی فعلی برنامه...');
            const clone = document.documentElement.cloneNode(true);
            const rootEl = clone.querySelector('#root');
            if (rootEl) rootEl.innerHTML = '';
            let html = '<!DOCTYPE html>\n' + clone.outerHTML;

            // ۱) کتابخانه‌های خارجی را پیدا و inline کن
            const scriptRe = /<script\b([^>]*?)\ssrc=["'](https?:\/\/[^"']+)["']([^>]*)>\s*<\/script>/gi;
            const scripts = [];
            let m;
            while ((m = scriptRe.exec(html))) scripts.push({ fullTag: m[0], url: m[2] });
            log(`🔗 ${scripts.length} کتابخانه‌ی خارجی پیدا شد.`);
            for (const { fullTag, url } of scripts) {
                log(`⏳ دانلود: ${url}`);
                const code = await offlineFetchText(url);
                offlineAssertScript(url, code);
                const safeCode = code.replace(/<\/script>/gi, '<\\/script>');
                const replacement = `<script>\n/* inlined offline: ${url} */\n${safeCode}\n<\/script>`;
                const idx = html.indexOf(fullTag);
                if (idx === -1) throw new Error(`تگ اسکریپت پیدا نشد: ${url}`);
                html = html.slice(0, idx) + replacement + html.slice(idx + fullTag.length);
            }

            // ۲) فونت‌های Google (اگر در برنامه استفاده شده باشند) را Base64 کن
            const fontLinkRe = /<link[^>]*fonts\.googleapis\.com[^>]*>\s*/gi;
            const fontImportRe = /@import\s+url\(['"]?https:\/\/fonts\.googleapis\.com\/[^)]*\)\s*;?/gi;
            const hasFonts = fontLinkRe.test(html) || fontImportRe.test(html);
            html = html.replace(fontLinkRe, '').replace(fontImportRe, '');
            if (hasFonts) {
                log('🔤 جاسازی فونت...');
                let fontCss = await offlineFetchText('https://fonts.googleapis.com/css2?family=Vazirmatn:wght@100;300;400;500;700;900&display=swap');
                const fontUrls = [...new Set([...fontCss.matchAll(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/g)].map(x => x[1]))];
                for (const fu of fontUrls) {
                    const res = await fetch(fu);
                    if (!res.ok) throw new Error(`دانلود فونت ناموفق: ${fu}`);
                    const b64 = offlineArrayBufferToBase64(await res.arrayBuffer());
                    const mime = fu.endsWith('.woff2') ? 'font/woff2' : 'font/woff';
                    fontCss = fontCss.split(fu).join(`data:${mime};base64,${b64}`);
                }
                const styleTag = `<style>\n/* فونت جاسازی‌شده (آفلاین) */\n${fontCss}\n</style>`;
                html = html.replace(/<\/head>/i, () => styleTag + '\n</head>');
            }

            // ۳) وابستگی‌های اضافه/مرده را حذف کن
            html = html
                .replace(/<script\s+type=["']importmap["']>[\s\S]*?<\/script>\s*/i, '')
                .replace(/<link\s+rel=["']stylesheet["']\s+href=["']\/index\.css["']\s*\/?>\s*/i, '')
                .replace(/<script\s+type=["']module["']\s+src=["']\/index\.tsx["']\s*><\/script>\s*/i, '');

            // ۴) بررسی نهایی: هیچ وابستگی اینترنتی نباید باقی بماند
            log('🔍 بررسی نهایی...');
            scriptRe.lastIndex = 0;
            const leftovers = [...html.matchAll(scriptRe)].map(x => x[2]);
            if (leftovers.length) throw new Error('این کتابخانه‌ها هنوز به اینترنت وابسته‌اند: ' + leftovers.join(' ، '));
            for (const { url } of scripts) {
                if (!html.includes(`/* inlined offline: ${url} */`)) throw new Error(`کتابخانه در خروجی پیدا نشد: ${url}`);
            }
            const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
            return { blob, size: blob.size, count: scripts.length };
        };
        const OfflineBuildCard = () => {
            const [busy, setBusy] = useState(false);
            const [logs, setLogs] = useState([]);
            const [error, setError] = useState('');
            const [result, setResult] = useState(null);
            const log = (msg) => setLogs(prev => [...prev.slice(-40), msg]);
            const run = async () => {
                setBusy(true); setError(''); setLogs([]); setResult(null);
                try {
                    const out = await buildOfflineHtml(log);
                    const url = URL.createObjectURL(out.blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'anbar-yar-offline.html';
                    a.click();
                    setTimeout(() => URL.revokeObjectURL(url), 2000);
                    setResult({ size: out.size, count: out.count, at: new Date().toLocaleString('fa-IR') });
                    log('✅ نسخه‌ی آفلاین ساخته و دانلود شد.');
                } catch (e) {
                    setError(e.message || String(e));
                    log('❌ ساخت انجام نشد.');
                } finally {
                    setBusy(false);
                }
            };
            return (
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                    <div className="flex items-center gap-2 mb-2 font-bold text-slate-800"><Download size={20} className="text-indigo-600"/> ساخت نسخه‌ی آفلاین</div>
                    <p className="text-xs text-slate-500 leading-6 mb-4">نسخه‌ی فعلی برنامه را با همه‌ی کتابخانه‌ها و فونت‌ها داخل یک فایل HTML جاسازی می‌کند. فایل خروجی بدون اینترنت و با دو بار کلیک در هر مرورگری اجرا می‌شود. نیازمندی‌ها خودکار از روی برنامه تشخیص داده می‌شوند.</p>
                    <button onClick={run} disabled={busy} className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 text-white ${busy ? 'bg-slate-400' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
                        <Download size={18}/> {busy ? 'در حال ساخت...' : 'ساخت و دانلود نسخه‌ی آفلاین جدید'}
                    </button>
                    {logs.length > 0 && (
                        <div className="mt-3 bg-slate-50 border border-slate-200 rounded-xl p-3 text-[11px] text-slate-600 leading-6 max-h-40 overflow-y-auto">
                            {logs.map((l, i) => <div key={i}>{l}</div>)}
                        </div>
                    )}
                    {error && (
                        <div className="mt-3 bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-700 leading-6">
                            <b>خطا:</b> {error}
                            <div className="text-[10px] text-red-500 mt-1">اتصال اینترنت را بررسی کن و دوباره تلاش کن. اگر تکرار شد، از فایل build-offline.js با Node.js استفاده کن.</div>
                        </div>
                    )}
                    {result && (
                        <div className="mt-3 bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-800 leading-6">
                            ✅ آخرین ساخت: {result.at} · {result.count} کتابخانه جاسازی شد · حجم: {(result.size / 1024 / 1024).toFixed(2)} MB
                        </div>
                    )}
                </div>
            );
        };

        const SettingsView = ({ settings, onSave }) => {
            const [settingsSec, setSettingsSec] = useState('loading');
            const confirmAction = useConfirm();
            const [costPerTon, setCostPerTon] = useState(String(settings.loadingCostPerTon || 200000));
            const [loadingIncrementKg, setLoadingIncrementKg] = useState(String(settings.loadingWeightIncrementKg ?? 1000));
            const [roundUpThresholdPct, setRoundUpThresholdPct] = useState(String(Math.round((settings.loadingWeightRoundUpThreshold ?? 0.9) * 100)));
            const [loadingMinWeightEnabled, setLoadingMinWeightEnabled] = useState(!!settings.loadingMinWeightEnabled);
            const [loadingMinWeightKg, setLoadingMinWeightKg] = useState(String(settings.loadingMinWeightKg ?? 1000));
            const [lowStockThreshold, setLowStockThreshold] = useState(String(settings.lowStockThreshold ?? 100));
            const [autoLockMinutes, setAutoLockMinutes] = useState(Number(settings.autoLockMinutes ?? 30));
            const [saved, setSaved] = useState(false);
            const costNum = parseInt(costPerTon.replace(/[^0-9]/g, '')) || 0;
            const incrementNum = parseInt(String(loadingIncrementKg).replace(/[^0-9]/g, '')) || 1000;
            const thresholdPctNum = Math.min(100, Math.max(1, parseInt(String(roundUpThresholdPct).replace(/[^0-9]/g, '')) || 90));
            const thresholdRatio = thresholdPctNum / 100;
            const lowStockNum = parseInt(String(lowStockThreshold).replace(/[^0-9]/g, '')) || 0;
            const minWeightNum = parseInt(String(loadingMinWeightKg).replace(/[^0-9]/g, '')) || 0;

            const warehouses = settings.warehouses || [];
            const [newWhName, setNewWhName] = useState('');
            const [newWhColor, setNewWhColor] = useState(WAREHOUSE_COLOR_OPTIONS[0]);
            const [editingWhId, setEditingWhId] = useState(null);
            const [editWhName, setEditWhName] = useState('');
            const [editWhColor, setEditWhColor] = useState('slate');

            const addWarehouse = () => {
                const name = newWhName.trim();
                if (!name) return;
                const wh = { id: generateId(), name, color: newWhColor };
                onSave({ ...settings, warehouses: [...warehouses, wh] });
                setNewWhName(''); setNewWhColor(WAREHOUSE_COLOR_OPTIONS[0]);
            };
            const startEditWarehouse = (wh) => { setEditingWhId(wh.id); setEditWhName(wh.name); setEditWhColor(wh.color || 'slate'); };
            const saveEditWarehouse = () => {
                if (!editWhName.trim()) return;
                onSave({ ...settings, warehouses: warehouses.map(w => w.id === editingWhId ? { ...w, name: editWhName.trim(), color: editWhColor } : w) });
                setEditingWhId(null);
            };
            const deleteWarehouse = async (id) => {
                if (!(await confirmAction('این انبار حذف شود؟ کالاهایی که به این انبار متصل بودند، بدون انبار (نامشخص) می‌شوند.'))) return;
                onSave({ ...settings, warehouses: warehouses.filter(w => w.id !== id) });
            };

            const handleSave = () => {
                onSave({ ...settings, loadingCostPerTon: costNum, loadingWeightIncrementKg: incrementNum, loadingWeightRoundUpThreshold: thresholdRatio, loadingMinWeightEnabled, loadingMinWeightKg: minWeightNum, lowStockThreshold: lowStockNum, autoLockMinutes });
                setSaved(true);
                setTimeout(() => setSaved(false), 2500);
            };

            const previewRows = [
                { w: 250, label: '250 کیلو' },
                { w: 500, label: '500 کیلو' },
                { w: 800, label: '800 کیلو' },
                { w: 1000, label: '1 تن' },
                { w: 1500, label: '1.5 تن' },
                { w: 1900, label: '1.9 تن' },
                { w: 2000, label: '2 تن' },
            ];

            return (
                <div className="max-w-5xl mx-auto space-y-5">
                    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-l from-indigo-700 via-indigo-600 to-indigo-800 text-white p-6 shadow-lg shadow-indigo-900/20">
                        <div className="absolute -left-10 -top-10 w-40 h-40 rounded-full bg-white/10"/>
                        <div className="relative flex items-center gap-4"><div className="bg-white/15 ring-1 ring-white/25 p-3 rounded-2xl"><Settings size={26}/></div><div><h2 className="font-black text-xl">تنظیمات برنامه</h2><p className="text-xs text-indigo-100 mt-1">بارگیری، هشدارها، انبارها، امنیت و ابزارهای سیستم؛ همه در یک‌جا</p></div></div>
                    </div>
                    <div className="flex flex-col md:flex-row gap-5 items-start">
                        <nav className="w-full md:w-56 shrink-0 bg-white rounded-3xl border border-slate-200 shadow-sm p-2 flex md:flex-col gap-1 overflow-x-auto md:sticky md:top-4">
                            {[['loading','هزینه بارگیری',Truck],['alerts','هشدارها',AlertTriangle],['warehouses','انبارها',Warehouse],['security','قفل و امنیت',Lock],['tools','ابزارهای سیستم',Wrench]].map(([id,label,Ic])=>(
                                <button key={id} type="button" onClick={()=>setSettingsSec(id)} className={`flex items-center gap-2.5 px-3.5 py-3 rounded-xl text-sm font-bold whitespace-nowrap border-r-4 transition-all ${settingsSec===id?'bg-indigo-600 text-white shadow-md shadow-indigo-900/20 border-brass-400':'border-transparent text-slate-600 hover:bg-indigo-50 hover:text-indigo-700'}`}><Ic size={17}/>{label}</button>
                            ))}
                        </nav>
                        <div className="flex-1 min-w-0 w-full space-y-5">
                            {settingsSec==='loading' && (<>
                            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                                <div className="flex items-center gap-2 mb-4 text-amber-800 font-bold">
                                    <Truck size={20} className="text-amber-600"/> هزینه بارگیری
                                </div>
                                <div className="mb-4">
                                    <label className="text-sm text-amber-700 font-medium block mb-1.5">نرخ بارگیری به ازای هر تن (تومان)</label>
                                    <div className="relative">
                                        <input type="text" inputMode="numeric" className="w-full p-3 pr-4 pl-24 border-2 border-amber-300 rounded-xl bg-white text-slate-800 font-bold text-lg focus:outline-none focus:border-amber-500 transition"
                                            value={costNum > 0 ? formatNumber(costNum) : ''}
                                            onChange={e => setCostPerTon(e.target.value.replace(/[^0-9]/g, ''))}
                                            placeholder="200,000"
                                        />
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400 font-medium">تومان/تن</span>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3 mb-4">
                                    <div>
                                        <label className="text-sm text-amber-700 font-medium block mb-1.5">واحد گرد کردن وزن</label>
                                        <div className="relative">
                                            <input type="text" inputMode="numeric" className="w-full p-3 pr-4 pl-14 border-2 border-amber-300 rounded-xl bg-white text-slate-800 font-bold focus:outline-none focus:border-amber-500 transition"
                                                value={incrementNum > 0 ? formatNumber(incrementNum) : ''}
                                                onChange={e => setLoadingIncrementKg(e.target.value.replace(/[^0-9]/g, ''))}
                                                placeholder="1000"
                                            />
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-medium">کیلوگرم</span>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-sm text-amber-700 font-medium block mb-1.5">آستانه‌ی نزدیکی برای گرد به بالا</label>
                                        <div className="relative">
                                            <input type="text" inputMode="numeric" className="w-full p-3 pr-4 pl-8 border-2 border-amber-300 rounded-xl bg-white text-slate-800 font-bold focus:outline-none focus:border-amber-500 transition"
                                                value={thresholdPctNum}
                                                onChange={e => setRoundUpThresholdPct(e.target.value.replace(/[^0-9]/g, ''))}
                                                placeholder="90"
                                            />
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-medium">٪</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-white rounded-lg border border-amber-200 p-3 mb-4">
                                    <label className="flex items-center gap-2 cursor-pointer select-none mb-2">
                                        <input type="checkbox" className="accent-amber-600 w-4 h-4" checked={loadingMinWeightEnabled} onChange={e => setLoadingMinWeightEnabled(e.target.checked)} />
                                        <span className="text-sm font-bold text-amber-800">حداقل وزن برای احتساب بارگیری</span>
                                    </label>
                                    <p className="text-[11px] text-amber-600 mb-2">اگر فعال باشد، وقتی وزن کل فاکتور از این مقدار کمتر باشد، اصلاً هزینه‌ی بارگیری محاسبه نمی‌شود (نه این‌که کم حساب شود — کلاً صفر).</p>
                                    <div className="relative">
                                        <input type="text" inputMode="numeric" disabled={!loadingMinWeightEnabled} className="w-full p-3 pr-4 pl-16 border-2 border-amber-300 rounded-xl bg-white text-slate-800 font-bold focus:outline-none focus:border-amber-500 transition disabled:bg-slate-50 disabled:text-slate-400"
                                            value={minWeightNum > 0 ? formatNumber(minWeightNum) : ''}
                                            onChange={e => setLoadingMinWeightKg(e.target.value.replace(/[^0-9]/g, ''))}
                                            placeholder="1,000"
                                        />
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-medium">کیلوگرم</span>
                                    </div>
                                </div>
                                <div className="bg-white rounded-lg border border-amber-100 overflow-hidden mb-4">
                                    <div className="bg-amber-100/50 px-3 py-2 text-xs text-amber-700 font-bold border-b border-amber-100">پیش‌نمایش محاسبه (بر اساس مقادیر بالا)</div>
                                    <table className="w-full text-xs text-right">
                                        <thead><tr className="bg-slate-50 text-slate-500"><th className="p-2">وزن بار</th><th className="p-2 text-center">وزن گرد‌شده</th><th className="p-2 text-left">هزینه بارگیری</th></tr></thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {previewRows.map(({ w, label }) => (
                                                <tr key={w} className="hover:bg-slate-50">
                                                    <td className="p-2 font-medium text-slate-700">{label}</td>
                                                    <td className="p-2 text-center text-slate-500">{formatNumber(roundWeightToIncrement(w, incrementNum, thresholdRatio))} kg</td>
                                                    <td className="p-2 text-left font-bold text-amber-700">{formatNumber(calculateLoadingCost(w, costNum, incrementNum, thresholdRatio, loadingMinWeightEnabled ? minWeightNum : 0))} تومان{loadingMinWeightEnabled && w < minWeightNum && <span className="text-[9px] text-slate-400 font-normal mr-1">(زیر آستانه)</span>}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="bg-amber-100/70 rounded-lg p-3 border border-amber-200 text-xs text-amber-700">
                                    <p className="font-bold mb-1">قانون گرد کردن وزن:</p>
                                    <p>وزن ابتدا به پایین‌ترین «واحد گرد کردن» کامل (اینجا {formatNumber(incrementNum)} کیلو) گرد می‌شود؛ فقط اگر باقیمانده حداقل {thresholdPctNum}٪ یک واحد کامل باشد، یک واحد اضافه به بالا گرد می‌شود.</p>
                                    <p className="mt-1 opacity-80">مثال با تنظیمات فعلی: {formatNumber(800)}→{formatNumber(roundWeightToIncrement(800, incrementNum, thresholdRatio))} کیلو | {formatNumber(1500)}→{formatNumber(roundWeightToIncrement(1500, incrementNum, thresholdRatio))} کیلو</p>
                                </div>
                                <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 text-xs text-indigo-800">
                                    <p className="font-bold mb-1 flex items-center gap-1.5"><Info size={13} className="text-indigo-500"/> قانون تغییر نرخ بارگیری:</p>
                                    <p>• فاکتورهای <strong>تکمیل‌شده</strong>: نرخ زمان صدور برای همیشه ثابت می‌ماند</p>
                                    <p className="mt-0.5">• فاکتورهای <strong>رزرو / در انتظار</strong>: از نرخ جدید محاسبه می‌شوند (هنوز تایید نشده)</p>
                                    <p className="mt-0.5">• فاکتورهای <strong>جدید</strong>: از نرخ جاری استفاده می‌کنند</p>
                                </div>
                            </div>
                            </>)}
                            {settingsSec==='alerts' && (<>
                            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                                <div className="flex items-center gap-2 mb-4 text-orange-800 font-bold">
                                    <AlertTriangle size={20} className="text-orange-600"/> آستانه هشدار موجودی کم
                                </div>
                                <div className="mb-2">
                                    <label className="text-sm text-orange-700 font-medium block mb-1.5">از چه مقداری کمتر شود، به‌عنوان «موجودی کم» هشدار داده شود؟</label>
                                    <div className="relative">
                                        <input type="text" inputMode="numeric" className="w-full p-3 pr-4 pl-16 border-2 border-orange-300 rounded-xl bg-white text-slate-800 font-bold text-lg focus:outline-none focus:border-orange-500 transition"
                                            value={lowStockNum > 0 ? formatNumber(lowStockNum) : lowStockThreshold}
                                            onChange={e => setLowStockThreshold(e.target.value.replace(/[^0-9]/g, ''))}
                                            placeholder="100"
                                        />
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400 font-medium">واحد کالا</span>
                                    </div>
                                </div>
                                <p className="text-xs text-orange-700 bg-orange-100/70 rounded-lg p-3 border border-orange-200">
                                    این عدد <strong>آستانه عمومی</strong> است و برای همه کالاهایی استفاده می‌شود که شخصی‌سازی نشده‌اند. برای هر کالا از «ویرایش کالا» می‌توانید آستانه اختصاصی تعیین کنید؛ مثلاً زردچوبه سابیده را بر اساس وزن روی ۲۰۰۰ کیلوگرم (۲ تن) بگذارید و بقیه کالاها همچنان از عدد عمومی استفاده کنند.
                                </p>
                            </div>
                            <div className="bg-red-50 border border-red-200 rounded-3xl p-6">
                                <div className="flex items-center gap-2 text-red-800 font-bold mb-2"><AlertTriangle size={20} className="text-red-600"/> مدیریت هشدارهای بحرانی</div>
                                <p className="text-xs text-red-700 leading-6">Mute فقط اعلان را خاموش می‌کند؛ موجودی واقعی تغییر نمی‌کند. موارد Mute شده دیگر عدد هشدار فعال سایدبار را بالا نمی‌برند و هر زمان خواستی از صفحه بارهای بحرانی Unmute می‌شوند.</p>
                            </div>
                            </>)}
                            {settingsSec==='warehouses' && (<>
                            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                                <div className="flex items-center gap-2 mb-4 text-indigo-800 font-bold">
                                    <Warehouse size={20} className="text-indigo-600"/> مدیریت انبارها
                                </div>
                                <p className="text-xs text-indigo-700 bg-indigo-100/70 rounded-lg p-3 border border-indigo-200 mb-4">
                                    انبارهای فیزیکی خود را اینجا تعریف کنید (مثلاً «انبار مرکزی»، «انبار شعبه ۲»). بعد از تعریف، می‌توانید هنگام افزودن/ویرایش هر کالا مشخص کنید در کدام انبار قرار دارد.
                                </p>
                                <div className="space-y-2 mb-4">
                                    {warehouses.length === 0 && <div className="text-center text-slate-400 text-xs py-4">هنوز انباری تعریف نشده</div>}
                                    {warehouses.map(wh => (
                                        <div key={wh.id} className="bg-white border border-slate-200 rounded-lg p-2.5">
                                            {editingWhId === wh.id ? (
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <input className="flex-1 min-w-[120px] p-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-500" value={editWhName} onChange={e => setEditWhName(e.target.value)} autoFocus/>
                                                    <select className="p-2 border border-slate-200 rounded-lg text-sm outline-none bg-white" value={editWhColor} onChange={e => setEditWhColor(e.target.value)}>
                                                        {WAREHOUSE_COLOR_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                                                    </select>
                                                    <button onClick={saveEditWarehouse} className="px-3 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition">ذخیره</button>
                                                    <button onClick={() => setEditingWhId(null)} className="px-3 py-2 bg-slate-100 text-slate-500 rounded-lg text-xs font-bold hover:bg-slate-200 transition">انصراف</button>
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-between gap-2">
                                                    <WarehouseBadge warehouse={wh} size="md"/>
                                                    <div className="flex items-center gap-1">
                                                        <button onClick={() => startEditWarehouse(wh)} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"><Edit3 size={15}/></button>
                                                        <button onClick={() => deleteWarehouse(wh.id)} className="w-8 h-8 flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition"><Trash2 size={15}/></button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                                <div className="flex flex-wrap items-center gap-2 bg-white border border-dashed border-indigo-200 rounded-lg p-2.5">
                                    <input className="flex-1 min-w-[140px] p-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-500" placeholder="نام انبار جدید" value={newWhName} onChange={e => setNewWhName(e.target.value)} onKeyDown={e => e.key === 'Enter' && addWarehouse()}/>
                                    <select className="p-2 border border-slate-200 rounded-lg text-sm outline-none bg-white" value={newWhColor} onChange={e => setNewWhColor(e.target.value)}>
                                        {WAREHOUSE_COLOR_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                    <button onClick={addWarehouse} className="px-3.5 py-2 bg-indigo-600 text-white rounded-full text-xs font-bold hover:bg-indigo-700 transition flex items-center gap-1"><Plus size={14}/> افزودن انبار</button>
                                </div>
                            </div>
                            </>)}
                            {settingsSec==='security' && (<>
                            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                                <div className="flex items-center gap-2 mb-3 text-violet-800 font-bold"><Lock size={20} className="text-violet-600"/> قفل خودکار و حفظ ورود</div>
                                <p className="text-xs text-violet-700 leading-6 mb-3">پس از ورود رمز، تا پایان این بازه با Refresh دوباره رمز درخواست نمی‌شود. با قفل دستی یا پایان زمان، دوباره رمز لازم است.</p>
                                <select value={autoLockMinutes} onChange={e=>setAutoLockMinutes(Number(e.target.value))} className="w-full p-3 border-2 border-violet-200 rounded-xl bg-white text-sm font-bold"><option value={5}>۵ دقیقه</option><option value={10}>۱۰ دقیقه</option><option value={15}>۱۵ دقیقه</option><option value={30}>۳۰ دقیقه</option><option value={60}>۱ ساعت</option><option value={120}>۲ ساعت</option><option value={240}>۴ ساعت</option><option value={360}>۶ ساعت</option><option value={480}>۸ ساعت</option><option value={720}>۱۲ ساعت</option><option value={1440}>۲۴ ساعت</option><option value={0}>دستی — قفل خودکار خاموش</option></select>
                            </div>
                            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 text-white">
                                <div className="flex items-center gap-2 mb-2 font-bold"><ShieldCheck size={20} className="text-indigo-300"/> امنیت و پشتیبان‌گیری محلی</div>
                                <p className="text-xs text-slate-300 leading-6 mb-4">اطلاعات برنامه روی همین دستگاه به‌صورت امن نگهداری می‌شود. برای مدیریت رمز، قفل خودکار و امنیت برنامه از دکمه زیر استفاده کن.</p>
                                <button onClick={()=>window.dispatchEvent(new Event('anbaryar:open-security'))} className="w-full py-2.5 rounded-full bg-white text-slate-800 font-bold text-xs flex items-center justify-center gap-2 hover:bg-slate-100 transition"><ShieldCheck size={15}/> تنظیمات امنیت و قفل</button>
                            </div>
                            </>)}
                            {settingsSec==='tools' && (<>
                            <OfflineBuildCard />
                            </>)}
                            <button onClick={handleSave} className={`w-full sticky bottom-3 z-10 py-3.5 rounded-full font-bold text-base flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 ${saved ? 'bg-emerald-500 text-white shadow-emerald-900/20' : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-900/20'}`}>
                                {saved ? <><CheckCircle size={20}/> تنظیمات ذخیره شد!</> : <><Save size={20}/> ذخیره تنظیمات</>}
                            </button>
                        </div>
                    </div>
                </div>
            );
        };

