// Bug B for SCHEDULE + COMBO (schedule+split) main-list modes: checking ONE task must
// not tear down sibling cards / zone ULs / group frame. Tag NO-deadline siblings (stable;
// deadline cards legitimately rebuild as their countdown ticks).
import http from 'http'; import fs from 'fs'; import path from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright-core');
const ROOT='D:/VSCode projects/DUSK_v2.0', CHROME='C:/Program Files/Google/Chrome/Application/chrome.exe';
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.jpg':'image/jpeg'};
const srv=http.createServer((q,s)=>{let u=decodeURIComponent(q.url.split('?')[0]);if(u==='/')u='/index.html';
  fs.readFile(path.join(ROOT,u),(e,d)=>{if(e){s.writeHead(404);s.end('nf');return;}s.writeHead(200,{'Content-Type':MIME[path.extname(u)]||'application/octet-stream'});s.end(d);});});
const sub=(id,t)=>({id,text:t,checked:false,priority:'none',repeat:'none',note:''});
const T=(id,txt,o,dl)=>({id,uid:'u'+id,text:txt,checked:false,priority:'none',groupId:10,deadline:dl||null,note:'',noteOpen:false,order:o,repeat:'none',cycleChecked:false,nextReset:null,subtasks:[sub(id*100+1,'s1'),sub(id*100+2,'s2')],subtasksOpen:true});
const seed={groups:[{id:10,uid:'g10',name:'Grp',color:'#6C8EF5',collapsed:false,order:0}],archive:[],notes:[],notesArchive:[],tasks:[
  T(1,'NoDl A',0,null),T(2,'NoDl B',1,null),T(3,'NoDl C',2,null),T(4,'HasDl',3,{mode:'month',value:'12'}),
],nextId:9,nextGroupId:11,nextSubId:900,sortMode:'order',sortModeOverrides:{}};
let pass=0,fail=0; const ok=(n,c)=>{c?pass++:fail++;console.log((c?'  ok  ':' FAIL ')+n);};

async function scenario(label, splitMode, port){
  const b=await chromium.launch({executablePath:CHROME,headless:true});
  const ctx=await b.newContext({viewport:{width:1180,height:950}});
  const p=await ctx.newPage(); p.on('pageerror',e=>{console.log('PAGEERR',e.message);fail++;});
  await p.addInitScript((st,sm)=>{localStorage.setItem('duskState_v3',JSON.stringify(st));localStorage.setItem('currentPage','main');localStorage.removeItem('duskState_v4');localStorage.setItem('isFiltered','0');localStorage.setItem('scheduleMode','1');localStorage.setItem('groupSplitMode',sm?'1':'0');},seed,splitMode);
  await p.goto(`http://localhost:${port}/index.html`); await p.waitForTimeout(700);
  console.log(`\n=== ${label} ===`);

  const zones=await p.evaluate(()=>({
    sched:document.querySelectorAll('.sched-zone-ul').length,
    combo:document.querySelectorAll('.sched-split-inner').length,
    dlHdr:!!document.querySelector('.dl-subgroup-header'),
  }));
  ok(`${label}: deadline subgroup header present`, zones.dlHdr);

  await p.evaluate(()=>{
    const tag=(sel,id)=>{const el=document.querySelector(sel); if(el) el.__pid=id; return !!el;};
    tag('.group-section[data-group-id="10"]','SEC');
    tag('.task-item[data-id="2"]','C2');
    tag('#sub-section-2','S2');
    tag('.task-item[data-id="3"]','C3');
    tag('#sub-section-3','S3');
    // zone UL holding the no-deadline cards (its first card's parent ul)
    const c2=document.querySelector('.task-item[data-id="2"]');
    if(c2 && c2.parentElement){ c2.parentElement.__pid='NDLUL'; }
    window.__removed=[];
    const obs=new MutationObserver(muts=>{muts.forEach(m=>m.removedNodes.forEach(n=>{if(n.nodeType===1&&n.__pid)window.__removed.push(n.__pid);}));});
    obs.observe(document.getElementById('groups-container'),{childList:true,subtree:true});
  });

  await p.evaluate(()=>toggleCheck(2));   // check a no-deadline sibling
  await p.waitForTimeout(800);

  const r=await p.evaluate(()=>{
    const same=(sel,id)=>{const el=document.querySelector(sel); return !!(el&&el.__pid===id);};
    return {
      secSame: same('.group-section[data-group-id="10"]','SEC'),
      c3Same:  same('.task-item[data-id="3"]','C3'),
      s3Same:  same('#sub-section-3','S3'),
      s2Same:  same('#sub-section-2','S2'),
      ndlUlSame: (()=>{const c=document.querySelector('.task-item[data-id="3"]'); return !!(c&&c.parentElement&&c.parentElement.__pid==='NDLUL');})(),
      removed: window.__removed.slice(),
      task2Checked: !!document.querySelector('.task-item[data-id="2"]')?.className.match(/checked/),
    };
  });
  ok(`${label}: group frame SAME node`, r.secSame);
  ok(`${label}: sibling no-dl card #3 SAME node`, r.c3Same);
  ok(`${label}: sibling #3 subtask-section SAME node`, r.s3Same);
  ok(`${label}: no-deadline zone UL SAME node (scaffold reused)`, r.ndlUlSame);
  // C2 (checked card) + S2 (its own sub-section) legitimately rebuild/move; siblings must not.
  ok(`${label}: NO SIBLING (non-acted) node detached`, r.removed.filter(x=>x!=='C2'&&x!=='S2').length===0);
  ok(`${label}: checked card's own sub-section REUSED (moved, same node)`, r.s2Same);
  ok(`${label}: checked task #2 got .checked`, r.task2Checked);
  console.log('  (tagged removals:', JSON.stringify(r.removed)+')');

  await b.close();
}
(async()=>{
  const port=await new Promise(r=>{srv.listen(0,()=>r(srv.address().port));});
  await scenario('schedule-only', false, port);
  await scenario('combo (schedule+split)', true, port);
  srv.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail?1:0);
})().catch(e=>{console.error('CRASH',e);process.exit(2);});
