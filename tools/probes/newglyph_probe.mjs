// Новые глифы в РЕАЛЬНОМ кегле + увеличение: переживают ли они 13/14px.
import { chromium } from 'playwright-core';
import fs from 'node:fs';

const IDX = fs.readFileSync('D:/VSCode projects/DUSK_v2.0/index.html', 'utf8');
const dStart = IDX.indexOf('<svg width="0"');
const defs = IDX.slice(dStart, IDX.indexOf('</svg>', IDX.lastIndexOf('</symbol>')) + 6);

const CASES = [
  ['icon-cross-pattee', 13, '0 0 13 13', 'fill="currentColor" stroke="none"'],
  ['icon-mark-chosen', 14, '0 0 24 24', 'fill="none" stroke="currentColor" stroke-linecap="butt" stroke-linejoin="miter"'],
  ['icon-cross-add', 18, '0 0 24 24', 'fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"'],
];

const cells = CASES.map(([id, px, vb, attrs]) => `
  <div class="c"><div class="lbl">${id} · ${px}px</div>
    <div class="row">
      <svg viewBox="${vb}" ${attrs} width="${px}" height="${px}"><use href="#${id}"/></svg>
      <svg viewBox="${vb}" ${attrs} width="${px * 8}" height="${px * 8}" style="image-rendering:pixelated"><use href="#${id}"/></svg>
    </div></div>`).join('');

const html = `<meta charset="utf-8"><style>
 body{background:#150a24;color:#cbb0f5;font:12px system-ui;margin:0;padding:16px}
 .c{margin-bottom:14px} .lbl{color:#8f7bb0;font-size:11px;margin-bottom:4px}
 .row{display:flex;align-items:flex-end;gap:20px;background:#1d0e33;padding:10px;border-radius:6px}
</style>${defs}${cells}`;
fs.writeFileSync('D:/tmp/pw/b1/_newglyph.html', html);

const browser = await chromium.launch({ executablePath: process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
const page = await browser.newPage({ viewport: { width: 700, height: 620 }, deviceScaleFactor: 2 });
await page.goto('file:///D:/tmp/pw/b1/_newglyph.html');
await page.waitForTimeout(300);
await page.screenshot({ path: 'D:/VSCode projects/DUSK_v2.0/audit-v2/shots/icon-sheet/newglyphs.png' });
console.log('ок');
await browser.close();
