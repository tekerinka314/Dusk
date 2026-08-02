import http from 'http';
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright-core');

const ROOT = 'D:/VSCode projects/DUSK_1_86';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const MIME = { '.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.jpg':'image/jpeg' };
const srv = http.createServer((q,s)=>{ let u=decodeURIComponent(q.url.split('?')[0]); if(u==='/')u='/index.html';
  fs.readFile(path.join(ROOT,u),(e,d)=>{ if(e){s.writeHead(404);s.end('nf');return;} s.writeHead(200,{'Content-Type':MIME[path.extname(u)]||'application/octet-stream'}); s.end(d); }); });

const seed = {
  groups:[], archive:[], notes:[], notesArchive:[],
  tasks:[
    {id:1,text:'Изменяемая ON',groupId:null,order:0,checked:false,priority:'none',repeat:'none',subtasks:[]},
    {id:2,text:'Изменяемая OFF',groupId:null,order:1,checked:false,priority:'none',repeat:'none',subtasks:[]},
    {id:3,text:'Прежний отказ',groupId:null,order:2,checked:false,priority:'none',repeat:'none',
     deadline:{mode:'weektime',value:'2|00:00',timeSet:false},subtasks:[]},
  ],
  nextId:10, nextGroupId:1, nextSubId:100, sortMode:'priority', sortModeOverrides:{},
};
let pass=0, fail=0;
const rec=(n,p,d)=>{ p?pass++:fail++; console.log(`${p?'PASS':'FAIL'}  ${n}  ${d||''}`); };

