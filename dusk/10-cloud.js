// ============================================================
//  10-cloud.js — Sync Phase 2: Google Drive client (auth + transport)
// ============================================================
// NETWORK layer only. Gets the shared sync blob to/from the user's private
// Google Drive `appDataFolder` so Phase 3 can run the loop
//   pull → mergeStates → applySyncSubset → push.
//
// This module NEVER merges (that is Phase 1 / 09-sync.js) and NEVER touches
// `state` or the DOM (that is Phase 3). It is a thin, UI-less transport that
// moves the sync-file format of §5 (a wrapper around the subset getSyncSubset
// produces). All the merge intelligence lives elsewhere; here it is purely
// "authenticate, then read/write one JSON file on Drive".
//
// AUTH: Google Identity Services (GIS) browser TOKEN flow — no client_secret,
// no redirect page, no server. Returns a short-lived (~1 h) access token; there
// is NO refresh token in this flow (that needs a server-side code exchange), so
// we re-request when it expires. The token is CACHED in localStorage with its
// expiry (see _persistToken) so a page reload within its lifetime restores the
// session instantly — without this the memory-only token vanished on every
// reload, forcing a fresh OAuth round-trip (the flashing popup) that often
// failed silent refresh → a manual re-login each time. Trade-off: the token sits
// in localStorage (XSS exposure) — accepted because it is short-lived, scoped to
// `drive.appdata` only (the app can never see other Drive files), and this is a
// personal app where durability/UX outrank privacy (project rule). Re-auth is
// still needed at most ~once/hour when the token expires.
//
// OFFLINE: when offline the GIS library fails to load → cloudIsConfigured()
// returns false → the app stays fully local. Sync degrades gracefully; it is
// never required for the app to work.
//
// Loaded as a classic <script> AFTER 09-sync.js (shares global scope — no
// namespace). The module.exports footer is a no-op in the browser; it lets a
// plain-node probe drive the transport with a manually-minted access token
// (see __setAccessTokenForTest) for the §7 Phase-2 testing plan.

// ── Config (public-safe — Client ID is NOT a secret; no client_secret here) ──
const SYNC_CLIENT_ID = '493121023118-pln1rmhl37q3qi915jhbaqt57a7dkdtv.apps.googleusercontent.com';
const SYNC_SCOPE     = 'https://www.googleapis.com/auth/drive.appdata';
const SYNC_FILENAME  = 'dusk-sync.json';        // single file in the appDataFolder special space
const K_SYNC_DEVICE  = 'dusk_sync_device_v1';   // opaque per-device hint stamped into _meta (not a secret)
const K_SYNC_TOKEN   = 'dusk_sync_token_v1';    // cached {t,e}: short-lived access token + expiry (see _persistToken)

// ── In-memory auth state (never persisted) ───────────────────────────────────
let _tokenClient = null;
let _accessToken = null;
let _tokenExp    = 0;          // ms epoch when the current token should be treated as dead (with 60 s safety margin)
let _pendingAuth = null;       // {resolve, reject} of the in-flight cloudAuth() call

// ── Token cache (survives reload; see the AUTH note in the header) ───────────
// Persists the short-lived access token + its (margin-adjusted) expiry so a
// reload restores the session with no OAuth UI. Cleared on sign-out / 401 /
// expiry. No-op under node (no localStorage) → tests stay memory-only.
function _persistToken() {
    try {
        if (typeof localStorage === 'undefined') return;
        if (_accessToken && Date.now() < _tokenExp) {
            localStorage.setItem(K_SYNC_TOKEN, JSON.stringify({ t: _accessToken, e: _tokenExp }));
        } else {
            localStorage.removeItem(K_SYNC_TOKEN);
        }
    } catch (_) { /* storage full / blocked → just stay memory-only */ }
}
function _restoreToken() {
    try {
        if (typeof localStorage === 'undefined') return;
        const raw = localStorage.getItem(K_SYNC_TOKEN);
        if (!raw) return;
        const o = JSON.parse(raw);
        if (o && o.t && typeof o.e === 'number' && Date.now() < o.e) {
            _accessToken = o.t; _tokenExp = o.e;        // still valid → reuse, no popup
        } else {
            localStorage.removeItem(K_SYNC_TOKEN);      // expired/garbage → drop it
        }
    } catch (_) {}
}
_restoreToken();   // at module load, before any cloudStatus()/auto-open sync runs

// Drive's per-file `version` is the optimistic-concurrency marker; a mismatch on
// push means another device wrote in between → Phase 3 re-pulls, re-merges, retries.
class ConflictError extends Error {
    constructor(expected, actual) {
        super('Drive version conflict (expected ' + expected + ', got ' + actual + ')');
        this.name = 'ConflictError';
        this.expected = expected;
        this.actual = actual;
    }
}

// ── GIS availability / token client ──────────────────────────────────────────
function _gisReady() {
    return typeof google !== 'undefined' && google.accounts && google.accounts.oauth2;
}

