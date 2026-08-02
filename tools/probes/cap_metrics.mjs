import { serve, launch, openApp, ensureShots } from './lib.mjs';
import { richSeed } from './seed.mjs';

const PATCH = '.task-head{flex-wrap:wrap!important} .task-actions{flex-basis:100%!important;margin-top:6px!important;opacity:1!important}';

(async () => {
  ensureShots();
  const { srv, port } = await serve();
  const b = await launch();

  for (const dev of ['pixel7', 'small']) {
    // (1) horizontal overflow offenders, as-is and patched
    for (const patched of [false, true]) {
      const { ctx, page: p } = await openApp(b, { device: dev, page: 'main', seed: richSeed(), port });
      if (patched) await p.addStyleTag({ content: PATCH });
      await p.waitForTimeout(600);
      const of = await p.evaluate(() => {
        const cw = document.documentElement.clientWidth; const res = [];
        document.querySelectorAll('*').forEach(el => { const r = el.getBoundingClientRect(); if (r.width > 4 && r.right > cw + 1 && r.left >= -2) res.push({ t: el.tagName + (el.id ? '#' + el.id : '') + '.' + String(el.className).trim().split(/\s+/).slice(0,2).join('.'), right: Math.round(r.right), w: Math.round(r.width) }); });
        return { cw, sw: document.documentElement.scrollWidth, off: res.sort((a,b)=>b.right-a.right).slice(0,6) };
      });
      console.log(`OVERFLOW ${dev} patched=${patched}: sw=${of.sw} cw=${of.cw}`, of.sw > of.cw ? JSON.stringify(of.off) : 'none');
      await ctx.close();
    }

    // (2) FABs geometry + viewport-fit + tap-target census
    const { ctx, page: p } = await openApp(b, { device: dev, page: 'main', seed: richSeed(), port });
    await p.waitForTimeout(600);
    const g = await p.evaluate(() => {
      const vpFit = document.querySelector('meta[name=viewport]')?.content || '';
      const fab = (sel) => { const e = document.querySelector(sel); if (!e) return null; const r = e.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height), bottomGap: Math.round(window.innerHeight - r.bottom), left: Math.round(r.left), right: Math.round(window.innerWidth - r.right) }; };
      // tap targets
      const els = [...document.querySelectorAll('button, a, input, [data-act], [role=button], .btn-task-action, .btn-sub-action')];
      let below44 = 0, below24 = 0; const worst = [];
      els.forEach(e => { const r = e.getBoundingClientRect(); if (r.width === 0 || r.height === 0) return; const m = Math.min(r.width, r.height); if (m < 44) below44++; if (m < 24) { below24++; worst.push({ t: (e.className || e.tagName).toString().split(/\s+/)[0], m: Math.round(m) }); } });
      return {
        vp: vpFit,
        pen: fab('#btn-pen-sound'), sync: fab('#sync-glyph-btn'), sound: fab('#btn-sound'), shortcuts: fab('#btn-shortcuts-toggle'),
        tap: { total: els.length, below44, below24, worst: worst.slice(0, 8) },
      };
    });
    console.log(`FAB/A11Y ${dev}:`, JSON.stringify(g));
    await ctx.close();
  }
  await b.close(); srv.close();
})().catch(e => { console.error('CRASH', e); process.exit(2); });
