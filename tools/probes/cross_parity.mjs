// Крест «Добавить звено» в «Условиях» обязан быть тем же глифом и того же
// кегля, что живая кнопка под звеньями и «Дать обет».
import { serve, launch, openApp } from './lib.mjs';
import { richSeed } from './seed.mjs';

const DESKTOP = { width: 1280, height: 900, deviceScaleFactor: 1, isMobile: false, hasTouch: false,
                  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36' };

const { srv, port } = await serve();
const browser = await launch();
const { page } = await openApp(browser, { device: DESKTOP, page: 'main', seed: richSeed(), port });
await page.waitForTimeout(700);
await page.click('#btn-expand').catch(() => {});
await page.waitForTimeout(400);
// раскрыть звенья первой задачи, чтобы появилась живая кнопка
await page.click('.subtask-toggle, .sub-count, [data-act="toggleSubtasks"]').catch(() => {});
await page.waitForTimeout(500);

const res = await page.evaluate(() => {
  const info = (sel) => {
    const b = document.querySelector(sel); if (!b) return { found: false };
    const svg = b.querySelector('svg'); if (!svg) return { found: true, svg: false };
    const u = svg.querySelector('use');
    const r = svg.getBoundingClientRect();
    return { found: true, use: u?.getAttribute('href') || null,
             w: +r.width.toFixed(1), h: +r.height.toFixed(1) };
  };
  return { conditions: info('.btn-form-sub-add'), live: info('.btn-subtask-confirm'), cta: info('#btn-add') };
});

console.log(JSON.stringify(res, null, 1));
const c = res.conditions, l = res.live, a = res.cta;
const checks = [
  ['«Условия» и «Дать обет» — один и тот же <use>', c.use === '#icon-cross-add' && a.use === '#icon-cross-add'],
  ['живая кнопка под звеньями — тот же <use>', !l.found || l.use === '#icon-cross-add'],
  ['кегль «Условий» совпал с живой кнопкой (12px)', !l.found ? c.w === 12 : Math.abs(c.w - l.w) < 0.6],
];
let bad = 0;
for (const [n, ok] of checks) { console.log((ok ? 'PASS ' : 'FAIL ') + n); if (!ok) bad++; }
if (!l.found) console.log('(живую кнопку раскрыть не удалось — сверка по CSS-кеглю 12px)');
await browser.close(); srv.close();
process.exit(bad ? 1 : 0);
