//## ═══ app/30-cloud-backup.js ═══
//## اتصال ابری اختیاری؛ هسته‌ی برنامه و ذخیره‌سازی محلی بدون اینترنت مستقل می‌مانند.
const AY_CLOUD_URL = 'https://foyttvvpscenkxbobazs.supabase.co';
const AY_CLOUD_KEY = 'sb_publishable_AhAgG-9rYk_PwD3cFjNCAA_bzK06eO2';
const AY_CLOUD_FUNCTION = AY_CLOUD_URL + '/functions/v1/anbaryar-cloud-backup';
const AY_CLOUD_SITE_URL = 'https://alirezahasheminezhad.github.io/anbaryar/';
const AY_CLOUD_SITE_ORIGIN = 'https://alirezahasheminezhad.github.io';
// کلید ابری از رمز اولین دستگاه مشتق می‌شود و در حافظه‌ی همین تب می‌ماند؛ هر دستگاه با واردکردن رمز آن را باز می‌کند.
const AY_CLOUD_CRYPTO = { key: null, saltB64: '', hashB64: '' };

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

            const localConfig = typeof getSecurityConfig === 'function' ? getSecurityConfig() : null;
            if (AY_SECURITY?.key && localConfig?.salt === decoded.saltB64 && localConfig?.hash === decoded.hashB64) {
                AY_CLOUD_CRYPTO.key = AY_SECURITY.key;
                AY_CLOUD_CRYPTO.saltB64 = decoded.saltB64;
                AY_CLOUD_CRYPTO.hashB64 = decoded.hashB64;
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
            return value;
        }

        // سازگاری با بکاپ‌های رمزنگاری‌شده‌ی قدیمی که salt همراه envelope ذخیره نمی‌شد.
        if (!AY_SECURITY?.key) throw new Error('این نسخه از بکاپ با رمزنگاری قدیمی ساخته شده و فقط روی دستگاه اصلی قابل بازشدن است.');
        return await decryptAY(decoded.envelope);
    };
    const secureValue = async (value) => {
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
    const waitForOfflineOAuthBridge = (popup, sb, nonce) => new Promise((resolve, reject) => {
        let finished = false;
        const finish = (err, value) => {
            if (finished) return;
            finished = true;
            clearTimeout(timer);
            window.removeEventListener('message', onMessage);
            if (err) reject(err); else resolve(value);
        };
        const timer = setTimeout(() => finish(new Error('ورود گوگل به پایان نرسید؛ دوباره تلاش کنید.')), 180000);
        const onMessage = async (event) => {
            if (event.origin !== AY_CLOUD_SITE_ORIGIN || event.source !== popup || event.data?.type !== 'ANBARYAR_AUTH_BRIDGE' || event.data?.nonce !== nonce) return;
            try {
                const { data, error } = await sb.auth.setSession({
                    access_token: event.data.access_token,
                    refresh_token: event.data.refresh_token
                });
                if (error) throw error;
                finish(null, data);
            } catch (e) { finish(e); }
        };
        window.addEventListener('message', onMessage);
    });
    const oauth = async (provider, link = false) => {
        const isLocalFile = window.location.protocol === 'file:';
        // file:// cannot be an OAuth redirect. Authenticate on the hosted copy and explicitly
        // approve returning the session to the opener once the Google flow is complete.
        const popup = isLocalFile ? window.open('about:blank', 'anbaryar-google-auth', 'popup,width=560,height=760') : null;
        if (isLocalFile && !popup) throw new Error('برای ورود گوگل، اجازه‌ی بازشدن پنجره‌ی جدید را بدهید.');
        const nonce = isLocalFile ? (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random()) : '';
        if (popup) popup.name = 'anbaryar-auth-bridge:' + nonce;
        try {
            const sb = await client();
            let result;
            let redirectTo = window.location.href;
            if (isLocalFile) {
                const redirect = new URL(AY_CLOUD_SITE_URL);
                redirect.searchParams.set('ay_auth_bridge', nonce);
                redirectTo = redirect.toString();
            }
            const options = isLocalFile
                ? { redirectTo, skipBrowserRedirect: true }
                : { redirectTo };
            if (link) result = await sb.auth.linkIdentity({ provider, options });
            else result = await sb.auth.signInWithOAuth({ provider, options });
            if (result.error) throw result.error;
            if (isLocalFile) {
                if (!result.data?.url) throw new Error('نشانی ورود گوگل دریافت نشد.');
                popup.location.href = result.data.url;
                return await waitForOfflineOAuthBridge(popup, sb, nonce);
            }
            return result.data;
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
            if (!window.opener || window.opener === window || !nonce) return false;
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
            window.opener.postMessage({
                type: 'ANBARYAR_AUTH_BRIDGE',
                access_token: current.access_token,
                refresh_token: current.refresh_token,
                nonce
            }, '*');
            setTimeout(() => { try { window.close(); } catch(e) {} }, 300);
            return true;
        }
    };
})();

// در ورود از file://، تحویل توکن به پنجره‌ی آفلاین فقط با تأیید صریح کاربر انجام می‌شود.
(() => {
    const nonce = new URLSearchParams(window.location.search).get('ay_auth_bridge');
    if (!window.opener || !nonce) return;
    const show = () => {
        if (!document.body || document.getElementById('ay-auth-bridge-approval')) return;
        const panel = document.createElement('div');
        panel.id = 'ay-auth-bridge-approval';
        panel.dir = 'rtl';
        panel.style.cssText = 'position:fixed;inset:0;z-index:2147483647;background:rgba(15,23,42,.94);display:flex;align-items:center;justify-content:center;padding:24px;font-family:Tahoma,Arial,sans-serif;color:white';
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
    setTimeout(show, 1400);
})();
