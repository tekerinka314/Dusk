// S4/B6 P5 — undo across a landed sync merge (DESIGN VERDICT → [RATIFY-FABLE]).
// syncNow's merge-landing (11:283-288) does NOT pushUndo. Record precisely: after a
// merge lands remote changes, does Ctrl+Z revert the REMOTE change too? Does the
// reverted state then re-sync and delete the peer's contribution from Drive? Redo?
import { serve, launch, ROOT } from './lib.mjs';
import { richSeed } from './seed.mjs';
import { makeDrive, installFakeCloud, seedTokenInit } from './fakecloud.mjs';
import fs from 'fs';

const OUT = 'D:/VSCode projects/DUSK_v2.0/audit-v2/shots/s4/p5_undo.json';
const FAR = Date.now() + 3600_000;
let PORT, BROWSER;

async function bootDevice(drive, seedState) {
  const ctx = await BROWSER.newContext({ colorScheme: 'dark' });
  await installFakeCloud(ctx, drive);
  await ctx.addInitScript(seedTokenInit(FAR, false));
  const sp = await ctx.newPage();
  await sp.goto(`http://localhost:${PORT}/__seed__`, { waitUntil: 'load' }).catch(() => {});
  await sp.evaluate(async (st) => {
    localStorage.setItem('duskState_v4', JSON.stringify(st)); localStorage.setItem('currentPage', 'main');
    await new Promise((res) => { const rq = indexedDB.open('keyval-store', 1); rq.onupgradeneeded = () => rq.result.createObjectStore('keyval'); rq.onsuccess = () => { const db = rq.result; const tx = db.transaction('keyval', 'readwrite'); tx.objectStore('keyval').put(st, 'duskState_v4'); tx.oncomplete = () => { db.close(); res(); }; tx.onerror = () => res(); }; rq.onerror = () => res(); });
  }, seedState);
  await sp.close();
  const page = await ctx.newPage();
  await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'load' });
  await page.waitForTimeout(700);
  await page.evaluate(() => { window._syncReady = true; });
  return { ctx, page };
}
const sync = (p) => p.evaluate(async () => { try { await window.syncNow({ manual: true }); return true; } catch (e) { return 'ERR:' + e.message; } });
const has = (p, tx) => p.evaluate((t) => (window.state.tasks || []).some(x => x.text === t), tx);
const driveHas = (d, tx) => (d.file && d.file.payload && d.file.payload.subset && d.file.payload.subset.tasks || []).some(t => t.text === tx);

(async () => {
  const s = await serve(ROOT); PORT = s.port; BROWSER = await launch();
  const drive = makeDrive();
  const A = await bootDevice(drive, richSeed());
  await sync(A.page);                                   // Drive=14, baseline=14

  // user edit on A (real undo snapshot pushed before the mutation)
  await A.page.evaluate(() => { window.pushUndo(); const t = window.state.tasks[0]; t.text = 'A-USER-EDIT'; t.updatedAt = (window.nowTs ? window.nowTs() : Date.now()); window.saveState(); });

  // a PEER writes a new task to Drive between our syncs
  drive.file.version = drive.nextVersion++;
  drive.file.payload.subset.tasks.push({ id: 8888, uid: 'uREMOTE', text: 'REMOTE-NEW', checked: false, groupId: null, deadline: null, note: '', priority: 'none', repeat: 'none', cycleChecked: false, subtasks: [], _arch: false, createdAt: 1000, updatedAt: 9e12 });

  await sync(A.page);                                   // merge lands REMOTE-NEW into A
  const afterMerge = { userEdit: await has(A.page, 'A-USER-EDIT'), remote: await has(A.page, 'REMOTE-NEW') };

  // Ctrl+Z (undo) AFTER the merge landed
  await A.page.evaluate(() => { if (typeof window.undo === 'function') window.undo(); });
  const afterUndo = { userEdit: await has(A.page, 'A-USER-EDIT'), remote: await has(A.page, 'REMOTE-NEW') };

  // does re-sync now DELETE the peer's task from Drive?
  await sync(A.page);
  const driveRemoteAfterResync = driveHas(drive, 'REMOTE-NEW');

  // redo?
  const redoExists = await A.page.evaluate(() => typeof window.redo === 'function');
  await A.page.evaluate(() => { if (typeof window.redo === 'function') window.redo(); });
  const afterRedo = { userEdit: await has(A.page, 'A-USER-EDIT'), remote: await has(A.page, 'REMOTE-NEW') };

  const results = [{
    name: 'P5 undo-over-merge machine (design verdict — record only)',
    machine: {
      afterMerge, afterUndo, driveRemoteStillThereAfterResync: driveRemoteAfterResync, redoExists, afterRedo,
    },
    interpretation: {
      undoRevertsRemote: afterMerge.remote && !afterUndo.remote,
      resyncDeletesPeerContribution: afterMerge.remote && !driveRemoteAfterResync,
    },
  }];
  await BROWSER.close(); s.srv.close();
  fs.writeFileSync(OUT, JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
})().catch(e => { console.error('PROBE ERROR', e); process.exit(1); });
