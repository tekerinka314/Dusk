// Bug A: _penIsField now sounds in ALL prose text fields (search, form-sub, group
// name, link, inline rename, textareas) and stays SILENT in structured pickers
// (number/time/date/range/file/segmented).
import http from 'http'; import fs from 'fs'; import path from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright-core');
const ROOT='D:/VSCode projects/DUSK_v2.0', CHROME='C:/Program Files/Google/Chrome/Application/chrome.exe';
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.jpg':'image/jpeg'};
const srv=http.createServer((q,s)=>{let u=decodeURIComponent(q.url.split('?')[0]);if(u==='/')u='/index.html';
  fs.readFile(path.join(ROOT,u),(e,d)=>{if(e){s.writeHead(404);s.end('nf');return;}s.writeHead(200,{'Content-Type':MIME[path.extname(u)]||'application/octet-stream'});s.end(d);});});
const seed={groups:[{id:10,uid:'g10',name:'G',color:'#6C8EF5',collapsed:false,order:0}],archive:[],notes:[],notesArchive:[],tasks:[
  {id:1,uid:'u1',text:'A',checked:false,priority:'none',groupId:null,deadline:null,note:'',order:0,repeat:'none',subtasks:[{id:101,text:'s',checked:false,priority:'none',repeat:'none'}],subtasksOpen:true},
],nextId:9,nextGroupId:9,nextSubId:200,sortMode:'priority',sortModeOverrides:{}};
let pass=0,fail=0; const rec=(n,p,d)=>{p?pass++:fail++;console.log(`${p?'PASS':'FAIL'}  ${n}  ${d!==undefined?d:''}`);};
(async()=>{
  await new Promise(r=>srv.listen(0,r)); const port=srv.address().port;
  const b=await chromium.launch({executablePath:CHROME,headless:true});
  const p=await b.newPage({viewport:{width:1180,height:900}}); const errs=[];
  p.on('pageerror',e=>errs.push(e.message));
  await p.addInitScript((st)=>{localStorage.setItem('duskState_v3',JSON.stringify(st));localStorage.setItem('currentPage','main');localStorage.removeItem('duskState_v4');localStorage.removeItem('dusk_premigration_v3');},seed);
  await p.goto(`http://localhost:${port}/index.html`); await p.waitForTimeout(500);

  // helper: does _penIsField(elementById) return v?
  const fieldById=(id)=>p.evaluate(i=>{const e=document.getElementById(i);return e?_penIsField(e):'(no el)';},id);
  const fieldByQ =(q)=>p.evaluate(s=>{const e=document.querySelector(s);return e?_penIsField(e):'(no el)';},q);

  // SHOULD SOUND (prose text) ───────────────────────────────────────────
  rec('input-box (main add)',        await fieldById('input-box')===true);
  rec('search-box',                  await fieldById('search-box')===true);
  rec('form-sub-input',              await fieldById('form-sub-input')===true);
  rec('group-name-input',            await fieldById('group-name-input')===true);
  rec('rename-group-input',          await fieldById('rename-group-input')===true);
  rec('grim-link-input (url)',       await fieldById('grim-link-input')===true);
  rec('grim-link-name',              await fieldById('grim-link-name')===true);
  rec('note-modal-input (textarea)', await fieldById('note-modal-input')===true);
  rec('task-note',                   await fieldById('task-note')===true);
  // archive/notes search live on their pages but elements exist in DOM
  rec('archive-search-box',          await fieldById('archive-search-box')===true);
  rec('notes-search-box',            await fieldById('notes-search-box')===true);

  // contenteditable: inline task rename + a synthetic CE span
  const ceTask=await p.evaluate(()=>{
    const span=document.querySelector('.task-text[data-id="1"]');
    if(!span) return '(no span)';
    span.contentEditable='true';
    const r=_penIsField(span);
    span.contentEditable='false';
    return r;
  });
  rec('inline task-text (contenteditable)', ceTask===true, String(ceTask));
  rec('grim-body would sound (synthetic CE)', await p.evaluate(()=>{const d=document.createElement('div');d.contentEditable='true';document.body.appendChild(d);const r=_penIsField(d);d.remove();return r;})===true);

  // SHOULD STAY SILENT (structured) ─────────────────────────────────────
  rec('dl-monthday (number) silent',  await fieldById('dl-monthday')===false);
  rec('dl-year (number) silent',      await fieldById('dl-year')===false);
  rec('dl-dur-h (number) silent',     await fieldById('dl-dur-h')===false);
  rec('grgb-hue (range) silent',      await fieldById('grgb-hue')===false);
  rec('import-file-input (file) silent', await fieldById('import-file-input')===false);
  rec('form-repeat-anchor-time (time) silent', await fieldById('form-repeat-anchor-time')===false);
  rec('seg-input wrap (div) silent',  await fieldByQ('.seg-input')===false);
  rec('seg cell (span) silent',       await fieldByQ('.seg-input .seg')===false);
  rec('a plain button silent',        await fieldByQ('button')===false);

  rec('no pageerror', errs.length===0, errs.join(' | '));
  await b.close(); srv.close();
  console.log(`\nPEN-FIELD SUMMARY  PASS ${pass}  FAIL ${fail}`);
  process.exit(fail?1:0);
})().catch(e=>{console.error('CRASH',e);process.exit(2);});
