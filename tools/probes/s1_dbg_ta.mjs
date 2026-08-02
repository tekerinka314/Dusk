import { serve, launch, openApp } from './lib.mjs';
import { richSeed } from './seed.mjs';
const { srv, port } = await serve();
const browser = await launch();
const kb = { width: 412, height: 460, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true, userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 Chrome/126.0.0.0 Mobile Safari/537.36' };
for (const [label, dev] of [['kbshort', kb], ['landscape', 'landscape']]) {
  const { ctx, page: p } = await openApp(browser, { device: dev, seed: richSeed(), port });
  const r = await p.evaluate(() => { const i = document.getElementById('input-box'); const b = i.getBoundingClientRect(); return { x: b.x + 50, y: b.y + b.height / 2 }; });
  await p.touchscreen.tap(r.x, r.y);
  await p.keyboard.type('задача !', { delay: 40 });
  await p.waitForTimeout(400);
  await p.screenshot({ path: `D:/VSCode projects/DUSK_v2.0/audit-v2/shots/s1/ta_open_${label}.png` });
  await ctx.close();
}
await browser.close(); srv.close(); console.log('OK');
