import http from 'http'; import fs from 'fs'; import path from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright-core');
const ROOT='D:/VSCode projects/DUSK_v2.0', CHROME='C:/Program Files/Google/Chrome/Application/chrome.exe';
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.jpg':'image/jpeg'};
const srv=http.createServer((q,s)=>{let u=decodeURIComponent(q.url.split('?')[0]);if(u==='/')u='/index.html';
  fs.readFile(path.join(ROOT,u),(e,d)=>{if(e){s.writeHead(404);s.end('nf');return;}s.writeHead(200,{'Content-Type':MIME[path.extname(u)]||'application/octet-stream'});s.end(d);});});
const seed={groups:[],archive:[],notes:[],notesArchive:[],tasks:[
  {id:1,text:'Задача',groupId:null,order:0,checked:false,priority:'none',repeat:'none',subtasks:[]},
],nextId:10,nextGroupId:1,nextSubId:200,sortMode:'priority',sortModeOverrides:{}};
let pass=0,fail=0; const rec=(n,p,d)=>{p?pass++:fail++;console.log(`${p?'PASS':'FAIL'}  ${n}  ${d||''}`);};
(async()=>{
  await new Promise(r=>srv.listen(0,r)); const port=srv.address().port;
  const b=await chromium.launch({executablePath:CHROME,headless:true});
  const p=await b.newPage({viewport:{width:1100,height:900},deviceScaleFactor:2});
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.addInitScript(([st])=>{localStorage.setItem('duskState_v3',JSON.stringify(st));localStorage.setItem('currentPage','main');},[seed]);
  await p.goto(`http://localhost:${port}/index.html`); await p.waitForTimeout(600);

  const r=await p.evaluate(()=>{
    openDeadlineModal(1); setDeadlineMode('time');
    const row=document.getElementById('dl-duration-row');
    return {
      hidden: row.hidden,
      candles: row.querySelectorAll('.dl-dur-candle').length,
      steps: row.querySelectorAll('.dl-dur-step').length,
      sep: !!row.querySelector('.dl-dur-sep'),
      corners: row.querySelectorAll('.dl-dur-corner').length,
      legend: (row.querySelector('.dl-dur-legend')?.textContent||'').trim(),
      hasH: !!document.getElementById('dl-dur-h'),
      hasM: !!document.getElementById('dl-dur-m'),
    };
  });
  rec('row visible in time mode', r.hidden===false, JSON.stringify({hidden:r.hidden}));
  rec('two candles', r.candles===2, String(r.candles));
  rec('four arch steppers', r.steps===4, String(r.steps));
  rec('dagger separator present', r.sep===true);
  rec('four corners', r.corners===4, String(r.corners));
  rec('legend «сколько горит»', /сколько горит/.test(r.legend), r.legend);
  rec('ids dl-dur-h/m preserved', r.hasH&&r.hasM);

  const st=await p.evaluate(()=>{
    const H=()=>document.getElementById('dl-dur-h').value, M=()=>document.getElementById('dl-dur-m').value;
    _stepDlDuration('h',1); const h1=H();
    _stepDlDuration('h',1); const h2=H();
    _stepDlDuration('m',5); const m5=M();
    _stepDlDuration('m',-5); const m0=M();      // back to empty
    return {h1,h2,m5,m0};
  });
  rec('step h +1+1 -> 2', st.h2==='2', JSON.stringify(st));
  rec('step m +5 -> 5, -5 -> empty', st.m5==='5'&&st.m0==='', JSON.stringify(st));

  const cl=await p.evaluate(()=>{
    const mk=(id,v)=>{const e=document.getElementById(id);e.value=v;_clampDlDuration(e);return e.value;};
    const stepMax=()=>{const e=document.getElementById('dl-dur-h');e.value='23';_stepDlDuration('h',1);return e.value;};
    return {h50:mk('dl-dur-h','50'), m99:mk('dl-dur-m','99'), capped:stepMax()};
  });
  rec('clamp h50->23, m99->59', cl.h50==='23'&&cl.m99==='59', JSON.stringify(cl));
  rec('step never exceeds max (23+1=23)', cl.capped==='23', cl.capped);

  const persist=await p.evaluate(()=>{
    openDeadlineModal(1); setDeadlineMode('time');
    document.getElementById('dl-time').value='09:00';
    if(window.segInputs&&segInputs['dl-time'])segInputs['dl-time'].syncFromInput();
    document.getElementById('dl-dur-h').value='1';
    document.getElementById('dl-dur-m').value='30';
    confirmDeadline();
    const t=state.tasks.find(x=>x.id===1);
    return {dur:t.deadline.durationMin, mode:t.deadline.mode};
  });
  rec('confirm persists durationMin=90', persist.dur===90&&persist.mode==='time', JSON.stringify(persist));

  const repop=await p.evaluate(()=>{
    openDeadlineModal(1);
    return {h:document.getElementById('dl-dur-h').value, m:document.getElementById('dl-dur-m').value};
  });
  rec('reopen repopulates 1 / 30', repop.h==='1'&&repop.m==='30', JSON.stringify(repop));

  rec('no pageerror', errs.length===0, errs.join(' | '));
  await b.close(); srv.close();
  console.log(`\nDUR-WIRE SUMMARY  PASS ${pass}  FAIL ${fail}`);
  process.exit(fail?1:0);
})().catch(e=>{console.error('CRASH',e);process.exit(2);});
