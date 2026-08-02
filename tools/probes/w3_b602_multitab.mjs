// W3 / V2-B6-02 — ВЕРДИКТНЫЙ зонд после фикса (инверсия s4_p2_multitab).
// Две вкладки одного origin: правка второй обязана пережить сохранение первой.
// Проверяет НАСТОЯЩЕЕ событие `storage` (в vitest оно синтетическое).
import { serve, launch, ROOT } from './lib.mjs';
import { richSeed } from './seed.mjs';

const results = [];
const rec = (n, p, d) => results.push({ name: n, pass: p, detail: d });

const editTask = (id, text) => `(() => {
  const t = window.state.tasks.find(x => x.id === ${id});
  if (!t) return false; t.text = ${JSON.stringify(text)}; window.saveState(); return true;
})()`;

(async () => {
  const { srv, port } = await serve(ROOT);
  const browser = await launch();
  const base = richSeed();

  const ctx = await browser.newContext({ colorScheme: 'dark' });
  const sp = await ctx.newPage();
  await sp.goto(`http://localhost:${port}/__seed__`, { waitUntil: 'load' }).catch(() => {});
  await sp.evaluate((s) => { localStorage.clear(); localStorage.setItem('duskState_v4', JSON.stringify(s)); localStorage.setItem('currentPage', 'main'); }, base);
  await sp.close();

  const tab1 = await ctx.newPage();
  await tab1.goto(`http://localhost:${port}/index.html`, { waitUntil: 'load' });
  await tab1.waitForTimeout(700);
  const tab2 = await ctx.newPage();
  await tab2.goto(`http://localhost:${port}/index.html`, { waitUntil: 'load' });
  await tab2.waitForTimeout(700);

  // 1) обычная правка соседа
  await tab2.evaluate(editTask(2, 'TAB2-EDIT'));
  await tab1.waitForTimeout(250);                       // событие storage долетает асинхронно
  const flagSeen = await tab1.evaluate(() => window._lsForeignWrite === true);
  rec('вкладка 1 увидела чужую запись (флаг поднят)', flagSeen === true, `_lsForeignWrite=${flagSeen}`);

  await tab1.evaluate(editTask(1, 'TAB1-EDIT'));
  await tab1.waitForTimeout(150);

  const ls = await tab1.evaluate(() => JSON.parse(localStorage.getItem('duskState_v4')));
  const t1 = ls.tasks.find(t => t.id === 1), t2 = ls.tasks.find(t => t.id === 2);
  rec('обе правки в LS', t1.text === 'TAB1-EDIT' && t2.text === 'TAB2-EDIT',
      `task1="${t1.text}" task2="${t2.text}"`);

  const live = await tab1.evaluate(() => {
    const t = window.state.tasks.find(x => x.id === 2);
    return { text: t && t.text, domHas: !!document.body.innerText.includes('TAB2-EDIT') };
  });
  rec('чужая правка в живом state вкладки 1', live.text === 'TAB2-EDIT', `state="${live.text}"`);
  rec('чужая правка дорисована в DOM (render после мержа)', live.domHas === true, `domHas=${live.domHas}`);

  // 2) флаг снят после мержа
  const flagAfter = await tab1.evaluate(() => window._lsForeignWrite === false);
  rec('флаг снят после слияния', flagAfter === true, `_lsForeignWrite=${!flagAfter}`);

  // 3) удаление у соседа не воскресает
  const before = await tab2.evaluate(() => window.state.tasks.length);
  await tab2.evaluate(`(() => { const t = window.state.tasks[0]; window.removeTask(t.id); return true; })()`);
  await tab2.waitForTimeout(400);
  const gone = await tab2.evaluate(() => window.state.tasks.length);
  await tab1.waitForTimeout(250);
  await tab1.evaluate(editTask(3, 'TAB1-EDIT-2'));
  await tab1.waitForTimeout(150);
  const ls2 = await tab1.evaluate(() => JSON.parse(localStorage.getItem('duskState_v4')));
  rec('удаление у соседа пережило сохранение вкладки 1',
      gone < before && ls2.tasks.length === gone,
      `было ${before} → у соседа ${gone} → в LS ${ls2.tasks.length}`);

  // 4) обеты второй вкладки не потеряли своих звеньев/полей (мерж по полям, не подмена)
  const shape = await tab1.evaluate(() => {
    const t = window.state.tasks.find(x => x.text === 'TAB2-EDIT');
    return t ? { subs: (t.subtasks || []).length, uid: !!t.uid, upd: typeof t.updatedAt } : null;
  });
  rec('форма записи цела после мержа', !!shape && shape.uid && shape.upd === 'number',
      JSON.stringify(shape));

  const errs = [];
  tab1.on('pageerror', e => errs.push(String(e)));
  await tab1.waitForTimeout(200);
  rec('без ошибок страницы', errs.length === 0, errs.join(' | '));

  await ctx.close();
  await browser.close();
  srv.close();
  const bad = results.filter(r => !r.pass);
  console.log(results.map(r => `${r.pass ? 'PASS' : 'FAIL'} · ${r.name} · ${r.detail}`).join('\n'));
  console.log(`\n${results.length - bad.length}/${results.length}`);
  process.exit(bad.length ? 1 : 0);
})().catch(e => { console.error('PROBE ERROR', e); process.exit(1); });
