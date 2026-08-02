// Сверка глифов «нет витража» в трёх точках + факт отрисовки отметки выбранного
// витража (после отката MK1) в задачах и в Гримуаре.
import { serve, launch, openApp } from './lib.mjs';
import { richSeed } from './seed.mjs';

const M = { width: 412, height: 915, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
  userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36' };

const sig = (el) => {
  if (!el) return null;
  const svg = el.tagName?.toLowerCase() === 'svg' ? el : el.querySelector('svg');
  if (!svg) return 'нет svg';
  const u = svg.querySelector('use');
  if (u) return 'use ' + u.getAttribute('href');
  const d = [...svg.querySelectorAll('path,line,circle,polyline,rect')]
    .map(n => n.tagName.toLowerCase() + (n.getAttribute('d') || '').slice(0, 18)).join(',');
  return 'inline[' + d.slice(0, 90) + ']';
};

const { srv, port } = await serve();
const browser = await launch();
const { ctx, page: p } = await openApp(browser, { device: M, page: 'main', seed: richSeed(), port });
await p.waitForTimeout(500);
await p.evaluate('toggleExpand()');
await p.waitForTimeout(350);

const r1 = await p.evaluate(`(${sig.toString()}, (() => {
  const S = ${sig.toString()};
  const formNone = document.querySelector('.color-swatch.none, .color-swatch[data-color=""], #form-color-grid .color-swatch');
  return { formNoneCls: formNone?.className, formNone: S(formNone) };
})())`);

// модалка витража задачи + отметка выбранного
await p.evaluate(`openTaskColorModal(1)`);
await p.waitForTimeout(450);
const r2 = await p.evaluate(`(() => {
  const S = ${sig.toString()};
  const ov = [...document.querySelectorAll('.modal-overlay')].find(o => getComputedStyle(o).display !== 'none');
  const clear = [...ov.querySelectorAll('button')].find(b => /без витража/i.test(b.textContent));
  const sw = ov.querySelector('.color-swatch');
  sw?.click();
  return { clearBtn: S(clear), swatchBefore: S(sw) };
})()`);
await p.waitForTimeout(350);
const r3 = await p.evaluate(`(() => {
  const S = ${sig.toString()};
  const ov = [...document.querySelectorAll('.modal-overlay')].find(o => getComputedStyle(o).display !== 'none');
  const marked = [...ov.querySelectorAll('.color-swatch')].find(s => s.querySelector('svg'));
  return { markedSwatch: S(marked), markedCls: marked?.className || null };
})()`);
await ctx.close();

// Гримуар: та же отметка
const { ctx: c2, page: p2 } = await openApp(browser, { device: M, page: 'notes', seed: richSeed(), port });
await p2.waitForTimeout(500);
const r4 = await p2.evaluate(`(() => {
  const S = ${sig.toString()};
  if (typeof openGrimColorModal === 'function') openGrimColorModal('n1');
  return 'opened';
})()`);
await p2.waitForTimeout(450);
const r5 = await p2.evaluate(`(() => {
  const S = ${sig.toString()};
  const ov = [...document.querySelectorAll('.modal-overlay')].find(o => getComputedStyle(o).display !== 'none');
  if (!ov) return { noModal: true };
  const sw = [...ov.querySelectorAll('.color-swatch')];
  const cur = sw.find(s => s.querySelector('svg'));
  const clear = [...ov.querySelectorAll('button')].find(b => /без витража/i.test(b.textContent));
  return { grimMarked: S(cur), grimClear: S(clear) };
})()`);
await c2.close();
await browser.close(); srv.close();
console.log(JSON.stringify({ ...r1, ...r2, ...r3, r4, ...r5 }, null, 1));
