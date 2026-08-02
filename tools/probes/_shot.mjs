import http from 'http'; import fs from 'fs'; import path from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright-core');
const ROOT='D:/VSCode projects/DUSK_v2.0', CHROME='C:/Program Files/Google/Chrome/Application/chrome.exe';
const OUT='D:/tmp/pw/shots';
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.jpg':'image/jpeg'};
const srv=http.createServer((q,s)=>{let u=decodeURIComponent(q.url.split('?')[0]);if(u==='/')u='/index.html';
  fs.readFile(path.join(ROOT,u),(e,d)=>{if(e){s.writeHead(404);s.end('nf');return;}s.writeHead(200,{'Content-Type':MIME[path.extname(u)]||'application/octet-stream'});s.end(d);});});
const sub=(id,t)=>({id,text:t,checked:false,priority:'none',repeat:'none',note:''});
const seed={groups:[{id:10,uid:'g10',name:'Группа Тьмы',color:'#8C5CFF',collapsed:false,order:0}],archive:[],notes:[],notesArchive:[],tasks:[
  {id:1,uid:'u1',text:'Задача один',checked:false,priority:'high',groupId:10,deadline:null,note:'',noteOpen:false,order:0,repeat:'none',cycleChecked:false,nextReset:null,subtasks:[sub(101,'альфа'),sub(102,'бета')],subtasksOpen:true},
  {id:2,uid:'u2',text:'Задача два',checked:false,priority:'none',groupId:10,deadline:null,note:'',noteOpen:false,order:1,repeat:'none',cycleChecked:false,nextReset:null,subtasks:[sub(201,'гамма'),sub(202,'дельта')],subtasksOpen:true},
],nextId:9,nextGroupId:11,nextSubId:300,sortMode:'priority',sortModeOverrides:{}};
(async()=>{
  fs.mkdirSync(OUT,{recursive:true});
  await new Promise(r=>srv.listen(0,r)); const port=srv.address().port;
  const b=await chromium.launch({executablePath:CHROME,headless:true});
  const ctx=await b.newContext({viewport:{width:900,height:800},deviceScaleFactor:1});
  const p=await ctx.newPage();
  await p.addInitScript((st)=>{localStorage.setItem('duskState_v3',JSON.stringify(st));localStorage.setItem('currentPage','main');localStorage.removeItem('duskState_v4');localStorage.setItem('isFiltered','0');},seed);
  await p.goto(`http://localhost:${port}/index.html`); await p.waitForTimeout(700);
  const shoot=(n)=>p.locator('.group-section').first().screenshot({path:`${OUT}/${n}.png`}).catch(()=>{});
  await shoot('0_before');
  await p.evaluate(()=>toggleCheck(1));
  // dense frames across seal(~260ms)+rebuild+settle
  const steps=[60,60,60,60,30,20,20,20,40,80,120,200];
  let acc=0;
  for (let i=0;i<steps.length;i++){ await p.waitForTimeout(steps[i]); acc+=steps[i]; await shoot(String(acc).padStart(4,'0')); }
  await b.close(); srv.close();
  console.log('shots in',OUT);
})().catch(e=>{console.error('CRASH',e);process.exit(2);});
