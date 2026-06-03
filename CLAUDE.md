# DUSK — task journal

A single-page, offline-first gothic task manager (PWA). Plain vanilla JS — no
framework, no build step. Three source files do everything:

- `index.html` — markup, all modals, inline SVG icons, SVG `<symbol>` defs.
- `app.js` — all logic (state, rendering, repeats/cycles, drag-and-drop via
  SortableJS, deadlines, archive, import/export). State persists to
  `localStorage` under `duskState_v3`.
- `style.css` — all styling and animations.

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

## How the user works with me (preferences — this session)

- **Language:** communicate in **Russian**.
- **Right now the only job is polishing the EXISTING DUSK.** Do NOT start the
  sync / Android / Windows / rewrite work until explicitly told to begin.
- **Verify before declaring done.** The user reviews every visual change himself
  in the running app. For visual/subjective/risky changes, describe what changed
  and let him confirm before (or instead of) committing. He'll say when to commit.
- **Token-budget aware.** When budget is low, prefer small, well-reasoned,
  targeted edits over heavy browser-probing; change one thing at a time.
- **Git:** active branch `fix/ui-repeat-meta-subtasks`; remote `origin` =
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
