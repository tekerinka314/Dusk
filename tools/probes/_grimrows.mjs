import { chromium } from 'playwright-core';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const B = '<h1>А</h1><p>т</p><h2>Б</h2><p>т</p><h3>В</h3><p>' + 'Строка. '.repeat(20) + '</p>';
const browser = await chromium.launch({ executablePath: CHROME, headless: true });
for (const w of [700, 768, 850, 950, 1100, 1280, 1440]) {
  const page = await browser.newPage({ viewport: { width: w, height: 900 } });
  await page.goto('http://localhost:5173/', { waitUntil: 'load' });
  await page.waitForFunction(() => typeof globalThis.grimNew === 'function');
  await page.waitForTimeout(500);
  await page.evaluate(() => { switchPage('notes'); grimNew(); });
  await page.waitForSelector('#grim-body', { state: 'attached' });
  await page.evaluate((b) => { const e = document.getElementById('grim-body'); e.innerHTML = b; grimBodyInput(e); }, B);
  await page.evaluate(() => { for (let i = 0; i < 4 && grimBarMode !== 'open'; i++) grimToggleBar(); });
  await page.waitForTimeout(500);
  const r = await page.evaluate(() => {
    const c = document.querySelector('.fmt-cluster'); const b = c.getBoundingClientRect();
    const cs = getComputedStyle(c);
    return { w: +b.width.toFixed(0), h: +b.height.toFixed(0), gap: cs.columnGap, pad: cs.paddingLeft };
  });
  console.log(`vp=${String(w).padStart(4)}  cluster ${String(r.w).padStart(4)}px  h=${String(r.h).padStart(3)}px  rows≈${Math.round((r.h - 12) / 32)}  gap=${r.gap} pad=${r.pad}`);
  await page.close();
}
await browser.close();
