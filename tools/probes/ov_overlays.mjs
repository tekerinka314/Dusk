// B1 overlays audit — Grimuar history «Летопись», table popover + structure seal,
// callout menu, sync panel. Measures placement/fit/clip/flip/scroll on touch mobile.
import { serve, launch, openApp, ensureShots } from './lib.mjs';
import { richSeed } from './seed.mjs';

const VP = () => ({ cw: document.documentElement.clientWidth, ch: document.documentElement.clientHeight,
  sw: document.documentElement.scrollWidth, sh: document.documentElement.scrollHeight });

const RECT = (sel) => {
  const el = document.querySelector(sel); if (!el) return null;
  const r = el.getBoundingClientRect();
  const cs = getComputedStyle(el);
  return { sel, left: Math.round(r.left), top: Math.round(r.top), right: Math.round(r.right),
    bottom: Math.round(r.bottom), w: Math.round(r.width), h: Math.round(r.height),
    overflowY: cs.overflowY, maxH: cs.maxHeight, scrollH: el.scrollHeight, clientH: el.clientHeight,
    opacity: cs.opacity, pointerEvents: cs.pointerEvents, position: cs.position,
    styleTop: el.style.top || '', styleBottom: el.style.bottom || '', styleLeft: el.style.left || '', styleMaxH: el.style.maxHeight || '' };
};

const clipReport = (r, vp) => {
  if (!r) return 'MISSING';
  const out = [];
  if (r.left < 0) out.push(`clipLEFT ${r.left}`);
  if (r.top < 0) out.push(`clipTOP ${r.top}`);
  if (r.right > vp.cw + 1) out.push(`clipRIGHT ${r.right}>${vp.cw}`);
  if (r.bottom > vp.ch + 1) out.push(`clipBOTTOM ${r.bottom}>${vp.ch}`);
  if (r.scrollH > r.clientH + 2) out.push(`scrolls(${r.scrollH}>${r.clientH})`);
  return out.length ? out.join(' ') : 'fits';
};

