# S2 raw observation notes (B2 gothic / B3 icons / B4 UI) — 2026-07-11

Working notes from the desktop screenshot inventory (shots in `audit-v2/shots/s2/`,
richSeed, 2560×1440 DPR1 primary + 1920/1366 secondary). Findings get formalized
in B2/B3/B4 reports; this file is the persist-as-you-go insurance + probe ledger.

## Calibration (user, 2026-07-11)
- Primary render 2560×1440 @100%; other resolutions secondary.
- Ground truth: most icons (esp. outside Grimuar) fail the 3-axis bar
  (gothic × detail/complexity × intuitiveness — ALL must be maxed simultaneously).
- Priority strip on task cards = recognizable AI-pattern (user's own call).
- Recommendation scale = вариант (б): big redesign proposals allowed, user decides each.
- Real Grimuar note: user will drop into project folder ON REQUEST.

## Probe ledger (what was captured / what failed and why)
- ~45 desktop shots OK. Probe artifacts (re-probe in B4 sweep, do NOT treat as findings):
  - D-select-mode: toggleSelectMode()/btn click produced NO visible select UI
    (bar=false, checks=0, body.cls=''). Needs UI-path probe (#btn-main-select vs
    #btn-select-mode; render loop?). Could be real (select mode has no visible
    entry state) — verify before writing.
  - D-pop-snooze: synthetic openSnoozeMenu closes instantly (outside-pointerdown
    guard); markup known from 03-render.ts:1056-1075 (+1ч/до завтра/+1 неделя,
    custom N ч/дн/нед). Capture visually via real hover-click.
  - D-grim-toc: TOC button clicked on a note with no headings → no visible change.
    Re-probe on n1 (has H2).
  - D-grim-io-pop / tpl-pop / grim-select: clicked while in СКЛЕП segment → hidden.
  - Notifications btn = permission request (headless denied → toast «Доступ к
    уведомлениям отклонён»), no popover. Expected.
  - deleteTask(12) via console did nothing visible — delete likely two-step/confirm;
    undo-toast still uncaptured on desktop.
  - Header subtitle sometimes shows only "TASK" — intro letter animation caught
    mid-flight, not a bug.
  - fullPage shots: black band below viewport = background-attachment artifact, not real.

## B2 — gothic language observations
STRONG (keep, these are the identity anchors):
- Deadline modal: candle-flanked «Сколько горит» block, sword/hourglass ornaments.
- ПАРАМЕТРЫ toggle with ornamental swords; group pill with crescents «☾ без группы ☽».
- Grimuar note editor: glowing serif title + quill, ornamental separator (✦),
  diamond bullets, «Летопись»/«В склеп»/«Начертать» voice, СКЛЕП coffin empty-state.
- Tombstone checkboxes on tasks; coffin/tombstone archive rows.
- RU microcopy voice generally consistent (начертать, склеп, летопись, опустошить).
- bg-gothic integration: card glass over cathedral/moon — legible, moody.

WEAK / inconsistent:
- «Chrome» layer (toolbar popovers: sort menu, export menu, more-menu, float menus,
  quarantine modal, sync panel) = plain rounded rects, zero gothic framing; clashes
  with the ornamented quick-add/deadline layer. Two design languages in one app.
- Priority strip = colored left border bar (user-flagged AI-pattern). Options
  discussed later (ember glow like subtasks use `--sprio`, wax seal, etc).
- Color swatches/dots: 10 bright saturated circles (material-ish) break the
  violet/near-black discipline harder than needed (lime/cyan/orange). Semantic
  feature (locked), but presentation could be desaturated/gothic (ink pots, wax).
- Priority dots in typeahead/params = plain circles.
- Tasks empty state: tiny 4-point sparkle + small grey text — weak personality vs
  Grimuar's «Гримуар пуст» (book glyph + italic subline + НАЧЕРТАТЬ ПЕРВУЮ CTA).
- Tasks АРХИВ page rows nearly unreadable (ultra-dim strikethrough) — "buried"
  aesthetic overshoots readability; vs Grimuar СКЛЕП which stays readable.
- detect.mjs (impeccable): flags single-font (JetBrains Mono only in index.html) —
  actually app uses serif for content (CSS), mono for chrome; verify font stack in
  style.css for the B2 typography section. Em-dash flag = RU false positive.

## B3 — icon observations (sheet: D-iconsheet.png, 118 unique inline SVGs + 2 symbols)
- Only 2 shared <symbol> defs (icon-archive, coffin-emblem); everything else is
  repeated inline SVG — near-duplicate glyph drift + markup duplication (also B9).
- Duplicate-motif families visible on the sheet: ≥6 cross variants, ≥5 crescents,
  ≥5 X-marks, many tombstone/arch variants, 2 search glasses, several books.
  Violates CLAUDE.md reuse rule (same role should reuse the exact glyph).
- Detail axis: majority are single-stroke minimal (plain cross/crescent/X/arrows) —
  fails user's "high detail/complexity" bar. The few ornate ones (filled coffin,
  skull, scroll, coffin-emblem) show the intended level.
