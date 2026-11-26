//## ═══ app/30-cloud-backup.js ═══
//## اتصال ابری اختیاری؛ هسته‌ی برنامه و ذخیره‌سازی محلی بدون اینترنت مستقل می‌مانند.
const AY_CLOUD_URL = 'https://foyttvvpscenkxbobazs.supabase.co';
const AY_CLOUD_KEY = 'sb_publishable_AhAgG-9rYk_PwD3cFjNCAA_bzK06eO2';
const AY_CLOUD_FUNCTION = AY_CLOUD_URL + '/functions/v1/anbaryar-cloud-backup';
const AY_CLOUD_SITE_URL = 'https://alirezahasheminezhad.github.io/anbaryar/';
const AY_CLOUD_SITE_ORIGIN = 'https://alirezahasheminezhad.github.io';
// کلید ابری از رمز دستگاه آغازکننده مشتق می‌شود. برای جلوگیری از درخواست تکراری،
// نسخه‌ی محلیِ کلید با کلید امنیتی همان دستگاه رمز می‌شود و در IndexedDB می‌ماند؛
 // دستگاه دیگر همچنان باید بار اول رمز ابری را وارد کند.
const AY_CLOUD_CRYPTO = { key: null, saltB64: '', hashB64: '' };
const AY_CLOUD_KEY_SESSION_CACHE = 'anbaryar_cloud_key_cache_v1';
const readAyCloudKeySessionCache = () => {
    try {
        const entries = JSON.parse(sessionStorage.getItem(AY_CLOUD_KEY_SESSION_CACHE) || '[]');
        return Array.isArray(entries) ? entries.filter(x => x && x.saltB64 && x.hashB64 && x.keyB64) : [];
    } catch (e) { return []; }
};
const rememberAyCloudKeyForSession = async (key, saltB64, hashB64) => {
    try {
        const raw = await crypto.subtle.exportKey('raw', key);
        const entries = readAyCloudKeySessionCache().filter(x => x.saltB64 !== saltB64 || x.hashB64 !== hashB64);
        entries.push({ v: 1, saltB64, hashB64, keyB64: b64(raw), savedAt: Date.now() });
        // حافظه‌ی نشست برای سرعت؛ نسخه‌ی دائمی فقط به‌صورت رمز‌شده با قفل محلی نگهداری می‌شود.
        sessionStorage.setItem(AY_CLOUD_KEY_SESSION_CACHE, JSON.stringify(entries.slice(-8)));
    } catch (e) { console.warn('ذخیره موقت کلید ابری انجام نشد:', e); }
    await rememberAyCloudKeyForDevice(key, saltB64, hashB64);
};
const restoreAyCloudKeyForSession = async (saltB64, hashB64) => {
    const record = readAyCloudKeySessionCache().find(x => x.saltB64 === saltB64 && x.hashB64 === hashB64);
    if (!record) return null;
    try {
        return await crypto.subtle.importKey('raw', unb64(record.keyB64), { name: 'AES-GCM' }, true, ['encrypt', 'decrypt']);
    } catch (e) {
        console.warn('بازیابی کلید ابری نشست ناموفق بود:', e);
        return null;
    }
};

