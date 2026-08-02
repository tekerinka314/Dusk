// Quantify: task title width + card height at 100% vs 200% root font (pixel7).
import { serve, launch, openApp } from './lib.mjs';
import { richSeed } from './seed.mjs';

(async () => {
  const { srv, port } = await serve();
  const b = await launch();
  const { ctx, page: p } = await openApp(b, { device: 'pixel7', page: 'main', seed: richSeed(), port });
  await p.waitForTimeout(600);

  const measure = () => p.evaluate(() => {
    // pick the pinned "Закреплённая" card (short single-word title, clearest collapse signal)
    const cards = [...document.querySelectorAll('.task-item')];
    const c = cards.find(x => (x.querySelector('.task-text')?.textContent || '').includes('Закреплённая')) || cards[0];
    const t = c.querySelector('.task-text');
    const tr = t.getBoundingClientRect(), cr = c.getBoundingClientRect();
    return { titleW: Math.round(tr.width), titleH: Math.round(tr.height), cardH: Math.round(cr.height), fs: parseFloat(getComputedStyle(t).fontSize), pageH: document.documentElement.scrollHeight };
  });

  const at100 = await measure();
  await p.addStyleTag({ content: 'html{font-size:200%!important}' });
  await p.waitForTimeout(400);
  const at200 = await measure();

  console.log('100%', JSON.stringify(at100));
  console.log('200%', JSON.stringify(at200));
  await ctx.close(); await b.close(); srv.close();
})().catch(e => { console.error('CRASH', e); process.exit(2); });
