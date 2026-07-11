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
| **V2-B1-12** | 1 / 0 | A | task/search inputs lack `autocapitalize`/`autocorrect`/`inputmode` → autocorrect can mangle quick-add tokens |
| **V2-B1-13** | 3 / 0 | A+B+C | ⚠ 2nd FLAGSHIP — group-section header title collapses to 3 px @360 / 47 px @412 (17-icon cluster crushes it); group names unreadable |
| **V2-B1-14** | 2 / 0 | A+B | main bulk-select bar wraps into a ragged 3–4 row block on mobile (doesn't fit one row even at 412); stray dividers |
| **V2-B1-15** | 2 / 0 | A+B+C | wide Grimuar table has no h-scroll container → columns crush to 44 px, headers wrap to ~2 chars/line |
| **V2-B1-16** | 1 / 0 | A+B+C | Grimuar TOC rail `display:none` on mobile, no fallback → no heading nav for long notes |
| **V2-B1-17** | 2 / 0 | A+C | body-portal popovers (task-more etc.) anchored to right-edge buttons overflow the screen → menu text clipped |
| **V2-B1-18** | 1 / 0 | A | all font-sizes fixed px (0 rem) → OS font-size setting doesn't enlarge UI (WCAG 1.4.4; pinch-zoom mitigates) |
| **V2-B1-19** | 3 / 0 | A+B | ⚠ installed PWA won't launch — `start_url` 308→`/` returned as redirected navigation → ERR_FAILED (**FIXED + deployed 2026-07-08**) |
| **V2-B1-20** | 1 / 0 | A+B | «Звук пера» silent on letter typing on mobile (IME keydown lacks `key.length===1`; space/backspace work) |
| **V2-B1-21** | 2 / 0 | A+B | touch drag ghost offset far left of the finger → reordering nearly unusable (Sortable fallback + no `fallbackOnBody`) |
| **V2-B1-22** | 2 / 1 | B+A | deadline modal: segmented time input + steppers don't respond to tap on mobile → can't set a time |
| **V2-B1-23** | 2 / 0 | B | interface intermittently fails to paint on scroll (varies each re-scroll) — compositing under the huge B1-01/10 layout |
| **V2-B1-24** | 1 / 0 | A+B | gesture-nav/edge-to-edge strip is flat near-black, not the gothic bg (user-noted) — bundle with B1-07 |
| **V2-B1-25** | 1 / 0 | B+C | Grimuar format toolbar docked at top, far from the caret → awkward to reach while typing on a phone |

**Edge-case sweep (2026-07-08):** all modals in landscape 915×412 — deadline/repeat/
color/group clip (B1-06 scope), but note/prio/colorFilter/templates/backup/renameGroup
FIT with Save reachable. Primary text contrast is excellent (17.5:1). Snooze menu fits
at 360. So the sweep was mostly confirmations — the mobile defects cluster around a few
root causes (see `FINDINGS.md` → "Leads for an EXHAUSTIVE B1"). **Why 25 and not more:**
the dominant root causes recur across surfaces (one fix each covers many symptoms) and
several surfaces are genuinely well-built; a larger count needs the enumerated
uncovered probe-areas (pickers/overlays/notification/zoom/RTL/per-component census),
much of which is cross-batch (B2/B3/B5/B7/B8). That list is the actionable path to
exhaustive coverage.

**Device round (user's real Android, web tab, 2026-07-08):** on-device CONFIRMED
B1-01, B1-13, B1-06, B1-08, B1-15 (photos 1–6). Did NOT reproduce B1-05 / B1-17
(his viewport >360 px → those are ≤360-px-only). Good on device: new-task field
above keyboard, more-menu fit, smooth scroll. New device-only findings B1-20…23.
**B1-19 (PWA install) fixed and deployed** — awaiting the user's re-install check.
Minor lead (not a numbered finding): the Grimuar format toolbar sits at the top of
the editor, far from the caret — reaching it while typing is awkward on a phone
(consider a caret-adjacent / sticky toolbar on touch).

Two independent flagship-class collapses now stand: **V2-B1-01** (task-card title)
and **V2-B1-13** (group-header title) — same root pattern (revealed action cluster
crushes a shrinkable label) but **different elements with different fix sites**, so
the rework must address both the list row AND the group header.

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

Done: static/code (A, every finding root-caused), visual/screenshot (C, ~75 shots
across pages×viewports×states×modals×pickers×overlays), functional-at-mobile
(add-by-tap ✓, schedule-toggle-by-tap ✓, checklist-toggle-by-tap ✓, quick-add
parse ✗ bug), performance (200/1000 tasks, CPU 4×), a11y (tap-target census,
viewport meta, WCAG 2.2 target-size, reduced-motion coverage, px-type-scale),
PWA/safe-area (viewport-fit, FAB geometry), gesture (tap path verified), pickers/
popovers (more-menu clip, history overlay OK), select/bulk bars, Grimuar editor
edge cases (wide table, code wrap, callout, checklist, link modal, TOC), 200%
text-scale (px-only finding), reduced-motion (50 blocks — solid).
Deferred to the device round / later batches: real touch-DnD feel (SORTABLE
`delay:120`), real virtual-keyboard scroll-into-view & squeeze, real safe-area/
install occlusion, contenteditable caret/selection on touch, deep motion jank at
mobile (= B7), outside-tap layer ordering with several overlays open,
pull-to-refresh mis-trigger, snooze/sub-mode/demote popover right-edge overflow
(V2-B1-17 sibling menus — verify each), quarantine overlay (needs journal data).

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

1. **P0 — Row/header action-model rework (fixes B1-01, B1-03, B1-13, B1-02, most of B1-09).**
   The one headline change. On touch/narrow, take the revealed action cluster OFF
   the label's inline row for BOTH the **task card** (B1-01/02/03) AND the **group
   header** (B1-13) — wrapped own-row or overflow menu, ≤2–3 inline primaries — so
   the title/label gets full width, nothing clips, hit areas ≥24–44 px. This is the
   bulk of "перелопачивать мобильный UI". Gothic motifs unchanged.
2. **P1 — Overflow/fit fixes.** Group-pill max-width+ellipsis or scroll strip
   (B1-05); grim-bar-acts icon-only/scroll on narrow (B1-04, also re-centers the
   notes-page modals); modal `max-height:100dvh + overflow:auto` + a landscape
   block (B1-06); wide-table h-scroll wrapper (B1-15); bulk-bar ≤2-row footprint
   (B1-14); clamp/flip body-portal popovers to the viewport (B1-17).
3. **P1 — Safe-area + FAB layout.** `viewport-fit=cover` + `env(safe-area-inset-*)`
   on bottom UI; reserve a bottom scroll gutter so FABs don't cover content (B1-07,
   B1-08).
4. **P2 — Perf at scale.** List virtualization + slimmer card nodes (B1-10);
   coordinate with B8.
5. **P1 quick-wins (low-risk, high-value, mostly one-liners):** touch DnD
   `fallbackOnBody:true` so the drag ghost tracks the finger (B1-21); pen sound
   also driven by `input`/`beforeinput` so letters click on mobile (B1-20); make
   the deadline segmented time input focus + accept a numeric keyboard on touch,
   or fall back to a native `<input type=time>` (B1-22).
6. **P2 — scroll paint** (B1-23): fix B1-01/B1-13 first (kills the height
   explosion), then profile mobile paints and lighten the stacked filter/backdrop
   layers → overlaps B7/B8.
7. **Done 2026-07-08:** B1-19 installed-PWA launch (start_url "./" + redirect-safe SW).
8. **Cross-batch — quick-add regex fix** (B1-11) → owned by B6.

## Deepen-workflow outcome (hybrid method)

A background Workflow fanned out 6 finders + adversarial verifiers + a critic.
It hit the **session token limit** mid-run: 6 of 20 agents completed, 14 errored
(mostly limit). Rather than resume (which would re-run all 14 and re-hit the
limit), the completed agents' structured results were **harvested from the
run journal**, and several "failed" agents' **screenshots survived** (they shot
before their final return failed), so their surfaces were audited from those
shots + serial re-probes. New findings V2-B1-13/14/15/16 came from this harvest;
the high-severity ones (esp. the group-header collapse) were **independently
re-measured by the main thread** before promotion (§4a). V2-B1-17/18 were found
serially. Net: the workflow's breadth was recovered at ~⅓ its intended cost.
Lesson for later batches: keep finder fan-outs small (≤4) and cheap, or run the
breadth serially — the full 20-agent panel is too token-hungry for the session
limit.

