// @vitest-environment happy-dom
//
// Этап 4 steps 0-1 — _idbGet/_idbSet wrapper + saveState() dual-write (dusk/01-core.ts) over idb-keyval,
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
// loadState()'s normalizeState() calls migrateNotes() (defined in 02-grimoire.ts,
// shared via the script-mode global namespace) — load it too so the loadState()
// scenarios below don't hit a ReferenceError that only exists in this isolated
// test, not in the real app (which loads all 12 modules together).
import '../dusk/02-grimoire.ts';
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

// 6. saveState() dual-writes: LS synchronously (unchanged), IDB as a fire-and-forget mirror
globalThis.localStorage.clear();
globalThis.state = { tasks: [{ uid: 't1', text: 'x' }], groups: [], archive: [], nextId: 2, nextGroupId: 1, nextSubId: 1 };
S.saveState();
rec('saveState still writes LS synchronously', globalThis.localStorage.getItem(S.K_STATE) === JSON.stringify(globalThis.state));
await Promise.resolve(); // let the fire-and-forget _idbSet microtask land
rec('saveState mirrors the same state into IDB', JSON.stringify(await S._idbGet(S.K_STATE)) === JSON.stringify(globalThis.state));

// 7. a rejected IDB mirror write never throws out of saveState and never blocks the LS write
globalThis.localStorage.clear();
idbKeyval.set.mockRejectedValueOnce(new Error('boom'));
globalThis.state = { tasks: [], groups: [], archive: [], nextId: 1, nextGroupId: 1, nextSubId: 1 };
let threw7 = false;
try { S.saveState(); } catch (_) { threw7 = true; }
rec('saveState never throws even when the IDB mirror rejects', !threw7);
rec('saveState LS write still lands despite the IDB mirror rejecting', globalThis.localStorage.getItem(S.K_STATE) === JSON.stringify(globalThis.state));

// 8. loadState(): LS-only boot (fresh IDB) loads the LS data and migrates it into IDB
globalThis.localStorage.clear();
for (const k in _store) delete _store[k];
globalThis.localStorage.setItem(S.K_STATE_V4, JSON.stringify({ tasks: [{ uid: 'ls1', text: 'from ls' }], groups: [], archive: [], nextId: 2, nextGroupId: 1, nextSubId: 1 }));
await S.loadState();
rec('loadState(): LS-only boot loads the LS data', globalThis.state.tasks?.[0]?.uid === 'ls1', globalThis.state);
await Promise.resolve();
rec('loadState(): LS-only boot migrates that data into IDB', (await S._idbGet(S.K_STATE))?.tasks?.[0]?.uid === 'ls1');

// 9. loadState(): IDB present → preferred over LS, even when LS holds different (stale) data
globalThis.localStorage.clear();
for (const k in _store) delete _store[k];
globalThis.localStorage.setItem(S.K_STATE_V4, JSON.stringify({ tasks: [{ uid: 'stale-ls' }], groups: [], archive: [], nextId: 1, nextGroupId: 1, nextSubId: 1 }));
await S._idbSet(S.K_STATE, { tasks: [{ uid: 'fresh-idb' }], groups: [], archive: [], nextId: 1, nextGroupId: 1, nextSubId: 1 });
await S.loadState();
rec('loadState(): IDB present wins over stale LS', globalThis.state.tasks?.[0]?.uid === 'fresh-idb', globalThis.state);

// 10. loadState(): a rejected IDB read falls back to LS and still boots — never throws
globalThis.localStorage.clear();
for (const k in _store) delete _store[k];
globalThis.localStorage.setItem(S.K_STATE_V4, JSON.stringify({ tasks: [{ uid: 'fallback-ls' }], groups: [], archive: [], nextId: 1, nextGroupId: 1, nextSubId: 1 }));
idbKeyval.get.mockRejectedValueOnce(new Error('boom'));
let threw10 = false;
try { await S.loadState(); } catch (_) { threw10 = true; }
rec('loadState(): a rejected IDB read falls back to LS without throwing', !threw10 && globalThis.state.tasks?.[0]?.uid === 'fallback-ls', { threw10, state: globalThis.state });

