// S4/B6 P2 — multi-tab same-origin last-writer-wins. Two tabs share one context
// (shared LS/IDB). No 'storage' listener / BroadcastChannel exists (static grep),
// so a stale-in-memory save in tab1 silently ERASES tab2's committed edit.
import { serve, launch, ROOT } from './lib.mjs';
import { richSeed } from './seed.mjs';
import fs from 'fs';

const OUT = 'D:/VSCode projects/DUSK_v2.0/audit-v2/shots/s4/p2_multitab.json';
const results = [];
const rec = (n, p, d) => results.push({ name: n, pass: p, detail: d });

const editTask = (id, text) => `(() => {
  const t = window.state.tasks.find(x => x.id === ${id});
  if (!t) return false; t.text = ${JSON.stringify(text)}; window.saveState(); return true;
})()`;

(async () => {
  const { srv, port } = await serve(ROOT);
  const browser = await launch();
  const base = richSeed();

  const ctx = await browser.newContext({ colorScheme: 'dark' });
  // seed LS once (no per-page addInitScript, so tab boots don't re-clear)
  const sp = await ctx.newPage();
  await sp.goto(`http://localhost:${port}/__seed__`, { waitUntil: 'load' }).catch(() => {});
  await sp.evaluate((s) => { localStorage.clear(); localStorage.setItem('duskState_v4', JSON.stringify(s)); localStorage.setItem('currentPage', 'main'); }, base);
  await sp.close();

  const tab1 = await ctx.newPage();
  await tab1.goto(`http://localhost:${port}/index.html`, { waitUntil: 'load' });
  await tab1.waitForTimeout(600);
  const tab2 = await ctx.newPage();
  await tab2.goto(`http://localhost:${port}/index.html`, { waitUntil: 'load' });
  await tab2.waitForTimeout(600);

  // tab2 commits an edit to task 2
  const e2 = await tab2.evaluate(editTask(2, 'TAB2-EDIT'));
  // tab1 (stale in-memory, never saw tab2's edit) commits an edit to task 1 → full-blob save
  const e1 = await tab1.evaluate(editTask(1, 'TAB1-EDIT'));

  // read final LS from a fresh evaluate
  const ls = await tab1.evaluate(() => JSON.parse(localStorage.getItem('duskState_v4')));
  const t1 = ls.tasks.find(t => t.id === 1);
  const t2 = ls.tasks.find(t => t.id === 2);
  const erased = t1.text === 'TAB1-EDIT' && t2.text !== 'TAB2-EDIT';
  rec('P2 stale tab1 save erases tab2 edit (silent LWW loss)', erased,
    `e1=${e1} e2=${e2} finalLS: task1="${t1.text}" task2="${t2.text}" (expected task2 reverted)`);

  await ctx.close();
  await browser.close();
  srv.close();
  fs.writeFileSync(OUT, JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
})().catch(e => { console.error('PROBE ERROR', e); process.exit(1); });
