// W4 добивка: узкий телефон / планшет (drawer-тир) + средний тир (без drawer).
import { serve, launch, openApp, ensureShots } from './lib.mjs';
import { richSeed } from './seed.mjs';
import path from 'path';

const { srv, port } = await serve();
const browser = await launch();
const dir = ensureShots('w4');
let pass = 0, fail = 0;
const ok = (n, c) => { console.log(c ? 'PASS' : 'FAIL', n); c ? pass++ : fail++; };

for (const [w, h, touch] of [[360, 780, true], [768, 1024, true], [1000, 900, false]]) {
  const dev = { width: w, height: h, deviceScaleFactor: 2, isMobile: touch, hasTouch: touch };
  const { ctx, page: p, errors } = await openApp(browser, { device: dev, page: 'main', seed: richSeed(), port });
  await p.waitForTimeout(1700);
  const isDrawerTier = w <= 820;

  if (isDrawerTier) {
    await p.evaluate(() => drawerOpen());
    await p.waitForTimeout(500);
    await p.screenshot({ path: path.join(dir, `w${w}_open.png`) });
    const m = await p.evaluate(() => {
      const rail = document.getElementById('side-rail');
      const rb = rail.getBoundingClientRect();
      const over = [...rail.querySelectorAll('.toolbar, .toolbar-group, .groups-bar, .group-pill-wrap, .rail-digest, .btn-tool')]
        .filter(el => { const r = el.getBoundingClientRect(); return r.right > rb.right + 1 || r.left < rb.left - 1; })
        .map(el => el.className + ' w=' + Math.round(el.getBoundingClientRect().width));
      const labels = [...rail.querySelectorAll('.toolbar-group-label')].filter(el => getComputedStyle(el).display !== 'none').length;
      const seams = [...rail.querySelectorAll('.toolbar-group')].filter(el => getComputedStyle(el, '::before').display === 'block').length;
      const pills = [...rail.querySelectorAll('.group-pill')].map(el => Math.round(el.getBoundingClientRect().width));
      const plate = Math.round(rail.querySelector('.groups-list').getBoundingClientRect().width);
      return { railW: Math.round(rb.width), over, labels, seams, pills, plate,
               digest: getComputedStyle(document.getElementById('rail-digest')).display };
    });
    console.log(' ', w, JSON.stringify(m));
    ok(`${w}: ничего не вылезает из панели`, m.over.length === 0);
    ok(`${w}: лейблы кластеров видны (${m.labels})`, m.labels >= 3);
    ok(`${w}: швы между кластерами (${m.seams})`, m.seams >= 2);
    ok(`${w}: пилюли групп во всю плиту`, m.pills.every(v => v > m.plate - 40));
    ok(`${w}: дайджест в створке`, m.digest === 'block');
  } else {
    const m = await p.evaluate(() => {
      const rail = document.getElementById('side-rail');
      return { pos: getComputedStyle(rail).position, inert: rail.inert === true,
               tab: getComputedStyle(document.getElementById('drawer-tab')).display,
               digest: getComputedStyle(document.getElementById('rail-digest')).display,
               count: getComputedStyle(document.querySelector('.group-pill .gp-count')).display };
    });
    await p.screenshot({ path: path.join(dir, `w${w}_flow.png`) });
    console.log(' ', w, JSON.stringify(m));
    ok(`${w}: средний тир — панель в потоке, не fixed`, m.pos !== 'fixed');
    ok(`${w}: средний тир — таб скрыт, не inert`, m.tab === 'none' && !m.inert);
    ok(`${w}: средний тир — дайджест/счётчики скрыты (как было)`, m.digest === 'none' && m.count === 'none');
  }
  if (errors.length) { console.log('CONSOLE ERRORS', w, errors.slice(0, 4)); fail++; }
  await ctx.close();
}
await browser.close(); srv.close();
console.log(`\n${pass} pass / ${fail} fail`);
process.exitCode = fail ? 1 : 0;
