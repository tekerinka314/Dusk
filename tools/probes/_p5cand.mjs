// Партия 5 — превью кандидатов «квантора» массовых действий.
// Рендерим каждый вариант в 15px (select-bar), 11px (архив-кнопки) и 88px (разбор).
import { chromium } from 'playwright-core';
import fs from 'node:fs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const SP = 'C:/Users/serge/AppData/Local/Temp/claude/D--VSCode-projects-DUSK-v2-0/7baf2aeb-2680-4ca3-a214-9518230ace6e/scratchpad/';
const B = JSON.parse(fs.readFileSync(SP + 'bases.json', 'utf8'));

const inner = (svg) => svg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
const scaled = (svg, s, tx, ty) => `<g transform="translate(${tx} ${ty}) scale(${s})">${inner(svg)}</g>`;

// Кванторы.
const SEAL = (cx, cy, r) => `
 <circle cx="${cx}" cy="${cy}" r="${r}" stroke-width="1.5"/>
 <path d="M${cx - r * 0.52} ${cy} L${cx - r * 0.12} ${cy + r * 0.45} L${cx + r * 0.55} ${cy - r * 0.42}" stroke-width="1.4"/>`;
const RUNE = (cx, cy, r) => `
 <circle cx="${cx}" cy="${cy}" r="${r}" stroke-width="1.45"/>
 <line x1="${cx}" y1="${cy - r * 0.45}" x2="${cx}" y2="${cy + r * 0.45}" stroke-width="0.9" opacity="0.5"/>
 <line x1="${cx}" y1="${cy - r - 1.3}" x2="${cx}" y2="${cy - r - 0.35}" stroke-width="0.9" opacity="0.55"/>
 <line x1="${cx - r - 1.3}" y1="${cy}" x2="${cx - r - 0.35}" y2="${cy}" stroke-width="0.9" opacity="0.55"/>
 <line x1="${cx + r + 0.35}" y1="${cy}" x2="${cx + r + 1.3}" y2="${cy}" stroke-width="0.9" opacity="0.55"/>`;
const SLABS = `
 <line x1="5.6" y1="18.1" x2="18.4" y2="18.1" stroke-width="1.55"/>
 <line x1="7.1" y1="20.6" x2="16.9" y2="20.6" stroke-width="1.4" opacity="0.8"/>
 <line x1="8.7" y1="22.8" x2="15.3" y2="22.8" stroke-width="1.3" opacity="0.58"/>`;
const CHECK = `<path d="M15.4 18.6 L17.6 21 L21.4 15.9" stroke-width="2"/>`;

const S = 0.8, T = -1.1;         // база ужимается и уходит в левый-верхний угол
const up = (svg, s = 0.78, tx = 2.6, ty = -2.2) => scaled(svg, s, tx, ty);

const V = [
  ['A · череп + печать-галка', 1.95, scaled(B.skull, S, T, T) + SEAL(18.3, 18.3, 4)],
  ['B · череп + рунный круг', 1.95, scaled(B.skull, S, T, T) + RUNE(18.1, 18.1, 3.5)],
  ['C · череп + голая галка', 1.95, scaled(B.skull, S, T, T) + CHECK],
  ['D · череп в ободе', 1.7, scaled(B.skull, 0.72, 3.4, 2.6) + `<circle cx="12" cy="12" r="10.6" stroke-width="1.2" opacity="0.75"/>`],
  ['E · череп на плитах (ВСЁ)', 1.95, up(B.skull) + SLABS],
  ['F · урна + печать', 1.95, scaled(B.restore, S, T, T) + SEAL(18.3, 18.3, 4)],
  ['G · урна на плитах (ВСЁ)', 1.95, up(B.restore) + SLABS],
  ['H · фиал + печать', 1.85, scaled(B.vial, S, T, T) + SEAL(18.3, 18.3, 4)],
  ['I · окно + печать', 2.0, scaled(B.window, S, T, T) + SEAL(18.3, 18.3, 4)],
  ['J · перья + печать', 1.6, scaled(B.feathers, S, T, T) + SEAL(18.3, 18.3, 4)],
  ['K · череп (эталон, без квантора)', 1.6, inner(B.skull)],
];

const rows = V.map(([name, sw, body]) => {
  const svg = (px) => `<svg width="${px}" height="${px}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
  return `<tr><td class="n">${name}</td><td>${svg(11)}</td><td>${svg(13)}</td><td>${svg(15)}</td><td>${svg(20)}</td><td>${svg(88)}</td></tr>`;
}).join('');

const page_html = `<!doctype html><meta charset="utf-8"><style>
body{background:#0a0512;color:#c9b6e8;font:13px/1.4 Georgia,serif;padding:18px}
table{border-collapse:collapse}td{padding:8px 14px;vertical-align:middle;text-align:center}
td.n{text-align:left;font-size:12px;color:#9d8bc4;white-space:nowrap}
th{color:#7a6a99;font-weight:normal;font-size:11px}
tr:nth-child(odd){background:#120a20}
</style><table><tr><th></th><th>11px</th><th>13px</th><th>15px</th><th>20px</th><th>88px</th></tr>${rows}</table>`;

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const page = await browser.newPage({ viewport: { width: 900, height: 1100 }, deviceScaleFactor: 4 });
await page.setContent(page_html);
await page.waitForTimeout(200);
await page.locator('table').screenshot({ path: SP + 'p5-cand.png' });
await browser.close();
console.log('готово → p5-cand.png');
