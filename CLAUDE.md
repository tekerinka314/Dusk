# DUSK — task journal

A single-page, offline-first gothic task manager (PWA). Plain vanilla JS — no
framework, no build step. Source files:

- `index.html` — markup, all modals, inline SVG icons, SVG `<symbol>` defs.
- `app.js` — all logic (state, rendering, repeats/cycles, drag-and-drop via
  SortableJS, deadlines, archive, import/export). ~14.3k lines. State persists to
  `localStorage` under `duskState_v3`.
- `style.css` — all styling and animations.
- `pen-asset.js` — the «Звук пера» base64 audio sample, extracted from `app.js`
  (D-3). MUST load via its own `<script>` **before** `app.js` (sets
  `window.PEN_ASSET`). Decoded in-memory via `atob` (no `fetch`), so the pen
  sound works fully offline from a `file://` page with no server.

## Design & UX — gothic aesthetic is MANDATORY

The gothic aesthetic is a hard requirement for **all** design and UX, not an
optional theme. It applies to every icon, glyph, button, control, hover effect,
state, animation, and empty state. When adding or changing anything visual:

- **Icons / glyphs:** hand-drawn gothic SVGs only (coffins, lancet arches,
  swords, crosses, hourglasses, runes, ouroboros, crescent moons). Never use
  emoji, generic Material/Feather icons, or a plain chevron where the rest of
  the app already uses a motif. Example: dropdown "chevrons" are the **gothic
  sword** glyph (`.dl-month-chevron`) — reuse that exact SVG, don't invent a new
  one or fall back to `<polyline points="6 9 12 15 18 9"/>`.
- **Reuse existing motifs:** before drawing a new icon, find where the same role
  is already represented and reuse that glyph so the language stays consistent.
- **Palette:** dark violet/purple on near-black (`--bg-*`, `--accent-*`,
  `--border-*`, deadline status vars). No alien colours; danger red is the only
  warm accent and only for destructive/over-deadline states.
- **Motion:** transitions use the shared `--ease-*` / `--dur-*` tokens. Movement
  is smooth and deliberate (fades, seals, slide-outs) — no abrupt
  appear/disappear, height jumps, or content shoving. Respect
  `prefers-reduced-motion`.
- **Controls:** buttons/affordances should feel integrated (e.g. the tag clear
  button slides out from inside the pill, sharing its background — never a
  separate bordered box).

When in doubt, match the surrounding code's existing gothic idiom rather than
introducing a new style.

## Working notes

- Keep changes surgical; preserve existing UX, logic, and the gothic style.
- Subtask lists render in a 2-column grid (single column on mobile) and support
  a split active/completed mode; DnD must keep working in every mode.
- Recurring items use `cycleChecked` + `nextReset`; `checkCycleResets()` (2s
  timer) auto-returns them to active at the reference point.
- Subtask outline is an inset `box-shadow` (NOT a 1px `border`) — a hairline
  border drops out on fractional-width grid items; the grids use
  `minmax(0,1fr)` + a 2px right inset so the outline never gets clipped.
- Subtask priority is shown by a soft glowing "ember" accent (`::before`,
  coloured via `--sprio`), not a hard left bar.

## Audit & extensions (June 2026) — DONE, DEFERRED, and the forward plan

A full code audit was run and acted on. Everything below is on branch
`fix/ui-repeat-meta-subtasks` (pushed to origin). Read this before planning new
work so deferred items aren't accidentally redone or forgotten.

### Already DONE this session (do NOT redo)
- **Bug fixes (commit 8637bf9):** C-1 archive→restore lost fields → single
  `taskFromArchive()` helper preserves all fields; C-2 the ambient card glow was
  a duplicate `.todo-app::after` → moved to a dedicated `.app-glow` child; plus
  V-1 colour filter in schedule mode, V-2 empty-state under colour/focus filter,
  V-3 service worker now stale-while-revalidate + "new version" toast, V-4 import
  validates colour, V-5 single undo for subtask→parent auto-complete, V-6
  undefined CSS vars, V-7 weektime deadline auto-weekly, M-2 coffin seal plays
  before row leaves, M-4 extra-fields `max-height:none` after transition ends,
  and minor D-1/D-2/D-4/D-5.
