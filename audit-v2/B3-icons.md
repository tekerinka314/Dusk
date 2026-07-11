# B3 — Glyphs & iconography (S2, Fable 5, 2026-07-11)

Scope: the complete icon estate of both apps. Evidence: rendered icon sheet
(`shots/s2/D-iconsheet.png` — every glyph at 16/20/24/32px on the app background),
in-situ shots (toolbar, action rows, modals, menus), and a source census with an
element-count complexity metric. User calibration (ground truth, 2026-07-11):
**most icons — especially outside Grimuar — fail the three-axis bar**: explicit
gothic aesthetic × high detail/complexity × intuitiveness, ALL required at maximum
simultaneously. This report classifies the estate against that bar and lays out
the redesign program; per the ROI doctrine it does not re-litigate each glyph the
user already condemned wholesale.

## The estate (census)

| Source | Count | Notes |
|---|---|---|
| `IC` (dusk/01-core.ts:221) | 47 builders | tasks-side chrome & actions |
| `GIC` (dusk/02-grimoire.ts:177) | 18 builders | Grimuar chrome |
| `FIC` (dusk/02-grimoire.ts:3146) | 22 builders | editor toolbar marks |
| index.html static inline | 99 instances, **75 unique** | toolbar, modals, nav |
| Shared `<symbol>` defs | **2** (icon-archive, coffin-emblem) | everything else duplicated |

Complexity metric (shape-element count per SVG — proxy for the "detail" axis):

- IC: 22 of 47 icons have ≤4 elements (7 have ≤2). Richest: drag:9, sundial:8,
  crossedSwords:8, skull:7, spires:7, pinSpike:7.
- GIC: 11 of 18 ≤4 elements; richest: chronicle:15 (летопись — the best glyph in
  the app), tocClose:9, dismiss:8.
- FIC: 18 of 22 ≤4 elements — mostly fine (see triage below).
- index.html statics: 59 of 99 ≤4 elements; 14 blocks are literal copy-paste
  repeats (one repeated ×5).

## Triage — the bar is not uniform, and that's the correct program

The user's bar (ornate × gothic × intuitive) applies with full force to
**motif icons**: glyphs that carry meaning on cards, group headers, modals,
menus, empty states, nav tabs. It applies differently to **micro-marks**:
editor-toolbar formatting marks (B/I/U letters, list marks, align marks) and
stepper arrows, where at 14-18px a 10-element engraving turns to mush — there
the axes resolve as *consistent weight + gothic accents + instant recognition*.

- **Tier A — already at or near the bar (keep, protect as exemplars):**
  GIC.chronicle (летопись scroll), IC.skull, IC.sundial, IC.crossedSwords,
  IC.drag, IC.spires, coffin-emblem symbol, the candle pair in the deadline
  modal, the reptiloid sync eye (locked motif), tombstone checkboxes.
- **Tier B — right motif, execution below the bar (majority of IC + statics):**
  plain crosses, plain crescents, single-stroke coffins/arches/bells/books,
  toolbar rounded-rect devices (ВИД/ФИЛЬТР/ВЫБОР/ДАННЫЕ clusters — they all read
  as the same rounded rectangle at 18px). These need the ornate redesign pass.
- **Tier C — micro-marks (FIC + steppers + sort arrows):** keep simple, but
  normalize stroke weight and add discreet gothic accents (e.g. FIC.quote already
  uses long-s «ſſ»; align marks can keep plain). Do NOT engrave these.
- **Tier D — wrong motif regardless of execution (semantic misfires, see
  V2-B3-03):** tombstones used for schedule concepts, etc.

## Confirmed findings

- **V2-B3-01 — Majority of motif icons fail the detail/gothic axes (systemic).**
  User ground truth + metric (≥50% of IC/statics at ≤4 elements) + sheet review:
  most glyphs are single-weight minimal line-art that would fit any generic icon
  set once the theme is stripped. The app demonstrably can do better (Tier A).
  Program: per-family ornate redesign against Tier-A exemplars, motif icons
  first (cards → toolbar clusters → modals → nav), micro-marks only normalized.
