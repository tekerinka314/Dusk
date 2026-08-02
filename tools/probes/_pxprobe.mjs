// Универсальная растровая проба: рендерит переданные глифы в заданные размеры
// и печатает альфу ASCII. Аргументы: --in <json> --keys a,b --sizes 7,9,11,13,15
import { chromium } from 'playwright-core';
import fs from 'fs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

const arg = (n, d) => { const i = process.argv.indexOf(n); return i < 0 ? d : process.argv[i + 1]; };
const src = JSON.parse(fs.readFileSync(arg('--in'), 'utf8'));
const keys = (arg('--keys') || Object.keys(src).join(',')).split(',');
const sizes = (arg('--sizes') || '7,9,11,13,15').split(',').map(Number);

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const page = await browser.newPage({ viewport: { width: 400, height: 300 } });
await page.goto('about:blank');

const out = await page.evaluate(async ({ jobs }) => {
  const ramp = ' .:-=+*#%@';
  const render = async (svg, n) => {
    const sized = svg.replace('<svg ', `<svg width="${n}" height="${n}" xmlns="http://www.w3.org/2000/svg" `);
    const url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(sized);
    const img = new Image();
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; });
    const c = document.createElement('canvas');
    c.width = n; c.height = n;
    const ctx = c.getContext('2d');
    ctx.drawImage(img, 0, 0, n, n);
    const d = ctx.getImageData(0, 0, n, n).data;
    const rows = [];
    for (let y = 0; y < n; y++) {
      let r = '';
      for (let x = 0; x < n; x++) r += ramp[Math.min(9, Math.round(d[(y * n + x) * 4 + 3] / 255 * 9))];
      rows.push(r);
    }
    return rows;
  };
  const res = [];
  for (const j of jobs) res.push({ ...j, rows: await render(j.svg, j.n) });
  return res;
}, { jobs: keys.flatMap(k => sizes.map(n => ({ k, n, svg: src[k] }))) });

for (const k of keys) {
  for (const n of sizes) {
    const r = out.find(o => o.k === k && o.n === n);
    // максимальная альфа по глифу: если нигде нет '@', сплошных штрихов нет
    const solid = r.rows.join('').split('').filter(c => c === '@').length;
    console.log(`=== ${k} @${n}px · пикселей полного покрытия: ${solid} ===`);
    console.log(r.rows.map(x => '|' + x + '|').join('\n'));
  }
}
await browser.close();
