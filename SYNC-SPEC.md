# DUSK Sync — Phase 1 spec (merge engine, offline, no network)

Status: **DESIGN LOCKED 2026-06-28** (full discussion in chat before compact). Phase 1
= the pure 3-way merge engine + baseline/quarantine storage + exhaustive offline node
tests. **No network, no OAuth, no Drive in this phase.** Branch `refactor/sync`.

Prereqs DONE: Idea 8 data-layer (`uid` + `updatedAt` + tombstones, migration v3→v4,
merge-import dedup by uid) `05ca7a4`; 7c split into `dusk/0X-*.js` `f9a3829`.

---

## 1. Core idea

Merge is **3-way**: for every record we compare three versions — `base` (the last
successfully-synced snapshot = **baseline**), `local`, `remote`. The base-diff is the
**conflict DETECTOR** (clock-independent): we can tell *what each side changed*. The
clock (`updatedAt`) is ONLY the tiebreaker when both sides changed the *same* thing.

This lets us merge additively without per-field timestamps: a field/subtask changed on
one side only is taken cleanly; only a same-field / same-subtask divergence is a real
conflict.

---

## 2. What is synced (the "sync subset")

Synced (data records only):

| Collection | Identity | Timestamp | Merge unit |
|---|---|---|---|
| `tasks[]` / `archive[]` (one pool) | `uid` | `updatedAt` | task, FIELD-LEVEL + subtasks-as-set |
| `groups[]` | `uid` | `updatedAt` | group, FIELD-LEVEL |
| `notes[]` / `notesArchive[]` (one pool) | `uid` | `updatedAt` | note, WHOLE-record, keep-both on conflict |
| `noteTemplates[]`, `templates[]` | `uid` | `updatedAt` | template, FIELD-LEVEL (same as groups) |
| `tombstones[]` | `uid` | `deletedAt` | deletion marker, union by uid |
| `syncJournal[]` (NEW) | entry `uid` | `resolvedAt` | quarantine entry, append-only, union by uid |

**NOT synced** (stay device-local): `sortMode`, `sortModeOverrides`,
`nextId`/`nextGroupId`/`nextSubId` (device-local DOM-key allocators), and everything
already kept in separate LS keys (`scheduleModeGroups`, `focusGroup`, `colorFilter`,
`noteColorFilter`, UI toggles). Decision: view/sort prefs are not data — the real manual
order travels inside each task's `order` field, which IS synced.

`tasks`+`archive` are merged as **one pool keyed by uid** because a record can move
between them (archive↔restore); the winning record's *location* (live vs archived) is
itself merged. Same for `notes`+`notesArchive`.

---

## 3. Required model tweaks (small, done before/with the engine)

1. **Subtasks get their own `updatedAt`.** Needed to tiebreak a same-subtask clash.
   Reverses the Idea-8 "subtask has uid but no updatedAt". Extend the existing
   content-diff auto-bump (`_trackedRecords`/`bumpUpdatedAt`) to include subtasks, and
   backfill in `migrateTasks`. (Parent task still also bumps — both are fine.)
2. **Stamp `updatedAt` on archive / restore (and notes↔notesArchive).** Moving a record
   between arrays does NOT change its content signature, so the auto-bump misses it →
   merge can't tell which *location* is newer. Explicitly set `r.updatedAt = nowTs2()`
   at every archive/restore/note-archive/note-restore site.
3. **Monotonic clock.** Replace bare `Date.now()` for record stamps with:
   ```js
   let _lastTs = 0;
   function nowTs2() { _lastTs = Math.max(Date.now(), _lastTs + 1); return _lastTs; }
   ```
   Persist `_lastTs` is NOT required for Phase 1 (in-memory monotonic is enough); revisit
   if needed. `updatedAt`/`deletedAt`/`createdAt` stay plain numbers (comparable with `<`).
   Full HLC deferred.

---

## 4. Record shapes (relevant fields)

- **Task / archive entry:** `id` (int, device-local DOM key), `uid`, `createdAt`,
  `updatedAt`, content fields `{text, checked, priority, groupId, deadline, note, color,
  pinned, order, repeat, cycleChecked, nextReset, subtasksOpen, noteOpen}`, plus an
  `archived` marker (location). `subtasks[]`.
- **Subtask:** `id` (int), `uid`, **`updatedAt`** (NEW), content `{text/?, note, priority,
  order, checked, repeat, cycleChecked}`.
- **Group:** `id` (int), `uid`, `createdAt`, `updatedAt`, content `{name, color, ...}`.
- **Note / template:** `uid`, `createdAt`, `updatedAt`, content (body HTML + meta).
- **Tombstone:** `{uid, type, parentUid, deletedAt}`.
- **Quarantine entry (NEW):** `{uid, kind, recType, recUid, parentUid, field?, loser,
  winnerHint, createdAt, resolved:false, resolvedAt:null, resolution:null}` where
  `kind ∈ {'field','subtask','delete-vs-edit','note-both'}`, `loser` = the full losing
  record/value (so it is restorable).

