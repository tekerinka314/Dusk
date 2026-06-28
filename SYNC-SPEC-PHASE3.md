# DUSK Sync — Phase 3 spec (live loop + gothic UI + quarantine review)

Status: **DESIGN LOCKED 2026-06-28** (UX decisions made by the user this session). Branch
`refactor/sync`. Phases 1 (merge engine `dusk/09-sync.js`, `d88e7dc`) and 2 (Drive client
`dusk/10-cloud.js`, `b9aaa24`) are DONE and untouched here. Phase 3 = the wiring that runs
`pull → merge → apply → push` for real, plus all the gothic sync UI.

**Phase 3 must not change the merge semantics or the transport API** — it only orchestrates
the existing pure functions and adds DOM. The merge engine and conflict policy are already
locked in `SYNC-SPEC.md`; the network layer in `SYNC-SPEC-PHASE2.md`.

---

## 0. Locked UX decisions (this session)

| Question | Decision |
|---|---|
| **When to sync** | **On open (silent) + pull on tab refocus + debounced push after edits (~4 s) + manual "Sync now".** Full live-feeling loop, still eventual. |
| **UI surface** | **A subtle status glyph in the header** (must NOT pull attention from the brand) that opens a small sync panel on click. |
| **Quarantine UI** | **Full review panel now** — passive unread badge + a list of losing versions with Restore / Dismiss per entry. |
| **Noise level** | **Quiet + badge.** Background sync is silent; a toast appears only for a MANUAL "Sync now" result and for errors. Conflicts surface only via the badge. |

Carried-over hard rules: never lose data; fully functional offline; the app never
auto-pops the OAuth consent (silent refresh only; the first interactive sign-in is an
explicit user click); access token in memory only.

---

## 1. New code (all in the existing classic-script setup)

- **`dusk/11-sync-ui.js`** (NEW, classic `<script>`, loaded AFTER `10-cloud.js`, BEFORE the
  inline `init()` in `index.html`). Holds the orchestration loop, the trigger wiring, the
  status-glyph state machine, the sync panel, and the quarantine review. Add `./dusk/11-sync-ui.js`
  to `CORE_ASSETS` in `sw.js` and to the `<script>` list in `index.html`. Footer
  `if (typeof module !== 'undefined') module.exports = {…}` exposes the pure helpers
  (`restoreQuarantineEntry`, status reducer) for node tests; the loop itself is tested headless
  with a mocked cloud client.
- **`index.html`**: a header status-glyph button + a sync panel popover markup + the quarantine
  review list markup; new `data-act` handlers registered in the `ACT` map (the delegation
  dispatcher in `01-core.js`).
- **`style.css`**: glyph states (rest / syncing-spin / error / pending / signed-out), panel,
  badge, quarantine list — all gothic, `prefers-reduced-motion` safe.

No build step. Globals are shared lexically across the classic scripts (the established
pattern), so `11-sync-ui.js` calls `mergeStates`, `getSyncSubset`, `cloudPull`, … by bare name.

---

## 2. The live loop — `syncNow(opts)`

Single entry point for every trigger. `opts = { interactive=false, manual=false, reason }`.