- **Polish (commit 0cfbd2c):** shared `--ease` tokens on row enter/leave; gothic
  sword chevron in archive months; synced critical-deadline pulse; aria-labels on
  colour swatches + `aria-activedescendant` on dropdowns; coarse-pointer (touch)
  reveals actions + bigger tap targets; **`renderListOnly()`** partial render for
  hot paths (check/pin/priority/colour) + lazy subtask Sortable (~2× faster on
  200 tasks = the M-5 perf item); deep-clone in bulkArchive.
- **Extensions (commits 178b5d2, 5bc075c, 09dab2f, c1fe947):** Undo-in-toast;
  Snooze (per-task deadline quick-postpone); Duplicate group; Task templates
  (`state.templates`); Promote/Demote (subtask⇄task); Quick-add inline syntax +
  interactive typeahead dropdown.

### DEFERRED — agreed to do as a LATER, separate stage (with detail)
These were explicitly postponed (the user chose "later" for each). They are NOT
abandoned — they form the next planned block. Do them roughly in this order and
ONLY when the user greenlights the "refactor stage":

1. **Idea 8 — data-layer refactor = the real sync foundation (HIGHEST priority
   of the deferred block).** Replace incremental int ids (`nextId`/`nextGroupId`/
   `nextSubId`) with stable string ids (`crypto.randomUUID()`); add per-record
   `updatedAt`; make deletion a soft-delete **tombstone** (`deletedAt`) instead of
   array removal; migrate old state (int→uuid) in `migrateTasks`. This removes the
   fragile id-offset in merge-import and is platform-agnostic. High blast radius
   (touches nearly every `find(t=>t.id===...)`, DnD, archive, undo) → needs a
   sweep + thorough data-safety tests. This is step 1 of the **Sync** section below.
