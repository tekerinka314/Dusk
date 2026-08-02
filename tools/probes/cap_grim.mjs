import { serve, launch, openApp, ensureShots } from './lib.mjs';
import { richSeed } from './seed.mjs';

const OVERFLOW_FN = () => {
  const cw = document.documentElement.clientWidth;
  const out = [];
  document.querySelectorAll('*').forEach(el => {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.right > cw + 1) {
      out.push({ tag: el.tagName + (el.id ? '#' + el.id : '') + (el.className ? '.' + String(el.className).trim().split(/\s+/).slice(0, 2).join('.') : ''), right: Math.round(r.right), w: Math.round(r.width) });
    }
  });
  // keep the deepest/narrowest offenders (skip ancestors that overflow only because a child does)
  return out.sort((a, b) => b.right - a.right).slice(0, 10);
};

(async () => {
  const dir = ensureShots();
  const { srv, port } = await serve();
  const b = await launch();

  for (const dev of ['pixel7', 'small']) {
    for (const nid of ['n1', 'n3', 'n6']) {
      const { ctx, page: p } = await openApp(b, { device: dev, page: 'notes', seed: richSeed(), port });
      await p.waitForTimeout(300);
      try { await p.evaluate((id) => grimOpen(id), nid); } catch (e) { console.log('OPEN_ERR', nid, e.message); }
      // try to reveal the format toolbar if it's collapsed
      try { await p.evaluate(() => { if (typeof grimBarMode !== 'undefined' && grimBarMode !== 'open') grimToggleBar(); }); } catch (e) {}
      await p.waitForTimeout(600);
      const of = await p.evaluate(OVERFLOW_FN);
      const meta = await p.evaluate(() => {
        const tb = document.querySelector('.grim-toolbar, .grim-fmt-bar, [class*="toolbar"]');
        const body = document.querySelector('.grim-body, [data-act="grimBodyClick"]');
        return {
          toolbarW: tb ? Math.round(tb.getBoundingClientRect().width) : null,
          toolbarBtns: tb ? tb.querySelectorAll('button').length : null,
          toolbarH: tb ? Math.round(tb.getBoundingClientRect().height) : null,
          bodyW: body ? Math.round(body.getBoundingClientRect().width) : null,
          sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth,
        };
      });
      await p.screenshot({ path: `${dir}/B1_grim_${nid}_${dev}.png` });
      console.log(`${nid}/${dev}`, JSON.stringify(meta), 'OVERFLOW', of.length ? JSON.stringify(of) : 'none');
      await ctx.close();
    }
  }
  await b.close(); srv.close();
})().catch(e => { console.error('CRASH', e); process.exit(2); });
