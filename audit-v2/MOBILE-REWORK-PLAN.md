# MOBILE-REWORK-PLAN — B1-P0 design (Fable 5, 2026-07-12)

Author: Fable 5 (architect pass, final Fable design artifact). Executor: Opus 4.8.
Status: **DESIGN APPROVED FOR EXECUTION** (user greenlit strategy 2026-07-12).
Inputs: `audit-v2/B1-mobile.md` (28 findings, 4 root-cause themes, good-surface list),
`audit-v2/FINDINGS.md` V2-B1-*, shots in `audit-v2/shots/`.

**Mission:** make the phone experience first-class WITHOUT touching desktop UX,
gothic identity, or data logic. This is a LAYOUT + ACTION-MODEL rework, zero
state-model changes.

---

## 0. Hard rules for the executor

1. **Desktop must not change.** Every rework rule lives inside
   `@media (hover: none) and (pointer: coarse)` (the existing block at
   `style.css:5622` grows into a real mobile layer) and/or `@media (max-width: …)`.
   JS branches use the SAME condition via `matchMedia('(hover: none) and (pointer: coarse)')`
   — cache it once (e.g. `const IS_COARSE = …` in 01-core), don't re-query per render.
   After each slice: diff a desktop screenshot (1280×900, seeded state) against
   pre-slice — pixel-identical expected (antialiasing noise aside).
2. **Gothic identity untouched.** No new icons — reuse `IC.*` glyphs and existing
   modal/float-menu styling. Motion via existing `--ease-*`/`--dur-*` tokens.
   Respect `prefers-reduced-motion` on anything new.
3. **No data-model or merge changes in this wave.** Render/CSS/handlers only.
4. **One slice = one commit+push** (version.json BUILD bump each), user verifies
   on his phone after each push. Tag `v2.3-pre-mobile-rework` BEFORE slice 1.
5. Harness: `D:\tmp\pw\b1\` (lib.mjs + seed.mjs) — re-run the relevant probe after
   each slice; shots at 412×915 + 360×800 minimum. Never the user's real data.

---

## 1. Slice 1 — task-card action model (fixes B1-01, B1-02, B1-03, most of B1-09)

**The headline change.** Current failure: `.task-head` is a non-wrapping row where
9–10 fixed ~30px `.btn-task-action` buttons + title share one line; on touch the
actions are permanently revealed (style.css:5622 block) → title gets 0–33px.

**Target layout on coarse pointer (all widths) — card becomes 3 stacked rows inside
`.task-content`:**

```
[coffin] │ TITLE — full width, wraps up to 3 lines, ellipsis after      │
[drag]   │ meta row (deadline pill · repeat · cycle · note/sub toggles) │
         │ actions row: pin · color · deadline · repeat · prio · note · ⋯ │
