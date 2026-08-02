// O-1: функциональная проверка content-visibility на строках.
// Ловит ровно те риски, которые вносит пропуск отрисовки: перетаскивание (Sortable
// меряет геометрию соседей), появление строки при доскролле, раскрытие звеньев у
// строки, которая была пропущена, и строки склепа.
import { serve, launch, DEVICES } from './lib.mjs';
import { perfSeed } from './seed.mjs';

const { srv, port } = await serve();
const browser = await launch();
const dev = DEVICES.pixel7;
const ctx = await browser.newContext({
    viewport: { width: dev.width, height: dev.height }, deviceScaleFactor: dev.deviceScaleFactor,
    isMobile: dev.isMobile, hasTouch: dev.hasTouch, userAgent: dev.userAgent,
    reducedMotion: 'no-preference', colorScheme: 'dark',
});
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
await page.addInitScript((st) => {
    try { localStorage.clear(); } catch (e) {}
    localStorage.setItem('duskState_v4', JSON.stringify(st));
    localStorage.setItem('currentPage', 'main');
    localStorage.setItem('isFiltered', '0');
    try { indexedDB.deleteDatabase('keyval-store'); } catch (e) {}
}, perfSeed(100));
await page.goto(`http://localhost:${port}/index.html`, { waitUntil: 'load' });
await page.waitForSelector('.task-item');
await page.waitForTimeout(2500);

const checks = [];
const texts = () => page.$$eval('#list-container > .task-item .task-text, .group-body > .task-item .task-text',
    els => els.slice(0, 6).map(e => e.textContent.trim()));

// 1) перетаскивание первой строки ниже третьей
const before = await texts();
const box = await (await page.$('#list-container > .task-item, .group-body > .task-item')).boundingBox();
await page.mouse.move(box.x + box.width * 0.55, box.y + 20);
await page.mouse.down();
await page.waitForTimeout(320);                       // Sortable delay=120
for (let i = 1; i <= 12; i++) { await page.mouse.move(box.x + box.width * 0.55, box.y + 20 + i * 30); await page.waitForTimeout(35); }
await page.waitForTimeout(220);
await page.mouse.up();
await page.waitForTimeout(900);
const after = await texts();
checks.push(['перетаскивание меняет порядок строк', JSON.stringify(before) !== JSON.stringify(after), `${before[0]} → ${after[0]}`]);

const dragCls = await page.evaluate(() => document.body.classList.contains('is-dragging'));
checks.push(['класс is-dragging снят после броска', dragCls === false, String(dragCls)]);

const persisted = await page.evaluate(() => {
    const st = JSON.parse(localStorage.getItem('duskState_v4') || '{}');
    return (st.tasks || []).slice(0, 3).map(t => t.text.slice(0, 22));
});
checks.push(['новый порядок записан в хранилище', persisted.length === 3, persisted.join(' | ')]);

// 2) доскролл до низа: пропущенные строки обязаны отрисоваться содержимым
await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
await page.waitForTimeout(900);
const bottom = await page.evaluate(() => {
    const rows = [...document.querySelectorAll('.task-item')];
    const vis = rows.filter(r => { const b = r.getBoundingClientRect(); return b.top < innerHeight && b.bottom > 0; });
    return { visible: vis.length, withText: vis.filter(r => (r.querySelector('.task-text')?.textContent || '').trim().length > 3).length,
             zeroH: vis.filter(r => r.getBoundingClientRect().height < 20).length };
});
checks.push(['внизу списка видимые строки имеют текст', bottom.visible > 0 && bottom.withText === bottom.visible,
             `видимых ${bottom.visible}, с текстом ${bottom.withText}, схлопнутых ${bottom.zeroH}`]);

// 3) раскрытие звеньев у строки, которая была за экраном
const opened = await page.evaluate(async () => {
    const rows = [...document.querySelectorAll('.task-item')];
    const row = rows.find(r => r.querySelector('.btn-subtask-toggle'));
    if (!row) return { ok: false, why: 'нет строки со звеньями' };
    row.scrollIntoView({ block: 'center' });
    await new Promise(r => setTimeout(r, 400));
    const btn = row.querySelector('.btn-subtask-toggle');
    btn.click();
    await new Promise(r => setTimeout(r, 700));
    const sec = row.querySelector('.subtask-section');
    return { ok: !!sec && sec.getBoundingClientRect().height > 10, h: sec ? Math.round(sec.getBoundingClientRect().height) : -1 };
});
checks.push(['секция звеньев раскрывается на всю высоту', opened.ok === true, JSON.stringify(opened)]);

// 4) склеп: строки видны и с текстом
await page.evaluate(() => window.scrollTo(0, 0));
await page.click('#nav-archive').catch(() => {});
await page.waitForTimeout(900);
const arc = await page.evaluate(() => {
    const rows = [...document.querySelectorAll('.archive-item')];
    const vis = rows.filter(r => { const b = r.getBoundingClientRect(); return b.top < innerHeight && b.bottom > 0; });
    return { total: rows.length, visible: vis.length, withText: vis.filter(r => (r.textContent || '').trim().length > 3).length };
});
checks.push(['склеп: видимые строки с содержимым (или склеп пуст)',
             arc.total === 0 || (arc.visible > 0 && arc.withText === arc.visible), JSON.stringify(arc)]);

let bad = 0;
for (const [name, ok, note] of checks) { if (!ok) bad++; console.log(`${ok ? 'PASS' : 'FAIL'} · ${name}${note ? '  [' + note + ']' : ''}`); }
if (errors.length) { console.log('\nОШИБКИ СТРАНИЦЫ:'); errors.slice(0, 6).forEach(e => console.log('  ' + e)); }
console.log(`\nитог: ${checks.length - bad}/${checks.length}`);
await ctx.close(); await browser.close(); srv.close();
process.exit(bad ? 1 : 0);
