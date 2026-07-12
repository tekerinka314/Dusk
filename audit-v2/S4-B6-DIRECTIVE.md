# S4 / B6 DIRECTIVE — Functional correctness + Guardrail A deep-dive
### Executor: Opus 4.8, effort **xhigh**, NEW clean session. Author: Fable 5 (2026-07-12, per rev4.1 §4b: the probe matrix is Fable-designed, non-negotiable)

B6 is the audit's data-safety core. The probe matrix below is ORDERED BY RISK:
Tier 0 must be fully closed (and committed) even if the session hard-stops
mid-way. Follow the matrix; where a probe's result demands a design verdict,
record the behavior and tag `[RATIFY-FABLE]` — do not decide sync/data-model
semantics yourself.

## 0. Session boot (in this order)
1. `AUDIT-SPEC-V2.md` rev4 — §1 non-negotiables, §2 evidence+refutation format,
   §3 ROI doctrine, §4a serial verification (NO agent panels/workflows), §5
   Guardrail A list, §6 B6 checklist, §9 locked decisions, §10 clarification
   triggers.
2. Memory `audit-v2-fable-2026-07.md` (status + lessons) via MEMORY.md.
3. `audit-v2/FINDINGS.md` — dedup against every existing ID. Directly relevant:
   V2-B0-01/02 (Tier-0 targets), V2-B0-03, V2-B1-11 (proven — extend, don't
   re-prove), V2-B4-07 (quarantine display — the «пусто» check is yours).
4. `audit-v2/ARCHITECTURE.md` — the shared model (esp. §3 storage, §6 timers,
   §7 sync, §10 test map). Line numbers drift; re-grep by symbol.
5. **`tests/` — read the sync-merge (39 cases) + sync-gc (13) + cloud-transport
   (24) + drive-format suites BEFORE designing any merge probe.** Anything they
   already pin is anti-scope; your merge probes cover only the GAPS named below.
6. Rules in force: audit writes ONLY docs/memory — zero product-code changes;
   **seeded states only, never the user's real LS/IDB**; commit+push per batch
   (`Co-Authored-By: Claude <noreply@anthropic.com>`, no version.json bump);
   report intro RU, technical bodies EN ok.
7. Harness: `D:\tmp\pw\b1\lib.mjs` (serve/launch/openApp), seeds `seed.mjs`.
   Rebuild dist first: `npm run build`. Scripts `D:\tmp\pw\b1\s4_*.mjs`; raw
   JSON + shots → `audit-v2/shots/s4/`.

## 1. Scope & shape
Both apps. Findings IDs `V2-B6-NN`. Method per spec: **static first** (read the
subsystem, reason the state machine, attempt refutation), runtime probe for
every suspicious or data-relevant path. Budget ~300–400k: Tier 0 ≈ 40%,
Tier 1 ≈ 40%, report+registry ≈ 20%. **Commit after Tier 0** (report skeleton +
raw notes + any promoted findings), then again at batch close.

## 2. Anti-scope (dedup — do NOT re-report or re-prove)
- Merge cases already pinned by vitest (39+13) — probe only the named gaps.
- V2-B1-11 Cyrillic priority regex — PROVEN. Your job is only the SIBLING sweep
  (§P11: same `\b` risk in tag/date regexes).
- Popover engines / scroll-detach / Esc (V2-B4-02), all B5 a11y/copy findings,
  B1 layout/touch-geometry findings — instances get a one-line reference.
- Perf at scale (B8), dead-code verdicts (B10 — you flag, B10 decides), full
  XSS sweep (B11 — your paste/journal probes cross-tag to it), SW/precache
  (B12 — one cheap static check allowed: dist emit names vs sw.js CORE_ASSETS).
- Locked decisions §9 (delete-vs-edit→DELETE, keep-both notes, 90d GC, LS
  token cache, IDB-first boot AS A DECISION) — you test their CORRECTNESS, not
  their wisdom. Tension → note + `[RATIFY-FABLE]`, never re-litigate.

## 3. TIER 0 — data-safety probes (run first, in this order)

