# DUSK — task journal

A single-page, offline-first gothic task manager (PWA). Vanilla JS built with
**Vite** (migration Этап 2 done 2026-07-02; TypeScript = Этап 3, next). Layout:

- `index.html` — markup, all modals, inline SVG icons, SVG `<symbol>` defs.
  Vite entry; loads `src/main.js` as the only module script.
- `src/main.js` — entry: side-effect imports of the 12 dusk modules in the
  EXACT legacy order (order is the load-bearing contract). `src/sortable-global.js`
  publishes npm `sortablejs@1.15.2` as the `Sortable` global BEFORE dusk modules.
- `dusk/01-core.js … 12-sync-wake.js` — all logic, split by section (7c). ES
  modules that share state via **globalThis bridges** (migration 2a): top-level
  `let/var` are written as `globalThis.*` (single slot, no split brain);
  functions are re-exposed on globalThis at file TOP (classic hoisting
  semantics), consts/classes at file END (TDZ). The modules do NOT import each
  other. 09/10 keep a `module.exports` footer → requireable by node tests.
  State persists to `localStorage` under `duskState_v4` (v3 kept frozen).
- `style.css` — all styling and animations (bundled by Vite, emitted unhashed
  as `style.css`; bg-gothic.jpg is 284 KB, resolved from public/ at runtime).
- `public/` — runtime-fetched statics copied verbatim to dist: `sw.js`,
  `version.json`, `manifest.json`, icons, `bg-gothic.jpg`, `pen-asset.js`,
  `_headers`.
- `public/pen-asset.js` — the «Звук пера» base64 audio sample. Classic script
  tag BEFORE the module entry (sets `window.PEN_ASSET`); decoded via `atob`.
- `tests/` — vitest: `npm test` = native vitest tests (sync merge 39, GC 13,
  cloud transport 24, worker OAuth 17 — dusk modules loaded via side-effect
  import + globalThis bridges, so they survive the `.ts` rename) + Drive
  wire-format pin (fixtures — breaking the sync JSON shape fails here, not
  silently in the cloud).
