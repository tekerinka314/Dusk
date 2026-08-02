// O-1, шаг 3: A/B по гипотезам замера. Один и тот же сценарий скролла, разные
// CSS-накладки поверх dist. Меряем медиану кадра, число кадров вне бюджета и
// суммарный Layerize/Paint из настоящего трейса. Ничего в репо не меняем.
import fs from 'fs';
import { serve, launch, DEVICES, CHROME } from './lib.mjs';
import { createRequire } from 'module';
const _req = createRequire(import.meta.url);
const { chromium } = _req('playwright-core');
import { perfSeed } from './seed.mjs';

const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const CPU = +arg('cpu', 4);
const N = +arg('n', 60);
const REPEAT = +arg('repeat', 2);
const DEVKEY = arg('device', 'pixel7');
const DESKTOP = { width: 1280, height: 900, deviceScaleFactor: 1, isMobile: false, hasTouch: false,
                  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36' };
const dev = DEVKEY === 'desktop' ? DESKTOP : DEVICES[DEVKEY];

const VARIANTS = [
    ['A базовый',                    ''],
    ['B glow без will-change',       '.todo-app > .app-glow { will-change: auto; }'],
    ['C glow без пульса',            '.todo-app > .app-glow { animation: none; opacity: .38; }'],
    ['D glow снят совсем',           '.todo-app > .app-glow { display: none; }'],
    ['E строки content-visibility',  '#list-container > .task-item, .group-body > .task-item { content-visibility: auto; contain-intrinsic-size: auto 116px; }'],
    ['G строки contain:content',    '#list-container > .task-item, .group-body > .task-item { contain: content; }'],
    ['H cv строки+своды',           '#list-container > .task-item, .group-body > .task-item { content-visibility: auto; contain-intrinsic-size: auto 116px; } .group-section { content-visibility: auto; contain-intrinsic-size: auto 400px; }'],
    ['I cv+contain строки',         '#list-container > .task-item, .group-body > .task-item { content-visibility: auto; contain-intrinsic-size: auto 116px; contain: layout paint style; }'],
    ['F C+E вместе',                 '.todo-app > .app-glow { animation: none; opacity: .38; } #list-container > .task-item, .group-body > .task-item { content-visibility: auto; contain-intrinsic-size: auto 116px; }'],
];

const { srv, port } = await serve();
const HEADED = process.argv.includes('--headed');
const ONLY = arg('only', '');
const browser = HEADED ? await chromium.launch({ executablePath: CHROME, headless: false }) : await launch();
const seed = perfSeed(N);

async function runOnce(css) {
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
    }, seed);
    const client = await ctx.newCDPSession(page);
    await client.send('Emulation.setCPUThrottlingRate', { rate: CPU });
    await page.goto(`http://localhost:${port}/index.html`, { waitUntil: 'load' });
    await page.waitForSelector('.task-item');
    if (css) await page.addStyleTag({ content: css });
    await page.waitForTimeout(3500);          // анимации входа отыграли

    await client.send('Tracing.start', {
        transferMode: 'ReturnAsStream',
        traceConfig: { includedCategories: ['devtools.timeline', 'disabled-by-default-devtools.timeline'] },
    });
    await page.evaluate(() => {
        window.__fr = []; window.__on = true;
        let last = performance.now();
        const t = (x) => { window.__fr.push(x - last); last = x; if (window.__on) requestAnimationFrame(t); };
        requestAnimationFrame(t);
    });
    await page.mouse.move(dev.width / 2, dev.height / 2);
    for (let i = 0; i < 14; i++) { await page.mouse.wheel(0, 320); await page.waitForTimeout(90); }
    await page.waitForTimeout(300);
    const fr = (await page.evaluate(() => { window.__on = false; return window.__fr; })).slice(1);

    const done = new Promise(r => client.once('Tracing.tracingComplete', r));
    await client.send('Tracing.end');
    const ev = await done;
    let raw = '';
    if (ev.stream) {
        for (;;) { const c = await client.send('IO.read', { handle: ev.stream, size: 5 * 1024 * 1024 }); raw += c.data; if (c.eof) break; }
        await client.send('IO.close', { handle: ev.stream });
    }
    let events = []; try { const j = JSON.parse(raw); events = Array.isArray(j) ? j : (j.traceEvents || []); } catch (_) {}
    const sum = {};
    for (const e of events) if (e.ph === 'X' && e.dur) sum[e.name] = (sum[e.name] || 0) + e.dur / 1000;

    await ctx.close();
    const sorted = [...fr].sort((a, b) => a - b);
    return {
        med: +(sorted[Math.floor(sorted.length / 2)] || 0).toFixed(1),
        p90: +(sorted[Math.floor(sorted.length * 0.9)] || 0).toFixed(1),
        over16: fr.filter(d => d > 16.7).length,
        over33: fr.filter(d => d > 33).length,
        frames: fr.length,
        layerize: +(sum.Layerize || 0).toFixed(0),
        paint: +(sum.Paint || 0).toFixed(0),
        style: +(sum.UpdateLayoutTree || 0).toFixed(0),
        layout: +(sum.Layout || 0).toFixed(0),
        gpu: +(sum.GPUTask || 0).toFixed(0),
    };
}

const rows = [];
for (const [name, css] of VARIANTS.filter(v => !ONLY || ONLY.split(',').some(k => v[0].startsWith(k)))) {
    const runs = [];
    for (let i = 0; i < REPEAT; i++) runs.push(await runOnce(css));
    const pick = (k) => +(runs.reduce((a, r) => a + r[k], 0) / runs.length).toFixed(1);
    rows.push({ name, med: pick('med'), p90: pick('p90'), over16: pick('over16'), over33: pick('over33'),
                frames: pick('frames'), layerize: pick('layerize'), paint: pick('paint'),
                style: pick('style'), layout: pick('layout'), gpu: pick('gpu') });
    const r = rows[rows.length - 1];
    console.log(`${name.padEnd(28)} медиана ${String(r.med).padStart(6)} · p90 ${String(r.p90).padStart(6)} · >16.7 ${String(r.over16).padStart(5)}/${r.frames} · >33 ${String(r.over33).padStart(5)} · Layerize ${String(r.layerize).padStart(5)} · Paint ${String(r.paint).padStart(4)} · Style ${String(r.style).padStart(4)} · GPU ${String(r.gpu).padStart(4)}`);
}

fs.writeFileSync('D:/tmp/pw/b1/o1_ab.json', JSON.stringify({ device: DEVKEY, cpu: CPU, n: N, repeat: REPEAT, rows }, null, 1));
console.log('\nсырьё → D:/tmp/pw/b1/o1_ab.json');
await browser.close(); srv.close();
