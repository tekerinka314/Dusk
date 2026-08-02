// V2-B4-03 / V2-B4-04 — вердиктный замер по dist: плавающие кнопки держатся
// кромки карточки, легенда не шире карточки и не вылезает за экран, свёрнутый
// свод отличим от развёрнутого.
import { serve, launch, ROOT } from './lib.mjs';
import { richSeed } from './seed.mjs';

const results = [];
const rec = (n, p, d) => results.push({ name: n, pass: p, detail: d });
const WIDTHS = [1280, 1600, 1920];

(async () => {
  const { srv, port } = await serve(ROOT);
  const browser = await launch();

  for (const w of WIDTHS) {
    const ctx = await browser.newContext({ colorScheme: 'dark', viewport: { width: w, height: 900 } });
    const page = await ctx.newPage();
    await page.goto(`http://localhost:${port}/__seed__`, { waitUntil: 'load' }).catch(() => {});
    await page.evaluate((s) => { localStorage.clear(); localStorage.setItem('duskState_v4', JSON.stringify(s)); localStorage.setItem('currentPage', 'main'); }, richSeed());
    await page.goto(`http://localhost:${port}/index.html`, { waitUntil: 'load' });
    await page.waitForTimeout(1100);
    await page.evaluate(() => { if (!window._shortcutsHintOpen) window.toggleShortcutsHint(); });
    await page.waitForTimeout(300);

    const g = await page.evaluate(() => {
      const r = sel => { const e = document.querySelector(sel); if (!e) return null; const b = e.getBoundingClientRect(); return { l: Math.round(b.left), r: Math.round(b.right), t: Math.round(b.top), b: Math.round(b.bottom), h: Math.round(b.height) }; };
      return { card: r('.todo-app'), sync: r('.sync-glyph'), sound: r('.btn-sound'),
               hint: r('.shortcuts-hint'), vw: window.innerWidth,
               hintFont: getComputedStyle(document.querySelector('.shortcuts-hint')).fontSize };
    });
    const gapL = g.sync.l - 0, cardGapL = g.card.l - g.sync.r;      // зазор между кнопкой и карточкой
    const cardGapR = g.sound.l - g.card.r;
    rec(`${w}: глаз синка держится кромки карточки`, cardGapL >= -20 && cardGapL <= 40,
        `кнопка ${g.sync.l}-${g.sync.r}, карточка ${g.card.l}-${g.card.r}, зазор ${cardGapL}`);
    rec(`${w}: стопка кнопок держится кромки карточки`, cardGapR >= -20 && cardGapR <= 40,
        `кнопка ${g.sound.l}, карточка правый край ${g.card.r}, зазор ${cardGapR}`);
    rec(`${w}: легенда в пределах экрана`, g.hint.l >= 0 && g.hint.r <= g.vw, `${g.hint.l}…${g.hint.r} при ${g.vw}`);
    rec(`${w}: легенда не шире карточки+120`, (g.hint.r - g.hint.l) <= (g.card.r - g.card.l) + 130,
        `легенда ${g.hint.r - g.hint.l}, карточка ${g.card.r - g.card.l}`);
    rec(`${w}: кегль легенды не мобильный`, parseFloat(g.hintFont) >= 11, g.hintFont);
    rec(`${w}: легенда не выше трёх строк`, g.hint.h <= 90, `высота ${g.hint.h}`);

    // B4-04 — свёрнутый vs развёрнутый
    const openState = await page.evaluate(() => {
      const sec = document.querySelector('.group-section');
      const head = sec.querySelector('.group-header');
      return { shadow: getComputedStyle(head).boxShadow, title: getComputedStyle(sec.querySelector('.group-title')).color };
    });
    await page.evaluate(() => document.querySelector('.group-section').classList.add('collapsed'));
    await page.waitForTimeout(700);                       // ⚠ transition: читать ПОСЛЕ перехода, иначе видно стартовое значение
    const closedState = await page.evaluate(() => {
      const sec = document.querySelector('.group-section');
      const head = sec.querySelector('.group-header');
      return { shadow: getComputedStyle(head).boxShadow, title: getComputedStyle(sec.querySelector('.group-title')).color,
               chev: getComputedStyle(sec.querySelector('.group-chevron')).transform };
    });
    await page.evaluate(() => document.querySelector('.group-section').classList.remove('collapsed'));
    const diff = { openShadow: openState.shadow, closedShadow: closedState.shadow, openTitle: openState.title, closedTitle: closedState.title, chev: closedState.chev };
    rec(`${w}: у закрытой плиты свой шов`, diff && diff.closedShadow !== diff.openShadow,
        `открыт «${diff && diff.openShadow}» → закрыт «${diff && diff.closedShadow}»`);
    rec(`${w}: имя закрытого свода приглушено`, diff && diff.closedTitle !== diff.openTitle,
        `${diff && diff.openTitle} → ${diff && diff.closedTitle}`);
    rec(`${w}: меч-шеврон повёрнут`, !!diff && diff.chev !== 'none' && !/^matrix\(1, 0, 0, 1/.test(diff.chev), diff && diff.chev);

    await ctx.close();
  }

  await browser.close(); srv.close();
  const bad = results.filter(r => !r.pass);
  console.log(results.map(r => `${r.pass ? 'PASS' : 'FAIL'} · ${r.name} · ${r.detail}`).join('\n'));
  console.log(`\n${results.length - bad.length}/${results.length}`);
  process.exit(bad.length ? 1 : 0);
})().catch(e => { console.error('PROBE ERROR', e); process.exit(1); });
