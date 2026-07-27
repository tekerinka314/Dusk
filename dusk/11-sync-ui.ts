// ── ES-module bridge (migration 2a), part 1: HOISTED functions ──────────────
// Classic scripts hoisted these into the shared global scope before any code
// ran; publish them first so load-time cross-module calls keep working.
Object.assign(globalThis, {
    _log, _glyph, _restState, _hhmm, _statusTitle, setSyncStatus, refreshStatus, _scheduleTokenRefresh,
    refreshQuarantineBadge, _stableStringify, _recCanon, _syncCanon, _pushNeeded, _startPeriodic, _stopPeriodic, _flushIfPending,
    syncNow, scheduleSyncPush, _afterSaveState, _toastResult, _toastErr, syncSignIn, syncSignOut, syncNowManual,
    _syncPanelHtml, openSyncPanel, _refreshSyncPanelIfOpen, _escHtml, _collArrays, _findRec, _findTask, _allocId,
    _subsetToLive, restoreQuarantineEntry, _resolveEntry, _entryWhat, _entryLoserPreview, _trim, _esc, openQuarantine,
    _quarFieldRu, _quarValueRu,
    _refreshQuarOverlay, closeQuarantine, _quarListHTML, _initSyncUI,
});

// ============================================================
//  11-sync-ui.js — Sync Phase 3: live loop + gothic UI + quarantine review
// ============================================================
// Wires the pure merge engine (09) + the Drive transport (10) into a real
// "pull → merge → apply → push" loop, plus all the sync UI: a reptilian-eye
// status glyph in the header, a small sync panel (sign in/out, sync now,
// status), an unresolved-conflict badge, and the quarantine review (restore /
// dismiss the losing side of each auto-resolved conflict).
//
// Loaded as a classic <script> AFTER 08 (so init() has already run: state is
// loaded, the DOM is built, first render done). Shares the global scope — calls
// mergeStates/getSyncSubset/cloudPull/state/saveState/render/showToast/
// _openFloatMenu/nowTs/uid by bare name.
//
// Design decisions (SYNC-SPEC-PHASE3.md): sync on open + on refocus + debounced
// push after edits + manual "Sync now"; QUIET (background silent, toast only on a
// manual run or an error); conflicts surface via a passive badge + the review
// panel; the app NEVER auto-pops the OAuth consent (silent refresh only; the
// first interactive sign-in is an explicit click).

// ── module state (in-memory; only _lastSyncOk + the enabled flag persist) ─────
// TS ambient view of this module's 2a globalThis slots (runtime inits below);
// `declare` emits nothing — the single storage slot stays globalThis.*.
declare var _syncing: boolean;
declare var _syncQueued: boolean;
declare var _syncReady: boolean;
declare var _pendingPush: boolean;
declare var _applyingMerge: boolean;
declare var _lastSyncOk: number;
declare var _lastError: any;
declare var _syncEnabled: boolean;
declare var _debounceTimer: any;
declare var _tokenRefreshTimer: any;
declare var _periodicTimer: any;
declare var _retryTimer: any;
declare var _retryCount: number;
declare var _quarOverlay: any;

globalThis._syncing = false;// single-flight guard
globalThis._syncQueued = false;// a trigger fired mid-sync → run once more after
globalThis._syncReady = false;// set after init so load-time saveState() doesn't push
globalThis._pendingPush = false;// local edits not yet pushed (offline/queued)
globalThis._applyingMerge = false;// true while syncNow writes the merged state → its own saveState must NOT re-queue a push
globalThis._lastSyncOk = 0;// ms epoch of the last successful sync
globalThis._lastError = null;// last sync error (for the 'error' status)
globalThis._syncEnabled = false;// user opted into sync (first interactive sign-in)
globalThis._debounceTimer = null;
globalThis._tokenRefreshTimer = null;// proactive silent token renewal (keeps an open session alive)
globalThis._periodicTimer = null;// background pull cadence while a signed-in tab is visible
globalThis._retryTimer = null;// auto-retry after a transient (network) failure
globalThis._retryCount = 0;// consecutive transient failures (drives the backoff)

const SYNC_DEBOUNCE_MS  = 1500;   // edits settle, then push; a burst still collapses into one
const SYNC_PERIODIC_MS  = 120000;  // SAFETY NET only — realtime convergence is the WebSocket wake's
                                   // job (12-sync-wake); this just guarantees eventual catch-up if the
                                   // socket silently died. Was 30s; slowed since the wake covers realtime.
const SYNC_ONLINE_SETTLE_MS = 1500;   // wait after 'online' so the (mobile) link is actually usable
const SYNC_RETRY_DELAYS = [2000, 5000, 12000];   // backoff for transient sync failures, then give up to the next trigger
const MAX_CONFLICT_RETRY = 4;
const K_SYNC_LASTOK  = 'dusk_sync_lastok_v1';
const K_SYNC_ENABLED = 'dusk_sync_enabled_v1';

try { _lastSyncOk  = parseInt(localStorage.getItem(K_SYNC_LASTOK), 10) || 0; } catch (_) {}
try { _syncEnabled = localStorage.getItem(K_SYNC_ENABLED) === '1'; } catch (_) {}

// ── diagnostic log (shown in the sync panel; helps debug live two-device sync) ─
const _syncLog = [];
function _log(msg) {
    let hhmmss = '';
    try { const d = new Date(); const p = n => String(n).padStart(2, '0'); hhmmss = p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds()); } catch (_) {}
    _syncLog.push({ t: hhmmss, msg: String(msg) });
    if (_syncLog.length > 14) _syncLog.shift();
}

// ── status glyph (the reptilian eye) ─────────────────────────────────────────
function _glyph() { return document.getElementById('sync-glyph-btn'); }

// Resting status when no sync is in flight, in priority order.
function _restState() {
    if (typeof cloudIsConfigured !== 'function' || !cloudIsConfigured()) return 'offline';
    if (!_syncEnabled || !cloudStatus().signedIn) return 'signed-out';
    if (_lastError)   return 'error';
    if (_pendingPush) return 'pending';
    if (_lastSyncOk)  return 'ok';
    return 'rest';
}

