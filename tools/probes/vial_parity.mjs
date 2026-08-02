// «Без витража» обязан быть одним и тем же глифом в форме обета и в модалке
// витража, и оба <use> обязаны реально резолвиться (bbox > 0).
import { serve, launch, openApp } from './lib.mjs';
import { richSeed } from './seed.mjs';

const M = { width: 412, height: 915, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
  userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36' };

const { srv, port } = await serve();
const browser = await launch();
const { page: p, errors } = await openApp(browser, { device: M, page: 'main', seed: richSeed(), port });
await p.waitForTimeout(500);
await p.evaluate('toggleExpand()');
await p.waitForTimeout(400);

const form = await p.evaluate(`(() => {
  const b = document.querySelector('.form-color-swatch[data-color=""]');
  const svg = b && b.querySelector('svg');
  const r = svg && svg.getBoundingClientRect();
  return { title: b && b.getAttribute('title'), use: svg && svg.querySelector('use')?.getAttribute('href'),
           w: r ? +r.width.toFixed(1) : 0, h: r ? +r.height.toFixed(1) : 0 };
})()`);

await p.evaluate('openTaskColorModal(1)');
await p.waitForTimeout(450);
const modal = await p.evaluate(`(() => {
  const b = document.querySelector('.btn-modal-clear');
  const svg = b && b.querySelector('svg');
  const r = svg && svg.getBoundingClientRect();
  return { title: b && b.getAttribute('title'), txt: b && b.textContent.trim(),
           use: svg && svg.querySelector('use')?.getAttribute('href'),
           w: r ? +r.width.toFixed(1) : 0, h: r ? +r.height.toFixed(1) : 0 };
})()`);

// массовый «Витраж» (H2 фиал) не должен был пострадать
const bulk = await p.evaluate(`(() => {
  const b = document.querySelector('[data-act="openBulkColorModal"]');
  const svg = b && b.querySelector('svg');
  return { title: b && b.getAttribute('title'), inlinePaths: svg ? svg.querySelectorAll('path,line,circle').length : -1,
           use: svg && svg.querySelector('use')?.getAttribute('href') || null };
})()`);

await p.screenshot({ path: 'D:/tmp/pw/b1/rev/vial_form.png' });
console.log(JSON.stringify({ form, modal, bulk }, null, 1));
const checks = [
  ['свотч формы → #icon-vial-none', form.use === '#icon-vial-none'],
  ['кнопка модалки → #icon-vial-none', modal.use === '#icon-vial-none'],
  ['свотч отрисован (bbox > 0)', form.w > 0 && form.h > 0],
  ['кнопка модалки отрисована (bbox > 0)', modal.w > 0 && modal.h > 0],
  ['массовый «Витраж» остался своим инлайн-фиалом', bulk.use === null && bulk.inlinePaths >= 6],
  ['ошибок консоли нет', errors.length === 0],
];
let bad = 0;
for (const [n, ok] of checks) { console.log((ok ? 'PASS ' : 'FAIL ') + n); if (!ok) bad++; }
await browser.close(); srv.close();
process.exit(bad ? 1 : 0);
