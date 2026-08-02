// Guard the reconciliation change against DnD breakage:
//  (1) reused group-body ULs must hold EXACTLY ONE Sortable instance after many renders
//      (no stacked duplicates → silent DnD death);
//  (2) a state.order change + render must reorder cards in the DOM (sort still wired);
//  (3) the dragged-node identity survives a reorder render (cards reused, not rebuilt).
import http from 'http'; import fs from 'fs'; import path from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright-core');
const ROOT='D:/VSCode projects/DUSK_v2.0', CHROME='C:/Program Files/Google/Chrome/Application/chrome.exe';
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.jpg':'image/jpeg'};
const srv=http.createServer((q,s)=>{let u=decodeURIComponent(q.url.split('?')[0]);if(u==='/')u='/index.html';
  fs.readFile(path.join(ROOT,u),(e,d)=>{if(e){s.writeHead(404);s.end('nf');return;}s.writeHead(200,{'Content-Type':MIME[path.extname(u)]||'application/octet-stream'});s.end(d);});});
const sub=(id,t)=>({id,text:t,checked:false,priority:'none',repeat:'none',note:''});
const T=(id,txt,order)=>({id,uid:'u'+id,text:txt,checked:false,priority:'none',groupId:10,deadline:null,note:'',noteOpen:false,order,repeat:'none',cycleChecked:false,nextReset:null,subtasks:[sub(id*100+1,'s')],subtasksOpen:true});
const seed={groups:[{id:10,uid:'g10',name:'Grp',color:'#6C8EF5',collapsed:false,order:0}],archive:[],notes:[],notesArchive:[],tasks:[
  T(1,'A',0),T(2,'B',1),T(3,'C',2),
],nextId:9,nextGroupId:11,nextSubId:900,sortMode:'order',sortModeOverrides:{}};
let pass=0,fail=0; const ok=(n,c)=>{c?pass++:fail++;console.log((c?'  ok  ':' FAIL ')+n);};
(async()=>{
  await new Promise(r=>srv.listen(0,r)); const port=srv.address().port;
  const b=await chromium.launch({executablePath:CHROME,headless:true});
  const ctx=await b.newContext({viewport:{width:1180,height:900}});
  const p=await ctx.newPage(); p.on('pageerror',e=>{console.log('PAGEERR',e.message);fail++;});
  await p.addInitScript((st)=>{localStorage.setItem('duskState_v3',JSON.stringify(st));localStorage.setItem('currentPage','main');localStorage.removeItem('duskState_v4');localStorage.setItem('isFiltered','0');},seed);
  await p.goto(`http://localhost:${port}/index.html`); await p.waitForTimeout(600);

  // Render several times (each render reuses the group-body UL); rAF in setupSortables
  // must settle to exactly one instance.
  await p.evaluate(()=>{ render(); render(); render(); });
  await p.waitForTimeout(300);

  const inst=await p.evaluate(()=>{
    const ul=document.getElementById('group-list-10');
    const exp=Object.keys(ul||{}).filter(k=>k.startsWith('Sortable'));
    // Sortable stores its instance under el[Sortable.expando]; count how many such keys exist.
    const expandoKeys=Object.getOwnPropertyNames(ul).filter(k=>/Sortable/i.test(k));
    return {
      tracked: typeof sortableGroups==='object' ? Object.keys(sortableGroups).length : -1,
      has10: !!(sortableGroups && sortableGroups[10]),
      expandoCount: expandoKeys.length,
      ulPresent: !!ul,
    };
  });
  ok('group-body UL present', inst.ulPresent);
  ok('exactly ONE tracked group Sortable (no stacked dupes)', inst.tracked===1 && inst.has10);
  ok('UL carries at most one Sortable expando', inst.expandoCount<=1);

  // Snapshot DOM order, tag node #2, then reorder via state.order + render.
  await p.evaluate(()=>{
    const c2=document.querySelector('.task-item[data-id="2"]'); if(c2) c2.__pid='C2';
  });
  const before=await p.evaluate(()=>Array.from(document.querySelectorAll('#group-list-10 > .task-item')).map(e=>e.dataset.id).join(','));
  ok('initial DOM order is 1,2,3', before==='1,2,3');

  // Move task 3 to the top (order 3→-1) and re-render, as a drag would after reorderList.
  await p.evaluate(()=>{
    const t3=state.tasks.find(t=>t.id===3); t3.order=-1; render();
  });
  await p.waitForTimeout(300);
  const after=await p.evaluate(()=>({
    order:Array.from(document.querySelectorAll('#group-list-10 > .task-item')).map(e=>e.dataset.id).join(','),
    c2Same:(()=>{const c=document.querySelector('.task-item[data-id="2"]');return !!(c&&c.__pid==='C2');})(),
  }));
  ok('reorder reflected in DOM (3,1,2)', after.order==='3,1,2');
  ok('untouched card #2 kept identity through reorder render', after.c2Same);

  // And the Sortable count is still exactly one after the reorder render.
  const inst2=await p.evaluate(()=>({tracked:Object.keys(sortableGroups).length,has10:!!sortableGroups[10]}));
  ok('still exactly one tracked group Sortable after reorder', inst2.tracked===1 && inst2.has10);

  await b.close(); srv.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail?1:0);
})().catch(e=>{console.error('CRASH',e);process.exit(2);});
