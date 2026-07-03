// Sync Phase 2 — Drive transport (dusk/10-cloud.js), mocked fetch, 24 cases.
// Ported node harness (was tests/harness/cloud-transport.cjs; body kept verbatim).
// Side-effect import + globalThis bridges → survives the .ts rename (Этап 3).
import { it, expect } from 'vitest';
import '../dusk/10-cloud.js';
const C = globalThis;

let pass = 0; const failures = [];
function ok(name, cond) { if (cond) pass++; else failures.push(name); }
async function throws(name, fn, pred) {
    try { await fn(); failures.push(name + ' (no throw)'); }
    catch (e) { if (!pred || pred(e)) pass++; else failures.push(name + ' (wrong err: ' + e.message + ')'); }
}

// ── mock fetch router ────────────────────────────────────────────────────────
let lastBodies = {};   // capture request bodies for assertions
function resp(status, obj) {
    return Promise.resolve({ ok: status >= 200 && status < 300, status, json: async () => obj });
}
let routes;
global.fetch = function (url, opts) {
    opts = opts || {};
    const m = opts.method || 'GET';
    for (const r of routes) {
        if (r.test(url, m)) { if (opts.body) lastBodies[r.tag] = opts.body; return r.reply(url, opts); }
    }
    throw new Error('UNEXPECTED FETCH: ' + m + ' ' + url);
};

it('cloud transport (Phase 2) — 24 cases', async () => {
    // sanity: worker mode is the default (SYNC_WORKER_URL filled) → auth is a
    // redirect+fetch, no GIS lib needed → configured even in node. Not signed in yet.
    ok('cloudIsConfigured true in worker mode (node)', C.cloudIsConfigured() === true);
    ok('cloudStatus signedOut initially', C.cloudStatus().signedIn === false);

    // inject a token so transport works without GIS
    C.__setAccessTokenForTest('FAKE_TOKEN', 3600000);
    ok('cloudStatus signedIn after inject', C.cloudStatus().signedIn === true);
    ok('expiresAt set', C.cloudStatus().expiresAt > 0);

    // ── A: cloudPull empty (no remote file) ──
    routes = [
        { tag: 'find', test: (u, m) => m === 'GET' && u.includes('spaces=appDataFolder') && u.includes('q='),
          reply: () => resp(200, { files: [] }) },
    ];
    const a = await C.cloudPull();
    ok('A pull empty → {empty:true}', a && a.empty === true);

    // ── B: cloudPull with existing file ──
    routes = [
        { tag: 'find', test: (u, m) => m === 'GET' && u.includes('spaces=appDataFolder'),
          reply: () => resp(200, { files: [{ id: 'F1', name: 'dusk-sync.json', version: '7' }] }) },
        { tag: 'dl', test: (u, m) => m === 'GET' && u.includes('alt=media'),
          reply: () => resp(200, { schema: 1, subset: { tasks: [{ uid: 'u1' }] }, _meta: { updatedAt: 123 } }) },
    ];
    const b = await C.cloudPull();
    ok('B pull fileId', b.fileId === 'F1');
    ok('B pull version', b.version === '7');
    ok('B pull subset', b.subset && b.subset.tasks[0].uid === 'u1');
    ok('B pull meta', b.meta && b.meta.updatedAt === 123);

    // verify Bearer header sent
    routes = [
        { tag: 'find', test: (u, m) => true,
          reply: (u, o) => { ok('Bearer header', o.headers.Authorization === 'Bearer FAKE_TOKEN'); return resp(200, { files: [] }); } },
    ];
    await C.cloudPull();

    // ── C: cloudPush create (no fileId) → multipart POST ──
    lastBodies = {};
    routes = [
        { tag: 'create', test: (u, m) => m === 'POST' && u.includes('uploadType=multipart'),
          reply: () => resp(200, { id: 'F9', version: '1' }) },
    ];
    const c = await C.cloudPush({ tasks: [{ uid: 'x' }] }, {});
    ok('C create fileId', c.fileId === 'F9');
    ok('C create version', c.version === '1');
    ok('C create body has appDataFolder', lastBodies.create.includes('appDataFolder'));
    ok('C create body has subset', lastBodies.create.includes('"uid":"x"'));
    ok('C create body has schema', lastBodies.create.includes('"schema":1'));
    ok('C create body has _meta.device', lastBodies.create.includes('"device"'));

    // ── D: cloudPush update, version matches → PATCH ──
    lastBodies = {};
    routes = [
        { tag: 'ver', test: (u, m) => m === 'GET' && u.includes('fields=version'),
          reply: () => resp(200, { version: '7' }) },
        { tag: 'patch', test: (u, m) => m === 'PATCH' && u.includes('uploadType=media'),
          reply: () => resp(200, { id: 'F1', version: '8' }) },
    ];
    const d = await C.cloudPush({ tasks: [] }, { fileId: 'F1', expectedVersion: '7' });
    ok('D update fileId', d.fileId === 'F1');
    ok('D update version bumped', d.version === '8');
    ok('D patch body is plain json (no boundary)', lastBodies.patch && !lastBodies.patch.includes('boundary') && lastBodies.patch.includes('"schema":1'));

    // ── E: cloudPush update, version drift → ConflictError ──
    routes = [
        { tag: 'ver', test: (u, m) => m === 'GET' && u.includes('fields=version'),
          reply: () => resp(200, { version: '9' }) },
        { tag: 'patch', test: (u, m) => m === 'PATCH', reply: () => { throw new Error('PATCH should NOT run on conflict'); } },
    ];
    await throws('E version drift → ConflictError', () => C.cloudPush({}, { fileId: 'F1', expectedVersion: '7' }),
        e => e instanceof C.ConflictError && String(e.expected) === '7' && String(e.actual) === '9');

    // ── E2: numeric version compared as string (no false conflict) ──
    routes = [
        { tag: 'ver', test: (u, m) => m === 'GET' && u.includes('fields=version'), reply: () => resp(200, { version: 7 }) },
        { tag: 'patch', test: (u, m) => m === 'PATCH', reply: () => resp(200, { id: 'F1', version: 8 }) },
    ];
    const e2 = await C.cloudPush({}, { fileId: 'F1', expectedVersion: '7' });
    ok('E2 numeric vs string version not a conflict', e2.version === 8);

    // ── F: Drive error surfaces with status + message ──
    routes = [
        { tag: 'find', test: (u, m) => true, reply: () => resp(403, { error: { message: 'Insufficient permission' } }) },
    ];
    await throws('F 403 → error with status+message', () => C.cloudPull(),
        e => e.message.includes('403') && e.message.includes('Insufficient permission'));

    // ── G: 401 with no re-auth possible (node) → throws, no infinite loop ──
    let calls = 0;
    routes = [
        { tag: 'find', test: (u, m) => true, reply: () => { calls++; return resp(401, { error: { message: 'invalid token' } }); } },
    ];
    C.__setAccessTokenForTest('FAKE_TOKEN', 3600000);
    await throws('G 401 → throws (no loop)', () => C.cloudPull(), () => true);
    ok('G 401 retried at most twice', calls <= 2);

    expect(failures).toEqual([]);
    expect(pass).toBe(24);
});
