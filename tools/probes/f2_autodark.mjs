// Forced-dark (Chrome Auto Dark Mode) verification.
// 1. Control: a plain LIGHT page must visibly darken under autodark emulation
//    (proves the CDP override actually works in this Chrome).
// 2. App: screenshot with autodark ON vs OFF must be (near-)identical —
//    color-scheme:dark opt-out means Chrome leaves the page alone.
import { serve, launch, openApp, ensureShots } from './lib.mjs';
import { richSeed } from './seed.mjs';
import fs from 'fs'; import path from 'path';

const { srv, port } = await serve();
const browser = await launch();
const dir = ensureShots('f2/autodark');

// ---------- control: light page ----------
const ctxC = await browser.newContext({ viewport: { width: 412, height: 915 } });
const pc = await ctxC.newPage();
await pc.setContent('<body style="background:#fff;color:#111;font:24px sans-serif"><h1>Control light page</h1><p>should invert under auto dark</p></body>');
const cdpC = await ctxC.newCDPSession(pc);
const shotC1 = await pc.screenshot();
await cdpC.send('Emulation.setAutoDarkModeOverride', { enabled: true });
await pc.waitForTimeout(300);
const shotC2 = await pc.screenshot();
fs.writeFileSync(path.join(dir, 'control_off.png'), shotC1);
fs.writeFileSync(path.join(dir, 'control_on.png'), shotC2);
console.log('control changed:', !shotC1.equals(shotC2));
await ctxC.close();

// ---------- app: autodark OFF ----------
const a = await openApp(browser, { device: 'pixel7', page: 'main', seed: richSeed(), port });
await a.page.waitForTimeout(1500);
await a.page.screenshot({ path: path.join(dir, 'app_off.png') });
await a.ctx.close();

// ---------- app: autodark ON ----------
const b = await openApp(browser, { device: 'pixel7', page: 'main', seed: richSeed(), port });
const cdpB = await b.ctx.newCDPSession(b.page);
await cdpB.send('Emulation.setAutoDarkModeOverride', { enabled: true });
await b.page.reload({ waitUntil: 'load' });
await b.page.waitForTimeout(1500);
await b.page.screenshot({ path: path.join(dir, 'app_on.png') });
// coffin pixel probe: sample computed styles of the checkbox glyph
const coffin = await b.page.evaluate(() => {
  const c = document.querySelector('.task-check');
  if (!c) return null;
  const cs = getComputedStyle(c);
  return { bg: cs.backgroundColor, border: cs.borderColor, colorScheme: getComputedStyle(document.documentElement).colorScheme };
});
console.log('coffin under autodark:', JSON.stringify(coffin));
if (b.errors.length) console.log('ERRORS:', b.errors.slice(0, 5));
await b.ctx.close();

await browser.close(); srv.close();
console.log('done →', dir);
