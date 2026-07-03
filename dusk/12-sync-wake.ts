// ── ES-module bridge (migration 2a), part 1: HOISTED functions ──────────────
// Classic scripts hoisted these into the shared global scope before any code
// ran; publish them first so load-time cross-module calls keep working.
Object.assign(globalThis, {
    _wakeEnabled, _wakeUrl, _roomFor, _wsConnect, _wsReconnect, syncWakeNote, syncWakeNudge, syncWakeStop,
});

// ============================================================
//  12-sync-wake.js — Sync Phase 3.5: cross-device live wake (WebSocket)
// ============================================================
// Near-instant cross-device sync while tabs are open. Each signed-in device
// keeps a WebSocket to the Cloudflare Worker's Durable Object "room" (keyed by a
// hash of the shared Drive fileId, so only this account's devices share a room).
// When one device PUSHES new data it sends a one-byte nudge; the room relays it
// to the others, which immediately syncNow(). Without this they only converge on
// the 30 s periodic poll.
//
// Active only in WORKER mode (SYNC_WORKER_URL set) — there's no relay otherwise.
// Loaded as a classic <script> AFTER 11-sync-ui.js. syncNow() calls the hooks
// below: syncWakeNote(fileId) (learn/keep the room) + syncWakeNudge() (after a
// successful push). The socket is opened only while the tab is visible + signed
// in, and closed when hidden (the visibility/online triggers cover catch-up on
// return) so an idle background tab holds nothing open.

// TS ambient view of this module's 2a globalThis slots (runtime inits below);
// `declare` emits nothing — the single storage slot stays globalThis.*.
declare var _ws: any;               // WebSocket | null
declare var _wsRoom: string | null;
declare var _wsWantOpen: boolean;
declare var _wsTimer: any;          // setTimeout id
declare var _wsBackoff: number;
declare var _wsEverOpen: boolean;

globalThis._ws = null;
globalThis._wsRoom = null;
globalThis._wsWantOpen = false;
globalThis._wsTimer = null;
globalThis._wsBackoff = 1000;// reconnect backoff, capped at 30 s
globalThis._wsEverOpen = false;// distinguishes a RE-connect (catch up) from the first connect

function _wakeEnabled() {
    return typeof SYNC_WORKER_URL === 'string' && !!SYNC_WORKER_URL && typeof WebSocket !== 'undefined';
}
function _wakeUrl(room) {
    return SYNC_WORKER_URL.replace(/^http/, 'ws') + '/ws?room=' + encodeURIComponent(room);
}
// Channel id = hash of the fileId. The raw fileId never leaves over the wake
// channel, and the room isn't trivially guessable. (It carries no data anyway —
// a stray listener could at most nudge a device into a harmless extra pull.)
async function _roomFor(fileId) {
    try {
        const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('dusk-room:' + fileId));
        const b = new Uint8Array(d); let h = '';
        for (let i = 0; i < 12; i++) h += b[i].toString(16).padStart(2, '0');
        return h;
    } catch (_) { return null; }
}

function _wsConnect() {
    if (!_wakeEnabled() || !_wsWantOpen || !_wsRoom) return;
    if (_ws && (_ws.readyState === 0 || _ws.readyState === 1)) return;   // connecting/open already
    let sock;
    try { sock = new WebSocket(_wakeUrl(_wsRoom)); } catch (_) { _wsReconnect(); return; }
    _ws = sock;
    sock.onopen = () => {
        _wsBackoff = 1000;
        // A RE-connect (the socket had dropped) may have missed nudges while down →
        // pull once to catch up. The very first connect needs no sync (we just synced
        // — syncWakeNote is called right after a sync).
        if (_wsEverOpen && typeof syncNow === 'function' && typeof cloudStatus === 'function' && cloudStatus().signedIn) {
            syncNow({ interactive: false, via: 'переподключение' });
        }
        _wsEverOpen = true;
    };
    sock.onmessage = () => {
        // A peer changed → pull. syncNow is single-flight, so a burst collapses.
        if (typeof syncNow === 'function' && typeof cloudStatus === 'function' && cloudStatus().signedIn) {
            syncNow({ interactive: false, via: 'будилка' });
        }
    };
    sock.onclose = () => { if (_ws === sock) _ws = null; if (_wsWantOpen) _wsReconnect(); };
    sock.onerror = () => { try { sock.close(); } catch (_) {} };
}
function _wsReconnect() {
    clearTimeout(_wsTimer);
    _wsTimer = setTimeout(_wsConnect, _wsBackoff);
    _wsBackoff = Math.min(_wsBackoff * 2, 30000);
}

// ── hooks called from syncNow (11-sync-ui.js) ────────────────────────────────
// Learn (or keep) the room for this account and ensure we're connected.
function syncWakeNote(fileId) {
    if (!_wakeEnabled() || !fileId) return;
    _roomFor(fileId).then(room => {
        if (!room) return;
        if (room === _wsRoom && _ws && _ws.readyState === 1) return;     // already on this room
        _wsRoom = room;
        if (typeof document === 'undefined' || document.visibilityState !== 'hidden') {
            _wsWantOpen = true; _wsConnect();
        }
    });
}
// After a successful local push → tell the peers to pull.
function syncWakeNudge() {
    if (_ws && _ws.readyState === 1) { try { _ws.send('changed'); } catch (_) {} }
}
function syncWakeStop() {
    _wsWantOpen = false;
    clearTimeout(_wsTimer);
    if (_ws) { try { _ws.close(); } catch (_) {} _ws = null; }
}

// Open only while visible; drop the socket when hidden (catch-up on return is
// handled by the visibility/online/periodic triggers in 11-sync-ui.js).
if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            if (_wsRoom && _wakeEnabled()) { _wsWantOpen = true; _wsConnect(); }
        } else {
            syncWakeStop();
        }
    });
}

// (the old module.exports footer is gone — nothing require()s this file)
