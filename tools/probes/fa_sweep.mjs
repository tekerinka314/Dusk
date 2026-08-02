// Ф-А sweep — anchored (non-sheet) popovers must stay inside the viewport on
// coarse/narrow screens. Grimoire bar: «Перенос» (io), «Шаблоны» (tpl split),
// sort list; select-bar export (io-sel) when reachable.
import { serve, launch, openApp } from './lib.mjs';
import { richSeed } from './seed.mjs';

const { srv, port } = await serve();
const browser = await launch();
let pass = 0, fail = 0;
const check = (name, ok) => { console.log(ok ? 'PASS' : 'FAIL', name); ok ? pass++ : fail++; };

for (const device of ['small', 'pixel7']) {
  const { ctx, page: p } = await openApp(browser, { device, page: 'notes', seed: richSeed(), port });
  await p.waitForTimeout(1600);
  const vw = (await p.viewportSize()).width;

  const cases = [
    { name: 'io («Перенос»)', open: 'grimToggleIoMenu()', pop: '#grim-io-split .grim-tpl-pop' },
    { name: 'tpl («+Заметка» шаблоны)', open: 'grimToggleTplMenu()', pop: '#grim-new-split .grim-tpl-pop' },
    { name: 'grim-sort', open: "document.querySelector('.grim-sort-trigger').click()", pop: '.grim-sort .dl-month-list' },
  ];
  for (const c of cases) {
    const geo = await p.evaluate(async ([openExpr, popSel]) => {
      try { eval(openExpr); } catch (e) { return { err: String(e) }; }
      await new Promise(r => setTimeout(r, 150));   // double-rAF open
      const el = document.querySelector(popSel);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const res = { left: Math.round(r.left), right: Math.round(r.right), w: Math.round(r.width), vis: r.width > 0 };
      document.body.click();                        // close
      return res;
    }, [c.open, c.pop]);
    check(`[${device}] ${c.name} in viewport (${geo ? geo.left + '..' + geo.right + '/' + vw : 'none'})`,
      !!geo && geo.vis && geo.left >= 0 && geo.right <= vw);
    await p.waitForTimeout(250);
  }
  await ctx.close();
}
console.log(`RESULT ${pass} pass / ${fail} fail`);
await browser.close(); srv.close();
