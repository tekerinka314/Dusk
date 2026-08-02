// Невидимый в innerText копирайт: title / aria-label / placeholder по всем трём
// страницам + раскрытые «Условия». Ратчет сканирует исходники, здесь — факт DOM.
import { serve, launch, openApp } from './lib.mjs';
import { richSeed } from './seed.mjs';

const MOBILE = { width: 412, height: 915, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
  userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36' };
const DESKTOP = { width: 1280, height: 900, deviceScaleFactor: 1, isMobile: false, hasTouch: false,
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36' };

const GRAB = () => {
  const out = new Set();
  for (const el of document.querySelectorAll('[title], [aria-label], [placeholder], [aria-labelledby]')) {
    for (const a of ['title', 'aria-label', 'placeholder']) {
      const v = el.getAttribute(a);
      if (v && /[А-Яа-яЁё]/.test(v)) out.add(v.trim());
    }
  }
  return [...out];
};

const { srv, port } = await serve();
const browser = await launch();
const all = new Set();
for (const dev of [MOBILE, DESKTOP]) {
  for (const pg of ['main', 'archive', 'notes']) {
    const { ctx, page: p } = await openApp(browser, { device: dev, page: pg, seed: richSeed(), port });
    await p.waitForTimeout(500);
    if (pg === 'main') { await p.evaluate('toggleExpand()').catch(() => {}); await p.waitForTimeout(300); }
    (await p.evaluate(GRAB)).forEach(v => all.add(v));
    await ctx.close();
  }
}
await browser.close(); srv.close();

const FORBIDDEN = [
  [/задач|Задач/, 'обет'], [/[Аа]рхив/, 'склеп'], [/дедлайн|Дедлайн/, 'исход'],
  [/[Пп]риоритет/, 'ранг'], [/[Шш]аблон/, 'образец'], [/[Гг]рупп/, 'свод'],
  [/[Цц]вет/, 'витраж'], [/[Зз]аметк/, 'примечание/запись'], [/[Ии]мпорт|[Ээ]кспорт/, 'свиток'],
  [/[Кк]онфликт/, 'разночтение'], [/[Пп]одпункт/, 'звено'], [/[Аа]ктивн|[Вв]ыполненн/, 'неисполненные/исполненные'],
  [/[Пп]оиск|[Ии]скать/, 'зов'], [/[Зз]акреп|[Оо]ткреп/, 'приковать'], [/[Фф]окус/, 'замкнуться'],
  [/[Уу]ведомлен/, 'вести'], [/[Пп]ереименов/, 'наречь'], [/[Оо]чистить|[Оо]чистка/, 'снять/опустошить'],
  [/[Рр]езервн/, 'полный свиток'], [/[Сс]нимк/, 'слепок'], [/[Уу]далить навсегда/, 'уничтожить'],
];
const sorted = [...all].sort((a, b) => a.localeCompare(b, 'ru'));
console.log('— всего строк атрибутов: ' + sorted.length + ' —\n');
let leaks = 0;
for (const s of sorted) {
  const hit = FORBIDDEN.find(([re]) => re.test(s));
  if (hit) { console.log('  ⚠ «' + s + '»  → ' + hit[1]); leaks++; }
}
console.log(leaks ? `\nВСЕГО ТЕЧЕЙ: ${leaks}` : '\nтечей нет');
console.log('\n--- ВЕСЬ СПИСОК ---');
console.log(sorted.join('\n'));
