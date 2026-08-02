// SW network-first test (real Chrome via Playwright over http://localhost).
// Verifies: app boots online; updates land on the FIRST reload (no SWR lag);
// offline falls back to cache (boots + serves last-cached); cached SortableJS is
// a CORS response (not opaque → no storage padding).
import http from 'http';
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright-core');

const ROOT = 'D:/VSCode projects/DUSK_v2.0';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const HEADLESS = !process.argv.includes('--show');
const MIME = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.json':'application/json', '.svg':'image/svg+xml', '.jpg':'image/jpeg' };

let PROBE_BUILD = 'A';   // mutable body for /probe.js — flipped mid-test to prove freshness
const srv = http.createServer((q,s)=>{
  let u = decodeURIComponent(q.url.split('?')[0]);
  if (u === '/probe.js') {                      // no-store so the SW strategy, not the HTTP cache, decides
    s.writeHead(200, { 'Content-Type':'text/javascript', 'Cache-Control':'no-store' });
    s.end(`/*build*/ "${PROBE_BUILD}";`);
    return;
  }
  if (u === '/') u = '/index.html';
  fs.readFile(path.join(ROOT,u),(e,d)=>{ if(e){s.writeHead(404);s.end('nf');return;}
    s.writeHead(200,{'Content-Type':MIME[path.extname(u)]||'application/octet-stream'}); s.end(d); });
});

let pass=0, fail=0;
const rec=(name,cond,detail)=>{ if(cond)pass++; else { fail++; console.log(`  FAIL: ${name}  ${detail??''}`); } };
const fetchProbe = page => page.evaluate(async()=>{ const r = await fetch('/probe.js', {cache:'no-store'}); return (await r.text()).trim(); });

(async()=>{
  await new Promise(r=>srv.listen(0,r));
  const port = srv.address().port;
  const base = `http://localhost:${port}`;
  const browser = await chromium.launch({ executablePath: CHROME, headless: HEADLESS });
  const context = await browser.newContext({ viewport:{width:1100,height:850} });
  const page = await context.newPage();
  const errs=[]; page.on('pageerror',e=>errs.push(e.message));

  // ── 1. first load + SW takes control ────────────────────────────────────────
  await page.goto(`${base}/index.html`);
  await page.evaluate(()=>navigator.serviceWorker.ready);
  await page.waitForFunction(()=>navigator.serviceWorker.controller!==null, null, {timeout:8000}).catch(()=>{});
  const controlled = await page.evaluate(()=>navigator.serviceWorker.controller!==null);
  rec('SW installed + controls the page', controlled);
  rec('online boot: app rendered, no pageerror', errs.length===0 && await page.evaluate(()=>document.body.children.length>0), errs.join('|'));

  // ── 2. freshness: change server bytes → next fetch is fresh on the FIRST hit ─
  const a1 = await fetchProbe(page);                 // caches "A"
  rec('probe initial = A (cached)', a1==='/*build*/ "A";', a1);
  PROBE_BUILD = 'B';                                 // deploy a "new version"
  const b1 = await fetchProbe(page);                 // network-first → must be B immediately
  rec('network-first: update on FIRST fetch (B, no SWR lag)', b1==='/*build*/ "B";', b1);

  // ── 3. offline: cache fallback serves last-cached + app still boots ──────────
  await context.setOffline(true);
  const off = await fetchProbe(page);                // network fails → cache → last cached (B)
  rec('offline: serves last-cached probe (B)', off==='/*build*/ "B";', off);
  const errs2=[]; page.on('pageerror',e=>errs2.push(e.message));
  await page.reload();                               // full offline reload of the shell
  await page.waitForTimeout(600);
  rec('offline reload: app boots from cache (body rendered)', await page.evaluate(()=>document.body.children.length>0));
  rec('offline reload: no pageerror', errs2.length===0, errs2.join('|'));
  rec('offline: SortableJS available from cache', await page.evaluate(()=>typeof window.Sortable!=='undefined'));
  await context.setOffline(false);

  // ── 4. cached SortableJS is a CORS response (not opaque → no storage padding) ─
  const sortType = await page.evaluate(async()=>{
    for (const n of await caches.keys()) {
      const c = await caches.open(n);
      for (const req of await c.keys()) {
        if (req.url.includes('jsdelivr.net') && req.url.includes('Sortable')) {
          const resp = await c.match(req);
          return resp ? resp.type : 'no-match';
        }
      }
    }
    return 'not-cached';
  });
  rec('cached SortableJS type = cors (no opaque padding)', sortType==='cors', `type=${sortType}`);

  // ── 5. exactly one cache bucket, named dusk-shell-v7 ────────────────────────
  const keys = await page.evaluate(()=>caches.keys());
  rec('single cache bucket dusk-shell-v7', keys.length===1 && keys[0]==='dusk-shell-v7', keys.join(','));

  if (!HEADLESS) await page.waitForTimeout(3000);
  await browser.close(); srv.close();
  console.log(`\nSW network-first test: ${pass} passed, ${fail} failed  (total ${pass+fail})`);
  process.exit(fail?1:0);
})().catch(e=>{ console.error('CRASH', e); process.exit(2); });
