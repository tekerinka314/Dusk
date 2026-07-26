// @vitest-environment happy-dom
//
// V2-B5-02 — свёрнутая панель «Параметры» держала 31 таб-стоп ПЕРЕД кнопкой,
// которая её открывает (замерено зондом D:/tmp/pw/b1/w2_b502_inert.mjs на dist:
// 38 фокусируемых контролов, клип max-height:0 из табов НЕ убирает).
// Замок: разметка стартует с inert, toggleExpand снимает/возвращает его,
// восстановление открытой панели на буте снимает.
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
const _html = readFileSync(join(_root, 'index.html'), 'utf8');

// Модули 01-08 трогают разметку на верхнем уровне → сперва настоящий <body>
// (без <script>: happy-dom пытается их грузить), потом цепочка импортов.
document.body.innerHTML = _html
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
const ef = () => document.getElementById('extra-fields');

// ── контракт разметки ───────────────────────────────────────────────────────
it('#extra-fields в index.html стартует с inert (свёрнут по умолчанию)', () => {
    const tag = _html.match(/<div class="extra-fields" id="extra-fields"[^>]*>/);
    expect(tag).not.toBeNull();
    expect(tag[0]).toMatch(/\binert\b/);
});

// ── поведение ───────────────────────────────────────────────────────────────
it('toggleExpand снимает inert на открытии и возвращает на закрытии', () => {
    expect(ef().hasAttribute('inert')).toBe(true);

    S.toggleExpand();                       // открыть
    expect(S.expandOpen).toBe(true);
    expect(ef().hasAttribute('inert')).toBe(false);
    expect(ef().style.visibility).toBe('');

    S.toggleExpand();                       // закрыть
    expect(S.expandOpen).toBe(false);
    expect(ef().hasAttribute('inert')).toBe(true);
});

it('фокус из гасимой панели паркуется на кнопке «Параметры», не на body', () => {
    S.toggleExpand();                       // открыть
    const note = document.getElementById('task-note');
    note.focus();
    expect(document.activeElement).toBe(note);

    S.toggleExpand();                       // закрыть, фокус внутри
    expect(document.activeElement).toBe(document.getElementById('btn-expand'));
});

it('восстановление открытой панели на буте снимает inert', () => {
    // toggleExpand оставил панель закрытой → приводим состояние к «была открыта»
    localStorage.setItem('expandOpen', '1');
    S.loadUiState();
    expect(ef().hasAttribute('inert')).toBe(false);
    localStorage.setItem('expandOpen', '0');
});

// ── фоллбэк-путь ────────────────────────────────────────────────────────────
it('есть visibility-фоллбэк для движков без нативного inert', () => {
    const src = readFileSync(join(_root, 'dusk/07-dnd-filter-progress.ts'), 'utf8');
    expect(src).toMatch(/_SUPPORTS_INERT\s*=[^\n]*'inert' in HTMLElement\.prototype/);
    expect(src).toMatch(/visibility\s*=\s*'hidden'/);
});
