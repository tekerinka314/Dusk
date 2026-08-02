// O-1, пункт 2 плана: НУЖЕН ли батчинг чтений scrollHeight/offset* в 02/07.
// Вместо догадок — Long Animation Frames API: он отдаёт по каждому долгому кадру
// `forcedStyleAndLayoutDuration` (сколько кадр потерял на ПРИНУДИТЕЛЬНОМ layout из JS)
// с атрибуцией по функции-виновнику. Если этот столбец около нуля — батчить нечего.
import { serve, launch, DEVICES } from './lib.mjs';
import { perfSeed } from './seed.mjs';

const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const CPU = +arg('cpu', 4);
const N = +arg('n', 60);
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
await page.waitForTimeout(2500);

const supported = await page.evaluate(() =>
    (PerformanceObserver.supportedEntryTypes || []).includes('long-animation-frame'));
if (!supported) { console.log('LoAF не поддержан этим Chrome — пункт 2 остаётся неизмеренным'); await browser.close(); srv.close(); process.exit(0); }

async function measure(name, fn) {
    await page.evaluate(() => {
        window.__loaf = [];
        window.__po = new PerformanceObserver(l => {
            for (const e of l.getEntries()) {
                window.__loaf.push({
                    dur: Math.round(e.duration),
                    blocking: Math.round(e.blockingDuration),
                    styleLayout: Math.round(e.styleAndLayoutStart ? (e.startTime + e.duration - e.styleAndLayoutStart) : 0),
                    scripts: (e.scripts || []).map(s => ({
                        forced: Math.round(s.forcedStyleAndLayoutDuration || 0),
                        dur: Math.round(s.duration || 0),
                        who: (s.sourceFunctionName || s.invoker || '?') + ' @' + String(s.sourceURL || '').split('/').pop() + ':' + (s.sourceCharPosition ?? '?'),
                    })).filter(s => s.dur > 0),
                });
            }
        });
        window.__po.observe({ type: 'long-animation-frame', buffered: false });
    });
    await fn();
    await page.waitForTimeout(400);
    const loaf = await page.evaluate(() => { window.__po.disconnect(); return window.__loaf; });

    const totalForced = loaf.reduce((a, e) => a + e.scripts.reduce((b, s) => b + s.forced, 0), 0);
    const totalBlock = loaf.reduce((a, e) => a + e.blocking, 0);
    const byWho = {};
    for (const e of loaf) for (const s of e.scripts) {
        if (!s.forced) continue;
        byWho[s.who] = (byWho[s.who] || 0) + s.forced;
    }
    console.log(`\n${name}: долгих кадров ${loaf.length} · суммарно блокировали ${totalBlock} мс · из них ПРИНУДИТЕЛЬНЫЙ layout ${totalForced} мс`);
    const top = Object.entries(byWho).sort((a, b) => b[1] - a[1]).slice(0, 6);
    if (top.length) top.forEach(([w, ms]) => console.log(`    ${String(ms).padStart(5)} мс  ${w}`));
    else console.log('    (виновников принудительного layout нет)');
    const worst = loaf.slice().sort((a, b) => b.dur - a.dur)[0];
    if (worst) console.log(`    худший кадр ${worst.dur} мс (блокировал ${worst.blocking}), скрипты: ` +
        worst.scripts.slice(0, 3).map(s => `${s.who} ${s.dur}мс(forced ${s.forced})`).join(' · '));
}

await measure('S1 скролл', async () => {
    await page.mouse.move(dev.width / 2, dev.height / 2);
    for (let i = 0; i < 14; i++) { await page.mouse.wheel(0, 320); await page.waitForTimeout(90); }
});
await measure('S2 свод свернуть/развернуть', async () => {
    const hdr = await page.$('.group-header');
    if (hdr) for (let i = 0; i < 4; i++) { await hdr.click(); await page.waitForTimeout(420); }
});
await measure('S3 звенья', async () => {
    const btn = await page.$('.btn-subtask-toggle');
    if (btn) for (let i = 0; i < 4; i++) { await btn.click(); await page.waitForTimeout(420); }
});
await measure('S4 обет уходит в склеп', async () => {
    for (let i = 0; i < 4; i++) {
        const ok = await page.evaluate(() => {
            const li = document.querySelector('.task-item[data-id]');
            if (!li || typeof removeTask !== 'function') return false;
            removeTask(parseInt(li.dataset.id)); return true;
        });
        if (!ok) break;
        await page.waitForTimeout(700);
    }
});
await measure('S6 Гримуар: открыть и свернуть запись', async () => {
    await page.click('#nav-notes').catch(() => {});
    await page.waitForTimeout(900);
    const leaf = await page.$('.grim-leaf');
    if (leaf) { await leaf.click(); await page.waitForTimeout(700); }
    const col = await page.$('[data-act="grimToggleCollapse"]');
    if (col) for (let i = 0; i < 4; i++) { await col.click(); await page.waitForTimeout(500); }
});

await ctx.close(); await browser.close(); srv.close();
