// Phase 3 live-loop headless test. Serves the repo, boots the real app, then
// overrides the global cloud* functions with an in-page FAKE Drive (a JS object
// holding {subset, version}) so the whole pull→merge→apply→push loop runs
// deterministically with no OAuth. Verifies: push creates the file, a remote add
// merges in, a same-field conflict lands in the quarantine journal + badge, the
// review panel restores the loser, and a silent-auth failure → signed-out (no popup).
import http from 'http';
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright-core');

const ROOT = 'D:/VSCode projects/DUSK_v2.0';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const HEADLESS = !process.argv.includes('--show');
const MIME = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.json':'application/json', '.svg':'image/svg+xml', '.jpg':'image/jpeg' };

const srv = http.createServer((q, s) => {
  let u = decodeURIComponent(q.url.split('?')[0]);
  if (u === '/') u = '/index.html';
  fs.readFile(path.join(ROOT, u), (e, d) => {
    if (e) { s.writeHead(404); s.end('nf'); return; }
    s.writeHead(200, { 'Content-Type': MIME[path.extname(u)] || 'application/octet-stream' }); s.end(d);
  });
});

let pass = 0, fail = 0;
const rec = (n, c, d) => { if (c) pass++; else { fail++; console.log('  FAIL:', n, d != null ? '· ' + JSON.stringify(d) : ''); } };

const FAKE = () => {
  window.__drive = { file: null };
  window.__signedIn = true;
  window.cloudIsConfigured = () => true;
  window.cloudStatus = () => ({ signedIn: window.__signedIn, expiresAt: Date.now() + 3600000 });
  window.cloudAuth = async () => { window.__signedIn = true; return { ok: true }; };
  window.cloudSignOut = () => { window.__signedIn = false; };
  window.scheduleSyncPush = function () {};   // disable debounce → drive sync manually only
  window.cloudPull = async () => window.__drive.file
    ? { subset: JSON.parse(JSON.stringify(window.__drive.file.subset)), version: window.__drive.file.version, fileId: 'f1' }
    : { empty: true };
  window.cloudPush = async (subset, opts) => {
    const cur = window.__drive.file ? window.__drive.file.version : null;
    if (opts && opts.expectedVersion != null && String(opts.expectedVersion) !== String(cur)) throw new ConflictError(opts.expectedVersion, cur);
    const v = (cur || 0) + 1;
    window.__drive.file = { subset: JSON.parse(JSON.stringify(subset)), version: v };
    return { fileId: 'f1', version: v };
  };
};

