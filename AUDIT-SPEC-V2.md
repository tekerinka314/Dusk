# DUSK / Grimuar — Comprehensive Quality Audit, Spec v2

Rev 3 · 2026-07-07 · Branch: `refactor/sync` · Supersedes
`COMPREHENSIVE-QUALITY-AUDIT-SPECIFICATION-FOR-FABLE-5.md` (v1 = the original
brief, kept in the repo untouched). This document is the operating standard
for the entire audit.

**Execution history.** Phase 0 (spec) + Phase 1 (clarification) + the start of
B0 (repo reading through `dusk/12` and the whole sync stack) were done by
**Fable 5 (high)**; that model's usage limit was then exhausted. The audit is
continued by **Opus 4.8 (xhigh)** from mid-B0 onward. Rev 3 is Opus's revision.

**Rev 3 mandate (the reason this revision exists): remove every budget ceiling.**
The Fable session was written to survive an early hard stop on a single shared
usage limit, so rev 2 hedged depth against budget. That constraint is GONE. The
new doctrine (§3) is **maximum depth and maximum coverage on every batch**,
with the explicit goal of matching the exhaustiveness a top-tier Mythos-class
model (Fable 5) would have produced. There is no batch that gets "lean"
treatment; there is no tail that gets sacrificed. Budget is not a reason to cut
anything, ever. The only pacing rule that survives is: **persist as you go** (so
progress is durable and resumable), not because we expect to run out.

Rev 2/3 incorporate the user's Phase-1 answers:

- **Execution order follows the ORIGINAL v1 priority order** (mobile first).
  Reordering was proposed in rev 1 and explicitly declined by the user.
- **Mobile (B1) depth is the highest, and NO batch's depth is ever cut.** Every
  priority is taken to its exhaustive conclusion.
- **Persist everything**: after every batch, findings + implementation
  guidance go to disk and memory, so a hard stop at any point still leaves a
  complete, implementable record of everything audited so far.
- Environment: headless-local primary; the user's live Chrome whenever it
  materially improves finding quality. Real-Android guided checks: available.
- Audit docs are committed+pushed after every batch (no version.json bump —
  no app code changes, nothing to deploy).

**Completeness guarantee vs v1:** every audit dimension enumerated in v1 is
carried into §6 below as an explicit checklist item (the v1→v2 coverage map in
Appendix A proves it). v2 only *adds* dimensions, rules, and method; it
removes none. Where v1 listed a bare word ("scrolling"), v2 expands it into
concrete checks against this specific codebase.

---

## 1. Mission & non-negotiables

1. **Never lose user data** — the #1 product rule. It applies to normal
   edits, undo/redo, import/export, archive/restore, note history, sync,
   conflict resolution, migration, storage upgrades, device replacement,
   offline usage, cloud failures, and partial deployments. Any design, UX,
   architecture, or performance recommendation that creates a realistic risk
   of data loss must be rejected or redesigned before being written down.
   **Silent loss is worse than a visible error** — every batch actively
   hunts for silent data-loss paths.
2. **One ecosystem.** DUSK (tasks) and Grimuar (notes) are one product. They
   are never audited independently; every batch constantly compares them.
   When one app solves a problem better than the other, that is a finding.
   Cross-app consistency is a first-class audit category.
3. **Gothic identity is mandatory**, not an optional theme. Every
   recommendation must preserve gothic identity while improving usability.
   Never sacrifice usability for style; never sacrifice style for generic
   usability.
4. **Audience of the output:** a future Sonnet 5 / Opus 4.8 session with NO
   access to this audit's context must be able to implement any fix at
   essentially the same quality from the written guidance alone. The
   implementation quality must depend on the documentation, not on future
   memory.
5. **The user is a backend/infra beginner** — reports explain sync/infra
   findings in plain terms (Russian); per-finding implementation notes may be
   fully technical (English fine).
6. **Audit only. No fixes.** The audit writes ONLY audit documents and memory
   files. Zero product-code changes, zero refactors, zero drive-by fixes.
   After the audit completes, work starts only on the user's explicit
   approval.

## 2. Evidence protocol & finding format

Every finding gets:

- **ID** `V2-<batch>-<n>` (e.g. `V2-B1-03`), stable forever.
- **Evidence level:**
  - `A` — confirmed by code (file:line references);
  - `B` — confirmed by runtime test (reproducible probe/script);
  - `C` — confirmed by visual review (screenshot in `audit-v2/shots/`);
  - `D` — inferred but not confirmed;
  - `E` — hypothesis requiring clarification from the user.
