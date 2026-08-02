---
name: bg-gothic-include-in-commits
description: "bg-gothic.jpg edits are intentional and MUST be staged/pushed, not excluded"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: cc25111e-5f8c-4f85-9e5c-87b53b1d4fed
---

When committing DUSK changes, **include `bg-gothic.jpg`** in the stage/commit/push if
it shows as modified. The user edits this background image deliberately; do NOT treat
it as an unrelated/stray change to leave out.

**Why:** I previously excluded it as "unrelated"; the user corrected that — his edits
to it should land in the push.

**How to apply:** `git add` it along with the code files (or just `git add -A`) unless
the user says otherwise for a specific commit.
