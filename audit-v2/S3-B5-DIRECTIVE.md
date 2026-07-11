# S3 / B5 DIRECTIVE — UX + Accessibility + RU Copy
### Executor: Opus 4.8, effort **xhigh**, NEW clean session. Author: Fable 5 (2026-07-11, user-approved allocation rev4.1)

This directive transfers the full B5 protocol INCLUDING the taste-judgment half
that was originally allocated to Fable. Follow it verbatim; where judgment is
required, the expected judgment frame is spelled out. Goal: output
indistinguishable from a Fable-run B5.

## 0. Session boot (do this first, in this order)
1. Read `AUDIT-SPEC-V2.md` (rev 4) — §1 non-negotiables, §2 evidence/finding
   format, §3 ROI doctrine, §4a serial verification (workflows RETIRED — never
   spawn agent panels), §6 B5 checklist, §9 locked decisions, §10 clarification
   triggers.
2. Read memory `audit-v2-fable-2026-07.md` (status + lessons) via MEMORY.md.
3. Read `audit-v2/FINDINGS.md` — you must DEDUP against every existing ID.
4. Read `audit-v2/B4-ui.md` + `audit-v2/DESIGN-PLAN.md` (§2-3 define the target
   design system your copy/UX recommendations must align with) + skim
   `B1-mobile.md` (mobile findings already closed) + `B2-gothic.md`.
