// @vitest-environment happy-dom
//
// V2-B6-03 regression — saveState must never swallow a localStorage quota
// failure silently: it surfaces a persistent toast (once per outage), still
// mirrors the edit to IndexedDB (which has no comparable ceiling), and
// re-arms the warning after storage recovers.
import { it, expect, vi } from 'vitest';

const _store = {};
vi.mock('idb-keyval', () => ({
    get: vi.fn(async (k) => (k in _store ? _store[k] : undefined)),
    set: vi.fn(async (k, v) => { _store[k] = v; }),
}));

import * as idbKeyval from 'idb-keyval';
import '../src/idb-global.js';
import '../dusk/01-core.ts';
const S = globalThis;

const toasts = [];
S.showToast = (msg, opts) => { toasts.push({ msg, opts }); };

// Deterministic fake Storage (happy-dom's Storage patches poorly: named-property
// semantics + a prototype chain vi.spyOn doesn't reliably intercept). saveState
// resolves the bare `localStorage` identifier on the global at CALL time, so a
// stubbed global is seen by every later call even though 01-core loaded first.
const mem = new Map();
let quotaDown = false;
const fakeLS = {
    getItem:    (k) => (mem.has(k) ? mem.get(k) : null),
    setItem:    (k, v) => {
        if (quotaDown && k === S.K_STATE) { const e = new Error('quota'); e.name = 'QuotaExceededError'; throw e; }
        mem.set(k, String(v));
    },
    removeItem: (k) => { mem.delete(k); },
    clear:      () => { mem.clear(); },
};
vi.stubGlobal('localStorage', fakeLS);

it('quota outage: no throw, one persistent toast, IDB mirror still attempted, re-arm on recovery', async () => {
    S.state = { tasks: [{ uid: 'q1', text: 'edit-under-quota' }], groups: [], archive: [], nextId: 2, nextGroupId: 1, nextSubId: 1 };

    quotaDown = true;
    idbKeyval.set.mockClear();
    expect(() => S.saveState()).not.toThrow();          // 1. the edit path survives
    expect(toasts.length).toBe(1);                      // 2. user is told…
    expect(toasts[0].opts && toasts[0].opts.persist).toBe(true);   // …persistently
    expect(mem.has(S.K_STATE)).toBe(false);             //    (LS write really failed)
    S.saveState();
    expect(toasts.length).toBe(1);                      // 3. …but only once per outage

    // 4. IDB mirror ran despite the LS failure — the edit is captured somewhere
    await Promise.resolve();
    const idbCalls = idbKeyval.set.mock.calls.filter(c => c[0] === S.K_STATE);
    expect(idbCalls.length).toBeGreaterThan(0);

    // 5. storage recovers → warning re-arms → a NEW outage toasts again
    quotaDown = false;
    S.saveState();                                      // successful write re-arms
    expect(mem.has(S.K_STATE)).toBe(true);
    quotaDown = true;
    S.saveState();
    expect(toasts.length).toBe(2);
    quotaDown = false;
});
