// 7c slice-3f (bulk group picker + form group-chip dropdown) — delegation tests.
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

const task = (id,text,gid) => ({ id, text, checked:false, priority:'none', color:null, groupId:gid??null, order:0,
  pinned:false, note:'', deadline:null, repeat:'none', cycleChecked:false, nextReset:null, subtasks:[], subtasksOpen:false });
const seedState = (tasks,groups) => ({ tasks, groups, archive:[], notes:[], notesArchive:[], templates:[], noteTemplates:[],
  nextId:100, nextGroupId:100, nextSubId:200, sortMode:'priority', sortModeOverrides:{} });

const results = [];
const rec = (name, pass, detail) => { results.push({ name, pass, detail }); console.log(`${pass?'PASS':'FAIL'}  ${name}  ${detail!==undefined?detail:''}`); };

(async()=>{
  await new Promise(r=>srv.listen(0,r));
  const port = srv.address().port;
  const url = `http://localhost:${port}/index.html`;
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  const allErrs = [];

  async function mk(tasks, groups){
    const ctx = await browser.newContext({ viewport:{width:1180,height:900} });
    const page = await ctx.newPage();
    const errs=[]; page.on('pageerror',e=>errs.push(e.message));
    await page.addInitScript((st)=>{
      localStorage.setItem('duskState_v3', JSON.stringify(st));
      localStorage.setItem('currentPage','main');
      localStorage.removeItem('duskState_v4');
      localStorage.removeItem('dusk_premigration_v3');
    }, seedState(tasks, groups));
    await page.goto(url); await page.waitForTimeout(400);
    return { ctx, page, errs };
  }
  const v4 = (page) => page.evaluate(()=>JSON.parse(localStorage.getItem('duskState_v4')));
  const click = (page, sel) => page.evaluate((sel)=>{ const e=document.querySelector(sel); if(e) e.click(); return !!e; }, sel);

  const GRP = [ { id:5, name:'Грот', color:'#88aa55', collapsed:false, order:0 } ];

  // ── bulkSetGroup → assigns group to selected tasks ──
  {
    const { ctx, page, errs } = await mk([ task(11,'a'), task(12,'b') ], GRP);
    await page.evaluate(()=>{ selectedTaskIds.add(11); selectedTaskIds.add(12); _renderBulkGroupList(); });
    await page.waitForTimeout(100);
    rec('bulk group pills rendered', await page.locator('#bulk-group-list [data-act="bulkSetGroup"]').count() >= 2);
    const hit = await click(page, '#bulk-group-list [data-act="bulkSetGroup"][data-gid="5"]'); await page.waitForTimeout(200);
    const t = (await v4(page)).tasks;
    rec('bulkSetGroup(5) → both tasks grouped', hit && t.every(x=>x.groupId===5), `gids=${t.map(x=>x.groupId).join(',')}`);
    allErrs.push(...errs); await ctx.close();
  }

  // ── bulkSetGroup(null) "Без группы" → clears group ──
  {
    const { ctx, page, errs } = await mk([ task(11,'a',5), task(12,'b',5) ], GRP);
    await page.evaluate(()=>{ selectedTaskIds.add(11); selectedTaskIds.add(12); _renderBulkGroupList(); });
    await page.waitForTimeout(100);
    const hit = await click(page, '#bulk-group-list .bulk-group-none[data-act="bulkSetGroup"]'); await page.waitForTimeout(200);
    const t = (await v4(page)).tasks;
    rec('bulkSetGroup(null) → both ungrouped', hit && t.every(x=>x.groupId===null), `gids=${t.map(x=>x.groupId).join(',')}`);
    allErrs.push(...errs); await ctx.close();
  }

  // ── form group-chip dropdown: select + delete ──
  {
    const { ctx, page, errs } = await mk([ task(11,'a') ], GRP);
    await page.evaluate(()=>renderGroupChips('')); await page.waitForTimeout(100);
    rec('group chip options rendered', await page.locator('#grp-list [data-act="selectGroupChip"][data-chip="5"]').count() === 1);

    const hitSel = await click(page, '#grp-list [data-act="selectGroupChip"][data-chip="5"]'); await page.waitForTimeout(150);
    const selVal = await page.evaluate(()=>taskGroupSelect.value);
    rec('selectGroupChip(5) → hidden select set', hitSel && selVal === '5', `value=${selVal}`);

    // re-render options (selectGroupChip closed the picker), then delete-arm
    await page.evaluate(()=>renderGroupChips('')); await page.waitForTimeout(100);
    const valBefore = await page.evaluate(()=>taskGroupSelect.value);
    const hitDel = await click(page, '#grp-list .grp-dd-del[data-gid="5"]'); await page.waitForTimeout(150);
    const armed = await page.locator('#grp-list .grp-dd-del[data-gid="5"].confirm-armed').count() === 1;
    const stillThere = (await v4(page)).groups.length === 1;
    const valAfter = await page.evaluate(()=>taskGroupSelect.value);
    rec('deleteGroupById 1st click → arms, data-stop blocks select', hitDel && armed && stillThere && valAfter === valBefore,
        `armed=${armed} groups=${(await v4(page)).groups.length} selUnchanged=${valAfter===valBefore}`);
    allErrs.push(...errs); await ctx.close();
  }

  // ── bulk-bar delete button colour hover (hoverBg/outBg over/out) ──
  {
    const { ctx, page, errs } = await mk([ task(11,'a',5) ], GRP);
    await page.evaluate(()=>renderGroupBar()); await page.waitForTimeout(100);
    rec('group bar delete rendered', await page.locator('#groups-list .btn-pill-delete').count() === 1);
    const r = await page.evaluate(()=>{
      const el = document.querySelector('#groups-list .btn-pill-delete');
      const init = el.style.background;
      el.dispatchEvent(new MouseEvent('mouseover', { bubbles:true }));
      const over = el.style.background;
      el.dispatchEvent(new MouseEvent('mouseout', { bubbles:true }));
      const out = el.style.background;
      return { init, over, out };
    });
    rec('hover over→out swaps background and restores', r.over !== r.out && r.out === r.init, JSON.stringify(r));
    allErrs.push(...errs); await ctx.close();
  }

  rec('no pageerror', allErrs.length === 0, allErrs.join(' | '));

  await browser.close(); srv.close();
  const fails = results.filter(r=>!r.pass);
  console.log(`\n7c-SLICE3f SUMMARY  PASS ${results.length-fails.length}/${results.length}`);
  process.exit(fails.length?1:0);
})().catch(e=>{ console.error('CRASH',e); process.exit(2); });
