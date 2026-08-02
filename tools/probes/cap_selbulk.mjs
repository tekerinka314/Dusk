import { serve, launch, openApp, ensureShots } from './lib.mjs';
import { richSeed } from './seed.mjs';

// Measure a bar element: rect, overflow vs viewport, wrap (rows), and per-button tap sizes.
async function measureBar(p, barSel, btnSel) {
  return await p.evaluate(([barSel, btnSel]) => {
    const cw = document.documentElement.clientWidth;
    const bar = document.querySelector(barSel);
    if (!bar) return { present: false };
    const r = bar.getBoundingClientRect();
    const btns = [...bar.querySelectorAll(btnSel)];
    // group buttons by rounded top to count visual rows
    const tops = {};
    const sizes = btns.map(b => {
      const br = b.getBoundingClientRect();
      const key = Math.round(br.top);
      tops[key] = (tops[key] || 0) + 1;
      return { cls: (b.className||'').split(' ').slice(-1)[0], w: Math.round(br.width), h: Math.round(br.height), top: Math.round(br.top), right: Math.round(br.right), overV: Math.round(br.right) > cw + 1 || Math.round(br.left) < -1 };
    });
    // overflow offenders inside the bar
    const off = [...bar.querySelectorAll('*')].map(e => ({ t: (e.className||'').toString().split(' ')[0], r: Math.round(e.getBoundingClientRect().right) })).filter(o => o.r > cw + 1).sort((a,b)=>b.r-a.r).slice(0,5);
    return {
      present: true,
      clientW: cw,
      bar: { top: Math.round(r.top), left: Math.round(r.left), right: Math.round(r.right), width: Math.round(r.width), height: Math.round(r.height), overRight: Math.round(r.right) - cw },
      rows: Object.keys(tops).length,
      rowCounts: tops,
      btnCount: btns.length,
      minBtn: btns.length ? Math.min(...sizes.map(s=>Math.min(s.w,s.h))) : null,
      sizes,
      overflowOffenders: off,
      // page-level horizontal scroll?
      docScrollW: document.documentElement.scrollWidth,
      docClientW: cw,
      pageOverflow: document.documentElement.scrollWidth > cw + 1,
    };
  }, [barSel, btnSel]);
}

(async () => {
  const dir = ensureShots();
  const { srv, port } = await serve();
  const b = await launch();

  for (const device of ['small', 'pixel7']) {
    // ---- MAIN SELECT BAR ----
    {
      const { ctx, page: p } = await openApp(b, { device, page: 'main', seed: richSeed(), port });
      await p.waitForTimeout(500);
      // engage select mode
      const engaged = await p.evaluate(() => { try { toggleMainSelectMode(); return true; } catch(e){ return 'ERR:'+e.message; } });
      await p.waitForTimeout(300);
      // select 3 tasks
      const selRes = await p.evaluate(() => {
        const ids = state.tasks.slice(0,3).map(t=>t.id);
        ids.forEach(id => { try { toggleMainSelectTask(id); } catch(e){} });
        return ids;
      });
      await p.waitForTimeout(300);
      const m = await measureBar(p, '#main-select-bar', '.sb-btn, .btn-select-bar-cancel');
      console.log(`\n=== MAIN SELECT BAR [${device}] engaged=${engaged} selected=${JSON.stringify(selRes)} ===`);
      console.log(JSON.stringify(m, null, 1));
      await p.screenshot({ path: `${dir}/B1w_selbulk_main_${device}.png` });
      // also a tight element shot of the bar
      try { await p.locator('#main-select-bar').screenshot({ path: `${dir}/B1w_selbulk_mainbar_${device}.png` }); } catch(e){ console.log('barshot err', e.message); }
      await ctx.close();
    }

    // ---- GRIM SELECT BAR ----
    {
      const { ctx, page: p } = await openApp(b, { device, page: 'notes', seed: richSeed(), port });
      await p.waitForTimeout(600);
      const engaged = await p.evaluate(() => { try { grimToggleSelectMode(); return true; } catch(e){ return 'ERR:'+e.message; } });
      await p.waitForTimeout(300);
      const selRes = await p.evaluate(() => {
        const done = [];
        ['n1','n2','n3'].forEach(id => { try { grimToggleSelectNote(id); done.push(id); } catch(e){ done.push(id+':ERR'); } });
        return done;
      });
      await p.waitForTimeout(300);
      const m = await measureBar(p, '#grim-select-bar', '.sb-btn, .btn-select-bar-cancel');
      console.log(`\n=== GRIM SELECT BAR [${device}] engaged=${engaged} selected=${JSON.stringify(selRes)} ===`);
      console.log(JSON.stringify(m, null, 1));
      await p.screenshot({ path: `${dir}/B1w_selbulk_grim_${device}.png` });
      try { await p.locator('#grim-select-bar').screenshot({ path: `${dir}/B1w_selbulk_grimbar_${device}.png` }); } catch(e){ console.log('barshot err', e.message); }
      // Also test archive segment (restore button swaps in) — grimSetMode archive then select
      await ctx.close();
    }
  }

  await b.close(); srv.close();
})().catch(e => { console.error('CRASH', e); process.exit(2); });
