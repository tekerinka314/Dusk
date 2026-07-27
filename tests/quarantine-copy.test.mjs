// @vitest-environment happy-dom
//
// V2-B4-07 — строки разбора конфликтов текли внутренними именами полей
// («поле «text»», «поле «name»») и СЫРЫМИ значениями (`true`, `high`,
// `{"mode":"date",…}`). Панель существует для человека, принимающего решение
// «вернуть или отклонить», а не для отладки.
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
for (const f of ['01-core', '02-grimoire', '03-render', '04-tasks', '05-edit-notes-groups',
                 '06-deadlines', '07-dnd-filter-progress', '08-quickadd-export-init',
                 '09-sync', '10-cloud', '11-sync-ui']) {
    await import(`../dusk/${f}.ts`);
}
const S = globalThis;

// ── имена полей ─────────────────────────────────────────────────────────────
it('имена полей человеческие для всех видов записей', () => {
    expect(S._quarFieldRu('tasks', 'text')).toBe('Заголовок обета');
    expect(S._quarFieldRu('tasks', 'deadline')).toBe('Исход обета');
    expect(S._quarFieldRu('tasks', '_groupUid')).toBe('Свод');
    expect(S._quarFieldRu('groups', 'name')).toBe('Название свода');
    expect(S._quarFieldRu('notes', 'body')).toBe('Текст записи');
    expect(S._quarFieldRu('templates', 'text')).toBe('Название образца');
    expect(S._quarFieldRu('tasks', 'color')).toBe('Витраж');   // из общего раздела '*'
});

it('незнакомое поле деградирует, а не падает', () => {
    expect(S._quarFieldRu('tasks', 'somethingNew')).toBeNull();
    expect(S._quarFieldRu('unknownColl', 'text')).toBeNull();
});

it('строка конфликта поля не содержит внутреннего имени', () => {
    const what = S._entryWhat({ kind: 'field', recType: 'tasks', recUid: 'nope', field: 'text' });
    expect(what).toContain('Заголовок обета');
    expect(what).not.toContain('«text»');
});

it('удаление-против-правки названо по виду записи, без внутренних ключей', () => {
    const what = S._entryWhat({ kind: 'delete-vs-edit', recType: 'groups', loser: { name: 'Дом' } });
    expect(what).toMatch(/^Свод распущен при правке на другом устройстве/);
    expect(what).toContain('«Дом»');
});

it('подпункт и заметка-обе-версии — человеческие формулировки', () => {
    expect(S._entryWhat({ kind: 'subtask', parentUid: 'nope' })).toBe('Текст подпункта');
    expect(S._entryWhat({ kind: 'note-both' })).toMatch(/обе версии/);
});

// ── значения ────────────────────────────────────────────────────────────────
it('значения показываются словами, а не внутренним представлением', () => {
    expect(S._quarValueRu('tasks', 'priority', 'high')).toBe('Высокий');
    expect(S._quarValueRu('tasks', 'repeat', 'weekdays')).toBe('По будням');
    expect(S._quarValueRu('tasks', 'pinned', true)).toBe('да');
    expect(S._quarValueRu('tasks', 'checked', false)).toBe('нет');
    expect(S._quarValueRu('tasks', 'text', '')).toBe('');
    expect(S._quarValueRu('tasks', 'note', null)).toBe('');
});

it('дедлайн показывается датой, а не JSON', () => {
    const v = S._quarValueRu('tasks', 'deadline', { mode: 'date', value: '2026-08-01' });
    expect(v).not.toContain('{');
    expect(v).toMatch(/1 авг/);
});

it('кривая форма дедлайна с чужого устройства не даёт «NaN undefined NaN»', () => {
    // формат value у mode:'date' — 'YYYY-MM-DD'; число ломает форматтер, но тот
    // не бросает, а возвращает мусор — проверяем РЕЗУЛЬТАТ, не только исключение
    for (const bad of [{ mode: 'date', value: Date.now() }, { mode: 'что-то-новое', value: 1 }, {}]) {
        const v = S._quarValueRu('tasks', 'deadline', bad);
        expect(v).not.toMatch(/NaN|undefined|Invalid/);
    }
});

it('превью проигравшей стороны идёт через форматтер значений', () => {
    const s = S._entryLoserPreview({ kind: 'field', recType: 'tasks', field: 'priority', loser: 'medium' });
    expect(s).toBe('Средний');
});
