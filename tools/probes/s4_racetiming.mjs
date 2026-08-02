// S4/B6 — DISCRIMINATOR for the boot-race finding. Rules out the harness artifact
// (pending indexedDB.deleteDatabase blocking the app's IDB open, delaying loadState).
// Case 1: fresh empty IDB, NO deleteDatabase (loadState falls to LS, fast path).
// Case 2: IDB SEEDED=14 (production-faithful: reload reads populated IDB first).
// If either clobbers deterministically → the race is real, not a delete artifact.
import { serve, launch, ROOT } from './lib.mjs';
import { richSeed } from './seed.mjs';
import { makeDrive, installFakeCloud, seedTokenInit } from './fakecloud.mjs';
import fs from 'fs';

const OUT = 'D:/VSCode projects/DUSK_v2.0/audit-v2/shots/s4/racetiming.json';
const results = [];
const FAR = Date.now() + 3600_000;
let PORT, BROWSER;

const SEED_IDB = `
async function seedIDB(key, value) {
  await new Promise((res, rej) => {
    const req = indexedDB.open('keyval-store', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('keyval');
    req.onsuccess = () => { const db = req.result; const tx = db.transaction('keyval','readwrite'); tx.objectStore('keyval').put(value, key); tx.oncomplete = () => { db.close(); res(); }; tx.onerror = () => rej(tx.error); };
    req.onerror = () => rej(req.error);
  });
}`;

async function bootOnce({ seedIdb, deleteIdb }) {
  const drive = makeDrive();
  const ctx = await BROWSER.newContext({ colorScheme: 'dark' });
  await installFakeCloud(ctx, drive);
  await ctx.addInitScript(seedTokenInit(FAR, true));
  const seed = richSeed();
  const sp = await ctx.newPage();
  await sp.goto(`http://localhost:${PORT}/__seed__`, { waitUntil: 'load' }).catch(() => {});
  await sp.evaluate(async ({ st, src, seedIdb, deleteIdb }) => {
    localStorage.setItem('duskState_v4', JSON.stringify(st));
    localStorage.setItem('currentPage', 'main');
    if (deleteIdb) { try { indexedDB.deleteDatabase('keyval-store'); } catch (e) {} }
    if (seedIdb) { eval(src); await seedIDB('duskState_v4', st); }
  }, { st: seed, src: SEED_IDB, seedIdb, deleteIdb });
  await sp.close();
  const page = await ctx.newPage();
  await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'load' });
  await page.waitForTimeout(1300);
  const n = await page.evaluate(() => (window.state && window.state.tasks ? window.state.tasks.length : -1));
  await ctx.close();
  return n;
}

(async () => {
  const s = await serve(ROOT); PORT = s.port; BROWSER = await launch();

  const c1 = []; for (let i = 0; i < 5; i++) c1.push(await bootOnce({ seedIdb: false, deleteIdb: false }));
  const c2 = []; for (let i = 0; i < 5; i++) c2.push(await bootOnce({ seedIdb: true,  deleteIdb: false }));
  const c3 = []; for (let i = 0; i < 5; i++) c3.push(await bootOnce({ seedIdb: false, deleteIdb: true }));

  results.push({ case: '1 fresh-empty-IDB, LS=14 (no delete)', counts: c1, wiped: c1.filter(n => n === 0).length });
  results.push({ case: '2 IDB-seeded=14 (production reload)',   counts: c2, wiped: c2.filter(n => n === 0).length });
  results.push({ case: '3 deleteDatabase pending (orig harness)', counts: c3, wiped: c3.filter(n => n === 0).length });

  await BROWSER.close(); s.srv.close();
  fs.writeFileSync(OUT, JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
})().catch(e => { console.error('PROBE ERROR', e); process.exit(1); });
