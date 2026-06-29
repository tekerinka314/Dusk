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
// AUTH: two modes, chosen by whether SYNC_WORKER_URL is set.
//  • WORKER mode (SYNC_WORKER_URL filled, the Cloudflare Worker deployed):
//    auth-code + PKCE flow. Sign-in redirects to Google's consent page and back
//    with ?code; the code is exchanged THROUGH the Worker (which holds the
//    client_secret) for an access token AND a long-lived REFRESH token. The
//    refresh token is stored and used to mint fresh access tokens silently —
//    no popup, for months. This is the real fix for "re-login every reload/hour".
//  • LEGACY mode (SYNC_WORKER_URL empty — default until the user deploys):
//    Google Identity Services browser TOKEN flow. Short-lived (~1 h) access
//    token, NO refresh token (browser can't hold a secret), so silent refresh
//    relies on third-party cookies and fails ~hourly on strict browsers. Kept as
//    a no-server fallback so sync works before the Worker exists.
// Tokens are CACHED in localStorage (access token both modes; refresh token in
// worker mode). Trade-off: XSS exposure — accepted because the scope is
// `drive.appdata` ONLY (the app can never see other Drive files) and this is a
// personal app where durability/UX outrank privacy (project rule).
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
const K_SYNC_REFRESH = 'dusk_sync_refresh_v1';  // long-lived REFRESH token (worker mode only) — survives months

// ── Cloudflare Worker URL (the OAuth code/refresh proxy; see worker/README.md) ─
// EMPTY = not deployed yet → fall back to the legacy GIS token flow (1 h sessions,
// re-auth roughly hourly). Once the user deploys the Worker and this is filled
// (then pushed), the app switches to the auth-code + refresh-token flow → silent
// re-auth for MONTHS, no popup. A test seam (window.__DUSK_WORKER_URL) lets the
// headless harness point at a fake Worker; production reads the constant ('').
const SYNC_WORKER_URL = (typeof window !== 'undefined' && window.__DUSK_WORKER_URL) || '';
function _useWorker() { return !!SYNC_WORKER_URL; }

// ── In-memory auth state ──────────────────────────────────────────────────────
let _tokenClient = null;
let _accessToken = null;
let _refreshToken = null;      // worker mode: long-lived; used to mint access tokens silently
let _tokenExp    = 0;          // ms epoch when the current token should be treated as dead (with 60 s safety margin)
let _pendingAuth = null;       // {resolve, reject} of the in-flight (legacy GIS) cloudAuth() call

// ── Token cache (survives reload) ─────────────────────────────────────────────
// Persists the access token + expiry (both modes) and, in worker mode, the
// long-lived refresh token. The refresh token is what removes the re-login: a
// reload — even days later — restores the session and silently mints a fresh
// access token with NO popup. Trade-off: tokens sit in localStorage (XSS
// exposure), accepted because the scope is `drive.appdata` ONLY (the app can
// never touch other Drive files) and this is a personal app where durability/UX
// outrank privacy (project rule). No-op under node (no localStorage).
function _persistToken() {
    try {
        if (typeof localStorage === 'undefined') return;
        if (_accessToken && Date.now() < _tokenExp) {
            localStorage.setItem(K_SYNC_TOKEN, JSON.stringify({ t: _accessToken, e: _tokenExp }));
        } else {
            localStorage.removeItem(K_SYNC_TOKEN);
        }
        if (_useWorker()) {
            if (_refreshToken) localStorage.setItem(K_SYNC_REFRESH, _refreshToken);
            else localStorage.removeItem(K_SYNC_REFRESH);
        }
    } catch (_) { /* storage full / blocked → just stay memory-only */ }
}
function _restoreToken() {
    try {
        if (typeof localStorage === 'undefined') return;
        if (_useWorker()) _refreshToken = localStorage.getItem(K_SYNC_REFRESH) || null;
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

// ── Worker mode: auth-code (PKCE) + refresh-token helpers ─────────────────────
function _b64url(bytes) {
    let s = ''; for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
async function _pkce() {
    const verifier = _b64url(crypto.getRandomValues(new Uint8Array(32)));
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
    return { verifier, challenge: _b64url(new Uint8Array(digest)) };
}
// The redirect target must EXACTLY match a registered Authorized redirect URI.
// Normalise away index.html so /Dusk/ and /Dusk/index.html both land on /Dusk/.
function _redirectUri() {
    const path = location.pathname.replace(/index\.html$/, '');
    return location.origin + path;
}
function _applyTokens(j) {
    if (j && j.access_token) {
        _accessToken = j.access_token;
        const ttl = (typeof j.expires_in === 'number' ? j.expires_in : 3600) * 1000;
        _tokenExp = Date.now() + ttl - 60000;       // 60 s safety margin
    }
    if (j && j.refresh_token) _refreshToken = j.refresh_token;   // only present on the first consent
    _persistToken();
}
// Kick off the interactive consent — navigates AWAY to Google, then back to
// _redirectUri() with ?code. Returns a never-resolving promise (the page is leaving).
async function _startAuthCode() {
    const { verifier, challenge } = await _pkce();
    const stateTok = _b64url(crypto.getRandomValues(new Uint8Array(16)));
    try { sessionStorage.setItem('dusk_oauth_v', verifier); sessionStorage.setItem('dusk_oauth_s', stateTok); } catch (_) {}
    const p = new URLSearchParams({
        client_id: SYNC_CLIENT_ID,
        redirect_uri: _redirectUri(),
        response_type: 'code',
        scope: SYNC_SCOPE,
        access_type: 'offline',         // ← ask Google for a refresh token
        prompt: 'consent',              // ← force the refresh token even on re-consent
        include_granted_scopes: 'true',
        code_challenge: challenge,
        code_challenge_method: 'S256',
        state: stateTok,
    });
    location.assign('https://accounts.google.com/o/oauth2/v2/auth?' + p.toString());
    return new Promise(() => {});       // page is unloading; never settles
}
// On load: if we came back from Google with ?code, exchange it via the Worker.
// Stored in _exchangePromise so cloudAuth() awaits it before deciding anything.
async function _maybeHandleRedirect() {
    if (!_useWorker() || typeof location === 'undefined') return;
    let sp; try { sp = new URLSearchParams(location.search); } catch (_) { return; }
    const code = sp.get('code'), st = sp.get('state');
    const clean = _redirectUri();
    if (!code) return;
    let expect = null, verifier = null;
    try { expect = sessionStorage.getItem('dusk_oauth_s'); verifier = sessionStorage.getItem('dusk_oauth_v'); } catch (_) {}
    if (st && expect && st === expect && verifier) {
        try {
            const r = await fetch(SYNC_WORKER_URL + '/exchange', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code, redirect_uri: clean, code_verifier: verifier }),
            });
            if (r.ok) _applyTokens(await r.json());
        } catch (_) { /* offline / worker down → user can retry sign-in */ }
    }
    try { sessionStorage.removeItem('dusk_oauth_s'); sessionStorage.removeItem('dusk_oauth_v'); } catch (_) {}
    try { history.replaceState(null, '', clean); } catch (_) {}   // strip ?code from the URL bar
}
const _exchangePromise = _maybeHandleRedirect();   // runs once at load

