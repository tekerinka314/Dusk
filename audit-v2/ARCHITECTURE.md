# DUSK / Grimuar — Architecture Model (Audit v2, B0)

Built by Opus 4.8 from a full read of the codebase (2026-07-07). This is the
shared mental model every later batch references, and it is deliverable #13
(Architecture review) in raw form. Evidence level for everything here: **A**
(read from source). Line refs are `file:line` at the time of reading; re-grep by
symbol name before acting (numbers drift).

---

## 1. What the product is

One PWA, two apps sharing one `state` blob, one render/persistence/sync spine:

- **DUSK** — gothic task manager: tasks, subtasks, groups, deadlines (6 modes),
  recurring/cycle tasks, archive, templates, quick-add, bulk ops, DnD, undo/redo.
- **Grimuar** — gothic rich-text notes ("записи"): contenteditable WYSIWYG editor
  (headings, lists, checklists, tables, callouts, code blocks, links), version
  history ("Летопись"), templates, crypt archive ("Склеп"), markdown/ZIP
  import-export, in-note find, color labels, pin, bulk ops.

Three "pages" (SPA, no router): `main` (tasks), `archive` (task crypt), `notes`
(Grimuar). Switched by `switchPage()` (02-grimoire:84). Sync spans both apps.

Personal-use PWA. Offline-first: local copy is source of truth; Google Drive
(`appDataFolder`) is the sync/backup channel. Hard rule #1: **never lose data.**

---

## 2. File / module topology

Build = **Vite** (single bundle). Entry `src/main.js` side-effect-imports, in a
**load-bearing exact order**:
`sortable-global.js` → `idb-global.js` → `dusk/01…07` → **`09` → `10` → `08`** →
`11` → `12`. (08 runs `init()` at top level and needs 09/10 loaded; 11/12 wire
sync after init.)

The 12 `dusk/*.ts` modules do NOT import each other. They share state and
functions through **globalThis bridges** (migration 2a): each file `declare var`s
the ambient slots, `Object.assign(globalThis, {…fns})` at the TOP (hoisted
functions, so load-time cross-module calls work) and `Object.assign(globalThis,
{…consts/classes})` at the END (TDZ). Mutable top-level state is written as
`globalThis.*` (single slot, no split-brain). TypeScript treats these as
script-mode files (no import/export) so their top-level `declare`s merge into one
shared ambient namespace — **this is why a real `import` inside a dusk module is
forbidden** (it would flip the file to ES-module mode and sever the merge; the
idb-keyval and Sortable deps are bridged via `src/idb-global.js` /
`src/sortable-global.js` for exactly this reason).

| File | Lines | Responsibility |
|---|---|---|
| `01-core.ts` | 1993 | state shape, IC icon set, persistence (LS+IDB), backups ring, load/migrate, uid/nowTs, updatedAt auto-bump, tombstones, event-delegation dispatcher + the whole `ACT*` registry, undo/redo, SORTABLE_OPTS, `init()` |
| `02-grimoire.ts` | 4053 | the ENTIRE Grimuar app + `switchPage`/page nav + version history store |
| `03-render.ts` | 2058 | `render`/`renderListOnly`/`_reconcile`, task-list render (normal/schedule/split/combined), group bar/select, archive render, sort picker, colour filter, snooze, float-menu, import, notifications, group DnD, bulk group/colour/deadline |
| `04-tasks.ts` | 2546 | `createTaskEl`, subtask section builder/`renderSubList`, form subtasks, task CRUD, `toggleCheck` + cycle logic, archive ops, templates, backup modal, repeats (`getNextResetTimestamp`/`checkCycleResets`/`shiftDeadline`), promote/demote, sub-check modes |
| `05-edit-notes-groups.ts` | 1669 | unified inline note editor (task+subtask), inline text edit, task-note modal, priority/colour modals + gothic RGB spectrum, group modals, collapse/expand, `openModalWithFocus`/`closeModalWithAnim`/`MODAL_CLOSERS`, focus trap, `announce` |
| `06-deadlines.ts` | 1262 | deadline modal (all 6 modes), auto-repeat coupling, event-duration ("Свеча"), monthday/year steppers, `deadlineStatus`/`getDeadlineTimestamp`/`deadlineWindow`/format helpers, the 2s deadline timer, badge live-tick |
| `07-dnd-filter-progress.ts` | 1283 | Sortable setup (all zones), drag add/end + priority inheritance, filter/schedule/today/split toggles, split-section builders, search, form priority/colour/repeat, expand, progress, visibility/empty-states, sound engine, pen-sound, toast, tags/highlight, `escHtml` |
| `08-quickadd-export-init.ts` | 1531 | quick-add parser (`!`/`*`/`%`) + typeahead, export/import, duplicate/pin, main bulk select, global keyboard shortcuts, shortcuts hint, `SegmentedInput` class, month/weekday/form-weekday pickers, `init()` invocation |
| `09-sync.ts` | 577 | **pure** 3-way merge engine + subset extract/apply + baseline/premerge + GC. No DOM/network. |
| `10-cloud.ts` | 481 | Google Drive transport + OAuth (worker-mode PKCE + legacy GIS). No merge, no state mutation. |
| `11-sync-ui.ts` | 726 | the live `syncNow` loop + triggers + status glyph (reptilian eye) + sync panel + quarantine review. Orchestrates 09+10. |
| `12-sync-wake.ts` | 125 | cross-device WebSocket wake (Durable Object room). |