- **Severity axes, scored 0–3 independently:** user impact · data-loss risk ·
  regression risk of the fix · implementation cost · confidence.
- **Root cause** (§7), **fix strategy**, **files that must change together**,
  **tests to run/add**, **cross-app note** (does the sibling app share the
  issue or already solve it better?).
- **Dedup check** — see below.

Rules:
- A finding is written only after verification appropriate to its level.
  Unverifiable suspicions are recorded as `D`/`E`, clearly flagged — never
  dressed up as facts.
- Data-loss findings outrank everything at equal severity; even a `D`-level
  data-loss suspicion is recorded immediately and queued for runtime
  confirmation.
- **Adversarial verification (rev 3, budget-unbounded).** Before any finding is
  promoted to `A`/`B` and written to the roadmap, it is actively attacked: try
  to REFUTE it (find the guard that already handles it, the caller that never
  passes the bad input, the CSS rule that already covers the case). A finding
  survives only if the refutation attempt fails. High-severity or data-loss
  findings get an independent second pass (a fresh read of the surrounding
  code, or a runtime probe that actually reproduces the failure) — the goal is
  zero false positives in the final roadmap, because a wrong data-loss claim
  wastes the implementation session and erodes trust. Every confirmed finding
  records the refutation that was attempted and why it failed.
- **Reproduce, don't just reason, wherever a probe is cheap.** With no budget
  ceiling, prefer `B`-level (runtime-reproduced) evidence over `D`-level
  (inferred) for any claim where a seeded headless probe or node script can
  settle it. Inference is the fallback, not the default.
- **Dedup against prior audits.** The repo already contains a completed
  June-2026 audit (`AUDIT-FINDINGS.md`, the audit section of `CLAUDE.md`,
  memory files) with ~60 closed findings and a known-deferred list (S1-9,
  S1-10 remainder, G4-3, P-F, Idea 5 calendar, Idea 2 streak). v1's "treat
  the repo as completely unfamiliar" is interpreted as: **verify fresh, trust
  nothing, but do not re-report already-documented items.** A closed finding
  is re-opened only with new evidence (regression). Deferred items are
  referenced by their existing IDs.

## 3. Persistence, resumability, depth doctrine

- Registry dir: **`audit-v2/`** (repo root):
  - `audit-v2/FINDINGS.md` — append-only registry, full per-finding records.
  - `audit-v2/B<N>-<slug>.md` — one report per batch: audited scope,
    confirmed issues, suspected issues, root causes, implementation strategy,
    risks, cross-app observations, high-value improvement ideas,
    implementation notes for a context-free future session.
  - `audit-v2/ARCHITECTURE.md` — the B0 architecture model.
  - `audit-v2/shots/` — screenshots (`B1-<screen>-<size>.png`).
- After each batch: write the batch report → append findings → add/update a
  memory file + MEMORY.md pointer (so even a lost repo copy keeps the core)
  → **commit + push** (`Co-Authored-By` trailer, no version bump).
- **Depth doctrine (rev 3 — budget is not a constraint):**
  - Every batch is taken to exhaustion. "Exhaustion" = the completeness critic
    (§6/§7) finds nothing more to audit: no unread source region in scope, no
    unverified claim, no un-probed suspicious path, no screen not visually
    reviewed at the target sizes. A batch closes only when its aspect is fully
    covered — never because a token budget said so.
  - Prefer more evidence, not less: reproduce with runtime probes, add node
    scripts, take the screenshots, run the benchmarks, drive the two-device
    fake-cloud scenarios. Re-reading a source region for a fresh lens is fine;
    the "single-read" note-taking of B0 is an efficiency, not a cap.
  - Adversarial verification (§2) is applied to every promoted finding; this
    costs extra passes and that is expected and welcome.
  - Interim reports + memory after every batch are still written — now purely
    for durability/resumability, not because an early stop is anticipated.
  - The only things NOT expanded are the guardrails against waste that protect
    QUALITY: don't re-report closed findings (§2 dedup), don't chase rabbit
    holes unrelated to the aspect, don't pad reports with restated code. Depth
    means more real findings and stronger evidence, not more words.
- **Optional multi-agent fan-out (see §4).** With no budget ceiling, heavy
  fan-out batches (B1 screen-by-screen, B6 subsystem-by-subsystem, adversarial
  verification panels) MAY be run as orchestrated multi-agent Workflows for
  breadth + independent verification — gated on explicit user opt-in, since it
  is a large resource commitment even when budget is unbounded. The main thread
  always owns B0 (the coherent architecture model) and the cross-batch
  synthesis; workflows only fan out well-scoped sub-work under that model.