Every Tier-0 finding gets the independent second pass (§4a) and, at DL≥2,
`[RATIFY-FABLE]`.

### P0 — IDB-stale-boot clobber (V2-B0-02: promote D→B or refute). THE probe.
Seed the two storage layers DIVERGENTLY, boot, observe who wins.
- Mechanics: idb-keyval default DB `keyval-store`, store `keyval`; confirm the
  state key by reading `K_STATE` in `dusk/01-core.ts`. Seed via page context
  (raw `indexedDB` API or the app's bridged idb helpers), THEN reload — the
  s3 probes' IDB-wipe pattern shows the plumbing; here you write instead of
  wipe.
- (a) *timing gap:* LS = rich seed + marker task «PROBE-LS-NEWER»; IDB = same
  seed WITHOUT the marker. Boot. Expected per code: IDB wins → marker gone AND
  `loadState`→`saveState` clobbers LS. Assert both state and post-boot LS
  content. If the marker survives — find the guard we missed and REFUTE B0-02.
- (b) *persistent IDB failure:* `addInitScript` that makes `indexedDB.open`
  throw → edit a task → reload (IDB still broken) → assert LS carried the edit
  and boot honors it. Then heal IDB (fresh context, stale IDB present) →
  assert scenario (a)'s rollback happens after recovery — the nastier variant.
- (c) *control:* IDB ahead of LS → IDB correctly wins.
- Deliver: exact loss window semantics, promotion of B0-02 with runtime
  numbers, fix-strategy update if the observed shape differs from the
  predicted one. DL 3 → `[RATIFY-FABLE]` regardless of outcome direction.

### P1 — grimEmptyCrypt resurrection (V2-B0-01: promote A→B)
Node-level probe against pure `mergeStates` (09 is requireable — copy the
tests' load pattern): base+remote hold an archived note, local absent, NO
tombstone → assert the note re-appears in merged output. Control: same with a
tombstone → stays deleted. Cheap; do not build a UI probe for this.

### P2 — multi-tab same-origin last-writer-wins
Two pages, one origin (same browser context = shared LS). Edit task A in
tab 1 (save fires), edit task B in tab 2, then force a save in tab 1 again.
Assert: does tab 1's stale in-memory state erase tab 2's edit from LS/IDB?
Also confirm statically there is no `storage` event listener / BroadcastChannel.
Non-sync users lose data silently here → likely DL 2-3 finding. Ask the user
(§10) whether he ever runs two tabs — severity depends on it; record the
question in the report if unanswered.

### P3 — backups-ring integrity
Clock-injected (see Traps): advance >10min between saves, assert ring caps at
10, ordering correct, oldest dropped. Restore path: restoring a ring snapshot
must (a) actually restore, (b) push an undo entry or otherwise not
IRREVERSIBLY destroy the newer state — record the honest behavior. Check the
ring's IDB mirror and what boot does if LS ring and IDB ring diverge.

### P4 — quota / storage-failure honesty
`addInitScript`-override `localStorage.setItem` to throw `QuotaExceededError`
AFTER boot → edit → what does the user see (toast? silence?) and what survives
a reload? Silent swallow of a failed persist = finding (silent loss, rule #1).
Repeat conceptually for IDB (covered by P0b). Also: hostile-size import
(DoS-by-quota is B11's, but note the persist-failure UX here).

### P5 — undo across a landed sync merge (design verdict) `[RATIFY-FABLE]` mandatory
After a merge applies (use P6's fake cloud), press Ctrl+Z. Record precisely:
does undo revert REMOTE changes? Does the reverted state then push with fresh
`updatedAt` (wiping the peer's edits as "newer")? Does redo exist? Do NOT
grade it yourself — this is a semantics decision (undo scope vs sync); deliver
the observed machine + options, Fable ratifies.

### P6 — syncNow orchestration under a fake cloud (the untested loop)
ARCHITECTURE §10: the entire `syncNow` loop (11) has ZERO test coverage — this
block is the highest-novelty functional territory. Infra: `page.route`
intercept of the Drive endpoints + worker URL (read `10-cloud.ts` for exact
URLs/shapes; `tests/` drive-format fixtures give the wire format). Keep the
fake-Drive state (file content + version counter) in the node harness.
Scenarios (each = assert convergence + zero loss + baseline discipline):
- (a) two-device happy path: contexts A/B share the fake Drive; edit A → sync
  → edit B → sync B → sync A → states converge, nothing lost.
- (b) push ConflictError: bump the fake version mid-push → retry ≤4 works, no
  double-apply, journal not duplicated.
- (c) offline/push-failure: fail the push → baseline must NOT advance → edit
  stays pending → next successful sync delivers it.
- (d) edit-during-flight regression (the `9441a3b` fix): delay the fake pull,
  mutate state between pull and push via `evaluate` → the mid-flight edit
  survives and reaches the cloud.
- (e) token expiry mid-loop: fake 401 → refresh path (mock worker `/refresh`)
  → sync completes without user-visible auth loss.
- (f) `_pushNeeded` canon honesty: a synced-field change MUST trigger a push;
  a UI-pref change (sortMode override? — read `getSyncSubset` for what's out)
  must NOT. Both directions.

### P7 — location conflicts & identity translation (merge gaps beyond vitest)
Only cases the vitest suites don't pin (verify first). Candidates:
- archive-on-A vs edit-on-B of the same task (archive/live location conflict:
  `_arch` flag field-merge — who wins, is the edit preserved?);
- group cascade-delete on A vs task-edit-in-group on B → tombstone
  delete-vs-edit → DELETE + quarantine entry present, no orphaned task;
- `_groupUid`→`groupId` rebuild on a device with different int ids (move a
  task into a group on A, sync to B where that group has another int id);
- **promote/demote identity:** read the code first — when a subtask is
  promoted to a task, is a new uid minted and the subtask tombstoned? Then:
  promote on A while B edits the same subtask → merge outcome. Any uid reuse
  or silent drop = finding;
- templates + noteTemplates field-merge spot-check (one probe each).

### P8 — quarantine journal integrity + display truth
- Deterministic entry uid: run the SAME conflict through merge twice (re-merge
  of un-advanced baseline) → no duplicate journal entries.
- Restore path: restoring a loser writes it into live state, bumps updatedAt,
  and it propagates on next sync; dismiss sets resolved (GC-eligible).
- **The «пусто» check (owed to V2-B4-07):** seed one journal entry of EVERY
  kind (field/task, field/group, field/note, subtask, delete-vs-edit,
  note-both) → open the review panel → assert each loser value renders
  non-empty and correct (S2's jq3 seeded-subtask clash showed «пусто» despite
  a text-carrying seed — reproduce or refute).
- Injection surface (cross-tag B11): a loser value of
  `<img src=x onerror=…>` / `"><script>` → panel must render it inert.
- Grimuar stored-callout class round-trip (B5 ledger carry): create a real
  `.grim-co.grim-co-warn` callout via the editor, save, reload → class
  preserved by the sanitizer whitelist?

## 4. TIER 1 — engine & subsystem matrices

### P9 — repeats/cycle clock battery
Clock injection (Traps). Cases: monthly anchor on the 31st → Feb (28 vs leap
29) → Mar 31 again (the multi-step overflow-repair loop, `checkCycleResets`
monthly guard ~04:1617 + `getNextResetTimestamp` short-month branch);
weektime rollover; cycleChecked task with `nextReset` in the past returns to
active via the 2s timer (and does NOT double-fire after reload); reset
deferred 600ms during an active drag (no Sortable destruction). No DST cases
(RU has no DST — state this as the ROI call).

### P10 — deadline matrix (6 modes, sampled)
Per mode: status transitions ok→warn→urgent→critical→over under injected
clock; snooze (`shiftDeadline`) correctness incl. month-end (31st +1mo);
auto-repeat coupling (time→daily / weektime→weekly / monthday→monthly) fires
exactly once at rollover, not again on reload; «Свеча» (event-duration)
states; `updatedAt` bumps on snooze/shift (sync must see them — spot-check,
the B0 sweep predates snooze-path scrutiny). Representative+boundary sampling,
NOT the full cadence cartesian — list what you skipped.

### P11 — quick-add parser sibling sweep + battery
FIRST: the `\b`-after-Cyrillic defect (B1-11) very likely infects the `*` tag
and `%` date regexes too — read `parseQuickInput` (08:~38) and prove/clear
each sibling with direct parser calls (`*тег`, `%завтра`). Then the battery:
every documented `%` date form (завтра, weekday names, dd.mm…) + junk inputs;
multiple tags; combined `!`+`*`+`%`; false triggers («50%» or «важно!»
mid-title must NOT parse); typeahead insert correctness (select from the
dropdown → token lands syntactically valid). Direct parser evaluate calls —
cheap, exhaustive here is fine.

### P12 — undo/redo discipline
Static census first: every `showToast(…,{undo:true})` call site pushes its
undo snapshot BEFORE the mutation (B5 carry — «Отменить» must not pop the
PREVIOUS action). Runtime spot-checks: undo after archive → restore → bulk op
→ import-merge; 40-deep overflow (oldest dropped, no corruption); redo
invalidated by a new action.

### P13 — view-mode combination sampling (invariant-based)
Not the cartesian. Sample ~10–12 risky combos: schedule×split(combined),
colour-filter×schedule×search, todayMode×focus-group, select-mode entered in
each mode, filter flips while select active, check/uncheck in split (zone
migration). Invariants per combo: every live task that passes the filter is in
the DOM exactly ONCE; empty-state shows iff zero visible; toggling a task
never makes it vanish from all zones; leaving the mode restores the full list.
List the sampled combos + the skipped space in the report.

### P14 — DnD battery
Order persists after reload (per mode: normal, schedule zones, split, 2-col
subtask grid, group reorder); cross-group drag rewires `groupId` + priority
inheritance; subtask DnD in split active/completed keeps state; drag during a
pending cycle reset (P9 overlap). Use real mouse-path drags (Playwright
`dragTo` is unreliable with Sortable — manual down/move/up with steps).

### P15 — Grimuar functional battery
Editor commands round-trip (heading/list/checklist/table row+col ops/callout/
code fence/link): exec → save → reload → structure intact (sanitizer
survival). Block DnD; collapse; **летопись**: what triggers a version
snapshot, restore an OLD version → the CURRENT text must remain recoverable
(undo or a fresh snapshot — silent overwrite = DL finding); note
`dusk_note_versions_v1` is LS-only (not IDB-mirrored, not synced) → version
history dies with the device/LS — record as a durability finding lead
(cross-tag B13). Markdown + ZIP export→import round-trip fidelity. Paste
sanitization (hostile HTML: `onerror`, `javascript:` href, unknown classes) —
inert (cross-tag B11). In-note find F3 across blocks.

### P16 — notifications flow (B1 residual, owner=you)
Opt-in flow (`dusk_notif`), `_checkDeadlineNotifications` fires once per
deadline (`dusk_notified_v1` dedup survives reload — no re-spam), denied-
permission path is graceful, bell button state honest.

### P17 — mobile functional taps (B1 residual, pixel7 profile)
Function, not layout: sub-notes eye, promote, demote, duplicate,
template-apply, snooze-menu open+pick — each tap path completes its state
change on the touch profile. One battery, one-line results; failures that are
just B1-01 geometry → reference B1-01, don't re-file.

### P18 — reconcile correctness fuzz
Static: are the legacy `appendScheduleSection`/`appendSplitSection`/
`appendScheduleSplitSection`/`appendPinnedBlock` twins reachable? (Unreachable
→ one line to B10, no probe.) Runtime: churn state rapidly (50× random
check/priority/colour/pin via evaluate) in each mode → final DOM exactly
matches state (ids, order, zone membership); open note editors / focus
survive a reconcile that shouldn't touch them.

## 5. Static sweeps (do during the code reads, no separate budget)
- `_pushNeeded` content-canon vs `getSyncSubset` field list (feeds P6f).
- Silent-`catch` census on DATA paths only (01 persistence, 11 loop) — a
  swallowed persist/sync error with no user signal = finding (full census is
  B10's).
- `updatedAt`-bump spot-checks on paths younger than the B0 sweep: snooze,
  promote/demote, bulk deadline, template apply.
- Toast-after-mutation ordering (pairs with P12's census).

## 6. Judgment frames
- **Severity:** DL axis dominates (§2). A reproducible silent-loss path is
  UI×/DL 3 regardless of how exotic the trigger; a loud, recoverable failure
  caps at DL 1.
- **"Works as coded but wrong as designed"** (e.g. P5 undo-over-merge): record
  the machine, propose options, tag `[RATIFY-FABLE]` — no self-ratified design
  verdicts on sync semantics.
- **Refutation is mandatory per finding** (§2 format) — for runtime findings
  the refutation is a clean re-run in a fresh context + a search for the guard
  you might have bypassed with seeding.
- **Probe failure ≠ finding.** Clean re-run before writing (S3's hotkey-probe
  lesson: an earlier Esc contaminated six "failures").

## 7. Ratification interface (rev4.1 §4b)
Tag `**[RATIFY-FABLE]**` on: every finding with **DL≥2**; UI 3 with CF≤2; any
finding in tension with a §9 locked decision; the P5 verdict (always). Do not
block on them — Fable runs one pass after S4 (before or at S5 start). Everything
else you promote yourself with the recorded refutation.

## 8. Deliverables
1. `audit-v2/B6-functional.md` — report per spec §3 template. Must include:
   Tier-0 results table (probe → outcome → finding/refuted), the fake-cloud
   scenario table (P6a–f), merge-gap results (P7), quarantine kind×display
   table (P8), parser battery table (P11), combo-invariant table (P13),
   ROI ledger (what was skipped and why), probe-artifact ledger.
2. FINDINGS.md appends `V2-B6-NN`; **promotions of V2-B0-01 (→B) and V2-B0-02
   (→B or refuted) are edited into their existing entries** (evidence line +
   runtime numbers), not new IDs.
3. Memory topic update + MEMORY.md line + commit+push (docs only). Commit
   twice: after Tier 0, at close.
4. Probe scripts stay in `D:\tmp\pw\b1\s4_*.mjs` (reusable at fix stage).

## 9. Traps (S1–S3 lessons + B6-specific)
- **Clock injection:** override `Date.now` via `addInitScript` (pre-load) with
  a `window.__clockOffset` you can move from the harness; `nowTs()` is
  monotonic in-memory — moving the clock BACKWARD won't lower stamps (that's
  by design, not a bug).
- **IDB seeding:** default idb-keyval DB `keyval-store` / store `keyval`;
  write BEFORE the app boots (or write then hard-reload). The s3 scripts show
  the wipe pattern; invert it.
- **Fake Drive:** keep file+version state in node; intercept with
  `page.route`; wire shapes = `tests/` drive-format fixtures. Never touch the
  real worker/Drive.
- **Two devices** = two browser CONTEXTS (separate LS/IDB); two TABS in one
  context share storage (that's P2, not P6).
- `showPage()` is a no-op — page nav is `switchPage('archive'|'notes')`.
- Hover-revealed controls: locate then JS-click (`el.click()` via evaluate);
  visibility waits time out.
- `openSnoozeMenu` needs a real click path (synthetic event closes instantly
  via outside-pointerdown).
- Sortable DnD: manual `mouse.down/move({steps})/up`, respect the 120ms
  delay (`SORTABLE_OPTS`).
- Emulation gesture negatives (double-tap etc.) lie — flag device-check items
  for the user instead of asserting.
- fullPage screenshots: black band below viewport = bg-attachment artifact.

## 10. Session-boundary insurance
Commit the report skeleton + Tier-0 results EARLY (right after P0–P5), append
as you go. A hard stop must still leave: promoted/refuted B0-02, the Tier-0
table, and every probe script on disk.
