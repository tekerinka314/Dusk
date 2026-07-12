# FIX-PLAN — the fix-stage roadmap over all 67 audit-v2 findings

Author: Fable 5 (architect pass, 2026-07-12). Executor: Opus 4.8 (xhigh for W0,
high for the rest). This document IS the prioritization — do not re-derive it.
Per-finding detail (evidence, refutations, fix specs) lives in
`audit-v2/FINDINGS.md`; ratified data-safety fix decisions are embedded there
under **RATIFIED-FABLE 2026-07-12** lines — those are binding specs.

Scope decision (user-approved strategy 2026-07-12): remaining audit batches
B7–B13 are POSTPONED behind the fix waves; B14's synthesis role is fulfilled by
this document for the existing registry. Audit resumes (trimmed: B11+B12 first)
only after W2, budget permitting.

## Wave order (strict)

**W0 — data safety (first, small, each fix = own commit + test):**
| # | Finding | Fix (binding spec) | Size |
|---|---|---|---|
| 1 | V2-B6-06 | `shiftDeadline` → `_ymd(base)` (04-tasks.ts:1658) + UTC+3 vitest asserts | 1 line + test |
| 2 | V2-B6-03 | `saveState` quota try/catch; persistent toast; IDB mirror runs regardless (see ratified spec) | ~20 lines |
| 3 | V2-B6-04 | `_entryLoserPreview` falls back to `loser.body` (stripped) / `loser.note`; «пусто» only when ALL empty | ~10 lines |
| 4 | V2-B0-01 | `grimEmptyCrypt` must route deletions through the tombstone path (same as single note delete — soft-delete with `deletedAt`), NOT array truncation. Regression: sync-merge vitest + a resurrect probe | ~15 lines |
| 5 | V2-B0-02 | `_saveSeq` monotonic blob marker; boot compares LS vs IDB, newer wins; `pagehide` best-effort IDB flush (full ratified spec in FINDINGS) | ~40 lines |
| 6 | V2-B6-01 | `_stateLoadedPromise` resolved at end of `loadState` (both paths); `syncNow` awaits it; pristine-state fuse before push/merge (full ratified spec in FINDINGS) | ~25 lines |

5+6 are one session (same boot path); regression probes: `s4_bootrace.mjs`,
`s4_racetiming.mjs`, `s4_p0_idbboot.mjs`, `s4_p4_quota.mjs` (D:\tmp\pw\b1\) —
all must show local data SURVIVING. `npm test` fully green after each commit.
**W0 EXECUTED by Fable 2026-07-12** — all 6 fixes landed (commits: B6-06
`9b87915`, B6-03 `5ddb75c`, B6-04 `f2422d4`, B0-01 `eb28720`, B0-02 `4b18b42`,
B6-01 — see git log), each with a vitest regression. Runtime evidence:
`s4_racetiming.mjs` post-fix = **0 wipes in 15/15 boots** (was 5/5 wiped).
**Probe caveat:** `s4_p0_idbboot.mjs` seeds legacy blobs WITHOUT `_saveSeq`, so
it still shows the documented legacy IDB-priority path, not the fix; for
regression duty it needs seq-aware seeds (LS `_saveSeq:2` vs IDB `_saveSeq:1`
→ marker must survive) — small Opus follow-up. `tests/boot-recency.test.mjs`
covers the mechanism meanwhile.
NOTE: V2-B6-05 needs NO fix (ratified design verdict: leave as-is).
V2-B1-19 (PWA launch) already fixed + deployed 2026-07-08.

**W0.5 — URGENT, before W1 (added 2026-07-12 from user reports):**
- **V2-B6-07** — sync render kills in-flight note editing + discards
  uncommitted keystrokes (~every 2 s of burst typing with sync on). Fix per
  the finding's two-guard spec (render-defer during inline edit +
  scheduleSyncPush guard). Small, bounded, user hits it daily.
- **V2-B6-08** — sequence-tail rollback: attributed to V2-B0-02 (already fixed
  `4b18b42`) + B6-07; NO new code — user re-verifies on builds ≥ 2026-07-12-4;
  investigation checklist in the finding if it recurs.

**W1 — mobile rework** = `audit-v2/MOBILE-REWORK-PLAN.md`, slices 1–6 in order.
Covers: B1-01/02/03/13 (slices 1–2), B1-17/28-mobile (slice 3), B1-06 (slice 4),
B1-07/08/24 + B0-04 (slice 5), B1-04/05/12/14/15/20/21/22/27 + B1-26
discoverability (slices 2/6). Tag `v2.3-pre-mobile-rework` before slice 1.

