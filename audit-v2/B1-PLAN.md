# B1 — Mobile Experience: Execution Plan (FUNDAMENTAL / P0)

Durable anchor for the mobile audit. Written to survive a session compact — a
fresh session reads this + `ARCHITECTURE.md` + `FINDINGS.md` + the memory index
and executes B1 at full fidelity. Auditor: Opus 4.8 (xhigh).

## 0. Mandate (user directive, 2026-07-07)

Mobile is the single most important deliverable of the entire audit — above
every other batch. **Ground truth from the user (treat as given, do NOT
re-litigate): the site is currently adapted to phones BADLY. Nearly the whole
mobile UI/UX needs reworking, AND there are many FUNCTIONAL problems on mobile,
not just layout.** So:

- Assume mobile is broken until each screen/interaction is proven otherwise.
- Produce MANY concrete findings; every claim backed by a screenshot (`C`) or a
  runtime probe (`B`). Static (`A`) only for code-rooted causes.
- Run EVERY kind of test, deeply and in large volume (§4). Maximum edge-case
  coverage (§6). This is a standalone exhaustive audit, expected to span several
  Workflow runs and possibly several sessions.
- The proposed fixes must preserve the gothic identity (mandatory) while fixing
  usability — the whole point is a mobile UI/UX that is genuinely good, not a
  desktop layout crammed onto a phone.
- Deliverable: `audit-v2/B1-mobile.md` (report) + many `V2-B1-*` findings +
  screenshots in `audit-v2/shots/` + a prioritized mobile roadmap section.

## 1. Runtime setup (verified available in B0)

- Playwright: `playwright-core@1.60` at `D:\tmp\pw` (has chromium via system
  Chrome). Use `channel:'chrome'` (system Chrome at
  `C:\Program Files\Google\Chrome\Application\chrome.exe`).
- Server: `npm run preview` (serves the production build at a local port) OR
  `npm run dev` (Vite dev). Preview is closer to prod (SW, bundle). Build first
  (`npm run build`) so `dist/` is fresh.
- **Seed a rich state, never the user's real data.** Inject into localStorage
  `duskState_v4` before load (via an init script / addInitScript): a state with
  ~15–25 tasks across 3–4 groups, mixes of priorities/colours/deadlines (all 6
  modes)/repeats/pinned/notes, tasks with many subtasks (to exercise the 2-col
  grid + split), long-text tasks, plus ~8–12 grimoire notes (varied bodies:
  headings, lists, checklists, a table, a callout, a code block, long note) and
  a few archived tasks + crypt notes. Also a 200-task and a 1000-task seed for
  perf. Keep seed scripts in `D:\tmp\pw` or the scratchpad (NOT the repo).
- Also test on **prod** (`https://dusk-du4.pages.dev`) via claude-in-chrome for
  real SW/standalone/install behaviour — read-only, no edits to real data.

## 2. Viewport / device matrix

| Class | CSS px | DPR | Notes |
|---|---|---|---|
| **Primary** 6.6–6.7" Android | 412×915 | ~2.625 | Pixel 7/8-class — the stated target |
| Large 6.7"+ | 430×932 | 3 | iPhone Pro Max-class, big Android |
| Small Android | 360×800 | 3 | budget/compact — the tightest common width |
| Very small | 360×740 / 384×832 | — | stress the 360 breakpoint + the 360px media rule |
| Landscape | 915×412 | — | rotate mid-edit, modal height, keyboard |
| Tablet edge | 768×1024 | — | the 641px+ desktop-reveal boundary (secondary) |

Emulate touch + mobile UA. CSS breakpoints in play (from B0): 820/720/640/
560/520/360 + `(hover:none) and (pointer:coarse)` + `min-width:641`. **No
landscape media query exists** — verify orientation handling explicitly.

## 3. Screen / surface inventory (audit EVERY one × viewport × state)

### Pages
1. **Main / tasks** — header (brand + 2 coffin emblems), page-nav (3 tabs),
   progress section (tasks bar + subtasks bar), input row + btn-add, qa syntax
   hint, **extra-fields params panel** (priority grid, form colour picker +
   custom-crystal, group picker, deadline trigger, note input, repeat selector +
   inline anchor [weekday/monthday/time], form-subtasks list + add, pin toggle,
   save-as-template), btn-expand "Параметры", **toolbar** (search + tag cloud +
   4 clusters: view [sort/notif/schedule/today/split/collapse-all/sub-anymode],
   filter [filter/colour-filter], select [main-select], data [export/import/
   backups/archive-all/clear-all]), **groups bar** (add-group/templates/pills),
   **main-select-bar** (bulk prio/group/colour/deadline/archive/delete), task
   list + groups container, empty-state (+CTA), all-done plaque.
