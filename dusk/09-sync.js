// ============================================================
//  09-sync.js — Sync Phase 1: the pure 3-way merge engine
// ============================================================
// OFFLINE, NO NETWORK. This file is platform-agnostic pure logic: given three
// snapshots of the synced data — `base` (the last successfully-synced snapshot =
// baseline), `local`, `remote` — it produces a single merged snapshot plus the list
// of conflicts it auto-resolved. Phase 2 (Google Drive) and Phase 3 (orchestration
// UI) wire it up; here it is exercised purely by node tests.
//
// CORE IDEA (3-way): the base-diff is the conflict DETECTOR (clock-independent) — it
// tells us WHAT each side changed. The clock (`updatedAt`) is ONLY the tiebreaker
// when both sides changed the SAME thing. This merges additively (independent edits
// all survive) without per-field timestamps. See SYNC-SPEC.md for the full design.
//
// "Never lose data" is rule #1: an ABSENT record on one side is NEVER read as a
// deletion (only an explicit tombstone deletes); every losing side of a conflict is
// preserved verbatim in the synced quarantine journal (`state.syncJournal`).
//
// Loaded LAST as a classic <script> (shares global scope with the other dusk/*.js —
// no namespace). The module.exports footer is a no-op in the browser and lets plain
// node import the pure functions for tests.

// ── Collection registry ─────────────────────────────────────────────────────
// Each synced collection: its array name in the subset, its sync-identity field
// (`uid` for tasks/groups/task-templates; `id` for notes/note-templates, which use a
// uuid string `id`), and its merge strategy:
//   'task'   — field-level + subtasks-as-set (only tasks).
//   'fields' — field-level (groups, task templates, note templates).
//   'whole'  — whole-record, newer-wins-live + loser kept in quarantine (notes).
// `pool:true` collections are split across two live arrays (tasks/archive,
// notes/notesArchive) and carry an `_arch` location flag inside the subset.
const SYNC_COLLECTIONS = [
    { name: 'tasks',         key: 'uid', strategy: 'task',   pool: true,  intId: true  },
    { name: 'groups',        key: 'uid', strategy: 'fields', pool: false, intId: true  },
    { name: 'notes',         key: 'id',  strategy: 'whole',  pool: true,  intId: false },
    { name: 'templates',     key: 'uid', strategy: 'fields', pool: false, intId: true  },
    { name: 'noteTemplates', key: 'id',  strategy: 'fields', pool: false, intId: false },
];
const _COLL_BY_NAME = {};
SYNC_COLLECTIONS.forEach(c => { _COLL_BY_NAME[c.name] = c; });

const K_SYNC_BASELINE = 'dusk_sync_baseline_v1';   // last-synced subset (detector base)
const K_SYNC_PREMERGE = 'dusk_sync_premerge_v1';   // whole-state snapshot taken just before applyMerged (bug insurance)

// ── Phase 4 GC horizons ──────────────────────────────────────────────────────
// Tombstones and the quarantine journal are append-only unions → they grow without
// bound. GC them by AGE (see mergeStates). 90 days comfortably exceeds any realistic
// offline gap, so pruning a tombstone can't lose a still-live edit from a normal
// device (the only loss case is a device offline > the horizon that still holds a
// live copy of a since-deleted record — accepted per SYNC-SPEC). Resolved journal
// entries are collected past the horizon; UNRESOLVED ones are kept forever.
const TOMBSTONE_TTL_MS = 90 * 24 * 60 * 60 * 1000;
const JOURNAL_TTL_MS   = 90 * 24 * 60 * 60 * 1000;

// ── Small pure helpers ───────────────────────────────────────────────────────
function _clone(x) { return x == null ? x : JSON.parse(JSON.stringify(x)); }

// Stable, key-sorted serialization → order-independent deep equality (handles nested
// objects like `deadline:{mode,value}` regardless of key order between devices).
function _stable(v) {
    if (v === null || typeof v !== 'object') return JSON.stringify(v) ?? 'null';
    if (Array.isArray(v)) return '[' + v.map(_stable).join(',') + ']';
    const ks = Object.keys(v).sort();
    return '{' + ks.map(k => JSON.stringify(k) + ':' + _stable(v[k])).join(',') + '}';
}
function _eq(a, b) { return _stable(a) === _stable(b); }

