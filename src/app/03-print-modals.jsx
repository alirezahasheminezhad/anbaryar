//## ═══ app/03-print-modals.jsx ═══
//## چاپ/خروجی فاکتور (PrintInvoiceModal) و چاپ عمومی خرید/پردازش (PrintOrderModal).
//## ترتیب فایل‌ها در build.py مهم است؛ همه‌ی بخش‌ها یک scope مشترک دارند.
        // --- Print Invoice Component ---
        const PrintInvoiceModal = ({ invoice, settings, inventoryItems, onClose }) => {
            const dialogRef = useDialogA11y(onClose);
            if (!invoice) return null;
            const toast = useToast();
            // حالت اسکرین‌شات/چاپِ «فقط باقی‌مانده»: فقط یک فیلترِ نمایشی روی همین پیش‌نمایش است؛ ردیف‌هایی که
            // کاملاً «رفته‌اند» موقتاً پنهان می‌شوند تا بشود تمیز برای مشتری پرینت گرفت یا اسکرین‌شات گرفت.
            const [screenshotMode, setScreenshotMode] = useState(false);
            const totalWeight = invoice.items.reduce((sum, item) => sum + getItemEffectiveWeight(item), 0);
            const effectiveCostPerTon = invoice.snapshotLoadingCostPerTon !== undefined ? invoice.snapshotLoadingCostPerTon : (settings || {}).loadingCostPerTon || 0;
            const s = { loadingCostPerTon: effectiveCostPerTon };
            const loadingIncrementKg = (settings || {}).loadingWeightIncrementKg ?? 1000;
            const loadingRoundUpThreshold = (settings || {}).loadingWeightRoundUpThreshold ?? 0.9;
            const loadingMinWeightKg = (settings || {}).loadingMinWeightEnabled ? ((settings || {}).loadingMinWeightKg || 0) : 0;
            const roundedWeight = roundWeightToIncrement(totalWeight, loadingIncrementKg, loadingRoundUpThreshold);
            // اگر تیک «محاسبه هزینه بارگیری در فاکتور» زده شده، مقدار همان است که هنگام صدور فاکتور ثبت/فریز شده
            // در غیر این صورت مثل قبل فقط جنبه اطلاعاتی (پاورقی) دارد و جزو مبلغ فاکتور نیست
            const loadingCost = invoice.includeLoadingCost ? (invoice.loadingCostAmount || 0) : calculateLoadingCost(totalWeight, s.loadingCostPerTon, loadingIncrementKg, loadingRoundUpThreshold, loadingMinWeightKg);
            // رفع ناسازگاری: قبلاً اینجا مبلغِ اقلام بدون احتساب وزن/قیمتِ واقعیِ ارسال‌های بخشی (it.shipments) محاسبه
            // می‌شد و می‌توانست با مبلغِ واقعیِ فاکتور (که از همان موتور getItemEffectiveTotal ساخته می‌شود) فرق کند.
            // حالا هر دو از یک موتور محاسباتی مشترک استفاده می‌کنند تا مبلغ در پرینت و در بقیه‌ی گزارش‌ها یکسان بماند.
            const itemsSubtotal = invoice.items.reduce((sum, item) => sum + getItemEffectiveTotal(item), 0);

            const enrichedItems = invoice.items.map(it => {
                if (it.isManual) return it;
                if (it.deductionPerBag || it.bagWeight) return it;
                const invItem = inventoryItems && inventoryItems.find(i => i.id === it.itemId);
                if (invItem && (invItem.deductionPerBag || invItem.bagWeight)) {
                    return { ...it, deductionPerBag: invItem.deductionPerBag || null, deductionDate: invItem.deductionDate || null, bagWeight: invItem.bagWeight || null };
                }
                return it;
            });

            const paperRef = useRef(null);
            const [downloadingJpeg, setDownloadingJpeg] = useState(false);
            const [downloadingPng, setDownloadingPng] = useState(false);
            const [downloadingBw, setDownloadingBw] = useState(false); const [pdfFileName, setPdfFileName] = useState(`فاکتور-${invoice.customer || 'مشتری'}-${invoice.id.slice(-6)}`);
            const [showFieldOptions, setShowFieldOptions] = useState(false);
            // سایز کاغذ چاپ: چون ارتفاع واقعی کاغذ در لحظه‌ی چاپ از مرورگر به‌طور قابل‌اعتماد قابل خواندن نیست،
            // از کاربر می‌پرسیم (و برای دفعات بعد به خاطر می‌سپاریم) تا محاسبه‌ی «جا کردن در یک برگه» دقیق باشد.
            const [paperSize, setPaperSizeState] = useState(() => { try { return localStorage.getItem('invoicePrintPaperSize') || 'A4'; } catch (e) { return 'A4'; } });
            const setPaperSize = (v) => { setPaperSizeState(v); try { localStorage.setItem('invoicePrintPaperSize', v); } catch (e) {} };
            // گزینه‌های نمایش/مخفی‌سازی هنگام چاپ یا دانلود عکس (JPEG/PNG) — فقط همین سه مورد قابل تنظیم است؛
            // بقیه‌ی بخش‌ها (توضیحات، تاریخچه تغییر تاریخ/علت، امضاء) همیشه طبق حالت پیش‌فرض نمایش داده می‌شوند.
            const [fields, setFields] = useState({
                itemDetails: true,
                loadingCostFootnote: true,
                deductionFootnote: true,
                description: true,
                dateChangeLog: true,
                changeReasonLog: true,
                signatures: true,
                notices: true,
                sourceInfo: true,
                shipmentProgress: false,
            });
            const toggleField = (key) => setFields(f => ({ ...f, [key]: !f[key] }));

            const buildFileName = (ext) => `فاکتور-${(invoice.customer || 'invoice').replace(/[^\wآ-ی۰-۹ ]/g, '')}-${invoice.id.slice(-6)}.${ext}`;

            const doPrint = () => printElementInNewWindow(paperRef.current, `فاکتور - ${pdfFileName.trim() || invoice.customer || 'مشتری'}`, paperSize);
            // رفع اصلیِ باگ ناهم‌ترازیِ خروجی PDF: به‌جای عکس‌گرفتن از صفحه (html2canvas) که فونت/فاصله‌ی خط را
            // گاهی اشتباه محاسبه می‌کرد، از همان مسیر «چاپ» که خودِ کاربر تایید کرده دقیق است استفاده می‌شود —
            // پنجره‌ی چاپِ مرورگر باز می‌شود و کاربر فقط کافی‌ست مقصد را روی «Save as PDF» بگذارد؛ نتیجه یک
            // PDF واقعی با متنِ قابل‌انتخاب و کاملاً هم‌تراز است، نه یک تصویرِ رسم‌شده.
            const savePdf = () => { toast.show('در پنجره‌ی چاپ که باز می‌شود، مقصد چاپگر را روی «Save as PDF» بگذارید.'); printElementInNewWindow(paperRef.current, `فاکتور - ${pdfFileName.trim() || invoice.customer || 'مشتری'}`, paperSize); };

            const downloadImage = async (format) => {
                if (!paperRef.current || !window.html2canvas) return;
                const setBusy = format === 'png' ? setDownloadingPng : format === 'bw' ? setDownloadingBw : setDownloadingJpeg;
                setBusy(true);
                try {
                    let canvas = await renderElementToCanvas(paperRef.current, 794);
                    if (format === 'bw') canvas = canvasToBlackAndWhite(canvas);
                    const link = document.createElement('a');
                    const baseName = (pdfFileName || `فاکتور-${invoice.customer || 'مشتری'}-${invoice.id.slice(-6)}`).replace(/[\\/:*?"<>|]/g,'-').trim();
                    link.download = `${baseName}.${format === 'jpeg' ? 'jpg' : 'png'}`;
                    link.href = format === 'jpeg' ? canvas.toDataURL('image/jpeg',0.95) : canvas.toDataURL('image/png');
                    document.body.appendChild(link); link.click(); link.remove();
                } catch (err) { console.error('Invoice image export failed',err); toast.show('ساخت خروجی تصویر انجام نشد. لطفاً دوباره تلاش کنید.'); }
                finally { setBusy(false); }
            };
            const downloadJpeg = () => downloadImage('jpeg');
            const downloadPng = () => downloadImage('png');
            const downloadBw = () => downloadImage('bw');

            const FIELD_LABELS = [
                { key: 'description', label: '📝 توضیحات فاکتور' },
                { key: 'itemDetails', label: 'جزئیات ردیف‌های کالا (وزن/تگ/کسری)' },
                { key: 'loadingCostFootnote', label: '🚛 یادداشت هزینه بارگیری (پاورقی)' },
                { key: 'deductionFootnote', label: '📦 اطلاعات کسری و بسته‌بندی (پاورقی)' },
                { key: 'sourceInfo', label: '🛒 اطلاعات خرید از تامین‌کننده (پاورقی) — برای مشتری خاموش نگه دارید' },
                { key: 'notices', label: '⚠️ نمایش پیام‌های توجه' },
                { key: 'changeReasonLog', label: '✎ تاریخچه ویرایش و علت تغییر (پاورقی)' },
                { key: 'dateChangeLog', label: '🗓 تاریخچه تغییر تاریخ فاکتور (پاورقی)' },
                { key: 'shipmentProgress', label: '🚚 مقدار رفته/باقی‌مانده هر ردیف — برای مشتری خاموش نگه دارید' },
            ];

            return (
                <div className="print-modal-backdrop fixed inset-0 bg-slate-950/70 backdrop-blur-md z-[9998] flex items-center justify-center p-3 sm:p-6">
                    <div ref={dialogRef} className="print-modal-panel bg-slate-100 rounded-3xl w-full max-w-6xl overflow-hidden shadow-2xl ring-1 ring-white/10 flex flex-col max-h-[94vh]" onClick={e => e.stopPropagation()}>
                        <div className="no-print bg-white border-b border-slate-200 px-5 sm:px-6 pt-2.5 pb-2.5 flex flex-col gap-2 shrink-0">
                            <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2.5 min-w-0">
                                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white flex items-center justify-center shadow-lg shadow-indigo-900/20 shrink-0"><Printer size={16}/></div>
                                    <div className="min-w-0">
                                        <h3 className="font-black text-slate-900 text-sm leading-tight">پیش‌نمایش چاپ فاکتور</h3>
                                        <div className="text-[10px] text-slate-400 mt-0.5 truncate">{invoice.customer} · {invoice.date} · {formatNumber(enrichedItems.length)} قلم</div>
                                    </div>
                                </div>
                                <button onClick={onClose} className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition shrink-0" title="بستن"><X size={16}/></button>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 h-9 flex-1 min-w-[180px] max-w-sm focus-within:border-indigo-400 focus-within:ring-4 focus-within:ring-indigo-100 transition"><FileText size={14} className="text-slate-400 shrink-0"/><input value={pdfFileName} onChange={e=>setPdfFileName(e.target.value)} className="w-full bg-transparent text-xs font-bold text-slate-700 outline-none" placeholder="نام فایل PDF"/></div>
                                {invoice.status === 'pending' && invoice.items.length > 0 && (
                                    <label className={`flex items-center gap-2 px-3 h-9 rounded-xl font-bold text-xs border cursor-pointer transition select-none ${screenshotMode ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-900/20' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>
                                        <input type="checkbox" className="accent-white w-4 h-4" checked={screenshotMode} onChange={e => setScreenshotMode(e.target.checked)} />
                                        🖼️ فقط باقی‌مانده
                                    </label>
                                )}
                                <button onClick={() => setShowFieldOptions(v => !v)} className={`flex items-center gap-2 px-3 h-9 rounded-xl font-bold text-xs border transition ${showFieldOptions ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}><Settings size={14}/> نمایش اطلاعات</button>
                                <div className="flex items-center gap-0.5 bg-slate-100 border border-slate-200 rounded-xl p-1 h-9" title="سایز کاغذ چاپگر — برای جا شدن دقیق فاکتور در یک برگه">
                                    {['A4','A5'].map(sz => (
                                        <button key={sz} type="button" onClick={() => setPaperSize(sz)} className={`h-7 px-3 rounded-lg text-xs font-bold transition ${paperSize === sz ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:bg-white'}`}>{sz}</button>
                                    ))}
                                </div>
                                <div className="flex-1 hidden lg:block"></div>
                                <div className="flex items-center gap-0.5 bg-slate-100 border border-slate-200 rounded-xl p-1 h-9" title="دانلود خروجی به‌صورت تصویر">
                                    <span className="text-[10px] font-bold text-slate-400 px-2 flex items-center gap-1"><ImageIcon size={12}/> تصویر</span>
                                    <button onClick={downloadJpeg} disabled={downloadingJpeg} className="h-7 px-2.5 rounded-lg bg-white text-emerald-700 font-bold text-xs shadow-sm hover:bg-emerald-50 transition disabled:opacity-60">{downloadingJpeg ? 'در حال ساخت...' : 'JPEG'}</button>
                                    <button onClick={downloadPng} disabled={downloadingPng} className="h-7 px-2.5 rounded-lg bg-white text-orange-600 font-bold text-xs shadow-sm hover:bg-orange-50 transition disabled:opacity-60">{downloadingPng ? 'در حال ساخت...' : 'PNG'}</button>
                                    <button onClick={downloadBw} disabled={downloadingBw} title="مناسب چاپگرهای غیررنگی — پس‌زمینه سفید و متن مشکی تمیز" className="h-7 px-2.5 rounded-lg bg-white text-slate-700 font-bold text-xs shadow-sm hover:bg-slate-50 transition disabled:opacity-60">{downloadingBw ? 'در حال ساخت...' : 'سیاه‌وسفید'}</button>
                                </div>
                                <button onClick={savePdf} title="پنجره‌ی چاپ باز می‌شود؛ مقصد را روی Save as PDF بگذارید تا یک PDF دقیق و متن‌دار بگیرید" className="flex items-center gap-2 h-9 px-4 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-black transition shadow-md"><Download size={14}/> ذخیره PDF</button>
                                <button onClick={doPrint} className="flex items-center gap-2 h-9 px-5 rounded-xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 transition shadow-lg shadow-indigo-900/20 active:scale-95"><Printer size={14}/> چاپ فاکتور</button>
                            </div>
                            {showFieldOptions && (
                                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-2.5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                                    {FIELD_LABELS.map(f => (
                                        <label key={f.key} className={`flex items-center gap-2 text-[11px] font-medium rounded-xl px-2.5 py-1.5 cursor-pointer transition border ${fields[f.key] ? 'bg-indigo-50 border-indigo-200 text-indigo-800' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                                            <input type="checkbox" checked={fields[f.key]} onChange={() => toggleField(f.key)} className="accent-indigo-600 w-3.5 h-3.5 shrink-0" />
                                            {f.label}
                                        </label>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="flex-1 min-h-0 overflow-auto p-3 sm:p-4" style={{background:'repeating-linear-gradient(135deg,#e2e8f0 0,#e2e8f0 1px,#e9eef5 1px,#e9eef5 12px)'}} id="print-area">
                            <div className="mx-auto w-fit max-w-full rounded-lg shadow-[0_20px_50px_-12px_rgba(15,23,42,0.35)] ring-1 ring-slate-300/60 overflow-hidden bg-white">
                            {/* Invoice printable content */}
                            <div ref={paperRef} className="invoice-paper print-invoice bg-white" style={{fontFamily:"'Vazirmatn', sans-serif", direction:'rtl', padding:'26px 30px 22px'}}>
                                {/* Header: برند + عنوان */}
                                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:'16px',paddingBottom:'14px'}}>
                                    <div style={{textAlign:'right'}}>
                                        <div style={{fontSize:'22px',fontWeight:900,color:'#1e293b',lineHeight:1.3,letterSpacing:'-0.3px'}}>فاکتور فروش</div>
                                        {invoice.status === 'pending' && <div style={{display:'inline-block',background:'#fef3c7',color:'#92400e',padding:'1px 9px',borderRadius:'20px',fontSize:'9px',fontWeight:700,border:'1px solid #fde68a',marginTop:'3px'}}>⏳ رزرو / در انتظار تأیید</div>}
                                    </div>
                                    <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
                                        <div style={{width:'42px',height:'42px',borderRadius:'12px',background:'linear-gradient(135deg,#6366f1,#3730a3)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 8l-9-5-9 5v8l9 5 9-5V8z"/><path d="M3.3 7.5L12 12.5l8.7-5"/><path d="M12 22V12.5"/></svg>
                                        </div>
                                        <div>
                                            <div style={{fontSize:'15px',fontWeight:900,color:'#1e1b4b',lineHeight:1.3}}>انبار یار</div>
                                            <div style={{fontSize:'9px',color:'#94a3b8',fontWeight:600,lineHeight:1.4}}>مدیریت هوشمند موجودی</div>
                                        </div>
                                    </div>
                                </div>
                                <div style={{height:'3px',borderRadius:'3px',background:'linear-gradient(90deg,#3730a3,#6366f1 55%,#c7d2fe)',marginBottom:'14px'}}></div>
                                {/* Meta strip: شماره و تاریخ */}
                                <div style={{display:'flex',gap:'10px',marginBottom:'12px'}}>
                                    <div style={{flex:1,background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:'10px',padding:'7px 12px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                                        <span style={{fontSize:'9.5px',color:'#94a3b8',fontWeight:600}}>شماره فاکتور</span>
                                        <span style={{fontSize:'11px',fontWeight:800,color:'#334155',fontFamily:'monospace',direction:'ltr'}}># {invoice.id.split('-')[2] || invoice.id.slice(-8)}</span>
                                    </div>
                                    <div style={{flex:1,background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:'10px',padding:'7px 12px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                                        <span style={{fontSize:'9.5px',color:'#94a3b8',fontWeight:600}}>تاریخ صدور</span>
                                        <span style={{fontSize:'11px',fontWeight:800,color:'#334155'}}>{invoice.date}</span>
                                    </div>
                                </div>
                                {/* Customer info + Important notices */}
                                {(() => {
                                    const hasNotices = fields.notices && invoice.notices && invoice.notices.length > 0;
                                    return (
                                        <div style={{display:'grid',gridTemplateColumns: hasNotices ? '1fr 1fr' : '1fr',gap:'10px',marginBottom:'14px',alignItems:'stretch'}}>
                                            <div style={{background:'#ffffff',borderRadius:'10px',padding:'9px 13px',border:'1px solid #e2e8f0',borderRight:'4px solid #4f46e5'}}>
                                                <span style={{color:'#94a3b8',fontSize:'9px',fontWeight:700}}>مشتری</span>
                                                <div style={{fontWeight:900,fontSize:'14px',color:'#1e293b',marginTop:'2px',lineHeight:1.5}}>{invoice.customer}</div>
                                                {invoice.settlementTerm && (
                                                    <div style={{marginTop:'5px',color:'#4f46e5',fontSize:'10px',fontWeight:700}}>💳 مهلت تسویه: <span style={{color:'#334155'}}>{invoice.settlementTerm}</span></div>
                                                )}
                                                {invoice.dueDate && (
                                                    <div style={{marginTop:'2px',color:'#4f46e5',fontSize:'10px',fontWeight:700}}>📅 سررسید: <span style={{color:'#334155'}}>{formatJalali(invoice.dueDate)}</span></div>
                                                )}
                                                {fields.description && invoice.description && (
                                                    <div style={{marginTop:'6px',paddingTop:'6px',borderTop:'1px dashed #e2e8f0'}}>
                                                        <span style={{color:'#94a3b8',fontSize:'9px',fontWeight:700}}>توضیحات</span>
                                                        <div style={{fontSize:'10px',color:'#475569',marginTop:'2px',lineHeight:1.8}}>{invoice.description}</div>
                                                    </div>
                                                )}
                                            </div>
                                            {hasNotices && (
                                                <div style={{background:'#fffbeb',border:'1px solid #fcd34d',borderRadius:'10px',padding:'9px 13px'}}>
                                                    <div style={{fontWeight:900,color:'#92400e',fontSize:'11px',marginBottom:'4px'}}>⚠️ توجه</div>
                                                    <ul style={{margin:0,paddingRight:'14px',fontSize:'9.5px',fontWeight:700,color:'#78350f',lineHeight:'1.8'}}>
                                                        {invoice.notices.map((n, i) => <li key={i}>{n}</li>)}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })()}
                                {/* Items table */}
                                <div style={{border:'1px solid #e2e8f0',borderRadius:'10px',overflow:'hidden',marginBottom:'14px'}}>
                                <table style={{width:'100%',borderCollapse:'collapse',fontSize:'10.5px',tableLayout:'fixed'}}>
                                    <thead>
                                        <tr style={{background:'#312e81'}}>
                                            <th style={{width:'6%',padding:'8px 8px',textAlign:'center',fontWeight:700,color:'#e0e7ff',fontSize:'10px'}}>ردیف</th>
                                            <th style={{width:'36%',padding:'8px 10px',textAlign:'right',fontWeight:700,color:'#ffffff',fontSize:'10px'}}>شرح کالا</th>
                                            <th style={{width:'10%',padding:'8px 8px',textAlign:'center',fontWeight:700,color:'#ffffff',fontSize:'10px'}}>تعداد</th>
                                            <th style={{width:'13%',padding:'8px 8px',textAlign:'center',fontWeight:700,color:'#ffffff',fontSize:'10px'}}>وزن (Kg)</th>
                                            <th style={{width:'16%',padding:'8px 8px',textAlign:'center',fontWeight:700,color:'#ffffff',fontSize:'10px'}}>قیمت (تومان)</th>
                                            <th style={{width:'19%',padding:'8px 10px',textAlign:'left',fontWeight:700,color:'#ffffff',fontSize:'10px'}}>جمع کل (تومان)</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {enrichedItems.map((item, idx) => {
                                            const shippable = invoice.status === 'pending';
                                            const shipped = Number(item.shippedQty) || 0;
                                            const remaining = (Number(item.qty) || 0) - shipped;
                                            const fullyGone = shippable && remaining <= 0.0001 && shipped > 0;
                                            if (screenshotMode && fullyGone) return null;
                                            return (
                                            <tr key={idx} style={{background: idx%2===0?'#ffffff':'#f8fafc'}}>
                                                <td style={{padding:'9px 8px',borderBottom:'1px solid #eef2f7',color:'#94a3b8',textAlign:'center',fontWeight:700}}>{idx+1}</td>
                                                <td style={{padding:'9px 10px',borderBottom:'1px solid #eef2f7',textAlign:'right'}}>
                                                    {(() => {
                                                        const { name, note } = resolveItemDisplay(item, inventoryItems, invoice.status === 'pending');
                                                        return (<div style={{fontWeight:800,color:'#1e293b',fontSize:'11px'}}>{name}{note && <span style={{fontSize:'8px',color:'#b45309',background:'#fffbeb',border:'1px solid #fde68a',borderRadius:'4px',padding:'0 4px',marginRight:'4px'}}>{note}</span>}</div>);
                                                    })()}
                                                    {fields.itemDetails && item.brand && item.brand !== 'متفرقه' && <div style={{fontSize:'9px',color:'#6366f1',fontWeight:600}}>{item.brand}</div>}
                                                    {fields.itemDetails && <div style={{fontSize:'9px',color:'#94a3b8'}}>{item.tag}</div>}
                                                    {fields.shipmentProgress && shippable && shipped > 0 && (
                                                        <div style={{marginTop:'2px',display:'flex',gap:'4px',flexWrap:'wrap'}}>
                                                            <span style={{fontSize:'8px',fontWeight:700,color:'#047857',background:'#d1fae5',border:'1px solid #a7f3d0',borderRadius:'10px',padding:'0 6px'}}>✅ رفته: {formatNumber(shipped)}</span>
                                                            {remaining > 0.0001 && <span style={{fontSize:'8px',fontWeight:700,color:'#92400e',background:'#fef3c7',border:'1px solid #fde68a',borderRadius:'10px',padding:'0 6px'}}>⏳ باقی‌مانده: {formatNumber(remaining)}</span>}
                                                        </div>
                                                    )}
                                                    {fields.shipmentProgress && item.shipments && item.shipments.length > 0 && (
                                                        <div style={{marginTop:'2px'}}>
                                                            {item.shipments.map((sh, sIdx) => (
                                                                <div key={sh.id || sIdx} style={{fontSize:'7.5px',color:'#94a3b8'}}>
                                                                    محموله {sIdx + 1} — {sh.date}: {formatNumber(sh.qty)} عدد، {formatNumber(sh.weight)} کیلو، فی {formatNumber(sh.price)}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </td>
                                                <td style={{padding:'9px 8px',borderBottom:'1px solid #eef2f7',textAlign:'center',fontWeight:700,color:'#334155'}}>{item.qty}</td>
                                                <td style={{padding:'9px 8px',borderBottom:'1px solid #eef2f7',textAlign:'center',fontWeight:800,color:'#4338ca'}}>{item.weight}</td>
                                                <td style={{padding:'9px 8px',borderBottom:'1px solid #eef2f7',textAlign:'center',color:'#475569',fontWeight:600}}>{formatNumber(item.price)}</td>
                                                <td style={{padding:'9px 10px',borderBottom:'1px solid #eef2f7',textAlign:'left',fontWeight:900,color:'#047857'}}>{formatNumber(getItemEffectiveTotal(item))}</td>
                                            </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                                </div>
                                {/* Totals: یک کارت واحد — وزن/اقلام/بارگیری بالا، مبلغ به حروف و جمع کل در یک ردیف پایین، بدون باکس جداگانه */}
                                <div style={{borderRadius:'10px',border:'1px solid #e2e8f0',overflow:'hidden',marginBottom:'10px'}}>
                                    <div style={{display:'flex',flexWrap:'wrap',gap:'4px 16px',padding:'7px 13px',background:'#f8fafc',fontSize:'10px',color:'#64748b'}}>
                                        <span>وزن کل: <strong style={{color:'#334155'}}>{formatNumber(totalWeight)} کیلوگرم</strong></span>
                                        {invoice.includeLoadingCost && loadingCost > 0 && (<>
                                            <span>جمع اقلام: <strong style={{color:'#334155'}}>{formatNumber(itemsSubtotal)} تومان</strong></span>
                                            <span style={{color:'#b45309'}}>🚛 بارگیری: <strong>{formatNumber(loadingCost)} تومان</strong></span>
                                        </>)}
                                        {screenshotMode && <span style={{color:'#b45309'}}>* ردیف‌های ارسال‌شده در این نما مخفی‌اند؛ مبلغ/وزن مربوط به کل فاکتور است.</span>}
                                    </div>
                                    <div style={{display:'flex',flexWrap:'wrap',justifyContent:'space-between',alignItems:'center',gap:'6px 14px',padding:'8px 13px',background:'linear-gradient(135deg,#4338ca,#312e81)',color:'#ffffff'}}>
                                        <span style={{fontSize:'9.5px',fontWeight:600,color:'#c7d2fe',lineHeight:1.6}}>{numberToPersianWords(invoice.totalPrice)} تومان</span>
                                        <span style={{display:'flex',alignItems:'baseline',gap:'7px',whiteSpace:'nowrap'}}>
                                            <span style={{fontWeight:700,fontSize:'10.5px',color:'#c7d2fe'}}>جمع کل فاکتور:</span>
                                            <strong style={{fontSize:'16px',fontWeight:900}}>{formatNumber(invoice.totalPrice)} <span style={{fontSize:'9.5px',fontWeight:700,color:'#c7d2fe'}}>تومان</span></strong>
                                        </span>
                                    </div>
                                </div>
                                {/* Loading cost footnote - فقط زمانی نشان داده می‌شود که هزینه بارگیری جزو مبلغ فاکتور نشده باشد (صرفاً اطلاعاتی) */}
                                {fields.loadingCostFootnote && !invoice.includeLoadingCost && loadingCost > 0 && (
                                    <div style={{background:'#fffbeb',border:'1px dashed #f59e0b',borderRadius:'8px',padding:'8px',marginBottom:'8px',fontSize:'10px',color:'#92400e'}}>
                                        <div style={{fontWeight:700,marginBottom:'4px',display:'flex',alignItems:'center',gap:'6px'}}>🚛 یادداشت هزینه بارگیری <span style={{fontSize:'9px',background:'#fef3c7',padding:'1px 6px',borderRadius:'10px',border:'1px solid #fde68a'}}>پاورقی – خارج از مبلغ فاکتور</span></div>
                                        <div style={{display:'flex',gap:'16px',flexWrap:'wrap'}}>
                                            <span>وزن واقعی: <strong>{formatNumber(totalWeight)} kg</strong></span>
                                            <span>وزن گردشده: <strong>{formatNumber(roundedWeight)} kg</strong></span>
                                            <span>نرخ: <strong>{formatNumber(s.loadingCostPerTon)} تومان/تن</strong></span>
                                            <span style={{fontWeight:900,color:'#b45309'}}>هزینه بارگیری: <strong>{formatNumber(loadingCost)} تومان</strong></span>
                                        </div>
                                    </div>
                                )}
                                {/* Deduction footnote */}
                                {fields.deductionFootnote && enrichedItems.some(it => it.deductionPerBag || it.bagWeight) && (
                                    <div style={{background:'#eff6ff',border:'1px dashed #93c5fd',borderRadius:'8px',padding:'8px',marginBottom:'8px',fontSize:'9px',color:'#1e40af'}}>
                                        <div style={{fontWeight:700,marginBottom:'4px'}}>📦 اطلاعات کسری و بسته‌بندی <span style={{fontSize:'9px',background:'#dbeafe',padding:'1px 6px',borderRadius:'10px'}}>پاورقی – فقط جنبه اطلاعاتی</span></div>
                                        {enrichedItems.filter(it => it.deductionPerBag || it.bagWeight).map((it, idx) => {
                                            const deducGrams = it.deductionPerBag && it.qty > 0 ? it.qty * it.deductionPerBag : 0;
                                            return (
                                                <div key={idx} style={{marginTop:'3px',paddingTop:'3px',borderTop:'1px solid #bfdbfe'}}>
                                                    <strong>{it.name}</strong>
                                                    {it.deductionPerBag && <span style={{marginRight:'8px'}}>🔸 کسری هر کیسه: {formatNumber(it.deductionPerBag)}گرم | کل کسری: {(deducGrams/1000).toFixed(3)} kg</span>}
                                                    {it.bagWeight && <span style={{marginRight:'8px'}}>📦 وزن کیسه: {it.bagWeight>=1000?`${it.bagWeight/1000}kg`:`${it.bagWeight}g`}</span>}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                                {/* Source/supplier footnote - اطلاعات خرید از تامین‌کننده؛ فقط با تیک صریح نمایش داده می‌شود چون معمولاً برای مشتری نباید دیده شود */}
                                {fields.sourceInfo && enrichedItems.some(it => it.sourced) && (
                                    <div style={{background:'#faf5ff',border:'1px dashed #c084fc',borderRadius:'8px',padding:'8px',marginBottom:'8px',fontSize:'9px',color:'#6b21a8'}}>
                                        <div style={{fontWeight:700,marginBottom:'4px'}}>🛒 اطلاعات خرید از تامین‌کننده <span style={{fontSize:'9px',background:'#f3e8ff',padding:'1px 6px',borderRadius:'10px'}}>پاورقی – داخلی</span></div>
                                        {enrichedItems.filter(it => it.sourced).map((it, idx) => (
                                            <div key={idx} style={{marginTop:'3px',paddingTop:'3px',borderTop:'1px solid #e9d5ff'}}>
                                                <strong>{it.name}</strong>
                                                {it.sourceParty && <span style={{marginRight:'8px'}}>خریداری‌شده از: {it.sourceParty}</span>}
                                                {it.sourcePrice > 0 && <span style={{marginRight:'8px'}}>فیِ خرید: {formatNumber(it.sourcePrice)} تومان</span>}
                                                {it.sourceSettlement && <span style={{marginRight:'8px'}}>وضعیت تسویه: {it.sourceSettlement === 'settled' ? 'تسویه‌شده' : 'تسویه‌نشده'}</span>}
                                                {it.sourceNote && <span style={{marginRight:'8px'}}>یادداشت: {it.sourceNote}</span>}
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {/* Date change footnote */}
                                {fields.dateChangeLog && invoice.dateChangeLogs && invoice.dateChangeLogs.length > 0 && (
                                    <div style={{background:'#fff7ed',border:'1px dashed #fb923c',borderRadius:'8px',padding:'8px',marginBottom:'8px',fontSize:'9px',color:'#9a3412'}}>
                                        <div style={{fontWeight:700,marginBottom:'3px'}}>🗓 تاریخچه تغییر تاریخ فاکتور <span style={{fontSize:'9px',background:'#fed7aa',padding:'1px 6px',borderRadius:'10px'}}>پاورقی</span></div>
                                        {invoice.dateChangeLogs.map((log, idx) => (
                                            <div key={idx}>در تاریخ {log.changedAt}، تاریخ از {log.from} به {log.to} تغییر کرد</div>
                                        ))}
                                    </div>
                                )}
                                {/* Change reason footnote */}
                                {fields.changeReasonLog && invoice.changeLogs && invoice.changeLogs.length > 0 && (
                                    <div style={{background:'#f5f3ff',border:'1px dashed #a78bfa',borderRadius:'8px',padding:'8px',marginBottom:'8px',fontSize:'9px',color:'#5b21b6'}}>
                                        <div style={{fontWeight:700,marginBottom:'3px'}}>✎ تاریخچه ویرایش و علت تغییر <span style={{fontSize:'9px',background:'#ede9fe',padding:'1px 6px',borderRadius:'10px'}}>پاورقی</span></div>
                                        {invoice.changeLogs.map((log, idx) => (
                                            <div key={idx} style={{marginTop:'2px'}}>در تاریخ {log.changedAt}: {log.reason || 'علتی ثبت نشده است'}</div>
                                        ))}
                                    </div>
                                )}
                                {/* Signature area: فقط متن، بدون قاب/خط‌چین — جا را به ردیف‌های فاکتور می‌دهد */}
                                {fields.signatures && (
                                <div style={{display:'flex',justifyContent:'space-between',gap:'18px',marginTop:'10px',paddingTop:'8px',borderTop:'1px solid #eef2f7'}}>
                                    <div style={{fontSize:'9.5px',color:'#64748b',fontWeight:700}}>امضاء و مهر فروشنده</div>
                                    <div style={{fontSize:'9.5px',color:'#64748b',fontWeight:700}}>امضاء خریدار <span style={{color:'#94a3b8',fontWeight:600}}>({invoice.customer})</span></div>
                                </div>
                                )}
                                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',color:'#94a3b8',fontSize:'9px',marginTop:'14px',paddingTop:'8px',borderTop:'1px solid #e2e8f0'}}>
                                    <span>صادر شده توسط <strong style={{color:'#6366f1'}}>انبار یار</strong></span>
                                    <span>{invoice.date}</span>
                                </div>
                            </div>
                            </div>
                        </div>
                    </div>
                </div>
            );
        };

        // PDF واقعی: A4 افقی، چندصفحه‌ای، دانلود مستقیم با نام قابل ویرایش
        // موتور مشترک رندر یک المنت به Canvas برای خروجی عکس/PDF — قبلاً این منطق ۳ جای جدا و تقریباً
        // یکسان تکرار شده بود (خروجی فاکتور، خروجی PDF، خروجی اسناد خرید/پردازش)، که یعنی رفع یک باگ در
        // یکی از آن‌ها لزوماً در بقیه اعمال نمی‌شد. حالا هر سه از همین یک تابع استفاده می‌کنند.
        //
        // رفع باگ ناهم‌ترازیِ متن‌ها (روی‌هم‌افتادن متن با خط‌های جدول در خروجیِ عکس/PDF، برخلاف پرینت مستقیم
        // که دقیق است): علت اصلی این بود که ۱) فونت وزیرمتن با همه‌ی وزن‌هایش (۴۰۰/۵۰۰/۷۰۰/۹۰۰) قبل از رندر
        // کاملاً «لود‌شده» تایید نمی‌شد (فقط document.fonts.ready چک می‌شد که کافی نیست)، و ۲) line-height به
        // مقدار پیش‌فرض «normal» رها شده بود که html2canvas گاهی آن را برای این فونت اشتباه محاسبه می‌کند و
        // متن را روی خط بعدی/حاشیه‌ی جدول می‌ریزد. اینجا هر دو رفع شده‌اند، فقط برای همین کپیِ آفلاینِ خروجی
        // (نه کل برنامه)، پس چیزی در ظاهر زنده‌ی برنامه یا در پرینت مستقیم عوض نمی‌شود.
        let __exportHostSeq = 0;
        const renderElementToCanvas = async (el, width) => {
            if (!el) throw new Error('محتوای خروجی پیدا نشد');
            if (!window.html2canvas) throw new Error('html2canvas بارگذاری نشده است');
            if (document.fonts) {
                try {
                    await Promise.all(['400', '500', '700', '900'].map(w => document.fonts.load(`${w} 16px Vazirmatn`)));
                } catch (e) { /* بی‌اهمیت — اگر لود دستی فونت شکست بخورد، fonts.ready زیر همچنان تلاش می‌کند */ }
                if (document.fonts.ready) await document.fonts.ready;
            }
            const hostId = `export-host-${++__exportHostSeq}`;
            const host = document.createElement('div');
            host.id = hostId;
            host.style.cssText = `position:fixed;left:-100000px;top:0;width:${width}px;background:#fff;z-index:-1;direction:rtl;overflow:visible;`;
            const clone = el.cloneNode(true);
            clone.style.cssText += `;width:${width}px;max-width:${width}px;margin:0!important;padding:18px!important;box-sizing:border-box;background:#fff;overflow:visible!important;`;
            const styleFix = document.createElement('style');
            styleFix.textContent = `#${hostId} * { line-height: 1.6 !important; letter-spacing: normal !important; } #${hostId} table { border-collapse: collapse !important; } #${hostId} td, #${hostId} th { vertical-align: middle !important; }`;
            host.appendChild(styleFix);
            host.appendChild(clone);
            document.body.appendChild(host);
            try {
                // دو فریم انیمیشن + یک تاخیر کوتاه، تا مرورگر مطمئناً layout و فونت را قبل از عکس‌گیری اعمال کرده باشد.
                await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
                await new Promise(r => setTimeout(r, 60));
                const canvas = await window.html2canvas(clone, { scale: 2, backgroundColor: '#fff', useCORS: true, allowTaint: false, logging: false, imageTimeout: 15000, width, windowWidth: width, windowHeight: clone.scrollHeight || undefined, scrollX: 0, scrollY: 0 });
                return canvas;
            } finally {
                host.remove();
            }
        };

        // توجه: خروجی PDF قبلاً اینجا با jsPDF از روی یک عکسِ html2canvas ساخته می‌شد که باعث ناهم‌ترازیِ متن
        // می‌شد. حالا «ذخیره PDF» از همان مسیرِ چاپِ مرورگر (printElementInNewWindow) استفاده می‌کند که متنِ
        // واقعی و کاملاً هم‌تراز تولید می‌کند؛ کاربر فقط مقصد چاپ را روی «Save as PDF» می‌گذارد.

        // --- Print modal generic (خرید کالا / آنالیز-پردازش) ---
        // بازاستفاده از همان کلاس‌های print-modal-backdrop / print-modal-panel / print-area
        // که در CSS چاپ اصلاح شده‌اند، تا همان رفع باگ صفحات خالی این‌جا هم اعمال شود.
        const PrintOrderModal = ({ title, badge, badgeColor, rows, itemsList, inventoryItems, isPending, description, docId, docDate, onClose }) => {
            const dialogRef = useDialogA11y(onClose);
            const paperRef = useRef(null);
            const [downloadingJpeg, setDownloadingJpeg] = useState(false);
            const partyName = rows?.find(r => /فروشنده|تامین‌کننده|تامین کننده|تحویل|گیرنده|مشتری|طرف/.test(String(r.label||'')))?.value || '';
            const defaultFileName = `${title || 'سند'}${partyName ? `-${partyName}` : ''}-${(docId || '').slice(-6)}`.replace(/\s+/g,' ').trim();
            const [pdfFileName, setPdfFileName] = useState(defaultFileName);
            const toast = useToast();
            const printPaperSize = (() => { try { return localStorage.getItem('invoicePrintPaperSize') || 'A4'; } catch (e) { return 'A4'; } })();
            const doPrint = () => printElementInNewWindow(paperRef.current, pdfFileName || title, printPaperSize);
            // همان رفعِ اصلیِ ناهم‌ترازی: به‌جای عکس‌گرفتنِ html2canvas، از مسیرِ چاپِ خودِ مرورگر استفاده می‌شود
            // که کاربر تایید کرده دقیق است — کافی‌ست مقصد چاپ را روی «Save as PDF» بگذارد.
            const savePdf = () => { toast.show('در پنجره‌ی چاپ که باز می‌شود، مقصد چاپگر را روی «Save as PDF» بگذارید.'); printElementInNewWindow(paperRef.current, pdfFileName || title, printPaperSize); };
            const downloadJpeg = async () => {
                if (!paperRef.current || !window.html2canvas) return;
                setDownloadingJpeg(true);
                try {
                    const canvas = await renderElementToCanvas(paperRef.current, 1120);
                    const link = document.createElement('a');
                    link.download = `${(pdfFileName || title || 'سند').replace(/[\\/:*?"<>|]/g,'-').trim()}.jpg`;
                    link.href = canvas.toDataURL('image/jpeg',0.95); link.click();
                } catch (err) { console.error(err); toast.show('ساخت خروجی تصویر انجام نشد. لطفاً دوباره تلاش کنید.'); }
                finally { setDownloadingJpeg(false); }
            };
            return (
                <div className="print-modal-backdrop fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-[9998] flex items-center justify-center p-4">
                    <div ref={dialogRef} className="print-modal-panel bg-white rounded-3xl w-full max-w-6xl overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="p-4 bg-slate-50 border-b flex justify-between items-center no-print">
                            <h3 className="font-black text-slate-800 flex items-center gap-2"><div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center"><Printer size={15}/></div> پیش‌نمایش چاپ</h3>
                            <div className="flex gap-2 flex-wrap items-center">
                                <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-full px-3 py-1.5"><FileText size={14} className="text-slate-400"/><input value={pdfFileName} onChange={e=>setPdfFileName(e.target.value)} className="w-44 text-[11px] font-bold outline-none" placeholder="نام فایل PDF"/></div>
                                <button onClick={savePdf} title="پنجره‌ی چاپ باز می‌شود؛ مقصد را روی Save as PDF بگذارید تا یک PDF دقیق و متن‌دار بگیرید" className="flex items-center gap-2 bg-slate-800 text-white px-4 py-2 rounded-full font-bold text-sm hover:bg-slate-900 transition"><Download size={16}/> ذخیره PDF</button>
                                <button onClick={doPrint} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-full font-bold text-sm hover:bg-indigo-700 transition"><Printer size={16}/> چاپ</button>
                                <button onClick={downloadJpeg} disabled={downloadingJpeg} className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-full font-bold text-sm hover:bg-emerald-700 transition disabled:opacity-60"><ImageIcon size={16}/> {downloadingJpeg ? 'در حال ساخت...' : 'JPEG'}</button>
                                <button onClick={onClose} className="p-2.5 hover:bg-slate-200 rounded-full transition"><X size={18}/></button>
                            </div>
                        </div>
                        <div className="p-6 max-h-[80vh] overflow-y-auto" id="print-area">
                            <div ref={paperRef} className="invoice-paper print-invoice bg-white" style={{fontFamily:"'Vazirmatn', sans-serif", direction:'rtl'}}>
                                <div style={{borderBottom:'2px solid #4f46e5',paddingBottom:'8px',marginBottom:'10px',display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                                    <div>
                                        <div style={{fontSize:'15px',fontWeight:900,color:'#1e293b'}}>{title}</div>
                                        {badge && <div style={{display:'inline-block',background:badgeColor?.bg || '#fef3c7',color:badgeColor?.text || '#92400e',padding:'1px 8px',borderRadius:'20px',fontSize:'9px',fontWeight:700,border:`1px solid ${badgeColor?.border || '#fde68a'}`,marginTop:'3px'}}>{badge}</div>}
                                    </div>
                                    <div style={{textAlign:'left', fontSize:'11px',color:'#64748b'}}>
                                        {docId && <div style={{fontSize:'9px',color:'#94a3b8',marginBottom:'1px',fontFamily:'monospace'}}># {docId.slice(-8)}</div>}
                                        <div style={{fontWeight:700,color:'#334155'}}>تاریخ: {docDate}</div>
                                    </div>
                                </div>
                                <div style={{display:'grid',gridTemplateColumns:'repeat(3,minmax(0,1fr))',gap:'8px',marginBottom:'10px',background:'#f8fafc',borderRadius:'8px',padding:'8px',border:'1px solid #e2e8f0'}}>
                                    {rows.map((r, i) => (
                                        <div key={i}><span style={{color:'#94a3b8',fontSize:'9px',fontWeight:600}}>{r.label}</span><div style={{fontWeight:800,fontSize:'12px',color:'#1e293b',marginTop:'1px'}}>{r.value}</div></div>
                                    ))}
                                </div>
                                {(() => { const hasWeightPrice = itemsList.some(it => (Number(it.weight) || 0) > 0 || (Number(it.price) || 0) > 0); return (
                                <table style={{width:'100%',borderCollapse:'collapse',marginBottom:'10px',fontSize:'11px'}}>
                                    <thead>
                                        <tr style={{background:'#f1f5f9'}}>
                                            <th style={{padding:'5px',textAlign:'right',borderBottom:'2px solid #e2e8f0'}}>کالا</th>
                                            <th style={{padding:'5px',textAlign:'right',borderBottom:'2px solid #e2e8f0'}}>برند / تگ</th>
                                            <th style={{padding:'5px',textAlign:'center',borderBottom:'2px solid #e2e8f0'}}>تعداد</th>
                                            {hasWeightPrice && <th style={{padding:'5px',textAlign:'center',borderBottom:'2px solid #e2e8f0'}}>وزن (Kg)</th>}
                                            {hasWeightPrice && <th style={{padding:'5px',textAlign:'center',borderBottom:'2px solid #e2e8f0'}}>قیمت/کیلو</th>}
                                            {hasWeightPrice && <th style={{padding:'5px',textAlign:'center',borderBottom:'2px solid #e2e8f0'}}>جمع</th>}
                                            {!hasWeightPrice && <th style={{padding:'5px',textAlign:'center',borderBottom:'2px solid #e2e8f0'}}>واحد</th>}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {itemsList.map((it, idx) => {
                                            const rowTot = (Number(it.weight) || 0) > 0 ? (Number(it.weight) || 0) * (Number(it.price) || 0) : (Number(it.qty) || 0) * (Number(it.price) || 0);
                                            return (
                                            <tr key={idx} style={{borderBottom:'1px solid #f1f5f9'}}>
                                                <td style={{padding:'5px',fontWeight:700,color:'#334155'}}>
                                                    {(() => {
                                                        const { name, note } = resolveItemDisplay(it, inventoryItems, !!isPending);
                                                        return (<>{name}{note && <span style={{fontSize:'8px',color:'#b45309',background:'#fffbeb',border:'1px solid #fde68a',borderRadius:'4px',padding:'0 4px',marginRight:'4px'}}>{note}</span>}</>);
                                                    })()}
                                                </td>
                                                <td style={{padding:'5px',color:'#64748b',fontSize:'10px'}}>{resolveItemDisplay(it, inventoryItems, !!isPending).display.brand} {resolveItemDisplay(it, inventoryItems, !!isPending).display.tag}</td>
                                                <td style={{padding:'5px',textAlign:'center',fontWeight:700}}>{formatNumber(it.qty)}</td>
                                                {hasWeightPrice && <td style={{padding:'5px',textAlign:'center',fontWeight:700,color:'#4f46e5'}}>{it.weight > 0 ? formatNumber(it.weight) : '—'}</td>}
                                                {hasWeightPrice && <td style={{padding:'5px',textAlign:'center'}}>{it.price > 0 ? formatNumber(it.price) : '—'}</td>}
                                                {hasWeightPrice && <td style={{padding:'5px',textAlign:'center',fontWeight:800,color:'#059669'}}>{rowTot > 0 ? formatNumber(rowTot) : '—'}</td>}
                                                {!hasWeightPrice && <td style={{padding:'5px',textAlign:'center',color:'#94a3b8',fontSize:'10px'}}>{it.unit || 'عدد'}</td>}
                                            </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                                ); })()}
                                {description && <div style={{fontSize:'10px',color:'#475569',background:'#f8fafc',borderRadius:'8px',padding:'8px',border:'1px solid #e2e8f0',marginBottom:'8px'}}><strong style={{color:'#334155'}}>توضیحات: </strong>{description}</div>}
                                <div style={{textAlign:'center',color:'#cbd5e1',fontSize:'9px',marginTop:'10px',paddingTop:'6px',borderTop:'1px solid #f1f5f9'}}>
                                    صادر شده توسط انبار یار | {docDate}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            );
        };

