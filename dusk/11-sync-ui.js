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
// _openFloatMenu/nowTs/uid by bare name. The module.exports footer is a no-op in
// the browser; it lets node import the pure helpers (restoreQuarantineEntry).
//
// Design decisions (SYNC-SPEC-PHASE3.md): sync on open + on refocus + debounced
// push after edits + manual "Sync now"; QUIET (background silent, toast only on a
// manual run or an error); conflicts surface via a passive badge + the review
// panel; the app NEVER auto-pops the OAuth consent (silent refresh only; the
// first interactive sign-in is an explicit click).

// ── module state (in-memory; only _lastSyncOk + the enabled flag persist) ─────
let _syncing      = false;     // single-flight guard
let _syncQueued   = false;     // a trigger fired mid-sync → run once more after
let _syncReady    = false;     // set after init so load-time saveState() doesn't push
let _pendingPush  = false;     // local edits not yet pushed (offline/queued)
let _lastSyncOk   = 0;         // ms epoch of the last successful sync
let _lastError    = null;      // last sync error (for the 'error' status)
let _syncEnabled  = false;     // user opted into sync (first interactive sign-in)
let _debounceTimer = null;
let _tokenRefreshTimer = null; // proactive silent token renewal (keeps an open session alive)

const SYNC_DEBOUNCE_MS  = 4000;
const MAX_CONFLICT_RETRY = 4;
const K_SYNC_LASTOK  = 'dusk_sync_lastok_v1';
const K_SYNC_ENABLED = 'dusk_sync_enabled_v1';

try { _lastSyncOk  = parseInt(localStorage.getItem(K_SYNC_LASTOK), 10) || 0; } catch (_) {}
try { _syncEnabled = localStorage.getItem(K_SYNC_ENABLED) === '1'; } catch (_) {}

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
function refreshStatus() { setSyncStatus(_syncing ? 'syncing' : _restState()); }

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
            .catch(() => { setSyncStatus('signed-out'); });              // silent failed → wait for an explicit click
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

// ── the live loop ─────────────────────────────────────────────────────────────
async function syncNow(opts) {
    opts = opts || {};
    const interactive = !!opts.interactive, manual = !!opts.manual;
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

    _syncing = true; _lastError = null; setSyncStatus('syncing');
    let stats = null, conflicts = null;
    try {
        let attempt = 0;
        while (true) {
            const pulled = await cloudPull();                       // {empty} | {subset,version,fileId}
            const remote = pulled.empty ? null : pulled.subset;

            snapshotPreMerge(JSON.stringify(state));                // whole-state insurance
            const out = mergeStates(loadBaseline(), getSyncSubset(state), remote);
            stats = out.stats; conflicts = out.conflicts;
            applySyncSubset(state, out.merged);
            normalizeState();                                       // re-prime sigs → merged updatedAt preserved
            saveState();                                            // local truth persisted (offline-safe)
            render();

            try {
                await cloudPush(out.merged, {
                    fileId: pulled.fileId || null,
                    expectedVersion: pulled.empty ? undefined : pulled.version,
                });
                saveBaseline(out.merged);                           // merged = new agreed baseline
                _pendingPush = false;
                break;
            } catch (e) {
                if (e instanceof ConflictError && attempt < MAX_CONFLICT_RETRY) { attempt++; continue; }
                throw e;                                            // give up → caught below; local is safe
            }
        }
        _lastSyncOk = Date.now();
        try { localStorage.setItem(K_SYNC_LASTOK, String(_lastSyncOk)); } catch (_) {}
        _syncing = false;
        _scheduleTokenRefresh();                                // keep the session alive past 1 h
        refreshStatus();
        if (manual) _toastResult(stats, conflicts);
    } catch (e) {
        _lastError = e; _syncing = false;
        setSyncStatus('error');
        if (manual) _toastErr('Не удалось синхронизировать');
        // baseline NOT advanced → the change is still pending; next online sync retries.
    } finally {
        if (_syncQueued) { _syncQueued = false; setTimeout(() => syncNow({ interactive: false }), 0); }
    }
}

