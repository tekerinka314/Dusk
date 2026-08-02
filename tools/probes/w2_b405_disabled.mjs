// W2-3 / V2-B4-05 — verdict probe: does a dead sync-panel row actually READ dead?
// Cascade trap (twice already this program): a rule can be correct and still be
// overridden by a later declaration. Measure computed pixels, not the source.
import { serve, launch, openApp } from './lib.mjs';
import { richSeed } from './seed.mjs';

const DESKTOP = { width: 1280, height: 860, deviceScaleFactor: 1, isMobile: false, hasTouch: false,
                  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36' };

const { srv, port } = await serve();
const browser = await launch();
const { page, errors } = await openApp(browser, { device: DESKTOP, page: 'main', seed: richSeed(), port });

// open the sync panel (signed out => «Синхронизировать сейчас» is dead)
await page.click('.sync-glyph');
await page.waitForSelector('.snooze-menu.sync-panel', { timeout: 3000 });
await page.waitForTimeout(300);

const read = async sel => page.$eval(sel, el => {
    const cs = getComputedStyle(el);
    return { opacity: cs.opacity, color: cs.color, cursor: cs.cursor, bg: cs.backgroundColor,
             disabled: el.disabled === true, aria: el.getAttribute('aria-disabled') };
});

const dead = await read('.sync-panel button[data-act="syncNowManual"]');
const live = await read('.sync-panel button[data-act="syncSignIn"]');

// hover the dead row — the hover skin must NOT paint it back to life
await page.hover('.sync-panel button[data-act="syncNowManual"]');
await page.waitForTimeout(200);
const deadHover = await read('.sync-panel button[data-act="syncNowManual"]');

// keyboard: ArrowDown must never park on the dead row
await page.keyboard.press('ArrowDown');
await page.keyboard.press('ArrowDown');
await page.keyboard.press('ArrowDown');
const focused = await page.evaluate(() => {
    const a = document.activeElement;
    return { act: a && a.getAttribute && a.getAttribute('data-act'), tag: a && a.tagName };
});

const fail = [];
if (!dead.disabled) fail.push('dead row has no native disabled attr');
if (dead.aria !== 'true') fail.push('dead row missing aria-disabled=true');
if (Number(dead.opacity) >= 0.9) fail.push(`dead row not dimmed (opacity ${dead.opacity})`);
if (dead.cursor !== 'not-allowed') fail.push(`dead row cursor is ${dead.cursor}`);
if (dead.color === live.color) fail.push('dead row colour identical to live row');
if (Number(live.opacity) < 0.9) fail.push(`LIVE row got dimmed too (opacity ${live.opacity})`);
if (deadHover.bg !== dead.bg) fail.push(`hover repainted the dead row: ${dead.bg} -> ${deadHover.bg}`);
if (focused.act === 'syncNowManual') fail.push('arrow-key nav parked focus on the dead row');

console.log('dead      :', JSON.stringify(dead));
console.log('dead+hover:', JSON.stringify(deadHover));
console.log('live      :', JSON.stringify(live));
console.log('focus after 3x ArrowDown:', JSON.stringify(focused));
console.log('console errors:', errors.length ? errors : 'none');
console.log(fail.length ? 'FAIL\n - ' + fail.join('\n - ') : 'PASS — dead row reads dead, live row untouched');

await browser.close(); srv.close();
