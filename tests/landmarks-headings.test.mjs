// V2-B5-05 — приложение отдавало скринридеру ОДИН ориентир (nav) и ОДИН
// заголовок («DUSK»): ни `<main>`, ни единого h2, а шапки сводов — просто div.
// Прыгнуть «к списку обетов» или «к склепу» было нечем (WCAG 1.3.1 / 2.4.1).
//
// V2-B5-10 — подсказка синтаксиса квик-эдда (`*тег %дата !ранг`) была
// `aria-hidden`, то есть единственный учитель фичи для AT не существовал вовсе.
import { it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const render = readFileSync(new URL('../dusk/03-render.ts', import.meta.url), 'utf8');

// Открывающий тег элемента с данным id.
const tagOf = (id) => {
    const m = html.match(new RegExp(`<[a-z]+[^>]*\\sid="${id}"[^>]*>`, 'i'));
    return m ? m[0] : '';
};
// Кусок разметки от открывающего тега страницы до следующей страницы.
const pageChunk = (id) => {
    const from = html.indexOf(`id="${id}"`);
    const next = ['main-page', 'archive-page', 'notes-page']
        .map(p => html.indexOf(`id="${p}"`))
        .filter(i => i > from);
    return html.slice(from, next.length ? Math.min(...next) : html.length);
};

const PAGES = ['main-page', 'archive-page', 'notes-page'];

it.each(PAGES)('%s — главный ориентир страницы', (id) => {
    const tag = tagOf(id);
    expect(tag).toBeTruthy();
    expect(/(^<main\b)|role="main"/.test(tag)).toBe(true);
});

it.each(PAGES)('%s — у ориентира есть имя', (id) => {
    expect(tagOf(id)).toMatch(/aria-label="[^"]+"/);
});

it.each(PAGES)('%s — есть заголовок второго уровня', (id) => {
    expect(pageChunk(id)).toMatch(/<h2[\s>]/);
});

it('в разметке нет провала уровней: h2 появился раньше h3', () => {
    const body = html.slice(html.indexOf('<body'));
    expect(body.indexOf('<h2')).toBeGreaterThan(-1);
    expect(body.indexOf('<h2')).toBeLessThan(body.indexOf('<h3'));
});

it('шапка свода отдаётся заголовком третьего уровня', () => {
    const fn = render.slice(render.indexOf('function _groupHeaderHTML'));
    const one = fn.slice(0, fn.indexOf('\nfunction '));
    expect(one).toMatch(/group-title[^>]*role="heading"[^>]*aria-level="3"|role="heading"[^>]*aria-level="3"[^>]*group-title/);
});

it('подсказка синтаксиса квик-эдда больше не спрятана от скринридера', () => {
    expect(tagOf('qa-syntax-hint')).not.toMatch(/aria-hidden="true"/);
});

it('поле обета ссылается на подсказку синтаксиса', () => {
    expect(tagOf('input-box')).toMatch(/aria-describedby="[^"]*qa-syntax-hint/);
});
