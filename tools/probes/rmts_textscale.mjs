// B1 a11y surface — 200% TEXT SCALE reflow audit on main + task card + params + modal.
import { serve, launch, openApp, SHOTS } from './lib.mjs';
import { richSeed } from './seed.mjs';
import path from 'path';

const SCALE = 'html{font-size:200%!important}';

function overflow(p) {
  return p.evaluate(() => {
    const de = document.documentElement;
    const cw = de.clientWidth, sw = de.scrollWidth, ch = de.clientHeight, sh = de.scrollHeight;
    const res = [];
    document.querySelectorAll('*').forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.width > 4 && r.right > cw + 1 && r.left >= -2)
        res.push({ t: el.tagName + (el.id ? '#' + el.id : '') + '.' + String(el.className).trim().split(/\s+/).slice(0, 2).join('.'), right: Math.round(r.right), w: Math.round(r.width) });
    });
    return { cw, sw, ch, sh, hOverflow: sw > cw + 1, off: res.sort((a, b) => b.right - a.right).slice(0, 8) };
  });
}

(async () => {
  const { srv, port } = await serve();
  const b = await launch();

  for (const dev of ['pixel7', 'small']) {
    // MAIN — before vs after 200%
    const { ctx, page: p } = await openApp(b, { device: dev, page: 'main', seed: richSeed(), port });
    await p.waitForTimeout(600);

    const before = await p.evaluate(() => {
      const g = (sel) => { const e = document.querySelector(sel); return e ? parseFloat(getComputedStyle(e).fontSize) : null; };
      return { html: parseFloat(getComputedStyle(document.documentElement).fontSize), body: parseFloat(getComputedStyle(document.body).fontSize), taskText: g('.task-text'), meta: g('.deadline-tag, .task-meta, .meta-tag'), brand: g('.brand-name'), btnAdd: g('#input-box') };
    });
    const ovBefore = await overflow(p);

    await p.addStyleTag({ content: SCALE });
    await p.waitForTimeout(500);
    const after = await p.evaluate(() => {
      const g = (sel) => { const e = document.querySelector(sel); return e ? parseFloat(getComputedStyle(e).fontSize) : null; };
      return { html: parseFloat(getComputedStyle(document.documentElement).fontSize), body: parseFloat(getComputedStyle(document.body).fontSize), taskText: g('.task-text'), meta: g('.deadline-tag, .task-meta, .meta-tag'), brand: g('.brand-name'), btnAdd: g('#input-box') };
    });
    const ovAfter = await overflow(p);
    await p.screenshot({ path: path.join(SHOTS, `B1w_ts_main_${dev}.png`) });

    console.log(`\n=== TEXTSCALE main ${dev} ===`);
    console.log('fontSize before', JSON.stringify(before));
    console.log('fontSize after ', JSON.stringify(after));
    console.log('overflow before', JSON.stringify({ hOverflow: ovBefore.hOverflow, sw: ovBefore.sw, cw: ovBefore.cw }));
    console.log('overflow after ', JSON.stringify(ovAfter));

    // TASK CARD element shot (task 1 — has deadline+subtasks+note)
    const cardShot = path.join(SHOTS, `B1w_ts_card_${dev}.png`);
    const card = await p.$('.task-item');
    if (card) await card.screenshot({ path: cardShot }).catch(() => {});

    // PARAMS panel — open + shot + overflow within
    await p.evaluate(() => { if (typeof toggleExpand === 'function') toggleExpand(); });
    await p.waitForTimeout(400);
    const paramsBox = await p.evaluate(() => {
      const e = document.getElementById('extra-fields'); if (!e) return null;
      const r = e.getBoundingClientRect();
      // any child overflowing the panel's right edge?
      const cw = document.documentElement.clientWidth; const off = [];
      e.querySelectorAll('*').forEach(c => { const cr = c.getBoundingClientRect(); if (cr.width > 4 && cr.right > cw + 1) off.push({ t: (c.className || c.tagName).toString().split(/\s+/)[0], right: Math.round(cr.right) }); });
      return { open: getComputedStyle(e).display !== 'none' && r.height > 4, h: Math.round(r.height), off: off.slice(0, 5) };
    });
    await p.screenshot({ path: path.join(SHOTS, `B1w_ts_params_${dev}.png`) });
    console.log('params panel', JSON.stringify(paramsBox));
    await ctx.close();

    // DEADLINE MODAL under 200%
    const { ctx: c2, page: p2 } = await openApp(b, { device: dev, page: 'main', seed: richSeed(), port });
    await p2.waitForTimeout(500);
    await p2.addStyleTag({ content: SCALE });
    await p2.evaluate(() => { if (typeof openDeadlineModal === 'function') openDeadlineModal(1); });
    await p2.waitForTimeout(500);
    const modal = await p2.evaluate(() => {
      const ov = [...document.querySelectorAll('.modal-overlay')].find(o => getComputedStyle(o).display === 'flex');
      if (!ov) return { open: false };
      const m = ov.querySelector('.modal'); const r = m.getBoundingClientRect();
      const vh = window.innerHeight, vw = window.innerWidth;
      const cs = getComputedStyle(m);
      return { open: true, mW: Math.round(r.width), mH: Math.round(r.height), vw, vh, topClip: Math.round(r.top), bottomClip: Math.round(vh - r.bottom), tallerThanVp: r.height > vh, maxH: cs.maxHeight, overflowY: cs.overflowY, scrollable: m.scrollHeight > m.clientHeight + 2 };
    });
    await p2.screenshot({ path: path.join(SHOTS, `B1w_ts_dlmodal_${dev}.png`) });
    console.log('deadline modal @200%', JSON.stringify(modal));
    await c2.close();
  }

  await b.close(); srv.close();
})().catch(e => { console.error('CRASH', e); process.exit(2); });
