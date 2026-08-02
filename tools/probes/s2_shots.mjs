// S2 desktop screenshot inventory — B2/B3/B4 lenses.
// Usage: node s2_shots.mjs <section>   sections: tasks|modals|grim|sync|empty|second|hover|icons
import { serve, launch, openApp, ensureShots } from './lib.mjs';
import { richSeed } from './seed.mjs';
import fs from 'fs'; import path from 'path';

const SECTION = process.argv[2] || 'tasks';
const DIR = ensureShots('s2');
const DESK = { width: 2560, height: 1440, deviceScaleFactor: 1, isMobile: false, hasTouch: false, userAgent: undefined };
const FHD  = { width: 1920, height: 1080, deviceScaleFactor: 1, isMobile: false, hasTouch: false, userAgent: undefined };
const LAPTOP = { width: 1366, height: 768, deviceScaleFactor: 1, isMobile: false, hasTouch: false, userAgent: undefined };

const { srv, port } = await serve();
const browser = await launch();
const log = (...a) => console.log('[s2]', ...a);

async function shot(p, name, opts = {}) {
  await p.screenshot({ path: path.join(DIR, name + '.png'), ...opts });
  log('shot', name);
}
const wait = (p, ms = 400) => p.waitForTimeout(ms);

// quarantine journal seed (same shapes as s1)
function journalEntries() {
  const now = Date.now();
  return [
    { uid: 'jq1', kind: 'field', recType: 'task', recUid: 'u1', field: 'text', loser: 'Проигравшая правка заголовка', winner: 'Зажечь чёрные свечи перед алтарём', reason: 'same-field clash', createdAt: now - 60000, resolved: false },
    { uid: 'jq2', kind: 'field', recType: 'group', recUid: 'g10', field: 'name', loser: 'Старое имя группы', winner: 'Ритуалы ночи', reason: 'same-field clash', createdAt: now - 120000, resolved: false },
    { uid: 'jq3', kind: 'subtask', recType: 'task', recUid: 'u9', parentUid: 'u9', field: 'text', loser: 'проигравшая подзадача', winner: 'первая', reason: 'subtask clash', createdAt: now - 180000, resolved: false },
    { uid: 'jq4', kind: 'delete-vs-edit', recType: 'task', recUid: 'u12', field: null, loser: '{"text":"Удалённая при правке"}', winner: null, reason: 'delete-vs-edit → delete', createdAt: now - 240000, resolved: false },
    { uid: 'jq5', kind: 'note-both', recType: 'note', recUid: 'n8', field: 'body', loser: '<p>Копия-неудачник заметки.</p>', winner: '<p>Одна строка.</p>', reason: 'note conflict keep-both', createdAt: now - 300000, resolved: true },
  ];
}

