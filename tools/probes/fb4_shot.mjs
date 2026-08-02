import { launch } from './lib.mjs';
const browser = await launch();
const p = await browser.newPage({ viewport: { width: 1100, height: 900 }, deviceScaleFactor: 2 });
await p.goto('file:///D:/VSCode%20projects/DUSK_v2.0/audit-v2/previews/fb4-mini-glyphs.html');
await p.waitForTimeout(400);
await p.screenshot({ path: 'D:/VSCode projects/DUSK_v2.0/audit-v2/shots/w4/fb4_preview.png', fullPage: true });
await browser.close(); console.log('shot ok');
