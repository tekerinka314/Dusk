---
name: audit-2026-06-plan
description: Agreed work plan from the June 2026 full audit — extension ideas accepted/deferred and the fixed work order
metadata: 
  node_type: memory
  type: project
  originSessionId: 22a751be-f6c8-478d-80fd-264f35d788e9
---

Full audit done 2026-06-03/04. Agreed work order: (1) approve extension ideas → (2) run app & verify motion bugs M-1…M-5 → (3) fix ALL audit problems in descending importance starting with C-1, C-2 (flag risky ones for separate approval) → (4) implement approved extensions. Thorough testing at every stage.

**Extensions APPROVED for this cycle:** Snooze (quick deadline +1h/tomorrow/+week); Promote+demote (subtask⇄task, both directions); Quick-add inline syntax `#tag !high ~date` WITH an interactive typeahead dropdown (slash-menu style: triggers on `#`/`!`/`~`, keyboard+mouse nav, Enter/click insert); Duplicate group + saved templates; Undo button inside the toast after delete/archive.

**Extensions DEFERRED:** Streak counter (not now — gothic-ascetic fit doubts); Calendar view (later, separate block — large scope); Data layer UUID id + updatedAt + tombstones (later, separate stage — the key foundation for sync per [[[the CLAUDE.md roadmap]]], high blast radius).

Confirmed critical bugs to fix first: C-1 archive→restore drops color/pinned/repeatAnchors/subNotesAlwaysOpen (fix via shared archive→task helper, like duplicateTask); C-2 duplicate `.todo-app::after` (style.css:259 glow vs 297 bottom line) cripples ambient appGlowPulse.

**PROGRESS (as of 2026-06-04):** DONE + committed/pushed on branch fix/ui-repeat-meta-subtasks: all bug fixes C-1, C-2, V-1..V-7, M-2, M-4, D-1/D-2/D-4/D-5 (commit 8637bf9); audit §6/§7 polish — 6b motion tokens, 6d gothic chevrons, 6e synced critical pulse, 6f swatch aria-labels + dropdown aria-activedescendant, 6g touch targets, 7b renderListOnly()+lazy subtask Sortable (~2x faster hot paths, = M-5), 7e bulkArchive deep-clone (commit 0cfbd2c). DEFERRED to a later refactor stage (with idea 8): 6a collapse→grid-rows, 7a commit() helper, 7c modular split/event-delegation. M-1 was C-2 live-check (done); M-3 was a non-bug.

**ALL EXTENSIONS DONE + pushed** (branch fix/ui-repeat-meta-subtasks): Undo-in-toast + Snooze (commit 178b5d2); Duplicate-group + Templates (5bc075c); Promote+demote (09dab2f); Quick-add inline syntax `#tag !prio ~date` + interactive typeahead dropdown (c1fe947). Each Playwright-verified, no pageErrors; final combined smoke green. Remaining work all explicitly DEFERRED to a later refactor stage: 6a collapse→grid-rows, 7a commit() helper, 7c modular split/event-delegation, extension idea 8 (UUID/updatedAt/tombstones data layer = the real sync foundation), idea 5 (calendar view), idea 2 (streak). Nothing pending in the current scope — awaiting user's visual review.

Verification harness (reuse for future work): `npm install playwright-core --no-save` (PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1), launch `chromium.launch({channel:'chrome'})`, file:// index.html, `localStorage.clear()`+reload, drive via global functions (module-level `let`s like inputBox/editingTaskId are NOT on window — use document.getElementById; function declarations ARE global), assert `state` + collect pageErrors. ALWAYS `rm -rf node_modules` before any commit — only `git add` the source files (app.js/index.html/style.css/sw.js).