Non-bundle: `index.html` (markup + all static modals + inline SVG + `<symbol>`
defs + SW registration + update-poll IIFE), `style.css` (8120 lines, all
styling), `public/*` (sw.js, manifest, version.json, icons, bg-gothic.jpg,
pen-asset.js, _headers), `worker/src/index.js` (Cloudflare Worker; NOT in Vite
build), `scripts/build-portable.mjs` (single-file `dusk-portable.html` fallback).

---

## 3. State shape & storage layers

`state` (globalThis.state, 01-core:690):
`tasks[]`, `groups[]`, `archive[]`, `notes[]`, `notesArchive[]`, `tombstones[]`,
`nextId`/`nextGroupId`/`nextSubId` (device-local int DOM keys), `sortMode`,
`sortModeOverrides{}`, `subAnyMode`; plus added in init/normalize: `templates[]`,
`nextTemplateId`, `noteTemplates[]`, `syncJournal[]`.

**Identity model (Idea 8, Design B):** every task/group/subtask/template carries
a stable string `uid` (sync identity) AND a device-local int `id` (DOM/onclick
key, allocated by `next*`). Notes/noteTemplates use a uuid string `id` as BOTH
DOM key and sync key. `task.groupId` is a device-local int → the merge ships it
as `_groupUid` and rebuilds it on the target device.

**`updatedAt`** — number, monotonic (`nowTs()` = `max(Date.now, _lastTs+1)`,
in-memory only, not persisted). Maintained two ways: (a) **auto-bump by content
diff** in `saveState`→`bumpUpdatedAt` for tasks+subtasks+groups (`_recSig` map of
content signatures, re-primed by `primeRecSig` after every whole-state swap);
(b) **hand-stamped** everywhere the auto-diff can't see it — archive/restore
(location changes), and ALL note mutations (notes/templates are NOT in
`_trackedRecords`, so Grimuar stamps `note.updatedAt = nowTs()` by hand in
grimTitleInput/grimBodyInput/_grimAfterEdit/archive/restore). Pin & colour on
notes deliberately do NOT bump (labels; note merge is whole-record keep-both so a
label change is still detected by content-diff and, if it loses a tiebreak, is
preserved in the quarantine journal).

**Tombstones** — permanent deletions push `{uid,type,parentUid,deletedAt}` to
`state.tombstones` (archiving is NOT a deletion → never tombstones). Live arrays
stay clean. Every permanent-delete path tombstones EXCEPT `grimEmptyCrypt`
(02-grimoire:1517) — see FINDINGS V2-B0-01.

