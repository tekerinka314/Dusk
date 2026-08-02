// V2-B2-05 — подбор числа ОДНИМ прогоном: кандидаты накладываются CSS-ом и
// меряются тем же композитным зондом (guessing по одному числу за прогон дорог).
import { serve, launch, ROOT } from './lib.mjs';
import { richSeed } from './seed.mjs';

const B='.archive-item{opacity:.85}.archive-item.checked .task-text{animation:none;color:rgba(204,186,238,.95)}';
const CANDS = [
  { name: 'B (кандидат заголовка)', css: B },
  { name: 'F: звено 1.0 + secondary', css: B + '.archive-item .meta-tag{opacity:1;color:rgb(206,166,248)}.archive-item .archive-sub.checked{opacity:1}.archive-item .archive-sub.checked .archive-sub-text{color:var(--text-secondary)}' },
  { name: 'G: звено .82 + rgba(204,186,238,.92)', css: B + '.archive-item .meta-tag{opacity:1;color:rgb(206,166,248)}.archive-item .archive-sub.checked{opacity:.82}.archive-item .archive-sub.checked .archive-sub-text{color:rgba(204,186,238,.92)}' },
  { name: 'H: звено .90 + rgba(204,186,238,.92)', css: B + '.archive-item .meta-tag{opacity:1;color:rgb(206,166,248)}.archive-item .archive-sub.checked{opacity:.90}.archive-item .archive-sub.checked .archive-sub-text{color:rgba(204,186,238,.92)}' },
];

const MEASURE = () => {
  const parse = (c) => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(',').map(parseFloat); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const over = (fg, bg) => ({ r: fg.r * fg.a + bg.r * (1 - fg.a), g: fg.g * fg.a + bg.g * (1 - fg.a), b: fg.b * fg.a + bg.b * (1 - fg.a), a: 1 });
  const lum = (c) => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
  const ratio = (a, b) => { const l1 = lum(a), l2 = lum(b); const [h, s] = l1 > l2 ? [l1, l2] : [l2, l1]; return (h + 0.05) / (s + 0.05); };
  const chainAlpha = (el) => { let a = 1, n = el; while (n && n !== document.documentElement) { a *= parseFloat(getComputedStyle(n).opacity); n = n.parentElement; } return a; };
  const bgUnder = (el) => {
    let n = el.parentElement, acc = { r: 10, g: 4, b: 32, a: 1 }; const stack = [];
    while (n) { const c = parse(getComputedStyle(n).backgroundColor); if (c && c.a > 0) stack.push({ c, a: chainAlpha(n) }); n = n.parentElement; }
    for (let i = stack.length - 1; i >= 0; i--) acc = over({ ...stack[i].c, a: stack[i].c.a * stack[i].a }, acc);
    return acc;
  };
  const probe = (sel) => {
    const el = document.querySelector(sel); if (!el) return null;
    const fg = parse(getComputedStyle(el).color); const bg = bgUnder(el);
    return +ratio(over({ ...fg, a: fg.a * chainAlpha(el) }, bg), bg).toFixed(2);
  };
  return {
    title: probe('.archive-item .task-text'), titleC: (document.querySelector('.archive-item .task-text')||{}) && getComputedStyle(document.querySelector('.archive-item .task-text')).color,
    meta:  probe('.archive-item .meta-tag'),
    sub:   probe('.archive-item .archive-sub-text'),
  };
};

(async () => {
  const { srv, port } = await serve(ROOT);
  const browser = await launch();
  const ctx = await browser.newContext({ colorScheme: 'dark' });
  const page = await ctx.newPage();
  await page.goto(`http://localhost:${port}/__seed__`, { waitUntil: 'load' }).catch(() => {});
  await page.evaluate((s) => { localStorage.clear(); localStorage.setItem('duskState_v4', JSON.stringify(s)); localStorage.setItem('currentPage', 'archive'); }, richSeed());
  await page.goto(`http://localhost:${port}/index.html`, { waitUntil: 'load' });
  await page.waitForTimeout(1000);
  await page.evaluate(() => window.switchPage('archive'));
  await page.waitForTimeout(1200);

  for (const c of CANDS) {
    const tag = c.css ? await page.addStyleTag({ content: c.css }) : null;
    await page.waitForTimeout(250);
    const r = await page.evaluate(MEASURE);
    console.log(c.name.padEnd(50) + ' заголовок ' + r.title + ' · метка ' + r.meta + ' · звено ' + r.sub);
    if (tag) await page.evaluate(el => el.remove(), tag);
    await page.waitForTimeout(150);
  }
  await ctx.close(); await browser.close(); srv.close();
})().catch(e => { console.error('PROBE ERROR', e); process.exit(1); });
