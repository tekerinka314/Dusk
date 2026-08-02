// Партия B — «Условия обета» длиннее прежних «Параметров»: проверяем, что кнопка
// и модалки не переполняются на узком экране.
import { serve, launch, openApp, ensureShots } from './lib.mjs';
import { richSeed } from './seed.mjs';
const { srv, port } = await serve();
const browser = await launch();
const shots = ensureShots('lex-b');
let fail = 0;
const { ctx, page } = await openApp(browser, { device: 'small', page: 'main', seed: richSeed(), port });
const btn = await page.evaluate(() => {
  const b = document.getElementById('btn-expand');
  const r = b.getBoundingClientRect();
  return { text: b.textContent.trim(), w: Math.round(r.width), sw: b.scrollWidth, cw: b.clientWidth };
});
const okBtn = btn.sw <= btn.cw + 1;
if (!okBtn) fail++;
console.log(`${okBtn ? 'PASS' : 'FAIL'} · кнопка «${btn.text}» ${btn.w}px · scroll ${btn.sw}/${btn.cw}`);
await page.evaluate(() => document.getElementById('btn-expand').click());
await page.waitForTimeout(600);
await page.screenshot({ path: `${shots}/form-open.png` });
await page.evaluate(() => document.getElementById('deadline-trigger')?.click());
await page.waitForTimeout(500);
const dl = await page.evaluate(() => {
  const t = document.getElementById('deadline-modal-title');
  return { title: t?.textContent, docW: document.documentElement.scrollWidth, winW: innerWidth };
});
const okDl = dl.docW <= dl.winW;
if (!okDl) fail++;
console.log(`${okDl ? 'PASS' : 'FAIL'} · модалка «${dl.title}» · doc ${dl.docW}/${dl.winW}`);
await page.screenshot({ path: `${shots}/deadline-modal.png` });
await ctx.close();
console.log(fail ? 'FAIL' : 'все PASS · ' + shots);
await browser.close(); srv.close(); process.exit(fail ? 1 : 0);
