// B1 a11y surface — REDUCED MOTION audit on main + notes.
// Verifies animations are actually suppressed and no row is stuck invisible.
import { serve, launch, ensureShots, SHOTS } from './lib.mjs';
import { richSeed } from './seed.mjs';
import path from 'path';

const UA = 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36';

async function ctxFor(b, pageName, seed) {
  const ctx = await b.newContext({
    viewport: { width: 412, height: 915 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
    reducedMotion: 'reduce', colorScheme: 'dark', userAgent: UA,
  });
  const p = await ctx.newPage();
  const errors = [];
  p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  p.on('pageerror', e => errors.push('PAGEERR ' + e.message));
  await p.addInitScript(([st, pg]) => {
    try { localStorage.clear(); } catch (e) {}
    localStorage.setItem('duskState_v4', JSON.stringify(st));
    localStorage.setItem('currentPage', pg);
    localStorage.setItem('isFiltered', '0');
    try { indexedDB.deleteDatabase('keyval-store'); } catch (e) {}
  }, [seed, pageName]);
  return { ctx, p, errors };
}

(async () => {
  ensureShots();
  const { srv, port } = await serve();
  const b = await launch();

  // Confirm the emulated media query is really 'reduce'
  for (const pg of ['main', 'notes']) {
    const { ctx, p, errors } = await ctxFor(b, pg, richSeed());
    await p.goto(`http://localhost:${port}/index.html`, { waitUntil: 'load' });
    await p.waitForTimeout(900);

    const mq = await p.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches);

    // 1) Enumerate every TRULY-RUNNING + VISIBLE CSS animation still present under reduced motion.
    const running = await p.evaluate(() => {
      const out = [];
      const vis = (el) => {
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && parseFloat(cs.opacity) > 0.02 && el.offsetParent !== null;
      };
      document.querySelectorAll('*').forEach(el => {
        const anims = el.getAnimations ? el.getAnimations() : [];
        anims.forEach(a => {
          if (a.playState !== 'running') return;
          const eff = a.effect && a.effect.getComputedTiming ? a.effect.getComputedTiming() : {};
          out.push({
            cls: (el.className || el.tagName).toString().split(/\s+/).slice(0, 2).join('.'),
            name: a.animationName, visible: vis(el),
            iter: eff.iterations === Infinity ? 'INF' : eff.iterations,
            dur: Math.round(eff.duration || 0),
          });
        });
      });
      return out;
    });

    // 2) Any visible task/subtask/note row stuck below full opacity (not intentionally checked)?
    const faded = await p.evaluate(() => {
      const sel = '.task-item, .subtask-item, .grim-leaf, .group-section';
      const res = [];
      document.querySelectorAll(sel).forEach(el => {
        const cs = getComputedStyle(el);
        const op = parseFloat(cs.opacity);
        const r = el.getBoundingClientRect();
        const checked = el.classList.contains('checked') || el.classList.contains('cycle-checked');
        if (op < 0.9 && r.width > 0 && r.height > 0 && !checked) {
          res.push({ cls: el.className.toString().split(/\s+/).slice(0, 2).join('.'), op, vis: cs.visibility, disp: cs.display });
        }
      });
      return res;
    });

    console.log(`\n=== ${pg} | mq(reduce)=${mq} ===`);
    console.log(`RUNNING-ANIM count=${running.length}`, JSON.stringify(running.slice(0, 20)));
    console.log(`FADED-ROWS (op<0.9, not checked) count=${faded.length}`, JSON.stringify(faded.slice(0, 12)));
    console.log('ERRORS', errors.slice(0, 5));
    await p.screenshot({ path: path.join(SHOTS, `B1w_rm_${pg}.png`) });
    await ctx.close();
  }

  // 3) ENTERING-STUCK test on main: add a fresh task under reduced motion, verify it ends visible.
  {
    const { ctx, p } = await ctxFor(b, 'main', richSeed());
    await p.goto(`http://localhost:${port}/index.html`, { waitUntil: 'load' });
    await p.waitForTimeout(700);
    await p.evaluate(() => {
      const i = document.getElementById('input-box');
      i.value = 'НОВАЯ задача под reduced-motion';
      i.focus();
    });
    await p.evaluate(() => { if (typeof addTask === 'function') addTask(); });
    // sample immediately (0ms) and after a beat — a stuck-invisible bug shows at 0ms and never recovers
    const immediate = await p.evaluate(() => {
      const rows = [...document.querySelectorAll('.task-item')];
      const nw = rows.find(r => (r.textContent || '').includes('НОВАЯ задача под reduced'));
      if (!nw) return { found: false };
      const cs = getComputedStyle(nw);
      const anims = nw.getAnimations ? nw.getAnimations().map(a => a.animationName + ':' + a.playState) : [];
      return { found: true, op: parseFloat(cs.opacity), anim: cs.animationName, entering: nw.classList.contains('entering'), anims };
    });
    await p.waitForTimeout(500);
    const after = await p.evaluate(() => {
      const rows = [...document.querySelectorAll('.task-item')];
      const nw = rows.find(r => (r.textContent || '').includes('НОВАЯ задача под reduced'));
      if (!nw) return { found: false };
      const cs = getComputedStyle(nw);
      return { found: true, op: parseFloat(cs.opacity), entering: nw.classList.contains('entering'), vis: cs.visibility };
    });
    console.log('\n=== ENTERING-STUCK test ===');
    console.log('immediate', JSON.stringify(immediate));
    console.log('after500ms', JSON.stringify(after));
    await p.screenshot({ path: path.join(SHOTS, 'B1w_rm_entering.png') });
    await ctx.close();
  }

  await b.close(); srv.close();
})().catch(e => { console.error('CRASH', e); process.exit(2); });
