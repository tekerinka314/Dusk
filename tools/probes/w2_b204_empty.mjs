// W2-9 (V2-B2-04 + V2-B5-09) — зонд пустых состояний по dist.
// Проверяет ФАКТ отрисовки (глиф не пустой прямоугольник), верные строки и
// перекидывание глифа под фильтром. Плюс скриншоты для глазного контроля.
import { serve, launch, openApp, ensureShots } from './lib.mjs';
import { richSeed } from './seed.mjs';

const emptySeed = { tasks: [], groups: [], archive: [], notes: [], templates: [], journal: [] };

const box = async (p, sel) => p.evaluate((s) => {
  const el = document.querySelector(s);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { w: Math.round(r.width), h: Math.round(r.height), vis: getComputedStyle(el).visibility };
}, sel);

const txt = async (p, sel) => p.evaluate((s) => (document.querySelector(s)?.textContent || '').trim(), sel);

let pass = 0, fail = 0;
const check = (name, ok, extra = '') => { ok ? pass++ : fail++; console.log(`${ok ? 'PASS' : 'FAIL'} · ${name}${extra ? ' · ' + extra : ''}`); };

const { srv, port } = await serve();
const browser = await launch();
const shots = ensureShots('w2-9');

// 1 · задач нет вовсе → «Алтарь пуст» + свеча
{
  const { ctx, page, errors } = await openApp(browser, { device: 'pixel7', page: 'main', seed: emptySeed, port });
  const t = await txt(page, '#empty-state p');
  const sub = await txt(page, '#empty-state .empty-sub');
  const href = await page.evaluate(() => document.querySelector('#empty-state .empty-rune use')?.getAttribute('href'));
  const g = await box(page, '#empty-state .empty-rune svg');
  const btn = await txt(page, '#empty-add-btn');
  const btnVis = await page.evaluate(() => getComputedStyle(document.getElementById('empty-add-btn')).display);
  check('нет задач · заголовок', t === 'Алтарь пуст', t);
  check('нет задач · подстрока', sub === 'Ни одного обета ещё не дано', sub);
  check('нет задач · глиф = свеча', href === '#icon-candle-unlit', String(href));
  check('нет задач · глиф отрисован', !!g && g.w >= 40 && g.h >= 40, JSON.stringify(g));
  check('нет задач · CTA пером', btn === 'Дать первый обет' && btnVis !== 'none', `${btn}/${btnVis}`);
  await page.screenshot({ path: `${shots}/empty-no-tasks.png` });
  check('нет задач · без ошибок консоли', errors.length === 0, errors.join('|'));
  await ctx.close();
}

// 2 · задачи есть, но фильтр всё скрыл → «Тишина в ответ» + скраинг-шар
{
  const { ctx, page, errors } = await openApp(browser, { device: 'pixel7', page: 'main', seed: richSeed(), port });
  await page.evaluate(() => {
    const box = document.getElementById('search-box');
    box.value = 'zzzzнетничего';
    box.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await page.waitForTimeout(400);
  const t = await txt(page, '#empty-state p');
  const sub = await txt(page, '#empty-state .empty-sub');
  const href = await page.evaluate(() => document.querySelector('#empty-state .empty-rune use')?.getAttribute('href'));
  const btnVis = await page.evaluate(() => getComputedStyle(document.getElementById('empty-add-btn')).display);
  const g = await box(page, '#empty-state .empty-rune svg');
  check('фильтр · заголовок', t === 'Тишина в ответ', t);
  check('фильтр · подстрока', sub === 'Ни одна задача не отозвалась на зов', sub);
  check('фильтр · глиф = скраинг-шар', href === '#icon-scrying', String(href));
  check('фильтр · глиф отрисован', !!g && g.w >= 40, JSON.stringify(g));
  check('фильтр · CTA скрыт', btnVis === 'none', btnVis);
  await page.screenshot({ path: `${shots}/empty-filtered.png` });
  check('фильтр · без ошибок консоли', errors.length === 0, errors.join('|'));
  await ctx.close();
}

// 3 · архив пуст
{
  const { ctx, page } = await openApp(browser, { device: 'pixel7', page: 'archive', seed: emptySeed, port });
  const t = await txt(page, '#archive-empty p');
  const sub = await txt(page, '#archive-empty .empty-sub');
  const g = await box(page, '#archive-empty .empty-rune svg');
  check('архив · заголовок', t === 'Архив пуст', t);
  check('архив · подстрока', sub === 'Ни одно деяние ещё не погребено', sub);
  check('архив · глиф отрисован', !!g && g.w >= 40, JSON.stringify(g));
  await page.screenshot({ path: `${shots}/empty-archive.png` });
  await ctx.close();
}

// 4 · поиск Гримуара без результата = полная плита
{
  const { ctx, page } = await openApp(browser, { device: 'pixel7', page: 'notes', seed: richSeed(), port });
  await page.evaluate(() => {
    const box = document.getElementById('notes-search-box');
    if (box) { box.value = 'zzzzнетничего'; box.dispatchEvent(new Event('input', { bubbles: true })); }
  });
  await page.waitForTimeout(400);
  const t = await txt(page, '.grim-empty-inline p');
  const sub = await txt(page, '.grim-empty-inline .grim-empty-sub');
  const g = await box(page, '.grim-empty-inline .grim-empty-ic svg');
  check('гримуар · заголовок', t === 'Тишина в ответ', t);
  check('гримуар · подстрока', sub === 'Ни одна запись не отозвалась на зов', sub);
  check('гримуар · глиф отрисован', !!g && g.w >= 30, JSON.stringify(g));
  await page.screenshot({ path: `${shots}/empty-grimoire.png` });
  await ctx.close();
}

// 5 · все задачи выполнены → запечатанный гроб
{
  const s = richSeed();
  s.tasks = s.tasks.map(t => ({ ...t, checked: true, subtasks: (t.subtasks || []).map(x => ({ ...x, checked: true })) }));
  const { ctx, page } = await openApp(browser, { device: 'pixel7', page: 'main', seed: s, port, extraInit: () => localStorage.setItem('isFiltered', '1') });
  const disp = await page.evaluate(() => getComputedStyle(document.getElementById('all-done')).display);
  const t = await txt(page, '#all-done p');
  const sub = await txt(page, '#all-done .empty-sub');
  const g = await box(page, '#all-done .all-done-icon svg');
  check('всё выполнено · плита видна', disp !== 'none', disp);
  check('всё выполнено · заголовок', t === 'Все обеты исполнены', t);
  check('всё выполнено · подстрока', sub === 'Ночь может забрать своё', sub);
  check('всё выполнено · глиф отрисован', !!g && g.w >= 30, JSON.stringify(g));
  await page.screenshot({ path: `${shots}/empty-all-done.png` });
  await ctx.close();
}

console.log(`\n${pass} PASS · ${fail} FAIL · shots: ${shots}`);
await browser.close(); srv.close();
process.exit(fail ? 1 : 0);
