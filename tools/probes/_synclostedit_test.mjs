// Edit-during-in-flight-sync must NOT be dropped. Real scheduleSyncPush + saveState
// hook; cloudPush is made slow so an edit can land mid-sync. Without the fix
// (scheduleSyncPush returned early while _syncing) the edit only went out on the
// next unrelated trigger; with it, syncNow's finally re-runs and pushes it.
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

// fake cloud installed in-page; cloudPush is slow when __slow is set.
const FAKE=()=>{
  window.__drive=null; window.__pushes=0; window.__slow=false;
  window.cloudIsConfigured=()=>true;
  window.cloudStatus=()=>({signedIn:true, expiresAt:Date.now()+3.6e6});
  window.cloudAuth=async()=>({ok:true});
  window.cloudSignOut=()=>{};
  window.cloudPull=async()=> window.__drive ? {subset:JSON.parse(JSON.stringify(window.__drive.subset)),version:window.__drive.version,fileId:'f1'} : {empty:true};
  window.cloudPush=async(subset,opts)=>{
    if(window.__slow) await new Promise(r=>setTimeout(r,350));
    const cur=window.__drive?window.__drive.version:null;
    if(opts&&opts.expectedVersion!=null&&String(opts.expectedVersion)!==String(cur)) throw new ConflictError(opts.expectedVersion,cur);
    const v=(cur||0)+1; window.__drive={subset:JSON.parse(JSON.stringify(subset)),version:v}; window.__pushes++; return {fileId:'f1',version:v};
  };
};

(async()=>{
  await new Promise(r=>srv.listen(0,r));
  const base=`http://localhost:${srv.address().port}`;
  const browser=await chromium.launch({executablePath:CHROME,headless:!process.argv.includes('--show')});
  const page=await (await browser.newContext({viewport:{width:1000,height:800}})).newPage();
  const errs=[]; page.on('pageerror',e=>errs.push(e.message));
  await page.goto(`${base}/index.html`); await page.waitForTimeout(500);
  await page.evaluate(FAKE);
  await page.evaluate(()=>{ state.tasks.push({id:state.nextId++,uid:'A',createdAt:nowTs(),updatedAt:nowTs(),text:'orig',checked:false,priority:'none',groupId:null,deadline:null,note:'',noteOpen:false,order:0,repeat:'none',cycleChecked:false,nextReset:null,subtasks:[],subtasksOpen:false}); saveState(); });

  // initial sync → file v1 'orig'; enables sync
  await page.evaluate(async()=>{ await syncNow({manual:true}); });
  let r=await page.evaluate(()=>({v:window.__drive&&window.__drive.version,txt:window.__drive&&window.__drive.subset.tasks[0].text}));
  rec('setup: file created v1 = orig', r.v===1 && r.txt==='orig', r);

  // change FIRST + start a SLOW sync that MUST push (so it's really in flight),
  // then edit again mid-flight.
  await page.evaluate(()=>{
    window.__slow=true;
    const t=state.tasks.find(x=>x.uid==='A'); t.text='FIRST'; t.updatedAt=nowTs(); saveState();
    syncNow({manual:true});                          // pushes FIRST via the slow (~350ms) push
  });
  await page.waitForTimeout(120);                    // now inside the slow push
  const mid = await page.evaluate(()=>{
    const m=_syncing;                                // is a sync really in flight?
    const t=state.tasks.find(x=>x.uid==='A'); t.text='EDITED'; t.updatedAt=nowTs();
    saveState();                                     // → _afterSaveState → scheduleSyncPush WHILE _syncing
    return m;
  });
  await page.waitForTimeout(1600);                   // slow push finishes + the queued re-run pushes EDITED

  r=await page.evaluate(()=>({txt:window.__drive&&window.__drive.subset.tasks[0].text, pushes:window.__pushes}));
  r.mid = mid;
  rec('the edit was in-flight (sync really running when we edited)', r.mid===true, r);
  rec('edit made DURING a sync reaches Drive (not dropped)', r.txt==='EDITED', r);

  // local + Drive agree
  r=await page.evaluate(()=>({local:state.tasks.find(t=>t.uid==='A').text, drive:window.__drive.subset.tasks[0].text}));
  rec('local and Drive converged on EDITED', r.local==='EDITED' && r.drive==='EDITED', r);

  // CRITICAL: the sync must SETTLE — no infinite re-run loop (eye stuck 'syncing').
  // syncNow's own internal saveState must NOT re-queue itself.
  await page.evaluate(()=>{ window.__slow=false; });
  const p1=await page.evaluate(()=>window.__pushes);
  await page.waitForTimeout(1200);
  const p2=await page.evaluate(()=>({pushes:window.__pushes, syncing:_syncing, queued:_syncQueued}));
  rec('sync SETTLES — push count stops climbing (no infinite loop)', p2.pushes===p1, {p1,p2});
  rec('eye not stuck: _syncing false + _syncQueued false at rest', p2.syncing===false && p2.queued===false, p2);

  rec('no pageerror', errs.length===0, errs.join(' | '));
  await browser.close(); srv.close();
  console.log(`\nlost-edit (edit during sync) test: ${pass} passed, ${fail} failed  (total ${pass+fail})`);
  process.exit(fail?1:0);
})().catch(e=>{console.error('CRASH',e);process.exit(2);});
