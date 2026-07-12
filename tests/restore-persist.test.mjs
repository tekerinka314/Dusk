// @vitest-environment happy-dom
//
// V2-B6-08 (mutation-without-saveState census) — the animated single-task
// archive restore must PERSIST the move immediately. It mutates state (task
// out of archive, into tasks) but deferred its render to animationend and had
// dropped the saveState, so a reload before any later saved action silently
// rolled the restore back (conflict-free — matched the user report). Siblings
// restoreSelected/restoreAll already persisted; only restoreTask leaked.
import { it, expect, vi } from 'vitest';

const _store = {};
vi.mock('idb-keyval', () => ({
    get: vi.fn(async (k) => (k in _store ? _store[k] : undefined)),
    set: vi.fn(async (k, v) => { _store[k] = v; }),
}));

import '../src/idb-global.js';
import '../dusk/01-core.ts';
import '../dusk/02-grimoire.ts';
import '../dusk/03-render.ts';
import '../dusk/04-tasks.ts';
const S = globalThis;

// stub the render / navigation family so restoreTask's doTransition is inert
S.render = () => {}; S.renderArchive = () => {}; S.showToast = () => {};
S.switchPage = () => {}; S.updateArchiveBadge = () => {};
S.prefersReducedMotion = () => true;   // → doTransition() runs synchronously, no DOM needed

it('restoreTask persists the archive→tasks move immediately (survives a reload)', () => {
    S.state = {
        tasks: [], groups: [], archive: [{ id: 5, uid: 'a5', text: 'из архива', _arch: true, subtasks: [], updatedAt: 1000, createdAt: 1000 }],
        notes: [], notesArchive: [], templates: [], noteTemplates: [],
        tombstones: [], syncJournal: [], nextId: 6, nextGroupId: 1, nextSubId: 1,
    };
    S.restoreTask(5);

    // in-memory moved
    expect(S.state.tasks.some(t => t.uid === 'a5')).toBe(true);
    expect(S.state.archive.some(a => a.id === 5)).toBe(false);

    // PERSISTED: the localStorage blob (what a reload reads) reflects the move
    const persisted = JSON.parse(S.localStorage.getItem(S.K_STATE));
    expect(persisted.tasks.some(t => t.uid === 'a5')).toBe(true);
    expect(persisted.archive.some(a => a.id === 5)).toBe(false);
});
