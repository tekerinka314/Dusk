# DUSK / Grimuar — Audit v2 Findings Registry

Append-only. One entry per finding, per the AUDIT-SPEC-V2 §2 protocol. Severity
axes are 0–3 (0=none, 3=max). Evidence: A=code, B=runtime, C=visual, D=inferred,
E=needs-user. Findings are ratified by re-reading the code behind them and
attempting refutation (§2 adversarial verification) before promotion.

Legend for severity block: **UI**=user-impact · **DL**=data-loss risk ·
**RR**=regression risk of the fix · **IC**=implementation cost · **CF**=confidence.

---

## Batch B0 — Repository understanding (guardrail data-safety sweep)

These surfaced while building the architecture model. Per spec, data-safety red
flags are recorded at full fidelity immediately even though B0 is not a
priority-scored batch. The two data-integrity ones (01, 02) are the reason the
guardrail sweep runs during B0 rather than being deferred.

---

### V2-B0-01 — `grimEmptyCrypt` deletes notes WITHOUT tombstones → deleted notes resurrect on next sync
- **Evidence:** A (code) — runtime merge probe queued for B6 to promote to B.
- **Severity:** UI 2 · DL 1 (resurrection, not loss) · RR 1 · IC 1 · CF 3
- **Where:** `dusk/02-grimoire.ts:1517` `grimEmptyCrypt()` sets
  `state.notesArchive = []` with NO `addTombstone`. Contrast: every other
  permanent-delete path tombstones — `grimBulkDelete` (02:1823), `grimDeleteForever`
  (02:1497), `grimDelete` (02:1427), and the task-side `clearArchive` (04:1868)
  all call `addTombstone(...)`. `grimEmptyCrypt` is the lone omission.
- **Failure scenario:** User empties the crypt (permanent delete of all archived
  notes) with sync enabled. On the next `syncNow`: local subset has those notes
  ABSENT, but no tombstone was created. The merge (`_changed`, 09:131) treats
  "base present, local absent" as *"stale/missing — NOT a delete"* → the notes are
  taken from baseline/remote and RE-ADDED to live state, then re-pushed to Drive.
  The user's deliberate destructive action silently reverts; the crypt refills.
  Even single-device: baseline still holds the notes, so they come back next sync.
- **Refutation attempted (§2):** "Maybe absent is read as a delete." → No:
  `_changed` explicitly returns false for present→absent (the deliberate
  never-vanish guard, 09:131-137). "Maybe the push omits them so they die on
  Drive." → No: merge runs BEFORE push and resurrects them into `out.merged`,
  which is what gets pushed. Refutation fails → confirmed logic.
- **Root cause:** A tombstone is the ONLY signal the 3-way merge accepts as a
  deletion (by design, to prevent stale-device resurrection). `grimEmptyCrypt` was
  written as a plain array wipe and missed the tombstone contract that the other
  delete paths follow.
- **Fix strategy:** Before `state.notesArchive = []`, iterate and
  `addTombstone(n.id, 'note')` for each — exactly as `grimBulkDelete` (02:1823) and
  the task `clearArchive` (04:1868) already do. One-line loop; low regression risk.
- **Change together:** `dusk/02-grimoire.ts` only.
- **Tests:** add a merge probe (base has note, local absent+tombstone, remote has
  note → deleted) to the sync-merge suite; regression-run `npm test`.
- **Cross-app:** the task equivalent (`clearArchive`) is CORRECT — this is a
  DUSK↔Grimuar parity gap where the task side is the reference implementation.

### V2-B0-02 — IDB-first boot can silently lose the last edit (no LS↔IDB recency check, no unload flush)
- **Evidence:** D (inferred; **queued for an immediate B6 runtime probe** — data-loss claim).
- **Severity:** UI 3 · DL 3 · RR 2 · IC 2 · CF 2
- **Where:** `saveState` (01:1035) writes localStorage synchronously EVERY time but
  mirrors to IndexedDB fire-and-forget (`_idbSet(K_STATE, state).then(...)`, 01:1042)
  and swallows failures. `loadState` (01:1109-1124) prefers IDB unconditionally if
  present — **no timestamp/recency comparison with LS** — then calls `saveState()`
  (01:1122) which OVERWRITES localStorage with the IDB-derived state.
- **Failure scenario:** (a) *timing gap* — user makes an edit; `saveState` durably
  writes LS, schedules the async IDB write; the tab is closed/backgrounded-and-killed
  before the IDB transaction commits (common on mobile: edit then switch apps).
  Next boot: IDB lacks the last edit, LS has it; `loadState` loads stale IDB, then
  `saveState` clobbers the good LS copy → **last edit permanently lost.** (b)
  *persistent IDB failure* — private mode / quota / eviction makes every IDB write
  fail while LS keeps succeeding; IDB stays frozen at an old state, LS advances;
  every boot loads the stale IDB and clobbers LS → the app silently rolls back to
  an old snapshot.
- **Refutation attempted (§2, independent 2nd pass for a data-loss finding):**
  "There's a recency guard." → None found (01:1115-1124 is unconditional). "There's
  an unload flush of IDB." → None in 01-core; 11-sync-ui's `pagehide→_flushIfPending`
  flushes the SYNC push, not the IDB write. "idb-keyval commits fast enough that the
  gap never happens." → Not guaranteed; backgrounded-tab kill is aggressive on
  mobile; the final pre-close save is exactly the vulnerable one. All refutations
  fail EXCEPT the timing-probability question, which is why this stays D until a
  probe seeds IDB older than LS and observes the clobber.
- **Root cause:** Этап 4 made IDB the boot-primary read source (for capacity) but
  did not add (i) a recency/versioning comparison so the newer of IDB/LS wins, nor
  (ii) an unload-time IDB flush, nor (iii) a monotonic save counter to detect
  IDB-behind-LS. LS was "the live fallback, never a frozen snapshot" — but the boot
  path can still promote a stale IDB over a fresher LS.