- Everything is resumable: a fresh session reads `AUDIT-SPEC-V2.md` +
  `audit-v2/` + memory index and continues from the next batch.

## 4. Tooling & environments (verified 2026-07-06)

| Layer | Tool | Status |
|---|---|---|
| Static analysis | Read/Grep/Glob over the repo (~21k lines TS, 8k CSS, 1.7k HTML) | ✅ |
| Unit/invariant | `npm test` (vitest: sync-merge 39, sync-gc 13, cloud-transport 24, worker-oauth 17, idb-storage, drive-format pin) + one-off node probes in scratchpad | ✅ |
| Runtime headless | `playwright-core@1.60` at `D:\tmp\pw` + system Chrome (`channel:'chrome'`) against `npm run dev` / `npm run preview`; seeded states (never the user's real data) | ✅ no repo changes |
| Mobile emulation | Playwright context 412×915, DPR 2.625, touch, Android UA (the 6.6–6.7" class = primary target); secondary 360×800 (small), 384×832; landscape spot checks | ✅ |
| Live prod | claude-in-chrome MCP on `https://dusk-du4.pages.dev` — SW behavior, update toast, PWA install, real-feel checks. Read-only conduct: no edits to real data, no sign-outs | ✅ user's Chrome must be open |
| Real device | user's Android phone, guided checklists (5–10 short checks) at B1 and where needed | ✅ user agreed |
| Performance | CDP via playwright (tracing, FPS, metrics), 200/1000-task seeded benchmarks; `npx lighthouse` on demand | ✅ / on-demand |
| Multi-agent Workflow | AVAILABLE (rev 3). Budget no longer blocks it; use for heavy fan-out + adversarial verification panels once the user opts in (§3). | ⏳ opt-in |
| Chrome-DevTools MCP | preferred by the `web-perf` skill for Lighthouse-grade traces; not installed. Offer to install for B8 if deeper perf tracing is wanted. | ⏳ optional |

`npx lighthouse` auto-installs on first use — no decision needed. The
Chrome-DevTools MCP would give richer perf traces than CDP-via-playwright for
B8; it is optional and can be installed on request when B8 begins.

## 5. Execution plan

**Order = v1 priority order** (user's explicit requirement). One aspect = one
batch = one report; a batch is completed before the next begins; no splitting
by token count.

**B0 — Repository understanding** (v1 PHASE 2; prerequisite, not a priority
jump). Read the entire project once: `dusk/01…12`, `src/*`, `index.html`,
`style.css` (architecture-level), `public/sw.js`, `worker/src`, Vite config,
`scripts/build-portable.mjs`, `tests/*`, manifest/_headers/version.json.
Build `ARCHITECTURE.md`: project structure, application boundaries, modules &
responsibilities, state flow, storage layers (LS keys, IDB, backups ring,
baseline, premerge, portable-origin), rendering pipeline (render /
renderListOnly / _reconcile / renderSubList), communication between systems,
shared utilities, lifecycle, event flow (delegation channels), styling
architecture, animation architecture (token system), mobile architecture
(breakpoints, coarse-pointer paths), PWA architecture, sync dataflow,
build/deploy pipeline, globals contract. **While reading, keep aspect-tagged
raw notes for every later batch** — the single-read principle: no source
region is re-read from scratch later without cause.

**Guardrail override (from v1):** the two guardrails below are lenses on
EVERY batch, and data safety & migration correctness win over the ordinary
order. Concretely: any data-loss or migration-safety red flag noticed in any
batch (including B0 reading) is chased and recorded immediately at full
fidelity, not deferred to B6/B9. Cheap static guardrail sweeps that cost
nothing extra during B0's read (e.g. the updatedAt-bump coverage sweep) are
performed during B0 and recorded then.

**Guardrail A — sync, data durability, device portability** (lens on every
batch; concentrated deep-dive in B6/B9): local-first model coherence ·
data-loss protection · 3-way merge correctness · baseline handling · stable
uid identity · updatedAt bumps on every meaningful mutation · tombstone
behavior · tombstone GC safety (90d TTL, offline-resurrection trade-off) ·
conflict quarantine journal integrity · recoverability of losing conflict
versions · delete-vs-edit behavior · tasks/archive sync semantics ·
groups sync semantics · notes/notesArchive sync semantics · templates sync
semantics · subtask sync semantics · sync subset extraction and application ·
app reload behavior · offline periods · OAuth expiry · device replacement ·
cloud version conflicts · pending local changes after cloud errors · manual
export/import as no-login fallback · sync UI clarity (does the eye ever lie?)
· Google Drive appDataFolder boundary · Cloudflare Worker boundary · token,
refresh-token, secret, and CORS safety · cross-device wake behavior · retry,
debounce, and conflict-retry behavior · two-device / two-profile test
coverage · **multi-tab same-origin races (v2 addition)** · **IDB/LS
dual-layer boot matrix, quota and private-mode failure paths (v2 addition)**
· **backups ring integrity (v2 addition)** · explicit hunt for silent
data-loss paths.

**Guardrail B — architecture migration safety** (lens on every batch;
concentrated deep-dive in B9): Vite build correctness · source/dist/service-
worker coherence · ES module load order (the 12-module contract) ·
globalThis bridge contracts · classic-script assumptions surviving inside
module files · TypeScript migration safety · any-based blind spots · test
coverage of migration bridges · worker separation from the frontend build ·
deployment configuration (Pages build cmd, failed-build keeps last deploy) ·
service worker update flow · current IndexedDB/storage-layer correctness and
remaining storage-migration safety · future Android/Windows wrapper
boundaries · temporary migration scaffolding · rollback points (tags) real
and documented · whether architectural changes are sliced small enough to
review and reverse. Distinguish: current architecture / transitional /
target / acceptable temporary debt / already-dangerous debt. Do not
recommend a broad rewrite unless incremental migration provably cannot meet
the safety and quality goals.

Then the priority batches, in v1 order. **Depth = maximum on every batch**
(rev 3). The Priority column is EXECUTION ORDER and severity WEIGHT — mobile
(B1) still leads and carries the heaviest weight in the roadmap — but it is no
longer a depth ration: B10/B12/B13 get the same exhaustive treatment as B1/B6.

| Batch | v1 priority | Aspect |
|---|---|---|
| B1 | P1 | Mobile experience (highest weight) |
| B2 | P2 | Gothic design language |
| B3 | P3 | Glyphs & iconography |
| B4 | P4 | UI |
| B5 | P5 | UX (+ a11y, + RU copy — v2 additions) |
| B6 | P6 | Functional correctness (+ Guardrail A deep-dive) |
| B7 | P7 | Animation & motion |
| B8 | P8 | Performance |
| B9 | P9 | Architecture, sync architecture, migration (+ Guardrail B deep-dive) |
| B10 | P10 | Code quality |
| B11 | P11 | Security |
| B12 | P12 | PWA |
| B13 | P13 | Cross-app parity (synthesis of the continuous lens) |
| B14 | P14 | Project evolution + FINAL DELIVERABLES |

Because budget no longer forces an early stop, the audit runs to completion
through B14. If a session boundary is hit, the committed `audit-v2/` artifacts +
memory make the next session resume seamlessly from the next batch — no batch is
abbreviated for lack of budget.

## 6. Per-batch scope & checklists

Every checklist below is a superset of the corresponding v1 list (Appendix A
maps them). Checks marked ⊕ are v2 additions.

### B0 — Repository understanding
Output: `ARCHITECTURE.md` covering every item listed in §5 B0. Plus ⊕:
- LS-key census (every `localStorage` key, owner, lifecycle);
- timer census (every setInterval/setTimeout loop, period, purpose);
- global-bridge census (every `globalThis.*` slot: writer file, readers);
- event-delegation map (channels, `data-action` registry, `ACT` map);
- inline-SVG/icon inventory pointers (for B3);
- test-to-subsystem map skeleton (for B9/B10's coverage map).

### B1 — Mobile experience (P1, maximum depth)
Primary target: modern Android ~6.6–6.7" (412×915 class). Secondary: smaller
(360×800) and landscape. Audit the complete mobile product, both apps, every
screen/modal/picker/popover. Checklist:
- layout (per-screen review at target sizes; content overflow, clipping,
  wasted space, 2-col subtask grid → 1-col behavior);
- touch ergonomics; thumb reach (both FABs, toolbar, select-bar, header
  controls — reachability zones on 6.7");
- spacing; hit targets (≥44px effective; coarse-pointer reveals per the
  existing `pointer:coarse` work — verify they actually land);
- gesture interactions (swipe/scroll/DnD conflicts, accidental activations);
- virtual keyboard behavior (focus scroll-into-view, viewport squeeze,
  toolbar/FAB overlap while typing, quick-add typeahead above keyboard ⊕);
- focus behavior; scrolling (momentum, nested scrollables, modal body lock);
- overscroll (rubber-band artifacts, pull-to-refresh interference);
- drag and drop (tasks, subtasks in every mode incl. split, groups, Grimuar
  blocks — touch-hold delay, ghost, auto-scroll during drag ⊕);
- long press (context conflicts with text selection ⊕);
- dropdown usability (gothic pickers on touch: open-up logic near keyboard,
  outside-tap close vs scroll ⊕);
- modal usability (small screens: all 15+ modals fit? footer buttons
  reachable? Esc-less dismissal paths on touch ⊕);
- animations on mobile (jank at DPR 2.6+, heavy shadows/filters ⊕);
- performance on mobile-class throttling (CPU 4× slowdown probe ⊕);
- safe areas (notch/punch-hole insets, gesture-nav bar overlap with the
  bottom FABs ⊕ — `env(safe-area-inset-*)` usage);
- orientation (landscape sanity, no data loss on rotate mid-edit ⊕);
- mobile typography, readability (rem scale at small widths, contrast on
  the gothic background image ⊕);
- mobile navigation (app switcher DUSK↔Grimuar on touch);
- mobile workflows (add task one-handed; complete/snooze/archive round-trip
  cost in taps ⊕);
- discoverability on touch (no hover: which affordances vanish? hover-only
  reveals audited one by one ⊕);
- feature parity vs desktop (hotkeys-only features must have touch paths ⊕);
- mobile-specific bugs; mobile visual polish; mobile interaction polish;
- PWA standalone mode on Android (status-bar color, splash, display mode ⊕);
- real-device confirmation round: 5–10 guided checks by the user (keyboard,
  touch-DnD, safe-area, install) for findings emulation can't settle.
Method: emulated visual review of every important screen (screenshot
inventory), interaction probes, then the real-device round.

### B2 — Gothic design language (P2)
Evaluate as a professionally art-directed product, both apps: generic UI ·
AI-looking design · bootstrap-like components · material-looking components ·
generic web icons · weak artistic identity · visual inconsistency · human
craftsmanship · cohesion · design personality · distinctiveness · elegance ·
taste · timelessness. ⊕ additions: palette discipline audit (violet/near-
black tokens; danger-red used ONLY for destructive/over-deadline); background
image integration (legibility over `bg-gothic.jpg`); dark-theme-only identity
coherence; the "empty state" personality; consistency of the gothic voice in
RU microcopy (терминология: склеп, летопись, свеча…). Every recommendation
preserves gothic identity AND improves usability.

### B3 — Glyphs & iconography (P3)
Audit EVERY icon (inline SVGs + `<symbol>` defs + `IC.*` builders), both
apps: semantic clarity · recognizability · stroke consistency · weight ·
alignment · style · hover behavior · animation · consistency · readability ·
visual balance · cross-app consistency. Each icon must simultaneously fit
the gothic language, be immediately understandable, and feel handcrafted
rather than AI-generated. ⊕ additions: full icon inventory table (name,
location(s), role, verdict); duplicate-motif detection (same role, different
glyph = violation of the reuse rule); size/viewBox normalization; touch-size
rendering fidelity (does fine detail survive 20px on mobile?); the
locked-motif registry (sword chevron, ouroboros=repeat/update, coffin,
crescent, reptiloid eye=sync) respected.

### B4 — UI (P4)
Every visual component, both apps: alignment · spacing · visual hierarchy ·
component consistency · density · contrast · readability · typography · grid
· layout · balance · visual rhythm · proportions · color usage · hover
states · focus states · disabled states · empty states · loading states ·
error states · success states · component reuse · visual consistency ·
design language consistency. ⊕ additions: spacing-scale audit (is there an
implicit scale? violations); typography scale census; component-state
completeness matrix (every interactive component × every state); focus-
visible styling consistency (pre-a11y pass feeding B5); toolbar/select-bar/
modal-footer pattern consistency; z-index architecture sanity.

### B5 — UX (P5) + ⊕ accessibility + ⊕ copy
Both apps: discoverability · learnability · mental models · interaction cost
· workflow friction · error prevention · error recovery · feedback quality ·
interaction consistency · keyboard workflow · mouse workflow · mobile
workflow · user confidence · microinteractions · information architecture ·
progressive disclosure · cognitive load · overall usability. ⊕ additions:
- accessibility: keyboard-only full pass (both apps), focus traps & focus
  return on all modals, ARIA correctness (roles, labels, activedescendant),
  contrast measurements, reduced-motion completeness, screen-reader labels
  on icon-only buttons;
- Russian copy quality: tone consistency, terminology consistency, grammar,
  toast truthfulness (does the toast say what actually happened?), hint `?`
  completeness vs actual hotkeys;
- power-feature discoverability specifically: quick-add syntax (`!` `*`
  `%`), hotkey S, snooze, templates, duplicate, promote/demote, typeahead —
  can a user who didn't read the code find them?

### B6 — Functional correctness (P6) + Guardrail A deep-dive
Every subsystem, both apps. v1 hunt list: bugs · edge cases · race
conditions · broken flows · state inconsistencies · missing validation ·
logic contradictions · incorrect persistence · desynchronization · missing
refreshes · incorrect transitions · unexpected interactions · silent
failures · sync state divergence · stale baseline behavior · duplicate or
missing uid · missing timestamp bumps · accidental resurrection after
deletion · archive/live location conflicts · group identity translation
errors · unresolved conflict journal corruption · offline edit replay
failures · OAuth/session expiry edge cases · cloud version conflict retry
failures · migration fallback failures · source/dist/service-worker
mismatch. ⊕ concrete subsystem checklists:
- tasks CRUD; subtasks (2-col grid, split active/completed, DnD in EVERY
  mode); groups (cascade delete + two-step confirm); repeats
  (`cycleChecked`/`nextReset`, 2s timer, month-end guards, weektime);
  deadlines (all 6 modes × auto-repeat × snooze × window/burning states);
  undo/redo (40-deep, across archive/import/sync-apply/restore — what does
  undo mean after a merge lands? ⊕); archive months; templates; duplicate
  group; promote/demote; quick-add parser + typeahead; filters
  (color/focus/today/tag) × sort modes × schedule mode × select mode
  combination matrix; bulk ops; toasts & undo-in-toast timing;
- Grimuar: editor commands, tables, block DnD, collapse, история/летопись,
  TOC, callouts, pen sound + volume vessel, note archive, bulk color,
  search, sanitization on paste;
- Guardrail A deep-dive (everything from §5 list not yet closed during
  B0-B5 lenses), incl. two-device fake-cloud headless scenarios, multi-tab
  probe, IDB/LS boot matrix probe, quota-failure probe, backups-ring probe.
Method: static first (state machine + call-graph reasoning), runtime probes
for every suspicious path; existing vitest suites as the baseline oracle.

### B7 — Animation & motion (P7)
Motion as its own design system, both apps: timing · easing · anticipation ·
continuity · interruption · cancellation · microinteractions · motion
consistency · jumpiness · layout shifts · reflow artifacts · animation
interruptions · state synchronization · visual smoothness · perceived
quality. ⊕ additions: full transition/animation inventory vs the shared
`--ease-*`/`--dur-*` tokens (violations = findings); enter/leave symmetry
audit; mid-animation state-change fuzzing (toggle during collapse, archive
during exit-anim, sync-render during modal transition); reduced-motion
matrix (every animated surface × reduce setting); coffin-seal/row-leave
sequencing; FLIP-vs-max-height technique consistency (grid-rows vs
max-height islands — known 6a deferral respected).

### B8 — Performance (P8)
Both apps: DOM · layout · paint · compositing · memory · timers · storage ·
render cost · animation FPS · event listeners · CSS complexity · JavaScript
complexity · potential bottlenecks · unnecessary recalculations · sync merge
cost on large states · render cost after sync apply · debounce behavior
under rapid edits · storage write frequency · localStorage/IndexedDB
storage-layer cost · service worker update cost · bundle size impact from
migration · worker/network round-trip behavior. ⊕ additions: 200/1000-task
benchmarks (render, renderListOnly, merge, boot) with CDP numbers; mobile
CPU-throttled probe; saveState call-graph frequency audit (dedup
effectiveness of the IDB write-dedup); listener/timer leak sweep (long
session simulation); style.css hot-selector cost (8k lines, shadows/filters
on scroll surfaces); version.json polling cost honesty. Known G4-3 (Sortable
recreation) is measured and referenced, not re-found.

### B9 — Architecture, sync architecture, migration architecture (P9) + Guardrail B deep-dive
v1 list: module boundaries · coupling · abstractions · dependency direction
· responsibility separation · technical debt · maintainability ·
extensibility · future scalability · shared utilities · code organization ·
data model architecture · sync architecture · migration architecture · build
architecture · deployment architecture · test architecture. v1 specific
evaluations, verbatim: sync isolated into clear layers (model / merge /
cloud transport / orchestration / UI / worker); core merge logic pure and
testable; UI code cannot accidentally change merge semantics; cloud
transport cannot mutate live state directly; worker code outside the Vite
frontend bundle; TypeScript types describe the real sync/data model; storage
migrations reversible or recoverable; source modules vs generated artifacts
have a clear ownership rule; temporary global-bridge patterns documented and
constrained; current IndexedDB/storage layer and planned native wrappers
supportable without rewriting sync again. ⊕ additions: Guardrail B deep-dive
(everything from §5 list); dependency surface review (npm deps census,
pinning, supply-chain sanity); `src/types.ts` vs SYNC-SPEC §4 conformance;
test architecture map (subsystem × pinned invariant — feeds deliverable 22).

### B10 — Code quality (P10)
duplication · dead code · naming · readability · complexity · large
functions · repeated patterns · magic values · comments · maintainability ·
testability. ⊕ additions: `any`-census in the TS migration (count, cluster,
risk-rank); globals-contract discipline violations; TODO/FIXME census;
console.log leftovers; error-handling pattern consistency (silent catch
census — ties into silent-failure hunt); RU/EN identifier mixing sanity.

### B11 — Security (P11)
unsafe HTML · XSS · storage safety · input validation · sanitization ·
unsafe browser APIs · potential abuse vectors. ⊕ additions: full
innerHTML/insertAdjacentHTML sweep vs `escHtml` coverage; Grimuar
contenteditable paste/sanitize pipeline; import-JSON validation depth
(malformed/hostile file must not corrupt state); **Drive payload trust** (a
tampered remote subset must not corrupt local state or execute content);
quarantine journal as an injection vector (loser values rendered in the
review panel); token & refresh-token storage tradeoffs (locked decision —
audit the guards around it, not the decision); worker CORS allowlist &
secret handling; postMessage/WebSocket wake-channel input validation;
DoS-by-quota (hostile import filling LS/IDB).

### B12 — PWA (P12)
manifest · service worker · offline behavior · cache strategy · update flow
· installation · consistency. ⊕ additions: precache list vs dist reality
(stable names contract); CACHE version discipline (`dusk-shell-v8`);
version.json no-store/_headers chain end-to-end; update-toast triggering
matrix (visible/focus/online); cold-offline boot completeness (every asset
actually precached); portable single-file fallback parity (feature drift
between PWA and `dusk-portable.html`); install experience on Android
(icons, maskable, splash, standalone chrome).

### B13 — Cross-app parity (P13, synthesis)
Continuous lens throughout B0–B12; this batch synthesizes: missing shared
features · uneven polish · inconsistent workflows · better implementations ·
shared bugs · shared improvements · opportunities for unification ·
opportunities for shared infrastructure. Output: the DUSK↔Grimuar feature/
polish matrix (search, bulk ops, archive, undo depth, keyboard maps, empty
states, history, color systems, animations, sync coverage of notes vs
tasks).

### B14 — Project evolution (P14) + final deliverables
Evolution ideas must be: valuable · architecturally coherent · reasonably
implementable · consistent with the project philosophy. Small high-impact
over huge speculative. Especially: features present in one app missing in
the other; features implemented differently where one is clearly superior;
small UX improvements; workflow improvements; animation improvements; design
refinements; codebase simplifications; module-level improvements. Then
produce the FINAL DELIVERABLES (§8).

## 7. Root cause policy (unchanged from v1, operationalized)

Finding a bug is never the endpoint. For every confirmed issue keep asking:
Why did it happen? Why was it possible? Can the architecture prevent the
class? Can multiple issues be eliminated together? Can the implementation
become simpler? Can UX improve simultaneously? Can DUSK and Grimuar be
unified? Can the solution become more elegant? Stop only after the problem
is explored exhaustively. Root-cause chains are recorded in the finding.

## 8. Final deliverables (all 23 of v1, mapped)

Produced at B14 (reconstructable from the on-disk registry if a session ends):
1. Executive summary · 2. Complete issue list (`FINDINGS.md`) ·
3. Prioritized roadmap (severity-weighted; mobile #1) · 4. Cross-app parity
report (B13) · 5. UI review (B4) · 6. UX review (B5) · 7. Mobile review
(B1) · 8. Gothic design review (B2) · 9. Iconography review (B3) ·
10. Motion review (B7) · 11. Performance review (B8) · 12. Security review
(B11) · 13. Architecture review (B9) · 14. Code quality review (B10) ·
15. PWA review (B12) · 16. Evolution opportunities (B14) · 17. Technical
debt report (from B9/B10 syntheses) · 18. Final implementation memory ·
19. Sync and data durability review (Guardrail A synthesis) · 20. Migration
architecture review (Guardrail B synthesis) · 21. Deployment and service
worker coherence review · 22. Test coverage map · 23. Rollback and recovery
map.

The final implementation memory (`audit-v2/IMPLEMENTATION-MEMORY.md` + memory
files) must contain every confirmed issue with implementation guidance
detailed enough for a context-free Sonnet 5 / Opus 4.8 session, and must
explicitly preserve: sync invariants · migration invariants · known rollback
points · files that must be changed together · tests that must be run for
sync, migration, worker, service-worker, and build changes.

## 9. Locked decisions — constraints, not debate topics

Findings may note tension with these, but must not re-litigate them:
gothic identity mandatory; framework rewrite (Solid) REJECTED — hand-rolled
render layer stays; Dexie REJECTED → idb-keyval, state stays ONE blob;
field-level merge for tasks/groups/templates, subtasks-as-set, notes
keep-both; delete-vs-edit → DELETE + quarantine; no blocking conflict
prompts; monotonic numeric clock (HLC deferred); 90-day GC TTLs with the
accepted offline-resurrection trade-off; Google Drive appDataFolder (Dropbox
rejected); refresh-token cached in localStorage (deliberate reversal of
memory-only, for UX); quick-add symbols `!` priority / `*` tag / `%` date;
group delete cascades to contents (with warning); deadline auto-repeat
default OFF; sync eye FAB bottom-left 46px, panel flips up; quiet sync +
badge (toasts only manual/error); WebP for bg-gothic REJECTED; Cloudflare
Pages prod origin `dusk-du4.pages.dev`, OAuth works only on prod origin;
worker/ not part of the frontend migration; portable single-file build must
keep working; boot reads IDB first, LS live fallback NEVER deleted.
Deferred-not-abandoned (reference, don't re-derive): S1-9, S1-10 remainder,
G4-3 ceiling, P-F reminders, Idea 5 calendar, Idea 2 streak, Этап 5
Playwright-in-repo, Capacitor/Tauri.

## 10. Clarification triggers (v1 PHASE 1, continuous)

Questions are not limited to the start. STOP and ask the user whenever:
- a finding's severity depends on his real usage (e.g. "do you ever run two
  tabs at once?", "how big is your real state?");
- a visual/UX judgment collides with a possibly-locked preference not
  captured in §9;
- a data-risk hypothesis needs a fact only he knows;
- a scope/methodology fork arises (e.g. whether to fan a batch out to a
  multi-agent Workflow, whether to install the Chrome-DevTools MCP for B8, a
  proposed evolution idea worth his steer).
Maximize audit quality, not interruption minimization. Budget is no longer a
reason to withhold a question — ask whenever the answer materially improves the
audit; batch related questions into one prompt only for the user's convenience.

---

## Appendix A — v1 → v2 coverage map (proof nothing was dropped)

| v1 section | v2 location |
|---|---|
| Phase 0 spec engineering | this document (rev 1+2) |
| Phase 1 clarification | §10 + the answered Phase-1 round (env/budget/device/git) |
| Phase 2 repository understanding (14 items) | §5 B0 + §6 B0 (all 14 explicit) |
| Project philosophy (one ecosystem, never lose data) | §1.1–1.2 |
| Audit strategy (aspects=batches, reports, memory, root causes, future-session guidance) | §3, §5, §7, §8 |
| Guardrail A (32 items) | §5 Guardrail A (all 32 + 3 additions) |
| Guardrail B (16 items + debt taxonomy) | §5 Guardrail B (complete) |
| P1 mobile (27 items) | §6 B1 (all 27 + 9 additions) |
| P2 gothic (14 items) | §6 B2 (all 14 + additions) |
| P3 icons (12 items + 3 criteria) | §6 B3 (complete + additions) |
| P4 UI (23 items) | §6 B4 (all 23 + additions) |
| P5 UX (18 items) | §6 B5 (all 18 + a11y/copy additions) |
| P6 functional (26 items) | §6 B6 (all 26 + subsystem checklists) |
| P7 motion (15 items) | §6 B7 (all 15 + additions) |
| P8 performance (22 items) | §6 B8 (all 22 + additions) |
| P9 architecture (17 + 10 specific) | §6 B9 (complete + additions) |
| P10 code quality (11 items) | §6 B10 (all 11 + additions) |
| P11 security (7 items) | §6 B11 (all 7 + additions) |
| P12 PWA (7 items) | §6 B12 (all 7 + additions) |
| P13 cross-app (8 items) | §6 B13 (all 8) |
| P14 evolution (4 criteria + 8 searches) | §6 B14 (complete) |
| Root cause policy (8 questions) | §7 (verbatim) |
| Per-batch deliverables (9 items) | §3 batch-report template |
| Final deliverables (23 items) | §8 (all 23, mapped to batches) |
| Implementation-memory invariants (5 items) | §8 final paragraph |
| Evidence quality tags (5 levels) | §2 (A–E) |
| Severity axes (5) | §2 |
| "Do not implement fixes" | §1.6 |
