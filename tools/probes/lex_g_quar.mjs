// Партия G — зонд длины строк карантина. «Предать забвению» шире прежнего
// «Отклонить», а колонка кнопок flex:0 0 auto → она может съесть текст строки.
// Вердикт: нет переполнения модалки, текст конфликта не схлопнут, кнопки не обрезаны.
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
    const { page } = await openApp(browser, { device, page: 'main', seed: richSeed(), port });
    await page.evaluate(() => {
        state.syncJournal = [
            { uid: 'q1', kind: 'field', recType: 'tasks', recUid: 'x1', field: 'text', loser: 'Старое начертание обета', at: Date.now(), resolved: false },
            { uid: 'q2', kind: 'field', recType: 'tasks', recUid: 'x1', field: 'deadline', loser: { mode: 'date', value: '2026-08-01' }, at: Date.now(), resolved: false },
            { uid: 'q3', kind: 'delete-vs-edit', recType: 'tasks', loser: { text: 'Уничтоженный на другом устройстве' }, at: Date.now(), resolved: false },
            { uid: 'q4', kind: 'delete-vs-edit', recType: 'templates', loser: { name: 'Образец вечерних обетов' }, at: Date.now(), resolved: false },
            { uid: 'q5', kind: 'note-both', recType: 'notes', loser: { body: 'Вторая копия записи' }, at: Date.now(), resolved: false },
        ];
        openQuarantine();
    });
    await page.waitForSelector('#quar-overlay', { timeout: 3000 });
    await page.waitForTimeout(350);

    const r = await page.evaluate(() => {
        const ov = document.getElementById('quar-overlay');
        const modal = ov.querySelector('.sync-quar-modal');
        const mb = modal.getBoundingClientRect();
        const rows = [...ov.querySelectorAll('.sync-quar-row')].map(row => {
            const what = row.querySelector('.sync-quar-what');
            const acts = [...row.querySelectorAll('.sync-quar-acts button')].map(b => ({
                text: b.textContent.trim(),
                clipped: b.scrollWidth > b.clientWidth + 1,
                w: Math.round(b.getBoundingClientRect().width),
            }));
            const info = row.querySelector('.sync-quar-info');
            return { what: what.textContent.trim(), whatW: Math.round(what.getBoundingClientRect().width),
                     ratio: +(info.getBoundingClientRect().width / row.clientWidth).toFixed(2),
                     rowOverflow: row.scrollWidth > row.clientWidth + 1, acts };
        });
        return {
            title: ov.querySelector('#quar-title').textContent.trim(),
            desc: ov.querySelector('.sync-quar-desc').textContent.replace(/\s+/g, ' ').trim(),
            modalW: Math.round(mb.width), vw: innerWidth,
            outside: mb.left < -0.5 || mb.right > innerWidth + 0.5,
            rows,
        };
    });

    const clipped = r.rows.flatMap(x => x.acts).filter(a => a.clipped);
    // короткая строка («Исход обета») ужимается до своего текста — это не теснота;
    // мерить долю имеет смысл только у длинных строк, которые реально переносятся
    const squeezed = r.rows.filter(x => x.what.length > 40 && x.ratio < 0.55);
    const overflow = r.rows.filter(x => x.rowOverflow);
    const ok = !r.outside && !clipped.length && !squeezed.length && !overflow.length;
    if (!ok) fails++;
    console.log(`\n[${name}] ${ok ? 'PASS' : 'FAIL'}  модалка ${r.modalW}/${r.vw}px`);
    console.log(`  заголовок: ${r.title}`);
    if (name === '360') console.log(`  проза: ${r.desc}`);
    for (const x of r.rows) console.log(`  · «${x.what}» текст ${Math.round(x.ratio*100)}% | ${x.acts.map(a => a.text + ' ' + a.w + 'px' + (a.clipped ? ' ОБРЕЗАНА' : '')).join(' / ')}`);
    if (r.outside) console.log('  ✗ модалка за вьюпортом');
    if (squeezed.length) console.log('  ✗ текст разночтения схлопнут (<55% ширины строки)');
    if (overflow.length) console.log('  ✗ горизонтальное переполнение строки');
    await page.close();
}

await browser.close(); srv.close();
console.log(fails ? `\n✗ ${fails} фейлов` : '\n✓ 3/3 PASS');
process.exit(fails ? 1 : 0);
