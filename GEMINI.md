# DUSK — instructions for Gemini CLI / Antigravity (and any other agent)

The project brief, the rules, the gates and the roadmap live in ONE file that all
agents share. Read it now:

@AGENTS.md

(If the import above did not expand, open `AGENTS.md` in the repo root and read it
in full before doing anything else. `AGENTS.md` is the single source of truth —
`CLAUDE.md` and this file are thin pointers, so never edit the rules here.)

---

## Read this before the first task of a session

1. `AGENTS.md` — what DUSK is, how it is built, the gates, the gothic design law,
   the sync design, the owner's non-negotiable preferences.
2. `docs/ai-memory/MEMORY.md` — the index of durable project memory. One line per
   entry, newest first; open the entries that touch your task. **This folder is
   the project's long-term memory and it replaces the per-tool memory feature of
   whatever assistant you are.** Entries are point-in-time observations: if one
   cites a file or function, verify it still exists before acting on it.
3. `STRATEGY.md` — the queue of blocks. `audit-v2/FIX-PLAN.md` and
   `audit-v2/FINDINGS.md` — the audit backlog and what has been closed.
4. `HANDOFF.md` — the state of the project on 2026-08-02, the open queue, and the
   traps that cost previous sessions.

## Keep the memory alive

After every finished unit of work, append to `docs/ai-memory/`: one Markdown file
per fact, plus one line in `MEMORY.md`. Record what a future agent could NOT
re-derive from the code or git history — why an approach was rejected, which
measurement disproved which hypothesis, what the owner decided and in what words.
This habit, more than any model choice, is what kept quality from drifting.

Frontmatter of a memory file:

```markdown
---
name: <short-kebab-case-slug>
description: <one-line summary — used to decide relevance later>
metadata:
  type: user | feedback | project | reference
---

<the fact; link related memories with [[their-name]]>
```

## Things that are easy to get wrong here

- Communicate in **Russian** — the owner's language.
- Commit AND push after every finished unit of work, with the trailer
  `Co-Authored-By:` naming the model that did the work. Bump `public/version.json`
  in the same commit whenever the app itself changed (it drives the in-app
  "update available" toast and Cloudflare Pages auto-deploys the branch).
- Run every gate in `AGENTS.md § Gates` before saying anything is done.
- `grep -i` does NOT fold Cyrillic case — search with explicit classes like `[Чч]`.
- Before `git checkout <file>` to drop an experiment, check the file holds no
  other uncommitted work (a fix was lost that way).
- Taste decisions (a new glyph, wording, one layout vs another) are the owner's,
  never the agent's. Offer concrete options and wait.
