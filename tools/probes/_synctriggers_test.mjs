// Push-skip gate + pull-only behaviour. Fake Drive counts pushes. Verifies a sync
// with nothing new SKIPS the write (no Drive churn), a local edit DOES push, and a
// remote-only change is pulled WITHOUT a push.
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

const FAKE=()=>{
  window.__drive={file:null}; window.__pushes=0; window.__signedIn=true;
  window.cloudIsConfigured=()=>true;
  window.cloudStatus=()=>({signedIn:window.__signedIn,expiresAt:Date.now()+3.6e6});
  window.cloudAuth=async()=>({ok:true});
  window.cloudSignOut=()=>{window.__signedIn=false;};
  window.scheduleSyncPush=function(){};        // drive syncs manually
  window.cloudPull=async()=>window.__drive.file?{subset:JSON.parse(JSON.stringify(window.__drive.file.subset)),version:window.__drive.file.version,fileId:'f1'}:{empty:true};
  window.cloudPush=async(subset,opts)=>{const cur=window.__drive.file?window.__drive.file.version:null;
    if(opts&&opts.expectedVersion!=null&&String(opts.expectedVersion)!==String(cur)) throw new ConflictError(opts.expectedVersion,cur);
    window.__pushes++; const v=(cur||0)+1; window.__drive.file={subset:JSON.parse(JSON.stringify(subset)),version:v}; return {fileId:'f1',version:v};};
};

(async()=>{
  await new Promise(r=>srv.listen(0,r));
  const base=`http://localhost:${srv.address().port}`;
  const browser=await chromium.launch({executablePath:CHROME,headless:!process.argv.includes('--show')});
  const page=await (await browser.newContext({viewport:{width:1000,height:800}})).newPage();
  const errs=[]; page.on('pageerror',e=>errs.push(e.message));
  await page.goto(`${base}/index.html`); await page.waitForTimeout(600);
  await page.evaluate(FAKE);
  await page.evaluate(()=>{ state.tasks.push({id:state.nextId++,uid:'A',createdAt:nowTs(),updatedAt:nowTs(),text:'one',checked:false,priority:'none',groupId:null,deadline:null,note:'',noteOpen:false,order:0,repeat:'none',cycleChecked:false,nextReset:null,subtasks:[],subtasksOpen:false}); saveState(); });

  // 1. first sync → creates the file (1 push)
  let r=await page.evaluate(async()=>{ await syncNow({manual:true}); return {pushes:window.__pushes,ver:window.__drive.file&&window.__drive.file.version}; });
  rec('1: first sync pushes (file created)', r.pushes===1 && r.ver===1, r);

  // 2. sync again, NOTHING changed → push SKIPPED (no Drive churn)
  r=await page.evaluate(async()=>{ await syncNow({manual:true}); return {pushes:window.__pushes,ver:window.__drive.file.version}; });
  rec('2: no-change sync skips the push', r.pushes===1 && r.ver===1, r);

  // 3. local edit → sync pushes the change
  r=await page.evaluate(async()=>{ state.tasks.find(t=>t.uid==='A').text='two'; state.tasks.find(t=>t.uid==='A').updatedAt=nowTs(); saveState();
    await syncNow({manual:true}); return {pushes:window.__pushes,ver:window.__drive.file.version,driveText:window.__drive.file.subset.tasks.find(t=>t.uid==='A').text}; });
  rec('3: local edit pushes', r.pushes===2 && r.ver===2, r);
  rec('3: edit reached Drive', r.driveText==='two', r);

  // 4. remote-only change → pulled WITHOUT a push
  r=await page.evaluate(async()=>{ const rt=window.__drive.file.subset.tasks.find(t=>t.uid==='A'); rt.text='remote'; rt.updatedAt=nowTs()+5000; window.__drive.file.version++;
    const before=window.__pushes; await syncNow({manual:true});
    return {pushedMore:window.__pushes>before, localText:state.tasks.find(t=>t.uid==='A').text}; });
  rec('4: remote change applied locally', r.localText==='remote', r);
  rec('4: pure pull did NOT push', r.pushedMore===false, r);

  // 5. add a 2nd task + sync, then REORDER remote array & bump _alloc → no push
  //    (order + device-local allocator are noise, not content).
  await page.evaluate(async()=>{ state.tasks.push({id:state.nextId++,uid:'B',createdAt:nowTs(),updatedAt:nowTs(),text:'beta',checked:false,priority:'none',groupId:null,deadline:null,note:'',noteOpen:false,order:1,repeat:'none',cycleChecked:false,nextReset:null,subtasks:[],subtasksOpen:false}); saveState(); await syncNow({manual:true}); });
  r=await page.evaluate(async()=>{
    const f=window.__drive.file;
    f.subset.tasks.reverse();                               // order noise
    if (f.subset._alloc) f.subset._alloc.nextId += 50;      // allocator noise
    f.version++;
    const before=window.__pushes; await syncNow({manual:true});
    return { pushedMore: window.__pushes>before }; });
  rec('5: reorder + _alloc noise does NOT push', r.pushedMore===false, r);

  rec('end: no pageerror', errs.length===0, errs.join(' | '));
  await browser.close(); srv.close();
  console.log(`\nsync-triggers test: ${pass} passed, ${fail} failed  (total ${pass+fail})`);
  process.exit(fail?1:0);
})().catch(e=>{console.error('CRASH',e);process.exit(2);});
