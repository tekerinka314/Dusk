// Скриншот контактного листа глифов, порезанный на читаемые полосы.
import { chromium } from 'playwright-core';
import fs from 'node:fs';

const EXE = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const browser = await chromium.launch({ executablePath: EXE });
const page = await browser.newPage({ viewport: { width: 1500, height: 1000 }, deviceScaleFactor: 2 });
await page.goto('file:///D:/VSCode%20projects/DUSK_v2.0/audit-v2/icon-sheet.html');
await page.waitForTimeout(400);

const h = await page.evaluate(() => document.body.scrollHeight);
const OUT = 'D:/VSCode projects/DUSK_v2.0/audit-v2/shots/icon-sheet';
fs.mkdirSync(OUT, { recursive: true });
const BAND = 700;
let i = 0;
for (let y = 0; y < h; y += BAND, i++) {
  await page.evaluate((yy) => window.scrollTo(0, yy), y);
  await page.waitForTimeout(120);
  await page.screenshot({ path: `${OUT}/band${i}.png` });
}
console.log('высота', h, '· полос', i, '→', OUT);
await browser.close();
