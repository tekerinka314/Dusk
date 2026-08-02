import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright-core');
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const b = await chromium.launch({ executablePath: CHROME });
const p = await b.newPage({ viewport: { width: 1100, height: 900 }, deviceScaleFactor: 2 });
await p.goto('file:///D:/VSCode%20projects/DUSK_v2.0/audit-v2/previews/fb2-icons-preview.html');
await p.waitForTimeout(900);
const secs = ['G','H','I','J','K','L','M','N'];
for (const r of secs) {
  const el = await p.$(`section[data-role="${r}"]`);
  await el.screenshot({ path: `fb2_${r}.png` });
}
await b.close();
console.log('done');
