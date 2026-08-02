// V2-B1-16 / V2-B1-25 — вердиктный замер по dist:
//   · на телефоне кнопка оглавления жива и открывает НИЖНЮЮ СТВОРКУ, строка
//     створки прыгает к заголовку;
//   · тулбар форматирования липкий на обоих тирах и не залезает на плавающие
//     кнопки внизу телефона.
import { serve, launch, openApp } from './lib.mjs';
import { richSeed } from './seed.mjs';

const results = [];
const rec = (n, p, d) => results.push({ name: n, pass: p, detail: d });

const seed = () => {
  const s = richSeed();
  const now = Date.now();
  s.notes.unshift({
    id: 'ntoc', title: 'Запись с оглавлением',
    body: ['<h1>Врата</h1>', '<p>' + 'Тьма сгущается. '.repeat(40) + '</p>',
           '<h2>Ключ</h2>', '<p>' + 'Ключ повернулся. '.repeat(40) + '</p>',
           '<h2>Порог</h2>', '<p>' + 'Порог перейден. '.repeat(40) + '</p>',
           '<h3>Тень</h3>', '<p>' + 'Тень легла. '.repeat(40) + '</p>'].join(''),
    fmt: true, color: null, createdAt: now, updatedAt: now,
  });
  return s;
};

const rect = (sel) => {
  const e = document.querySelector(sel);
  if (!e) return null;
  const b = e.getBoundingClientRect();
  return { l: Math.round(b.left), r: Math.round(b.right), t: Math.round(b.top), b: Math.round(b.bottom), h: Math.round(b.height), w: Math.round(b.width) };
};

