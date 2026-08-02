// S4/B6 P0 — IDB-stale-boot clobber (promote/refute V2-B0-02). THE data-safety probe.
// Seeds LS and IDB DIVERGENTLY, boots the real dist, observes who wins + whether
// the post-boot LS is clobbered. idb-keyval schema: DB 'keyval-store' v1, store
// 'keyval', key 'duskState_v4' (K_STATE), value = raw state OBJECT (structured clone).
import { serve, launch, ROOT } from './lib.mjs';
import { richSeed } from './seed.mjs';
import fs from 'fs';

const K = 'duskState_v4';
const MARK = 'PROBE-LS-NEWER';
const OUT = 'D:/VSCode projects/DUSK_v2.0/audit-v2/shots/s4/p0_idbboot.json';
const results = [];
const rec = (name, pass, detail) => results.push({ name, pass, detail });

// state with an extra marker task appended (the "last edit" that must not be lost)
function withMarker(base) {
  const s = JSON.parse(JSON.stringify(base));
  s.tasks.push({
    id: 999, uid: 'u999', text: MARK, checked: false, groupId: null, deadline: null,
    note: '', noteOpen: false, order: 999, priority: 'high', repeat: 'none',
    cycleChecked: false, nextReset: null, subtasks: [], subtasksOpen: false,
    pinned: false, color: null, createdAt: Date.now(), updatedAt: Date.now(),
  });
  return s;
}

// raw-IDB seeder (runs in page context) — matches idb-keyval's store schema
const SEED_IDB = `
async function seedIDB(key, value) {
  await new Promise((res, rej) => {
    const req = indexedDB.open('keyval-store', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('keyval');
    req.onsuccess = () => {
      const db = req.result;
      const tx = db.transaction('keyval', 'readwrite');
      tx.objectStore('keyval').put(value, key);
      tx.oncomplete = () => { db.close(); res(); };
      tx.onerror = () => rej(tx.error);
    };
    req.onerror = () => rej(req.error);
  });
}`;

async function bootAndRead(page, port) {
  await page.goto(`http://localhost:${port}/index.html`, { waitUntil: 'load' });
  await page.waitForTimeout(700); // let async loadState (IDB read) + saveState settle
  return await page.evaluate((mark) => {
    const inMem = (window.state && Array.isArray(window.state.tasks))
      ? window.state.tasks.some(t => t.text === mark) : null;
    let ls = null;
    try { ls = JSON.parse(localStorage.getItem('duskState_v4')); } catch (e) {}
    const inLS = ls && Array.isArray(ls.tasks) ? ls.tasks.some(t => t.text === mark) : null;
    const lsCount = ls && Array.isArray(ls.tasks) ? ls.tasks.length : null;
    return { inMem, inLS, lsCount };
  }, MARK);
}

// seed a fresh same-origin doc (404 page is fine) then write LS + optionally IDB
async function seedContext(ctx, port, { lsState, idbState }) {
  const p = await ctx.newPage();
  await p.goto(`http://localhost:${port}/__seed__`, { waitUntil: 'load' }).catch(() => {});
  await p.evaluate(async ({ src, key, lsState, idbState }) => {
    localStorage.clear();
    localStorage.setItem('duskState_v4', JSON.stringify(lsState));
    localStorage.setItem('currentPage', 'main');
    localStorage.setItem('isFiltered', '0');
    if (idbState) { eval(src); await seedIDB(key, idbState); }
  }, { src: SEED_IDB, key: K, lsState, idbState });
  return p;
}

(async () => {
  const { srv, port } = await serve(ROOT);
  const browser = await launch();
  const base = richSeed();

  // ── Variant (a): LS newer (marker), IDB stale (no marker) → predict CLOBBER ──
  {
    const ctx = await browser.newContext({ colorScheme: 'dark' });
    const seedPage = await seedContext(ctx, port, { lsState: withMarker(base), idbState: base });
    await seedPage.close();
    const page = await ctx.newPage();
    const r = await bootAndRead(page, port);
    // LOSS if the marker (present only in the newer LS) is gone after boot
    const lost = r.inMem === false && r.inLS === false;
    rec('P0a timing-gap: LS-newer clobbered by stale IDB (LOSS)', lost,
      `inMem=${r.inMem} inLS(post-boot)=${r.inLS} lsCount=${r.lsCount}`);
    await ctx.close();
  }

  // ── Variant (c) control: IDB newer (marker), LS stale → predict IDB wins OK ──
  {
    const ctx = await browser.newContext({ colorScheme: 'dark' });
    const seedPage = await seedContext(ctx, port, { lsState: base, idbState: withMarker(base) });
    await seedPage.close();
    const page = await ctx.newPage();
    const r = await bootAndRead(page, port);
    const ok = r.inMem === true && r.inLS === true; // IDB correctly wins, LS updated
    rec('P0c control: IDB-newer correctly wins', ok,
      `inMem=${r.inMem} inLS(post-boot)=${r.inLS} lsCount=${r.lsCount}`);
    await ctx.close();
  }

  // ── Variant (b): IDB fully broken → LS authoritative across an edit+reload ──
  {
    const ctx = await browser.newContext({ colorScheme: 'dark' });
    // break indexedDB for every page in this context
    await ctx.addInitScript(() => {
      try { Object.defineProperty(window, 'indexedDB', { configurable: true, get() { throw new Error('idb blocked'); } }); } catch (e) {}
    });
    // seed LS WITHOUT marker (IDB can't be seeded — it's broken; that's the point)
    const seedPage = await ctx.newPage();
    await seedPage.goto(`http://localhost:${port}/__seed__`, { waitUntil: 'load' }).catch(() => {});
    await seedPage.evaluate((lsState) => {
      // seed BEFORE indexedDB override matters (LS only)
      localStorage.clear();
      localStorage.setItem('duskState_v4', JSON.stringify(lsState));
      localStorage.setItem('currentPage', 'main');
    }, base).catch(() => {});
    await seedPage.close();

    const page = await ctx.newPage();
    await page.goto(`http://localhost:${port}/index.html`, { waitUntil: 'load' });
    await page.waitForTimeout(600);
    // add the "last edit" (marker) in-app, save, then reload with IDB still broken
    const added = await page.evaluate((mark) => {
      if (!window.state || !Array.isArray(window.state.tasks) || typeof window.saveState !== 'function') return false;
      window.state.tasks.push({ id: 999, uid: 'u999', text: mark, checked: false, groupId: null,
        deadline: null, note: '', noteOpen: false, order: 999, priority: 'high', repeat: 'none',
        cycleChecked: false, nextReset: null, subtasks: [], subtasksOpen: false, pinned: false,
        color: null, createdAt: Date.now(), updatedAt: Date.now() });
      window.saveState();
      return true;
    }, MARK);
    const r = await bootAndRead(page, port); // reload
    const survives = added && r.inLS === true;
    rec('P0b broken-IDB: LS carries the edit across reload (SAFE)', survives,
      `added=${added} inMem=${r.inMem} inLS=${r.inLS}`);
    await ctx.close();
  }

  await browser.close();
  srv.close();
  fs.writeFileSync(OUT, JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
})().catch(e => { console.error('PROBE ERROR', e); process.exit(1); });
