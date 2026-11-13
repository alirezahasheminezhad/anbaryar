//## ═══ app/02-toast-confirm.jsx ═══
//## سیستم Toast و مودال تأیید سفارشی (جایگزین window.confirm، با شمارش معکوس).
//## ترتیب فایل‌ها در build.py مهم است؛ همه‌ی بخش‌ها یک scope مشترک دارند.
        // --- Toast (Snackbar) System ---
        const ToastContext = React.createContext(null);
        const ToastProvider = ({ children }) => {
            const [toasts, setToasts] = React.useState([]);
            const show = (msg, action, duration = 4000) => {
                const id = generateId();
                setToasts(prev => [...prev, { id, msg, action, exiting: false }]);
                setTimeout(() => {
                    setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t));
                    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 350);
                }, duration);
                return id;
            };
            const dismiss = (id) => {
                setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t));
                setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 350);
            };
            React.useEffect(() => {
                const onToast = (e) => { const d = e.detail || {}; if (d.msg) show(d.msg, d.action, d.duration); };
                window.addEventListener('anbaryar:toast', onToast);
                return () => window.removeEventListener('anbaryar:toast', onToast);
            }, []);
            return (
                <ToastContext.Provider value={{ show, dismiss }}>
                    {children}
                    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-2 items-center no-print">
                        {toasts.map(t => (
                            <div key={t.id} className={`flex items-center gap-3 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl text-sm font-medium min-w-[260px] max-w-sm ${t.exiting ? 'toast-exit' : 'toast-enter'}`}>
                                <span className="flex-1">{t.msg}</span>
                                {t.action && (
                                    <button onClick={() => { t.action.fn(); dismiss(t.id); }} className="text-indigo-300 hover:text-white font-bold text-xs border border-indigo-400 px-2 py-1 rounded-lg whitespace-nowrap">{t.action.label}</button>
                                )}
                                <button onClick={() => dismiss(t.id)} className="text-slate-400 hover:text-white"><X size={14}/></button>
                            </div>
                        ))}
                    </div>
                </ToastContext.Provider>
            );
        };
        const useToast = () => React.useContext(ToastContext);

        // --- Confirm Modal System (جایگزین window.confirm بومی مرورگر، هماهنگ با ظاهر برنامه) ---
        const ConfirmContext = React.createContext(null);
        const ConfirmDialog = ({ state, secondsLeft, onResult }) => {
            const dialogRef = useDialogA11y(() => onResult(false));
            return (
                <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm z-[10000] flex items-center justify-center p-4 no-print" onMouseDown={e => { if (e.target === e.currentTarget) onResult(false); }}>
                    <div ref={dialogRef} aria-label="تأیید عملیات" className="bg-white rounded-2xl p-5 w-full max-w-sm shadow-2xl animate-in" onClick={e => e.stopPropagation()}>
                        <div className="flex items-start gap-3 mb-4">
                            <div className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center ${state.danger ? 'bg-red-100 text-red-600' : 'bg-indigo-100 text-indigo-600'}`}>
                                <AlertTriangle size={18}/>
                            </div>
                            <p className="text-sm text-slate-700 leading-relaxed pt-1">{state.message}</p>
                        </div>
                        <div className="flex gap-2 justify-end">
                            <button onClick={() => onResult(false)} className="px-4 py-2 rounded-xl text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition">انصراف</button>
                            <button
                                onClick={() => secondsLeft <= 0 && onResult(true)}
                                disabled={secondsLeft > 0}
                                className={`px-4 py-2 rounded-xl text-sm font-bold text-white transition flex items-center gap-1.5 ${secondsLeft > 0 ? 'bg-slate-300 cursor-not-allowed' : (state.danger ? 'bg-red-600 hover:bg-red-700' : 'bg-indigo-600 hover:bg-indigo-700')}`}
                            >
                                {secondsLeft > 0 ? <><Clock size={14}/> تایید ({secondsLeft})</> : 'تایید'}
                            </button>
                        </div>
                    </div>
                </div>
            );
        };
        const ConfirmProvider = ({ children }) => {
            const [state, setState] = useState(null); // { message, resolve, danger, countdown }
            const [secondsLeft, setSecondsLeft] = useState(0);
            const confirmAction = (message, opts = {}) => {
                return new Promise((resolve) => {
                    // opts.countdown: تعداد ثانیه‌ای که دکمه‌ی «تایید» قفل می‌ماند تا حذف/لغو تصادفی و عجولانه رخ ندهد
                    setState({ message, resolve, danger: opts.danger !== false, countdown: opts.countdown || 0 });
                    setSecondsLeft(opts.countdown || 0);
                });
            };
            const handle = (result) => {
                if (state) state.resolve(result);
                setState(null);
            };
            useEffect(() => {
                if (!state || secondsLeft <= 0) return;
                const t = setTimeout(() => setSecondsLeft(s => s - 1), 1000);
                return () => clearTimeout(t);
            }, [state, secondsLeft]);
            return (
                <ConfirmContext.Provider value={confirmAction}>
                    {children}
                    {state && <ConfirmDialog state={state} secondsLeft={secondsLeft} onResult={handle} />}
                </ConfirmContext.Provider>
            );
        };
        const useConfirm = () => React.useContext(ConfirmContext);

        // قابِ مشترک برای مودال‌هایی که درونِ JSX والد رندر می‌شوند (نه کامپوننتِ مستقل):
        // همان دسترس‌پذیریِ useDialogA11y را می‌دهد بدونِ نقضِ قواعدِ hook در callback/شرط.
        const DialogFrame = ({ onClose, backdropClassName, panelClassName, label, closeOnBackdrop = true, children }) => {
            const dialogRef = useDialogA11y(onClose);
            return (
                <div className={backdropClassName} onMouseDown={closeOnBackdrop ? (e => { if (e.target === e.currentTarget && onClose) onClose(); }) : undefined}>
                    <div ref={dialogRef} aria-label={label} className={panelClassName} onClick={e => e.stopPropagation()}>{children}</div>
                </div>
            );
        };

