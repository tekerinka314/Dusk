// Isolate: check the LAST task (stays at bottom) so the cards ABOVE it do NOT move.
// Capture the whole group across the check window. If the stationary top card / group
// frame visibly flash mid-animation → it's a paint flash (backdrop). If they're rock
// steady and only the checked card animates → the "flicker" is the checked card's own
// fade-out→reappear choreography + surviving-card reflow, not a render artifact.
import http from 'http'; import fs from 'fs'; import path from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright-core');
const ROOT='D:/VSCode projects/DUSK_v2.0', CHROME='C:/Program Files/Google/Chrome/Application/chrome.exe';
const OUT='D:/tmp/pw/iso'; fs.mkdirSync(OUT,{recursive:true});
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.jpg':'image/jpeg'};
const srv=http.createServer((q,s)=>{let u=decodeURIComponent(q.url.split('?')[0]);if(u==='/')u='/index.html';
  fs.readFile(path.join(ROOT,u),(e,d)=>{if(e){s.writeHead(404);s.end('nf');return;}s.writeHead(200,{'Content-Type':MIME[path.extname(u)]||'application/octet-stream'});s.end(d);});});
const sub=(id,t)=>({id,text:t,checked:false,priority:'none',repeat:'none',note:''});
const T=(id,txt,order)=>({id,uid:'u'+id,text:txt,checked:false,priority:'none',groupId:10,deadline:null,note:'',noteOpen:false,order,repeat:'none',cycleChecked:false,nextReset:null,subtasks:[sub(id*100+1,'s1'),sub(id*100+2,'s2')],subtasksOpen:true});
const seed={groups:[{id:10,uid:'g10',name:'Grp',color:'#6C8EF5',collapsed:false,order:0}],archive:[],notes:[],notesArchive:[],tasks:[T(1,'Alpha top',0),T(2,'Beta mid',1),T(3,'Gamma last',2)],nextId:9,nextGroupId:11,nextSubId:900,sortMode:'order',sortModeOverrides:{}};
(async()=>{
  const port=await new Promise(r=>{srv.listen(0,()=>r(srv.address().port));});
  const b=await chromium.launch({executablePath:CHROME,headless:true});
  const ctx=await b.newContext({viewport:{width:900,height:820},deviceScaleFactor:1});  // motion ON
  const p=await ctx.newPage(); p.on('pageerror',e=>console.log('PAGEERR',e.message));
  await p.addInitScript((st)=>{localStorage.setItem('duskState_v3',JSON.stringify(st));localStorage.setItem('currentPage','main');localStorage.removeItem('duskState_v4');localStorage.setItem('isFiltered','0');},seed);
  await p.goto(`http://localhost:${port}/index.html`); await p.waitForTimeout(700);
  const shoot=n=>p.locator('.group-section').first().screenshot({path:`${OUT}/${n}.png`}).catch(()=>{});
  await shoot('00_before');
  await p.evaluate(()=>toggleCheck(3));   // check LAST task → top cards stay put
  const steps=[40,40,40,40,40,40,60,80,120,200];
  let acc=0;
  for(const s of steps){ await p.waitForTimeout(s); acc+=s; await shoot(String(acc).padStart(4,'0')); }
  await b.close(); srv.close();
  console.log('iso frames in',OUT);
})().catch(e=>{console.error('CRASH',e);process.exit(2);});
