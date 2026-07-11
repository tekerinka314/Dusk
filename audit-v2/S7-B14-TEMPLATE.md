# S7 / B14 TEMPLATE — Final synthesis & deliverables
### Executor: Opus 4.8 DRAFT (effort xhigh for the synthesis part, high for B12/B13 earlier in S7) → Fable 5 RATIFICATION (one cheap pass). Author: Fable 5 (2026-07-11, allocation rev4.1)

B14 runs at the END of S7, after B12+B13 close. The draft is written by Opus in
the same session; Fable then ratifies severity calibration in a short separate
pass. This file is the contract for both.

## Inputs (read before drafting)
`audit-v2/FINDINGS.md` (complete registry) · every `B*-*.md` report ·
`DESIGN-PLAN.md` (D1-D8 phases — the roadmap must EMBED it, not duplicate it) ·
`B1-mobile.md` roadmap section (P0 mobile rework) · `ARCHITECTURE.md` ·
spec §8 (the 23 deliverables list) + §7 root-cause policy · memory topic file.

## Draft deliverables (Opus)
1. **Executive summary** (RU, non-technical, ~1 page): состояние продукта,
   5-7 главных выводов, что чинить первым и почему.
2. **Prioritized roadmap** — the single most important artifact:
   - Merge three streams into ONE ordered plan: B1-P0 mobile rework · DESIGN-PLAN
     D1-D8 · all remaining findings by severity.
   - Ordering rules (binding): data-loss risk first regardless of batch; then
     mobile P0 (user directive: mobile = worst surface) interleaved with D1-D2
     (rework must land on the new skin — see DESIGN-PLAN §6 macro-order);
     then identity payload (D3-D5), desktop tiers (D6), long tail.
   - Each roadmap item: finding IDs closed, files-that-change-together, tests
     to run, regression risk, rough effort (S/M/L), owner recommendation
     (Fable-design vs Opus-execute per allocation rev4.1 pattern).
3. **`audit-v2/IMPLEMENTATION-MEMORY.md`** (spec §8 final paragraph): every
   confirmed finding with implementation guidance sufficient for a context-free
   session; must explicitly preserve: sync invariants, migration invariants,
   rollback tags, files-together lists, mandatory test commands per subsystem
   (npm test; drive-format pin; s2_fix2 popover probes; icon-sheet harness).
4. **Syntheses** (short, pointer-style, do not re-narrate reports): cross-app
   parity (from B13), Guardrail A digest (sync/data durability — list every
   open data-risk with status), Guardrail B digest (migration), test-coverage
   map (deliverable 22), rollback/recovery map (deliverable 23: tags
   v1.86-stable-core, v2.0-monolith-pre-split, v2.2-pre-migration + LS/IDB
   backup ring semantics).
5. Registry hygiene: verify every `[RATIFY-FABLE]` tag is either resolved or
   listed in the ratification queue; every E-level finding has a user question
   attached; every D-level either promoted, probed, or explicitly parked.

## Severity calibration rules (apply BEFORE Fable pass — reduces churn)
- Recalibrate ALL findings' UI axis on one scale: UI3 = daily-use pain or
  identity-breaking on primary surfaces; UI2 = frequent friction or clear
  standard violation; UI1 = polish. When in doubt between 2/3 → look at
  FREQUENCY of the surface (main list > modals > archive > edge states).
- DL axis overrides everything at equal UI (spec §2).
- Cross-batch duplicates: keep the earliest ID, fold later ones as references
  (do not renumber anything — registry is append-only).

## Fable ratification interface (keep the pass cheap)
Produce at the END of the draft a compact block:
```
RATIFICATION QUEUE
- <ID>: <one-line question or proposed severity change> (context: report §)
```
≤25 lines if possible. Fable reads ONLY: this queue + executive summary +
roadmap top-20 + IMPLEMENTATION-MEMORY spot-checks — write them so that's
sufficient (self-contained lines, no «см. выше»).

## Boot & rules
Same session rules as all batches: spec rev4 §1-§4a (serial, docs-only,
dedup, commit+push, no version bump). S7 order: B12 → B13 → B14 draft.
B12/B13 directives = spec §6 checklists (self-sufficient for Opus at parity;
no special transfer needed — that's why this file only covers B14).
