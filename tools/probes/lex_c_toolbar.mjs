// Партия C словаря — удлинившиеся подписи тулбара и меню «Хранилище»
// («Отдать свиток…», «Предать склепу всё», «Принять свиток») не должны
// рвать вёрстку и вылезать за вьюпорт.
import { serve, launch, openApp, ensureShots } from './lib.mjs';
import { richSeed } from './seed.mjs';
const { srv, port } = await serve();
const browser = await launch();
const shots = ensureShots('lex-c');
let fail = 0;

const DEVS = ['small', 'pixel7', { name: 'desk', width: 1280, height: 900, deviceScaleFactor: 1, isMobile: false, hasTouch: false }];

for (const dev of DEVS) {
  const label = typeof dev === 'string' ? dev : dev.name;
  const { ctx, page } = await openApp(browser, { device: dev, page: 'main', seed: richSeed(), port });

  // drawer прячет тулбар на узких — открываем, если есть триггер
  await page.evaluate(() => {
    const t = document.getElementById('drawer-tab');
    if (t && getComputedStyle(t).display !== 'none') t.click();
  });
  await page.waitForTimeout(400);

  const base = await page.evaluate(() => {
    const lab = [...document.querySelectorAll('.toolbar-group-label')].map(e => e.textContent.trim());
    const over = [];
    document.querySelectorAll('.toolbar-group-label, .btn-tool').forEach(e => {
      if (e.scrollWidth > e.clientWidth + 1) over.push(e.className + ':' + e.textContent.trim().slice(0, 20));
    });
    return { lab, over, docW: document.documentElement.scrollWidth, winW: innerWidth };
  });

  // меню «Хранилище» — на узких это ⋯-лист тулбара, на широких кнопка экспорта
  const menu = await page.evaluate(async () => {
    const pick = sel => [...document.querySelectorAll(sel)].find(b => b.offsetParent !== null);
    const btn = pick('[data-act="openToolsMenu"]') || pick('[data-act="openExportMenu"]');
    if (!btn) return { skipped: true };
    btn.click();
    await new Promise(r => setTimeout(r, 350));
    const m = document.querySelector('.float-menu, .snooze-menu');
    if (!m) return { opened: false };
    const b = m.getBoundingClientRect();
    const items = [...m.querySelectorAll('span')].map(s => s.textContent.trim()).filter(Boolean);
    const clipped = [...m.querySelectorAll('span')].some(s => s.scrollWidth > s.clientWidth + 1);
    return { opened: true, left: Math.round(b.left), right: Math.round(b.right), w: Math.round(b.width), winW: innerWidth, items, clipped };
  });

  const okBase = base.over.length === 0 && base.docW <= base.winW + 1;
  const okMenu = menu.skipped || (menu.opened && !menu.clipped && menu.left >= -1 && menu.right <= menu.winW + 1);
  if (!okBase || !okMenu) fail++;
  console.log(`${okBase && okMenu ? 'PASS' : 'FAIL'} · ${label} · подписи групп [${base.lab.join(', ')}] · doc ${base.docW}/${base.winW} · переполнений ${base.over.length}`);
  if (base.over.length) console.log('    overflow:', base.over.join(' | '));
  console.log('    меню:', menu.skipped ? 'нет кнопки' : `${menu.w}px @${menu.left}..${menu.right} / ${menu.winW}${menu.clipped ? ' ОБРЕЗАНО' : ''} · ${(menu.items || []).join(' · ')}`);
  await page.screenshot({ path: `${shots}/toolbar-${label}.png` });
  await ctx.close();
}
console.log(fail ? 'FAIL' : 'все PASS · ' + shots);
await browser.close(); srv.close(); process.exit(fail ? 1 : 0);
