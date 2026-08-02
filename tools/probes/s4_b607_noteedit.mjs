// V2-B6-07 — end-to-end proof on the real dist. With sync enabled, typing a
// task note must survive (a) a periodic/cycle render() and (b) a full syncNow
// merge landing fired MID-EDIT: the editor stays focused, no keystroke is lost,
// and the note persists across a reload.
import { serve, launch, ROOT } from './lib.mjs';
import { makeDrive, installFakeCloud, seedTokenInit } from './fakecloud.mjs';
import fs from 'fs';

const OUT = 'D:/VSCode projects/DUSK_v2.0/audit-v2/shots/s4/b607_noteedit.json';
const FAR = Date.now() + 3600_000;

const SEED = {
  tasks: [{ id: 1, uid: 't1', text: 'Задача с заметкой', note: 'старт ', noteOpen: true,
            checked: false, priority: 'none', groupId: null, deadline: null, color: null,
            pinned: false, order: 0, repeat: 'none', cycleChecked: false, nextReset: null,
            subtasks: [], subtasksOpen: false, updatedAt: 1000, createdAt: 1000 }],
  groups: [], archive: [], notes: [], notesArchive: [], templates: [], noteTemplates: [],
  tombstones: [], syncJournal: [], nextId: 2, nextGroupId: 1, nextSubId: 1,
};

(async () => {
  const s = await serve(ROOT); const PORT = s.port; const BROWSER = await launch();
  const drive = makeDrive();
  const ctx = await BROWSER.newContext({ colorScheme: 'dark' });
  await installFakeCloud(ctx, drive);
  await ctx.addInitScript(seedTokenInit(FAR, true));

  const sp = await ctx.newPage();
  await sp.goto(`http://localhost:${PORT}/__seed__`, { waitUntil: 'load' }).catch(() => {});
  await sp.evaluate((st) => {
    localStorage.setItem('duskState_v4', JSON.stringify(st));
    localStorage.setItem('currentPage', 'main');
    try { indexedDB.deleteDatabase('keyval-store'); } catch (e) {}
  }, SEED);
  await sp.close();

  const page = await ctx.newPage();
  const consoleErrs = [];
  page.on('console', m => { if (m.type() === 'error') consoleErrs.push(m.text()); });
  page.on('pageerror', e => consoleErrs.push('PAGEERROR ' + e.message));
  await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'load' });
  await page.waitForTimeout(1500);   // boot + any on-open sync settles

  const R = {};

  // enter edit mode on the note (the app's own entry) → focuses, caret to end
  await page.evaluate(() => { window._taskNoteEdit(document.getElementById('note-1')); });
  await page.waitForTimeout(100);
  R.editorFocusedAtStart = await page.evaluate(() =>
    document.activeElement === document.getElementById('note-1'));

  // type burst 1, pausing >350ms so the debounce autosave (→ scheduleSyncPush) fires
  await page.keyboard.type('ААААА', { delay: 40 });
  await page.waitForTimeout(500);

  // DANGER 1: a periodic/cycle-reset style full render mid-edit
  await page.evaluate(() => window.render());
  await page.waitForTimeout(100);
  R.afterRender = await page.evaluate(() => ({
    focused: document.activeElement === document.getElementById('note-1'),
    editable: document.getElementById('note-1').getAttribute('contenteditable') === 'true',
    text: (document.getElementById('note-1').textContent || ''),
  }));

  // type burst 2
  await page.keyboard.type('БББББ', { delay: 40 });
  await page.waitForTimeout(500);

  // DANGER 2: a full sync merge landing mid-edit (applySyncSubset + render)
  await page.evaluate(async () => { await window.syncNow({ interactive: false }); });
  await page.waitForTimeout(300);
  R.afterSync = await page.evaluate(() => ({
    focused: document.activeElement === document.getElementById('note-1'),
    editable: document.getElementById('note-1').getAttribute('contenteditable') === 'true',
    text: (document.getElementById('note-1').textContent || ''),
  }));

  // commit (blur) → persist, then reload and check durability
  await page.evaluate(() => document.getElementById('note-1').blur());
  await page.waitForTimeout(400);
  R.stateNoteAfterCommit = await page.evaluate(() => window.state.tasks[0].note);

  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(1500);
  R.noteAfterReload = await page.evaluate(() => window.state.tasks[0].note);

  R.consoleErrs = consoleErrs;
  const expectedTail = 'старт ААААА' + 'БББББ';   // 'старт ' + both bursts (whitespace-insensitive compare below)
  const norm = s => (s || '').replace(/\s+/g, '');
  R.pass =
    R.editorFocusedAtStart === true &&
    R.afterRender.focused && R.afterRender.editable && norm(R.afterRender.text).includes(norm('стартААААА')) &&
    R.afterSync.focused && R.afterSync.editable && norm(R.afterSync.text) === norm(expectedTail) &&
    norm(R.stateNoteAfterCommit) === norm(expectedTail) &&
    norm(R.noteAfterReload) === norm(expectedTail);

  await ctx.close(); await BROWSER.close(); s.srv.close();
  fs.writeFileSync(OUT, JSON.stringify(R, null, 2));
  console.log(JSON.stringify(R, null, 2));
  process.exit(R.pass ? 0 : 2);
})().catch(e => { console.error('PROBE ERROR', e); process.exit(1); });
