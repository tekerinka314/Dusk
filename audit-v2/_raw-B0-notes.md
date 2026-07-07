# B0 raw notes (working file — not a deliverable)

Progress: read package.json/vite.config/tsconfig ✅, src/main.js ✅, src/types.ts ✅,
index.html ✅ (all 1744), dusk/01-core.ts ✅ (all 1993).
TODO: 02-grimoire, 03-render, 04-tasks, 05-edit-notes-groups, 06-deadlines,
07-dnd-filter-progress, 08-quickadd-export-init, 09-sync, 10-cloud, 11-sync-ui,
12-sync-wake, style.css (arch-level), public/sw.js, worker/src, scripts/build-portable,
tests/*, public/manifest,_headers,version.json.

## Build & entry
- Vite: base './', single bundle app.js + style.css (stable names, no hashes), modulePreload off.
- tsconfig: strict OFF, checkJs OFF, allowJs — loose Этап-3 start; types[]=[]. isolatedModules.
- src/main.js import order: sortable-global, idb-global, 01..07, **09, 10, 08**, 11, 12.
  08 runs init() top-level, needs 09/10 loaded first; 11/12 wire sync AFTER init. Order = load-bearing contract.
- index.html: fonts from Google Fonts CDN (JetBrains Mono; crossorigin for SW non-opaque caching);
  GIS script async; SW registered inline on load; update-poll inline IIFE (5s visible-only poll of
  version.json cache:no-store; visibility/focus/online/pageshow triggers; sessionStorage dusk_pending_update).
- Modals in index.html: group, rename-group, grim-link, deadline (6 modes + auto-repeat toggle +
  duration «Свеча»), prio, task-color (+gothic RGB spectrum), repeat (+anchor), note, color-filter,
  templates, backup, bulk-group, import-choice. Sync panel/quarantine = dynamic (11-sync-ui).
- FABs at body level: #btn-sound, #btn-pen-sound (right), #sync-glyph-btn (eye, left), #btn-shortcuts-toggle.
- a11y present: #live-region role=status; aria-modal dialogs; listbox/option pickers with hidden native selects.

## 01-core.ts (state, persistence, delegation)
- Bridge pattern: `declare var` ambient + Object.assign(globalThis, fns) at TOP (hoisted),
  consts/classes at file END (TDZ). state itself = globalThis.state.
- state: tasks, groups, archive, notes, notesArchive, tombstones, nextId/nextGroupId/nextSubId,
  sortMode, sortModeOverrides, subAnyMode (+ templates, nextTemplateId, noteTemplates, syncJournal added in init/normalize).
- LS keys census (01-core): duskState_v4 (K_STATE), duskState_v3 (frozen), dusk_premigration_v3,
  soundEnabled, isFiltered, currentPage, searchQuery, expandOpen, dusk_pen_sound, dusk_pen_vol,
  dusk_note_versions_v1 (grimVersions OUT of state for perf), dusk_notified_v1 (Map),
  dusk_lastDlMode, scheduleMode, groupSplitMode, todayMode, grimFocus, grimBarMode, grimTocOpen,
  scheduleModeGroups, dusk_colorFilter, dusk_noteColorFilter, dusk_focusGroup, dusk_backups_v1,
  dusk_notif, legacy: todoState_v2/todoState/data (cleaned).
- Persistence: saveState() = bumpUpdatedAt (content-sig diff) → JSON.stringify once → LS setItem
  (every time) → IDB mirror iff json !== _lastIdbStateJson (dedup, cache advances only on success)
  → maybeBackup() (async fire-forget) → _afterSaveState() hook (sync debounced push).
- Backups: ring 10, throttle 10min, dedup identical, quota-safe LS shrink loop; IDB gets full ring
  copy BEFORE shrink; loadBackups IDB-first, LS fallback.
- loadState(): IDB-first (spread over defaults, migrate, normalize, saveState to refresh LS) →
  LS v4 → v3→v4 one-time (premigration snapshot) → migrateFromOld (todoState_v2 / html 'data' via DOMParser).
- uid(): crypto.randomUUID w/ fallback. nowTs(): monotonic max(Date.now, last+1), in-memory only.
- updatedAt auto-bump: _recSig Map keyed by uid, _contentSig strips updatedAt/createdAt (and nested
  subtask timestamps from parent sig); primeRecSig() re-seeds after whole-state swap (normalizeState).
  Tracked: tasks+subs (live+archive), groups. NOT tracked: notes, templates?? — notes updatedAt is
  manual (grimoire code), templates create-only. CHECK in 02/05.
- Tombstones: addTombstone on permanent removal only; archive ≠ deletion.
- Delegation: 9 doc-level listeners + mousedown data-pd guard; ACT/ACT_DBL/ACT_INPUT/ACT_BLUR/
  ACT_KEY/ACT_OVER/ACT_OUT/ACT_PASTE/ACT_CHANGE maps; full registry read (slices 1-4h).
- undo/redo: 40-deep full-JSON stacks; undo restores form snapshot (_undoFormSnapshot); undo/redo
  re-render archive+grimoire too.
- SORTABLE_OPTS: delay 120 (delayOnTouchOnly:false → 120ms delay on DESKTOP mouse too — check UX),
  filter list, group put blocks checked/subtask items; onMove zone isolation for schedule/split.
- init(): loadState → storage.persist() → field backfills → loadGrimVersions/migrate → loadUiState
  → listeners → steppers/segmented → seed _newTaskIds/_newNoteIds → render → startDeadlineTimer →
  _initPage → register grim pickers → icon injections → notifications btn state → initGroupDnD → load anims.

## Candidate findings (unverified, D-level until probed) — DO NOT LOSE
- [FLAG-1][data] Boot freshness race IDB vs LS: saveState writes LS always, IDB deduped+async-swallowed.
  If IDB write persistently fails (quota/private-mode/eviction) LS becomes NEWER than IDB; next boot
  loadState prefers IDB (stale) and then saveState() OVERWRITES the newer LS copy with the stale
  state. Silent rollback of recent edits. Check: no recency comparison between IDB and LS at boot.
  Probe: seed LS newer than IDB → boot → observe. Also multi-tab interleave (A writes LS+IDB, B stale).
- [FLAG-2][data/UX] undo() across a landed sync merge: undoStack holds pre-merge snapshots; undo after
  merge-apply reverts remote changes locally and (via saveState→push) propagates the reversion as fresh
  edits. By design? _applyingMerge only guards the push-queue, not undo semantics. Needs runtime probe + design verdict.
- [FLAG-3][mobile] SORTABLE_OPTS delay:120 with delayOnTouchOnly:false → every DESKTOP drag waits 120ms;
  on touch 120ms may be too SHORT vs scroll intent (typical touch-hold ~200-300ms). Verify feel on device.
- [FLAG-4][perf] saveState stringifies whole state on every save; grim body keystroke-saves debounced but
  every subtask check/pin does full stringify + LS write + recSig loop. At 1000 tasks measure.
- [FLAG-5][consistency] notes/noteTemplates NOT in _trackedRecords → their updatedAt maintained by hand
  in grimoire code; verify every note mutation site stamps updatedAt (else sync merge drops note edits).
- [obs] _penBuf/PEN_GRAINS baked in 01-core; pen asset decode via atob from window.PEN_ASSET.
- [obs] `toolbar` global bridged as `toolbar: toolbarEl` (lib.dom clash noted in comment).
- [obs] loadState IDB path spreads only task defaults `{tasks,groups,archive,next*}` — other fields
  (sortMode etc.) backfilled in init/normalize — ok.
- [obs] update-poll IIFE self-heals bootBuild==null (adopts first good build) — fixed old silent-forever bug.

## 09-sync.ts (merge engine, 577)
- SYNC_COLLECTIONS registry: tasks(task,pool,intId), groups(fields), notes(whole,pool,key='id'),
  templates(fields), noteTemplates(fields,key='id'). Baseline/premerge in LS.
- _changed: absent ≠ delete (only tombstone deletes). _canon strips id/groupId/updatedAt/createdAt/key,
  subtasks canon-sorted by uid; _groupUid IS merged as a field (group membership merge).
- Deterministic journal-entry uid (kind|type|key|field/parent|loserStamp) → idempotent union.
- Subtask deletion inferred from base (no sub tombstones). delete-vs-edit → DELETE + quarantine.
- GC gated by opts.gcNow: tombstones >90d, resolved journal >90d (unresolved forever).
- _reindex prefers local int ids (UI prefs keyed by int survive), allocs next* >= local allocator.
- getSyncSubset/applySyncSubset with _arch location flags for tasks/notes pools.
- baseline saveBaseline: LS JSON — quota errors swallowed → stale baseline possible (extra conflicts,
  not loss). LS quota pressure: state + baseline + premerge + backups + note versions all in LS.

## 10-cloud.ts (transport, 481)
- Worker mode ACTIVE (SYNC_WORKER_URL = dusk-sync.petrehundima.workers.dev), test seam __DUSK_WORKER_URL.
- Auth-code+PKCE redirect flow; state+verifier in sessionStorage; _exchangePromise at module load;
  ?code stripped via history.replaceState. Legacy GIS token flow fallback.
- Tokens cached in LS (K_SYNC_TOKEN {t,e}, K_SYNC_REFRESH) — locked decision, scope drive.appdata only.
- _refreshViaWorker: 400/401 → drop refresh token (revoked); other statuses keep it (transient).
- _driveFetch: 401 → drop token, ONE silent re-auth, retry once.
- cloudPush optimistic concurrency: _getVersion re-check → ConflictError (small TOCTOU window accepted).
- cloudSignOut: best-effort revoke (no-cors), clears LS tokens.

## 11-sync-ui.ts (orchestration+UI, 726)
- Loop order per spec: pull → snapshotPreMerge → merge(gcNow) → apply(_applyingMerge guard) →
  normalize → saveState → render (failure swallowed) → _pushNeeded content-canon check →
  push (ConflictError retry ≤4) → saveBaseline; baseline ALSO advanced on push-skip (Drive current).
- Triggers: on-open (gate _syncEnabled), visibilitychange (hidden→flush+stop periodic; visible→sync),
  pagehide flush, focus, online (+1.5s settle), periodic 120s visible-only, debounced push 1.5s,
  wake socket (12). Transient error backoff [2,5,12]s then give up to next trigger.
- Token renewal chain at cached expiry; transient failure retries 30s while refresh token alive.
- Quarantine UI: overlay built dynamically, _esc used on all interpolations (check _entryLoserPreview
  strips HTML). restoreQuarantineEntry per kind; delete-vs-edit dedups by existing uid (7d007af fix).
- Panel = float menu snapshot; _refreshSyncPanelIfOpen re-renders in place; diagnostic _syncLog (14).
- note-both restore pushes copy into st.notes ALWAYS (even if loser was archived) — minor.

## 12-sync-wake.ts (125)
- DO room = SHA-256(fileId) 12 bytes; socket only visible+signed-in; reconnect backoff 1-30s;
  reconnect (not first connect) triggers catch-up sync; nudge after push; stop on signOut/hidden.

## More candidate findings
- [FLAG-6][data/multi-tab] Two tabs same origin: each holds in-memory state; LS duskState_v4
  last-writer-wins on every saveState → edits from the other tab silently overwritten locally.
  Partial rescue via cloud merge (each tab pushes its own state), but non-signed-in users have NO
  rescue. No 'storage' event listener anywhere so far. Probe in B6. Related: baseline in LS shared
  by both tabs while merges run per-tab.
- [FLAG-7][sync/UX] syncNow: `catch` of cloudAuth silent failure sets 'signed-out' even when
  _syncEnabled and refresh-token transiently failed — but _scheduleTokenRefresh covers recovery only
  if cloudStatus().signedIn (refresh token alive). Worker down for a minute at boot → eye shows
  signed-out until next trigger re-auths? cloudStatus stays signedIn (refresh token held) → _restState
  returns... setSyncStatus('signed-out') hardcoded on auth failure — cosmetic mismatch. Check runtime.
- [obs] SYNC_PERIODIC_MS comment says "30 s periodic poll" in 12 but actual 120s — stale comment.
- [obs] pagehide flush fires async syncNow — fetch during unload may not complete (no keepalive);
  acceptable (baseline safety) but note.
