// F2 slice A probe — open the three ⋯ sheets and screenshot each.
import { serve, launch, openApp, ensureShots } from './lib.mjs';
import { richSeed } from './seed.mjs';
import path from 'path';

const { srv, port } = await serve();
const browser = await launch();
const dir = ensureShots('f2/probe');
const { ctx, page: p, errors } = await openApp(browser, { device: 'pixel7', page: 'main', seed: richSeed(), port });
await p.waitForTimeout(2800);

const shot = async name => { await p.screenshot({ path: path.join(dir, `a_${name}.png`) }); console.log('shot', name); };

// 1. task ⋯ sheet
await p.evaluate(() => document.querySelector('.task-item .btn-task-more')?.click());
await p.waitForTimeout(600);
await shot('01_task_sheet');
await p.keyboard.press('Escape'); await p.waitForTimeout(400);

// 2. subtask ⋯ sheet (need an open subtask section — richSeed has task with subtasksOpen?)
const subBtn = await p.evaluate(() => {
  const b = document.querySelector('.subtask-item .btn-sub-more');
  if (b) { b.click(); return true; } return false;
});
await p.waitForTimeout(600);
if (subBtn) await shot('02_sub_sheet'); else console.log('no sub-more visible');
await p.keyboard.press('Escape'); await p.waitForTimeout(400);

// 3. group ⋯ sheet
await p.evaluate(() => document.querySelector('.group-header .btn-group-action')?.click());
await p.waitForTimeout(600);
await shot('03_group_sheet');
// 3b. chained sort sheet
await p.evaluate(() => {
  const items = [...document.querySelectorAll('.snooze-menu [data-act="_groupMore"]')];
  const sort = items.find(b => b.dataset.more === 'sort');
  if (sort) sort.click();
});
await p.waitForTimeout(600);
await shot('04_group_sort_sheet');
await p.keyboard.press('Escape'); await p.waitForTimeout(300);

if (errors.length) console.log('CONSOLE ERRORS:', errors.slice(0, 8));
await ctx.close(); await browser.close(); srv.close();
