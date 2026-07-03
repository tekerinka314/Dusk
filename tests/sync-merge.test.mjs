// Sync Phase 1 — the pure 3-way merge engine (dusk/09-sync.js), 39 cases.
// Ported node harness (was tests/harness/sync-merge.cjs; body kept verbatim).
// The module is loaded as a side-effect import — its 2a globalThis bridges
// publish the API — so this test survives the 09-sync.js → .ts rename (Этап 3).
import { it, expect } from 'vitest';
import '../dusk/09-sync.js';
const { mergeStates, getSyncSubset, applySyncSubset, loadBaseline, saveBaseline, snapshotPreMerge, unresolvedCount } = globalThis;

let pass = 0; const failures = [];
function ok(cond, name) { if (cond) pass++; else failures.push(name); }
function clone(x) { return JSON.parse(JSON.stringify(x)); }
function stable(v) {
    if (v === null || typeof v !== 'object') return JSON.stringify(v) ?? 'null';
    if (Array.isArray(v)) return '[' + v.map(stable).join(',') + ']';
    return '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + stable(v[k])).join(',') + '}';
}
const findU = (arr, uid) => arr.find(r => r.uid === uid);
const findId = (arr, id) => arr.find(r => r.id === id);

// ── factories ────────────────────────────────────────────────────────────────
function S(p = {}) {
    return {
        tasks: p.tasks || [], groups: p.groups || [], notes: p.notes || [],
        templates: p.templates || [], noteTemplates: p.noteTemplates || [],
        tombstones: p.tombstones || [], syncJournal: p.syncJournal || [],
        _alloc: p._alloc || { nextId: 100, nextGroupId: 100, nextSubId: 100, nextTemplateId: 100 },
    };
}
function T(uid, over = {}) {
    return Object.assign({
        id: 1, uid, text: 't', checked: false, priority: 'none', groupId: null,
        deadline: null, note: '', color: null, pinned: false, order: 0,
        repeat: 'none', cycleChecked: false, nextReset: null, subtasksOpen: false, noteOpen: false,
        subtasks: [], _arch: false, createdAt: 1000, updatedAt: 1000,
    }, over);
}
function SUB(uid, over = {}) {
    return Object.assign({ id: 1, uid, text: 's', note: '', priority: 'none', order: 0, checked: false, repeat: 'none', cycleChecked: false, updatedAt: 1000 }, over);
}
function G(uid, over = {}) { return Object.assign({ id: 1, uid, name: 'g', color: null, createdAt: 1000, updatedAt: 1000 }, over); }
function N(id, over = {}) { return Object.assign({ id, title: '', body: 'A', fmt: true, color: null, _arch: false, createdAt: 1000, updatedAt: 1000 }, over); }
function TOMB(uid, over = {}) { return Object.assign({ uid, type: 'task', parentUid: null, deletedAt: 2000 }, over); }

