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
// The CACHE name is now STABLE — no per-edit bump. Edits to app.js / style.css /
// index.html propagate on their own: the SWR fetch handler re-fetches each shell
// file on the next load, overwrites its cache entry, and fires the "new version"
// toast when the bytes actually changed. sw.js itself only needs editing when the
// caching strategy changes (which is what makes the browser reinstall the worker
// and run the one-time activate cleanup that purges the old dusk-v* caches).
const CACHE  = 'dusk-shell';
// G4-1: split the shell so a heavy/decorative asset can't abort the whole install.
// CORE is cached atomically (addAll) — these MUST be present for a reliable offline
// boot. The 2.3 MB background is the most likely fetch to stall/fail on a slow first
// load, and with addAll being all-or-nothing that would leave the app with NO offline
// support at all. It's purely decorative, so it's cached best-effort instead and also
// fills in lazily via the same-origin stale-while-revalidate path on first online view.
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
    './manifest.json',
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

// G4-2: cheap change-detection from validators instead of reading the full body.
// app.js (~390 KB) + style.css (~190 KB) were stringified and compared on EVERY
// fetch. ETag/Last-Modified/Content-Length already capture "did this file change?"
// for any normal server; we only fall back to a text diff when none are present.
function shellSignature(resp) {
    const h = resp.headers;
    return [h.get('etag'), h.get('last-modified'), h.get('content-length')]
        .map(v => v || '').join('|');
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
            // Notify only when a reloadable shell file actually changed.
            if (cached && isReloadableShell(url)) {
                const oldSig = shellSignature(cached);
                const newSig = shellSignature(resp);
                const haveValidators = oldSig !== '||' && newSig !== '||';
                if (haveValidators) {
                    if (oldSig !== newSig) notifyClients();
                } else {
                    // No ETag/Last-Modified/Content-Length (e.g. some dev servers) →
                    // fall back to the full-text diff so updates aren't missed.
                    try {
                        const [oldText, newText] = await Promise.all([
                            cached.clone().text(), resp.clone().text(),
                        ]);
                        if (oldText !== newText) notifyClients();
                    } catch (_) { /* opaque/binary — skip diff */ }
                }
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