function _ts(rec) { return (rec && typeof rec.updatedAt === 'number') ? rec.updatedAt : 0; }

// Index an array of records by their sync key.
function _byKey(arr, key) {
    const m = new Map();
    (arr || []).forEach(r => { if (r && r[key] != null) m.set(r[key], r); });
    return m;
}

// Per-side tombstone map: sync-key → latest deletedAt (a side may list a uid twice).
function _tombSet(subset) {
    const m = new Map();
    (subset.tombstones || []).forEach(t => {
        if (!t || t.uid == null) return;
        const prev = m.get(t.uid);
        if (prev == null || (t.deletedAt || 0) > prev) m.set(t.uid, t.deletedAt || 0);
    });
    return m;
}

// One side's state for a given key: present (with the record), tombstoned, or absent.
function _sideState(map, tomb, key) {
    if (map.has(key)) return { kind: 'present', rec: map.get(key) };
    if (tomb.has(key)) return { kind: 'tomb', deletedAt: tomb.get(key) };
    return { kind: 'absent' };
}

// Canonical content of a record for change-detection: drop device-local / timestamp
// fields (`id`, `groupId`, `updatedAt`, `createdAt`, the key field). Subtasks are
// normalized too (their own id/timestamps stripped, sorted by uid so a pure array
// reorder isn't read as a content change — real reorders live in each sub's `order`).
function _canon(rec, coll) {
    const skip = { id: 1, groupId: 1, updatedAt: 1, createdAt: 1, [coll.key]: 1 };
    const o = {};
    for (const k of Object.keys(rec)) {
        if (skip[k]) continue;
        if (k === 'subtasks' && Array.isArray(rec.subtasks)) {
            o.subtasks = rec.subtasks.map(_canonSub).sort((a, b) => (a.uid < b.uid ? -1 : a.uid > b.uid ? 1 : 0));
        } else {
            o[k] = rec[k];
        }
    }
    return o;
}
function _canonSub(s) {
    const { id, updatedAt, createdAt, ...rest } = s;   // keep uid (set identity) + content
    return rest;
}
function _sameContent(a, b, coll) { return _eq(_canon(a, coll), _canon(b, coll)); }

// "Changed vs base" — the conflict detector. Crucially: an ABSENT side is NEVER a
// deletion (only a tombstone deletes), so a stale device that simply lacks a record
// can't cause it to vanish.
function _changed(side, base, coll) {
    if (base.kind === 'absent') return side.kind !== 'absent';      // present or tomb = new info
    if (base.kind === 'tomb')   return side.kind === 'present';     // re-add over a tombstone
    // base present:
    if (side.kind === 'tomb')    return true;                       // deleted on this side
    if (side.kind === 'absent')  return false;                      // stale/missing — NOT a delete
    return !_sameContent(side.rec, base.rec, coll);                 // present↔present: content diff
}

// ── Quarantine journal entry (immutable, deterministic uid) ──────────────────
// The uid is derived from the conflict so the SAME conflict detected on two devices
// (or re-detected on a re-merge) collapses to one entry — append-only union just works
// and the merge stays idempotent.
function _entry(kind, recType, recKey, opts) {
    const loserStamp = opts.loserStamp || 0;
    const det = kind + '|' + recType + '|' + recKey + '|' + (opts.field || opts.parentUid || '') + '|' + loserStamp;
    return {
        uid: det,
        kind: kind,                       // 'field' | 'subtask' | 'delete-vs-edit' | 'note-both'
        recType: recType,                 // collection name
        recUid: recKey,                   // the conflicted record's sync key
        parentUid: opts.parentUid || null,
        field: opts.field || null,
        loser: opts.loser,                // full losing value/record (restorable)
        winner: opts.winner ?? null,      // hint at what won (for the badge / UI)
        reason: opts.reason || kind,
        createdAt: loserStamp,
        resolved: false,
        resolvedAt: null,
        resolution: null,
    };
}

