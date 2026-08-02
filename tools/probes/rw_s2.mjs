// Mobile rework slice 2 probe — 2-row group header on coarse + group-⋯ menu.
import { serve, launch, openApp, ensureShots } from './lib.mjs';
import { richSeed } from './seed.mjs';
import path from 'path';

const { srv, port } = await serve();
const browser = await launch();
const dir = ensureShots('rework');
const seed = richSeed();

// desktop reference vs slice-1 baseline
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, colorScheme: 'dark' });
  const p = await ctx.newPage();
  await p.addInitScript(st => {
    try { localStorage.clear(); } catch {}
    localStorage.setItem('duskState_v4', JSON.stringify(st));
    localStorage.setItem('currentPage', 'main');
    localStorage.setItem('isFiltered', '0');
    try { indexedDB.deleteDatabase('keyval-store'); } catch {}
  }, seed);
  await p.goto(`http://localhost:${port}/index.html`, { waitUntil: 'load' });
  await p.waitForTimeout(900);
  await p.screenshot({ path: path.join(dir, 's2_desktop.png'), fullPage: true });
  await ctx.close();
}

for (const dev of ['pixel7', 'small']) {
  const { ctx, page: p, errors } = await openApp(browser, { device: dev, page: 'main', seed, port });
  await p.waitForTimeout(2800);
  const m = await p.evaluate(() => {
    const out = {};
    out.hScroll = document.documentElement.scrollWidth > innerWidth;
    // group with the 30+ char name
    const sections = [...document.querySelectorAll('.group-section')];
    out.groups = sections.map(s => {
      const t = s.querySelector('.group-title');
      const r = t.getBoundingClientRect();
      const cs = getComputedStyle(t);
      // visible chars estimate: width / avg char width (measure via canvas-less trick: scrollWidth vs clientWidth)
      const full = t.scrollWidth;
      const vis = Math.round(t.textContent.length * Math.min(1, r.width / full));
      const btns = [...s.querySelectorAll('.btn-group-action')];
      const minBtn = btns.reduce((a, b) => { const q = b.getBoundingClientRect(); return Math.min(a, q.width, q.height); }, 1e9);
      const header = s.querySelector('.group-header').getBoundingClientRect();
      return { name: t.textContent.slice(0, 20), titleW: Math.round(r.width), visChars: vis, btnCount: btns.length, minBtn, headerH: Math.round(header.height) };
    });
    // toolbar pill
    const pill = document.querySelector('.group-pill-wrap .meta-tag.group-pill');
    out.pill = pill ? { w: Math.round(pill.getBoundingClientRect().width), max: Math.round(innerWidth * 0.45) } : null;
    return out;
  });
  console.log(dev, JSON.stringify(m, null, 1));
  await p.screenshot({ path: path.join(dir, `s2_${dev}_top.png`) });
  // open group ⋯ menu
  const more = p.locator('.group-section [data-act="openGroupMoreMenu"]').first();
  await more.tap();
  await p.waitForTimeout(350);
  const menu = await p.evaluate(() => {
    const el = document.querySelector('.snooze-menu.group-more-menu');
    if (!el) return { open: false };
    const r = el.getBoundingClientRect();
    return { open: true, onScreen: r.left >= 0 && r.right <= innerWidth && r.bottom <= innerHeight, items: [...el.querySelectorAll('[role=menuitem]')].map(b => (b.textContent || '').trim()) };
  });
  console.log(dev, 'group-menu:', JSON.stringify(menu));
  await p.screenshot({ path: path.join(dir, `s2_${dev}_menu.png`) });
  // two-step delete: first tap arms (menu stays), second not fired here (don't destroy state mid-probe)
  const del = p.locator('.snooze-menu .fm-group-del');
  await del.tap();
  await p.waitForTimeout(250);
  const armed = await p.evaluate(() => {
    const b = document.querySelector('.fm-group-del');
    return { stillOpen: !!document.querySelector('.snooze-menu.group-more-menu'), armed: b ? b.classList.contains('confirm-armed') : null };
  });
  console.log(dev, 'delete-arm:', JSON.stringify(armed));
  if (errors.length) console.log(dev, 'CONSOLE ERRORS:', errors);
  await ctx.close();
}

await browser.close();
srv.close();
