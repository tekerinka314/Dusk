// F2 interaction run — add / check / sheet-pin / sub-prio / note / DnD attempt.
// Device passed as argv[2] (pixel7 | small | landscape).
import { serve, launch, openApp, ensureShots } from './lib.mjs';
import { richSeed } from './seed.mjs';
import path from 'path';

const dev = process.argv[2] || 'pixel7';
const { srv, port } = await serve();
const browser = await launch();
const dir = ensureShots('f2/run');
const { ctx, page: p, errors } = await openApp(browser, { device: dev, page: 'main', seed: richSeed(), port });
await p.waitForTimeout(1200);

const shot = async name => { await p.screenshot({ path: path.join(dir, `${dev}_${name}.png`) }); console.log('shot', name); };

// 1. add a task (keyboard path: type + Enter)
await p.tap('#input-box');
await p.keyboard.type('Новый ритуал от прогона');
await p.keyboard.press('Enter');
await p.waitForTimeout(700);
await shot('01_added');
const added = await p.evaluate(() => [...document.querySelectorAll('.task-text')].some(t => t.textContent.includes('Новый ритуал от прогона')));
console.log('added:', added);

// 2. check it (coffin tap)
await p.evaluate(() => {
  const el = [...document.querySelectorAll('.task-item')].find(li => li.querySelector('.task-text')?.textContent.includes('Новый ритуал'));
  el?.querySelector('.task-check')?.click();
});
await p.waitForTimeout(800);
await shot('02_checked');

// 3. pin via ... sheet quick bar
await p.evaluate(() => {
  const el = [...document.querySelectorAll('.task-item')].find(li => li.querySelector('.task-text')?.textContent.includes('подзадач'));
  el?.querySelector('.btn-task-more')?.click();
});
await p.waitForTimeout(500);
await p.evaluate(() => { [...document.querySelectorAll('.fm-q')].find(b => b.dataset.more === 'pin')?.click(); });
await p.waitForTimeout(600);
const pinned = await p.evaluate(() => !!([...document.querySelectorAll('.task-item')].find(li => li.querySelector('.task-text')?.textContent.includes('подзадач'))?.querySelector('.pin-spike')));
console.log('pinned:', pinned);
await shot('03_pinned');

// 4. subtask priority via sub-... sheet
await p.evaluate(() => document.querySelector('.subtask-item .btn-sub-more')?.click());
await p.waitForTimeout(500);
await p.evaluate(() => { [...document.querySelectorAll('.fm-q-prio')].find(b => b.dataset.p === 'high')?.click(); });
await p.waitForTimeout(600);
const subPrio = await p.evaluate(() => document.querySelector('.subtask-item[data-sprio="high"]') ? true : false);
console.log('subPrioHigh:', subPrio);
await shot('04_subprio');

// 5. note chip toggle (inline note open)
await p.evaluate(() => {
  const el = [...document.querySelectorAll('.task-item')].find(li => li.querySelector('.btn-note-toggle'));
  el?.querySelector('.btn-note-toggle')?.click();
});
await p.waitForTimeout(600);
await shot('05_note_open');

// 6. DnD attempt: long-press drag first subtask by its handle (touch)
const dnd = await p.evaluate(() => {
  const items = [...document.querySelectorAll('.subtask-item')];
  if (items.length < 2) return null;
  const h = items[0].querySelector('.sub-drag-handle');
  const r = h.getBoundingClientRect();
  return { x: r.x + r.width / 2, y: r.y + r.height / 2, firstSid: items[0].dataset.sid };
});
if (dnd) {
  try {
    await p.touchscreen.tap(dnd.x, dnd.y); // wake
    await p.waitForTimeout(300);
    // long-press + move sequence via CDP-backed touchscreen: press, hold, drag down
    await p.evaluate(() => scrollTo(0, document.querySelector('.subtask-item').getBoundingClientRect().top + scrollY - 300));
    await p.waitForTimeout(300);
    console.log('dnd: handle present, structural check ok (real drag needs device)');
  } catch (e) { console.log('dnd attempt failed:', e.message); }
}

// 7. keyboard viewport: focus the new-subtask input inside first open card
await p.evaluate(() => document.querySelector('.subtask-add-input, .new-subtask-input')?.focus());
await p.waitForTimeout(400);
await shot('06_kbd_focus');

if (errors.length) console.log('CONSOLE ERRORS:', errors.slice(0, 10)); else console.log('no console errors');
await ctx.close(); await browser.close(); srv.close();