2. **7c — modular split + event delegation.** `app.js` is a ~14.3k-line monolith
   wired with inline `onclick=` (forces all handlers global, invites XSS-class
   bugs). Plan: convert handlers to `data-action` + delegation from the list root,
   split into modules (state, render, deadlines, repeats, subtasks, dnd, modals,
   widgets, quick-add). High regression risk; this is the "rewrite" CLAUDE.md says
   not to start without an explicit go. Logically paired with the Svelte migration
   (roadmap #1).
3. **7a — unified `commit(mutator)` helper** (`pushUndo`+`saveState`+`render`,
   used in ~30 places). Low-risk but broad churn; only worth doing as part of 7c.
4. **6a — unify all collapse/expand onto `grid-template-rows: 0fr↔1fr`** (groups,
   subtask-section, extra-fields, archive months). The BUGS it would fix (M-3/M-4/
   D-3) are ALREADY fixed pointwise, so what remains is a pure refactor of four
   tuned animations — risky for little gain; do it during the refactor stage.
5. **Idea 5 — calendar view** (third page, monthly grid of deadlines). Large new
   surface (markup + responsive + gothic grid). Own block, later.
6. **Idea 2 — streak counter** for recurring tasks. Postponed (gothic-ascetic fit
   doubts). (The old dead `Streak counter` CSS stub has since been removed.)

### Product decisions made this session (keep consistent going forward)
- **Quick-add trigger symbols:** `!` = priority, and (per user) tags use **`*`**
  and dates use **`%`** (replacing the original `#`/`~`). Tag highlighting,
  `extractTags`, tag cloud and `filterByTag` all key off the chosen tag symbol.
- **Deleting a group also deletes its tasks + subtasks** (was: orphan to
  ungrouped). The two-step confirm toast must warn that contents go too.
- **Never lose data** stays the #1 product rule (drives undo-in-toast, taskFromArchive, the tombstone plan).

### Forward plan (order)
First finish the current polish/feedback pass on the existing app. Then, when the
user says to start the refactor stage: **Idea 8 data-layer (uuid+updatedAt+
tombstones) → 7c modular split (+7a commit, +6a collapse) → then Sync (Google
Drive appDataFolder) → then Capacitor/Tauri wrappers → optional Svelte/Vite/
IndexedDB migration.** The Sync section below is the destination; the data-layer
refactor is its prerequisite and the first concrete step.

## How the user works with me (preferences — this session)

- **Language:** communicate in **Russian**.
- **Right now the only job is polishing the EXISTING DUSK.** Do NOT start the
  sync / Android / Windows / rewrite work until explicitly told to begin.
- **Verify before declaring done.** The user reviews every visual change himself
  in the running app. For visual/subjective/risky changes, describe what changed
  and let him confirm before (or instead of) committing. He'll say when to commit.
- **Token-budget aware.** When budget is low, prefer small, well-reasoned,
  targeted edits over heavy browser-probing; change one thing at a time.
- **Git:** active branch `refactor/sync` (switched 2026-06-26; this is now the
  working branch for all forward work — do NOT ask which branch). Tag
  `v1.86-stable-core` = the pre-refactor stable snapshot (rollback point). The old
  `fix/ui-repeat-meta-subtasks` is frozen history. Remote `origin` =
  github.com/tekerinka314/Dusk. Commit (with the `Co-Authored-By` trailer) and
  push only when asked. Branch off the default branch rather than committing to it.
- The user is a **beginner in backend/sync/infra** — explain in plain terms and
  ask clarifying questions rather than assuming.

## Roadmap & future direction (discussed, NOT started)

Three future goals, best treated as ONE project with a shared web core:
1. Migrate to a modern stack (TypeScript + a light reactive framework like
   Svelte + Vite + IndexedDB). **Optional** — justified by maintainability, not
   speed. Only worth doing as the foundation for #2/#3, and migrate once.
2. **Android app** via **Capacitor** (reuse web code). **Sideload APK is enough
   — no Google Play account/release needed.**
3. **Windows 11 app** via **Tauri** (tiny native binary, reuse web code).

Context/scope: personal use; maybe a couple of friends test it; **maybe** a
public GitHub repo later (mostly for résumé) — public users not seriously
expected. The real work is **sync**, not the platform wrappers.

## Sync — decided approach & hard requirements

**Chosen design:** local-first data model + sync through the user's OWN cloud file.
- **Data model:** per-record `updatedAt` timestamps + soft-delete **tombstones**,
  merged **per task** (NOT whole-file last-write-wins, which loses data). First
  concrete build step = this data-model refactor; it's platform-agnostic and done
  in the current codebase.
- **Sync channel:** a single small file in the user's **Google Drive**
  (`appDataFolder`). **Google Drive is the choice — Dropbox rejected (too many
  ads).** Each person uses their own Google account → independent data for free.
- **Conflict handling:** default **last-write-wins**, but **ASK the user** on a
  same-task conflict (include the prompt from the start).
- Same sync client is reused by web, Android (Capacitor) and Windows (Tauri).
- Keep the existing manual **export/import** as a no-login fallback.

**Hard requirements (from the user):**
- **Never lose data**, including when changing/losing devices (old phone → new
  phone, new PC, etc.). Device portability is the #1 requirement.
- **Fully functional offline** (local copy is the source of truth; cloud is just
  the sync/backup channel).
- Works over the **internet incl. mobile data — NOT tied to one Wi-Fi/LAN**
  (this rules out Syncthing/peer-LAN approaches).
- **Zero cost, no always-on server, no paid tiers.**
- "Syncs when I open the app" (eventual) is fine — realtime not required.
- Privacy is NOT a priority; durability + portability are.

**Known OAuth caveats to plan for:** Google shows an "app isn't verified" screen
— fine for personal use via OAuth **Testing** mode + added test users; full
Google verification is only needed if going truly public. Also: token
storage/refresh per device, slightly different OAuth flow per platform, and a
one-time (free) Google Cloud Console OAuth-client setup.

## Resuming a session (for the user)

Conversations persist on disk. Run `claude` from the project folder, then
`claude --continue` (latest) or `claude --resume` (pick from a list). Transcripts
live in `C:\Users\serge\.claude\projects\D--VSCode-projects-DUSK-1-86\`.