function _hhmm(ts) {
    try { const d = new Date(ts); return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2); }
    catch (_) { return ''; }
}
function _statusTitle(kind) {
    switch (kind) {
        case 'syncing':    return 'Синхронизация…';
        case 'ok':         return 'Синхронизировано' + (_lastSyncOk ? ' ' + _hhmm(_lastSyncOk) : '');
        case 'pending':    return 'Есть несохранённые изменения';
        case 'error':      return 'Не удалось синхронизировать — нажмите, чтобы повторить';
        case 'signed-out': return 'Синхронизация выключена — нажмите, чтобы войти';
        case 'offline':    return 'Офлайн — синхронизация недоступна';
        default:           return 'Синхронизация';
    }
}
function setSyncStatus(kind) {
    const el = _glyph();
    if (!el) return;
    el.setAttribute('data-sync', kind);
    el.setAttribute('title', _statusTitle(kind));
    refreshQuarantineBadge();
}
function refreshStatus() { setSyncStatus(_syncing ? 'syncing' : _restState()); _refreshSyncPanelIfOpen(); }

// Proactive SILENT token renewal. The Drive token lives only ~1 h; left alone it
// would expire and the next action would need a (possibly visible / failing)
// refresh. Instead, while the app is open and signed in, we renew it just as the
// cached copy lapses — silently (prompt:'none' → never pops a window) — and
// reschedule on success. So a single sign-in keeps working for as long as the
// Google session + grant live (weeks/months); we only fall to 'signed-out' if a
// SILENT renewal genuinely fails (Google session reset / third-party cookies
// blocked), where one click on the eye (or S) re-auths. This is what makes
// "sign in once, stay signed in" hold past the first hour. (We fire at the cached
// expiry — which already carries a 60 s safety margin, so the real token is still
// alive while the silent request completes — because cloudAuth() early-returns
// while the cached token is still valid and wouldn't actually renew earlier.)
function _scheduleTokenRefresh() {
    clearTimeout(_tokenRefreshTimer);
    if (typeof cloudStatus !== 'function') return;
    const st = cloudStatus();
    if (!st.signedIn || !st.expiresAt) return;
    let delay = st.expiresAt - Date.now();
    if (delay < 3000) delay = 3000;                 // already lapsing → renew shortly
    if (delay > 30 * 60000) delay = 30 * 60000;     // clamp a misbehaving clock
    _tokenRefreshTimer = setTimeout(() => {
        if (typeof cloudIsConfigured !== 'function' || !cloudIsConfigured()) { _scheduleTokenRefresh(); return; }  // offline → try again later
        cloudAuth({ interactive: false })
            .then(() => { refreshStatus(); _scheduleTokenRefresh(); })   // renewed silently → keep the chain alive
            .catch(() => {
                // A silent renewal can fail TRANSIENTLY (network blip, Worker cold
                // start) right at the ~1 h expiry. Only declare 'signed-out' when the
                // session is genuinely gone — i.e. the refresh token was revoked, which
                // makes cloudStatus().signedIn flip false. While a refresh token is
                // still held, keep retrying on a short cadence so ONE hiccup can't drop
                // a live session for the rest of the session (the old bug: a single
                // failure here stopped the chain and showed 'signed-out' until reload).
                if (typeof cloudStatus === 'function' && cloudStatus().signedIn) {
                    refreshStatus();
                    clearTimeout(_tokenRefreshTimer);
                    _tokenRefreshTimer = setTimeout(_scheduleTokenRefresh, 30000);
                } else {
                    setSyncStatus('signed-out');
                }
            });
    }, delay);
}

function refreshQuarantineBadge() {
    const el = _glyph();
    if (!el) return;
    const n = (typeof unresolvedCount === 'function') ? unresolvedCount(state) : 0;
    let chip = el.querySelector('.sync-badge');
    if (n > 0) {
        if (!chip) { chip = document.createElement('span'); chip.className = 'sync-badge'; el.appendChild(chip); }
        chip.textContent = n > 9 ? '9+' : String(n);
    } else if (chip) { chip.remove(); }
}

// Decide whether a push is actually needed: only when the SYNCED CONTENT of our
// merged subset differs from what's on Drive. Crucially this ignores noise that
// legitimately differs per device but isn't real content:
//   • array ORDER (the merge rebuilds arrays from a Set → order ≠ remote's),
//   • device-local ints (`id`, `groupId`, subtask `id`) + the `_alloc` allocator,
//   • `updatedAt`/`createdAt` timestamps (a pure bump isn't a content change).
// Without this every open/refocus/periodic sync re-pushed (Drive version climbed
// forever with merge stats +0~0−0), spamming Drive and burying real edits in the
// log. Reload-safe: compares CONTENT, not the in-memory _pendingPush flag.
function _stableStringify(v) {
    if (v === null || typeof v !== 'object') return JSON.stringify(v);
    if (Array.isArray(v)) return '[' + v.map(_stableStringify).join(',') + ']';
    return '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + _stableStringify(v[k])).join(',') + '}';
}
const _PUSH_DROP = { id: 1, groupId: 1, updatedAt: 1, createdAt: 1, _groupUid: 1 };
function _recCanon(r) {
    const o: Record<string, any> = {};
    for (const k of Object.keys(r)) {
        if (_PUSH_DROP[k]) continue;
        if (k === 'subtasks' && Array.isArray(r.subtasks)) {
            o.subtasks = r.subtasks.map(s => {
                const c = {}; for (const sk of Object.keys(s)) if (sk !== 'id' && sk !== 'updatedAt' && sk !== 'createdAt') c[sk] = s[sk];
                return c;
            }).sort((a, b) => String(a.uid).localeCompare(String(b.uid)));
        } else o[k] = r[k];
    }
    return o;
}
function _syncCanon(subset) {
    if (!subset) return '∅';
    const parts = [];
    for (const [name, key] of [['tasks', 'uid'], ['groups', 'uid'], ['notes', 'id'], ['templates', 'uid'], ['noteTemplates', 'id']]) {
        const list = (subset[name] || []).slice().sort((a, b) => String(a && a[key]).localeCompare(String(b && b[key])));
        parts.push(name + '=' + _stableStringify(list.map(_recCanon)));
    }
    const tomb = (subset.tombstones || []).slice().sort((a, b) => String(a && a.uid).localeCompare(String(b && b.uid)));
    parts.push('tomb=' + _stableStringify(tomb.map(t => ({ uid: t.uid, deletedAt: t.deletedAt }))));
    const jr = (subset.syncJournal || []).map(e => ({ uid: e.uid, resolved: !!e.resolved })).sort((a, b) => String(a.uid).localeCompare(String(b.uid)));
    parts.push('jr=' + _stableStringify(jr));
    return parts.join('|');
}
function _pushNeeded(merged, remote) { return !remote || _syncCanon(merged) !== _syncCanon(remote); }

