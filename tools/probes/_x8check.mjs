import http from 'http'; import fs from 'fs'; import path from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright-core');
const ROOT='D:/VSCode projects/DUSK_v2.0', CHROME='C:/Program Files/Google/Chrome/Application/chrome.exe';
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.jpg':'image/jpeg'};
const srv=http.createServer((q,s)=>{let u=decodeURIComponent(q.url.split('?')[0]);if(u==='/')u='/index.html';
  fs.readFile(path.join(ROOT,u),(e,d)=>{if(e){s.writeHead(404);s.end('nf');return;}s.writeHead(200,{'Content-Type':MIME[path.extname(u)]||'application/octet-stream'});s.end(d);});});
const pad=n=>String(n).padStart(2,'0');
const now=Date.now(); const d0=new Date(now-20*60000); const g=d0.getDay()===0?7:d0.getDay();
const today=new Date(); const ymd=`${today.getFullYear()}-${pad(today.getMonth()+1)}-${pad(today.getDate())}`;
const seed={groups:[],archive:[],notes:[],notesArchive:[],tasks:[
  {id:1,text:'Задача',groupId:null,order:0,checked:false,priority:'none',repeat:'none',subtasks:[{id:101,text:'под',checked:false,priority:'none',repeat:'none'}]},
  {id:2,text:'Сегодня дата',groupId:null,order:1,checked:false,priority:'none',repeat:'none',subtasks:[],deadline:{mode:'date',value:ymd}},
  {id:3,text:'Идёт',groupId:null,order:2,checked:false,priority:'none',repeat:'none',subtasks:[],deadline:{mode:'weektime',value:`${g}|${pad(d0.getHours())}:${pad(d0.getMinutes())}`,timeSet:true,durationMin:60}},
],nextId:10,nextGroupId:1,nextSubId:200,sortMode:'priority',sortModeOverrides:{}};
let pass=0,fail=0; const rec=(n,p,d)=>{p?pass++:fail++;console.log(`${p?'PASS':'FAIL'}  ${n}  ${d||''}`);};
(async()=>{
  await new Promise(r=>srv.listen(0,r)); const port=srv.address().port;
  const b=await chromium.launch({executablePath:CHROME,headless:true});
  const p=await b.newPage({viewport:{width:1100,height:900},deviceScaleFactor:2});
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.addInitScript(([st])=>{localStorage.setItem('duskState_v3',JSON.stringify(st));localStorage.setItem('currentPage','main');},[seed]);
  await p.goto(`http://localhost:${port}/index.html`); await p.waitForTimeout(600);

  const lbl=await p.evaluate(()=>{
    openDeadlineModal(1);
    const btn=()=>document.getElementById('dl-repeat-toggle');
    const T=()=>btn().querySelector('.dl-rt-title').textContent;
    setDeadlineMode('time');     const time={hid:btn().hidden,t:T()};
    setDeadlineMode('weektime'); const wk={hid:btn().hidden,t:T()};
    setDeadlineMode('monthday'); const md={hid:btn().hidden,t:T()};
    setDeadlineMode('date');     const dt={hid:btn().hidden};
    setDeadlineMode('month');    const mo={hid:btn().hidden};
    setDeadlineMode('year');     const yr={hid:btn().hidden};
    return {time,wk,md,dt,mo,yr};
  });
  rec('toggle visible+label time', !lbl.time.hid&&/каждый день/.test(lbl.time.t), JSON.stringify(lbl.time));
  rec('toggle visible+label weektime', !lbl.wk.hid&&/каждую неделю/.test(lbl.wk.t), JSON.stringify(lbl.wk));
  rec('toggle visible+label monthday', !lbl.md.hid&&/каждый месяц/.test(lbl.md.t), JSON.stringify(lbl.md));
  rec('toggle hidden date/month/year', lbl.dt.hid&&lbl.mo.hid&&lbl.yr.hid, JSON.stringify({d:lbl.dt.hid,m:lbl.mo.hid,y:lbl.yr.hid}));

  const t1=await p.evaluate(()=>{
    openDeadlineModal(1); setDeadlineMode('time');
    document.getElementById('dl-time').value='09:00';
    if(window.segInputs&&segInputs['dl-time'])segInputs['dl-time'].syncFromInput();
    _setDlAutoRepeat(true); confirmDeadline();
    const t=state.tasks.find(x=>x.id===1); return {rep:t.repeat,mode:t.deadline.mode};
  });
  rec('existing time + ON -> repeat daily', t1.rep==='daily'&&t1.mode==='time', JSON.stringify(t1));

  const t2=await p.evaluate(()=>{
    state.tasks.find(x=>x.id===1).repeat='none';
    openDeadlineModal(1); setDeadlineMode('monthday');
    document.getElementById('dl-monthday').value='15';
    _setDlAutoRepeat(true); confirmDeadline();
    const t=state.tasks.find(x=>x.id===1); return {rep:t.repeat,anchor:t.repeatAnchorMonthday,mode:t.deadline.mode};
  });
  rec('existing monthday + ON -> monthly anchorMd=15', t2.rep==='monthly'&&t2.anchor===15&&t2.mode==='monthday', JSON.stringify(t2));

  const t3=await p.evaluate(()=>{
    state.tasks.find(x=>x.id===1).repeat='none';
    openDeadlineModal(1); setDeadlineMode('time');
    document.getElementById('dl-time').value='10:00';
    if(window.segInputs&&segInputs['dl-time'])segInputs['dl-time'].syncFromInput();
    _setDlAutoRepeat(false); confirmDeadline();
    return state.tasks.find(x=>x.id===1).repeat;
  });
  rec('existing time + OFF -> repeat none', t3==='none', t3);

  const t4=await p.evaluate(()=>{
    state.tasks.find(x=>x.id===1).repeat='none';
    openDeadlineModal(1); setDeadlineMode('weektime');
    document.getElementById('dl-weekday').value='3'; if(window._weekdayPickerSet)window._weekdayPickerSet(3);
    document.getElementById('dl-weektime-time').value='12:00';
    if(window.segInputs&&segInputs['dl-weektime-time'])segInputs['dl-weektime-time'].syncFromInput();
    _setDlAutoRepeat(true); confirmDeadline();
    const t=state.tasks.find(x=>x.id===1); return {rep:t.repeat,anchor:t.repeatAnchorDay};
  });
  rec('weektime regression -> weekly anchorDay=3', t4.rep==='weekly'&&t4.anchor===3, JSON.stringify(t4));

  const f=await p.evaluate(()=>{
    setFormRepeat('none');
    openDeadlineModal(null); setDeadlineMode('time');
    document.getElementById('dl-time').value='08:00';
    if(window.segInputs&&segInputs['dl-time'])segInputs['dl-time'].syncFromInput();
    _setDlAutoRepeat(true); confirmDeadline();
    const r1=selectedRepeat;
    setFormRepeat('none');
    openDeadlineModal(null); setDeadlineMode('monthday');
    document.getElementById('dl-monthday').value='20';
    _setDlAutoRepeat(true); confirmDeadline();
    return {timeRep:r1, mdRep:selectedRepeat, mdAnchor:formRepeatAnchorMonthday};
  });
  rec('form time -> daily', f.timeRep==='daily', f.timeRep);
  rec('form monthday -> monthly + anchor20', f.mdRep==='monthly'&&f.mdAnchor===20, JSON.stringify(f));

  const u=await p.evaluate(()=>{
    _setDlAutoRepeat(true);
    const o1={repeat:'none'}; _applyAutoRepeatToTarget(o1,{mode:'time',value:'09:00'});
    const o2={repeat:'none'}; _applyAutoRepeatToTarget(o2,{mode:'monthday',value:'7'});
    const o3={repeat:'weekly',repeatAnchorDay:2}; _applyAutoRepeatToTarget(o3,{mode:'time',value:'09:00'});
    return {o1:o1.repeat,o2:o2.repeat,o2a:o2.repeatAnchorMonthday,o3:o3.repeat};
  });
  rec('helper: time->daily, monthday->monthly(7), explicit kept', u.o1==='daily'&&u.o2==='monthly'&&u.o2a===7&&u.o3==='weekly', JSON.stringify(u));

  const c=await p.evaluate(()=>{
    const mk=(id,v)=>{const e=document.getElementById(id);e.value=v;_clampDlDuration(e);return e.value;};
    return {m99:mk('dl-dur-m','99'),h50:mk('dl-dur-h','50'),mok:mk('dl-dur-m','45'),m0:mk('dl-dur-h','0')};
  });
  rec('clamp m99->59,h50->23,45->45,0->0', c.m99==='59'&&c.h50==='23'&&c.mok==='45'&&c.m0==='0', JSON.stringify(c));

  const sec=await p.evaluate(()=>{
    const pad=n=>String(n).padStart(2,'0');
    const start=Date.now()-3600000+40000; // dur 60m, started 59m20s ago -> ~40s left
    const sd=new Date(start); const gg=sd.getDay()===0?7:sd.getDay();
    const dl={mode:'weektime',value:`${gg}|${pad(sd.getHours())}:${pad(sd.getMinutes())}`,timeSet:true,durationMin:60};
    return {cd:formatDeadlineCountdown(dl),st:deadlineStatus(dl)};
  });
  rec('#5 last-minute shows seconds', /^идёт · ещё \d+с$/.test(sec.cd||'')&&sec.st==='live', JSON.stringify(sec));

  await p.evaluate(()=>{render();updateDeadlineBadges();if(window._syncCriticalPulse)_syncCriticalPulse();});
  await p.waitForTimeout(150);
  const pulse=await p.evaluate(()=>{
    const an=el=>el?getComputedStyle(el).animationName:'(none)';
    const wrap2=document.querySelector('.task-item[data-id="2"] .meta-tag-wrap');
    const tag2 =document.querySelector('.task-item[data-id="2"] .deadline-tag');
    const wrap3=document.querySelector('.task-item[data-id="3"] .meta-tag-wrap');
    return {wrap2:an(wrap2),tag2:an(tag2),wrap3:an(wrap3)};
  });
  rec('#3 critical pulse on WRAP (not inner tag)', pulse.wrap2==='pulseCritical'&&pulse.tag2==='none', JSON.stringify(pulse));
  rec('#3 live pulse on WRAP', pulse.wrap3==='pulseLive', JSON.stringify(pulse));

  rec('no pageerror', errs.length===0, errs.join(' | '));
  await b.close(); srv.close();
  console.log(`\nX-8 SUMMARY  PASS ${pass}  FAIL ${fail}`);
  process.exit(fail?1:0);
})().catch(e=>{console.error('CRASH',e);process.exit(2);});
