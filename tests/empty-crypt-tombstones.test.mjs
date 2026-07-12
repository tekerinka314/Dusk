// @vitest-environment happy-dom
//
// V2-B0-01 regression — «Опустошить склеп» (grimEmptyCrypt) must leave a
// tombstone per wiped note, or a stale device resurrects every one of them on
// the next 3-way merge (notes sync by `id`).
import { it, expect, vi } from 'vitest';

const _store = {};
vi.mock('idb-keyval', () => ({
    get: vi.fn(async (k) => (k in _store ? _store[k] : undefined)),
    set: vi.fn(async (k, v) => { _store[k] = v; }),
}));

import '../src/idb-global.js';
import '../dusk/01-core.ts';
import '../dusk/02-grimoire.ts';
const S = globalThis;

S.showToast = () => {};
S.renderNotes = () => {};
S.pushUndo = S.pushUndo || (() => {});

it('emptying the crypt tombstones every archived note', () => {
    S.state = {
        tasks: [], groups: [], archive: [], notes: [],
        notesArchive: [{ id: 'n-uid-1', title: 'a' }, { id: 'n-uid-2', title: 'b' }],
        tombstones: [],
        nextId: 1, nextGroupId: 1, nextSubId: 1,
    };
    // two-step confirm is real module-internal logic (lexical `_armDanger` —
    // can't be stubbed via globalThis): first call arms, second call fires.
    const btn = document.createElement('button');
    document.body.appendChild(btn);
    S.grimEmptyCrypt(btn);
    expect(S.state.notesArchive.length).toBe(2);   // armed, not yet wiped
    S.grimEmptyCrypt(btn);

    expect(S.state.notesArchive.length).toBe(0);
    const noteStones = S.state.tombstones.filter(t => t.type === 'note').map(t => t.uid).sort();
    expect(noteStones).toEqual(['n-uid-1', 'n-uid-2']);
    for (const t of S.state.tombstones) expect(typeof t.deletedAt).toBe('number');
});
