// Ф-B2 preview smoke: console/pageerror clean, clones filled, all SVGs render,
// click-swap works incl. набор-подслоты M/N + localStorage restore.
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright-core');
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const b = await chromium.launch({ executablePath: CHROME });
const p = await b.newPage();
const errs = [];
p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
p.on('pageerror', e => errs.push(String(e)));
await p.goto('file:///D:/VSCode%20projects/DUSK_v2.0/audit-v2/previews/fb2-icons-preview.html');
await p.waitForTimeout(800);
const stats = await p.evaluate(() => {
  const svgs = [...document.querySelectorAll('svg')];
  const zero = svgs.filter(s => { const r = s.getBoundingClientRect(); return r.width < 2 || r.height < 2; }).length;
  const emptyClones = [...document.querySelectorAll('.sz-clone')].filter(c => !c.querySelector('svg')).length;
  document.querySelector('.cand[data-pick="I1"]').click();
  document.querySelector('.cand[data-pick="M1"]').click();
  document.querySelector('.cand[data-pick="N1"]').click();
  const slotI = document.querySelectorAll('[data-slot="I"]');
  const iSwapped = [...slotI].every(s => s.querySelector('svg') && s.innerHTML.includes('14.6'));
  const mAlpha = document.querySelector('[data-slot="M-alpha"] svg');
  const nDate = document.querySelector('[data-slot="N-date"] svg');
  const picks = document.getElementById('picks').textContent;
  return {
    svgCount: svgs.length, zero, emptyClones,
    iSlots: slotI.length, iSwapped,
    mSub: !!mAlpha && mAlpha.outerHTML.includes('19.3'),
    nSub: !!nDate && nDate.outerHTML.includes('7.9'),
    picks,
  };
});
// reload → localStorage restore
await p.reload();
await p.waitForTimeout(600);
const restored = await p.evaluate(() => document.getElementById('picks').textContent);
console.log('STATS', JSON.stringify(stats));
console.log('RESTORED', restored);
console.log('ERRORS', errs.length ? JSON.stringify(errs.slice(0, 5)) : 'none');
await b.close();
