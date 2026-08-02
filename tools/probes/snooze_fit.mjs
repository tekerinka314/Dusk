// «ОК» → «Отсрочить»: строка своей отсрочки узкая, кнопка не должна ломать ряд.
import { serve, launch, openApp } from './lib.mjs';
import { richSeed } from './seed.mjs';
const DEV = (w) => ({ width: w, height: 900, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
  userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36' });
const { srv, port } = await serve();
const b = await launch();
let bad = 0;
for (const w of [360, 412, 1280]) {
  const { ctx, page: p } = await openApp(b, { device: DEV(w), page: 'main', seed: richSeed(), port });
  await p.waitForTimeout(450);
  await p.evaluate(`_openSnoozeMenuAt(document.querySelector('.btn-snooze'), 2)`);
  await p.waitForTimeout(450);
  const r = await p.evaluate(`(() => {
    const m = document.querySelector('.snooze-menu'); if (!m) return { no: true };
    const go = m.querySelector('.snooze-custom-go');
    const row = go && go.parentElement;
    const mr = m.getBoundingClientRect(), gr = go && go.getBoundingClientRect(), rr = row && row.getBoundingClientRect();
    return { txt: go && go.textContent.trim(), menuW: Math.round(mr.width), menuR: Math.round(mr.right),
             goW: Math.round(gr.width), rowScroll: row.scrollWidth, rowClient: row.clientWidth,
             goInside: gr.right <= mr.right + 0.5 && gr.left >= mr.left - 0.5,
             rowH: Math.round(rr.height), vw: window.innerWidth, menuInside: mr.right <= window.innerWidth + 0.5 && mr.left >= -0.5 };
  })()`);
  const ok = !r.no && r.goInside && r.menuInside && r.rowScroll <= r.rowClient + 1;
  console.log(`${w}px  ${ok ? 'PASS' : 'FAIL'}  ` + JSON.stringify(r));
  if (!ok) bad++;
  await p.screenshot({ path: `D:/tmp/pw/b1/rev/snooze_${w}.png` });
  await ctx.close();
}
await b.close(); srv.close();
process.exit(bad ? 1 : 0);
