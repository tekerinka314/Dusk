// @vitest-environment happy-dom
//
// B11-01 / B11-02 — форма записей из НЕДОВЕРЕННОГО источника.
//
// Три границы доверия ведут в один и тот же state: импорт свитка, посадка мержа
// синка (файл Drive) и чтение LS/IDB. До фикса форму проверял ТОЛЬКО импорт, да и
// то текст/витраж/перечисления — идентификаторы не проверял никто, а посадка синка
// не проверяла вовсе. `id` ехал в `data-id="…"` сырым, разрывал атрибут и вносил
// произвольную разметку (зонд подтвердил на четырёх поверхностях: лист Гримуара,
// меню образцов, строка обета, летопись).
//
// Замок: единственный шлюз `normalizeState()` (зовётся после КАЖДОЙ подмены state)
// обязан приводить форму, а летопись — проходить санитайзер на своей границе.
import { it, expect, vi } from 'vitest';

const _store = {};
vi.mock('idb-keyval', () => ({
    get: vi.fn(async (k) => (k in _store ? _store[k] : undefined)),
    set: vi.fn(async (k, v) => { _store[k] = v; }),
}));

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const _root = join(dirname(fileURLToPath(import.meta.url)), '..');
document.body.innerHTML = readFileSync(join(_root, 'index.html'), 'utf8')
    .match(/<body[^>]*>([\s\S]*)<\/body>/i)[1]
    .replace(/<script[\s\S]*?<\/script>/gi, '');

await import('../src/idb-global.js');
await import('../src/sortable-global.js');
for (const f of ['01-core', '02-grimoire', '03-render', '04-tasks',
                 '05-edit-notes-groups', '06-deadlines', '07-dnd-filter-progress',
                 '08-quickadd-export-init']) await import(`../dusk/${f}.ts`);
const S = globalThis;

// Разрыв атрибута: закрываем `data-id="`, открываем свой тег.
const POISON_ID = 'x"><img src=q onerror="window.__pwned=1">';
const POISON_BODY = '<img src=q onerror="window.__pwned=1"><script>window.__pwned=1<\/script>';

function freshState(extra) {
    S.state = Object.assign({
        tasks: [], archive: [], groups: [], templates: [],
        notes: [], notesArchive: [], noteTemplates: [],
        tombstones: [], syncJournal: [],
        nextId: 1, nextGroupId: 1, nextSubId: 1, nextTemplateId: 1,
    }, extra || {});
}

it('шлюз переписывает кривой id записи Гримуара и лист рендерится чистым', () => {
    freshState({ notes: [{ id: POISON_ID, title: 't', body: '<p>b</p>', fmt: true, createdAt: 1, updatedAt: 1 }] });
    S.normalizeState();
    expect(S.state.notes[0].id).not.toBe(POISON_ID);
    expect(S.state.notes[0].id).toMatch(/^[A-Za-z0-9_.:-]{1,64}$/);
    S.grimMode = 'active';
    S.notesSearchQuery = '';
    S.renderGrimList();
    expect(document.getElementById('grim-list').querySelectorAll('img').length).toBe(0);
});

it('шлюз переписывает кривой id образца записи и меню рендерится чистым', () => {
    freshState({ noteTemplates: [{ id: POISON_ID, name: 'obr', title: '', body: '', color: null }] });
    S.normalizeState();
    expect(S.state.noteTemplates[0].id).not.toBe(POISON_ID);
    S._grimRenderTplMenu();
    expect(document.getElementById('grim-tpl-pop').querySelectorAll('img').length).toBe(0);
});

