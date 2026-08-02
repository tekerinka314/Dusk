// Партия 5 — визуальная проверка: нав-табы, сегменты Гримуара, select-bar Гримуара.
import { chromium } from 'playwright-core';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const URL = 'http://localhost:5173/';
const OUT = 'C:/Users/serge/AppData/Local/Temp/claude/D--VSCode-projects-DUSK-v2-0/7baf2aeb-2680-4ca3-a214-9518230ace6e/scratchpad/';

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const page = await browser.newPage({ viewport: { width: 1200, height: 900 }, deviceScaleFactor: 4 });
const errs = [];
page.on('pageerror', e => errs.push(String(e)));
await page.goto(URL, { waitUntil: 'load' });
await page.waitForFunction(() => typeof globalThis.switchPage === 'function' && typeof globalThis.grimNew === 'function');
await page.waitForTimeout(700);

await page.locator('.nav-tabs, nav').first().screenshot({ path: OUT + 'p5-nav.png' });

await page.evaluate(() => switchPage('notes'));
await page.waitForTimeout(300);
await page.evaluate(() => { grimNew(); });
await page.waitForTimeout(300);
await page.evaluate(() => { const ti = document.getElementById('grim-title-in'); if (ti) { ti.value = 'Проба'; grimTitleInput(ti); } });
await page.evaluate(() => { if (typeof grimBack === 'function') grimBack(); });
await page.waitForTimeout(300);
await page.locator('.grim-bar').first().screenshot({ path: OUT + 'p5-grimbar.png' });

await page.evaluate(() => grimToggleSelectMode());
await page.waitForTimeout(300);
const selVis = await page.evaluate(() => {
  const b = document.getElementById('grim-select-bar');
  const r = document.getElementById('grim-bulk-restore');
  if (r) r.style.display = '';           // показать обе кнопки разом для замера
  return b ? getComputedStyle(b).display : 'нет';
});
await page.locator('#grim-select-bar').screenshot({ path: OUT + 'p5-grimsel.png' });

const wired = await page.evaluate(() => {
  const q = (s) => document.querySelector(s);
  const ok = (s) => { const u = q(s + ' use'); if (!u) return 'нет <use>'; const id = u.getAttribute('href'); const sym = document.querySelector(id); const bb = q(s).getBoundingClientRect(); return `${id} symbol=${!!sym} box=${Math.round(bb.width)}x${Math.round(bb.height)}`; };
  return {
    navArchive: ok('#nav-archive svg'),
    navNotes: ok('#nav-notes svg'),
    segActive: ok('#grim-seg-active svg'),
    segArchive: ok('#grim-seg-archive svg'),
    bulkArch: ok('#grim-bulk-archive svg'),
    bulkRest: ok('#grim-bulk-restore svg'),
    taskRestSel: ok('#btn-restore-selected svg'),
  };
});
console.log('select-bar display:', selVis);
console.log(JSON.stringify(wired, null, 1));
console.log('pageerrors:', errs);
await browser.close();