(async () => {
  await new Promise(r => srv.listen(0, r));
  const port = srv.address().port; const baseURL = `http://localhost:${port}`;
  const browser = await chromium.launch({ executablePath: CHROME, headless: HEADLESS });
  const ctx = await browser.newContext({ viewport: { width: 1100, height: 850 } });
  const page = await ctx.newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message));

  await page.goto(`${baseURL}/index.html`);
  await page.waitForTimeout(700);
  rec('boot: no pageerror (11-sync-ui loaded)', errs.length === 0, errs.join(' | '));
  rec('glyph present', await page.evaluate(() => !!document.getElementById('sync-glyph-btn')));

  // install fake cloud + seed a local task
  await page.evaluate(FAKE);
  await page.evaluate(() => {
    state.tasks.push({ id: state.nextId++, uid: 'TASK-A', createdAt: nowTs(), updatedAt: nowTs(),
      text: 'Device A task', checked: false, priority: 'none', groupId: null, deadline: null,
      note: '', noteOpen: false, order: 0, repeat: 'none', cycleChecked: false, nextReset: null, subtasks: [], subtasksOpen: false });
    saveState();
  });

  // 1. first sync → push creates the Drive file, glyph → ok
  const r1 = await page.evaluate(async () => {
    await syncNow({ manual: true });
    return { hasFile: !!window.__drive.file,
             driveTasks: window.__drive.file ? window.__drive.file.subset.tasks.map(t => t.uid) : [],
             glyph: document.getElementById('sync-glyph-btn').getAttribute('data-sync') };
  });
  rec('1: push created Drive file', r1.hasFile);
  rec('1: Drive holds TASK-A', r1.driveTasks.includes('TASK-A'), r1.driveTasks);
  rec('1: glyph → ok', r1.glyph === 'ok', r1.glyph);

  // 2. a "remote device" adds TASK-B → next sync merges it into local
  const r2 = await page.evaluate(async () => {
    const f = window.__drive.file;
    f.subset.tasks.push({ uid: 'TASK-B', text: 'Device B task', updatedAt: nowTs() + 1000, _arch: false,
      subtasks: [], order: 1, priority: 'none', groupId: null, checked: false });
    f.version += 1;
    await syncNow({ manual: true });
    return { uids: state.tasks.map(t => t.uid).sort() };
  });
  rec('2: remote TASK-B merged into local', r2.uids.includes('TASK-A') && r2.uids.includes('TASK-B'), r2.uids);

  // 3. same-field conflict (both edit TASK-A.text; remote newer) → loser quarantined + badge
  const r3 = await page.evaluate(async () => {
    const a = state.tasks.find(t => t.uid === 'TASK-A'); a.text = 'LOCAL EDIT'; a.updatedAt = nowTs(); saveState();
    const ra = window.__drive.file.subset.tasks.find(t => t.uid === 'TASK-A'); ra.text = 'REMOTE EDIT'; ra.updatedAt = nowTs() + 5000;
    window.__drive.file.version += 1;
    await syncNow({ manual: true });
    return { text: state.tasks.find(t => t.uid === 'TASK-A').text,
             unresolved: unresolvedCount(state),
             badge: (document.querySelector('#sync-glyph-btn .sync-badge') || {}).textContent || null };
  });
  rec('3: newer (remote) wins live', r3.text === 'REMOTE EDIT', r3.text);
  rec('3: loser quarantined', r3.unresolved === 1, r3.unresolved);
  rec('3: badge shows count', r3.badge === '1', r3.badge);

  // 4. quarantine review → restore the loser
  const r4 = await page.evaluate(async () => {
    openQuarantine();
    const hadRow = !!document.querySelector('.sync-quar-row');
    const btn = document.querySelector('.sync-quar-restore'); if (btn) btn.click();
    return { hadRow, text: state.tasks.find(t => t.uid === 'TASK-A').text,
             unresolved: unresolvedCount(state),
             overlayGone: !document.querySelector('.sync-quar-overlay') };
  });
  rec('4: review row rendered', r4.hadRow);
  rec('4: restore re-applies the loser value', r4.text === 'LOCAL EDIT', r4.text);
  rec('4: entry resolved → badge cleared', r4.unresolved === 0, r4.unresolved);
  rec('4: overlay auto-closes when empty', r4.overlayGone);

  // 5. silent-auth failure → signed-out, no throw, app usable
  const r5 = await page.evaluate(async () => {
    window.cloudAuth = async () => { throw new Error('would need UI'); };
    window.__signedIn = false;
    window.cloudStatus = () => ({ signedIn: false, expiresAt: 0 });
    let threw = false;
    try { await syncNow({ interactive: false }); } catch (_) { threw = true; }
    return { glyph: document.getElementById('sync-glyph-btn').getAttribute('data-sync'), threw };
  });
  rec('5: silent-auth fail → signed-out', r5.glyph === 'signed-out', r5.glyph);
  rec('5: syncNow never throws to caller', r5.threw === false);

  // 6. panel opens
  const r6 = await page.evaluate(() => {
    document.getElementById('sync-glyph-btn').click();
    return { panel: !!document.querySelector('.snooze-menu.sync-panel') };
  });
  rec('6: sync panel opens', r6.panel);

  rec('end: still no pageerror', errs.length === 0, errs.join(' | '));

  if (!HEADLESS) await page.waitForTimeout(2500);
  await browser.close(); srv.close();
  console.log(`\nsync-ui live-loop test: ${pass} passed, ${fail} failed  (total ${pass + fail})`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('CRASH', e); process.exit(2); });
