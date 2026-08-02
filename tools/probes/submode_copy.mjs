// Меню «Исполнение обета по звеньям»: заголовки обоих меню, пункт ⋯-меню и
// title кнопки тулбара — по факту DOM, а не по исходникам.
import { serve, launch, openApp } from './lib.mjs';
import { richSeed } from './seed.mjs';
const M = { width: 412, height: 915, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
  userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36' };
const { srv, port } = await serve();
const b = await launch();
const { ctx, page: p, errors } = await openApp(b, { device: M, page: 'main', seed: richSeed(), port });
await p.waitForTimeout(500);

const btnTitle = await p.evaluate(`document.getElementById('btn-sub-anymode')?.getAttribute('title')`);
await p.evaluate(`document.getElementById('btn-sub-anymode').click()`);
await p.waitForTimeout(400);
const glob = await p.evaluate(`(() => {
  const m = document.querySelector('.submode-menu'); if (!m) return null;
  return m.innerText.trim().split(String.fromCharCode(10)).filter(Boolean).join(" | ");
})()`);
await p.evaluate(`closeFloatMenu()`);
await p.waitForTimeout(250);

await p.evaluate(`[...document.querySelectorAll('.task-item')].find(t => t.querySelector('.subtask-item')).querySelector('.btn-task-more').click()`);
await p.waitForTimeout(400);
const more = await p.evaluate(`[...document.querySelectorAll('.float-menu, .snooze-menu')].map(m => m.innerText).join(' | ').split(String.fromCharCode(10)).filter(Boolean).join(" | ")`);
const item = /Исполнение по звеньям/.test(more);
await p.evaluate(`document.querySelector('[data-more="submode"]')?.click()`);
await p.waitForTimeout(400);
const perTask = await p.evaluate(`document.querySelector('.submode-menu')?.innerText.trim().split(String.fromCharCode(10)).filter(Boolean).join(" | ") || null`);

console.log('title кнопки:', btnTitle);
console.log('общее меню  :', glob);
console.log('⋯-меню обета:', item ? 'пункт «Исполнение по звеньям» ЕСТЬ' : 'ПУНКТА НЕТ · ' + more.slice(0, 160));
console.log('меню обета  :', perTask);
const checks = [
  ['title кнопки — динамический, без «Чек»', /^Обет исполняется по /.test(btnTitle)],
  ['заголовок общего меню', /исполнение обета по звеньям/i.test(glob || '')],
  ['пункт ⋯-меню', item],
  ['заголовок меню одного обета', /исполнение обета по звеньям/i.test(perTask || '')],
  ['пункты внутри не тронуты', /По всем звеньям/.test(glob || '') && /По любому звену/.test(glob || '')],
  ['ошибок консоли нет', errors.length === 0],
];
let bad = 0;
for (const [n, ok] of checks) { console.log((ok ? 'PASS ' : 'FAIL ') + n); if (!ok) bad++; }
await b.close(); srv.close();
process.exit(bad ? 1 : 0);
