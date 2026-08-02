// Партия H — зонд легенды горячих клавиш. Готические подписи длиннее
// канцелярских («переписать» вместо «изменить», «отлить копию» вместо
// «дублировать»), а полоса подсказки лежит поверх нижнего края карточки.
// Вердикт: не выходит за вьюпорт, не перекрывает нав/панель, число строк не
// взорвалось, ни одна пара не разорвана посередине.
import { serve, launch, openApp } from './lib.mjs';
import { richSeed } from './seed.mjs';

const DESKTOP = { width: 1280, height: 860, deviceScaleFactor: 1, isMobile: false, hasTouch: false,
                  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36' };
const M360 = { width: 360, height: 780, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
               userAgent: 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36' };
const M412 = { ...M360, width: 412, height: 892 };

const { srv, port } = await serve();
const browser = await launch();
let fails = 0;

for (const [name, device] of [['360', M360], ['412', M412], ['1280', DESKTOP]]) {
    for (const pg of ['main', 'notes']) {
        const { page } = await openApp(browser, { device, page: pg, seed: richSeed(), port });
        await page.evaluate(() => { if (!_shortcutsHintOpen) toggleShortcutsHint(); });
        await page.waitForTimeout(300);

        const r = await page.evaluate(() => {
            const h = document.getElementById('shortcuts-hint');
            const cs = getComputedStyle(h);
            const b = h.getBoundingClientRect();
            const lineH = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.4;
            // разрыв пары «клавиша + слово»: <kbd> в конце визуальной строки, а
            // слово уехало на следующую — ловим по разнице top у kbd и его текста
            const torn = [...h.querySelectorAll('kbd')].filter(k => {
                const kb = k.getBoundingClientRect();
                const nxt = k.nextSibling;
                if (!nxt || nxt.nodeType !== 3 || !nxt.textContent.trim()) return false;
                const rg = document.createRange(); rg.selectNodeContents(nxt);
                const nb = rg.getBoundingClientRect();
                return nb.top - kb.top > 2;
            }).map(k => k.textContent);
            return {
                text: h.textContent.replace(/\s+/g, ' ').trim(),
                w: Math.round(b.width), h: Math.round(b.height), vw: innerWidth, vh: innerHeight,
                lines: Math.round(b.height / lineH),
                outside: b.left < -0.5 || b.right > innerWidth + 0.5 || b.bottom > innerHeight + 0.5,
                torn,
            };
        });

        const ok = !r.outside && !r.torn.length && r.lines <= (name === '1280' ? 3 : 6);
        if (!ok) fails++;
        console.log(`\n[${name}/${pg}] ${ok ? 'PASS' : 'FAIL'}  ${r.w}×${r.h}px, строк ~${r.lines}, вьюпорт ${r.vw}×${r.vh}`);
        console.log(`  ${r.text}`);
        if (r.outside) console.log('  ✗ подсказка вылезла за вьюпорт');
        if (r.torn.length) console.log(`  ✗ пара разорвана переносом: ${r.torn.join(', ')}`);
        await page.close();
    }
}

await browser.close(); srv.close();
console.log(fails ? `\n✗ ${fails} фейлов` : '\n✓ 6/6 PASS');
process.exit(fails ? 1 : 0);
