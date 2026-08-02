import { serve, launch, openApp } from './lib.mjs';
import { richSeed } from './seed.mjs';

(async () => {
  const { srv, port } = await serve();
  const b = await launch();
  const out = [];
  for (const dev of ['pixel7', 'small']) {
    // --- group header title collapse (NO task-head patch; group headers are separate) ---
    {
      const { ctx, page: p } = await openApp(b, { device: dev, page: 'main', seed: richSeed(), port });
      await p.waitForTimeout(500);
      const g = await p.evaluate(() => {
        const rows = [];
        document.querySelectorAll('.group-header').forEach(h => {
          const title = h.querySelector('.group-name, .group-title, [class*="group-name"], [class*="group-header-name"]');
          // fallback: first text-bearing child
          const nameEl = title || h.querySelector('span,strong,b,div');
          const acts = h.querySelector('[class*="group-actions"], [class*="group-head-actions"], .group-actions');
          const r = (e) => { if (!e) return null; const b = e.getBoundingClientRect(); return { w: Math.round(b.w ?? b.width), left: Math.round(b.left), right: Math.round(b.right) }; };
          const ne = nameEl;
          rows.push({
            cls: h.className,
            nameCls: ne ? ne.className : null,
            nameText: ne ? ne.textContent.trim().slice(0, 40) : null,
            nameW: ne ? Math.round(ne.getBoundingClientRect().width) : null,
            nameScrollW: ne ? ne.scrollWidth : null,
            truncated: ne ? (ne.scrollWidth > ne.getBoundingClientRect().width + 1) : null,
            ellipsis: ne ? getComputedStyle(ne).textOverflow : null,
            iconCount: h.querySelectorAll('button, svg').length,
          });
        });
        return rows;
      });
      out.push(`GROUP-HEADERS ${dev}:\n` + JSON.stringify(g, null, 1));
      await ctx.close();
    }
    // --- color filter modal swatch tap sizes ---
    {
      const { ctx, page: p } = await openApp(b, { device: dev, page: 'main', seed: richSeed(), port });
      await p.evaluate(`setColorFilter('#8C5CFF');openColorFilterModal();`);
      await p.waitForTimeout(500);
      const m = await p.evaluate(() => {
        const sw = [...document.querySelectorAll('#color-filter-swatches .color-filter-swatch')].map(s => {
          const r = s.getBoundingClientRect();
          return { cls: s.className.replace('color-filter-swatch', '').trim(), w: Math.round(r.width), h: Math.round(r.height) };
        });
        const modal = document.querySelector('#color-filter-modal .modal-overlay, #color-filter-modal .modal, #color-filter-modal');
        return { swatches: sw, count: sw.length };
      });
      out.push(`COLOR-MODAL-SWATCHES ${dev}: ` + JSON.stringify(m));
      await ctx.close();
    }
  }
  console.log(out.join('\n\n'));
  await b.close(); srv.close();
})().catch(e => { console.error('CRASH', e); process.exit(2); });