// ── Subtasks-as-set merge (within one merged task) ───────────────────────────
function _mergeSubtasks(baseSubs, localSubs, remoteSubs, parentUid, conflicts) {
    const bMap = _byKey(baseSubs, 'uid');
    const lMap = _byKey(localSubs, 'uid');
    const rMap = _byKey(remoteSubs, 'uid');
    const keys = new Set([...lMap.keys(), ...rMap.keys(), ...bMap.keys()]);
    const out = [];
    for (const su of keys) {
        const b = bMap.get(su), l = lMap.get(su), r = rMap.get(su);
        const bP = !!b, lP = !!l, rP = !!r;
        if (!lP && !rP) continue;                                   // gone on both → drop
        // changed vs base (no subtask tombstones — deletion is inferred from base):
        const lc = bP ? (lP ? !_eq(_canonSub(l), _canonSub(b)) : true) : lP;
        const rc = bP ? (rP ? !_eq(_canonSub(r), _canonSub(b)) : true) : rP;
        if (lc && rc) {
            if (lP && rP) {
                if (_eq(_canonSub(l), _canonSub(r))) {
                    out.push(_takeSub(l, r));                       // identical edit → no conflict
                } else {
                    const lNew = _ts(l) >= _ts(r);
                    const win = lNew ? l : r, lose = lNew ? r : l;  // same-subtask clash → newer wins
                    out.push(_takeSub(win, win));
                    conflicts.push(_entry('subtask', 'tasks', win.uid, {
                        parentUid, loser: lose, winner: win.text ?? null, loserStamp: _ts(lose),
                        reason: 'same subtask edited on both devices',
                    }));
                }
            } else {
                // one side deleted, the other edited → delete-vs-edit → default DELETE,
                // quarantine the edited copy (restorable).
                const edited = lP ? l : r;
                conflicts.push(_entry('subtask', 'tasks', edited.uid, {
                    parentUid, loser: edited, winner: null, loserStamp: _ts(edited),
                    reason: 'subtask deleted on one device, edited on the other → deleted',
                }));
                // not pushed → deleted
            }
        } else if (lc) {
            if (lP) out.push(_takeSub(l, l));                       // local edited → keep; local deleted → drop
        } else if (rc) {
            if (rP) out.push(_takeSub(r, r));
        } else {
            const keep = lP ? l : (rP ? r : b);                     // neither changed → keep surviving copy
            if (keep) out.push(_takeSub(keep, keep));
        }
    }
    out.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    return out;
}
// Clone a subtask for the merged result; updatedAt = the later of the contributing
// copies. `id` is dropped — reindexLocalIds reassigns the device-local DOM key.
function _takeSub(a, b) {
    const s = _clone(a);
    delete s.id;
    s.updatedAt = Math.max(_ts(a), _ts(b));
    return s;
}

// ── Field-level merge (tasks, groups, templates), both present & both changed ─
function _mergeFields(base, local, remote, coll, conflicts) {
    const localNewer = _ts(local) >= _ts(remote);               // same-field tiebreak
    const skip = { id: 1, groupId: 1, updatedAt: 1, createdAt: 1, subtasks: 1, [coll.key]: 1 };
    const out = {};
    out[coll.key] = local[coll.key];
    out.createdAt = _minDef(base && base.createdAt, local.createdAt, remote.createdAt);
    out.updatedAt = Math.max(_ts(local), _ts(remote));

    const fields = new Set();
    [local, remote, base].forEach(rec => { if (rec) Object.keys(rec).forEach(k => { if (!skip[k]) fields.add(k); }); });

    for (const f of fields) {
        const bv = base ? base[f] : undefined;
        const lv = local[f], rv = remote[f];
        const lc = !_eq(lv, bv), rc = !_eq(rv, bv);
        if (lc && rc) {
            if (_eq(lv, rv)) {
                out[f] = lv;                                    // same change both → no conflict
            } else {
                const win = localNewer ? lv : rv;
                const lose = localNewer ? rv : lv;
                out[f] = win;
                conflicts.push(_entry('field', coll.name, local[coll.key], {
                    field: f, loser: lose, winner: win, loserStamp: _ts(localNewer ? remote : local),
                    reason: 'same field edited on both devices',
                }));
            }
        } else if (lc) {
            out[f] = lv;                                        // independent edit → survives
        } else if (rc) {
            out[f] = rv;                                        // independent edit → survives
        } else {
            out[f] = bv;                                        // == lv == rv
        }
    }

    if (coll.strategy === 'task') {
        out.subtasks = _mergeSubtasks(base && base.subtasks, local.subtasks, remote.subtasks, local[coll.key], conflicts);
    }
    return out;
}
function _minDef(...xs) {
    const vs = xs.filter(x => typeof x === 'number');
    return vs.length ? Math.min(...vs) : undefined;
}

