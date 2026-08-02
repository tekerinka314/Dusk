// Сверка трёх копий скраинг-шара: какая версия идёт в общий symbol.
import { chromium } from 'playwright-core';
import fs from 'node:fs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const SP = 'C:/Users/serge/AppData/Local/Temp/claude/D--VSCode-projects-DUSK-v2-0/7baf2aeb-2680-4ca3-a214-9518230ace6e/scratchpad/';
const s = fs.readFileSync('D:/VSCode projects/DUSK_v2.0/index.html', 'utf8');
const grabAt = (i) => { const st = s.indexOf('<svg', i); const en = s.indexOf('</svg>', st) + 6; return s.slice(st, en).replace(/\s+/g, ' '); };
const T = grabAt(s.indexOf('S2 · Скраинг-шар'));
const A = grabAt(s.indexOf('archive-search-wrap'));
const G = grabAt(s.indexOf('grim-search-wrap'));
const rows = [['тулбар (короткая)', T], ['архив', A], ['гримуар', G]].map(([n, svg]) => {
  const at = (px) => svg.replace('<svg ', `<svg width="${px}" height="${px}" `);
  return `<tr><td class="n">${n}</td><td>${at(13)}</td><td>${at(14)}</td><td>${at(15)}</td><td>${at(72)}</td></tr>`;
}).join('');
const html = `<!doctype html><meta charset="utf-8"><style>body{background:#0a0512;color:#c9b6e8;font:13px Georgia,serif;padding:16px}
td{padding:8px 16px;text-align:center}td.n{text-align:left;color:#9d8bc4}tr:nth-child(odd){background:#120a20}</style>
<table><tr><th></th><th>13</th><th>14</th><th>15</th><th>72</th></tr>${rows}</table>`;
const b = await chromium.launch({ executablePath: CHROME, headless: true });
const p = await b.newPage({ viewport: { width: 700, height: 400 }, deviceScaleFactor: 5 });
await p.setContent(html); await p.waitForTimeout(150);
await p.locator('table').screenshot({ path: SP + 'p6-search.png' });
await b.close(); console.log('ok');
