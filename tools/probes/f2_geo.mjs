// One-shot geometry probe for F2 debt: coffin/title align, sub-row gaps,
// group-sheet spacing, toolbar divider, params-row alignment, task-sheet verbs,
// sub-deadline pill. pixel7.
import { serve, launch, openApp } from './lib.mjs';
import { richSeed } from './seed.mjs';

const { srv, port } = await serve();
const browser = await launch();
const seed = richSeed();
// give one open-card subtask a deadline (sub-deadline pill check)
const t = seed.tasks.find(x => x.subtasks?.length && x.subtasksOpen);
if (t) { t.subtasks[1].deadline = { mode: 'date', value: new Date(Date.now() + 2 * 864e5).toISOString().slice(0, 10), time: '12:00' }; }
const { ctx, page: p, errors } = await openApp(browser, { device: 'pixel7', page: 'main', seed, port });
await p.waitForTimeout(1500);

const R = r => r ? { x: +r.x.toFixed(1), y: +r.y.toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1), cy: +(r.y + r.height / 2).toFixed(1) } : null;

// 1. coffin vs title first line
const align = await p.evaluate(() => {
  const li = [...document.querySelectorAll('.task-item')].find(x => x.querySelector('.task-text'));
  const check = li.querySelector('.task-check').getBoundingClientRect();
  const txt = li.querySelector('.task-text');
  const line1 = txt.getClientRects()[0];
  const col = li.querySelector('.task-check-col').getBoundingClientRect();
  const more = li.querySelector('.btn-task-more')?.getBoundingClientRect();
  return { check, line1: { x: line1.x, y: line1.y, width: line1.width, height: line1.height }, col, more,
    itemPadTop: getComputedStyle(li).paddingTop, colGap: getComputedStyle(li.querySelector('.task-check-col')).gap };
});
console.log('ALIGN check:', R(align.check), 'line1:', R(align.line1), 'col:', R(align.col), 'more:', R(align.more), align.itemPadTop, align.colGap);

// 2. sub row gaps + sub-deadline pill
const sub = await p.evaluate(() => {
  const rows = [...document.querySelectorAll('.subtask-item')];
  const row = rows[0];
  const g = s => row.querySelector(s)?.getBoundingClientRect() || null;
  const dl = rows.map(r2 => r2.querySelector('.sub-deadline, .sub-dl, [class*="sub-dead"]')).find(Boolean);
  const dlRow = dl ? dl.closest('.subtask-item').getBoundingClientRect() : null;
  return { row: row.getBoundingClientRect(), handle: g('.sub-drag-handle'), check: g('.sub-check'),
    text: g('.sub-text') || g('[class*="sub-t"]'), more: g('.btn-sub-more'),
    rowHTMLsample: row.outerHTML.slice(0, 600),
    dlPill: dl ? { html: dl.outerHTML.slice(0, 200), rect: dl.getBoundingClientRect(), rowRect: dlRow, overflows: dl.getBoundingClientRect().right > dl.closest('.subtask-item').getBoundingClientRect().right - 2 } : 'NO SUB-DEADLINE PILL FOUND'
  };
});
console.log('SUB row:', R(sub.row), 'handle:', R(sub.handle), 'check:', R(sub.check), 'text:', R(sub.text), 'more:', R(sub.more));
console.log('SUB dl:', typeof sub.dlPill === 'string' ? sub.dlPill : JSON.stringify({ rect: R(sub.dlPill.rect), row: R(sub.dlPill.rowRect), overflows: sub.dlPill.overflows, html: sub.dlPill.html }));
console.log('SUB html:', sub.rowHTMLsample.replace(/\s+/g, ' '));

// screenshot of the sub-deadline area
await p.screenshot({ path: 'D:/VSCode projects/DUSK_v2.0/audit-v2/shots/f2/probe/geo_main.png' });

