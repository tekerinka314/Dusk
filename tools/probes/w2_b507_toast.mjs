// W2-7 / V2-B5-07 — MEASUREMENT FIRST. Claim: the toast still runs a
// translate+scale animation under prefers-reduced-motion: reduce, while every
// other surface computes none/0s. Measure on dist under BOTH motion settings:
// computed animation-name/duration + the actual transform matrix sampled while
// the toast is on screen (the base .toast transform carries translateX(-50%),
// so "no transform" would be a bug of its own — the toast would jump right).
import { serve, launch, openApp } from './lib.mjs';
import { richSeed } from './seed.mjs';

const DESKTOP = { width: 1280, height: 900, deviceScaleFactor: 1, isMobile: false, hasTouch: false,
                  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36' };

const { srv, port } = await serve();
const browser = await launch();

async function probe(rm) {
  const { page } = await openApp(browser, { device: DESKTOP, page: 'main', seed: richSeed(), port });
  await page.emulateMedia({ reducedMotion: rm });
  await page.waitForTimeout(400);

  // fire a toast through the app's own API
  await page.evaluate(() => window.showToast('Проверка'));
  const samples = [];
  for (const t of [0, 60, 150, 260]) {
    await page.waitForTimeout(t === 0 ? 20 : 60);
    samples.push(await page.evaluate(() => {
      const el = document.querySelector('.toast');
      if (!el) return null;
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return { anim: cs.animationName, dur: cs.animationDuration, transform: cs.transform,
               opacity: +(+cs.opacity).toFixed(2),
               cx: Math.round(r.left + r.width / 2), w: Math.round(r.width) };
    }));
  }
  // hide phase: wait for the app to put .hide on and sample there too
  const hide = [];
  await page.waitForFunction(() => {
    const el = document.querySelector('.toast');
    return el && el.classList.contains('hide');
  }, null, { timeout: 8000 }).catch(() => {});
  for (let i = 0; i < 3; i++) {
    hide.push(await page.evaluate(() => {
      const el = document.querySelector('.toast');
      if (!el) return null;
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return { anim: cs.animationName, transform: cs.transform, opacity: +(+cs.opacity).toFixed(2),
               cx: Math.round(r.left + r.width / 2) };
    }));
    await page.waitForTimeout(70);
  }
  const vw = await page.evaluate(() => window.innerWidth);
  await page.context().close();
  return { samples, hide, vw };
}

for (const rm of ['no-preference', 'reduce']) {
  const { samples, hide, vw } = await probe(rm);
  console.log(`--- reducedMotion: ${rm} (viewport ${vw}) ---`);
  console.log('  show:'); for (const s of samples) console.log('   ', JSON.stringify(s));
  console.log('  hide:'); for (const s of hide) console.log('   ', JSON.stringify(s));
  const all = [...samples, ...hide].filter(Boolean);
  const last = samples[samples.length - 1];
  const moved = new Set(all.map(s => s.transform)).size > 1;
  const faded = new Set(all.map(s => s.opacity)).size > 1;
  const centred = all.every(s => Math.abs(s.cx - vw / 2) <= 2);
  console.log(`    transform changes: ${moved} | opacity changes: ${faded} | always centred: ${centred}`);
  if (rm === 'reduce') {
    console.log('    ' + (!moved ? 'PASS' : 'FAIL') + ' no motion under reduce');
    console.log('    ' + (faded ? 'PASS' : 'FAIL') + ' still fades (not instant/invisible)');
    console.log('    ' + (centred ? 'PASS' : 'FAIL') + ' stays centred');
  }
}

await browser.close(); srv.close();
