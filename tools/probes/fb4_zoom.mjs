import { launch } from './lib.mjs';
const browser = await launch();
const p = await browser.newPage({ viewport: { width: 600, height: 300 }, deviceScaleFactor: 4 });
await p.goto('file:///D:/VSCode%20projects/DUSK_v2.0/audit-v2/previews/fb4-mini-glyphs.html');
await p.waitForTimeout(300);
const el = await p.$('.cell');
await el.screenshot({ path: 'D:/VSCode projects/DUSK_v2.0/audit-v2/shots/w4/fb4_az_zoom.png' });
await browser.close(); console.log('ok');
