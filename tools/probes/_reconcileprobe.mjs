// Bug B proof: on toggleCheck of ONE task, every OTHER card, its subtask-section,
// and the group frame must stay the SAME node AND never be detached (0 removals).
import http from 'http'; import fs from 'fs'; import path from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright-core');
const ROOT='D:/VSCode projects/DUSK_v2.0', CHROME='C:/Program Files/Google/Chrome/Application/chrome.exe';
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.jpg':'image/jpeg'};
const srv=http.createServer((q,s)=>{let u=decodeURIComponent(q.url.split('?')[0]);if(u==='/')u='/index.html';
  fs.readFile(path.join(ROOT,u),(e,d)=>{if(e){s.writeHead(404);s.end('nf');return;}s.writeHead(200,{'Content-Type':MIME[path.extname(u)]||'application/octet-stream'});s.end(d);});});
const sub=(id,t)=>({id,text:t,checked:false,priority:'none',repeat:'none',note:''});
const seed={groups:[{id:10,uid:'g10',name:'Grp',color:'#6C8EF5',collapsed:false,order:0}],archive:[],notes:[],notesArchive:[],tasks:[
  {id:1,uid:'u1',text:'A',checked:false,priority:'none',groupId:10,deadline:null,note:'',noteOpen:false,order:0,repeat:'none',cycleChecked:false,nextReset:null,subtasks:[sub(101,'alpha'),sub(102,'beta')],subtasksOpen:true},
  {id:2,uid:'u2',text:'B',checked:false,priority:'none',groupId:10,deadline:null,note:'',noteOpen:false,order:1,repeat:'none',cycleChecked:false,nextReset:null,subtasks:[sub(201,'gamma'),sub(202,'delta')],subtasksOpen:true},
  {id:3,uid:'u3',text:'C',checked:false,priority:'none',groupId:10,deadline:null,note:'',noteOpen:false,order:2,repeat:'none',cycleChecked:false,nextReset:null,subtasks:[sub(301,'eps')],subtasksOpen:true},
  // an ungrouped pair too
  {id:4,uid:'u4',text:'U1',checked:false,priority:'none',groupId:null,deadline:null,note:'',noteOpen:false,order:0,repeat:'none',cycleChecked:false,nextReset:null,subtasks:[sub(401,'z')],subtasksOpen:true},
  {id:5,uid:'u5',text:'U2',checked:false,priority:'none',groupId:null,deadline:null,note:'',noteOpen:false,order:1,repeat:'none',cycleChecked:false,nextReset:null,subtasks:[],subtasksOpen:false},
],nextId:9,nextGroupId:11,nextSubId:500,sortMode:'order',sortModeOverrides:{}};
let pass=0,fail=0; const ok=(n,c)=>{c?pass++:fail++;console.log((c?'  ok  ':' FAIL ')+n);};
(async()=>{
  await new Promise(r=>srv.listen(0,r)); const port=srv.address().port;
  const b=await chromium.launch({executablePath:CHROME,headless:true});
  const ctx=await b.newContext({viewport:{width:1180,height:900}});
  const p=await ctx.newPage(); p.on('pageerror',e=>{console.log('PAGEERR',e.message);fail++;});
  // filter OFF so checked task stays visible (moves to bottom) — exercises move, not removal
  await p.addInitScript((st)=>{localStorage.setItem('duskState_v3',JSON.stringify(st));localStorage.setItem('currentPage','main');localStorage.removeItem('duskState_v4');localStorage.setItem('isFiltered','0');},seed);
  await p.goto(`http://localhost:${port}/index.html`); await p.waitForTimeout(600);

  // Tag the nodes that must survive untouched when we check task #1.
  await p.evaluate(()=>{
    const tag=(sel,id)=>{const el=document.querySelector(sel); if(el) el.__pid=id; return !!el;};
    window.__tagged={
      sec:    tag('.group-section[data-group-id="10"]','SEC'),
      card2:  tag('.task-item[data-id="2"]','C2'),
      sub2:   tag('#sub-section-2','S2'),
      card3:  tag('.task-item[data-id="3"]','C3'),
      ungA:   tag('.task-item[data-id="5"]','UA'),     // ungrouped sibling
    };
    // Observe ALL removals anywhere in the two containers.
    window.__removed=[];
    const obs=new MutationObserver(muts=>{muts.forEach(m=>{m.removedNodes.forEach(n=>{
      if(n.nodeType===1) window.__removed.push((n.__pid||'')+ ':' + n.tagName.toLowerCase()+'.'+String(n.className).split(' ')[0]);
    });});});
    obs.observe(document.getElementById('groups-container'),{childList:true,subtree:true});
    obs.observe(document.getElementById('list-container'),{childList:true,subtree:true});
  });

  await p.evaluate(()=>toggleCheck(1));
  await p.waitForTimeout(700);

  const r=await p.evaluate(()=>{
    const same=(sel,id)=>{const el=document.querySelector(sel); return !!(el&&el.__pid===id);};
    // Did any TAGGED node get removed? (identity loss via detach)
    const taggedRemoved=window.__removed.filter(x=>x.startsWith('SEC:')||x.startsWith('C2:')||x.startsWith('S2:')||x.startsWith('C3:')||x.startsWith('UA:'));
    return {
      secSame:  same('.group-section[data-group-id="10"]','SEC'),
      card2Same:same('.task-item[data-id="2"]','C2'),
      sub2Same: same('#sub-section-2','S2'),
      card3Same:same('.task-item[data-id="3"]','C3'),
      ungASame: same('.task-item[data-id="5"]','UA'),
      taggedRemoved,
      allRemoved: window.__removed,
      task1Checked: !!document.querySelector('.task-item[data-id="1"]').className.match(/checked/),
    };
  });
  ok('group frame is the SAME node after check (no frame flash)', r.secSame);
  ok('sibling card #2 is the SAME node', r.card2Same);
  ok('sibling card #2 subtask-section is the SAME node', r.sub2Same);
  ok('sibling card #3 is the SAME node', r.card3Same);
  ok('ungrouped sibling card #5 is the SAME node', r.ungASame);
  ok('NO tagged (unchanged) node was ever detached', r.taggedRemoved.length===0);
  ok('checked task #1 actually got .checked', r.task1Checked);
  console.log('  (removals seen in containers:', JSON.stringify(r.allRemoved)+')');

  // Second pass: UNCHECK restores #1; siblings still must not be torn down.
  await p.evaluate(()=>{window.__removed.length=0;});
  await p.evaluate(()=>toggleCheck(1));
  await p.waitForTimeout(700);
  const r2=await p.evaluate(()=>{
    const same=(sel,id)=>{const el=document.querySelector(sel); return !!(el&&el.__pid===id);};
    const taggedRemoved=window.__removed.filter(x=>x.startsWith('SEC:')||x.startsWith('C2:')||x.startsWith('S2:')||x.startsWith('C3:')||x.startsWith('UA:'));
    return {secSame:same('.group-section[data-group-id="10"]','SEC'),card2Same:same('.task-item[data-id="2"]','C2'),sub2Same:same('#sub-section-2','S2'),taggedRemoved,allRemoved:window.__removed};
  });
  ok('uncheck: group frame still SAME node', r2.secSame);
  ok('uncheck: sibling card #2 still SAME node', r2.card2Same);
  ok('uncheck: sibling #2 subtask-section still SAME node', r2.sub2Same);
  ok('uncheck: NO tagged node detached', r2.taggedRemoved.length===0);
  console.log('  (removals on uncheck:', JSON.stringify(r2.allRemoved)+')');

  await b.close(); srv.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail?1:0);
})().catch(e=>{console.error('CRASH',e);process.exit(2);});
