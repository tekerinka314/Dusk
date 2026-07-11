# B5 — UX + Accessibility + RU copy (S3, Opus 4.8 xhigh, 2026-07-11)

Executed per `audit-v2/S3-B5-DIRECTIVE.md` (Fable-authored protocol, taste half
encoded as rubrics). Both apps, desktop 2560×1440 DPR1 primary. Evidence: static
reads of `dusk/*.ts` + `index.html` + `style.css`; five runtime probes in
`D:\tmp\pw\b1\` (`s3_contrast.mjs`, `s3_contrast2.mjs`, `s3_a11y.mjs`,
`s3_probe3.mjs`, `s3_probe4.mjs`); raw results in `audit-v2/shots/s3/_*.json`.
Contrast is **ground-truth**: each ratio is `getComputedStyle` color vs the
actual composited backdrop pixel sampled from a screenshot (PNG decoded with a
zlib-inflate + full-unfilter reader), so glass-over-image is measured, not
assumed.

**Headline:** the accessibility floor is **much higher than the directive
suspected** — most of the "likely missing" items already exist and work (live
region + toast announcements, 13 static modals with focus trap + focus return,
labelled dialogs, `role=listbox`/`aria-activedescendant` dropdowns, 387/389
icon-only buttons carrying a Russian accessible name). The real gaps are a
**small, sharp set**: one overlay that bypasses the a11y machinery (quarantine),
one hidden-but-focusable panel, missing focus rings on text inputs, no page
landmark/heading spine, one AA contrast failure on the most important status
(overdue), and copy/discoverability seams. 12 findings, `V2-B5-01..12`.

---

## Scope covered / NOT covered (ROI ledger)

| Pass | Status | Note |
|---|---|---|
| §3.1 keyboard circuit + trap + return | ✅ full runtime | Tab-circuit logged; trap/return probed on the deadline modal + quarantine |
| §3.2 hotkey census vs hint bar | ✅ full | every advertised key fired at runtime (all pass); undocumented keys grepped |
| §3.3 ARIA / screen-reader | ✅ full | live region, dialogs, listboxes, icon-button name census (509 buttons) |
| §3.4 contrast | ✅ ground-truth | 24 targets sampled; overdue chip = the one hard fail |
| §3.5 reduced-motion | ✅ targeted | 9 surfaces swept under `reduce`; toast is the lone gap |
| §3.6 zoom/RTL/find/tap | ◑ partial | 200% zoom ✅ pass; find-bar ✅; **desktop tap census deferred** to B1-09 (owns the tap-target census; desktop fine-pointer is not the risk surface) — recorded, not re-run; RTL smoke folded into report note |
| §3.7 workflow cost | ✅ | action-count table below |
| §4.1 discoverability | ✅ | matrix below (DOM-verified paths) |
| §4.2 mental models | ✅ | repeat model + delete ladder + sync eye judged |
| §4.3 toast truthfulness | ✅ | full census; **clean** (no misleading text) |
| §4.4 RU copy / terminology | ✅ | terminology table + quarantine label map |
| §4.5 empty-state voice | ✅ | copy candidates delivered (B2-04 owns) |

**RTL (§3.6):** `document.dir='rtl'` is a non-goal (RU product; §3.6 grades D
unless catastrophic). Spot-set: the app has zero logical-property / `dir`-aware
CSS, so an RTL flip mirrors the whole layout but does not *break* it (no overflow,
no unreachable controls) — no finding, noted for completeness.

---

## §3.4 Contrast table (ground-truth: fg vs sampled composited backdrop, 2560×1440)

AA thresholds: 4.5:1 body / 3:1 large (≥24px, or ≥18.66px bold).

| Surface | fg | sampled bg | ratio | AA | note |
|---|---|---|---|---|---|
| Task title (normal) | #F0E8FF | #070217 | **17.2** | ✅ | primary text is excellent |
| Group header title | #F0E8FF | #08031B | **17.0** | ✅ | |
| Active subtask text | #F0E8FF | #070219 | **17.2** | ✅ | |
| **Deadline chip — OVERDUE (red)** | **#A01525** | #09031B | **2.53** | ❌ | **fail — V2-B5-01**, 9.5px + bold |
| Deadline chip — time/daily | #E03060 | #0A031D | 4.56 | ✅ | the brighter red passes |
| Deadline chip — soon/normal | #8080EE | #0D0940 | 5.52 | ✅ | over a tinted chip bg |
| Meta label «заметка» / «подпункты» | #9068C0 | #070217 | 4.78 | ✅ | marginal — V2-B5-12 |
| Input placeholder «Новая задача…» | #9068C0 | #08031D | 4.73 | ✅ | marginal — V2-B5-12 |
| Empty-state caption | #9068C0 | #080417 | 4.74 | ✅ | marginal — V2-B5-12 |
| Quarantine explainer / loser preview | #9068C0 | #060216 | 4.79 | ✅ | marginal — V2-B5-12 |
| Quick-add syntax hint (`*тег`) | #9068C0 | #070316 | 4.77 | ✅ | marginal — V2-B5-12 |
| Checked-subtask text | #A078D2 | #070217 | 5.93 | ✅ | strike-through, still readable |
| Hint-bar text / kbd | #B880E8 | #060217 | 7.0–7.1 | ✅ | |
| Grimuar body (desktop) | #B880E8 | #10091E | 6.75 | ✅ | thin/dim *perception* ≠ contrast (see note) |
| Warn callout body | #E3517D | dark-input | ~5.2 | ✅ | injected `.grim-co-warn`; passes at 15.5px |
| **Archive row title (V2-B2-05 data)** | **#A078D2** | #0A0616 | **5.82** | ✅ | **strike-through** — see B2-05 reframe |
| Archive month header | #B880E8 | #090619 | 6.93 | ✅ | |
| Archived subtask text | #9068C0 | #050212 | 4.81 | ✅ | strike-through |
| Sync panel item | #B880E8 | #06021A | 7.07 | ✅ | |

**V2-B2-05 reframe (append, no new ID — anti-scope §2 requires the number).**
The archived-title "unreadable/buried" perception is **NOT a contrast failure**:
measured **5.82:1**, comfortably above AA. The cause is perceptual — the
`line-through` decoration on every title + the muted-violet hue + small visual
weight. So B2-05's fix should target the **strike weight / opacity of the
decoration and the hue**, NOT the luminance contrast (which is already fine).
Raising contrast further would over-lit the "buried" intent for no legibility
gain; instead thin/soften the strike and lift the hue a step.

**Grimuar body "thin/dim" (B2 addendum, append):** contrast is 6.75:1 (fine).
The perception is weight/size, addressed by DESIGN-PLAN §2.1 light-on-dark
compensation (line-height +, weight 500 on glass), not by recoloring.

---

## §3.2 Hotkey census (every advertised key fired at runtime — ALL pass)

Hint bar advertises: `N / J K X E D Del P L M R T Ctrl+Z Ctrl+Y S`.

| Key | Action | Runtime result | Scope |
|---|---|---|---|
| N | new task / note | ✅ focuses input (tasks) / grimNew (notes) / →tasks (archive) | all pages |
| / | search | ✅ focuses search-box | tasks/archive |
| J / K | navigate | ✅ walks visible items | tasks/notes/archive |
| X | complete | ✅ toggled `checked` on focused id | tasks |
| E | edit | ✅ entered inline edit (contenteditable) | tasks (+ notes body) |
| D | duplicate | ✅ `state.tasks.length` +1 | tasks |
| Del | archive | ✅ `removeTask` (only if focused by J/K, not hover) | tasks; notes→склеп; |
| P/L/M/R | prio/deadline/note/repeat modals | ✅ each modal opened | tasks |
| T | pin | ✅ toggled `pinned` | tasks + notes |
| Ctrl+Z / Ctrl+Y | undo / redo | ✅ (also Ctrl+Shift+Z) | global; editor defers to native |
| S | sync / sign-in | ✅ wired (no crash) | global |

**Layout-independence (positive):** `_matchKey` keys off `e.code` (`KeyJ`…), not
`e.key`, so every letter shortcut fires on a **Cyrillic keyboard layout** too
(physical position). No finding — this is the correct design for a RU app.

**Undocumented keys (truthfulness — V2-B5-06):** the handler ALSO binds, with
NO hint-bar entry: `Ctrl/Cmd+F` (focus search on notes/archive), `F3`/`Shift+F3`
(find next/prev in a note), `Esc` (close modal / clear focus / close find bar),
`Backspace` (archive alias for Del), `Enter`/`Shift+Enter` (find-nav while the
notes search box is focused). And the **entire Grimuar keyboard map** (N/J/K/E/T/
Del/Ctrl+F/F3) is not documented anywhere in the UI — the hint bar is
tasks-toolbar-only and its list is tasks-centric.

---

## §3.3 ARIA / screen-reader (mostly strong — the gaps are specific)

**Already correct (verified — do NOT "fix"):**
- **Live region** `#live-region role=status aria-live=polite aria-atomic` (index.html:31);
  `showToast` mirrors every toast via `announce()` (05:1302), appending
  «Доступна отмена» when an undo action is present. Toasts are announced.