// کلید مشترک ابری به‌صورت خام روی دیسک نوشته نمی‌شود؛ با کلید امنیتی محلی دستگاه
// پوشانده و در همان IndexedDB برنامه ذخیره می‌شود. با بازکردن قفل محلی، کلید دوباره قابل بازیابی است.
const AY_CLOUD_KEY_DEVICE_CACHE = 'anbaryar_cloud_key_device_cache_v1';
const readAyCloudKeyDeviceCache = async () => {
    try {
        const entries = await idbGet(AY_CLOUD_KEY_DEVICE_CACHE);
        return Array.isArray(entries)
            ? entries.filter(x => x && x.saltB64 && x.hashB64 && x.wrapped?.iv && x.wrapped?.data)
            : [];
    } catch (e) {
        console.warn('خواندن حافظه‌ی امن کلید ابری ناموفق بود:', e);
        return [];
    }
};
const rememberAyCloudKeyForDevice = async (key, saltB64, hashB64) => {
    // بدون قفل محلی، کلید دائمی ذخیره نمی‌شود تا رمزنگاری ابری تضعیف نشود.
    if (!AY_SECURITY?.key || !key || !saltB64 || !hashB64) return false;
    try {
        const keyB64 = b64(await crypto.subtle.exportKey('raw', key));
        const wrapped = await encryptAY({ keyB64 }, AY_SECURITY.key);
        const entries = (await readAyCloudKeyDeviceCache())
            .filter(x => x.saltB64 !== saltB64 || x.hashB64 !== hashB64);
        entries.push({ v: 1, saltB64, hashB64, wrapped, savedAt: Date.now() });
        await idbPut(AY_CLOUD_KEY_DEVICE_CACHE, entries.slice(-8));
        return true;
    } catch (e) {
        console.warn('ذخیره‌ی امن کلید ابری روی همین دستگاه انجام نشد:', e);
        return false;
    }
};
const restoreAyCloudKeyForDevice = async (saltB64, hashB64) => {
    if (!AY_SECURITY?.key) return null;
    const record = (await readAyCloudKeyDeviceCache())
        .find(x => x.saltB64 === saltB64 && x.hashB64 === hashB64);
    if (!record) return null;
    try {
        const payload = await decryptAY(record.wrapped, AY_SECURITY.key);
        if (!payload?.keyB64) return null;
        return await crypto.subtle.importKey('raw', unb64(payload.keyB64), { name: 'AES-GCM' }, true, ['encrypt', 'decrypt']);
    } catch (e) {
        // مثلاً رمز محلی این دستگاه از زمان ذخیره‌ی cache عوض شده است؛ رمز ابری یک‌بار دیگر گرفته می‌شود.
        console.warn('بازیابی کلید ابریِ رمز‌شده با قفل محلی ممکن نشد:', e);
        return null;
    }
};
const restoreLatestAyCloudKeyForDevice = async () => {
    if (AY_CLOUD_CRYPTO.key || !AY_SECURITY?.key) return !!AY_CLOUD_CRYPTO.key;
    const entries = await readAyCloudKeyDeviceCache();
    const record = entries.sort((a, b) => Number(a.savedAt || 0) - Number(b.savedAt || 0)).at(-1);
    if (!record) return false;
    const key = await restoreAyCloudKeyForDevice(record.saltB64, record.hashB64);
    if (!key) return false;
    AY_CLOUD_CRYPTO.key = key;
    AY_CLOUD_CRYPTO.saltB64 = record.saltB64;
    AY_CLOUD_CRYPTO.hashB64 = record.hashB64;
    return true;
};
const restoreLatestAyCloudKeyForSession = async () => {
    if (AY_CLOUD_CRYPTO.key) return true;
    const entries = readAyCloudKeySessionCache();
    const record = entries[entries.length - 1];
    if (!record) return false;
    try {
        AY_CLOUD_CRYPTO.key = await crypto.subtle.importKey('raw', unb64(record.keyB64), { name: 'AES-GCM' }, true, ['encrypt', 'decrypt']);
        AY_CLOUD_CRYPTO.saltB64 = record.saltB64;
        AY_CLOUD_CRYPTO.hashB64 = record.hashB64;
        return true;
    } catch (e) {
        console.warn('بازیابی آخرین کلید ابری نشست ناموفق بود:', e);
        return false;
    }
};

