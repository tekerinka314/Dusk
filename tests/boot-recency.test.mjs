// @vitest-environment happy-dom
//
// V2-B0-02 regression — boot must load the NEWER of LS/IDB by the _saveSeq
// blob counter, not "IDB unconditionally" (a stale IDB mirror used to clobber
// a fresher LS copy, silently rolling back the user's last edit(s)).
import { it, expect, vi } from 'vitest';

const _store = {};
vi.mock('idb-keyval', () => ({
    get: vi.fn(async (k) => (k in _store ? _store[k] : undefined)),
    set: vi.fn(async (k, v) => { _store[k] = v; }),
}));

import '../src/idb-global.js';
import '../dusk/01-core.ts';
import '../dusk/02-grimoire.ts';   // migrateNotes for normalizeState
const S = globalThis;

const blob = (uid, seq) => ({
    tasks: [{ uid, text: uid }], groups: [], archive: [],
    nextId: 2, nextGroupId: 1, nextSubId: 1,
    ...(seq != null ? { _saveSeq: seq } : {}),
});
const reset = () => { S.localStorage.clear(); for (const k in _store) delete _store[k]; };

it('LS newer than IDB → LS wins and re-seeds IDB (the clobber scenario)', async () => {
    reset();
    S.localStorage.setItem(S.K_STATE_V4, JSON.stringify(blob('ls-newer', 7)));
    await S._idbSet(S.K_STATE, blob('idb-stale', 5));
    await S.loadState();
    expect(S.state.tasks[0].uid).toBe('ls-newer');            // newer LS booted
    await Promise.resolve();
    expect((await S._idbGet(S.K_STATE)).tasks[0].uid).toBe('ls-newer');   // winner mirrored back
    // and the LS copy was NOT clobbered by a stale-IDB saveState
    expect(JSON.parse(S.localStorage.getItem(S.K_STATE)).tasks[0].uid).toBe('ls-newer');
});

it('IDB newer than LS → IDB wins (control: mechanism is newer-wins, not LS-wins)', async () => {
    reset();
    S.localStorage.setItem(S.K_STATE_V4, JSON.stringify(blob('ls-stale', 5)));
    await S._idbSet(S.K_STATE, blob('idb-newer', 7));
    await S.loadState();
    expect(S.state.tasks[0].uid).toBe('idb-newer');
});

it('legacy blobs without _saveSeq keep the old IDB priority', async () => {
    reset();
    S.localStorage.setItem(S.K_STATE_V4, JSON.stringify(blob('ls-legacy', null)));
    await S._idbSet(S.K_STATE, blob('idb-legacy', null));
    await S.loadState();
    expect(S.state.tasks[0].uid).toBe('idb-legacy');
});

it('saveState seq stays monotonic across an undo-style restore of an older snapshot', () => {
    reset();
    S.state = blob('mono', 1);
    S.saveState();
    S.saveState();
    const high = S.state._saveSeq;
    expect(high).toBeGreaterThanOrEqual(2);
    // restore an old snapshot carrying a lower seq (what popUndo does)
    S.state = blob('mono-restored', 1);
    S.saveState();
    expect(S.state._saveSeq).toBeGreaterThan(high);   // session-high wins → no seq regression
});
