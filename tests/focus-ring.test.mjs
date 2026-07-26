// W2-5 — V2-B5-03: видимый фокус у текстовых полей.
//
// ⚠ Аудит утверждал «border-color не меняется, кольца нет вовсе». Замер
// (D:/tmp/pw/b1/w2_b503_probe.mjs) это ОПРОВЕРГ: индикатор есть у каждого поля,
// но живёт на ОБЁРТКЕ (.row / .search-wrap / .archive-search-wrap), а не на
// самом <input> (у того border:none) — аудит читал не тот элемент. Настоящий
// дефект другой: индикатор СЛАБЕЕ нормы и разный в шести местах —
// 2.08:1 у быстрого ввода и у подпункта при требуемых 3:1 (WCAG 2.2 §1.4.11
// Non-text Contrast), плюс шесть разных фиолетовых на одну роль.
//
// Замок: один токен --focus-ring, он же цвет кнопочного кольца, и ни одного
// захардкоженного цвета фокуса в правилах полей.
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const CSS = fs.readFileSync(
    path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'style.css'), 'utf8');

const lum = (c) => {
    const f = c.map(v => v / 255).map(v => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * f[0] + 0.7152 * f[1] + 0.0722 * f[2];
};
const over = (fg, a, bg) => fg.map((v, i) => v * a + bg[i] * (1 - a));
const ratio = (a, b) => { const [x, y] = [lum(a) + 0.05, lum(b) + 0.05]; return Math.max(x, y) / Math.min(x, y); };

/** rgba(...) → [[r,g,b], alpha] */
function parseRGBA(v) {
    const m = String(v).match(/[\d.]+/g);
    if (!m) throw new Error('не rgba(): ' + v);
    return [[+m[0], +m[1], +m[2]], m[3] === undefined ? 1 : +m[3]];
}
function token(name) {
    const m = CSS.match(new RegExp('\\n\\s*' + name + '\\s*:\\s*([^;]+);'));
    if (!m) throw new Error('токен не найден: ' + name);
    return m[1].trim();
}
/**
 * Тело правила по точному селектору. Две тонкости, на которых замок уже
 * спотыкался: (1) `.form-sub-input:focus` — подстрока `.form-sub-input:focus-visible`
 * из блока-глушилки выше, поэтому нужен lookahead; (2) селектор встречается
 * несколько раз — брать надо ПОСЛЕДНЕЕ вхождение, победителя каскада.
 */
function rule(selector) {
    const esc = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(esc + '(?![\\w-])[^{}]*\\{([^}]*)\\}', 'g');
    let m, last = null;
    while ((m = re.exec(CSS)) !== null) last = m[1];
    if (last === null) throw new Error('правило не найдено: ' + selector);
    return last;
}

// Фоны — реальные пиксели dist (те же, что в contrast-tokens.test.mjs):
// поле ввода изнутри и карточка/страница снаружи бордера.
const BG_IN = [8, 3, 29];
const BG_OUT = [7, 2, 22];
const NON_TEXT = 3;   // WCAG 2.2 §1.4.11

// Все поля, у которых фокус показывается сменой цвета границы. Обёрточные
// (:focus-within) — там, где у самого input border:none.
const FIELD_RULES = [
    '.row:focus-within',                 // быстрый ввод задачи
    '.search-wrap:focus-within',         // поиск задач
    '.archive-search-wrap:focus-within', // поиск по архиву
    '.grim-search-wrap:focus-within',    // поиск по Гримуару
    '.form-sub-input:focus',             // подпункт в форме
    '.subtask-add-input:focus',          // добавление подпункта в строке
    '.inline-note-input:focus',          // инлайн-заметка
    '.note-input:focus',                 // заметка в модалке
    '.modal-input:focus',                // любое поле модалки
];

describe('W2-5 — единый токен фокуса ≥ 3:1 (V2-B5-03)', () => {
    it('--focus-ring объявлен и виден с обеих сторон границы', () => {
        const [rgb, a] = parseRGBA(token('--focus-ring'));
        expect(ratio(over(rgb, a, BG_IN), BG_IN)).toBeGreaterThanOrEqual(NON_TEXT);
        expect(ratio(over(rgb, a, BG_OUT), BG_OUT)).toBeGreaterThanOrEqual(NON_TEXT);
    });

    it('кольцо кнопок и граница полей — ОДИН токен (в этом суть фикса)', () => {
        // глобальное :focus-visible задаёт кнопочное кольцо; если оно разъедется
        // с полями, вернётся ровно та разноголосица, которую чиним
        // именно ГЛОБАЛЬНОЕ правило (в начале строки), а не блоки-глушилки,
        // где тот же селектор стоит в списке
        const global = CSS.match(/\n:focus-visible\s*\{([^}]*)\}/);
        expect(global, 'глобальное правило :focus-visible исчезло').toBeTruthy();
        expect(global[1]).toMatch(/outline:\s*2px solid var\(--focus-ring\)/);
    });

    for (const sel of FIELD_RULES) {
        it(`${sel} берёт цвет из токена, а не из литерала`, () => {
            const body = rule(sel);
            expect(body, `${sel} не задаёт border-color`).toMatch(/border-color:/);
            expect(body, `${sel} держит захардкоженный цвет фокуса`)
                .toMatch(/border-color:\s*var\(--focus-ring\)/);
        });
    }
});
