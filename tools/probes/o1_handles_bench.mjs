// O-1: прямой микро-A/B двух реализаций раскладки ручек перетаскивания на ЖИВОМ DOM.
// Обе версии реализованы здесь же и гоняются по очереди по одним и тем же строкам —
// машинный шум делится поровну, разница (если она есть) видна.
import { serve, launch, DEVICES } from './lib.mjs';
import { perfSeed } from './seed.mjs';

const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const N = +arg('n', 60);
const CPU = +arg('cpu', 4);
const dev = DEVICES.pixel7;

const { srv, port } = await serve();
const browser = await launch();
const ctx = await browser.newContext({
    viewport: { width: dev.width, height: dev.height }, deviceScaleFactor: dev.deviceScaleFactor,
    isMobile: dev.isMobile, hasTouch: dev.hasTouch, userAgent: dev.userAgent,
    reducedMotion: 'no-preference', colorScheme: 'dark',
});
const page = await ctx.newPage();
await page.addInitScript((st) => {
    try { localStorage.clear(); } catch (e) {}
    localStorage.setItem('duskState_v4', JSON.stringify(st));
    localStorage.setItem('currentPage', 'main');
    localStorage.setItem('isFiltered', '0');
    try { indexedDB.deleteDatabase('keyval-store'); } catch (e) {}
}, perfSeed(N));
const client = await ctx.newCDPSession(page);
await client.send('Emulation.setCPUThrottlingRate', { rate: CPU });
await page.goto(`http://localhost:${port}/index.html`, { waitUntil: 'load' });
await page.waitForSelector('.task-item');
await page.waitForTimeout(3000);

const res = await page.evaluate((reps) => {
    const NAT = 46, GAP = 6, HH = 14;   // приблизительные константы: важны не значения, а профиль чтений/записей
    const rows = [...document.querySelectorAll('.task-item')];
    const reset = (h, c) => { h.style.position=''; h.style.top=''; h.style.left=''; h.style.transform=''; h.style.margin=''; c.style.alignSelf=''; c.style.position=''; };

    function legacy() {
        for (const item of rows) {
            const col = item.querySelector('.task-check-col'), check = item.querySelector('.task-check');
            const handle = item.querySelector('.drag-handle'), content = item.querySelector('.task-content');
            if (!col || !check || !handle || !content) continue;
            if (content.offsetHeight > NAT) {                       // ЧТЕНИЕ
                col.style.alignSelf = 'stretch'; col.style.position = 'relative';   // ЗАПИСЬ
                const colH = col.offsetHeight, checkH = check.offsetHeight;         // ЧТЕНИЕ (принудительный layout)
                const top = checkH + Math.max(GAP, (colH - checkH - HH) / 2);
                handle.style.position='absolute'; handle.style.top=Math.round(top)+'px';
                handle.style.left='50%'; handle.style.transform='translateX(-50%)'; handle.style.margin='0';   // ЗАПИСЬ
            } else reset(handle, col);
        }
    }
    function batched() {
        const list = [];
        for (const item of rows) {
            const col = item.querySelector('.task-check-col'), check = item.querySelector('.task-check');
            const handle = item.querySelector('.drag-handle'), content = item.querySelector('.task-content');
            if (!col || !check || !handle || !content) continue;
            list.push({ col, check, handle, content });
        }
        for (const r of list) r.tall = r.content.offsetHeight > NAT;                 // все ЧТЕНИЯ
        for (const r of list) {                                                      // все ЗАПИСИ
            if (r.tall) { r.col.style.alignSelf='stretch'; r.col.style.position='relative'; }
            else reset(r.handle, r.col);
        }
        for (const r of list) if (r.tall) { r.colH = r.col.offsetHeight; r.checkH = r.check.offsetHeight; }   // все ЧТЕНИЯ
        for (const r of list) {                                                      // все ЗАПИСИ
            if (!r.tall) continue;
            const top = r.checkH + Math.max(GAP, (r.colH - r.checkH - HH) / 2);
            r.handle.style.position='absolute'; r.handle.style.top=Math.round(top)+'px';
            r.handle.style.left='50%'; r.handle.style.transform='translateX(-50%)'; r.handle.style.margin='0';
        }
    }
    // Каждый замер стартует с ГРЯЗНОЙ вёрстки — как в приложении (ручки раскладываются
    // сразу после рендера списка). Иначе второй участник меряется по уже посчитанному
    // layout и выглядит быстрее просто из-за очереди.
    let dirt = 0;
    const timeIt = (fn) => { document.getElementById('list-container').style.paddingTop = (++dirt % 2) + 'px'; const t = performance.now(); fn(); document.body.offsetHeight; return performance.now() - t; };
    const L = [], B = [];
    for (let i = 0; i < reps; i++) { if (i % 2) { L.push(timeIt(legacy)); B.push(timeIt(batched)); } else { B.push(timeIt(batched)); L.push(timeIt(legacy)); } }   // чередуем И меняем порядок
    const med = a => { const s = [...a].sort((x, y) => x - y); return +s[Math.floor(s.length / 2)].toFixed(2); };
    return { rows: rows.length, legacy: med(L), batched: med(B), legacyAll: L.map(x => +x.toFixed(1)), batchedAll: B.map(x => +x.toFixed(1)) };
}, 9);

console.log(`строк ${res.rows} · CPU×${CPU}`);
console.log(`  чередование чтений/записей (как было): медиана ${res.legacy} мс   ${res.legacyAll.join(' ')}`);
console.log(`  пакетами 4 прохода (как стало):        медиана ${res.batched} мс   ${res.batchedAll.join(' ')}`);
console.log(`  выигрыш: ${(100 * (res.legacy - res.batched) / res.legacy).toFixed(0)}%`);

await ctx.close(); await browser.close(); srv.close();
