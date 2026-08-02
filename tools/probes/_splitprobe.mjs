// Bug B in SPLIT mode (active/выполнено): checking ONE task must NOT tear down the
// other cards / subtasks / group frame. Prove identity + zero detach of siblings, and
// that the toggled card actually migrates active→done.
import http from 'http'; import fs from 'fs'; import path from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright-core');
const ROOT='D:/VSCode projects/DUSK_v2.0', CHROME='C:/Program Files/Google/Chrome/Application/chrome.exe';
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.jpg':'image/jpeg'};
const srv=http.createServer((q,s)=>{let u=decodeURIComponent(q.url.split('?')[0]);if(u==='/')u='/index.html';
  fs.readFile(path.join(ROOT,u),(e,d)=>{if(e){s.writeHead(404);s.end('nf');return;}s.writeHead(200,{'Content-Type':MIME[path.extname(u)]||'application/octet-stream'});s.end(d);});});
const sub=(id,t)=>({id,text:t,checked:false,priority:'none',repeat:'none',note:''});
const T=(id,txt,order,checked)=>({id,uid:'u'+id,text:txt,checked:!!checked,priority:'none',groupId:10,deadline:null,note:'',noteOpen:false,order,repeat:'none',cycleChecked:false,nextReset:null,subtasks:[sub(id*100+1,'s1'),sub(id*100+2,'s2')],subtasksOpen:true});
const seed={groups:[{id:10,uid:'g10',name:'Grp',color:'#6C8EF5',collapsed:false,order:0}],archive:[],notes:[],notesArchive:[],tasks:[
  T(1,'A',0,false),T(2,'B',1,false),T(3,'C',2,false),T(4,'D-done',3,true),
],nextId:9,nextGroupId:11,nextSubId:900,sortMode:'order',sortModeOverrides:{}};
let pass=0,fail=0; const ok=(n,c)=>{c?pass++:fail++;console.log((c?'  ok  ':' FAIL ')+n);};
(async()=>{
  const port=await new Promise(r=>{srv.listen(0,()=>r(srv.address().port));});
  const b=await chromium.launch({executablePath:CHROME,headless:true});
  const ctx=await b.newContext({viewport:{width:1180,height:950}});  // motion ON
  const p=await ctx.newPage(); p.on('pageerror',e=>{console.log('PAGEERR',e.message);fail++;});
  await p.addInitScript((st)=>{localStorage.setItem('duskState_v3',JSON.stringify(st));localStorage.setItem('currentPage','main');localStorage.removeItem('duskState_v4');localStorage.setItem('isFiltered','0');localStorage.setItem('groupSplitMode','1');},seed);
  await p.goto(`http://localhost:${port}/index.html`); await p.waitForTimeout(700);

  // sanity: split zones exist
  const zones=await p.evaluate(()=>({
    active:!!document.querySelector('.split-active-body'),
    done:!!document.querySelector('.split-done-body'),
    activeCards:document.querySelectorAll('.split-active-body > .task-item').length,
    doneCards:document.querySelectorAll('.split-done-body > .task-item').length,
  }));
  ok('split mode rendered active zone', zones.active);
  ok('split mode rendered done zone', zones.done);
  ok('3 active cards present', zones.activeCards===3);
  ok('1 done card present', zones.doneCards===1);

  // Tag the nodes that must survive when we check task #1.
  await p.evaluate(()=>{
    const tag=(sel,id)=>{const el=document.querySelector(sel); if(el) el.__pid=id; return !!el;};
    tag('.group-section[data-group-id="10"]','SEC');
    tag('.split-active-body','ABODY');
    tag('.split-done-body','DBODY');
    tag('.task-item[data-id="2"]','C2');
    tag('#sub-section-2','S2');
    tag('.task-item[data-id="3"]','C3');
    tag('#sub-section-3','S3');
    tag('.task-item[data-id="4"]','C4');   // existing done card
    window.__removed=[];
    const obs=new MutationObserver(muts=>{muts.forEach(m=>{m.removedNodes.forEach(n=>{
      if(n.nodeType===1 && n.__pid) window.__removed.push(n.__pid);
    });});});
    obs.observe(document.getElementById('groups-container'),{childList:true,subtree:true});
  });

  await p.evaluate(()=>toggleCheck(1));
  await p.waitForTimeout(800);

  const r=await p.evaluate(()=>{
    const same=(sel,id)=>{const el=document.querySelector(sel); return !!(el&&el.__pid===id);};
    return {
      secSame:  same('.group-section[data-group-id="10"]','SEC'),
      aBodySame:same('.split-active-body','ABODY'),
      dBodySame:same('.split-done-body','DBODY'),
      c2Same:   same('.task-item[data-id="2"]','C2'),
      s2Same:   same('#sub-section-2','S2'),
      c3Same:   same('.task-item[data-id="3"]','C3'),
      s3Same:   same('#sub-section-3','S3'),
      c4Same:   same('.task-item[data-id="4"]','C4'),
      taggedRemoved: window.__removed.slice(),
      task1InDone: !!document.querySelector('.split-done-body > .task-item[data-id="1"]'),
      task1InActive: !!document.querySelector('.split-active-body > .task-item[data-id="1"]'),
      activeCards:document.querySelectorAll('.split-active-body > .task-item').length,
      doneCards:document.querySelectorAll('.split-done-body > .task-item').length,
    };
  });
  ok('group frame SAME node after split-check', r.secSame);
  ok('active-body UL SAME node (zone scaffold reused)', r.aBodySame);
  ok('done-body UL SAME node (zone scaffold reused)', r.dBodySame);
  ok('sibling active card #2 SAME node', r.c2Same);
  ok('sibling active card #2 subtask-section SAME node', r.s2Same);
  ok('sibling active card #3 SAME node', r.c3Same);
  ok('sibling active card #3 subtask-section SAME node', r.s3Same);
  ok('pre-existing done card #4 SAME node', r.c4Same);
  ok('NO tagged sibling/frame was ever detached', r.taggedRemoved.filter(x=>x!=='C1').length===0);
  ok('toggled task #1 migrated to DONE zone', r.task1InDone && !r.task1InActive);
  ok('active now 2 cards, done now 2 cards', r.activeCards===2 && r.doneCards===2);
  console.log('  (tagged removals:', JSON.stringify(r.taggedRemoved)+')');

  // Uncheck path: task #1 back to active; siblings still untouched.
  await p.evaluate(()=>{window.__removed.length=0;});
  await p.evaluate(()=>toggleCheck(1));
  await p.waitForTimeout(800);
  const r2=await p.evaluate(()=>{
    const same=(sel,id)=>{const el=document.querySelector(sel); return !!(el&&el.__pid===id);};
    return {c2Same:same('.task-item[data-id="2"]','C2'),s2Same:same('#sub-section-2','S2'),secSame:same('.group-section[data-group-id="10"]','SEC'),
      taggedRemoved:window.__removed.slice(),
      task1InActive:!!document.querySelector('.split-active-body > .task-item[data-id="1"]')};
  });
  ok('uncheck: sibling #2 still SAME node', r2.c2Same);
  ok('uncheck: sibling #2 subtask-section still SAME node', r2.s2Same);
  ok('uncheck: group frame still SAME node', r2.secSame);
  ok('uncheck: NO tagged sibling detached', r2.taggedRemoved.filter(x=>x!=='C1').length===0);
  ok('uncheck: task #1 back in ACTIVE zone', r2.task1InActive);

  await b.close(); srv.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail?1:0);
})().catch(e=>{console.error('CRASH',e);process.exit(2);});
