import { launch } from './lib.mjs';
import fs from 'fs';
const gen = fs.readFileSync('C:/Users/serge/AppData/Local/Temp/claude/D--VSCode-projects-DUSK-v2-0/6cab3fd7-22c8-4f24-9bae-dd8a35d42548/scratchpad/gen-fb4-v3.mjs', 'utf8');
// вытащим оба варианта, выполнив генератор в отдельном процессе — проще прочитать из превью
const html = fs.readFileSync('D:/VSCode projects/DUSK_v2.0/audit-v2/previews/fb4-mini-glyphs.html', 'utf8');
const svgs = [...html.matchAll(/<span class="g48">([\s\S]*?)<\/span>/g)].map(m => m[1]);
const dbg = fs.existsSync('D:/VSCode projects/DUSK_v2.0/audit-v2/shots/w4/_two.html');
const page = `<body style="background:#0a0417;margin:0;padding:14px;display:flex;gap:18px;align-items:center">
${svgs.slice(0,2).map(s => `<div>${s.replace('<svg','<svg width="230" height="230"')}</div>`).join('')}
${svgs.slice(0,2).map(s => `<div>${s.replace('<svg','<svg width="90" height="90"')}</div>`).join('')}
${svgs.slice(0,2).map(s => `<div>${s.replace('<svg','<svg width="24" height="24"')}</div>`).join('')}
${svgs.slice(0,2).map(s => `<div>${s.replace('<svg','<svg width="14" height="14"')}</div>`).join('')}
<style>svg{color:#c898ff;stroke:currentColor}</style></body>`;
fs.writeFileSync('D:/VSCode projects/DUSK_v2.0/audit-v2/shots/w4/_two.html', page);
const browser = await launch();
const p = await browser.newPage({ viewport: { width: 800, height: 270 }, deviceScaleFactor: 2 });
await p.goto('file:///D:/VSCode%20projects/DUSK_v2.0/audit-v2/shots/w4/_two.html');
await p.waitForTimeout(250);
await p.screenshot({ path: 'D:/VSCode projects/DUSK_v2.0/audit-v2/shots/w4/az_two.png' });
await browser.close(); console.log('ok');
