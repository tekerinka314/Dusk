import { launch } from './lib.mjs';
const browser = await launch();
const p = await browser.newPage({ viewport: { width: 1000, height: 320 }, deviceScaleFactor: 3 });
await p.goto('file:///D:/VSCode%20projects/DUSK_v2.0/audit-v2/previews/fb4-mini-glyphs.html');
await p.waitForTimeout(400);
const el = await p.$('.row');
await el.screenshot({ path: 'D:/VSCode projects/DUSK_v2.0/audit-v2/shots/w4/fb4_az.png' });
await browser.close(); console.log('ok');
