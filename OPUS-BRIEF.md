# OPUS-BRIEF — handoff from Fable 5 (2026-07-12)

You are Opus 4.8 continuing DUSK after Fable's final architect session. The
strategy is decided and user-approved. Your job is EXECUTION, in this order —
do not re-plan unless the user changes the goal.

## Start-of-session ritual
1. Read `CLAUDE.md` (working rules, gothic mandate, git/deploy conventions).
2. Read `audit-v2/FIX-PLAN.md` — the binding roadmap (waves W0→W4, cut-line).
3. For the current item: its full record in `audit-v2/FINDINGS.md` (ratified
   **RATIFIED-FABLE** lines are binding specs) and, for mobile work,
   `audit-v2/MOBILE-REWORK-PLAN.md`.
4. Check memory index `MEMORY.md` for the audit + migration entries.

## Order of work
W0 data-safety fixes (if any remain) → W1 mobile slices 1–6 → W2 → then, if
budget healthy, B11+B12 express audit (AUDIT-SPEC-V2 §6 checklists) → Android
per `ANDROID-PRENOTES.md` (after user "go") → W3 → W4 (each W4 item needs
explicit user approval).

## Commands & verification
- `npm test` (vitest, all suites) — gate for EVERY commit.
- `npm run build` — must pass before push; `npm run dev` / `npm run preview` for
  probing.
- Runtime probes: `D:\tmp\pw\b1\` harness (playwright-core + system Chrome),
  seeded states only — NEVER the user's real data. W0 regression probes are
  named per-fix in FIX-PLAN.
- Deploy = push to `refactor/sync` (Cloudflare Pages auto-deploys ~30 s). Bump
  `version.json` BUILD in every deploy commit. Commit+push after each finished
  unit WITHOUT being asked; `Co-Authored-By` trailer.
- Visual changes: push, then ask the user to check on his device; his confirm
  closes the item. Describe what changed in plain Russian.

## Likely failure modes — actively guard against these
1. **Breaking desktop while fixing mobile.** All mobile layout changes go inside
   `@media (hover:none) and (pointer:coarse)` / width queries. Diff a desktop
   screenshot after every mobile slice.
2. **Generic-izing the gothic.** Never replace a motif glyph with a plain
   chevron/material icon; reuse `IC.*`. No new colors outside the violet/near-
   black palette (danger red = destructive only). When a fix needs a new visual,
   find the existing idiom and copy it.
3. **Touching merge semantics casually.** `dusk/09-sync.ts` changes only where a
   ratified spec says so; sync-merge (39) + GC (13) tests green or you revert.
4. **Declaring done without evidence.** Run the named probe/test and quote its
   output. For layout: screenshot at 412×915 + 360×800.
5. **Forgetting deploy hygiene** (version bump, push, preview-origin OAuth
   caveat — sync auth only works on the prod origin).
6. **Scope creep inside a slice.** A slice's acceptance list in
   MOBILE-REWORK-PLAN is the whole scope; log new discoveries as findings/notes
   instead of fixing inline.
7. **Undo regressions.** Any new mutation path must `pushUndo()` BEFORE mutating
   (audit P12 verified all 30 existing sites — keep it that way).

## What NOT to do without the user (or Fable) explicitly approving
- Icon/design-language redesigns (FIX-PLAN W4 warning — preview-first protocol).
- Renames of user-facing terminology (B5-11 — propose first).
- Virtualization (B1-10), large-screen tier (B4-01), px→rem (B1-18).
- Any change to locked decisions (AUDIT-SPEC-V2 §9).
- Windows/Tauri port — REJECTED for this month (PWA covers Windows).

## Context you'd otherwise lack
- B6-05 (undo-across-merge) is ratified LEAVE-AS-IS — don't "fix" it.
- B1-19 (PWA won't launch) is already fixed and deployed — don't re-fix; only
  re-verify after SW-adjacent changes.
- B1-22 steppers actually work on touch; only segment-tap + signposting is the
  gap (S1 refuted the rest).
- Emulation lied twice (B1-26 dblclick, B1-22): when emulation and device
  disagree, the device wins; ask the user for a 1-minute check instead of
  trusting a suspicious emulation result.
- The audit remainder (B7–B13) is postponed BY DECISION — don't resume it out
  of turn.
