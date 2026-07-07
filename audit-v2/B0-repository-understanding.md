# B0 — Repository Understanding (batch report)

Auditor: Opus 4.8 (xhigh) · 2026-07-07 · continues the Fable-5 B0 read.

## Audited scope
Full read of the source: `dusk/01–12` (every line of 01,03,04,05,06,07,08,09,10,
11,12; 02-grimoire read structurally = full function inventory + all note-mutation,
sanitize, and bulk paths), `src/main.js`, `src/types.ts`, `index.html` (all 1744
lines), `public/sw.js`, `public/manifest.json`, `public/_headers`,
`public/version.json`, `worker/src/index.js`, `worker/wrangler.toml`,
`vite.config.js`, `tsconfig.json`, `scripts/build-portable.mjs`, and the `tests/`
suite (structure + coverage). `style.css` read at architecture level (token
system, breakpoints, safe-area, reduced-motion, coarse-pointer). Ran `npm test`
for the baseline.

## Deliverables produced
- **`audit-v2/ARCHITECTURE.md`** — the full architecture model (also deliverable
  #13 in raw form): topology, globalThis-bridge contract, state shape, 3 storage
  layers + boot order, render/reconcile pipeline, event-delegation map, timers,
  the sync stack (model/merge/transport/orchestration/wake/worker), build/deploy/
  PWA, styling/animation/mobile architecture, test-architecture map, cross-app
  symmetry seed.
- **`audit-v2/FINDINGS.md`** — 4 findings from the B0 guardrail data-safety sweep.
- Raw working notes in `audit-v2/_raw-B0-notes.md` (kept for resumability).

## Baseline established
`npm test` = 6 files / 9 `it()` blocks / all green / ~7.4s (each block wraps a
ported node harness: merge 39, GC 13, transport 24, worker 17, idb dual-write,
drive wire-format pin). Rollback tags: `v2.2-pre-migration`,
`v2.0-monolith-pre-split`, `v1.86-stable-core`. Working branch `refactor/sync`.

## Confirmed issues (this batch) — see FINDINGS.md for full records
- **V2-B0-01** (integrity) — `grimEmptyCrypt` empties the crypt without tombstones
  → deleted notes resurrect on next sync (the ONE delete path missing the tombstone
  contract that every other path follows). `A`, fix is a one-line loop.
- **V2-B0-02** (⚠ silent data loss, rule #1) — IDB-first boot with no LS↔IDB
  recency check and no unload flush can clobber a fresher localStorage with a stale
  IndexedDB copy, losing the last edit (timing gap) or rolling back to an old
  snapshot (persistent IDB write failure). `D` — highest-priority B6 runtime probe.
- **V2-B0-03** (correctness, minor) — `_taskNotePersist` sets a dynamic inline
  `onclick` that collides with the button's delegated `data-act` (also the sole
  surviving inline handler vs the 7c "zero inline" contract). `A`.
- **V2-B0-04** (mobile, P1) — no `viewport-fit=cover` makes the single
  `env(safe-area-inset-*)` rule inert → fixed bottom FABs/toast can sit under the
  Android gesture-nav bar / iOS home indicator in standalone PWA. `A`→`C` in B1.

## Leads recorded for later batches (NOT yet findings — verify in-batch)
- **[B1 mobile]** `SORTABLE_OPTS` (01:838) `delay:120, delayOnTouchOnly:false` —
  120ms drag delay applies to DESKTOP mouse too, and 120ms may be too short vs
  touch scroll intent (accidental drags) or feel laggy. Verify feel on device +
  emulation. All the sub/group/form Sortables repeat this.
- **[B1 mobile]** Breakpoints are 820/720/640/560/520/360 + `(hover:none) and
  (pointer:coarse)`; **no landscape media query seen** — verify orientation
  handling and mid-edit rotate data safety.
- **[B6 functional]** `_reconcile` render path uses `_render*Body`; the legacy
  non-reconciling twins `appendScheduleSection`/`appendSplitSection`/
  `appendScheduleSplitSection`/`appendPinnedBlock` (03/07) appear parallel — check
  if still reachable (possible dead code) in B10; verify no divergence bug.
- **[B6 functional]** `checkCycleResets` monthly reset guard (04:1617) and the
  short-month `getNextResetTimestamp` monthly branch have multi-step
  overflow-repair loops — good candidates for adversarial edge-case probes
  (Jan 31 → Feb, leap years) with a seeded clock.
- **[B6 functional]** undo across a landed sync merge — `undoStack` holds
  pre-merge snapshots; `_applyingMerge` guards the push-queue but not undo
  semantics. Probe: does Ctrl+Z after a merge revert remote changes and re-push
  them as fresh edits? Design verdict needed.
- **[B6 functional]** multi-tab same-origin: two tabs each hold in-memory state;
  LS is last-writer-wins per `saveState`; no `storage` event listener seen. For a
  non-signed-in user this can silently overwrite the other tab's edits. Probe.
- **[B10 code quality]** TS migration is deliberately loose — `declare var … any`
  pervasive; `any`-census + type-honesty vs SYNC-SPEC §4 (`src/types.ts`) is a B10
  task. Stale comment: `12-sync-wake` header says "30 s periodic poll" but the
  actual `SYNC_PERIODIC_MS` is 120000.
- **[B11 security]** Grimuar `_grimSanitize` (02:1942) is a solid inert-template
  whitelist (tags+attrs, href scheme check, class whitelist); `migrateNotes`
  sanitizes at the data boundary (covers import + future sync file). Re-verify the
  paste path and markdown-import path feed through it. `escHtml` escapes `'` too.
- **[B12 PWA]** SW `CACHE='dusk-shell-v8'` network-first; `10-cloud.js`/`11`/`12`
  are bundled into `app.js` (single precached name) so the older SYNC-SPEC note
  about adding each dusk file to CORE_ASSETS is obsolete — confirm the precache
  list vs the actual dist emit in B12.

## Cross-app observations
- The permanent-delete tombstone contract is honored everywhere except
  `grimEmptyCrypt` (V2-B0-01) — the task side (`clearArchive`) is the correct
  reference. First concrete DUSK↔Grimuar parity defect.
- Colour-label modal + gothic RGB spectrum are genuinely SHARED (tasks, groups,
  notes, bulk) via scope flags — good unification, worth citing as a positive in
  B13. Undo depth, keyboard maps, bulk bars, archive semantics are near-mirrored.

## Risks / method notes
- 02-grimoire (4053 lines) was read structurally (full function inventory + the
  data-safety-critical sections in full). B6 (functional) and B13 (cross-app) will
  read its editor internals (tables/callouts/code-fence/markdown IO) in full where
  the aspect demands it — flagged so it isn't assumed fully line-audited.
- All B0 findings were adversarially refuted before being written (§2). V2-B0-02
  got the required independent second pass; it stays `D` only on the timing-
  probability question, which the B6 probe settles.

## Next
B1 — Mobile experience (Priority 1, maximum depth). Per the §4a hybrid decision,
B1 fans out screen-by-screen via a Workflow (one agent per screen×viewport) under
this architecture model, with the main thread seeding the screen inventory and
synthesizing. The user will provide real-device checks for keyboard/touch-DnD/
safe-area/install that emulation can't settle. B1 also confirms V2-B0-04 on device.
