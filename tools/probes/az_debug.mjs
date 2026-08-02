import { launch } from './lib.mjs';
import fs from 'fs';
const html = fs.readFileSync('D:/VSCode projects/DUSK_v2.0/audit-v2/previews/fb4-mini-glyphs.html', 'utf8');
const svg = html.match(/<span class="g48">([\s\S]*?)<\/span>/)[1];
const page = `<body style="background:#0a0417;margin:0;display:flex;gap:20px;align-items:center;padding:16px">
<div style="width:260px;height:260px">${svg.replace('<svg', '<svg width="260" height="260"')}</div>
<div style="width:150px;height:150px">${svg.replace('<svg', '<svg width="150" height="150"')}</div>
<div style="width:24px">${svg}</div>
<style>svg{color:#c898ff;stroke:currentColor}</style></body>`;
fs.writeFileSync('D:/VSCode projects/DUSK_v2.0/audit-v2/shots/w4/_azdbg.html', page);
const browser = await launch();
const p = await browser.newPage({ viewport: { width: 480, height: 300 }, deviceScaleFactor: 2 });
await p.goto('file:///D:/VSCode%20projects/DUSK_v2.0/audit-v2/shots/w4/_azdbg.html');
await p.waitForTimeout(250);
await p.screenshot({ path: 'D:/VSCode projects/DUSK_v2.0/audit-v2/shots/w4/az_debug.png' });
await browser.close(); console.log('ok');