// 3. group-⋯ sheet spacing
await p.evaluate(() => document.querySelector('[data-act="openGroupMoreMenu"]')?.click());
await p.waitForTimeout(700);
const grp = await p.evaluate(() => {
  const menu = document.querySelector('.float-menu, [class*="float-menu"], [class*="sheet"]');
  if (!menu) return 'NO MENU';
  const items = [...menu.querySelectorAll('button, [role="menuitem"]')];
  return { menuClass: menu.className, items: items.map(b => { const r = b.getBoundingClientRect(); return { cls: b.className.slice(0, 40), txt: (b.textContent || '').trim().slice(0, 25), y: +r.y.toFixed(1), h: +r.height.toFixed(1) }; }) };
});
console.log('GROUP SHEET:', JSON.stringify(grp, null, 1));
await p.screenshot({ path: 'D:/VSCode projects/DUSK_v2.0/audit-v2/shots/f2/probe/geo_groupsheet.png' });
await p.keyboard.press('Escape'); await p.waitForTimeout(400);

// 4. task-⋯ sheet (verb list reference)
await p.evaluate(() => document.querySelector('.btn-task-more')?.click());
await p.waitForTimeout(700);
const tsheet = await p.evaluate(() => {
  const menu = [...document.querySelectorAll('.float-menu, [class*="float-menu"]')].pop();
  if (!menu) return 'NO MENU';
  const items = [...menu.querySelectorAll('button')];
  return items.map(b => { const r = b.getBoundingClientRect(); return { cls: b.className.slice(0, 44), txt: (b.textContent || '').trim().slice(0, 25), y: +r.y.toFixed(1), h: +r.height.toFixed(1) }; });
});
console.log('TASK SHEET:', JSON.stringify(tsheet, null, 1));
await p.keyboard.press('Escape'); await p.waitForTimeout(400);

// 5. sub-⋯ sheet items
await p.evaluate(() => document.querySelector('.btn-sub-more')?.click());
await p.waitForTimeout(700);
const ssheet = await p.evaluate(() => {
  const menu = [...document.querySelectorAll('.float-menu, [class*="float-menu"]')].pop();
  if (!menu) return 'NO MENU';
  return [...menu.querySelectorAll('button')].map(b => { const r = b.getBoundingClientRect(); return { cls: b.className.slice(0, 44), txt: (b.textContent || '').trim().slice(0, 25), y: +r.y.toFixed(1), h: +r.height.toFixed(1) }; });
});
console.log('SUB SHEET:', JSON.stringify(ssheet, null, 1));
await p.keyboard.press('Escape'); await p.waitForTimeout(400);

// 6. toolbar rows: buttons + any vertical dividers (borders/::before)
const tb = await p.evaluate(() => {
  const bar = document.querySelector('.toolbar');
  const groups = [...bar.querySelectorAll('.toolbar-group')].map(g => {
    const r = g.getBoundingClientRect(); const cs = getComputedStyle(g);
    const before = getComputedStyle(g, '::before'); const after = getComputedStyle(g, '::after');
    return { cls: g.className.slice(0, 40), x: +r.x.toFixed(1), y: +r.y.toFixed(1), w: +r.width.toFixed(1),
      bl: cs.borderLeftWidth + ' ' + cs.borderLeftColor, br: cs.borderRightWidth,
      beforeW: before.width + '/' + before.content + '/' + before.backgroundColor, afterW: after.width + '/' + after.content };
  });
  return { barRect: bar.getBoundingClientRect().height, groups };
});
console.log('TOOLBAR:', JSON.stringify(tb, null, 1));

// 7. ПАРАМЕТРЫ form-action-row alignment
await p.evaluate(() => document.querySelector('#btn-expand')?.click());
await p.waitForTimeout(900);
const params = await p.evaluate(() => {
  const row = document.querySelector('.form-action-row');
  const cs = getComputedStyle(row);
  const kids = [...row.children].map(k => { const r = k.getBoundingClientRect(); return { cls: k.className, x: +r.x.toFixed(1), y: +r.y.toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1), txtAlign: getComputedStyle(k).justifyContent }; });
  return { rowJustify: cs.justifyContent, rowDisplay: cs.display, rowGap: cs.gap, flexWrap: cs.flexWrap, rowRect: R2(row), kids };
  function R2(el) { const r = el.getBoundingClientRect(); return { x: +r.x.toFixed(1), y: +r.y.toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1) }; }
});
console.log('PARAMS ROW:', JSON.stringify(params, null, 1));
await p.screenshot({ path: 'D:/VSCode projects/DUSK_v2.0/audit-v2/shots/f2/probe/geo_params.png' });

if (errors.length) console.log('ERRORS:', errors.slice(0, 8));
await ctx.close(); await browser.close(); srv.close();
