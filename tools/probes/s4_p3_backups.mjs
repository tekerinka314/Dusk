// S4/B6 P3 — backups-ring integrity. Clock-injected: advance >10min between saves,
// assert ring caps at 10, ordering correct, oldest dropped. Restore reversibility:
// restoreBackup pushes undo (04:1504) + {undo:true} toast → current state recoverable.
import { serve, launch, ROOT } from './lib.mjs';
import { richSeed } from './seed.mjs';
import fs from 'fs';

const OUT = 'D:/VSCode projects/DUSK_v2.0/audit-v2/shots/s4/p3_backups.json';
const results = [];
const rec = (n, p, d) => results.push({ name: n, pass: p, detail: d });

(async () => {
  const { srv, port } = await serve(ROOT);
  const browser = await launch();
  const base = richSeed();

  const ctx = await browser.newContext({ colorScheme: 'dark' });
  // controllable clock (advance maybeBackup's Date.now past the 10-min throttle)
  await ctx.addInitScript(() => {
    const real = Date.now.bind(Date);
    window.__now = real();
    Date.now = () => window.__now;
  });
  const sp = await ctx.newPage();
  await sp.goto(`http://localhost:${port}/__seed__`, { waitUntil: 'load' }).catch(() => {});
  await sp.evaluate((s) => { localStorage.clear(); localStorage.setItem('duskState_v4', JSON.stringify(s)); localStorage.setItem('currentPage', 'main'); localStorage.removeItem('dusk_backups_v1'); }, base);
  await sp.close();

  const page = await ctx.newPage();
  await page.goto(`http://localhost:${port}/index.html`, { waitUntil: 'load' });
  await page.waitForTimeout(600);

  // drive 13 distinct snapshots, each >10min apart in the injected clock
  const ring = await page.evaluate(async () => {
    for (let i = 1; i <= 13; i++) {
      window.__now += 11 * 60 * 1000;                 // advance past BACKUP_THROTTLE_MS
      window.state.tasks[0].text = 'EDIT-' + i;       // distinct content (defeat dedup)
      await window.maybeBackup();                      // deterministic (saveState fires it fire-and-forget)
    }
    const b = await window.loadBackups();
    return { len: b.length, tss: b.map(x => x.ts), texts: b.map(x => { try { return JSON.parse(x.json).tasks[0].text; } catch (_) { return '?'; } }) };
  });
  const capped = ring.len === 10;
  const ordered = ring.tss.every((t, i) => i === 0 || t >= ring.tss[i - 1]);
  const oldestDropped = ring.texts[0] === 'EDIT-4' && ring.texts[9] === 'EDIT-13'; // 13 snaps, keep last 10 → EDIT-4..13
  rec('P3 ring caps at 10, ascending, oldest dropped', capped && ordered && oldestDropped,
    `len=${ring.len} ordered=${ordered} first="${ring.texts[0]}" last="${ring.texts[9]}"`);

  // restore reversibility: restore the OLDEST snapshot, then undo → current returns
  const rev = await page.evaluate(async () => {
    const before = window.state.tasks[0].text;         // 'EDIT-13'
    const b = await window.loadBackups();
    const oldTs = b[0].ts;                              // EDIT-4 snapshot
    await window.restoreBackup(oldTs);
    const afterRestore = window.state.tasks[0].text;    // should be EDIT-4
    window.undo();
    const afterUndo = window.state.tasks[0].text;       // should be back to EDIT-13
    return { before, afterRestore, afterUndo };
  });
  const reversible = rev.afterRestore === 'EDIT-4' && rev.afterUndo === rev.before;
  rec('P3 restore is reversible (pushUndo + undo toast)', reversible,
    `before=${rev.before} afterRestore=${rev.afterRestore} afterUndo=${rev.afterUndo}`);

  await ctx.close();
  await browser.close();
  srv.close();
  fs.writeFileSync(OUT, JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
})().catch(e => { console.error('PROBE ERROR', e); process.exit(1); });