```
let _syncing = false;            // single-flight guard (coalesce overlapping triggers)
let _syncQueued = false;         // a trigger fired while syncing → run once more after
const MAX_CONFLICT_RETRY = 4;

async function syncNow(opts = {}) {
  const { interactive = false, manual = false } = opts;
  if (!cloudIsConfigured()) { setSyncStatus('offline'); return; }
  if (_syncing) { _syncQueued = true; return; }            // coalesce
  // token: silent unless the user explicitly clicked sign-in (interactive)
  try { await cloudAuth({ interactive }); }
  catch (e) { setSyncStatus('signed-out'); if (manual) toastSyncError('Войдите в Google, чтобы синхронизировать'); return; }

  _syncing = true; setSyncStatus('syncing');
  try {
    let attempt = 0, stats, conflicts;
    while (true) {
      const pulled = await cloudPull();                    // {empty:true} | {subset,version,fileId}
      const remote = pulled.empty ? null : pulled.subset;

      snapshotPreMerge(JSON.stringify(state));             // bug insurance (whole-state)
      const out = mergeStates(loadBaseline(), getSyncSubset(state), remote);
      stats = out.stats; conflicts = out.conflicts;
      applySyncSubset(state, out.merged);
      normalizeState();                                    // re-prime sigs, backfill, etc.
      saveState();                                         // local truth persisted (offline-safe)
      render();

      try {
        await cloudPush(out.merged, {
          fileId: pulled.fileId || null,
          expectedVersion: pulled.empty ? undefined : pulled.version,
        });
        saveBaseline(out.merged);                          // merged is the new agreed baseline
        _pendingPush = false;
        break;
      } catch (e) {
        if (e instanceof ConflictError && attempt < MAX_CONFLICT_RETRY) { attempt++; continue; }
        throw e;                                            // give up → caught below; local is safe
      }
    }
    _lastSyncOk = Date.now(); persistLastSync();
    setSyncStatus('ok');
    if (manual) toastSyncResult(stats, conflicts);          // quiet otherwise
    refreshQuarantineBadge();
  } catch (e) {
    setSyncStatus('error', e);
    if (manual) toastSyncError('Не удалось синхронизировать');
    // baseline NOT advanced → the change is still pending; next online sync retries.
  } finally {
    _syncing = false;
    if (_syncQueued) { _syncQueued = false; syncNow({ interactive: false }); }
  }
}
```

Notes / invariants:
- **Order is the SYNC-SPEC §8 order:** snapshot → pull → merge → apply → normalize → save →
  render → push → saveBaseline. Apply-then-push means a `ConflictError` retry re-pulls and
  re-merges against the just-merged local; the engine is convergent + idempotent, so the
  double-apply is harmless (worst case one extra render).
- **`loadBaseline()` is read fresh each loop turn but only ADVANCED after a successful push.**
  On retry the base stays the old baseline → correct 3-way detection.
- **Offline / signed-out / error never throw to the caller and never lose data:** local state
  is always saved; only the baseline lags, which the next sync reconciles.
- **First sync:** `cloudPull()` → `{empty:true}` → remote=null → engine union semantics →
  `cloudPush` with no `fileId` → create.

---

## 3. Triggers

| Trigger | Call | Guard |
|---|---|---|
| **App open** (after `init()` finishes) | `syncNow({ interactive:false })` once, deferred a tick after first render | only if `cloudIsConfigured()` |
| **Tab refocus** | `visibilitychange` (not hidden) → `syncNow({ interactive:false })` | only if signed-in (`cloudStatus().signedIn`); coalesced |
| **Back online** | `window 'online'` → `syncNow({ interactive:false })` | only if signed-in |
| **After edits** | debounced `scheduleSyncPush()` (~4 s, trailing) → `syncNow({ interactive:false })` | only if signed-in; suppressed while `_syncing`; suppressed until `_syncReady` (set after init) |
| **Manual** | panel "Синхронизировать сейчас" → `syncNow({ interactive:false, manual:true })` | always (shows result toast) |
| **Sign in** | panel button → `cloudAuth({ interactive:true })` then `syncNow({ interactive:false, manual:true })` | — |

`scheduleSyncPush()` hooks into the existing `saveState()` (one extra call at the end:
`try { if (_syncReady) scheduleSyncPush(); } catch(_){}`). It only sets a dirty marker
`_pendingPush=true` and arms a 4 s trailing debounce; if not signed-in it just leaves the
dirty marker (→ shown as a "pending" dot) and the next open/online/manual sync flushes it.
**No explicit per-operation queue is needed** — the full-state 3-way merge already carries
every un-pushed local change; the "queue" is just the local state + the un-advanced baseline.

---

## 4. Status glyph (header) — subtle, brand-respecting

A small gothic glyph button placed in the header, visually quieter than the brand
(smaller, lower opacity at rest, no fill). It is a STATUS indicator first, a panel opener
second. States drive a `data-sync` attribute on the button + a CSS class:

