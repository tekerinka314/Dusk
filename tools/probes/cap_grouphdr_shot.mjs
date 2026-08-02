import { serve, launch, openApp, ensureShots } from './lib.mjs';
import { richSeed } from './seed.mjs';

(async () => {
  const dir = ensureShots();
  const { srv, port } = await serve();
  const b = await launch();
  for (const dev of ['pixel7', 'small']) {
    const { ctx, page: p } = await openApp(b, { device: dev, page: 'main', seed: richSeed(), port });
    await p.waitForTimeout(500);
    // scroll first group header to top and full-viewport screenshot
    await p.evaluate(() => {
      const h = document.querySelector('.group-header');
      if (h) h.scrollIntoView({ block: 'start' });
    });
    await p.waitForTimeout(250);
    await p.screenshot({ path: `${dir}/B1w_states_grouphdr_${dev}.png` });
    await ctx.close();
  }
  await b.close(); srv.close();
})().catch(e => { console.error('CRASH', e); process.exit(2); });
