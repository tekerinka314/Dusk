import http from 'http';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright-core');

const ROOT = 'D:/VSCode projects/DUSK_1_86';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const MIME = { '.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.jpg':'image/jpeg' };
const srv = http.createServer((q,s)=>{ let u=decodeURIComponent(q.url.split('?')[0]); if(u==='/')u='/index.html';
  fs.readFile(path.join(ROOT,u),(e,d)=>{ if(e){s.writeHead(404);s.end('nf');return;} s.writeHead(200,{'Content-Type':MIME[path.extname(u)]||'application/octet-stream'}); s.end(d); }); });

const seed = {
  groups:[{id:1,name:'Склеп',order:0,collapsed:false}],
  tasks:[
    {id:1,text:'Без группы дело',groupId:null,order:0,checked:false,priority:'none',
     deadline:{mode:'date',value:'2026-07-01'},
     subtasks:[{id:11,text:'Подпункт 1',order:0,checked:true},{id:12,text:'Подпункт 2',order:1,checked:false}]},
    {id:2,text:'Готовое дело',groupId:1,order:0,checked:true,priority:'none',subtasks:[]},
    {id:3,text:'Дело в склепе',groupId:1,order:1,checked:false,priority:'none',
     deadline:{mode:'weektime',value:'1|00:00',timeSet:false},subtasks:[]},
  ],
  archive:[], notes:[], notesArchive:[], nextId:4, nextGroupId:2, nextSubId:13,
  sortMode:'priority', sortModeOverrides:{},
};
const rec=(n,p,d)=>console.log(`${p?'PASS':'FAIL'}  ${n}  ${d||''}`);

(async()=>{
  await new Promise(r=>srv.listen(0,r)); const port=srv.address().port;
  const browser = await chromium.launch({ executablePath:CHROME, headless:true });
  const page = await browser.newPage({ viewport:{width:1100,height:900}, deviceScaleFactor:2,
    acceptDownloads:true });
  const errs=[]; page.on('pageerror',e=>errs.push(e.message));
  await page.addInitScript(([st])=>{ localStorage.setItem('duskState_v3',JSON.stringify(st)); localStorage.setItem('currentPage','main'); }, [seed]);
  await page.goto(`http://localhost:${port}/index.html`); await page.waitForTimeout(700);

  // open export popover
  await page.click('#btn-export'); await page.waitForTimeout(150);
  const m = await page.evaluate(()=>{
    const menu=document.querySelector('.snooze-menu.export-menu');
    if(!menu) return {menu:false};
    const items=[...menu.querySelectorAll('button[role="menuitem"]')];
    return { menu:true, count:items.length, svgs:menu.querySelectorAll('svg').length, texts:items.map(b=>b.textContent.trim()) };
  });
  rec('popover has 3 scope items', m.menu && m.count===3 && m.svgs===3, JSON.stringify(m));
  rec('3rd item = markdown-чеклист', /markdown/i.test((m.texts||[])[2]||''), JSON.stringify(m.texts));

  // crop screenshot of popover for visual glyph check
  const box = await page.evaluate(()=>{
    const b=document.getElementById('btn-export').getBoundingClientRect();
    const mn=document.querySelector('.export-menu').getBoundingClientRect();
    const x=Math.min(b.left,mn.left)-16, y=b.top-16, r=Math.max(b.right,mn.right)+16, bot=mn.bottom+16;
    return { x, y, w:r-x, h:bot-y };
  });
  await page.screenshot({ path:'D:/tmp/pw/_x2_pop.png', clip:{x:box.x,y:box.y,width:box.w,height:box.h} });

  // click the markdown item, capture download
  const [dl] = await Promise.all([
    page.waitForEvent('download'),
    page.evaluate(()=>{ const its=[...document.querySelectorAll('.export-menu button[role="menuitem"]')]; its[2].click(); }),
  ]);
  const fn = dl.suggestedFilename();
  const tmp = path.join(os.tmpdir(), fn);
  await dl.saveAs(tmp);
  const md = fs.readFileSync(tmp, 'utf-8');
  console.log('\n----- '+fn+' -----\n'+md+'\n----------------');

  rec('filename dusk-tasks-*.md', /^dusk-tasks-\d{4}-\d{2}-\d{2}\.md$/.test(fn), fn);
  rec('has # title', /^# DUSK — задачи/m.test(md));
  rec('ungrouped section', /## Без группы/.test(md));
  rec('group section «Склеп»', /## Склеп/.test(md));
  rec('checked task → [x]', /- \[x\] Готовое дело/.test(md));
  rec('unchecked task → [ ]', /- \[ \] Дело в склепе/.test(md));
  rec('nested subtask checked', /^ {2}- \[x\] Подпункт 1/m.test(md));
  rec('nested subtask unchecked', /^ {2}- \[ \] Подпукт 2|^ {2}- \[ \] Подпункт 2/m.test(md));
  rec('date deadline suffix', /Без группы дело.*\(до: 1 июл\)/.test(md));
  rec('weektime deadline suffix (day only)', /Дело в склепе.*\(до: пн\)/.test(md));
  rec('no pageerror', errs.length===0, errs.join(' | '));

  await browser.close(); srv.close();
})().catch(e=>{ console.error('CRASH',e); process.exit(2); });
