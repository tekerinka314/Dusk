// Доп-проверка: состояние с открытой рейкой оглавления (.toc-open) + архивная (--ro) страница.
import { chromium } from 'playwright-core';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const NOTE_BODY = '<h1>Первый раздел</h1><p>Текст записи.</p><h2>Второй раздел</h2><p>Ещё текст.</p>'
  + '<h3>Третий раздел</h3><p>' + 'Строка. '.repeat(40) + '</p>';

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto('http://localhost:5173/', { waitUntil: 'load' });
await page.waitForFunction(() => typeof globalThis.grimNew === 'function');
await page.waitForTimeout(600);
await page.evaluate(() => { switchPage('notes'); });
await page.waitForTimeout(250);
await page.evaluate(() => { grimNew(); });
await page.waitForSelector('#grim-body', { state: 'attached' });
await page.evaluate((body) => {
  const ti = document.getElementById('grim-title-in');
  if (ti) { ti.value = 'Оглавление и жёлоб'; grimTitleInput(ti); }
  const b = document.getElementById('grim-body'); b.innerHTML = body; grimBodyInput(b);
}, NOTE_BODY);
await page.waitForTimeout(400);
await page.evaluate(() => { _grimRefreshToc(); for (let i = 0; i < 4 && grimBarMode !== 'open'; i++) grimToggleBar(); });
await page.waitForTimeout(300);
await page.evaluate(() => { if (!grimTocOpen) grimToggleToc(); });
await page.waitForTimeout(700);

const m = await page.evaluate(() => {
  const r = (s) => { const e = document.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect();
    return { top: +b.top.toFixed(1), right: +b.right.toFixed(1), bottom: +b.bottom.toFixed(1), left: +b.left.toFixed(1) }; };
  return { tocOpen: grimTocOpen, main: r('.grim-page-main'), cluster: r('.fmt-cluster'),
           tocBtn: r('.grim-toc-toggle'), barBtn: r('.grim-bar-toggle'), rail: r('.grim-toc') };
});
const gapTo = (btn, box) => +(btn.left - box.right).toFixed(1);
console.log('toc-open:', JSON.stringify(m, null, 1));
console.log('gap cluster→tocBtn =', gapTo(m.tocBtn, m.cluster), 'px; tocBtn.right vs rail.left =', +(m.rail.left - m.tocBtn.right).toFixed(1), 'px');
await page.screenshot({ path: 'D:/tmp/pw/shots/grimbar_tocopen_1440.png' });

// архивная (read-only) страница: колонка = back/focus + toc(top:42)
await page.evaluate(() => { grimArchive(state.notes.find(n => !n.archivedAt && !n.deletedAt).id); });
await page.waitForTimeout(600);
await page.evaluate(() => { grimSetMode('archive'); });
await page.waitForTimeout(600);
const ro = await page.evaluate(() => {
  const n = (state.notes || []).find(x => x.archivedAt && !x.deletedAt);
  if (n) grimOpen(n.id);
  return !!n;
});
await page.waitForTimeout(700);
const m2 = await page.evaluate(() => {
  const r = (s) => { const e = document.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect();
    return { top: +b.top.toFixed(1), right: +b.right.toFixed(1), bottom: +b.bottom.toFixed(1), left: +b.left.toFixed(1) }; };
  return { opened: !!document.querySelector('.grim-page--ro'), divider: r('.grim-page--ro .grim-divider'),
           tocBtn: r('.grim-page--ro .grim-toc-toggle'), body: r('.grim-body--ro') };
});
console.log('archive(--ro) opened=', ro, JSON.stringify(m2));
if (m2.divider && m2.tocBtn) console.log('gap divider→tocBtn =', +(m2.tocBtn.left - m2.divider.right).toFixed(1), 'px');
await page.screenshot({ path: 'D:/tmp/pw/shots/grimbar_ro_1440.png' });
await browser.close();