- **Fix strategy (options, decide with user — data-safety):** stamp state with a
  monotonic `_saveSeq`/`updatedAt` blob-level marker; at boot load BOTH LS and IDB,
  compare markers, use the newer, and reconcile. OR make the last save before
  unload flush IDB synchronously-ish via `pagehide`. OR keep LS as the boot-primary
  and use IDB only for capacity items (backups/images) — reverting the Этап-4
  boot-order decision (which was a user-made fork; needs the user).
- **Change together:** `dusk/01-core.ts` (`loadState`/`saveState`), possibly
  `tests/idb-storage.test.mjs`.
- **Tests:** new probe — seed LS newer than IDB, boot, assert the newer state
  survives and LS is not clobbered; seed IDB write to always fail, assert LS still
  authoritative across a reload. Must run for any storage-layer change.
- **Cross-app:** applies to the whole `state` blob (both apps).
- **Note:** This is the single highest-value B0 finding — a silent data-loss path
  (rule #1) introduced by a storage refactor, invisible to the current test suite
  (idb-storage.test only checks dual-WRITE, never the stale-IDB-wins boot). Chase
  it first in B6.

### V2-B0-03 — `_taskNotePersist` sets a dynamic inline `onclick`, colliding with the delegated `data-act`
- **Evidence:** A (code).
- **Severity:** UI 1 · DL 0 · RR 1 · IC 1 · CF 2
- **Where:** `dusk/05-edit-notes-groups.ts:658`
  `mbtn.setAttribute('onclick', text ? 'openEditNoteModal(${ctx.id})' : 'openNoteModal(${ctx.id})')`.
  The same button (`note-modal-btn-<id>`) was rendered by `createTaskEl` (04:127)
  with a delegated `data-act` (`openEditNoteModal`/`openNoteModal`). This is also
  the ONE surviving inline `on*=` in the codebase (the 7c contract is "zero inline
  handlers"; delegation dispatcher in 01-core).
- **Failure scenario:** After inline-CREATING a task note (typing in the panel,
  which routes through `_taskNotePersist` without a full `render`), the "note in
  window" button carries BOTH a stale `data-act="openNoteModal"` (from the last
  render, since the note didn't exist then) AND a fresh inline
  `onclick="openEditNoteModal(id)"`. A click before the next full render fires BOTH:
  the delegated `openNoteModal` (blank "Добавить" modal) and the inline
  `openEditNoteModal` (edit modal with text) on the same `#note-modal` — a
  race/flicker with conflicting title+content. Resolves on the next full render.
- **Refutation attempted:** "Maybe `_taskNotePersist` also updates `data-act`." →
  It updates innerHTML/title/onclick but NOT `data-act` (05:653-659). "Maybe a
  render fires immediately." → No; `_taskNotePersist` is the lightweight no-render
  path. So the dual-handler window is real until the next render.
- **Root cause:** leftover pre-7c mutation not migrated to the `data-act` +
  in-place `dataset.act` update pattern used everywhere else.
- **Fix strategy:** drop the `setAttribute('onclick', …)`; instead set
  `mbtn.dataset.act = text ? 'openEditNoteModal' : 'openNoteModal'` so the single
  delegated dispatcher stays the only handler (consistent with the rest of 7c).
- **Change together:** `dusk/05-edit-notes-groups.ts`.
- **Tests:** headless — inline-create a task note, click the window button once,
  assert exactly one modal opens with the edit content.
- **Cross-app:** n/a (task-only path).

### V2-B0-04 — Safe-area insets are inert (no `viewport-fit=cover`) → fixed bottom UI can sit under the gesture-nav bar
- **Evidence:** A (root cause, code) → C pending (device screenshot in B1).
- **Severity:** UI 2 · DL 0 · RR 1 · IC 0 · CF 3 (root cause) — occlusion severity confirmed in B1.
- **Where:** `index.html:5` viewport = `width=device-width, initial-scale=1` (no
  `viewport-fit=cover`). Only ONE `env(safe-area-inset-*)` use exists in all of
  `style.css` (line ~1025, a `bottom: max(78px, calc(24px + env(safe-area-inset-bottom,0px)))`).
  Per spec, `env(safe-area-inset-*)` evaluates to 0 without `viewport-fit=cover`, so
  that single usage reduces to `max(78px,24px)`=78px always, and the two body-level
  FABs (pen-sound bottom-right, sync eye bottom-left), the toast, and any bottom
  controls have NO safe-area padding at all.
- **Failure scenario:** Installed PWA (display:standalone) on a modern Android
  6.6–6.7" with a gesture-nav bar (or an iPhone with a home indicator): the
  bottom-pinned FABs / toast can be partially occluded by / tappable-through the
  system nav area. This is a Priority-1 (mobile) concern.
- **Refutation attempted:** "Chrome applies safe-area without viewport-fit=cover." →
  No, per the CSS Env spec insets are 0 without it. "Maybe 78px always clears the
  bar." → device-dependent; must be screenshotted on the target class (B1).
- **Root cause:** viewport meta never opted into edge-to-edge; the one safe-area
  rule was written but can never take effect.
- **Fix strategy:** add `viewport-fit=cover` to the viewport meta, then apply
  `env(safe-area-inset-bottom/left/right)` to the FABs, toast, and any fixed bottom
  UI (and re-check the sticky input/toolbar). Verify on device.
- **Change together:** `index.html` (viewport) + `style.css` (FAB/toast/bottom UI).
- **Tests:** device screenshot at B1 (standalone install); emulated DPR-2.6 shot.
- **Cross-app:** affects both apps' mobile chrome.