2. **Archive / crypt** — header (title, full-width search, buttons [restore-all,
   select-mode, clear-archive]), select-bar, collapsible **month sections**,
   archive item cards (with subs, meta, restore/delete).
3. **Notes / Grimuar** — grim-bar (segment Записи/Склеп, acts [select, «Перенос»
   io split, empty-crypt, «Начертать» + template split]), search row (search +
   colour filter), grim-select-bar (bulk archive/restore/colour/export/delete),
   **grim-layout** (grim-list master + grim-detail editor), grim-empty.

### Task card (createTaskEl) — the highest-frequency surface
pin-spike · dl-side-panel (schedule mode) · select checkbox · coffin check +
drag handle · task text (inline-editable) · **action row (~9 buttons:
pin/colour/deadline/snooze/repeat/priority/note/more/archive/delete)** · meta row
(deadline badge + clear, repeat badge + clear, cycle-until, note toggle, subtask
toggle, sub-notes-always eye) · note wrapper (inline editor) · **subtask section**
(progress bar, subtask list [normal 2-col grid OR split active/done zones], add
row). Subtask row: drag handle · check · text · deadline badge · actions
(priority/repeat/deadline-set/note/promote/delete) · deadline pill · note wrapper.

### Grimuar editor (renderGrimDetail)
title (autogrow) · **contenteditable body** · **format toolbar** (bold/italic/
underline/strike/ul/ol/quote/hr/checklist/inline-code/codeblock/link/h1/h2/h3/
**table**/**callout**/export) · action footer (pin/colour/history/archive/delete/
save-as-tpl) · focus toggle · TOC toggle/rail · bar reveal toggle · find bar.

### Modals (static, 13) — each must FIT + be reachable at 360×800 AND with the keyboard open
group · rename-group · grim-link · **deadline (6 modes + auto-repeat toggle +
duration «Свеча» candles — the TALLEST modal)** · prio · task-colour (+ RGB
spectrum pad+hue) · repeat (+ anchor) · note · colour-filter · templates ·
backup · bulk-group · import-choice.

### Dynamic overlays / popovers
sync panel · quarantine review overlay · grim history «Летопись» · grim table
menu · grim callout menu · float menus (snooze [+custom], task-more, sub-mode,
demote, export, grim io/template/io-sel popovers) · gothic pickers (group,
dl-month, dl-weekday, form-weekday, repeat-weekday, sort ×3, colour-filter pop) ·
qa typeahead dropdown.

### Body-level FABs / floating
pen-sound FAB (bottom-right, volume-drag) · **sync eye FAB (bottom-left, +badge)**
· sound button · shortcuts button · toast (+undo/action button).

## 4. Test types — run ALL, deeply (this is the "many kinds of tests" mandate)

1. **Static/code** — mobile-relevant CSS/JS (breakpoints, coarse-pointer blocks,
   hover-dependent affordances, fixed positioning, overflow clipping, touch
   handlers). Root-cause every visual finding back to code.
2. **Visual/screenshot** — every screen × every viewport × every STATE (empty,
   1 item, many items, all-done, filtered, search, schedule, split, combined,
   today, focus, select mode, each modal open, each picker open, keyboard open,
   error/pending states, dark default). This is the bulk of B1 evidence. Store in
   `audit-v2/shots/`.
3. **Motion/animation** — record (playwright video / gif_creator on prod) the
   key transitions AT mobile viewport + CPU throttle: row enter/leave, check
   seal/spin, collapse/expand (subtasks/groups/params/notes), modal in/out,
   toast, FAB morph (pen vessel), reconciliation on check, DnD ghost settle,
   milestone/cathedral flash. Hunt: jank, layout shift, reflow, dropped frames,
   heavy `backdrop-filter`/shadow cost, reduced-motion completeness.