### `groupId` is device-local — translate via `groupUid`
`task.groupId` is an int that only means something within one device's numbering. The
engine must NOT ship int groupIds across the wire. Internally:
- pre-step: in each input state, annotate every task with `_groupUid` resolved from that
  state's own group table (`int groupId → group.uid`);
- merge;
- post-step: rebuild each merged task's `groupId` from its `_groupUid` against the MERGED
  group table; strip `_groupUid`.

### int-id reindex
After merge, records pulled in from remote may carry int `id`/`nextId` values that collide
with local ones. Reassign unique local int ids to any record without a stable local int id
(or colliding), set `next* = max(used)+1`. Reuse the merge-import `gidMap` pattern.

---

## 5. Merge algorithm

### 5.1 Per top-level record (task pool, group, note pool, template)
For each `uid` in `union(base, local, remote)`:

Define each side's state: **absent**, **tombstoned** (in tombstones with `deletedAt`), or
**present** (live record with `updatedAt`). "changed vs base" = existence differs OR
`updatedAt` differs OR (for present-present) content differs.

- only LOCAL changed vs base → take local (clean).
- only REMOTE changed vs base → take remote (clean).
- neither changed → take base.
- BOTH changed:
  - identical result → take it (no conflict).
  - else → **conflict** → apply default into merged + push a quarantine entry holding the
    loser. See 5.3 for the per-type default.

`base = null` (first-ever sync) ⇒ treat as empty maps → every record is "present on one
or both sides", conflict only when present on both with differing content.

### 5.2 Field-level (tasks, groups, templates) when both present & both changed vs base
Walk each content field independently (3-way per field):
- field changed on one side only → take that side. (independent edits BOTH survive)
- field changed on both, same value → take it.
- field changed on both, different → **same-field conflict** → default = side with
  greater record `updatedAt` (newer wins); quarantine entry `kind:'field'`, `field:<name>`,
  `loser:<other value>`.
The merged record's `updatedAt` = max of contributing sides.

### 5.2b Subtasks as a set (within a merged task)
Key by subtask `uid`. For each subtask uid in `union`:
- present one side only & absent in base → **added** → keep. (two new subtasks both survive)
- present in base, absent now on one side → **deleted** that side → delete (unless edited
  on the other side → delete-vs-edit, see 5.3).
- present both, only one changed vs base → take changed.
- present both, both changed differently → same-subtask conflict → newer subtask
  `updatedAt` wins; quarantine `kind:'subtask'`, `parentUid`, `loser`.
Subtask deletion is inferred from base (no per-subtask tombstone needed).

### 5.3 Conflict defaults + quarantine (NO prompts)
Every conflict: live state gets the default immediately (app stays usable); the LOSING
version is appended to `syncJournal` as an immutable entry, `resolved:false`.

| Conflict kind | Default into live state | Quarantine holds |
|---|---|---|
| same field (task/group/template) | newer `updatedAt` value | older value (`field`,`loser`) |
| same subtask | newer subtask value | older subtask |
| **delete vs edit** | **DELETED** (tombstone wins) | the edited record (restorable) |
| note vs note | newer note lives | the other note (restore = re-add as a copy) |
| tombstone vs tombstone | deleted, single tombstone | — (no conflict) |

`delete-vs-edit`: if a record is tombstoned on one side and content-edited on the other →
default delete; entry `kind:'delete-vs-edit'`, `loser` = edited record.

### 5.4 Quarantine journal merge (it is itself synced)
Append-only & immutable → trivial merge: **union by entry uid**. The only mutable bit is
`resolved`/`resolvedAt`/`resolution` → newer `resolvedAt` wins. "Restore the loser" is a
normal data mutation (re-adds/overwrites the record with a fresh `updatedAt`) that
propagates via normal record sync; it also flips the entry to resolved. Resolution races
(same entry resolved differently on two devices) are near-impossible for a single user and
converge safely (restore = a real edit, wins by recency; nothing is lost). Journal GC
deferred.

### 5.5 Tombstone rules
Union by uid; latest `deletedAt`. A tombstone suppresses a live record on a stale device
(can't resurrect). A live record newer than a tombstone (edited after the delete on
another device) is the delete-vs-edit case → default delete + quarantine the edit.

---

## 6. Function signatures (pure, no DOM / no network)

New file `dusk/09-sync.js`, loaded LAST (before init). Footer
`if (typeof module !== 'undefined') module.exports = {...}` so plain node can import the
pure functions (no-op in browser, classic `<script>`).

