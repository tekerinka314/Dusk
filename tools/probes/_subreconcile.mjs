// Bug B for SUBTASKS: checking ONE subtask must not tear down the sibling subtask rows.
// Prove identity + zero detach of sibling .subtask-item nodes, in normal sub-grid AND
// split (active/done) sub-zones.
import http from 'http'; import fs from 'fs'; import path from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright-core');
const ROOT='D:/VSCode projects/DUSK_v2.0', CHROME='C:/Program Files/Google/Chrome/Application/chrome.exe';
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.jpg':'image/jpeg'};
const srv=http.createServer((q,s)=>{let u=decodeURIComponent(q.url.split('?')[0]);if(u==='/')u='/index.html';
  fs.readFile(path.join(ROOT,u),(e,d)=>{if(e){s.writeHead(404);s.end('nf');return;}s.writeHead(200,{'Content-Type':MIME[path.extname(u)]||'application/octet-stream'});s.end(d);});});
const sub=(id,t,c)=>({id,text:t,checked:!!c,priority:'none',repeat:'none',note:'',order:id});
const seed={groups:[],archive:[],notes:[],notesArchive:[],tasks:[
  {id:1,uid:'u1',text:'Parent',checked:false,priority:'none',groupId:null,deadline:null,note:'',noteOpen:false,order:0,repeat:'none',cycleChecked:false,nextReset:null,subtasksOpen:true,
   subtasks:[sub(101,'alpha',false),sub(102,'beta',false),sub(103,'gamma',false),sub(104,'delta-done',true)]},
],nextId:9,nextGroupId:11,nextSubId:200,sortMode:'order',sortModeOverrides:{}};
let pass=0,fail=0; const ok=(n,c)=>{c?pass++:fail++;console.log((c?'  ok  ':' FAIL ')+n);};

async function scenario(label, splitMode, port){
  const b=await chromium.launch({executablePath:CHROME,headless:true});
  const ctx=await b.newContext({viewport:{width:1180,height:900}});
  const p=await ctx.newPage(); p.on('pageerror',e=>{console.log('PAGEERR',e.message);fail++;});
  await p.addInitScript((st,sm)=>{localStorage.setItem('duskState_v3',JSON.stringify(st));localStorage.setItem('currentPage','main');localStorage.removeItem('duskState_v4');localStorage.setItem('isFiltered','0');localStorage.setItem('groupSplitMode',sm?'1':'0');},seed,splitMode);
  await p.goto(`http://localhost:${port}/index.html`); await p.waitForTimeout(700);
  console.log(`\n=== ${label} ===`);

  const pre=await p.evaluate(()=>({n:document.querySelectorAll('#sub-list-1 .subtask-item').length}));
  ok(`${label}: subtask rows present`, pre.n===4);

  await p.evaluate(()=>{
    const tag=(sid,id)=>{const el=document.querySelector(`.subtask-item[data-sid="${sid}"]`); if(el) el.__pid=id; return !!el;};
    tag(102,'S102'); tag(103,'S103'); tag(104,'S104');
    const sec=document.getElementById('sub-section-1'); if(sec) sec.__pid='SEC';
    window.__removed=[];
    const obs=new MutationObserver(muts=>{muts.forEach(m=>m.removedNodes.forEach(n=>{if(n.nodeType===1&&n.__pid)window.__removed.push(n.__pid);}));});
    obs.observe(document.getElementById('sub-section-1'),{childList:true,subtree:true});
  });

  await p.evaluate(()=>toggleSubtask(1,101));   // check sibling 101
  await p.waitForTimeout(500);

  const r=await p.evaluate(()=>{
    const same=(sid,id)=>{const el=document.querySelector(`.subtask-item[data-sid="${sid}"]`); return !!(el&&el.__pid===id);};
    return {
      s102:same(102,'S102'), s103:same(103,'S103'), s104:same(104,'S104'),
      secSame:(()=>{const s=document.getElementById('sub-section-1');return !!(s&&s.__pid==='SEC');})(),
      removed:window.__removed.slice(),
      s101Checked:!!document.querySelector('.subtask-item[data-sid="101"]')?.className.match(/checked/),
    };
  });
  ok(`${label}: sibling row 102 SAME node`, r.s102);
  ok(`${label}: sibling row 103 SAME node`, r.s103);
  ok(`${label}: pre-done row 104 SAME node`, r.s104);
  ok(`${label}: subtask-section frame SAME node`, r.secSame);
  ok(`${label}: NO tagged sibling row detached`, r.removed.filter(x=>x!=='S101').length===0);
  ok(`${label}: checked subtask 101 got .checked`, r.s101Checked);
  console.log('  (removed:', JSON.stringify(r.removed)+')');

  // hover-listener stacking guard: re-render many times, ensure 101's siblings keep ONE binding
  await p.evaluate(()=>{ for(let i=0;i<5;i++) renderSubList(1); });
  const bound=await p.evaluate(()=>{
    const el=document.querySelector('.subtask-item[data-sid="102"]');
    return el?el._hoverBound===true:false;
  });
  ok(`${label}: hover listener bound once (no stacking flag)`, bound);

  await b.close();
}
(async()=>{
  const port=await new Promise(r=>{srv.listen(0,()=>r(srv.address().port));});
  await scenario('normal sub-grid', false, port);
  await scenario('split sub-zones', true, port);
  srv.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail?1:0);
})().catch(e=>{console.error('CRASH',e);process.exit(2);});