function _ensureClient() {
    if (_tokenClient || !_gisReady()) return;
    _tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: SYNC_CLIENT_ID,
        scope: SYNC_SCOPE,
        callback: (resp) => {
            const p = _pendingAuth; _pendingAuth = null;
            if (resp && resp.access_token) {
                _accessToken = resp.access_token;
                // expires_in is seconds; keep a 60 s margin so we never use a token mid-expiry.
                const ttl = (typeof resp.expires_in === 'number' ? resp.expires_in : 3600) * 1000;
                _tokenExp  = Date.now() + ttl - 60000;
                _persistToken();                        // survive reload (no re-login within the hour)
                if (p) p.resolve({ ok: true, token: _accessToken });
            } else if (p) {
                p.reject(new Error('OAuth: no access token in response'));
            }
        },
        error_callback: (err) => {
            const p = _pendingAuth; _pendingAuth = null;
            if (p) p.reject(err instanceof Error ? err : new Error('OAuth: ' + ((err && err.type) || 'failed')));
        },
    });
}

// ── Public: configuration / status ──────────────────────────────────────────
// True when sync CAN run: the GIS library is loaded (so we're online enough to
// have fetched it) and the browser isn't reporting offline.
function cloudIsConfigured() {
    return _gisReady() && (typeof navigator === 'undefined' || navigator.onLine !== false);
}

function cloudStatus() {
    const signedIn = !!(_accessToken && Date.now() < _tokenExp);
    return { signedIn, expiresAt: signedIn ? _tokenExp : 0 };
}

// ── Public: auth ─────────────────────────────────────────────────────────────
// interactive:true  → may show the Google account/consent popup (the explicit
//                     "sign in" the user clicks in Phase 3's UI).
// interactive:false → SILENT refresh (prompt:'none'); rejects if Google would
//                     need to show UI. Background sync uses this so it never
//                     surprises the user with a popup — Phase 3 catches the
//                     rejection and surfaces a "sign in" control.
function cloudAuth(opts) {
    const interactive = !opts || opts.interactive !== false;
    return new Promise((resolve, reject) => {
        if (!_gisReady()) { reject(new Error('Google sign-in unavailable (offline?)')); return; }
        _ensureClient();
        if (_accessToken && Date.now() < _tokenExp) { resolve({ ok: true, token: _accessToken }); return; }
        if (_pendingAuth) { reject(new Error('OAuth: a sign-in is already in progress')); return; }
        _pendingAuth = { resolve, reject };
        try {
            _tokenClient.requestAccessToken({ prompt: interactive ? '' : 'none' });
        } catch (e) {
            _pendingAuth = null;
            reject(e);
        }
    });
}

function cloudSignOut() {
    try {
        if (_accessToken && _gisReady() && google.accounts.oauth2.revoke) {
            google.accounts.oauth2.revoke(_accessToken, () => {});
        }
    } catch (_) { /* best-effort */ }
    _accessToken = null;
    _tokenExp = 0;
    _persistToken();   // clears the cached token from storage
}

// ── Internal: token + authenticated fetch ────────────────────────────────────
// Returns a usable token or throws. SILENT only — never pops UI from the
// transport path (the app never auto-authorizes; explicit sign-in is interactive).
async function _token() {
    if (_accessToken && Date.now() < _tokenExp) return _accessToken;
    await cloudAuth({ interactive: false });   // throws if interaction would be required
    return _accessToken;
}

async function _driveFetch(url, opts, _retried) {
    opts = opts || {};
    const token = await _token();
    if (!token) throw new Error('Not authorized');
    const headers = Object.assign({}, opts.headers, { Authorization: 'Bearer ' + token });
    const resp = await fetch(url, Object.assign({}, opts, { headers }));
    // 401 → token died early; drop it, try ONE silent refresh, retry once.
    if (resp.status === 401 && !_retried) {
        _accessToken = null; _tokenExp = 0; _persistToken();   // dead token → drop cache too
        try { await cloudAuth({ interactive: false }); } catch (_) { /* fall through → throws below */ }
        return _driveFetch(url, opts, true);
    }
    return resp;
}

async function _driveError(resp, op) {
    let detail = '';
    try { const j = await resp.json(); detail = (j && j.error && j.error.message) || ''; } catch (_) {}
    return new Error('Drive ' + op + ' failed: ' + resp.status + (detail ? ' — ' + detail : ''));
}

// ── Internal: Drive REST over the appDataFolder special space ────────────────
async function _findFile() {
    const q = encodeURIComponent("name='" + SYNC_FILENAME + "'");
    const url = 'https://www.googleapis.com/drive/v3/files'
        + '?spaces=appDataFolder'
        + '&q=' + q
        + '&fields=' + encodeURIComponent('files(id,name,version,modifiedTime)');
    const resp = await _driveFetch(url);
    if (!resp.ok) throw await _driveError(resp, 'find');
    const data = await resp.json();
    return (data && data.files && data.files[0]) || null;
}

