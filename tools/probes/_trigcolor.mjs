import http from 'http'; import fs from 'fs'; import path from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright-core');
const ROOT='D:/VSCode projects/DUSK_1_86', CHROME='C:/Program Files/Google/Chrome/Application/chrome.exe';
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.jpg':'image/jpeg'};
const srv=http.createServer((q,s)=>{let u=decodeURIComponent(q.url.split('?')[0]);if(u==='/')u='/index.html';
  fs.readFile(path.join(ROOT,u),(e,d)=>{if(e){s.writeHead(404);s.end('nf');return;}s.writeHead(200,{'Content-Type':MIME[path.extname(u)]||'application/octet-stream'});s.end(d);});});
const seed={groups:[],archive:[],notes:[],notesArchive:[],tasks:[{id:1,text:'T',groupId:null,order:0,checked:false,priority:'none',repeat:'none',subtasks:[]}],nextId:10,nextGroupId:1,nextSubId:100,sortMode:'priority',sortModeOverrides:{}};
(async()=>{
  await new Promise(r=>srv.listen(0,r)); const port=srv.address().port;
  const b=await chromium.launch({executablePath:CHROME,headless:true});
  const p=await b.newPage({viewport:{width:1100,height:900},deviceScaleFactor:2});
  await p.addInitScript(([st])=>{localStorage.setItem('duskState_v3',JSON.stringify(st));localStorage.setItem('currentPage','main');},[seed]);
  await p.goto(`http://localhost:${port}/index.html`); await p.waitForTimeout(600);
  const r=await p.evaluate(()=>{
    openDeadlineModal(1); setDeadlineMode('weektime');
    const wd=document.querySelector('#deadline-modal .dl-weekday-picker .dl-month-trigger') || document.querySelector('#deadline-modal .dl-month-trigger');
    const rest=getComputedStyle(wd).color;
    // emulate hover via :hover is hard headless → read the rule instead
    return { found:!!wd, rest };
  });
  console.log('trigger found:', r.found, 'rest color:', r.rest, '(text-secondary #b880e8 = rgb(184,128,232))');
  await b.close(); srv.close();
})().catch(e=>{console.error(e);process.exit(2);});
