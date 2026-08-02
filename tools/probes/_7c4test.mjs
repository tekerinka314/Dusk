// 7c slices 4d–4h — index.html static-handler delegation (form modal, toolbar,
// bulk bar, archive, grimoire header, modals) + the new `change` channel.
import http from 'http'; import fs from 'fs'; import path from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright-core');
const ROOT='D:/VSCode projects/DUSK_v2.0', CHROME='C:/Program Files/Google/Chrome/Application/chrome.exe';
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml'};
const srv=http.createServer((q,s)=>{let u=decodeURIComponent(q.url.split('?')[0]);if(u==='/')u='/index.html';
  fs.readFile(path.join(ROOT,u),(e,d)=>{if(e){s.writeHead(404);s.end('nf');return;}s.writeHead(200,{'Content-Type':MIME[path.extname(u)]||'application/octet-stream'});s.end(d);});});
const base={
  tasks:[
    {id:1,uid:'u1',text:'Alpha',checked:false,priority:'none',groupId:null,deadline:null,note:'',noteOpen:false,order:0,repeat:'none',cycleChecked:false,nextReset:null,subtasks:[],subtasksOpen:false},
    {id:2,uid:'u2',text:'Beta',checked:false,priority:'none',groupId:null,deadline:null,note:'',noteOpen:false,order:1,repeat:'none',cycleChecked:false,nextReset:null,subtasks:[],subtasksOpen:false},
  ],
  groups:[{id:10,uid:'g10',name:'Grp',color:'#6C8EF5',collapsed:false,order:0}],
  archive:[{id:3,uid:'u3',text:'OldArch',checked:true,priority:'none',groupId:null,deadline:null,note:'',order:0,subtasks:[]}],
  notes:[{id:'n1',title:'Note one',body:'<p>hi</p>',fmt:true,color:null,pinned:false,createdAt:1,updatedAt:1}],
  notesArchive:[{id:'n2',title:'Crypt note',body:'<p>x</p>',fmt:true,color:null,pinned:false,createdAt:1,updatedAt:1}],
  templates:[],noteTemplates:[],nextId:100,nextGroupId:100,nextSubId:200,sortMode:'priority',sortModeOverrides:{}};
