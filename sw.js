/* Service worker انبار یار: پوسته‌ی برنامه را precache و کتابخانه‌های CDN را runtime cache می‌کند
   تا نسخه‌ی نصب‌شده (PWA) بدون اینترنت هم اجرا شود. فقط روی https ثبت می‌شود. */
const CACHE = 'anbaryar-v10.12';
const SHELL = ['./', './index.html', './manifest.webmanifest', './assets/pwa-icon.svg', './assets/pwa-icon-192.png', './assets/pwa-icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put('./index.html', copy));
        return res;
      }).catch(() => caches.match('./index.html'))
    );
    return;
  }

  const isCdn = /^(unpkg\.com|cdn\.jsdelivr\.net|cdn\.sheetjs\.com|cdn\.tailwindcss\.com)$/.test(url.hostname);
  if (isCdn) {
    const versioned = /@[\d.]+\//.test(url.pathname) || /xlsx-[\d.]+/.test(url.pathname);
    if (versioned) {
      e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
        return res;
      })));
    } else {
      e.respondWith(fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
        return res;
      }).catch(() => caches.match(req)));
    }
    return;
  }

  if (url.origin === self.location.origin) {
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req)));
  }
});