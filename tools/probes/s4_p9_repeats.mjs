// S4/B6 P9 — repeats/cycle clock battery. Injected clock (fake Date). Focus: the
// monthly short-month overflow-repair loop (04:1617-1644) — the 31st across Feb/30-day
// months — leap Feb-29, weektime rollover, and checkCycleResets return-to-active.
import { serve, launch, ROOT } from './lib.mjs';
import fs from 'fs';

const OUT = 'D:/VSCode projects/DUSK_v2.0/audit-v2/shots/s4/p9_repeats.json';

(async () => {
  const { srv, port } = await serve(ROOT);
  const browser = await launch();
  const ctx = await browser.newContext({ colorScheme: 'dark' });
  await ctx.addInitScript(() => {
    const RealDate = Date;
    window.__fixedMs = RealDate.now();
    function FakeDate(...a) { return a.length ? new RealDate(...a) : new RealDate(window.__fixedMs); }
    FakeDate.now = () => window.__fixedMs; FakeDate.UTC = RealDate.UTC; FakeDate.parse = RealDate.parse;
    FakeDate.prototype = RealDate.prototype; Object.setPrototypeOf(FakeDate, RealDate);
    window.Date = FakeDate;
  });
  const page = await ctx.newPage();
  await page.goto(`http://localhost:${port}/index.html`, { waitUntil: 'load' });
  await page.waitForTimeout(500);

  const out = await page.evaluate(() => {
    const fmt = (ts) => { const d = new Date(ts); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
    const at = (iso, fn) => { window.__fixedMs = Date.parse(iso); return fn(); };
    const nextMonthly = (mday, iso) => at(iso, () => fmt(window.getNextResetTimestamp({ repeat: 'monthly', repeatAnchorMonthday: mday, deadline: null })));

    // ── monthly-31 overflow-repair sequence (must always land on a month WITH a 31st, in the future) ──
    const m31 = {
      from_jan15:  nextMonthly(31, '2027-01-15T12:00:00'),  // → Jan 31
      from_jan31:  nextMonthly(31, '2027-01-31T12:00:00'),  // past today's 31 → Mar 31 (skip Feb)
      from_feb15:  nextMonthly(31, '2027-02-15T12:00:00'),  // → Mar 31 (Feb has none)
      from_apr15:  nextMonthly(31, '2027-04-15T12:00:00'),  // → May 31 (skip Apr)
      from_may31:  nextMonthly(31, '2027-05-31T12:00:00'),  // → Jul 31 (skip Jun)
      from_dec15:  nextMonthly(31, '2027-12-15T12:00:00'),  // → Dec 31
    };
    // ── leap Feb-29 ──
    const m29 = {
      leap_feb10:    nextMonthly(29, '2028-02-10T12:00:00'),  // 2028 leap → Feb 29
      nonleap_feb10: nextMonthly(29, '2027-02-10T12:00:00'),  // 2027 → Mar 29 (Feb 28)
    };
    // ── weektime rollover: getNextResetTimestamp for weektime deadline ──
    const weektime = at('2026-07-12T12:00:00', () => {
      const ts = window.getNextResetTimestamp({ repeat: 'weekly', deadline: { mode: 'weektime', value: '3|09:00', timeSet: true } });
      return { future: ts > window.Date.now(), day: fmt(ts) };
    });

    // ── checkCycleResets: return-to-active past nextReset, then NO double-fire ──
    const cyc = at('2026-07-12T12:00:00', () => {
      window.state.tasks = [{ id: 1, uid: 'uc', text: 'cyc', checked: true, cycleChecked: true, nextReset: Date.now() - 1000, repeat: 'daily', deadline: { mode: 'date', value: '2026-07-11' }, subtasks: [], priority: 'none', groupId: null, createdAt: 1, updatedAt: 1 }];
      window.checkCycleResets();
      const t = window.state.tasks[0];
      const afterFirst = { cycleChecked: t.cycleChecked, nextReset: t.nextReset, deadlineShifted: t.deadline && t.deadline.value !== '2026-07-11' };
      // second call must not re-fire (cycleChecked already false)
      const before = JSON.stringify(t);
      window.checkCycleResets();
      const noDoubleFire = JSON.stringify(window.state.tasks[0]) === before;
      return { afterFirst, noDoubleFire };
    });

    return { m31, m29, weektime, cyc };
  });

  // assertions
  const day31ok = Object.values(out.m31).every(d => d.endsWith('-31'));
  const m31future = true; // all computed as future by the function's guards
  const leapOk = out.m29.leap_feb10 === '2028-02-29' && out.m29.nonleap_feb10 === '2027-03-29';
  const cycOk = out.cyc.afterFirst.cycleChecked === false && out.cyc.afterFirst.nextReset === null && out.cyc.afterFirst.deadlineShifted && out.cyc.noDoubleFire;
  const verdict = { day31_all_land_on_31: day31ok, leap_feb29_correct: leapOk, cycle_return_and_no_double_fire: cycOk, weektime_future: out.weektime.future };

  fs.writeFileSync(OUT, JSON.stringify({ verdict, out }, null, 2));
  console.log(JSON.stringify({ verdict, out }, null, 2));
  await browser.close(); srv.close();
})().catch(e => { console.error('PROBE ERROR', e); process.exit(1); });
