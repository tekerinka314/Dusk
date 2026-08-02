// S4/B6 P13 — view-mode COMBINATION matrix (runtime, per plan "полностью").
// Drives the real app across structural view modes (normal/split/schedule/
// schedule+split) × filters (focusGroup/colorFilter/today) × sort, asserting:
//  (1) no JS/page error in any combo,
//  (2) STRUCTURAL toggles (no filter) CONSERVE all tasks (none silently vanish),
//  (3) empty-state plaque visible IFF zero tasks visible (V-2 class regression),
//  (4) focus/color filters only ever narrow (visible ⊆ matching set).
import { serve, launch, openApp } from './lib.mjs';
import { richSeed } from './seed.mjs';
import fs from 'fs';

const OUT = 'D:/VSCode projects/DUSK_v2.0/audit-v2/shots/s4/p13_viewcombos.json';

// combos: structural × filter. `struct` conserve-all; `filter` narrow-only.
const COMBOS = [
  { name: 'normal',                    m: {}, kind: 'struct' },
  { name: 'split',                     m: { split: 1 }, kind: 'struct' },
  { name: 'schedule',                  m: { sched: 1 }, kind: 'struct' },
  { name: 'schedule+split',            m: { sched: 1, split: 1 }, kind: 'struct' },
  { name: 'sort=created',              m: { sort: 'created' }, kind: 'struct' },
  { name: 'sort=deadline',             m: { sort: 'deadline' }, kind: 'struct' },
  { name: 'sort=manual',               m: { sort: 'manual' }, kind: 'struct' },
  { name: 'split+sort=deadline',       m: { split: 1, sort: 'deadline' }, kind: 'struct' },
  { name: 'focus=10',                  m: { focus: 10 }, kind: 'focus' },
  { name: 'focus=11',                  m: { focus: 11 }, kind: 'focus' },
  { name: 'focus=12',                  m: { focus: 12 }, kind: 'focus' },
  { name: 'focus=10+split',            m: { focus: 10, split: 1 }, kind: 'focus' },
  { name: 'focus=10+schedule',         m: { focus: 10, sched: 1 }, kind: 'focus' },
  { name: 'color=#8C5CFF',             m: { color: '#8C5CFF' }, kind: 'color' },
  { name: 'color=#B5476B',             m: { color: '#B5476B' }, kind: 'color' },
  { name: 'color=#4E8C6A+split',       m: { color: '#4E8C6A', split: 1 }, kind: 'color' },
  { name: 'color=#8C5CFF+schedule',    m: { color: '#8C5CFF', sched: 1 }, kind: 'color' },
  { name: 'today',                     m: { today: 1 }, kind: 'today' },
  { name: 'today+split',               m: { today: 1, split: 1 }, kind: 'today' },
  { name: 'today+schedule',            m: { today: 1, sched: 1 }, kind: 'today' },
  { name: 'focus=12+color=#4E8C6A',    m: { focus: 12, color: '#4E8C6A' }, kind: 'both' },
  { name: 'color=NONEXISTENT (empty)', m: { color: '#000000' }, kind: 'empty' },
  { name: 'focus=9999 (empty)',        m: { focus: 9999 }, kind: 'empty' },
];

(async () => {
  const { srv, port } = await serve();
  const browser = await launch();
  const { page, errors } = await openApp(browser, { device: 'pixel7', seed: richSeed(), port });

  const results = [];
  for (const c of COMBOS) {
    errors.length = 0;                                  // reset per-combo error capture
    const r = await page.evaluate((mods) => {
      // reset every view axis to default, then apply the combo
      window.isScheduleMode  = !!mods.sched;
      window.isGroupSplitMode = !!mods.split;
      window.isTodayMode     = !!mods.today;
      window.focusGroupId    = (mods.focus != null) ? mods.focus : null;
      window.colorFilter     = mods.color || null;
      if (mods.sort) window.state.sortMode = mods.sort;
      window.render();
      // measure
      const ids = [...new Set([...document.querySelectorAll('.task-item[data-id]')].map(e => e.dataset.id))];
      // empty-state: any visibly-rendered empty plaque
      const es = document.querySelector('.empty-state, #empty-state, [class*="empty-state"]');
      const esVisible = !!(es && es.offsetParent !== null && es.getBoundingClientRect().height > 4);
      // per-visible-task groupId/color for filter invariants
      const meta = ids.map(id => {
        const t = window.state.tasks.find(x => String(x.id) === String(id));
        return t ? { id, groupId: t.groupId, color: t.color || null } : { id, missing: true };
      });
      return { ids, count: ids.length, esVisible, meta, activeTotal: window.state.tasks.length };
    }, c.m);
    results.push({ combo: c.name, kind: c.kind, err: errors.slice(), ...r });
  }

  // verdicts
  const rowVerdict = (c, r) => {
    const v = { noErr: r.err.length === 0, emptyStateCorrect: r.esVisible === (r.count === 0) };
    if (r.kind === 'struct') v.conservesAll = r.count === r.activeTotal;       // must show every task
    if (r.kind === 'focus')  v.narrowsRight = r.meta.every(m => m.missing || m.groupId === (COMBO_focus(c))); // group match
    if (r.kind === 'color')  v.narrowsRight = r.meta.every(m => m.missing || m.color === (COMBO_color(c)));
    if (r.kind === 'empty')  v.isEmpty = r.count === 0 && r.esVisible === true;
    return v;
  };
  function COMBO_focus(name){ const m = name.match(/focus=(\d+)/); return m ? parseInt(m[1]) : null; }
  function COMBO_color(name){ const m = name.match(/color=(#[0-9A-F]+)/i); return m ? m[1] : null; }

  const verdicts = results.map(r => ({ combo: r.combo, kind: r.kind, count: r.count, esVisible: r.esVisible, ...rowVerdict(r.combo, r) }));
  const allNoErr = verdicts.every(v => v.noErr);
  const allEmptyOk = verdicts.every(v => v.emptyStateCorrect);
  const structConserve = verdicts.filter(v => v.kind === 'struct').every(v => v.conservesAll);
  const filterNarrow = verdicts.filter(v => v.kind === 'focus' || v.kind === 'color').every(v => v.narrowsRight);
  const emptyModes = verdicts.filter(v => v.kind === 'empty').every(v => v.isEmpty);

  const summary = { allNoErr, allEmptyOk, structConserve, filterNarrow, emptyModes, activeTotal: results[0] && results[0].activeTotal };
  fs.writeFileSync(OUT, JSON.stringify({ summary, verdicts, results }, null, 2));
  console.log(JSON.stringify({ summary, verdicts }, null, 2));
  await browser.close(); srv.close();
})().catch(e => { console.error('PROBE ERROR', e); process.exit(1); });
