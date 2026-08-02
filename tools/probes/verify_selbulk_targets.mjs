import { serve, launch, openApp } from './lib.mjs';
import { richSeed } from './seed.mjs';

function measureBar(p, barSel) {
  return p.evaluate((barSel) => {
    const cw = document.documentElement.clientWidth;
    const bar = document.querySelector(barSel);
    if (!bar) return { present: false };
    const cs = getComputedStyle(bar);
    // grab every actionable control inside the bar
    const ctrls = [...bar.querySelectorAll('button, .sb-btn, .btn-select-bar-cancel, .btn-select-bar-restore, .btn-select-bar-delete')];
    const seen = new Set();
    const out = [];
    for (const el of ctrls) {
      if (seen.has(el)) continue; seen.add(el);
      const r = el.getBoundingClientRect();
      const st = getComputedStyle(el);
      out.push({
        cls: (el.className || '').toString(),
        w: Math.round(r.width * 10) / 10,
        h: Math.round(r.height * 10) / 10,
        display: st.display,
        minH: st.minHeight,
        minW: st.minWidth,
        pad: st.padding,
      });
    }
    return { present: true, cw, barDisplay: cs.display, controls: out };
  }, barSel);
}

(async () => {
  const { srv, port } = await serve();
  const b = await launch();

  for (const device of ['pixel7', 'small']) {
    // ---- MAIN SELECT BAR ----
    {
      const { ctx, page: p } = await openApp(b, { device, page: 'main', seed: richSeed(), port });
      await p.waitForTimeout(500);
      const eng = await p.evaluate(() => { try { toggleMainSelectMode(); return true; } catch(e){ return 'ERR:'+e.message; } });
      await p.waitForTimeout(250);
      await p.evaluate(() => { state.tasks.slice(0,3).forEach(t => { try { toggleMainSelectTask(t.id); } catch(e){} }); });
      await p.waitForTimeout(300);
      const m = await measureBar(p, '#main-select-bar');
      console.log(`\n=== MAIN [${device}] eng=${eng} cw=${m.cw} barDisplay=${m.barDisplay} ===`);
      for (const c of (m.controls||[])) console.log(`  ${c.w}x${c.h} display=${c.display} minH=${c.minH} pad=[${c.pad}]  ${c.cls}`);
      await ctx.close();
    }
    // ---- GRIM SELECT BAR (default = grimoire mode) ----
    {
      const { ctx, page: p } = await openApp(b, { device, page: 'notes', seed: richSeed(), port });
      await p.waitForTimeout(600);
      const eng = await p.evaluate(() => { try { grimToggleSelectMode(); return true; } catch(e){ return 'ERR:'+e.message; } });
      await p.waitForTimeout(250);
      await p.evaluate(() => { ['n1','n2','n3'].forEach(id => { try { grimToggleSelectNote(id); } catch(e){} }); });
      await p.waitForTimeout(300);
      const m = await measureBar(p, '#grim-select-bar');
      console.log(`\n=== GRIM(grimoire) [${device}] eng=${eng} cw=${m.cw} barDisplay=${m.barDisplay} ===`);
      for (const c of (m.controls||[])) console.log(`  ${c.w}x${c.h} display=${c.display} minH=${c.minH} pad=[${c.pad}]  ${c.cls}`);
      await ctx.close();
    }
    // ---- GRIM SELECT BAR in ARCHIVE (crypt) mode — restore button should be visible ----
    {
      const { ctx, page: p } = await openApp(b, { device, page: 'notes', seed: richSeed(), port });
      await p.waitForTimeout(600);
      const modeRes = await p.evaluate(() => { try { grimSetMode('archive'); return true; } catch(e){ return 'ERR:'+e.message; } });
      await p.waitForTimeout(300);
      const eng = await p.evaluate(() => { try { grimToggleSelectMode(); return true; } catch(e){ return 'ERR:'+e.message; } });
      await p.waitForTimeout(250);
      await p.evaluate(() => { ['na1','na2'].forEach(id => { try { grimToggleSelectNote(id); } catch(e){} }); });
      await p.waitForTimeout(300);
      const m = await measureBar(p, '#grim-select-bar');
      console.log(`\n=== GRIM(archive) [${device}] mode=${modeRes} eng=${eng} cw=${m.cw} ===`);
      for (const c of (m.controls||[])) console.log(`  ${c.w}x${c.h} display=${c.display} minH=${c.minH} pad=[${c.pad}]  ${c.cls}`);
      await ctx.close();
    }
  }

  await b.close(); srv.close();
})().catch(e => { console.error('CRASH', e); process.exit(2); });
