// @vitest-environment happy-dom
//
// V2-B6-01 regression — the boot handshake between loadState and syncNow:
// 1) loadState sets _stateLoaded / resolves _stateLoadedPromise on every path;
// 2) syncNow WAITS on that promise instead of reading the pristine state;
// 3) the pristine-state fuse refuses to merge an empty (no data, no
//    tombstones) state against a non-empty baseline.
import { it, expect, vi } from 'vitest';

const _store = {};
vi.mock('idb-keyval', () => ({
    get: vi.fn(async (k) => (k in _store ? _store[k] : undefined)),
    set: vi.fn(async (k, v) => { _store[k] = v; }),
}));

import '../src/idb-global.js';
import '../dusk/01-core.ts';
import '../dusk/02-grimoire.ts';
import '../dusk/09-sync.ts';       // loadBaseline/saveBaseline for the fuse
import '../dusk/11-sync-ui.ts';
const S = globalThis;

const tick = () => new Promise(r => setTimeout(r, 0));

it('loadState resolves the boot handshake (flag + promise) on the LS path', async () => {
    expect(S._stateLoaded).toBe(false);
    S.localStorage.setItem(S.K_STATE_V4, JSON.stringify({ tasks: [{ uid: 'boot1', text: 'x' }], groups: [], archive: [], nextId: 2, nextGroupId: 1, nextSubId: 1 }));
    await S.loadState();
    expect(S._stateLoaded).toBe(true);
    await expect(S._stateLoadedPromise).resolves.toBeUndefined();   // settled
});

it('syncNow waits for the handshake instead of running on the pristine state', async () => {
    // re-arm the handshake to simulate a fresh boot
    S._stateLoaded = false;
    let release;
    S._stateLoadedPromise = new Promise(r => { release = r; });

    let finished = false;
    // cloudIsConfigured is undefined in this seam → after the gate, syncNow
    // exits on its first guard; what we pin is the ORDER: not before release().
    const p = S.syncNow({}).then(() => { finished = true; });
    await tick(); await tick();
    expect(finished).toBe(false);          // parked on the gate
    release(); S._stateLoaded = true;
    await p;
    expect(finished).toBe(true);           // proceeds only after the state is loaded
});

it('pristine-state fuse: empty state + non-empty baseline → sync refuses before merging', async () => {
    S._stateLoaded = true;
    S._stateLoadedPromise = Promise.resolve();
    // a baseline that has seen real data
    S.saveBaseline({ tasks: [{ uid: 'remote1', text: 'r', updatedAt: 1 }], groups: [], notes: [], notesArchive: [], templates: [], noteTemplates: [], tombstones: [], syncJournal: [] });
    // pristine in-memory state (no data, no tombstones, no journal)
    S.state = { tasks: [], groups: [], archive: [], notes: [], notesArchive: [], tombstones: [], syncJournal: [], nextId: 1, nextGroupId: 1, nextSubId: 1 };
    // make the pre-fuse guards pass so we reach the fuse, and fail loudly if
    // the loop is ever entered
    S.cloudIsConfigured = () => true;
    S.cloudAuth = async () => {};
    let pulled = false;
    S.cloudPull = async () => { pulled = true; return { empty: true }; };

    await S.syncNow({});
    expect(pulled).toBe(false);            // never reached the pull/merge loop
});

it('fuse does NOT trip on a legitimate mass-delete (tombstones present)', async () => {
    S._stateLoaded = true;
    S._stateLoadedPromise = Promise.resolve();
    S.saveBaseline({ tasks: [{ uid: 'remote1', text: 'r', updatedAt: 1 }], groups: [], notes: [], notesArchive: [], templates: [], noteTemplates: [], tombstones: [], syncJournal: [] });
    S.state = { tasks: [], groups: [], archive: [], notes: [], notesArchive: [], tombstones: [{ uid: 'remote1', type: 'task', deletedAt: 2 }], syncJournal: [], nextId: 1, nextGroupId: 1, nextSubId: 1 };
    S.cloudIsConfigured = () => true;
    S.cloudAuth = async () => {};
    let pulled = false;
    S.cloudPull = async () => { pulled = true; throw new Error('stop-after-pull'); };   // enter loop, then bail

    await S.syncNow({});                   // error is caught internally
    expect(pulled).toBe(true);             // the deletion DOES sync — fuse stayed open
});
