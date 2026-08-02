// Bug B: checking/unchecking a task must NOT rebuild subtask sections of tasks that
// stay visible. Proof = node identity: a JS marker on a live .subtask-section only
// survives a render if the node was REUSED (not rebuilt).
// Default filter is "show only incomplete" (isFiltered=true) → a checked task is
// hidden; the win there is OTHER tasks' sections not rebuilding. With the filter OFF
// the checked task stays → its OWN section is reused too.
import http from 'http'; import fs from 'fs'; import path from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright-core');
const ROOT='D:/VSCode projects/DUSK_v2.0', CHROME='C:/Program Files/Google/Chrome/Application/chrome.exe';
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.jpg':'image/jpeg'};
const srv=http.createServer((q,s)=>{let u=decodeURIComponent(q.url.split('?')[0]);if(u==='/')u='/index.html';
  fs.readFile(path.join(ROOT,u),(e,d)=>{if(e){s.writeHead(404);s.end('nf');return;}s.writeHead(200,{'Content-Type':MIME[path.extname(u)]||'application/octet-stream'});s.end(d);});});
const sub=(id,t,extra={})=>({id,text:t,checked:false,priority:'none',repeat:'none',note:'',noteOpen:false,...extra});
const seed={groups:[],archive:[],notes:[],notesArchive:[],tasks:[
  {id:1,uid:'u1',text:'A',checked:false,priority:'none',groupId:null,deadline:null,note:'',noteOpen:false,order:0,repeat:'none',cycleChecked:false,nextReset:null,subtasks:[sub(101,'alpha'),sub(102,'beta',{note:'n'})],subtasksOpen:true},
  {id:2,uid:'u2',text:'B',checked:false,priority:'none',groupId:null,deadline:null,note:'',noteOpen:false,order:1,repeat:'none',cycleChecked:false,nextReset:null,subtasks:[sub(201,'gamma')],subtasksOpen:true},
],nextId:9,nextGroupId:9,nextSubId:300,sortMode:'priority',sortModeOverrides:{}};
let pass=0,fail=0; const rec=(n,p,d)=>{p?pass++:fail++;console.log(`${p?'PASS':'FAIL'}  ${n}  ${d!==undefined?d:''}`);};
(async()=>{
  await new Promise(r=>srv.listen(0,r)); const port=srv.address().port;
  const b=await chromium.launch({executablePath:CHROME,headless:true});
  const ctx=await b.newContext({viewport:{width:1180,height:900},reducedMotion:'reduce'});
  const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.addInitScript((st)=>{localStorage.setItem('duskState_v3',JSON.stringify(st));localStorage.setItem('currentPage','main');localStorage.removeItem('duskState_v4');localStorage.removeItem('dusk_premigration_v3');},seed);
  await p.goto(`http://localhost:${port}/index.html`); await p.waitForTimeout(500);

  const exists=(id)=>p.evaluate(i=>!!document.getElementById(i),id);
  const subCount=(tid)=>p.evaluate(t=>{const ul=document.getElementById('sub-list-'+t);return ul?ul.querySelectorAll('.subtask-item').length:-1;},tid);
  const mark=(id)=>p.evaluate(i=>{const e=document.getElementById(i);if(!e)return false;e.__reuseMark='KEEP';return true;},id);
  const marked=(id)=>p.evaluate(i=>{const e=document.getElementById(i);return !!e&&e.__reuseMark==='KEEP';},id);
  const setFilter=(on)=>p.evaluate(v=>{isFiltered=v;render();},on);
  // mark/check the whole CARD <li> by task id
  const markLi=(tid)=>p.evaluate(t=>{const li=document.querySelector('.task-item[data-id="'+t+'"]');if(!li)return false;li.__cardMark='CARD';return true;},tid);
  const markedLi=(tid)=>p.evaluate(t=>{const li=document.querySelector('.task-item[data-id="'+t+'"]');return !!li&&li.__cardMark==='CARD';},tid);

  rec('baseline both sections exist', await exists('sub-section-1') && await exists('sub-section-2'));

  // ── Whole-card reuse: checking one task must NOT redraw OTHER cards at all ──
  await markLi(2);
  await p.evaluate(()=>render());
  rec('C1 plain render() reuses whole card 2', await markedLi(2));
  await markLi(2);
  await p.evaluate(()=>toggleCheck(1)); await p.waitForTimeout(600);
  rec('C2 check task 1 → card 2 untouched (same <li>)', await markedLi(2));
  await p.evaluate(()=>toggleCheck(1)); await p.waitForTimeout(600); // restore

  // T1: plain re-render reuses (no data change)
  await mark('sub-section-1');
  await p.evaluate(()=>render());
  rec('T1 plain render() reuses section', await marked('sub-section-1'));

  // ── Filter ON (default): checking task 1 hides it, but task 2's section must be REUSED ──
  await mark('sub-section-2');
  await p.evaluate(()=>toggleCheck(1)); await p.waitForTimeout(600);
  rec('T2 [filter on] checked task 1 hidden', !(await exists('sub-section-1')));
  rec('T2 [filter on] OTHER task 2 section REUSED (no rebuild)', await marked('sub-section-2'));
  rec('T2 task 2 subtasks intact (1)', await subCount(2)===1, String(await subCount(2)));
  await p.evaluate(()=>toggleCheck(1)); await p.waitForTimeout(600); // uncheck restore
  rec('T2 uncheck restores task 1', await exists('sub-section-1'));

  // ── Filter OFF: checked task stays → its OWN section reused ──
  await setFilter(false); await p.waitForTimeout(100);
  await mark('sub-section-1');
  await p.evaluate(()=>toggleCheck(1)); await p.waitForTimeout(600);
  rec('T3 [filter off] checked task stays visible', await exists('sub-section-1'));
  rec('T3 [filter off] checked task OWN section REUSED', await marked('sub-section-1'));
  rec('T3 task 1 is checked', await p.evaluate(()=>!!state.tasks.find(t=>t.id===1).checked));
  rec('T3 subtasks intact (2)', await subCount(1)===2, String(await subCount(1)));

  // T4: ephemeral DOM (.note-open on a sub-note-wrapper) survives reuse across check
  await p.evaluate(()=>toggleCheck(1)); await p.waitForTimeout(600); // uncheck first
  await p.evaluate(()=>{const w=document.getElementById('subnote-1-102');if(w)w.classList.add('note-open');});
  await mark('sub-section-1');
  await p.evaluate(()=>toggleCheck(1)); await p.waitForTimeout(600);
  rec('T4 ephemeral .note-open preserved on reuse',
      await p.evaluate(()=>{const w=document.getElementById('subnote-1-102');return !!w&&w.classList.contains('note-open');}));

  // T5: a real subtask DATA change forces a REBUILD (correctness — never stale reuse)
  await mark('sub-section-1');
  await p.evaluate(()=>{state.tasks.find(t=>t.id===1).subtasks[0].text='CHANGED';render();});
  rec('T5 subtask text change → section rebuilt (marker GONE)', !(await marked('sub-section-1')));
  rec('T5 new text rendered', await p.evaluate(()=>{const ul=document.getElementById('sub-list-1');return ul?ul.textContent.includes('CHANGED'):false;}));

  // T6: DnD Sortable re-attached to the reused/rebuilt UL (wait for setupSortables rAF)
  await p.waitForTimeout(120);
  rec('T6 sub Sortable present for task 1', await p.evaluate(()=>typeof sortableSubs!=='undefined' && !!sortableSubs[1]));

  rec('no pageerror', errs.length===0, errs.join(' | '));
  await b.close(); srv.close();
  console.log(`\nSUB-REUSE SUMMARY  PASS ${pass}  FAIL ${fail}`);
  process.exit(fail?1:0);
})().catch(e=>{console.error('CRASH',e);process.exit(2);});