async function _downloadContent(fileId) {
    const url = 'https://www.googleapis.com/drive/v3/files/' + fileId + '?alt=media';
    const resp = await _driveFetch(url);
    if (!resp.ok) throw await _driveError(resp, 'download');
    return resp.json();
}

async function _getVersion(fileId) {
    const url = 'https://www.googleapis.com/drive/v3/files/' + fileId + '?fields=version';
    const resp = await _driveFetch(url);
    if (!resp.ok) throw await _driveError(resp, 'version');
    const data = await resp.json();
    return data && data.version;
}

async function _createFile(jsonBody) {
    // Multipart upload: part 1 = file metadata (name + appDataFolder parent),
    // part 2 = the JSON content. Fixed boundary — our JSON never contains it.
    const boundary = '====dusk_sync_multipart_boundary====';
    const body =
        '--' + boundary + '\r\n' +
        'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
        JSON.stringify({ name: SYNC_FILENAME, parents: ['appDataFolder'] }) + '\r\n' +
        '--' + boundary + '\r\n' +
        'Content-Type: application/json\r\n\r\n' +
        jsonBody + '\r\n' +
        '--' + boundary + '--';
    const url = 'https://www.googleapis.com/upload/drive/v3/files'
        + '?uploadType=multipart&fields=' + encodeURIComponent('id,version');
    const resp = await _driveFetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'multipart/related; boundary=' + boundary },
        body,
    });
    if (!resp.ok) throw await _driveError(resp, 'create');
    const data = await resp.json();
    return { fileId: data.id, version: data.version };
}

async function _updateFile(fileId, jsonBody) {
    const url = 'https://www.googleapis.com/upload/drive/v3/files/' + fileId
        + '?uploadType=media&fields=' + encodeURIComponent('id,version');
    const resp = await _driveFetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: jsonBody,
    });
    if (!resp.ok) throw await _driveError(resp, 'update');
    const data = await resp.json();
    return { fileId: data.id, version: data.version };
}

// Opaque device hint for _meta.device (helps debugging "which device wrote last").
// Not a secret; persisted because it must be stable per device.
function _deviceId() {
    try {
        if (typeof localStorage === 'undefined') return 'unknown';
        let id = localStorage.getItem(K_SYNC_DEVICE);
        if (!id) {
            id = (typeof crypto !== 'undefined' && crypto.randomUUID)
                ? crypto.randomUUID()
                : 'dev-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
            localStorage.setItem(K_SYNC_DEVICE, id);
        }
        return id;
    } catch (_) { return 'unknown'; }
}

// ── Public: pull / push (the §4 transport surface) ───────────────────────────
// Returns {empty:true} when no remote file exists yet (first sync ever), else
// {subset, version, fileId} — `version` is the marker to pass back as
// expectedVersion on the matching push.
async function cloudPull() {
    const file = await _findFile();
    if (!file) return { empty: true };
    const body = await _downloadContent(file.id);
    return {
        subset:  body && body.subset ? body.subset : null,
        version: file.version,
        fileId:  file.id,
        meta:    body && body._meta,
    };
}

// Writes the subset. No fileId → create (first push). With fileId: if
// expectedVersion is given, re-check Drive's current version first and throw
// ConflictError on drift (someone pushed in between) so Phase 3 can re-merge.
async function cloudPush(subset, opts) {
    opts = opts || {};
    const fileId = opts.fileId || null;
    const expectedVersion = opts.expectedVersion;
    const payload = JSON.stringify({
        schema: 1,
        subset: subset,
        _meta: { updatedAt: Date.now(), device: _deviceId() },
    });
    if (!fileId) return _createFile(payload);
    if (expectedVersion != null) {
        const current = await _getVersion(fileId);
        if (String(current) !== String(expectedVersion)) {
            throw new ConflictError(expectedVersion, current);
        }
    }
    return _updateFile(fileId, payload);
}

// ── node test seam (no-op in the browser) ────────────────────────────────────
// Lets a plain-node probe inject a manually-minted access token (OAuth Playground
// or a one-off live cloudAuth) so cloudPull/cloudPush can be exercised against the
// real Drive REST API without the interactive GIS popup. See SYNC-SPEC-PHASE2 §7.
function __setAccessTokenForTest(token, ttlMs) {
    _accessToken = token || null;
    _tokenExp = token ? (Date.now() + (typeof ttlMs === 'number' ? ttlMs : 3600000)) : 0;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        cloudIsConfigured, cloudStatus, cloudAuth, cloudSignOut,
        cloudPull, cloudPush, ConflictError,
        __setAccessTokenForTest,
        SYNC_CLIENT_ID, SYNC_SCOPE, SYNC_FILENAME,
    };
}
