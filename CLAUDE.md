# DUSK — instructions for Claude Code

The project brief, the rules, the gates and the roadmap live in ONE file that all
agents share. Read it now:

@AGENTS.md

(If the import above did not expand, open `AGENTS.md` in the repo root and read it
in full before doing anything else.)

Then read `docs/ai-memory/MEMORY.md` — the index of durable project memory — and
open the entries relevant to the task at hand.

---

## Claude-specific — skill cycle, auto-invoke BEFORE responding (MANDATORY)

Before starting any substantive **task** (a real unit of work — implement, debug,
design, research, review, configure), run this cycle (user-mandated 2026-07-17;
also recorded in memory `skill-cycle-mandatory`):

1. **Scan ALL installed skills** — the full list already in this session's
   context (names+descriptions cost no extra tokens; a body loads only when it
   fires). Never work from a remembered shortlist; re-scan per task, including
   skills added or updated mid-session.
2. **Load EVERY skill that would genuinely add value to THIS task — ALL of
   them, not the single best fit, not a shortlist of two.** A design task may
   need `impeccable` + `frontend-design` + `brainstorming` + a typography skill
   + a review skill TOGETHER; load them all. The bar is "would its content
   actually change or improve the work", not "is it the topical match".
   **Loading only one skill when several pass that bar is a VIOLATION of this
   rule** — when in doubt about a borderline skill, LOAD it. Process skills
   (brainstorming, systematic-debugging, writing-plans) fire before
   implementation skills.
3. **`find-skills` — MANDATORY EVERY task, not only on gaps.** Search for skills
   covering any aspect the installed ones don't cover perfectly; install what you
   find and feed it back through this cycle. The ONLY permitted skip: this
   session already ran `find-skills` for the SAME class of task — say so
   explicitly in step 4 instead.
4. State which skills you loaded and why, that `find-skills` ran (or the
   same-class exemption), and which borderline skills you deliberately skipped
   with a one-line reason each.

Steps 1-3 are NOT advisory. Doing the work with fewer skills than pass the
step-2 bar, or skipping `find-skills` without the exemption, means the task
was started WRONG — stop and run the cycle before continuing.

Illustrative mappings (examples, NOT the allowed set): new feature →
`brainstorming` before code · any bug or test failure → `systematic-debugging`
before any fix · implementing → `test-driven-development` · any visual/UI work →
`impeccable` · before claiming done → `verification-before-completion` + `verify`
· reviewing a diff → `code-review` · lost → `find-skills`.

"Task" ≠ every message. Skip the cycle for conversational replies, trivial
one-liners, quick factual answers, and chit-chat.

## Claude-specific — memory

Claude Code's private memory folder for this project is
`C:\Users\serge\.claude\projects\D--VSCode-projects-DUSK-v2-0\memory\`. A copy of
it lives in the repo at `docs/ai-memory/` so it survives a change of tooling.
**When you write a new memory file, write it to BOTH** — otherwise the next
agent, which may not be Claude, loses it.

## Resuming a session

Run `claude` from the project folder, then `claude --continue` (latest) or
`claude --resume` (pick from a list). Transcripts live in
`C:\Users\serge\.claude\projects\D--VSCode-projects-DUSK-v2-0\`; an archived copy
is at `D:\DUSK-ai-archive\transcripts\`.