## Status / next

- **18 findings** recorded; two flagship-class collapses (B1-01 task card,
  B1-13 group header), each with A+B+C / re-verified evidence.
- Harness + seed reusable (`D:\tmp\pw\b1\`); ~75 shots in `audit-v2/shots/`
  (`B1_*`, `B1w_*`, `B1e_*`); re-runnable for regression once fixes land.
- Remaining for B1: the user's **real-device round** (checklist above) to upgrade
  B1-01/06/07/13 to on-device C and settle touch-DnD/keyboard/caret; verify the
  V2-B1-17 sibling popovers (snooze/sub-mode/demote) and the quarantine overlay.
  These are cheap serial probes + a short device session — no further large
  workflow needed.
- B1 is effectively complete for the emulation phase; the roadmap above is the
  hand-off into the (later, approval-gated) fix stage.

---

## S1 — targeted top-up (Fable 5, 2026-07-11, spec rev4 §5)

Scope executed exactly as user-approved: five root-cause CLASSES not exercised
before. Probes: `D:\tmp\pw\b1\s1_probes.mjs` (+ 4 one-off debug scripts), shots
in `audit-v2/shots/s1/`, raw measurements in `shots/s1/_s1_results.json`.
27 findings total for B1 after this pass.

| Class probed | Verdict | Outcome |
|---|---|---|
| SegmentedInput family (6 widgets incl. repeat-anchor) on touch | **DEFECT, root cause A-confirmed** | B1-22 upgraded: tap focuses a non-editable div, no `inputmode` → VK can never raise; only the native-picker button works. Steppers half of B1-22 REFUTED (they tap fine) |
| Text-edit entry on touch (found while probing) | **NEW FLAGSHIP-class → V2-B1-26** | all 5 edit surfaces are dblclick-only; double-tap yields ZERO events in touch emulation (zoom-intent), no touch fallback, no affordance → can't rename a task on a phone |
| 6 gothic pickers on touch (month/weekday/group/grim-cfilter probed; form-wd same family; sort sampled in B1) | HEALTHY | all open on tap, 45 px items; weekday list clips ~11 px in landscape (theme-3 one-liner) |
| Every modal + keyboard proxy (412×460) | HEALTHY | note/rename-group/grim-link/templates fit with input+confirm visible; clipping class unchanged (B1-06) |
| Rotate mid-edit (data safety) | **SAFE** | quick-add draft, deadline segment buffers, mid-debounce note edit, Grimuar body — all survive rotation, nothing closes |
| Quarantine overlay (seeded journal, 3 viewports) | HEALTHY | fits, scrolls, badge shows, touch-restore works; 96×24 buttons → theme 4 |
| Quick-add typeahead above keyboard | **DEFECT → V2-B1-27** | opens fine from real keystrokes, but fixed below-input placement → clipped under keyboard @460h, off-screen + accept-miss in landscape |

Method note (§2 discipline): three initial probe "failures" (group picker tap,
grim-cfilter tap @360, deadline modal closing on rotate) were re-run clean and
REFUTED as probe-order artifacts — recorded in FINDINGS so they aren't re-chased.

### Additions to the real-device checklist (hand to the user)
10. Double-tap a task's title — does inline editing open (cursor + selection),
    does the page zoom, or does it just select a word? Same on a subtask. (B1-26)
11. In the deadline modal, tap the hourglass/calendar button next to the time and
    date fields — does the native Android picker open? (That is currently the ONLY
    touch path to set a time — B1-22.)
12. With the keyboard up, type `задача !` in the new-task field — does the
    priority dropdown show fully above the keyboard? Rotate to landscape and
    repeat. (B1-27)

### Roadmap adjustments (proposals only)
- **P0 (join the action-model rework):** touch edit-entry (B1-26) — an explicit
  «Редактировать» affordance must be part of the mobile card/action redesign, or
  the rework ships with editing still impossible on phones.
- **P1 quick-wins list gains:** typeahead visualViewport clamp/flip (B1-27 — same
  clamp utility as the B1-17 popover fix); SegmentedInput touch input path
  (B1-22 fix already listed) — verify steppers on device before touching them.

---

## S1 device round 2 (user's Android, 2026-07-11) — B1 CLOSED at 28 findings

User ran the three new checklist items:
- **(10) B1-26:** double-tap edit WORKS on device (task + subtask) → severity
  downgraded to discoverability/ergonomics (UI 2); caret placement «тяжеловато» —
  confounded by B1-01, re-assess after that fix. Emulation's suppressed-dblclick
  did NOT transfer to the real device — recorded as an emulation-fidelity lesson.
- **(11) B1-22:** both native Android pickers open and work → the `showPicker()`
  button is a functioning mobile path; finding narrowed (dead-looking segments +
  zero signposting), DL mitigated.
- **(12) B1-27:** portrait dropdown fully above the keyboard on device —
  confirmed good; landscape clip stands. The same check surfaced **V2-B1-28**:
  the typeahead menu is pinned to viewport coords and detaches from the input on
  scroll — on ANDROID AND PC, for priority/date/tag alike (code-confirmed: no
  scroll handling while open). Cross-platform; B4 must sweep the sibling
  body-portal popovers for the same defect.

### Closure statement & residual-lead ownership (completeness re-check)

B1 is **closed at its user-approved scope**: rev4 §5 targeted top-up executed in
full (all 5 classes probed), both device rounds done, every emulation flagship
device-confirmed, probe artifacts refuted on record. What B1 deliberately does
NOT contain — and who owns it (all owners audit the MOBILE viewport too, per
rev4 decision #3):

| Residual lead (from "Leads for an EXHAUSTIVE B1") | Owner |
|---|---|
| Notification permission / bell flow + deadline toast on mobile | S3 (B5 UX) + S4 (B6 functional) |
| Find bar over keyboard; search-highlight legibility | S3 (B5) |
| Contrast over bright bg-image regions (moon/branches) | S2 (B2 gothic) |
| Archive/crypt month collapse animation + header tap target | S5 (B7 motion) |
| Schedule-mode `.dl-side-panel` legibility | S2 (B2/B4) — re-measure AFTER the B1-01 fix |
| Sub-notes eye / promote / demote / duplicate / template-apply taps | S4 (B6 functional-at-mobile) |
| 200 % browser zoom; RTL / long-locale; long unbroken word | S3 (B5 a11y) |
| Pen-volume drag + colour-spectrum pad touch precision | S3 (B5) |
| Body-portal popover scroll-detach sweep (B1-28 siblings) + B1-17 sibling menus | S2 (B4 UI) |
| Per-component tap-target census beyond the B1-09 count | S3 (B5) |
| List virtualization / paint profiling at scale | S5 (B8 perf, chrome-devtools MCP) |
| Touch-DnD delay:120 feel after fallbackOnBody fix lands | fix-stage regression check |

Nothing on this list is uncovered-and-unowned. The four root-cause themes + the
28 findings + this table are the complete mobile picture the rework needs.