4. **Interaction / gesture** — tap, double-tap (inline edit), long-press (vs text
   selection), swipe, scroll (momentum, nested, modal body lock), pinch-zoom
   (should be controlled), touch **DnD** (tasks/subtasks all modes/groups/grim
   blocks — hold delay, ghost, auto-scroll at edges), pull-to-refresh vs scroll,
   outside-tap close for every popover/picker.
5. **Virtual keyboard** — focus scroll-into-view, viewport resize/squeeze,
   FAB/toolbar/footer overlap while typing, `interactive-widget` behaviour,
   quick-add typeahead placement above keyboard, deadline segmented input +
   native picker button, grimuar editor + keyboard, modal + keyboard fit.
6. **Functional (at mobile viewport — the user says many functional bugs exist)**
   — run the FULL functional matrix on a phone viewport, not just desktop: add/
   check/uncheck/cycle, inline edit, all deadline modes, repeat+anchor, subtasks
   (2-col + split + DnD), groups (create/rename/delete-cascade/DnD/collapse),
   bulk ops, undo/redo, search/filter/tag/colour/today/focus/schedule/split
   combos, snooze, templates, duplicate, promote/demote, quick-add parser, export/
   import, backups; **Grimuar**: create/edit/format-toolbar-every-command/tables/
   callouts/code-fence/checklist/link/history/archive/find/bulk. Log every
   mobile-specific breakage as a `V2-B1` finding.
7. **Performance** — CPU 4–6× throttle + network throttle; 200 & 1000-task seeds;
   FPS during scroll / DnD / animation; INP on tap; boot time; scroll-jank from
   filters/shadows; `render` vs `renderListOnly` cost on mobile. (Deeper perf is
   B8, but mobile perf is a B1 first-class concern.)
8. **Accessibility (mobile)** — effective tap-target size (≥44×44 CSS px),
   screen-reader labels on icon-only buttons, focus order + trap in modals on
   touch, contrast on the gothic bg image at mobile brightness, reduced-motion,
   text scaling (200%).
9. **PWA standalone / install** — installed chrome, status-bar/theme colour,
   splash, **safe-area occlusion of the FABs/toast (confirms V2-B0-04)**, back-
   gesture behaviour, offline boot on mobile.
10. **Real-device round (user)** — a focused checklist (§8) for what emulation
    cannot honestly settle: real touch-DnD feel, real virtual keyboard, real
    safe-area, real install, real gesture-nav, real scroll/overscroll feel.

## 5. Pre-loaded mobile leads (from B0 — verify + expand each into findings)

- **V2-B0-04 (confirmed A):** no `viewport-fit=cover` → `env(safe-area-inset-*)`
  inert → FABs/toast under gesture-nav. Screenshot on device/standalone → C.
- **Hover-dependency (HIGH — likely a large finding cluster):** task action row,
  subtask actions, and note reveal are HOVER-revealed on desktop. Note open uses
  JS `mouseenter`/`mouseleave` (05:359) which DON'T fire on touch. There's a
  `(hover:none) and (pointer:coarse)` block (style.css ~5622) meant to reveal
  actions on touch — **audit whether it covers EVERY hover-only affordance** (task
  actions, subtask actions, note pills, deadline hover-pill, clear buttons). Any
  affordance that only appears on hover and isn't covered = unreachable on mobile.
- **Action-row density:** ~9 action buttons per task card + `.task-item{overflow:
  hidden}` (S1-9). On 360px, revealed-on-touch, do they fit / wrap / clip? Likely
  a core mobile-UX problem (too many controls for a phone card).
- **Touch DnD feel:** `SORTABLE_OPTS delay:120, delayOnTouchOnly:false` (01:838)
  — 120ms hold may mis-fire against scroll (accidental drag) or feel wrong;
  `delayOnTouchOnly:false` also delays desktop. Repeated on sub/group/form
  Sortables. Test scroll-vs-drag conflict on device.
- **No landscape media query** — verify rotate handling, modal height in
  landscape, keyboard in landscape, mid-edit rotate data safety.
- **Tall modals on short screens:** deadline modal (6 mode buttons + inputs +
  auto-repeat toggle + duration candles + actions) is very tall — does it fit +
  scroll on 360×800 and with the keyboard open? Same for repeat modal, group
  modal (presets + full RGB spectrum), task-colour modal.
- **Contenteditable on touch (Grimuar):** selection handles, caret placement,
  the format toolbar reachability, **table editing on touch** (cell nav, the
  overlay gutters/seals designed for hover/pointer), callout/code-fence entry,
  link modal + keyboard. Rich-text-on-mobile is historically the hardest surface
  — expect many findings.
