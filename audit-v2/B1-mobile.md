# B1 — Mobile Experience (FUNDAMENTAL / P0) — batch report

Auditor: Opus 4.8 (xhigh) · 2026-07-07 · runtime harness in `D:\tmp\pw\b1\`
(`lib.mjs` + `seed.mjs`), system Chrome via playwright-core, `dist/` served
locally, **seeded state only — never the user's data**. Emulation: `isMobile:true,
hasTouch:true` (⇒ real `hover:none`+`pointer:coarse` media state). Devices:
pixel7 412×915 (primary), big 430×932, small 360×800, landscape 915×412,
keyboard-short 412×460; DPR 2.6–3. Screenshots in `audit-v2/shots/` (`B1_*`).

## Verdict

**The user's report is correct and the root cause is concrete.** The app's
single most-used surface — the task list — is **catastrophically broken on every
phone width**: each task card's title collapses to 0–33 px and streams down the
screen one character per line, turning the list into a 10–15× viewport-tall tower
of unreadable single glyphs (V2-B1-01). This one defect, plus a cluster of
touch-layout problems around it, is why mobile feels "УЖАСНО". The fix is a
genuine **mobile card/action rework**, exactly as the user scoped.

Crucially, mobile is **not uniformly bad**: several surfaces are already
well-adapted (see "Good surfaces"). So the rework is targeted, not total — the
gothic visual language holds up on a phone; it is the **task-card action model**
(hover-reveal, inline, non-wrapping, fixed-width, 9–10 buttons) that fails on
touch, and a handful of overflow/fit/safe-area gaps around it.

## Findings (this batch) — full records in `FINDINGS.md`

| ID | Sev (UI/DL) | Evidence | One-line |
|----|----|----|----|
| **V2-B1-01** | 3 / 0 | A+B+C | ⚠ FLAGSHIP — task-card title collapses to ~0–33 px on every phone; list becomes a 10–15× viewport tower of single-char text |
| **V2-B1-02** | 2 / 0 | A+B+C | ≤360 px: a deadline task's Archive+Delete buttons clip off the card (overflow:hidden), no more-menu fallback |
| **V2-B1-03** | 2 / 0 | A+B | subtask rows collapse the same way (revealed inline sub-actions squeeze sub-text to ~47 px) |
| **V2-B1-04** | 2 / 0 | A+B+C | Grimuar `grim-bar-acts` (389 px) overflows viewport → «Начертать»/template-split clipped (52 px @360) |
| **V2-B1-05** | 2 / 0 | A+B+C | long group pill has unbounded width → whole-page horizontal scroll at ≤360 px (+31 px) |
| **V2-B1-06** | 2 / 1 | A+B+C | tall modals: no max-height/scroll → clip on landscape & keyboard; repeat «Сохранить» unreachable in landscape; no landscape media query |
| **V2-B1-07** | 2 / 0 | A+B | safe-area inert (no `viewport-fit=cover`) + FABs 18–22 px from bottom → under gesture-nav (promotes V2-B0-04) |
| **V2-B1-08** | 1 / 0 | C | bottom-corner FABs overlap list/editor content (no reserved bottom gutter) |
| **V2-B1-09** | 2 / 0 | B | tap targets: 410/587 <44 px, **88 <24 px** (colour swatches 20 px) — WCAG 2.2 (2.5.8) fails |
| **V2-B1-10** | 2 / 0 | B | no list virtualization, ~154 nodes/card → boot 5.6 s (200) / 30.8 s (1000) @CPU4×; layout height explodes |
| **V2-B1-11** | 2 / 0 | A+B | (cross-batch → B6) Cyrillic quick-add priority tokens don't parse (ASCII `\b` after Cyrillic); token left in title |

## Root-cause themes (drive the rework, not just point fixes)

1. **The hover-reveal action model doesn't survive touch.** Base design hides
   actions until hover; the "6g" touch block permanently reveals 9–10 fixed-width,
   non-shrinking buttons inside a non-wrapping row → the title/label is crushed
   (B1-01, B1-03) and, when a deadline adds a 10th button, buttons clip off the
   card (B1-02). Any mobile-card redesign must move actions off the title's inline
   row (own wrapped row / overflow menu / swipe drawer) and keep ≤2–3 inline.
2. **Fixed-width, non-wrapping strips overflow narrow screens.** grim-bar-acts
   (B1-04), the group pill (B1-05), and the action row (B1-02) all overflow because
   they were sized for desktop and lack wrap / ellipsis / horizontal-scroll
   fallbacks (the tag-cloud is the one strip that got this right — reuse its pattern).
3. **Layout assumes a tall portrait viewport.** No landscape media query anywhere;
   modals have no max-height/internal scroll → they clip (and block Save) in
   landscape or with the keyboard up (B1-06). Bottom UI ignores the safe area (B1-07).
4. **Density over finger-ergonomics.** 30-px icon buttons, 20-px swatches, tiny
   meta-clears (B1-09); node-heavy cards at scale (B1-10).

## Good surfaces (keep these in the rework — differential evidence)

- **Toolbar / «Параметры» panel** — priority 2×2, colour-swatch grid, group
  dropdown, repeat pills, deadline trigger: cleanly laid out and gothic on 360–412.
- **Archive page** — 2-button action rows fit perfectly; readable cards. (This is
  the proof that B1-01 is specifically the 9–10-button density, not cards per se.)
- **Deadline modal (portrait)** — 6-mode grid + segmented date input + duration
  "candles" + actions all fit and look excellent at 360; other modals fit portrait too.
- **Grimuar editor** — the 16-button format toolbar reflows responsively; a 2-col
  table and rich body render cleanly; the note LIST is readable and well-carded.
- **Header, page-nav, progress bars, empty-state** — solid on mobile.

## Test-type coverage (this batch)

Done: static/code (A, every finding root-caused), visual/screenshot (C, ~20 shots
across pages×viewports×states×modals), functional-at-mobile (add-by-tap ✓,
schedule-toggle-by-tap ✓, quick-add parse ✗ bug), performance (200/1000 tasks,
CPU 4×), a11y (tap-target census, viewport meta, WCAG 2.2 target-size), PWA/
safe-area (viewport-fit, FAB geometry), gesture (tap path verified).
Deferred to device round / later batches: real touch-DnD feel (SORTABLE
`delay:120`), real virtual-keyboard scroll-into-view & squeeze, real safe-area/
install occlusion, contenteditable caret/selection on touch, motion jank at
mobile (deep motion = B7), reduced-motion completeness, 200% text-scale reflow,
outside-tap layer ordering with several overlays open, pull-to-refresh mis-trigger.

## Remaining leads to chase (B1 continuation / device / other batches)

- Quick-add **typeahead** placement above the keyboard on mobile (my `.fill()`
  probe didn't trigger it — re-test with real keystrokes / on device).
- **Schedule mode** `.dl-side-panel` (44 px) further narrows the already-crushed
  card — re-measure after B1-01 fix; verify the countdown side-rail is legible.
- Wide Grimuar **table** (5+ cols) and long **code** lines → horizontal scroll vs
  overflow (seed only had a 2-col table).
- **Pickers/overlays** on mobile (sort, group dropdown, snooze +custom, colour-
  filter pop, sync panel flip-up from the bottom-left FAB, quarantine list, grim
  history «Летопись», grim table/callout menus) — placement/fit not yet shot.
- Task input lacks `autocapitalize`/`autocorrect`/`inputmode` hints — verify token
  mangling by mobile autocorrect (ties to B1-11).

## Real-device checklist (hand to the user — Android PWA)

Install `dusk-du4.pages.dev` as a PWA, then, capturing a screenshot each:
1. Open «Задачи» — can you read task titles, or is each a vertical column of
   single letters? (expected: broken — confirms B1-01)
2. Do the bottom FABs (eye bottom-left, pen bottom-right) clear the gesture-nav
   bar, or sit under it? (B1-07)
3. Rotate to landscape, open a task's Дедлайн/Повтор modal — can you see the top
   and reach «Сохранить»? (B1-06)
4. Tap a task's title field and type — does the field scroll above the keyboard,
   or hide under it?
5. Long-press-drag a task to reorder — does it start reliably without triggering a
   scroll? Same for a subtask. (SORTABLE `delay:120`)
6. Open a Grimuar note — place the caret mid-word, select text, reach the format
   toolbar; edit a table cell. Any selection-handle / caret trouble?
7. On «Задачи», is there sideways scroll / does a long group name push the layout
   off-screen? (B1-05)
8. Tap the small colour swatches in «Параметры» — easy or fiddly? (B1-09)
9. Scroll a long list — smooth or janky? (B1-10)
Screenshots welcome; they upgrade B1-01/06/07 evidence from B→C-on-device.

## Mobile-first prioritized roadmap (proposals only — no code until user approves)

1. **P0 — Card action-model rework (fixes B1-01, B1-02, B1-03, most of B1-09).**
   On touch/narrow: take actions off the title row (wrapped own-row or overflow
   menu; ≤2–3 inline primaries), give the title full width, ensure ≥24–44 px hit
   areas, nothing clipped. This is the batch's headline and the bulk of "перело­
   пачивать мобильный UI". Gothic motifs unchanged.
2. **P1 — Overflow/fit fixes.** Group-pill max-width+ellipsis or scroll strip
   (B1-05); grim-bar-acts icon-only/scroll on narrow (B1-04); modal
   `max-height:100dvh + overflow:auto` + a landscape block (B1-06).
3. **P1 — Safe-area + FAB layout.** `viewport-fit=cover` + `env(safe-area-inset-*)`
   on bottom UI; reserve a bottom scroll gutter so FABs don't cover content (B1-07,
   B1-08).
4. **P2 — Perf at scale.** List virtualization + slimmer card nodes (B1-10);
   coordinate with B8.
5. **Cross-batch — quick-add regex fix** (B1-11) → owned by B6.

## Status / next

- 11 findings recorded; the flagship (B1-01) carries A+B+C and cross-width proof.
- Harness + seed are reusable (`D:\tmp\pw\b1\`); re-runnable for regression once fixes land.
- Next within B1: an adversarial-verification workflow on the high-severity
  findings + a completeness-critic sweep of the not-yet-shot pickers/overlays and
  the remaining test types; then fold the user's device screenshots in.