const AY_CLOUD = (() => {
    let clientPromise = null;
    let sessionPromise = null;
    const client = () => {
        if (!clientPromise) clientPromise = import('https://esm.sh/@supabase/supabase-js@2.119.2')
            .then(({ createClient }) => createClient(AY_CLOUD_URL, AY_CLOUD_KEY, {
                auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
            }));
        return clientPromise;
    };
    const session = async () => {
        if (sessionPromise) return await sessionPromise;
        sessionPromise = (async () => {
            const sb = await client();
            let { data: { session } } = await sb.auth.getSession();
            if (!session) {
                const result = await sb.auth.signInAnonymously();
                if (result.error) throw result.error;
                session = result.data.session;
            }
            if (!session?.access_token) throw new Error('ورود ابری انجام نشد.');
            return session;
        })();
        try { return await sessionPromise; }
        finally { sessionPromise = null; }
    };
    const callRaw = async (action, options = {}) => {
        const current = await session();
        const headers = {
            'apikey': AY_CLOUD_KEY,
            'Authorization': 'Bearer ' + current.access_token,
            'Content-Type': 'application/json',
            ...(options.headers || {})
        };
        const response = await fetch(options.url || AY_CLOUD_FUNCTION, {
            method: 'POST', headers,
            body: options.body || JSON.stringify({ action }),
        });
        if (!response.ok) {
            let details = {};
            try { details = await response.json(); } catch(e) {}
            const error = new Error(details.error || 'ارتباط با سرویس ابری ناموفق بود.');
            error.code = details.code || null;
            error.status = response.status;
            error.revision = Number(details.revision || 0);
            throw error;
        }
        return response;
    };
    const call = async (action, options = {}) => {
        const response = await callRaw(action, options);
        return options.raw ? response : response.json();
    };
    const gzip = async (value) => {
        if (!('CompressionStream' in window)) throw new Error('مرورگر از فشرده‌سازی پشتیبان پشتیبانی نمی‌کند.');
        const stream = new Blob([JSON.stringify(value)], { type: 'application/json' }).stream().pipeThrough(new CompressionStream('gzip'));
        return await new Response(stream).blob();
    };
    const decodeGzipResponse = async (response) => {
        if (!('DecompressionStream' in window)) throw new Error('مرورگر از بازکردن پشتیبان فشرده پشتیبانی نمی‌کند.');
        const stream = response.body.pipeThrough(new DecompressionStream('gzip'));
        const decoded = JSON.parse(await new Response(stream).text());
        if (decoded?.format !== 'ANBARYAR_CLOUD_ENCRYPTED') return decoded;

        // فرمت جدید: کلید رمزنگاری ابری با PBKDF2 از رمز مشترک و salt ذخیره‌شده در envelope مشتق می‌شود؛
        // به این ترتیب رمز محلی هر مرورگر می‌تواند متفاوت باشد و داده همچنان بین دستگاه‌ها قابل بازیابی است.
        if (decoded.saltB64 && decoded.hashB64) {
            const cachedMatches = AY_CLOUD_CRYPTO.key &&
                AY_CLOUD_CRYPTO.saltB64 === decoded.saltB64 &&
                AY_CLOUD_CRYPTO.hashB64 === decoded.hashB64;
            if (cachedMatches) return await decryptAY(decoded.envelope, AY_CLOUD_CRYPTO.key);

            // اگر همین رمزنگاری قبلاً در این تب تأیید شده باشد، کلید را از sessionStorage برگردان.
            const sessionKey = await restoreAyCloudKeyForSession(decoded.saltB64, decoded.hashB64);
            if (sessionKey) {
                try {
                    const value = await decryptAY(decoded.envelope, sessionKey);
                    AY_CLOUD_CRYPTO.key = sessionKey;
                    AY_CLOUD_CRYPTO.saltB64 = decoded.saltB64;
                    AY_CLOUD_CRYPTO.hashB64 = decoded.hashB64;
                    await rememberAyCloudKeyForDevice(sessionKey, decoded.saltB64, decoded.hashB64);
                    return value;
                } catch (e) {
                    // اگر رکورد نشست خراب یا متعلق به کلید دیگری بود، مسیر ورود با رمز را ادامه بده.
                    console.warn('کلید ذخیره‌شده‌ی ابری قابل استفاده نبود؛ مسیر بازیابی ادامه می‌یابد:', e);
                }
            }

            // بعد از ورود محلی به همین دستگاه، کلید ابریِ ذخیره‌شده را بدون درخواست رمز ابری بازیابی کن.
            const deviceKey = await restoreAyCloudKeyForDevice(decoded.saltB64, decoded.hashB64);
            if (deviceKey) {
                try {
                    const value = await decryptAY(decoded.envelope, deviceKey);
                    AY_CLOUD_CRYPTO.key = deviceKey;
                    AY_CLOUD_CRYPTO.saltB64 = decoded.saltB64;
                    AY_CLOUD_CRYPTO.hashB64 = decoded.hashB64;
                    await rememberAyCloudKeyForSession(deviceKey, decoded.saltB64, decoded.hashB64);
                    return value;
                } catch (e) {
                    console.warn('کلید ابریِ ذخیره‌شده روی دستگاه با این نسخه‌ی ابری سازگار نبود:', e);
                }
            }

            const localConfig = typeof getSecurityConfig === 'function' ? getSecurityConfig() : null;
            if (AY_SECURITY?.key && localConfig?.salt === decoded.saltB64 && localConfig?.hash === decoded.hashB64) {
                AY_CLOUD_CRYPTO.key = AY_SECURITY.key;
                AY_CLOUD_CRYPTO.saltB64 = decoded.saltB64;
                AY_CLOUD_CRYPTO.hashB64 = decoded.hashB64;
                await rememberAyCloudKeyForSession(AY_CLOUD_CRYPTO.key, decoded.saltB64, decoded.hashB64);
                return await decryptAY(decoded.envelope, AY_CLOUD_CRYPTO.key);
            }

            const password = window.prompt('برای بازکردن داده‌های ابری انباریار، رمز ابریِ دستگاهی را وارد کن که نخستین بار این همگام‌سازی را راه‌اندازی کرده است:');
            if (!password) throw new Error('بازکردن نسخه‌ی ابری لغو شد؛ رمز ابری وارد نشد.');
            const verifier = await passwordVerifier(password, decoded.saltB64);
            if (verifier !== decoded.hashB64) throw new Error('رمز ابری نادرست است. اطلاعات محلی دست‌نخورده باقی ماند.');
            const key = await deriveAYKey(password, decoded.saltB64);
            const value = await decryptAY(decoded.envelope, key);
            AY_CLOUD_CRYPTO.key = key;
            AY_CLOUD_CRYPTO.saltB64 = decoded.saltB64;
            AY_CLOUD_CRYPTO.hashB64 = decoded.hashB64;
            await rememberAyCloudKeyForSession(key, decoded.saltB64, decoded.hashB64);
            return value;
        }

        // سازگاری با بکاپ‌های رمزنگاری‌شده‌ی قدیمی که salt همراه envelope ذخیره نمی‌شد.
        if (!AY_SECURITY?.key) throw new Error('این نسخه از بکاپ با رمزنگاری قدیمی ساخته شده و فقط روی دستگاه اصلی قابل بازشدن است.');
        return await decryptAY(decoded.envelope);
    };
    const secureValue = async (value) => {
        // اول cache دائمیِ رمز‌شده با قفل محلی را امتحان کن؛ سپس cache نشست را.
        if (!AY_CLOUD_CRYPTO.key) {
            const deviceRestored = await restoreLatestAyCloudKeyForDevice();
            if (!deviceRestored) await restoreLatestAyCloudKeyForSession();
        }
        // پس از اولین دریافت، از همان کلید مشترک ابری استفاده می‌کنیم؛ قفل محلی هر دستگاه مستقل باقی می‌ماند.
        if (AY_CLOUD_CRYPTO.key) {
            return {
                format: 'ANBARYAR_CLOUD_ENCRYPTED',
                version: 2,
                saltB64: AY_CLOUD_CRYPTO.saltB64,
                hashB64: AY_CLOUD_CRYPTO.hashB64,
                envelope: await encryptAY(value, AY_CLOUD_CRYPTO.key)
            };
        }
        const localConfig = typeof getSecurityConfig === 'function' ? getSecurityConfig() : null;
        if (localConfig) {
            if (!AY_SECURITY?.key) throw new Error('برای همگام‌سازی امن، ابتدا قفل انباریار را با رمز باز کن.');
            if (!localConfig.salt || !localConfig.hash) throw new Error('تنظیمات رمزنگاری این دستگاه کامل نیست.');
            AY_CLOUD_CRYPTO.key = AY_SECURITY.key;
            AY_CLOUD_CRYPTO.saltB64 = localConfig.salt;
            AY_CLOUD_CRYPTO.hashB64 = localConfig.hash;
            return {
                format: 'ANBARYAR_CLOUD_ENCRYPTED',
                version: 2,
                saltB64: localConfig.salt,
                hashB64: localConfig.hash,
                envelope: await encryptAY(value, AY_CLOUD_CRYPTO.key)
            };
        }
        return value;
    };
    const waitForOAuthPopup = (popup, sb, nonce) => new Promise((resolve, reject) => {
        let finished = false;
        let processing = false;
        let channel = null;
        const finish = (err, value) => {
            if (finished) return;
            finished = true;
            clearTimeout(timer);
            window.removeEventListener('message', onMessage);
            if (channel) channel.close();
            if (err) reject(err); else resolve(value);
        };
        const timer = setTimeout(() => finish(new Error('ورود گوگل به پایان نرسید؛ دوباره تلاش کنید.')), 180000);
        const accept = async (data) => {
            if (finished || processing || data?.type !== 'ANBARYAR_AUTH_BRIDGE' || data?.nonce !== nonce) return;
            processing = true;
            try {
                const { data: sessionData, error } = await sb.auth.setSession({
                    access_token: data.access_token,
                    refresh_token: data.refresh_token
                });
                if (error) throw error;
                finish(null, sessionData);
            } catch (e) {
                processing = false;
                finish(e);
            }
        };
        const onMessage = (event) => {
            if (event.origin !== AY_CLOUD_SITE_ORIGIN || event.source !== popup) return;
            accept(event.data);
        };
        window.addEventListener('message', onMessage);
        // Fallback for browsers whose COOP policy severs window.opener on same-origin hosted tabs.
        if (window.location.origin === AY_CLOUD_SITE_ORIGIN && typeof BroadcastChannel === 'function') {
            channel = new BroadcastChannel('anbaryar-auth-bridge');
            channel.addEventListener('message', event => accept(event.data));
        }
    });
    const oauth = async (provider, link = false) => {
        const isLocalFile = window.location.protocol === 'file:';
        // Never redirect the main app. Complete OAuth in a separate popup and return the session.
        const popup = window.open('about:blank', 'anbaryar-google-auth', 'popup,width=540,height=720');
        if (!popup) throw new Error('مرورگر پنجره‌ی ورود را مسدود کرد؛ اجازه‌ی بازشدن Pop-up برای انباریار را فعال کن.');
        const nonce = (window.crypto?.randomUUID ? crypto.randomUUID() : 'ay-' + Date.now() + '-' + Math.random().toString(36).slice(2));
        try {
            try {
                popup.document.title = 'ورود امن به انباریار';
                popup.document.body.innerHTML = '<main dir="rtl" style="font:16px Tahoma,Arial,sans-serif;background:#f1f5f9;color:#0f172a;min-height:100vh;display:grid;place-items:center;text-align:center;padding:24px"><div><strong style="font-size:20px">انبار یار</strong><p style="line-height:2;color:#64748b">در حال آماده‌سازی ورود امن با Google…</p></div></main>';
            } catch (_) {}
            const sb = await client();
            // Linking must preserve the anonymous/current account before the Google provider is attached.
            if (link) await session();
            const redirect = new URL(AY_CLOUD_SITE_URL);
            redirect.searchParams.set('ay_auth_bridge', nonce);
            redirect.searchParams.set('ay_auth_mode', isLocalFile ? 'offline' : 'popup');
            const options = { redirectTo: redirect.toString(), skipBrowserRedirect: true, scopes: 'openid email profile' };
            const result = link
                ? await sb.auth.linkIdentity({ provider, options })
                : await sb.auth.signInWithOAuth({ provider, options });
            if (result.error) throw result.error;
            if (!result.data?.url) throw new Error('نشانی ورود گوگل دریافت نشد.');
            popup.location.replace(result.data.url);
            return await waitForOAuthPopup(popup, sb, nonce);
        } catch (e) {
            try { if (popup && !popup.closed) popup.close(); } catch (_) {}
            throw e;
        }
    };
    return {
        upload: async (value) => {
            const blob = await gzip(await secureValue(value));
            if (blob.size > 45 * 1024 * 1024) throw new Error('حجم نسخه پشتیبان از سقف ۴۵ مگابایت بیشتر است.');
            return await call('upload', { body: blob, headers: {
                'Content-Type': 'application/gzip',
                'X-AY-App-Build': String(value.appBuild || ''),
                'X-AY-Schema-Version': String(value.schemaVersion || '')
            }});
        },
        list: async () => await call('list'),
        account: async () => {
            const sb = await client();
            const current = await session();
            const { data, error } = await sb.auth.getUserIdentities();
            if (error) throw error;
            return { user: current.user, identities: data?.identities || [] };
        },
        watchAuth: async (callback) => {
            const sb = await client();
            const { data } = sb.auth.onAuthStateChange(callback);
            return data.subscription;
        },
        linkGoogle: async () => await oauth('google', true),
        signInGoogle: async () => await oauth('google', false),
        signInEmail: async (email) => {
            const sb = await client();
            const { data, error } = await sb.auth.signInWithOtp({
                email,
                options: { emailRedirectTo: AY_CLOUD_SITE_URL, shouldCreateUser: true }
            });
            if (error) throw error;
            return data;
        },
        syncMeta: async () => await call('sync-meta'),
        syncGet: async () => {
            const response = await callRaw('sync-get');
            if (response.status === 204) return null;
            const snapshot = await decodeGzipResponse(response);
            return {
                snapshot,
                revision: Number(response.headers.get('X-AY-Sync-Revision') || 0),
                updatedAt: response.headers.get('X-AY-Sync-Updated-At') || '',
                legacy: response.headers.get('X-AY-Sync-Legacy') === 'true'
            };
        },
        syncPush: async (value, expectedRevision, deviceId) => {
            const blob = await gzip(await secureValue(value));
            if (blob.size > 45 * 1024 * 1024) throw new Error('حجم اطلاعات همگام‌سازی از سقف ۴۵ مگابایت بیشتر است.');
            const response = await callRaw('sync-push', {
                url: AY_CLOUD_FUNCTION + '?action=sync-push',
                body: blob,
                headers: {
                    'Content-Type': 'application/gzip',
                    'X-AY-Sync-Revision': String(expectedRevision || 0),
                    'X-AY-Device-ID': String(deviceId || ''),
                    'X-AY-App-Build': String(value.appBuild || ''),
                    'X-AY-Schema-Version': String(value.schemaVersion || '')
                }
            });
            return await response.json();
        },
        restore: async (id) => {
            const response = await callRaw('restore', { body: JSON.stringify({ action: 'restore', id }) });
            return await decodeGzipResponse(response);
        },
        forwardAuthToOpener: async (nonce) => {
            const canPost = !!window.opener && window.opener !== window;
            const canBroadcast = window.location.origin === AY_CLOUD_SITE_ORIGIN && typeof BroadcastChannel === 'function';
            if (!nonce || (!canPost && !canBroadcast)) return false;
            if (new URLSearchParams(window.location.search).get('ay_auth_bridge') !== nonce) return false;
            // Do not rely on window.name; privacy protections may clear it across OAuth domains.
            const sb = await client();
            let { data: { session: current } } = await sb.auth.getSession();
            if (!current) {
                await new Promise((resolve) => {
                    let done = false;
                    let subscription = null;
                    let timer = null;
                    const finish = (next) => {
                        if (done) return;
                        done = true;
                        if (timer) clearTimeout(timer);
                        subscription?.unsubscribe();
                        if (next) current = next;
                        resolve();
                    };
                    const result = sb.auth.onAuthStateChange((event, next) => {
                        if (next) finish(next);
                    });
                    subscription = result.data.subscription;
                    timer = setTimeout(() => finish(null), 25000);
                });
            }
            if (!current?.access_token || !current?.refresh_token) return false;
            const payload = {
                type: 'ANBARYAR_AUTH_BRIDGE',
                access_token: current.access_token,
                refresh_token: current.refresh_token,
                nonce
            };
            if (canPost) {
                try { window.opener.postMessage(payload, '*'); } catch (_) {}
            }
            // Same-origin channel fallback for the hosted app if COOP isolates popup handles.
            if (canBroadcast) {
                try {
                    const channel = new BroadcastChannel('anbaryar-auth-bridge');
                    channel.postMessage(payload);
                    channel.close();
                } catch (_) {}
            }
            setTimeout(() => { try { window.close(); } catch(e) {} }, 450);
            return true;
        }
    };
})();

