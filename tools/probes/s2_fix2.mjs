// S2 re-probe 2: main select bar, snooze via real click, undo toast, grim tpl/io pops, scroll-detach live check
import { serve, launch, openApp, ensureShots } from './lib.mjs';
import { richSeed } from './seed.mjs';
import path from 'path';
const DIR = ensureShots('s2');
const DESK = { width: 2560, height: 1440, deviceScaleFactor: 1, isMobile: false, hasTouch: false };
const { srv, port } = await serve();
const browser = await launch();
const log = (...a) => console.log('[fix2]', ...a);
const shot = async (p, n, o = {}) => { await p.screenshot({ path: path.join(DIR, n + '.png'), ...o }); log('shot', n); };
const wait = (p, ms = 500) => p.waitForTimeout(ms);

const { page: p } = await openApp(browser, { device: DESK, seed: richSeed(), port });

// 1) main select mode
await p.evaluate(() => { const b = document.getElementById('btn-main-select'); b && b.click(); });
await wait(p, 600);
await shot(p, 'D-select-main');
await p.evaluate(() => { const t = document.querySelector('[data-id="12"]'); t && t.click(); });
await wait(p, 400);
await shot(p, 'D-select-main-1checked');
await p.evaluate(() => { const b = document.getElementById('btn-main-select'); b && b.click(); });
await wait(p, 400);

// 2) snooze via real hover + click on the snooze button of overdue task 2
await p.hover('[data-id="2"]'); await wait(p, 400);
const snz = await p.$('[data-id="2"] [data-act="openSnoozeMenu"]');
if (snz) { await snz.click({ force: true }); await wait(p, 500); await shot(p, 'D-pop-snooze'); }
else log('snooze btn not found on task 2');
// 2b) scroll-detach live check while a float menu is open
const before = await p.evaluate(() => { const m = document.querySelector('.snooze-menu'); return m ? m.getBoundingClientRect().top : null; });
await p.mouse.wheel(0, 300); await wait(p, 400);
const after = await p.evaluate(() => { const m = document.querySelector('.snooze-menu'); if (!m) return null; const r = m.getBoundingClientRect(); return { top: r.top, stillOpen: true }; });
log('float-menu scroll-detach: topBefore=', before, 'after=', JSON.stringify(after));
if (after && after.stillOpen) await shot(p, 'D-pop-snooze-detached');
await p.keyboard.press('Escape'); await wait(p, 200);
const escStill = await p.evaluate(() => !!document.querySelector('.snooze-menu'));
log('float-menu open after Escape:', escStill);
await p.mouse.click(400, 700); await wait(p, 300);

// 3) undo toast: archive task 12 via its archive action (hover reveal)
await p.mouse.wheel(0, -600); await wait(p, 300);
await p.hover('[data-id="12"]'); await wait(p, 300);
const arch = await p.$('[data-id="12"] [data-act="archiveTask"]');
if (arch) { await arch.click({ force: true }); await wait(p, 500); await shot(p, 'D-toast-undo'); }
else {
  const acts = await p.evaluate(() => [...document.querySelectorAll('[data-id="12"] [data-act]')].map(e => e.getAttribute('data-act')));
  log('task12 acts:', JSON.stringify(acts));
}

// 4) grim tpl + io pops (in ЗАПИСИ segment)
await p.evaluate(() => { const tabs = document.querySelectorAll('[data-act="switchPage"]'); tabs[2] && tabs[2].click(); });
await wait(p, 800);
for (const [id, name] of [['grim-tpl-trigger', 'D-grim-tpl-pop'], ['grim-io', 'D-grim-io-pop']]) {
  const ok = await p.evaluate((i) => { const b = document.getElementById(i); if (!b) return false; b.click(); return true; }, id);
  await wait(p, 500);
  if (ok) await shot(p, name);
  await p.mouse.click(400, 700); await wait(p, 300);
}
await browser.close(); srv.close();
