// Mobile rework slice 1 probe — 3-row task card on coarse.
// Usage: node rw_s1.mjs [--desktop-only shots/path.png]
import { serve, launch, openApp, ensureShots } from './lib.mjs';
import { richSeed } from './seed.mjs';
import path from 'path';

const desktopOnly = process.argv.includes('--desktop-only');
const tag = process.argv[3] || 'post';

const { srv, port } = await serve();
const browser = await launch();
const dir = ensureShots('rework');
const seed = richSeed();

// ── desktop reference (fine pointer — layout must be pixel-identical pre/post)
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
  // freeze countdown pulse noise: hide live countdown text? no — keep, diff tolerance handles text
  await p.screenshot({ path: path.join(dir, `s1_desktop_${tag}.png`), fullPage: true });
  await ctx.close();
  console.log('desktop shot:', `s1_desktop_${tag}.png`);
}

if (!desktopOnly) {
  for (const dev of ['pixel7', 'small']) {
    const { ctx, page: p, errors } = await openApp(browser, { device: dev, page: 'main', seed, port });
    await p.waitForTimeout(2800); // let the staggered card-entrance animation fully settle
    const m = await p.evaluate(() => {
      const out = {};
      out.innerWidth = innerWidth;
      out.scrollWidth = document.documentElement.scrollWidth;
      out.hScroll = document.documentElement.scrollWidth > innerWidth;
      // longest task title metrics
      let best = null;
      document.querySelectorAll('.task-item:not(.archive-item) .task-text').forEach(el => {
        const t = el.textContent || '';
        if (!best || t.length > best.len) {
          const cs = getComputedStyle(el);
          const lh = parseFloat(cs.lineHeight) || 24;
          const r = el.getBoundingClientRect();
          const lines = Math.max(1, Math.round(r.height / lh));
          best = { len: t.length, lines, charsPerLine: Math.round(t.length / lines), width: Math.round(r.width) };
        }
      });
      out.longestTitle = best;
      // action button sizes
      const btns = [...document.querySelectorAll('.task-item:not(.archive-item) .btn-task-action')];
      out.btnCount = btns.length;
      out.btnMin = btns.reduce((a, b) => { const r = b.getBoundingClientRect(); return Math.min(a, r.width, r.height); }, 1e9);
      const subBtns = [...document.querySelectorAll('.btn-sub-action')];
      out.subBtnMin = subBtns.length ? subBtns.reduce((a, b) => { const r = b.getBoundingClientRect(); return Math.min(a, r.width, r.height); }, 1e9) : null;
      // card heights + list height
      const cards = [...document.querySelectorAll('#list-container .task-item')];
      out.cardCount = cards.length;
      out.cardHeights = cards.map(c => Math.round(c.getBoundingClientRect().height));
      const list = document.querySelector('#list-container');
      out.listHeights = list ? +(list.getBoundingClientRect().height / innerHeight).toFixed(2) : null;
      // inline snooze/archive/delete must be gone from the card row
      out.inlineArchive = !!document.querySelector('#list-container .task-actions .archive-btn');
      out.inlineDelete = !!document.querySelector('#list-container .task-actions .danger');
      out.inlineSnooze = !!document.querySelector('#list-container .task-actions .btn-snooze');
      out.coarse = matchMedia('(hover: none) and (pointer: coarse)').matches;
      return out;
    });
    console.log(dev, JSON.stringify(m, null, 1));
    await p.screenshot({ path: path.join(dir, `s1_${dev}_${tag}.png`), fullPage: true });
    // open ⋯ on a deadline task → archive/delete/snooze/edit reachable
    const moreBtn = p.locator('.task-item[data-id="2"] .btn-task-more');
    await moreBtn.tap();
    await p.waitForTimeout(350);
    const menu = await p.evaluate(() => {
      const el = document.querySelector('.snooze-menu.task-more-menu');
      if (!el) return { open: false };
      const r = el.getBoundingClientRect();
      const items = [...el.querySelectorAll('[role=menuitem]')].map(b => (b.textContent || '').trim());
      return { open: true, onScreen: r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight, items };
    });
    console.log(dev, 'more-menu:', JSON.stringify(menu));
    await p.screenshot({ path: path.join(dir, `s1_${dev}_menu_${tag}.png`) });
    if (errors.length) console.log(dev, 'CONSOLE ERRORS:', errors);
    await ctx.close();
  }
}

await browser.close();
srv.close();