// ── 1. first sync both empty ─────────────────────────────────────────────────
{
    const { merged, conflicts } = mergeStates(null, S(), S());
    ok(merged.tasks.length === 0 && merged.groups.length === 0 && conflicts.length === 0, '1 first-sync empty');
}
// ── 2. union: local has tasks, remote empty ──────────────────────────────────
{
    const { merged, conflicts } = mergeStates(S(), S({ tasks: [T('a')] }), S());
    ok(merged.tasks.length === 1 && findU(merged.tasks, 'a') && conflicts.length === 0, '2 union local-only');
}
// ── 3. disjoint adds → both, no conflict ─────────────────────────────────────
{
    const { merged, conflicts } = mergeStates(S(), S({ tasks: [T('a')] }), S({ tasks: [T('b')] }));
    ok(merged.tasks.length === 2 && findU(merged.tasks, 'a') && findU(merged.tasks, 'b') && conflicts.length === 0, '3 disjoint adds');
}
// ── 4. one-sided edit wins ───────────────────────────────────────────────────
{
    const base = S({ tasks: [T('a', { text: 'A' })] });
    const local = S({ tasks: [T('a', { text: 'B', updatedAt: 2000 })] });
    const remote = S({ tasks: [T('a', { text: 'A' })] });
    const { merged, conflicts } = mergeStates(base, local, remote);
    ok(findU(merged.tasks, 'a').text === 'B' && conflicts.length === 0, '4 one-sided edit');
}
// ── 5. field-level: priority on A, deadline on B → both survive ──────────────
{
    const base = S({ tasks: [T('a', { priority: 'none', deadline: null })] });
    const local = S({ tasks: [T('a', { priority: 'high', updatedAt: 2000 })] });
    const dl = { mode: 'date', value: '2026-07-01' };
    const remote = S({ tasks: [T('a', { deadline: dl, updatedAt: 2000 })] });
    const { merged, conflicts } = mergeStates(base, local, remote);
    const m = findU(merged.tasks, 'a');
    ok(m.priority === 'high' && stable(m.deadline) === stable(dl) && conflicts.length === 0, '5 field-level both survive');
}
// ── 6. same-field conflict: both change text → newer wins + loser quarantined ─
{
    const base = S({ tasks: [T('a', { text: 'A' })] });
    const local = S({ tasks: [T('a', { text: 'B', updatedAt: 2000 })] });
    const remote = S({ tasks: [T('a', { text: 'C', updatedAt: 3000 })] });
    const { merged, conflicts } = mergeStates(base, local, remote);
    ok(findU(merged.tasks, 'a').text === 'C', '6 same-field newer wins');
    ok(conflicts.length === 1 && conflicts[0].kind === 'field' && conflicts[0].field === 'text' && conflicts[0].loser === 'B', '6 same-field loser quarantined');
}
// ── 7. two new subtasks → both survive ───────────────────────────────────────
{
    const base = S({ tasks: [T('a', { subtasks: [] })] });
    const local = S({ tasks: [T('a', { updatedAt: 2000, subtasks: [SUB('x')] })] });
    const remote = S({ tasks: [T('a', { updatedAt: 2000, subtasks: [SUB('y')] })] });
    const { merged, conflicts } = mergeStates(base, local, remote);
    const subs = findU(merged.tasks, 'a').subtasks;
    ok(subs.length === 2 && subs.find(s => s.uid === 'x') && subs.find(s => s.uid === 'y') && conflicts.length === 0, '7 two new subtasks');
}
// ── 8. subtask deleted on A, untouched B → deleted ───────────────────────────
{
    const base = S({ tasks: [T('a', { subtasks: [SUB('s1')] })] });
    const local = S({ tasks: [T('a', { updatedAt: 2000, subtasks: [] })] });
    const remote = S({ tasks: [T('a', { subtasks: [SUB('s1')] })] });
    const { merged, conflicts } = mergeStates(base, local, remote);
    ok(findU(merged.tasks, 'a').subtasks.length === 0 && conflicts.length === 0, '8 subtask deleted one-sided');
}
// ── 9. same-subtask conflict → newer wins + loser quarantined ────────────────
{
    const base = S({ tasks: [T('a', { subtasks: [SUB('s1', { text: 'A' })] })] });
    const local = S({ tasks: [T('a', { updatedAt: 2000, subtasks: [SUB('s1', { text: 'B', updatedAt: 2000 })] })] });
    const remote = S({ tasks: [T('a', { updatedAt: 3000, subtasks: [SUB('s1', { text: 'C', updatedAt: 3000 })] })] });
    const { merged, conflicts } = mergeStates(base, local, remote);
    ok(findU(merged.tasks, 'a').subtasks[0].text === 'C', '9 same-subtask newer wins');
    ok(conflicts.length === 1 && conflicts[0].kind === 'subtask' && conflicts[0].loser.text === 'B', '9 same-subtask loser quarantined');
}
// ── 10. subtask tiebreak uses SUBTASK updatedAt, not the parent's ────────────
{
    const base = S({ tasks: [T('a', { subtasks: [SUB('s1', { text: 'A' })] })] });
    // local parent NEWER (9000) but its subtask OLDER (2000); remote parent older but subtask newer (5000)
    const local = S({ tasks: [T('a', { updatedAt: 9000, subtasks: [SUB('s1', { text: 'B', updatedAt: 2000 })] })] });
    const remote = S({ tasks: [T('a', { updatedAt: 1500, subtasks: [SUB('s1', { text: 'C', updatedAt: 5000 })] })] });
    const { merged } = mergeStates(base, local, remote);
    ok(findU(merged.tasks, 'a').subtasks[0].text === 'C', '10 subtask tiebreak by subtask clock');
}
// ── 11. delete-vs-edit (A deletes, B edits) → DELETED + edited copy quarantined ─
{
    const base = S({ tasks: [T('a', { text: 'A' })] });
    const local = S({ tasks: [], tombstones: [TOMB('a')] });
    const remote = S({ tasks: [T('a', { text: 'B', updatedAt: 2000 })] });
    const { merged, conflicts } = mergeStates(base, local, remote);
    ok(merged.tasks.length === 0 && merged.tombstones.some(t => t.uid === 'a'), '11 delete-vs-edit → deleted');
    ok(conflicts.length === 1 && conflicts[0].kind === 'delete-vs-edit' && conflicts[0].loser.text === 'B', '11 delete-vs-edit edited copy quarantined');
}
// ── 12. delete-vs-edit reverse (B deletes, A edits) symmetric ────────────────
{
    const base = S({ tasks: [T('a', { text: 'A' })] });
    const local = S({ tasks: [T('a', { text: 'B', updatedAt: 2000 })] });
    const remote = S({ tasks: [], tombstones: [TOMB('a')] });
    const { merged, conflicts } = mergeStates(base, local, remote);
    ok(merged.tasks.length === 0 && conflicts.length === 1 && conflicts[0].kind === 'delete-vs-edit' && conflicts[0].loser.text === 'B', '12 delete-vs-edit reverse');
}
// ── 13. tombstone vs tombstone → one tombstone, no conflict ──────────────────
{
    const base = S({ tasks: [T('a')] });
    const local = S({ tasks: [], tombstones: [TOMB('a', { deletedAt: 2000 })] });
    const remote = S({ tasks: [], tombstones: [TOMB('a', { deletedAt: 3000 })] });
    const { merged, conflicts } = mergeStates(base, local, remote);
    ok(merged.tasks.length === 0 && merged.tombstones.filter(t => t.uid === 'a').length === 1 && conflicts.length === 0, '13 tombstone vs tombstone');
}
// ── 14. archive vs live (location) → newer location wins ─────────────────────
{
    const base = S({ tasks: [T('a', { _arch: false })] });
    const local = S({ tasks: [T('a', { _arch: true, archivedAt: 2000, updatedAt: 2000 })] });
    const remote = S({ tasks: [T('a', { _arch: false })] });
    const { merged } = mergeStates(base, local, remote);
    ok(findU(merged.tasks, 'a')._arch === true, '14 archive location wins');
    const st = {}; applySyncSubset(st, merged);
    ok(st.archive.length === 1 && st.tasks.length === 0, '14 applySyncSubset splits archive');
}
// ── 15. groups field-level + rename-vs-delete ────────────────────────────────
{
    const baseG = G('g1', { name: 'X', color: 'c1' });
    const local = S({ groups: [Object.assign(clone(baseG), { name: 'Y', updatedAt: 2000 })] });
    const remote = S({ groups: [Object.assign(clone(baseG), { color: 'c2', updatedAt: 2000 })] });
    const base = S({ groups: [clone(baseG)] });
    const r1 = mergeStates(base, local, remote);
    const mg = findU(r1.merged.groups, 'g1');
    ok(mg.name === 'Y' && mg.color === 'c2' && r1.conflicts.length === 0, '15 groups field-level');
    const local2 = S({ groups: [Object.assign(clone(baseG), { name: 'Y', updatedAt: 2000 })] });
    const remote2 = S({ groups: [], tombstones: [TOMB('g1', { type: 'group' })] });
    const r2 = mergeStates(base, local2, remote2);
    ok(r2.merged.groups.length === 0 && r2.conflicts.length === 1 && r2.conflicts[0].kind === 'delete-vs-edit', '15 group rename-vs-delete');
}
// ── 16. group+tasks via groupUid → task.groupId points to merged group ───────
{
    const local = S({ groups: [G('g1', { id: 10, name: 'P' })], tasks: [T('ta', { id: 1, groupId: 10 })] });
    const remote = S({ groups: [G('g1', { id: 77, name: 'P' })], tasks: [T('tb', { id: 5, groupId: 77 })] });
    const { merged } = mergeStates(S(), local, remote);
    ok(merged.groups.length === 1, '16 group deduped by uid');
    const gid = merged.groups[0].id;
    const ta = findU(merged.tasks, 'ta'), tb = findU(merged.tasks, 'tb');
    ok(ta.groupId === gid && tb.groupId === gid && ta._groupUid === undefined, '16 groupId rebuilt from groupUid');
}
// ── 17. int-id collision → both kept, unique int ids ─────────────────────────
{
    const local = S({ tasks: [T('alpha', { id: 5 })] });
    const remote = S({ tasks: [T('beta', { id: 5 })] });
    const { merged } = mergeStates(S(), local, remote);
    const ids = merged.tasks.map(t => t.id);
    ok(merged.tasks.length === 2 && new Set(ids).size === 2, '17 int-id collision resolved');
}
// ── 18. notes keep-both: both edit a note → newer lives + other quarantined ──
{
    const base = S({ notes: [N('n1', { body: 'A' })] });
    const local = S({ notes: [N('n1', { body: 'B', updatedAt: 2000 })] });
    const remote = S({ notes: [N('n1', { body: 'C', updatedAt: 3000 })] });
    const { merged, conflicts } = mergeStates(base, local, remote);
    ok(findId(merged.notes, 'n1').body === 'C', '18 note newer lives');
    ok(conflicts.length === 1 && conflicts[0].kind === 'note-both' && conflicts[0].loser.body === 'B', '18 note loser quarantined');
}
// ── 19. notes sequential (baseline advanced) → NO conflict ───────────────────
{
    const base = S({ notes: [N('n1', { body: 'B', updatedAt: 2000 })] });
    const local = S({ notes: [N('n1', { body: 'C', updatedAt: 3000 })] });
    const remote = S({ notes: [N('n1', { body: 'B', updatedAt: 2000 })] });
    const { merged, conflicts } = mergeStates(base, local, remote);
    ok(findId(merged.notes, 'n1').body === 'C' && conflicts.length === 0, '19 notes sequential no conflict');
}
// ── 20. journal union: prior entry survives + this run's new entry appended ───
{
    const E1 = { uid: 'e1', kind: 'field', recType: 'tasks', recUid: 'x', field: 'text', loser: 'old', winner: 'new', reason: 'r', createdAt: 1, resolved: false, resolvedAt: null, resolution: null };
    const base = S({ tasks: [T('a', { text: 'A' })], syncJournal: [E1] });
    const local = S({ tasks: [T('a', { text: 'B', updatedAt: 2000 })], syncJournal: [clone(E1)] });
    const remote = S({ tasks: [T('a', { text: 'C', updatedAt: 3000 })], syncJournal: [clone(E1)] });
    const { merged } = mergeStates(base, local, remote);
    ok(merged.syncJournal.filter(e => e.uid === 'e1').length === 1, '20 journal union dedups prior entry');
    ok(merged.syncJournal.length === 2, '20 journal appends this run new entry');
}
// ── 21. journal resolved-flag newer-wins ─────────────────────────────────────
{
    const E1u = { uid: 'e1', kind: 'field', recType: 'tasks', recUid: 'x', loser: 'old', resolved: false, resolvedAt: null };
    const E1r = Object.assign(clone(E1u), { resolved: true, resolvedAt: 5000, resolution: 'keep-winner' });
    const base = S({ syncJournal: [clone(E1u)] });
    const local = S({ syncJournal: [E1r] });
    const remote = S({ syncJournal: [clone(E1u)] });
    const { merged } = mergeStates(base, local, remote);
    const e = merged.syncJournal.find(e => e.uid === 'e1');
    ok(e && e.resolved === true && e.resolvedAt === 5000, '21 journal resolved newer-wins');
}
// ── 22. idempotence: merge(b,X,X)==X and merge(b,L,b)==L (no spurious conflicts) ─
{
    const base = S({ tasks: [T('a', { text: 'A' })], groups: [G('g1')] });
    const X = S({ tasks: [T('a', { text: 'B', updatedAt: 2000 })], groups: [G('g1', { name: 'Y', updatedAt: 2000 })] });
    const rXX = mergeStates(base, clone(X), clone(X));
    ok(rXX.conflicts.length === 0 && findU(rXX.merged.tasks, 'a').text === 'B' && findU(rXX.merged.groups, 'g1').name === 'Y', '22 merge(b,X,X)==X');
    const L = S({ tasks: [T('a', { text: 'L', updatedAt: 4000 })], groups: [G('g1')] });
    const rLb = mergeStates(base, clone(L), clone(base));
    ok(rLb.conflicts.length === 0 && findU(rLb.merged.tasks, 'a').text === 'L', '22 merge(b,L,b)==L');
}
// ── 23. re-merge stability: baseline:=merged, re-merge no changes → 0 conflicts ─
{
    const base = S({ tasks: [T('a', { text: 'A' })] });
    const r1 = mergeStates(base, S({ tasks: [T('a', { text: 'B', updatedAt: 2000 })] }), S({ tasks: [T('a', { text: 'A' })] }));
    const m = r1.merged;
    const r2 = mergeStates(clone(m), clone(m), clone(m));
    ok(r2.conflicts.length === 0 && r2.merged.tasks.length === m.tasks.length, '23 re-merge stability');
}
// ── 24. next* > max(used) after merge ────────────────────────────────────────
{
    const local = S({ tasks: [T('alpha', { id: 5 })], groups: [G('g1', { id: 9 })] });
    const remote = S({ tasks: [T('beta', { id: 5 })] });
    const { merged } = mergeStates(S(), local, remote);
    const maxId = Math.max(...merged.tasks.map(t => t.id));
    const maxG = Math.max(...merged.groups.map(g => g.id));
    ok(merged._alloc.nextId > maxId && merged._alloc.nextGroupId > maxG, '24 allocators above max used');
}
// ── 25. updatedAt/createdAt preserved through merge (NOT stamped to now) ──────
{
    const base = S({ tasks: [T('a', { text: 'A', createdAt: 1000, updatedAt: 1000 })] });
    const local = S({ tasks: [T('a', { text: 'B', createdAt: 1000, updatedAt: 2000 })] });
    const remote = S({ tasks: [T('a', { text: 'A', createdAt: 1000, updatedAt: 1000 })] });
    const { merged } = mergeStates(base, local, remote);
    const m = findU(merged.tasks, 'a');
    ok(m.updatedAt === 2000 && m.createdAt === 1000, '25 timestamps preserved');
}
// ── 26. tombstones + resolved journal entries accumulate (GC deferred) ───────
{
    const E1r = { uid: 'e1', kind: 'field', recType: 'tasks', recUid: 'z', loser: 'old', resolved: true, resolvedAt: 4000 };
    const base = S({ tasks: [T('a')], syncJournal: [E1r] });
    const local = S({ tasks: [], tombstones: [TOMB('a')], syncJournal: [clone(E1r)] });
    const remote = S({ tasks: [], tombstones: [TOMB('a')], syncJournal: [clone(E1r)] });
    const { merged } = mergeStates(base, local, remote);
    ok(merged.tombstones.some(t => t.uid === 'a') && merged.syncJournal.some(e => e.uid === 'e1' && e.resolved), '26 tombstones + resolved journal kept (not pruned)');
}
// ── 27. base===null first sync = union, conflicts only on true divergence ────
{
    const { merged, conflicts } = mergeStates(null, S({ tasks: [T('a')] }), S({ tasks: [T('b')] }));
    ok(merged.tasks.length === 2 && conflicts.length === 0, '27 base null union');
}
// ── 28. storage wrappers + unresolvedCount (mock localStorage) ───────────────
{
    const _ls = {};
    global.localStorage = {
        getItem: k => (k in _ls ? _ls[k] : null),
        setItem: (k, v) => { _ls[k] = String(v); },
        removeItem: k => { delete _ls[k]; },
    };
    const sub = S({ tasks: [T('a')] });
    saveBaseline(sub);
    const got = loadBaseline();
    ok(got && stable(got) === stable(sub), '28 baseline save/load roundtrip');
    snapshotPreMerge(JSON.stringify({ hi: 1 }));
    ok(_ls['dusk_sync_premerge_v1'] === JSON.stringify({ hi: 1 }), '28 premerge snapshot stored');
    ok(unresolvedCount({ syncJournal: [{ resolved: false }, { resolved: true }, { resolved: false }] }) === 2, '28 unresolvedCount');
    delete global.localStorage;
}

it('sync merge engine (Phase 1) — 39 cases', () => {
    expect(failures).toEqual([]);
    expect(pass).toBe(39);
});