// ── Resolve one record when BOTH sides changed vs base ───────────────────────
// Returns { keep: record|null }. keep===null means the record is deleted (a tombstone
// from the deleting side carries it in the union).
function _resolveBoth(bs, ls, rs, coll, conflicts) {
    // delete-vs-edit (default DELETE; quarantine the edited copy) ----------------
    if (ls.kind === 'tomb' && rs.kind === 'present') {
        conflicts.push(_entry('delete-vs-edit', coll.name, rs.rec[coll.key], {
            loser: rs.rec, winner: null, loserStamp: _ts(rs.rec),
            reason: 'deleted on one device, edited on the other → deleted',
        }));
        return { keep: null };
    }
    if (rs.kind === 'tomb' && ls.kind === 'present') {
        conflicts.push(_entry('delete-vs-edit', coll.name, ls.rec[coll.key], {
            loser: ls.rec, winner: null, loserStamp: _ts(ls.rec),
            reason: 'deleted on one device, edited on the other → deleted',
        }));
        return { keep: null };
    }
    if (ls.kind === 'tomb' && rs.kind === 'tomb') return { keep: null };   // both deleted → single tombstone

    // present ↔ present -----------------------------------------------------------
    if (ls.kind === 'present' && rs.kind === 'present') {
        if (_sameContent(ls.rec, rs.rec, coll)) {
            const keep = _ts(ls.rec) >= _ts(rs.rec) ? _clone(ls.rec) : _clone(rs.rec);
            keep.updatedAt = Math.max(_ts(ls.rec), _ts(rs.rec));
            return { keep };                                    // identical result → no conflict
        }
        if (coll.strategy === 'whole') {                        // notes: newer lives, loser quarantined
            const localNewer = _ts(ls.rec) >= _ts(rs.rec);
            const win = localNewer ? ls.rec : rs.rec;
            const lose = localNewer ? rs.rec : ls.rec;
            conflicts.push(_entry('note-both', coll.name, win[coll.key], {
                loser: _clone(lose), winner: win[coll.key], loserStamp: _ts(lose),
                reason: 'note edited on both devices — keep both (loser recoverable)',
            }));
            return { keep: _clone(win) };
        }
        // tasks / groups / templates: field-level
        return { keep: _mergeFields(bs.kind === 'present' ? bs.rec : null, ls.rec, rs.rec, coll, conflicts) };
    }

    // base absent, one side added & the other tombstoned the same key (rare) → default delete.
    const edited = ls.kind === 'present' ? ls.rec : (rs.kind === 'present' ? rs.rec : null);
    if (edited) {
        conflicts.push(_entry('delete-vs-edit', coll.name, edited[coll.key], {
            loser: edited, winner: null, loserStamp: _ts(edited),
            reason: 'added on one device, tombstoned on the other → deleted',
        }));
    }
    return { keep: null };
}

