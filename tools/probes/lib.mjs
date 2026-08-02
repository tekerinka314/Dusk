// B1 mobile audit harness library — serves dist/, launches system Chrome via
// playwright-core with device emulation, seeds LS state, opens the app.
import http from 'http'; import fs from 'fs'; import path from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright-core');

export const ROOT = 'D:/VSCode projects/DUSK_v2.0/dist';
export const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
export const SHOTS = 'D:/VSCode projects/DUSK_v2.0/audit-v2/shots';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.png': 'image/png' };

const UA_ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36';

// CSS-px viewports (the numbers the layout actually reacts to) + DPR for fidelity.
export const DEVICES = {
  pixel7:    { width: 412, height: 915, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true, userAgent: UA_ANDROID },
  big:       { width: 430, height: 932, deviceScaleFactor: 3,     isMobile: true, hasTouch: true, userAgent: UA_ANDROID },
  small:     { width: 360, height: 800, deviceScaleFactor: 3,     isMobile: true, hasTouch: true, userAgent: UA_ANDROID },
  vsmall:    { width: 360, height: 740, deviceScaleFactor: 3,     isMobile: true, hasTouch: true, userAgent: UA_ANDROID },
  landscape: { width: 915, height: 412, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true, userAgent: UA_ANDROID },
  tablet:    { width: 768, height: 1024, deviceScaleFactor: 2,    isMobile: true, hasTouch: true, userAgent: UA_ANDROID },
};

export function serve(dir = ROOT) {
  const srv = http.createServer((q, s) => {
    let u = decodeURIComponent(q.url.split('?')[0]);
    if (u === '/') u = '/index.html';
    fs.readFile(path.join(dir, u), (e, d) => {
      if (e) { s.writeHead(404); s.end('nf'); return; }
      s.writeHead(200, { 'Content-Type': MIME[path.extname(u)] || 'application/octet-stream' });
      s.end(d);
    });
  });
  return new Promise(r => srv.listen(0, () => r({ srv, port: srv.address().port })));
}

export async function launch() {
  return chromium.launch({ executablePath: CHROME, headless: true });
}

// Open the app on a device with a seeded state on the given page.
// Clears IDB so the (IDB-first) boot falls back to the seeded LS copy.
export async function openApp(browser, { device = 'pixel7', page = 'main', seed, port, extraInit }) {
  const dev = typeof device === 'string' ? DEVICES[device] : device;
  const ctx = await browser.newContext({
    viewport: { width: dev.width, height: dev.height },
    deviceScaleFactor: dev.deviceScaleFactor,
    isMobile: dev.isMobile, hasTouch: dev.hasTouch, userAgent: dev.userAgent,
    reducedMotion: 'no-preference', colorScheme: 'dark',
  });
  const p = await ctx.newPage();
  const errors = [];
  p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  p.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  await p.addInitScript(([st, pg]) => {
    try { localStorage.clear(); } catch (e) {}
    localStorage.setItem('duskState_v4', JSON.stringify(st));
    localStorage.setItem('currentPage', pg);
    localStorage.setItem('isFiltered', '0');
    // wipe IDB so IDB-first boot uses our seeded LS
    try { indexedDB.deleteDatabase('keyval-store'); } catch (e) {}
  }, [seed, page]);
  if (extraInit) await p.addInitScript(extraInit);
  await p.goto(`http://localhost:${port}/index.html`, { waitUntil: 'load' });
  await p.waitForTimeout(500);
  return { ctx, page: p, errors, dev };
}

export function ensureShots(sub = '') {
  const dir = sub ? path.join(SHOTS, sub) : SHOTS;
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}
