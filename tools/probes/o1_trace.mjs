// O-1 — МОТИОН-ЗАМЕР (сперва замер, потом фиксы).
// Гоняет сценарии из audit-v2/MOTION-PLAN §«Отложено» по СОБРАННОМУ dist в системном
// Chrome с троттлингом CPU и снимает НАСТОЯЩИЙ трейс DevTools по каждому сценарию:
// сколько времени кадры провели в Recalculate Style / Layout / Paint / Composite и
// сколько кадров вышло за бюджет. Печатает таблицу + пишет сырьё в JSON.
//
// Запуск:  node o1_trace.mjs [--cpu 4] [--n 60] [--device pixel7|desktop]
import fs from 'fs';
import { serve, launch, DEVICES } from './lib.mjs';
import { perfSeed } from './seed.mjs';

const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const CPU = +arg('cpu', 4);
const N = +arg('n', 60);
const DEVKEY = arg('device', 'pixel7');
const OUT = arg('out', 'D:/tmp/pw/b1/o1_trace.json');

const DESKTOP = { width: 1280, height: 900, deviceScaleFactor: 1, isMobile: false, hasTouch: false,
                  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36' };
const dev = DEVKEY === 'desktop' ? DESKTOP : DEVICES[DEVKEY];

// Фазы кадра, которые нас интересуют (имена событий devtools.timeline).
const PHASE = {
    'UpdateLayoutTree': 'style',      // Recalculate Style
    'ParseAuthorStyleSheet': 'style',
    'Layout': 'layout',
    'UpdateLayerTree': 'layer',
    'Paint': 'paint',
    'PaintImage': 'paint',
    'Rasterize': 'raster',
    'RasterTask': 'raster',
    'CompositeLayers': 'composite',
    'Commit': 'composite',
    'FunctionCall': 'js',
    'TimerFire': 'js',
    'EventDispatch': 'js',
    'RunMicrotasks': 'js',
    'V8.Execute': 'js',
};

async function traceScenario(client, page, name, fn) {
    await client.send('Tracing.start', {
        transferMode: 'ReturnAsStream',
        traceConfig: { includedCategories: ['devtools.timeline', 'disabled-by-default-devtools.timeline', 'blink.user_timing'] },
    });
    // Счётчик кадров в самой странице — кросс-проверка трейса.
    await page.evaluate(() => {
        window.__frames = [];
        window.__rafOn = true;
        let last = performance.now();
        const tick = (t) => { window.__frames.push(+(t - last).toFixed(2)); last = t; if (window.__rafOn) requestAnimationFrame(tick); };
        requestAnimationFrame(tick);
    });
    const t0 = Date.now();
    await fn();
    const wallMs = Date.now() - t0;
    const frames = await page.evaluate(() => { window.__rafOn = false; return window.__frames; });

    const done = new Promise(r => client.once('Tracing.tracingComplete', r));
    await client.send('Tracing.end');
    const ev = await done;
    let raw = '';
    if (ev.stream) {
        for (;;) {
            const chunk = await client.send('IO.read', { handle: ev.stream, size: 5 * 1024 * 1024 });
            raw += chunk.data;
            if (chunk.eof) break;
        }
        await client.send('IO.close', { handle: ev.stream });
    }
    let events = [];
    try { const j = JSON.parse(raw); events = Array.isArray(j) ? j : (j.traceEvents || []); } catch (_) {}

    const byPhase = {}, byName = {}, countByName = {};
    let longest = { name: null, ms: 0 };
    for (const e of events) {
        if (e.ph !== 'X' || !e.dur) continue;
        const ms = e.dur / 1000;
        byName[e.name] = +((byName[e.name] || 0) + ms).toFixed(1);
        countByName[e.name] = (countByName[e.name] || 0) + 1;
        const p = PHASE[e.name];
        if (p) byPhase[p] = +((byPhase[p] || 0) + ms).toFixed(1);
        if (ms > longest.ms && (p || e.name === 'RunTask')) longest = { name: e.name, ms: +ms.toFixed(1) };
    }
    // Кадры: считаем только «рабочие» (первый кадр после старта rAF всегда мусорный).
    const fr = frames.slice(1);
    const over16 = fr.filter(d => d > 16.7).length;
    const over33 = fr.filter(d => d > 33).length;
    const worst = fr.length ? Math.max(...fr) : 0;
    const med = fr.length ? [...fr].sort((a, b) => a - b)[Math.floor(fr.length / 2)] : 0;
    return { name, wallMs, layoutN: countByName.Layout || 0, styleN: countByName.UpdateLayoutTree || 0, frames: fr.length, med, over16, over33, worst: +worst.toFixed(1), byPhase, longest,
             topNames: Object.entries(byName).sort((a, b) => b[1] - a[1]).slice(0, 8) };
}

const { srv, port } = await serve();
const browser = await launch();
const ctx = await browser.newContext({
    viewport: { width: dev.width, height: dev.height }, deviceScaleFactor: dev.deviceScaleFactor,
    isMobile: dev.isMobile, hasTouch: dev.hasTouch, userAgent: dev.userAgent,
    reducedMotion: 'no-preference', colorScheme: 'dark',
});
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
const seed = perfSeed(N);
await page.addInitScript((st) => {
    try { localStorage.clear(); } catch (e) {}
    localStorage.setItem('duskState_v4', JSON.stringify(st));
    localStorage.setItem('currentPage', 'main');
    localStorage.setItem('isFiltered', '0');
    try { indexedDB.deleteDatabase('keyval-store'); } catch (e) {}
}, seed);

const client = await ctx.newCDPSession(page);
await client.send('Emulation.setCPUThrottlingRate', { rate: CPU });

const bootT0 = Date.now();
await page.goto(`http://localhost:${port}/index.html`, { waitUntil: 'load' });
await page.waitForSelector('.task-item', { timeout: 30000 });
const bootMs = Date.now() - bootT0;
await page.waitForTimeout(1200);   // дать осесть анимациям входа

const dom = await page.evaluate(() => ({
    tasks: document.querySelectorAll('.task-item').length,
    subs: document.querySelectorAll('.subtask-item').length,
    nodes: document.querySelectorAll('*').length,
    scrollH: document.documentElement.scrollHeight,
}));

const results = [];

// S1 — скролл списка колесом (реальный ввод, не scrollTo: так работает композитор).
results.push(await traceScenario(client, page, 'S1 скролл списка', async () => {
    await page.mouse.move(dev.width / 2, dev.height / 2);
    for (let i = 0; i < 14; i++) { await page.mouse.wheel(0, 320); await page.waitForTimeout(90); }
    await page.waitForTimeout(300);
}));

// S2 — сворачивание/разворачивание свода (grid-template-rows / max-height).
results.push(await traceScenario(client, page, 'S2 свод: свернуть/развернуть', async () => {
    const hdr = await page.$('.group-header');
    if (!hdr) return;
    for (let i = 0; i < 4; i++) { await hdr.click(); await page.waitForTimeout(420); }
}));

// S3 — секция звеньев одного обета.
results.push(await traceScenario(client, page, 'S3 звенья: свернуть/развернуть', async () => {
    const btn = await page.$('.btn-subtask-toggle');
    if (!btn) return;
    for (let i = 0; i < 4; i++) { await btn.click(); await page.waitForTimeout(420); }
}));

// S4 — уход строки (max-height-схлопывание при погребении обета) — п.4 плана.
// Кнопка «В склеп» на coarse спрятана в ⋯-меню, поэтому дёргаем действие напрямую:
// меряем САМУ анимацию ухода строки, а не путь до кнопки.
results.push(await traceScenario(client, page, 'S4 обет уходит в склеп', async () => {
    for (let i = 0; i < 4; i++) {
        const ok = await page.evaluate(() => {
            const li = document.querySelector('.task-item[data-id]');
            if (!li) return false;
            const id = parseInt(li.dataset.id);
            if (typeof removeTask !== 'function' || isNaN(id)) return false;
            removeTask(id);
            return true;
        });
        if (!ok) break;
        await page.waitForTimeout(700);
    }
}));

// S5 — склеп: открыть страницу и проскроллить (кандидат на content-visibility).
results.push(await traceScenario(client, page, 'S5 склеп: открыть + скролл', async () => {
    await page.click('#nav-archive').catch(() => {});
    await page.waitForTimeout(700);
    await page.mouse.move(dev.width / 2, dev.height / 2);
    for (let i = 0; i < 8; i++) { await page.mouse.wheel(0, 320); await page.waitForTimeout(90); }
    await page.waitForTimeout(300);
}));

// S6 — Гримуар: свернуть/развернуть запись (сценарий из плана).
results.push(await traceScenario(client, page, 'S6 Гримуар: свернуть запись', async () => {
    await page.click('#nav-notes').catch(() => {});
    await page.waitForTimeout(900);
    const leaf = await page.$('.grim-leaf');
    if (leaf) { await leaf.click(); await page.waitForTimeout(700); }
    const col = await page.$('[data-act="grimToggleCollapse"]');
    if (col) for (let i = 0; i < 4; i++) { await col.click(); await page.waitForTimeout(500); }
}));

console.log(`\nO-1 МОТИОН-ЗАМЕР · device=${DEVKEY} ${dev.width}x${dev.height} · CPU×${CPU} · обетов=${N}`);
console.log(`бут: ${bootMs} мс · строк ${dom.tasks} · звеньев ${dom.subs} · узлов DOM ${dom.nodes} · высота ${dom.scrollH}px`);
console.log('');
console.log('сценарий                        | кадров | медиана | >16.7 | >33 | худший | style | layout | paint | raster | composite | js');
console.log('-'.repeat(140));
for (const r of results) {
    const p = r.byPhase;
    const col = (v) => String(v ?? 0).padStart(6);
    console.log(
        r.name.padEnd(31) + ' |' + String(r.frames).padStart(7) + ' |' + String(r.med).padStart(8) + ' |'
        + String(r.over16).padStart(6) + ' |' + String(r.over33).padStart(4) + ' |' + String(r.worst).padStart(7) + ' |'
        + col(p.style) + ' |' + col(p.layout) + ' |' + col(p.paint) + ' |' + col(p.raster) + ' |' + col(p.composite) + '    |' + col(p.js)
    );
}
console.log('\n(мс суммарно за сценарий по фазам; «худший» — самый длинный кадр rAF, мс)\n');
for (const r of results) {
    console.log(`— ${r.name}: самое долгое событие ${r.longest.name} ${r.longest.ms} мс · топ: ` +
        r.topNames.map(([n, v]) => `${n} ${v}`).join(' · '));
}
if (errors.length) console.log('\nОШИБКИ СТРАНИЦЫ:', errors.slice(0, 5));

fs.writeFileSync(OUT, JSON.stringify({ device: DEVKEY, cpu: CPU, n: N, bootMs, dom, results }, null, 1));
console.log(`\nсырьё → ${OUT}`);

await ctx.close(); await browser.close(); srv.close();