// Background pull cadence: while a signed-in tab is visible, re-sync every
// SYNC_PERIODIC_MS so two devices left open converge without any user action.
// Each tick is a cheap pull (the push is skipped when nothing local changed).
function _startPeriodic() {
    if (_periodicTimer != null) return;
    _periodicTimer = setInterval(() => {
        if (typeof document !== 'undefined' && document.hidden) return;
        if (!_syncing && typeof cloudStatus === 'function' && cloudStatus().signedIn) syncNow({ interactive: false });
    }, SYNC_PERIODIC_MS);
}
function _stopPeriodic() { if (_periodicTimer != null) { clearInterval(_periodicTimer); _periodicTimer = null; } }

// Flush pending local edits immediately (cancel the debounce) — used when the tab
// is hidden/closing so an edit made right before leaving isn't stuck in the 4 s
// debounce. Best-effort on unload; baseline-safety means a missed flush just
// re-syncs on next open.
function _flushIfPending() {
    if (_pendingPush && !_syncing && typeof cloudStatus === 'function' && cloudStatus().signedIn) {
        clearTimeout(_debounceTimer);
        syncNow({ interactive: false });
    }
}

// ── the live loop ─────────────────────────────────────────────────────────────
async function syncNow(opts) {
    opts = opts || {};
    const interactive = !!opts.interactive, manual = !!opts.manual;
    // V2-B6-01: NEVER sync against a not-yet-loaded state. 11's module body
    // runs before 08's un-awaited async init()/loadState() resolves, so the
    // on-open sync (and the exchange-promise sync, and any early visibility/
    // focus/online trigger) could read the pristine initial `state`, merge
    // "empty local" against an empty/staler Drive, and WIPE the real data by
    // landing that merge over it (probe-proven: empty Drive → 0 tasks, 5/5).
    // Gating INSIDE syncNow covers every trigger, present and future.
    if (typeof _stateLoaded !== 'undefined' && !_stateLoaded) {
        try {
            if (typeof _stateLoadedPromise !== 'undefined' && _stateLoadedPromise) await _stateLoadedPromise;
        } catch (_) {}
    }
    if (typeof cloudIsConfigured !== 'function' || !cloudIsConfigured()) {
        refreshStatus();
        if (manual) _toastErr('Офлайн — синхронизация недоступна');
        return;
    }
    if (_syncing) { _syncQueued = true; return; }

    // token: silent unless the user explicitly clicked sign-in (interactive).
    try { await cloudAuth({ interactive }); }
    catch (e) {
        _lastError = null;
        setSyncStatus('signed-out');
        if (manual) _toastErr('Войдите в Google, чтобы синхронизировать');
        return;
    }
    // A live token ⇒ sync is in use → enable (gates the on-open auto-sync) + persist.
    if (!_syncEnabled) { _syncEnabled = true; try { localStorage.setItem(K_SYNC_ENABLED, '1'); } catch (_) {} }

    // V2-B6-01 belt — pristine-state fuse. A state with NO data AND NO
    // tombstones/journal is a virgin boot state, not a user's "I deleted
    // everything" (mass-delete leaves tombstones). If a non-empty baseline
    // exists, some earlier sync saw real data → merging this pristine state
    // would register it all as deletions. Refuse — cheap insurance against
    // any future path that reaches syncNow before the state is truly loaded.
    let _fuseTripped = false;
    try {
        const _n = (a) => (Array.isArray(a) ? a.length : 0);
        const _s = state || {};
        const _pristine = !_n(_s.tasks) && !_n(_s.groups) && !_n(_s.archive)
            && !_n(_s.notes) && !_n(_s.notesArchive)
            && !_n(_s.tombstones) && !_n(_s.syncJournal);
        const _bl = typeof loadBaseline === 'function' ? loadBaseline() : null;
        _fuseTripped = !!(_pristine && _bl
            && (_n(_bl.tasks) || _n(_bl.groups) || _n(_bl.notes) || _n(_bl.notesArchive)));
    } catch (_) { /* the fuse must never break a legitimate sync */ }
    if (_fuseTripped) {
        try { console.warn('[dusk-sync] pristine-state fuse: empty state with a non-empty baseline — sync skipped (boot-order guard)'); } catch (_) {}
        try { _log('⛔ предохранитель: пустой state при непустом baseline — синк пропущен'); } catch (_) {}
        try { refreshStatus(); } catch (_) {}
        return;
    }

    _syncing = true; _lastError = null; setSyncStatus('syncing');
    _log('▶ ' + (opts.via || (manual ? 'ручной' : 'авто')) + (loadBaseline() ? '' : ' · нет baseline'));
    let stats = null, conflicts = null;
    let fileId = null, didPush = false;                         // for the cross-device wake (12-sync-wake)
    try {
        let attempt = 0;
        while (true) {
            const pulled = await cloudPull();                       // {empty} | {subset,version,fileId}
            const remote = pulled.empty ? null : pulled.subset;
            if (pulled.fileId) fileId = pulled.fileId;
            _log(pulled.empty ? 'pull: пусто (файла нет)' : 'pull: v' + pulled.version + ' · задач ' + ((remote && remote.tasks && remote.tasks.length) || 0));

            snapshotPreMerge(JSON.stringify(state));                // whole-state insurance
            const out = mergeStates(loadBaseline(), getSyncSubset(state), remote, { gcNow: Date.now() });
            stats = out.stats; conflicts = out.conflicts;
            _log('merge: +' + stats.added + ' ~' + stats.updated + ' −' + stats.deleted + ' ⚠' + conflicts.length);
            if (stats.gcTombstones || stats.gcJournal) _log('GC: −' + (stats.gcTombstones || 0) + ' надгробий, −' + (stats.gcJournal || 0) + ' журнал');
            try {
                _applyingMerge = true;                              // this saveState is the merge landing, not a user edit
                applySyncSubset(state, out.merged);
                normalizeState();                                   // re-prime sigs → merged updatedAt preserved
                saveState();                                        // local truth persisted (offline-safe)
            } finally { _applyingMerge = false; }
            try { render(); } catch (_) {}                          // a render glitch must NOT fail the sync (data already saved)

            // Push only when our merged result actually differs from Drive (or the
            // file doesn't exist yet). A pure pull (open/refocus/periodic with no
            // local change) skips the write → no needless Drive version churn.
            if (!pulled.empty && !_pushNeeded(out.merged, remote)) {
                saveBaseline(out.merged);                           // Drive already current (content-wise)
                _pendingPush = false;
                _log('push: пропуск (Drive уже актуален)');
                break;
            }
            try {
                const pr = await cloudPush(out.merged, {
                    fileId: pulled.fileId || null,
                    expectedVersion: pulled.empty ? undefined : pulled.version,
                });
                saveBaseline(out.merged);                           // merged = new agreed baseline
                _pendingPush = false;
                if (pr && pr.fileId) fileId = pr.fileId;
                didPush = true;
                _log('push: → v' + (pr && pr.version));
                break;
            } catch (e) {
                if (e instanceof ConflictError && attempt < MAX_CONFLICT_RETRY) { attempt++; _log('конфликт версий — повтор #' + attempt); continue; }
                throw e;                                            // give up → caught below; local is safe
            }
        }
        _lastSyncOk = Date.now();
        try { localStorage.setItem(K_SYNC_LASTOK, String(_lastSyncOk)); } catch (_) {}
        // cross-device wake (12-sync-wake): keep the room live; nudge peers on our push.
        if (typeof syncWakeNote === 'function' && fileId) syncWakeNote(fileId);
        if (didPush && typeof syncWakeNudge === 'function') syncWakeNudge();
        _syncing = false;
        _retryCount = 0; clearTimeout(_retryTimer);             // healthy → reset the backoff
        _log('✓ готово' + (conflicts && conflicts.length ? ' · ⚠' + conflicts.length + ' в карантин' : ''));
        _scheduleTokenRefresh();                                // keep the session alive past 1 h
        refreshStatus();
        if (manual) _toastResult(stats, conflicts);
    } catch (e) {
        _lastError = e; _syncing = false;
        setSyncStatus('error');
        _log('✗ ошибка: ' + ((e && e.message) || e));
        // Transient failure (e.g. Wi-Fi just came back but the link isn't usable
        // yet, a flaky mobile connection, a 5xx) → auto-retry with backoff instead
        // of sitting in 'error' until the next manual/refocus trigger. Local data
        // is safe (baseline not advanced → the change stays pending).
        if (_retryCount < SYNC_RETRY_DELAYS.length) {
            const delay = SYNC_RETRY_DELAYS[_retryCount++];
            clearTimeout(_retryTimer);
            _retryTimer = setTimeout(() => {
                if (typeof cloudIsConfigured === 'function' && cloudIsConfigured()) syncNow({ interactive: false });
            }, delay);
            if (manual) _toastErr('Сеть подводит — повторяю…');
        } else if (manual) {
            _toastErr('Не удалось синхронизировать');
        }
    } finally {
        if (_syncQueued) { _syncQueued = false; setTimeout(() => syncNow({ interactive: false }), 0); }
    }
}

