// Ф-B1 preview smoke: console/pageerror clean, all SVGs render, click-swap works.
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright-core');
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const b = await chromium.launch({ executablePath: CHROME });
const p = await b.newPage();
const errs = [];
p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
p.on('pageerror', e => errs.push(String(e)));
await p.goto('file:///D:/VSCode%20projects/DUSK_v2.0/audit-v2/previews/fb1-icons-preview.html');
await p.waitForTimeout(800);
const stats = await p.evaluate(() => {
  const svgs = [...document.querySelectorAll('svg')];
  const zero = svgs.filter(s => { const r = s.getBoundingClientRect(); return r.width < 2 || r.height < 2; }).length;
  document.querySelector('.cand[data-pick="A1"]').click();
  document.querySelector('.cand[data-pick="D1"]').click();
  const slotA = document.querySelector('[data-slot="A"] svg');
  const picks = document.getElementById('picks').textContent;
  return { svgCount: svgs.length, zero, swapWorks: !!slotA && slotA.outerHTML.includes('9.6'), picks };
});
console.log('STATS', JSON.stringify(stats));
console.log('ERRORS', errs.length ? JSON.stringify(errs.slice(0, 5)) : 'none');
await b.close();