5. Rules in force: audit writes ONLY docs/memory — zero product-code changes;
   seeded states only (never user's real LS/IDB); commit+push after the batch
   (`Co-Authored-By: Claude <noreply@anthropic.com>` trailer), no version.json
   bump; Russian for user-facing text of the report intro, technical bodies EN ok.
6. Harness: `D:\tmp\pw\b1\lib.mjs` (serve/launch/openApp; DESK profile pattern
   in `s2_shots.mjs`), seeds `seed.mjs` (richSeed/perfSeed). Rebuild dist first:
   `npm run build`. Shots → `audit-v2/shots/s3/`.

## 1. Scope
Both apps (DUSK tasks + Grimuar), desktop 2560×1440 DPR1 primary + pixel7
(412×915) mobile profile secondary. Findings IDs: `V2-B5-NN`. Spec §6 B5 is the
FLOOR; this directive expands it into concrete passes below. Estimated volume:
one full session; close the batch (report + FINDINGS + memory + push).

## 2. Anti-scope (dedup — do NOT re-report)
- Popover engines / scroll-detach / Esc / menu keyboard nav → V2-B4-02 owns the
  STRUCTURAL fix. B5 may add only NEW a11y facets (e.g. focus not returned to
  trigger after close — measure, that's yours).
- Archive dimness (V2-B2-05) — your job is only to MEASURE exact contrast
  ratios and append them to that finding's data (note in report, no new ID).
- Disabled-state styling (V2-B4-05), ::selection (V2-B4-06), quarantine label
  copy (V2-B4-07 — you SPEC the RU labels, see §5.4, but the finding exists).
- Mobile layout/touch findings V2-B1-01..28 (esp. 26 discoverability, 22
  pickers). Instances of their root causes = one-line references.
- Empty-state voice (V2-B2-04) — you may propose RU lines (§5.5) but the
  finding exists.

## 3. Runtime passes (B-evidence; script snippets indicative)

### 3.1 Keyboard-only full pass (both apps)
Steps: Tab/Shift+Tab full circuit on: main page (rich seed), params row open,
each modal (deadline, repeat, templates, rename, color-filter, quarantine),
archive page, Grimuar list + editor + летопись.
Check per surface: (a) every interactive element reachable? (b) visible focus
ring everywhere (token ring exists — find gaps)? (c) focus TRAP inside open
modals (Tab must not escape to background)? (d) focus RETURN to trigger on
close (Esc and confirm paths)? (e) logical order (DOM vs visual, esp. 2-col
subtask grid)? (f) inline text editing reachable without dblclick (E hotkey
covers tasks — verify subtask/note paths)?
Probe: `page.keyboard.press('Tab')` loop logging
`document.activeElement` (tag+id+class+text.slice(0,20)) until cycle repeats;
assert containment while modal open.

### 3.2 Hotkey census vs hint bar
The hint bar advertises: N новая · / поиск · J K навигация · X выполнить ·
E изменить · D дублировать · Del в архив · P приоритет · L дедлайн · M заметка ·
R повтор · T закрепить · Ctrl+Z отмена · Ctrl+Y повтор · S синхронизация.
Verify EACH actually works (seeded runtime, fire key, assert state/DOM change),
and grep the keydown handlers (01-core delegation + 08) for hotkeys NOT in the
bar (undocumented) — both directions are findings (truthfulness).
Grimuar: does it have its own hotkey map? Is it hinted anywhere?

### 3.3 ARIA / screen-reader pass
- Icon-only buttons census: query all `button` without text content; check
  `title`/`aria-label` presence AND quality (RU, role-descriptive, matches the
  gothic voice without being cryptic — «Отправить в склеп» good; «Кнопка» bad).
- roles: menus (role=menu/menuitem exist — verify aria-expanded on triggers,
  aria-haspopup), listbox/activedescendant on dropdowns (CLAUDE.md says it was
  added — verify still true), dialogs (role=dialog? aria-modal? labelled-by?).
- Live regions: toasts announced? (aria-live anywhere? likely missing — finding
  candidate.) Sync status changes silent for AT?
- Landmark structure: main/nav present? Heading hierarchy sane (h1→h2→h3)?

### 3.4 Contrast measurements (settle the numbers)
Script: for a list of (selector, description) pairs, compute WCAG ratio from
getComputedStyle color vs EFFECTIVE background (walk up ancestors for the first
non-transparent bg; note: glass over bg-image → also sample the rendered pixel
via screenshot at element center for truth. Do BOTH; report both numbers).
Measure at minimum: task title, task meta chips (заметка/подпункты labels),
deadline chip text (each state: normal/overdue/soon), archived row title
(V2-B2-05 data), archive month header, placeholder texts, hint-bar text,
Grimuar body text (desktop + mobile size), red callout body (user note showed
it near-floor), checked-subtask text, sync panel items, quarantine explainer,
empty-state captions. Threshold: AA 4.5:1 body / 3:1 large; report exact ratios
in a table. Each failure = finding (group into ONE finding with the table if
root cause shared, e.g. one dim-text token).

### 3.5 Reduced-motion matrix
Context flag `reducedMotion: 'reduce'` → sweep: row enter/leave, coffin seal,
collapse/expand (groups, subtasks, extra-fields, archive months), popover
enter, toast, ember pulse, candle flame, sync eye, Grimuar page transitions,
pen-sound bar. Rule: motion must be REPLACED (instant state) not merely kept;
opacity fades acceptable. Report per-surface table (ok / still animates /
broken state).

### 3.6 Zoom / RTL / find-bar / tap census
- 200% zoom: viewport 1280×720 with deviceScaleFactor 1 + CSS zoom emulation
  (or 640×360 viewport = effective 200%): layout survives? horizontal scroll?
  controls reachable?
- RTL smoke: `document.dir='rtl'` — one shot each app; catastrophic breaks only
  (product is RU; grade D severity unless total).
- Find bar (#btn-filter / search inputs): search UX — result feedback, empty
  message voice, clear affordance, keyboard flow (/ focuses, Esc clears?).
- Tap census (desktop coarse-pointer + pixel7): all interactive elements
  getBoundingClientRect < 44×44 effective (incl. padding/pseudo hit area — use
  elementFromPoint sampling at edges, not just rect). B1 covered the flagship
  cases; here produce the COMPLETE census table; new instances = one-line list
  under one finding.
- Pen-volume «Сосуд» + spectrum bar (Grimuar): touch operability (B1 lead):
  drag works with touch events? keyboard alternative? aria?

### 3.7 Workflow cost-in-actions (UX efficiency)
Count actions (clicks/keys/taps) for: add task with priority+deadline (mouse
path vs quick-add syntax path vs keyboard path); complete task; snooze overdue;
archive; restore from archive; create note; find note by text; resolve one
quarantine conflict. Compare paths; a mouse path >2× keyboard path with NO
discoverable hint toward the fast path = finding (ties §4).

## 4. Taste-judgment half (Fable lens transferred — apply as specified)

### 4.1 Power-feature discoverability (the core judgment task)
For EACH: quick-add symbols (`!` prio / `*` tag / `%` date), typeahead, hotkey
S sync, snooze, templates (create via «Сохранить как шаблон» + apply via
modal), duplicate group, promote/demote, split active/completed subtask mode,
focus mode, schedule mode, color filter, bulk select (main + archive),
Grimuar: летопись, TOC, wiki-links (grimLink), templates, перенос, .md export.
Frame: «пользователь, не читавший кода и подсказок»: enumerate every VISIBLE
path to the feature (button? menu item? hint? placeholder example?). Zero
visible paths → UI 2-3 finding. One buried path → UI 1-2. Judge with this
rubric, not personal taste: (a) is there an affordance on the RELEVANT surface
(not three menus away)? (b) does the affordance NAME the outcome («Снуз»
chip on overdue deadline = yes; unlabeled glyph = half); (c) would removing
the code comment leave any way to learn the syntax? Quick-add syntax
specifically: the placeholder shows «Новая задача...» — does ANYTHING in the
UI teach `!`/`*`/`%`? (Suspected: only the hint `?`. Verify what the hint
actually documents.)
### 4.2 Mental-model consistency checks (expected judgments included)
- «Задачи ↔ Архив ↔ Гримуар»: do the three tabs behave as one mental model
  (search scope per tab, select mode per tab, filters per tab — matrix them;
  inconsistencies = findings with severity by confusion cost).
- Repeat model: does UI language distinguish «повтор задачи» vs «авто-повтор
  дедлайна» clearly? (June audit made auto-repeat default OFF — is the
  DIFFERENCE legible to a user? Expected verdict: needs a one-line explainer in
  the deadline modal; verify and write as finding if the two toggles co-exist
  unexplained.)
- Delete semantics: group delete cascades (locked, with warning) vs task delete
  vs «в склеп» vs «удалить навсегда» — is the destructive ladder visually
  graded (danger red only on the truly permanent)? Census every destructive
  control's styling vs its actual severity; mismatches = findings.
- Sync eye states: закрытый/открытый/анимированный — does each state map to a
  user-legible meaning? (§9: quiet sync + badge is locked; judge only the
  LEGIBILITY of states, not the design.)
### 4.3 Toast truthfulness census
Grep every toast call site (search `showToast|toast(` across dusk/*.ts); table:
trigger → RU text → does text match what ACTUALLY happened (esp. undo windows:
does «отменить» in toast always work within its lifetime? does the toast for
merge/sync errors name the cause?). Wrong/vague texts = findings with exact
proposed RU replacements (voice: existing register, no «Oops», no exclamation
marks, active voice).
### 4.4 RU copy quality sweep
- Terminology table: склеп/архив, летопись, начертать/создать, запись/заметка,
  задача/подпункт — one term per concept across BOTH apps (cross-app
  inconsistencies = findings; Grimuar's voice is the reference register per
  B2).
- ё-usage consistency; typography: «ёлочки» vs "quotes", длинное тире usage.
- Hint `?` completeness (vs §3.2 census) and its copy quality.
- Quarantine humane labels (spec the map for V2-B4-07): kind/field →
  «Заголовок задачи» / «Название группы» / «Текст подпункта» / «Заметка —
  обе версии сохранены» / «Запись удалена при правке» etc. Deliver the full
  mapping table in the report (implementation-ready).
### 4.5 Empty-state / first-run voice (proposals only)
Propose 1-2 RU lines per empty state (tasks none / all-done / filter-empty /
search-empty / archive-empty) in the app register for the user to choose at
fix stage (V2-B2-04 owns the finding; you deliver the copy candidates).

## 5. Deliverables
1. `audit-v2/B5-ux.md` — report per spec §3 template (scope, confirmed,
   suspected, root causes, fix strategy, risks, cross-app, ideas, notes for
   context-free implementer). Include: contrast table, hotkey census table,
   icon-button aria census, discoverability matrix, toast truthfulness table,
   terminology table, quarantine label map, workflow action-cost table.
2. FINDINGS.md appends `V2-B5-NN` (format = existing entries; severity axes;
   refutation attempted line MANDATORY per finding; dedup checked).
3. Tag findings needing Fable ratification with `**[RATIFY-FABLE]**` in the
   registry: any taste-judgment with UI≥2 where you are <CF3, plus anything
   touching data-safety. Do not block on them; Fable runs one cheap pass after.
4. Memory update (topic file status + MEMORY.md line) + commit+push
   (docs-only, no version bump).
5. Probe artifacts ledger in the report (what failed, what was refuted as
   artifact — pattern per B1/S2 reports).

## 6. Known traps (from S1/S2 — do not relearn)
- Hidden/hover-revealed controls: use JS click (`p.evaluate(el=>el.click())`)
  after locating; Playwright visibility waits will time out.
- Grimuar toolbar is hover-revealed; buttons found by title regex (list in
  s2_shots.mjs grim section).
- Main select mode = `#btn-main-select` (toggleMainSelectMode), archive's =
  `#btn-select-mode`.
- `openSnoozeMenu(event, id)` needs real click path (synthetic event closes
  instantly via outside-pointerdown).
- Emulation double-tap lies (0 events); gesture negatives need device — flag
  as device-check items for the user instead of asserting.
- Toast probe: `deleteTask` isn't the archive path; archive action is
  `removeTask` (data-act) — check act names via
  `[...document.querySelectorAll('[data-id="12"] [data-act]')]`.
- fullPage screenshots: black band below viewport = bg-attachment artifact.
- Probe failure ≠ finding: always clean re-run in fresh context before writing.

## 7. Session-boundary insurance
Commit the report skeleton + raw notes file EARLY (after §3 passes), append as
you go — a hard stop must still leave implementable artifacts (spec §3).
