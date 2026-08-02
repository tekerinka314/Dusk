import http from 'http'; import fs from 'fs'; import path from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright-core');
const ROOT='D:/VSCode projects/DUSK_1_86', CHROME='C:/Program Files/Google/Chrome/Application/chrome.exe';
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.jpg':'image/jpeg'};
const srv=http.createServer((q,s)=>{let u=decodeURIComponent(q.url.split('?')[0]);if(u==='/')u='/index.html';
  fs.readFile(path.join(ROOT,u),(e,d)=>{if(e){s.writeHead(404);s.end('nf');return;}s.writeHead(200,{'Content-Type':MIME[path.extname(u)]||'application/octet-stream'});s.end(d);});});
const seed={groups:[],archive:[],notes:[],notesArchive:[],tasks:[{id:1,text:'Конференция',groupId:null,order:0,checked:false,priority:'none',repeat:'none',subtasks:[]}],nextId:10,nextGroupId:1,nextSubId:100,sortMode:'priority',sortModeOverrides:{}};
let pass=0,fail=0; const rec=(n,p,d)=>{p?pass++:fail++;console.log(`${p?'PASS':'FAIL'}  ${n}  ${d||''}`);};
(async()=>{
  await new Promise(r=>srv.listen(0,r)); const port=srv.address().port;
  const b=await chromium.launch({executablePath:CHROME,headless:true});
  const p=await b.newPage({viewport:{width:1100,height:900},deviceScaleFactor:2});
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.addInitScript(([st])=>{localStorage.setItem('duskState_v3',JSON.stringify(st));localStorage.setItem('currentPage','main');},[seed]);
  await p.goto(`http://localhost:${port}/index.html`); await p.waitForTimeout(600);

  // 1: row visibility per mode
  const vis=await p.evaluate(()=>{
    openDeadlineModal(1);
    const row=()=>document.getElementById('dl-duration-row');
    setDeadlineMode('time');     const t=!row().hidden;
    setDeadlineMode('weektime'); const w=!row().hidden;
    setDeadlineMode('date');     const d=!row().hidden;
    setDeadlineMode('monthday'); const md=row().hidden;
    setDeadlineMode('month');    const mo=row().hidden;
    setDeadlineMode('year');     const y=row().hidden;
    return {t,w,d,md,mo,y};
  });
  rec('row visible for time/weektime/date', vis.t&&vis.w&&vis.d, JSON.stringify(vis));
  rec('row hidden for monthday/month/year', vis.md&&vis.mo&&vis.y, JSON.stringify(vis));

  // 2: set weektime + time + duration 30m, confirm → persisted
  const persist=await p.evaluate(()=>{
    openDeadlineModal(1); setDeadlineMode('weektime');
    document.getElementById('dl-weekday').value='5'; if(window._weekdayPickerSet)window._weekdayPickerSet(5);
    const tEl=document.getElementById('dl-weektime-time'); tEl.value='18:00';
    if(window.segInputs&&segInputs['dl-weektime-time'])segInputs['dl-weektime-time'].syncFromInput();
    document.getElementById('dl-dur-h').value='0';
    document.getElementById('dl-dur-m').value='30';
    confirmDeadline();
    const t=state.tasks.find(x=>x.id===1);
    return {dur:t.deadline&&t.deadline.durationMin, mode:t.deadline&&t.deadline.mode, ts:t.deadline&&t.deadline.timeSet};
  });
  rec('confirm persists durationMin=30', persist.dur===30&&persist.mode==='weektime'&&persist.ts===true, JSON.stringify(persist));

  // 3: re-open → fields populated
  const repop=await p.evaluate(()=>{
    openDeadlineModal(1); setDeadlineMode('weektime');
    return {h:document.getElementById('dl-dur-h').value, m:document.getElementById('dl-dur-m').value};
  });
  rec('re-open populates fields (h="", m=30)', repop.h===''&&repop.m==='30', JSON.stringify(repop));

  // screenshot modal (weektime + duration row visible)
  await p.evaluate(()=>{openDeadlineModal(1);setDeadlineMode('weektime');});
  await p.waitForTimeout(150);
  await p.screenshot({path:'D:/tmp/pw/_x7_modal_dur.png',
    clip: await p.evaluate(()=>{const m=document.querySelector('.modal-deadline').getBoundingClientRect();return{x:m.left-8,y:m.top-8,width:m.width+16,height:m.height+16};})});

  // 4: live badge — set a live window, render, screenshot card
  await p.evaluate(()=>{
    const pad=n=>String(n).padStart(2,'0'); const now=new Date(now2=>0); // noop
    const d0=new Date(Date.now()-20*60000);
    const g=d0.getDay()===0?7:d0.getDay();
    const t=state.tasks.find(x=>x.id===1);
    t.deadline={mode:'weektime',value:`${g}|${pad(d0.getHours())}:${pad(d0.getMinutes())}`,timeSet:true,durationMin:60};
    closeDeadlineModal(); render(); updateDeadlineBadges();
  });
  await p.waitForTimeout(150);
  const liveCls=await p.evaluate(()=>{const t=document.querySelector('.task-item[data-id="1"] .deadline-tag');return t?t.className:'(none)';});
  rec('rendered badge has .live class', /\blive\b/.test(liveCls), liveCls);
  await p.screenshot({path:'D:/tmp/pw/_x7_live_badge.png',
    clip: await p.evaluate(()=>{const m=document.querySelector('.task-item[data-id="1"]').getBoundingClientRect();return{x:Math.max(0,m.left-8),y:Math.max(0,m.top-8),width:Math.min(1000,m.width+16),height:m.height+16};})});

  rec('no pageerror', errs.length===0, errs.join(' | '));
  await b.close(); srv.close();
  console.log(`\nX-7 UI SUMMARY  PASS ${pass}  FAIL ${fail}`);
  process.exit(fail?1:0);
})().catch(e=>{console.error('CRASH',e);process.exit(2);});