it('шлюз переписывает кривые id обета и звена, строка рендерится чистой', () => {
    freshState({ tasks: [{ id: POISON_ID, uid: 'u1', text: 'обет', checked: false, order: 0,
                           groupId: null, priority: 'none', repeat: 'none', updatedAt: 1,
                           subtasks: [{ id: POISON_ID, text: 'звено', checked: false }] }] });
    S.normalizeState();
    expect(Number.isInteger(S.state.tasks[0].id)).toBe(true);
    expect(Number.isInteger(S.state.tasks[0].subtasks[0].id)).toBe(true);
    const list = document.getElementById('list-container');
    list.innerHTML = '';
    list.appendChild(S.createTaskEl(S.state.tasks[0], false));
    expect(list.querySelectorAll('img').length).toBe(0);
});

it('шлюз выбраковывает витраж не-hex у обета, свода и записи', () => {
    freshState({
        tasks:  [{ id: 1, uid: 'u1', text: 'o', subtasks: [], order: 0, color: 'red" onmouseover="alert(1)' }],
        groups: [{ id: 1, uid: 'g1', name: 'g', color: 'javascript:alert(1)' }],
        notes:  [{ id: 'n1', title: 't', body: '<p>b</p>', fmt: true, color: 'url(x)' }],
    });
    S.normalizeState();
    expect(S.state.tasks[0].color).toBe(null);
    expect(S.state.groups[0].color).toBe('#6C8EF5');
    expect(S.state.notes[0].color).toBe(null);
});

it('честный витраж и честные id шлюз НЕ трогает', () => {
    const noteId = 'a1b2c3d4-0000-4000-8000-abcdefabcdef';
    freshState({
        tasks:  [{ id: 7, uid: 'u1', text: 'o', subtasks: [{ id: 3, text: 's' }], order: 0, color: '#F56C6C' }],
        groups: [{ id: 4, uid: 'g1', name: 'g', color: '#6CD4F5' }],
        notes:  [{ id: noteId, title: 't', body: '<p>b</p>', fmt: true, color: '#B06CF5' }],
        nextId: 8, nextSubId: 4, nextGroupId: 5,
    });
    S.normalizeState();
    expect(S.state.tasks[0].id).toBe(7);
    expect(S.state.tasks[0].subtasks[0].id).toBe(3);
    expect(S.state.tasks[0].color).toBe('#F56C6C');
    expect(S.state.groups[0].id).toBe(4);
    expect(S.state.groups[0].color).toBe('#6CD4F5');
    expect(S.state.notes[0].id).toBe(noteId);
    expect(S.state.notes[0].color).toBe('#B06CF5');
});

it('летопись из чужого свитка чистится на границе и рисуется без активного содержимого', () => {
    const nid = 'n1';
    freshState({ notes: [{ id: nid, title: 't', body: '<p>b</p>', fmt: true, createdAt: 1, updatedAt: 1 }] });
    S.normalizeState();
    globalThis.grimVersions = {};
    S._grimRestoreVersions({ _grimVersions: { [nid]: [{ at: 111, t: 'ver', b: POISON_BODY, kind: 'auto' }] } }, 'replace');
    expect(globalThis.grimVersions[nid][0].b).not.toMatch(/onerror/);

    S._grimHistId = nid;
    S._grimHistSel = 111;
    let ov = document.getElementById('grim-hist-ov');
    if (!ov) { ov = document.createElement('div'); ov.id = 'grim-hist-ov'; document.body.appendChild(ov); }
    S._grimRenderHistory();
    expect(ov.querySelectorAll('img, script').length).toBe(0);
});

it('откат к слепку кладёт в запись очищенное тело', () => {
    const nid = 'n2';
    freshState({ notes: [{ id: nid, title: 't', body: '<p>b</p>', fmt: true, createdAt: 1, updatedAt: 1 }] });
    S.normalizeState();
    // Слепок минуя границу импорта (эмуляция правленого LS) — откат обязан чистить сам.
    globalThis.grimVersions = { [nid]: [{ at: 222, t: 'ver', b: POISON_BODY, kind: 'auto' }] };
    S._grimHistId = nid;
    S.grimHistRestore(222);
    expect(S.state.notes[0].body).not.toMatch(/onerror/);
    expect(S.state.notes[0].body).not.toMatch(/<script/i);
});
