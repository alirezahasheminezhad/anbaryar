//## ═══ app/30-cloud-backup.js ═══
//## پشتیبان ابری مستقل؛ در صورت قطع اینترنت یا غیرفعال بودن Auth، ذخیره‌سازی محلی بدون تغییر کار می‌کند.
const AY_CLOUD_URL = 'https://foyttvvpscenkxbobazs.supabase.co';
const AY_CLOUD_KEY = 'sb_publishable_AhAgG-9rYk_PwD3cFjNCAA_bzK06eO2';
const AY_CLOUD_FUNCTION = AY_CLOUD_URL + '/functions/v1/anbaryar-cloud-backup';
const AY_CLOUD = (() => {
    let clientPromise = null;
    const client = () => {
        if (!clientPromise) clientPromise = import('https://esm.sh/@supabase/supabase-js@2')
            .then(({ createClient }) => createClient(AY_CLOUD_URL, AY_CLOUD_KEY, {
                auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false }
            }));
        return clientPromise;
    };
    const session = async () => {
        const sb = await client();
        let { data: { session } } = await sb.auth.getSession();
        if (!session) {
            const result = await sb.auth.signInAnonymously();
            if (result.error) throw result.error;
            session = result.data.session;
        }
        if (!session?.access_token) throw new Error('ورود ابری انجام نشد.');
        return session;
    };
    const call = async (action, options = {}) => {
        const current = await session();
        const headers = {
            'apikey': AY_CLOUD_KEY,
            'Authorization': 'Bearer ' + current.access_token,
            ...(options.headers || {})
        };
        const response = await fetch(AY_CLOUD_FUNCTION, {
            method: 'POST', headers,
            body: options.body || JSON.stringify({ action }),
        });
        if (!response.ok) {
            let message = 'ارتباط با سرویس پشتیبان ابری ناموفق بود.';
            try { message = (await response.json()).error || message; } catch(e) {}
            throw new Error(message);
        }
        return options.raw ? response : response.json();
    };
    const gzip = async (value) => {
        if (!('CompressionStream' in window)) throw new Error('مرورگر از فشرده‌سازی پشتیبان پشتیبانی نمی‌کند.');
        const stream = new Blob([JSON.stringify(value)], { type: 'application/json' }).stream().pipeThrough(new CompressionStream('gzip'));
        return await new Response(stream).blob();
    };
    return {
        upload: async (value) => {
            const secured = window.AY_SECURITY?.key ? { format: 'ANBARYAR_CLOUD_ENCRYPTED', envelope: await window.encryptAY(value) } : value;
            const blob = await gzip(secured);
            if (blob.size > 45 * 1024 * 1024) throw new Error('حجم نسخه پشتیبان از سقف ۴۵ مگابایت بیشتر است.');
            return await call('upload', { body: blob, headers: {
                'Content-Type': 'application/gzip',
                'X-AY-App-Build': String(value.appBuild || ''),
                'X-AY-Schema-Version': String(value.schemaVersion || '')
            }});
        },
        list: async () => await call('list'),
        restore: async (id) => {
            const response = await call('restore', { body: JSON.stringify({ action: 'restore', id }), raw: true });
            if (!('DecompressionStream' in window)) throw new Error('مرورگر از بازکردن پشتیبان فشرده پشتیبانی نمی‌کند.');
            const stream = response.body.pipeThrough(new DecompressionStream('gzip'));
            return JSON.parse(await new Response(stream).text());
        }
    };
})();