// Debounced push after edits (called from saveState via _afterSaveState).
function scheduleSyncPush() {
    if (_applyingMerge) return;          // syncNow is landing the merged state — not a user edit, must not re-queue
    _pendingPush = true; refreshStatus();
    // An edit made WHILE a sync is in flight must not be dropped: mark the run as
    // queued so syncNow's finally re-runs once it finishes and picks up the new
    // state. (Previously this returned early before even setting _pendingPush, so
    // edits during a sync — common now that the wake makes syncs frequent — only
    // went out on the next unrelated trigger.)
    if (_syncing) { _syncQueued = true; return; }
    if (typeof cloudIsConfigured !== 'function' || !cloudIsConfigured() || !cloudStatus().signedIn) return; // stays pending; flushed on next open/online/manual
    // V2-B6-07: don't fire a sync WHILE an inline editor is focused — the merge
    // landing's render is deferred anyway (03 render-guard), but not pushing
    // avoids landing a merge mid-edit at all. Stays pending; the note/title
    // commit re-runs saveState (editor already blurred → push arms), and the
    // hidden-tab flush + 120 s periodic guarantee convergence regardless.
    if (typeof _inlineEditActive === 'function' && _inlineEditActive()) return;
    clearTimeout(_debounceTimer);
    _debounceTimer = setTimeout(() => syncNow({ interactive: false }), SYNC_DEBOUNCE_MS);
}
// Hook invoked at the END of saveState() (01-core). Guarded so load-time saves don't push.
function _afterSaveState() { if (_syncReady) scheduleSyncPush(); }

function _toastResult(stats, conflicts) {
    const c = conflicts ? conflicts.length : 0;
    const changed = stats ? ((stats.updated || 0) + (stats.added || 0) + (stats.deleted || 0)) : 0;
    let msg = changed ? 'Синхронизировано · обновлено ' + changed : 'Синхронизировано — всё актуально';
    if (c > 0) msg += ' · ' + c + ' на разборе';
    if (typeof showToast === 'function') showToast(msg);
}
function _toastErr(m) { if (typeof showToast === 'function') showToast(m); }

// ── sign in / out / manual (panel actions) ───────────────────────────────────
async function syncSignIn() {
    if (typeof closeFloatMenu === 'function') closeFloatMenu();
    // Persist the opt-in BEFORE the (worker-mode) interactive auth — that auth is a
    // full-page redirect to Google's consent screen and NEVER returns to the lines
    // below. On the return load _initSyncUI must see _syncEnabled=true so the on-open
    // sync runs and the eye doesn't sit at "выключено" until a manual sync. A stray
    // flag (user cancels consent) is harmless: with no token the eye stays signed-out.
    _syncEnabled = true;
    try { localStorage.setItem(K_SYNC_ENABLED, '1'); } catch (_) {}
    refreshStatus();
    try {
        await cloudAuth({ interactive: true });   // worker mode: navigates away → never resolves here
        await syncNow({ interactive: false, manual: true });   // legacy GIS mode: control returns here
    } catch (e) {
        refreshStatus();
        _toastErr('Вход не выполнен');
    }
}
function syncSignOut() {
    if (typeof closeFloatMenu === 'function') closeFloatMenu();
    clearTimeout(_tokenRefreshTimer);
    clearTimeout(_retryTimer); _retryCount = 0;
    _stopPeriodic();
    if (typeof syncWakeStop === 'function') syncWakeStop();
    try { cloudSignOut(); } catch (_) {}
    _syncEnabled = false; _lastError = null;
    try { localStorage.removeItem(K_SYNC_ENABLED); } catch (_) {}
    refreshStatus();
    if (typeof showToast === 'function') showToast('Синхронизация выключена');
}
function syncNowManual() {
    if (typeof closeFloatMenu === 'function') closeFloatMenu();
    syncNow({ interactive: false, manual: true });
}

