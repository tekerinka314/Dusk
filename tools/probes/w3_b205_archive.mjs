// V2-B2-05 — читаемость строк склепа. ЗАМЕР ДО ФИКСА: эффективный контраст
// заголовка погребённого обета против его реальной подложки, с учётом ВСЕЙ
// цепочки opacity (урок W2-2: зонд, читающий только color, врёт).
import { serve, launch, ROOT } from './lib.mjs';
import { richSeed } from './seed.mjs';

(async () => {
  const { srv, port } = await serve(ROOT);
  const browser = await launch();
  const ctx = await browser.newContext({ colorScheme: 'dark' });
  const page = await ctx.newPage();
  await page.goto(`http://localhost:${port}/__seed__`, { waitUntil: 'load' }).catch(() => {});
  await page.evaluate((s) => {
    localStorage.clear();
    localStorage.setItem('duskState_v4', JSON.stringify(s));
    localStorage.setItem('currentPage', 'archive');
  }, richSeed());
  await page.goto(`http://localhost:${port}/index.html`, { waitUntil: 'load' });
  await page.waitForTimeout(1200);
  await page.evaluate(() => window.switchPage('archive'));
  await page.waitForTimeout(1200);

  const out = await page.evaluate(() => {
    const parse = (c) => {
      const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null;
      const p = m[1].split(',').map(s => parseFloat(s));
      return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
    };
    const over = (fg, bg) => ({
      r: fg.r * fg.a + bg.r * (1 - fg.a),
      g: fg.g * fg.a + bg.g * (1 - fg.a),
      b: fg.b * fg.a + bg.b * (1 - fg.a), a: 1,
    });
    const lum = (c) => {
      const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
      return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
    };
    const ratio = (a, b) => { const l1 = lum(a), l2 = lum(b); const [h, s] = l1 > l2 ? [l1, l2] : [l2, l1]; return (h + 0.05) / (s + 0.05); };
    // накопленная непрозрачность от элемента вверх по дереву
    const chainAlpha = (el) => { let a = 1, n = el; while (n && n !== document.documentElement) { a *= parseFloat(getComputedStyle(n).opacity); n = n.parentElement; } return a; };
    const bgUnder = (el) => {
      let n = el.parentElement, acc = { r: 10, g: 4, b: 32, a: 1 };   // страница почти чёрная
      const stack = [];
      while (n) { const c = parse(getComputedStyle(n).backgroundColor); if (c && c.a > 0) stack.push({ c, a: chainAlpha(n) }); n = n.parentElement; }
      for (let i = stack.length - 1; i >= 0; i--) {
        const { c, a } = stack[i];
        acc = over({ ...c, a: c.a * a }, acc);
      }
      return acc;
    };
    const probe = (sel, label) => {
      const el = document.querySelector(sel);
      if (!el) return { label, err: 'нет узла' };
      const cs = getComputedStyle(el);
      const fg = parse(cs.color);
      const bg = bgUnder(el);
      const eff = over({ ...fg, a: fg.a * chainAlpha(el) }, bg);
      return { label, color: cs.color, alpha: +chainAlpha(el).toFixed(3), ratio: +ratio(eff, bg).toFixed(2) };
    };
    return [
      probe('.archive-item .task-text', 'заголовок погребённого обета'),
      probe('.archive-item .meta-tag', 'метка в строке склепа'),
      probe('.archive-item .archive-sub-text', 'звено в строке склепа'),
      probe('.archive-month-header', 'заголовок месяца'),
      probe('.task-item:not(.archive-item) .task-text', 'заголовок живого обета (эталон)'),
    ];
  });

  console.log(out.map(o => o.err ? `${o.label}: ${o.err}` : `${o.label}: ${o.ratio}:1  (color ${o.color}, цепочка opacity ${o.alpha})`).join('\n'));
  await ctx.close(); await browser.close(); srv.close();
})().catch(e => { console.error('PROBE ERROR', e); process.exit(1); });
