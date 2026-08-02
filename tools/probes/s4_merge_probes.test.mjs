// S4/B6 — Tier-0 & Tier-1 PURE-MERGE probes (node, via vitest .ts transform).
// Loads the REAL dusk/09-sync.ts by side-effect (its 2a globalThis bridges
// publish mergeStates etc.). Covers the GAPS the vitest sync-merge suite does
// NOT pin: P1 grimEmptyCrypt resurrection, P7 archive-vs-edit / group-cascade /
// promote-vs-edit / templates. Run:  npx vitest run <thispath>
import { it, expect } from 'vitest';
import { writeFileSync } from 'fs';
import '../../../VSCode projects/DUSK_v2.0/dusk/09-sync.ts';
const { mergeStates } = globalThis;
const OUT = 'D:/VSCode projects/DUSK_v2.0/audit-v2/shots/s4/p1_p7_merge.json';

const findId = (a, id) => a.find(r => r.id === id);
const findU  = (a, u)  => a.find(r => r.uid === u);
const results = [];
function rec(name, pass, detail) { results.push({ name, pass, detail }); }

// subset factories (mergeStates input shape = getSyncSubset output)
function SS(p = {}) {
  return {
    tasks: p.tasks || [], groups: p.groups || [], notes: p.notes || [],
    templates: p.templates || [], noteTemplates: p.noteTemplates || [],
    tombstones: p.tombstones || [], syncJournal: p.syncJournal || [],
    _alloc: p._alloc || { nextId: 100, nextGroupId: 100, nextSubId: 100, nextTemplateId: 100 },
  };
}
const T = (uid, o = {}) => Object.assign({ id: 1, uid, text: 't', checked: false, priority: 'none', groupId: null, deadline: null, note: '', color: null, pinned: false, order: 0, repeat: 'none', cycleChecked: false, nextReset: null, subtasks: [], _arch: false, createdAt: 1000, updatedAt: 1000 }, o);
const SUB = (uid, o = {}) => Object.assign({ id: 1, uid, text: 's', note: '', priority: 'none', order: 0, checked: false, repeat: 'none', cycleChecked: false, updatedAt: 1000 }, o);
const G = (uid, o = {}) => Object.assign({ id: 1, uid, name: 'g', color: null, createdAt: 1000, updatedAt: 1000 }, o);
const N = (id, o = {}) => Object.assign({ id, title: '', body: 'A', fmt: true, color: null, _arch: false, createdAt: 1000, updatedAt: 1000 }, o);
const TPL = (uid, o = {}) => Object.assign({ uid, id: 1, name: 'tpl', priority: 'none', color: null, updatedAt: 1000 }, o);
const TOMB = (uid, o = {}) => Object.assign({ uid, type: 'task', parentUid: null, deletedAt: 2000 }, o);

// ── P1: grimEmptyCrypt resurrection ─────────────────────────────────────────
// Archived note in base+remote, ABSENT on local, NO tombstone (grimEmptyCrypt
// wipes state.notesArchive=[] with no addTombstone) → note must RESURRECT.
{
  const arch = N('na1', { _arch: true, body: 'buried', updatedAt: 1000 });
  const base   = SS({ notes: [arch] });
  const local  = SS({ notes: [] });                 // crypt emptied, no tombstone
  const remote = SS({ notes: [arch] });
  const { merged } = mergeStates(base, local, remote);
  const back = findId(merged.notes, 'na1');
  rec('P1 resurrection (no tombstone)', !!back && back._arch === true && back.body === 'buried',
    `merged.notes has na1=${!!back}`);
}
// control: with tombstone → stays deleted
{
  const arch = N('na1', { _arch: true, body: 'buried', updatedAt: 1000 });
  const base   = SS({ notes: [arch] });
  const local  = SS({ notes: [], tombstones: [{ uid: 'na1', type: 'note', parentUid: null, deletedAt: 2000 }] });
  const remote = SS({ notes: [arch] });
  const { merged } = mergeStates(base, local, remote);
  const back = findId(merged.notes, 'na1');
  rec('P1 control (tombstone → deleted)', !back && merged.tombstones.some(t => t.uid === 'na1'),
    `na1 gone=${!back}`);
}

// ── P7a: archive-on-A vs text-edit-on-B (field-level, both survive) ─────────
{
  const base   = SS({ tasks: [T('a', { text: 'X', _arch: false })] });
  const local  = SS({ tasks: [T('a', { text: 'X', _arch: true, archivedAt: 2000, updatedAt: 2000 })] });
  const remote = SS({ tasks: [T('a', { text: 'EDITED', _arch: false, updatedAt: 2000 })] });
  const { merged, conflicts } = mergeStates(base, local, remote);
  const m = findU(merged.tasks, 'a');
  rec('P7a archive+edit both survive', m && m._arch === true && m.text === 'EDITED' && conflicts.length === 0,
    `_arch=${m && m._arch} text=${m && m.text} conflicts=${conflicts.length}`);
}

