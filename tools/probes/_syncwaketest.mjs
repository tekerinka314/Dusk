// Live test of dusk/12-sync-wake.js with a FAKE WebSocket. Verifies: note→connect
// to the right room URL, peer message→syncNow('будилка'), nudge→send('changed'),
// stop→close. No real Worker/WS.
import http from 'http'; import fs from 'fs'; import path from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright-core');
const ROOT='D:/VSCode projects/DUSK_v2.0';
const CHROME='C:/Program Files/Google/Chrome/Application/chrome.exe';
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.jpg':'image/jpeg'};
const app=http.createServer((q,s)=>{let u=decodeURIComponent(q.url.split('?')[0]);if(u==='/')u='/index.html';
  fs.readFile(path.join(ROOT,u),(e,d)=>{if(e){s.writeHead(404);s.end('nf');return;}s.writeHead(200,{'Content-Type':MIME[path.extname(u)]||'application/octet-stream'});s.end(d);});});
let pass=0,fail=0; const rec=(n,c,d)=>{if(c)pass++;else{fail++;console.log('  FAIL:',n,d!=null?'· '+JSON.stringify(d):'');}};

(async()=>{
  await new Promise(r=>app.listen(0,r));
  const APP=`http://localhost:${app.address().port}`;
  const browser=await chromium.launch({executablePath:CHROME,headless:!process.argv.includes('--show')});
  const page=await (await browser.newContext({viewport:{width:1000,height:800}})).newPage();
  await page.addInitScript(()=>{
    window.__DUSK_WORKER_URL='http://localhost:9/wk';            // dummy (FakeWS never connects)
    Object.defineProperty(document,'visibilityState',{get:()=>'visible',configurable:true});
    class FakeWS {
      constructor(url){ this.url=url; this.readyState=0; this.sent=[]; FakeWS.last=this;
        setTimeout(()=>{ this.readyState=1; if(this.onopen) this.onopen(); },0); }
      send(m){ this.sent.push(m); }
      close(){ this.readyState=3; if(this.onclose) this.onclose(); }
    }
    FakeWS.last=null; window.FakeWS=FakeWS; window.WebSocket=FakeWS;
  });
  await page.goto(`${APP}/index.html`); await page.waitForTimeout(300);

  // spy on syncNow + force signed-in
  await page.evaluate(()=>{
    window.__syncCalls=0; window.__lastVia=null;
    window.syncNow=(o)=>{ window.__syncCalls++; window.__lastVia=o&&o.via; };
    window.cloudStatus=()=>({signedIn:true,expiresAt:Date.now()+1e6});
  });

  // note → opens a socket to /ws?room=<hash>
  await page.evaluate(()=>{ syncWakeNote('file-abc-123'); });
  await page.waitForTimeout(150);
  let r=await page.evaluate(()=>({ url: window.FakeWS.last && window.FakeWS.last.url, rs: window.FakeWS.last && window.FakeWS.last.readyState }));
  rec('note: opens a WebSocket', !!r.url, r);
  rec('note: ws:// URL hitting /ws?room=<hash>', /^ws:\/\/localhost:9\/wk\/ws\?room=[0-9a-f]{24}$/.test(r.url||''), r.url);

  // peer message → syncNow({via:'будилка'})
  await page.evaluate(()=>{ if(window.FakeWS.last.onmessage) window.FakeWS.last.onmessage({data:'changed'}); });
  r=await page.evaluate(()=>({calls:window.__syncCalls, via:window.__lastVia}));
  rec('message: triggers a sync', r.calls===1, r);
  rec('message: tagged via=будилка', r.via==='будилка', r);

  // nudge → send('changed')
  await page.evaluate(()=>{ syncWakeNudge(); });
  r=await page.evaluate(()=>({sent: window.FakeWS.last.sent}));
  rec('nudge: sends "changed" to peers', Array.isArray(r.sent) && r.sent.includes('changed'), r);

  // note again, same room → does NOT churn a new socket
  let before=await page.evaluate(()=>window.FakeWS.last);
  await page.evaluate(()=>{ window.__sockBefore=window.FakeWS.last; syncWakeNote('file-abc-123'); });
  await page.waitForTimeout(120);
  r=await page.evaluate(()=>({same: window.__sockBefore===window.FakeWS.last}));
  rec('note: same room reuses the open socket', r.same===true, r);

  // reconnect → catch-up sync (a dropped socket may have missed nudges; first open must NOT sync)
  await page.evaluate(()=>{ window.__syncCalls=0; window.__lastVia=null; window.FakeWS.last.close(); });
  await page.waitForTimeout(1300);                  // backoff ~1000ms, then reconnect + open
  r=await page.evaluate(()=>({calls:window.__syncCalls, via:window.__lastVia, rs:window.FakeWS.last.readyState}));
  rec('reconnect: catch-up sync fired', r.calls>=1, r);
  rec('reconnect: tagged via=переподключение', r.via==='переподключение', r);
  rec('reconnect: socket re-opened', r.rs===1, r);

  // stop → closes
  await page.evaluate(()=>{ syncWakeStop(); });
  r=await page.evaluate(()=>({rs: window.FakeWS.last.readyState}));
  rec('stop: closes the socket', r.rs===3, r);

  await browser.close(); app.close();
  console.log(`\nsync-wake test: ${pass} passed, ${fail} failed  (total ${pass+fail})`);
  process.exit(fail?1:0);
})().catch(e=>{console.error('CRASH',e);process.exit(2);});
