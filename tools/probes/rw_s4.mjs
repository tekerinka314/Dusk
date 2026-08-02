// Mobile rework slice 4 probe — modals fit viewport (portrait/landscape/keyboard).
import { serve, launch, openApp, ensureShots } from './lib.mjs';
import { richSeed } from './seed.mjs';
import path from 'path';

const { srv, port } = await serve();
const browser = await launch();
const dir = ensureShots('rework');
const seed = richSeed();

const MODALS = [
  ['deadline', 'openDeadlineModal(2)'],
  ['repeat',   'openRepeatModal(2)'],
  ['prio',     'openPrioModal(2)'],
  ['color',    'openTaskColorModal(2)'],
  ['note',     'openNoteModal(12)'],
  ['rename',   'openRenameGroupModal(10)'],
];
const VPS = [
  { name: 'portrait', width: 412, height: 915 },
  { name: 'landscape', width: 915, height: 412 },
  { name: 'keyboard', width: 412, height: 460 },
];

for (const vp of VPS) {
  const dev = { width: vp.width, height: vp.height, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36' };
  const { ctx, page: p, errors } = await openApp(browser, { device: dev, page: 'main', seed, port });
  await p.waitForTimeout(2500);
  for (const [name, call] of MODALS) {
    const r = await p.evaluate(async (c) => {
      // eslint-disable-next-line no-eval
      eval(c);
      await new Promise(res => setTimeout(res, 450));
      const overlay = [...document.querySelectorAll('.modal-overlay')].find(o => !o.classList.contains('closing') && getComputedStyle(o).display !== 'none');
      if (!overlay) return { open: false };
      const modal = overlay.querySelector('.modal');
      const mr = modal.getBoundingClientRect();
      const btn = overlay.querySelector('.btn-modal-confirm, .btn-modal-danger, .btn-modal-cancel');
      let btnVis = null, btnHit = null;
      if (btn) {
        modal.scrollTop = modal.scrollHeight;   // confirm must be reachable INSIDE the scrollable box
        await new Promise(res => setTimeout(res, 60));
        const br = btn.getBoundingClientRect();
        btnVis = br.bottom <= innerHeight + 1 && br.top >= -1;
        const c2 = document.elementFromPoint(br.x + br.width / 2, br.y + br.height / 2);
        btnHit = btn === c2 || btn.contains(c2);
      }
      const fits = mr.height <= innerHeight - 10;
      // close it
      const closeBtn = overlay.querySelector('[data-act*="close" i], .btn-modal-cancel');
      if (closeBtn) closeBtn.click(); else overlay.remove();
      await new Promise(res => setTimeout(res, 250));
      return { open: true, fits, modalH: Math.round(mr.height), btnVis, btnHit };
    }, call);
    console.log(vp.name, name, JSON.stringify(r));
    if (name === 'deadline') await p.screenshot({ path: path.join(dir, `s4_${vp.name}_deadline.png`) });
  }
  if (errors.length) console.log(vp.name, 'CONSOLE ERRORS:', errors.slice(0, 5));
  await ctx.close();
}

await browser.close();
srv.close();
