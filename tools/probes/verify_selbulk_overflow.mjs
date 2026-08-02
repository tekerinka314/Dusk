import { serve, launch, openApp } from './lib.mjs';
import { richSeed } from './seed.mjs';

// Measure page-level overflow: which elements extend past clientWidth, and whether
// select mode changes anything vs baseline. This directly tests the candidate claim
// that the overflow is the group pill (dup of V2-B1-05), NOT the select bar.
async function measurePage(p) {
  return await p.evaluate(() => {
    const cw = document.documentElement.clientWidth;
    const off = [...document.querySelectorAll('*')].map(e => ({
      t: (e.className || '').toString().split(' ').filter(Boolean).slice(0, 3).join('.'),
      tag: e.tagName.toLowerCase(),
      r: Math.round(e.getBoundingClientRect().right),
      w: Math.round(e.getBoundingClientRect().width),
    })).filter(o => o.r > cw + 1).sort((a, b) => b.r - a.r).slice(0, 8);
    const bar = document.querySelector('#main-select-bar');
    const barVisible = bar ? getComputedStyle(bar).display !== 'none' && bar.getBoundingClientRect().height > 0 : false;
    const barRect = bar ? bar.getBoundingClientRect() : null;
    return {
      clientW: cw,
      scrollW: document.documentElement.scrollWidth,
      bodyScrollW: document.body.scrollWidth,
      pageOverflow: document.documentElement.scrollWidth > cw + 1,
      overRight: document.documentElement.scrollWidth - cw,
      offenders: off,
      barPresent: !!bar,
      barVisible,
      barRight: barRect ? Math.round(barRect.right) : null,
      barOver: barRect ? Math.round(barRect.right) - cw : null,
    };
  });
}

(async () => {
  const { srv, port } = await serve();
  const b = await launch();

  const device = 'small'; // 360x800

  // ---- BASELINE: no select mode ----
  const { ctx: c1, page: p1 } = await openApp(b, { device, page: 'main', seed: richSeed(), port });
  await p1.waitForTimeout(500);
  const base = await measurePage(p1);
  console.log('\n=== BASELINE (no select mode) [small 360] ===');
  console.log(JSON.stringify(base, null, 1));
  await c1.close();

  // ---- SELECT MODE engaged + 3 tasks selected ----
  const { ctx: c2, page: p2 } = await openApp(b, { device, page: 'main', seed: richSeed(), port });
  await p2.waitForTimeout(500);
  const engaged = await p2.evaluate(() => { try { toggleMainSelectMode(); return true; } catch (e) { return 'ERR:' + e.message; } });
  await p2.waitForTimeout(300);
  const selRes = await p2.evaluate(() => {
    const ids = state.tasks.slice(0, 3).map(t => t.id);
    ids.forEach(id => { try { toggleMainSelectTask(id); } catch (e) {} });
    return ids;
  });
  await p2.waitForTimeout(300);
  const sel = await measurePage(p2);
  console.log(`\n=== SELECT MODE (engaged=${engaged}, selected=${JSON.stringify(selRes)}) [small 360] ===`);
  console.log(JSON.stringify(sel, null, 1));

  // Extra: temporarily cap the group pill and re-measure to prove it is the SOLE offender
  const afterCap = await p2.evaluate(() => {
    const st = document.createElement('style');
    st.textContent = '.meta-tag.group-pill{max-width:120px!important;overflow:hidden!important;text-overflow:ellipsis!important;}';
    document.head.appendChild(st);
    const cw = document.documentElement.clientWidth;
    return { clientW: cw, scrollW: document.documentElement.scrollWidth, pageOverflow: document.documentElement.scrollWidth > cw + 1 };
  });
  console.log('\n=== SELECT MODE after capping .group-pill max-width ===');
  console.log(JSON.stringify(afterCap, null, 1));

  await p2.screenshot({ path: 'D:/VSCode projects/DUSK_v2.0/audit-v2/shots/B1w_verify_selbulk_small.png' });
  await c2.close();

  await b.close(); srv.close();
})().catch(e => { console.error('CRASH', e); process.exit(2); });
