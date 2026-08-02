// Hotkey S: signed-out → sign-in flow; signed-in → sync now; ignored while typing;
// present in the shortcuts hint on every tab. Uses an in-page FAKE Drive (no OAuth).
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
  window.__drive={file:null}; window.__signedIn=false; window.__authCalls=0; window.__pushCalls=0;
  window.cloudIsConfigured=()=>true;
  window.cloudStatus=()=>({signedIn:window.__signedIn,expiresAt:window.__signedIn?Date.now()+3.6e6:0});
  window.cloudAuth=async()=>{window.__authCalls++; window.__signedIn=true; return {ok:true};};
  window.cloudSignOut=()=>{window.__signedIn=false;};
  window.scheduleSyncPush=function(){};
  window.cloudPull=async()=>window.__drive.file?{subset:JSON.parse(JSON.stringify(window.__drive.file.subset)),version:window.__drive.file.version,fileId:'f1'}:{empty:true};
  window.cloudPush=async(subset,opts)=>{const cur=window.__drive.file?window.__drive.file.version:null;
    if(opts&&opts.expectedVersion!=null&&String(opts.expectedVersion)!==String(cur)) throw new ConflictError(opts.expectedVersion,cur);
    window.__pushCalls++; const v=(cur||0)+1; window.__drive.file={subset:JSON.parse(JSON.stringify(subset)),version:v}; return {fileId:'f1',version:v};};
};

(async()=>{
  await new Promise(r=>srv.listen(0,r));
  const base=`http://localhost:${srv.address().port}`;
  const browser=await chromium.launch({executablePath:CHROME,headless:!process.argv.includes('--show')});
  const page=await (await browser.newContext({viewport:{width:1100,height:850}})).newPage();
  const errs=[]; page.on('pageerror',e=>errs.push(e.message));
  await page.goto(`${base}/index.html`); await page.waitForTimeout(700);
  await page.evaluate(FAKE);
  await page.evaluate(()=>{ state.tasks.push({id:state.nextId++,uid:'A',createdAt:nowTs(),updatedAt:nowTs(),text:'t',checked:false,priority:'none',groupId:null,deadline:null,note:'',noteOpen:false,order:0,repeat:'none',cycleChecked:false,nextReset:null,subtasks:[],subtasksOpen:false}); saveState(); });

  // 1. signed-out: press S → sign-in (cloudAuth) then a sync runs → glyph ok, push happened
  await page.evaluate(()=>{ if(document.activeElement&&document.activeElement.blur) document.activeElement.blur(); });
  await page.keyboard.press('s');
  await page.waitForTimeout(500);
  let r=await page.evaluate(()=>({auth:window.__authCalls,push:window.__pushCalls,signedIn:window.__signedIn,glyph:document.getElementById('sync-glyph-btn').getAttribute('data-sync')}));
  rec('1: S signed-out → cloudAuth called', r.auth>=1, r);
  rec('1: S signed-out → sync pushed', r.push>=1, r);
  rec('1: glyph → ok after sign-in+sync', r.glyph==='ok', r);

  // 2. signed-in: press S again → sync-now (another push), no auth popup needed
  const before=await page.evaluate(()=>window.__pushCalls);
  await page.keyboard.press('s');
  await page.waitForTimeout(400);
  r=await page.evaluate(()=>({push:window.__pushCalls,auth:window.__authCalls}));
  rec('2: S signed-in → another sync push', r.push>before, {before,...r});

  // 3. typing in an input → S is ignored (no extra auth/push)
  const snap=await page.evaluate(()=>({push:window.__pushCalls,auth:window.__authCalls}));
  await page.locator('#input-box, .input-box, #new-task-input').first().click().catch(()=>{});
  await page.evaluate(()=>{ const i=document.querySelector('input,textarea'); if(i) i.focus(); });
  await page.keyboard.press('s');
  await page.waitForTimeout(250);
  r=await page.evaluate(()=>({push:window.__pushCalls,auth:window.__authCalls}));
  rec('3: S ignored while typing', r.push===snap.push && r.auth===snap.auth, {snap,r});

  // 4. hint shows S on every tab
  const hints=await page.evaluate(()=>{
    const out={};
    // task page
    out.main = (typeof _shortcutsHintHTML==='function') ? _shortcutsHintHTML() : (document.getElementById('shortcuts-hint')||{}).innerHTML;
    return out;
  });
  rec('4: task hint includes S', /<kbd>S<\/kbd>/.test(hints.main||''), hints.main);
  const otherHints=await page.evaluate(()=>({
    notes: typeof _NOTES_HINT_HTML!=='undefined'?_NOTES_HINT_HTML:'',
    crypt: typeof _CRYPT_HINT_HTML!=='undefined'?_CRYPT_HINT_HTML:'',
    tarch: typeof _TASK_ARCHIVE_HINT_HTML!=='undefined'?_TASK_ARCHIVE_HINT_HTML:'',
  }));
  rec('4: notes hint includes S', /<kbd>S<\/kbd>/.test(otherHints.notes), otherHints.notes);
  rec('4: crypt hint includes S', /<kbd>S<\/kbd>/.test(otherHints.crypt), otherHints.crypt);
  rec('4: tasks-archive hint includes S', /<kbd>S<\/kbd>/.test(otherHints.tarch), otherHints.tarch);

  rec('end: no pageerror', errs.length===0, errs.join(' | '));
  await browser.close(); srv.close();
  console.log(`\nhotkey-S test: ${pass} passed, ${fail} failed  (total ${pass+fail})`);
  process.exit(fail?1:0);
})().catch(e=>{console.error('CRASH',e);process.exit(2);});
