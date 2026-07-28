// Геометрия вместо пиксельных базлайнов (см. E2E-SPEC §2): вердиктные замеры
// на трёх ширинах. Ловит ровно те поломки, что реально случались — жёлоб
// тулбара Гримуара, подсказка клавиш шириной в полтора экрана, переполнение
// строк после длинных готических слов, молчаливо мёртвая иконка.
import { test, expect } from './fixtures/app.mjs';

const PAGES = ['main', 'notes', 'archive'];

const VIEWPORTS = [
    { name: '360 · узкий мобайл', viewport: { width: 360, height: 800 }, isMobile: true, hasTouch: true },
    { name: '412 · мобайл', viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true },
    { name: '1280 · десктоп', viewport: { width: 1280, height: 900 }, isMobile: false, hasTouch: false },
];

// Выполняется в браузере. Возвращает нарушителей, а не голый флаг, — иначе
// падение теста не говорит, ЧТО именно вылезло.
const PROBE_OVERFLOW = () => {
    const vw = window.innerWidth;
    const outside = [];
    let checked = 0;
    for (const el of document.querySelectorAll('body *')) {
        if (el.checkVisibility && !el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) continue;
        const cs = getComputedStyle(el);
        if (cs.position === 'fixed') continue;          // фиксированные слои живут вне потока
        const r = el.getBoundingClientRect();
        if (!r.width || !r.height) continue;
        if (r.width > vw * 1.5) continue;               // заведомо служебные растяжки
        checked++;
        if (r.right > vw + 1) {
            outside.push(`${el.tagName.toLowerCase()}.${String(el.className).slice(0, 40)} right=${Math.round(r.right)}`);
        }
    }
    return {
        checked,
        docScrollW: document.documentElement.scrollWidth,
        docClientW: document.documentElement.clientWidth,
        outside: outside.slice(0, 10),
    };
};

// Молчаливо несработавший <use> не отличить от рабочего по наличию узла —
// нужен именно bbox самой svg. ⚠ Фильтр видимости обязателен: у потомка
// скрытого предка getComputedStyle отдаёт СВОЙ display и даёт ложный ноль.
const PROBE_USE = () => {
    const dead = [];
    let checked = 0;
    for (const svg of document.querySelectorAll('svg')) {
        const use = svg.querySelector('use');
        if (!use) continue;
        if (svg.checkVisibility && !svg.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) continue;
        checked++;
        const r = svg.getBoundingClientRect();
        if (!r.width || !r.height) dead.push(use.getAttribute('href') || '?');
    }
    return { checked, dead };
};

for (const v of VIEWPORTS) {
    test.describe(v.name, () => {
        test.use({ viewport: v.viewport, isMobile: v.isMobile, hasTouch: v.hasTouch });

        test('ни одна страница не даёт горизонтального скролла', async ({ app, page }) => {
            await app.open();
            for (const p of PAGES) {
                // Переключаемся напрямую: на мобиле нав живёт в створке, а
                // предмет теста здесь — геометрия, не навигация.
                await page.evaluate(name => switchPage(name), p);
                await page.waitForTimeout(400);
                const r = await page.evaluate(PROBE_OVERFLOW);
                // Замок против зелёного-по-пустоте: тест бесполезен, если зонд
                // ничего не осмотрел (всё отфильтровалось как невидимое).
                expect(r.checked, `${p}: зонд не осмотрел ни одного элемента`).toBeGreaterThan(30);
                expect(r.docScrollW, `${p}: документ шире вьюпорта`).toBeLessThanOrEqual(r.docClientW + 1);
                expect(r.outside, `${p}: элементы вылезли за правый край`).toEqual([]);
            }
        });

        test('все <use> резолвятся в непустой глиф', async ({ app, page }) => {
            await app.open();
            for (const p of PAGES) {
                await page.evaluate(name => switchPage(name), p);
                await page.waitForTimeout(400);
                const r = await page.evaluate(PROBE_USE);
                expect(r.checked, `${p}: зонд не нашёл ни одного видимого <use>`).toBeGreaterThan(5);
                expect(r.dead, `${p}: <use> не резолвится`).toEqual([]);
            }
        });
    });
}