// ── sync panel (body-portal popover, reuses _openFloatMenu) ───────────────────
// The panel's inner markup is a SNAPSHOT of the current sync state. Extracted so
// refreshStatus() can re-render an already-open panel in place (see
// _refreshSyncPanelIfOpen) — otherwise the status line ("выключено" / "синхронизация…"
// / "ок") only updated when the panel was closed and reopened.
// V2-B4-05: a dead panel row carries BOTH attributes. Native `disabled` blocks the
// click and keeps _apMenuKeyNav from parking focus on a row that does nothing;
// `aria-disabled` keeps the state announceable when the panel is read in browse
// mode. Single literal so the pair can never drift apart across the two rows.
const DEAD_ITEM = ' disabled aria-disabled="true"';
function _syncPanelHtml() {
    const signedIn   = (typeof cloudStatus === 'function') && cloudStatus().signedIn;
    const configured = (typeof cloudIsConfigured === 'function') && cloudIsConfigured();
    const n = (typeof unresolvedCount === 'function') ? unresolvedCount(state) : 0;
    const kind = _syncing ? 'syncing' : _restState();

    const acct = signedIn
        ? `<button type="button" role="menuitem" data-act="syncSignOut"><span>Выйти из синхронизации</span></button>`
        : `<button type="button" role="menuitem" data-act="syncSignIn"${configured ? '' : DEAD_ITEM}><span>Войти в Google Drive</span></button>`;
    const now = `<button type="button" role="menuitem" data-act="syncNowManual"${(_syncing || !signedIn) ? DEAD_ITEM : ''}><span>Синхронизировать сейчас</span></button>`;
    const quar = n > 0
        ? `<button type="button" role="menuitem" class="sync-panel-quar" data-act="openQuarantine"><span>Разобрать конфликты</span><b class="sync-panel-quar-n">${n}</b></button>`
        : '';

    // surface the actual failure reason when in error (so a sync problem is
    // diagnosable on any device instead of a blank "не удалось").
    const errLine = (kind === 'error' && _lastError)
        ? `<div class="sync-panel-err">${_escHtml(String((_lastError && _lastError.message) || _lastError).slice(0, 160))}</div>`
        : '';

    // recent sync events — diagnostic log so live two-device behaviour is visible
    // (what pulled / merged / pushed) right on the device, no console needed.
    const logRows = _syncLog.length
        ? _syncLog.slice().reverse().map(e => `<div class="sync-log-row"><span class="sync-log-t">${_escHtml(e.t)}</span>${_escHtml(e.msg)}</div>`).join('')
        : '<div class="sync-log-row" style="opacity:.6">— пока пусто —</div>';
    const log = `<details class="sync-panel-log"><summary>Журнал</summary><div class="sync-log-list">${logRows}</div></details>`;

    return `
        <div class="sync-panel-status" data-sync="${kind}">
            <span class="sync-panel-dot"></span><span>${_statusTitle(kind)}</span>
        </div>
        ${errLine}${acct}${now}${quar}${log}`;
}
function openSyncPanel(event) {
    if (event && event.stopPropagation) event.stopPropagation();
    const btn = (event && event.currentTarget) || _glyph();
    if (!btn) return;
    _openFloatMenu(btn, _syncPanelHtml(), 'sync-panel');
}
// Live-refresh the open sync panel (called from refreshStatus on every status
// change). Re-renders in place on the SAME menu element (not via _openFloatMenu,
// which would toggle it shut), preserving the popover position + the outside-click
// handler. The <details> log's open state is carried across the swap.
function _refreshSyncPanelIfOpen() {
    if (typeof _floatMenuEl === 'undefined' || !_floatMenuEl) return;
    if (!_floatMenuEl.classList || !_floatMenuEl.classList.contains('sync-panel')) return;
    const wasLogOpen = !!_floatMenuEl.querySelector('.sync-panel-log[open]');
    _floatMenuEl.innerHTML = _syncPanelHtml();
    if (wasLogOpen) { const d = _floatMenuEl.querySelector('.sync-panel-log'); if (d) d.open = true; }
}
function _escHtml(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ── quarantine review (full panel: restore / dismiss each loser) ──────────────
const _COLL_KEY = { tasks: 'uid', groups: 'uid', notes: 'id', templates: 'uid', noteTemplates: 'id' };
function _collArrays(st, recType) {
    switch (recType) {
        case 'tasks':         return [st.tasks, st.archive];
        case 'groups':        return [st.groups];
        case 'notes':         return [st.notes, st.notesArchive];
        case 'templates':     return [st.templates];
        case 'noteTemplates': return [st.noteTemplates];
        default:              return null;
    }
}
function _findRec(st, recType, recUid) {
    const arrs = _collArrays(st, recType); if (!arrs) return null;
    const key = _COLL_KEY[recType];
    for (const arr of arrs) { const hit = (arr || []).find(r => r && r[key] === recUid); if (hit) return hit; }
    return null;
}
function _findTask(st, uidVal) {
    return (st.tasks || []).find(t => t.uid === uidVal) || (st.archive || []).find(t => t.uid === uidVal) || null;
}
function _allocId(st, field) { const n = st[field] || 1; st[field] = n + 1; return n; }
// Strip subset-only annotations (_arch/_groupUid) and rebuild a live device-local record.
function _subsetToLive(st, rec, recType) {
    const { _arch, _groupUid, ...live } = rec;
    if (recType === 'tasks') {
        live.id = _allocId(st, 'nextId');
        if (_groupUid != null) { const g = (st.groups || []).find(x => x.uid === _groupUid); live.groupId = g ? g.id : null; }
        else live.groupId = null;
        (live.subtasks || []).forEach(s => { s.id = _allocId(st, 'nextSubId'); });
    } else if (recType === 'groups')  live.id = _allocId(st, 'nextGroupId');
    else if (recType === 'templates') live.id = _allocId(st, 'nextTemplateId');
    live.updatedAt = nowTs();
    return live;
}

// Mutates `st`: re-apply the losing side of one conflict so it wins on the next sync.
function restoreQuarantineEntry(st, entry) {
    const k = entry.kind;
    if (k === 'field') {
        const rec = _findRec(st, entry.recType, entry.recUid);
        if (rec) { rec[entry.field] = entry.loser; rec.updatedAt = nowTs(); }
    } else if (k === 'subtask') {
        const parent = _findTask(st, entry.parentUid);
        if (parent) {
            parent.subtasks = parent.subtasks || [];
            const sub = Object.assign({}, entry.loser); sub.updatedAt = nowTs();
            const i = parent.subtasks.findIndex(s => s.uid === sub.uid);
            if (i >= 0) parent.subtasks[i] = Object.assign(parent.subtasks[i], sub);
            else { sub.id = _allocId(st, 'nextSubId'); parent.subtasks.push(sub); }
            parent.updatedAt = nowTs();
        }
    } else if (k === 'delete-vs-edit') {
        const arrs = _collArrays(st, entry.recType);
        if (arrs) {
            const existing = _findRec(st, entry.recType, entry.recUid);
            if (existing) {
                // The record is alive again (re-synced by the other device). Apply the
                // losing copy's content ONTO it — never push a second copy with the same uid.
                const { _arch, _groupUid, id, groupId, subtasks, ...content } = entry.loser;
                Object.assign(existing, content);
                if (entry.recType === 'tasks' && subtasks) {
                    existing.subtasks = subtasks.map(s => {
                        const c = Object.assign({}, s);
                        if (c.id == null) c.id = _allocId(st, 'nextSubId');
                        return c;
                    });
                }
                existing.updatedAt = nowTs();
            } else {
                const live = _subsetToLive(st, entry.loser, entry.recType);
                const [main, arch] = arrs;
                (entry.loser._arch && arch ? arch : main).push(live);
            }
            st.tombstones = (st.tombstones || []).filter(t => t.uid !== entry.recUid);   // un-delete
        }
    } else if (k === 'note-both') {
        const copy = Object.assign({}, entry.loser); delete copy._arch;
        copy.id = uid();                     // a COPY so it can't clobber the winner
        copy.updatedAt = nowTs();
        st.notes = st.notes || []; st.notes.push(copy);
    }
}

function _resolveEntry(entryUid, action) {
    const e = (state.syncJournal || []).find(x => x.uid === entryUid && !x.resolved);
    if (!e) return;
    if (action === 'restore') restoreQuarantineEntry(state, e);
    e.resolved = true; e.resolvedAt = nowTs(); e.resolution = action;
    normalizeState();
    saveState();
    render();
    refreshStatus();
    refreshQuarantineBadge();
}

// V2-B4-07: разбор конфликтов существует ДЛЯ ЧЕЛОВЕКА, а не для отладки, поэтому
// внутренние имена полей («text», «name», «_groupUid») в него не протекают.
// Карта (recType → поле → RU); общий раздел '*' покрывает поля, одинаковые у всех
// видов записей. Незнакомое поле деградирует в нейтральное «поле «X»» — это хуже
// человеческого имени, но всё ещё честно и никогда не бросает.
const _QUAR_FIELD_RU = {
    '*': {
        color: 'Цвет метки', order: 'Порядок в списке', archivedAt: 'Архивация',
        _arch: 'Архивация',
    },
    tasks: {
        text: 'Заголовок задачи', note: 'Заметка задачи', deadline: 'Дедлайн задачи',
        priority: 'Приоритет задачи', checked: 'Отметка «выполнено»', pinned: 'Закрепление',
        repeat: 'Повтор', cycleChecked: 'Отметка цикла', nextReset: 'Возврат повтора',
        subtasksOpen: 'Раскрытие подпунктов', noteOpen: 'Раскрытие заметки',
        groupId: 'Свод', _groupUid: 'Свод',
    },
    groups:    { name: 'Название свода', color: 'Витраж свода' },
    notes:     { title: 'Заголовок записи', body: 'Текст записи', color: 'Цвет записи', fmt: 'Оформление' },
    templates: { text: 'Название шаблона', note: 'Заметка шаблона', priority: 'Приоритет шаблона',
                 deadline: 'Дедлайн шаблона', repeat: 'Повтор шаблона' },
};
const _QUAR_REC_RU = { tasks: 'задачи', groups: 'своды', notes: 'записи', templates: 'шаблона' };
const _QUAR_REC_NOM = { tasks: 'Задача', groups: 'Свод', notes: 'Запись', templates: 'Образец' };
const _QUAR_REC_DEL = { tasks: 'Задача удалена', groups: 'Свод распущен', notes: 'Запись удалена', templates: 'Образец стёрт' };

function _quarFieldRu(recType, field) {
    const byType = _QUAR_FIELD_RU[recType] || {};
    return byType[field] || _QUAR_FIELD_RU['*'][field] || null;
}

// Human label for an entry (best-effort; falls back to the record type).
function _entryWhat(e) {
    const T = { field: 'поле', subtask: 'подпункт', 'delete-vs-edit': 'удаление', 'note-both': 'заметка' };
    if (e.kind === 'subtask') {
        const t = _findTask(state, e.parentUid);
        return 'Текст подпункта' + (t && t.text ? ' — в «' + _trim(t.text) + '»' : '');
    }
    if (e.kind === 'field') {
        const r = _findRec(state, e.recType, e.recUid);
        const name = r ? (r.text || r.name || r.title || '') : '';
        const human = _quarFieldRu(e.recType, e.field);
        const what = human || ('поле «' + e.field + '» ' + (_QUAR_REC_RU[e.recType] || ''));
        return what.trim() + (name ? ' — «' + _trim(name) + '»' : '');
    }
    if (e.kind === 'delete-vs-edit') {
        const l = e.loser || {};
        // Род согласуем со словом: «Свод удалён», но «Задача удалена».
        const who = _QUAR_REC_DEL[e.recType] || 'Запись удалена';
        const name = l.text || l.name || l.title;
        return who + ' при правке на другом устройстве' + (name ? ' — «' + _trim(name) + '»' : '');
    }
    if (e.kind === 'note-both') return 'Запись изменена на двух устройствах — сохранены обе версии';
    return T[e.kind] || 'конфликт';
}
// V2-B4-07 (вторая течь): у field-конфликта превью показывало СЫРОЕ значение —
// `true`, `high`, `{"mode":"date","value":…}`. Человек, который решает «вернуть
// или отклонить», должен видеть значение своими словами.
const _QUAR_PRIO_RU   = { none: 'Нет', low: 'Низкий', medium: 'Средний', high: 'Высокий' };
const _QUAR_REPEAT_RU = { none: 'Нет', daily: 'Ежедневно', weekly: 'Еженедельно',
                          weekdays: 'По будням', monthly: 'Ежемесячно' };

function _quarValueRu(recType, field, v) {
    if (v === null || v === undefined || v === '') return '';
    if (typeof v === 'boolean') return v ? 'да' : 'нет';
    if (field === 'priority') return _QUAR_PRIO_RU[v] || String(v);
    if (field === 'repeat')   return _QUAR_REPEAT_RU[v] || String(v);
    if (field === 'deadline') {
        // Значение приехало с другого устройства — форма не гарантирована, а
        // форматтер на кривом входе не бросает, а возвращает мусор («NaN undefined
        // NaN»): проверяем результат, а не только исключение.
        let s = '';
        try { s = formatDeadlineAbsolute(v, true) || ''; } catch (err) { s = ''; }
        return (s && !/NaN|undefined|Invalid/.test(s)) ? s : 'дедлайн';
    }
    if (field === '_groupUid' || field === 'groupId') {
        const g = _findRec(state, 'groups', v);
        return g && g.name ? g.name : 'без свода';
    }
    if (field === 'nextReset' || field === 'archivedAt') {
        const d = new Date(Number(v));
        return isNaN(d.getTime()) ? String(v) : d.toLocaleDateString('ru-RU');
    }
    return typeof v === 'object' ? JSON.stringify(v) : String(v);
}

function _entryLoserPreview(e) {
    // V2-B6-04: label fields can legitimately be empty while the record still
    // carries recoverable content — notes are body-first, subtasks can be
    // note-only. Fall back to body/note so «пусто» appears only when the loser
    // truly has nothing to recover (a misleading «пусто» invites a dismissal
    // that GC later makes permanent).
    const l = e.loser;
    const v = e.kind === 'field' ? l
        : (l && (l.text || l.name || l.title || l.body || l.note)) || '';
    let s = e.kind === 'field'
        ? _quarValueRu(e.recType, e.field, v)
        : (typeof v === 'object' ? JSON.stringify(v) : String(v == null ? '' : v));
    s = s.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();   // strip any HTML, collapse ws
    return s.length > 120 ? s.slice(0, 117) + '…' : s;
}
function _trim(s) { s = String(s || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim(); return s.length > 40 ? s.slice(0, 38) + '…' : s; }
function _esc(s) { const d = document.createElement('div'); d.textContent = String(s == null ? '' : s); return d.innerHTML; }

globalThis._quarOverlay = null;

// Rows only — kept separate so a Restore/Dismiss can rebuild the list IN PLACE
// (B5-04: a close+reopen would drop the focus trap and bounce focus to the FAB
// in the middle of a review).
function _quarListHTML() {
    const entries = (state.syncJournal || []).filter(e => e && !e.resolved);
    if (!entries.length) return `<div class="sync-quar-empty">Нет конфликтов на разборе.</div>`;
    return entries.map(e => `
        <div class="sync-quar-row" data-uid="${_esc(e.uid)}">
            <div class="sync-quar-info">
                <div class="sync-quar-what">${_esc(_entryWhat(e))}</div>
                <div class="sync-quar-loser">${_esc(_entryLoserPreview(e)) || '<i>пусто</i>'}</div>
            </div>
            <div class="sync-quar-acts">
                <button type="button" class="sync-quar-restore" data-uid="${_esc(e.uid)}">Восстановить</button>
                <button type="button" class="sync-quar-dismiss" data-uid="${_esc(e.uid)}">Отклонить</button>
            </div>
        </div>`).join('');
}

function openQuarantine() {
    // B5-04: remember the real trigger BEFORE closeFloatMenu() removes the focused
    // menu row — after that document.activeElement is <body> and the helper would
    // have nothing to return focus to.
    const trigger = document.activeElement as HTMLElement;
    if (typeof closeFloatMenu === 'function') closeFloatMenu();
    closeQuarantine(true);
    const overlay = document.createElement('div');
    overlay.id = 'quar-overlay';                       // Esc → dismissModalById(id)
    overlay.className = 'modal-overlay sync-quar-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'quar-title');
    overlay.innerHTML = `
        <div class="modal sync-quar-modal">
            <h3 class="modal-title" id="quar-title">Конфликты синхронизации</h3>
            <p class="sync-quar-desc">Изменения объединены автоматически; ниже — проигравшие версии.
               «Восстановить» вернёт версию (победит при следующем синке), «Отклонить» оставит как есть.</p>
            <div class="sync-quar-list">${_quarListHTML()}</div>
            <div class="modal-actions"><button type="button" class="btn-modal-cancel sync-quar-close">Закрыть</button></div>
        </div>`;
    document.body.appendChild(overlay);
    _quarOverlay = overlay;

    overlay.addEventListener('click', (ev) => {
        const t = ev.target as HTMLElement;
        if (t === overlay || t.closest('.sync-quar-close')) { closeQuarantine(); return; }
        const rb = t.closest('.sync-quar-restore') as HTMLElement; if (rb) { _resolveEntry(rb.dataset.uid, 'restore'); _refreshQuarOverlay(); return; }
        const db = t.closest('.sync-quar-dismiss') as HTMLElement; if (db) { _resolveEntry(db.dataset.uid, 'dismiss'); _refreshQuarOverlay(); return; }
    });

    // label + focus-in + Tab trap + focus return, same machinery as the 13 static modals
    openModalWithFocus('quar-overlay');
    (overlay as any)._returnFocus =
        (trigger && document.contains(trigger) && trigger.focus) ? trigger : _glyph();
}

function _refreshQuarOverlay() {
    if (!_quarOverlay) return;
    if (unresolvedCount(state) === 0) { closeQuarantine(); return; }
    const list = _quarOverlay.querySelector('.sync-quar-list');
    if (!list) return;
    const wasInside = document.activeElement && _quarOverlay.contains(document.activeElement);
    list.innerHTML = _quarListHTML();
    // the button that was clicked is gone with its row — park focus on the next
    // actionable control so the trap still has somewhere to hold the keyboard.
    if (wasInside && !_quarOverlay.contains(document.activeElement)) {
        const next = _quarOverlay.querySelector('.sync-quar-restore') ||
                     _quarOverlay.querySelector('.sync-quar-close');
        if (next) (next as HTMLElement).focus({ preventScroll: true });
    }
}

// instant = teardown without the exit animation (reopen path); the normal path
// animates out, removes the trap and hands focus back to the trigger first.
function closeQuarantine(instant?) {
    const ov = _quarOverlay;
    if (!ov) return;
    _quarOverlay = null;
    if (instant) { ov.remove(); return; }
    closeModalWithAnim('quar-overlay', () => ov.remove());
    // the exit animation runs for ~250 ms; a reopen inside that window would put a
    // second #quar-overlay in the DOM and getElementById would keep resolving the
    // dying one (Esc → no-op). closeModalWithAnim already captured the element.
    ov.removeAttribute('id');
}

// ── register delegated actions + boot ─────────────────────────────────────────
if (typeof ACT === 'object' && ACT) {
    Object.assign(ACT, {
        openSyncPanel:  (el, e) => openSyncPanel(_synEv(el, e)),
        syncSignIn:     () => syncSignIn(),
        syncSignOut:    () => syncSignOut(),
        syncNowManual:  () => syncNowManual(),
        openQuarantine: () => openQuarantine(),
    });
}
// B5-04: the quarantine overlay is built at runtime, so it can't sit in the static
// registry in 05. Registering it here gives it the same Esc + backdrop routing (and
// the cleanup-aware close) as the 13 markup modals.
if (typeof MODAL_CLOSERS === 'object' && MODAL_CLOSERS) {
    MODAL_CLOSERS['quar-overlay'] = () => closeQuarantine();
}

function _initSyncUI() {
    refreshStatus();
    refreshQuarantineBadge();
    _syncReady = true;
    // sync on open — only if the user enabled sync (avoids silent-auth attempts
    // for anyone who never set it up; the glyph just shows 'signed-out'/'offline').
    if (_syncEnabled && typeof cloudIsConfigured === 'function' && cloudIsConfigured()) {
        setTimeout(() => syncNow({ interactive: false }), 60);
    }
    // restored a cached token on load → start the silent-renew chain even before the
    // first sync finishes, so an idle-but-signed-in tab still stays authorized.
    if (typeof cloudStatus === 'function' && cloudStatus().signedIn) { _scheduleTokenRefresh(); _startPeriodic(); }

    // Worker mode: a fresh sign-in lands back here via redirect, and the ?code
    // exchange (10-cloud `_exchangePromise`) resolves ASYNCHRONOUSLY — after the
    // sync checks above already ran with no session yet. Also covers a plain reload
    // where only the refresh token survived in storage (the access token expired →
    // expiresAt was 0 → the renew chain never armed at init). Once the exchange
    // settles into a live session, reflect it WITHOUT a manual click: enable, light
    // the eye, arm the renew + periodic chains, and pull once. signedIn==false here
    // (no token, or a signed-out user reloading) → just repaint the eye.
    if (typeof _exchangePromise !== 'undefined' && _exchangePromise && typeof _exchangePromise.then === 'function') {
        _exchangePromise.then(() => {
            if (typeof cloudStatus !== 'function' || !cloudStatus().signedIn) { refreshStatus(); return; }
            if (!_syncEnabled) { _syncEnabled = true; try { localStorage.setItem(K_SYNC_ENABLED, '1'); } catch (_) {} }
            refreshStatus();
            _scheduleTokenRefresh();
            _startPeriodic();
            syncNow({ interactive: false });   // single-flight: dedups with the on-open sync above
        }).catch(() => {});
    }

    const _signedIn = () => typeof cloudStatus === 'function' && cloudStatus().signedIn;

    document.addEventListener('visibilitychange', () => {
        if (document.hidden) { _flushIfPending(); _stopPeriodic(); return; }   // leaving → flush + idle
        if (_syncEnabled && _signedIn()) { syncNow({ interactive: false }); _startPeriodic(); }   // returning → pull + resume
    });
    // edit-then-close: push pending edits before the page goes away (best-effort).
    window.addEventListener('pagehide', _flushIfPending);
    // window regained focus (alt-tab back to the app) → pull anything new.
    window.addEventListener('focus', () => { if (_syncEnabled && _signedIn()) syncNow({ interactive: false }); });
    window.addEventListener('online',  () => {
        refreshStatus();
        if (_syncEnabled && _signedIn()) {
            _startPeriodic();
            _retryCount = 0;                          // fresh link → fresh backoff budget
            // wait a moment: 'online' fires when navigator flips, but the (mobile)
            // connection often isn't usable for a beat → an immediate fetch errors.
            clearTimeout(_retryTimer);
            _retryTimer = setTimeout(() => {
                if (typeof cloudIsConfigured === 'function' && cloudIsConfigured()) syncNow({ interactive: false });
            }, SYNC_ONLINE_SETTLE_MS);
        }
    });
    window.addEventListener('offline', () => { _stopPeriodic(); clearTimeout(_retryTimer); refreshStatus(); });
}

// 11 loads after 08 (init done) — DOM + state ready. Guard for the node test seam.
if (typeof document !== 'undefined' && document.getElementById) {
    try { _initSyncUI(); } catch (_) {}
}

// (the old module.exports footer is gone — nothing require()s this file)

// ── ES-module bridge (migration 2a), part 2: consts/classes ─────────────────
// (mutable top-level let/var declarations were converted to globalThis.* so
//  every module reads AND writes the same slot — no stale copies).
Object.assign(globalThis, {
    SYNC_DEBOUNCE_MS, SYNC_PERIODIC_MS, SYNC_ONLINE_SETTLE_MS, SYNC_RETRY_DELAYS, MAX_CONFLICT_RETRY, K_SYNC_LASTOK, K_SYNC_ENABLED, _syncLog,
    _PUSH_DROP, _COLL_KEY,
});
