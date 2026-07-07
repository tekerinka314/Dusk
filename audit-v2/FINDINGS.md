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
