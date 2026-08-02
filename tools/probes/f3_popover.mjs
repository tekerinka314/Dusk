// B4-02 engine probe — desktop 1920: scroll-follow, out-of-view close, Esc,
// cross-family single-open, arrow-key nav.
import { serve, launch, openApp, ensureShots } from './lib.mjs';
import { richSeed } from './seed.mjs';
import path from 'path';

const { srv, port } = await serve();
const browser = await launch();
const dir = ensureShots('f3');
const dev = { width: 1920, height: 1000, deviceScaleFactor: 1, isMobile: false, hasTouch: false };
const { ctx, page: p, errors } = await openApp(browser, { device: dev, page: 'main', seed: richSeed(), port });
await p.waitForTimeout(1500);
const shot = n => p.screenshot({ path: path.join(dir, `pop_${n}.png`) });
let pass = 0, fail = 0;
const check = (name, ok) => { console.log(ok ? 'PASS' : 'FAIL', name); ok ? pass++ : fail++; };

// 1) snooze float menu: open on a deadline task via task-more? Use direct: openSnoozeMenu needs event; use _openSnoozeMenuAt(anchor, id)
const opened = await p.evaluate(() => {
  const t = state.tasks.find(x => x.deadline && !x.checked);
  const li = document.querySelector(`.task-item[data-id="${t.id}"]`);
  const anchor = li.querySelector('button') || li;
  _openSnoozeMenuAt(anchor, t.id);
  const m = document.querySelector('.snooze-menu');
  return m ? { top: m.getBoundingClientRect().top } : null;
});
check('snooze opens', !!opened);
await p.mouse.wheel(0, 300);
await p.waitForTimeout(400);
// follow = after scroll the menu is still glued to its anchor (below or above
// with the 5px seam) — raw -300 is wrong when the reposition legitimately flips
const after = await p.evaluate(() => {
  const m = document.querySelector('.snooze-menu');
  const a = globalThis._apReg && globalThis._apReg.anchor;
  if (!m || !a) return null;
  const mr = m.getBoundingClientRect(), ar = a.getBoundingClientRect();
  return { glued: Math.abs(mr.top - (ar.bottom + 5)) < 3 || Math.abs(mr.bottom - (ar.top - 5)) < 3 };
});
check('snooze follows scroll (stays glued to anchor)', !!after && after.glued);
await shot('follow');

// 2) scroll far — anchor leaves viewport → menu closes
await p.mouse.wheel(0, 2500);
await p.waitForTimeout(500);
const gone = await p.evaluate(() => !document.querySelector('.snooze-menu'));
check('menu closes when anchor leaves viewport', gone);
await p.evaluate(() => scrollTo(0, 0));
await p.waitForTimeout(300);

// 3) sort portal: open, wheel, follows; then Esc closes
const sp = await p.evaluate(() => {
  document.querySelector('#btn-sort-mode')?.click();
  const l = document.querySelector('.task-sort-portal');
  return l ? l.getBoundingClientRect().top : null;
});
check('sort portal opens', sp !== null);
await p.mouse.wheel(0, 200);
await p.waitForTimeout(400);
const sp2 = await p.evaluate(() => {
  const l = document.querySelector('.task-sort-portal');
  return l ? l.getBoundingClientRect().top : null;
});
check('sort portal follows scroll', sp2 !== null && Math.abs((sp - 200) - sp2) < 40);
await p.keyboard.press('Escape');
await p.waitForTimeout(300);
const spClosed = await p.evaluate(() => !document.querySelector('.task-sort-portal'));
check('Esc closes sort portal', spClosed);
await p.evaluate(() => scrollTo(0, 0));

// 4) cross-family single-open: open snooze, then sort → snooze must close
await p.evaluate(() => {
  const t = state.tasks.find(x => x.deadline && !x.checked);
  const li = document.querySelector(`.task-item[data-id="${t.id}"]`);
  _openSnoozeMenuAt(li.querySelector('button') || li, t.id);
});
await p.waitForTimeout(200);
await p.evaluate(() => document.querySelector('#btn-sort-mode')?.click());
await p.waitForTimeout(400);
const single = await p.evaluate(() => ({
  snooze: !!document.querySelector('.snooze-menu:not(.float-menu-closing)'),
  sort: !!document.querySelector('.task-sort-portal'),
}));
check('cross-family single-open (snooze closed, sort open)', !single.snooze && single.sort);
await p.keyboard.press('Escape');

// 5) arrow-key nav in a role=menu float menu (task-more or snooze)
await p.evaluate(() => {
  const t = state.tasks.find(x => x.deadline && !x.checked);
  const li = document.querySelector(`.task-item[data-id="${t.id}"]`);
  _openSnoozeMenuAt(li.querySelector('button') || li, t.id);
});
await p.waitForTimeout(250);
await p.keyboard.press('ArrowDown');
const focus1 = await p.evaluate(() => document.activeElement?.getAttribute('role'));
await p.keyboard.press('ArrowDown');
const focus2 = await p.evaluate(() => document.activeElement?.textContent?.trim().slice(0, 12));
check('arrow-key nav focuses menu items', focus1 === 'menuitem' && !!focus2);
await p.keyboard.press('Escape');

console.log(`RESULT ${pass} pass / ${fail} fail`);
if (errors.length) console.log('CONSOLE ERRORS:', errors.slice(0, 8)); else console.log('no console errors');
await ctx.close(); await browser.close(); srv.close();