// ── Merge one collection ─────────────────────────────────────────────────────
function _mergeCollection(coll, B, L, R, conflicts, stats) {
    const k = coll.key;
    const bMap = _byKey(B[coll.name], k), lMap = _byKey(L[coll.name], k), rMap = _byKey(R[coll.name], k);
    const bT = _tombSet(B), lT = _tombSet(L), rT = _tombSet(R);
    const keys = new Set([...bMap.keys(), ...lMap.keys(), ...rMap.keys()]);
    const out = [];
    for (const key of keys) {
        const bs = _sideState(bMap, bT, key);
        const ls = _sideState(lMap, lT, key);
        const rs = _sideState(rMap, rT, key);
        const lc = _changed(ls, bs, coll);
        const rc = _changed(rs, bs, coll);

        let keep = null;
        if (!lc && !rc) {
            const src = ls.kind === 'present' ? ls.rec : (bs.kind === 'present' ? bs.rec : (rs.kind === 'present' ? rs.rec : null));
            if (src) { keep = _clone(src); stats.kept++; }
        } else if (lc && !rc) {
            if (ls.kind === 'present') { keep = _clone(ls.rec); stats.updated++; }
            else stats.deleted++;                                // local deleted
        } else if (!lc && rc) {
            if (rs.kind === 'present') { keep = _clone(rs.rec); stats.updated++; }
            else stats.deleted++;
        } else {
            const res = _resolveBoth(bs, ls, rs, coll, conflicts);
            keep = res.keep;
            if (!keep) stats.deleted++; else stats.updated++;
        }
        if (keep) out.push(keep);
    }
    return out;
}

// ── groupUid translation (task.groupId is a device-local int) ────────────────
function _annotateGroupUids(subset) {
    const id2uid = new Map();
    (subset.groups || []).forEach(g => { if (g && g.id != null) id2uid.set(g.id, g.uid); });
    (subset.tasks || []).forEach(t => {
        t._groupUid = (t.groupId != null) ? (id2uid.get(t.groupId) ?? null) : null;
    });
}

// ── Tombstone union (latest deletedAt; drop any that survived as a live record) ─
function _unionTombstones(B, L, R) {
    const m = new Map();
    [B, L, R].forEach(s => (s.tombstones || []).forEach(t => {
        if (!t || t.uid == null) return;
        const ex = m.get(t.uid);
        if (!ex || (t.deletedAt || 0) > (ex.deletedAt || 0)) m.set(t.uid, _clone(t));
    }));
    return m;
}

// ── Journal union (append-only; resolved-flag newer-wins) + this run's entries ─
function _mergeJournal(B, L, R, newEntries) {
    const byUid = new Map();
    const consider = e => {
        if (!e || !e.uid) return;
        const ex = byUid.get(e.uid);
        if (!ex) { byUid.set(e.uid, _clone(e)); return; }
        const exR = ex.resolvedAt || 0, eR = e.resolvedAt || 0;
        if (e.resolved && !ex.resolved) byUid.set(e.uid, _clone(e));
        else if (e.resolved && ex.resolved && eR > exR) byUid.set(e.uid, _clone(e));
        // else keep the one already held (immutable payload is identical)
    };
    [...(B.syncJournal || []), ...(L.syncJournal || []), ...(R.syncJournal || [])].forEach(consider);
    newEntries.forEach(e => { if (!byUid.has(e.uid)) byUid.set(e.uid, e); });   // det uid → no dup
    return [...byUid.values()];
}

