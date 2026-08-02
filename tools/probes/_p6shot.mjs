// Партия 6 — проверка: поиск в трёх местах + триггер дедлайна в форме.
import { chromium } from 'playwright-core';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const OUT = 'C:/Users/serge/AppData/Local/Temp/claude/D--VSCode-projects-DUSK-v2-0/7baf2aeb-2680-4ca3-a214-9518230ace6e/scratchpad/';
const b = await chromium.launch({ executablePath: CHROME, headless: true });
const p = await b.newPage({ viewport: { width: 1280, height: 950 }, deviceScaleFactor: 4 });
const errs = []; p.on('pageerror', e => errs.push(String(e)));
await p.goto('http://localhost:5173/', { waitUntil: 'load' });
await p.waitForFunction(() => typeof globalThis.switchPage === 'function');
await p.waitForTimeout(700);
await p.evaluate(() => { document.getElementById('extra-fields').classList.add('open'); });
await p.waitForTimeout(500);
await p.locator('.field-deadline').first().screenshot({ path: OUT + 'p6-form.png' });
await p.locator('.search-wrap').first().screenshot({ path: OUT + 'p6-search-toolbar.png' });
const w = await p.evaluate(() => {
  const q = (s) => { const el = document.querySelector(s); if (!el) return 'нет'; const u = el.querySelector('use'); const bb = el.getBoundingClientRect(); return `${u ? u.getAttribute('href') : 'inline'} ${Math.round(bb.width)}x${Math.round(bb.height)}`; };
  return { toolbar: q('.search-wrap svg'), archive: q('.archive-search-wrap svg'), grim: q('.grim-search-wrap svg'), dl: q('#deadline-trigger svg') };
});
console.log(JSON.stringify(w), 'errs:', errs);
await b.close();
