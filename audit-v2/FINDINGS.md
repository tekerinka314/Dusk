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

---

## Batch B1 — Mobile experience (FUNDAMENTAL / P0)

Runtime harness: `dist/` served locally, system Chrome via playwright-core
(`isMobile:true, hasTouch:true` → emulates `hover:none`+`pointer:coarse`, the real
phone media state). Rich seed (`D:\tmp\pw\b1\seed.mjs`), never the user's data.
Devices: pixel7 412×915 (primary), big 430×932, small 360×800, DPR 2.6–3. Shots in
`audit-v2/shots/`. Every finding carries a runtime measurement (B) and/or a
screenshot (C) on top of the CSS root-cause (A). Adversarial refutation per §2.

### V2-B1-01 — ⚠ FLAGSHIP: task-card text column COLLAPSES to ~0–33 px on every phone (list becomes a 10–15× viewport-tall tower of single-character text)
- **Evidence:** A (CSS) + B (runtime metrics, 3 widths) + C (screenshots
  `B1-01_pixel7_viewport_asIs.png`, `B1-01_small_viewport.png`, `B1-01_pixel7_towers.png`).
- **Severity:** UI 3 · DL 0 · RR 2 · IC 3 · CF 3
- **Where:** `.task-head` (style.css:3319) is `display:flex; flex-wrap:nowrap`
  holding `.task-text` (`flex:1; min-width:0`, style.css:3324) and `.task-actions`
  (style.css:3774: `display:flex; flex-shrink:0; opacity:0` — it ALWAYS occupies
  its width; only visibility is toggled). The touch block `@media (hover:none) and
  (pointer:coarse)` (style.css:5622, "6g") sets `.task-actions{opacity:1}` and
  enlarges every `.btn-task-action` to `30×30` (5629). Result: the 9–10 action
  buttons occupy a fixed **~278–309 px** in a non-wrapping row; `.task-actions`
  never shrinks, so `.task-text` (the only flexible child) is squeezed to the
  crumbs and wraps **one character per line**.
- **Runtime (measured):** pixel7 (412): content col 301 px → **task-text 15 px**,
  rows 385–1210 px tall, whole list **13 629 px = 14.9× the 915 px viewport** for 14
  tasks. small (360): task-text **0 px**, list 15 068 px. big (430): task-text 33 px.
  Tasks with a deadline carry a 10th button → actions 305–309 px, text **0 px**.
  Every one of the 14 rows measured 0–33 px of text width. Screenshot: the 9-icon
  row sits across the card top and the title streams down the left edge as a
  vertical stack of single glyphs ("За / к / ре / п / лё / н …").
- **Failure scenario:** On ANY phone the entire task list is unreadable — you
  cannot see a single task's title without scrolling through a multi-thousand-px
  tower per task. This is the primary surface of the app; it is unusable on mobile.
  This single defect is the core of the user's "адаптирован УЖАСНО" report.
- **Refutation attempted (§2):** "Screenshot caught the stagger enter animation." →
  No: measured identical after 3.5 s settle AND after force-removing `.entering`
  AND after disabling all animation/transition (probe_settle.mjs: 13 629 px, text
  15 px in all three states). "It's a headless artifact." → The collapse follows
  deterministically from `flex-shrink:0` actions + `nowrap` head + revealed-on-touch
  block; `hasTouch:true` emulates exactly the media state a real phone reports (to
  be visually re-confirmed on the user's device, but the geometry is not
  emulation-dependent). "min-width:0 should let text keep some width." → text DOES
  shrink to its min (0) precisely because actions refuse to; that IS the bug.
  Refutation fails → confirmed.
- **Root cause:** the action row was designed as a hover-revealed overlay that only
  ever coexists with the title on WIDE screens; the "6g" touch patch reveals it
  permanently but the head layout was never adapted for a phone (no wrap, no
  shrink, no move-to-own-row, no overflow menu). June audits reviewed the desktop
  app in a desktop browser, so a phone-media layout was never exercised.
- **Fix strategy (mobile rework — gothic-preserving):** on `(hover:none)`/narrow
  widths, take the actions OUT of the title's inline row — e.g. `.task-head`
  `flex-wrap:wrap` so actions drop to their own full-width row under the title, OR
  collapse most actions into the existing "more"/overflow menu on touch and keep
  only 2–3 primary ones inline, OR a swipe-revealed action drawer. Whatever the
  choice, the title must get the full card width on a phone. This is exactly the
  "перелопачивать весь мобильный UI/UX" the user asked for; design in the gothic
  idiom (motifs unchanged).
- **Change together:** `style.css` (`.task-head`/`.task-actions` touch + narrow
  rules); possibly `04-tasks.ts`/`08` if actions move into a menu on touch.
- **Tests:** re-run the width matrix (360/412/430) asserting `.task-text` width ≥
  ~55% of content and list height back to ~1–2× viewport; device screenshot.
- **Cross-app:** the same hover-reveal→touch-reveal pattern is used for subtasks
  (V2-B1-03) and, on the Grimuar side, for note/list actions — audit those under
  the same root cause. This is the batch's anchor finding.

### V2-B1-02 — On ≤360 px, a deadline task's Archive + Delete buttons are clipped off the card (overflow:hidden) with NO fallback path
- **Evidence:** A (CSS) + B (runtime: `clippedRight:2` at 360). Depends on the same
  layout as B1-01.
- **Severity:** UI 2 · DL 0 (data preserved; action becomes hard, not destructive) · RR 1 · IC 2 · CF 3
- **Where:** `.task-item{overflow:hidden}` (S1-9 clip guard) + the 10-button touch
  row (actions **305 px**) exceeding the 360-px content column (**243 px**). The two
  rightmost buttons — `removeTask` ("В архив", 04-tasks.ts:183) and
  `deleteTaskForever` ("Удалить навсегда", 04:184) — render past the card's right
  edge and are clipped. The "more" menu (`openTaskMoreMenu`, 04:2244) contains only
  template/duplicate/sub-mode/demote — **it does NOT include archive or delete** —
  so there is no per-card fallback; only bulk-select mode (ВЫБОР) can archive/delete
  such a task on a 360-px phone.
- **Failure scenario:** On a 360-px phone (very common budget/compact Android), a
  task that has a deadline cannot be archived or permanently deleted from its own
  card — the buttons are physically clipped and unreachable. The user must discover
  bulk-select as a workaround. Purely additive to B1-01's unusability.
- **Refutation attempted:** "The more-menu covers it." → Verified it does NOT
  (04:2260-2264). "overflow:hidden might just visually crop but keep them tappable." →
  No: content clipped by `overflow:hidden` receives no pointer events in the hidden
  region. "Only affects my synthetic 10-button task." → Any task with a deadline has
  10 buttons; deadlines are a core feature. Refutation fails.
