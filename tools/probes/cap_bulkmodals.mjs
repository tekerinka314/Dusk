import { serve, launch, openApp, ensureShots } from './lib.mjs';
import { richSeed } from './seed.mjs';

async function measureModal(p, label) {
  return await p.evaluate((label) => {
    const cw = document.documentElement.clientWidth, ch = document.documentElement.clientHeight;
    // find the visible modal-overlay
    const ov = [...document.querySelectorAll('.modal-overlay')].find(o => getComputedStyle(o).display !== 'none' && o.getBoundingClientRect().height > 0);
    if (!ov) return { label, present: false };
    const modal = ov.querySelector('.modal') || ov.firstElementChild;
    const mr = modal.getBoundingClientRect();
    return {
      label, present: true, clientW: cw, clientH: ch,
      modal: { w: Math.round(mr.width), h: Math.round(mr.height), left: Math.round(mr.left), right: Math.round(mr.right), top: Math.round(mr.top), bottom: Math.round(mr.bottom) },
      overRight: Math.round(mr.right) - cw,
      overLeft: -Math.round(mr.left),
      overBottom: Math.round(mr.bottom) - ch,
      taller: Math.round(mr.height) > ch,
      cls: modal.className,
    };
  }, label);
}

(async () => {
  const dir = ensureShots();
  const { srv, port } = await serve();
  const b = await launch();
  const device = 'small'; // 360 — worst case

  const opens = [
    { fn: 'openBulkGroupModal', label: 'bulk-group' },
    { fn: 'openBulkColorModal', label: 'bulk-color' },
    { fn: 'openBulkDeadlineModal', label: 'bulk-deadline' },
  ];

  for (const { fn, label } of opens) {
    const { ctx, page: p } = await openApp(b, { device, page: 'main', seed: richSeed(), port });
    await p.waitForTimeout(400);
    // select mode + select 3 so bulk buttons are enabled/act on real ids
    await p.evaluate(() => { toggleMainSelectMode(); state.tasks.slice(0,3).forEach(t=>toggleMainSelectTask(t.id)); });
    await p.waitForTimeout(200);
    const opened = await p.evaluate((fn) => { try { window[fn] ? window[fn]() : (typeof globalThis[fn]==='function'? globalThis[fn](): eval(fn+'()')); return true; } catch(e){ return 'ERR:'+e.message; } }, fn);
    await p.waitForTimeout(400);
    const m = await measureModal(p, label);
    console.log(`\n=== ${label} [${device}] opened=${opened} ===`);
    console.log(JSON.stringify(m, null, 1));
    await p.screenshot({ path: `${dir}/B1w_selbulk_${label}_${device}.png` });
    await ctx.close();
  }

  await b.close(); srv.close();
})().catch(e => { console.error('CRASH', e); process.exit(2); });