- **13 static modals** open via `openModalWithFocus` (05:1335): move focus to the
  first focusable child, install a Tab/Shift-Tab **focus trap**, and **return
  focus to the trigger** on close (`closeModalWithAnim`, 05:1368). Runtime-verified
  on the deadline modal: Tab ×25 never escaped; Esc returned focus to the exact
  chip. `role=dialog aria-modal=true aria-labelledby=…` on all of them.
- **Dropdowns**: `role=listbox aria-haspopup=listbox aria-expanded` on group/
  weekday/month/sort; `aria-activedescendant` is set on the active option
  (03:1129).
- **Icon-only buttons**: 389 of 509 buttons are icon-only; **387 carry a `title`
  or `aria-label`** (Russian, role-descriptive — «Отправить в архив»-class, never
  «Кнопка»). Only **2** are nameless (the segmented-input `stepper-btn` hourglass
  steppers — fold into V2-B1-22).

**Gaps (findings):**
- **Quarantine overlay** (V2-B5-04) — the one modal built by hand
  (`openQuarantine`, 11:597), NOT via `openModalWithFocus`: `role=dialog
  aria-modal=true` but **no `aria-labelledby`** (its `<h3>` has no id), **focus is
  not moved in**, **no focus trap**, and **Esc does not close it** (the overlay
  has no `id`, so the global Esc handler's `dismissModalById(undefined)` is a
  no-op, and the overlay has no own key handler). Runtime-confirmed: `focusInside:
  false`, `escClosed: false`, `labelledby: null`.
