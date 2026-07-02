// Phase 4 GC: age-based pruning of tombstones + resolved journal entries inside
// mergeStates (dusk/09-sync.js). GC runs ONLY when opts.gcNow is passed (so the
// merge stays a deterministic pure fn for the other tests). Run:
//   node "tests/harness/_syncgc_test.cjs"
const S = require('../../dusk/09-sync.js');
let pass = 0, fail = 0;
const rec = (n, c, d) => { if (c) pass++; else { fail++; console.log('  FAIL:', n, d != null ? '· ' + JSON.stringify(d) : ''); } };

const DAY = 86400000;
const NOW = 1900000000000;                 // fixed clock (≈2030) — no Date.now() in the test
const old = NOW - 100 * DAY;               // past the 90-day horizon
const fresh = NOW - 10 * DAY;              // within the horizon
const tombUids = m => (m.tombstones || []).map(t => t.uid).sort();
const jrUids   = m => (m.syncJournal || []).map(e => e.uid).sort();

// sanity: horizon is the documented 90 days
rec('TTL = 90 days', S.TOMBSTONE_TTL_MS === 90 * DAY && S.JOURNAL_TTL_MS === 90 * DAY, { t: S.TOMBSTONE_TTL_MS, j: S.JOURNAL_TTL_MS });

const local = {
    tombstones: [{ uid: 'OLD', deletedAt: old }, { uid: 'NEW', deletedAt: fresh }],
    syncJournal: [
        { uid: 'jr-old-res',   kind: 'field', resolved: true,  resolvedAt: old,   loser: 1 },
        { uid: 'jr-old-unres', kind: 'field', resolved: false, resolvedAt: null, createdAt: old, loser: 2 },
        { uid: 'jr-new-res',   kind: 'field', resolved: true,  resolvedAt: fresh, loser: 3 },
    ],
};

// 1. GC OFF by default (no gcNow) — nothing pruned (backward-compatible / pure).
let off = S.mergeStates(null, local, null);
rec('GC off: all tombstones kept', tombUids(off.merged).join() === 'NEW,OLD', tombUids(off.merged));
rec('GC off: all journal entries kept', jrUids(off.merged).length === 3, jrUids(off.merged));
rec('GC off: stats counters zero', off.stats.gcTombstones === 0 && off.stats.gcJournal === 0, off.stats);

// 2. GC ON — old tombstone pruned, fresh kept.
let on = S.mergeStates(null, local, null, { gcNow: NOW });
rec('GC on: old tombstone pruned, fresh kept', tombUids(on.merged).join() === 'NEW', tombUids(on.merged));
rec('GC on: gcTombstones count = 1', on.stats.gcTombstones === 1, on.stats);

// 3. GC ON — resolved-old pruned; UNRESOLVED-old kept forever; resolved-fresh kept.
rec('GC on: resolved-old pruned', !jrUids(on.merged).includes('jr-old-res'), jrUids(on.merged));
rec('GC on: unresolved-old KEPT (forever)', jrUids(on.merged).includes('jr-old-unres'), jrUids(on.merged));
rec('GC on: resolved-fresh kept', jrUids(on.merged).includes('jr-new-res'), jrUids(on.merged));
rec('GC on: gcJournal count = 1', on.stats.gcJournal === 1, on.stats);

// 4. Convergence: a peer's union RE-ADDS the old tombstone (base+local have it,
//    remote lacks it) → GC prunes it again on the output. No oscillation.
const base = { tombstones: [{ uid: 'OLD', deletedAt: old }] };
const loc2 = { tombstones: [{ uid: 'OLD', deletedAt: old }] };
const rem2 = { tombstones: [] };
let conv = S.mergeStates(base, loc2, rem2, { gcNow: NOW });
rec('convergence: re-added stale tombstone pruned on output', tombUids(conv.merged).length === 0, tombUids(conv.merged));

// 5. A tombstone exactly at the boundary (age == TTL) is pruned (>= horizon).
let edge = S.mergeStates(null, { tombstones: [{ uid: 'EDGE', deletedAt: NOW - 90 * DAY }] }, null, { gcNow: NOW });
rec('boundary: age == TTL → pruned', tombUids(edge.merged).length === 0, tombUids(edge.merged));

// 6. GC never touches LIVE records (a tombstone whose key is live was already dropped
//    by the present-set filter; ensure a live task with an old createdAt is untouched).
let live = S.mergeStates(null, {
    tasks: [{ uid: 'T1', _arch: false, text: 'x', createdAt: old, updatedAt: old, subtasks: [] }],
    tombstones: [{ uid: 'OLD', deletedAt: old }],
}, null, { gcNow: NOW });
rec('live record with old createdAt is NOT pruned', (live.merged.tasks || []).some(t => t.uid === 'T1'), (live.merged.tasks || []).map(t => t.uid));

console.log(`\nPhase 4 GC test: ${pass} passed, ${fail} failed  (total ${pass + fail})`);
process.exit(fail ? 1 : 0);
