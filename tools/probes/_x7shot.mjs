import http from 'http'; import fs from 'fs'; import path from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright-core');
const ROOT='D:/VSCode projects/DUSK_1_86', CHROME='C:/Program Files/Google/Chrome/Application/chrome.exe';
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.jpg':'image/jpeg'};
const srv=http.createServer((q,s)=>{let u=decodeURIComponent(q.url.split('?')[0]);if(u==='/')u='/index.html';
  fs.readFile(path.join(ROOT,u),(e,d)=>{if(e){s.writeHead(404);s.end('nf');return;}s.writeHead(200,{'Content-Type':MIME[path.extname(u)]||'application/octet-stream'});s.end(d);});});
const seed={groups:[],archive:[],notes:[],notesArchive:[],tasks:[{id:1,text:'Конференция',groupId:null,order:0,checked:false,priority:'none',repeat:'none',subtasks:[],deadline:{mode:'weektime',value:'5|18:00',timeSet:true,durationMin:180}}],nextId:10,nextGroupId:1,nextSubId:100,sortMode:'priority',sortModeOverrides:{}};
(async()=>{
  await new Promise(r=>srv.listen(0,r)); const port=srv.address().port;
  const b=await chromium.launch({executablePath:CHROME,headless:true});
  const p=await b.newPage({viewport:{width:760,height:900},deviceScaleFactor:2});
  await p.addInitScript(([st])=>{localStorage.setItem('duskState_v3',JSON.stringify(st));localStorage.setItem('currentPage','main');},[seed]);
  await p.goto(`http://localhost:${port}/index.html`); await p.waitForTimeout(600);
  await p.evaluate(()=>{ openDeadlineModal(1); setDeadlineMode('weektime'); });
  await p.waitForTimeout(550);
  await p.screenshot({path:'D:/tmp/pw/_x7_modal_dur.png',
    clip: await p.evaluate(()=>{const m=document.querySelector('.modal-deadline').getBoundingClientRect();return{x:Math.max(0,m.left-8),y:Math.max(0,m.top-8),width:m.width+16,height:m.height+16};})});
  await b.close(); srv.close(); console.log('shot done');
})().catch(e=>{console.error('CRASH',e);process.exit(2);});