- Weight inconsistency across families (thin arrows vs heavy tombstones vs filled).
- 16px legibility: X-family/arrow-family variants indistinguishable; ornate ones
  (scroll, skull) turn to mush — need per-size simplification or redesign.
- Colored glyphs mixed into mono set (pink/green hexagons, filled purple coffins) —
  state variants; fine, but sheet shows they read as a different family.
- Sheet cells inline#98-101, #116 rendered EMPTY — icons that depend on context
  (CSS class sizing / currentColor?) — check what they are; possibly broken extraction,
  possibly genuinely context-bound.
- Semantic mismatches spotted in-app: repeat modal uses tombstones for «по будням»/
  «ежемесячно» (motif = death, role = schedule); templates-modal row icon unclear;
  ouroboros = weekly OK (locked motif). Toolbar ВИД/ФИЛЬТР/ВЫБОР/ДАННЫЕ icons are
  small rounded-rect devices that all look alike at 18px (differentiation fails).
- TODO for B3 report: map inline#N → IC.* names via 03-render (or grep IC = {) and
  audit per-icon (name, role, sites, 3-axis verdict). Locked motifs registry:
  sword chevron, ouroboros=repeat, coffin, crescent, reptiloid eye=sync.

## B4 — UI observations
- **Desktop layout**: app column is capped (~740-770px) regardless of viewport;
  at 2560×1440 ≈70-78% of screen is background. At 1366 it's balanced (54%).
  No large-screen adaptation anywhere (no wider column, no 2-pane for tasks).
  Candidate flagship B4 finding (вариант (б): propose desktop layout tiers).
- Long titles wrap to 3-4 lines even at 2560 (card content ~640px); subtask 2-col
  grid cells ~300px. Reinforces above.
- **Popovers overflow the app frame**: sort menu overflows card LEFT edge (~70px
  over background); more-menu overflows RIGHT edge; export menu slightly. The app
  frame is a strong visual boundary — menus breaking it look unanchored (and it's
  the same body-portal family as B1-28 scroll-detach). B4 sweep must check ALL:
  task-more, snooze, sub-mode, demote, grp-dd, sort, export, grim io/tpl/cfilter.
- more-menu did not close on Escape in one probe (openAfterEscape check failed to
  find menu at all — selector issue; RE-PROBE properly). Related B1-17.
- Shortcuts hint bar (btn-shortcuts-toggle) = full-width strip at viewport bottom,
  wider than the app column, tiny text; visually detached. Also great content (15
  hotkeys) — B5 will cross-check vs actual hotkey map.
- «Только на сегодня и просроченные» status pill floats at viewport bottom-center,
  ~350px below the last card at 2560 — disconnected from both toolbar and list.
- Group collapsed state signal = tiny dash at header right; header otherwise
  identical to expanded (weak state differentiation).
- Right-edge floating stack (scroll-top, grim-new, close) mid-right edge — orphaned
  look at 2560 (belongs to app, floats in background void).
- Sync panel: menu items all render enabled-looking even when logged out
  («Синхронизировать сейчас» clickable-looking). Check disabled styling exists.
- Quarantine overlay: functional, plain; row labels leak internal field names
  («поле «text»», «поле «name»») → B5 copy; loser value for subtask row displayed
  as «пусто» though seed had text — check display logic (→ B6 if data-side).
- ::selection appears default-blue (rename modal) — theme it violet (micro).
- Focus-visible ring present (purple) on subtask checkboxes — good baseline.
- Empty iconsheet cells aside: no broken layouts observed at 1366/1920/2560 in
  captured states.
- Colour filter modal: 3 used-colors only (good), but no title-adjacent clear/all
  affordance, no visible close (Esc/overlay only) — cross-check with B1-24.

## B13 seeds (cross-app, collect for later)
- Grimuar detail/editor is a full tier above tasks page in gothic voice
  (typography, bullets, empty states, СКЛЕП vs АРХИВ readability).
- Color semantics presentation differs: tasks = left strip; grim = full card frame
  + tinted bg. Same concept, two languages.
- Tasks empty state vs Grimuar empty state (weak vs strong).
- АРХИВ (tasks) unreadable-dim vs СКЛЕП (notes) readable.

## Next steps in S2
1. Code sweeps: font stack + palette tokens + spacing/type scale + z-index census
   (style.css), IC.* name map (03-render.ts), popover family census (B1-28 sweep).
2. Mobile-lens pass: ~6 key B1 shots + 6 device photos re-read through B2/B3 lens.
3. Request user's real Grimuar note → typography check.
4. Write B2-gothic.md, B3-icons.md, B4-ui.md + FINDINGS.md entries; commit per batch.