if (SECTION === 'tasks') {
  const { page: p, errors } = await openApp(browser, { device: DESK, seed: richSeed(), port });
  await shot(p, 'D-main-2560', { fullPage: true });
  // params row expanded
  await p.click('#btn-expand'); await wait(p, 600);
  await shot(p, 'D-quickadd-params');
  // typeahead priority
  await p.click('#input-box'); await p.type('#input-box', 'Новая задача !', { delay: 30 }); await wait(p);
  await shot(p, 'D-typeahead-prio');
  await p.fill('#input-box', ''); await p.keyboard.press('Escape'); await wait(p);
  await p.click('#btn-expand'); await wait(p, 500);
  // sort menu
  const sortBtn = await p.$('#btn-sort-mode');
  if (sortBtn) { await sortBtn.click(); await wait(p); await shot(p, 'D-sort-menu'); await p.keyboard.press('Escape'); await wait(p); }
  // today filter
  const today = await p.$('#btn-today');
  if (today) { await today.click(); await wait(p, 600); await shot(p, 'D-filter-today', { fullPage: true }); await today.click(); await wait(p, 400); }
  // schedule mode
  const schedBtn = await p.$('#btn-schedule');
  if (schedBtn) { await schedBtn.click(); await wait(p, 700); await shot(p, 'D-schedule-mode', { fullPage: true }); await schedBtn.click(); await wait(p, 500); }
  // select mode (JS click — button may be hover-revealed/hidden)
  const selBtn = await p.$('#btn-select-mode');
  if (selBtn) { await p.evaluate(el => el.click(), selBtn); await wait(p, 500);
    const boxes = await p.$$('.task .select-check, .task .task-select, .task input[type=checkbox].sel');
    for (const b of boxes.slice(0, 2)) await b.click().catch(() => {});
    if (!boxes.length) { const t = await p.$$('.task'); for (const el of t.slice(0, 2)) await el.click().catch(() => {}); }
    await wait(p); await shot(p, 'D-select-mode'); await p.evaluate(el => el.click(), selBtn); await wait(p, 400); }
  // collapse group
  const gh = await p.$('[data-act="toggleGroupCollapse"]');
  if (gh) { await p.evaluate(el => el.click(), gh); await wait(p, 600); await shot(p, 'D-group-collapsed'); }
  // toolbar extras: notifications popover, shortcuts hint
  for (const [id, name] of [['#btn-notifications', 'D-pop-notifications'], ['#btn-shortcuts-toggle', 'D-shortcuts'], ['#btn-export', 'D-pop-export'], ['#btn-collapse-all', 'D-collapse-all'], ['#btn-split-groups', 'D-split-groups'], ['#btn-sub-anymode', 'D-sub-anymode']]) {
    const b = await p.$(id); if (!b) { log(id, 'NOT FOUND'); continue; }
    await p.evaluate(el => el.click(), b); await wait(p, 550);
    await shot(p, name); await p.keyboard.press('Escape'); await wait(p, 300);
    if (['D-collapse-all', 'D-split-groups', 'D-sub-anymode'].includes(name)) { await p.evaluate(el => el.click(), b); await wait(p, 400); }
  }
  console.log('console errors:', errors);
} else if (SECTION === 'modals') {
  const { page: p } = await openApp(browser, { device: DESK, seed: richSeed(), port });
  const closeAll = async () => { await p.keyboard.press('Escape'); await wait(p, 400); };
  // deadline modal (via JS opener on task 1)
  await p.evaluate(() => globalThis.openDeadlineModal && openDeadlineModal(1)); await wait(p, 600);
  await shot(p, 'D-modal-deadline'); await closeAll();
  // repeat modal
  await p.evaluate(() => globalThis.openRepeatModal && openRepeatModal(1)); await wait(p, 600);
  await shot(p, 'D-modal-repeat'); await closeAll();
  // templates
  await p.evaluate(() => globalThis.openTemplatesModal && openTemplatesModal()); await wait(p, 600);
  await shot(p, 'D-modal-templates'); await closeAll();
  // rename group
  await p.evaluate(() => globalThis.openRenameGroupModal && openRenameGroupModal(10)); await wait(p, 600);
  await shot(p, 'D-modal-rename-group'); await closeAll();
  // color filter modal
  await p.evaluate(() => globalThis.openColorFilterModal && openColorFilterModal()); await wait(p, 600);
  await shot(p, 'D-modal-colorfilter'); await closeAll();
  // more-menu popover on task 1 (hover to reveal actions, then find by data-act)
  const card1 = await p.$('.task[data-id="1"], li[data-id="1"]');
  if (card1) { await card1.hover(); await wait(p, 400); }
  const more = await p.$('[data-id="1"] [data-act="openTaskMoreMenu"], [data-id="1"] [data-act*="ore"], [data-id="1"] button[title*="ополнительно" i], [data-id="1"] button[title*="Ещё" i]');
  if (more) { await p.evaluate(el => el.click(), more); await wait(p); await shot(p, 'D-pop-more-menu'); await closeAll(); }
  else {
    const acts = await p.evaluate(() => [...document.querySelectorAll('[data-id="1"] [data-act]')].map(e => e.getAttribute('data-act')));
    log('task1 actions:', JSON.stringify(acts));
  }
  // snooze popover
  await p.evaluate(() => { const t = document.querySelector('.task[data-id="2"]'); const b = t && t.querySelector('[data-action="openSnooze"], .task-snooze'); b && b.click(); }); await wait(p);
  await shot(p, 'D-pop-snooze'); await closeAll();
  // group picker dropdown in params row
  await p.click('#btn-expand'); await wait(p, 500);
  const grp = await p.$('#grp-trigger'); if (grp) { await grp.click(); await wait(p); await shot(p, 'D-pop-grp-picker'); await closeAll(); }
  // archive page
  await p.evaluate(() => globalThis.showPage && showPage('archive')); await wait(p, 700);
  await shot(p, 'D-archive', { fullPage: true });
  // toast + undo (delete task)
  await p.evaluate(() => globalThis.showPage && showPage('main')); await wait(p, 500);
  await p.evaluate(() => globalThis.deleteTask && deleteTask(12)); await wait(p, 400);
  await shot(p, 'D-toast-undo');
} else if (SECTION === 'grim') {
  const { page: p } = await openApp(browser, { device: DESK, seed: richSeed(), port, page: 'notes' });
  await shot(p, 'D-grim-list', { fullPage: true });
  // open notes: n1 rich, n3 table, n6 long
  for (const [id, name] of [['n1', 'D-grim-note-rich'], ['n3', 'D-grim-note-table'], ['n4', 'D-grim-note-code'], ['n6', 'D-grim-note-long']]) {
    await p.evaluate((i) => globalThis.grimOpen && grimOpen(i), id); await wait(p, 700);
    await shot(p, name, { fullPage: name === 'D-grim-note-long' ? false : true });
    await p.evaluate(() => globalThis.grimClose && grimClose()); await wait(p, 500);
  }
  // dump toolbar buttons once (discovery aid)
  await p.evaluate(() => globalThis.grimOpen && grimOpen('n1')); await wait(p, 600);
  const btns = await p.evaluate(() =>
    [...document.querySelectorAll('#grim-detail button, .grim-toolbar button, .grim-topbar button')]
      .map(b => (b.id || '') + '|' + (b.title || b.getAttribute('aria-label') || '').slice(0, 30)).slice(0, 40));
  console.log('GRIM BUTTONS:', JSON.stringify(btns));
  // история (летопись) — find by title
  const hist = await p.$('button[title*="етопис" i], button[aria-label*="етопис" i], button[title*="стори" i]');
  if (hist) { await p.evaluate(el => el.click(), hist); await wait(p, 600); await shot(p, 'D-grim-history'); await p.keyboard.press('Escape'); await wait(p); }
  else log('history btn NOT FOUND');
  // TOC on long note
  await p.evaluate(() => globalThis.grimClose && grimClose()); await wait(p, 400);
  await p.evaluate(() => globalThis.grimOpen && grimOpen('n6')); await wait(p, 600);
  const toc = await p.$('button[title*="главлен" i], button[aria-label*="главлен" i], #grim-toc-btn');
  if (toc) { await p.evaluate(el => el.click(), toc); await wait(p, 500); await shot(p, 'D-grim-toc'); } else log('toc btn NOT FOUND');
  await p.evaluate(() => globalThis.grimClose && grimClose()); await wait(p, 400);
  // color filter pop
  const cf = await p.$('#grim-cfilter-btn'); if (cf) { await p.evaluate(el => el.click(), cf); await wait(p); await shot(p, 'D-grim-cfilter'); await p.keyboard.press('Escape'); }
  // search
  const se = await p.$('#notes-search-box');
  if (se) { await se.click(); await se.type('закл'); await wait(p, 500); await shot(p, 'D-grim-search'); await se.fill(''); }
  // notes archive segment
  const seg = await p.$('#grim-seg-archive');
  if (seg) { await p.evaluate(el => el.click(), seg); await wait(p, 600); await shot(p, 'D-grim-archive', { fullPage: true }); }
  // templates popover + new-note split
  const tpl = await p.$('#grim-tpl-trigger');
  if (tpl) { await p.evaluate(el => el.click(), tpl); await wait(p, 500); await shot(p, 'D-grim-tpl-pop'); await p.keyboard.press('Escape'); await wait(p, 300); }
  // io popover
  const io = await p.$('#grim-io');
  if (io) { await p.evaluate(el => el.click(), io); await wait(p, 500); await shot(p, 'D-grim-io-pop'); await p.keyboard.press('Escape'); }
  // select mode
  const gsel = await p.$('#grim-select-btn');
  if (gsel) { await p.evaluate(el => el.click(), gsel); await wait(p, 500); const cards = await p.$$('.grim-card'); for (const c of cards.slice(0, 2)) await c.click().catch(() => {}); await wait(p, 300); await shot(p, 'D-grim-select'); }
} else if (SECTION === 'sync') {
  const seed = richSeed(); seed.syncJournal = journalEntries();
  const { page: p } = await openApp(browser, { device: DESK, seed, port });
  const eye = await p.$('#sync-glyph-btn');
  if (eye) { await eye.click(); await wait(p, 600); await shot(p, 'D-sync-panel'); }
  await p.evaluate(() => globalThis.openQuarantine && openQuarantine()); await wait(p, 600);
  await shot(p, 'D-sync-quarantine');
} else if (SECTION === 'empty') {
  const empty = { tasks: [], groups: [], archive: [], notes: [], notesArchive: [], tombstones: [], templates: [], nextId: 1, nextGroupId: 1, nextSubId: 1, sortMode: 'manual', sortModeOverrides: {}, subAnyMode: false };
  const { page: p } = await openApp(browser, { device: DESK, seed: empty, port });
  await shot(p, 'D-empty-tasks');
  await p.evaluate(() => globalThis.showPage && showPage('archive')); await wait(p, 600);
  await shot(p, 'D-empty-archive');
  const { page: p2 } = await openApp(browser, { device: DESK, seed: empty, port, page: 'notes' });
  await shot(p2, 'D-empty-grim');
} else if (SECTION === 'second') {
  for (const [dev, tag] of [[FHD, '1920'], [LAPTOP, '1366']]) {
    const { page: p } = await openApp(browser, { device: dev, seed: richSeed(), port });
    await shot(p, `D-main-${tag}`);
    const { page: p2 } = await openApp(browser, { device: dev, seed: richSeed(), port, page: 'notes' });
    await p2.evaluate(() => globalThis.grimOpen && grimOpen('n1')); await wait(p2, 600);
    await shot(p2, `D-grim-note-${tag}`);
  }
} else if (SECTION === 'hover') {
  const { page: p } = await openApp(browser, { device: DESK, seed: richSeed(), port });
  // hover task card 1
  const card = await p.$('.task[data-id="1"], li[data-id="1"], [data-id="1"]');
  if (card) { await card.hover(); await wait(p, 500); const bb = await card.boundingBox();
    await shot(p, 'D-hover-task', { clip: { x: Math.max(0, bb.x - 40), y: Math.max(0, bb.y - 40), width: Math.min(2560, bb.width + 80), height: bb.height + 80 } }); }
  // hover subtask
  const st = await p.$('[data-id="1"] .subtask, [data-id="1"] .sub-item, [data-id="1"] li[data-sid]');
  if (st) { await st.hover(); await wait(p, 400); const bb = await st.boundingBox();
    await shot(p, 'D-hover-subtask', { clip: { x: Math.max(0, bb.x - 30), y: Math.max(0, bb.y - 30), width: Math.min(2560, bb.width + 60), height: bb.height + 60 } }); }
  // keyboard focus pass: Tab a few times, shot focus ring
  await p.click('body'); for (let i = 0; i < 3; i++) await p.keyboard.press('Tab');
  await wait(p, 300); await shot(p, 'D-focus-tab3');
  for (let i = 0; i < 5; i++) await p.keyboard.press('Tab');
  await wait(p, 300); await shot(p, 'D-focus-tab8');
} else if (SECTION === 'icons') {
  // icon sheet: collect every <symbol> def + every inline svg (dedup by outerHTML), render grid at 4 sizes on app bg
  const { page: p } = await openApp(browser, { device: DESK, seed: richSeed(), port });
  const count = await p.evaluate(() => {
    const seen = new Map();
    document.querySelectorAll('symbol[id]').forEach(s => seen.set('sym:' + s.id, `<svg viewBox="${s.getAttribute('viewBox') || '0 0 24 24'}"><use href="#${s.id}"/></svg>`));
    document.querySelectorAll('svg:not([data-iconsheet])').forEach(s => {
      if (s.closest('#iconsheet')) return;
      const key = s.outerHTML.replace(/\s+/g, ' ').slice(0, 400);
      if (!seen.has(key)) seen.set(key, s.outerHTML);
    });
    const wrap = document.createElement('div'); wrap.id = 'iconsheet';
    wrap.style.cssText = 'position:fixed;inset:0;z-index:99999;overflow:auto;background:var(--bg-main,#0b0812);padding:24px;display:flex;flex-wrap:wrap;gap:14px;align-content:flex-start';
    let i = 0;
    for (const [k, svg] of seen) {
      const cell = document.createElement('div');
      cell.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:6px;padding:8px;border:1px solid rgba(140,92,255,.25);min-width:150px';
      const label = k.startsWith('sym:') ? k : 'inline#' + (i++);
      cell.innerHTML = `<div style="display:flex;gap:10px;align-items:center;color:#cbb8ff">` +
        [16, 20, 24, 32].map(sz => `<span style="width:${sz}px;height:${sz}px;display:inline-flex">${svg.replace('<svg', `<svg data-iconsheet="1" width="${sz}" height="${sz}" style="width:${sz}px;height:${sz}px"`)}</span>`).join('') +
        `</div><div style="font:10px monospace;color:#8a7fae;max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${label.slice(0, 28)}</div>`;
      wrap.appendChild(cell);
    }
    document.body.appendChild(wrap);
    return seen.size;
  });
  log('icons collected:', count);
  await wait(p, 500);
  await shot(p, 'D-iconsheet', { fullPage: false });
  // scroll pages of the sheet
  let pg = 1;
  while (pg < 6) {
    const done = await p.evaluate(() => { const w = document.getElementById('iconsheet'); w.scrollTop += 1300; return w.scrollTop + 1440 >= w.scrollHeight; });
    await wait(p, 300); await shot(p, `D-iconsheet-p${++pg}`);
    if (done) break;
  }
}

await browser.close(); srv.close();
