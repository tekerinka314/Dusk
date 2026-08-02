import http from 'http'; import fs from 'fs'; import path from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright-core');
const ROOT='D:/VSCode projects/DUSK_v2.0', CHROME='C:/Program Files/Google/Chrome/Application/chrome.exe';
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.jpg':'image/jpeg'};
const srv=http.createServer((q,s)=>{let u=decodeURIComponent(q.url.split('?')[0]);if(u==='/')u='/index.html';
  fs.readFile(path.join(ROOT,u),(e,d)=>{if(e){s.writeHead(404);s.end('nf');return;}s.writeHead(200,{'Content-Type':MIME[path.extname(u)]||'application/octet-stream'});s.end(d);});});
const sub=(id,t)=>({id,text:t,checked:false,priority:'none',repeat:'none',note:''});
const seed={groups:[],archive:[],notes:[],notesArchive:[],tasks:[
  {id:1,uid:'u1',text:'A',checked:false,priority:'none',groupId:null,deadline:null,note:'',noteOpen:false,order:0,repeat:'none',cycleChecked:false,nextReset:null,subtasks:[sub(101,'alpha'),sub(102,'beta')],subtasksOpen:true},
  {id:2,uid:'u2',text:'B',checked:false,priority:'none',groupId:null,deadline:null,note:'',noteOpen:false,order:1,repeat:'none',cycleChecked:false,nextReset:null,subtasks:[sub(201,'gamma')],subtasksOpen:true},
],nextId:9,nextGroupId:9,nextSubId:300,sortMode:'priority',sortModeOverrides:{}};
(async()=>{
  await new Promise(r=>srv.listen(0,r)); const port=srv.address().port;
  const b=await chromium.launch({executablePath:CHROME,headless:true});
  const ctx=await b.newContext({viewport:{width:1180,height:900},reducedMotion:'reduce'});
  const p=await ctx.newPage(); p.on('pageerror',e=>console.log('PAGEERR',e.message));
  await p.addInitScript((st)=>{localStorage.setItem('duskState_v3',JSON.stringify(st));localStorage.setItem('currentPage','main');localStorage.removeItem('duskState_v4');},seed);
  await p.goto(`http://localhost:${port}/index.html`); await p.waitForTimeout(500);
  // mark + record cached sig vs fresh sig for task 1
  const pre=await p.evaluate(()=>{
    const sec=document.getElementById('sub-section-1'); sec.__reuseMark='KEEP';
    const fresh=buildSubtaskSection(state.tasks.find(t=>t.id===1), undefined);
    return { cachedSig: sec._subSig ? sec._subSig.length : null, freshLen: fresh.length, equalNow: sec._subSig===fresh };
  });
  console.log('PRE (unchecked):', JSON.stringify(pre));
  await p.evaluate(()=>toggleCheck(1)); await p.waitForTimeout(700);
  const post=await p.evaluate(()=>{
    const li=document.querySelector('.task-item[data-id="1"]');
    const sec=document.getElementById('sub-section-1');
    const fresh=buildSubtaskSection(state.tasks.find(t=>t.id===1), undefined);
    return {
      liExists: !!li, liChecked: li?li.classList.contains('checked'):null,
      secExists: !!sec, marker: !!(sec&&sec.__reuseMark==='KEEP'),
      secSigLen: sec&&sec._subSig?sec._subSig.length:null,
      freshLen: fresh.length,
      sigEqualsFresh: sec? sec._subSig===fresh : null,
    };
  });
  console.log('POST (checked):', JSON.stringify(post,null,2));
  await b.close(); srv.close();
})().catch(e=>{console.error('CRASH',e);process.exit(2);});
