// S4/B6 P6 — syncNow orchestration under a fake cloud (the UNTESTED loop, ARCH §10).
// Scenarios a–f: two-device convergence, ConflictError retry, offline/baseline
// discipline, edit-during-flight (9441a3b), token-expiry refresh, _pushNeeded canon.
import { serve, launch, ROOT } from './lib.mjs';
import { richSeed } from './seed.mjs';
import { makeDrive, installFakeCloud, seedTokenInit } from './fakecloud.mjs';
import fs from 'fs';

const OUT = 'D:/VSCode projects/DUSK_v2.0/audit-v2/shots/s4/p6_sync.json';
const results = [];
const rec = (n, p, d) => results.push({ name: n, pass: p, detail: d });
const FAR = Date.now() + 3600_000;
const EMPTY = { tasks: [], groups: [], archive: [], notes: [], notesArchive: [], tombstones: [], templates: [], noteTemplates: [], syncJournal: [], nextId: 1, nextGroupId: 1, nextSubId: 1, sortMode: 'priority', sortModeOverrides: {}, subAnyMode: false };

let PORT, BROWSER;

async function bootDevice(drive, seedState) {
  const ctx = await BROWSER.newContext({ colorScheme: 'dark' });
  await installFakeCloud(ctx, drive);
  await ctx.addInitScript(seedTokenInit(FAR, false));          // token but NOT enabled → no on-open race (V2-B6-01); we drive syncs explicitly
  // seed STATE via a dedicated same-origin page + evaluate (proven; addInitScript state-seed is unreliable here)
  const sp = await ctx.newPage();
  await sp.goto(`http://localhost:${PORT}/__seed__`, { waitUntil: 'load' }).catch(() => {});
  // seed LS *and* IDB (production steady-state) so loadState wins the boot race (V2-B6-01) and convergence is what's under test
  await sp.evaluate(async (st) => {
    localStorage.setItem('duskState_v4', JSON.stringify(st)); localStorage.setItem('currentPage', 'main');
    await new Promise((res) => { const rq = indexedDB.open('keyval-store', 1); rq.onupgradeneeded = () => rq.result.createObjectStore('keyval'); rq.onsuccess = () => { const db = rq.result; const tx = db.transaction('keyval', 'readwrite'); tx.objectStore('keyval').put(st, 'duskState_v4'); tx.oncomplete = () => { db.close(); res(); }; tx.onerror = () => res(); }; rq.onerror = () => res(); });
  }, seedState);
  await sp.close();
  const page = await ctx.newPage();
  await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'load' });
  await page.waitForTimeout(600);
  await page.evaluate(() => { window._syncReady = true; });
  return { ctx, page };
}
const sync = (page) => page.evaluate(async () => { try { await window.syncNow({ manual: true }); return true; } catch (e) { return 'ERR:' + e.message; } });
const taskTexts = (page) => page.evaluate(() => (window.state.tasks || []).map(t => t.text));
const addTask = (page, text) => page.evaluate((tx) => {
  const id = window.state.nextId++;
  window.state.tasks.push({ id, uid: 'u' + id + '_' + tx, text: tx, checked: false, groupId: null, deadline: null, note: '', noteOpen: false, order: id, priority: 'none', repeat: 'none', cycleChecked: false, nextReset: null, subtasks: [], subtasksOpen: false, pinned: false, color: null, createdAt: Date.now(), updatedAt: Date.now() });
  window.saveState();
}, text);
const driveTexts = (drive) => (drive.file && drive.file.payload && drive.file.payload.subset && drive.file.payload.subset.tasks || []).map(t => t.text);