(async () => {
  const { srv, port } = await serve();
  const br = await launch();

  // ── телефон ───────────────────────────────────────────────────────────────
  {
    const { ctx, page: p, errors } = await openApp(br, { device: 'pixel7', page: 'notes', seed: seed(), port });
    await p.evaluate(() => grimOpen('ntoc'));
    await p.waitForTimeout(700);

    const tocBtn = await p.evaluate(() => {
      const b = document.querySelector('#grim-detail .grim-toc-toggle');
      if (!b) return null;
      const r = b.getBoundingClientRect();
      return { disp: getComputedStyle(b).display, w: Math.round(r.width), h: Math.round(r.height), avail: !!document.querySelector('.grim-page.toc-avail') };
    });
    rec('412: кнопка оглавления показана', !!tocBtn && tocBtn.disp !== 'none' && tocBtn.w > 0,
        JSON.stringify(tocBtn));

    await p.evaluate(() => document.querySelector('#grim-detail .grim-toc-toggle').click());
    await p.waitForTimeout(450);
    const sheet = await p.evaluate(() => {
      const m = document.querySelector('.snooze-menu.grim-toc-sheet');
      if (!m) return null;
      const rows = [...m.querySelectorAll('[data-act="_grimTocPick"]')];
      const r = m.getBoundingClientRect();
      return { rows: rows.length, roles: rows[0] && rows[0].getAttribute('role'),
               txt: rows.map(x => x.textContent.trim()).slice(0, 4),
               bottomAnchored: Math.abs(r.bottom - window.innerHeight) < 40, sheetCls: m.className };
    });
    rec('412: оглавление открылось створкой', !!sheet && sheet.rows === 4,
        JSON.stringify(sheet && { rows: sheet.rows, txt: sheet.txt }));
    rec('412: створка прижата к низу', !!sheet && sheet.bottomAnchored, sheet && sheet.sheetCls);
    rec('412: строки — пункты меню', !!sheet && sheet.roles === 'menuitem', sheet && sheet.roles);

    const jump = await p.evaluate(async () => {
      const before = window.scrollY;
      document.querySelectorAll('[data-act="_grimTocPick"]')[2].click();
      await new Promise(r => setTimeout(r, 900));
      return { before, after: window.scrollY, sheetGone: !document.querySelector('.snooze-menu.grim-toc-sheet') };
    });
    rec('412: строка створки прыгает к заголовку', jump.after > jump.before + 100,
        `scrollY ${jump.before} → ${jump.after}`);
    rec('412: створка закрылась после выбора', jump.sheetGone, '');

    // тулбар: открыть принудительно и замерить
    await p.evaluate(() => { document.querySelector('.grim-page').classList.add('bar-open'); });
    await p.waitForTimeout(500);
    const bar = await p.evaluate((rectSrc) => {
      const r = eval('(' + rectSrc + ')');
      const el = document.querySelector('.fmt-bar');
      const cs = getComputedStyle(el);
      const body = r('.grim-body'), title = r('.grim-title-in');
      return { pos: cs.position, bottom: cs.bottom, z: cs.zIndex,
               bar: r('.fmt-cluster'), pen: r('.btn-pen-sound'), snd: r('.btn-sound'), eye: r('.sync-glyph'),
               vh: window.innerHeight, order: { title: title && title.t, body: body && body.t } };
    }, rect.toString());
    rec('412: тулбар липкий', bar.pos === 'sticky', `${bar.pos}, bottom ${bar.bottom}`);
    rec('412: тулбар в пределах экрана', bar.bar && bar.bar.b <= bar.vh && bar.bar.t >= 0,
        `${bar.bar && bar.bar.t}…${bar.bar && bar.bar.b} при ${bar.vh}`);
    const clears = bar.bar && bar.pen && bar.bar.b <= bar.pen.t;
    rec('412: тулбар не налезает на стопку кнопок', !!clears,
        `тулбар низ ${bar.bar && bar.bar.b}, перо верх ${bar.pen && bar.pen.t}, звук верх ${bar.snd && bar.snd.t}, глаз верх ${bar.eye && bar.eye.t}`);

    // прокрутка вниз — тулбар остаётся на месте
    const stuck = await p.evaluate(async (rectSrc) => {
      const r = eval('(' + rectSrc + ')');
      const a = r('.fmt-cluster');
      // середина записи: у самого низа тулбар честно встаёт на своё место в
      // потоке (запись кончилась) — липкость проверяем ТАМ, где ещё есть текст
      window.scrollTo(0, Math.round(document.documentElement.scrollHeight / 2));
      await new Promise(x => setTimeout(x, 400));
      return { a, b: r('.fmt-cluster'), y: window.scrollY, vh: window.innerHeight };
    }, rect.toString());
    rec('412: тулбар не уезжает при прокрутке', stuck.b && Math.abs(stuck.b.t - stuck.a.t) <= 4 && stuck.y > 400,
        `${stuck.a && stuck.a.t} → ${stuck.b && stuck.b.t} при scrollY ${stuck.y}`);

    rec('412: без ошибок в консоли', errors.length === 0, errors.slice(0, 3).join(' | '));
    await ctx.close();
  }

  // ── десктоп ───────────────────────────────────────────────────────────────
  {
    const { ctx, page: p, errors } = await openApp(br, {
      device: { width: 1280, height: 900, deviceScaleFactor: 1, isMobile: false, hasTouch: false },
      page: 'notes', seed: seed(), port });
    await p.evaluate(() => grimOpen('ntoc'));
    await p.waitForTimeout(700);
    await p.evaluate(() => { document.querySelector('.grim-page').classList.add('bar-open'); });
    await p.waitForTimeout(500);

    const d = await p.evaluate(async (rectSrc) => {
      const r = eval('(' + rectSrc + ')');
      const el = document.querySelector('.fmt-bar');
      const cs = getComputedStyle(el);
      const a = r('.fmt-cluster');
      window.scrollTo(0, 600);
      await new Promise(x => setTimeout(x, 400));
      const b = r('.fmt-cluster');
      const sheet = typeof _grimTocIsSheet === 'function' ? _grimTocIsSheet() : null;
      return { pos: cs.position, top: cs.top, a, b, sheet, scrollY: window.scrollY };
    }, rect.toString());
    rec('1280: тулбар липкий сверху', d.pos === 'sticky' && d.top !== 'auto', `${d.pos}, top ${d.top}`);
    rec('1280: тулбар держится при прокрутке', d.b && d.b.t >= 0 && d.b.t <= 60 && d.scrollY >= 400,
        `top ${d.a && d.a.t} → ${d.b && d.b.t} при scrollY ${d.scrollY}`);
    rec('1280: оглавление остаётся рельсой, не створкой', d.sheet === false, String(d.sheet));

    const rail = await p.evaluate(async () => {
      document.querySelector('#grim-detail .grim-toc-toggle').click();
      await new Promise(x => setTimeout(x, 500));
      return { open: !!document.querySelector('.grim-page.toc-open'),
               sheet: !!document.querySelector('.snooze-menu.grim-toc-sheet'),
               links: document.querySelectorAll('.grim-toc [data-act], .grim-toc button').length };
    });
    rec('1280: кнопка открывает рельсу', rail.open && !rail.sheet, JSON.stringify(rail));
    rec('1280: без ошибок в консоли', errors.length === 0, errors.slice(0, 3).join(' | '));
    await ctx.close();
  }

  await br.close(); srv.close();
  const bad = results.filter(r => !r.pass);
  console.log(results.map(r => `${r.pass ? 'PASS' : 'FAIL'} · ${r.name} · ${r.detail}`).join('\n'));
  console.log(`\n${results.length - bad.length}/${results.length}`);
  process.exit(bad.length ? 1 : 0);
})().catch(e => { console.error('PROBE ERROR', e); process.exit(1); });
