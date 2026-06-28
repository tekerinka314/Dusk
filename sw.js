// ============================================================
//  DUSK — Service Worker  (offline-ready, fresh-on-first-reload)
// ============================================================
// Strategy (changed from stale-while-revalidate):
//   • App shell (same-origin) → NETWORK-FIRST with a short timeout.
//       - Online: always fetch the latest → updates land on the FIRST reload,
//         no "new version" toast, no double-reload. Unchanged files come back as
//         a tiny 304 (browser HTTP cache) so a normal reload is ~one fast RTT.
//       - Network slow/down: after NET_TIMEOUT_MS we serve the cached copy
//         instantly (the in-flight fetch keeps running to refresh the cache for
//         next time). Fully offline → cache fallback. So offline always works.
//   • SortableJS CDN (pinned, immutable) → CACHE-FIRST (never revalidated).
//   • Google Fonts → network-first with cache fallback (unchanged).
// The CACHE name is bumped on a strategy change so the browser reinstalls the
// worker and the activate cleanup purges the old cache (which also clears any
// opaque-response storage padding that had inflated the reported usage).
const CACHE = 'dusk-shell-v3';
const NET_TIMEOUT_MS = 2500;   // online shell fetch waits this long, then serves cache

// G4-1: split the shell so a heavy/decorative asset can't abort the whole install.
// CORE is cached atomically (addAll) — these MUST be present for a reliable offline
// boot. The 2.3 MB background is the most likely fetch to stall/fail on a slow first
// load, and with addAll being all-or-nothing that would leave the app with NO offline
// support at all. It's purely decorative, so it's cached best-effort instead and also
// fills in lazily via the same-origin network-first path on first online view.
const CORE_ASSETS = [
    './',
    './index.html',
    './style.css',
    // 7c split A1: app.js разбит на 8 файлов — все нужны для оффлайн-загрузки.
    './dusk/01-core.js',
    './dusk/02-grimoire.js',
    './dusk/03-render.js',
    './dusk/04-tasks.js',
    './dusk/05-edit-notes-groups.js',
    './dusk/06-deadlines.js',
    './dusk/07-dnd-filter-progress.js',
    './dusk/08-quickadd-export-init.js',
    './dusk/09-sync.js',
    './dusk/10-cloud.js',
    './manifest.json',
    './version.json',
    './icon-192.svg',
    './icon-512.svg',
    'https://cdn.jsdelivr.net/npm/sortablejs@1.15.2/Sortable.min.js',
];
const OPTIONAL_ASSETS = [
    './bg-gothic.jpg',
    './pen-asset.js',   // D-3: «Звук пера» семпл (грузится из index.html; декод in-memory, оффлайн-safe)
];

// Install: core atomically; optional best-effort (failures ignored, never block install).
self.addEventListener('install', e => {
    e.waitUntil(
        caches.open(CACHE)
            .then(c => c.addAll(CORE_ASSETS)
                .then(() => Promise.allSettled(OPTIONAL_ASSETS.map(a => c.add(a)))))
            .then(() => self.skipWaiting())
    );
});

// Activate: remove old caches (purges the previous cache incl. its opaque padding).
self.addEventListener('activate', e => {
    e.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
        ).then(() => self.clients.claim())
    );
});

const TIMEOUT = Symbol('timeout');   // race sentinels (never collide with a real Response)
const NETFAIL = Symbol('netfail');

// Network-first with a timeout, cache as the safety net.
//   • network answers within NET_TIMEOUT_MS → serve it fresh (and refresh cache).
//   • times out / errors → serve cache instantly; the fetch keeps running in the
//     background to refresh the cache. No cache yet → await the network.
async function networkFirst(request) {
    const cache = await caches.open(CACHE);

    const networkPromise = fetch(request).then(resp => {
        if (resp && (resp.status === 200 || resp.type === 'opaque' || resp.type === 'cors')) {
            cache.put(request, resp.clone());
        }
        return resp;
    });

    const timeoutPromise = new Promise(res => setTimeout(() => res(TIMEOUT), NET_TIMEOUT_MS));

    let winner;
    try {
        winner = await Promise.race([networkPromise, timeoutPromise]);
    } catch (_) {
        winner = NETFAIL;                       // network rejected before timeout
    }

    if (winner !== TIMEOUT && winner !== NETFAIL) {
        return winner;                          // fresh from network within the budget
    }

    const cached = await cache.match(request);
    if (cached) return cached;                  // slow/offline → serve cache instantly
    return networkPromise;                      // nothing cached → wait for the network
}

// Cache-first for an immutable pinned dependency (SortableJS @1.15.2 never changes).
async function cacheFirst(request) {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(request);
    if (cached) return cached;
    const resp = await fetch(request);
    if (resp && (resp.status === 200 || resp.type === 'opaque' || resp.type === 'cors')) {
        cache.put(request, resp.clone());
    }
    return resp;
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

    // SortableJS CDN — pinned + immutable → cache-first (no revalidation cost).
    if (url.hostname === 'cdn.jsdelivr.net') {
        e.respondWith(cacheFirst(req));
        return;
    }

    // App shell (same-origin) — network-first so updates land on the first reload.
    if (url.origin === self.location.origin) {
        e.respondWith(networkFirst(req));
        return;
    }

    // Anything else — passthrough with cache fallback
    e.respondWith(caches.match(req).then(cached => cached || fetch(req)));
});
