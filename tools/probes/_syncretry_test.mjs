// Transient-failure auto-retry. Fake cloudPull fails while __failPull is set
// (simulates "Wi-Fi just came back but the link isn't usable yet"); the sync goes
// to 'error' AND schedules a backoff retry. When the link recovers, the retry
// completes the sync → 'ok', with no manual action.
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
  window.__drive={file:null}; window.__failPull=false;
  window.cloudIsConfigured=()=>true;
  window.cloudStatus=()=>({signedIn:true,expiresAt:Date.now()+3.6e6});
  window.cloudAuth=async()=>({ok:true});
  window.cloudSignOut=()=>{};
  window.scheduleSyncPush=function(){};
  window.cloudPull=async()=>{ if(window.__failPull) throw new Error('Failed to fetch');
    return window.__drive.file?{subset:JSON.parse(JSON.stringify(window.__drive.file.subset)),version:window.__drive.file.version,fileId:'f1'}:{empty:true}; };
  window.cloudPush=async(subset,opts)=>{const cur=window.__drive.file?window.__drive.file.version:null;
    if(opts&&opts.expectedVersion!=null&&String(opts.expectedVersion)!==String(cur)) throw new ConflictError(opts.expectedVersion,cur);
    const v=(cur||0)+1; window.__drive.file={subset:JSON.parse(JSON.stringify(subset)),version:v}; return {fileId:'f1',version:v};};
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

  // 1. link not ready → sync fails → 'error', retry scheduled
  let r=await page.evaluate(async()=>{ window.__failPull=true; await syncNow({interactive:false});
    return { glyph:document.getElementById('sync-glyph-btn').getAttribute('data-sync'), hasFile:!!window.__drive.file }; });
  rec('1: transient failure → error', r.glyph==='error', r);
  rec('1: nothing pushed yet', r.hasFile===false, r);

  // 2. link recovers → the scheduled retry (2 s backoff) completes the sync → ok
  await page.evaluate(()=>{ window.__failPull=false; });
  await page.waitForTimeout(3000);
  r=await page.evaluate(()=>({ glyph:document.getElementById('sync-glyph-btn').getAttribute('data-sync'), hasFile:!!window.__drive.file }));
  rec('2: auto-retry recovered → ok', r.glyph==='ok', r);
  rec('2: data pushed after recovery', r.hasFile===true, r);

  rec('end: no pageerror', errs.length===0, errs.join(' | '));
  await browser.close(); srv.close();
  console.log(`\nsync-retry test: ${pass} passed, ${fail} failed  (total ${pass+fail})`);
  process.exit(fail?1:0);
})().catch(e=>{console.error('CRASH',e);process.exit(2);});
