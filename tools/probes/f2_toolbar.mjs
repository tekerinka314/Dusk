// F2 slice B probe — top/header/toolbar + tools sheet + armed clear-all.
import { serve, launch, openApp, ensureShots } from './lib.mjs';
import { richSeed } from './seed.mjs';
import path from 'path';

const { srv, port } = await serve();
const browser = await launch();
const dir = ensureShots('f2/probe');
const { ctx, page: p, errors } = await openApp(browser, { device: 'pixel7', page: 'main', seed: richSeed(), port });
await p.waitForTimeout(2800);

const shot = async name => { await p.screenshot({ path: path.join(dir, `b_${name}.png`) }); console.log('shot', name); };

await shot('01_top');
const mTop = await p.evaluate(() => {
  const nav = document.querySelector('.page-nav');
  const r = nav.getBoundingClientRect();
  return { navBottom: Math.round(r.bottom), toolMore: !!document.querySelector('.btn-tool-more')?.offsetParent, dataGroupHidden: getComputedStyle(document.querySelector('.toolbar-group-data')).display === 'none' };
});
console.log('metrics', JSON.stringify(mTop));

// tools sheet
await p.evaluate(() => document.getElementById('btn-tool-more')?.click());
await p.waitForTimeout(500);
await shot('02_tools_sheet');
// arm clear-all (first tap)
await p.evaluate(() => document.querySelector('.fm-clear-all')?.click());
await p.waitForTimeout(300);
await shot('03_clearall_armed');
await p.keyboard.press('Escape'); await p.waitForTimeout(2900); // let arm timer die

// export chained
await p.evaluate(() => document.getElementById('btn-tool-more')?.click());
await p.waitForTimeout(400);
await p.evaluate(() => { [...document.querySelectorAll('[data-act="_toolsMore"]')].find(b => b.dataset.more === 'export')?.click(); });
await p.waitForTimeout(500);
await shot('04_export_chained');
await p.keyboard.press('Escape'); await p.waitForTimeout(300);

if (errors.length) console.log('CONSOLE ERRORS:', errors.slice(0, 8));
await ctx.close(); await browser.close(); srv.close();
