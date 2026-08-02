// O-1, шаг 2: ПОЧЕМУ дорог Layerize/Paint при скролле.
// Перепись композиторских слоёв (CDP LayerTree) + census элементов, чьи вычисленные
// стили ВЫНУЖДАЮТ слой (transform/filter/backdrop-filter/will-change/анимация/fixed/sticky).
import { serve, launch, DEVICES } from './lib.mjs';
import { perfSeed } from './seed.mjs';

const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const N = +arg('n', 60);
const DEVKEY = arg('device', 'pixel7');
const DESKTOP = { width: 1280, height: 900, deviceScaleFactor: 1, isMobile: false, hasTouch: false,
                  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36' };
const dev = DEVKEY === 'desktop' ? DESKTOP : DEVICES[DEVKEY];

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
await page.goto(`http://localhost:${port}/index.html`, { waitUntil: 'load' });
await page.waitForSelector('.task-item');
await page.waitForTimeout(4000);   // дать анимациям входа отыграть целиком (stagger на 60 строк длинный)

// ── 1) перепись слоёв ────────────────────────────────────────────────────────
let layers = [];
client.on('LayerTree.layerTreeDidChange', e => { if (e.layers) layers = e.layers; });
await client.send('LayerTree.enable');
await page.mouse.move(dev.width / 2, dev.height / 2);
await page.mouse.wheel(0, 600);
await page.waitForTimeout(900);

const described = [];
for (const l of layers.slice().sort((a, b) => (b.width * b.height) - (a.width * a.height)).slice(0, 14)) {
    let desc = '(нет узла)';
    if (l.backendNodeId) {
        try {
            const { node } = await client.send('DOM.describeNode', { backendNodeId: l.backendNodeId });
            const attrs = node.attributes || [];
            const cls = attrs[attrs.indexOf('class') + 1];
            const id = attrs[attrs.indexOf('id') + 1];
            desc = node.nodeName.toLowerCase() + (id && attrs.includes('id') ? '#' + id : '') +
                   (cls && attrs.includes('class') ? '.' + String(cls).split(/\s+/).slice(0, 3).join('.') : '');
        } catch (_) {}
    }
    described.push({ w: Math.round(l.width), h: Math.round(l.height), px: Math.round(l.width * l.height / 1000) + 'k', desc });
}

// ── 2) census «что вынуждает слой / дорогой пейнт» по ВИДИМЫМ элементам ──────
const census = await page.evaluate(() => {
    const buckets = {};
    const add = (k, el) => {
        buckets[k] = buckets[k] || { n: 0, sample: [] };
        buckets[k].n++;
        if (buckets[k].sample.length < 4) buckets[k].sample.push(el.className ? '.' + String(el.className).split(/\s+/).slice(0, 2).join('.') : el.tagName.toLowerCase());
    };
    let seen = 0;
    document.querySelectorAll('*').forEach(el => {
        if (!el.checkVisibility || !el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) return;
        seen++;
        const s = getComputedStyle(el);
        if (s.backdropFilter && s.backdropFilter !== 'none') add('backdrop-filter', el);
        if (s.filter && s.filter !== 'none') add('filter', el);
        if (s.willChange && s.willChange !== 'auto') add('will-change:' + s.willChange, el);
        if (s.transform && s.transform !== 'none') add('transform', el);
        if (s.position === 'fixed') add('position:fixed', el);
        if (s.position === 'sticky') add('position:sticky', el);
        if (s.animationName && s.animationName !== 'none') add('animation:' + s.animationName, el);
        if (s.boxShadow && s.boxShadow !== 'none') add('box-shadow', el);
        if (s.transitionProperty === 'all' && parseFloat(s.transitionDuration) > 0) add('transition:all(живой)', el);
        if (s.contentVisibility && s.contentVisibility !== 'visible') add('content-visibility:' + s.contentVisibility, el);
    });
    return { seen, buckets };
});

console.log(`\nO-1 шаг 2 · ${DEVKEY} ${dev.width}x${dev.height} · обетов=${N}`);
console.log(`композиторских слоёв: ${layers.length}`);
console.log('\nсамые крупные слои:');
for (const d of described) console.log(`  ${String(d.w).padStart(5)}x${String(d.h).padStart(5)} (${String(d.px).padStart(7)} px) ${d.desc}`);

console.log(`\nвидимых элементов осмотрено: ${census.seen}`);
console.log('признаки, влияющие на кадр (по видимым элементам):');
Object.entries(census.buckets).sort((a, b) => b[1].n - a[1].n).forEach(([k, v]) => {
    console.log(`  ${String(v.n).padStart(5)} × ${k}   ${v.sample.join(' ')}`);
});

await ctx.close(); await browser.close(); srv.close();
