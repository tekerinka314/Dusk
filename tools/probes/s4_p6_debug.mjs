import { serve, launch, ROOT } from './lib.mjs';
import { richSeed } from './seed.mjs';
import { makeDrive, installFakeCloud, seedTokenInit } from './fakecloud.mjs';

const FAR = Date.now() + 3600_000;
const EMPTY = { tasks: [], groups: [], archive: [], notes: [], notesArchive: [], tombstones: [], templates: [], noteTemplates: [], syncJournal: [], nextId: 1, nextGroupId: 1, nextSubId: 1, sortMode: 'priority', sortModeOverrides: {}, subAnyMode: false };
let PORT, BROWSER;
async function bootDevice(drive, seedState, label) {
  const ctx = await BROWSER.newContext({ colorScheme: 'dark' });
  await installFakeCloud(ctx, drive);
  await ctx.addInitScript(seedTokenInit(FAR));
  const sp = await ctx.newPage();
  await sp.goto(`http://localhost:${PORT}/__seed__`, { waitUntil: 'load' }).catch(() => {});
  await sp.evaluate((st) => { localStorage.setItem('duskState_v4', JSON.stringify(st)); localStorage.setItem('currentPage', 'main'); try { indexedDB.deleteDatabase('keyval-store'); } catch (e) {} }, seedState);
  await sp.close();
  const page = await ctx.newPage();
  page.on('console', m => { if (/sync|merge|push|pull/i.test(m.text())) console.log(`[${label} console] ${m.text()}`); });
  await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'load' });
  await page.waitForTimeout(500);
  const diag = await page.evaluate(() => {
    let ls = null; try { ls = JSON.parse(localStorage.getItem('duskState_v4')); } catch (e) {}
    return { lsTasks: ls && ls.tasks ? ls.tasks.length : null, stateType: typeof window.state, stateTasks: window.state && window.state.tasks ? window.state.tasks.length : null };
  });
  console.log(`[${label} DIAG] LS.tasks=${diag.lsTasks} typeof state=${diag.stateType} state.tasks=${diag.stateTasks}`);
  await page.evaluate(() => { window._syncReady = true; });
  return { ctx, page };
}
const sync = (page) => page.evaluate(async () => { try { await window.syncNow({ manual: true }); return true; } catch (e) { return 'ERR:' + e.message; } });
const tt = (page) => page.evaluate(() => (window.state.tasks || []).map(t => t.text));
const dts = (d) => (d.file && d.file.payload && d.file.payload.subset && d.file.payload.subset.tasks || []).map(t => t.text);

(async () => {
  const s = await serve(ROOT); PORT = s.port; BROWSER = await launch();
  const drive = makeDrive();
  const A = await bootDevice(drive, richSeed(), 'A');
  console.log('A boot tasks:', (await tt(A.page)).length);
  const r1 = await sync(A.page);
  console.log('A sync#1:', r1, '| drive.file?', !!drive.file, '| payload subset tasks:', dts(drive).length, '| A tasks:', (await tt(A.page)).length);
  console.log('drive.calls:', drive.calls.slice(0, 12).join('\n  '));
  const B = await bootDevice(drive, JSON.parse(JSON.stringify(EMPTY)), 'B');
  console.log('B boot tasks:', (await tt(B.page)).length);
  const r2 = await sync(B.page);
  console.log('B sync#1:', r2, '| B tasks after pull:', (await tt(B.page)).length, '| drive tasks:', dts(drive).length);
  await BROWSER.close(); s.srv.close();
})().catch(e => { console.error('ERR', e); process.exit(1); });
