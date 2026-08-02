// Token persistence (the reload re-login fix). Stubs GIS so cloudAuth() runs the
// REAL 10-cloud token path (callback → _persistToken). Verifies: after auth the
// token is cached in localStorage; after a RELOAD the session is restored with NO
// requestAccessToken call (no popup, no re-login); sign-out clears it; an expired
// cached token is dropped on load.
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

// Injected BEFORE every page load (incl. reload): a fake GIS that mints a token
// synchronously via the registered callback, and counts requestAccessToken calls
// in localStorage so the count survives reload.
const GIS_STUB = `
  window.__reqCount = 0;
  window.google = { accounts: { oauth2: {
    initTokenClient: function(cfg){ return { requestAccessToken: function(o){
      try { localStorage.setItem('__req', String((+localStorage.getItem('__req')||0)+1)); } catch(e){}
      window.__reqCount++;
      cfg.callback({ access_token: 'TOK', expires_in: 3600 });
    } }; },
    revoke: function(t,cb){ if(cb) cb(); }
  } } };
`;

(async()=>{
  await new Promise(r=>srv.listen(0,r));
  const base=`http://localhost:${srv.address().port}`;
  const browser=await chromium.launch({executablePath:CHROME,headless:!process.argv.includes('--show')});
  const ctx=await browser.newContext({viewport:{width:1000,height:800}});
  // block the real GIS lib so our stubbed window.google survives (else it overwrites it)
  await ctx.route('**/gsi/client*', r => r.abort());
  await ctx.route('**accounts.google.com**', r => r.abort());
  await ctx.addInitScript(GIS_STUB);
  const page=await ctx.newPage();
  const errs=[]; page.on('pageerror',e=>errs.push(e.message));
  await page.goto(`${base}/index.html`); await page.waitForTimeout(500);

  // 1. interactive auth → token cached + signed in
  const r1=await page.evaluate(async()=>{
    const res=await cloudAuth({interactive:true});
    return { ok:res&&res.ok, signedIn:cloudStatus().signedIn,
             stored: (()=>{try{return localStorage.getItem('dusk_sync_token_v1');}catch(e){return null;}})(),
             reqCount: window.__reqCount };
  });
  rec('1: cloudAuth ok', r1.ok, r1);
  rec('1: signedIn after auth', r1.signedIn===true, r1);
  rec('1: token cached in localStorage', !!r1.stored && /TOK/.test(r1.stored), r1.stored);
  rec('1: one requestAccessToken call', r1.reqCount===1, r1);

  // 2. RELOAD → session restored from cache, NO new requestAccessToken (no popup)
  await page.reload(); await page.waitForTimeout(500);
  const r2=await page.evaluate(()=>({ signedIn:cloudStatus().signedIn, reqCount:window.__reqCount,
    reqTotal:(()=>{try{return +localStorage.getItem('__req')||0;}catch(e){return -1;}})() }));
  rec('2: signedIn restored after reload', r2.signedIn===true, r2);
  rec('2: NO requestAccessToken on this load (no popup)', r2.reqCount===0, r2);
  rec('2: total auth prompts still 1 across reload', r2.reqTotal===1, r2);

  // 3. sign out → cache cleared, signed out
  const r3=await page.evaluate(()=>{ cloudSignOut(); return { signedIn:cloudStatus().signedIn,
    stored:(()=>{try{return localStorage.getItem('dusk_sync_token_v1');}catch(e){return 'ERR';}})() }; });
  rec('3: signed out', r3.signedIn===false, r3);
  rec('3: cache cleared on sign-out', r3.stored===null, r3);

  // 4. expired cached token → dropped on next load, signed out
  await page.evaluate(()=>{ try{ localStorage.setItem('dusk_sync_token_v1', JSON.stringify({t:'OLD',e:Date.now()-1000})); }catch(e){} });
  await page.reload(); await page.waitForTimeout(400);
  const r4=await page.evaluate(()=>({ signedIn:cloudStatus().signedIn,
    stored:(()=>{try{return localStorage.getItem('dusk_sync_token_v1');}catch(e){return 'ERR';}})() }));
  rec('4: expired token → signed out', r4.signedIn===false, r4);
  rec('4: expired token dropped from cache', r4.stored===null, r4);

  rec('end: no pageerror', errs.length===0, errs.join(' | '));
  await browser.close(); srv.close();
  console.log(`\ntoken-persist test: ${pass} passed, ${fail} failed  (total ${pass+fail})`);
  process.exit(fail?1:0);
})().catch(e=>{console.error('CRASH',e);process.exit(2);});