| State | Meaning | Visual (gothic, subtle) |
|---|---|---|
| `offline` | GIS unavailable / `navigator.onLine===false` | dim, desaturated, no motion |
| `signed-out` | configured but no token | faint outline + a tiny "connect" tick; click → panel |
| `syncing` | loop running | slow rotate/breathe (≤1 turn/1.6 s; `prefers-reduced-motion`→ static pulse) |
| `ok` | last sync succeeded | at rest; tooltip "Синхронизировано HH:MM" |
| `pending` | local edits not yet pushed (offline/queued) | small accent dot on the glyph |
| `error` | last sync threw | tinted `--danger`; click → panel shows the reason + retry |

The badge (unread quarantine count) is a separate tiny numeral chip overlaid on the glyph
when `unresolvedCount(state) > 0` (accent, not danger — it's "needs a look", not "broken").

**Glyph choice is deferred to a preview step** (per the project rule: gothic × detail ×
intuitive, reuse motifs, never generic). The ouroboros is already taken (repeat + the update
toast) so the sync glyph must be DISTINCT. Candidate motifs to mock up before coding:
interlocked twin crescents forming a loop; a reliquary/vault with paired up-down arcs; a
two-way gothic "passage" arch. Build an HTML preview of 2-3 options → user picks → then ink it.

---

## 5. Sync panel (popover)

Reuse the existing body-portal popover pattern (like `openExportMenu` / the gothic pickers:
anchored on the glyph, outside-click closes). Contents, top→bottom:

1. **Status row** — glyph + line: "Синхронизировано 14:32" / "Синхронизация…" / "Не подключено" / "Не удалось — нажмите, чтобы повторить".
2. **Account row** — "Google Drive" + **Войти** / **Выйти** (the `drive.appdata` scope has no
   profile info, so no email; show a generic connected/!connected state). Sign-out =
   `cloudSignOut()` + clear in-memory token + status `signed-out`.
3. **Синхронизировать сейчас** button → `syncNow({manual:true})` (disabled while `_syncing`).
4. **Quarantine entry** — "Конфликтов на разборе: N" → opens the review list (§6). Hidden when N=0.

Everything gothic; the panel is small and calm (quiet decision).

---

## 6. Quarantine review (full panel now)

Source: `state.syncJournal.filter(e => !e.resolved)` (the engine appends these; `unresolvedCount`
counts them). Each entry renders a row:

- **What** — human label resolved from `recType` + `recUid` (e.g. the task's current `text`,
  the group name, the note title); fall back to the type if the record is gone.
- **Kind** — `field` (поле «…» разошлось) / `subtask` / `delete-vs-edit` (удалено, но было
  изменено) / `note-both` (заметка изменена на двух устройствах).
- **Losing value** — render `entry.loser` read-only (the field value, the subtask text, the
  whole record), so the user sees exactly what would be restored.

Two actions per entry, both are NORMAL mutations (so they push out via the regular loop) and
both flip the entry `resolved=true, resolvedAt=nowTs2(), resolution=…`:

| Action | Effect | resolution |
|---|---|---|
| **Восстановить** | apply `entry.loser` back into live state as a FRESH edit (`updatedAt=nowTs2()`) so it wins on the next merge | `'restored'` |
| **Отклонить** | leave live state as-is; the loser stays only in the now-resolved journal | `'dismissed'` |

`restoreQuarantineEntry(state, entry)` per kind (PURE, node-testable):
- `field` → find the record (`recType`,`recUid`); set `rec[entry.field] = entry.loser`; bump `updatedAt`.
- `subtask` → find the parent task (`parentUid`); upsert the subtask `entry.loser` by its `uid`; bump sub + parent `updatedAt`.
- `delete-vs-edit` → re-add `entry.loser` to its collection (live array), assign a fresh device int id
  via the normal allocator, drop any matching tombstone, bump `updatedAt`.
- `note-both` → re-add `entry.loser` as a COPY (new `id`/uid so it can't clobber the winner) into notes; bump `updatedAt`.

After either action: `saveState(); render(); refreshQuarantineBadge();` and (if signed-in)
`scheduleSyncPush()` so the resolution + any restored record propagate. The journal itself is
synced (union by entry uid; resolved-flag newer-wins), so resolving on one device clears the
badge everywhere.

---

## 7. Storage keys (Phase 3)

```
dusk_sync_lastok_v1    // ms epoch of the last successful sync (panel "Синхронизировано HH:MM")
// baseline/premerge/device already exist (09-sync.js K_SYNC_BASELINE/PREMERGE, 10-cloud.js K_SYNC_DEVICE).
// _pendingPush / _syncing / _syncReady / _lastSyncOk are in-memory module vars (not persisted —
//   except _lastSyncOk mirrored to dusk_sync_lastok_v1).
```

The sync subset, baseline, journal etc. are unchanged from Phases 1–2.

---

## 8. Testing

**Headless full-loop (the key technique):** the cloud functions are globals. A Playwright test
overrides `window.cloudIsConfigured/cloudAuth/cloudStatus/cloudPull/cloudPush` with an
**in-page fake** backed by a JS object acting as the "Drive file" (subset + version). This drives
the ENTIRE Phase 3 loop deterministically with no OAuth:
1. open A (empty) → add tasks → manual sync → fake "Drive" now holds the subset, baseline saved.
2. open B (second context, same fake store) → sync → B receives A's tasks; B edits → sync → A re-syncs → sees B's edit.
3. conflicting edits on A & B (same field) → after both sync, the loser is in `syncJournal`, badge shows 1.
4. `ConflictError` path: fake `cloudPush` throws ConflictError once → loop re-pulls/re-merges/retries → succeeds, no data lost.
5. offline: `cloudIsConfigured→false` → `syncNow` sets `offline`, edits set `_pendingPush`; back online → `online` event flushes.
6. quarantine: restore flips `resolved`, re-adds the loser, badge→0; dismiss flips `resolved`, leaves state.
7. status-glyph `data-sync` transitions through syncing→ok / →error / →signed-out.
8. signed-out open: silent auth rejects → status `signed-out`, NO popup, app fully usable.

**Pure node** (`restoreQuarantineEntry` + the status reducer) via `module.exports`, like the
engine tests.

**Live two-profile** (manual, real OAuth on Pages): sign in on profile 1 → add → sync; profile 2
→ sign in → sync → confirm arrival; cross-edit → confirm conflict lands in the badge on both.
(This is the only non-headless check — `cloudAuth` needs a real Google session.)

**Regression:** re-run engine `_synctest.cjs` (39/39), `_synclive.mjs` (18/18), cloud
`_cloudtest.cjs` (24/24), `_cloudlive.mjs` (13/13), `_pentest.mjs` (6/6), `_audit3test.mjs`
(103/103), `_idea8test.mjs`, `_swtest.mjs`, `_updatetest.mjs` — Phase 3 must add zero regressions.

---

## 9. Build order (each step deployed + reviewed)

1. **Glyph preview** → pick the gothic sync glyph (HTML preview file, no live changes).
2. **The loop** `syncNow` + triggers + `_syncReady`/`_pendingPush`/debounced push + status reducer
   (no UI yet; drive via the headless fake) → headless loop tests green.
3. **Header glyph + panel** (sign in/out, sync now, status, last-synced) → visual review.
4. **Quarantine badge + review panel** (restore/dismiss, `restoreQuarantineEntry`) → node + headless tests.
5. **Live two-profile OAuth check** on Pages → confirm real round trip + conflict badge.

---

## 10. Out of scope for Phase 3 (later)

- tombstone GC + quarantine-journal GC (Phase 4).
- retry/backoff tuning, device-loss durability test matrix (Phase 4).
- Capacitor/Tauri native OAuth — custom-scheme / loopback redirect (Phase 5).
- True note co-editing (CRDT) — not planned.
- Showing the signed-in Google email (would need an extra profile scope — avoided; appdata only).