```js
mergeStates(base, local, remote) -> { merged, conflicts, stats }
//  base: subset|null   local,remote: subset (see §2)
//  merged: new subset — int ids reindexed, groupId rebuilt from groupUid, syncJournal
//          carries old+new quarantine entries
//  conflicts: [{ uid, recType, kind, field?, parentUid?, winner, loser, reason }]
//             (the journal entries the merge produced this run — for tests + the badge)
//  stats: { added, updated, deleted, conflicts, ... } for logs/tests

getSyncSubset(state) -> subset          // extract synced collections from live state (pure copy)
applySyncSubset(state, subset)          // write merged subset back into live `state` (mutates)
loadBaseline() / saveBaseline(subset)   // LS K_SYNC_BASELINE wrappers
snapshotPreMerge(localJson)             // LS K_SYNC_PREMERGE safety blob (whole-state)
unresolvedCount(state) -> number        // syncJournal entries with resolved===false (badge)
```

Internal helpers: `annotateGroupUids(subset)`, `rebuildGroupIds(subset)`,
`reindexLocalIds(subset, allocators)`, `mergeRecordFields(base, local, remote)`,
`mergeSubtaskSet(base, local, remote, parentUid)`, `recState(side, uid)`.

### Storage keys
```
K_SYNC_BASELINE = 'dusk_sync_baseline_v1'   // last-synced subset + {_meta:{syncedAt}}
K_SYNC_PREMERGE = 'dusk_sync_premerge_v1'   // whole-state snapshot just before applyMerged (bug insurance)
// syncJournal lives INSIDE state (it is synced); not a separate LS key.
```

---

## 7. Integration points (Phase 1 = almost none live)

- `saveState` / `loadState`: **unchanged** in Phase 1 (engine is offline + tested in node).
- Model tweaks of §3 (subtask `updatedAt`, archive/restore stamp, monotonic clock) DO land
  in the live code now (they are prerequisites and independently safe).
- The live apply path (built now, wired in Phase 3):
  `snapshotPreMerge(JSON.stringify(state)) → {merged,conflicts}=mergeStates(loadBaseline(),
  getSyncSubset(state), remoteSubset) → applySyncSubset(state, merged) → normalizeState()
  → saveState() → render() → saveBaseline(merged)`.
- First sync: `loadBaseline()` returns null → engine treats base as empty (union semantics).

---

## 8. Test plan — pure node (`D:/Soft/Node/node.exe`), "two devices", ZERO data loss

Harness loads `dusk/09-sync.js` via `module.exports`; builds plain subset objects; asserts.

Core:
1. first sync both empty.
2. union: local has tasks, remote empty.
3. disjoint adds (A:T1, B:T2) → both, no conflict.
4. one-sided edit wins, no conflict.
5. **field-level:** A changes priority, B changes deadline (same task) → BOTH applied, no conflict.
6. **same-field conflict:** both change text → newer wins live + loser in journal (kind:field).
7. **two new subtasks** (A adds X, B adds Y to same task) → both survive, no conflict.
8. subtask deleted on A (gone vs base), untouched B → deleted.
9. **same-subtask conflict:** both edit subtask S text → newer wins + loser in journal.
10. subtask edit bumps subtask updatedAt (and parent) — verify tiebreak works.
11. **delete-vs-edit:** A deletes task, B edits it → live DELETED + edited copy in journal (restorable).
12. delete-vs-edit reverse (B deletes, A edits) symmetric.
13. tombstone vs tombstone → one tombstone, no conflict, no journal entry.
14. **archive vs live** (location, after §3 stamp) → newer location wins.
15. **groups field-level** (rename A / recolor B) → both survive; rename vs delete → delete-vs-edit.
16. group+tasks via groupUid → after reindex, task.groupId points to the right merged group.
17. **int-id collision** (A.id=5 uidα, B.id=5 uidβ) → both kept, unique int ids, groupId intact.
18. **notes keep-both:** both edit a note since base → newer lives + other in journal (note-both).
19. notes sequential (edit→sync→edit other device) → NO conflict (baseline advanced).
20. **journal union:** entries from a prior merge survive a later merge (append-only).
21. journal resolved-flag newer-wins; "restore" re-adds record as a normal edit.
22. **idempotence:** `merge(b,X,X)==X`, `merge(b,L,b)==L` (no spurious conflicts).
23. **re-merge stability:** baseline:=merged, then merge with no changes → 0 conflicts, identical.
24. `next* > max(used)` after every merge.
25. `updatedAt`/`createdAt` preserved (NOT stamped to now) through merge.
26. tombstones + resolved journal entries accumulate (GC deferred — assert NOT pruned).
27. `base===null` first sync = union with conflicts only on true divergence.
28. premerge snapshot holds the pre-merge local state (recoverable).

Regression: re-run existing harnesses (idea8 33/33, audit3 103/103, pentest 6/6,
durwire/x7/x8) to confirm the §3 model tweaks introduce zero regressions.

---

## 9. Out of scope for Phase 1 (later phases)
- OAuth / Google Drive REST / appDataFolder / ETag concurrency (Phase 2).
- Sync orchestration UI, conflict badge rendering, "sync now" button, login/logout (Phase 3).
- retry/backoff, device-change durability tests (Phase 4), tombstone+journal GC (Phase 4).
- Capacitor/Tauri wrappers (Phase 5).
- True note co-editing (CRDT / block model) — separate large project, NOT planned.