async function _refreshViaWorker() {
    if (!_refreshToken) throw new Error('no refresh token');
    const r = await fetch(SYNC_WORKER_URL + '/refresh', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: _refreshToken }),
    });
    if (!r.ok) {
        if (r.status === 400 || r.status === 401) { _refreshToken = null; _persistToken(); }  // revoked → force re-sign-in
        throw new Error('refresh failed: ' + r.status);
    }
    _applyTokens(await r.json());
    return _accessToken;
}

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
// True when sync CAN run. Worker mode needs no GIS library (auth is a redirect +
// fetch), only that we're not offline. Legacy mode needs the GIS library loaded.
function cloudIsConfigured() {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return false;
    return _useWorker() ? true : _gisReady();
}

function cloudStatus() {
    if (_useWorker()) {
        // A refresh token means a live session even when the access token has lapsed
        // (it will be minted silently on demand) → signed in.
        const signedIn = !!_refreshToken || !!(_accessToken && Date.now() < _tokenExp);
        return { signedIn, expiresAt: _tokenExp || 0 };
    }
    const signedIn = !!(_accessToken && Date.now() < _tokenExp);
    return { signedIn, expiresAt: signedIn ? _tokenExp : 0 };
}

// ── Public: auth ─────────────────────────────────────────────────────────────
// interactive:true  → may show the Google consent UI (the explicit "sign in" the
//                     user clicks). Worker mode: navigates to Google's consent
//                     page (full redirect); legacy: the GIS account popup.
// interactive:false → SILENT. Worker mode: refresh the access token from the
//                     stored refresh token (no UI ever). Legacy: prompt:'none'.
//                     Background sync uses this so it never surprises the user;
//                     a rejection surfaces a "sign in" control instead.
async function cloudAuth(opts) {
    const interactive = !opts || opts.interactive !== false;

    if (_useWorker()) {
        await _exchangePromise;                       // finish any ?code redirect exchange first
        if (_accessToken && Date.now() < _tokenExp) return { ok: true, token: _accessToken };
        if (_refreshToken) {                          // silent: mint a fresh access token
            try { await _refreshViaWorker(); return { ok: true, token: _accessToken }; }
            catch (e) { if (!interactive) throw e; }   // refresh died → fall through to interactive
        }
        if (interactive) return _startAuthCode();     // navigates away; promise never settles
        throw new Error('signed-out');
    }

    // ── legacy GIS token flow (no Worker deployed yet) ──
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
    // Best-effort revoke at Google so the grant is actually killed, not just forgotten.
    try {
        if (_useWorker()) {
            const tok = _refreshToken || _accessToken;
            if (tok) fetch('https://oauth2.googleapis.com/revoke?token=' + encodeURIComponent(tok), { method: 'POST', mode: 'no-cors' });
        } else if (_accessToken && _gisReady() && google.accounts.oauth2.revoke) {
            google.accounts.oauth2.revoke(_accessToken, () => {});
        }
    } catch (_) { /* best-effort */ }
    _accessToken = null;
    _refreshToken = null;
    _tokenExp = 0;
    _persistToken();   // clears the cached tokens from storage
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
