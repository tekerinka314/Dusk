import { serve, launch, openApp } from './lib.mjs';
import { richSeed } from './seed.mjs';
const DESKTOP = { width: 1280, height: 900, deviceScaleFactor: 3, isMobile: false, hasTouch: false,
                  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36' };
const { srv, port } = await serve();
const browser = await launch();
const { page } = await openApp(browser, { device: DESKTOP, page: 'main', seed: richSeed(), port });
await page.waitForTimeout(700);
await page.click('#btn-expand').catch(() => {});
await page.waitForTimeout(600);
const el = await page.$('.form-action-row');
await el.screenshot({ path: 'D:/VSCode projects/DUSK_v2.0/audit-v2/shots/icon-sheet/cond-row.png' });
const sub = await page.$('.form-sub-add-row');
if (sub) await sub.screenshot({ path: 'D:/VSCode projects/DUSK_v2.0/audit-v2/shots/icon-sheet/cond-sub.png' });
console.log('ок');
await browser.close(); srv.close();
