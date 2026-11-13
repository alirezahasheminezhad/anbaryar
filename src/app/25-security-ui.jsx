//## ═══ app/25-security-ui.jsx ═══
//## صفحه‌ی قفل، مرکز امنیت، SecurityGate و AYErrorBoundary.
//## ترتیب فایل‌ها در build.py مهم است؛ همه‌ی بخش‌ها یک scope مشترک دارند.
        const passwordStrength = (pw) => {
            if (!pw) return { label: '', bar: 'bg-slate-200', text: 'text-slate-400', pct: 0 };
            let score = 0;
            if (pw.length >= 8) score++;
            if (pw.length >= 12) score++;
            if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
            if (/\d/.test(pw)) score++;
            if (/[^A-Za-z0-9]/.test(pw)) score++;
            if (score <= 2) return { label: 'ضعیف', bar: 'bg-red-500', text: 'text-red-600', pct: 33 };
            if (score <= 3) return { label: 'متوسط', bar: 'bg-amber-500', text: 'text-amber-600', pct: 66 };
            return { label: 'قوی', bar: 'bg-emerald-500', text: 'text-emerald-600', pct: 100 };
        };
        const SecurityScreen = ({ mode='lock', onUnlock, onSetup, onSkip }) => {
            const [password, setPassword] = React.useState('');
            const [confirm, setConfirm] = React.useState('');
            const [error, setError] = React.useState('');
            const [busy, setBusy] = React.useState(false);
            const isSetup = mode === 'setup';
            const submit = async (e) => {
                e.preventDefault(); setError('');
                if (password.length < 8) return setError('رمز باید حداقل ۸ کاراکتر باشد.');
                if (isSetup && password !== confirm) return setError('تکرار رمز عبور یکسان نیست.');
                setBusy(true);
                try {
                    if (isSetup) await onSetup(password); else await onUnlock(password);
                } catch(err) { setError(err.message || 'رمز عبور نادرست است.'); }
                finally { setBusy(false); }
            };
            return <div className="fixed inset-0 z-[100] bg-slate-950/95 flex items-center justify-center p-4 font-[Vazirmatn]" dir="rtl">
                <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-7 border border-slate-200">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="bg-indigo-600 text-white p-3 rounded-2xl"><Lock size={25}/></div>
                        <div><h2 className="text-xl font-black text-slate-800">{isSetup ? 'فعال‌سازی رمز انبار یار' : 'انبار یار قفل است'}</h2><p className="text-xs text-slate-500 mt-1">{isSetup ? 'برای حفاظت از اطلاعات، یک رمز حداقل ۸ کاراکتری تعیین کنید.' : 'برای ورود رمز عبور خود را وارد کنید.'}</p></div>
                    </div>
                    <form onSubmit={submit} className="space-y-3">
                        <input autoFocus type="password" value={password} onChange={e=>setPassword(e.target.value)} className="w-full border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-indigo-500" placeholder="رمز عبور" />
                        {isSetup && <input type="password" value={confirm} onChange={e=>setConfirm(e.target.value)} className="w-full border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-indigo-500" placeholder="تکرار رمز عبور" />}
                        {isSetup && password && (() => { const s = passwordStrength(password); return (
                            <div className="flex items-center gap-2">
                                <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden"><div className={`h-full rounded-full transition-all ${s.bar}`} style={{ width: s.pct + '%' }}/></div>
                                <span className={`text-[10px] font-bold ${s.text}`}>{s.label}</span>
                            </div>
                        ); })()}
                        {error && <div className="text-xs font-bold text-red-600 bg-red-50 border border-red-100 rounded-xl p-3">{error}</div>}
                        <button disabled={busy} className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded-xl py-3 font-bold">{busy ? 'در حال بررسی...' : (isSetup ? 'فعال‌سازی و ورود' : 'ورود به برنامه')}</button>
                    </form>
                    {isSetup && <p className="text-[10px] text-slate-400 mt-4 leading-6">رمز عبور روی سرور ارسال نمی‌شود. داده‌های اصلی بعد از فعال‌سازی، در IndexedDB به‌صورت رمزنگاری‌شده ذخیره می‌شوند. فراموش کردن رمز به معنی نیاز به بازیابی از بکاپ خارجی خواهد بود.</p>}
                    {isSetup && (
                        <div className="mt-4 pt-4 border-t border-slate-100">
                            <button type="button" onClick={onSkip} className="w-full border border-slate-200 rounded-xl py-2.5 font-bold text-slate-600 hover:bg-slate-50 text-sm">فعلاً بدون رمز وارد شوید (دمو)</button>
                            <p className="text-[10px] text-amber-600 mt-2 leading-5">بدون رمز، اطلاعات روی این دستگاه رمزنگاری نمی‌شود. هر زمان از بخش «امنیت» می‌توانید رمز را فعال کنید.</p>
                        </div>
                    )}
                </div>
            </div>;
        };

        const SecurityCenter = ({ onClose, appSettings, setAppSettings }) => {
            const dialogRef = useDialogA11y(onClose);
            const [autoLock,setAutoLock]=React.useState(Number(loadSettings().autoLockMinutes ?? 30));
            const saveAutoLock=(v)=>{ const n=Number(v); setAutoLock(n); const next={...loadSettings(),autoLockMinutes:n}; saveSettings(next); setAppSettings(next); window.dispatchEvent(new Event('anbaryar:auto-lock-changed')); };
            const toast = useToast();
            const hasSecurity = !!getSecurityConfig();
            const [pwForm,setPwForm]=React.useState(false);
            const [pwCurrent,setPwCurrent]=React.useState('');
            const [pwNext,setPwNext]=React.useState('');
            const [pwConfirm,setPwConfirm]=React.useState('');
            const [pwError,setPwError]=React.useState('');
            const [pwBusy,setPwBusy]=React.useState(false);
            const submitPasswordChange=async(e)=>{
                e.preventDefault(); setPwError('');
                if(pwNext.length<8) return setPwError('رمز جدید باید حداقل ۸ کاراکتر باشد.');
                if(pwNext!==pwConfirm) return setPwError('تکرار رمز جدید یکسان نیست.');
                setPwBusy(true);
                try {
                    const sc=getSecurityConfig();
                    if(sc){ const oldHash=await passwordVerifier(pwCurrent,sc.salt); if(oldHash!==sc.hash){ setPwError('رمز فعلی نادرست است.'); return; } }
                    const data=await loadDataSecure(); const newSalt=randomB64(16); const newHash=await passwordVerifier(pwNext,newSalt);
                    AY_SECURITY.key=await deriveAYKey(pwNext,newSalt); await persistSecureData([data.items,data.invoices,data.notes,data.transactions,data.purchases,data.processingOrders,data.consignments]);
                    await rememberTrustedUnlock(AY_SECURITY.key, loadSettings().autoLockMinutes);
                    localStorage.setItem(SECURITY_KEY,JSON.stringify({version:2,salt:newSalt,hash:newHash,createdAt:sc?.createdAt||new Date().toISOString(),changedAt:new Date().toISOString()}));
                    setPwForm(false); setPwCurrent(''); setPwNext(''); setPwConfirm('');
                    toast.show(sc?'رمز عبور با موفقیت تغییر کرد.':'رمز عبور فعال شد؛ اطلاعات از این پس رمزنگاری می‌شود.');
                } catch(e){ setPwError((hasSecurity?'تغییر رمز':'فعال‌سازی رمز')+' انجام نشد: '+e.message); }
                finally { setPwBusy(false); }
            };
            return <div className="fixed inset-0 z-[90] bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-4" dir="rtl">
                <div ref={dialogRef} className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
                    <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-3"><div className="bg-indigo-100 text-indigo-600 p-3 rounded-2xl"><ShieldCheck size={21}/></div><div><h3 className="font-black text-slate-800">امنیت انبار یار</h3><p className="text-[10px] text-slate-400 mt-1">مدیریت رمز عبور و قفل خودکار برنامه</p></div></div>
                        <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100"><X size={18}/></button>
                    </div>
                    <div className="p-5 space-y-4">
                        {hasSecurity ? (
                            <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 text-xs leading-6 text-indigo-900"><b>حفاظت فعال است.</b><br/>اطلاعات اصلی برنامه به‌صورت رمزنگاری‌شده روی همین دستگاه ذخیره می‌شود. این نسخه هیچ اتصال یا وابستگی به ابر ندارد.</div>
                        ) : (
                            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs leading-6 text-amber-800"><b>رمزنگاری غیرفعال است.</b><br/>برنامه بدون رمز اجرا می‌شود و اطلاعات روی این دستگاه رمزنگاری نشده‌اند. با تعیین رمز در همین بخش، حفاظت را فعال کنید.</div>
                        )}
                        <div className="bg-slate-50 rounded-2xl p-4"><div className="flex items-center justify-between gap-3"><div><div className="font-bold text-sm text-slate-800">قفل خودکار</div><div className="text-[10px] text-slate-400 mt-1">بعد از این مدت برنامه دوباره رمز می‌خواهد.</div></div><select value={autoLock} onChange={e=>saveAutoLock(e.target.value)} className="border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold bg-white"><option value="5">۵ دقیقه</option><option value="10">۱۰ دقیقه</option><option value="15">۱۵ دقیقه</option><option value="30">۳۰ دقیقه</option><option value="60">۱ ساعت</option><option value="120">۲ ساعت</option><option value="240">۴ ساعت</option><option value="360">۶ ساعت</option><option value="480">۸ ساعت</option><option value="720">۱۲ ساعت</option><option value="1440">۲۴ ساعت</option><option value="0">دستی — قفل خودکار خاموش</option></select></div></div>
                        {!pwForm ? (
                            <button onClick={()=>{setPwForm(true);setPwError('');}} className="w-full border border-slate-200 rounded-xl py-3 font-bold text-slate-700 hover:bg-slate-50">{hasSecurity?'تغییر رمز عبور':'فعال‌سازی رمز عبور'}</button>
                        ) : (
                            <form onSubmit={submitPasswordChange} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                                <div className="font-bold text-sm text-slate-800 flex items-center gap-2"><Lock size={15}/> {hasSecurity?'تغییر رمز عبور':'فعال‌سازی رمز عبور'}</div>
                                {hasSecurity && <input autoFocus type="password" value={pwCurrent} onChange={e=>setPwCurrent(e.target.value)} placeholder="رمز فعلی" autoComplete="current-password" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-indigo-500"/>}
                                <input autoFocus={!hasSecurity} type="password" value={pwNext} onChange={e=>setPwNext(e.target.value)} placeholder="رمز جدید (حداقل ۸ کاراکتر)" autoComplete="new-password" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-indigo-500"/>
                                <input type="password" value={pwConfirm} onChange={e=>setPwConfirm(e.target.value)} placeholder="تکرار رمز جدید" autoComplete="new-password" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-indigo-500"/>
                                {pwError && <div className="text-xs font-bold text-red-600 bg-red-50 border border-red-100 rounded-xl p-3">{pwError}</div>}
                                <div className="flex gap-2">
                                    <button type="button" onClick={()=>{setPwForm(false);setPwError('');}} className="flex-1 border border-slate-200 rounded-xl py-2.5 font-bold text-slate-600 hover:bg-slate-100 text-sm">انصراف</button>
                                    <button type="submit" disabled={pwBusy} className="flex-1 bg-indigo-600 text-white rounded-xl py-2.5 font-bold hover:bg-indigo-700 disabled:opacity-60 text-sm">{pwBusy?'در حال تغییر...':'ثبت رمز جدید'}</button>
                                </div>
                            </form>
                        )}
                        {hasSecurity && <button onClick={()=>{ clearTrustedUnlock(); window.dispatchEvent(new Event('anbaryar:lock')); }} className="w-full bg-slate-900 text-white rounded-xl py-3 font-bold flex items-center justify-center gap-2"><Lock size={16}/> قفل کردن همین حالا</button>}
                        <div className="text-[10px] text-slate-400 leading-5">برای پشتیبان‌گیری از اطلاعات، از بخش پشتیبان‌گیری محلی برنامه استفاده کنید. نسخه فعلی کاملاً مستقل و آفلاین است.</div>
                    </div>
                </div>
            </div>;
        };

        const SecurityGate = () => {
            const [mode,setMode]=React.useState('checking'); const [nonce,setNonce]=React.useState(0);
            React.useEffect(()=>{
                let mounted=true;
                (async()=>{
                    const cfg=getSecurityConfig();
                    if(!cfg){ if(mounted)setMode('setup'); return; }
                    const restored=await restoreTrustedUnlock();
                    if(mounted)setMode(restored?'app':'lock');
                })();
                const lockFn=()=>{ clearTrustedUnlock(); AY_SECURITY.key=null; AY_SECURITY.unlocked=false; setMode(getSecurityConfig()?'lock':'setup'); setNonce(n=>n+1); };
                window.addEventListener('anbaryar:lock',lockFn);
                return()=>{mounted=false;window.removeEventListener('anbaryar:lock',lockFn)};
            },[]);
            React.useEffect(()=>{
                if(mode!=='app') return;
                const remaining=trustedUnlockRemaining();
                if(remaining>0){ const t=setTimeout(()=>window.dispatchEvent(new Event('anbaryar:lock')),remaining+100); return()=>clearTimeout(t); }
            },[mode,nonce]);
            const setup=async password=>{
                const salt=randomB64(16); const hash=await passwordVerifier(password,salt);
                AY_SECURITY.key=await deriveAYKey(password,salt); AY_SECURITY.unlocked=true;
                localStorage.setItem(SECURITY_KEY,JSON.stringify({version:2,salt,hash,createdAt:new Date().toISOString()}));
                await migrateLegacyToSecure(); await rememberTrustedUnlock(AY_SECURITY.key, loadSettings().autoLockMinutes); setMode('app');
            };
            const unlock=async password=>{
                const cfg=getSecurityConfig(); const hash=await passwordVerifier(password,cfg.salt);
                if(hash!==cfg.hash)throw new Error('رمز عبور نادرست است.');
                AY_SECURITY.key=await deriveAYKey(password,cfg.salt); AY_SECURITY.unlocked=true;
                await rememberTrustedUnlock(AY_SECURITY.key, loadSettings().autoLockMinutes); setMode('app');
            };
            if(mode==='checking')return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white font-[Vazirmatn]"><div className="text-center"><div className="animate-spin w-8 h-8 border-2 border-white/30 border-t-white rounded-full mx-auto mb-3"></div><div className="text-sm">در حال آماده‌سازی انبار یار...</div></div></div>;
            if(mode==='setup')return <SecurityScreen mode="setup" onSetup={setup} onSkip={()=>setMode('app')}/>;
            if(mode==='lock')return <SecurityScreen mode="lock" onUnlock={unlock}/>;
            return <App key={nonce}/>;
        };

        class AYErrorBoundary extends React.Component {
            constructor(props){ super(props); this.state={error:null}; }
            static getDerivedStateFromError(error){ return {error}; }
            componentDidCatch(error,info){ console.error('AnbarYar UI Error:',error,info); }
            render(){
                if(this.state.error){
                    return <div dir="rtl" className="min-h-screen bg-slate-50 p-6 font-[Vazirmatn]"><div className="max-w-2xl mx-auto bg-white border border-red-200 rounded-3xl shadow-xl p-6"><div className="flex items-center gap-3 mb-3"><div className="w-10 h-10 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center"><AlertTriangle size={22}/></div><div><h2 className="font-black text-slate-800">این بخش با خطا مواجه شد</h2><p className="text-xs text-slate-500 mt-1">نگران نباشید؛ اطلاعات شما محفوظ است. می‌توانید دوباره تلاش کنید یا صفحه را از نو بارگذاری کنید.</p></div></div><details className="bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs text-slate-500"><summary className="cursor-pointer font-bold text-slate-600 select-none">جزئیات فنی (برای پشتیبانی)</summary><div className="bg-slate-950 text-red-200 rounded-xl p-3 mt-2 leading-6 overflow-auto">{String(this.state.error?.message||this.state.error)}</div></details><div className="flex gap-2 mt-4"><button onClick={()=>this.setState({error:null})} className="flex-1 bg-indigo-600 text-white rounded-xl py-3 font-bold">تلاش دوباره</button><button onClick={()=>window.location.reload()} className="flex-1 border border-slate-200 rounded-xl py-3 font-bold text-slate-600">بارگذاری مجدد</button></div></div></div>;
                }
                return this.props.children;
            }
        };

