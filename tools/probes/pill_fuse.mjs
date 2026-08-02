import { serve, launch, openApp, ensureShots } from './lib.mjs';
import { richSeed } from './seed.mjs';
import path from 'path';
const { srv, port } = await serve();
const browser = await launch();
const dir = ensureShots('w4');
for (const [w, h, touch, drawer] of [[390, 844, true, true], [1500, 950, false, false]]) {
  const dev = { width: w, height: h, deviceScaleFactor: 3, isMobile: touch, hasTouch: touch };
  const { ctx, page: p } = await openApp(browser, { device: dev, page: 'main', seed: richSeed(), port });
  await p.waitForTimeout(1600);
  if (drawer) { await p.evaluate(() => drawerOpen()); await p.waitForTimeout(500); }
  await p.evaluate(() => document.querySelector('.groups-list .group-pill')?.click());  // фокус на первой
  await p.waitForTimeout(400);
  if (drawer) { await p.evaluate(() => drawerOpen()); await p.waitForTimeout(450); }
  const m = await p.evaluate(() => {
    const wr = document.querySelector('.group-pill-wrap');
    const pill = wr.querySelector('.group-pill'), del = wr.querySelector('.btn-pill-delete');
    const a = pill.getBoundingClientRect(), b = del.getBoundingClientRect();
    const cs = getComputedStyle(pill), cd = getComputedStyle(del);
    return { pillRadiusTR: cs.borderTopRightRadius, pillRadiusTL: cs.borderTopLeftRadius,
             borderAllSides: [cs.borderTopWidth, cs.borderRightWidth, cs.borderBottomWidth, cs.borderLeftWidth].join('/'),
             padRight: cs.paddingRight,
             delInsidePill: b.right <= a.right + 0.6 && b.left >= a.left,
             delHasOwnBox: cd.borderRightWidth !== '0px' || (cd.backgroundColor !== 'rgba(0, 0, 0, 0)' && cd.backgroundColor !== 'transparent'),
             delPos: cd.position };
  });
  console.log(w, JSON.stringify(m));
  const list = await p.$('.groups-list');
  await list.screenshot({ path: path.join(dir, `pill_${w}.png`) });
  await ctx.close();
}
await browser.close(); srv.close();
