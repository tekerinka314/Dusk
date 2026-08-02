import http from 'http'; import fs from 'fs'; import path from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright-core');
const ROOT='D:/VSCode projects/DUSK_v2.0', CHROME='C:/Program Files/Google/Chrome/Application/chrome.exe';
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.jpg':'image/jpeg'};
const srv=http.createServer((q,s)=>{let u=decodeURIComponent(q.url.split('?')[0]);if(u==='/')u='/index.html';
  fs.readFile(path.join(ROOT,u),(e,d)=>{if(e){s.writeHead(404);s.end('nf');return;}s.writeHead(200,{'Content-Type':MIME[path.extname(u)]||'application/octet-stream'});s.end(d);});});
const seed={groups:[],archive:[],notes:[],notesArchive:[],tasks:[{id:1,text:'T',groupId:null,order:0,checked:false,priority:'none',repeat:'none',subtasks:[]}],nextId:10,nextGroupId:1,nextSubId:100,sortMode:'priority',sortModeOverrides:{}};
let pass=0,fail=0; const rec=(n,p,d)=>{p?pass++:fail++;console.log(`${p?'PASS':'FAIL'}  ${n}  ${d||''}`);};
(async()=>{
  await new Promise(r=>srv.listen(0,r)); const port=srv.address().port;
  const b=await chromium.launch({executablePath:CHROME,headless:true});
  const p=await b.newPage({viewport:{width:1100,height:900},deviceScaleFactor:2});
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.addInitScript(([st])=>{localStorage.setItem('duskState_v3',JSON.stringify(st));localStorage.setItem('currentPage','main');},[seed]);
  await p.goto(`http://localhost:${port}/index.html`); await p.waitForTimeout(600);

  const r=await p.evaluate(()=>{
    const pad=n=>String(n).padStart(2,'0');
    const hm = d => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
    const wd7 = d => { const g=d.getDay(); return g===0?7:g; };           // 1..7 (вс=7)
    const ymd = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
    const now = Date.now();
    const at = ms => new Date(now+ms);
    const out = {};

    // A: weektime live (началось 30м назад, длится 60м)
    const a0=at(-30*60000);
    const A={mode:'weektime',value:`${wd7(a0)}|${hm(a0)}`,timeSet:true,durationMin:60};
    out.A_status=deadlineStatus(A); out.A_cd=formatDeadlineCountdown(A);
    const aw=deadlineWindow(A); out.A_winlen= aw? aw.end-aw.start : null;

    // B: weektime окно ЗАВЕРШИЛОСЬ (старт 90м назад, длит 60м → конец 30м назад) → перенос
    const b0=at(-90*60000);
    const B={mode:'weektime',value:`${wd7(b0)}|${hm(b0)}`,timeSet:true,durationMin:60};
    out.B_status=deadlineStatus(B); const bw=deadlineWindow(B);
    out.B_advanced = bw ? (bw.start - now > 5*86400000) : false;

    // C: weektime БЕЗ длительности, до старта ~3ч (regression) → urgent, не live
    const c0=at(3*3600000);
    const C={mode:'weektime',value:`${wd7(c0)}|${hm(c0)}`,timeSet:true};
    out.C_status=deadlineStatus(C);

    // D: дата+время live (−10м, длит 30м)
    const d0=at(-10*60000);
    const D={mode:'date',value:ymd(d0),time:hm(d0),durationMin:30};
    out.D_status=deadlineStatus(D); out.D_cd=formatDeadlineCountdown(D);

    // E: дата+время окно прошло (−120м, длит 30м) → over
    const e0=at(-120*60000);
    const E={mode:'date',value:ymd(e0),time:hm(e0),durationMin:30};
    out.E_status=deadlineStatus(E); out.E_cd=formatDeadlineCountdown(E);

    // F: time live (−10м, длит 30м)
    const f0=at(-10*60000);
    const F={mode:'time',value:hm(f0),durationMin:30};
    out.F_status=deadlineStatus(F); out.F_cd=formatDeadlineCountdown(F);

    // G: time БЕЗ длительности, только что прошло (−1м) → перенос на завтра, не live/over
    const g0=at(-1*60000);
    const G={mode:'time',value:hm(g0)};
    out.G_status=deadlineStatus(G);

    // H: weektime БЕЗ времени (день-уровень) сегодня → critical (как было)
    const H={mode:'weektime',value:`${wd7(new Date(now))}|00:00`,timeSet:false};
    out.H_status=deadlineStatus(H); out.H_win = !!deadlineWindow(H);
    return out;
  });

  rec('A weektime live (start -30m, dur60)', r.A_status==='live', JSON.stringify(r.A_status));
  rec('A countdown «идёт»', /^идёт/.test(r.A_cd||''), r.A_cd);
  rec('A window length = 60м', r.A_winlen===3600000, String(r.A_winlen));
  rec('B окно прошло → перенос (не live/over, старт >5дн)', r.B_status!=='live'&&r.B_status!=='over'&&r.B_advanced, JSON.stringify({s:r.B_status,adv:r.B_advanced}));
  rec('C weektime без длит., ~3ч до → urgent, не live', r.C_status==='urgent', r.C_status);
  rec('D дата+время live', r.D_status==='live', r.D_status);
  rec('D countdown «идёт»', /^идёт/.test(r.D_cd||''), r.D_cd);
  rec('E дата+время после окна → over', r.E_status==='over', r.E_status);
  rec('E countdown «просрочено»', /просроч/.test(r.E_cd||''), r.E_cd);
  rec('F time live', r.F_status==='live', r.F_status);
  rec('F countdown «идёт»', /^идёт/.test(r.F_cd||''), r.F_cd);
  rec('G time без длит., −1м → не live/over (перенос)', r.G_status!=='live'&&r.G_status!=='over', r.G_status);
  rec('H weektime без времени сегодня → critical (regression)', r.H_status==='critical'&&r.H_win===false, JSON.stringify({s:r.H_status,w:r.H_win}));
  rec('no pageerror', errs.length===0, errs.join(' | '));

  await b.close(); srv.close();
  console.log(`\nX-7 SUMMARY  PASS ${pass}  FAIL ${fail}`);
  process.exit(fail?1:0);
})().catch(e=>{console.error('CRASH',e);process.exit(2);});
