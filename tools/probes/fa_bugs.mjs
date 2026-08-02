// Ф-А probe — two user-reported device bugs:
//  1) long-press hint vanishes instantly when the finger rolls >8px after the
//     hint fired (pointermove slop kills it) or on pointercancel;
//  2) sort dropdown portal overflows the LEFT viewport edge when its trigger
//     sits near the left (right-edge anchor, no left clamp in _spPlace).
// Run: node fa_bugs.mjs   (from D:\tmp\pw\b1, dist/ must be built)
import { serve, launch, openApp } from './lib.mjs';
import { richSeed } from './seed.mjs';

const { srv, port } = await serve();
const browser = await launch();
const { ctx, page: p, errors } = await openApp(browser, { device: 'small', page: 'main', seed: richSeed(), port });
await p.waitForTimeout(1800);
let pass = 0, fail = 0;
const check = (name, ok) => { console.log(ok ? 'PASS' : 'FAIL', name); ok ? pass++ : fail++; };
const cdp = await ctx.newCDPSession(p);
const touch = (type, x, y) => cdp.send('Input.dispatchTouchEvent', {
  type, touchPoints: type === 'touchEnd' || type === 'touchCancel' ? [] : [{ x, y }],
});
const hintVisible = () => p.evaluate(() => {
  const h = document.querySelector('.lp-hint');
  return !!h && !h.classList.contains('lp-hint-out');
});

// A titled toolbar button that is NOT armed/drag — use the sort trigger (also
// lets us assert click suppression: a leaked click would open the sort portal).
const btnRect = await p.evaluate(() => {
  const b = document.querySelector('#btn-sort-mode');
  b.scrollIntoView({ block: 'center' });
  const r = b.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
});

// ── 1A: plain hold → hint appears and lingers after release ──
await touch('touchStart', btnRect.x, btnRect.y);
await p.waitForTimeout(650);
check('1A hint appears after 480ms hold', await hintVisible());
await touch('touchEnd');
await p.waitForTimeout(150);
check('1A hint lingers after release', await hintVisible());
check('1A release did not click (no sort portal)', await p.evaluate(() => !document.querySelector('.task-sort-portal')));
await p.waitForTimeout(1600);
check('1A hint gone after linger', !(await hintVisible()));

// ── 1B: hold → hint fires → finger ROLLS 14px → hint must survive ──
await touch('touchStart', btnRect.x, btnRect.y);
await p.waitForTimeout(650);
await touch('touchMove', btnRect.x + 10, btnRect.y + 10);
await p.waitForTimeout(120);
check('1B hint survives finger roll after firing', await hintVisible());
await touch('touchEnd');
await p.waitForTimeout(150);
check('1B roll+release still suppresses the click', await p.evaluate(() => !document.querySelector('.task-sort-portal')));
await p.waitForTimeout(1600);

// ── 1C: hold → hint fires → pointercancel → hint lingers (not instant kill) ──
await touch('touchStart', btnRect.x, btnRect.y);
await p.waitForTimeout(650);
await touch('touchCancel');
await p.waitForTimeout(200);
check('1C hint lingers after pointercancel', await hintVisible());
await p.waitForTimeout(1600);

// ── 1E: THIRD device mechanism — Android fires contextmenu at ~500ms of the
// native long-press; unless the page calls preventDefault the browser takes
// the gesture and pointercancels the stream (kills the hint mid-hold). The
// app must prevent contextmenu while a long-press is engaged. CDP touch can't
// trigger the native gesture, so assert the contract on a synthetic event.
await touch('touchStart', btnRect.x, btnRect.y);
await p.waitForTimeout(520);   // hint fired at 480, native long-press would land ~now
const prevented = await p.evaluate(() => {
  const b = document.querySelector('#btn-sort-mode');
  const ev = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });
  b.dispatchEvent(ev);
  return ev.defaultPrevented;
});
check('1E contextmenu prevented during engaged long-press', prevented);
check('1E hint still visible after contextmenu', await hintVisible());
await touch('touchEnd');
await p.waitForTimeout(1600);

// ── 1F: contextmenu with NO long-press engaged (desktop right-click) stays native ──
const preventedIdle = await p.evaluate(() => {
  const ev = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });
  document.body.dispatchEvent(ev);
  return ev.defaultPrevented;
});
check('1F idle contextmenu NOT prevented', !preventedIdle);

// ── 1D: quick tap stays a click (no hint, no suppression) ──
await touch('touchStart', btnRect.x, btnRect.y);
await p.waitForTimeout(120);
await touch('touchEnd');
await p.waitForTimeout(300);
const tapped = await p.evaluate(() => !!document.querySelector('.task-sort-portal'));
check('1D quick tap still clicks (sort portal opened)', tapped);
await p.keyboard.press('Escape');
await p.waitForTimeout(300);

// ── 2: sort portal must stay inside the viewport for EVERY trigger ──
const triggers = await p.evaluate(() => {
  const out = [];
  document.querySelectorAll('#btn-sort-mode, .btn-group-sort').forEach((b, i) => {
    b.setAttribute('data-fa-probe', String(i));
    out.push({ sel: `[data-fa-probe="${i}"]`, right: Math.round(b.getBoundingClientRect().right) });
  });
  return out;
});
for (const t of triggers) {
  const geo = await p.evaluate(sel => {
    const b = document.querySelector(sel);
    b.scrollIntoView({ block: 'center' });
    b.click();
    const l = document.querySelector('.task-sort-portal');
    if (!l) return null;
    const r = l.getBoundingClientRect();
    const res = { left: Math.round(r.left), right: Math.round(r.right), vw: window.innerWidth };
    return res;
  }, t.sel);
  check(`2 portal in viewport for trigger@right=${t.right} (got ${geo ? geo.left + '..' + geo.right + '/' + geo.vw : 'none'})`,
    !!geo && geo.left >= 0 && geo.right <= geo.vw);
  await p.keyboard.press('Escape');
  await p.waitForTimeout(250);
}

// ── 3: async (sync-style) render must NOT tear down live transient chrome ──
await p.evaluate(() => document.querySelector('#btn-sort-mode').click());
await p.waitForTimeout(250);
await p.evaluate(() => { render(); renderListOnly && renderListOnly(); });
await p.waitForTimeout(250);
check('3 async render keeps sort portal open', await p.evaluate(() => !!document.querySelector('.task-sort-portal')));
await p.keyboard.press('Escape');
await p.waitForTimeout(250);

await touch('touchStart', btnRect.x, btnRect.y);
await p.waitForTimeout(200);
await p.evaluate(() => render());          // sync lands mid-hold
await p.waitForTimeout(450);               // 480ms total hold
check('3 hint still fires when render lands mid-hold', await hintVisible());
await touch('touchEnd');
await p.waitForTimeout(100);
await p.evaluate(() => render());          // sync lands mid-linger
await p.waitForTimeout(150);
check('3 hint survives render mid-linger', await hintVisible());
await p.waitForTimeout(1600);

console.log(`RESULT ${pass} pass / ${fail} fail`);
if (errors.length) console.log('CONSOLE ERRORS:', errors.slice(0, 8)); else console.log('no console errors');
await ctx.close(); await browser.close(); srv.close();
