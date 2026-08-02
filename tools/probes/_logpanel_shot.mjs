import http from 'http'; import fs from 'fs'; import path from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright-core');
const ROOT='D:/VSCode projects/DUSK_v2.0';
const CHROME='C:/Program Files/Google/Chrome/Application/chrome.exe';
const OUT='C:/Users/serge/AppData/Local/Temp/claude/D--VSCode-projects-DUSK-v2-0/0a1e223e-b6d1-498e-a433-745713f8b509/scratchpad';
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.jpg':'image/jpeg'};
const srv=http.createServer((q,s)=>{let u=decodeURIComponent(q.url.split('?')[0]);if(u==='/')u='/index.html';
  fs.readFile(path.join(ROOT,u),(e,d)=>{if(e){s.writeHead(404);s.end('nf');return;}s.writeHead(200,{'Content-Type':MIME[path.extname(u)]||'application/octet-stream'});s.end(d);});});
const FAKE=()=>{ window.__drive={file:null};
  window.cloudIsConfigured=()=>true; window.cloudStatus=()=>({signedIn:true,expiresAt:Date.now()+3.6e6});
  window.cloudAuth=async()=>({ok:true}); window.cloudSignOut=()=>{}; window.scheduleSyncPush=function(){};
  window.cloudPull=async()=>window.__drive.file?{subset:JSON.parse(JSON.stringify(window.__drive.file.subset)),version:window.__drive.file.version,fileId:'f1'}:{empty:true};
  window.cloudPush=async(subset,opts)=>{const cur=window.__drive.file?window.__drive.file.version:null; const v=(cur||0)+1; window.__drive.file={subset:JSON.parse(JSON.stringify(subset)),version:v}; return {fileId:'f1',version:v};};
};
let pass=0,fail=0; const rec=(n,c,d)=>{if(c)pass++;else{fail++;console.log('  FAIL:',n,d!=null?JSON.stringify(d):'');}};
(async()=>{
  await new Promise(r=>srv.listen(0,r));
  const base=`http://localhost:${srv.address().port}`;
  const browser=await chromium.launch({executablePath:CHROME,headless:true});
  for (const vp of [{w:390,h:740,name:'phone'},{w:1200,h:900,name:'desktop'}]) {
    const page=await (await browser.newContext({viewport:{width:vp.w,height:vp.h}})).newPage();
    await page.goto(`${base}/index.html`); await page.waitForTimeout(500);
    await page.evaluate(FAKE);
    await page.evaluate(async()=>{
      for(let i=0;i<3;i++) state.tasks.push({id:state.nextId++,uid:'X'+i,createdAt:nowTs(),updatedAt:nowTs(),text:'Задача '+i,checked:false,priority:'none',groupId:null,deadline:null,note:'',noteOpen:false,order:i,repeat:'none',cycleChecked:false,nextReset:null,subtasks:[],subtasksOpen:false});
      saveState();
      for(let k=0;k<6;k++){ state.tasks[0].text='v'+k; state.tasks[0].updatedAt=nowTs(); saveState(); await syncNow({manual:true,via:'тест'}); }
    });
    await page.waitForTimeout(200);
    await page.locator('#sync-glyph-btn').click();
    await page.waitForTimeout(200);
    await page.evaluate(()=>{ const d=document.querySelector('.sync-panel-log'); if(d) d.open=true; });
    await page.waitForTimeout(200);
    const box=await page.evaluate(()=>{ const p=document.querySelector('.snooze-menu.sync-panel'); if(!p) return null; const r=p.getBoundingClientRect(); return {top:r.top,bottom:r.bottom,left:r.left,right:r.right}; });
    const onScreen = box && box.top>=-1 && box.left>=-1 && box.bottom<=vp.h+1 && box.right<=vp.w+1;
    rec(vp.name+': panel+log within viewport', onScreen, {vp,box});
    await page.screenshot({path:OUT+'/logpanel_'+vp.name+'.png'});
    await page.close();
  }
  await browser.close(); srv.close();
  console.log(`\nlog-panel fit: ${pass} passed, ${fail} failed`);
  process.exit(fail?1:0);
})().catch(e=>{console.error('CRASH',e);process.exit(2);});
