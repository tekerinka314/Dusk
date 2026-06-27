# DUSK Sync — Phase 2 spec (Google Drive client: auth + transport)

Status: **DESIGN READY 2026-06-28, NOT CODED** (user will compact, then coding begins —
same workflow as Phase 1). Branch `refactor/sync`.

Phase 1 DONE (`d88e7dc`): the pure 3-way merge engine `dusk/09-sync.js` + model prep.
Phase 2 = the network layer that gets `remote` to and from the cloud so Phase 3 can run
`pull → mergeStates → applySyncSubset → push`. **Phase 2 does NOT do the merge or any UI —
it is auth + raw Drive transport only.**

Setup DONE by the user (see [[sync-phase0-setup-reminder]]): Google Cloud project, Drive
API enabled, OAuth consent screen External/Testing + test user `petrehundima@gmail.com`,
Web OAuth client. **GitHub Pages**: publish from branch `refactor/sync`, root, URL
`https://tekerinka314.github.io/Dusk/` (repo being made public for free Pages).

---

## 0. Config (public-safe — Client ID is not a secret; no client_secret in token flow)

```js
const SYNC_CLIENT_ID = '493121023118-pln1rmhl37q3qi915jhbaqt57a7dkdtv.apps.googleusercontent.com';
const SYNC_SCOPE     = 'https://www.googleapis.com/auth/drive.appdata';
const SYNC_FILENAME  = 'dusk-sync.json';   // single file in the appDataFolder special space
```
Authorized JS origins registered: `https://tekerinka314.github.io`, `http://localhost`.
⚠️ If localhost OAuth is rejected at test time, add the EXACT dev origin incl. port (e.g.
`http://localhost:8080`) in the Cloud Console — Google may require the port. Prefer testing
on the real Pages URL.

---

## 1. What Phase 2 delivers — the `cloudSync` client

New file `dusk/10-cloud.js` (classic `<script>`, loaded AFTER `09-sync.js`). Plus, in
`index.html` `<head>`, the Google Identity Services library (loads only when online; sync
degrades gracefully offline):
```html
<script src="https://accounts.google.com/gsi/client" async></script>
```

The client is a thin, UI-less, network-only module. It NEVER merges and NEVER mutates
`state` — it returns/accepts the sync subset blob (the shape `getSyncSubset` produces).

---

## 2. OAuth — Google Identity Services (GIS) token flow (browser, no secret)

- Browser **token model** (`google.accounts.oauth2.initTokenClient`). No client_secret, no
  redirect page, no server. Returns a short-lived (~1 h) **access token**; there is NO
  refresh token in this flow — re-request when it expires (silent if the user already
  consented this session, otherwise a popup).
