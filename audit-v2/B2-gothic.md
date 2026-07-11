# B2 — Gothic design language (S2, Fable 5, 2026-07-11)

Scope: both apps, desktop-first (2560×1440 @DPR1 = user's primary render; 1920/1366
secondary; mobile viewport re-read through this lens via B1 shots + device photos).
Evidence: `audit-v2/shots/s2/` (~50 shots incl. icon sheet), style.css/index.html
reads, impeccable deterministic detector run. Calibration from the user (ground
truth): recommendation scale = **вариант (б)** — big proposals allowed, he decides
each; priority strip = recognizable AI-pattern; he is not a designer and expects
the audit to find everything itself.

Verdict up front: **DUSK has a real, non-generic identity — but it lives in one
layer of the app.** The "identity layer" (header, quick-add ornaments, deadline
modal, Grimuar editor, checkboxes, RU voice) is genuinely art-directed and would
pass a professional review. The "chrome layer" (every floating menu, system modal,
toolbar popover, the sync/quarantine surfaces) is generic dark-UI that could come
from any admin template. The single highest-leverage B2 move is not inventing new
gothic — it is **extending the existing identity down into the chrome layer**.

## What is genuinely strong (keep; these are the anchors)

- **Typography foundation.** 4-family stack (style.css:5): Cinzel (display),
  Cormorant (body serif), Cormorant SC (small-caps labels), JetBrains Mono
  (chrome/data). This is a *real* typographic system, not Inter-everywhere; the
  impeccable detector's "single font" hit is a false positive (it only scanned
  index.html). Serif content + SC labels is the strongest anti-AI-slop asset the
  app has.
- **Deadline modal** (`D-modal-deadline`): candle-flanked «Сколько горит» block —
  the best single component in the app; this is the bar everything else should hit.
- **Quick-add ornament row**: ПАРАМЕТРЫ toggle with sword finials, diamond
  separator; group pill «☾ без группы ☽».
- **Grimuar editor** (`D-grim-note-rich`): glowing Cinzel title + quill, ornament
  divider, diamond list bullets, chip-actions in the app's voice (Летопись, В склеп).
- **Tombstone checkboxes**, coffin/tombstone archive rows, СКЛЕП empty state
  (coffin glyph + «Выберите запись из склепа»).
- **RU microcopy voice**: начертать/склеп/летопись/опустошить — consistent and
  ownable. (Truthfulness/grammar audit = B5.)
- **bg-gothic integration**: glass card over the cathedral reads well at all three
  desktop sizes; legibility over the image is fine in every captured state
  (the bright-moon region sits behind the card, not behind text).

## Confirmed findings (formal entries in FINDINGS.md)

- **V2-B2-01 — Two design languages: ornamented identity layer vs generic chrome
  layer.** All body-portal menus (`.snooze-menu` family: snooze, task-more,
  sub-mode, demote, export, sync panel), the sort portal, quarantine modal,
  rename/templates modals = plain rounded rects, no gothic framing, no ornament,
  mono/SC mix without the identity accents. Side-by-side with the deadline modal
  they look like a different product. Fix strategy: one shared "gothic popover/
  modal frame" (border treatment, header ornament, item hover in the app's idiom)
  applied to the float-menu family + system modals — pairs perfectly with the
  V2-B4-02 single-popover-engine refactor (restyle once, everywhere).
- **V2-B2-02 — Priority presentation is an AI-pattern (user-flagged).** The
  colored left strip on task cards + plain colored dots (params, typeahead) are
  the generic to-do-app fingerprint. The app ALREADY solves this gothically for
  subtasks: the `--sprio` ember glow (`::before`, soft inner light) — CLAUDE.md
  documents it as the intended idiom. Direction: extend the ember idiom to task
  cards (glow emanating from the checkbox/tombstone or card edge, not a bar), or
  a wax-seal/brand motif near the checkbox. Dots in pickers → small gothic glyphs
  (e.g. candle flame sizes / rune marks) with the color as tint, not the shape.