(async () => {
  const s = await serve(ROOT); PORT = s.port;
  BROWSER = await launch();

  // ── (a) two-device happy path ──
  {
    const drive = makeDrive();
    const A = await bootDevice(drive, richSeed());
    const B = await bootDevice(drive, JSON.parse(JSON.stringify(EMPTY)));
    await sync(A.page);                                   // A creates the file
    await sync(B.page);                                   // B pulls A's 14 tasks
    const bAfterPull = (await taskTexts(B.page)).length;
    await addTask(B.page, 'FROM-B'); await sync(B.page);  // B adds + pushes
    await sync(A.page);                                   // A pulls B's edit
    const aTexts = await taskTexts(A.page), bTexts = await taskTexts(B.page);
    const conv = aTexts.slice().sort().join('|') === bTexts.slice().sort().join('|');
    const ok = bAfterPull === 14 && aTexts.includes('FROM-B') && aTexts.length === 15 && conv;
    rec('P6a two-device converge, nothing lost', ok, `B-after-pull=${bAfterPull} A.len=${aTexts.length} hasFROM-B=${aTexts.includes('FROM-B')} converged=${conv}`);
    await A.ctx.close(); await B.ctx.close();
  }

  // ── (b) push ConflictError → retry, no double-apply / journal dup ──
  {
    const drive = makeDrive();
    const A = await bootDevice(drive, richSeed());
    await sync(A.page);                                   // file v1
    drive.faults.conflictOnce = true;
    drive.faults.onConflictPeer = (d) => {               // a peer wrote between our pull & push
      d.file.version = d.nextVersion++;
      d.file.payload.subset.tasks.push({ id: 7777, uid: 'uPEER', text: 'PEER-TASK', checked: false, groupId: null, deadline: null, note: '', priority: 'none', repeat: 'none', cycleChecked: false, subtasks: [], _arch: false, createdAt: 1000, updatedAt: 9e12 });
    };
    await addTask(A.page, 'A-EDIT'); const r = await sync(A.page);
    const dt = driveTexts(drive);
    const jr = drive.file.payload.subset.syncJournal || [];
    const jrDup = jr.length !== new Set(jr.map(e => e.uid)).size;
    const ok = r === true && dt.includes('A-EDIT') && dt.includes('PEER-TASK') && dt.filter(t => t === 'A-EDIT').length === 1 && !jrDup;
    rec('P6b ConflictError retry: both edits survive, no dup', ok, `sync=${r} A-EDIT×${dt.filter(t=>t==='A-EDIT').length} PEER=${dt.includes('PEER-TASK')} jrDup=${jrDup}`);
    await A.ctx.close();
  }

  // ── (c) push failure → baseline NOT advanced, edit stays pending, then delivered ──
  {
    const drive = makeDrive();
    const A = await bootDevice(drive, richSeed());
    await sync(A.page);
    const baseBefore = await A.page.evaluate(() => JSON.stringify(window.loadBaseline()).length);
    drive.faults.failPush = true;
    await addTask(A.page, 'C-EDIT'); const rFail = await sync(A.page);
    const st = await A.page.evaluate(() => ({ baseLen: JSON.stringify(window.loadBaseline()).length, pending: window._pendingPush, err: !!window._lastError }));
    const driveHadEditDuringFail = driveTexts(drive).includes('C-EDIT');
    drive.faults.failPush = false;
    const rOk = await sync(A.page);
    const delivered = driveTexts(drive).includes('C-EDIT');
    const ok = String(rFail).startsWith('ERR') === false && st.baseLen === baseBefore && !driveHadEditDuringFail && delivered;
    rec('P6c push-fail: baseline held, edit pending, later delivered', ok,
      `baselineUnchanged=${st.baseLen === baseBefore} driveDuringFail=${driveHadEditDuringFail} pendingAfterFail=${st.pending} delivered=${delivered}`);
    await A.ctx.close();
  }

  // ── (d) edit-during-flight (9441a3b): mutate between pull & push → must reach cloud ──
  {
    const drive = makeDrive();
    const A = await bootDevice(drive, richSeed());
    await sync(A.page);                                   // file v1
    drive.faults.delay = 700;                             // slow the next download
    // patch route already installed; add delay handling by wrapping: re-register a delayed download
    await A.page.evaluate(() => { window.__flightStarted = true; window.syncNow({ manual: true }); }); // fire, don't await
    await A.page.waitForTimeout(150);
    await addTask(A.page, 'FLIGHT-EDIT');                 // mutate while sync is in flight
    await A.page.waitForTimeout(2500);                    // let the in-flight sync + queued re-sync settle
    const delivered = driveTexts(drive).includes('FLIGHT-EDIT');
    const local = (await taskTexts(A.page)).includes('FLIGHT-EDIT');
    rec('P6d edit-during-flight reaches cloud (no loss)', delivered && local, `cloud=${delivered} local=${local}`);
    await A.ctx.close();
  }

  // ── (e) token expiry mid-loop → silent refresh, sync completes ──
  {
    const drive = makeDrive();
    const A = await bootDevice(drive, richSeed());
    await sync(A.page);
    drive.faults.expire401 = 1;                           // first drive call 401s → refresh path
    await addTask(A.page, 'E-EDIT'); const r = await sync(A.page);
    const refreshed = drive.calls.some(c => c.includes('/refresh'));
    const signedIn = await A.page.evaluate(() => window.cloudStatus().signedIn);
    const ok = r === true && driveTexts(drive).includes('E-EDIT') && refreshed && signedIn;
    rec('P6e token-expiry: refresh, sync completes, no auth loss', ok, `sync=${r} delivered=${driveTexts(drive).includes('E-EDIT')} refreshCalled=${refreshed} signedIn=${signedIn}`);
    await A.ctx.close();
  }

  // ── (f) _pushNeeded canon: UI-pref change → no push; synced-field change → push ──
  {
    const drive = makeDrive();
    const A = await bootDevice(drive, richSeed());
    await sync(A.page);
    const v0 = drive.file.version;
    await A.page.evaluate(() => { window.state.sortMode = window.state.sortMode === 'priority' ? 'manual' : 'priority'; window.saveState(); });
    await sync(A.page);
    const vAfterPref = drive.file.version;
    await addTask(A.page, 'F-EDIT'); await sync(A.page);
    const vAfterEdit = drive.file.version;
    const ok = vAfterPref === v0 && vAfterEdit > v0;
    rec('P6f canon honesty: pref no-push, synced-field push', ok, `v0=${v0} afterPref=${vAfterPref} afterEdit=${vAfterEdit}`);
    await A.ctx.close();
  }

  await BROWSER.close(); s.srv.close();
  fs.writeFileSync(OUT, JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
})().catch(e => { console.error('PROBE ERROR', e); process.exit(1); });
