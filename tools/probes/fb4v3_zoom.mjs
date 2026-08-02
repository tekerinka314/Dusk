import { launch } from './lib.mjs';
const browser = await launch();
const p = await browser.newPage({ viewport: { width: 700, height: 260 }, deviceScaleFactor: 4 });
await p.goto('file:///D:/VSCode%20projects/DUSK_v2.0/audit-v2/previews/fb4-mini-glyphs.html');
await p.waitForTimeout(300);
const cells = await p.$$('.cell');
await cells[0].screenshot({ path: 'D:/VSCode projects/DUSK_v2.0/audit-v2/shots/w4/v3_az3.png' });
await browser.close(); console.log('ok');
