// Sync Phase 2 — LIVE smoke in real Chrome (Playwright). Verifies dusk/10-cloud.js
// loads in the browser, exposes the transport globals, no pageerror, and the GIS
// <script> tag is present in <head>. No real OAuth (interactive) is attempted.
import http from 'http';
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright-core');

const ROOT = 'D:/VSCode projects/DUSK_v2.0';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const HEADLESS = !process.argv.includes('--show');
const MIME = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.json':'application/json', '.svg':'image/svg+xml' };
const srv = http.createServer((q,s)=>{ let u=decodeURIComponent(q.url.split('?')[0]); if(u==='/')u='/index.html';
  fs.readFile(path.join(ROOT,u),(e,d)=>{ if(e){s.writeHead(404);s.end('nf');return;} s.writeHead(200,{'Content-Type':MIME[path.extname(u)]||'application/octet-stream'}); s.end(d); }); });

let pass=0, fail=0;
const rec=(name,cond,detail)=>{ if(cond)pass++; else { fail++; console.log(`  FAIL: ${name}  ${detail??''}`); } };

(async()=>{
  await new Promise(r=>srv.listen(0,r));
  const port = srv.address().port;
  const browser = await chromium.launch({ executablePath: CHROME, headless: HEADLESS });
  const page = await (await browser.newContext({ viewport:{width:1180,height:900} })).newPage();
  const errs=[]; page.on('pageerror',e=>errs.push(e.message));
  await page.goto(`http://localhost:${port}/index.html`);
  await page.waitForTimeout(500);

  rec('app boots, no pageerror with 10-cloud.js', errs.length===0, errs.join('|'));

  // NOTE: function declarations (cloudPull/...) attach to window; const/class
  // (config, ConflictError) are global LEXICAL bindings — reachable by bare name
  // across the classic <script>s (same as 09-sync.js consts), not as window.*.
  const api = await page.evaluate(()=>({
    pull: typeof window.cloudPull, push: typeof window.cloudPush,
    auth: typeof window.cloudAuth, out: typeof window.cloudSignOut,
    cfg: typeof window.cloudIsConfigured, status: typeof window.cloudStatus,
    conflict: typeof ConflictError,
    clientId: SYNC_CLIENT_ID, scope: SYNC_SCOPE, file: SYNC_FILENAME,
  }));
  rec('cloudPull/cloudPush globals exist', api.pull==='function' && api.push==='function');
  rec('cloudAuth/cloudSignOut globals exist', api.auth==='function' && api.out==='function');
  rec('cloudIsConfigured/cloudStatus exist', api.cfg==='function' && api.status==='function');
  rec('ConflictError class exists', api.conflict==='function');
  rec('config: scope = drive.appdata', api.scope==='https://www.googleapis.com/auth/drive.appdata');
  rec('config: filename = dusk-sync.json', api.file==='dusk-sync.json');
  rec('config: client id present', typeof api.clientId==='string' && api.clientId.endsWith('.apps.googleusercontent.com'));

  const st = await page.evaluate(()=>{ const s=cloudStatus(); return { signedIn:s.signedIn, exp:s.expiresAt }; });
  rec('cloudStatus: not signed in (no token)', st.signedIn===false && st.exp===0);

  // ConflictError carries expected/actual
  const ce = await page.evaluate(()=>{ const e=new ConflictError(3,5); return { name:e.name, exp:e.expected, act:e.actual, isErr:e instanceof Error }; });
  rec('ConflictError shape (name/expected/actual, is Error)', ce.name==='ConflictError' && ce.exp===3 && ce.act===5 && ce.isErr);

  // GIS library tag present in <head>
  const gis = await page.evaluate(()=>!!document.querySelector('head script[src*="accounts.google.com/gsi/client"]'));
  rec('GIS <script> present in <head>', gis);

  // cloudAuth without GIS-ready (or before user gesture) must REJECT, never hang/popup.
  const authRej = await page.evaluate(async()=>{
    try { await cloudAuth({interactive:false}); return 'resolved'; }
    catch(e){ return 'rejected:'+e.message; }
  });
  rec('cloudAuth(silent) rejects cleanly (no token, no hang)', authRej.startsWith('rejected'), authRej);

  rec('no pageerror through whole run', errs.length===0, errs.join('|'));

  if (!HEADLESS) await page.waitForTimeout(4000);
  await browser.close(); srv.close();
  console.log(`\nCLOUD live smoke: ${pass} passed, ${fail} failed  (total ${pass+fail})`);
  process.exit(fail?1:0);
})();
