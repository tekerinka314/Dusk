---
name: dusk-headless-screenshot
description: How to screenshot the DUSK PWA in headless Chrome to verify visual changes (full recipe in repo AUDIT-FINDINGS.md)
metadata: 
  node_type: memory
  type: reference
  originSessionId: 22a751be-f6c8-478d-80fd-264f35d788e9
---

DUSK visual changes CAN be checked in a real browser via headless Chrome — worth doing instead of guessing (the user explicitly values this). Full step-by-step recipe lives in repo **`AUDIT-FINDINGS.md`** → section "🖼️ Headless-скриншоты DUSK".

Key gotchas (the parts that wasted time):
- **Need a local Node http-server** — `file://` returns an empty DOM in this headless Chrome. Root path with a space ("VSCode projects") must be **quoted** in `Start-Process -ArgumentList`, else it splits and the server 404s ("nf").
- **Strip external resources** from a `__preview.html` copy (Google Fonts, SortableJS CDN → stub `window.Sortable`, `serviceWorker.register`) or the offline `load` hangs and no screenshot is taken.
- **Seed state** with `localStorage.setItem("duskState_v3", JSON.stringify({...}))` before `app.js`; drive UI from a `window load` handler (`toggleMainSelectMode`, `_setFormColor`, force modal/`extra-fields` visible).
- Chrome: `--headless=new --user-data-dir=<fresh random> --disable-gpu --window-size=1000,1500 --screenshot=<out> http://localhost:8731/__preview.html`. **Kill stray headless chrome first** (locked profile = silent no-op). **Do NOT** use `--virtual-time-budget` (app's 2s `setInterval` blocks quiescence → hang).
- Still flaky → retry loop, success = PNG > 50 KB. Crop/upscale with PowerShell `System.Drawing`. PS helper must be **ASCII-only** (Cyrillic in here-strings corrupts the .ps1 encoding).
- Clean up `__preview.html`/`__shot_*.png` and kill the node server after (don't let them land in a commit).

Related: [[audit-2026-06-fix-progress]].
