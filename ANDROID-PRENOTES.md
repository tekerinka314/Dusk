# ANDROID-PRENOTES — architect analysis before the port (Fable 5, 2026-07-12)

Precondition: W1 mobile rework done and user-verified. An APK of the CURRENT
mobile UI would package the broken experience — do not front-load the port.

## The hidden trap: Google OAuth + origin lock

The sync stack is origin-locked: Google OAuth redirect URI and the worker's
`ALLOWED_ORIGIN` (worker/wrangler.toml) list ONLY `https://dusk-du4.pages.dev`.
A Capacitor app runs on `https://localhost` (capacitor scheme) inside a WebView,
and **Google blocks OAuth in embedded WebViews entirely** (disallowed_useragent).
So a naive Capacitor wrap ships with sync DEAD. Any plan that ignores this
wastes the whole port.

## Recommended path: TWA first (Bubblewrap), Capacitor only if native APIs needed

**Option A — TWA (Trusted Web Activity) via Bubblewrap. RECOMMENDED first APK.**
- What: the APK is a thin Android shell that opens the PROD site in real Chrome
  (fullscreen, no browser UI). It IS the PWA — same origin, same storage, same SW.
- Why it wins here: **sync/OAuth works unchanged** (real Chrome, prod origin —
  the entire WebView/redirect problem vanishes); zero app-code changes; the
  manifest + SW already exist and B1-19 made install-launch work; updates ship
  by pushing to Pages (no APK re-release).
- Cost: `npx @bubblewrap/cli init --manifest https://dusk-du4.pages.dev/manifest.json`
  + `build` (needs JDK + Android SDK; Bubblewrap installs them). Sideload = enough
  (per roadmap). `assetlinks.json` must be served at
  `https://dusk-du4.pages.dev/.well-known/assetlinks.json` (put it in `public/`)
  or the app shows Chrome's URL bar — that's the only real integration step.
- Limitation: no native plugins (notifications beyond web push, filesystem, etc.).
  DUSK needs none of those today — sync is the product, and it's web.

**Option B — Capacitor (the roadmap's original choice). Do LATER, only when a
native capability is actually wanted.**
- webDir=dist works, but sync needs real engineering: create a second OAuth
  client of type "Android/installed app" (PKCE, no client_secret), run the auth
  round-trip through `@capacitor/browser` (Chrome Custom Tab) with a custom-
  scheme/App-Links redirect back into the app, and extend the worker: accept the
  app's redirect URI + add its origin to `ALLOWED_ORIGIN` + a code-exchange path
  for the installed-app client. Also: IDB/LS live in the app's private WebView
  storage — first-run data arrives via sync or export/import, not shared with
  Chrome's PWA storage.
- None of this is exotic, but it's a multi-session block with real failure
  modes; do not attempt it as a side quest.

**Rejected for now:** shipping Capacitor v1 "without sync" (an offline-only APK
is strictly worse than the installed PWA/TWA which has sync for free).

## Decision needed from the user (one question, ask before starting the port)
«APK делаем как TWA-обёртку над prod-сайтом (синк работает сразу, обновления
через деплой) — или сразу Capacitor с нативной OAuth-интеграцией (дольше,
рискованнее, но открывает нативные API на будущее)?» Recommendation: TWA now,
Capacitor only when a concrete native need appears.

## Windows/Tauri
REJECTED this month (negative ROI): the installed PWA already gives Windows a
windowed desktop app with sync; Tauri adds packaging risk for zero user-visible
gain. Revisit only on explicit request.
