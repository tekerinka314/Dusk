// Live test of WORKER-mode auth in dusk/10-cloud.js (real browser). Points
// window.__DUSK_WORKER_URL at a fake Worker (node http) that returns canned token
// responses, then drives the real cloudAuth/cloudStatus/cloudSignOut + the ?code
// redirect-exchange path. Asserts the long-lived refresh flow works end to end.
import http from 'http'; import fs from 'fs'; import path from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright-core');
const ROOT='D:/VSCode projects/DUSK_v2.0';
const CHROME='C:/Program Files/Google/Chrome/Application/chrome.exe';
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.jpg':'image/jpeg'};

const app=http.createServer((q,s)=>{let u=decodeURIComponent(q.url.split('?')[0]);if(u==='/')u='/index.html';
  fs.readFile(path.join(ROOT,u),(e,d)=>{if(e){s.writeHead(404);s.end('nf');return;}s.writeHead(200,{'Content-Type':MIME[path.extname(u)]||'application/octet-stream'});s.end(d);});});

// fake Worker
let calls={exchange:0,refresh:0,lastExchange:null,lastRefresh:null};
const worker=http.createServer((q,s)=>{
  const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'POST,GET,OPTIONS','Access-Control-Allow-Headers':'Content-Type'};
  if(q.method==='OPTIONS'){s.writeHead(204,cors);s.end();return;}
  let body='';q.on('data',c=>body+=c);q.on('end',()=>{
    const u=q.url.split('?')[0];
    let j={};try{j=JSON.parse(body||'{}');}catch(_){}
    if(u==='/exchange'){calls.exchange++;calls.lastExchange=j;s.writeHead(200,{...cors,'Content-Type':'application/json'});s.end(JSON.stringify({access_token:'AT',refresh_token:'RT',expires_in:3600}));return;}
    if(u==='/refresh'){calls.refresh++;calls.lastRefresh=j;s.writeHead(200,{...cors,'Content-Type':'application/json'});s.end(JSON.stringify({access_token:'AT2',expires_in:3600}));return;}
    s.writeHead(404,cors);s.end('nf');
  });
});

let pass=0,fail=0; const rec=(n,c,d)=>{if(c)pass++;else{fail++;console.log('  FAIL:',n,d!=null?'· '+JSON.stringify(d):'');}};

(async()=>{
  await new Promise(r=>app.listen(0,r));
  await new Promise(r=>worker.listen(0,r));
  const APP=`http://localhost:${app.address().port}`;
  const WORKER=`http://localhost:${worker.address().port}`;
  const browser=await chromium.launch({executablePath:CHROME,headless:!process.argv.includes('--show')});

  // ── 1. worker mode configured, not signed in yet ──
  let ctx=await browser.newContext({viewport:{width:1000,height:800}});
  let page=await ctx.newPage();
  await page.addInitScript((w)=>{ window.__DUSK_WORKER_URL=w; }, WORKER);
  await page.goto(`${APP}/index.html`); await page.waitForTimeout(400);
  let r=await page.evaluate(()=>({cfg:cloudIsConfigured(),signed:cloudStatus().signedIn}));
  rec('1: worker mode → cloudIsConfigured true (no GIS needed)', r.cfg===true, r);
  rec('1: not signed in before any token', r.signed===false, r);

  // ── 2. a stored refresh token survives reload → signed in + silent /refresh ──
  await page.evaluate(()=>{ localStorage.setItem('dusk_sync_refresh_v1','RT'); });
  await page.reload(); await page.waitForTimeout(300);
  r=await page.evaluate(()=>({signed:cloudStatus().signedIn}));
  rec('2: refresh token restored on reload → signed in', r.signed===true, r);
  r=await page.evaluate(async()=>{ const a=await cloudAuth({interactive:false}); return {ok:a&&a.ok,exp:cloudStatus().expiresAt>Date.now()}; });
  rec('2: silent cloudAuth mints an access token via /refresh', r.ok===true && r.exp===true, r);
  rec('2: /refresh was called with the stored token', calls.refresh>=1 && calls.lastRefresh && calls.lastRefresh.refresh_token==='RT', calls.lastRefresh);
  await ctx.close();

  // ── 3. interactive sign-in return: ?code + matching state → /exchange ──
  calls.exchange=0;
  ctx=await browser.newContext({viewport:{width:1000,height:800}});
  page=await ctx.newPage();
  await page.addInitScript((w)=>{ window.__DUSK_WORKER_URL=w;
    try{ sessionStorage.setItem('dusk_oauth_s','STATE123'); sessionStorage.setItem('dusk_oauth_v','VERIFIER'); }catch(_){}
  }, WORKER);
  await page.goto(`${APP}/index.html?code=CODE999&state=STATE123`); await page.waitForTimeout(500);
  r=await page.evaluate(()=>({signed:cloudStatus().signedIn, rt:localStorage.getItem('dusk_sync_refresh_v1'), search:location.search}));
  rec('3: ?code exchanged → signed in', r.signed===true, r);
  rec('3: refresh token persisted from exchange', r.rt==='RT', r);
  rec('3: ?code stripped from the URL bar', r.search==='', {search:r.search});
  rec('3: /exchange called with code + PKCE verifier', calls.exchange===1 && calls.lastExchange.code==='CODE999' && calls.lastExchange.code_verifier==='VERIFIER', calls.lastExchange);

  // ── 4. state mismatch → NO exchange (CSRF guard) ──
  await ctx.close(); calls.exchange=0;
  ctx=await browser.newContext({viewport:{width:1000,height:800}});
  page=await ctx.newPage();
  await page.addInitScript((w)=>{ window.__DUSK_WORKER_URL=w;
    try{ sessionStorage.setItem('dusk_oauth_s','RIGHT'); sessionStorage.setItem('dusk_oauth_v','V'); }catch(_){}
  }, WORKER);
  await page.goto(`${APP}/index.html?code=X&state=WRONG`); await page.waitForTimeout(400);
  r=await page.evaluate(()=>({signed:cloudStatus().signedIn}));
  rec('4: state mismatch → exchange refused', calls.exchange===0 && r.signed===false, {ex:calls.exchange,r});

  // ── 5. sign out clears everything ──
  await page.evaluate(()=>{ localStorage.setItem('dusk_sync_refresh_v1','RT'); });
  await page.reload(); await page.waitForTimeout(200);
  r=await page.evaluate(()=>{ cloudSignOut(); return {signed:cloudStatus().signedIn, rt:localStorage.getItem('dusk_sync_refresh_v1'), at:localStorage.getItem('dusk_sync_token_v1')}; });
  rec('5: signOut → signed out + refresh token cleared', r.signed===false && !r.rt && !r.at, r);
  await ctx.close();

  await browser.close(); app.close(); worker.close();
  console.log(`\nworker-mode auth live: ${pass} passed, ${fail} failed  (total ${pass+fail})`);
  process.exit(fail?1:0);
})().catch(e=>{console.error('CRASH',e);process.exit(2);});
