import { chromium } from 'playwright-core';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto('http://localhost:5173/', { waitUntil: 'load' });
await page.waitForFunction(() => typeof globalThis.grimNew === 'function');
await page.waitForTimeout(600);
await page.evaluate(() => { switchPage('notes'); grimNew(); });
await page.waitForSelector('#grim-body', { state: 'attached' });
await page.evaluate(() => {
  const ti = document.getElementById('grim-title-in');
  if (ti) { ti.value = 'Склеп: жёлоб'; grimTitleInput(ti); }
  const b = document.getElementById('grim-body');
  b.innerHTML = '<h1>Раздел один</h1><p>Текст.</p><h2>Раздел два</h2><p>Текст.</p><h3>Раздел три</h3><p>' + 'Строка. '.repeat(40) + '</p>';
  grimBodyInput(b);
});
await page.waitForTimeout(500);
const info = await page.evaluate(() => {
  const n = state.notes.find(x => !x.archivedAt && !x.deletedAt);
  n.archivedAt = Date.now();
  saveState(); grimSetMode('archive');
  return n.id;
});
await page.waitForTimeout(600);
await page.evaluate((id) => { renderNotes(); grimOpen(id); }, info);
await page.waitForTimeout(800);
const m = await page.evaluate(() => {
  const r = (s) => { const e = document.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect();
    return { top:+b.top.toFixed(1), right:+b.right.toFixed(1), bottom:+b.bottom.toFixed(1), left:+b.left.toFixed(1) }; };
  return { ro: !!document.querySelector('.grim-page--ro'), title: r('.grim-title-ro'), divider: r('.grim-page--ro .grim-divider'),
           body: r('.grim-body--ro'), tocBtn: r('.grim-page--ro .grim-toc-toggle'), focusBtn: r('.grim-page--ro .grim-focus-toggle') };
});
console.log(JSON.stringify(m));
if (m.divider && m.tocBtn) console.log('gap divider→tocBtn =', +(m.tocBtn.left - m.divider.right).toFixed(1), 'px');
if (m.body && m.tocBtn) console.log('gap body→tocBtn    =', +(m.tocBtn.left - m.body.right).toFixed(1), 'px');
await page.screenshot({ path: 'D:/tmp/pw/shots/grimbar_ro_1440.png' });
await browser.close();
