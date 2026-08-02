import { launch } from './lib.mjs';
const browser = await launch();
const p = await browser.newPage({ viewport: { width: 1000, height: 300 }, deviceScaleFactor: 3 });
await p.goto('file:///D:/VSCode%20projects/DUSK_v2.0/audit-v2/previews/fb4-mini-glyphs.html');
await p.waitForTimeout(300);
const rows = await p.$$('.row');
await rows[rows.length - 2].screenshot({ path: 'D:/VSCode projects/DUSK_v2.0/audit-v2/shots/w4/v3_bl2.png' });
await rows[1].screenshot({ path: 'D:/VSCode projects/DUSK_v2.0/audit-v2/shots/w4/v3_fl2.png' });
await browser.close(); console.log('ok');
