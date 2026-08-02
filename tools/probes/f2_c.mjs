// F2 slice C probe — sync sheet, deadline/repeat modals, entrance timing.
import { serve, launch, openApp, ensureShots } from './lib.mjs';
import { richSeed } from './seed.mjs';
import path from 'path';

const { srv, port } = await serve();
const browser = await launch();
const dir = ensureShots('f2/probe');
const { ctx, page: p, errors } = await openApp(browser, { device: 'pixel7', page: 'main', seed: richSeed(), port });

// entrance timing: shot at 500ms — cards should already be settled on coarse
await p.waitForTimeout(500);
await p.screenshot({ path: path.join(dir, 'c_00_boot500ms.png') });
console.log('shot boot500');
await p.waitForTimeout(2000);

const shot = async name => { await p.screenshot({ path: path.join(dir, `c_${name}.png`) }); console.log('shot', name); };

// sync sheet
await p.evaluate(() => document.querySelector('.sync-glyph')?.click());
await p.waitForTimeout(500);
await shot('01_sync_sheet');
await p.keyboard.press('Escape'); await p.waitForTimeout(300);

// deadline modal (first task with an id)
await p.evaluate(() => { const id = +document.querySelector('.task-item[data-id]').dataset.id; openDeadlineModal(id); });
await p.waitForTimeout(600);
await shot('02_deadline_modal');
await p.keyboard.press('Escape'); await p.waitForTimeout(400);

// repeat modal
await p.evaluate(() => { const id = +document.querySelector('.task-item[data-id]').dataset.id; openRepeatModal(id); });
await p.waitForTimeout(600);
await shot('03_repeat_modal');
await p.keyboard.press('Escape'); await p.waitForTimeout(400);

// prio modal
await p.evaluate(() => { const id = +document.querySelector('.task-item[data-id]').dataset.id; openPrioModal(id); });
await p.waitForTimeout(600);
await shot('04_prio_modal');
await p.keyboard.press('Escape'); await p.waitForTimeout(300);

if (errors.length) console.log('CONSOLE ERRORS:', errors.slice(0, 8));
await ctx.close(); await browser.close(); srv.close();