- Token lives **in memory only** (a module variable). NOT in localStorage (XSS hygiene;
  it's short-lived anyway). On app reload the user re-authorizes — usually silent.
- Flow:
  ```js
  let _tokenClient = null, _accessToken = null, _tokenExp = 0;
  function _initTokenClient() {
    _tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: SYNC_CLIENT_ID, scope: SYNC_SCOPE,
      callback: (resp) => { _accessToken = resp.access_token; _tokenExp = Date.now() + (resp.expires_in*1000) - 60000; /* resolve waiter */ },
    });
  }
  // interactive:true → may show account/consent popup; false → silent ('' prompt) refresh
  function cloudAuth({interactive}) { /* requestAccessToken({prompt: interactive ? 'consent' : ''}) */ }
  ```
- `gapi` is NOT required — call Drive REST directly with `fetch` + `Authorization: Bearer <token>`.
- On any Drive call returning **401** → token expired → `cloudAuth({interactive:false})` once
  and retry; if that still 401s → surface "sign in again" (Phase 3 UI).

## 3. Drive REST — the `appDataFolder` special space

`appDataFolder` is a hidden, per-app private folder (invisible in the user's Drive UI, free).
All requests carry `Authorization: Bearer <token>`.

- **Find** the file:
  `GET https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=name='dusk-sync.json'&fields=files(id,name,version,modifiedTime)`
  → 0 files = first sync (no remote yet); else take `files[0]`.
- **Download** content:
  `GET https://www.googleapis.com/drive/v3/files/{fileId}?alt=media` → JSON body.
  (Read `version` from a prior metadata GET, not from the media response.)
- **Create** (first push):
  `POST https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,version`
  multipart: part1 = metadata `{name:'dusk-sync.json', parents:['appDataFolder']}`, part2 = JSON body.
- **Update** (subsequent push):
  `PATCH https://www.googleapis.com/upload/drive/v3/files/{fileId}?uploadType=media&fields=id,version`
  body = JSON.

### Optimistic concurrency (don't clobber a parallel push)
Drive maintains a monotonically-increasing **`version`** per file. The protocol:
1. pull → record `versionAtPull`.
2. (Phase 3 merges.)
3. before PATCH, re-GET `files/{id}?fields=version`. If `version !== versionAtPull` → someone
   pushed in between → **ConflictError** → Phase 3 re-pulls, re-merges, retries.
4. else PATCH; the new `version` becomes the next baseline marker.

(Drive v3 has no reliable `If-Match` on uploads, so we compare `version` explicitly. This is a
tiny race window; the 3-way merge makes even a lost race non-destructive — worst case an extra
merge cycle. Good enough for a single-user, "sync on open" app.)

---

## 4. `cloudSync` module API (Phase 2 surface — pure transport)

```js
cloudIsConfigured()                  -> bool         // GIS lib present + online
cloudAuth({interactive})             -> Promise<{ok, token?}>   // get/refresh access token
cloudSignOut()                                      // revoke + drop in-memory token
cloudStatus()                        -> { signedIn, expiresAt }
cloudPull()                          -> Promise<{ empty:true } | { subset, version, fileId }>
cloudPush(subset, { fileId, expectedVersion }) -> Promise<{ fileId, version }>   // throws ConflictError on version drift
```
`cloudPull`/`cloudPush` move the file format of §5; they do not touch `state`.
A `ConflictError` class (subclass of Error) signals the version-drift retry to Phase 3.

## 5. Sync file format (`dusk-sync.json`)

```jsonc
{
  "schema": 1,
  "subset": { /* exactly the shape getSyncSubset(state) returns:
                 tasks[], groups[], notes[], templates[], noteTemplates[],
                 tombstones[], syncJournal[], _alloc{} */ },
  "_meta": { "updatedAt": <number>, "device": "<optional opaque hint>" }
}
```
`subset` is the shared merged truth. Each device: pull (=remote subset) → mergeStates(baseline,
local, remote) → apply + push merged → merged becomes the new local baseline. Note `_alloc`
travels but is device-local; the puller ignores the remote `_alloc` and keeps its own (the
engine already reindexes int ids on merge).

---

## 6. Service worker / paths (verified 2026-06-28)

- `sw.js` registers via `./sw.js`, scope `./`; `manifest.json` start_url `./index.html`, scope
  `./` — all relative → the `/Dusk/` subpath on Pages works without change.
- Fixed in this prep: added `./dusk/09-sync.js` to `CORE_ASSETS` (was missing → cold offline
  boot wouldn't precache it). `10-cloud.js` MUST be added to `CORE_ASSETS` too when created.
- The GIS library + `googleapis.com` requests hit the SW "passthrough, cache-fallback" branch
  (GET) or bypass it entirely (POST/PATCH) — they are NEVER cached (dynamic/cross-origin). Good.
  Offline → GIS lib fails to load → `cloudIsConfigured()` returns false → app stays fully local.

---

## 7. Testing Phase 2 (interactive OAuth ⇒ NOT fully headless)

- The merge engine was 100% node-testable; Phase 2 is NOT — `cloudAuth` needs a real Google
  account + a registered origin + (first time) a consent popup.
- Plan:
  - **Drive primitives** (`cloudPull`/`cloudPush` find/download/create/update + version logic):
    testable by pasting a manually-minted access token (from the OAuth Playground or a one-off
    `cloudAuth` call in the live page console) into a small node/browser probe.
  - **Full OAuth + round trip**: manual, on the real Pages URL (or a fixed-port localhost added
    to origins): sign in → push → reload other "device" (a second browser/profile) → pull →
    confirm the subset arrives. Two-profile manual test = the real "two devices" check.
- Keep the existing Phase-1 node tests + regressions green (engine untouched).

---

## 8. Integration points — Phase 3 (NOT in Phase 2)

Phase 3 wires the live loop and the gothic UI:
`snapshotPreMerge → cloudPull → mergeStates(loadBaseline(), getSyncSubset(state), remote) →
applySyncSubset → normalizeState → saveState → render → cloudPush(merged) → saveBaseline(merged)`,
plus the version-conflict retry, "sync on open", a "Sync now" control, the sign-in/out UI, a
sync-status indicator, and the unresolved-quarantine badge (`unresolvedCount`). Offline → queue
the push until next online open. All gothic-styled.

## 9. Out of scope for Phase 2

- The merge wiring + all sync UI (Phase 3).
- retry/backoff, device-change durability tests, tombstone/journal GC (Phase 4).
- Capacitor/Tauri native OAuth (custom scheme / loopback) (Phase 5).

---

## 10. Security / privacy guardrails

- Client ID is public by design — fine to commit. **No client_secret** anywhere.
- Access token in memory only; never persisted, never in a URL/query string.
- Only the `drive.appdata` scope (cannot see the user's other Drive files).
- The OAuth consent popup is user-driven; the app never auto-authorizes.