// 11. persistBackups(): writes both LS (unchanged shape) and IDB (fire-and-forget, full copy)
globalThis.localStorage.clear();
for (const k in _store) delete _store[k];
S.persistBackups([{ ts: 1, json: '{}', counts: {} }]);
rec('persistBackups() writes the LS ring', JSON.parse(globalThis.localStorage.getItem(S.K_BACKUPS) || 'null')?.length === 1);
rec('persistBackups() mirrors the same ring into IDB', (await S._idbGet(S.K_BACKUPS))?.length === 1);

// 12. loadBackups(): IDB present → preferred over LS
globalThis.localStorage.clear();
for (const k in _store) delete _store[k];
globalThis.localStorage.setItem(S.K_BACKUPS, JSON.stringify([{ ts: 1, json: '{}', counts: {} }]));
await S._idbSet(S.K_BACKUPS, [{ ts: 2, json: '{}', counts: {} }, { ts: 3, json: '{}', counts: {} }]);
const got12 = await S.loadBackups();
rec('loadBackups(): IDB present wins over LS', Array.isArray(got12) && got12.length === 2 && got12[0].ts === 2, got12);

// 13. loadBackups(): a rejected IDB read falls back to LS, never throws
globalThis.localStorage.clear();
for (const k in _store) delete _store[k];
globalThis.localStorage.setItem(S.K_BACKUPS, JSON.stringify([{ ts: 9, json: '{}', counts: {} }]));
idbKeyval.get.mockRejectedValueOnce(new Error('boom'));
let threw13 = false; let got13;
try { got13 = await S.loadBackups(); } catch (_) { threw13 = true; }
rec('loadBackups(): a rejected IDB read falls back to LS without throwing', !threw13 && got13?.length === 1 && got13[0].ts === 9, { threw13, got13 });

// 14. maybeBackup(): creates a ring entry, present in both LS and its IDB mirror
globalThis.localStorage.clear();
for (const k in _store) delete _store[k];
globalThis.state = { tasks: [{ uid: 'bk1' }], groups: [], archive: [], nextId: 1, nextGroupId: 1, nextSubId: 1 };
await S.maybeBackup();
const idbBackups14 = await S._idbGet(S.K_BACKUPS);
const lsBackups14 = JSON.parse(globalThis.localStorage.getItem(S.K_BACKUPS) || 'null');
rec('maybeBackup() creates a backup entry mirrored into IDB', Array.isArray(idbBackups14) && idbBackups14.length === 1, idbBackups14);
rec('maybeBackup() also writes the LS ring (unchanged shape)', Array.isArray(lsBackups14) && lsBackups14.length === 1, lsBackups14);

// 15. dedup: identical consecutive saveState() calls mirror to IDB only once;
//     a real change writes again. Guards against LevelDB write-amplification.
const flush = () => new Promise(r => setTimeout(r, 0)); // let _idbSet resolve + its .then update the dedup cache
globalThis.localStorage.clear();
for (const k in _store) delete _store[k];
globalThis._lastIdbStateJson = undefined;
globalThis.state = { tasks: [{ uid: 'dd1' }], groups: [], archive: [], nextId: 1, nextGroupId: 1, nextSubId: 1 };
idbKeyval.set.mockClear();
S.saveState();
await flush();
S.saveState();   // byte-identical → must be skipped
await flush();
const stateWrites1 = idbKeyval.set.mock.calls.filter(c => c[0] === S.K_STATE).length;
rec('dedup: identical consecutive saves mirror state to IDB only once', stateWrites1 === 1, stateWrites1);
globalThis.state.tasks.push({ uid: 'dd2' });
S.saveState();   // changed → must write again
await flush();
const stateWrites2 = idbKeyval.set.mock.calls.filter(c => c[0] === S.K_STATE).length;
rec('dedup: a changed state writes to IDB again', stateWrites2 === 2, stateWrites2);

// 16. dedup never blocks LS: LS is written on every save regardless of the skip
globalThis.localStorage.clear();
globalThis._lastIdbStateJson = JSON.stringify(globalThis.state); // pretend IDB already holds this exact state
S.saveState();   // IDB skipped, but LS must still be written
rec('dedup: LS write still lands even when the IDB mirror is skipped', globalThis.localStorage.getItem(S.K_STATE) === JSON.stringify(globalThis.state));

it('idb storage wrapper (Этап 4 steps 0-4, dedup) — 22 cases', () => {
    expect(failures).toEqual([]);
    expect(pass).toBe(22);
});
