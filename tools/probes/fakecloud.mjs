// S4/B6 — fake Google Drive + Worker for the syncNow orchestration probe (P6).
// Intercepts googleapis.com Drive REST + the (test-seam) worker URL via page.route.
// Drive file + version counter live HERE in node; two contexts sharing one `drive`
// object = two devices on one cloud. Wire shapes mirror tests/drive-format + 10-cloud.
export const FAKE_WORKER = 'https://fake-worker.test';

export function makeDrive() {
  return { file: null, nextVersion: 1, faults: {}, calls: [] };
  // file = { id, version:Number, payload:{schema,subset,_meta} }
}

// extract the JSON *content* part from a multipart/related create body
function multipartJson(body) {
  const chunks = body.split('\r\n\r\n');
  for (let i = chunks.length - 1; i >= 0; i--) {
    let c = chunks[i].split('\r\n--')[0].trim();
    if (c.startsWith('{')) { try { const o = JSON.parse(c); if (o.schema || o.subset) return o; } catch (_) {} }
  }
  return null;
}

export async function installFakeCloud(target, drive) {
  await target.route(u => /googleapis\.com|fake-worker\.test|gstatic\.com/.test(typeof u === 'string' ? u : u.url ? u.url() : String(u)), async (route) => {
    const req = route.request();
    const url = req.url();
    const method = req.method();
    drive.calls.push(method + ' ' + url.replace(/https:\/\/[^/]+/, ''));

    // ── Worker token endpoints ──
    if (url.startsWith(FAKE_WORKER)) {
      if (url.endsWith('/refresh')) return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ access_token: 'acc-refreshed-' + drive.nextVersion, expires_in: 3600 }) });
      if (url.endsWith('/exchange')) return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ access_token: 'acc', refresh_token: 'ref', expires_in: 3600 }) });
      return route.fulfill({ status: 404, body: '{}' });
    }

    // ── GIS / gstatic stubs (worker mode doesn't need them) ──
    if (/accounts\.google\.com|apis\.google\.com|gstatic\.com/.test(url)) {
      return route.fulfill({ status: 200, contentType: 'text/javascript', body: '/*stub*/' });
    }

    // ── Forced 401 (token-expiry scenario) — one shot per set ──
    if (drive.faults.expire401 > 0 && /\/drive\/v3\/files/.test(url)) {
      drive.faults.expire401--;
      return route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ error: { message: 'invalid token' } }) });
    }

    // ── Drive REST ──
    // find
    if (method === 'GET' && /\/drive\/v3\/files\?/.test(url) && url.includes('spaces=appDataFolder')) {
      const files = drive.file ? [{ id: drive.file.id, name: 'dusk-sync.json', version: String(drive.file.version), modifiedTime: '2026-07-12T00:00:00Z' }] : [];
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ files }) });
    }
    // download
    if (method === 'GET' && /\/drive\/v3\/files\/[^?]+\?alt=media/.test(url)) {
      if (drive.faults.delay) { const ms = drive.faults.delay; drive.faults.delay = 0; await new Promise(r => setTimeout(r, ms)); }
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify(drive.file ? drive.file.payload : {}) });
    }
    // version (client-side expectedVersion check) — conflict injection point
    if (method === 'GET' && /\/drive\/v3\/files\/[^?]+\?fields=version/.test(url)) {
      if (drive.faults.conflictOnce) {
        drive.faults.conflictOnce = false;
        if (typeof drive.faults.onConflictPeer === 'function') drive.faults.onConflictPeer(drive); // peer writes → bumps version+content
      }
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ version: String(drive.file.version) }) });
    }
    // create (first push)
    if (method === 'POST' && url.includes('/upload/drive/v3/files') && url.includes('uploadType=multipart')) {
      const payload = multipartJson(req.postData() || '');
      drive.file = { id: 'file1', version: drive.nextVersion++, payload };
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ id: drive.file.id, version: String(drive.file.version) }) });
    }
    // update
    if (method === 'PATCH' && url.includes('/upload/drive/v3/files/') && url.includes('uploadType=media')) {
      if (drive.faults.failPush) return route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: { message: 'server boom' } }) });
      const payload = JSON.parse(req.postData() || '{}');
      drive.file.payload = payload; drive.file.version = drive.nextVersion++;
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ id: drive.file.id, version: String(drive.file.version) }) });
    }
    return route.fulfill({ status: 404, contentType: 'application/json', body: '{"error":{"message":"unhandled ' + method + ' ' + url + '"}}' });
  });
}

// addInitScript payload: point the app at the fake worker + seed a live token so
// cloudAuth's silent path returns immediately (no real Google). Runs pre-boot.
export function seedTokenInit(farFutureMs, enable = true) {
  return `(() => {
    window.__DUSK_WORKER_URL = ${JSON.stringify(FAKE_WORKER)};
    try {
      localStorage.setItem('dusk_sync_token_v1', JSON.stringify({ t: 'acc-seeded', e: ${farFutureMs} }));
      localStorage.setItem('dusk_sync_refresh_v1', 'ref-seeded');
      ${enable ? "localStorage.setItem('dusk_sync_enabled_v1', '1');" : ""}
    } catch (e) {}
  })()`;
}
