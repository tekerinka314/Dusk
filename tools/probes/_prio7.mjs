// Партия 7 · дым-проба маркеров приоритета: маска действительно рисует башню,
// а не прячет элемент целиком. Считаем непрозрачные пиксели в боксе метки.
import { chromium } from 'playwright-core';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const URL = process.argv[2] || 'http://localhost:5174/';

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errs = [];
page.on('pageerror', e => errs.push(String(e)));
await page.goto(URL, { waitUntil: 'load' });
await page.waitForFunction(() => typeof globalThis.switchPage === 'function');
await page.waitForTimeout(700);

// раскрываем «Параметры» формы, где живёт сетка приоритета
await page.evaluate(() => {
  const t = document.querySelector('[data-act="toggleExtraFields"], #toggle-extra, .btn-extra-toggle');
  if (t) t.click();
});
await page.waitForTimeout(500);

const info = await page.evaluate(() => {
  const out = [];
  document.querySelectorAll('.prio-dot, .fm-prio-dot, .sub-prio-dot').forEach(el => {
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    out.push({
      cls: el.className,
      w: +r.width.toFixed(1), h: +r.height.toFixed(1),
      bg: cs.backgroundColor,
      mask: (cs.maskImage || cs.webkitMaskImage || 'none').slice(0, 46),
      vis: r.width > 0 && r.height > 0,
    });
  });
  return out;
});
console.log('меток найдено:', info.length);
for (const i of info) console.log(JSON.stringify(i));

const grid = await page.$('.prio-grid');
if (grid) await grid.screenshot({ path: 'D:/tmp/pw/_prio7_grid.png' });
const sel = await page.$('#select-bar, .select-bar');
if (sel) await sel.screenshot({ path: 'D:/tmp/pw/_prio7_sel.png' }).catch(() => {});
console.log('pageerrors:', errs.length ? errs : 'нет');
await browser.close();
