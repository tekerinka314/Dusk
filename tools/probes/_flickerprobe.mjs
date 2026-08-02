// Diagnose the visible flicker on check: capture which transitions/animations fire
// and which DOM nodes are added/removed during a toggleCheck, for groups + subtasks.
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
  {id:2,uid:'u2',text:'B',checked:false,priority:'none',groupId:10,deadline:null,note:'',noteOpen:false,order:1,repeat:'none',cycleChecked:false,nextReset:null,subtasks:[sub(201,'gamma')],subtasksOpen:true},
],nextId:9,nextGroupId:11,nextSubId:300,sortMode:'priority',sortModeOverrides:{}};
(async()=>{
  await new Promise(r=>srv.listen(0,r)); const port=srv.address().port;
  const b=await chromium.launch({executablePath:CHROME,headless:true});
  // motion ON (default) so we see real animations/transitions
  const ctx=await b.newContext({viewport:{width:1180,height:900}});
  const p=await ctx.newPage(); p.on('pageerror',e=>console.log('PAGEERR',e.message));
  await p.addInitScript((st)=>{localStorage.setItem('duskState_v3',JSON.stringify(st));localStorage.setItem('currentPage','main');localStorage.removeItem('duskState_v4');localStorage.setItem('isFiltered','0');},seed);
  await p.goto(`http://localhost:${port}/index.html`); await p.waitForTimeout(600);

  // install probes
  await p.evaluate(()=>{
    window.__log=[];
    const desc=el=>{ if(!el||!el.tagName) return String(el); return el.tagName.toLowerCase()+(el.id?('#'+el.id):'')+(el.className&&el.className.baseVal===undefined?('.'+String(el.className).split(' ').slice(0,2).join('.')):''); };
    document.addEventListener('transitionstart',e=>{ if(e.target.closest&&e.target.closest('#groups-container, #list-container')) window.__log.push('TRANSITION '+e.propertyName+' on '+desc(e.target)); }, true);
    document.addEventListener('animationstart',e=>{ if(e.target.closest&&e.target.closest('#groups-container, #list-container')) window.__log.push('ANIM '+e.animationName+' on '+desc(e.target)); }, true);
    const gc=document.getElementById('groups-container')||document.querySelector('.group-section')?.parentElement;
    window.__mo=new MutationObserver(muts=>{
      let added=0,removed=0,attr=0;
      muts.forEach(m=>{ if(m.type==='childList'){added+=m.addedNodes.length;removed+=m.removedNodes.length;} else if(m.type==='attributes') attr++; });
      window.__log.push(`MUT +${added} -${removed} attr${attr}`);
    });
    if(gc) window.__mo.observe(gc,{childList:true,subtree:true,attributes:true,attributeFilter:['class','style']});
  });

  // identity of group-body + a subtask-item before check
  await p.evaluate(()=>{ const gb=document.getElementById('group-list-10'); if(gb)gb.__id='GB'; const si=document.querySelector('.subtask-item[data-sid="201"]'); if(si)si.__id='SI'; });
  await p.evaluate(()=>{ window.__log.push('--- toggleCheck(1) ---'); toggleCheck(1); });
  await p.waitForTimeout(900);
  const out=await p.evaluate(()=>{
    const gb=document.getElementById('group-list-10');
    const si=document.querySelector('.subtask-item[data-sid="201"]');
    return { log: window.__log, gbSame: !!(gb&&gb.__id==='GB'), siSame: !!(si&&si.__id==='SI') };
  });
  console.log('group-body same node after check?', out.gbSame);
  console.log('subtask(201) same node after check?', out.siSame);
  console.log('--- event/mutation log ---');
  out.log.slice(0,60).forEach(l=>console.log('  '+l));
  await b.close(); srv.close();
})().catch(e=>{console.error('CRASH',e);process.exit(2);});
