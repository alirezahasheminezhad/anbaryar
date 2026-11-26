//## ═══ app/30-cloud-backup.js ═══
//## اتصال ابری اختیاری؛ هسته‌ی برنامه و ذخیره‌سازی محلی بدون اینترنت مستقل می‌مانند.
const AY_CLOUD_URL = 'https://foyttvvpscenkxbobazs.supabase.co';
const AY_CLOUD_KEY = 'sb_publishable_AhAgG-9rYk_PwD3cFjNCAA_bzK06eO2';
const AY_CLOUD_FUNCTION = AY_CLOUD_URL + '/functions/v1/anbaryar-cloud-backup';
const AY_CLOUD_SITE_URL = 'https://alirezahasheminezhad.github.io/anbaryar/';
const AY_CLOUD_SITE_ORIGIN = 'https://alirezahasheminezhad.github.io';

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
        if (decoded?.format === 'ANBARYAR_CLOUD_ENCRYPTED') {
            if (!AY_SECURITY.key) throw new Error('این نسخه رمزنگاری شده است؛ ابتدا با همان رمز انباریار وارد شوید.');
            return await decryptAY(decoded.envelope);
        }
        return decoded;
    };
    const secureValue = async (value) => (
        typeof AY_SECURITY !== 'undefined' && AY_SECURITY.key
            ? { format: 'ANBARYAR_CLOUD_ENCRYPTED', envelope: await encryptAY(value) }
            : value
    );
    const waitForOfflineOAuthBridge = (popup, sb) => new Promise((resolve, reject) => {
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
            if (event.origin !== AY_CLOUD_SITE_ORIGIN || event.source !== popup || event.data?.type !== 'ANBARYAR_AUTH_BRIDGE') return;
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
        // در فایل file:// پنجره‌ی بازگشت OAuth نمی‌تواند به آدرس فایل برگردد؛
        // ورود در صفحه‌ی وب انجام می‌شود و نشست امن با postMessage به فایل برمی‌گردد.
        const popup = isLocalFile ? window.open('about:blank', 'anbaryar-google-auth', 'popup,width=560,height=760') : null;
        if (isLocalFile && !popup) throw new Error('برای ورود گوگل، اجازه‌ی بازشدن پنجره‌ی جدید را بدهید.');
        try {
            const sb = await client();
            let result;
            const options = isLocalFile
                ? { redirectTo: AY_CLOUD_SITE_URL, skipBrowserRedirect: true }
                : { redirectTo: window.location.href };
            if (link) result = await sb.auth.linkIdentity({ provider, options });
            else result = await sb.auth.signInWithOAuth({ provider, options });
            if (result.error) throw result.error;
            if (isLocalFile) {
                if (!result.data?.url) throw new Error('نشانی ورود گوگل دریافت نشد.');
                popup.location.href = result.data.url;
                return await waitForOfflineOAuthBridge(popup, sb);
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
                options: { emailRedirectTo: window.location.href, shouldCreateUser: true }
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
        forwardAuthToOpener: async () => {
            if (!window.opener || window.opener === window) return false;
            const sb = await client();
            let { data: { session: current } } = await sb.auth.getSession();
            if (!current) {
                await new Promise((resolve) => {
                    let done = false;
                    const timer = setTimeout(() => { if (!done) { done = true; subscription.unsubscribe(); resolve(); } }, 25000);
                    const { data: { subscription } } = sb.auth.onAuthStateChange((event, next) => {
                        if (next && !done) { done = true; clearTimeout(timer); subscription.unsubscribe(); current = next; resolve(); }
                    });
                });
            }
            if (!current?.access_token || !current?.refresh_token) return false;
            window.opener.postMessage({
                type: 'ANBARYAR_AUTH_BRIDGE',
                access_token: current.access_token,
                refresh_token: current.refresh_token
            }, '*');
            setTimeout(() => { try { window.close(); } catch(e) {} }, 300);
            return true;
        }
    };
})();

// اگر این صفحه مقصد یک پنجره‌ی ورود گوگل از نسخه‌ی file:// باشد، نشست را به پنجره‌ی مبدأ تحویل بده.
if (window.opener) setTimeout(() => AY_CLOUD.forwardAuthToOpener().catch(e => console.warn('Auth bridge:', e)), 900);
