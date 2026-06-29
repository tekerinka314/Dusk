# Dusk sync Worker — deploy guide

Tiny Cloudflare Worker that gives DUSK two things a pure browser can't:

1. **Long-lived login** — exchanges the Google OAuth *code* for a **refresh token**
   (browser "Web" clients need the `client_secret`, which must stay server-side).
   Result: silent re-auth for months, no more flashing sign-in popup.
2. **Cross-device wake** — a Durable Object relays a one-byte "changed" nudge over
   WebSocket so your other open devices sync near-instantly.

All on Cloudflare's **free** plan. The Durable Object is SQLite-backed and uses the
WebSocket Hibernation API, so idle connections cost nothing.

---

## One-time setup

### 1. Install wrangler + log in
```bash
npm install -g wrangler
wrangler login          # opens a browser, authorizes the Cloudflare CLI
```
(No Cloudflare account yet? Sign up free at dash.cloudflare.com first — no card.)

### 2. Deploy the Worker
```bash
cd worker
wrangler deploy
```
Copy the URL it prints, e.g. `https://dusk-sync.<your-subdomain>.workers.dev`.

### 3. Give it the Google client secret
Google Cloud Console → APIs & Services → Credentials → your **Web** OAuth client →
copy the **Client secret**. Then:
```bash
wrangler secret put GOOGLE_CLIENT_SECRET
# paste the secret when prompted
```
The secret lives only in the Worker — never in this repo, never in the browser.

### 4. Google Console — two changes
- **Authorized redirect URIs** → add exactly:
  `https://tekerinka314.github.io/Dusk/`
  (must match the page the app is served from, trailing slash included)
- **OAuth consent screen** → **Publishing status** → **Publish app** (move from
  *Testing* to *In production*). You can stay **unverified** — for the `drive.appdata`
  scope and personal use you'll just see a one-time "Google hasn't verified this app"
  screen (click *Advanced → Go to DUSK*). This step is what makes the refresh token
  **long-lived**; in *Testing* mode Google expires it after **7 days**.

### 5. Tell the app the Worker URL
Send me the URL from step 2. I set `SYNC_WORKER_URL` in `dusk/10-cloud.js` and push —
GitHub Pages picks it up and the long-lived login + wake go live. Until that constant
is set, the app keeps using the old 1-hour GIS token flow (nothing breaks).

---

## How it works (for reference)

```
sign in (once):  app → Google consent → redirect ?code → app POSTs code → Worker
                 Worker + client_secret → Google → {access_token, refresh_token}
                 client stores refresh_token (localStorage)

later (silent):  access token expired → client POSTs refresh_token → Worker → Google
                 → fresh access_token. No popup. Repeats for months.

wake:            device A pushes → A sends "changed" to /ws?room=<hash(fileId)>
                 Durable Object → broadcasts to B, C… → they syncNow()
```

Endpoints: `POST /exchange`, `POST /refresh`, `GET /ws?room=…`, `GET /health`.