- `scripts/build-portable.mjs` — `npm run build:portable` → `dist/dusk-portable.html`
  (~1.4 MB, fully inlined single file, runs from disk via file:// — the
  no-server fallback; its data lives in the file:// origin's own localStorage).
- `worker/` — Cloudflare Worker (OAuth exchange/refresh + WebSocket wake). Not
  part of the Vite build; deployed separately with wrangler. Don't touch it in
  the migration.

Commands: `npm test` (vitest), `npm run dev` (Vite dev server), `npm run build`
(→ dist/, stable names `app.js`/`style.css` — the hand-rolled network-first
`sw.js` precaches by exact name, CACHE `dusk-shell-v8`), `npm run preview`.

## Skill usage — auto-invoke BEFORE responding (MANDATORY)

Before starting any substantive **task** (a real unit of work — implement, debug,
design, research, review, configure), run this cycle (user-mandated 2026-07-17;
also recorded in memory `skill-cycle-mandatory`):

1. **Scan ALL installed skills** — the full list already in this session's
   context (names+descriptions cost no extra tokens; a body loads only when it
   fires). Never work from a remembered shortlist; re-scan per task, including
   skills added or updated mid-session.
2. **Load EVERY skill that would genuinely add value to THIS task — not just
   the single best fit.** A design task may need `impeccable` + a typography
   skill + a review skill together; load all of them. The bar is "would its
   content actually change or improve the work", not "is it the topical match".
   Process skills (brainstorming, systematic-debugging, writing-plans) fire
   before implementation skills.
3. **Gap → `find-skills` (MANDATORY).** If step 1 found no skill (or a weak
   one) for some aspect of the task, invoke `find-skills` to search for one.
   Found something valuable → install it, then feed it back through this same
   cycle (scan → load-all-applicable) before proceeding.
4. State which skills you invoked and why (one line).

Follow the `using-superpowers` discipline: if there's a real chance a skill
applies, invoke it before responding, including before clarifying questions.

"Task" ≠ every message. Skip the cycle for conversational replies, trivial
one-liners, quick factual answers, and chit-chat — anything with no code, design,
research, or config surface. One request may contain several tasks; judge per task.

The mappings below are **illustrative examples only**, not the allowed set:

- New feature / component / behavior change → `brainstorming` (MUST, before code).
- Any bug, test failure, unexpected behavior → `systematic-debugging` (before any fix).
- Implementing a feature or bugfix → `test-driven-development` (before writing impl).
- Multi-step task with a spec → `writing-plans`, then `executing-plans`.
- Any visual / UI / UX work → `impeccable` (gothic aesthetic below still governs).
- Before claiming done / committing → `verification-before-completion` + `verify`.
- Reviewing a diff / branch / PR → `code-review` (or `caveman:caveman-review`).
- Don't know / can't find the right skill → `find-skills`.

These examples don't cover every skill — many others exist (research, docs,
Cloudflare/infra, dataviz, typography, config, scheduling, etc.); consider them
all. If two skills overlap, pick the most specific; process skills (brainstorming,
systematic-debugging) run before implementation skills. State which skill you
invoked and why. Skip only for trivial one-line answers with no code, design, or
research surface.

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
  github.com/tekerinka314/Dusk (**PRIVATE since 2026-06-29**). **Commit + push
  AUTOMATICALLY after each finished unit of work** (changed 2026-06-28 — updates
  reach the user only via push→hosting, so don't wait to be asked), with the
  `Co-Authored-By` trailer. Bump `version.json` (BUILD) as part of every deploy
  commit (drives the in-app "update available" toast). Branch off the default
  branch rather than committing to it.
- **Hosting (changed 2026-06-29; build settings changed 2026-07-02):** the app
  is served from **Cloudflare Pages — `https://dusk-du4.pages.dev`**
  (git-connected to this repo, production branch `refactor/sync`; **build
  command `npm ci && npm run build`, output `dist`** — flipped for the Vite
  migration; a FAILED build keeps the last successful deploy live, so broken
  pushes never take the site down). Non-production branches get preview URLs
  (`<branch>.dusk-du4.pages.dev`); sync OAuth does NOT work on preview origins
  (Google redirect URI + worker ALLOWED_ORIGIN list only the prod origin). A
  push auto-deploys in ~20-30 s →
  the update toast lands in ~10 s (vs minutes on GitHub Pages). The old GitHub
  Pages (`tekerinka314.github.io/Dusk/`) is RETIRED (repo went private → free
  GitHub Pages stopped). The sync OAuth/refresh proxy + cross-device WebSocket
  wake run on a Cloudflare Worker (`dusk-sync.petrehundima.workers.dev`, source in
  `worker/`); its `client_secret` lives only as a Worker secret. `ALLOWED_ORIGIN`
  in `worker/wrangler.toml` must list the app origin (now just the pages.dev one).
- The user is a **beginner in backend/sync/infra** — explain in plain terms and
  ask clarifying questions rather than assuming.

## Roadmap — migration IN PROGRESS (plan agreed 2026-07-02, see memory `migration-ts-vite-plan`)

Locked stack decisions (do NOT re-ask): **TypeScript + Vite + Vitest. Solid
REJECTED** (the hand-rolled render layer stays — rewriting it is max regression
risk for zero user value; a framework island only IF the optional calendar ever
happens). **Dexie REJECTED → `idb-keyval`** (state stays ONE blob — the sync
engine/undo/baseline operate on whole state; IndexedDB is for capacity +
Grimoire images later). Rollback tag: `v2.2-pre-migration`.

- **Этап 1 DONE** — vitest + node harnesses in `tests/` + Drive-format pin.
- **Этап 2 DONE (2026-07-02, user-verified on prod)** — 2a ES modules with
  globalThis bridges; 2c Vite build pipeline (npm Sortable, public/, stable
  names, sw v8); 2d portable single-file fallback.
- **Этап 3 IN PROGRESS — TypeScript, incremental.** Step 0 DONE (harnesses are
  native vitest tests; nothing spawns plain node anymore). Then tsconfig
  (loose → ratchet), `src/types.ts` per SYNC-SPEC §4, rename order:
  09-sync → 10-cloud → 12 → 11 → 01-core → rest; `tsc --noEmit` + vitest +
  build green per file, one commit per file. Don't touch worker/.
- **Этап 4** — localStorage → IndexedDB blob via `idb-keyval` (dual-write, LS
  copy never deleted, pre-migration snapshot, `navigator.storage.persist()`).
- **Этап 5** — Playwright smoke in-repo (replaces the external D:\tmp\pw
  harnesses; note `_swtest` asserts the OLD design — CDN Sortable + cache v7 —
  its 2 fails vs dist are expected).
- Then (separate "go"): **Android via Capacitor**, **Windows via Tauri** (both
  have official Vite templates; sideload APK is enough).

Context/scope: personal use; maybe a couple of friends test it; **maybe** a
public GitHub repo later (mostly for résumé) — public users not seriously
expected. The real work is **sync**, not the platform wrappers.

## Sync — decided approach & hard requirements

**Chosen design:** local-first data model + sync through the user's OWN cloud file.
Full Phase-1 engineering spec lives in `SYNC-SPEC.md` (repo root) — code against it.
- **Data model:** per-record `updatedAt` + soft-delete **tombstones** (Idea 8 done),
  merged **3-way** against a stored `baseline` (last-synced snapshot). NOT whole-file
  last-write-wins (loses data). Data-model refactor (Idea 8) is done; merge engine is
  Phase 1.
- **Merge granularity (DECIDED 2026-06-28):** **field-level** for tasks AND groups
  (independent field edits both survive; same field clash → newer wins); subtasks
  merged as a **set by uid** (two new subtasks both survive; same-subtask clash →
  newer, so subtasks gain their own `updatedAt`); notes merged **whole-record, keep
  BOTH copies** on conflict (no risky HTML text-merge). 3-way diff vs baseline is the
  conflict DETECTOR; the clock is only the tiebreaker.
- **Conflict resolution (DECIDED — supersedes the old "ASK the user"):** NO blocking
  prompts. Auto-resolve into live state (same field → newer; **delete-vs-edit →
  default DELETE**; note → keep both). The LOSING version is preserved in a synced
  **quarantine journal** (append-only, immutable, uid-keyed, merged by union; "resolved"
  flag by newer-wins). Pending entries persist **until the user chooses** (passive
  unobtrusive unresolved-count badge, no modal). Journal is SYNCED so a losing edit is
  recoverable on every device, incl. the one whose edit lost.
- **Clock (DECIDED):** monotonic number now — `updatedAt = max(Date.now(), lastIssued+1)`
  (cheap, keeps `updatedAt` a number, fixes clock-going-back / same-ms ties). Full HLC
  deferred (drop-in later if real clock problems appear).
- **Phase 4 GC — DONE (2026-06-29):** age-based pruning inside `mergeStates` (gated by
  `opts.gcNow` so the pure merge stays deterministic for tests). Tombstones older than
  90 days are dropped; RESOLVED journal entries older than 90 days are collected
  (UNRESOLVED kept forever until the user acts). Run on the merged OUTPUT every sync →
  both devices converge (a peer re-adding a stale tombstone is re-pruned next merge).
  `TOMBSTONE_TTL_MS`/`JOURNAL_TTL_MS` in `09-sync.js`; stats `gcTombstones`/`gcJournal`
  logged in the sync panel. Accepted trade-off: a device offline > 90 days holding a
  live copy of a since-deleted record could resurrect it.
- **Sync channel:** a single small file in the user's **Google Drive**
  (`appDataFolder`). **Google Drive is the choice — Dropbox rejected (too many
  ads).** Each person uses their own Google account → independent data for free.
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
live in `C:\Users\serge\.claude\projects\D--VSCode-projects-DUSK-v2-0\`.
