//## ═══ app/31-live-sync.js ═══
//## همگام‌سازی زنده‌ی چنددستگاهی، هشدار «چند دستگاه فعال» و تعویض امن حساب Google/ایمیل.
//## افزونه‌ای روی AY_CLOUD است؛ منطق انبار/مالی و ذخیره‌سازی اصلی را تغییر نمی‌دهد.
//## ترتیب در build.py: بعد از 30-cloud-backup.js و قبل از 29-boot.jsx (که منتظر AY_LIVE.ready می‌ماند).
const AY_LIVE = (() => {
    const isBridge = new URLSearchParams(window.location.search).has('ay_auth_bridge');
    const LIVE_BUILD = '10.25-live-sync';
    const DEVICE_KEY = 'anbaryar_cloud_device_id';
    const OWNER_KEY = 'anbary_cloud_sync_owner';
    const REV_KEY = 'anbary_cloud_sync_revision';
    const META_KEY = 'anbaryar_live_owner_meta_v1';     // {owners:{id:{anon,email,seen}}, lastReal:id}
    const PENDING_KEY = 'anbaryar_live_pending_switch_v1';
    const STASH_PREFIX = 'ay_stash:';
    const SYNC_MARKERS = ['anbary_cloud_sync_owner', 'anbary_cloud_sync_revision', 'anbary_cloud_sync_local_updated_at', 'anbary_cloud_sync_force_dirty'];
    // کلیدهایی که «دیتابیس همین حساب» را نگه می‌دارند؛ فقط همین‌ها هنگام تعویض حساب کنار گذاشته می‌شوند.
    const DATA_LS_KEYS = [STORAGE_KEY, SETTINGS_KEY, 'freightAppData_v2', 'autoBackup', 'anbary_local_updated_at', 'anbaryar_local_updated_at'];
    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
    const faNum = (n) => Number(n).toLocaleString('fa-IR');
    const state = { running: false, devices: [], revision: 0 };

    // ───────────── هویت دستگاه ─────────────
    const deviceId = () => {
        let id = localStorage.getItem(DEVICE_KEY);
        if (!id) {
            id = (window.crypto?.randomUUID ? crypto.randomUUID() : 'ay-' + Date.now() + '-' + Math.random().toString(36).slice(2));
            localStorage.setItem(DEVICE_KEY, id);
        }
        return id;
    };
    const deviceLabel = () => {
        const ua = navigator.userAgent || '';
        const os = /Windows/i.test(ua) ? 'ویندوز' : /Android/i.test(ua) ? 'اندروید' : /iPhone|iPad|iOS/i.test(ua) ? 'iOS' : /Mac OS/i.test(ua) ? 'مک' : /Linux/i.test(ua) ? 'لینوکس' : 'دستگاه';
        const browser = /Edg\//.test(ua) ? 'Edge' : /OPR\//.test(ua) ? 'Opera' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : 'مرورگر';
        return os + ' · ' + browser + (window.location.protocol === 'file:' ? ' · آفلاین' : '');
    };

    // ───────────── نشست Supabase (از همان localStorage که supabase-js می‌نویسد) ─────────────
    const readSession = () => {
        try {
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && /^sb-.*-auth-token$/.test(key)) {
                    const value = JSON.parse(localStorage.getItem(key) || 'null');
                    const session = value?.currentSession || value;
                    if (session?.access_token) return session;
                }
            }
        } catch (_) {}
        return null;
    };
    const getToken = async (forceRefresh = false) => {
        let session = readSession();
        const expires = Number(session?.expires_at || 0) * 1000;
        if (!session || forceRefresh || (expires && expires - Date.now() < 30000)) {
            // هر فراخوانی AY_CLOUD از session() می‌گذرد و در صورت نیاز توکن را تمدید می‌کند.
            try { await AY_CLOUD.syncMeta(); } catch (_) {}
            session = readSession();
        }
        return session?.access_token || null;
    };

    // ───────────── نشانگر کوچک وضعیت زنده ─────────────
    let pill = null;
    const renderPill = (othersCount) => {
        if (isBridge || !document.body) return;
        if (!pill) {
            pill = document.createElement('div');
            pill.id = 'ay-live-pill';
            pill.dir = 'rtl';
            pill.style.cssText = 'position:fixed;left:12px;bottom:12px;z-index:40;font:600 12px Vazirmatn,Tahoma,sans-serif;padding:6px 12px;border-radius:999px;color:#fff;box-shadow:0 4px 14px rgba(15,23,42,.3);pointer-events:none;opacity:.92';
            const style = document.createElement('style');
            style.textContent = '@media print{#ay-live-pill{display:none!important}}';
            document.head.appendChild(style);
            document.body.appendChild(pill);
        }
        pill.style.display = '';
        if (othersCount > 0) {
            pill.textContent = '● ' + faNum(othersCount + 1) + ' دستگاه فعال روی این حساب';
            pill.style.background = '#b45309';
        } else {
            pill.textContent = '● همگام‌سازی زنده فعال';
            pill.style.background = '#0f766e';
        }
    };
    const hidePill = () => { if (pill) pill.style.display = 'none'; };

    // ───────────── هشدار هم‌زمانیِ چند دستگاه ─────────────
    let lastPresenceKey = '';
    const announcePresence = (others) => {
        const key = others.map(d => d.deviceId).sort().join('|');
        if (key === lastPresenceKey) return;
        lastPresenceKey = key;
        if (!others.length) return;
        const names = others.map(d => d.label || 'دستگاه دیگر').join('، ');
        notifyToast('این حساب هم‌اکنون روی ' + faNum(others.length + 1) + ' دستگاه باز است (' + names + '). تغییرها در لحظه همگام می‌شوند؛ یک فاکتور یا کالا را هم‌زمان روی دو دستگاه ویرایش نکن.', null, 12000);
    };

    // ───────────── دریافت تغییرات دستگاه دیگر ─────────────
    let lastActedRevision = 0;
    const pullRemote = async (targetRevision) => {
        for (let attempt = 0; attempt < 4; attempt++) {
            if (Number(localStorage.getItem(REV_KEY) || 0) >= targetRevision) {
                notifyToast('تغییرات دستگاه دیگر دریافت و اعمال شد.', null, 3500);
                return;
            }
            // کنترلر هم‌گام‌سازی برنامه روی focus همان مسیر poll را اجرا می‌کند (بدون دست‌زدن به منطق آن).
            window.dispatchEvent(new Event('focus'));
            await sleep(2500);
        }
    };
    const handleLive = async (data) => {
        const devices = Array.isArray(data.devices) ? data.devices : [];
        state.devices = devices;
        state.revision = Number(data.revision || 0);
        const me = deviceId();
        const others = devices.filter(d => d.deviceId !== me);
        announcePresence(others);
        renderPill(others.length);
        if (!data.changed) return;
        const session = readSession();
        const sameOwner = !!session?.user?.id && localStorage.getItem(OWNER_KEY) === session.user.id;
        if (!sameOwner) return;
        if (data.writer && data.writer === me) return;
        if (Number(localStorage.getItem(REV_KEY) || 0) >= Number(data.revision || 0)) return;
        if (Number(data.revision) === lastActedRevision) return;
        lastActedRevision = Number(data.revision);
        await pullRemote(lastActedRevision);
    };

    // ───────────── حلقه‌ی long-poll ─────────────
    let controller = null;
    const canRun = () => !isBridge && navigator.onLine && document.visibilityState === 'visible' && !!readSession();
    const liveRequest = async (since, signal) => {
        const call = (token) => fetch(AY_CLOUD_FUNCTION, {
            method: 'POST', signal,
            headers: { 'apikey': AY_CLOUD_KEY, 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'live', since, deviceId: deviceId(), label: deviceLabel(), build: LIVE_BUILD })
        });
        let token = await getToken();
        if (!token) return null;
        let response = await call(token);
        if (response.status === 401) {
            token = await getToken(true);
            if (!token) return null;
            response = await call(token);
        }
        if (!response.ok) throw new Error('live ' + response.status);
        return await response.json();
    };
    const run = async () => {
        let failures = 0;
        let lastSeenRevision = -1;
        try {
            while (canRun()) {
                controller = new AbortController();
                try {
                    const session = readSession();
                    const sameOwner = !!session?.user?.id && localStorage.getItem(OWNER_KEY) === session.user.id;
                    const since = sameOwner ? Number(localStorage.getItem(REV_KEY) || 0) : 0;
                    const data = await liveRequest(since, controller.signal);
                    if (!data) { await sleep(5000); continue; }
                    failures = 0;
                    const repeated = !!data.changed && Number(data.revision) === lastSeenRevision;
                    lastSeenRevision = Number(data.revision);
                    await handleLive(data);
                    // تغییر هنوز اعمال نشده (مثلاً تعارض باز است): حلقه‌ی داغ نساز.
                    if (repeated) await sleep(8000);
                } catch (err) {
                    if (err?.name === 'AbortError') continue;
                    failures += 1;
                    await sleep(Math.min(30000, 2000 * Math.pow(2, failures)));
                }
            }
        } finally {
            state.running = false;
            hidePill();
        }
    };
    const start = () => { if (!state.running && canRun()) { state.running = true; run(); } };
    const stop = () => { try { controller?.abort(); } catch (_) {} };

    // ───────────── تعویض امن حساب ─────────────
    const readMeta = () => {
        try {
            const value = JSON.parse(localStorage.getItem(META_KEY) || '{}') || {};
            return { owners: value.owners || {}, lastReal: value.lastReal || '' };
        } catch (_) { return { owners: {}, lastReal: '' }; }
    };
    const writeMeta = (meta) => {
        try {
            const ids = Object.keys(meta.owners);
            if (ids.length > 12) ids.sort((a, b) => (meta.owners[a].seen || 0) - (meta.owners[b].seen || 0))
                .slice(0, ids.length - 12).forEach(id => delete meta.owners[id]);
            localStorage.setItem(META_KEY, JSON.stringify(meta));
        } catch (_) {}
    };
    const readStore = async (dbName, storeName) => {
        try {
            if (!window.indexedDB) return [];
            const db = await new Promise((resolve, reject) => { const req = indexedDB.open(dbName); req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error); });
            if (!db.objectStoreNames.contains(storeName)) { db.close(); return []; }
            const values = await new Promise((resolve, reject) => { const tx = db.transaction(storeName, 'readonly'); const req = tx.objectStore(storeName).getAll(); req.onsuccess = () => resolve(req.result || []); req.onerror = () => reject(req.error); });
            db.close();
            return values;
        } catch (_) { return []; }
    };
    const clearStore = async (dbName, storeName) => {
        try {
            if (!window.indexedDB) return;
            const db = await new Promise((resolve, reject) => { const req = indexedDB.open(dbName); req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error); });
            if (!db.objectStoreNames.contains(storeName)) { db.close(); return; }
            await new Promise((resolve, reject) => { const tx = db.transaction(storeName, 'readwrite'); tx.objectStore(storeName).clear(); tx.oncomplete = resolve; tx.onerror = () => reject(tx.error); });
            db.close();
        } catch (_) {}
    };
    const idbRemove = async (key) => {
        const db = await openAYDB();
        await new Promise((resolve, reject) => { const tx = db.transaction(IDB_STORE, 'readwrite'); tx.objectStore(IDB_STORE).delete(key); tx.oncomplete = resolve; tx.onerror = () => reject(tx.error); });
        db.close();
    };
    const isUnsynced = () => {
        const updated = localStorage.getItem('anbary_local_updated_at') || '';
        const synced = localStorage.getItem('anbary_cloud_sync_local_updated_at') || '';
        return !!localStorage.getItem('anbary_cloud_sync_force_dirty') || (!!updated && updated !== synced);
    };
    const showOverlay = (text) => {
        if (!document.body) return;
        const box = document.createElement('div');
        box.id = 'ay-live-switch-overlay';
        box.dir = 'rtl';
        box.style.cssText = 'position:fixed;inset:0;z-index:2147483000;background:rgba(15,23,42,.88);color:#fff;display:flex;align-items:center;justify-content:center;font:700 16px Vazirmatn,Tahoma,sans-serif;text-align:center;padding:24px;line-height:2';
        box.textContent = text;
        document.body.appendChild(box);
    };
    const downloadStash = (stash, label) => {
        try {
            const blob = new Blob([JSON.stringify(stash)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'AnbarYar-AccountSwitch-' + String(label || 'old').replace(/[^\w.@-]+/g, '_') + '-' + new Date().toISOString().slice(0, 10) + '.json';
            document.body.appendChild(a); a.click(); a.remove();
            setTimeout(() => URL.revokeObjectURL(url), 4000);
        } catch (_) {}
    };
    // مرحله‌ی ۱ (همین‌جا): نسخه‌ی امن حساب قبلی ذخیره و تأیید می‌شود، سپس صفحه رفرش می‌شود.
    // مرحله‌ی ۲ (بعد از رفرش، قبل از رندر برنامه): داده‌ی محلی پاک می‌شود تا ذخیره‌ی پس‌زمینه‌ی state قدیمی آن را برنگرداند.
    const requestSwitch = async (prevId, prevMeta, nextUser) => {
        showOverlay('در حال تعویض حساب… داده‌های حساب قبلی امن نگه‌داری و اطلاعات حساب جدید بارگذاری می‌شود.');
        try {
            const ls = {};
            DATA_LS_KEYS.forEach(key => { const v = localStorage.getItem(key); if (v != null) ls[key] = v; });
            let secure = null, fallback = null;
            try { secure = await idbGet(IDB_DATA_KEY); } catch (_) {}
            try { fallback = await idbGet(IDB_FALLBACK_KEY); } catch (_) {}
            const stash = {
                v: 1, ownerId: prevId, email: prevMeta?.email || '', savedAt: new Date().toISOString(),
                unsynced: isUnsynced(), localStorage: ls, secure, fallback,
                invDb: { products: await readStore('InvDB_v4', 'products'), history: await readStore('InvDB_v4', 'history') }
            };
            await idbPut(STASH_PREFIX + prevId, stash);
            const check = await idbGet(STASH_PREFIX + prevId);
            if (!check || check.savedAt !== stash.savedAt) throw new Error('نسخه‌ی امن حساب قبلی تأیید نشد.');
            if (stash.unsynced) downloadStash(stash, prevMeta?.email || prevId.slice(0, 8));
            localStorage.setItem(PENDING_KEY, JSON.stringify({ prevId, nextId: nextUser.id, email: nextUser.email || '', at: Date.now() }));
            window.location.reload();
            await sleep(15000);   // هیچ ادامه‌ای از همگام‌سازی قدیمی نباید اجرا شود (داده‌ی حساب قبلی به حساب جدید نرود).
        } catch (err) {
            console.warn('تعویض خودکار حساب انجام نشد:', err);
            document.getElementById('ay-live-switch-overlay')?.remove();
            notifyToast('تعویض خودکار حساب انجام نشد؛ داده‌های این دستگاه دست‌نخورده ماند.', null, 9000);
        }
    };
    const onAccount = async (account) => {
        const user = account?.user;
        if (!user?.id || isBridge) return;
        const meta = readMeta();
        const prevId = localStorage.getItem(OWNER_KEY) || '';
        const anon = !!user.is_anonymous;
        const hadPrevious = !!meta.owners[user.id];
        meta.owners[user.id] = { anon, email: user.email || user.user_metadata?.email || '', seen: Date.now() };
        // دستگاه تا حالا برای حساب واقعی دیگری استفاده شده و حالا حساب واقعیِ متفاوتی وارد شده → دیتابیس حساب جدید.
        const oldReal = meta.lastReal;
        const switching = !anon && !!oldReal && oldReal !== user.id && prevId !== user.id;
        const prevMeta = meta.owners[oldReal] || {};
        if (!anon) meta.lastReal = user.id;
        writeMeta(meta);
        start();
        if (switching) await requestSwitch(oldReal, prevMeta, user);
        return hadPrevious;
    };
    if (!isBridge && AY_CLOUD && typeof AY_CLOUD.account === 'function') {
        const originalAccount = AY_CLOUD.account.bind(AY_CLOUD);
        AY_CLOUD.account = async (...args) => {
            const account = await originalAccount(...args);
            try { await onAccount(account); } catch (err) { console.warn('Live account hook failed:', err); }
            return account;
        };
    }

    // ───────────── آماده‌سازی قبل از رندر ─────────────
    const ready = (async () => {
        if (isBridge) return;
        let pending = null;
        try { pending = JSON.parse(localStorage.getItem(PENDING_KEY) || 'null'); } catch (_) {}
        localStorage.removeItem(PENDING_KEY);   // همیشه پاک می‌شود تا حلقه‌ی رفرش ایجاد نشود
        if (!pending || Date.now() - Number(pending.at || 0) > 10 * 60 * 1000) return;
        try {
            DATA_LS_KEYS.forEach(key => localStorage.removeItem(key));
            SYNC_MARKERS.forEach(key => localStorage.removeItem(key));
            await idbRemove(IDB_DATA_KEY);
            await idbRemove(IDB_FALLBACK_KEY);
            await clearStore('InvDB_v4', 'products');
            await clearStore('InvDB_v4', 'history');
            setTimeout(() => notifyToast('حساب ' + (pending.email || 'جدید') + ' فعال شد؛ اطلاعات همین حساب از فضای ابری بارگذاری می‌شود. نسخه‌ی محلی حساب قبلی نگه‌داری شد.', null, 10000), 3500);
        } catch (err) { console.warn('پاک‌سازی داده‌ی حساب قبلی کامل نشد:', err); }
    })();
    const readyWithTimeout = Promise.race([ready, sleep(6000)]).catch(() => {});

    // ───────────── راه‌اندازی ─────────────
    if (!isBridge) {
        document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') start(); else stop(); });
        window.addEventListener('online', start);
        window.addEventListener('offline', stop);
        setTimeout(start, 2500);
    }
    return { ready: readyWithTimeout, state, start, stop, deviceId, deviceLabel };
})();
