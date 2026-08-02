// Проба пиксельной сетки нав-табов: растеризуем каждый глиф ровно в 13×13
// и печатаем покрытие альфой как ASCII. Ровные штрихи = сплошные '#'-ряды.
import { chromium } from 'playwright-core';
import fs from 'fs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

const html = fs.readFileSync('D:/VSCode projects/DUSK_v2.0/index.html', 'utf8');
const grab = (mark) => {
  const a = html.indexOf(mark);
  const s = html.indexOf('<svg', a);
  const e = html.indexOf('</svg>', s) + 6;
  return html.slice(s, e).replace(/\s+/g, ' ');
};
const NEW = {
  main: grab('(Tasks tab)'),
  archive: grab('(Archive tab)'),
  notes: grab('(Grimoire tab)'),
};
const OLD = JSON.parse(fs.readFileSync('D:/tmp/pw/_navpx-old.json', 'utf8'));

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const page = await browser.newPage({ viewport: { width: 400, height: 300 } });
await page.goto('about:blank');

const out = await page.evaluate(async (sets) => {
  const ramp = ' .:-=+*#%@';
  const render = async (svg) => {
    const sized = svg.replace('<svg ', '<svg width="13" height="13" xmlns="http://www.w3.org/2000/svg" ');
    const url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(sized);
    const img = new Image();
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; });
    const c = document.createElement('canvas');
    c.width = 13; c.height = 13;
    const ctx = c.getContext('2d');
    ctx.drawImage(img, 0, 0, 13, 13);
    const d = ctx.getImageData(0, 0, 13, 13).data;
    const rows = [];
    for (let y = 0; y < 13; y++) {
      let r = '';
      for (let x = 0; x < 13; x++) {
        const a = d[(y * 13 + x) * 4 + 3] / 255;
        r += ramp[Math.min(9, Math.round(a * 9))];
      }
      rows.push(r);
    }
    return rows;
  };
  const res = {};
  for (const [k, v] of Object.entries(sets)) res[k] = await render(v);
  return res;
}, { ...Object.fromEntries(Object.entries(OLD).map(([k, v]) => ['OLD_' + k, v])),
     ...Object.fromEntries(Object.entries(NEW).map(([k, v]) => ['NEW_' + k, v])) });

for (const k of Object.keys(out)) {
  console.log('=== ' + k + ' ===');
  console.log(out[k].map(r => '|' + r + '|').join('\n'));
}
await browser.close();
