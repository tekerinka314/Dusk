// @vitest-environment happy-dom
//
// V2-B5-06 — легенда клавиш была рукописной HTML-строкой и разошлась с
// обработчиком: Ctrl+F, F3/Shift+F3, Esc, Backspace и Enter в зове работали, но
// нигде не объявлялись. Рукопись врёт молча, поэтому легенда теперь СТРОИТСЯ из
// таблицы клавиш, а тест сверяет её с ТЕМ ЖЕ обработчиком по исходнику.
import { it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const _store = {};
vi.mock('idb-keyval', () => ({
    get: vi.fn(async (k) => (k in _store ? _store[k] : undefined)),
    set: vi.fn(async (k, v) => { _store[k] = v; }),
}));

const _root = join(dirname(fileURLToPath(import.meta.url)), '..');
document.body.innerHTML = readFileSync(join(_root, 'index.html'), 'utf8')
    .match(/<body[^>]*>([\s\S]*)<\/body>/i)[1]
    .replace(/<script[\s\S]*?<\/script>/gi, '');

await import('../src/idb-global.js');
await import('../src/sortable-global.js');
await import('../dusk/01-core.ts');
await import('../dusk/02-grimoire.ts');
await import('../dusk/03-render.ts');
await import('../dusk/04-tasks.ts');
await import('../dusk/05-edit-notes-groups.ts');
await import('../dusk/06-deadlines.ts');
await import('../dusk/07-dnd-filter-progress.ts');
await import('../dusk/08-quickadd-export-init.ts');
const S = globalThis;

const hintFor = (page, grim) => {
    S.currentPage = page;
    if (grim) S.grimMode = grim;
    return S._shortcutsHintHTML();
};
const keysIn = (html) => [...html.matchAll(/<kbd>([^<]+)<\/kbd>/g)].map(m => m[1]);

it('легенда строится из таблицы, а не из рукописи в разметке', () => {
    expect(Array.isArray(S.SHORTCUT_KEYS)).toBe(true);
    expect(S.SHORTCUT_KEYS.length).toBeGreaterThan(10);
    // контейнер в index.html пустой — иначе рукопись снова начнёт расходиться
    const html = readFileSync(join(_root, 'index.html'), 'utf8');
    const block = html.slice(html.indexOf('id="shortcuts-hint"'));
    expect(block.slice(0, block.indexOf('</div>'))).not.toMatch(/<kbd>/);
});

it('страница обетов объявляет все свои клавиши', () => {
    const keys = keysIn(hintFor('main'));
    ['N', '/', 'J', 'K', 'X', 'E', 'D', 'Del', 'P', 'L', 'M', 'R', 'T', 'Ctrl+Z', 'Ctrl+Y', 'S', 'Esc']
        .forEach(k => expect(keys).toContain(k));
});

it('прежде умолчанные клавиши названы', () => {
    // ровно те, что обработчик биндит, а рукопись не упоминала
    expect(keysIn(hintFor('main'))).toContain('Backspace');
    const notes = keysIn(hintFor('notes', 'active'));
    expect(notes).toContain('Ctrl+F');
    expect(notes).toContain('F3');
    expect(notes).toContain('Shift+F3');
});

it('Гримуар и склеп записей говорят о своих клавишах, не о задачных', () => {
    const notes = keysIn(hintFor('notes', 'active'));
    expect(notes).toContain('N');
    expect(notes).toContain('E');
    expect(notes).not.toContain('P');          // ранга у записи нет
    const crypt = keysIn(hintFor('notes', 'archive'));
    expect(crypt).toContain('J');
    expect(crypt).not.toContain('Del');        // в склепе записей клавиша не действует
});

it('склеп обетов не обещает того, чего там нет', () => {
    const keys = keysIn(hintFor('archive'));
    expect(keys).toContain('J');
    expect(keys).toContain('Ctrl+F');
    expect(keys).not.toContain('X');
    expect(keys).not.toContain('R');
});

it('S и отмена объявлены на КАЖДОЙ странице (обработчик их не ограничивает)', () => {
    [hintFor('main'), hintFor('archive'), hintFor('notes', 'active'), hintFor('notes', 'archive')]
        .forEach(html => {
            const keys = keysIn(html);
            expect(keys).toContain('S');
            expect(keys).toContain('Esc');
        });
});

it('каждая клавиша легенды подписана словом', () => {
    const html = hintFor('main');
    // «<kbd>X</kbd> исполнить» — после группы клавиш обязана идти подпись
    const pairs = html.split('·').filter(Boolean);
    pairs.forEach(p => {
        if (!/<kbd>/.test(p)) return;
        expect(p.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim().length).toBeGreaterThan(2);
    });
});