- **Root cause:** same as B1-01 (actions don't fit the phone width) plus the clip
  guard turning overflow into inaccessibility rather than a scroll/wrap.
- **Fix strategy:** subsumed by the B1-01 rework (once actions get their own
  wrapped row / overflow menu, nothing is clipped). If B1-01 is staged, an interim
  guard is to route archive/delete through the more-menu on touch.
- **Change together:** same as B1-01.
- **Tests:** at 360, assert every `.task-actions button` right edge ≤ card right
  edge (0 clipped) and each is hit-testable.
- **Cross-app:** task-only (Grimuar list uses a different action set — verify separately).

### V2-B1-03 — Subtask rows collapse the same way on touch (sub-actions revealed inline squeeze sub-text to ~47 px at 360)
- **Evidence:** A (CSS, same 6g block reveals `.sub-actions`) + B (runtime: sub-text
  47 px / row 167 px at 360; 109 px at 430).
- **Severity:** UI 2 · DL 0 · RR 2 · IC 2 · CF 3
- **Where:** the same `@media (hover:none) and (pointer:coarse)` block (style.css:5622)
  sets `.sub-actions{opacity:1}` and enlarges `.btn-sub-action` to 26×26; subtask
  rows use the analogous flex layout, so revealed inline sub-actions squeeze the
  subtask text. Compounded inside the 2-column subtask grid (each cell is already
  ~half width) — measured sub-text 47 px on a 360-px phone, row 167 px tall.
- **Failure scenario:** Subtask titles are unreadable on a phone (worse in the
  2-col grid, where each cell is half the card width). Same class of defect as
  B1-01, on the second-most-frequent surface.
- **Refutation attempted:** "Subtasks are single-column on mobile so it's fine." →
  Measured in the seeded 2-col grid at 360; sub-text still 47 px. Even single-column
  it inherits the inline-actions squeeze. Refutation fails.
- **Root cause / Fix:** same family as B1-01 — the touch reveal needs a layout that
  gives the label its width (wrap actions / overflow menu / drawer). Fix alongside
  B1-01 so the whole card system is reworked coherently.
- **Change together:** `style.css` (sub-actions touch/narrow rules); the subtask
  grid rules (2-col → 1-col threshold) reviewed in the same pass.
- **Tests:** at 360/412, assert `.sub-text` width ≥ ~50% of its grid cell.
- **Cross-app:** mirrors B1-01; a coherent card-action rework must cover tasks AND
  subtasks together.

### V2-B1-04 — Grimuar action bar (`grim-bar-acts`) overflows the viewport → «Начертать» + template-split button clipped on every phone
- **Evidence:** A (CSS) + B (runtime: `grim-bar-acts` right=416 at cw=412; right=412 at cw=360, width 389) + C (`B1_notes_list_pixel7.png`, `B1_grim_n1_pixel7.png` — the book/template icon is cut at the right edge).
- **Severity:** UI 2 · DL 0 · RR 1 · IC 1 · CF 3
- **Where:** the Grimuar top bar `.grim-bar-acts` (ВЫБРАТЬ / ПЕРЕНОС / «Начертать» + the template-split trigger `#grim-tpl-trigger`/`#grim-new-split`) is **389 px** wide and does not wrap or scroll, so it overflows the content column: by ~4 px at 412 and ~**52 px at 360**. The rightmost control (the «Начертать» split's template book icon) is clipped past the screen edge.
- **Failure scenario:** On any phone the Grimuar's create/template affordance is partly cut off; at 360 px it contributes ~52 px of horizontal page overflow. The «Начертать»→template split is the primary "new note from template" entry and is visually severed.
- **Refutation attempted (§2):** "It scrolls horizontally like the tag-cloud." → No: only `.tag-cloud` got `overflow-x:auto` (style.css:5598); `.grim-bar-acts` has no such rule, so it overflows the page. "The template button is reachable anyway." → Its hit area extends past the viewport edge; the icon is visibly clipped in both screenshots. Refutation fails.
- **Root cause:** the Grimuar bar was laid out for desktop width; the three labelled buttons + split trigger exceed a phone's width and were never given wrap / horizontal-scroll / icon-only-on-narrow treatment.
- **Fix strategy:** on narrow widths, drop the button labels to icons, OR wrap the bar, OR make `.grim-bar-acts` a horizontally-scrollable strip like the tag-cloud, OR move secondary actions into a menu. Preserve gothic glyphs.
- **Change together:** `style.css` (`.grim-bar-acts` and children at narrow widths); possibly `02-grimoire.ts` if labels become icon-only.
- **Tests:** at 360/412 assert `.grim-bar-acts` right ≤ viewport and every child hit-testable.
- **Consequence (verified in the deepen-workflow):** because this bar inflates the
  notes-page `document.scrollWidth` to 412 even while the editor is open, every
  `position:fixed` `.modal-overlay` (inset:0) on the notes page stretches to that
  412 px and centers its box **off the visible 360 viewport** — the Grimuar link
  modal ("Вплести ссылку") lands at left 40 / right 372 and its «ВПЛЕСТИ» confirm
  is clipped at 360 (`B1e_linkmodal_small.png`). Fixing B1-04 re-centers every
  notes-page modal; no per-modal change needed.
- **Cross-app:** Grimuar analogue of the task-side action-density problem — same "too many labelled controls for a phone" root theme.

### V2-B1-05 — Long group name pill has unbounded width → whole-page horizontal scroll at ≤360 px
- **Evidence:** A (CSS) + B (runtime: `#groups-list`/`.group-pill-wrap` width 368, `.meta-tag.group-pill` 367, page scrollWidth 391 > clientWidth 360) + C (`B1_01_small_viewport.png`, `B1_schedule_pixel7.png` — the pill runs off the right edge).
- **Severity:** UI 2 · DL 0 · RR 1 · IC 1 · CF 3
- **Where:** `.meta-tag.group-pill` (style.css:2513) is `white-space:nowrap` with **no `max-width`** and `padding:4px 11px`. A long group name renders as a single non-wrapping pill (367 px for the seed's "Дом и очень длинное имя группы…"). The groups strip `#groups-list` is not horizontally scrollable, so the oversized pill overflows the viewport → the whole page gains a horizontal scrollbar (scrollWidth 391 at cw 360 = **+31 px**).
- **Failure scenario:** Any group whose name is longer than the screen width forces a page-level horizontal scroll on a phone — a cardinal mobile UX defect (the entire layout shifts, and content can be scrolled sideways into emptiness). Common: users DO write descriptive group names.
- **Refutation attempted:** "Group names are short in practice." → Not guaranteed; the app imposes no length limit and a mid-length Russian name easily exceeds 360 px at 10.5 px mono. "The pill wraps." → `white-space:nowrap` forbids wrapping; no `max-width`+ellipsis. "The row scrolls." → `#groups-list` has no `overflow-x` (unlike the tag-cloud). Refutation fails.
- **Root cause:** the pill was styled for a desktop-width groups bar; no max-width/ellipsis/scroll fallback for narrow screens.
- **Fix strategy:** cap `.group-pill` `max-width` with `text-overflow:ellipsis` (keep `nowrap`), OR make `#groups-list` a horizontally-scrollable strip with masked edges like `.tag-cloud`. Gothic look unchanged.
- **Change together:** `style.css` (`.meta-tag.group-pill` + `#groups-list`).
- **Tests:** at 360, seed a 40-char group name; assert page scrollWidth == clientWidth (no h-scroll) and the pill ellipsizes.
- **Cross-app:** task colour/tag meta pills should be checked for the same unbounded-width pattern (verify in a follow-up).

### V2-B1-06 — Tall modals have no max-height / internal scroll → clip top & bottom on short viewports (landscape: «Сохранить» unreachable); no landscape media query
- **Evidence:** A (CSS: `overflowY:visible`, `maxH:none`) + B (runtime, landscape 915×412 & keyboard-short 412×460) + C (`B1_modalshort_deadline_landscape.png`).
- **Severity:** UI 2 · DL 1 (a blocked save can lose the edit the user intended, though nothing already-stored is lost) · RR 2 · IC 2 · CF 3
- **Where:** `.modal` is fixed + vertically centered by the flex overlay, with `overflow-y:visible` and `max-height:none` (no internal scroll). Modal heights (portrait) — deadline 481–499, repeat 493–509, group 441–457, color 401–415 px. There is **no landscape media query** anywhere in style.css.
- **Failure scenario:** (a) *Landscape 915×412:* the repeat modal is 509 px in a 412-px viewport → top clipped (−48 px) and, critically, its action row (`Сохранить/Отмена`) is **entirely below the viewport and unreachable** (measured `actionsReachable=false`), with no scroll to reach it → the user cannot save a repeat in landscape. Deadline/group/color clip their top mode-buttons. (b) *Portrait + virtual keyboard* (visual viewport ≈ 460 px): deadline 481 / repeat 493 exceed 460 → clip top & bottom; focusing the modal's own date/time input raises the keyboard and hides the confirm.
- **Refutation attempted (§2):** "The overlay scrolls." → The overlay is a fixed flex centerer; the modal has `overflow:visible` and the overlay has no scroll either, so overflow is simply clipped/off-screen. "Nobody uses landscape." → Rotate-to-landscape is a first-class phone state and there is literally zero CSS for it. "Keyboard doesn't shrink the viewport." → On Android Chrome it resizes the visual viewport by default; the modal is centered in the shrunken box. Refutation fails for the landscape case (pure geometry) and is high-probability for keyboard.
- **Root cause:** modals assume a tall portrait viewport; no `max-height:100dvh`/`overflow:auto` safety and no landscape adaptation.
- **Fix strategy:** give `.modal` `max-height: calc(100dvh - Npx); overflow-y:auto` (internal scroll) and/or a landscape layout (2-col mode grid, reduced vertical rhythm). Use `dvh`/`svh` so the keyboard-shrunk viewport is respected. Keep the confirm row pinned/reachable.
- **Change together:** `style.css` (`.modal`, `.modal-deadline`, `.modal-note`, add a landscape block).
- **Tests:** at 915×412 and 412×460, assert every modal's `.modal-actions` is fully within the viewport and the modal is internally scrollable when taller than the viewport.
- **Cross-app:** all 13 static modals + Grimuar overlays share this centered-fixed pattern — audit link/history/table menus too.

### V2-B1-07 — Safe-area insets inert + bottom FABs 18–22 px from the viewport edge → occluded by gesture-nav / home-indicator (promotes V2-B0-04 with numbers)
- **Evidence:** A (viewport meta `width=device-width, initial-scale=1` — no `viewport-fit=cover`) + B (runtime FAB geometry: sync-eye bottomGap **18 px**, sound **22 px**, pen 114, shortcuts 68) + C pending device screenshot.
- **Severity:** UI 2 · DL 0 · RR 1 · IC 1 · CF 3 (code) — device confirms the exact occlusion band.
- **Where:** `index.html:5` viewport lacks `viewport-fit=cover`, so the single `env(safe-area-inset-bottom)` rule (style.css ~1025) is inert (see V2-B0-04). The bottom-left sync-eye FAB (`#sync-glyph-btn`, 46×46) sits **18 px** above the viewport bottom; the sound FAB **22 px**. Android gesture-nav pill / iOS home indicator occupy ~24–48 px there.
- **Failure scenario:** In the installed PWA (`display:standalone`), the sync-eye (sync trigger + unresolved-quarantine badge) and sound FABs are partly under the system gesture area — hard to tap, and the badge can be hidden. Bottom-anchored UI has no safe-area padding.
- **Refutation attempted:** "Chrome applies safe-area anyway." → No, insets are 0 without `viewport-fit=cover` (CSS Env spec). "18 px clears the bar." → Device-dependent; a 24–48 px gesture area overlaps an 18 px gap. Confirm on device (§8). Refutation fails on the code cause.
- **Root cause:** never opted into edge-to-edge; the lone safe-area rule can't take effect and the FABs use fixed px offsets.
- **Fix strategy:** add `viewport-fit=cover`; offset every fixed bottom control by `max(basePx, env(safe-area-inset-bottom))` (and left/right for the corner FABs). Verify on device.
- **Change together:** `index.html` (viewport) + `style.css` (FABs, toast, any bottom UI).
- **Tests:** device standalone screenshot; emulated shot with a simulated inset.
- **Cross-app:** both apps' bottom chrome (FABs, toast) share this. Supersedes/expands V2-B0-04.

### V2-B1-08 — Bottom-corner FABs overlap list/editor content (no reserved bottom gutter)
- **Evidence:** C (recurring across `B1_notes_list_pixel7.png`, `B1_main_expand_pixel7.png`, `B1_grim_n1_pixel7.png` — pen/sync/sound FAB discs sit over note cards, the «ПОДПУНКТЫ» label, and the editor meta).
- **Severity:** UI 1 · DL 0 · RR 1 · IC 1 · CF 3
- **Where:** the three body-level FABs (pen-sound bottom-right, sync-eye bottom-left, sound) are `position:fixed` over the scroll content, and no page/list has bottom padding reserving their footprint. On phones (narrow width) they overlap the last rows / labels / meta rather than clearing them.
- **Failure scenario:** The bottom slice of every scrollable surface is partly covered by FAB discs — content under them is hard to read and the tap may hit the FAB instead of the content beneath.
- **Refutation attempted:** "FABs are meant to float over content." → Yes, but a usable design reserves a bottom gutter (padding-bottom) so the *last* content isn't permanently occluded; here the final rows are covered. Refutation stands (this is a spacing gap, not intended overlap).
- **Root cause:** no `padding-bottom`/scroll-gutter accounting for the fixed FAB stack on narrow screens.
- **Fix strategy:** add bottom scroll padding (≥ FAB height + safe-area) to the scroll containers on mobile, or dock the FABs in a reserved bar. Gothic unchanged.
- **Change together:** `style.css` (page/list bottom padding on mobile).
- **Tests:** assert the last list item / editor meta is not intersected by any FAB rect at 360/412.
- **Cross-app:** all three pages + Grimuar editor.

### V2-B1-09 — Touch targets below guidance: 410/587 elements <44 px, 88 <24 px (colour swatches 20 px)
- **Evidence:** B (runtime census of `button/a/input/[data-act]/…`: total 587, `<44px`=410, `<24px`=88; worst = `form-color-swatch` 20–22 px).
- **Severity:** UI 2 · DL 0 · RR 1 · IC 2 · CF 3
- **Where:** the coarse-pointer block sizes icon buttons to 30×30 (`.btn-task-action`) / 26×26 (`.btn-sub-action`); the params-panel colour swatches (`.form-color-swatch`) are ~20 px; inline meta-clear ✕ and pill deletes are small too. 88 controls fall below the WCAG 2.2 (2.5.8) 24×24 minimum; 410 below the 44×44 comfortable target.
- **Failure scenario:** Mis-taps on the dense action rows, tiny colour swatches, and meta-clear buttons — especially compounded with V2-B1-01's crushed layout. The 20-px swatches are hard to hit accurately with a fingertip.
- **Refutation attempted:** "30 px is fine for a dense gothic UI." → 30 px is under both the 44 px comfort and Android's 48 dp guidance; the <24 px cohort (88) is a hard WCAG-2.2 failure, not a preference. Refutation fails for the <24 cohort; the 30-px cohort is a strong recommendation.
- **Root cause:** icon/swatch sizing prioritized visual density over finger targets; the touch block enlarges some but not the swatches/meta-clears.
- **Fix strategy:** raise the touch hit-area to ≥44 px (padding or an invisible expanded hit box) for icon buttons, ≥24 px minimum for swatches/meta-clears; can keep the visual glyph small with a larger tap area. Tie into the B1-01 card rework.
- **Change together:** `style.css` (touch sizing for `.btn-task-action`, `.btn-sub-action`, `.form-color-swatch`, meta-clears).
- **Tests:** census assert 0 interactive elements <24 px; report count <44 px.
- **Cross-app:** swatches/actions shared task↔group↔note.

### V2-B1-10 — Mobile boot/scale: no list virtualization, ~154 DOM nodes/card → boot 5.6 s (200) / 30.8 s (1000) at CPU 4×; layout height explodes (compounds B1-01)
- **Evidence:** B (CPU-4× throttled: N=200 boot 5650 ms, 32 032 nodes, scrollH 190 246; N=1000 boot 30 800 ms, 154 020 nodes, scrollH 959 351).
- **Severity:** UI 2 · DL 0 · RR 2 · IC 3 · CF 3 (mobile-perf; deeper perf owned by B8)
- **Where:** `render` builds every task card eagerly (no windowing); each card is ~154 DOM nodes (10 action buttons with inline SVG + meta + subtask scaffolding). On a throttled phone, 200 tasks take 5.6 s to first paint and 1000 tasks 30.8 s. The layout height is astronomically inflated by the B1-01 collapse (190 k–959 k px), multiplying paint/scroll memory.
- **Failure scenario:** A power user with a few hundred tasks sees multi-second boots and heavy scrolling on a mid-range phone; 1000 tasks is effectively unusable. Even after B1-01 is fixed, the eager 154-node/card render is heavy at scale.
- **Refutation attempted:** "4× throttle is unrealistic." → Mid-range phones are ~2–4× slower than the dev machine; 200-task boot is still multi-second unthrottled. "Nobody has 1000 tasks." → 200 (the realistic power-user case) already boots in 5.6 s. Refutation fails for the 200 case.
- **Root cause:** no virtualization + a very node-heavy card template + the B1-01 layout blowup.
- **Fix strategy:** windowed/virtualized rendering for long lists; slim the card node count (defer/merge action SVGs); fix B1-01 to kill the height explosion. Coordinate with B8.
- **Change together:** `03-render.ts`/`04-tasks.ts` (windowing, card node count) — larger effort; stage after B1-01.
- **Tests:** boot-time budget at N=200 on CPU-4×; DOM-node/card ceiling.
- **Cross-app:** Grimuar list is lighter (fewer nodes/card) — verify it at scale separately.

### V2-B1-11 — (cross-batch functional, owner B6) Cyrillic quick-add priority tokens don't parse — ASCII `\b` fails after Cyrillic; token left in the task title
- **Evidence:** A (regex) + B (direct `parseQuickInput` runs: `!высокий/!выс/!средний/!нет` → priority `null`, token NOT stripped; `!high/!h` → `high`, stripped).
- **Severity:** UI 2 · DL 0 · RR 1 · IC 1 · CF 3
- **Where:** `parseQuickInput` (08-quickadd-export-init.ts:38) uses `/(^|\s)!([a-zA-Zа-яё]+)\b/gi`. JS `\b` is defined by ASCII `\w`; after a Cyrillic letter (∉ `\w`) followed by space or end-of-string there is no word boundary, so the whole match fails → every Russian priority keyword in `prioMap` (`выс/высокий/сред/средний/низ/низкий/нет`) is unreachable. Only the English aliases (`high/h/medium/med/m/low/l/none/n`) work.
- **Failure scenario:** In this Russian-first app, the documented quick-add priority syntax (`!высокий`, `!средний`, …) silently does nothing AND leaves the literal `!высокий` inside the saved task title. The primary intended usage of the feature is broken for its primary language.
- **Refutation attempted:** "Maybe it's mobile input only." → No: direct parser calls fail regardless of platform (general bug; surfaced here while testing mobile quick-add). "Maybe `\b` works with the `i` flag." → `i` doesn't make `\b` Unicode-aware; needs a rewrite (e.g. `(?=\s|$)` lookahead or `\p{L}` with `u`). Refutation fails.
- **Root cause:** ASCII word-boundary in a Cyrillic-token regex.
- **Fix strategy:** replace the trailing `\b` with `(?=\s|$)` (or use `u` + `\p{L}` classes). Add a test with Russian tokens. Owned by **B6 (functional)**; recorded here because it was proven during B1.
- **Change together:** `08-quickadd-export-init.ts` (the priority regex) + a quick-add unit test.
- **Tests:** `parseQuickInput('x !высокий')` → priority `high`, text `x`; same for сред/низ/нет.
- **Cross-app:** task-only (quick-add is a task feature).

### V2-B1-12 — Text inputs lack mobile keyboard hints (`autocapitalize`/`autocorrect`/`inputmode`) → autocorrect can mangle quick-add tokens & force-capitalize titles
- **Evidence:** A (index.html) — device-observable (E) for the exact autocorrect behaviour.
- **Severity:** UI 1 · DL 0 · RR 1 · IC 1 · CF 2
- **Where:** `#input-box` (index.html:108) and `#search-box` (index.html:363) carry only `autocomplete="off" spellcheck="false"` — no `autocapitalize`, `autocorrect`, or `inputmode`. Across all of index.html there are only 2 occurrences of those attributes total.
- **Failure scenario:** On a mobile keyboard the task input auto-capitalizes the first letter of every entry and may autocorrect words; quick-add trigger tokens (`*тег`, `%завтра`, `!высокий`) sit mid-string and can be altered/spaced by autocorrect, compounding V2-B1-11 (the priority token already fails to parse). Search likewise auto-capitalizes, which is harmless for a case-insensitive search but the missing `inputmode`/`enterkeyhint` is a small polish gap.
- **Refutation attempted:** "spellcheck=false already disables autocorrect." → No: `spellcheck` governs the red-underline checker, not iOS/Android autocorrect/autocapitalize, which are separate attributes. "Autocapitalize doesn't hurt." → For a title it's mostly fine, but combined with token mangling and the desire for verbatim quick-add syntax it's a real mobile-input paper-cut. Confidence held at 2 pending a device check of the exact mangling.
- **Root cause:** inputs were tuned for desktop; mobile IME hint attributes were never added.
- **Fix strategy:** add `autocapitalize="sentences"` (or `none` for the quick-add field if verbatim tokens matter), `autocorrect="off"`, and appropriate `inputmode`/`enterkeyhint` on the task and search inputs. Confirm on device.
- **Change together:** `index.html` (input attrs).
- **Tests:** device typing check; verify quick-add tokens survive autocorrect after the B1-11 regex fix.
- **Cross-app:** the Grimuar title/search inputs should get the same treatment (verify).

### V2-B1-13 — Group-section header title collapses to 3 px @360 / 47 px @412 → group names unreadable (a SECOND flagship, distinct element from B1-01)
- **Evidence:** A (CSS) + B (my own re-verified probe) + C (`B1w_states_grouphdr_small.png`). Surfaced by the deepen-workflow's states finder; **independently re-measured by the main thread** (§4a) before promotion.
- **Severity:** UI 3 · DL 0 · RR 2 · IC 2 · CF 3
- **Where:** `.group-header` (style.css:1423) is a flex row; `.group-title` (style.css:1460) is `min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; margin-right:auto` — fully shrinkable. The always-rendered group-action icon cluster occupies **~190 px**. Measured: header 356 px → title **47 px** at pixel7 (name "Ритуалы ночи" needs 116 px → shows "Ритуа…"); header 312 px → title **3 px** at small 360 (name effectively invisible). Same failure family as V2-B1-01 but a **different element with its own CSS and fix site** — a task-card fix will NOT fix this.
- **Failure scenario:** On every phone, group names in the list headers are truncated to an ellipsis or to nothing — the user cannot tell groups apart. Present in ALL states (headers are always shown). Combined with B1-01 (unreadable tasks), the grouped view is doubly illegible on mobile.
- **Refutation attempted (§2):** "It just ellipsizes gracefully." → At 47 px you see 2 letters; at 3 px, nothing — that is not graceful, it is unreadable. "Maybe only the long seed name." → Measured on "Ритуалы ночи" (12 chars) — already crushed to 47 px because the 190 px icon cluster is fixed. Re-measured independently. Refutation fails.
- **Root cause:** the group-action cluster (coffin/sort/bell/duplicate/rename/collapse/…) is always painted at full width and the title yields; no wrap / overflow-menu / min-title-width for touch — the exact analogue of the task-card action-density defect.
- **Fix strategy:** give `.group-title` a readable min-width and let the action cluster wrap to a second row (or collapse into a "…" menu) on narrow/touch — mirror the B1-01 remedy. Gothic glyphs unchanged.
- **Change together:** `style.css` (`.group-header`, `.group-title`, group-action cluster at narrow/touch widths).
- **Tests:** at 360/412 assert `.group-title` renders ≥ ~50 % of its natural width or a legible minimum; no header icon clipped.
- **Cross-app:** the Grimuar has no group headers; task-only. Pair the fix with B1-01/B1-03 as one coherent "list-row + header action model" rework.

### V2-B1-14 — Main bulk-select bar wraps into a ragged 3–4 row block on mobile (doesn't fit one row even at 412)
- **Evidence:** A + B (workflow finder + an independent workflow verifier, both CONFIRMED with matching geometry).
- **Severity:** UI 2 · DL 0 · RR 1 · IC 2 · CF 3
- **Where:** `#main-select-bar` / `.select-bar-actions` (`flex-wrap:wrap`, style.css ~4068) holds 4 priority + 3 group/colour/deadline + 2 archive/delete icon buttons (32×32) + a count + «Отмена» (78×27). Measured: **358×129 px across 3 rows @412** (button tops 698/738/778, rowCounts 4/5/1); **314×134 px across 4 rows @360**. Nothing clips or overflows (`overflowOffenders=[]`), but the absolutely-positioned `.select-bar-group::before` divider hairlines strand at the start of wrapped rows — directly contradicting the CSS's own stated goal (style.css:4068-4071: "a centred row of compact square icon-buttons… no wide text pills which wrapped into two ragged rows").
- **Failure scenario:** Entering bulk-select on a phone produces a tall, uneven 3–4 row toolbar with stray divider lines — functional but visually broken and space-hungry, pushing the list down.
- **Refutation attempted:** "It's a clean single row." → Measured 3 rows @412 / 4 @360; the divider hairlines strand. Verified twice. Refutation fails. "It overflows/clips." → No, it wraps (nothing clipped) — so this is layout-quality, not an accessibility block, hence UI 2 not 3.
- **Root cause:** ten controls are wider than any phone row; `flex-wrap:wrap` splits the three logical clusters unevenly and the leading dividers aren't suppressed on wrapped rows.
- **Fix strategy:** shrink the footprint to ≤2 tidy rows (tighter icons / collapse clusters), keep each `.select-bar-group` intact when it wraps (wrap between groups, nowrap inside), inline «Отмена» with the last cluster, and suppress the leading divider on any group that starts a new row.
- **Change together:** `style.css` (`.select-bar-actions`, `.select-bar-group`, `.sb-btn`).
- **Tests:** at 360/412 assert the bar is ≤2 rows and no stranded divider at a row start.
- **Cross-app:** the Grimuar bulk bar is lighter (single icon row + «Отмена», 54–89 px) and fits — task-side only. (Bulk `.sb-btn` are 32 px → folds into V2-B1-09's tap-target finding.)

### V2-B1-15 — Wide Grimuar table has no horizontal-scroll container → columns crush to 44 px, header text wraps to ~2 chars/line
- **Evidence:** A + B + C (workflow grim-editor finder; ABC with CSS line refs; screenshot `B1e_table_small.png`).
- **Severity:** UI 2 · DL 0 · RR 1 · IC 1 · CF 3
- **Where:** `.grim-body table{width:100%}` + `td/th{min-width:44px}` with **no `overflow-x:auto` wrapper** (style.css ~7498-7505). A 6-column table at 360 forces every cell to 44 px (6×44=264 px, fits) but the header cells wrap to ~2 chars/line ("ИМЯ"→"ИМ"/"М", "ДАТА"→"ДА"/"ТА"). The insert popover allows up to 8 columns → an 8-col table would overflow the 360 viewport entirely. (Contrast: the `pre/code` path deliberately wraps long lines to avoid a scrollbar — fine for code, wrong for tables.)
- **Failure scenario:** Any table with more than ~3–4 columns is near-illegible on a phone (headers stacked 2 letters per line); wider tables overflow.
- **Refutation attempted:** "Tables just scroll." → `overflow-x` is `visible` on both the table and body (no scroll container); columns compress instead. Verified via computed style + screenshot. Refutation fails.
- **Root cause:** no horizontal-scroll affordance for tables on narrow screens.
- **Fix strategy:** wrap tables in a `display:block; overflow-x:auto` container (or set the table itself) so wide tables scroll inside the note pane instead of crushing columns. Keep the gothic table styling.
- **Change together:** `style.css` (`.grim-body table` wrapper) — possibly a wrapping element in `02-grimoire.ts` table render.
- **Tests:** 6- and 8-col tables at 360 → table scrolls horizontally inside the pane; no header text wraps below ~4 chars; no page overflow.
- **Cross-app:** Grimuar-only (tasks have no tables).

### V2-B1-16 — Grimuar TOC rail is `display:none` on mobile with no fallback → long notes have no heading navigation on phones
- **Evidence:** A + B + C (workflow finder; ABC; `B1e_toc_small.png`).
- **Severity:** UI 1 · DL 0 · RR 1 · IC 2 · CF 3
- **Where:** a note's TOC toggle `.grim-toc-toggle` is gated to `min-width:641px` (style.css ~6817) and `#grim-toc` is `display:none` under `max-width:640px` (style.css ~6928). On a note with 5 headings the page gets `.toc-avail` but both the toggle and rail compute `display:none`; force-calling `grimToggleToc()` leaves the rail width 0. Verified at 360 and 412.
- **Failure scenario:** Heading navigation for long structured notes is simply unavailable on phones — intentional (a 222 px side rail can't sit beside 360 px content) but there is no mobile substitute.
- **Refutation attempted:** "It's an intentional desktop-only feature." → True, but the absence of any mobile fallback for navigating a long note is a real usability gap; recorded as low severity, not a bug.
- **Root cause:** the TOC is a side rail with no mobile (bottom-sheet/overlay) variant.
- **Fix strategy (optional):** offer a collapsible bottom-sheet/overlay TOC on mobile, or accept as a known desktop-only feature and document it.
- **Change together:** `02-grimoire.ts` + `style.css` (a mobile TOC surface).
- **Tests:** on a long note at 360, a heading-nav affordance exists and jumps to headings.
- **Cross-app:** Grimuar-only.

### V2-B1-17 — Body-portal popovers anchored to right-edge buttons overflow the screen → menu text clipped on mobile (no flip/clamp)
- **Evidence:** C (`B1w_more_small.png` — the task "more" menu «Сохранить как шабло…» / «Дублировать задачу» / «Сделать подпунктом» is cut off past the right viewport edge) + A (body-portal popover pattern).
- **Severity:** UI 2 · DL 0 · RR 1 · IC 2 · CF 2 (one popover screenshotted; pattern-shared, so re-verify snooze/sub-menus)
- **Where:** the float-menu popovers (`_openFloatMenu` → task-more, snooze, sub-mode, demote, export) render at the body level and are positioned next to their anchor button. Anchor buttons on the task/subtask action row sit near the **right** screen edge on a phone; the menu opens to the right of the anchor and overflows the viewport, clipping its right side. No viewport clamp / flip-to-left on mobile.
- **Failure scenario:** On a phone, opening a task's "more" menu (and likely snooze / sub-mode / demote / export popovers, which share the mechanism) shows a menu whose labels run off the right edge — the option text is cut and the menu may be partially unusable.
- **Refutation attempted (§2):** "It's centered/clamped." → The screenshot shows «…ШАБЛО[Н]» clipped at the right edge; not clamped. "Only the more-menu." → It's the shared `_openFloatMenu` positioner, so snooze/sub-mode/demote/export are suspect too (flagged CF 2 pending their own shots). Refutation partially holds for scope → keep CF 2 and re-verify siblings.
- **Root cause:** popover positioning assumes desktop space to the right of the anchor; no mobile clamp-to-viewport / flip-left.
- **Fix strategy:** clamp the popover's left so its right edge stays within the viewport (flip to open leftward from a right-edge anchor), with a safe-area-aware margin. One fix in `_openFloatMenu` covers all these menus.
- **Change together:** `dusk/*` float-menu positioner (`_openFloatMenu` in 04/07) + minor CSS.
- **Tests:** open each float menu from a right-edge anchor at 360/412; assert its right edge ≤ viewport.
- **Cross-app:** Grimuar table/callout/io popovers use the same body-portal idea — verify them too.

### V2-B1-18 — All font-sizes are fixed px (0 rem / 2 em of 207) → OS "font size" accessibility setting doesn't enlarge the UI (WCAG 1.4.4; pinch-zoom mitigates)
- **Evidence:** A (census: 205 px-based `font-size`, 0 rem, 2 em in style.css).
- **Severity:** UI 1 · DL 0 · RR 2 · IC 3 · CF 3
- **Where:** the entire UI type scale is authored in absolute `px`. The Android/iOS system "font size / display size" accessibility preference scales `rem`/`em`-based text; px text is unaffected, so a low-vision user who enlarges their system font gets **no enlargement** in DUSK. Mitigation: the viewport meta imposes no `user-scalable=no`/`maximum-scale`, so **pinch-zoom and browser zoom still work** (those scale px too) — users can zoom the whole page.
- **Failure scenario:** A user relying on a larger system font (rather than pinch-zoom) sees DUSK's text stay small. Reflow-based text resize (WCAG 1.4.4 "Resize Text", 200 %) is not supported; only viewport zoom is.
- **Refutation attempted:** "Pinch-zoom satisfies resize." → It satisfies the zoom interpretation but not the reflow/font-preference interpretation; and pinch-zoom on a task list re-triggers the horizontal-overflow issues. Partial mitigation, real gap. "Converting 205 px values to rem is huge/risky." → Yes — hence RR 2 / IC 3; a global `:root` font-size + rem refactor is a large change, so this is a documented low-severity a11y note, not an urgent fix.
- **Root cause:** px-first authoring; no root-relative type scale.
- **Fix strategy (optional, large):** move the type scale to `rem` off a `:root` base so system font scaling applies; or accept pinch-zoom as the resize path and document it.
- **Change together:** `style.css` (type scale) — large; defer / coordinate with any design-system pass.
- **Tests:** set the emulated OS font scale / root font-size to 200 % and assert UI text enlarges without breaking layout.
- **Cross-app:** whole app.

### V2-B1-19 — ⚠ INSTALLED PWA WON'T LAUNCH: `start_url:"./index.html"` hits a Cloudflare 308→`/` that the SW returns as a redirected navigation response → ERR_FAILED (owner B12/PWA)
- **Evidence:** A (manifest + SW code) + B (**live**: `curl -I https://dusk-du4.pages.dev/index.html` → `308 Permanent Redirect, Location: /`; `/` → 200; and the user's on-device `ERR_FAILED` at `/index.html` from the installed icon).
- **Severity:** UI 3 · DL 0 (origin storage intact; the app just won't open) · RR 1 · IC 1 · CF 3
- **Where:** `public/manifest.json:5` `"start_url": "./index.html"`. Cloudflare Pages canonicalizes `/index.html` with a **308 redirect to `/`**. The SW's `networkFirst` (`public/sw.js:97`) does `fetch(request.url, { cache:'no-cache' })` with the default `redirect:'follow'`, so for the standalone launch navigation to `/index.html` it resolves a response whose `.redirected === true`, then `e.respondWith(...)` (sw.js:145) hands that redirected response to a **navigation** request — which Chrome refuses (a SW may not answer a navigation with a redirected response) → **ERR_FAILED**. The installed PWA never opens.
- **Failure scenario:** User installs the PWA (the whole point of an offline-first app) and taps the icon → "Не удаётся получить доступ к сайту … ERR_FAILED". Total failure of the installed experience. A plain browser tab works because it navigates to `/` (200, no redirect) — and before the SW is active Chrome follows the 308 natively — so the bug is masked everywhere except the SW-controlled standalone launch of `start_url`.
- **Refutation attempted (§2):** "Maybe the site is just down." → No: `/` returns 200 and the browser tab works; only `/index.html` 308s. "Maybe headers/CSP." → `_headers` only sets cache rules; no CSP/COEP. "Maybe offline." → The user was online; offline would actually hit the SW cache branch (`cache.match` returns the precached non-redirected `./index.html`) and likely succeed — the bug is specifically the ONLINE standalone launch following the 308. Live curl confirms the redirect; refutation fails.
- **Root cause:** `start_url` points at `index.html` (which Pages redirects) instead of `/`, combined with a network-first SW that returns the followed-redirect response to a navigation.
- **Fix strategy (small, but it deploys to prod — get user approval):** (1) primary — set `manifest.json` `start_url: "./"` (and it already `scope:"./"`), so the launch hits `/` (200, no redirect); (2) defense-in-depth — in `networkFirst`, when answering a navigation whose response `.redirected` is true, reconstruct a clean same-URL `Response(resp.body, {status,statusText,headers})` so any future redirect can't break navigations. Bump the SW `CACHE` name so clients reinstall. Likely broken since the Cloudflare Pages move (2026-06-29).
- **Change together:** `public/manifest.json` (start_url) + optionally `public/sw.js` (redirect-safe navigation) + `version.json`/CACHE bump on deploy.
- **Tests:** after fix, install on device → icon launches; `curl -I` the new start_url is 200; add a Playwright/SW test asserting a navigation response is never `.redirected`.
- **Cross-app:** whole PWA (both apps). Owner is **B12 (PWA)**; recorded here because the device round surfaced it. **Blocks the on-device half of B1** (safe-area/standalone checks) until fixed. **FIXED 2026-07-08** (commit — start_url "./" + redirect-safe SW), pending user re-install verification.

---

## Device round (user's real Android, 2026-07-08 — web tab, PWA install was blocked by B1-19)

Photos: `audit-v2/photo_1..6_2026-07-08_*.jpg`. The user's phone is wider than the
360-px emulation (≈393–412 CSS px), which is why the two 360-only overflow findings
did not reproduce.

**On-device CONFIRMATIONS (emulation B/C → now C-on-device):**
- **V2-B1-01** — CONFIRMED: task titles render as a vertical column of single
  letters ("П/о/м/ы/т/ь/с/я"), 9-icon row across the card top (photo_1, photo_5).
- **V2-B1-13** — CONFIRMED: group header name crushed to "Д." (from "Дела") with the
  icon cluster filling the row (photo_1, photo_5).
- **V2-B1-06** — CONFIRMED: in landscape the deadline AND repeat modals are clipped
  top+bottom, «Сохранить» is off-screen, and there is no scroll (photo_2, photo_3).
- **V2-B1-08** — CONFIRMED: the bottom FAB discs overlap task/group content (photo_1, photo_5).
- **V2-B1-15** — CONFIRMED: a 5-column note table crushes every column, all cells/
  headers wrap to 2–3 chars per line, unreadable (photo_6).

**On-device NON-repro (scope narrowed to ≤360-px devices):**
- **V2-B1-05** (page horizontal scroll from the long group pill) — did NOT reproduce
  (user: "при свайпе ничего не происходит"); his viewport is wider than the 360 px
  where it overflowed. Scope: budget/compact ≤360-px phones only.
- **V2-B1-17** (more-menu clips off the right) — did NOT reproduce; the menu fit and
  every item tapped (photo_5). Scope: ≤360-px only; downgrade CF to 2.

**On-device GOOD (confirmed fine):** the new-task input focuses and stays above the
keyboard (photo_4); the "more" menu fits and taps; colour swatches were usable for
the user; scrolling is smooth (except the render glitch below).

### V2-B1-20 — «Звук пера» is silent on LETTER typing on mobile (only Space/Backspace/Enter sound) — IME keydown has no `key.length===1`
- **Evidence:** A (code) + B (user on device: letters silent, space/backspace work).
- **Severity:** UI 1 · DL 0 · RR 1 · IC 1 · CF 3
- **Where:** the pen-sound trigger is a global `keydown` listener (07-dnd-filter-progress.ts:1031) that plays the "letter" grain only when `printable = e.key && e.key.length === 1` (:1036). On Android/iOS the virtual-keyboard IME delivers letter `keydown`s as `e.key === 'Unidentified'` / `keyCode 229` (composition), so `printable` is false and nothing plays; Space/Backspace/Enter fire real named keys → the `soft` branch (:1035) still sounds. Exactly matches the report.
- **Failure scenario:** With «Звук пера» on, typing actual letters on a phone is silent — the feature's whole point (a quill sound per letter) doesn't work on mobile; only spaces/deletes click.
- **Refutation attempted (§2):** "Maybe the buffer isn't warmed." → No: space/backspace DO sound, so the buffer is loaded; letters specifically don't reach `_penPlay`. "Maybe a hardware-keyboard-only feature." → It's wired to every writing field incl. the mobile task input. Refutation fails.
- **Root cause:** `keydown`+`key.length===1` can't observe IME letter input on mobile.
- **Fix strategy:** additionally drive the letter grain from an `input`/`beforeinput` listener on writing fields (fires for IME letters), or handle the `keyCode 229` / `Unidentified` case; de-dupe so a physical keyboard doesn't double-play.
- **Change together:** `07-dnd-filter-progress.ts` (pen trigger).
- **Tests:** simulate an `input` event on the task field with pen enabled → letter grain plays; ensure no double-play with a real keydown.
- **Cross-app:** applies to the Grimuar editor typing too (verify the pen sounds there on mobile).

### V2-B1-21 — Touch drag ghost is offset far to the LEFT of the finger → reordering is nearly unusable on mobile
- **Evidence:** A (SortableJS fallback + transformed-ancestor mechanics) + B (user: "позиция задачи где-то в левом месте от пальца … перетащить крайне неудобно").
- **Severity:** UI 2 · DL 0 · RR 2 · IC 1 · CF 2 (root cause needs a device confirm of the exact transformed ancestor)
- **Where:** `SORTABLE_OPTS` (01-core.ts:838) sets neither `forceFallback` nor **`fallbackOnBody`**. On touch (no native HTML5 DnD) SortableJS always uses its fallback clone, positioned `position:fixed` and appended to the dragged item's container. Any ancestor with a `transform`/`filter`/`will-change` (the app has group-header `translateY`, card/`.app-glow` filters, entrance `scale`) becomes the containing block for that fixed clone, shifting its coordinate origin → the ghost renders displaced from the touch point (here, to the left).
- **Failure scenario:** Dragging a task or subtask on a phone shows the drag image detached from the finger, making it very hard to aim a drop — a core interaction (reorder) is effectively broken on touch.
- **Refutation attempted (§2):** "It's `delay:120` mis-fire." → Different symptom; the user reports the ghost is spatially offset, not that it fails to start. "No transformed ancestor exists." → The app uses transforms/filters on list ancestors; the classic `fallbackOnBody` fix targets exactly this. Held at CF 2 pending a device check of which ancestor. Refutation reduces but doesn't kill it.
- **Root cause:** fixed-positioned fallback clone inside a transformed/filtered containing block.
- **Fix strategy:** set `fallbackOnBody: true` (append the clone to `<body>`, escaping the transformed ancestor) and consider `forceFallback:true` for consistent cross-platform ghost behaviour; re-test the offset on device. Applies to every Sortable instance (tasks/subtasks/groups/form-subs) sharing `SORTABLE_OPTS`.
- **Change together:** `01-core.ts` (`SORTABLE_OPTS`).
- **Tests:** device drag — ghost tracks the finger; emulated drag — clone is a child of `<body>`.
- **Cross-app:** all Sortable lists (tasks, subtasks, groups, Grimuar note DnD if it shares options).

### V2-B1-22 — Deadline modal: the segmented time input and its steppers don't respond to tap on mobile
- **Evidence:** B (user: deadline modal saves, but "не кликаются тайм пикеры и дейт пикеры"); A-partial (custom `SegmentedInput`, not a native picker).
- **Severity:** UI 2 · DL 1 (can't set a time on mobile → the deadline the user intended isn't captured) · RR 2 · IC 2 · CF 2
- **Where:** the deadline modal's time field is a custom `SegmentedInput` widget (`segInputs['dl-date-time']`, built by `initSegmentedInputs()`, 01-core.ts:946; class in 08) with hourglass steppers, NOT a native `<input type="time">`. On the user's phone, tapping the segments/steppers doesn't focus a segment or change the value, so a time can't be entered via touch (the mode buttons + Save do work). Needs a device-level root-cause pass (likely the segment tap→focus/caret handling doesn't fire on touch, or the native keyboard doesn't bind to the custom segment).
- **Failure scenario:** On a phone the user can pick a deadline mode and Save, but cannot actually set the hour/minute — the time portion of a deadline is unenterable, so time-based deadlines can't be created on mobile.
- **Refutation attempted (§2):** "Maybe he tapped the wrong spot." → He reports both time and date pickers unresponsive across the attempt; the field is a non-native custom widget, which is exactly the kind that commonly misses touch focus. Held CF 2 pending a device/emulation repro of the segment tap path.
- **Root cause (hypothesis):** the `SegmentedInput` segment focus/caret logic is bound to mouse/keyboard, not touch (`pointerdown`/`touchstart`), so a tap neither focuses a segment nor raises the numeric keyboard.
- **Fix strategy:** ensure segment tap uses pointer events and focuses the segment + raises a numeric keyboard on touch; provide a native `<input type="time">` fallback on coarse pointers, or make the steppers real buttons. Verify on device.
- **Change together:** `08-quickadd-export-init.ts` (`SegmentedInput`) + `06-deadlines.ts`.
- **Tests:** on a touch context, tap a segment → it focuses and accepts digits; steppers change the value.
- **Cross-app:** the repeat-anchor time input and any other `SegmentedInput` (weektime) share this — verify.
- **S1 UPDATE (2026-07-11, Fable — emulation root-cause pass):** root cause CONFIRMED at `A` and
  narrowed. Tap **does** activate a segment (Playwright touch, pixel7: `mousedown` synthetic fires,
  segment gets active state) — but `document.activeElement` becomes the widget's **non-editable
  `div[tabindex=0]`** (`_buildDOM`, 08:926): not an input, not contenteditable, **no `inputmode`** →
  a virtual keyboard can structurally never raise; digits enter only from a hardware keyboard
  (verified: `keyboard.type('1')` lands in the segment buffer). The ONLY touch path to a value is
  the native-picker button (`showPicker()`). Applies to the whole family built by
  `initSegmentedInputs()` (08:1431): `dl-time`, `dl-weektime-time`, `dl-date`, `dl-date-time`,
  `repeat-anchor-time`, `form-repeat-anchor-time` — repeat-anchor verified by tap probe too.
  **Refuted part:** the monthday steppers DO respond to tap (44×40 button, value 15→16 on touch tap)
  and `#dl-monthday` is a native `type=number` → the "steppers don't respond" half of the user's
  report did not reproduce; likely he was tapping the seg-widget, or a device-specific issue —
  re-check once the seg fix lands. Evidence now A+B; CF 3. Fix unchanged (focusable per-segment
  inputs with `inputmode="numeric"`, or native `<input type=time/date>` on coarse pointers).
- **DEVICE UPDATE (2026-07-11, user's Android):** both native pickers (hourglass → time, arch →
  calendar) **open and function correctly** on the device — the `showPicker()` escape hatch is real,
  so a time/date IS settable on mobile via that button. The finding narrows to: the segment fields
  themselves stay dead to touch typing (VK never raises) and nothing signals that the icon button is
  the intended mobile path. Severity DL 1 → effectively mitigated (a workaround exists in-widget);
  keep UI 2 for the dead-looking primary control. CF 3 (settled on device).

### V2-B1-23 — Interface intermittently fails to paint on scroll (and paints differently each re-scroll) on mobile
- **Evidence:** B (user, on device: "при скроллах вверх-вниз интерфейс иногда может просто не отрисоваться … по-разному при каждом перескролле"). Not reproduced in headless emulation.
- **Severity:** UI 2 · DL 0 · RR 2 · IC 2 · CF 2 (device-only so far; needs profiling)
- **Where / hypothesis:** likely a compositing/paint problem amplified by (a) the astronomically tall layout from V2-B1-01/B1-13 (the collapsed cards make the page 10–15× viewport, and 190 k–959 k px at scale — V2-B1-10), and/or (b) heavy `backdrop-filter`/`filter`/shadow layers (the gothic glow, `.app-glow`, card glows) that the mobile GPU drops/re-rasterizes inconsistently while scrolling. The "different each re-scroll" signature points at dropped/aborted paints of expensive filter layers rather than a logic bug.
- **Failure scenario:** Scrolling the list on a phone sometimes leaves regions unpainted or renders icons/elements inconsistently — a visible, confidence-eroding glitch.
- **Refutation attempted:** "It's the reconciliation logic." → Reconciliation is deterministic and content-keyed; a *visual* paint that varies per scroll with identical DOM points at the compositor, not the DOM. Held CF 2 pending a device trace (Chrome DevTools paint flashing / layer borders).
- **Root cause:** to be confirmed — probable interaction of huge scroll height (B1-01/10) + expensive filter/backdrop layers on mobile GPUs.
- **Fix strategy:** first fix B1-01/B1-13 (kills the height explosion), then profile paints on device; reduce/rasterize the heavy filter layers (`will-change`, `content-visibility:auto` on off-screen sections, fewer stacked `backdrop-filter`s). Owner overlaps B7 (motion/paint) and B8 (perf).
- **Change together:** `style.css` (filter/compositing) + the B1-01 fix; investigate in B7/B8.
- **Tests:** device paint-flashing trace before/after B1-01 fix; assert no unpainted regions on a scripted scroll.
- **Cross-app:** whole app scroll surfaces.

### V2-B1-24 — Gesture-nav bar / edge-to-edge area is flat near-black, not the gothic background (user-noted)
- **Evidence:** B (user, installed & web: "фон жестовой полоски в нашем приложении тёмный") + A (`background_color`/`theme_color` `#03010a`; no `viewport-fit=cover` so the bg image never extends into the inset area).
- **Severity:** UI 1 · DL 0 · RR 1 · IC 1 · CF 3
- **Where:** `manifest.json` `background_color`/`theme_color` are flat `#03010a`; the gothic `bg-gothic.jpg` is painted on `.container`, which stops above the system inset. In standalone (and behind the browser bottom bar) the strip under/around the gesture bar is a dead black band instead of a continuation of the gothic atmosphere.
- **Failure scenario:** The bottom edge reads as a flat black cutoff rather than the immersive gothic backdrop — a small but real polish gap on a "aesthetic is mandatory" app.
- **Refutation attempted:** "Dark is on-brand." → It's darker/flatter than the bg image and reads as a seam; the user explicitly disliked it. Minor but valid.
- **Root cause:** no edge-to-edge opt-in (`viewport-fit=cover`) + solid theme colour; the background layer doesn't reach the insets.
- **Fix strategy:** with the `viewport-fit=cover` change (B1-07), extend the gothic background (or a matching gradient) into the safe-area insets so the strip blends; tune `theme_color` to the image's edge tone.
- **Change together:** `index.html`/`style.css` (bg extends to insets) + `manifest.json` (theme_color) — bundle with B1-07.
- **Cross-app:** whole app chrome. Pairs with B1-07.

### V2-B1-25 — Grimuar format toolbar is docked at the top of the editor, far from the caret → awkward to reach while typing on a phone
- **Evidence:** B (user: "до тулбара тянуться неудобно") + C (`B1_grim_n1_pixel7.png` — toolbar at the top, body/caret below).
- **Severity:** UI 1 · DL 0 · RR 2 · IC 2 · CF 3
- **Where:** `renderGrimDetail` renders the format toolbar as a fixed block at the top of the note; on a tall mobile note the caret is far below it, so applying bold/list/etc. means scrolling back up. On touch there is no hover-toolbar or selection-anchored bar.
- **Failure scenario:** Formatting text while writing a long note on a phone is clumsy — you lose your place scrolling up to the toolbar and back.
- **Refutation attempted:** "It's sticky." → It scrolls away with the note (not confirmed sticky on mobile); even sticky-at-top is far from a mid-note caret. Valid UX gap.
- **Root cause:** desktop-oriented top toolbar; no mobile caret-adjacent / selection-popover / sticky-bottom toolbar.
- **Fix strategy:** on touch, make the toolbar sticky near the keyboard (bottom) or show a selection-anchored mini-toolbar; keep the gothic styling.
- **Change together:** `02-grimoire.ts` (toolbar placement on touch) + `style.css`.
- **Cross-app:** Grimuar-only.

### V2-B1-26 — Text editing is dblclick-gated on five surfaces → on touch there is no reliable or discoverable way to rename a task / edit subtask text / edit an existing note
- **Evidence:** A + B (S1 emulation, 2026-07-11).
  - **A (structural):** the ONLY entry into inline text editing is the `dblclick` delegation channel
    (`ACT_DBL`, 01-core.ts:1336/1365): task title `startInlineEdit` (04:166), task note `_taskNoteEdit`
    (04:193), subtask text `startSubEdit` (04:554), subtask note `_noteEdit` (04:571), form-sub
    `startFormSubEdit` (04:690). No touch fallback exists anywhere: the task more-menu (04:2260) offers
    only шаблон/дублировать/подпункт-режим/понизить — **no «Редактировать»**; the note toggle button
    opens editing directly only for an EMPTY note (05:540), an existing note is dblclick-only. The only
    affordance is `title="Двойной клик — редактировать"` — a hover tooltip that does not exist on touch.
  - **B (behavioural, pixel7 emulation):** a fast double-tap on the task title produced **zero click and
    zero dblclick events** (document-level capture listeners logged nothing — the double-tap is consumed
    as a zoom-intent gesture; the viewport meta is `width=device-width, initial-scale=1` with **no
    `maximum-scale`/`user-scalable=no`** and **no `touch-action: manipulation`** anywhere in style.css,
    so double-tap-zoom stays armed). A programmatic `dblclick` dispatched at the same element enters
    editing correctly (contenteditable=true, focused) → the delegation itself is healthy; it is the
    touch gesture that never reaches it.
- **Severity:** UI 3 · DL 0 · RR 3 (every text-edit of existing content, the most basic flow after
  check/add) · IC 3 · CF 2 (emulation-confirmed; real-device Chrome may synthesize dblclick on
  mobile-optimized viewports — but even then it collides with double-tap word-selection and is
  undiscoverable; device check queued)
- **Failure scenario:** On a phone the user cannot rename a task, fix a typo in a subtask, or edit an
  existing task/subtask note — double-tapping either does nothing, zooms, or selects a word. The only
  workaround is deleting and re-creating the item (or editing on desktop).
- **Refutation attempted (§2):** "Real Android Chrome disables double-tap-zoom on `width=device-width`
  pages, so dblclick would fire there." → Possible (that is why CF stays 2 pending device check), but
  insufficient even if true: double-tap on TEXT in Android Chrome triggers word-selection with handles,
  competing with edit-entry; and nothing tells the user double-tap is the gesture. "The more-menu has an
  edit item." → Checked (04:2260) — it does not. "Editing was probed by B1's functional pass." → B1
  verified add/check/toggle taps; edit-entry was explicitly left as a lead («double-tap-zoom vs
  double-tap-edit conflicts») and is settled here.
- **Root cause:** desktop-idiom dblclick as the sole edit-entry gesture; no touch-path (edit button /
  long-press / more-menu item), no `touch-action: manipulation` to make dblclick reliable on touch.
- **Fix strategy (for the mobile rework, P0-adjacent):** add an explicit touch edit affordance — an
  «Редактировать» item in the task more-menu + a pencil in the revealed action set (or long-press),
  covering title, subtask and note text; optionally add `touch-action: manipulation` on interactive
  regions (also kills the 300 ms tap delay) — but keep pinch-zoom (B1-18 relies on it).
- **Change together:** `04-tasks.ts` (more-menu, action row) + `01-core.ts` (ACT entry) + `style.css`.
- **Tests:** on a touch context, edit entry reachable for: task title, subtask text, existing task note,
  existing sub note, form-sub text; regression: desktop dblclick still works.
- **Cross-app:** Grimuar is NOT affected (note body is an always-editable contenteditable; toolbar
  buttons are taps). Archive titles are read-only by design. This is the tasks-page family only.
- **DEVICE UPDATE (2026-07-11, user's Android):** double-tap edit **WORKS on the real device** for
  both task title and subtask — real Android Chrome does synthesize `dblclick` on this
  mobile-optimized viewport; the emulation's zero-event result did not transfer. Severity
  **downgraded UI 3 → 2**, reframed: the entry EXISTS on device but is (a) **undiscoverable** — the
  only hint is a hover tooltip that never shows on touch, nothing invites a double-tap; (b) **caret
  placement is hard** (user: «поставить курсор возможно но тяжеловато») — confounded by the B1-01
  single-character vertical title collapse; re-assess caret UX after the B1-01 fix. The fix strategy
  stands (explicit touch affordance), now as discoverability/ergonomics rather than a hard block.
  CF 3 (settled on device).

### V2-B1-27 — Quick-add typeahead drops below the input with no flip/clamp → clipped by the virtual keyboard on short viewports and unusable in landscape
- **Evidence:** A + B + C (S1 emulation: `ta_open_kbshort.png`, `ta_open_landscape.png`,
  measurements in `shots/s1/_s1_results.json`).
- **Severity:** UI 2 · DL 0 · RR 2 · IC 2 · CF 3 (landscape geometry is measured fact; the
  keyboard-overlay case follows from Chrome ≥108 `resizes-visual` default + `position:fixed`)
- **Where:** `_qaRenderMenu` (08-quickadd-export-init.ts:174-177) sets `position:fixed` (style.css:1181)
  with `top = input.bottom + 5` — always BELOW the input, with no flip-above logic, no viewport clamp,
  no `max-height`, and no `visualViewport` awareness. Measured: portrait pixel7 fits (menu 347→489 of
  915); **412×460 (keyboard-height proxy): menu bottom 489 > 460** — the lower item(s) land under the
  keyboard (screenshot shows the 4th option cut); **landscape 915×412: menu bottom 535 > 412** — off-
  screen even with no keyboard, and the accept-tap on a clipped item missed (value stayed `задача !`,
  menu closed without inserting) → typeahead effectively unusable in landscape.
- **Failure scenario:** On a phone with the keyboard raised (short visual viewport) or in landscape,
  the typeahead's lower options are invisible/untappable; in landscape selecting any option can fail
  entirely. The feature silently degrades exactly where quick-add matters most — typing on mobile.
- **Refutation attempted (§2):** "The old B1 note said `.fill()` didn't even trigger the menu — maybe
  it doesn't open on mobile at all." → Refuted by this probe: real keystrokes (`keyboard.type`) DO open
  it on a touch context; the earlier non-trigger was a `.fill()` artifact (no input events per key).
  "Portrait is the dominant case and it fits." → True for pixel7-class heights (that scopes severity
  to 2, not 3), but landscape + smaller/short phones + large-font settings all hit it; the accept-miss
  makes it functional, not cosmetic.
- **Root cause:** body-portal fixed-position dropdown positioned only relative to the input's bottom
  edge; portrait-tall-viewport assumption (theme 3 sibling, distinct widget and fix site).
- **Fix strategy:** clamp to `visualViewport` (flip above the input when space below is insufficient —
  above it is the header, always roomy), cap `max-height` with internal scroll; listen to
  `visualViewport.resize` while open.
- **Change together:** `08-quickadd-export-init.ts` (`_qaRenderMenu`) + `style.css` (`.qa-menu`).
- **Tests:** at 412×460 and 915×412, open typeahead → every option on-screen and tap-accept inserts.
- **Cross-app:** the qa-menu is tasks-only; Grimuar has no typeahead. Body-portal popover clamping
  overlaps V2-B1-17 — fix with the same clamp utility.
- **DEVICE UPDATE (2026-07-11, user's Android):** portrait-with-keyboard CONFIRMED GOOD on device —
  the priority dropdown shows fully above the keyboard (matches the emulation portrait numbers).
  The landscape clip stands (emulation-measured; device landscape not re-checked). The user's same
  check surfaced the scroll-anchoring defect → split out as V2-B1-28.

### V2-B1-28 — Typeahead menu is pinned to viewport coordinates, not to the input: scrolling while it is open detaches it (all platforms, all trigger types)
- **Evidence:** B (user, on device AND on PC: «он фиксируется по вьюпорту а не инпутом задачи…
  не только на андроиде но и ПК и не только приоритета а и даты и тегов») + A (code).
- **Severity:** UI 2 · DL 0 · RR 2 · IC 2 · CF 3 (user-observed on two platforms + code-confirmed)
- **Where:** `.qa-menu` is `position:fixed` (style.css:1181); `_qaRenderMenu`
  (08-quickadd-export-init.ts:174-177) writes `left/top` from `inputBox.getBoundingClientRect()`
  only when a keystroke re-renders the menu. There is **no scroll or resize handling while the menu
  is open**: `_qaClose()` fires only on Escape / accept / input-blur / empty-query (08:149-223).
  Scrolling the page moves the input but the fixed-position menu stays at its old viewport spot —
  visibly detached from its anchor. Applies to every trigger type (`!` priority, `%` date, `*` tag)
  because they share the one menu.
- **Failure scenario:** User types `задача !`, the dropdown opens, they scroll (finger-drag on
  mobile easily scrolls; mouse wheel on desktop) → the menu floats over unrelated content, no longer
  attached to the input; picking an option still edits the (now off-screen) input — disorienting.
- **Refutation attempted (§2):** "Scroll blurs the input and the menu closes." → No: scrolling does
  not blur a focused input, and there is no scroll listener; code paths enumerated above. "Menu
  re-anchors on the next keystroke." → True, but that requires typing again; while scrolled it stays
  detached.
- **Root cause:** one-shot fixed positioning with no anchor-tracking (no scroll/resize reposition,
  no close-on-scroll) — same body-portal weakness family as V2-B1-17/27.
- **Fix strategy:** cheapest correct: close the menu on window scroll (typeahead re-opens on the
  next keystroke); better: reposition on `scroll`/`resize`/`visualViewport` while open — do it in
  the same clamp utility as the V2-B1-27 fix.
- **Change together:** `08-quickadd-export-init.ts` (`_qaRenderMenu`/`_qaClose`) + the B1-27 clamp.
- **Tests:** open typeahead, scroll 200 px → menu either follows the input or closes; desktop + touch.
- **Cross-app:** NOT mobile-specific (desktop too) — recorded here because the typeahead is this
  batch's surface; B4 (UI consistency) should sweep the other body-portal popovers (task-more,
  snooze, sub-mode, demote, grp-dd) for the same scroll-detach behaviour.

### S1 top-up — one-line theme instances & probe-artifact refutations (2026-07-11)
Instances of established themes (recorded, NOT re-proven — the rework replaces these surfaces):
- `#dl-weekday-list` clips ~11 px past the bottom edge in landscape (no flip-up; the month list DOES
  flip up but then clips 5 px at the top) → theme 3 / V2-B1-06 family. Items are 45 px — good.
- Modal confirm/cancel buttons measure 97×26; quarantine restore/dismiss 96×24; qa-menu items 31 px
  tall → theme 4 / V2-B1-09 census.
- At 360 px the layout viewport expands to ~391 px (tasks) and ~412 px (Grimuar list) — the same
  horizontal overflow already recorded as V2-B1-05 / V2-B1-04 (cross-confirmation via
  `innerWidth`, no new finding).
Probe-order artifacts refuted by clean re-runs (recorded so they aren't re-chased): group picker
(`#grp-trigger`) opens fine on tap; Grimuar colour-filter pop opens fine on tap at 360 (3 swatches,
36 px, fits); the deadline modal survives rotation with typed segment buffers intact — earlier
failures were leftover-state/animation-timing artifacts of the probe script itself, not the app.

---

### Leads for an EXHAUSTIVE B1 (not yet probed — concrete next work to multiply coverage)
The 23→25 findings cluster around a few dominant root causes (revealed-action crush,
non-wrapping strips, no-landscape modals, custom touch inputs); many surfaces are
genuinely fine (differential list below). To push B1 toward exhaustive, each area
below is a concrete runnable probe likely to yield further findings — several are
cross-batch (gothic=B2, icons=B3, UX=B5, motion=B7, perf=B8) but manifest on mobile:
- **All 6 gothic pickers** (sort ×3, dl-month, dl-weekday, form-weekday, repeat-weekday, colour-filter pop) at 360 + landscape: placement/clip/tap-size (only sort + task-more sampled).
- **Remaining modals** not yet landscape/keyboard-swept: `grim-link`, `bulk-group`, `import-choice`; and every modal WITH the keyboard raised (not just short-viewport proxy).
- **Quarantine review overlay** + the unresolved-count badge on mobile (needs seeded journal).
- **Notification permission / bell** flow + the deadline-notification toast on mobile.
- **Archive month collapse** animation + header tap-target; **Grimuar crypt month** collapse.
- **Find bar** (`::highlight`) over the keyboard; **search-result highlight** legibility on mobile.
- **Schedule mode** `.dl-side-panel` (44 px) legibility + the split/today/focus combos at mobile width.
- **Sub-notes-always eye**, promote/demote, duplicate, template-apply flows on touch.
- **200 % browser-zoom reflow** (distinct from OS font-scale B1-18) — does anything break/overlap.
- **RTL / long-locale** text; **very long unbroken word/URL** isolated from B1-01/04/05 (patch them out first).
- **Contrast over the BRIGHT bg-image regions** (moon/branches) — pixel-sample muted/purple text there (solid-bg text is fine, 17.5:1).
- **Orientation-change mid-edit** data safety; **long-press vs text-selection** and **double-tap-zoom vs double-tap-edit** conflicts; **pen-volume drag** + **colour-spectrum pad** touch precision (looked OK, not touch-tested).
- **Per-component tap-target + spacing census** (beyond the count) and **motion timing on a throttled phone** (B7).

---

### Good surfaces confirmed on mobile (differential evidence — preserve in the rework)
Not findings — recorded so the mobile rework keeps what already works and the audit stays fair:
- **Toolbar + «Параметры» panel** (priority 2×2, group dropdown, repeat pills, deadline trigger) — clean at 360–412.
- **Archive page** — 2-button action rows fit; this proves B1-01 is the 9–10-button density, not cards per se.
- **Deadline modal (portrait)** — 6-mode grid + segmented date + duration candles + actions all fit at 360.
- **Group/colour modal** — 10 preset circles ~50 px (good tap size) + a large RGB saturation/value pad + hue slider + hex; touch-precise (contrast with the 20 px inline `.form-color-swatch` in B1-09 — those are the small ones, NOT these).
- **Grimuar editor + note list** — 16-button format toolbar reflows responsively; 2-col table + rich body render cleanly; note list is readable/well-carded.
- **Header, page-nav, progress bars, empty-state** — solid at mobile width.
- **Enter animation** — `.task-item.entering` (`animation:taskIn`, no `forwards`) reverts to base after ~340 ms; the JS leaves the class attached but it is cosmetically harmless (reduced-motion path disables it). Trivial cleanup → B10, not a B1 finding.
- **Reduced-motion** — thorough: **50** `@media (prefers-reduced-motion: reduce)` blocks cover the animated components (entering, group-header settle, snooze-menu, qa-menu, grp-dd, etc.). Strong `prefers-reduced-motion` support; no finding (spot-check completeness in B7).
- **Grimuar history «Летопись» overlay** — full-width, readable snapshot list + current-version preview + a large close button; fits and works at mobile width (`B1w_hist_pixel7.png`).
- **Grimuar editor content on touch** (deepen-workflow) — long `pre/code` wraps cleanly inside its slab (no h-scroll), checklist checkboxes toggle on a real tap, the warning callout renders correctly, the format toolbar fits inside the card, focus modes are harmless. (Only the wide-table and TOC gaps above.)
- **Select/bulk is functional** — neither the task nor Grimuar bulk bar clips or traps a control; every button is tappable (the only issues are the cosmetic wrap V2-B1-14 and 32 px targets → V2-B1-09).
- **(S1) Quarantine overlay** — fits and works on pixel7 / 360 / landscape: modal never clips, the
  entry list scrolls internally (`max-height:52vh`), long loser-values wrap, badge («5») visible on the
  sync FAB, and a touch tap on «Восстановить» correctly restores the losing value into state and
  removes the row. The one dent: 96×24 buttons (theme 4). Seeded-journal harness in `s1_probes.mjs`.
- **(S1) Rotation is data-safe everywhere probed** — quick-add draft text, deadline-modal typed segment
  buffers, a mid-edit (pre-debounce) contenteditable note, and the Grimuar editor body all survive
  portrait↔landscape rotation with the modal/editor still open (no resize-triggered re-render exists
  outside the Grimuar table UI). Rotate-mid-edit closes as SAFE.
- **(S1) Modals with a raised keyboard (412×460 proxy)** — note-modal, rename-group, grim-link (and the
  templates list) all fit with the focused input AND the confirm button fully visible. The clipping
  class stays exactly where B1-06 drew it (deadline/repeat/color/group).
- **(S1) Typeahead opens from real keystrokes on touch** and tap-accept inserts correctly in portrait
  (the B1-era `.fill()` non-trigger was a probe artifact); only placement fails (V2-B1-27).

---

## Batch B2 — Gothic design language (S2, 2026-07-11)

Calibration: user primary render 2560×1440@100%; recommendation scale = вариант (б)
(large proposals allowed, user decides each); user ground truth: priority strip =
AI-pattern. Full report: `audit-v2/B2-gothic.md`. Positives (identity anchors)
recorded there — the registry lists only defects.

---

### V2-B2-01 — Two design languages: ornamented identity layer vs generic "chrome" layer
- **Evidence:** C (shots: D-sort-menu, D-pop-more-menu, D-pop-export, D-pop-snooze,
  D-sync-panel, D-sync-quarantine, D-modal-rename-group vs D-modal-deadline,
  D-quickadd-params) + A (single `.snooze-menu` class family, style.css:1077).
- **Severity:** UI 2 · DL 0 · RR 1 · IC 2 · CF 3
- **What:** every floating menu (snooze/task-more/sub-mode/demote/export/sync
  panel), the sort portal, quarantine modal and utility modals are plain rounded
  rects with generic items — no gothic framing/ornament — while quick-add,
  deadline modal and Grimuar editor are richly art-directed. The app reads as two
  products.
- **Root cause:** chrome components were built function-first at different times
  and never passed through the identity treatment; there is no shared "gothic
  popover frame" primitive to inherit from.
- **Fix strategy:** create ONE popover/modal skin (frame, header ornament, item
  hover idiom) and apply via the shared float-menu engine — do together with
  V2-B4-02 (engine unification) so restyle lands everywhere at once.
- **Files together:** dusk/03-render.ts (_openFloatMenu, sort portal), dusk/08
  (_qaRenderMenu), dusk/11-sync-ui.ts (panel html), style.css (.snooze-menu,
  .task-sort-portal, .qa-menu, modal frames).
- **Tests:** visual pass over every popover (list in V2-B4-02); npm test (no logic).
- **Cross-app:** Grimuar popovers (io/tpl/cfilter) share the plainness — same fix.
- **Refutation attempted:** "plain menus are a deliberate quiet-chrome choice" —
  rejected: the deadline modal and quick-add prove the intended direction is
  ornamented; CLAUDE.md mandates gothic for ALL controls, not just hero surfaces.

### V2-B2-02 — Priority presentation = AI-pattern (colored left strip + plain dots); gothic ember idiom already exists but only on subtasks
- **Evidence:** C (D-main-2560, D-hover-task, D-typeahead-prio, D-quickadd-params)
  + E→confirmed (user named the strip an AI-pattern himself) + A (subtask ember
  `--sprio` in style.css per CLAUDE.md).
- **Severity:** UI 2 · DL 0 · RR 1 · IC 2 · CF 3
- **What:** task cards mark priority with a colored left border bar; pickers use
  plain colored circles. Both are the generic to-do fingerprint. Subtasks already
  solve this with the soft ember glow (`--sprio`) — the documented app idiom.
- **Fix strategy:** extend the ember idiom to task cards (glow from tombstone
  checkbox or card edge — no bar); replace picker dots with tinted gothic glyphs
  (flame/rune sizes). Prototype as HTML preview → user picks (his standing
  design-tools preference), then implement.
- **Files together:** dusk/03-render.ts (card markup), style.css (task card,
  prio pickers, typeahead menu), keep `--prio-*` color vars as the tint source.
- **Tests:** visual (all prio levels × checked/pinned/colored states × both grids).
- **Cross-app:** Grimuar has no priorities — n/a; but color-label framing
  (V2-B2-03) should land in the same visual language.
- **Refutation attempted:** "strip is efficient and familiar" — familiarity IS
  the complaint (generic); function preserved by glow alternative.

### V2-B2-03 — Label-color system presented as bright material swatches, off the palette discipline
- **Evidence:** C (D-quickadd-params ЦВЕТ МЕТКИ row, D-modal-colorfilter,
  D-grim-cfilter) + A (swatch markup/CSS).
- **Severity:** UI 2 · DL 0 · RR 1 · IC 1-2 · CF 2
- **What:** 10 fully-saturated circles/squares (lime, cyan, orange, pink…) sit
  raw in a UI whose rule is violet-on-near-black with red reserved for danger.
  The FEATURE (10 user colors) is locked data; the PRESENTATION is generic and
  loud.
- **Fix strategy:** desaturate/dusk-tint the swatch rendering (keep hues apart),
  restyle swatches as gothic tokens (ink drop / wax seal / cabochon); user-color
  tints on cards inherit via V2-B2-02 idiom.
- **Files together:** style.css (swatch classes), dusk/03-render.ts +
  05 (bulk color), 08 (params row), Grimuar cfilter (02).
- **Tests:** visual: all 10 colors on card + chip + filter + Grimuar frame;
  ensure distinguishability survives desaturation (a11y check in B5).
- **Cross-app:** shared — same swatch set both apps.
- **Refutation attempted:** "colors must stay maximally distinct for scanning" —
  distinctness survives moderate desaturation; B5 will verify.

### V2-B2-04 — Tasks empty state lacks the app's voice (Grimuar's has it)
- **Evidence:** C (D-empty-tasks vs D-empty-grim, D-empty-archive).
- **Severity:** UI 1 · DL 0 · RR 0 · IC 1 · CF 3
- **What:** tasks-side empty state = small sparkle + grey caption; Grimuar =
  book glyph + «Гримуар пуст» + italic subline + НАЧЕРТАТЬ ПЕРВУЮ. Filter/search
  empty states share the flatness (June V-2 added presence, not voice).
- **Fix strategy:** tasks empty-state set (no tasks / all done / filter-empty /
  search-empty) in own motifs + RU voice lines; mirror Grimuar's structure.
- **Files:** dusk/03-render.ts empty-state markup, style.css.
- **Cross-app:** brings tasks up to the Grimuar bar.
- **Refutation attempted:** "empty states are rare" — first-run IS the first
  impression; user chose вариант (б) quality bar.

### V2-B2-05 — Tasks АРХИВ readability overshoots the "buried" effect
- **Evidence:** C (D-archive at 2560: row titles barely legible) — B5 to measure
  exact contrast ratios.
- **Severity:** UI 2 · DL 0 · RR 1 · IC 1 · CF 2
- **What:** archived task titles render ultra-dim strikethrough on dim panel —
  the ghost intent is right, but scanning/restoring from a big archive is work
  against the UI. СКЛЕП (notes) proves buried-but-readable is achievable.
- **Fix strategy:** raise archived-title contrast toward ~4.5:1 while keeping
  ghost styling (strike, desat); keep month headers as is.
- **Files:** style.css archive rows; none else.
- **Cross-app:** align with СКЛЕП treatment.
- **Refutation attempted:** "dimness is the design" — function (find & restore,
  the #1 archive job) loses; identity keeps via strike+desat, not near-invisibility.

---

## Batch B3 — Glyphs & iconography (S2, 2026-07-11)

User ground truth: most icons (esp. outside Grimuar) fail the 3-axis bar
(gothic × detail × intuitive, all maxed). Census: IC 47 + GIC 18 + FIC 22
builders + 75 unique statics in index.html; only 2 shared <symbol>s. Full
triage + redesign program: `audit-v2/B3-icons.md`.

---

### V2-B3-01 — Majority of motif icons fail the detail/gothic axes (systemic redesign program)
- **Evidence:** E→confirmed (user mandate) + C (D-iconsheet: 16/20/24/32px) +
  A-metric (≥50% of IC/statics ≤4 SVG elements; exemplars exist: chronicle:15,
  drag:9, sundial:8, skull:7).
- **Severity:** UI 3 · DL 0 · RR 1 · IC 3 · CF 3
- **Root cause:** icons accreted per-feature without a quality bar or exemplar
  set; the strong glyphs (летопись, skull, sundial) came later and never
  propagated back.
- **Fix strategy:** tiered program (report): registry-first (V2-B3-02), then
  per-family ornate redesign of Tier B against Tier A exemplars, 16px legibility
  gate, user-ratified preview sheets per family; micro-marks (FIC) only weight-
  normalized, NOT engraved.
- **Files:** dusk/01-core.ts (IC), dusk/02-grimoire.ts (GIC/FIC), index.html
  statics, style.css sizing.
- **Tests:** rerun icon-sheet harness per family (s2_shots.mjs icons) + in-situ
  spot shots; npm test untouched.
- **Refutation attempted:** "minimal glyphs are a legitimate style" — overruled
  by explicit user requirement (locked): all three axes at maximum.

### V2-B3-02 — No icon system: ~160 duplicated definitions, 2 symbols, near-duplicate motif drift
- **Evidence:** A (census: 99 inline SVGs in index.html, 75 unique, 14 literal
  repeats ×≤5; 87 JS builders; 2 <symbol>s) + C (sheet shows ≥6 cross variants,
  ≥5 crescents, ≥5 X-marks, 2 magnifiers, multiple arch/book/tombstone drifts).
- **Severity:** UI 1 (drift visible) · DL 0 · RR 2 (touch-everything refactor) ·
  IC 2 · CF 3
- **Root cause:** copy-paste inline SVG as the default insertion method; no
  role→glyph registry; CLAUDE.md reuse rule unenforceable without one.
- **Fix strategy:** consolidate one definition per ROLE (builders preferred —
  they already dominate), replace index.html statics with refs, THEN redesign
  (order matters: makes V2-B3-01 O(roles) not O(instances)). Also shrinks HTML
  (~140KB index.html today) — cross-ref B8/B9.
- **Files together:** index.html + all dusk modules that emit icon HTML.
- **Tests:** visual diff per surface; build size check.
- **Cross-app:** unify same-role glyphs across DUSK/Grimuar (magnifier, archive).
- **Refutation attempted:** "duplication is harmless denormalization" — the
  drift on the sheet (6 crosses) is the direct product; reuse rule already broken.

### V2-B3-03 — Semantic misfires: death motifs on schedule concepts and other role/motif mismatches
- **Evidence:** C (D-modal-repeat: tombstones = «По будням»/«Ежемесячно»;
  D-pop-snooze: tombstone = «+1 неделя»; D-modal-templates: unreadable row
  action; toolbar ВИД cluster lookalikes) + A (IC key names).
- **Severity:** UI 2 · DL 0 · RR 1 · IC 2 · CF 3
- **Root cause:** motif chosen for "gothic-ness" without a semantic map; the
  same glyph family (tombstone/arch) covers archive, weekday, month, data.
- **Fix strategy:** role→motif semantic map ratified by user BEFORE redrawing
  (part of the V2-B3-01 program); schedule concepts get time/astral motifs
  (moon phases, sundial, bell-toll) not burial motifs; cross also двойная роль
  (add vs none) — disambiguate.
- **Refutation attempted:** "tombstone = день недели is charmingly dark" — fails
  the intuitiveness axis (user's third requirement), and collides with coffin=
  archive locked motif.

### V2-B3-04 — Stroke-weight and optical-size normalization absent across the estate
- **Evidence:** C (sheet: hairline arrows vs heavy tombstones vs filled shapes
  at equal rendered size).
- **Severity:** UI 1 · DL 0 · RR 1 · IC 2 · CF 3
- **Fix strategy:** one weight scale on a 24-unit grid inside the registry pass;
  optical variants for 16px-critical glyphs.

### V2-B3-05 — Five glyphs rendered EMPTY on the icon sheet (inline#98-101, #116) — verify in-app
- **Evidence:** D (likely sheet-harness extraction artifact: context-dependent
  sizing/currentColor), C (D-iconsheet blank cells).
- **Severity:** UI ? · DL 0 · RR 0 · IC 0-1 · CF 1
- **Next:** during B4 popover re-sweep, map sheet DOM order → source and confirm
  each renders in-app; if any is genuinely blank in-app, promote to a bug.

---

## Batch B4 — UI (S2, 2026-07-11)

Desktop-first pass at the user's primary 2560×1440 (+1920/1366), executed the
B1-28 popover-sweep ownership item. Full report: `audit-v2/B4-ui.md`.

---

### V2-B4-01 — No large-screen layout tier: app is a ≤770px column at any viewport
- **Evidence:** C (D-main-2560 vs D-main-1366: ~70% background waste vs balanced;
  3-4-line title wraps; ~300px subtask grid cells at 2560).
- **Severity:** UI 3 (user's own primary monitor) · DL 0 · RR 2 · IC 2-3 · CF 3
- **Root cause:** single max-width designed for laptop; no ≥1440px breakpoint
  exists in style.css.
- **Fix strategy (вариант (б), user to choose):** (a) wider column at ≥1600px
  (~900px, typography-safe); (b) optional desktop master-detail (mirror
  Grimuar's own list+detail pattern); (c) toolbar density option.
- **Files:** style.css breakpoints; (b) additionally dusk/03-render.ts.
- **Tests:** shots at 1366/1920/2560 × both apps × key states.
- **Cross-app:** Grimuar already master-detail — proof of concept in-app.
- **Refutation attempted:** "focused single column is the design" — holds at
  ≤1600px, fails at 2560 where wrap/squeeze actively hurts (measured).

### V2-B4-02 — Systemic: 4 ad-hoc popover engines; float-menu family detaches on scroll (live-proven), no Esc, no scroll tracking anywhere
- **Evidence:** A (engine census: _openFloatMenu 03:1018; toggleSortPicker
  portal; _qaRenderMenu 08:156; registerGothicPicker 03:1733 — none listen to
  scroll/resize) + B (s2_fix2: snooze menu top 725→725 after wheel 300px, still
  open, detached — D-pop-snooze-detached.png; open after Escape: true).
- **Severity:** UI 2 · DL 0 · RR 2 · IC 2 · CF 3
- **What:** every body-portal popover freezes its viewport coords at open.
  Desktop wheel-scroll detaches ALL of them from their anchors (V2-B1-28 was the
  qa-menu instance; family = snooze, task-more, sub-mode ×2, demote, export,
  sync panel, sort portal, gothic pickers). Float menus also ignore Escape;
  role="menu" has no keyboard nav (→B5). Touch partially self-heals (outside
  pointerdown closes on scroll start).
- **Root cause:** four independent one-shot positioning implementations; no
  shared anchored-popover utility.
- **Fix strategy:** ONE utility (flip + clamp + maxHeight + reposition-or-close
  on scroll/resize + Esc + single-open across families + arrow-key nav) adopted
  by all four engines; restyle once with V2-B2-01 skin. Closes V2-B1-27,
  V2-B1-28, the B1-17 sibling question, and this.
- **Files together:** dusk/03-render.ts, dusk/08-quickadd-export-init.ts,
  dusk/11-sync-ui.ts, style.css (.snooze-menu/.task-sort-portal/.qa-menu).
- **Tests:** rerun s2_fix2 detach probe per popover; B1 kb-proxy/landscape shots
  for qa-menu; cross-family single-open check.
- **Refutation attempted:** "outside-pointerdown makes scroll-detach unreachable"
  — false on desktop: wheel scroll fires no pointerdown (proven live); user hit
  it on PC himself (his device round item 12).

### V2-B4-03 — Viewport-anchored strips orphaned from the app frame at large viewports
- **Evidence:** C (D-shortcuts: full-width bottom strip wider than the column;
  D-filter-today: status pill floating ~350px below content; right-edge FAB
  stack mid-background in most shots).
- **Severity:** UI 1-2 · DL 0 · RR 1 · IC 1 · CF 3
- **Fix:** anchor hint bar/status pill/FAB stack to the app column geometry;
  scale hint-bar type up at desktop.

### V2-B4-04 — Collapsed group nearly indistinguishable from expanded
- **Evidence:** C (D-group-collapsed vs D-main-2560: only a small right-side
  dash differs).
- **Severity:** UI 1 · DL 0 · RR 0-1 · IC 1 · CF 3
- **Fix:** closed-state affordance via the locked sword-chevron rotation +
  header dim/engraved divider.

### V2-B4-05 — Disabled state missing in the float-menu family (sync panel items look active)
- **Evidence:** A (11-sync-ui.ts:425-426 sets `disabled`; style.css has NO
  `.snooze-menu [disabled]` rule — grep shows :disabled styles only for
  repeat-btn/select-bar/sb-btn) + C (D-sync-panel: «Синхронизировать сейчас»
  visually identical to enabled while signed out).
- **Severity:** UI 2 (silent dead click on a sync control) · DL 0 · RR 0 ·
  IC 0-1 · CF 3
- **Fix:** disabled style in the shared popover skin (opacity + cursor +
  aria-disabled); include in V2-B2-01/B4-02 change.

### V2-B4-06 — ::selection themed only inside Grimuar body
- **Evidence:** A (style.css:7479 scopes ::selection to .grim-body) + C
  (default blue selection in D-modal-rename-group).
- **Severity:** UI 1 · DL 0 · RR 0 · IC 0 · CF 3
- **Fix:** global violet ::selection (match rgba(150,70,255,.30) already used).

### V2-B4-07 — Quarantine review rows leak internal field names (copy) — cross-owned with B5/B6
- **Evidence:** C (D-sync-quarantine: «поле «text»», «поле «name»»; one seeded
  subtask clash displayed loser as «пусто» though seed carried text — display
  logic check owed to B6).
- **Severity:** UI 1-2 (the panel exists to let a non-technical user decide) ·
  DL 0 (display only) · RR 0 · IC 1 · CF 3
- **Fix:** human RU labels per recType/field map (задача→«Заголовок», группа→
  «Название», заметка→«Текст»); B6 verifies loser-value rendering for every
  journal kind (jq3 «пусто» case).

---

## Batch B5 — UX + Accessibility + RU copy (S3, Opus 4.8, 2026-07-11)

Executed `audit-v2/S3-B5-DIRECTIVE.md`. Full report + tables (contrast, hotkey,
icon-aria census, discoverability matrix, toast census, terminology, quarantine
label map, workflow cost): `audit-v2/B5-ux.md`. Contrast is ground-truth (fg vs
sampled composited backdrop, PNG-decoded from screenshots). Probes:
`D:\tmp\pw\b1\s3_*.mjs`; raw JSON in `audit-v2/shots/s3/_*.json`. Positives
(live region + toast announce, 13 modals with focus trap+return, labelled
dialogs, listbox activedescendant, 387/389 named icon buttons) recorded in the
report — the registry lists only defects. `[RATIFY-FABLE]` = taste-judgment,
one cheap Fable pass owed.

---

### V2-B5-01 — Overdue-deadline chip text fails AA contrast (2.53:1) — the most important status is the least legible
- **Evidence:** B (ground-truth contrast probe `s3_contrast.mjs`) + A (color source).
- **Severity:** UI 2 · DL 0 · RR 1 · IC 1 · CF 3
- **Where:** the over-deadline chip text (`.dl-absolute` in an overdue `.task-deadline`)
  renders `#A01525` (rgb 160,21,37), **9.5px + bold**, on the near-black card
  (sampled backdrop #09031B) → **2.53:1**, well below the 4.5:1 AA body floor.
  Contrast: the non-overdue "time/daily" chip uses the brighter `#E03060` and
  passes (4.56:1). So the darkest, most-saturated red is on the MOST important
  state (a task that is already overdue — «должен гореть красным»).
- **Failure scenario:** A user scanning for what's overdue cannot read the overdue
  date itself (2.53:1, tiny, bold, dark-red on black). The chip's whole job — telling
  you WHEN it was due — is the least legible text in the app. Low-vision users lose it.
- **Refutation attempted (§2):** "The red is a signal, not meant to be read." → The
  date string («10 июл») is content, not decoration, and 2.53:1 fails regardless.
  "Maybe a red glow/bg lifts it." → Sampled backdrop is near-black (#09031B), not a
  red fill; the glow doesn't raise text contrast. "Large-text exemption?" → 9.5px is
  not large. Refutation fails.
- **Root cause:** the overdue state uses a darker/more-saturated red (#A01525) than
  the already-passing #E03060 used elsewhere; contrast was never measured on the
  dark card. Ties the one-token-tuned-to-floor theme (V2-B5-12).
- **Fix strategy:** unify overdue text on the brighter `#E03060` (or lift #A01525's
  lightness in the OKLCH re-derivation, DESIGN-PLAN §2.2) — **keeps danger-red
  semantics (§9), only raises luminance to ≥4.5:1**; also bump the deadline-chip
  font-size off the 9.5px floor (readability). Do in D1 (foundations).
- **Change together:** `style.css` (overdue deadline color + `.task-deadline`/
  `.dl-absolute` size).
- **Tests:** re-run `s3_contrast.mjs`, assert overdue chip ≥4.5:1.
- **Cross-app:** deadline chips are task-only; the token lift also helps V2-B5-12.

### V2-B5-02 — Collapsed «Параметры» panel keeps 40 focusable controls in the tab order (hidden but reachable)
- **Evidence:** A (CSS) + B (`s3_a11y.mjs`/`s3_probe3.mjs`: focus lands inside the
  height:0 panel; Tab circuit walked all 40 before the reveal toggle).
- **Severity:** UI 2 · DL 0 · RR 2 · IC 1 · CF 3
- **Where:** `#extra-fields` collapses via `max-height:0; overflow:hidden` (computed
  `display:block; visibility:visible`, NOT `display:none`/`visibility:hidden`/`inert`).
  Its 40 controls (priority grid, 11 colour swatches, group picker, deadline trigger,
  note input, 5 repeat buttons, subtask input, pin, template) stay focusable while
  clipped to 0px. The keyboard Tab sequence reaches them BEFORE `#btn-expand`
  («Параметры») — the button that would reveal them.
- **Failure scenario:** A keyboard/AT user tabs through 40 invisible, off-screen
  controls (operable but clipped to 0px) before reaching the control that opens the
  panel — WCAG 2.4.3 (focus order) + 2.4.7 (focus not visible: focused element is
  clipped). Present on desktop AND mobile (B1 didn't catch it).
- **Refutation attempted (§2):** "max-height:0 removes it from tab order." → No —
  only `display:none`/`visibility:hidden`/`inert`/`tabindex=-1` do; `max-height:0`
  keeps elements focusable (runtime-confirmed focus landed inside). "The panel is
  open by default." → maxHeight computed 0px, panel collapsed. Refutation fails.
- **Root cause:** the collapse animation uses `max-height` (for the CSS transition)
  without gating focusability; no `inert` toggle paired with the collapsed state.
- **Fix strategy:** add `inert` (or `visibility:hidden` at the collapsed end-state,
  toggled when the transition finishes) to `#extra-fields` while collapsed; remove
  on expand. Preserves the max-height animation. Same pattern for any other
  max-height-collapsed region with focusables (audit group bodies in the fix stage).
- **Change together:** `dusk/08` (toggle `inert` in the expand/collapse handler) +
  `style.css`.
- **Tests:** collapsed panel → assert `document.activeElement` can never enter
  `#extra-fields`; expanded → all 40 reachable.
- **Cross-app:** the pattern (max-height collapse) recurs — sweep group/subtask/
  archive-month collapses for the same focusable-while-hidden issue.

### V2-B5-03 — Text inputs have no visible focus indicator (buttons do; inputs get only the caret)
- **Evidence:** A + B (`s3_probe3.mjs`: on focus `outline:none`, border unchanged,
  no box-shadow; `ringAppeared:false`).
- **Severity:** UI 2 · DL 0 · RR 1 · IC 1 · CF 3
- **Where:** `#input-box`, `#search-box`, `#task-note`, `#form-sub-input`,
  `#notes-search-box` and modal inputs receive NO focus styling — `outline` stays
  `none`, `border-color` does not change, no box-shadow ring appears on `:focus`
  or `:focus-visible`. Buttons DO get the purple token ring (B4 baseline). The tab
  circuit flagged all four visible inputs as `⟨NO-RING⟩`.
- **Failure scenario:** A keyboard user tabbing into any text field sees only the
  native blinking caret; there is no visible focus indicator on the field itself
  (WCAG 2.4.7). Inconsistent with buttons, which are clearly ringed.
- **Refutation attempted (§2):** "The caret is the indicator." → The caret marks the
  insertion point, not that the control has focus per 2.4.7; and it's easy to miss.
  "JS focus() suppressed :focus-visible." → The real-Tab circuit (keyboard focus,
  focus-visible active) ALSO showed no ring. Refutation fails.
- **Root cause:** inputs were styled with `outline:none` (to kill the default UA
  ring) but never given a replacement focus token, unlike buttons.
- **Fix strategy:** define one focus-visible ring token (D1) and apply to inputs +
  contenteditable + buttons uniformly (e.g. `box-shadow: 0 0 0 2px var(--focus-ring)`
  matching the button ring). Gothic-neutral.
- **Change together:** `style.css` (input/`:focus-visible` rules).
- **Tests:** focus each input via Tab → assert an outline or box-shadow ring appears.
- **Cross-app:** both apps' inputs.

### V2-B5-04 — Quarantine conflict overlay bypasses the modal a11y machinery (no label, no focus trap, no focus-in, Esc doesn't close)
- **Evidence:** B (`s3_a11y.mjs`: `labelledby:null`, `focusInside:false`,
  `escClosed:false`) + A (`openQuarantine`, 11:597 — hand-rolled, not `openModalWithFocus`).
- **Severity:** UI 2 · DL 0 (display/interaction only; the journal data is intact) ·
  RR 1 · IC 1 · CF 3
- **Where:** `openQuarantine()` builds `<div class="modal-overlay sync-quar-overlay"
  role=dialog aria-modal=true>` directly and appends it — it does NOT go through
  `openModalWithFocus` (05:1335). Consequences (all runtime-confirmed): (a) no
  `aria-labelledby` — the `<h3 class=modal-title>` has no id, so the dialog is
  announced nameless; (b) focus is never moved into the overlay; (c) no Tab focus
  trap; (d) **Esc does not close it** — the overlay has no `id`, so the global Esc
  handler's `dismissModalById(undefined)` (08:574) is a no-op, and the overlay
  installs no own key listener (it closes only on backdrop/«Закрыть» click).
- **Failure scenario:** The one surface built specifically so a non-technical user
  can resolve data conflicts is the LEAST accessible: a screen-reader user hears an
  unnamed dialog, keyboard focus stays behind it on the page, Tab escapes into the
  background, and Esc won't dismiss it. Contrast: all 13 static modals do this correctly.
- **Refutation attempted (§2):** "Esc closes it via the generic overlay list." → The
  Esc handler filters `.modal-overlay` and calls `dismissModalById(openModals[…].id)`;
  the quarantine overlay's `id` is `''` → `dismissModalById(undefined)` →
  `closeModalWithAnim(undefined)` → `getElementById(undefined)` null → returns.
  Runtime: `escClosed:false`. "Focus is trapped by aria-modal." → `aria-modal` is a
  hint to AT, it does not trap DOM focus. Refutation fails.
- **Root cause:** built by hand outside the shared modal helper (echoes the
  function-first chrome theme, B2-01/B4-02).
- **Fix strategy:** give the overlay an `id`, `aria-labelledby` (id the title), and
  route open/close through `openModalWithFocus`/`closeModalWithAnim` (D2). One
  change gives it label + focus-in + trap + return + Esc.
- **Change together:** `dusk/11-sync-ui.ts` (`openQuarantine`/`closeQuarantine`).
- **Tests:** open quarantine → focus inside, Tab contained, Esc closes, focus returns
  to the sync FAB; dialog has an accessible name.
- **Cross-app:** the conflict overlay serves both apps' synced records. Pairs with
  V2-B4-07 (copy) + V2-B2-01 (skin).

### V2-B5-05 — No `<main>` landmark and no heading structure below the single h1 «DUSK»
- **Evidence:** B (`s3_a11y.mjs`: `main:0`, `h2:0`, visible headings = only `H1:DUSK`).
- **Severity:** UI 1 · DL 0 · RR 1 · IC 1 · CF 3
- **Where:** the app has one `<h1 class=brand-name>DUSK</h1>` (index.html:51), a
  single `<nav class=page-nav>` (index.html:63), and a `<div class=container>` body
  with NO `<main>`/`role=main`. No `<h2>` anywhere; the task list, group sections,
  archive, and Grimuar surfaces have no headings. Modal titles are `<h3>` (skipping
  h2). Only 1 landmark region (nav).
- **Failure scenario:** A screen-reader user navigating by landmark finds only a nav;
  by heading finds only «DUSK» — there is no way to jump to "the task list" or "the
  archive". Section structure is invisible to AT (WCAG 1.3.1 / 2.4.1).
- **Refutation attempted (§2):** "It's a single-view app, headings are optional." →
  Landmarks/headings are the primary AT navigation aid; a 3-tab app with lists,
  groups and modals has clear regions to mark. "Group headers ARE headings." → They
  are `<div class=group-header>`, not `<h*>`, and carry no heading role. Refutation fails.
- **Root cause:** semantic HTML was not applied to the app shell (div-based layout).
- **Fix strategy:** wrap the page body in `<main>`; promote page/section titles to
  real headings (h2 for the current page region, group headers as h3, or
  `role=heading aria-level`). Cheap; do with D1. Preserve visual styling.
- **Change together:** `index.html` (shell) + `dusk/03-render.ts`/`02-grimoire.ts`
  (group/section heading markup) + `style.css` (heading resets).
- **Tests:** landmark + heading-outline audit (axe/manual) → main present, sane h1→h2→h3.
- **Cross-app:** whole shell (both apps).

### V2-B5-06 — Hotkey documentation is incomplete and Grimuar's map is entirely unhinted (truthfulness/discoverability)
- **Evidence:** A (hint HTML index.html:1501 vs the handler 08:525-759) + B (every
  advertised key fired and passed; undocumented keys confirmed wired).
- **Severity:** UI 1 · DL 0 · RR 0 · IC 1 · CF 3
- **Where:** the shortcuts hint (`#shortcuts-hint`, toggled by `#btn-shortcuts-toggle`,
  `display:none` by default, tasks-toolbar only) lists N // JK X E D Del P L M R T
  Ctrl+Z Ctrl+Y S — **all of which work** (verified). But the handler ALSO binds,
  with no hint entry: `Ctrl/Cmd+F` (search on notes/archive), `F3`/`Shift+F3`
  (find next/prev in a note), `Esc` (close/clear/close-find), `Backspace` (archive
  alias for Del), `Enter`/`Shift+Enter` (find-nav in notes search). The **Grimuar
  page's own map** (N/J/K/E/T/Del/Ctrl+F/F3) has NO in-UI documentation at all.
- **Failure scenario:** A user learns the shortcuts from the hint bar and never
  discovers find-in-note (F3) or the notes-page keys; the bar's list is both
  incomplete (tasks) and absent (notes). Truthfulness gap (the doc under-states the
  real capability).
- **Refutation attempted (§2):** "The advertised keys might not all work." → Fired
  each at runtime; all pass (see report §3.2). "Grimuar has no hotkeys." → It has 8
  (grepped + fired J/K/N). Refutation fails.
- **Root cause:** the hint is a hand-maintained HTML string that drifted from the
  handler; no notes-page hint surface.
- **Fix strategy:** generate the hint from the key table (stays truthful forever);
  show a page-appropriate list (tasks keys on tasks, Grimuar keys on notes) — a
  «?»-overlay is the cheapest home for both. D7.
- **Change together:** `index.html` (hint) + `dusk/08` (generate from table) +
  `dusk/02-grimoire.ts` (notes hint).
- **Tests:** hint list == the keys the handler actually binds for the current page.
- **Cross-app:** the notes-page gap is a Grimuar↔tasks parity issue (B13).

### V2-B5-07 — Toast still animates (translate+scale) under `prefers-reduced-motion: reduce`
- **Evidence:** B (`s3_a11y.mjs` under `reducedMotion:'reduce'`: toast computed
  `animation: toastAppear 0.3s`) + A (keyframes style.css:1631).
- **Severity:** UI 1 · DL 0 · RR 1 · IC 0 · CF 3
- **Where:** every other swept surface (row enter, app-glow, overdue pulse, sync eye,
  snooze popover, group collapse) computes `none/0s` under `reduce`, but the toast
  keeps `toastAppear 0.30s` — a `translateX(-50%) translateY(12px) scale(0.88)`
  transform (style.css:1631), i.e. real motion, not an opacity fade. No
  `@media (prefers-reduced-motion: reduce)` override neutralizes it.
- **Failure scenario:** A motion-sensitive user still sees the toast slide up + scale
  on every action. Minor (brief, single element), but it violates the "replace motion,
  don't merely keep it" rule the app otherwise honors in 50 RM blocks.
- **Refutation attempted (§2):** "It's an opacity fade, allowed." → Keyframes include
  translateY+scale, not just opacity. "An RM block covers it." → Runtime shows it
  still animating under reduce. Refutation fails.
- **Root cause:** the toast animation predates / was missed by the RM sweep.
- **Fix strategy:** add a `prefers-reduced-motion: reduce` rule zeroing the toast
  transform (fade opacity only, or instant). D8; overlaps B7 (motion) — recorded
  here as the §3.5 result.
- **Change together:** `style.css` (toast RM override).
- **Tests:** re-run the RM sweep → toast computes `none/0s` or opacity-only.
- **Cross-app:** shared toast (both apps).

### V2-B5-08 — Two "repeat" concepts share the same vocabulary with no explainer (mental model) **[RATIFIED-FABLE 2026-07-12]**
- **Evidence:** A (task-repeat: Repeat modal + `cycleChecked`/`nextReset`; deadline
  auto-repeat: `#dl-repeat-toggle`, `_dlAutoRepeat`, 06:151/311).
- **Severity:** UI 2 · DL 0 · RR 1 · IC 1 · CF 2
- **Where:** `task.repeat` (daily/weekly/… via the **Repeat modal**, R / ouroboros)
  drives the recurring-task mechanic (`cycleChecked`, `nextReset`, 2s auto-return).
  Separately, the **deadline modal** has a `dl-repeat-toggle` (default OFF; X-8) that
  makes the *deadline* recur (time→daily / weektime→weekly / monthday→monthly)
  WITHOUT making the task a recurring task. Both surfaces speak "повтор".
- **Failure scenario:** A user who set a repeating task via R, then opens the deadline
  modal and sees another "повтор" toggle (or vice-versa), cannot tell what differs —
  does the deadline toggle also cycle the task? does R also recur the deadline? The
  June audit deliberately made deadline auto-repeat default OFF, but the DIFFERENCE
  is never surfaced.
- **Refutation attempted (§2):** "The toggle is clearly labelled per mode." → The
  relabel names the cadence (daily/weekly) but not the DISTINCTION from task-repeat;
  the two systems are never contrasted in copy. Held CF 2 (taste/mental-model → Fable
  ratifies). "They never co-occur." → A task can have BOTH a repeat AND a rhythmic
  deadline. Refutation reduces confidence, not the gap.
- **Root cause:** two recurrence systems grew independently and were never reconciled
  in UI vocabulary.
- **Fix strategy:** one-line explainer in the deadline modal near the toggle
  («Повторять сам дедлайн — задача не станет повторяющейся») and/or distinct icons/
  labels for the two concepts. D7. **Fable to ratify the framing.**
- **Change together:** `index.html` (deadline modal copy) + `dusk/06-deadlines.ts`
  (toggle relabel).
- **Tests:** n/a (copy); visual review.
- **Cross-app:** task-only (Grimuar has neither).
- **Fable ratification (2026-07-12):** CONFIRMED — the gap is real: co-occurrence
  is legitimate (one task can carry both systems) and the copy never contrasts
  them. Framing ratified with one sharpening: the one-line explainer is the FLOOR;
  the real fix is lexical — reserve «повтор» (+ ouroboros) exclusively for task
  recurrence and give the deadline toggle a rhythm-word for the deadline itself
  («Повторять срок» / «Ритм срока» — final wording = user pick at D7), with the
  explainer «Повторяется только срок — задача не становится повторяющейся» under
  the toggle. CF for the gap's existence raised 2→3; naming stays open by design.

### V2-B5-09 — Cross-app search-empty inconsistency: tasks show a message, Grimuar shows only «Найдено · 0»
- **Evidence:** B (`s3_probe4.mjs`: tasks search «zznotexist» → «Ничего не найдено»
  empty state visible; notes search «zznotexist» → 0 cards, no empty element, only a
  «Найдено · 0» list-head).
- **Severity:** UI 1 · DL 0 · RR 1 · IC 1 · CF 3
- **Where:** the tasks list renders a «✦ Ничего не найдено» empty state on a zero-result
  search; the Grimuar list renders only a `«Найдено · 0»` counter in the list head with
  a blank body — no gothic empty-state / voice line. Also: Esc clears neither search
  input (`escCleared:false` on tasks).
- **Failure scenario:** A Grimuar search with no matches shows a bare, wordless blank
  area under a tiny counter — no reassurance that the search ran and found nothing;
  inconsistent with the tasks side.
- **Refutation attempted (§2):** "The counter is enough feedback." → Tasks side proves
  the intended bar is a worded empty state; the counter alone reads as a glitch. "It's
  a selector miss." → Confirmed no empty element exists in the notes list (only the
  head). Refutation fails.
- **Root cause:** the Grimuar list-render has no zero-result branch (only a count);
  the tasks list does. Search-input Esc-clear was never wired.
- **Fix strategy:** add a Grimuar search-empty state in the app's voice (feeds
  V2-B2-04); wire Esc to clear a focused search box. D7.
- **Change together:** `dusk/02-grimoire.ts` (notes list empty branch) + `dusk/08`
  (Esc-clear).
- **Cross-app:** the one place Tasks is AHEAD of Grimuar on voice (B13 note).

### V2-B5-10 — The only in-UI teacher of quick-add syntax (`!`/`*`/`%`) is `aria-hidden` and keyboard-occluded
- **Evidence:** A (index.html:117 `#qa-syntax-hint aria-hidden="true"`; shown on input
  focus via `.show`) + B (contrast probe reached it only by forcing `.show`).
- **Severity:** UI 1 · DL 0 · RR 0 · IC 1 · CF 3
- **Where:** `#qa-syntax-hint` («*тег %дата !приоритет») appears under the task input
  on focus — the sole affordance that teaches the quick-add trigger symbols. It is
  `aria-hidden="true"` (screen-reader users never learn the syntax) and sits BELOW the
  input, so on mobile the virtual keyboard occludes it (B1 owns the mobile geometry).
- **Failure scenario:** A screen-reader user has no way to discover `!`/`*`/`%`; a
  mobile user's keyboard hides the hint. Compounds V2-B1-11 (`!высокий` doesn't even
  parse) — the feature is both hard to find AND partly broken for its primary language.
- **Refutation attempted (§2):** "The hint `?`/shortcuts bar documents it." → It does
  NOT — the shortcuts hint lists hotkeys, not quick-add syntax; this hint is the only
  place. "aria-hidden is fine, it's decorative." → It's the sole instructional text
  for a power feature — not decorative. Refutation fails.
- **Root cause:** the hint was treated as decorative chrome (aria-hidden) and placed
  below the input without a desktop/AT-safe alternative.
- **Fix strategy:** remove `aria-hidden` (or expose via `aria-describedby` on the
  input so AT announces the syntax); ensure a persistent/accessible path to the syntax
  (the «?» overlay from V2-B5-06 can host it). D7. Mobile placement = B1.
- **Change together:** `index.html` (attr) + the hint/«?» surface.
- **Cross-app:** task-only (Grimuar has no quick-add).

### V2-B5-11 — Cross-app terminology divergence unmapped (Архив/Склеп, Добавить/Начертать, заметка overloaded) **[RATIFIED-FABLE 2026-07-12]**
- **Evidence:** A (toast/label census — see report terminology table).
- **Severity:** UI 1 · DL 0 · RR 1 · IC 1 · CF 2
- **Where:** the same soft-delete store is «Архив»/«В архив» on tasks but «Склеп»/«В
  склеп» on notes; "create" is «Добавить»/«создать» on tasks but «Начертать» on notes;
  «заметка» names BOTH a task's inline memo AND (loosely) is adjacent to «запись» for
  a Grimuar note; permanent delete is «Удалить навсегда» (tasks) vs «Уничтожить»/
  «Удалить навсегда» (notes).
- **Failure scenario:** A user moving between tabs meets two names for the same action
  (archive), and «заметка» is overloaded. Low confusion cost (different tabs), but it
  dilutes the "one product" mental model (§1.2).
- **Refutation attempted (§2):** "Архив vs Склеп is deliberate gothic flavour." →
  Plausible and maybe kept — but it IS a divergence to decide consciously, and the
  «заметка» overload is a genuine ambiguity. Held CF 2 → Fable ratifies whether the
  flavour split stays.
- **Root cause:** the two apps were voiced separately; no shared glossary.
- **Fix strategy:** a term glossary (one term per concept, or a documented, deliberate
  per-app flavour split); at minimum disambiguate «заметка» (task memo) vs «запись»
  (Grimuar note). D7. **Fable ratifies the glossary.**
- **Change together:** copy across `dusk/*` (labels/toasts) + `index.html`.
- **Cross-app:** the core of it (B13).
- **Fable ratification (2026-07-12):** CONFIRMED as a finding, resolved in three
  parts. (1) The «заметка» overload is a genuine defect — disambiguate
  unconditionally: «заметка» = task memo, «запись» = Grimuar note. (2) Архив/Склеп
  and Добавить/Начертать are LEGITIMATE deliberate per-app flavour, NOT to be
  auto-unified — Grimuar's register is the richer voice per B2 and unification
  would flatten it; but the split must become a documented glossary decision the
  user signs off at fix stage (D7) — his aesthetic call, not the auditor's.
  (3) Permanent-delete verbs must be consistent WITHIN each app (the notes side
  mixes «Уничтожить»/«Удалить навсегда» — pick one; «Уничтожить» fits the
  register); cross-app flavour divergence allowed. Severity UI 1 upheld.

### V2-B5-12 — Shared dim-violet text token (~#9068C0) sits at the AA floor on-card and fails over the bright bg-image
- **Evidence:** B (ground-truth contrast: 4.73–4.81:1 for meta labels, placeholder,
  empty caption, quarantine text, quick-add hint — a cluster just above 4.5).
- **Severity:** UI 2 · DL 0 · RR 1 · IC 1 · CF 3
- **Where:** one muted-violet text value (~`#9068C0`) is used for secondary text
  across surfaces; on the near-black card it measures 4.7–4.8:1 (marginal AA pass,
  zero headroom). Over the bright `bg-gothic.jpg` regions (moon/branches — the B1
  lead about non-card text) the same token drops below AA. It also reads "dim" per
  the B2 real-note note.
- **Failure scenario:** Any secondary text that ends up over a bright background
  region (or on a slightly lighter surface) fails AA; and the whole secondary tier
  reads faint. No single-surface catastrophe, but a systemic near-floor token.
- **Refutation attempted (§2):** "It passes on the card, so it's fine." → It passes
  by a hair with no margin; the app deliberately composites text over a photographic
  background where the same token fails. "It's intentionally quiet." → Quiet ≠ at the
  legibility floor; lifting one lightness step keeps the quiet hierarchy. Refutation
  fails for the over-image / no-headroom case.
- **Root cause:** the secondary-text token was tuned to *just* pass on the darkest
  surface; no headroom budget for the lighter/bright-image cases.
- **Fix strategy:** lift the token one lightness step in the OKLCH re-derivation
  (DESIGN-PLAN §2.2) so it clears ~5.5–6:1 on-card (headroom for bright regions);
  applies to meta labels, placeholders, empty captions, quarantine + hint text. D1.
- **Change together:** `style.css` (the secondary-text token/vars).
- **Tests:** re-run `s3_contrast.mjs`; assert secondary text ≥5.5:1 on-card; spot the
  bright-image regions.
- **Cross-app:** shared token (both apps).
