import { serve, launch, openApp } from './lib.mjs';
import { richSeed } from './seed.mjs';
const { srv, port } = await serve();
const browser = await launch();
const { ctx, page: p } = await openApp(browser, { device: 'small', seed: richSeed(), port });
// open params
const be = await p.evaluate(() => { const b = document.getElementById('btn-expand'); const r = b.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
await p.touchscreen.tap(be.x, be.y);
await p.waitForTimeout(600);
const st1 = await p.evaluate(() => {
  const t = document.getElementById('grp-trigger'); const r = t.getBoundingClientRect();
  const cover = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
  return { rect: { x: r.x, y: r.y, w: r.width, h: r.height }, coverTag: cover ? cover.tagName + '.' + cover.className : null, coverIsTrigger: cover === t || (cover && t.contains(cover)) };
});
console.log('trigger state:', JSON.stringify(st1));
await p.touchscreen.tap(st1.rect.x + st1.rect.w / 2, st1.rect.y + st1.rect.h / 2);
await p.waitForTimeout(400);
console.log('after TAP:', await p.evaluate(() => document.getElementById('grp-picker').className));
// now programmatic click
await p.evaluate(() => document.getElementById('grp-trigger').click());
await p.waitForTimeout(300);
console.log('after .click():', await p.evaluate(() => document.getElementById('grp-picker').className));
await browser.close(); srv.close();
