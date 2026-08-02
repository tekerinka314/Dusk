import { serve, launch, openApp } from './lib.mjs';
import { richSeed } from './seed.mjs';
const { srv, port } = await serve();
const browser = await launch();
const { ctx, page: p } = await openApp(browser, { device: 'small', seed: richSeed(), page: 'notes', port });
const st = await p.evaluate(() => {
  const b = document.getElementById('grim-cfilter-btn'); const r = b.getBoundingClientRect();
  const cover = document.elementFromPoint(r.x + r.width/2, r.y + r.height/2);
  return { rect: { x: r.x, y: r.y, w: r.width, h: r.height }, cover: cover ? cover.tagName + '.' + cover.className : null, coverOk: cover === b || b.contains(cover) };
});
console.log('btn:', JSON.stringify(st));
await p.touchscreen.tap(st.rect.x + st.rect.w/2, st.rect.y + st.rect.h/2);
await p.waitForTimeout(400);
console.log('after TAP:', await p.evaluate(() => {
  const pop = document.getElementById('grim-cfilter-pop');
  const r = pop.getBoundingClientRect();
  return { ariaHidden: pop.getAttribute('aria-hidden'), h: Math.round(r.height), bottom: Math.round(r.bottom), right: Math.round(r.right), left: Math.round(r.left), innerW: innerWidth, swatches: pop.querySelectorAll('button').length };
}));
await p.screenshot({ path: 'D:/VSCode projects/DUSK_v2.0/audit-v2/shots/s1/picker_grimcfilter_small2.png' });
await browser.close(); srv.close();
