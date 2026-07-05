// @vitest-environment happy-dom
//
// Этап 4 step 0 — _idbGet/_idbSet wrapper (dusk/01-core.ts) over idb-keyval,
// bridged in via src/idb-global.js (same pattern as sortable-global.js for
// Sortable — 01-core.ts stays import/export-free so TS keeps merging its
// top-level declarations into the shared global namespace the other 11 dusk
// modules read ambiently). dusk/01-core.ts touches `document` at module top
// level (DOM-ref consts), so this file needs a DOM environment — the other
// 4 test files import only the DOM-free sync/cloud modules and stay on the
// default node environment.
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

let pass = 0; const failures = [];
const rec = (n, c, d) => { if (c) pass++; else failures.push(n + (d != null ? ' · ' + JSON.stringify(d) : '')); };

// 1. round trip through the wrapper
await S._idbSet('k1', { a: 1 });
rec('round trip: set then get returns the same value', JSON.stringify(await S._idbGet('k1')) === JSON.stringify({ a: 1 }));

// 2. missing key resolves undefined, doesn't throw
rec('missing key resolves undefined', await S._idbGet('missing-key') === undefined);

// 3. a rejected idb-keyval.get() is swallowed — resolves undefined, never throws
idbKeyval.get.mockRejectedValueOnce(new Error('boom'));
let threw3 = false;
let got3;
try { got3 = await S._idbGet('k1'); } catch (_) { threw3 = true; }
rec('_idbGet swallows a rejected get() (no throw, resolves undefined)', !threw3 && got3 === undefined, { threw3, got3 });

// 4. a rejected idb-keyval.set() is swallowed — resolves false, never throws
idbKeyval.set.mockRejectedValueOnce(new Error('boom'));
let threw4 = false;
let got4;
try { got4 = await S._idbSet('k1', 1); } catch (_) { threw4 = true; }
rec('_idbSet swallows a rejected set() (no throw, resolves false)', !threw4 && got4 === false, { threw4, got4 });

// 5. a successful set() resolves true
rec('_idbSet resolves true on success', await S._idbSet('k2', 2) === true);

it('idb storage wrapper (Этап 4 step 0) — 5 cases', () => {
    expect(failures).toEqual([]);
    expect(pass).toBe(5);
});
