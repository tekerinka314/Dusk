import { serve, launch, openApp } from './lib.mjs';
import { richSeed } from './seed.mjs';
const { srv, port } = await serve();
const browser = await launch();
const dev = { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true };
const { ctx, page: p } = await openApp(browser, { device: dev, page: 'main', seed: richSeed(), port });
await p.waitForTimeout(1500);
await p.evaluate(() => drawerOpen());
await p.waitForTimeout(300);
console.log(await p.evaluate(() => {
  const g = document.querySelector('.toolbar-group:has(#btn-filter)');
  if (!g) return 'no :has match in querySelector';
  const cs = getComputedStyle(g, '::before');
  return { display: cs.display, top: cs.top, height: cs.height, width: cs.width, bg: cs.backgroundImage.slice(0, 60), pos: cs.position, groupPos: getComputedStyle(g).position };
}));
await browser.close(); srv.close();