// ── Reindex device-local int ids + rebuild task.groupId ──────────────────────
// Preferring the LOCAL device's existing ids keeps UI-pref references (scheduleMode
// groups, sortModeOverrides, focusGroup — all keyed by int group id) intact; records
// pulled in from remote get freshly-allocated local ids. Reuses the merge-import
// gidMap pattern. `next* = max(used)+1` (and never below the local allocator).
function _reindex(merged, local) {
    const alloc = {};
    const localMap = (arrName, key) => _byKey(local[arrName], key);

    const assign = (recs, key, localById, startNext) => {
        const used = new Set();
        recs.forEach(r => {
            const lid = localById.get(r[key]);
            if (lid != null && !used.has(lid)) { r.id = lid; used.add(lid); }
            else r.id = null;
        });
        let next = startNext || 1;
        recs.forEach(r => {
            if (r.id == null) { while (used.has(next)) next++; r.id = next; used.add(next); next++; }
        });
        const maxUsed = used.size ? Math.max(...used) : 0;
        return Math.max(next, maxUsed + 1, startNext || 1);
    };

    // groups first (tasks reference them) -------------------------------------
    const lgId = new Map(); (local.groups || []).forEach(g => { if (g && g.uid != null) lgId.set(g.uid, g.id); });
    alloc.nextGroupId = assign(merged.groups, 'uid', lgId, local._alloc ? local._alloc.nextGroupId : 1);
    const groupUidToId = new Map(); merged.groups.forEach(g => { if (g.uid != null) groupUidToId.set(g.uid, g.id); });

    // tasks: int id + rebuild groupId from _groupUid + subtask ids ------------
    const ltId = new Map(); (local.tasks || []).forEach(t => { if (t && t.uid != null) ltId.set(t.uid, t.id); });
    alloc.nextId = assign(merged.tasks, 'uid', ltId, local._alloc ? local._alloc.nextId : 1);

    const lsubId = new Map();
    (local.tasks || []).forEach(t => (t.subtasks || []).forEach(s => { if (s && s.uid != null) lsubId.set(s.uid, s.id); }));
    let subNext = local._alloc ? (local._alloc.nextSubId || 1) : 1;
    const subUsed = new Set();
    merged.tasks.forEach(t => {
        t.groupId = (t._groupUid != null) ? (groupUidToId.get(t._groupUid) ?? null) : null;
        delete t._groupUid;
        (t.subtasks || []).forEach(s => {
            const lid = lsubId.get(s.uid);
            if (lid != null && !subUsed.has(lid)) { s.id = lid; subUsed.add(lid); }
            else s.id = null;
        });
    });
    merged.tasks.forEach(t => (t.subtasks || []).forEach(s => {
        if (s.id == null) { while (subUsed.has(subNext)) subNext++; s.id = subNext; subUsed.add(subNext); subNext++; }
    }));
    alloc.nextSubId = Math.max(subNext, subUsed.size ? Math.max(...subUsed) + 1 : 1, local._alloc ? local._alloc.nextSubId : 1);

    // task templates: int id (note templates use string id — left as-is) ------
    const ltplId = new Map(); (local.templates || []).forEach(t => { if (t && t.uid != null) ltplId.set(t.uid, t.id); });
    alloc.nextTemplateId = assign(merged.templates, 'uid', ltplId, local._alloc ? local._alloc.nextTemplateId : 1);

    return alloc;
}

// ── Public: the merge ────────────────────────────────────────────────────────
// opts.gcNow (a ms-epoch clock) enables Phase 4 GC of stale tombstones + resolved
// journal entries. Omitted/null → GC OFF, so the merge stays a deterministic pure
// function for the node tests. The live loop (Phase 3) passes Date.now().
function mergeStates(base, local, remote, opts) {
    opts = opts || {};
    const gcNow = (typeof opts.gcNow === 'number') ? opts.gcNow : null;
    const B = _emptySubset(base);   // base===null (first sync) → empty maps → union semantics
    const L = _clone(local) || _emptySubset(null);
    const R = _clone(remote) || _emptySubset(null);
    _annotateGroupUids(B); _annotateGroupUids(L); _annotateGroupUids(R);

    const conflicts = [];
    const stats = { added: 0, updated: 0, deleted: 0, kept: 0, conflicts: 0, gcTombstones: 0, gcJournal: 0 };
    const merged = {};

    for (const coll of SYNC_COLLECTIONS) {
        merged[coll.name] = _mergeCollection(coll, B, L, R, conflicts, stats);
    }

    // tombstones: union, minus any key that survived as a live record
    const tombMap = _unionTombstones(B, L, R);
    const present = new Set();
    SYNC_COLLECTIONS.forEach(c => merged[c.name].forEach(r => present.add(r[c.key])));
    merged.tombstones = [...tombMap.values()].filter(t => !present.has(t.uid));

    merged.syncJournal = _mergeJournal(B, L, R, conflicts);

    // Phase 4 GC — applied to the merged OUTPUT (the union), so both devices converge:
    // a stale tombstone re-added from a peer's union is pruned again on the next merge.
    if (gcNow != null) {
        const tBefore = merged.tombstones.length;
        merged.tombstones = merged.tombstones.filter(t => (gcNow - (t.deletedAt || 0)) < TOMBSTONE_TTL_MS);
        stats.gcTombstones = tBefore - merged.tombstones.length;

        const jBefore = merged.syncJournal.length;
        // keep UNRESOLVED forever; collect only the resolved tail past the horizon.
        merged.syncJournal = merged.syncJournal.filter(e => !(e && e.resolved && (gcNow - (e.resolvedAt || 0)) >= JOURNAL_TTL_MS));
        stats.gcJournal = jBefore - merged.syncJournal.length;
    }

    merged._alloc = _reindex(merged, L);
    stats.conflicts = conflicts.length;
    return { merged, conflicts, stats };
}

