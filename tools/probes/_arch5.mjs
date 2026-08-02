// Дым-проба партии 4 + свипа T1: <use> на новые symbol'ы (в т.ч. в JS-меню)
// и орлой в пикере времени. Проверяем НЕ наличие узла, а ненулевой bbox —
// битая ссылка <use> оставляет элемент в DOM, но не рисует ничего.
import { chromium } from 'playwright-core';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const URL = 'http://localhost:4173/';

const br = await chromium.launch({ executablePath: CHROME, headless: true });
const pg = await br.newPage({ viewport: { width: 1280, height: 900 } });
const errs = [];
pg.on('pageerror', e => errs.push(String(e)));
await pg.goto(URL, { waitUntil: 'load' });
await pg.waitForFunction(() => typeof globalThis.switchPage === 'function');
await pg.waitForTimeout(700);

const box = (sel) => pg.evaluate((s) => {
  const el = document.querySelector(s);
  if (!el) return 'НЕТ УЗЛА';
  const r = el.getBoundingClientRect();
  return `${Math.round(r.width)}x${Math.round(r.height)}`;
}, sel);

console.log('symbols in defs      :', await pg.evaluate(() =>
  ['icon-archive-all', 'icon-archive-sel', 'icon-archive'].map(id => id + '=' + !!document.getElementById(id)).join(' ')));
console.log('тулбар «всё»  <use>  :', await box('#btn-archive-all use'));
console.log('нав-таб Архив svg    :', await box('#nav-archive svg'));
console.log('заголовок Архив svg  :', await box('#archive-title-icon svg'));

// пункт overflow-меню тулбара «Архивировать всё» (IC.archiveAll через <use>)
await pg.evaluate(() => document.getElementById('btn-tools')?.click());
await pg.waitForTimeout(300);
console.log('меню «всё»    <use>  :', await box('[data-more="archiveAll"] use'));
await pg.keyboard.press('Escape');
await pg.waitForTimeout(200);

// режим выбора → кнопка bulk-archive
await pg.evaluate(() => globalThis.toggleMainSelectMode && globalThis.toggleMainSelectMode());
await pg.waitForTimeout(300);
console.log('bulk-archive  <use>  :', await box('#btn-bulk-archive use'));
await pg.evaluate(() => globalThis.toggleMainSelectMode && globalThis.toggleMainSelectMode());
await pg.waitForTimeout(200);

// модалка дедлайна → пикер времени (орлой) и очистка времени
await pg.evaluate(() => globalThis.openDeadlineModal && globalThis.openDeadlineModal());
await pg.waitForTimeout(500);
console.log('пикер времени svg    :', await box('#dl-time ~ .seg-picker-btn svg, .seg-input-row .seg-picker-btn svg'));
console.log('очистка времени svg  :', await box('.seg-input-row .seg-clear-btn svg'));
console.log('циферблатов в модалке:', await pg.evaluate(() =>
  document.querySelectorAll('#deadline-modal .seg-picker-btn svg circle[r="10"]').length));
console.log('песочных часов везде :', await pg.evaluate(() =>
  document.body.innerHTML.split('C6.5 3.5 C6.5').length - 1));

console.log('pageerror            :', errs.length ? errs : 'нет');
await br.close();