// ── P7b: group cascade-delete on A vs task-edit-in-group on B ────────────────
// A deletes group g10 → cascade tombstones the group + member task; B edits the task.
{
  const base   = SS({ groups: [G('g10')], tasks: [T('t1', { groupId: 10, text: 'X' })] });
  const local  = SS({ groups: [], tasks: [], tombstones: [
    { uid: 'g10', type: 'group', parentUid: null, deletedAt: 2000 },
    { uid: 't1',  type: 'task',  parentUid: null, deletedAt: 2000 },
  ] });
  const remote = SS({ groups: [G('g10')], tasks: [T('t1', { groupId: 10, text: 'EDITED', updatedAt: 2000 })] });
  const { merged, conflicts } = mergeStates(base, local, remote);
  const taskGone  = !findU(merged.tasks, 't1');
  const groupGone = !findU(merged.groups, 'g10');
  const dve = conflicts.find(c => c.kind === 'delete-vs-edit' && c.recUid === 't1');
  rec('P7b group cascade delete-vs-edit', taskGone && groupGone && !!dve && dve.loser.text === 'EDITED',
    `task gone=${taskGone} group gone=${groupGone} quarantine=${!!dve}`);
}

// ── P7c: promote subtask on A vs edit-same-subtask on B ─────────────────────
// A promotes sub s1 → new task (fresh uid) + removes s1 from parent (no sub tombstone).
// B edits s1's text. Merge: s1 delete-vs-edit → DELETED from parent + B edit quarantined;
// promoted task added. No uid reuse, no silent drop.
{
  const base   = SS({ tasks: [T('p', { subtasks: [SUB('s1', { text: 'orig' })] })] });
  const local  = SS({ tasks: [
    T('p', { updatedAt: 2000, subtasks: [] }),                        // s1 removed by promote
    T('promoted', { id: 50, text: 'orig', updatedAt: 2000 }),         // new task, fresh uid
  ] });
  const remote = SS({ tasks: [T('p', { updatedAt: 2000, subtasks: [SUB('s1', { text: 'EDITED', updatedAt: 2000 })] })] });
  const { merged, conflicts } = mergeStates(base, local, remote);
  const parent = findU(merged.tasks, 'p');
  const promoted = findU(merged.tasks, 'promoted');
  const s1gone = parent && !parent.subtasks.some(s => s.uid === 's1');
  const q = conflicts.find(c => c.kind === 'subtask' && c.loser && c.loser.text === 'EDITED');
  rec('P7c promote-vs-edit: no reuse, edit quarantined', !!promoted && s1gone && !!q,
    `promoted kept=${!!promoted} s1 gone from parent=${s1gone} quarantine=${!!q}`);
}

// ── P7d: templates + noteTemplates field-level merge ────────────────────────
{
  const base   = SS({ templates: [TPL('tp1', { name: 'A', color: 'c1' })] });
  const local  = SS({ templates: [TPL('tp1', { name: 'B', color: 'c1', updatedAt: 2000 })] });
  const remote = SS({ templates: [TPL('tp1', { name: 'A', color: 'c2', updatedAt: 2000 })] });
  const { merged, conflicts } = mergeStates(base, local, remote);
  const m = findU(merged.templates, 'tp1');
  rec('P7d templates field-level', m && m.name === 'B' && m.color === 'c2' && conflicts.length === 0,
    `name=${m && m.name} color=${m && m.color}`);
}
{
  const NT = (id, o = {}) => Object.assign({ id, name: 'nt', body: 'A', updatedAt: 1000 }, o);
  const base   = SS({ noteTemplates: [NT('ntp1', { name: 'A', body: 'X' })] });
  const local  = SS({ noteTemplates: [NT('ntp1', { name: 'B', body: 'X', updatedAt: 2000 })] });
  const remote = SS({ noteTemplates: [NT('ntp1', { name: 'A', body: 'Y', updatedAt: 2000 })] });
  const { merged, conflicts } = mergeStates(base, local, remote);
  const m = findId(merged.noteTemplates, 'ntp1');
  rec('P7d noteTemplates field-level', m && m.name === 'B' && m.body === 'Y' && conflicts.length === 0,
    `name=${m && m.name} body=${m && m.body}`);
}

it('S4 merge probes', () => {
  writeFileSync(OUT, JSON.stringify(results, null, 2));
  // report-only: no hard assert (probes RECORD behavior; failures are findings)
  expect(results.length).toBeGreaterThan(0);
});
