// Mobile rework slice 3 probe — float menus render as bottom sheet on coarse.
import { serve, launch, openApp, ensureShots } from './lib.mjs';
import { richSeed } from './seed.mjs';
import path from 'path';

const { srv, port } = await serve();
const browser = await launch();
const dir = ensureShots('rework');
const seed = richSeed();

const sheetState = p => p.evaluate(() => {
  const el = document.querySelector('.snooze-menu.action-sheet');
  if (!el) return { open: false };
  const r = el.getBoundingClientRect();
  return {
    open: true,
    fullWidth: r.left <= 1 && r.right >= innerWidth - 1,
    atBottom: Math.abs(r.bottom - innerHeight) <= 1,
    onScreen: r.top >= 0,
    scrim: !!document.querySelector('.fm-scrim'),
    bodyLocked: document.body.style.overflow === 'hidden',
    items: [...el.querySelectorAll('[role=menuitem]')].length,
  };
});

const { ctx, page: p, errors } = await openApp(browser, { device: 'pixel7', page: 'main', seed, port });
await p.waitForTimeout(2800);

// scroll the list first — sheet must be unaffected by scroll position (B1-28 class)
await p.evaluate(() => scrollTo(0, 400));
await p.waitForTimeout(300);

// 1) task ⋯
await p.locator('.task-item[data-id="2"] .btn-task-more').tap();
await p.waitForTimeout(400);
console.log('task-more:', JSON.stringify(await sheetState(p)));
await p.screenshot({ path: path.join(dir, 's3_sheet_taskmore.png') });
// tap-out closes
await p.touchscreen.tap(206, 100);
await p.waitForTimeout(400);
console.log('after tap-out:', JSON.stringify(await sheetState(p)), 'unlocked:', await p.evaluate(() => document.body.style.overflow !== 'hidden'));

// 2) snooze via ⋯ → «Отложить дедлайн»
await p.locator('.task-item[data-id="2"] .btn-task-more').tap();
await p.waitForTimeout(400);
await p.locator('.snooze-menu [data-more="snooze"]').tap();
await p.waitForTimeout(450);
const snz = await sheetState(p);
console.log('snooze sheet:', JSON.stringify(snz));
await p.screenshot({ path: path.join(dir, 's3_sheet_snooze.png') });
await p.keyboard.press('Escape');
await p.waitForTimeout(350);
console.log('after Esc:', JSON.stringify(await sheetState(p)));

// 3) group ⋯
await p.locator('.group-section [data-act="openGroupMoreMenu"]').first().tap();
await p.waitForTimeout(400);
console.log('group-more:', JSON.stringify(await sheetState(p)));
await p.screenshot({ path: path.join(dir, 's3_sheet_groupmore.png') });
await p.keyboard.press('Escape');
await p.waitForTimeout(300);

// 4) submode via task ⋯ (task 9 has subtasks) — chained sheet
await p.evaluate(() => { const el = document.querySelector('.task-item[data-id="9"]'); el.scrollIntoView({ block: 'center' }); });
await p.waitForTimeout(300);
await p.locator('.task-item[data-id="9"] .btn-task-more').tap();
await p.waitForTimeout(400);
await p.locator('.snooze-menu [data-more="submode"]').tap();
await p.waitForTimeout(450);
console.log('submode sheet:', JSON.stringify(await sheetState(p)));
await p.screenshot({ path: path.join(dir, 's3_sheet_submode.png') });

if (errors.length) console.log('CONSOLE ERRORS:', errors);
await ctx.close();
await browser.close();
srv.close();
