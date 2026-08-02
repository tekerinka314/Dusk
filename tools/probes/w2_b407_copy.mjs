// W2-8 / V2-B4-07 — что РЕАЛЬНО читает человек в «Разобрать конфликты».
// Сидим по одной записи каждого вида (включая поля, которые раньше текли сырьём)
// и снимаем текст строк из dist. Вердикт: ни одного внутреннего ключа/JSON.
import { serve, launch, openApp } from './lib.mjs';
import { richSeed } from './seed.mjs';

const DESKTOP = { width: 1280, height: 900, deviceScaleFactor: 1, isMobile: false, hasTouch: false,
                  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36' };

const { srv, port } = await serve();
const browser = await launch();
const { page, errors } = await openApp(browser, { device: DESKTOP, page: 'main', seed: richSeed(), port });
await page.waitForTimeout(400);

await page.evaluate(() => {
  const t = (state.tasks || [])[0] || {};
  const g = (state.groups || [])[0] || {};
  const now = Date.now();
  state.syncJournal = [
    { uid: 'q1', kind: 'field', recType: 'tasks',  recUid: t.uid, field: 'text',     loser: 'Старый заголовок', at: now, resolved: false },
    { uid: 'q2', kind: 'field', recType: 'tasks',  recUid: t.uid, field: 'priority', loser: 'high',             at: now, resolved: false },
    { uid: 'q3', kind: 'field', recType: 'tasks',  recUid: t.uid, field: 'pinned',   loser: true,               at: now, resolved: false },
    { uid: 'q4', kind: 'field', recType: 'tasks',  recUid: t.uid, field: 'repeat',   loser: 'weekdays',         at: now, resolved: false },
    { uid: 'q5', kind: 'field', recType: 'tasks',  recUid: t.uid, field: 'deadline', loser: { mode: 'date', value: new Date(now + 864e5).toISOString().slice(0, 10) }, at: now, resolved: false },
    // кривая форма (value числом вместо 'YYYY-MM-DD') — так приезжает мусор с чужого устройства
    { uid: 'q5b', kind: 'field', recType: 'tasks', recUid: t.uid, field: 'deadline', loser: { mode: 'date', value: now + 864e5 }, at: now, resolved: false },
    { uid: 'q6', kind: 'field', recType: 'groups', recUid: g.uid, field: 'name',     loser: 'Старое название',  at: now, resolved: false },
    { uid: 'q7', kind: 'field', recType: 'notes',  recUid: 'n1',  field: 'body',     loser: '<p>Текст записи</p>', at: now, resolved: false },
    { uid: 'q8', kind: 'subtask', parentUid: t.uid, loser: { text: 'Подпункт с другого устройства' }, at: now, resolved: false },
    { uid: 'q9', kind: 'delete-vs-edit', recType: 'tasks', loser: { text: 'Удалённая задача' }, at: now, resolved: false },
    { uid: 'q10', kind: 'note-both', recType: 'notes', loser: { body: 'Вторая копия' }, at: now, resolved: false },
    { uid: 'q11', kind: 'field', recType: 'tasks', recUid: t.uid, field: 'какое-то-новое-поле', loser: 'x', at: now, resolved: false },
  ];
  openQuarantine();
});
await page.waitForSelector('#quar-overlay', { timeout: 3000 });
await page.waitForTimeout(300);

const rows = await page.$$eval('.sync-quar-row', rs => rs.map(r => ({
  what: r.querySelector('.sync-quar-what').textContent.trim(),
  loser: r.querySelector('.sync-quar-loser').textContent.trim(),
})));

console.log('--- строки панели ---');
for (const r of rows) console.log(`  «${r.what}»  →  «${r.loser}»`);

const all = rows.map(r => r.what + ' ' + r.loser).join(' | ');
const LEAKS = [
  ['внутреннее имя поля в кавычках', /«(text|name|body|title|priority|pinned|repeat|deadline|color|order|_groupUid|checked)»/],
  ['JSON в значении',                /[{}]|"\w+":/],
  ['сырое значение приоритета',      /\b(high|medium|low)\b/],
  ['сырое значение повтора',         /\b(weekdays|daily|weekly|monthly)\b/],
  ['булево как true/false',          /\b(true|false)\b/],
  ['HTML-разметка',                  /<\w+/],
  ['мусор форматтера',               /NaN|undefined|Invalid/],
];
console.log('--- ВЕРДИКТ ---');
let bad = 0;
for (const [name, re] of LEAKS) {
  const hit = all.match(re);
  if (hit) bad++;
  console.log((hit ? 'FAIL ' : 'PASS ') + name + (hit ? ` → ${hit[0]}` : ''));
}
console.log((rows.length === 12 ? 'PASS ' : 'FAIL ') + `все 12 строк отрисованы (${rows.length})`);
if (errors.length) console.log('console errors:', errors.slice(0, 5));
console.log(bad === 0 ? 'ИТОГ: течей нет' : `ИТОГ: течей ${bad}`);

await browser.close(); srv.close();
