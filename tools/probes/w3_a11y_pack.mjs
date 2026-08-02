// W3 a11y-пачка (B5-05 ориентиры/заголовки, B5-10 подсказка синтаксиса,
// B5-06 генерируемая легенда, B5-08 разведение двух повторений) — вердиктный
// зонд по СОБРАННОМУ dist, а не по исходникам.
import { serve, launch, ROOT } from './lib.mjs';
import { richSeed } from './seed.mjs';

const results = [];
const rec = (n, p, d) => results.push({ name: n, pass: p, detail: d });

(async () => {
  const { srv, port } = await serve(ROOT);
  const browser = await launch();
  const ctx = await browser.newContext({ colorScheme: 'dark' });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));

  await page.goto(`http://localhost:${port}/__seed__`, { waitUntil: 'load' }).catch(() => {});
  await page.evaluate((s) => {
    localStorage.clear();
    localStorage.setItem('duskState_v4', JSON.stringify(s));
    localStorage.setItem('currentPage', 'main');
  }, richSeed());
  await page.goto(`http://localhost:${port}/index.html`, { waitUntil: 'load' });
  await page.waitForTimeout(900);

  const PAGE_EL = { main: 'main-page', archive: 'archive-page', notes: 'notes-page' };
  // ⚠ фиксированная пауза врёт: уходящая страница видима всю анимацию, и зонд
  // читает ЕЁ ориентир. Ждём факта: нужная показана, соседние скрыты.
  const goTab = async (tab) => {
    await page.evaluate(p => window.switchPage(p), tab);
    for (let i = 0; i < 40; i++) {                      // ручной опрос вместо waitForFunction
      const ok = await page.evaluate((want) => {
        const d = id => getComputedStyle(document.getElementById(id)).display;
        return d(want) !== 'none'
            && ['main-page', 'archive-page', 'notes-page'].filter(x => x !== want).every(x => d(x) === 'none');
      }, PAGE_EL[tab]);
      if (ok) break;
      await page.waitForTimeout(150);
    }
    await page.waitForTimeout(250);
  };

  // B5-05 — ровно один видимый ориентир main на каждой странице + свой h2
  for (const [tab, name] of [['main', 'Обеты'], ['archive', 'Склеп'], ['notes', 'Гримуар']]) {
    await goTab(tab);
    // ОДИН замер: между раздельными evaluate страница успевала смениться.
    const snap = await page.evaluate(() => {
      const vis = [...document.querySelectorAll('[role="main"], main')]
        .filter(e => e.checkVisibility({ checkVisibilityCSS: true }));
      return { count: vis.length, label: vis[0] ? vis[0].getAttribute('aria-label') : null,
               h2s: [...document.querySelectorAll('h2')].map(e => e.textContent.trim()) };
    });
    rec(`${tab}: ровно один ориентир main`, snap.count === 1, `mains=${snap.count}`);
    rec(`${tab}: ориентир назван «${name}»`, snap.label === name, `aria-label=${snap.label}`);
    rec(`${tab}: заголовок h2 «${name}» присутствует`, snap.h2s.includes(name), snap.h2s.join(' | '));
  }

  await goTab('main');

  // шапка свода — заголовок 3-го уровня
  const grpHeadings = await page.$$eval('.group-title[role="heading"]', els =>
    els.map(e => `${e.textContent.trim()}:${e.getAttribute('aria-level')}`));
  rec('шапки сводов отдаются заголовками 3-го уровня', grpHeadings.length > 0 && grpHeadings.every(s => s.endsWith(':3')),
      grpHeadings.join(' | ') || 'нет сводов в сиде');

  // B5-10 — подсказка синтаксиса доступна и связана с полем
  const qa = await page.evaluate(() => {
    const h = document.getElementById('qa-syntax-hint');
    const i = document.getElementById('input-box');
    return { hidden: h.getAttribute('aria-hidden'), label: h.getAttribute('aria-label'),
             described: i.getAttribute('aria-describedby') };
  });
  rec('подсказка квик-эдда не спрятана от AT', qa.hidden === null, `aria-hidden=${qa.hidden}`);
  rec('подсказка названа словами', !!qa.label && /метка/.test(qa.label), qa.label);
  rec('поле ссылается на подсказку', qa.described === 'qa-syntax-hint', qa.described);

  // B5-06 — легенда строится под створ
  const hintOn = async (tab, seg) => {
    await goTab(tab);
    if (seg) { await page.evaluate(m => window.grimSetMode(m), seg); await page.waitForTimeout(350); }
    await page.evaluate(() => { if (!window._shortcutsHintOpen) window.toggleShortcutsHint(); else window._refreshShortcutsHint(); });
    await page.waitForTimeout(250);
    return page.$eval('#shortcuts-hint', e => e.textContent.replace(/\s+/g, ' ').trim());
  };
  const hTasks = await hintOn('main');
  rec('легенда обетов называет прежде умолчанные клавиши',
      /Backspace/.test(hTasks) && /Esc/.test(hTasks) && /Ctrl\+Y/.test(hTasks), hTasks.slice(0, 110) + '…');
  const hNotes = await hintOn('notes', 'active');
  rec('легенда Гримуара говорит о своих клавишах',
      /F3/.test(hNotes) && /Ctrl\+F/.test(hNotes) && !/ранг/.test(hNotes), hNotes.slice(0, 110) + '…');
  const hCrypt = await hintOn('notes', 'archive');
  rec('склеп записей не обещает лишнего', !/исполнить/.test(hCrypt) && /навигация/.test(hCrypt), hCrypt);

  // полоса не вылезает за вьюпорт (грабля партии H)
  const fits = await page.$eval('#shortcuts-hint', e => {
    const r = e.getBoundingClientRect();
    return r.left >= -1 && r.right <= window.innerWidth + 1;
  });
  rec('легенда помещается в экран', fits === true, `viewport=${await page.evaluate(() => innerWidth)}`);

  // B5-08 — подписи тумблера переноса исхода
  await goTab('main');
  const dlCopy = await page.evaluate(() => {
    const id = window.state.tasks[0].id;
    window.openDeadlineModal(id);
    window.setDeadlineMode('time');
    const btn = document.getElementById('dl-repeat-toggle');
    return {
      title: btn.getAttribute('title'),
      t: btn.querySelector('.dl-rt-title')?.textContent.trim(),
      s: btn.querySelector('.dl-rt-sub')?.textContent.trim(),
    };
  });
  rec('тумблер исхода не занимает слово круговорота', !/круговорот/i.test(dlCopy.title || ''), dlCopy.title);
  rec('подпись говорит о переносе исхода', /Переносить исход/.test(dlCopy.t || ''), dlCopy.t);
  rec('пояснитель честен про круговорот', /круговоротн/i.test(dlCopy.s || '') && !/не станет/i.test(dlCopy.s || ''), dlCopy.s);

  rec('без ошибок страницы', errs.length === 0, errs.join(' | '));

  await ctx.close(); await browser.close(); srv.close();
  const bad = results.filter(r => !r.pass);
  console.log(results.map(r => `${r.pass ? 'PASS' : 'FAIL'} · ${r.name} · ${r.detail}`).join('\n'));
  console.log(`\n${results.length - bad.length}/${results.length}`);
  process.exit(bad.length ? 1 : 0);
})().catch(e => { console.error('PROBE ERROR', e); process.exit(1); });
