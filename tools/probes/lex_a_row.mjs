// Партия A словаря — проверка, что удлинившиеся подписи строки задачи
// («примечание» вместо «заметка») не рвут мета-ряд на узких экранах.
import { serve, launch, openApp, ensureShots } from './lib.mjs';
import { richSeed } from './seed.mjs';
const { srv, port } = await serve();
const browser = await launch();
const shots = ensureShots('lex-a');
let fail = 0;
for (const dev of ['small', 'pixel7']) {
  const { ctx, page } = await openApp(browser, { device: dev, page: 'main', seed: richSeed(), port });
  const r = await page.evaluate(() => {
    const out = [];
    document.querySelectorAll('.task-meta').forEach(m => {
      const mb = m.getBoundingClientRect();
      [...m.children].forEach(c => {
        const cb = c.getBoundingClientRect();
        if (cb.right > mb.right + 1 || cb.left < mb.left - 1) out.push(c.className + ' ' + Math.round(cb.width));
      });
    });
    const noteBtn = document.querySelector('.btn-note-toggle span');
    return { overflow: out, noteLabel: noteBtn?.textContent, docW: document.documentElement.scrollWidth, winW: innerWidth };
  });
  const ok = r.overflow.length === 0 && r.docW <= r.winW;
  if (!ok) fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'} · ${dev} · подпись «${r.noteLabel}» · переполнений ${r.overflow.length} · doc ${r.docW}/${r.winW}`);
  if (r.overflow.length) console.log('   ', r.overflow.join(' | '));
  await page.screenshot({ path: `${shots}/row-${dev}.png` });
  await ctx.close();
}
console.log(fail ? 'FAIL' : 'все PASS · ' + shots);
await browser.close(); srv.close(); process.exit(fail ? 1 : 0);
