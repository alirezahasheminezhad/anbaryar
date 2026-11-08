//## ═══ app/25-security-ui.jsx ═══
//## صفحه‌ی قفل، مرکز امنیت، SecurityGate و AYErrorBoundary.
//## ترتیب فایل‌ها در build.py مهم است؛ همه‌ی بخش‌ها یک scope مشترک دارند.
        const SecurityScreen = ({ mode='lock', onUnlock, onSetup }) => {
            const [password, setPassword] = React.useState('');
            const [confirm, setConfirm] = React.useState('');
            const [error, setError] = React.useState('');
            const [busy, setBusy] = React.useState(false);
            const isSetup = mode === 'setup';
            const submit = async (e) => {
                e.preventDefault(); setError('');
                if (password.length < 6) return setError('رمز باید حداقل ۶ کاراکتر باشد.');
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
                        <div><h2 className="text-xl font-black text-slate-800">{isSetup ? 'فعال‌سازی رمز انبار یار' : 'انبار یار قفل است'}</h2><p className="text-xs text-slate-500 mt-1">{isSetup ? 'برای حفاظت از اطلاعات، یک رمز حداقل ۶ رقمی/کاراکتری تعیین کنید.' : 'برای ورود رمز عبور خود را وارد کنید.'}</p></div>
                    </div>
                    <form onSubmit={submit} className="space-y-3">
                        <input autoFocus type="password" value={password} onChange={e=>setPassword(e.target.value)} className="w-full border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-indigo-500" placeholder="رمز عبور" />
                        {isSetup && <input type="password" value={confirm} onChange={e=>setConfirm(e.target.value)} className="w-full border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-indigo-500" placeholder="تکرار رمز عبور" />}
                        {error && <div className="text-xs font-bold text-red-600 bg-red-50 border border-red-100 rounded-xl p-3">{error}</div>}
                        <button disabled={busy} className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded-xl py-3 font-bold">{busy ? 'در حال بررسی...' : (isSetup ? 'فعال‌سازی و ورود' : 'ورود به برنامه')}</button>
                    </form>
                    {isSetup && <p className="text-[10px] text-slate-400 mt-4 leading-6">رمز عبور روی سرور ارسال نمی‌شود. داده‌های اصلی بعد از فعال‌سازی، در IndexedDB به‌صورت رمزنگاری‌شده ذخیره می‌شوند. فراموش کردن رمز به معنی نیاز به بازیابی از بکاپ خارجی خواهد بود.</p>}
                </div>
            </div>;
        };

        const SecurityCenter = ({ onClose, appSettings, setAppSettings }) => {
            const [autoLock,setAutoLock]=React.useState(Number(loadSettings().autoLockMinutes ?? 30));
            const saveAutoLock=(v)=>{ const n=Number(v); setAutoLock(n); const next={...loadSettings(),autoLockMinutes:n}; saveSettings(next); setAppSettings(next); window.dispatchEvent(new Event('anbaryar:auto-lock-changed')); };
            const changePassword=()=>{
                const current=prompt('رمز فعلی را وارد کنید:'); if(current===null)return;
                const next=prompt('رمز جدید (حداقل ۶ کاراکتر):'); if(!next||next.length<6)return alert('رمز جدید باید حداقل ۶ کاراکتر باشد.');
                (async()=>{ try {
                    const sc=getSecurityConfig(); const oldHash=await passwordVerifier(current,sc.salt);
                    if(oldHash!==sc.hash)return alert('رمز فعلی نادرست است.');
                    const data=await loadDataSecure(); const newSalt=randomB64(16); const newHash=await passwordVerifier(next,newSalt);
                    AY_SECURITY.key=await deriveAYKey(next,newSalt); await persistSecureData([data.items,data.invoices,data.notes,data.transactions,data.purchases,data.processingOrders,data.consignments]);
                    await rememberTrustedUnlock(AY_SECURITY.key, loadSettings().autoLockMinutes);
                    localStorage.setItem(SECURITY_KEY,JSON.stringify({version:2,salt:newSalt,hash:newHash,createdAt:sc.createdAt||new Date().toISOString(),changedAt:new Date().toISOString()}));
                    alert('رمز عبور با موفقیت تغییر کرد.');
                } catch(e){ alert('تغییر رمز انجام نشد: '+e.message); } })();
            };
            return <div className="fixed inset-0 z-[90] bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-4" dir="rtl">
                <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
                    <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-3"><div className="bg-indigo-100 text-indigo-600 p-3 rounded-2xl"><ShieldCheck size={21}/></div><div><h3 className="font-black text-slate-800">امنیت انبار یار</h3><p className="text-[10px] text-slate-400 mt-1">مدیریت رمز عبور و قفل خودکار برنامه</p></div></div>
                        <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100"><X size={18}/></button>
                    </div>
                    <div className="p-5 space-y-4">
                        <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 text-xs leading-6 text-indigo-900"><b>حفاظت فعال است.</b><br/>اطلاعات اصلی برنامه به‌صورت رمزنگاری‌شده روی همین دستگاه ذخیره می‌شود. این نسخه هیچ اتصال یا وابستگی به ابر ندارد.</div>
                        <div className="bg-slate-50 rounded-2xl p-4"><div className="flex items-center justify-between gap-3"><div><div className="font-bold text-sm text-slate-800">قفل خودکار</div><div className="text-[10px] text-slate-400 mt-1">بعد از این مدت برنامه دوباره رمز می‌خواهد.</div></div><select value={autoLock} onChange={e=>saveAutoLock(e.target.value)} className="border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold bg-white"><option value="5">۵ دقیقه</option><option value="10">۱۰ دقیقه</option><option value="15">۱۵ دقیقه</option><option value="30">۳۰ دقیقه</option><option value="60">۱ ساعت</option><option value="120">۲ ساعت</option><option value="240">۴ ساعت</option><option value="360">۶ ساعت</option><option value="480">۸ ساعت</option><option value="720">۱۲ ساعت</option><option value="1440">۲۴ ساعت</option><option value="0">دستی — قفل خودکار خاموش</option></select></div></div>
                        <button onClick={changePassword} className="w-full border border-slate-200 rounded-xl py-3 font-bold text-slate-700 hover:bg-slate-50">تغییر رمز عبور</button>
                        <button onClick={()=>{ clearTrustedUnlock(); window.dispatchEvent(new Event('anbaryar:lock')); }} className="w-full bg-slate-900 text-white rounded-xl py-3 font-bold flex items-center justify-center gap-2"><Lock size={16}/> قفل کردن همین حالا</button>
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
                const lockFn=()=>{ clearTrustedUnlock(); AY_SECURITY.key=null; AY_SECURITY.unlocked=false; setMode('lock'); setNonce(n=>n+1); };
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
            if(mode==='setup')return <SecurityScreen mode="setup" onSetup={setup}/>;
            if(mode==='lock')return <SecurityScreen mode="lock" onUnlock={unlock}/>;
            return <App key={nonce}/>;
        };

        class AYErrorBoundary extends React.Component {
            constructor(props){ super(props); this.state={error:null}; }
            static getDerivedStateFromError(error){ return {error}; }
            componentDidCatch(error,info){ console.error('AnbarYar UI Error:',error,info); }
            render(){
                if(this.state.error){
                    return <div dir="rtl" className="min-h-screen bg-slate-50 p-6 font-[Vazirmatn]"><div className="max-w-2xl mx-auto bg-white border border-red-200 rounded-3xl shadow-xl p-6"><div className="flex items-center gap-3 mb-3"><div className="w-10 h-10 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center"><AlertTriangle size={22}/></div><div><h2 className="font-black text-slate-800">این بخش با خطا مواجه شد</h2><p className="text-xs text-slate-400">صفحه سفید نمی‌شود؛ خطا را می‌توان دوباره بارگذاری کرد.</p></div></div><div className="bg-slate-950 text-red-200 rounded-2xl p-4 text-xs leading-6 overflow-auto">{String(this.state.error?.message||this.state.error)}</div><div className="flex gap-2 mt-4"><button onClick={()=>this.setState({error:null})} className="flex-1 bg-indigo-600 text-white rounded-xl py-3 font-bold">تلاش دوباره</button><button onClick={()=>window.location.reload()} className="flex-1 border border-slate-200 rounded-xl py-3 font-bold text-slate-600">بارگذاری مجدد</button></div></div></div>;
                }
                return this.props.children;
            }
        };