**W2 — critical UX + functional bugs (desktop+mobile, mostly small):**
1. V2-B1-11 — Cyrillic quick-add tokens: replace ASCII `\b` around `!`/`*`/`%`
   token regexes with Unicode-aware boundaries (e.g. lookarounds on
   `[\p{L}\p{N}_]` with the `u` flag). Add vitest cases: «задача !высокий»,
   «задача *дом», mixed RU/EN.
2. V2-B5-01 + V2-B5-12 — contrast: bump the overdue-chip ink and the shared
   dim-violet token to AA against their real backgrounds (keep hue, raise L until
   ≥4.5:1; verify over bg-image bright regions too).
3. V2-B4-05 — disabled styling + `disabled` attr in the float-menu family (sync
   panel dead items).
4. V2-B5-04 — quarantine overlay joins the modal machinery: `role=dialog`,
   aria-label, focus-in, focus trap, Esc close, focus return.
5. V2-B5-03 — visible `:focus-visible` style for text inputs (match the
   existing button focus idiom).
6. V2-B5-02 — collapsed «Параметры» → `inert` attribute (with hidden fallback)
   so its 40 controls leave the tab order.
7. V2-B5-07 — toast: suppress translate/scale under reduced-motion (opacity only).
8. V2-B4-07 — quarantine row copy: human field names (RU), no internal keys.
9. V2-B2-04 + V2-B5-09 — tasks empty-state voice + Grimuar search-empty parity
   (copy + existing glyph reuse; small).

**W3 — polish / deferred (Opus discretion after W2; propose-then-do for the
feature-shaped ones):**
- V2-B6-02 multi-tab minimal-safe reconcile (binding ratified spec in FINDINGS —
  storage-event flag + mergeStates on next save; regression `s4_p2_multitab.mjs`).
- V2-B5-06 hotkey hint completeness · V2-B5-10 quick-add syntax teacher ·
  V2-B5-08 repeat-vocabulary explainer (ratified) · V2-B5-11 terminology map
  (ratified; propose renames to user, don't rename unilaterally) · V2-B5-05
  landmarks/headings · V2-B4-04 collapsed-group affordance · V2-B4-06
  ::selection global theme · V2-B2-05 archive readability · V2-B4-03 strip
  anchoring at large viewports · V2-B0-03 `_taskNotePersist` onclick→data-act ·
  B6-06's cosmetic export-header cousin · V2-B1-16 mobile TOC (design first) ·
  V2-B1-25 caret-adjacent toolbar (design first).

**W4 — big-ticket, EACH needs explicit user approval before starting:**
- V2-B4-01 large-screen layout tier (UI 3 on the user's own monitor — the top
  W4 candidate; scope: an ≥1200px tier using the freed width for schedule
  side-rail/subtask 3-col, NOT a redesign).
- V2-B1-10 virtualization + V2-B1-23 if it survives W1 re-test (perf block).
- V2-B4-02 popover-engine unification + desktop scroll-follow (mobile half is
  already solved by W1 slice 3).
- V2-B1-18 px→rem typographic migration.
- **Design-language & icon programs (B2-01/02/03, B3-01/02/03/04): DO NOT
  execute without Fable-grade taste input.** Without Fable available: Opus may
  prepare inventories/normalization tables (B3-04, B3-02 audit part) and fix
  V2-B3-05 (five EMPTY glyphs — verify in-app; if truly empty, that's a bug fix,
  not taste). The actual glyph/priority-ember/label-color redesigns: only with
  per-item HTML previews approved by the user, one at a time, following
  `design-tools-interactive-gothic` memory. Wrong gothic is worse than old gothic.

## Cut-line (if Opus budget collapses to ~1 limit)

Do ONLY: W0 remainder → W1 slices 1, 2, 4, 5 → quick wins B1-21 + B1-27/28 →
W2 items 1–2. Everything else waits for next month. This subset alone turns
mobile from broken to usable and closes every data-loss path.

## Standing rules for every fix session

- Read `CLAUDE.md` + this file + the finding's FINDINGS.md record before coding.
- One finding (or one MOBILE-PLAN slice) = one commit; push immediately
  (auto-deploy); bump `version.json` BUILD in every deploy commit.
- `npm test` + `npm run build` green before any push. For W0 also the named
  probes. For W1 also the screenshot protocol from MOBILE-REWORK-PLAN §7.
- Never touch: merge semantics in 09-sync (except where a ratified spec says
  so), worker/, gothic locked motifs, locked decisions (AUDIT-SPEC-V2 §9).
- The user verifies visual changes on his phone/desktop before the next slice
  starts — his confirm, not the emulation, closes a slice.