### Storage layers
- **localStorage** — the live fallback, written on EVERY `saveState` (never a
  frozen snapshot). Keys (census):
  - `duskState_v4` (K_STATE, active), `duskState_v3` (frozen rollback),
    `dusk_premigration_v3` (one-time raw v3 snapshot).
  - Sync: `dusk_sync_baseline_v1`, `dusk_sync_premerge_v1`, `dusk_sync_lastok_v1`,
    `dusk_sync_enabled_v1`, `dusk_sync_token_v1`, `dusk_sync_refresh_v1`,
    `dusk_sync_device_v1`; OAuth transient in sessionStorage (`dusk_oauth_v/s`),
    update transient (`dusk_pending_update`).
  - Backups: `dusk_backups_v1` (ring). Note history: `dusk_note_versions_v1`.
  - UI/prefs (NOT synced): `soundEnabled`, `isFiltered`, `currentPage`,
    `searchQuery`, `expandOpen`, `scheduleMode`, `groupSplitMode`, `todayMode`,
    `scheduleModeGroups`, `grimFocus`, `grimBarMode`, `grimTocOpen`,
    `dusk_colorFilter`, `dusk_noteColorFilter`, `dusk_focusGroup`,
    `dusk_pen_sound`, `dusk_pen_vol`, `dusk_lastDlMode`, `dusk_milestone`,
    `dusk_notif`, `dusk_notified_v1`, per-group `groupCollapsed_*` /
    `groupSplit_*` / `subSplit_*` / `archMonth_*`.
  - Legacy cleaned on migrate: `todoState_v2`, `todoState`, `data`.
- **IndexedDB** (idb-keyval, Этап 4) — the PRIMARY read source at boot for
  `K_STATE` and `dusk_backups_v1`. Mirror-written by `saveState` (deduped: skip
  when byte-identical to last confirmed write, `_lastIdbStateJson`) and
  `persistBackups`. Both IDB helpers swallow every error (LS stays authoritative
  on failure).
- **Google Drive `appDataFolder`** — one file `dusk-sync.json` holding the synced
  subset. See §7.
- **portable build** — `dusk-portable.html` lives in the `file://` origin's OWN
  localStorage (separate island; data moves via export/import).

### Boot / load order (`loadState`, 01-core:1109)
IDB `K_STATE` first → else LS v4 → else one-time v3→v4 (snapshots raw v3 to
`dusk_premigration_v3`, keeps v3 frozen) → else `migrateFromOld` (todoState_v2 /
old HTML via DOMParser). Every path: `migrateTasks` (idempotent uid/updatedAt
backfill + deadline-shape migrations + subtask backfill) → `normalizeState`
(ensures optional arrays, backfills group/template uids+timestamps, `migrateNotes`
sanitizes bodies, `primeRecSig`) → `saveState` (refreshes LS mirror).
**Boot freshness note:** IDB is preferred with no recency comparison vs LS; if IDB
persistently fails to write but LS keeps updating, a boot could load a stale IDB
copy then overwrite the newer LS. See FINDINGS V2-B0-02.

---

## 4. Rendering pipeline

- `render()` (03-render:50) — full pass, re-entrancy-guarded (`_rendering` +
  `_renderQueued` coalesce; nested renders from synchronous blur handlers are
  deferred, never nested). Calls renderTasks → renderGroupBar → renderGroupSelect
  → updateProgress → updateVisibility → updateArchiveBadge → applyListStagger →
  setupSortables → attachPlainPasteHandlers → positionDragHandles →
  updateCollapseAllBtn → renderTagCloud → _syncCriticalPulse → updateTemplatesBtn.
- `renderListOnly()` (03-render:78) — hot-path partial (check/pin/priority/colour):
  skips group bar / select / tag cloud / archive badge.
- **Reconciliation** (`_reconcile`, 03-render:104) — in-place DOM diff (kills the
  old `innerHTML=''` flicker). `renderTasks` harvests live nodes into `_liCache`
  (whole cards) + `_subCache` (subtask sections) + `_secCache` (group sections);
  `createTaskEl` computes a full `_liSig` signature and REUSES an unchanged live
  `<li>` verbatim (subtree, open notes, focus, Sortable all preserved). Subtask
  rows reuse via a `data-sig` hash. Deadline cards differ each second (live
  countdown) → they rebuild; everything else reuses.
- Modes: normal (cards direct children), **schedule** (sorted by deadline into
  "С дедлайном"/"Без дедлайна" zones), **split** (active/done zones per group),
  **combined** (deadline outer × active/done inner), each with its own reconciling
  builder (`_renderScheduleBody`/`_renderSplitBody`/`_renderScheduleSplitBody`) +
  a legacy non-reconciling `append*Section` twin (used nowhere in the reconciling
  path now — potential dead/parallel code, verify in B10).
