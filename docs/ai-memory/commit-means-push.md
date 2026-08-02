---
name: commit-means-push
description: "When the user says \"коммить\"/\"комить\"/commit, always also push to origin"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: fff05063-0310-48e5-8aa4-b57096fc5e16
---

When the user says «коммить» / «комить» / "commit" for DUSK, that ALWAYS means **commit AND push** to origin (github.com/tekerinka314/Dusk, branch fix/ui-repeat-meta-subtasks) — not commit-only.

**Why:** stated explicitly 2026-06-16; he wants every commit on GitHub immediately, no separate push request.

**How to apply:** after `git commit` (with the `Co-Authored-By: Claude Opus 4.8` trailer), run `git push origin <branch>` in the same step (current branch `refactor/sync`). See [[audit-2026-06-plan]].

**UPDATE 2026-06-28:** the old "ONLY on his command, never proactively" no longer holds — now commit+push AUTOMATICALLY after finished work, no asking. See [[auto-commit-push-after-work]].
