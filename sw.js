// ============================================================
//  DUSK — Service Worker  (cache-first, offline-ready)
// ============================================================
// PWA-2: Cache version date must be updated on each deploy to invalidate old cache.
// Format: dusk-v1.7-YYYYMMDD.
const CACHE  = 'dusk-v1.7-20260503';
const ASSETS = [
    './',
    './index.html',
    './style.css',
    './app.js',
    './manifest.json',
    './bg-gothic.jpg',
    './icon-192.svg',
    './icon-512.svg',
    'https://cdn.jsdelivr.net/npm/sortablejs@1.15.2/Sortable.min.js',
];

// Install: pre-cache all shell assets
self.addEventListener('install', e => {
    e.waitUntil(
        caches.open(CACHE)
            .then(c => c.addAll(ASSETS))
            .then(() => self.skipWaiting())
    );
});

// Activate: remove old caches
self.addEventListener('activate', e => {
    e.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
        ).then(() => self.clients.claim())
    );
});

// Fetch: cache-first for shell, network-first for Google Fonts
self.addEventListener('fetch', e => {
    const url = new URL(e.request.url);

    // Google Fonts — network-first with cache fallback
    if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
        e.respondWith(
            fetch(e.request)
                .then(r => {
                    const clone = r.clone();
                    caches.open(CACHE).then(c => c.put(e.request, clone));
                    return r;
                })
                .catch(() => caches.match(e.request))
        );
        return;
    }

    // Everything else — cache-first
    e.respondWith(
        caches.match(e.request).then(cached => cached || fetch(e.request))
    );
});
