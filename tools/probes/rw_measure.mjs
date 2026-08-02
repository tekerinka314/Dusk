// Quick metrics probe: widths that decide the one-row action fit + toolbar overflow.
import { serve, launch, openApp } from './lib.mjs';
import { richSeed } from './seed.mjs';

const { srv, port } = await serve();
const browser = await launch();
const dev = process.argv[2] || 'small';
const { ctx, page: p } = await openApp(browser, { device: dev, page: 'main', seed: richSeed(), port });
await p.waitForTimeout(2800);

const m = await p.evaluate(() => {
  const li = [...document.querySelectorAll('.task-item:not(.archive-item)')].find(x => x.querySelector('.task-actions'));
  const acts = li.querySelector('.task-actions');
  const btns = [...acts.children].filter(b => b.offsetParent !== null);
  const cs = getComputedStyle(acts);
  const rows = new Set(btns.map(b => b.offsetTop)).size;
  const vid = document.querySelector('.toolbar-group-btns');
  const tb = document.querySelector('.toolbar');
  return {
    inner: innerWidth,
    scrollW: document.documentElement.scrollWidth,
    liW: li.clientWidth,
    actsW: acts.clientWidth,
    gap: cs.gap, ml: cs.marginLeft,
    btnW: btns.map(b => b.offsetWidth).join(','),
    sum: btns.reduce((s, b) => s + b.offsetWidth, 0),
    nBtns: btns.length, rows,
    vidW: vid ? vid.scrollWidth : 0,
    tbW: tb ? tb.clientWidth : 0, tbScrollW: tb ? tb.scrollWidth : 0,
    mq: matchMedia('(hover: none) and (pointer: coarse) and (max-width: 380px)').matches,
  };
});
console.log(JSON.stringify(m, null, 1));
await ctx.close(); await browser.close(); srv.close();
