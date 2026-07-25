// @vitest-environment happy-dom
//
// V2-B1-11 — токены квик-эдда не ловили русские слова.
// Корень: `\b` в regex БЕЗ флага `u` определяется через ASCII-`\w`
// ([A-Za-z0-9_]), поэтому после кириллической буквы границы слова НЕ
// существует вовсе: «!высокий» не матчился ни в конце строки, ни в середине.
// Тесты пиньят Unicode-осведомлённые границы для `!приоритета`, `*тега`
// и `%даты` — в том числе смешанный RU/EN ввод.
import { it, expect, vi } from 'vitest';

const _store = {};
vi.mock('idb-keyval', () => ({
    get: vi.fn(async (k) => (k in _store ? _store[k] : undefined)),
    set: vi.fn(async (k, v) => { _store[k] = v; }),
}));

// Модули 01-08 трогают реальные узлы разметки на верхнем уровне, поэтому сперва
// поднимаем настоящий <body> из index.html, и только потом импортируем цепочку.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const _root = join(dirname(fileURLToPath(import.meta.url)), '..');
document.body.innerHTML = readFileSync(join(_root, 'index.html'), 'utf8')
    .match(/<body[^>]*>([\s\S]*)<\/body>/i)[1]
    // <script> в разметке happy-dom пытается ЗАГРУЗИТЬ (pen-asset.js, main.js) и
    // сыплет NotSupportedError в вывод; сама разметка нам нужна без них.
    .replace(/<script[\s\S]*?<\/script>/gi, '');

await import('../src/idb-global.js');
await import('../src/sortable-global.js');
await import('../dusk/01-core.ts');
await import('../dusk/02-grimoire.ts');
await import('../dusk/03-render.ts');
await import('../dusk/04-tasks.ts');
await import('../dusk/05-edit-notes-groups.ts');
await import('../dusk/06-deadlines.ts');
await import('../dusk/07-dnd-filter-progress.ts');   // extractTags
await import('../dusk/08-quickadd-export-init.ts');  // parseQuickInput
const S = globalThis;

// ── !приоритет ──────────────────────────────────────────────────────────────
it('русское слово приоритета распознаётся в конце строки', () => {
    const r = S.parseQuickInput('задача !высокий');
    expect(r.priority).toBe('high');
    expect(r.text).toBe('задача');
});

it('русское слово приоритета распознаётся в середине строки', () => {
    const r = S.parseQuickInput('купить !сред молоко');
    expect(r.priority).toBe('medium');
    expect(r.text).toBe('купить молоко');
});

it('смешанный RU/EN ввод: английский токен в русском тексте', () => {
    const r = S.parseQuickInput('задача !low важное');
    expect(r.priority).toBe('low');
    expect(r.text).toBe('задача важное');
});

it('регистр не важен для русского токена', () => {
    expect(S.parseQuickInput('дело !Низкий').priority).toBe('low');
    expect(S.parseQuickInput('дело !НЕТ').priority).toBe('none');
});

it('неизвестное русское слово после ! остаётся в тексте', () => {
    const r = S.parseQuickInput('задача !срочно');
    expect(r.priority).toBe(null);
    expect(r.text).toBe('задача !срочно');
});

it('граница русского токена ведёт себя ровно как английская', () => {
    // Дефис границу даёт (как «!high-tail»), буква/цифра — нет («!highX»).
    expect(S.parseQuickInput('задача !высокий-хвост').priority)
        .toBe(S.parseQuickInput('task !high-tail').priority);
    expect(S.parseQuickInput('задача !высокийхвост').priority)
        .toBe(S.parseQuickInput('task !hightail').priority);
    expect(S.parseQuickInput('задача !высокий2').priority)
        .toBe(S.parseQuickInput('task !high2').priority);
});

// ── *тег ────────────────────────────────────────────────────────────────────
it('русский тег извлекается', () => {
    expect(S.extractTags('купить *дом молоко')).toEqual(['*дом']);
});

it('русский и английский теги в одной строке', () => {
    expect(S.extractTags('*работа задача *home').sort()).toEqual(['*home', '*работа']);
});

it('тег с буквой вне RU/EN не обрезается', () => {
    expect(S.extractTags('заметка *café')).toEqual(['*café']);
});

it('тег с цифрами и подчёркиванием', () => {
    expect(S.extractTags('*план_2026 дело')).toEqual(['*план_2026']);
});

// ── %дата ───────────────────────────────────────────────────────────────────
it('русская дата распознаётся и вырезается из текста', () => {
    const r = S.parseQuickInput('задача %завтра');
    expect(r.deadline).not.toBe(null);
    expect(r.deadline.mode).toBe('date');
    expect(r.text).toBe('задача');
});

it('русские приоритет и дата вместе', () => {
    const r = S.parseQuickInput('позвонить маме !высокий %сегодня');
    expect(r.priority).toBe('high');
    expect(r.deadline.mode).toBe('date');
    expect(r.text).toBe('позвонить маме');
});
