// Find the TRUE flicker source: on toggleCheck(1), log EVERY animationstart and
// transitionstart in the list, tagged with which task card it belongs to and whether
// the element is a subtask thing. Run with motion ON, filter OFF and filter ON.
import http from 'http'; import fs from 'fs'; import path from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright-core');
const ROOT='D:/VSCode projects/DUSK_v2.0', CHROME='C:/Program Files/Google/Chrome/Application/chrome.exe';
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.jpg':'image/jpeg'};
const srv=http.createServer((q,s)=>{let u=decodeURIComponent(q.url.split('?')[0]);if(u==='/')u='/index.html';
  fs.readFile(path.join(ROOT,u),(e,d)=>{if(e){s.writeHead(404);s.end('nf');return;}s.writeHead(200,{'Content-Type':MIME[path.extname(u)]||'application/octet-stream'});s.end(d);});});
const sub=(id,t)=>({id,text:t,checked:false,priority:'none',repeat:'none',note:''});
const T=(id,txt,order)=>({id,uid:'u'+id,text:txt,checked:false,priority:'none',groupId:10,deadline:null,note:'',noteOpen:false,order,repeat:'none',cycleChecked:false,nextReset:null,subtasks:[sub(id*100+1,'s1'),sub(id*100+2,'s2')],subtasksOpen:true});
const seed={groups:[{id:10,uid:'g10',name:'Grp',color:'#6C8EF5',collapsed:false,order:0}],archive:[],notes:[],notesArchive:[],tasks:[T(1,'A',0),T(2,'B',1),T(3,'C',2)],nextId:9,nextGroupId:11,nextSubId:900,sortMode:'order',sortModeOverrides:{}};

async function run(filterOn){
  const port=await new Promise(r=>{srv.listen(0,()=>r(srv.address().port));});
  const b=await chromium.launch({executablePath:CHROME,headless:true});
  const ctx=await b.newContext({viewport:{width:1180,height:900}});  // motion ON
  const p=await ctx.newPage(); p.on('pageerror',e=>console.log('PAGEERR',e.message));
  await p.addInitScript((st,fo)=>{localStorage.setItem('duskState_v3',JSON.stringify(st));localStorage.setItem('currentPage','main');localStorage.removeItem('duskState_v4');localStorage.setItem('isFiltered',fo?'1':'0');},seed,filterOn);
  await p.goto(`http://localhost:${port}/index.html`); await p.waitForTimeout(600);
  await p.evaluate(()=>{
    window.__ev=[];
    const tag=el=>{
      if(!el||!el.closest) return '?';
      const card=el.closest('.task-item');
      const cid=card?card.dataset.id:'-';
      const isSub = !!el.closest('.subtask-section');
      const cls=(el.className&&el.className.baseVal===undefined)?String(el.className).split(' ')[0]:el.tagName;
      return `card${cid}${isSub?'/SUB':''} <${el.tagName.toLowerCase()}.${cls}>`;
    };
    const root=document;
    root.addEventListener('animationstart',e=>{ if(e.target.closest&&e.target.closest('#groups-container,#list-container')) window.__ev.push('ANIM '+e.animationName+' @ '+tag(e.target)); },true);
    root.addEventListener('transitionstart',e=>{ if(e.target.closest&&e.target.closest('#groups-container,#list-container')) window.__ev.push('TRANS '+e.propertyName+' @ '+tag(e.target)); },true);
    // mark sibling subtask-section #2 identity
    const s2=document.getElementById('sub-section-2'); if(s2) s2.__pid='S2';
    const c2=document.querySelector('.task-item[data-id="2"]'); if(c2) c2.__pid='C2';
  });
  await p.evaluate(()=>toggleCheck(1));
  await p.waitForTimeout(1000);
  const out=await p.evaluate(()=>({
    ev:window.__ev,
    s2Same:(()=>{const s=document.getElementById('sub-section-2');return !!(s&&s.__pid==='S2');})(),
    c2Same:(()=>{const c=document.querySelector('.task-item[data-id="2"]');return !!(c&&c.__pid==='C2');})(),
  }));
  await b.close();
  console.log(`\n===== filter ${filterOn?'ON':'OFF'} =====`);
  console.log('sibling card2 same node:', out.c2Same, '| sibling sub-section2 same node:', out.s2Same);
  console.log('animations/transitions during check:');
  if(!out.ev.length) console.log('   (none)');
  out.ev.forEach(l=>console.log('   '+l));
}
(async()=>{
  await run(false);
  await run(true);
  srv.close();
  process.exit(0);
})().catch(e=>{console.error('CRASH',e);process.exit(2);});
