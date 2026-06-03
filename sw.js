// ============================================================
//  DUSK — Service Worker  (offline-ready, auto-updating)
// ============================================================
// V-3: strategy changed from pure cache-first (which required a MANUAL cache
// version bump on every deploy or users got stuck on the old build) to
// stale-while-revalidate for the app shell:
//   • respond from cache instantly  → fully offline-capable, fast
//   • revalidate from network in the background → cache always freshens
//   • when a shell file actually changed, notify open clients so the app can
//     show a non-intrusive "new version — reload" toast.
// The CACHE name is still bumped per deploy only to garbage-collect old caches;
// freshness no longer depends on remembering to bump it.
const CACHE  = 'dusk-v2-swr';
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

// Tell every open client a shell file changed → app shows an update toast.
function notifyClients() {
    self.clients.matchAll({ includeUncontrolled: true }).then(cs =>
        cs.forEach(c => c.postMessage({ type: 'dusk-update-ready' }))
    );
}

// Only diff text shell assets worth a reload prompt (html/js/css).
function isReloadableShell(url) {
    return url.origin === self.location.origin &&
           /(\/|\.html|\.js|\.css)$/.test(url.pathname);
}

// Stale-while-revalidate for same-origin shell + the SortableJS CDN script.
async function staleWhileRevalidate(request) {
    const url    = new URL(request.url);
    const cache  = await caches.open(CACHE);
    const cached = await cache.match(request);

    const network = fetch(request).then(async resp => {
        // Cache successful same-origin responses and CORS-enabled CDN responses.
        if (resp && (resp.status === 200 || resp.type === 'opaque')) {
            const toStore = resp.clone();
            // Notify only when a reloadable shell file's bytes actually changed.
            if (cached && isReloadableShell(url)) {
                try {
                    const [oldText, newText] = await Promise.all([
                        cached.clone().text(), resp.clone().text(),
                    ]);
                    if (oldText !== newText) notifyClients();
                } catch (_) { /* opaque/binary — skip diff */ }
            }
            cache.put(request, toStore);
        }
        return resp;
    }).catch(() => null);

    // Serve cache immediately if present; otherwise wait for the network.
    return cached || network || fetch(request);
}

self.addEventListener('fetch', e => {
    const req = e.request;
    if (req.method !== 'GET') return;                 // never cache mutations
    const url = new URL(req.url);

    // Google Fonts — network-first with cache fallback (unchanged)
    if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
        e.respondWith(
            fetch(req)
                .then(r => { const clone = r.clone(); caches.open(CACHE).then(c => c.put(req, clone)); return r; })
                .catch(() => caches.match(req))
        );
        return;
    }

    // App shell + SortableJS CDN — stale-while-revalidate
    if (url.origin === self.location.origin ||
        url.hostname === 'cdn.jsdelivr.net') {
        e.respondWith(staleWhileRevalidate(req));
        return;
    }

    // Anything else — passthrough with cache fallback
    e.respondWith(caches.match(req).then(cached => cached || fetch(req)));
});
