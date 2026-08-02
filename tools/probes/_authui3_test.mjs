// 3-bug auth/status fixes (dusk/11-sync-ui.js), worker-mode aware. Stubs cloud*
// in-page (no OAuth/network). Verifies:
//   BUG 3 — syncSignIn persists _syncEnabled BEFORE the (navigating) interactive
//           auth, so the return load auto-syncs instead of sitting at "выключено".
//   BUG 2 — an OPEN sync panel re-renders its status line live on refreshStatus()
//           (no reopen needed).
//   BUG 1 — _scheduleTokenRefresh survives a TRANSIENT silent-refresh failure
//           (keeps the session, retries) and only shows 'signed-out' when the
//           refresh token is genuinely gone (cloudStatus flips signedIn:false).
// Replaces the old legacy-GIS _tokenrefresh_test.mjs (worker mode is the default
// now → interactive auth is a real redirect → that test navigated away & crashed).
import http from 'http'; import fs from 'fs'; import path from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright-core');
const ROOT='D:/VSCode projects/DUSK_v2.0';
const CHROME='C:/Program Files/Google/Chrome/Application/chrome.exe';
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.jpg':'image/jpeg'};
const srv=http.createServer((q,s)=>{let u=decodeURIComponent(q.url.split('?')[0]);if(u==='/')u='/index.html';
  fs.readFile(path.join(ROOT,u),(e,d)=>{if(e){s.writeHead(404);s.end('nf');return;}s.writeHead(200,{'Content-Type':MIME[path.extname(u)]||'application/octet-stream'});s.end(d);});});
let pass=0,fail=0; const rec=(n,c,d)=>{if(c)pass++;else{fail++;console.log('  FAIL:',n,d!=null?'· '+JSON.stringify(d):'');}};

(async()=>{
  await new Promise(r=>srv.listen(0,r));
  const base=`http://localhost:${srv.address().port}`;
  const browser=await chromium.launch({executablePath:CHROME,headless:!process.argv.includes('--show')});
  const ctx=await browser.newContext({viewport:{width:1000,height:800}});
  // no real network: block OAuth, the live worker, and Drive
  await ctx.route('**accounts.google.com**', r=>r.abort());
  await ctx.route('**googleapis.com**', r=>r.abort());
  await ctx.route('**workers.dev**', r=>r.abort());
  await ctx.route('**/gsi/client*', r=>r.abort());
  const page=await ctx.newPage();
  const errs=[]; page.on('pageerror',e=>errs.push(e.message));
  await page.goto(`${base}/index.html`); await page.waitForTimeout(500);

  // ── BUG 3: syncSignIn sets + persists the opt-in BEFORE the hanging redirect ──
  const b3=await page.evaluate(async()=>{
    localStorage.removeItem('dusk_sync_enabled_v1');
    window.__signedIn=true; window.__exp=Date.now()+3000;
    cloudIsConfigured=()=>true;
    cloudStatus=()=>({signedIn:window.__signedIn,expiresAt:window.__exp});
    cloudAuth=()=>new Promise(()=>{});      // interactive auth in worker mode = redirect that never returns here
    cloudSignOut=()=>{window.__signedIn=false;};
    cloudPull=async()=>({empty:true});
    cloudPush=async(s)=>({fileId:'f1',version:1});
    syncSignIn();                            // fire-and-forget: hangs on cloudAuth (like the page leaving)
    return localStorage.getItem('dusk_sync_enabled_v1');   // must already be '1' (set synchronously, pre-await)
  });
  rec('BUG3: opt-in persisted before the interactive redirect', b3==='1', {flag:b3});

  // ── BUG 2: an open sync panel updates its status line live (no reopen) ──
  const b2=await page.evaluate(async()=>{
    if (typeof closeFloatMenu==='function') closeFloatMenu();
    await new Promise(r=>setTimeout(r,260));
    openSyncPanel();                                         // _glyph() anchor
    await new Promise(r=>setTimeout(r,30));
    const read=()=>{ const el=document.querySelector('.sync-panel .sync-panel-status');
      return el?{kind:el.getAttribute('data-sync'),txt:(el.querySelector('span:last-child')||{}).textContent}:null; };
    const t1=read();                                        // signed-in → not 'signed-out'
    window.__signedIn=false;                                // session drops while the panel is OPEN
    refreshStatus();                                        // the live-refresh hook should repaint the open panel
    const t2=read();
    if (typeof closeFloatMenu==='function') closeFloatMenu();
    return {t1,t2};
  });
  rec('BUG2: panel rendered (open)', b2.t1 && b2.t1.kind!=='signed-out', b2.t1);
  rec('BUG2: open panel re-renders live on status change', b2.t2 && b2.t2.kind==='signed-out', b2.t2);
  rec('BUG2: status TEXT updated in place', b2.t1 && b2.t2 && b2.t1.txt!==b2.t2.txt, {a:b2.t1&&b2.t1.txt,b:b2.t2&&b2.t2.txt});

  // ── BUG 1a: a TRANSIENT silent-refresh failure keeps the session (no signed-out) ──
  await page.waitForTimeout(120);
  const a1=await page.evaluate(async()=>{
    window.__signedIn=true; window.__exp=Date.now()+3000; window.__authCalls=0;
    window.__failMode=true; window.__dropOnFail=false;      // throws but the refresh token survives
    cloudAuth=async()=>{ window.__authCalls++; if(window.__failMode){ if(window.__dropOnFail) window.__signedIn=false; throw new Error('transient'); } window.__exp=Date.now()+3000; return {ok:true}; };
    setSyncStatus('ok');                                    // known non-signed-out baseline
    _scheduleTokenRefresh();                                // arms at ~3000ms
    await new Promise(r=>setTimeout(r,3800));               // let it fire + hit the catch
    const g=document.getElementById('sync-glyph-btn');
    return { calls:window.__authCalls, eye:g&&g.getAttribute('data-sync') };
  });
  rec('BUG1a: silent renewal actually fired', a1.calls>=1, a1);
  rec('BUG1a: transient failure does NOT sign the user out', a1.eye!=='signed-out', a1);

  // ── BUG 1b: a GENUINE failure (refresh token revoked) DOES show signed-out ──
  const a2=await page.evaluate(async()=>{
    window.__signedIn=true; window.__exp=Date.now()+3000; window.__authCalls=0;
    window.__failMode=true; window.__dropOnFail=true;       // mimic _refreshViaWorker dropping the token on 401
    setSyncStatus('ok');
    _scheduleTokenRefresh();
    await new Promise(r=>setTimeout(r,3800));
    const g=document.getElementById('sync-glyph-btn');
    return { calls:window.__authCalls, eye:g&&g.getAttribute('data-sync'), signedIn:window.__signedIn };
  });
  rec('BUG1b: renewal fired', a2.calls>=1, a2);
  rec('BUG1b: revoked token → signed-out', a2.eye==='signed-out' && a2.signedIn===false, a2);

  rec('end: no pageerror', errs.length===0, errs.join(' | '));
  await browser.close(); srv.close();
  console.log(`\nauth/status 3-bug test: ${pass} passed, ${fail} failed  (total ${pass+fail})`);
  process.exit(fail?1:0);
})().catch(e=>{console.error('CRASH',e);process.exit(2);});
