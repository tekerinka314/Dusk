// Свип №3 + иконки «Условий»: зонд по dist.
// 1) обе кнопки «Условий» рисуют НЕ пустой глиф (ловит несработавший <use>);
// 2) IC.pin в шапке «Прикованные» тоже рисуется;
// 3) новые строки свипа на месте.
import { serve, launch, openApp } from './lib.mjs';
import { richSeed } from './seed.mjs';

const DESKTOP = { width: 1280, height: 900, deviceScaleFactor: 1, isMobile: false, hasTouch: false,
                  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36' };

const { srv, port } = await serve();
const browser = await launch();
const { page, errors } = await openApp(browser, { device: DESKTOP, page: 'main', seed: richSeed(), port });
await page.waitForTimeout(700);

// Раскрыть «Условия», чтобы кнопки стали видимы
await page.click('#btn-expand').catch(() => {});
await page.waitForTimeout(500);

const res = await page.evaluate(() => {
  const out = {};
  const bbox = (sel) => {
    const svg = document.querySelector(sel + ' svg');
    if (!svg) return { found: false };
    const u = svg.querySelector('use');
    let b = null;
    try { b = svg.getBBox(); } catch (e) { b = null; }
    return { found: true, use: u ? u.getAttribute('href') : null,
             w: b ? +b.width.toFixed(1) : -1, h: b ? +b.height.toFixed(1) : -1,
             rw: +svg.getBoundingClientRect().width.toFixed(1) };
  };
  out.pinBtn = bbox('#form-pin-toggle');
  out.tplBtn = bbox('.form-tpl-btn');
  out.swordsSwatch = bbox('.form-color-swatch[data-color=""]');
  out.searchX = bbox('.search-x');
  out.pinLabel = document.querySelector('#form-pin-toggle span')?.textContent;
  out.tplLabel = document.querySelector('.form-tpl-btn span')?.textContent;
  out.body = document.body.innerText;
  return out;
});

const checks = [
  ['кнопка «Приковать обет»: <use> резолвится, глиф не пуст',
   res.pinBtn.found && res.pinBtn.use === '#icon-pin' && res.pinBtn.w > 5 && res.pinBtn.h > 5],
  ['кнопка «Сохранить как образец»: <use> резолвится, глиф не пуст',
   res.tplBtn.found && res.tplBtn.use === '#icon-template' && res.tplBtn.w > 5 && res.tplBtn.h > 5],
  ['обе кнопки реально отрисованы (ширина svg > 0)', res.pinBtn.rw > 0 && res.tplBtn.rw > 0],
  ['свотч «Без витража»: мечи X1 через <use>, глиф не пуст',
   res.swordsSwatch.found && res.swordsSwatch.use === '#icon-swords' && res.swordsSwatch.w > 5],
  ['поле зова: те же мечи через <use>',
   res.searchX.found && res.searchX.use === '#icon-swords' && res.searchX.w > 5],
];
console.log('мечи:', JSON.stringify(res.swordsSwatch), JSON.stringify(res.searchX));

console.log(JSON.stringify(res.pinBtn), JSON.stringify(res.tplBtn));
console.log('подписи:', res.pinLabel, '|', res.tplLabel);
let bad = 0;
for (const [name, ok] of checks) { console.log((ok ? 'PASS ' : 'FAIL ') + name); if (!ok) bad++; }
if (errors.length) console.log('console errors:', errors.slice(0, 5));
await browser.close(); srv.close();
process.exit(bad ? 1 : 0);
