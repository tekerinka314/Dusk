import { serve, launch, ROOT } from './lib.mjs';
(async () => {
  const { srv, port } = await serve(ROOT);
  const b = await launch();
  const ctx = await b.newContext({ colorScheme: 'dark' });
  const p = await ctx.newPage();
  await p.goto(`http://localhost:${port}/index.html`, { waitUntil: 'load' });
  await p.waitForTimeout(400);
  const r = await p.evaluate(() => {
    const tzOffMin = new Date().getTimezoneOffset(); // minutes; negative = east of UTC
    const shifted = window.shiftDeadline({ mode: 'date', value: '2026-07-11' }, 'daily');
    const shiftedWeekly = window.shiftDeadline({ mode: 'date', value: '2026-07-11' }, 'weekly');
    // how does the app normally MINT a date value? _ymd (quick-add) if present
    let ymdOfJul12 = null;
    try { ymdOfJul12 = window._ymd ? window._ymd(new Date('2026-07-12T00:00:00')) : 'no _ymd'; } catch (e) { ymdOfJul12 = 'err'; }
    return { tzOffMin, shiftedDaily: shifted.value, shiftedWeekly: shiftedWeekly.value, ymdOfJul12 };
  });
  console.log(JSON.stringify(r, null, 2));
  await b.close(); srv.close();
})();
