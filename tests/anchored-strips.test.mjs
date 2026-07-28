// V2-B4-03 — полосы и кнопки, прибитые к ВЬЮПОРТУ, а не к колонке приложения:
// на широком экране стопка кнопок висела посреди фона, оторванная от карточки.
// Лечение — одна переменная кромки карточки (`--app-edge`), от которой пляшут
// все плавающие элементы; на тире ≥1440px карточка шире, и кромка едет с ней.
import { it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../style.css', import.meta.url), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '');

const rule = (sel) => {
    const esc = sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const hits = [...css.matchAll(new RegExp(`(^|\\})[^{}]*${esc}\\s*\\{([^}]*)\\}`, 'g'))];
    return hits.map(m => m[2]).join(' ');
};

const EDGE_R = /right:\s*max\(22px, calc\(50vw - var\(--app-card-w\) \/ 2 - 54px\)\)/;
const EDGE_L = /left:\s*max\(22px, calc\(50vw - var\(--app-card-w\) \/ 2 - 60px\)\)/;

it('ширина карточки объявлена переменной', () => {
    expect(css).toMatch(/--app-card-w:\s*780px/);
});

it('каждый тир карточки объявляет свою ширину', () => {
    // ⚠ вторую переменную-кромку завести НЕЛЬЗЯ: var() внутри кастомного свойства
    // подставляется там, где свойство вычисляется (:root), и потирные
    // переопределения ширины до неё не дойдут. Отсюда формула по месту.
    [['1440px', '1220px'], ['1600px', '1360px'], ['2200px', '1460px']].forEach(([mq, w]) => {
        const blk = css.slice(css.indexOf(`@media (min-width: ${mq})`));
        expect(blk.slice(0, 700)).toContain(`--app-card-w: ${w}`);
    });
});

it.each([
    ['.sync-glyph', EDGE_L],
    ['.btn-sound', EDGE_R],
    ['.btn-shortcuts-toggle', EDGE_R],
    ['.btn-pen-sound', EDGE_R],
])('%s пляшет от кромки карточки', (sel, re) => {
    expect(rule(sel)).toMatch(re);
});

it('легенда клавиш не шире карточки и крупнее на десктопе', () => {
    expect(rule('.shortcuts-hint')).toMatch(/max-width:/);
    const wide = css.slice(css.indexOf('@media (min-width: 1200px)'));
    expect(wide.slice(0, 600)).toMatch(/\.shortcuts-hint[^{]*\{[^}]*font-size/);
});