// Debounced push after edits (called from saveState via _afterSaveState).
function scheduleSyncPush() {
    if (_syncing) return;
    _pendingPush = true; refreshStatus();
    if (typeof cloudIsConfigured !== 'function' || !cloudIsConfigured() || !cloudStatus().signedIn) return; // stays pending; flushed on next open/online/manual
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
    try {
        await cloudAuth({ interactive: true });
        _syncEnabled = true;
        try { localStorage.setItem(K_SYNC_ENABLED, '1'); } catch (_) {}
        await syncNow({ interactive: false, manual: true });
    } catch (e) {
        refreshStatus();
        _toastErr('Вход не выполнен');
    }
}
function syncSignOut() {
    if (typeof closeFloatMenu === 'function') closeFloatMenu();
    clearTimeout(_tokenRefreshTimer);
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
function openSyncPanel(event) {
    if (event && event.stopPropagation) event.stopPropagation();
    const btn = (event && event.currentTarget) || _glyph();
    if (!btn) return;
    const signedIn   = (typeof cloudStatus === 'function') && cloudStatus().signedIn;
    const configured = (typeof cloudIsConfigured === 'function') && cloudIsConfigured();
    const n = (typeof unresolvedCount === 'function') ? unresolvedCount(state) : 0;
    const kind = _syncing ? 'syncing' : _restState();

    const acct = signedIn
        ? `<button type="button" role="menuitem" data-act="syncSignOut"><span>Выйти из синхронизации</span></button>`
        : `<button type="button" role="menuitem" data-act="syncSignIn"${configured ? '' : ' disabled'}><span>Войти в Google Drive</span></button>`;
    const now = `<button type="button" role="menuitem" data-act="syncNowManual"${(_syncing || !signedIn) ? ' disabled' : ''}><span>Синхронизировать сейчас</span></button>`;
    const quar = n > 0
        ? `<button type="button" role="menuitem" class="sync-panel-quar" data-act="openQuarantine"><span>Разобрать конфликты</span><b class="sync-panel-quar-n">${n}</b></button>`
        : '';

    _openFloatMenu(btn, `
        <div class="sync-panel-status" data-sync="${kind}">
            <span class="sync-panel-dot"></span><span>${_statusTitle(kind)}</span>
        </div>
        ${acct}${now}${quar}`, 'sync-panel');
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
            const live = _subsetToLive(st, entry.loser, entry.recType);
            const [main, arch] = arrs;
            (entry.loser._arch && arch ? arch : main).push(live);
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

// Human label for an entry (best-effort; falls back to the record type).
function _entryWhat(e) {
    const T = { field: 'поле', subtask: 'подпункт', 'delete-vs-edit': 'удаление', 'note-both': 'заметка' };
    if (e.kind === 'subtask') {
        const t = _findTask(state, e.parentUid);
        return 'подпункт' + (t && t.text ? ' в «' + _trim(t.text) + '»' : '');
    }
    if (e.kind === 'field') {
        const r = _findRec(state, e.recType, e.recUid);
        const name = r ? (r.text || r.name || '') : '';
        return 'поле «' + e.field + '»' + (name ? ' — «' + _trim(name) + '»' : '');
    }
    if (e.kind === 'delete-vs-edit') {
        const l = e.loser || {};
        return 'удалённая запись' + (l.text || l.name ? ' «' + _trim(l.text || l.name) + '»' : '');
    }
    if (e.kind === 'note-both') return 'заметка изменена на двух устройствах';
    return T[e.kind] || 'конфликт';
}
function _entryLoserPreview(e) {
    const v = e.kind === 'field' ? e.loser
        : (e.loser && (e.loser.text || e.loser.name || e.loser.title)) || '';
    let s = typeof v === 'object' ? JSON.stringify(v) : String(v == null ? '' : v);
    s = s.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();   // strip any HTML, collapse ws
    return s.length > 120 ? s.slice(0, 117) + '…' : s;
}
function _trim(s) { s = String(s || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim(); return s.length > 40 ? s.slice(0, 38) + '…' : s; }
function _esc(s) { const d = document.createElement('div'); d.textContent = String(s == null ? '' : s); return d.innerHTML; }

let _quarOverlay = null;
function openQuarantine() {
    if (typeof closeFloatMenu === 'function') closeFloatMenu();
    closeQuarantine();
    const entries = (state.syncJournal || []).filter(e => e && !e.resolved);
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay sync-quar-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.innerHTML = `
        <div class="modal sync-quar-modal">
            <h3 class="modal-title">Конфликты синхронизации</h3>
            <p class="sync-quar-desc">Изменения объединены автоматически; ниже — проигравшие версии.
               «Восстановить» вернёт версию (победит при следующем синке), «Отклонить» оставит как есть.</p>
            <div class="sync-quar-list">${
                entries.length
                    ? entries.map(e => `
                        <div class="sync-quar-row" data-uid="${_esc(e.uid)}">
                            <div class="sync-quar-info">
                                <div class="sync-quar-what">${_esc(_entryWhat(e))}</div>
                                <div class="sync-quar-loser">${_esc(_entryLoserPreview(e)) || '<i>пусто</i>'}</div>
                            </div>
                            <div class="sync-quar-acts">
                                <button type="button" class="sync-quar-restore" data-uid="${_esc(e.uid)}">Восстановить</button>
                                <button type="button" class="sync-quar-dismiss" data-uid="${_esc(e.uid)}">Отклонить</button>
                            </div>
                        </div>`).join('')
                    : `<div class="sync-quar-empty">Нет конфликтов на разборе.</div>`
            }</div>
            <div class="modal-actions"><button type="button" class="btn-modal-cancel sync-quar-close">Закрыть</button></div>
        </div>`;
    document.body.appendChild(overlay);
    _quarOverlay = overlay;

    overlay.addEventListener('click', (ev) => {
        const t = ev.target;
        if (t === overlay || t.closest('.sync-quar-close')) { closeQuarantine(); return; }
        const rb = t.closest('.sync-quar-restore'); if (rb) { _resolveEntry(rb.dataset.uid, 'restore'); _refreshQuarOverlay(); return; }
        const db = t.closest('.sync-quar-dismiss'); if (db) { _resolveEntry(db.dataset.uid, 'dismiss'); _refreshQuarOverlay(); return; }
    });
}
function _refreshQuarOverlay() {
    if (!_quarOverlay) return;
    if (unresolvedCount(state) === 0) { closeQuarantine(); return; }
    closeQuarantine(); openQuarantine();
}
function closeQuarantine() { if (_quarOverlay) { _quarOverlay.remove(); _quarOverlay = null; } }

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
    if (typeof cloudStatus === 'function' && cloudStatus().signedIn) _scheduleTokenRefresh();
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden && _syncEnabled && typeof cloudStatus === 'function' && cloudStatus().signedIn) syncNow({ interactive: false });
    });
    window.addEventListener('online',  () => { refreshStatus(); if (_syncEnabled && cloudStatus().signedIn) syncNow({ interactive: false }); });
    window.addEventListener('offline', () => { refreshStatus(); });
}

// 11 loads after 08 (init done) — DOM + state ready. Guard for the node test seam.
if (typeof document !== 'undefined' && document.getElementById) {
    try { _initSyncUI(); } catch (_) {}
}

// node test seam (no-op in the browser)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { restoreQuarantineEntry, _restState: () => _restState };
}
