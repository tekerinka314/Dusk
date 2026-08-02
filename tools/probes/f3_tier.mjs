// F3 B4-01 large-screen tier verification — desktop widths sweep.
// Shots → audit-v2/shots/f3/<width>_<name>.png
import { serve, launch, openApp, ensureShots } from './lib.mjs';
import { richSeed } from './seed.mjs';
import path from 'path';

const { srv, port } = await serve();
const browser = await launch();
const dir = ensureShots('f3');

const WIDTHS = [1366, 1440, 1920, 2560];

for (const w of WIDTHS) {
  const dev = { width: w, height: Math.min(1400, Math.round(w * 0.62)), deviceScaleFactor: 1, isMobile: false, hasTouch: false };
  const { ctx, page: p, errors } = await openApp(browser, { device: dev, page: 'main', seed: richSeed(), port });
  await p.waitForTimeout(1600);
  const shot = async name => { await p.screenshot({ path: path.join(dir, `${w}_${name}.png`) }); console.log(w, name); };
  const step = async (name, fn) => { try { await fn(); await p.waitForTimeout(600); await shot(name); } catch (e) { console.log('FAIL', w, name, e.message.slice(0, 120)); } };

  await shot('main');
  if (w >= 1440) {
    await step('schedule', () => p.evaluate(() => document.querySelector('#btn-schedule')?.click()));
    await step('schedule_off', () => p.evaluate(() => document.querySelector('#btn-schedule')?.click()));
    await step('bulk', async () => {
      await p.evaluate(() => document.querySelector('#btn-main-select')?.click());
      await p.waitForTimeout(400);
      await p.evaluate(() => { [...document.querySelectorAll('.task-item')].slice(0, 2).forEach(li => li.querySelector('.task-check')?.click()); });
    });
    await step('bulk_off', () => p.evaluate(() => document.querySelector('#btn-main-select')?.click()));
    await step('split', () => p.evaluate(() => document.querySelector('#btn-split-groups')?.click()));
    await step('split_off', () => p.evaluate(() => document.querySelector('#btn-split-groups')?.click()));
    // scroll deep — rail must stick
    await step('scrolled', () => p.evaluate(() => scrollTo(0, 900)));
    await p.evaluate(() => scrollTo(0, 0));
    // rail interactions: pill = focus toggle; digest row = scroll+pulse
    await step('pill_focus_on', () => p.evaluate(() => document.querySelector('.groups-list .group-pill')?.click()));
    await step('pill_focus_off', () => p.evaluate(() => document.querySelector('.groups-list .group-pill')?.click()));
    await step('digest_go', () => p.evaluate(() => document.querySelector('.rd-row:last-child')?.click()));
    await p.evaluate(() => scrollTo(0, 0));
    // other pages: grim inherits the wide shell, archive stays narrow till 1600
    await step('archive', () => p.evaluate(() => document.querySelector('#nav-archive')?.click()));
    await step('grim', () => p.evaluate(() => document.querySelector('#nav-notes')?.click()));
    await step('grim_detail', () => p.evaluate(() => document.querySelector('.grim-leaf')?.click()));
    await step('back_main', () => p.evaluate(() => document.querySelector('#nav-main')?.click()));
    await step('empty', () => p.evaluate(() => { state.tasks = []; state.groups = []; render(); }));
  }
  if (errors.length) console.log('ERRORS', w, errors.slice(0, 6)); else console.log('no console errors', w);
  await ctx.close();
}
await browser.close(); srv.close();