- Grimuar render: `renderNotes` → `renderGrimList` (master list, leaf snippets
  with structure glyphs + windowed search excerpts) + `renderGrimDetail` (the
  open note's editor). Own reconcile-ish leaf sync (`_grimSyncActiveLeaf`).

---

## 5. Event flow (delegation)

01-core installs ONE document-level listener per channel (9 total): `click`
(`data-act`→`ACT`), `dblclick` (`data-actdbl`), `input` (`data-actinput`),
`focusout` (`data-actblur`), `keydown` (`data-actkey`), `mouseover`
(`data-actover`), `mouseout` (`data-actout`), `paste` (`data-actpaste`), `change`
(`data-actchange`), plus a `mousedown` `data-pd` focus-steal guard. `data-stop`
opts an element into `stopPropagation`. The `ACT*` maps are populated across
"slices" 1–4h in 01-core (task rows, subtasks, group headers, sort/colour, float
menus, list widgets, form subtasks, group widgets, Grimuar editor/list/toolbar,
static modal controls). Adapters read ids from the nearest `.task-item[data-id]`
/ `.subtask-item[data-tid/-sid]` / `.group-section[data-group-id]` ancestor.
**7c contract: zero inline `on*=` — EXCEPT one dynamic survivor:**
`_taskNotePersist` (05:658) still does `mbtn.setAttribute('onclick', …)`. See
FINDINGS V2-B0-03.

Global keyboard map (08:525): Ctrl+Z/Y/Shift+Z undo/redo (skipped inside the
Grimuar editor — native undo owns it), Esc closes top modal / find bar / clears
focus, Ctrl+F focuses search on notes/archive, F3 steps find, per-page J/K nav +
N new + context actions (X/E/D/Del/P/L/M/R/T on tasks; E/Del/T on notes), `/`
search, `S` sync. Layout-independent via `e.code` (`_matchKey`).

Pop-overs/menus use a shared body-portal float-menu (`_openFloatMenu`, 03:1018)
with outside-pointerdown close + a same-anchor reopen-suppress. Gothic dropdown
pickers share one delegated outside-click registry (`_gothicPickers` /
`registerGothicPicker`, 03:1732).

---

## 6. Timers & lifecycle

- **Deadline timer** (06:1147): `setInterval(2000)` → `checkCycleResets` +
  (microtask) `updateDeadlineBadges` + `updateCycleUntilLabels` +
  `_checkDeadlineNotifications`. Plus a `visibilitychange` immediate refresh
  (background-tab throttling recovery). `checkCycleResets` defers 600ms while a
  drag is in progress (avoid destroying the active Sortable).
- **Sync timers** (11): debounced push (1500ms), periodic pull (120000ms,
  visible+signed-in only), token-refresh chain (at cached expiry), transient
  retry backoff [2,5,12]s. Wake socket reconnect backoff 1–30s (12).
- **Update poll** (index.html IIFE): version.json every 5000ms while visible +
  on visible/focus/online/pageshow.
- **Backups**: throttled 10min ring of 10 snapshots, on every saveState.
- `init()` (01:925, async): loadState → storage.persist() → field backfills →
  grim version load/migrate → loadUiState → listeners → steppers/segmented inputs
  → pickers → seed `_newTaskIds`/`_newNoteIds` → render → deadline timer →
  _initPage → register grim pickers → icon injections → notif button → group DnD
  → load animations. Called (not awaited) at 08:1524; sync UI `_initSyncUI` runs
  after 11 loads (post-init).

---

## 7. Sync architecture (Guardrail A)

Layered cleanly: **model** (state + updatedAt + tombstones, 01) → **merge** (pure,
09) → **transport** (10) → **orchestration** (11) → **wake** (12) → **worker**
(separate deploy). Merge never touches DOM/network; transport never merges or
mutates state; the loop (11) is the only place they meet.

- **Subset** (`getSyncSubset`, 09:504): tasks+archive as one pool flagged `_arch`,
  groups, notes+notesArchive as one pool flagged `_arch`, templates, noteTemplates,
  tombstones, syncJournal, `_alloc` (device-local, ignored by the puller).
- **Merge** (`mergeStates(base, local, remote, {gcNow})`): per-uid 3-way. Base-diff
  is the clock-independent conflict DETECTOR; `updatedAt` is only the same-thing
  tiebreaker. Absent ≠ delete (only a tombstone deletes) — the core "never
  resurrect / never vanish" guard. Strategies: tasks = field-level + subtasks-as-set;
  groups/templates = field-level; notes = whole-record keep-both. delete-vs-edit →
  default DELETE + quarantine the edit. All conflicts auto-resolve into live state;
  losers append to `syncJournal` (append-only union by deterministic entry uid).
  GC (opts.gcNow) prunes tombstones + resolved journal entries >90d on the merged
  output → both devices converge.
- **Transport** (10): worker-mode PKCE auth-code flow (redirect → Worker exchanges
  `code` for access+refresh via the client_secret it holds) is ACTIVE
  (`SYNC_WORKER_URL` = dusk-sync.petrehundima.workers.dev); legacy GIS token flow
  is the fallback. Tokens cached in LS (accepted XSS trade-off; scope =
  `drive.appdata` only). Drive REST over appDataFolder; optimistic concurrency via
  per-file `version` → `ConflictError`.
- **Loop** (`syncNow`, 11:245): single-flight (`_syncing`+`_syncQueued`); order =
  auth → pull → snapshotPreMerge(whole state) → merge(gcNow) →
  apply(`_applyingMerge` guard so the merge-landing save doesn't re-queue a push) →
  normalize → saveState → render (failure swallowed) → `_pushNeeded` content-canon
  check → push (ConflictError retry ≤4) → saveBaseline. Baseline advances only
  after a successful push (or a confirmed no-op) → offline/error never lose data
  (change stays "pending"). Triggers: on-open, visibilitychange, focus, online
  (+settle), periodic, debounced-push, wake nudge.
- **Worker** (worker/src/index.js): `/exchange` + `/refresh` (holds client_secret),
  `/ws` → `SyncRoom` Durable Object (relays a one-byte "changed" nudge to peers,
  hibernation API, free tier). CORS allowlist echoes the request Origin from
  `ALLOWED_ORIGIN` (`dusk-du4.pages.dev`), `Vary: Origin`.

**Test coverage of sync:** merge engine (39 internal cases), GC (13), transport
(24, mocked fetch), worker OAuth (17), IDB dual-write, drive wire-format pin — all
green. **Untested:** the whole `syncNow` orchestration loop (11), wake (12), and
the entire UI/logic surface (see §9).

---

## 8. Build / deploy / PWA

- **Vite** (`vite.config.js`): `base:'./'`, single bundle `app.js` + `style.css`
  (stable names, no hashes), modulePreload off. `public/` copied verbatim.
- **tsconfig**: strict OFF, checkJs OFF, allowJs — loose Этап-3 start; `types:[]`.
  Migration is deliberately loose (`any` pervasive via `declare var … any`).
- **Deploy**: Cloudflare Pages, git-connected, production branch `refactor/sync`,
  build `npm ci && npm run build`, output `dist`. Failed build keeps last deploy.
  Origin `https://dusk-du4.pages.dev`. OAuth works only on prod origin.
- **Service worker** (public/sw.js, `CACHE='dusk-shell-v8'`): network-first for the
  same-origin shell (2.5s timeout → cache fallback), `no-cache` revalidation to
  beat Pages' max-age; version.json network-only (update marker); Google Fonts
  network-first+cache; CORE_ASSETS atomic addAll (shell), OPTIONAL_ASSETS
  best-effort (bg-gothic 2.3MB, pen-asset); opaque responses never cached (storage
  padding avoidance). Registered inline in index.html.
- **Update flow**: `version.json` build stamp; inline IIFE polls (5s visible) →
  gothic "Обновить" toast (ouroboros glyph) → manual reload → "установлено"
  confirm. `_headers` sets version.json no-store + sw.js no-cache (Pages only).
- **Manifest**: standalone, `#03010a` theme, 192/512 SVG icons (`any maskable`),
  `orientation:any`, start_url `./index.html`, scope `./`.
- **Viewport**: `width=device-width, initial-scale=1` — **no `viewport-fit=cover`**,
  and only ONE `env(safe-area-inset-*)` use in all CSS → safe-area insets are
  effectively inert on notched/gesture-nav devices. See FINDINGS V2-B0-04 (B1).
- **Portable** (`build:portable`): inlines app.js/style.css/pen-asset/bg into one
  `dusk-portable.html` for file:// use; separate localStorage island.

---

## 9. Styling / animation / mobile architecture (for B1/B2/B7)

- **CSS tokens** (style.css:1–120): palette (`--bg-*` near-black, `--text-*`
  violet, `--accent-*`, `--border-*`), deadline status vars (ok/warn/urgent/
  critical/over, red only for critical/over), motion tokens `--ease-gothic/spring/
  emerge/sink` + `--dur-micro(80)/quick(220)/standard(340)/collapse(280)/
  ritual(520)/ambient(6000)`. `prefers-reduced-motion` guards present in many
  blocks (completeness = B7).
- **Breakpoints**: `max-width` at 820, 720, 640, 560, 520, 360; `min-width:641`
  (desktop-only reveals); `(hover:none) and (pointer:coarse)` block (~5622) for
  touch affordance reveals; `(hover:none)` one-offs. No landscape-specific query
  seen (verify B1). Primary mobile target = 6.6–6.7" (~412×915).
- **Fixed/floating UI** at body level: pen-sound FAB (bottom-right), sync eye FAB
  (bottom-left), sound button, shortcuts button, toast — all outside `.todo-app`
  because its `backdrop-filter` would capture `position:fixed`.
- Grimuar is a large, distinct UI surface (master-detail codex, focus levels,
  toolbar reveal modes, TOC rail) — its mobile behavior is a big B1 sub-area.

---

## 10. Test architecture (for B10, deliverable 22)

`npm test` = vitest, 6 files / **9 `it()` blocks** (each block wraps a ported node
harness that asserts many internal cases): sync-merge (39), sync-gc (13),
cloud-transport (24), worker-oauth (17), idb-storage (dual-write, happy-dom),
drive-format (wire-format pin from committed fixtures). **All green, ~7.4s**
(baseline 2026-07-07). Coarse granularity: a failure surfaces as "1 of 9", not the
specific case — a test-quality note. **Zero in-repo coverage** of: task CRUD /
deadlines engine / repeats / DnD / quick-add / render, the ENTIRE Grimuar, and the
`syncNow` orchestration loop + wake. Phase-3 headless loop tests exist only as
external `D:\tmp\pw` harnesses (Этап 5 = bring Playwright in-repo). Rollback tags:
`v2.2-pre-migration`, `v2.0-monolith-pre-split`, `v1.86-stable-core`.

---

## 11. Cross-app symmetry map (seed for B13)

| Capability | DUSK (tasks) | Grimuar (notes) |
|---|---|---|
| Archive | `archive[]`, month sections, restore/clear | `notesArchive[]` ("Склеп"), restore/empty |
| Permanent delete tombstones | every path ✓ | every path ✓ EXCEPT `grimEmptyCrypt` ✗ (V2-B0-01) |
| Bulk ops | select bar: prio/group/colour/deadline/archive/delete | select bar: archive/restore/colour/export/delete |
| Colour label | 10 presets + gothic RGB spectrum (shared modal) | reuses the SAME task-colour modal |
| Undo | 40-deep, `{undo:true}` toasts | same |
| Keyboard | J/K/N/X/E/D/Del/P/L/M/R/T | J/K/N/E/Del/T + Ctrl+F/F3 find |
| Search | text+subtask+note, tag cloud, highlight | list filter + in-note find (F3), snippet excerpts |
| Templates | task templates | note templates + builtins |
| Pin | float to top of group | float to top of grimoire |
| Sync | tasks/groups/subtasks/templates | notes/noteTemplates (whole-record keep-both) |
| History | (none) | version history "Летопись" (own LS key) |

Grimuar has richer content (version history, tables, callouts, markdown/ZIP IO,
focus/TOC) with no task equivalent; tasks have deadlines/repeats/groups with no
note equivalent. Deep parity analysis is B13.
