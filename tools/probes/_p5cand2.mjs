// Партия 5, заход 2: кванторы, которые могут пережить 15px — удвоение, плиты, кольцо-подставка.
import { chromium } from 'playwright-core';
import fs from 'node:fs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const SP = 'C:/Users/serge/AppData/Local/Temp/claude/D--VSCode-projects-DUSK-v2-0/7baf2aeb-2680-4ca3-a214-9518230ace6e/scratchpad/';
const B = JSON.parse(fs.readFileSync(SP + 'bases.json', 'utf8'));
const inner = (s) => s.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
const g = (s, sc, tx, ty, extra = '') => `<g transform="translate(${tx} ${ty}) scale(${sc})" ${extra}>${inner(s)}</g>`;

const SLABS3 = `
 <line x1="5.6" y1="18.2" x2="18.4" y2="18.2" stroke-width="1.6"/>
 <line x1="7.2" y1="20.6" x2="16.8" y2="20.6" stroke-width="1.45" opacity="0.8"/>
 <line x1="8.8" y1="22.7" x2="15.2" y2="22.7" stroke-width="1.3" opacity="0.58"/>`;
const SLAB1 = `<line x1="5.6" y1="21.4" x2="18.4" y2="21.4" stroke-width="1.7"/>`;
const RING = `<ellipse cx="12" cy="20.4" rx="6.6" ry="2.4" stroke-width="1.45"/>`;
// удвоение: тень-копия со сдвигом вправо-вниз, приглушённая
const twin = (s, sc = 0.72) => g(s, sc, 6.2, 4.6, 'opacity="0.55"') + g(s, sc, 0.4, 0.2);
const up = (s, sc = 0.78, tx = 2.6, ty = -2.4) => g(s, sc, tx, ty);

const V = [
  ['1 · череп ×2 (отмеченные)', 2.1, twin(B.skull)],
  ['2 · череп + 1 плита', 1.95, up(B.skull, 0.8, 2.4, -2.0) + SLAB1],
  ['3 · череп + 3 плиты (ВСЁ)', 1.95, up(B.skull) + SLABS3],
  ['4 · череп + кольцо-подставка', 1.95, up(B.skull, 0.78, 2.6, -3.0) + RING],
  ['5 · урна + 3 плиты (ВСЁ)', 1.95, up(B.restore) + SLABS3],
  ['6 · урна ×2', 2.1, twin(B.restore)],
  ['7 · фиал + 3 плиты', 1.9, up(B.vial) + SLABS3],
  ['8 · фиал ×2', 2.05, twin(B.vial)],
  ['9 · окно + 3 плиты', 2.05, up(B.window) + SLABS3],
  ['10 · перья + 3 плиты', 1.7, up(B.feathers) + SLABS3],
  ['11 · череп (эталон)', 1.6, inner(B.skull)],
  ['12 · урна (эталон)', 1.5, inner(B.restore)],
];

const rows = V.map(([name, sw, body]) => {
  const svg = (px) => `<svg width="${px}" height="${px}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
  return `<tr><td class="n">${name}</td><td>${svg(11)}</td><td>${svg(13)}</td><td>${svg(15)}</td><td>${svg(20)}</td><td>${svg(80)}</td></tr>`;
}).join('');
const html = `<!doctype html><meta charset="utf-8"><style>
body{background:#0a0512;color:#c9b6e8;font:13px/1.4 Georgia,serif;padding:16px}
table{border-collapse:collapse}td{padding:7px 14px;text-align:center;vertical-align:middle}
td.n{text-align:left;font-size:12px;color:#9d8bc4;white-space:nowrap}
th{color:#7a6a99;font-weight:normal;font-size:11px}tr:nth-child(odd){background:#120a20}
</style><table><tr><th></th><th>11px</th><th>13px</th><th>15px</th><th>20px</th><th>80px</th></tr>${rows}</table>`;

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const page = await browser.newPage({ viewport: { width: 900, height: 1200 }, deviceScaleFactor: 4 });
await page.setContent(html);
await page.waitForTimeout(200);
await page.locator('table').screenshot({ path: SP + 'p5-cand2.png' });
await browser.close();
console.log('готово → p5-cand2.png');
