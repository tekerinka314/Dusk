// S4/B6 P8 — quarantine review-panel display truth (owed to V2-B4-07) + injection.
// Seeds one journal entry of EVERY kind, opens the panel, records what each loser
// row renders. _entryLoserPreview (11:586) previews field=raw value; every other
// kind = loser.text||name||title → a body-only note (empty title) → «пусто».
import { serve, launch, ROOT, DEVICES } from './lib.mjs';
import fs from 'fs';

const OUT = 'D:/VSCode projects/DUSK_v2.0/audit-v2/shots/s4/p8_quar.json';

const E = (uid, kind, loser, over = {}) => Object.assign({ uid, kind, recType: 'tasks', recUid: 'u1', parentUid: null, field: null, loser, winner: null, reason: kind, createdAt: 1, resolved: false, resolvedAt: null, resolution: null }, over);

const seed = {
  tasks: [{ id: 1, uid: 'u1', text: 'Задача один', checked: false, groupId: null, deadline: null, note: '', subtasks: [], priority: 'none', repeat: 'none', createdAt: 1, updatedAt: 1 }],
  groups: [], archive: [], notes: [], notesArchive: [], tombstones: [], templates: [], noteTemplates: [],
  nextId: 100, nextGroupId: 100, nextSubId: 100, sortMode: 'priority', sortModeOverrides: {}, subAnyMode: false,
  syncJournal: [
    E('e-field-str', 'field', 'проигравший текст', { field: 'text' }),
    E('e-field-obj', 'field', { mode: 'date', value: '2026-07-01' }, { field: 'deadline', recUid: 'u2' }),
    E('e-field-false', 'field', false, { field: 'pinned', recUid: 'u3' }),
    E('e-field-empty', 'field', '', { field: 'note', recUid: 'u4' }),
    E('e-subtask', 'subtask', { uid: 's1', text: 'проигравший подпункт', priority: 'none', updatedAt: 1 }, { parentUid: 'u1' }),
    E('e-subtask-notext', 'subtask', { uid: 's2', text: '', note: 'заметка подпункта', updatedAt: 1 }, { parentUid: 'u1' }),
    E('e-note-titled', 'note-both', { id: 'n9', title: 'Озаглавленная', body: '<p>тело</p>' }, { recType: 'notes', recUid: 'n9' }),
    E('e-note-notitle', 'note-both', { id: 'n10', title: '', body: '<p>важное тело без заголовка</p>' }, { recType: 'notes', recUid: 'n10' }),
    E('e-dve-task', 'delete-vs-edit', { uid: 'u5', text: 'удалённая задача' }, { recUid: 'u5' }),
    E('e-dve-note-notitle', 'delete-vs-edit', { id: 'n11', title: '', body: '<p>тело удалённой заметки</p>' }, { recType: 'notes', recUid: 'n11' }),
    E('e-inject', 'field', '<img src=x onerror="window.__XSS=1">злая', { field: 'text', recUid: 'u6' }),
  ],
};

(async () => {
  const { srv, port } = await serve(ROOT);
  const browser = await launch();
  const ctx = await browser.newContext({ viewport: { width: 1000, height: 900 }, colorScheme: 'dark' });
  const page = await ctx.newPage();
  await page.addInitScript((st) => { try { localStorage.clear(); localStorage.setItem('duskState_v4', JSON.stringify(st)); localStorage.setItem('currentPage', 'main'); indexedDB.deleteDatabase('keyval-store'); } catch (e) {} }, seed);
  await page.goto(`http://localhost:${port}/index.html`, { waitUntil: 'load' });
  await page.waitForTimeout(600);

  const rows = await page.evaluate(() => {
    window.openQuarantine();
    const out = [];
    document.querySelectorAll('.sync-quar-row').forEach(r => {
      const loser = r.querySelector('.sync-quar-loser');
      out.push({
        uid: r.dataset.uid,
        what: (r.querySelector('.sync-quar-what') || {}).textContent || '',
        loserText: loser ? loser.textContent : null,
        loserHTML: loser ? loser.innerHTML : null,
        isPusto: loser ? /пусто/.test(loser.innerHTML) : null,
        hasImg: loser ? !!loser.querySelector('img') : false,
      });
    });
    return { rows: out, xss: !!window.__XSS };
  });

  const results = rows.rows.map(r => ({
    uid: r.uid, what: r.what, shows: r.isPusto ? '«ПУСТО»' : r.loserText,
    pusto: r.isPusto, injectionInert: r.uid === 'e-inject' ? (!r.hasImg && !rows.xss) : undefined,
  }));
  const pustoDespiteContent = results.filter(r => r.pusto && /note|subtask/.test(r.uid));
  console.log(JSON.stringify({ results, xssFired: rows.xss, pustoDespiteContentCount: pustoDespiteContent.length }, null, 2));
  fs.writeFileSync(OUT, JSON.stringify({ results, xssFired: rows.xss }, null, 2));
  await browser.close(); srv.close();
})().catch(e => { console.error('PROBE ERROR', e); process.exit(1); });