(async () => {
  const dir = ensureShots();
  const { srv, port } = await serve();
  const b = await launch();
  const log = (s) => console.log(s);

  for (const dev of ['pixel7', 'small']) {
    // ============ 1. HISTORY «Летопись» ============
    {
      const { ctx, page: p, errors } = await openApp(b, { device: dev, page: 'notes', seed: richSeed(), port });
      await p.waitForTimeout(300);
      await p.evaluate(() => grimOpen('n1'));
      await p.waitForTimeout(300);
      await p.evaluate(() => grimOpenHistory('n1'));
      await p.waitForTimeout(500);
      const vp = await p.evaluate(VP);
      const modal = await p.evaluate(RECT, '.grim-hist-modal');
      const list = await p.evaluate(RECT, '.grim-hist-list');
      const pv = await p.evaluate(RECT, '.grim-hist-pv');
      const pvBody = await p.evaluate(RECT, '.grim-hist-pv-body');
      log(`\n[HISTORY ${dev}] vp=${JSON.stringify(vp)}`);
      log(`  modal ${JSON.stringify(modal && {w:modal.w,h:modal.h,top:modal.top,bottom:modal.bottom,left:modal.left,right:modal.right})} -> ${clipReport(modal, vp)}`);
      log(`  list  h=${list&&list.h} overflowY=${list&&list.overflowY} scroll=${list&&list.scrollH}>${list&&list.clientH}`);
      log(`  pv    h=${pv&&pv.h} ; pvBody overflowY=${pvBody&&pvBody.overflowY} scroll=${pvBody&&pvBody.scrollH}>${pvBody&&pvBody.clientH}`);
      log(`  errors=${errors.length}`);
      await p.screenshot({ path: `${dir}/B1w_hist_${dev}.png` });
      await ctx.close();
    }

    // ============ 2. TABLE popover (insert grid) + structure SEAL touch reachability ============
    {
      const { ctx, page: p } = await openApp(b, { device: dev, page: 'notes', seed: richSeed(), port });
      await p.waitForTimeout(300);
      await p.evaluate(() => grimOpen('n3'));
      await p.waitForTimeout(300);
      // pin toolbar open so the table button has a real on-screen rect (auto=hover, dead on touch)
      await p.evaluate(() => { grimBarMode = 'open'; try { _grimApplyBarMode(); } catch (e) {} });
      await p.waitForTimeout(250);
      const tblBtn = await p.evaluate(RECT, '.fmt-btn[data-cmd="table"]');
      // open the insert-size grid popover by calling with the real button as currentTarget
      await p.evaluate(() => { const btn = document.querySelector('.fmt-btn[data-cmd="table"]'); grimTableMenu({ currentTarget: btn, target: btn, stopPropagation(){}, preventDefault(){} }); });
      await p.waitForTimeout(200);
      const vp = await p.evaluate(VP);
      const pop = await p.evaluate(RECT, '#grim-table-pop');
      log(`\n[TABLE-POP ${dev}] tblBtn top=${tblBtn&&tblBtn.top} bottom=${tblBtn&&tblBtn.bottom} (bar pinned open)`);
      log(`  pop ${JSON.stringify(pop && {w:pop.w,h:pop.h,top:pop.top,bottom:pop.bottom,left:pop.left,right:pop.right})} -> ${clipReport(pop, vp)}`);
      await p.screenshot({ path: `${dir}/B1w_tablepop_${dev}.png` });
      // close popover
      await p.evaluate(() => { const x = document.getElementById('grim-table-pop'); if (x) x.remove(); });

      // --- structure SEAL touch reachability: tap the existing table, inspect .gtc-seal ---
      await p.evaluate(() => { const t = document.querySelector('#grim-body table'); if (t) { const r = t.getBoundingClientRect(); ['pointerdown','mousedown','mouseup','click'].forEach(tp => t.dispatchEvent(new MouseEvent(tp, {bubbles:true, clientX:r.left+20, clientY:r.top+15}))); } });
      await p.waitForTimeout(400);
      const seal = await p.evaluate(() => {
        const s = document.querySelector('#grim-detail .grim-tctl .gtc-seal');
        if (!s) return { present: false };
        const cs = getComputedStyle(s);
        return { present: true, show: s.classList.contains('gtc-show'), opacity: cs.opacity, pointerEvents: cs.pointerEvents };
      });
      // also simulate the touch-equivalent: does dispatching a plain click on the seal enter edit mode?
      const sealClickable = await p.evaluate(() => {
        const s = document.querySelector('#grim-detail .grim-tctl .gtc-seal');
        if (!s) return 'no-seal';
        const cs = getComputedStyle(s);
        return cs.pointerEvents === 'none' || cs.opacity === '0' ? 'BLOCKED(hidden+noPE)' : 'reachable';
      });
      log(`  structure-seal after tap: ${JSON.stringify(seal)} verdict=${sealClickable}`);
      await ctx.close();
    }

    // ============ 3. CALLOUT menu ============
    {
      const { ctx, page: p } = await openApp(b, { device: dev, page: 'notes', seed: richSeed(), port });
      await p.waitForTimeout(300);
      await p.evaluate(() => grimOpen('n5'));
      await p.waitForTimeout(300);
      await p.evaluate(() => { grimBarMode = 'open'; try { _grimApplyBarMode(); } catch (e) {} });
      await p.waitForTimeout(250);
      const coBtn = await p.evaluate(RECT, '.fmt-btn[data-cmd="callout"]');
      await p.evaluate(() => { const btn = document.querySelector('.fmt-btn[data-cmd="callout"]'); grimCalloutMenu({ currentTarget: btn, target: btn, stopPropagation(){}, preventDefault(){} }); });
      await p.waitForTimeout(200);
      const vp = await p.evaluate(VP);
      const pop = await p.evaluate(RECT, '#grim-co-pop');
      log(`\n[CALLOUT ${dev}] coBtn top=${coBtn&&coBtn.top} bottom=${coBtn&&coBtn.bottom} right=${coBtn&&coBtn.right}`);
      log(`  pop ${JSON.stringify(pop && {w:pop.w,h:pop.h,top:pop.top,bottom:pop.bottom,left:pop.left,right:pop.right})} -> ${clipReport(pop, vp)}`);
      await p.screenshot({ path: `${dir}/B1w_callout_${dev}.png` });
      await ctx.close();
    }

    // ============ 4. SYNC PANEL (bottom-left FAB, must flip UP) ============
    {
      const { ctx, page: p } = await openApp(b, { device: dev, page: 'main', seed: richSeed(), port });
      await p.waitForTimeout(400);
      const fab = await p.evaluate(RECT, '#sync-glyph-btn');
      await p.evaluate(() => { const btn = document.getElementById('sync-glyph-btn'); if (btn) btn.click(); });
      await p.waitForTimeout(300);
      const vp = await p.evaluate(VP);
      const panel = await p.evaluate(RECT, '.snooze-menu.sync-panel');
      log(`\n[SYNC ${dev}] fab ${JSON.stringify(fab && {top:fab.top,bottom:fab.bottom,left:fab.left})} vpH=${vp.ch}`);
      log(`  panel ${JSON.stringify(panel && {w:panel.w,h:panel.h,top:panel.top,bottom:panel.bottom,left:panel.left,right:panel.right,styleTop:panel.styleTop,styleBottom:panel.styleBottom,styleMaxH:panel.styleMaxH})}`);
      log(`  flip=${panel && panel.styleBottom ? 'UP(bottom-anchored)' : 'DOWN(top-anchored)'} -> ${clipReport(panel, vp)}`);
      await p.screenshot({ path: `${dir}/B1w_sync_${dev}.png` });
      // expand the log <details> — should NOT push panel off-screen (bottom-anchored) and should stay scrollable
      await p.evaluate(() => { const d = document.querySelector('.sync-panel .sync-panel-log'); if (d) d.open = true; });
      await p.waitForTimeout(250);
      const panel2 = await p.evaluate(RECT, '.snooze-menu.sync-panel');
      log(`  after log-expand: ${JSON.stringify(panel2 && {h:panel2.h,top:panel2.top,bottom:panel2.bottom,scrollH:panel2.scrollH,clientH:panel2.clientH,overflowY:panel2.overflowY})} -> ${clipReport(panel2, vp)}`);
      await p.screenshot({ path: `${dir}/B1w_sync_${dev}_logopen.png` });
      await ctx.close();
    }
  }

  // ============ 5. HISTORY in LANDSCAPE (tall modal, B1-06 clip risk) ============
  {
    const { ctx, page: p } = await openApp(b, { device: 'landscape', page: 'notes', seed: richSeed(), port });
    await p.waitForTimeout(300);
    await p.evaluate(() => grimOpen('n1'));
    await p.waitForTimeout(300);
    await p.evaluate(() => grimOpenHistory('n1'));
    await p.waitForTimeout(500);
    const vp = await p.evaluate(VP);
    const modal = await p.evaluate(RECT, '.grim-hist-modal');
    const list = await p.evaluate(RECT, '.grim-hist-list');
    log(`\n[HISTORY landscape] vp=${JSON.stringify(vp)}`);
    log(`  modal ${JSON.stringify(modal && {w:modal.w,h:modal.h,top:modal.top,bottom:modal.bottom})} -> ${clipReport(modal, vp)}`);
    log(`  list  h=${list&&list.h} overflowY=${list&&list.overflowY}`);
    await p.screenshot({ path: `${dir}/B1w_hist_landscape.png` });
    await ctx.close();
  }

  await b.close(); srv.close();
  log('\nDONE');
})().catch(e => { console.error('CRASH', e); process.exit(2); });
