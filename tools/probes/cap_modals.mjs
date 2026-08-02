import { serve, launch, openApp, ensureShots } from './lib.mjs';
import { richSeed } from './seed.mjs';

// [label, open-expression]
const MODALS = [
  ['deadline', 'openDeadlineModal(1)'],
  ['repeat', 'openRepeatModal(4)'],
  ['prio', 'openPrioModal(1)'],
  ['color', 'openTaskColorModal(1)'],
  ['note', 'openNoteModal(12)'],
  ['group', 'showAddGroupModal()'],
  ['renameGroup', 'openRenameGroupModal(10)'],
  ['colorFilter', 'openColorFilterModal()'],
  ['templates', 'openTemplatesModal()'],
  ['backup', 'openBackupModal()'],
];

(async () => {
  const dir = ensureShots();
  const { srv, port } = await serve();
  const b = await launch();
  const out = [];
  for (const dev of ['small', 'pixel7']) {
    for (const [label, expr] of MODALS) {
      const { ctx, page: p } = await openApp(b, { device: dev, page: 'main', seed: richSeed(), port });
      await p.waitForTimeout(250);
      let opened = true;
      try { await p.evaluate(expr); } catch (e) { opened = false; out.push(`${label}/${dev} OPEN_ERR ${e.message}`); }
      await p.waitForTimeout(450);
      const m = await p.evaluate(() => {
        const ov = [...document.querySelectorAll('.modal-overlay')].find(o => getComputedStyle(o).display !== 'none');
        const modal = ov ? ov.querySelector('.modal') : null;
        if (!modal) return { noModal: true };
        const mr = modal.getBoundingClientRect();
        const cs = getComputedStyle(modal);
        const confirm = modal.querySelector('.btn-modal-confirm, .btn-modal-danger, [class*="confirm"]');
        const cr = confirm ? confirm.getBoundingClientRect() : null;
        return {
          modalH: Math.round(mr.height), modalW: Math.round(mr.width), modalTop: Math.round(mr.top), modalBottom: Math.round(mr.bottom),
          vpH: window.innerHeight, fits: mr.height <= window.innerHeight, overflowY: cs.overflowY, maxH: cs.maxHeight,
          confirmInView: cr ? (cr.bottom <= window.innerHeight + 0.5 && cr.top >= 0) : null,
          confirmBottom: cr ? Math.round(cr.bottom) : null,
        };
      });
      if (opened && !m.noModal) {
        await p.screenshot({ path: `${dir}/B1_modal_${label}_${dev}.png` }); // viewport: what the user sees
        out.push(`${label}/${dev}: H=${m.modalH} vpH=${m.vpH} fits=${m.fits} overflowY=${m.overflowY} maxH=${m.maxH} confirmInView=${m.confirmInView} confirmBottom=${m.confirmBottom}`);
      } else if (opened) out.push(`${label}/${dev}: NO_MODAL_RENDERED`);
      await ctx.close();
    }
  }
  console.log(out.join('\n'));
  await b.close(); srv.close();
})().catch(e => { console.error('CRASH', e); process.exit(2); });