function _emptySubset(s) {
    const base = { tasks: [], groups: [], notes: [], templates: [], noteTemplates: [], tombstones: [], syncJournal: [], _alloc: null };
    if (!s) return base;
    return Object.assign(base, _clone(s));
}

// ── Public: subset extract / apply ───────────────────────────────────────────
function getSyncSubset(state) {
    const tasks = [].concat(
        (state.tasks   || []).map(t => Object.assign(_clone(t), { _arch: false })),
        (state.archive || []).map(t => Object.assign(_clone(t), { _arch: true  })),
    );
    const notes = [].concat(
        (state.notes        || []).map(n => Object.assign(_clone(n), { _arch: false })),
        (state.notesArchive || []).map(n => Object.assign(_clone(n), { _arch: true  })),
    );
    return {
        tasks,
        groups:        _clone(state.groups) || [],
        notes,
        templates:     _clone(state.templates) || [],
        noteTemplates: _clone(state.noteTemplates) || [],
        tombstones:    _clone(state.tombstones) || [],
        syncJournal:   _clone(state.syncJournal) || [],
        _alloc: {
            nextId:         state.nextId         || 1,
            nextGroupId:    state.nextGroupId    || 1,
            nextSubId:      state.nextSubId      || 1,
            nextTemplateId: state.nextTemplateId || 1,
        },
    };
}

function applySyncSubset(state, merged) {
    const stripTask = t => { const { _arch, _groupUid, ...rest } = t; return rest; };
    const stripNote = n => { const { _arch, ...rest } = n; return rest; };
    state.tasks        = merged.tasks.filter(t => !t._arch).map(stripTask);
    state.archive      = merged.tasks.filter(t =>  t._arch).map(stripTask);
    state.notes        = merged.notes.filter(n => !n._arch).map(stripNote);
    state.notesArchive = merged.notes.filter(n =>  n._arch).map(stripNote);
    state.groups        = merged.groups.slice();
    state.templates     = merged.templates.slice();
    state.noteTemplates = merged.noteTemplates.slice();
    state.tombstones    = merged.tombstones.slice();
    state.syncJournal   = merged.syncJournal.slice();
    if (merged._alloc) {
        state.nextId         = merged._alloc.nextId;
        state.nextGroupId    = merged._alloc.nextGroupId;
        state.nextSubId      = merged._alloc.nextSubId;
        state.nextTemplateId = merged._alloc.nextTemplateId;
    }
    return state;
}

// ── Public: storage wrappers (browser) + badge count ─────────────────────────
function loadBaseline() {
    try {
        if (typeof localStorage === 'undefined') return null;
        const raw = localStorage.getItem(K_SYNC_BASELINE);
        return raw ? JSON.parse(raw) : null;
    } catch (_) { return null; }
}
function saveBaseline(subset) {
    try { if (typeof localStorage !== 'undefined') localStorage.setItem(K_SYNC_BASELINE, JSON.stringify(subset)); } catch (_) {}
}
function snapshotPreMerge(localJson) {
    try { if (typeof localStorage !== 'undefined') localStorage.setItem(K_SYNC_PREMERGE, localJson); } catch (_) {}
}
function unresolvedCount(state) {
    return (((state && state.syncJournal) || []).filter(e => e && !e.resolved)).length;
}

// node test harness import (no-op in the browser classic-script context)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        mergeStates, getSyncSubset, applySyncSubset,
        loadBaseline, saveBaseline, snapshotPreMerge, unresolvedCount,
        SYNC_COLLECTIONS, K_SYNC_BASELINE, K_SYNC_PREMERGE,
        TOMBSTONE_TTL_MS, JOURNAL_TTL_MS,
    };
}
