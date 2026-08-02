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

// One group + two tasks in it → the group header (with .grp-sort picker) renders.
const seed = {
  groups:[{id:1,name:'Склеп',order:0,collapsed:false}],
  tasks:[
    {id:1,text:'A',groupId:1,order:0,checked:false,priority:'none',subtasks:[]},
    {id:2,text:'B',groupId:1,order:1,checked:false,priority:'none',subtasks:[]},
  ],
  archive:[], notes:[], notesArchive:[], nextId:3, nextGroupId:2, nextSubId:1,
  sortMode:'priority', sortModeOverrides:{},
};
const rec=(n,p,d)=>console.log(`${p?'PASS':'FAIL'}  ${n}  ${d||''}`);

(async()=>{
  await new Promise(r=>srv.listen(0,r)); const port=srv.address().port;
  const browser = await chromium.launch({ executablePath:CHROME, headless:true });
  const page = await browser.newPage({ viewport:{width:1100,height:900} });
  const errs=[]; page.on('pageerror',e=>errs.push(e.message));
  await page.addInitScript(([st])=>{ localStorage.setItem('duskState_v3',JSON.stringify(st)); localStorage.setItem('currentPage','main'); }, [seed]);
  await page.goto(`http://localhost:${port}/index.html`); await page.waitForTimeout(700);

  // sanity: group sort picker present
  const pre = await page.evaluate(()=>({
    grp: document.querySelectorAll('.grp-sort .btn-group-sort').length,
    portalsBefore: document.querySelectorAll('body > .task-sort-portal').length,
  }));
  rec('group sort picker exists', pre.grp>0, JSON.stringify(pre));

  // open the group sort picker
  await page.click('.grp-sort .btn-group-sort');
  await page.waitForTimeout(120);
  const opened = await page.evaluate(()=>{
    const lst = document.querySelector('body > .task-sort-portal');
    const r = lst && lst.getBoundingClientRect();
    return { portaled: !!lst, visible: !!(lst && r.width>0 && r.height>0 && getComputedStyle(lst).display!=='none') };
  });
  rec('picker opened → list portaled to <body> & visible', opened.portaled && opened.visible, JSON.stringify(opened));

  // NOW simulate a background re-render (cycle reset, deadline cross, etc.)
  await page.evaluate(()=>render());
  await page.waitForTimeout(120);

  const after = await page.evaluate(()=>{
    const portals = [...document.querySelectorAll('body > .task-sort-portal')];
    const vis = portals.filter(el=>{ const r=el.getBoundingClientRect(); return r.width>0 && r.height>0 && getComputedStyle(el).display!=='none'; });
    const openPickers = document.querySelectorAll('.dl-month-picker.open').length;
    // is _openSortPicker pointing at a detached node?
    const detached = (typeof _openSortPicker!=='undefined' && _openSortPicker) ? !_openSortPicker.isConnected : null;
    return { orphanPortals: portals.length, visibleOrphans: vis.length, openPickers, openSortPickerDetached: detached };
  });
  const buggy = after.visibleOrphans>0;
  rec('D-4 REPRO — orphan sort list left floating after render()', buggy, JSON.stringify(after));

  rec('no pageerror', errs.length===0, errs.join(' | '));
  await page.screenshot({ path:'D:/tmp/pw/_d4_after.png' });
  await browser.close(); srv.close();
  console.log(`\nD-4 ${buggy?'REPRODUCED (needs fix)':'not reproduced'}`);
  process.exit(0);
})().catch(e=>{ console.error('CRASH',e); process.exit(2); });