(async()=>{
  await new Promise(r=>srv.listen(0,r)); const port=srv.address().port;
  const browser = await chromium.launch({ executablePath:CHROME, headless:true });
  const page = await browser.newPage({ viewport:{width:1100,height:900}, deviceScaleFactor:2 });
  const errs=[]; page.on('pageerror',e=>errs.push(e.message));
  await page.addInitScript(([st])=>{ localStorage.setItem('duskState_v3',JSON.stringify(st)); localStorage.setItem('currentPage','main'); }, [seed]);
  await page.goto(`http://localhost:${port}/index.html`); await page.waitForTimeout(700);

  // ── A: toggle UI ────────────────────────────────────────────────────
  const a = await page.evaluate(()=>{
    openDeadlineModal(1); setDeadlineMode('weektime');
    const btn=document.getElementById('dl-repeat-toggle');
    const visW = btn && btn.offsetParent!==null;
    const onDefault = btn && btn.classList.contains('on') && btn.getAttribute('aria-checked')==='true';
    setDeadlineMode('date');
    const hiddenInDate = btn && btn.offsetParent===null;
    setDeadlineMode('weektime');
    return { exists:!!btn, visW, onDefault, hiddenInDate, hasSwitch: !!(btn && btn.querySelector('.dl-rt-switch .dl-rt-knob')) };
  });
  rec('A1 toggle exists & visible in weektime', a.exists && a.visW, JSON.stringify(a));
  rec('A2 default ON (class+aria)', a.onDefault, '');
  rec('A3 hidden in non-weektime mode', a.hiddenInDate, '');
  rec('A4 lunar-phase switch present (glyph+knob)', a.hasSwitch, '');

  const a2 = await page.evaluate(()=>{
    toggleDlAutoRepeat();                 // → OFF
    const btn=document.getElementById('dl-repeat-toggle');
    const off = !btn.classList.contains('on') && btn.getAttribute('aria-checked')==='false' && _dlAutoRepeat===false;
    toggleDlAutoRepeat();                 // → back ON
    const backOn = btn.classList.contains('on') && btn.getAttribute('aria-checked')==='true' && _dlAutoRepeat===true;
    return { off, backOn };
  });
  rec('A5 click → OFF (class+aria+var)', a2.off, JSON.stringify(a2));
  rec('A6 click again → back ON', a2.backOn, JSON.stringify(a2));

  // screenshot both states for visual review
  await page.evaluate(()=>{ openDeadlineModal(1); setDeadlineMode('weektime'); });
  await page.waitForTimeout(120);
  await page.screenshot({ path:'D:/tmp/pw/_x6_toggle_on.png',
    clip: await page.evaluate(()=>{ const m=document.querySelector('.modal-deadline').getBoundingClientRect(); return {x:m.left-8,y:m.top-8,width:m.width+16,height:m.height+16}; }) });
  await page.evaluate(()=>toggleDlAutoRepeat()); await page.waitForTimeout(120);
  await page.screenshot({ path:'D:/tmp/pw/_x6_toggle_off.png',
    clip: await page.evaluate(()=>{ const m=document.querySelector('.modal-deadline').getBoundingClientRect(); return {x:m.left-8,y:m.top-8,width:m.width+16,height:m.height+16}; }) });

  // ── B: existing task edit, toggle ON → weekly + anchor ──────────────
  const b = await page.evaluate(()=>{
    openDeadlineModal(1); setDeadlineMode('weektime');
    _setDlAutoRepeat(true);
    document.getElementById('dl-weekday').value='3'; if(window._weekdayPickerSet)window._weekdayPickerSet(3);
    confirmDeadline();
    const t=state.tasks.find(x=>x.id===1);
    return { repeat:t.repeat, anchor:t.repeatAnchorDay, dl:t.deadline&&t.deadline.mode };
  });
  rec('B existing+ON → weekly, anchor=3, weektime dl', b.repeat==='weekly'&&b.anchor===3&&b.dl==='weektime', JSON.stringify(b));

  // ── C: existing task edit, toggle OFF → repeat stays none ───────────
  const c = await page.evaluate(()=>{
    openDeadlineModal(2); setDeadlineMode('weektime');
    _setDlAutoRepeat(false);
    document.getElementById('dl-weekday').value='5'; if(window._weekdayPickerSet)window._weekdayPickerSet(5);
    confirmDeadline();
    const t=state.tasks.find(x=>x.id===2);
    return { repeat:t.repeat, dl:t.deadline&&t.deadline.mode };
  });
  rec('C existing+OFF → repeat none, weektime dl set', c.repeat==='none'&&c.dl==='weektime', JSON.stringify(c));

  // ── E: re-edit a weektime+none task → toggle defaults OFF ───────────
  const e = await page.evaluate(()=>{
    openDeadlineModal(3); setDeadlineMode('weektime');
    const btn=document.getElementById('dl-repeat-toggle');
    return { off: !btn.classList.contains('on'), aria: btn.getAttribute('aria-checked') };
  });
  rec('E re-edit weektime+none → toggle defaults OFF', e.off && e.aria==='false', JSON.stringify(e));

  // ── D: quick-add %пн → weekly + anchor=1 ────────────────────────────
  const d = await page.evaluate(()=>{
    const ib=document.getElementById('taskInput') || document.querySelector('#inputBox, .task-input, input#input');
    // inputBox is the global var
    inputBox.value='купитьхлеб %пн';
    addTask();
    const t=state.tasks.find(x=>x.text.indexOf('купитьхлеб')===0);
    return t ? { repeat:t.repeat, anchor:t.repeatAnchorDay, dl:t.deadline&&t.deadline.mode } : {none:true};
  });
  rec('D quick-add %пн → weekly, anchor=1, weektime', d.repeat==='weekly'&&d.anchor===1&&d.dl==='weektime', JSON.stringify(d));

  // ── F: form-creation path, toggle ON → form repeat weekly + anchor ──
  const f = await page.evaluate(()=>{
    setFormRepeat('none');
    openDeadlineModal(null); setDeadlineMode('weektime');
    _setDlAutoRepeat(true);
    document.getElementById('dl-weekday').value='4'; if(window._weekdayPickerSet)window._weekdayPickerSet(4);
    confirmDeadline();
    const weeklyBtnActive = document.querySelector('#repeat-selector .repeat-btn[data-repeat="weekly"]').classList.contains('active');
    return { selRepeat:selectedRepeat, anchor:formRepeatAnchorDay, weeklyBtnActive, formDl: formDeadline && formDeadline.mode };
  });
  rec('F form-create+ON → selectedRepeat weekly, anchor=4, btn active', f.selRepeat==='weekly'&&f.anchor===4&&f.weeklyBtnActive&&f.formDl==='weektime', JSON.stringify(f));

  rec('no pageerror', errs.length===0, errs.join(' | '));
  await browser.close(); srv.close();
  console.log(`\nX-6 SUMMARY  PASS ${pass}  FAIL ${fail}`);
  process.exit(fail?1:0);
})().catch(e=>{ console.error('CRASH',e); process.exit(2); });
