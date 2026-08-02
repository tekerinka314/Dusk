// W4 drawer «Створка» verification — mobile tier + desktop sanity.
// Shots → audit-v2/shots/w4/*.png
import { serve, launch, openApp, ensureShots } from './lib.mjs';
import { richSeed } from './seed.mjs';
import path from 'path';

const { srv, port } = await serve();
const browser = await launch();
const dir = ensureShots('w4');

let pass = 0, fail = 0;
const ok = (name, cond) => { console.log(cond ? 'PASS' : 'FAIL', name); cond ? pass++ : fail++; };

// ── mobile 390×844 ──
{
  const dev = { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true };
  const { ctx, page: p, errors } = await openApp(browser, { device: dev, page: 'main', seed: richSeed(), port });
  await p.waitForTimeout(1800);
  const shot = async n => { await p.screenshot({ path: path.join(dir, `m_${n}.png`) }); };

  await shot('closed');
  ok('tab visible', await p.evaluate(() => {
    const t = document.getElementById('drawer-tab');
    return t && getComputedStyle(t).display !== 'none';
  }));
  ok('rail offscreen + inert', await p.evaluate(() => {
    const r = document.getElementById('side-rail');
    return r.inert === true && getComputedStyle(r).position === 'fixed';
  }));

  await p.evaluate(() => document.getElementById('drawer-tab').click());
  await p.waitForTimeout(500);
  await shot('open');
  ok('drawer opens via tab', await p.evaluate(() =>
    document.documentElement.classList.contains('drawer-open') &&
    document.getElementById('side-rail').getBoundingClientRect().left === 0));
  ok('digest visible in drawer', await p.evaluate(() => {
    const d = document.getElementById('rail-digest');
    return d && d.childElementCount > 0 && getComputedStyle(d).display !== 'none';
  }));

  // group pill → focus + auto-close
  await p.evaluate(() => document.querySelector('.groups-list .group-pill')?.click());
  await p.waitForTimeout(500);
  await shot('after_pill');
  ok('pill click focuses group and closes drawer', await p.evaluate(() =>
    !document.documentElement.classList.contains('drawer-open') && focusGroupId !== null));
  await p.evaluate(() => { toggleFocusGroup(focusGroupId); });   // reset focus

  // digest row → jump + auto-close
  await p.evaluate(() => drawerOpen());
  await p.waitForTimeout(400);
  await p.evaluate(() => document.querySelector('.rd-row')?.click());
  await p.waitForTimeout(600);
  await shot('after_digest');
  ok('digest click closes drawer', await p.evaluate(() =>
    !document.documentElement.classList.contains('drawer-open')));

  // ДАННЫЕ-кластер живёт в створке (реплика рельсы), ⋯-заместитель убран
  ok('data cluster present, more-stand-in hidden', await p.evaluate(() => {
    const d = document.querySelector('.side-rail .toolbar-group-data');
    const more = document.getElementById('btn-tool-more');
    return d && getComputedStyle(d).display !== 'none' && getComputedStyle(more).display === 'none';
  }));

  // режим выбора отдаёт управление списку → створка уходит
  await p.evaluate(() => drawerOpen());
  await p.waitForTimeout(400);
  await p.evaluate(() => document.getElementById('btn-main-select').click());
  await p.waitForTimeout(500);
  await shot('after_select');
  ok('select mode closes drawer', await p.evaluate(() =>
    !document.documentElement.classList.contains('drawer-open') &&
    mainSelectMode === true &&
    getComputedStyle(document.getElementById('main-select-bar')).display !== 'none'));
  await p.evaluate(() => toggleMainSelectMode());

  // scrim click closes
  await p.evaluate(() => drawerOpen());
  await p.waitForTimeout(400);
  await p.evaluate(() => document.getElementById('drawer-scrim').click());
  await p.waitForTimeout(400);
  ok('scrim click closes', await p.evaluate(() =>
    !document.documentElement.classList.contains('drawer-open')));

  // Esc closes
  await p.evaluate(() => drawerOpen());
  await p.waitForTimeout(300);
  await p.keyboard.press('Escape');
  await p.waitForTimeout(300);
  ok('Esc closes', await p.evaluate(() =>
    !document.documentElement.classList.contains('drawer-open')));

  // nav tab closes + tab hidden on other pages (#main-page display:none)
  await p.evaluate(() => drawerOpen());
  await p.waitForTimeout(300);
  await p.evaluate(() => document.querySelector('#nav-archive')?.click());
  await p.waitForTimeout(500);
  await shot('archive');
  ok('nav switch closes drawer, tab hidden with page', await p.evaluate(() =>
    !document.documentElement.classList.contains('drawer-open') &&
    document.getElementById('drawer-tab').offsetParent === null));
  await p.evaluate(() => document.querySelector('#nav-main')?.click());
  await p.waitForTimeout(400);

  if (errors.length) { console.log('CONSOLE ERRORS', errors.slice(0, 6)); fail++; }
  else console.log('no console errors (mobile)');
  await ctx.close();
}

// ── desktop 1500 sanity: rail intact, no tab/scrim interference ──
{
  const dev = { width: 1500, height: 950, deviceScaleFactor: 1, isMobile: false, hasTouch: false };
  const { ctx, page: p, errors } = await openApp(browser, { device: dev, page: 'main', seed: richSeed(), port });
  await p.waitForTimeout(1600);
  await p.screenshot({ path: path.join(dir, 'd_rail.png') });
  ok('desktop: rail visible in flow, tab hidden, rail not inert', await p.evaluate(() => {
    const r = document.getElementById('side-rail');
    const t = document.getElementById('drawer-tab');
    return getComputedStyle(r).position !== 'fixed' && r.inert !== true &&
           getComputedStyle(t).display === 'none';
  }));
  if (errors.length) { console.log('CONSOLE ERRORS', errors.slice(0, 6)); fail++; }
  else console.log('no console errors (desktop)');
  await ctx.close();
}

await browser.close(); srv.close();
console.log(`\n${pass} pass / ${fail} fail`);
process.exitCode = fail ? 1 : 0;