- **No `<main>` landmark; no heading spine** (V2-B5-05) — runtime: `main`=0,
  visible headings = just `H1:DUSK` (the brand). 0 `<h2>`. The task list, groups,
  archive, and Grimuar surfaces carry no headings; a screen-reader user gets one
  h1 and no section navigation (WCAG 1.3.1 / 2.4.1).
- **`role=menu` without operability** on the float-menu family (snooze/task-more/
  etc.) — the ARIA role is present but there is no arrow-key navigation and focus
  is not moved into the menu. This is the **a11y facet of V2-B4-02** (which owns
  the structural fix); recorded here as a one-line reference, not re-scored.

---

## §3.1 Keyboard-only pass (findings)

- **Focus trap + return: healthy** on all 13 static modals (verified).
- **Collapsed «Параметры» panel exposes 40 focusable controls** (V2-B5-02) — the
  panel is collapsed with `max-height:0; overflow:hidden` (NOT `display:none` /
  `visibility:hidden` / `inert`), so its 40 controls (priority grid, 11 color
  swatches, group picker, deadline trigger, note input, 5 repeat buttons, subtask
  input, pin, template) stay in the tab order and accept focus while clipped to
  0px. Runtime: focus landed inside a height:0 panel; the Tab circuit walked all
  40 *before* reaching the «Параметры» button that reveals them (WCAG 2.4.3 focus
  order + 2.4.7 focus visible — the focused control is off-screen). Also hits
  mobile (B1 didn't catch it).
- **Text inputs have no visible focus indicator** (V2-B5-03) — `#input-box`,
  `#search-box`, `#task-note`, `#form-sub-input`, `#notes-search-box`, modal
  inputs: on focus, `outline:none`, border unchanged, no box-shadow ring
  (runtime: `ringAppeared:false`, `borderChanged:false`). Buttons DO get the
  purple token ring (B4 baseline); inputs get only the native caret (WCAG 2.4.7).
- **Logical order otherwise sound** — nav → input → params → toolbar; the 2-col
  subtask grid follows DOM order left→right (no visual/DOM mismatch found).

---

## §3.5 Reduced-motion matrix (`prefers-reduced-motion: reduce`)

| Surface | under `reduce` | verdict |
|---|---|---|
| task-item enter, app-glow | anim none/0s | ✅ replaced |
| overdue deadline pulse | anim none/0s | ✅ replaced |
| sync-eye FAB, snooze popover | anim none/0s | ✅ replaced |
| group collapse container | transition none/0s | ✅ replaced |
| candle/progress | anim none/0s | ✅ replaced |
| **toast** | **anim `toastAppear` 0.30s** | ❌ **still animates — V2-B5-07** |
| ember (subtask prio) | not measured (selector miss) | — carried |

`toastAppear` (style.css:1631) is `translateX(-50%) translateY(12px) scale(0.88)`
→ transform, not opacity — so it is a *motion* that survives `reduce` (the
directive's rule: motion must be **replaced**, opacity-only fades acceptable).
Low severity, single element; overlaps B7 (motion), recorded here as the §3.5
result. B1's finding that **50** `prefers-reduced-motion` blocks exist is
confirmed — coverage is otherwise thorough; the toast is the lone slip.

---

## §3.6 Zoom / find-bar / tap

- **200% zoom** (1280×720 + `zoom:2` = 640px effective): **no horizontal scroll**
  (`scrollW==clientW`), toolbar + nav reachable (`D-zoom200.png`). Pass — no finding.
- **Find bar**: `/` focuses tasks search, `Ctrl+F` focuses notes/archive search;
  filtering works (query «ритуал» → 1 task; «zznotexist» → 0). **Tasks** show a
  gothic «Ничего не найдено» empty state; **Grimuar** shows only a «Найдено · 0»
  counter with a blank list body — no empty-state voice (V2-B5-09). Neither
  search input is cleared by Esc (minor; folded into V2-B5-09).
- **Tap census**: owned by V2-B1-09 (mobile: 410/587 <44px, 88 <24px). Desktop
  fine-pointer is not the risk surface; not re-run (ROI). The 2 nameless
  seg-steppers (§3.3) are also the sub-24px offenders in V2-B1-09.

---

## §3.7 Workflow action-cost (UX efficiency)

| Task | mouse path | keyboard path | quick-add path | note |
|---|---|---|---|---|
| Add task + high prio + deadline | ~7 (expand params → prio → deadline modal → mode → time → save → add) | N, type, then P + L modals | **1 line**: `текст !высокий %завтра` | quick-add is 5–7× cheaper — but `!высокий` is BROKEN (V2-B1-11) and the hint that teaches it is aria-hidden (V2-B5-10) |
| Complete task | 1 click | X (after J) | — | parity |
| Snooze overdue | hover→snooze icon→pick (3) | — (no snooze hotkey) | — | snooze icon only on deadline tasks, hover-revealed |
| Archive | hover→archive icon (2) | Del (after J/K) | — | parity |
| Restore from archive | archive tab→restore btn (2) | archive J/K then… no key | — | restore has no hotkey (buttons only, by design — never lose data) |
| Create note | Grimuar tab→Начертать (2) | N (on notes) | — | parity |
| Find note by text | Grimuar→search→type | Ctrl+F→type | — | parity; но notes empty-state mute (V2-B5-09) |
| Resolve 1 conflict | eye FAB→(open panel)→quarantine→restore/dismiss (3–4) | — (Esc doesn't even close it, V2-B5-04) | — | no keyboard path at all |

No mouse path is >2× the keyboard path *with a hidden fast path* except quick-add
(covered by V2-B5-10 + V2-B1-11). Snooze/restore/conflict have no keyboard path,
but that is deliberate for the destructive/data ones.

---

## §4.1 Power-feature discoverability matrix

Frame: a user who read neither code nor docs. (a) affordance on the relevant
surface? (b) does it name the outcome? (c) any way to learn without the code?

| Feature | Visible path(s) | Verdict |
|---|---|---|
| Quick-add `!`/`*`/`%` | `#qa-syntax-hint` appears on input focus (`*тег %дата !приоритет`) | **buried+a11y-blind** — `aria-hidden=true`, occluded by mobile keyboard (V2-B5-10); `!высокий` also broken (V2-B1-11) |
| Typeahead | self-revealing as you type a trigger | ✅ good |
| Hotkey S / all hotkeys | hint bar via `#btn-shortcuts-toggle` (keyboard icon, tasks toolbar) | ◑ one toolbar path; incomplete + Grimuar unhinted (V2-B5-06) |
| Snooze | titled `btn-snooze` icon, only on deadline tasks, hover/touch-revealed | ◑ half (icon + title, no label) |
| Templates | «Сохранить как шаблон» (params row + more-menu) + templates modal | ✅ named |
| Duplicate | more-menu «Дублировать задачу» + D | ✅ |
| Promote/Demote | more-menu «Сделать подпунктом» / «Понизить» | ◑ buried in more-menu |
| Split active/completed subs | `btn-sub-anymode` + sub toggle | ◑ toolbar, cryptic icon |
| Focus mode | click a group to focus | ◑ non-obvious (no affordance names it) |
| Schedule / color-filter / bulk-select | titled toolbar buttons | ✅ named |
| Grimuar летопись/TOC/wiki/templates/перенос/.md | editor toolbar (hover-revealed) | ◑ titled icons, hover-gated |

Most features have **one titled path**; the genuine gaps are the quick-add hint
(V2-B5-10) and the hotkey docs (V2-B5-06). No feature is fully undiscoverable.

## §4.2 Mental-model consistency

- **Two "repeat" concepts (V2-B5-08).** `task.repeat` (daily/weekly/… via the
  **Repeat modal**, R / ouroboros, driving `cycleChecked`/`nextReset`) and the
  **deadline auto-repeat** toggle (`#dl-repeat-toggle` inside the deadline modal,
  default OFF, coupling time→daily / weektime→weekly / monthday→monthly). Both
  speak "повтор" to the user; nothing explains that one recurs the *task* and the
  other recurs the *deadline*, or why a deadline can be "rhythmic" without the
  task repeating. Needs a one-line explainer in the deadline modal
  («Повторять сам дедлайн — задача не станет повторяющейся»). **[RATIFY-FABLE]**
- **Delete ladder — CORRECT (positive).** `removeTask` («В архив», archive glyph)
  is neutral; only `deleteTaskForever` («Удалить навсегда», skull) carries
  `.danger` (red on hover). Group delete cascades with a two-step confirm toast.
  Danger-red is reserved for the truly permanent. No finding — a healthy pattern.
- **Sync-eye states** — closed/open/animated map to offline/idle/syncing but are
  never labelled in text; meaning lives only in the panel. §9 locks the quiet-eye
  design; legibility is acceptable (the panel + the toast on manual/error carry
  the words). Report-only.
- **Три вкладки (Задачи ↔ Архив ↔ Гримуар)** behave as one model for J/K/N and
  select-mode; the divergence is terminology (Архив vs Склеп — V2-B5-11) and the
  empty-state voice gap (V2-B5-09).

## §4.3 Toast truthfulness — CLEAN

Full census (79 call sites across `dusk/*.ts`) reviewed against the actual
mutation. **No misleading text found.** The register is consistent, active-voice,
no «Oops», no exclamation marks («Задача добавлена», «Дедлайн отложен …»,
«Группа удалена со всеми задачами», «Склеп опустошён»). `showToast(msg,{undo})`
extends the auto-hide to 5s and its «Отменить» button calls `undo()` — truthful
for every call site that also pushed an undo snapshot. One thing to VERIFY in B6
(not a copy finding): that every `{undo:true}` site actually pushed an undo entry
before the toast, else «Отменить» would pop the *previous* action — carried to B6.

## §4.4 RU copy quality

**Terminology table (cross-app):**

| Concept | Tasks side | Grimuar side | verdict |
|---|---|---|---|
| soft-delete store | **Архив** / «В архив» / «Архивировать» | **Склеп** / «В склеп» / «Склеп опустошён» | divergent (V2-B5-11) |
| create | «Добавить» / «создать» | «Начертать» | divergent register |
| record | «задача» / «заметка» (task note) | «запись» / «заметка» | «заметка» overloaded (task-note vs note) |
| permanent delete | «Удалить навсегда» | «Уничтожить» / «Удалить навсегда» | mixed |
| restore | «Восстановить» / «Возвращена» | «Возвращена» / «Восстановить» | consistent ✅ |

The Архив/Склеп split is likely deliberate flavor, but it means the same action
has two names across tabs (V2-B5-11, low). «заметка» meaning both a task's memo
AND (loosely) a Grimuar note is the sharper ambiguity. ё-usage is consistent
(«чёрные», «Ещё»); «ёлочки» quotes used throughout (good); long dash used
correctly.

**Quarantine humane label map (delivers V2-B4-07 — implementation-ready).**
Current `_entryWhat` (11:568) leaks raw field names: **«поле «text» — «…»»**.
Replace with a `(recType, field) → RU` map:

| kind / recType / field | current | proposed RU |
|---|---|---|
| field / task / text | поле «text» | **Заголовок задачи** |
| field / task / note | поле «note» | **Заметка задачи** |
| field / task / deadline | поле «deadline» | **Дедлайн задачи** |
| field / task / priority | поле «priority» | **Приоритет задачи** |
| field / task / color | поле «color» | **Цвет метки** |
| field / group / name | поле «name» | **Название группы** |
| field / note / title | поле «title» | **Заголовок записи** |
| field / note / body | поле «body» | **Текст записи** |
| subtask / task | подпункт в «…» | **Текст подпункта — в «…»** |
| delete-vs-edit | удалённая запись «…» | **Удалена при правке на другом устройстве — «…»** |
| note-both | заметка изменена… | **Запись изменена на двух устройствах — сохранены обе версии** |

Also reframe the two column verbs: «победитель/проигравший» → the panel already
uses «Восстановить»/«Отклонить» (good); keep, but the loser preview header should
read **«Заменённая версия»** not «проигравшая». (B6 owns the `jq3` «пусто»
loser-rendering check — see V2-B4-07.)

## §4.5 Empty-state voice candidates (delivers into V2-B2-04)

Tasks side (mirror Grimuar's book+voice structure), user picks final lines:
- **No tasks (first run):** unlit-candle glyph + «Пока пусто» / subline «Зажгите
  первую задачу.» (or «Список ещё не начертан.»)
- **All done:** burnt-down candle + «Всё свершено» / «Ни одной незавершённой.»
- **Filter-empty:** «Под этим фильтром пусто» / «Ничего не подходит.»
- **Search-empty (tasks — replace the flat «Ничего не найдено»):** «Ничего не
  найдено» + subline «Поиск не нашёл совпадений.» — and **add the same to the
  Grimuar** (currently only «Найдено · 0», V2-B5-09).
- **Archive-empty:** coffin/crypt niche + «Архив пуст» / «Здесь покоятся
  завершённые задачи.»

---

## Root causes (§7)

1. **Chrome built function-first** (echoes B2-01/B4-02): the quarantine overlay,
   the collapsed-panel technique, and the input focus styling were each authored
   in isolation without inheriting the modal-a11y helper / a focus-token / an
   `inert` discipline. A **shared modal+popover primitive** (the V2-B4-02 utility
   + V2-B2-01 skin) would have made `openModalWithFocus`, the focus ring, and
   `inert`-on-collapse automatic — closing V2-B5-02/03/04 as a side effect.
2. **Docs decoupled from behavior**: the hint bar is a hand-maintained HTML string
   (index.html:1501) that drifted from the handler (Ctrl+F/F3/Esc added later,
   never back-ported; Grimuar map never documented). A generated hint from the
   key table would stay truthful.
3. **One dim-text token** (~#9068C0) tuned to sit *just* above AA on the card;
   it has no headroom for the bright bg-image regions and reads dim (V2-B5-12) —
   the DESIGN-PLAN §2.2 OKLCH re-derivation should lift it one step.
4. **Two overlapping recurrence systems** (task-repeat vs deadline-auto-repeat)
   grew independently (X-8 added deadline auto-repeat later) and were never
   reconciled in the UI vocabulary (V2-B5-08).

## Fix strategy (maps to DESIGN-PLAN phases)

- **D1 (foundations)**: lift the #9068C0 token (V2-B5-12); unify overdue text on
  the brighter #E03060 red that already passes (V2-B5-01) — keeps danger-red
  semantics (§9), just raises luminance; token a focus-visible ring and apply to
  inputs (V2-B5-03); global-hint generation (V2-B5-06).
- **D2 (popover/modal engine + skin)**: route the quarantine overlay through
  `openModalWithFocus` (label + trap + return + Esc) (V2-B5-04); `inert` the
  collapsed «Параметры» panel (V2-B5-02); add `role=menu` keyboard nav (the
  B4-02 utility already scoped).
- **D7 (voice & readability)**: quarantine humane labels (V2-B4-07 map above);
  empty-state set incl. the Grimuar search-empty (V2-B5-09, V2-B2-04);
  terminology reconciliation (V2-B5-11); repeat-model explainer (V2-B5-08).
- **D8 (motion)**: neutralize `toastAppear` under `reduce` (V2-B5-07).
- **Landmarks/headings** (V2-B5-05): wrap the page body in `<main>`, add visually
  styled section headings (or `aria-label`led regions) — cheap, do with D1.

## Cross-app (feeds B13)

- Grimuar leads on empty-state voice; Tasks leads on nothing here — the Grimuar
  search-empty is the one place Tasks is ahead (it has a message; Grimuar doesn't).
- Both apps share the quarantine overlay, the float-menu a11y gap, the input
  focus-ring gap, and the dim-text token → each fix serves both.
- Terminology (Архив/Склеп, Добавить/Начертать) is the main cross-app seam.

## Ideas (high-value, low-cost)

- Generate the hint bar from the key table (kills doc drift permanently).
- A single `dialog`/`popover` primitive would retire 4 of these findings at once.
- A "?"-key overlay that lists BOTH the tasks and Grimuar hotkeys per current page.

## Probe-artifact ledger (per B1/S2 discipline)

- **Archive "unreadable" (B2-05) = artifact of assumption**, not measurement:
  5.82:1 passes AA; the issue is the strike decoration/hue (reframed above).
- **Warn callout in the seed rendered unstyled** — the seed used `class="grim-callout"`
  but the app's real class is `.grim-co.grim-co-warn`; the sanitizer/renderer
  dropped the unknown class. NOT a bug: injecting the correct markup rendered +
  measured ~5.2:1. (Whether loading a *stored* callout preserves its class is a
  B6/B11 sanitization question — carried, not a B5 finding.)
- **Hotkey probe #3 self-contaminated**: `Escape` clears `_focusedTaskId`, so
  P/L/M/R/D/T appeared to "fail" after an Esc; a clean re-nav (probe #4) confirmed
  every key works. Recorded so the false-negative isn't re-chased.
- `showPage('archive')` is a no-op; the real nav fn is `switchPage('archive')`
  (used in the corrected probe).
- Notes empty selector: the message element genuinely does not exist (only the
  «Найдено · 0» head) — confirmed, that IS V2-B5-09, not a selector miss.