- **V2-B2-03 — Label-color palette presentation breaks the color discipline.**
  10 bright, fully-saturated material-style swatches (lime/cyan/orange/pink…)
  in quick-add params + color filter + bulk color. The *feature* (10 user colors)
  is data, keep it; the *presentation* is off-palette: swatches at full saturation
  in a UI whose rule is "violet on near-black, red only for danger". Direction:
  desaturate swatch chrome ~15-25% toward the app's dusk tones (keep hue
  distinguishable), render swatches as gothic tokens (ink drops / wax seals /
  gem cabochons) rather than plain circles/squares; task-side tint usage (strip,
  chips) inherits automatically once V2-B2-02 lands.
- **V2-B2-04 — Tasks empty state has no personality (vs Grimuar's).** Tasks:
  4-point sparkle + small grey «Нет задач. Добавьте первую.» Grimuar: book glyph,
  «Гримуар пуст», italic subline, НАЧЕРТАТЬ ПЕРВУЮ. The tasks side needs the same
  treatment in its own motifs (e.g. unlit candle / empty crypt niche + voice line).
  Also applies to filter-empty and search-empty states (V-2 fixed the *presence*
  of the state in June; the *voice* is still missing).
- **V2-B2-05 — Tasks АРХИВ overshoots "buried" into unreadable.** Archived rows
  at 2560 are barely legible (dim strikethrough on dim bg). The intent (ghosted
  past) is right; the execution loses function. Target: keep the ghost effect but
  raise row text ≥4.5:1-ish for primary titles (B5 will measure exact contrast).
  Cross-app proof it's possible: СКЛЕП cards stay readable while feeling buried.

## Smaller observations (report-only, no registry entry)

- Letopis «СЕЙЧАС» chip is green — the only green *system* accent in the app
  (green otherwise appears only as user label color). Consider violet/silver.
- Native selection color is default blue outside `.grim-body` (style.css:7479
  themes only Grimuar) — visible in rename modal. Formalized as V2-B4-07.
- Repeat-modal tiles, snooze items and toolbar clusters reuse *plain* glyph
  variants where ornate ones exist — that's the B3 program, cross-ref V2-B3-01.
- Em-dash detector hit = RU typographic norm, false positive, ignore.
- Fonts load from Google Fonts CDN at runtime (style.css:5, index.html:22) —
  offline PWA implication belongs to B12 (queued there): do the fonts fall back
  gracefully cold-offline?

## Cross-app (feeds B13)

- Grimuar is one full tier above Tasks in gothic execution: editor typography,
  empty states, archive readability, list-card color framing. Tasks is where the
  B2 work is.
- Color semantics presentation differs: tasks = left strip; grim = full card
  frame + tinted background. After V2-B2-02, unify on one idiom.

## Implementation notes (for a context-free future session)

- The popover/menu restyle must ride the V2-B4-02 popover-engine unification —
  do them as one change (engine + skin), files: dusk/03-render.ts
  (`_openFloatMenu`, sort portal), dusk/08 (`_qaRenderMenu`), style.css
  (`.snooze-menu`, `.task-sort-portal`, `.qa-menu`) — verify against B1-27/28.
- Priority-ember: reuse the subtask `--sprio` ember mechanics (style.css, search
  `--sprio`); the June audit's M-x polish already tuned its glow params.
- Empty states: tasks-side markup in dusk/03-render.ts (search `empty`), voice
  lines should match the existing RU register (склеп/начертать).
- NO code changes in this audit; the above is guidance for the fix stage.
- Deferred check: user's real Grimuar note (he'll drop it into the project folder
  on request) → verify long-form typography verdicts hold on real content.

## Addendum (2026-07-11): real-note typography check (grimuar_note.png)

User supplied a real Grimuar note (mobile render). Verdicts CONFIRMED on real
content: Cinzel title survives a long real title; serif body + diamond bullets +
checked-item italics hold; 5-column table squeezes but stays functional; long
unbroken strings wrap without overflow; inline-code pill and code block fine.
New micro-observations: (1) body text on mobile leans small/dim — the §2.1
light-on-dark compensation in DESIGN-PLAN.md addresses it; B5 measures exact
contrast; (2) red callout body text is near the legibility floor on dark glass —
include in B5 contrast pass; (3) ordered-list numerals are plain — cosmetic,
fold into icon/ornament program if desired.
