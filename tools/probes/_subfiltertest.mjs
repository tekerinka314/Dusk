// "Только невыполненные" must also hide DONE subtasks — standard & split layouts.
import http from 'http';
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright-core');

const ROOT = 'D:/VSCode projects/DUSK_v2.0';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const MIME = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.json':'application/json', '.svg':'image/svg+xml' };
const srv = http.createServer((q,s)=>{ let u=decodeURIComponent(q.url.split('?')[0]); if(u==='/')u='/index.html';
  fs.readFile(path.join(ROOT,u),(e,d)=>{ if(e){s.writeHead(404);s.end('nf');return;} s.writeHead(200,{'Content-Type':MIME[path.extname(u)]||'application/octet-stream'}); s.end(d); }); });

const sub = (id,text,checked=false) => ({ id, text, checked, priority:'none', note:'', order:0, repeat:'none', cycleChecked:false });
const seedState = () => ({
  tasks:[
    { id:11, text:'alpha', checked:false, priority:'none', color:null, groupId:null, order:0,
      pinned:false, note:'', deadline:null, repeat:'none', cycleChecked:false, nextReset:null,
      subtasks:[ sub(101,'act1',false), sub(102,'act2',false), sub(103,'done1',true), sub(104,'done2',true) ],
      subtasksOpen:true },
  ],
  groups:[], archive:[], notes:[], notesArchive:[], templates:[], noteTemplates:[],
  nextId:100, nextGroupId:100, nextSubId:200, sortMode:'priority', sortModeOverrides:{},
});

const results = [];
const rec = (name, pass, detail) => { results.push({ name, pass, detail }); console.log(`${pass?'PASS':'FAIL'}  ${name}  ${detail!==undefined?detail:''}`); };

(async()=>{
  await new Promise(r=>srv.listen(0,r));
  const port = srv.address().port;
  const url = `http://localhost:${port}/index.html`;
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });

  // filterOn: K_FILTER ('isFiltered') !== '0'  → set '1'/'0'; split: groupSplitMode '1'/'0'
  async function scene(filterOn, splitOn){
    const ctx = await browser.newContext({ viewport:{width:1180,height:900} });
    const page = await ctx.newPage();
    const errs=[]; page.on('pageerror',e=>errs.push(e.message));
    await page.addInitScript(([st,f,sp])=>{
      localStorage.setItem('duskState_v3', JSON.stringify(st));
      localStorage.setItem('currentPage','main');
      localStorage.setItem('isFiltered', f);
      localStorage.setItem('groupSplitMode', sp);
      localStorage.removeItem('duskState_v4');
      localStorage.removeItem('dusk_premigration_v3');
    }, [seedState(), filterOn?'1':'0', splitOn?'1':'0']);
    await page.goto(url); await page.waitForTimeout(400);
    const out = await page.evaluate(()=>{
      const root = document.querySelector('.task-item[data-id="11"]');
      const items = root ? root.querySelectorAll('.subtask-item') : [];
      const texts = Array.from(items).map(li => (li.querySelector('.subtask-text')||li).textContent.trim());
      return {
        total: items.length,
        hasActiveHeader: !!(root && root.querySelector('.sub-split-active-header')),
        hasDoneHeader:   !!(root && root.querySelector('.sub-split-done-header')),
        texts,
      };
    });
    out.errs = errs;
    await ctx.close();
    return out;
  }

  // ── Standard mode ──
  const stdOn  = await scene(true,  false);
  rec('standard + filter ON → only 2 active subs', stdOn.total === 2 && !stdOn.texts.some(t=>t.includes('done')), `total=${stdOn.total} ${JSON.stringify(stdOn.texts)}`);
  const stdOff = await scene(false, false);
  rec('standard + filter OFF → all 4 subs', stdOff.total === 4, `total=${stdOff.total}`);

  // ── Split mode ──
  const splOn  = await scene(true,  true);
  rec('split + filter ON → only active zone, 2 subs', splOn.total === 2 && splOn.hasActiveHeader && !splOn.hasDoneHeader,
      `total=${splOn.total} active=${splOn.hasActiveHeader} done=${splOn.hasDoneHeader}`);
  const splOff = await scene(false, true);
  rec('split + filter OFF → both zones, 4 subs', splOff.total === 4 && splOff.hasActiveHeader && splOff.hasDoneHeader,
      `total=${splOff.total} active=${splOff.hasActiveHeader} done=${splOff.hasDoneHeader}`);

  const allErrs = [stdOn,stdOff,splOn,splOff].flatMap(s=>s.errs);
  rec('no pageerror', allErrs.length === 0, allErrs.join(' | '));

  await browser.close(); srv.close();
  const fails = results.filter(r=>!r.pass);
  console.log(`\nSUBFILTER SUMMARY  PASS ${results.length-fails.length}/${results.length}`);
  process.exit(fails.length?1:0);
})().catch(e=>{ console.error('CRASH',e); process.exit(2); });
