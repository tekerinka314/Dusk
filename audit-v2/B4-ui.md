# B4 — UI (S2, Fable 5, 2026-07-11)

Scope: every visual component, both apps, desktop-first (2560×1440 = user's
primary; 1920/1366 secondary; mobile viewport included via B1 evidence — B1's
per-surface mobile findings are NOT re-reported). Evidence: `shots/s2/*` (~50),
live runtime probes (`D:\tmp\pw\b1\s2_fix1/2.mjs`), style.css/dusk source reads.
This batch also executed the B1-28 ownership item: the body-portal popover sweep.

## Flagship findings

### V2-B4-01 — No large-screen layout: the app is a ≤770px column at every viewport
At 2560×1440 (the user's own monitor) the app column stays ~740-770px → ~70% of
the screen is background; long titles wrap to 3-4 lines; the subtask 2-col grid
squeezes to ~300px cells — while at 1366×768 the same layout is balanced (54%
content). There is no ≥1440px tier at all. Direction (вариант (б), user decides):
tiered layout — (a) modestly wider column at ≥1600px (typography-safe ~900px);
(b) optional true desktop mode: tasks list + persistent right pane (note/subtask
detail or Grimuar side-by-side — the master-detail pattern Grimuar ALREADY has);
(c) density option for the toolbar. Gothic identity survives all three (the
frame/bg composition is already responsive).

### V2-B4-02 — Four ad-hoc popover engines; the whole float-menu family detaches
on scroll (B1-28 is one instance of a systemic class) — LIVE-CONFIRMED
Census of body-portal positioning mechanisms:

| Engine | Used by | Flip | Clamp | maxH | Scroll tracking | Esc |
|---|---|---|---|---|---|---|
| `_openFloatMenu` (03:1018, `.snooze-menu` fixed z-320) | snooze, task-more, sub-mode (task+global), demote, export, **sync panel** | ✅ | ✅ h | ✅ | ❌ | ❌ |
| sort portal (`toggleSortPicker` 03: `task-sort-portal`) | sort menu, (dl-month family via gothic pickers—verify) | ✅ | partial (right-anchor) | ❌ | ❌ | ❌ (outside-click only) |
| `_qaRenderMenu` (08:156, `.qa-menu` fixed) | quick-add typeahead (`!` `%` `*`) | ❌ | ❌ | ❌ | ❌ (=V2-B1-27/28) | ✅ |
| gothic picker lists (registerGothicPicker 03:1733) | grp-picker, dl-month/weekday lists | (B1-27 notes: month flips, weekday doesn't) | — | — | ❌ | ✅ |

Runtime proof (s2_fix2): snooze menu open → `mouse.wheel(0,300)` → menu
`rect.top` unchanged (725→725), still open, visibly detached from its card
(`D-pop-snooze-detached.png`). **Escape does not close it** (`open after
Escape: true`). On touch the outside-`pointerdown` capture closes menus when a
scroll begins, so mobile is partially self-healing; desktop wheel scroll fires
no pointerdown → detach.

Root cause class: each popover computes `getBoundingClientRect()` once and
writes fixed viewport coords; no engine listens to scroll/resize; keyboard
handling inconsistent (2 of 4 engines have Esc; none have arrow-key menu nav
despite `role="menu(item)"` — ARIA pattern incomplete, feeds B5).

Fix strategy (ONE change, kills V2-B1-27, V2-B1-28, B1-17 sibling doubts, this):
a single anchored-popover utility — flip + clamp + maxHeight + reposition-or-
close on scroll/resize (scroll listener on window with capture, cheap) + Esc +
basic menu keyboard nav — adopted by all four engines; restyle once per V2-B2-01.
Files together: dusk/03-render.ts, dusk/08-quickadd-export-init.ts,
dusk/11-sync-ui.ts, style.css (.snooze-menu/.task-sort-portal/.qa-menu).
Tests: reuse s2_fix2 detach probe per popover; B1 landscape/kb-proxy shots for
qa-menu clamp; vitest untouched.

## Confirmed findings (smaller)

- **V2-B4-03 — Viewport-anchored strips orphaned from the app frame at large
  viewports.** (a) shortcuts hint bar: full-width strip at viewport bottom,
  wider than the column, tiny type; (b) filter status pill («Только на сегодня…»)
  floats bottom-center ~350px below the last card; (c) right-edge floating
  stack (scroll-top/grim/close) hovers mid-background. All anchor to the
  VIEWPORT while every other element anchors to the app frame. Fix: anchor these
  to the column edges (or bottom of the frame), scale type up.
- **V2-B4-04 — Collapsed group is visually almost identical to expanded.** Only
  a small dash appears at the header's right; the header row (name, count,
  actions) is otherwise unchanged, and the count chip doesn't change emphasis.
  Fix: stronger closed-state affordance (rotated sword chevron — the locked
  motif for dropdowns — + dimmed header or engraved divider).
- **V2-B4-05 — Disabled state missing in the float-menu family.** Sync panel
  sets `disabled` on «Синхронизировать сейчас»/«Войти…» (11-sync-ui.ts:425-426)
  but style.css has NO `.snooze-menu [disabled]` rule (only repeat-btn/sb-btn/
  select-bar have :disabled styles) → disabled menu items look active until
  clicked (they silently do nothing). Component-state-matrix gap; fix: shared
  disabled style in the popover skin (V2-B2-01).
- **V2-B4-06 — `::selection` themed only inside `.grim-body`** (style.css:7479)
  → default blue selection in task inputs/modals (visible in D-modal-rename).
  Fix: global violet ::selection.
- **V2-B4-07 — Quarantine rows leak internal field names** («поле «text»»,
  «поле «name»», loser of a subtask clash shown as «пусто» in one seeded case —
  display logic to verify in B6). Copy fix belongs to B5 (rus labels: «Заголовок
  задачи», «Название группы»); B6 owns the «пусто» loser-rendering check.

## Report-only notes (no registry entries)

- z-index ladder is ad-hoc (0,1,2,4,6,10,20,40,50,60,200,310,320,330,400,500,
  1200,1500,4000) but small and currently non-conflicting; fold a scale into the
  popover unification, don't fix standalone.
- Focus-visible: purple ring present on interactive elements (D-focus-tab8) —
  good baseline; full keyboard matrix = B5.
- Hover states: card action-row reveal + subtask reveal work; hover styling
  consistent. Active/pressed states not audited per-control here — B5 keyboard/
  interaction pass covers the remainder of the state matrix.
- Sort menu right-anchored to its trigger → juts LEFT past the app frame edge
  (looks unanchored); resolved by the clamp policy in V2-B4-02's utility.
- Empty iconsheet cells → V2-B3-05 (owner B4 re-sweep confirmed as TODO item on
  next probe run; not yet done — carried in the ledger below).
- Probe artifacts resolved this batch: main select mode enters via
  `#btn-main-select` (`toggleMainSelectMode`), NOT `toggleSelectMode` (that's
  the archive's) — select bar captured (`D-select-main*.png`), looks consistent;
  snooze/grim tpl/io pops captured; undo-toast still uncaptured on desktop
  (removeTask act name differs) — B5/B6 will exercise toasts functionally.

## Cross-app (feeds B13)

- Grimuar master-detail IS the desktop pattern the tasks page lacks (V2-B4-01
  direction (b) can literally mirror it).
- Color-label framing differs (strip vs frame+tint) — unify per V2-B2-02/03.
- Both apps share the popover engines → one fix serves both.

## Carried TODOs (ledger)

- V2-B3-05 empty-glyph verification (map sheet DOM order→source) — next probe run.
- Escape/keyboard-nav behavior of gothic pickers under the unified utility —
  verify during fix stage, not audit.
- B1-17 (three sibling menus opened simultaneously on mobile) — root cause is the
  same engine family; the unified utility must enforce single-open (it already
  half-does via `_floatMenuEl` for ONE family; cross-family opens unguarded —
  sort portal + float menu can coexist; include in fix acceptance tests).
