//## ═══ app/29-boot.jsx ═══
//## راه‌اندازی: لاگ خطاها و render ریشه.
//## ترتیب فایل‌ها در build.py مهم است؛ همه‌ی بخش‌ها یک scope مشترک دارند.

        window.addEventListener('error', e => { console.error('AnbarYar runtime error:', e.error || e.message); });
        window.addEventListener('unhandledrejection', e => { console.error('AnbarYar unhandled rejection:', e.reason); });

        // PWA: ثبت service worker فقط روی https (نه file:// و نه localhost) تا نسخه‌ی نصب‌شده آفلاین کار کند.
        if ('serviceWorker' in navigator && location.protocol === 'https:') {
            window.addEventListener('load', () => { navigator.serviceWorker.register('./sw.js').catch(() => {}); });
        }

        const root = createRoot(document.getElementById('root'));
        root.render(<AYErrorBoundary><ToastProvider><ConfirmProvider><SecurityGate /></ConfirmProvider></ToastProvider></AYErrorBoundary>);
