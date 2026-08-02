// Pixel diff of two PNGs via headless Chrome canvas. Usage:
//   node f2_diff.mjs <before.png> <after.png>
// Prints % differing pixels + the y-ranges (rows) where diffs cluster.
import { launch } from './lib.mjs';
import fs from 'fs';

const [a, b] = process.argv.slice(2);
const browser = await launch();
const p = await (await browser.newContext()).newPage();
const load = f => 'data:image/png;base64,' + fs.readFileSync(f).toString('base64');
const res = await p.evaluate(async ([da, db]) => {
  const img = src => new Promise((ok, err) => { const i = new Image(); i.onload = () => ok(i); i.onerror = err; i.src = src; });
  const [ia, ib] = await Promise.all([img(da), img(db)]);
  if (ia.width !== ib.width || ia.height !== ib.height) return { error: `size ${ia.width}x${ia.height} vs ${ib.width}x${ib.height}` };
  const w = ia.width, h = ia.height;
  const cv = (im) => { const c = new OffscreenCanvas(w, h); const x = c.getContext('2d'); x.drawImage(im, 0, 0); return x.getImageData(0, 0, w, h).data; };
  const A = cv(ia), B = cv(ib);
  let diff = 0; const rows = new Set();
  for (let y = 0; y < h; y++) {
    let rowDiff = 0;
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (Math.abs(A[i] - B[i]) > 12 || Math.abs(A[i+1] - B[i+1]) > 12 || Math.abs(A[i+2] - B[i+2]) > 12) { diff++; rowDiff++; }
    }
    if (rowDiff > 3) rows.add(y);
  }
  // collapse row set into ranges
  const sorted = [...rows].sort((x, y) => x - y); const ranges = [];
  for (const y of sorted) {
    if (ranges.length && y - ranges[ranges.length-1][1] <= 4) ranges[ranges.length-1][1] = y;
    else ranges.push([y, y]);
  }
  return { w, h, diff, pct: (100 * diff / (w * h)).toFixed(3), ranges: ranges.map(r => r.join('-')) };
}, [load(a), load(b)]);
console.log(JSON.stringify(res, null, 1));
await browser.close();
