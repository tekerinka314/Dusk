// S4/B6 P6-RACE — boot-time race: the on-open auto-sync (11:661 setTimeout 60ms)
// runs getSyncSubset(state) while state is STILL EMPTY (async loadState not yet
// resolved), then applySyncSubset+saveState lands AFTER loadState → clobbers the
// just-loaded local data. Empty Drive → TOTAL WIPE; populated-but-staler Drive →
// newest unsynced local edits lost. Production-faithful: cached token + enabled
// flag both restored at module load (_restoreToken 10:110, _syncEnabled 11:76).
import { serve, launch, ROOT } from './lib.mjs';
import { richSeed } from './seed.mjs';
import { makeDrive, installFakeCloud, seedTokenInit } from './fakecloud.mjs';
import fs from 'fs';

const OUT = 'D:/VSCode projects/DUSK_v2.0/audit-v2/shots/s4/bootrace.json';
const results = [];
const rec = (n, p, d) => results.push({ name: n, pass: p, detail: d });
const FAR = Date.now() + 3600_000;
let PORT, BROWSER;

async function seedPage(ctx, mutate) {
  const sp = await ctx.newPage();
  await sp.goto(`http://localhost:${PORT}/__seed__`, { waitUntil: 'load' }).catch(() => {});
  await sp.evaluate(mutate);
  await sp.close();
}
const tasksOf = (page) => page.evaluate(() => (window.state && window.state.tasks ? window.state.tasks.map(t => t.text) : []));

// ── Variant A: empty Drive + sync enabled + cached token → boot wipes local ──
async function variantA(run) {
  const drive = makeDrive();
  const ctx = await BROWSER.newContext({ colorScheme: 'dark' });
  await installFakeCloud(ctx, drive);
  await ctx.addInitScript(seedTokenInit(FAR, true));                        // token + enabled (production reload state)
  await seedPage(ctx, () => { localStorage.setItem('duskState_v4', JSON.stringify(window.__seed14)); localStorage.setItem('currentPage', 'main'); try { indexedDB.deleteDatabase('keyval-store'); } catch (e) {} });
  const page = await ctx.newPage();
  await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'load' });
  await page.waitForTimeout(1200);                                          // let loadState + on-open sync fully settle
  const after = (await tasksOf(page)).length;
  await ctx.close();
  return after;
}

// ── Variant B: populated Drive + a LOCAL-ONLY unsynced task → is it lost on reload? ──
async function variantB() {
  const drive = makeDrive();
  const ctx = await BROWSER.newContext({ colorScheme: 'dark' });
  await installFakeCloud(ctx, drive);
  await ctx.addInitScript(seedTokenInit(FAR, false));                       // token but NOT enabled → clean boot #1
  await seedPage(ctx, () => { localStorage.setItem('duskState_v4', JSON.stringify(window.__seed14)); localStorage.setItem('currentPage', 'main'); try { indexedDB.deleteDatabase('keyval-store'); } catch (e) {} });
  const page = await ctx.newPage();
  await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'load' });
  await page.waitForTimeout(700);
  // manual sync → Drive=14, baseline=14, and enabled flag now persisted (11:264)
  await page.evaluate(async () => { window._syncReady = true; await window.syncNow({ manual: true }); });
  // add a LOCAL-ONLY unsynced task, save, DO NOT sync, then reload
  await page.evaluate(() => {
    const id = window.state.nextId++;
    window.state.tasks.push({ id, uid: 'uUNSYNCED', text: 'LOCAL-UNSYNCED', checked: false, groupId: null, deadline: null, note: '', noteOpen: false, order: id, priority: 'high', repeat: 'none', cycleChecked: false, nextReset: null, subtasks: [], subtasksOpen: false, pinned: false, color: null, createdAt: Date.now(), updatedAt: Date.now() });
    // persist to LS/IDB WITHOUT triggering sync: write directly, bypass saveState's push hook
    localStorage.setItem('duskState_v4', JSON.stringify(window.state));
  });
  await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'load' });  // reload → boot race with enabled+token
  await page.waitForTimeout(1200);
  const survived = (await tasksOf(page)).includes('LOCAL-UNSYNCED');
  await ctx.close();
  return survived;
}

(async () => {
  const s = await serve(ROOT); PORT = s.port; BROWSER = await launch();
  // expose the 14-task seed to page context via addInitScript on each context
  const seed = richSeed();
  BROWSER.__origNewContext = BROWSER.newContext.bind(BROWSER);
  BROWSER.newContext = async (o) => { const c = await BROWSER.__origNewContext(o); await c.addInitScript((s) => { window.__seed14 = s; }, seed); return c; };

  const wipes = [];
  for (let i = 0; i < 5; i++) wipes.push(await variantA(i));
  const wipeCount = wipes.filter(n => n === 0).length;
  rec('P6-RACE A: empty-Drive boot wipes local 14→0', wipeCount >= 1,
    `final task counts across 5 runs = [${wipes.join(',')}] ; wiped(0) in ${wipeCount}/5`);

  const bSurv = [];
  for (let i = 0; i < 3; i++) bSurv.push(await variantB());
  const lostCount = bSurv.filter(v => v === false).length;
  rec('P6-RACE B: populated-Drive reload loses unsynced local add', lostCount >= 1,
    `LOCAL-UNSYNCED survived across 3 runs = [${bSurv.join(',')}] ; lost in ${lostCount}/3`);

  await BROWSER.close(); s.srv.close();
  fs.writeFileSync(OUT, JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
})().catch(e => { console.error('PROBE ERROR', e); process.exit(1); });
