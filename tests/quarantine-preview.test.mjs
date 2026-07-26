// @vitest-environment happy-dom
//
// V2-B6-04 regression — the quarantine panel's loser preview must fall back to
// content fields (note body / subtask memo), so no content-carrying loser ever
// renders as «пусто» (a misleading «пусто» invites a dismissal that the 90-day
// journal GC later makes permanent).
import { it, expect, vi } from 'vitest';

const _store = {};
vi.mock('idb-keyval', () => ({
    get: vi.fn(async (k) => (k in _store ? _store[k] : undefined)),
    set: vi.fn(async (k, v) => { _store[k] = v; }),
}));

import '../src/idb-global.js';
import '../dusk/01-core.ts';
import '../dusk/11-sync-ui.ts';
const S = globalThis;

const P = (e) => S._entryLoserPreview(e);

it('subtask with empty text but a memo shows the memo', () => {
    expect(P({ kind: 'subtask', loser: { text: '', note: 'важная памятка' } })).toBe('важная памятка');
});

it('note-both loser with empty title but a body shows the body (HTML stripped)', () => {
    expect(P({ kind: 'note-both', loser: { title: '', body: '<p>важное тело без заголовка</p>' } }))
        .toBe('важное тело без заголовка');
});

it('delete-vs-edit note with empty title shows the body', () => {
    expect(P({ kind: 'delete-vs-edit', loser: { title: '', body: 'тело удалённой заметки' } }))
        .toBe('тело удалённой заметки');
});

it('label fields still take precedence over content fields', () => {
    expect(P({ kind: 'task', loser: { text: 'заголовок', note: 'памятка' } })).toBe('заголовок');
});

it('a truly empty loser still previews empty (→ «пусто» in the panel)', () => {
    expect(P({ kind: 'subtask', loser: { text: '', note: '' } })).toBe('');
});

// V2-B4-07 переопределил этот кейс: field-превью больше НЕ сырое — значение
// проходит через _quarValueRu (булево → «да/нет», приоритет/повтор → слова,
// дедлайн → дата). Пин сохранён на том, что не покрыто картой: обычная строка
// проходит как есть, а неизвестный объект всё ещё деградирует в JSON, а не в
// «пусто» (потерять содержимое проигравшей стороны нельзя — её удалит GC).
it('field kind: строка как есть, булево словом, неизвестный объект — JSON', () => {
    expect(P({ kind: 'field', loser: 'строка' })).toBe('строка');
    expect(P({ kind: 'field', loser: false })).toBe('нет');
    expect(P({ kind: 'field', loser: { a: 1 } })).toBe('{"a":1}');
});
