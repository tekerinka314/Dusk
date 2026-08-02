// S2 re-probe: archive page, undo toast, snooze popover, select mode, Esc-on-more-menu
import { serve, launch, openApp, ensureShots } from './lib.mjs';
import { richSeed } from './seed.mjs';
import path from 'path';
const DIR = ensureShots('s2');
const DESK = { width: 2560, height: 1440, deviceScaleFactor: 1, isMobile: false, hasTouch: false };
const { srv, port } = await serve();
const browser = await launch();
const log = (...a) => console.log('[fix1]', ...a);
const shot = async (p, n, o = {}) => { await p.screenshot({ path: path.join(DIR, n + '.png'), ...o }); log('shot', n); };
const wait = (p, ms = 500) => p.waitForTimeout(ms);

const { page: p } = await openApp(browser, { device: DESK, seed: richSeed(), port });

// 1) archive via tab (2nd nav tab)
await p.evaluate(() => { const tabs = document.querySelectorAll('[data-act="switchPage"]'); tabs[1] && tabs[1].click(); });
await wait(p, 800);
await shot(p, 'D-archive', { fullPage: true });

// 2) back to tasks, undo toast via deleteTask
await p.evaluate(() => { const tabs = document.querySelectorAll('[data-act="switchPage"]'); tabs[0] && tabs[0].click(); });
await wait(p, 700);
await p.evaluate(() => globalThis.deleteTask && deleteTask(12));
await wait(p, 400);
await shot(p, 'D-toast-undo');
await wait(p, 4500); // let toast die

// 3) snooze popover on task 2 (openSnoozeMenu(id))
await p.evaluate(() => { const btn = document.querySelector("[data-id=\"2\"] [data-act=\"openSnoozeMenu\"]") || document.querySelector("[data-id=\"2\"]"); openSnoozeMenu({ stopPropagation(){}, currentTarget: btn }, 2); });
await wait(p, 500);
await shot(p, 'D-pop-snooze');
await p.keyboard.press('Escape'); await wait(p, 300);

// 4) select mode: what does toggleSelectMode render?
await p.evaluate(() => globalThis.toggleSelectMode && toggleSelectMode());
await wait(p, 600);
const selState = await p.evaluate(() => ({
  bar: !!document.querySelector('#select-bar, .select-bar'),
  barVisible: (() => { const b = document.querySelector('#select-bar, .select-bar'); return b ? getComputedStyle(b).display : null; })(),
  checks: document.querySelectorAll('.task .sel-check, .task .select-check, .task-select-box').length,
  cls: document.body.className,
}));
log('select state:', JSON.stringify(selState));
await shot(p, 'D-select-mode');
// click two tasks' select targets if any
await p.evaluate(() => { document.querySelectorAll('.task').forEach((t, i) => { if (i < 2) t.click(); }); });
await wait(p, 400);
await shot(p, 'D-select-mode-2checked');
await p.evaluate(() => globalThis.toggleSelectMode && toggleSelectMode());
await wait(p, 400);

// 5) more-menu Escape behavior probe
await p.hover('[data-id="1"]'); await wait(p, 300);
const more = await p.$('[data-id="1"] [data-act="openTaskMoreMenu"], [data-id="1"] [data-act*="ore"]');
if (more) {
  await p.evaluate(el => el.click(), more); await wait(p, 400);
  const open1 = await p.evaluate(() => !!document.querySelector('.task-more-menu, .more-menu, [class*="more-pop"]'));
  await p.keyboard.press('Escape'); await wait(p, 400);
  const open2 = await p.evaluate(() => !!document.querySelector('.task-more-menu, .more-menu, [class*="more-pop"]'));
  log('more-menu: openAfterClick=', open1, 'openAfterEscape=', open2);
  // dump actual menu class for reliable selector
  const cls = await p.evaluate(() => { const els = [...document.querySelectorAll('body > div')].slice(-6).map(e => e.className); return els; });
  log('last body divs:', JSON.stringify(cls));
}
await browser.close(); srv.close();