- **RGB spectrum pad + pen-volume channel** use pointer drag — verify precision +
  scroll-capture on touch.
- **Segmented date/time input** (custom span widget) on mobile: does typing work
  with the mobile keyboard? does the native picker button (`showPicker`) work?
- **Toolbar cluster wrap** at 360px (4 clusters + labels) — fit / wrap / scroll?
- **Bottom FAB vs keyboard vs safe-area** three-way overlap.

## 6. Edge-case catalog (seed — expand per screen; MAX coverage required)

Very long task text (no wrap / overflow) · deeply nested/many subtasks in 2-col
grid at 360 · long group names in pills/headers/dropdown · 0 / 1 / 200 / 1000
tasks · all-6 deadline modes rendered small · critical/over pulsing badges on
small cards · schedule + split + today + focus + colour-filter + search COMBOS on
mobile · modal taller than viewport (+keyboard) · keyboard covering the confirm
button · FAB under keyboard · double-FAB corners on tiny screens · toast +undo
button width at 360 · tag cloud wrap · select-bar horizontal overflow · archive
month collapse tap targets · quarantine overlay list on mobile · sync panel float
placement (bottom-left FAB → flips up) · pen-vessel drag at screen edge · colour
pad drag precision · grimuar table with many cols (horizontal scroll?) · code
block long lines (scroll?) · callout nesting · find-bar over keyboard · landscape
mid-edit rotate (data safety) · rapid tap (double-fire) · offline boot ·
install/standalone occlusion · reduced-motion on · 200% text scale · slow-CPU
animation jank · pull-to-refresh mis-trigger · outside-tap closing the wrong
layer when several are open.

## 7. Execution method (hybrid workflow, per spec §4a)

1. Main thread: build the seed states + verify the playwright harness renders a
   screen + confirm the screenshot pipeline (a cheap smoke test first).
2. Take the baseline screenshot inventory (every screen × primary+small viewport)
   — this seeds the fan-out and is itself evidence.
3. **Workflow fan-out** — one agent per screen-family × viewport (task-card /
   toolbar+groups / modals-A / modals-B / grimuar-editor / grimuar-list / archive
   / FABs+overlays / keyboard-scenarios / perf), each handed: this plan + the
   ARCHITECTURE.md summary + its target screenshots + DOM, returning a structured
   finding list (schema: screen, viewport, state, issue, severity axes, evidence
   ref, root-cause guess, fix direction). Main thread synthesizes, de-dupes,
   RE-READS the code behind each finding before it enters the roadmap, and runs
   an adversarial verification panel on the high-severity ones.
4. Loop-until-dry: re-run finders on any screen family that surfaced dense issues
   until a round adds nothing new; a completeness critic checks no screen/state/
   interaction/test-type was skipped.
5. Real-device round (§8) mid/late B1 for what emulation can't settle.
6. Write `audit-v2/B1-mobile.md` + findings + a mobile-first prioritized roadmap.

## 8. Real-device checklist (hand to the user — fill in mid-B1)

Prepare a compact numbered list (5–15 items) for the user's Android, e.g.:
install as PWA → do the FABs/toast clear the gesture-nav bar? · open the deadline
modal → does it fit + scroll, and can you reach «Сохранить» with the keyboard up?
· long-press-drag a task to reorder → does it start reliably without triggering a
scroll? · drag a subtask in the 2-col grid · type in a task → does the field
scroll above the keyboard? · edit a Grimuar note → can you place the caret, select
text, and reach the format toolbar? · edit a table cell on touch · rotate to
landscape mid-edit → nothing lost? · tap a task's action buttons → are they all
reachable/big enough? · scroll a long list → smooth or janky? Capture screenshots
where possible. (Finalize the exact list from the emulation findings so device
time targets the unsettled questions.)

## 9. Resume protocol (post-compact)

A fresh session: read `AUDIT-SPEC-V2.md` (§6 B1 banner) + THIS file +
`audit-v2/ARCHITECTURE.md` + `audit-v2/FINDINGS.md` + the memory index
(`audit-v2-fable-2026-07`). B0 is done (green baseline). Next action = §7 step 1
(stand up the runtime harness + seed). Nothing about B1 scope lives only in
conversation — it is all here.
