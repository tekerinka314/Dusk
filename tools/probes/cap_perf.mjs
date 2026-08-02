import { serve, launch, openApp } from './lib.mjs';
import { perfSeed } from './seed.mjs';

(async () => {
  const { srv, port } = await serve();
  const b = await launch();
  for (const n of [200, 1000]) {
    const ctx = await b.newContext({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 7) Mobile' });
    const p = await ctx.newPage();
    const seed = perfSeed(n);
    await p.addInitScript((st) => { localStorage.clear(); localStorage.setItem('duskState_v4', JSON.stringify(st)); localStorage.setItem('currentPage', 'main'); try { indexedDB.deleteDatabase('keyval-store'); } catch (e) {} }, seed);
    // CPU throttle 4x via CDP
    const client = await ctx.newCDPSession(p);
    await client.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    const t0 = Date.now();
    await p.goto(`http://localhost:${port}/index.html`, { waitUntil: 'load' });
    await p.waitForSelector('.task-item', { timeout: 20000 });
    const bootMs = Date.now() - t0;
    const dom = await p.evaluate(() => ({ items: document.querySelectorAll('.task-item').length, scrollH: document.body.scrollHeight, nodes: document.querySelectorAll('*').length }));
    // scroll cost: measure time to programmatically scroll through the list in steps
    const st = Date.now();
    await p.evaluate(async () => { const step = window.innerHeight; const max = document.body.scrollHeight; for (let y = 0; y < Math.min(max, 8000); y += step) { window.scrollTo(0, y); await new Promise(r => requestAnimationFrame(r)); } });
    const scrollMs = Date.now() - st;
    console.log(`N=${n} (CPU4x): bootMs=${bootMs} items=${dom.items} domNodes=${dom.nodes} scrollH=${dom.scrollH} scroll8kMs=${scrollMs}`);
    await ctx.close();
  }
  await b.close(); srv.close();
})().catch(e => { console.error('CRASH', e); process.exit(2); });