- **V2-B3-02 — No icon system: 2 symbols vs ~160 duplicated definitions +
  near-duplicate motif drift.** ≥6 cross variants, ≥5 crescents, ≥5 X-marks,
  2 magnifiers, multiple arch/tombstone/book variants visible on the sheet;
  14 literal copy-paste repeats in index.html. Violates the CLAUDE.md reuse rule
  and makes any redesign O(instances) instead of O(1). Fix: consolidate into a
  `<symbol>`/builder registry (one glyph per role), THEN redesign — order matters.
- **V2-B3-03 — Semantic misfires (intuitiveness axis).** Confirmed instances:
  repeat modal uses tombstone glyphs for «По будням» and «Ежемесячно» (death
  motif on a schedule concept — and «Нет» uses a cross while cross also means
  "add/group" elsewhere); snooze «+1 неделя» = tombstone; templates-modal row
  action icon unreadable (role unclear even at 2560); ВИД cluster icons
  indistinguishable at toolbar size. Each misfire violates "intuitive" even when
  gothic; fix inside the V2-B3-01 program with a semantic map (role → motif)
  ratified by the user before drawing.
- **V2-B3-04 — Stroke-weight/viewBox normalization absent.** Sheet shows mixed
  weights (hairline arrows vs heavy tombstones vs filled coffins) and mixed
  optical sizes at the same rendered size. Part of the registry pass: one weight
  scale (e.g. 1.5/2 units at 24-viewBox) + optical-size variants where a glyph
  must survive 16px.
- **V2-B3-05 (D, queued) — 5 sheet cells rendered empty (inline#98-101, #116).**
  Likely context-dependent sizing/currentColor extraction artifact of the sheet
  harness — but if any glyph genuinely renders empty in-app, that's a bug. Verify
  during B4 sweep re-run (map DOM order → source; 1 probe).

## In-situ notes (feed the redesign program)

- Action-row glyphs on cards are 13-16px: the redesign must include a legibility
  gate at 16px (test sheet per candidate before adoption).
- Colored/filled variants (twin coffins, hexagon gems, filled tombstone states)
  read as a separate family on the sheet — after the registry pass, states should
  be systematic (outline=idle / filled=active / tinted=user-color).
- Locked motifs (respected, do not reinvent): sword chevron for dropdowns,
  ouroboros = repeat/update, coffin = archive/burial, crescent = empty/none,
  reptiloid eye = sync. The registry keys off these.
- Grimuar (GIC/FIC) is closest to passing — consistent with the user's «особенно
  вне гримуара».

## Cross-app (feeds B13)

Same roles use different glyphs across apps (search magnifiers differ; archive
motifs differ: АРХИВ box-glyph vs СКЛЕП coffin — the coffin is the right one
per the locked registry). The registry pass unifies cross-app roles.

## Implementation notes (context-free session)

1. Order: **registry first, redesign second.** (a) Extract every icon role;
   (b) collapse duplicates onto one definition per role (symbol defs or builder
   fns — builders already dominate, keep builders, add missing ones for
   index.html statics); (c) then redesign Tier B per family with user-ratified
   HTML preview sheets (his standing preference: preview → choose → implement),
   16px gate mandatory.
2. Files: dusk/01-core.ts (IC), dusk/02-grimoire.ts (GIC/FIC), index.html
   (99 statics → refs), style.css (sizing classes). The sheet harness
   (`D:\tmp\pw\b1\s2_shots.mjs icons` section) doubles as the regression
   preview — rerun after every family.
3. Severity summary: UI 2-3 (identity is a hard requirement) · DL 0 · RR 1-2
   (pure presentation; only risk is markup churn in render strings) · IC 3
   (many glyphs, but registry-first makes it tractable) · CF 3 (user mandate).
