import { serve, launch, openApp } from './lib.mjs';
import { richSeed } from './seed.mjs';
(async () => {
  const { srv, port } = await serve();
  const b = await launch();
  for (const dev of ['pixel7','small']) {
    const { ctx, page: p } = await openApp(b, { device: dev, page: 'main', seed: richSeed(), port });
    await p.waitForTimeout(700);
    const r = await p.evaluate(() => {
      const hdr = document.querySelector('.group-header');
      if (!hdr) return { noHeader: true };
      const title = hdr.querySelector('.group-title');
      const acts = hdr.querySelector('.group-actions, [class*="group-action"]') || hdr;
      const iconBtns = hdr.querySelectorAll('button, svg');
      let actionsW = 0;
      const cluster = hdr.querySelector('.group-actions');
      if (cluster) actionsW = Math.round(cluster.getBoundingClientRect().width);
      return {
        headerW: Math.round(hdr.getBoundingClientRect().width),
        titleW: Math.round(title.getBoundingClientRect().width),
        titleText: title.textContent.trim().slice(0,30),
        titleScrollW: title.scrollWidth,
        iconCount: iconBtns.length,
        actionsClusterW: actionsW,
      };
    });
    console.log(dev.toUpperCase(), JSON.stringify(r));
    await p.screenshot({ path: 'D:/VSCode projects/DUSK_v2.0/audit-v2/shots/B1_grouphdr_' + dev + '.png' });
    await ctx.close();
  }
  await b.close(); srv.close();
})().catch(e => { console.error('CRASH', e); process.exit(2); });
