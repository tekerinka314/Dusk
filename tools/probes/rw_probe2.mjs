// Probe 2: schedule mode (dl-side), task-⋯ action sheet, deadline/repeat modals, landscape.
import { serve, launch, openApp, ensureShots } from './lib.mjs';
import { richSeed } from './seed.mjs';
import path from 'path';

const { srv, port } = await serve();
const browser = await launch();
const dir = ensureShots('rework/sweep');
const dev = process.argv[2] || 'pixel7';

const { ctx, page: p, errors } = await openApp(browser, { device: dev, page: 'main', seed: richSeed(), port });
await p.waitForTimeout(2800);
const shot = async name => { await p.screenshot({ path: path.join(dir, `${dev}_${name}.png`) }); console.log('shot', name); };

// schedule mode → scroll to first dl-side card
await p.evaluate(() => document.getElementById('btn-schedule')?.click());
await p.waitForTimeout(800);
const hasSide = await p.evaluate(() => {
  const el = document.querySelector('.dl-side-panel');
  if (el) { el.closest('.task-item').scrollIntoView({ block: 'center' }); return true; }
  return false;
});
await p.waitForTimeout(400);
await shot('20_schedule_dlside');
console.log('dl-side present:', hasSide);
// action-row wrap stats in schedule mode
const wrapStats = await p.evaluate(() => {
  const rows = [...document.querySelectorAll('.task-item:not(.archive-item) .task-actions')].map(a => {
    const b = [...a.children].filter(x => x.offsetParent !== null);
    return new Set(b.map(x => x.offsetTop)).size;
  });
  return { cards: rows.length, multi: rows.filter(r => r > 1).length };
});
console.log('schedule wrap:', JSON.stringify(wrapStats));
await p.evaluate(() => document.getElementById('btn-schedule')?.click());
await p.waitForTimeout(500);

// task ⋯ action sheet
await p.evaluate(() => { scrollTo(0, 0); });
await p.waitForTimeout(300);
await p.evaluate(() => document.querySelector('.task-item .btn-task-more')?.click());
await p.waitForTimeout(600);
await shot('21_task_more_sheet');
await p.keyboard.press('Escape'); await p.waitForTimeout(400);

// deadline modal
await p.evaluate(() => document.querySelector('.task-item [data-act="openDeadlineModal"]')?.click());
await p.waitForTimeout(700);
await shot('22_deadline_modal');
await p.keyboard.press('Escape'); await p.waitForTimeout(400);

// repeat modal
await p.evaluate(() => document.querySelector('.task-item [data-act="openRepeatModal"]')?.click());
await p.waitForTimeout(700);
await shot('23_repeat_modal');
await p.keyboard.press('Escape'); await p.waitForTimeout(400);

if (errors.length) console.log('CONSOLE ERRORS:', errors.slice(0, 8));
await ctx.close();

// landscape list
const { ctx: c2, page: p2 } = await openApp(browser, { device: 'landscape', page: 'main', seed: richSeed(), port });
await p2.waitForTimeout(2800);
await p2.screenshot({ path: path.join(dir, 'landscape_24_list.png') });
console.log('shot landscape_24_list');
await p2.evaluate(() => document.querySelector('.task-item [data-act="openDeadlineModal"]')?.click());
await p2.waitForTimeout(700);
await p2.screenshot({ path: path.join(dir, 'landscape_25_dl_modal.png') });
console.log('shot landscape_25_dl_modal');
await c2.close();

await browser.close(); srv.close();