const results=[]; const rec=(n,p,d)=>{results.push({n,p});console.log(`${p?'PASS':'FAIL'}  ${n}  ${d!==undefined?d:''}`);};
(async()=>{
  await new Promise(r=>srv.listen(0,r)); const port=srv.address().port; const url=`http://localhost:${port}/index.html`;
  const browser=await chromium.launch({executablePath:CHROME,headless:true}); const errs=[];
  const ctx=await browser.newContext({viewport:{width:1180,height:900}}); const page=await ctx.newPage();
  page.on('pageerror',e=>errs.push(e.message));
  await page.addInitScript((st)=>{localStorage.setItem('duskState_v3',JSON.stringify(st));localStorage.setItem('currentPage','main');localStorage.removeItem('duskState_v4');localStorage.removeItem('dusk_premigration_v3');},base);
  await page.goto(url); await page.waitForTimeout(400);
  const click=(sel)=>page.evaluate((s)=>{const e=document.querySelector(s);if(e)e.click();return !!e;},sel);
  const vis =(id)=>page.evaluate((i)=>{const e=document.getElementById(i);return !!e && e.style.display!=='none';},id);
  const hasC=(id,c)=>page.evaluate(([i,cl])=>{const e=document.getElementById(i);return !!e && e.classList.contains(cl);},[id,c]);

  // ── slice 4d: form modal ───────────────────────────────────────────────
  rec('form openFormDeadline opens deadline-modal',
      await click('[data-act="openFormDeadline"]') && await vis('deadline-modal'));
  // stepDlDuration (slice 4h, but reachable now): set h=2, click up → 3
  await page.evaluate(()=>{document.getElementById('dl-dur-h').value='2';});
  await click('[data-act="stepDlDuration"][data-unit="h"][data-delta="1"]');
  rec('stepDlDuration h+1 → 3', await page.evaluate(()=>document.getElementById('dl-dur-h').value)==='3');
  // toggleDlAutoRepeat flips aria-checked (force-show first so fn doesn't early-bail on hidden)
  const beforeRT=await page.evaluate(()=>{const b=document.getElementById('dl-repeat-toggle');b.hidden=false;return b.getAttribute('aria-checked');});
  await click('[data-act="toggleDlAutoRepeat"]');
  const afterRT=await page.evaluate(()=>document.getElementById('dl-repeat-toggle').getAttribute('aria-checked'));
  rec('toggleDlAutoRepeat flips aria-checked', beforeRT!==afterRT, `${beforeRT}→${afterRT}`);
  await click('[data-act="closeDeadlineModal"]'); await page.waitForTimeout(450); // animated close
  rec('closeDeadlineModal hides modal', !(await vis('deadline-modal')));

  // formMonthdayStep + change channel
  await page.evaluate(()=>{document.getElementById('form-repeat-anchor-monthday').value='10';});
  await click('[data-act="formMonthdayStep"][data-delta="1"]');
  rec('formMonthdayStep +1 → 11 + global',
      await page.evaluate(()=>document.getElementById('form-repeat-anchor-monthday').value)==='11'
      && await page.evaluate(()=>formRepeatAnchorMonthday)===11);
  await page.evaluate(()=>{const i=document.getElementById('form-repeat-anchor-monthday');i.value='5';i.dispatchEvent(new Event('change',{bubbles:true}));});
  rec('change-channel formMonthdayInput → global=5', await page.evaluate(()=>formRepeatAnchorMonthday)===5);

  // addFormSubtask grows the form list
  const subsBefore=await page.evaluate(()=>document.getElementById('form-sub-list').children.length);
  await page.evaluate(()=>{document.getElementById('form-sub-input').value='SubX';});
  await click('[data-act="addFormSubtask"]');
  const subsAfter=await page.evaluate(()=>document.getElementById('form-sub-list').children.length);
  rec('addFormSubtask grows list', subsAfter===subsBefore+1, `${subsBefore}→${subsAfter}`);

  // toggleFormPin flips aria-pressed
  const pinB=await page.evaluate(()=>document.getElementById('form-pin-toggle').getAttribute('aria-pressed'));
  await click('[data-act="toggleFormPin"]');
  const pinA=await page.evaluate(()=>document.getElementById('form-pin-toggle').getAttribute('aria-pressed'));
  rec('toggleFormPin flips aria-pressed', pinB!==pinA, `${pinB}→${pinA}`);

  // ── slice 4e: clearAll arms (does NOT wipe on first click) ──────────────
  await click('[data-act="clearAll"]');
  rec('clearAll arms (class) + keeps tasks',
      await page.evaluate(()=>document.querySelector('[data-act="clearAll"]').classList.contains('confirm-armed'))
      && await page.evaluate(()=>state.tasks.length)===2);

  // ── slice 4f: archive page ─────────────────────────────────────────────
  await click('[data-act="switchPage"][data-page="archive"]'); await page.waitForTimeout(800);
  rec('on archive page', await page.evaluate(()=>currentPage)==='archive');
  await click('[data-act="toggleSelectMode"]'); await page.waitForTimeout(60);
  rec('toggleSelectMode shows archive-select-bar', await vis('archive-select-bar'));
  await click('[data-act="toggleSelectMode"]'); await page.waitForTimeout(60); // back off

  // ── slice 4g: grimoire ─────────────────────────────────────────────────
  await click('[data-act="switchPage"][data-page="notes"]'); await page.waitForTimeout(800);
  rec('on notes page', await page.evaluate(()=>currentPage)==='notes');
  await click('[data-act="grimSetMode"][data-mode="archive"]'); await page.waitForTimeout(120);
  rec('grimSetMode archive → seg active', await hasC('grim-seg-archive','active'));
  await click('[data-act="grimSetMode"][data-mode="active"]'); await page.waitForTimeout(120);
  rec('grimSetMode active → seg active', await hasC('grim-seg-active','active'));
  // io popover opens (double-rAF) and STAYS open (trigger inside its _gothicPicker)
  await click('[data-act="grimToggleIoMenu"]'); await page.waitForTimeout(120);
  rec('grimToggleIoMenu opens & stays open', await hasC('grim-io-split','open'));
  await click('[data-act="grimToggleIoMenu"]'); await page.waitForTimeout(120); // close
  rec('grimToggleIoMenu toggles closed', !(await hasC('grim-io-split','open')));
  // colour filter opens (own outside-close listener)
  await click('[data-act="grimToggleColorFilter"]'); await page.waitForTimeout(80);
  rec('grimToggleColorFilter opens & stays open', await hasC('grim-cfilter','open'));
  // grimNew creates a note + opens editor
  const notesBefore=await page.evaluate(()=>state.notes.length);
  await click('[data-act="grimNew"]'); await page.waitForTimeout(120);
  rec('grimNew adds a note', await page.evaluate(()=>state.notes.length)===notesBefore+1, `${notesBefore}→${await page.evaluate(()=>state.notes.length)}`);

  rec('no pageerror', errs.length===0, errs.join(' | '));
  await ctx.close(); await browser.close(); srv.close();
  const f=results.filter(r=>!r.p); console.log(`\n7c-SLICE4 SUMMARY  PASS ${results.length-f.length}/${results.length}`);
  process.exit(f.length?1:0);
})().catch(e=>{console.error('CRASH',e);process.exit(2);});
