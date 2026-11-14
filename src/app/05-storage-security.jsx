//## ═══ app/05-storage-security.jsx ═══
//## ذخیره‌سازی (localStorage + IndexedDB رمزنگاری‌شده)، قفل امنیتی، تنظیمات، loadData/saveData.
//## ترتیب فایل‌ها در build.py مهم است؛ همه‌ی بخش‌ها یک scope مشترک دارند.
        const STORAGE_KEY = 'anbaryar_pro_v5';
        const SETTINGS_KEY = 'anbaryar_settings_v1';
        const SECURITY_KEY = 'anbaryar_security_v2';
        const IDB_NAME = 'AnbarYarDB';
        const IDB_STORE = 'app';
        const IDB_DATA_KEY = 'secure-data';
        const IDB_FALLBACK_KEY = 'plain-data-fallback';
        const APP_SCHEMA_VERSION = 11;
        const APP_BUILD = '10.12-pwa-icons';

        // ------------------------------------------------------------------
        // امنیت و ذخیره‌سازی محلی، IndexedDB
        // این لایه طوری اضافه شده که ظاهر و منطق فعلی برنامه دست‌نخورده بماند.
        // localStorage برای سازگاری نسخه‌های قدیمی نگه داشته شده، اما بعد از
        // تعریف رمز، دیتای اصلی به‌صورت رمزنگاری‌شده در IndexedDB نگهداری می‌شود.
        // ------------------------------------------------------------------
        const AY_SECURITY = { key: null, unlocked: false };
        const textEncoder = new TextEncoder();
        const textDecoder = new TextDecoder();
        const b64 = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes)));
        const unb64 = (str) => Uint8Array.from(atob(str), c => c.charCodeAt(0));
        const randomB64 = (n=16) => b64(crypto.getRandomValues(new Uint8Array(n)));

        const openAYDB = () => new Promise((resolve, reject) => {
            if (!('indexedDB' in window)) return reject(new Error('IndexedDB در این مرورگر در دسترس نیست.'));
            const req = indexedDB.open(IDB_NAME, 1);
            req.onupgradeneeded = () => {
                const db = req.result;
                if (!db.objectStoreNames.contains(IDB_STORE)) db.createObjectStore(IDB_STORE);
            };
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error || new Error('خطا در IndexedDB'));
        });
        const idbPut = async (key, value) => {
            const db = await openAYDB();
            await new Promise((resolve, reject) => {
                const tx = db.transaction(IDB_STORE, 'readwrite');
                tx.objectStore(IDB_STORE).put(value, key);
                tx.oncomplete = resolve; tx.onerror = () => reject(tx.error);
            });
            db.close();
        };
        const idbGet = async (key) => {
            const db = await openAYDB();
            const value = await new Promise((resolve, reject) => {
                const tx = db.transaction(IDB_STORE, 'readonly');
                const req = tx.objectStore(IDB_STORE).get(key);
                req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error);
            });
            db.close(); return value;
        };

        const deriveAYKey = async (password, saltB64) => {
            const base = await crypto.subtle.importKey('raw', textEncoder.encode(password), 'PBKDF2', false, ['deriveKey','deriveBits']);
            const salt = unb64(saltB64);
            return crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:150000,hash:'SHA-256'}, base, {name:'AES-GCM',length:256}, true, ['encrypt','decrypt']);
        };
        const passwordVerifier = async (password, saltB64) => {
            const base = await crypto.subtle.importKey('raw', textEncoder.encode(password), 'PBKDF2', false, ['deriveBits']);
            const bits = await crypto.subtle.deriveBits({name:'PBKDF2',salt:unb64(saltB64),iterations:150000,hash:'SHA-256'}, base, 256);
            return b64(bits);
        };
        const encryptAY = async (value, key = AY_SECURITY.key) => {
            if (!key) throw new Error('کلید رمزنگاری آماده نیست.');
            const iv = crypto.getRandomValues(new Uint8Array(12));
            const encoded = textEncoder.encode(JSON.stringify(value));
            const cipher = await crypto.subtle.encrypt({name:'AES-GCM',iv}, key, encoded);
            return { v: 1, iv: b64(iv), data: b64(cipher) };
        };
        const decryptAY = async (envelope, key = AY_SECURITY.key) => {
            if (!key || !envelope) throw new Error('اطلاعات رمزنگاری ناقص است.');
            const plain = await crypto.subtle.decrypt({name:'AES-GCM',iv:unb64(envelope.iv)}, key, unb64(envelope.data));
            return JSON.parse(textDecoder.decode(plain));
        };
        const getSecurityConfig = () => { try { return JSON.parse(localStorage.getItem(SECURITY_KEY) || 'null'); } catch(e) { return null; } };
        const TRUSTED_UNLOCK_KEY = 'anbaryar_trusted_unlock_v1';
        const TRUSTED_UNLOCK_TTL = 30 * 60 * 1000;
        const rememberTrustedUnlock = async (key, minutes = loadSettings().autoLockMinutes) => {
            try {
                const ttlMinutes = Number(minutes);
                // حالت دستی: هیچ زمان انقضایی ذخیره نشود و بعد از Refresh هم رمز دوباره لازم باشد.
                if (!Number.isFinite(ttlMinutes) || ttlMinutes <= 0) { clearTrustedUnlock(); return; }
                const raw = await crypto.subtle.exportKey('raw', key);
                const ttl = ttlMinutes * 60 * 1000;
                // کلیدِ ورود سریع در sessionStorage می‌ماند نه localStorage: با Refreshِ همین تب
                // باز می‌ماند ولی با بستنِ تب/مرورگر پاک می‌شود و روی دیسک ذخیره نمی‌گردد.
                sessionStorage.setItem(TRUSTED_UNLOCK_KEY, JSON.stringify({ v: 4, until: Date.now() + ttl, key: b64(raw) }));
            } catch (e) { console.warn('فعال‌سازی ورود سریع موقت انجام نشد:', e); }
        };
        const clearTrustedUnlock = () => { try { sessionStorage.removeItem(TRUSTED_UNLOCK_KEY); } catch(e) {} try { localStorage.removeItem(TRUSTED_UNLOCK_KEY); } catch(e) {} };
        const restoreTrustedUnlock = async () => {
            try {
                const rec = JSON.parse(sessionStorage.getItem(TRUSTED_UNLOCK_KEY) || 'null');
                if (!rec || !rec.key || Number(rec.until) <= Date.now()) { clearTrustedUnlock(); return false; }
                AY_SECURITY.key = await crypto.subtle.importKey('raw', unb64(rec.key), {name:'AES-GCM'}, true, ['encrypt','decrypt']);
                AY_SECURITY.unlocked = true;
                return true;
            } catch(e) { clearTrustedUnlock(); return false; }
        };
        const trustedUnlockRemaining = () => { try { const r=JSON.parse(sessionStorage.getItem(TRUSTED_UNLOCK_KEY)||'null'); return Math.max(0, Number(r?.until||0)-Date.now()); } catch(e) { return 0; } };
        const makeDataPayload = (items, invoices, notes, transactions, purchases, processingOrders, consignments) => ({
            schemaVersion: APP_SCHEMA_VERSION, appBuild: APP_BUILD, updatedAt: new Date().toISOString(),
            items, invoices, notes, transactions, purchases, processingOrders, consignments
        });
        const normalizeData = (data) => {
            if (!data) return { items: [], invoices: [], notes: [], transactions: [], purchases: [], processingOrders: [], consignments: [] };
            if (typeof data.notes === 'string') data.notes = data.notes ? [{ id: generateId(), title:'یادداشت', text: data.notes, isDone: false, date: Date.now(), priority:'normal', tags:[] }] : [];
            data.notes = (data.notes||[]).map(n=>({...n, title:n.title||n.text?.slice(0,40)||'یادداشت', priority:n.priority||'normal', tags:n.tags||[], subtasks:n.subtasks||[], pinned:!!n.pinned, archived:!!n.archived}));
            data.purchases = (data.purchases||[]).map(x=>({...x, priority:x.priority||'normal'}));
            data.consignments = (data.consignments||[]).map(x=>({...x, priority:x.priority||'normal'}));
            return { items:data.items||[], invoices:data.invoices||[], notes:data.notes||[], transactions:data.transactions||[], purchases:data.purchases||[], processingOrders:data.processingOrders||[], consignments:data.consignments||[] };
        };

        const saveSettings = (settings) => { try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch(e) {} };
        const loadSettings = () => {
            const defaults = { loadingCostPerTon: 200000, loadingWeightIncrementKg: 1000, loadingWeightRoundUpThreshold: 0.9, loadingMinWeightEnabled: false, loadingMinWeightKg: 1000, lowStockThreshold: 100, standardNotices: [], warehouses: [], criticalMutes: {}, criticalGroups: [], autoLockMinutes: 30, mahakMappings: {}, mahakLastSync: null,
                // موجودی کیسه‌ی مادر (خالی) به تفکیک رنگ/محصول — خودِ انبار اصلی این را به حساب نمی‌آورد؛
                // صرفاً برای اینکه بشود دید چند کیسه‌ی مادر خالی برای هر محصول داری و هنگام تأیید ارسال
                // هشدار کسری بدهد. خرید = افزایش qty، مصرف هنگام تأیید ارسال = کاهش qty.
                motherBagStock: [
                    { id:'mbs1', color:'زرد', colorHex:'#f2c200', product:'زردچوبه سابیده', qty:0, descriptionEnabled:true, descriptionTemplate:'معادل {COUNT} کیسه مادر {KG} کیلویی' },
                    { id:'mbs2', color:'قرمز', colorHex:'#c81e1e', product:'فلفل قرمز سابیده', qty:0, descriptionEnabled:true, descriptionTemplate:'معادل {COUNT} کیسه مادر {KG} کیلویی' },
                    { id:'mbs3', color:'فلفل قرمز روشن (کم‌رنگ)', colorHex:'#e8a0a0', product:'دارچین سابیده', qty:0, descriptionEnabled:true, descriptionTemplate:'معادل {COUNT} کیسه مادر {KG} کیلویی' },
                    { id:'mbs4', color:'سفید شیری', colorHex:'#f5f0e6', product:'زنجبیل سابیده', qty:0, descriptionEnabled:true, descriptionTemplate:'معادل {COUNT} کیسه مادر {KG} کیلویی' },
                    { id:'mbs5', color:'فلفل شیشه‌ای', colorHex:'#8a8f98', product:'فلفل سیاه سابیده', qty:0, descriptionEnabled:true, descriptionTemplate:'معادل {COUNT} کیسه مادر {KG} کیلویی' }
                ]
            };
            // migrateMotherBagStockRow: برای کسانی که از قبل موجودی کیسه مادر ثبت کرده بودند (نسخه‌ی قبلی که
            // هنوز فیلدهای descriptionEnabled/descriptionTemplate را نداشت)، همین‌جا این دو فیلد با مقدار
            // پیش‌فرض (روشن + قالب پیش‌فرض) به هر ردیفِ قدیمی اضافه می‌شود تا داده‌ی قبلی از دست نرود.
            const migrateMotherBagStockRow = (r) => ({
                bagKg: 5, motherKg: 30,
                descriptionEnabled: true,
                descriptionTemplate: DEFAULT_MOTHER_BAG_TEMPLATE,
                ...r,
            });
            try {
                const d = localStorage.getItem(SETTINGS_KEY);
                if (d) {
                    const merged = { ...defaults, ...JSON.parse(d) };
                    merged.motherBagStock = (merged.motherBagStock && merged.motherBagStock.length ? merged.motherBagStock : defaults.motherBagStock).map(migrateMotherBagStockRow);
                    return merged;
                }
            } catch(e) {}
            return defaults;
        };

        const loadData = () => {
            try { return normalizeData(JSON.parse(localStorage.getItem(STORAGE_KEY))); }
            catch (e) { return normalizeData(null); }
        };
        const loadDataSecure = async () => {
            try {
                if (AY_SECURITY.key) {
                    const envelope = await idbGet(IDB_DATA_KEY);
                    if (envelope) return normalizeData(await decryptAY(envelope));
                }
            } catch(e) { console.warn('خطا در خواندن دیتای امن:', e); }
            // مسیر پایدار دوم: اگر رمز/کلید آماده نبود یا localStorage جا نداشت،
            // داده خام معتبر در IndexedDB نگه داشته می‌شود.
            try {
                const fallback = await idbGet(IDB_FALLBACK_KEY);
                if (fallback) return normalizeData(fallback);
            } catch(e) { console.warn('خطا در خواندن پشتیبان IndexedDB:', e); }
            return loadData();
        };
        const persistSecureData = async (data) => {
            if (!AY_SECURITY.key) return;
            const envelope = await encryptAY(makeDataPayload(...data));
            await idbPut(IDB_DATA_KEY, envelope);
        };
        const migrateLegacyToSecure = async () => {
            const legacy = loadData();
            if (AY_SECURITY.key) {
                await persistSecureData([legacy.items, legacy.invoices, legacy.notes, legacy.transactions, legacy.purchases, legacy.processingOrders, legacy.consignments]);
                try { localStorage.removeItem(STORAGE_KEY); } catch(e) {}
            }
            return legacy;
        };

        // ذخیره‌سازی پایدار و ترتیبی:
        // مشکل نسخه قبل این بود که چند persistSecureData به‌صورت هم‌زمان اجرا می‌شدند
        // و خطای IndexedDB هم از promise خارج می‌شد؛ در نتیجه ممکن بود ذخیره قدیمی
        // بعد از ذخیره جدید نوشته شود یا خطا اصلاً به UI نرسد.
        let AY_SAVE_QUEUE = Promise.resolve();
        let AY_LAST_SAVE_SIGNATURE = '';
        const saveData = (items, invoices, notes, transactions, purchases, processingOrders, consignments) => {
            const payload = makeDataPayload(items, invoices, notes, transactions, purchases, processingOrders, consignments);
            const signature = JSON.stringify({ i:items?.length||0, inv:invoices?.map(x=>[x.id,x.status,x.timestamp]).join(','), tx:transactions?.length||0, t:Date.now() });
            AY_LAST_SAVE_SIGNATURE = signature;
            // حتی اگر ذخیره قبلی خطا داده باشد، صف جدید نباید برای همیشه خراب بماند.
            AY_SAVE_QUEUE = AY_SAVE_QUEUE.catch(() => {}).then(async () => {
                try { localStorage.setItem('anbaryar_local_updated_at', payload.updatedAt); } catch(e) {}
                const dataArgs = [items, invoices, notes, transactions, purchases, processingOrders, consignments];
                let saved = false;
                let secureError = null;
                if (AY_SECURITY.key) {
                    try {
                        await persistSecureData(dataArgs);
                        const check = await idbGet(IDB_DATA_KEY);
                        if (!check) throw new Error('رکورد امن قابل بازیابی نیست.');
                        saved = true;
                    } catch (err) { secureError = err; console.warn('ذخیره امن ناموفق بود:', err); }
                }
                // مسیر دوم: IndexedDB بدون وابستگی به localStorage و بدون کلید بکاپ خارجی.
                if (!saved) {
                    try {
                        await idbPut(IDB_FALLBACK_KEY, payload);
                        const check = await idbGet(IDB_FALLBACK_KEY);
                        if (!check) throw new Error('پشتیبان IndexedDB قابل بازیابی نیست.');
                        saved = true;
                    } catch (idbErr) { console.warn('ذخیره پشتیبان IndexedDB ناموفق بود:', idbErr); }
                }
                // localStorage فقط مسیر سوم است؛ پر بودن آن نباید داده‌ای را که در IDB ذخیره شده خراب کند.
                if (saved) {
                    if (AY_SECURITY.key) {
                        // وقتی رمزنگاری فعال است، نسخه‌ی متن‌ساده در localStorage نوشته نمی‌شود؛
                        // نوشتنِ آن کلِ رمزنگاری را خنثی می‌کرد. آینه‌ی قدیمیِ به‌جامانده هم پاک می‌شود.
                        try { localStorage.removeItem(STORAGE_KEY); } catch(e) {}
                    } else {
                        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(payload)); } catch (mirrorErr) { console.warn('کپی localStorage انجام نشد:', mirrorErr); }
                    }
                    return true;
                }
                try {
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
                    return true;
                } catch (fallbackErr) {
                    throw new Error('هیچ‌کدام از مسیرهای ذخیره‌سازی در دسترس نبودند. IndexedDB: ' + (secureError?.message || 'ناموفق') + ' | localStorage: ' + (fallbackErr?.message || 'ناموفق'));
                }
            });
            return AY_SAVE_QUEUE;
        };
