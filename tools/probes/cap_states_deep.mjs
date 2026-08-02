// B1 states-deep audit: main-page filter/search/today/focus states on mobile.
import { serve, launch, openApp, ensureShots } from './lib.mjs';
import { richSeed } from './seed.mjs';

const PATCH = '.task-head{flex-wrap:wrap!important} .task-actions{flex-basis:100%!important;margin-top:6px!important;justify-content:flex-start!important;opacity:1!important}';

const allDoneSeed = () => { const s = richSeed(); s.tasks.forEach(t => { t.checked = true; (t.subtasks || []).forEach(x => x.checked = true); }); return s; };

// setup runs inside the page; may be async-ish via returned promise not supported,
// so we keep them synchronous and add explicit waits after.
const JOBS = [
  { name: 'search_hits',  seed: richSeed, setup: `searchBox.value='ритуал';searchBox.dispatchEvent(new Event('input'));` },
  { name: 'search_none',  seed: richSeed, setup: `searchBox.value='цсчйнет';searchBox.dispatchEvent(new Event('input'));` },
  { name: 'color_filter', seed: richSeed, setup: `setColorFilter('#8C5CFF');` },
  { name: 'color_modal',  seed: richSeed, setup: `setColorFilter('#8C5CFF');openColorFilterModal();` },
  { name: 'today',        seed: richSeed, setup: `toggleTodayMode();` },
  { name: 'today_none',   seed: richSeed, setup: `state.tasks.forEach(t=>t.deadline=null);toggleTodayMode();` },
  { name: 'focus_group',  seed: richSeed, setup: `toggleFocusGroup(10);` },
  { name: 'search_today', seed: richSeed, setup: `toggleTodayMode();searchBox.value='ритуал';searchBox.dispatchEvent(new Event('input'));` },
  { name: 'alldone',      seed: allDoneSeed, setup: `toggleFilter();` },
];

const MEASURE = () => {
  const cw = document.documentElement.clientWidth;
  const off = [];
  document.querySelectorAll('*').forEach(el => {
    const r = el.getBoundingClientRect();
    if (r.width > 4 && r.right > cw + 1 && r.left >= -2)
      off.push({ t: el.tagName + (el.id ? '#' + el.id : '') + '.' + String(el.className).trim().split(/\s+/).slice(0, 2).join('.'), right: Math.round(r.right), w: Math.round(r.width) });
  });
  const es = document.getElementById('empty-state');
  const ad = document.getElementById('all-done');
  const ps = document.getElementById('progress-section');
  const pb = document.getElementById('progress-bar');
  const addBtn = document.getElementById('empty-add-btn');
  const cards = [...document.querySelectorAll('#list-container .task-item, .group-body .task-item')].filter(e => e.getBoundingClientRect().height > 0);
  const gv = (e) => e ? getComputedStyle(e).display : 'MISSING';
  const rect = (e) => { if (!e) return null; const r = e.getBoundingClientRect(); return { top: Math.round(r.top), h: Math.round(r.height), w: Math.round(r.width), left: Math.round(r.left), right: Math.round(r.right) }; };
  // empty CTA reachability: is it within viewport horizontally and rendered
  const esP = es ? es.querySelector('p') : null;
  return {
    cw, sw: document.documentElement.scrollWidth, sh: document.body.scrollHeight,
    off: off.sort((a, b) => b.right - a.right).slice(0, 5),
    empty: { disp: gv(es), text: esP ? esP.textContent.trim() : null, rect: rect(es), addBtnDisp: gv(addBtn), addBtnRect: rect(addBtn) },
    allDone: { disp: gv(ad), rect: rect(ad), text: ad ? (ad.querySelector('p') || {}).textContent : null },
    prog: { disp: gv(ps), rect: rect(ps), barW: pb ? pb.style.width : null, barRect: rect(pb) },
    cards: cards.length,
    doneCount: (document.getElementById('done-count') || {}).textContent,
    qtyCount: (document.getElementById('quantity-count') || {}).textContent,
  };
};

(async () => {
  const dir = ensureShots();
  const { srv, port } = await serve();
  const b = await launch();
  const out = [];
  for (const dev of ['pixel7', 'small']) {
    for (const j of JOBS) {
      const { ctx, page: p, errors } = await openApp(b, { device: dev, page: 'main', seed: j.seed(), port });
      await p.addStyleTag({ content: PATCH });
      let serr = '';
      if (j.setup) { try { await p.evaluate(j.setup); } catch (e) { serr = ' SETUP_ERR:' + e.message; } }
      await p.waitForTimeout(600);
      const m = await p.evaluate(MEASURE);
      await p.screenshot({ path: `${dir}/B1w_states_${j.name}_${dev}.png` });
      out.push(`=== ${j.name} / ${dev}${serr} ===\n` + JSON.stringify(m, null, 1) + (errors.length ? `\nCONSOLE_ERR: ${errors.slice(0, 3).join(' | ')}` : ''));
      await ctx.close();
    }
  }
  console.log(out.join('\n\n'));
  await b.close(); srv.close();
})().catch(e => { console.error('CRASH', e); process.exit(2); });
