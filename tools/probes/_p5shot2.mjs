// Партия 5 — контрольные снимки в живом приложении: архив (11px кнопки), склеп Гримуара, ⋯-шит.
import { chromium } from 'playwright-core';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const URL = 'http://localhost:5173/';
const OUT = 'C:/Users/serge/AppData/Local/Temp/claude/D--VSCode-projects-DUSK-v2-0/7baf2aeb-2680-4ca3-a214-9518230ace6e/scratchpad/';

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 4 });
const errs = [];
page.on('pageerror', e => errs.push(String(e)));
await page.goto(URL, { waitUntil: 'load' });
await page.waitForFunction(() => typeof globalThis.switchPage === 'function' && typeof globalThis.addTask === 'function');
await page.waitForTimeout(700);

// две задачи → в архив
await page.evaluate(() => {
  const inp = document.getElementById('input-box');
  for (const t of ['Первая проба', 'Вторая проба']) { inp.value = t; addTask(); }
});
await page.waitForTimeout(400);
await page.evaluate(() => { (state.tasks || []).slice().forEach(t => removeTask(t.id)); });
await page.waitForTimeout(700);
await page.evaluate(() => switchPage('archive'));
await page.waitForTimeout(400);
await page.locator('.archive-header').screenshot({ path: OUT + 'p5-archhdr.png' });

// режим отметки в архиве
await page.evaluate(() => toggleSelectMode());
await page.waitForTimeout(300);
await page.locator('#archive-select-bar').screenshot({ path: OUT + 'p5-archsel.png' });
await page.evaluate(() => toggleSelectMode());

// ⋯-шит инструментов
await page.evaluate(() => switchPage('main'));
await page.waitForTimeout(300);
await page.locator('.toolbar').first().screenshot({ path: OUT + 'p5-toolbar.png' });

// Гримуар: склеп с записью
await page.evaluate(() => { switchPage('notes'); });
await page.waitForTimeout(300);
await page.evaluate(() => { grimNew(); });
await page.waitForTimeout(300);
await page.evaluate(() => { const ti = document.getElementById('grim-title-in'); if (ti) { ti.value = 'Проба'; grimTitleInput(ti); } if (typeof grimBack === 'function') grimBack(); });
await page.waitForTimeout(400);
await page.evaluate(() => { const n = (state.notes || [])[0]; if (n) grimArchive(n.id); });
await page.waitForTimeout(500);
await page.evaluate(() => grimSetMode('archive'));
await page.waitForTimeout(400);
await page.locator('.grim-bar').first().screenshot({ path: OUT + 'p5-grimcrypt.png' });

console.log('pageerrors:', errs);
await browser.close();
