// V2-B2-05 — склеп переигрывал «погребённость»: заголовок погребённого обета
// давал 2.07:1 против своей подложки, метка 1.78:1, звено 1.42:1 (замер
// композитным зондом с учётом ВСЕЙ цепочки opacity). Просматривать и воскрешать
// из большого склепа было работой против интерфейса.
//
// ⚠ Корень, который стоит помнить: цвет заголовка задаётся не только правилом,
// но и КАДРОМ анимации `strikeColorIn` с `forwards` — анимированное значение
// бьёт обычный каскад, поэтому любое переопределение цвета молча не работало,
// пока анимацию не сняли в области склепа.
import { it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../style.css', import.meta.url), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '');

const rule = (sel) => {
    const hits = [...css.matchAll(new RegExp(`(^|\\})[^{}]*${sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\{([^}]*)\\}`, 'g'))];
    return hits.length ? hits[hits.length - 1][2] : '';   // победитель каскада = последнее вхождение
};

it('строка склепа гасится мягче, чем прежние 0.75', () => {
    // ⚠ у `.archive-item` несколько блоков (второй — content-visibility из O-1),
    // поэтому берём последний, где opacity вообще объявлена.
    const bodies = [...css.matchAll(/(^|\})[^{}]*\.archive-item\s*\{([^}]*)\}/g)]
        .map(m => m[2]).filter(b => /opacity:/.test(b));
    const op = parseFloat(bodies[bodies.length - 1].match(/opacity:\s*([\d.]+)/)[1]);
    expect(op).toBeGreaterThanOrEqual(0.85);
});

it('заголовок погребённого обета выведен из-под кадра анимации', () => {
    const body = rule('.archive-item.checked .task-text');
    expect(body).toMatch(/animation:\s*none/);
    expect(body).toMatch(/color:/);
});

it('призрачность держится зачёркиванием, а не нечитаемостью', () => {
    // сам зачёрк остаётся у общего правила .task-item.checked .task-text
    expect(rule('.task-item.checked .task-text')).toMatch(/text-decoration:\s*line-through/);
    // а в склепе не появилось второго гашения поверх
    expect(rule('.archive-item.checked .task-text')).not.toMatch(/opacity:\s*0\.[0-7]/);
});

it('метка и звено в склепе тоже подняты', () => {
    expect(rule('.archive-item .meta-tag')).toMatch(/opacity:\s*1/);
    const sub = rule('.archive-item .archive-sub.checked');
    expect(parseFloat((sub.match(/opacity:\s*([\d.]+)/) || [])[1])).toBeGreaterThanOrEqual(0.85);
});