```

- `.task-head` → `display: block` (or `flex-direction: column; align-items: stretch`)
  on coarse. `.task-text` gets `width: 100%`, `-webkit-line-clamp: 3` optional —
  prefer natural wrap, NO nowrap.
- `.task-actions` becomes its own row BELOW `.task-meta`: `display: flex;
  flex-wrap: wrap; gap: 6px;` buttons **40×40px** (svg 18px). One row of ≤7 fits 360.
- **Inline set on coarse (7):** pin, color, deadline, repeat, prio, note-modal, more (⋯).
  **Move INTO the more-menu on coarse:** snooze (only exists with deadline),
  archive, delete, PLUS a new «Редактировать» item → `startInlineEdit` (B1-26
  discoverability; keep double-tap working too). The more-menu already exists —
  `openTaskMoreMenu` (04-tasks.ts:2244); extend its item list when `IS_COARSE`
  (tpl/dup/submode/demote items stay).
  Rationale: archive/delete are today the two RIGHTMOST buttons — exactly the ones
  that clip off-card (B1-02) and sit where accidental taps land; behind ⋯ they're
  safer AND the row shortens. Desktop keeps all 10 inline as now.
- **Subtask rows (B1-03) — same pattern, smaller:** `.sub-actions` wraps to its own
  line under the subtask text on coarse (grid row 2 / flex-wrap), buttons ≥36px.
  Subtask outline stays the inset box-shadow (see CLAUDE.md — do NOT convert to
  border). 2-col grid is already 1-col on mobile — verify it stayed that way.
- `data-act` names all unchanged — the delegation dispatcher needs zero changes.
- The `_liSig` card-reuse signature is built from `_mainHTML` (04-tasks.ts:214) —
  markup changes automatically flow into it. If markup becomes coarse-dependent,
  the branch must be STABLE per device (IS_COARSE never flips mid-session) —
  it is; no signature bug.

**Acceptance (mechanical, 412 & 360, seeded 14-task state):**
- Task «Купить продукты и приготовить ужин» renders ≥20 chars per line.
- Zero horizontal page scroll (`document.documentElement.scrollWidth <= innerWidth`).
- Every `.btn-task-action` ≥40×40 effective; card height ≤ ~3.5× a desktop card.
- List of 14 tasks ≤ ~2.5 viewport-heights tall (vs 10–15× today).
- Archive & Delete reachable (via ⋯) on a deadline task at 360.

## 2. Slice 2 — group header (fixes B1-13, part of B1-05)

Same disease, second element. `_groupHeaderHTML` (03-render.ts:127).

- On coarse: header wraps to 2 rows. Row 1: drag-handle · color-dot · **title
  (flex: 1, min-width: 0, ellipsis, min readable ≥ 45% of row)** · count · chevron
  (sword — collapse toggle stays on the whole header). Row 2: `.group-actions`
  (wrap, 40px buttons): sched-sort · sort-picker · focus · ⋯ (new group-more).
- **Group ⋯ on coarse** → duplicate, rename, delete move into a float-menu/sheet
  (reuse `_openFloatMenu` with `role=menuitem` items + IC.twinCoffin/quill/tombstone).
  Keeps the destructive tombstone off the always-visible row. Desktop unchanged.
- Group pill in the toolbar (B1-05): `max-width: 45vw; text-overflow: ellipsis;
  white-space: nowrap; overflow: hidden` on coarse/narrow.

**Acceptance:** group «Работа и всякие дела по дому» readable @360 (≥12 chars
visible); no page h-scroll with a 30-char group name; all header buttons ≥40px.

## 3. Slice 3 — float-menus → bottom sheet on touch (kills B1-17 + B1-28 class on mobile)

The float-menu family (`_openFloatMenu`: task-more, submode, demote, snooze,
group sort picker, group-more from slice 2) is body-portal + viewport-anchored:
right-edge clipping (B1-17) and scroll-detach (B1-28) are CLASS defects.

**Decision (architect): on coarse pointer, `_openFloatMenu` renders the SAME item
HTML into a bottom action-sheet instead of an anchored popover.** One change
point, whole class fixed, thumb-zone ergonomics for free.

- Implementation: inside `_openFloatMenu` (and its close twin), branch on
  `IS_COARSE`: create/reuse `#action-sheet` — `position: fixed; left:0; right:0;
  bottom:0; padding-bottom: calc(12px + env(safe-area-inset-bottom));
  max-height: 60dvh; overflow:auto;` + a dim scrim (tap = close; Esc too).
  Slide-up via `transform: translateY(100%→0)` with `--ease-out`/`--dur-m`;
  reduced-motion → opacity only.
- Style: the sheet is a **crypt slab** — same surface tokens as `.float-menu`
  (bg, border, shadow), top edge gets the existing ornament idiom (reuse the
  modal's border treatment; NO new art). Items reuse `.float-menu` item styling
  at 48px row height.
- Menu items keep `role=menuitem` + `data-act` — dispatcher untouched.
- Desktop popovers fully unchanged (their B4-02 scroll-follow fix is a separate,
  later, cross-platform item — do not attempt here).
- Snooze menu, sort pickers: verify they route through the same helper; any
  sibling popover engine NOT routed through `_openFloatMenu` is out of scope —
  note it, don't chase (B4-02 owns the sweep).

**Acceptance:** on 412×915 open task-⋯, group-⋯, snooze, submode: sheet fully
on-screen, no clipping, scroll of the list behind is locked, tap-out closes;
menu unaffected by prior page scroll position.

## 4. Slice 4 — modals fit + landscape (B1-06)

- All modals: `max-height: calc(100dvh - 24px - env(safe-area-inset-top) -
  env(safe-area-inset-bottom)); overflow-y: auto;` on the modal box (portrait AND
  landscape, all platforms — harmless on desktop but scope to coarse if cautious).
  Footer with «Сохранить» must stay reachable INSIDE the scrollable box (do not
  fix-position footers — simpler and matches current DOM).
- Add ONE landscape media block `@media (max-height: 500px)`: tighten modal
  vertical paddings/margins ~40%, deadline «candles» grid → 2 rows if needed,
  weekday list clip (11px, S1 note) fixed by the same max-height+scroll.
- Keyboard case (412×460 probe class): same max-height math handles it via dvh.

**Acceptance:** every modal from the B1 inventory opens with confirm button
visible & tappable at 412×915, 915×412, 412×460 (keyboard proxy). Probe:
`D:\tmp\pw\b1\` modal sweep re-run — zero clipped confirms.

## 5. Slice 5 — safe-area + FABs + bottom gutter (B1-07, B1-08, B1-24, closes V2-B0-04)

- `index.html`: `<meta name="viewport" content="… , viewport-fit=cover">`.
- Bottom FABs (sync eye left, pen right): `bottom: calc(18px +
  env(safe-area-inset-bottom))`. Sync panel flip-up origin moves with it.
- Reserve scroll gutter: list/editor containers get `padding-bottom: calc(76px +
  env(safe-area-inset-bottom))` on coarse so the last card/paragraph clears FABs.
- B1-24: body/background must extend under the gesture-nav area (bg-gothic paints
  edge-to-edge with viewport-fit=cover) + `<meta name="theme-color" content="#0d0a14">`
  (match the app's near-black; check the actual `--bg-*` base value).
- PWA standalone re-check on device after deploy (B1-19 already fixed — don't touch
  sw.js redirect logic).

**Acceptance:** on the user's device (guided check): FABs fully above the gesture
bar; last task card fully readable with FABs present; nav strip shows gothic bg,
not flat black.

## 6. Slice 6 — quick wins batch (one commit, all low-risk one-liners)

| Fix | Site | Change |
|---|---|---|
| B1-21 drag ghost offset | Sortable init options | `fallbackOnBody: true` (+ verify `forceFallback` interplay on touch; test task + subtask + group DnD after) |
| B1-20 pen sound letters | 12/pen keydown filter | also fire on `beforeinput`/`input` insertText when coarse (letters via IME) |
| B1-12 keyboard hints | new-task input, search, quick-add | `autocapitalize="off" autocorrect="off" spellcheck="false" enterkeyhint="done"`; `inputmode` where numeric |
| B1-22 signposting | deadline modal segmented widget | on coarse: tapping any segment triggers the native-picker button path (`showPicker()`), segments get a subtle pressable style; do NOT rebuild the widget |
| B1-27/28 typeahead | quick-add typeahead positioning | clamp into `visualViewport` (flip above input when bottom space < menu height); reposition/close on scroll while open (fixes the detach cross-platform — this one is allowed to touch desktop behavior, it's a bug there too) |
| B1-04 grim bar | `.grim-bar-acts` | on narrow: icon-only buttons + `overflow-x: auto` fallback (copy the tag-cloud strip pattern — B1 report calls it the one strip done right) |
| B1-14 bulk bar | main select-bar | wrap into ≤2 tidy rows on coarse (group the count+cancel row 1, actions row 2) |
| B1-15 tables | Grimuar note body tables | wrap in `overflow-x:auto` container at render/sanitize point (check callout round-trip still passes vitest) |

**Deliberately NOT in this wave:** B1-10 virtualization (high risk, own block —
W4/optional; slices 1–2 already cut card height massively which is what
compounds it), B1-23 paint glitch (re-test AFTER slices 1–2 — likely the layout
explosion was the driver; if it persists → B7/B8 territory), B1-18 px→rem
(app-wide typography churn — separate decision), B1-16 TOC on mobile (feature
design, W3), B1-25 caret-adjacent toolbar (feature design, W3).

## 7. Verification protocol (every slice)

1. `npm test` green (49+ vitest; none touch layout but they gate the commit).
2. `npm run build` green; probe against `dist` via the b1 harness.
3. Screenshot set: 412×915 + 360×800 (portrait) for slices 1–3; + 915×412 for
   slice 4; compare against `audit-v2/shots/B1_*` baselines (the DEFECT shots —
   the diff should show the fix).
4. Desktop no-change check (rule 0.1).
5. Push → user checks on his phone (the real acceptance) — HIS confirm closes a
   slice, not the emulation.
6. B1-23 (paint) re-probe after slice 2 — record verdict either way.

## 8. Risk register

- **Sortable + wrapped action rows:** drag-handle hit area moves; re-test all 3
  DnD surfaces per mode (incl. subtask split mode) after slice 1. Regression =
  release blocker (CLAUDE.md: DnD must keep working in every mode).
- **Card-reuse cache (`_liSig`):** any markup change invalidates ALL cached cards
  once (full rebuild on first render after deploy) — expected, one-time, fine.
- **`dvh` on older WebView:** Android Chrome ≥108 OK (user's device is modern);
  add `max-height: calc(100vh - 24px)` fallback line BEFORE the dvh line.
- **Action sheet focus/a11y:** trap focus while open, return focus to the
  invoking button on close (mirror the modal machinery — B5-04 shows what
  happens when a surface skips it).
- **env(safe-area-inset) without viewport-fit=cover is 0** — slice 5 must land
  the meta change and CSS together or FABs won't move.
