import { serve, launch, openApp, ensureShots } from './lib.mjs';
import { richSeed } from './seed.mjs';

// Emulate: real landscape, and portrait-with-keyboard (viewport height squeezed by the VK).
const PROFILES = {
  landscape: { width: 915, height: 412, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 7) Mobile' },
  keyboard:  { width: 412, height: 460, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true, userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 7) Mobile' }, // ~460px visual vp with VK up
};
const TALL = [['deadline', 'openDeadlineModal(1)'], ['repeat', 'openRepeatModal(4)'], ['group', 'showAddGroupModal()'], ['color', 'openTaskColorModal(1)'], ['templates', 'openTemplatesModal()']];

(async () => {
  const dir = ensureShots();
  const { srv, port } = await serve();
  const b = await launch();
  const out = [];
  for (const [profName, dev] of Object.entries(PROFILES)) {
    for (const [label, expr] of TALL) {
      const { ctx, page: p } = await openApp(b, { device: dev, page: 'main', seed: richSeed(), port });
      await p.waitForTimeout(250);
      try { await p.evaluate(expr); } catch (e) {}
      await p.waitForTimeout(400);
      const m = await p.evaluate(() => {
        const ov = [...document.querySelectorAll('.modal-overlay')].find(o => getComputedStyle(o).display !== 'none');
        const modal = ov ? ov.querySelector('.modal') : null;
        if (!modal) return { noModal: true };
        const mr = modal.getBoundingClientRect();
        const acts = modal.querySelector('.modal-actions');
        const ar = acts ? acts.getBoundingClientRect() : null;
        return {
          modalH: Math.round(mr.height), vpH: window.innerHeight, topClipped: mr.top < 0, botClipped: mr.bottom > window.innerHeight,
          topPx: Math.round(mr.top), botPx: Math.round(mr.bottom),
          actionsReachable: ar ? (ar.bottom <= window.innerHeight + 0.5 && ar.top >= 0) : null,
          overflowY: getComputedStyle(modal).overflowY,
        };
      });
      if (!m.noModal) {
        if (label === 'deadline' || label === 'group') await p.screenshot({ path: `${dir}/B1_modalshort_${label}_${profName}.png` });
        out.push(`${label}/${profName}: modalH=${m.modalH} vpH=${m.vpH} topClipped=${m.topClipped}(${m.topPx}) botClipped=${m.botClipped}(${m.botPx}) actionsReachable=${m.actionsReachable} overflowY=${m.overflowY}`);
      } else out.push(`${label}/${profName}: NO_MODAL`);
      await ctx.close();
    }
  }
  console.log(out.join('\n'));
  await b.close(); srv.close();
})().catch(e => { console.error('CRASH', e); process.exit(2); });