// Hosted callback returns the session to its opener using a one-time nonce.
// Offline file authentication still requires explicit approval before sharing the session.
(() => {
    const params = new URLSearchParams(window.location.search);
    const nonce = params.get('ay_auth_bridge');
    const mode = params.get('ay_auth_mode') || 'offline';
    if (!nonce || (!window.opener && !(mode === 'popup' && typeof BroadcastChannel === 'function'))) return;
    const show = () => {
        if (!document.body || document.getElementById('ay-auth-bridge-approval')) return;
        const panel = document.createElement('div');
        panel.id = 'ay-auth-bridge-approval';
        panel.dir = 'rtl';
        panel.style.cssText = 'position:fixed;inset:0;z-index:2147483647;background:rgba(15,23,42,.94);display:flex;align-items:center;justify-content:center;padding:24px;font-family:Tahoma,Arial,sans-serif;color:white';
        if (mode === 'popup') {
            panel.innerHTML = '<div style="max-width:440px;background:#fff;color:#0f172a;border-radius:20px;padding:24px;text-align:center;box-shadow:0 20px 60px #0006"><div style="font-size:20px;font-weight:800;margin-bottom:12px">ورود امن به انبار یار</div><p style="font-size:14px;line-height:2;margin:0 0 18px">حساب Google تأیید شد؛ در حال بازگرداندن اتصال به صفحه‌ی اصلی…</p><button id="ay-auth-bridge-retry" style="border:0;border-radius:12px;background:#4f46e5;color:white;font-weight:800;padding:12px 20px;cursor:pointer">تکمیل اتصال</button><p id="ay-auth-bridge-status" style="font-size:12px;color:#64748b;margin:12px 0 0">لطفاً این پنجره را نبندید.</p></div>';
            document.body.appendChild(panel);
            const button = panel.querySelector('#ay-auth-bridge-retry');
            const status = panel.querySelector('#ay-auth-bridge-status');
            const forward = async () => {
                button.disabled = true;
                button.textContent = 'در حال اتصال…';
                status.textContent = 'در حال انتقال امن نشست به صفحه‌ی اصلی…';
                try {
                    const ok = await AY_CLOUD.forwardAuthToOpener(nonce);
                    if (!ok) throw new Error('نشست ورود آماده نشد؛ اتصال اینترنت را بررسی و دوباره تلاش کن.');
                    status.textContent = 'اتصال انجام شد؛ این پنجره بسته می‌شود.';
                } catch (e) {
                    status.textContent = e?.message || 'انتقال ورود انجام نشد.';
                    button.disabled = false;
                    button.textContent = 'تلاش دوباره';
                }
            };
            button.addEventListener('click', forward);
            forward();
            return;
        }
        panel.innerHTML = '<div style="max-width:440px;background:#fff;color:#0f172a;border-radius:20px;padding:24px;text-align:center;box-shadow:0 20px 60px #0006"><div style="font-size:20px;font-weight:800;margin-bottom:12px">اتصال نسخه آفلاین انباریار</div><p style="font-size:14px;line-height:2;margin:0 0 18px">ورود گوگل انجام شده است. با انتخاب دکمه زیر، نشست این حساب به فایل آفلاینی که ورود را آغاز کرده منتقل می‌شود.</p><button id="ay-auth-bridge-approve" style="border:0;border-radius:12px;background:#4f46e5;color:white;font-weight:800;padding:12px 20px;cursor:pointer">تأیید و بازگشت به فایل آفلاین</button><p id="ay-auth-bridge-status" style="font-size:12px;color:#64748b;margin:12px 0 0"></p></div>';
        document.body.appendChild(panel);
        panel.querySelector('#ay-auth-bridge-approve').addEventListener('click', async () => {
            const button = panel.querySelector('#ay-auth-bridge-approve');
            const status = panel.querySelector('#ay-auth-bridge-status');
            button.disabled = true;
            button.textContent = 'در حال انتقال ورود...';
            try {
                const ok = await AY_CLOUD.forwardAuthToOpener(nonce);
                if (!ok) throw new Error('نشست ورود هنوز آماده نیست. چند لحظه بعد دوباره تلاش کن.');
                status.textContent = 'ورود منتقل شد؛ می‌توانی این پنجره را ببندی.';
            } catch (e) {
                status.textContent = e?.message || 'انتقال ورود انجام نشد.';
                button.disabled = false;
                button.textContent = 'تلاش دوباره';
            }
        });
    };
    setTimeout(show, mode === 'popup' ? 500 : 1400);
})();
