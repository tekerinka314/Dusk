// 7c slice-3c (body-level float menus) — real-click behaviour tests.
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

const sub = (id,text) => ({ id, text, checked:false, priority:'none', note:'', order:0, repeat:'none', cycleChecked:false });
const task = (id,text,o={}) => ({ id, text, checked:false, priority:'none', color:null, groupId:null, order:o.order||0,
  pinned:false, note:'', deadline:o.deadline||null, repeat:'none', cycleChecked:false, nextReset:null,
  subtasks:o.subtasks||[], subtasksOpen:!!o.subtasks });
const seedState = (tasks) => ({
  tasks, groups:[], archive:[], notes:[], notesArchive:[], templates:[], noteTemplates:[],
  nextId:100, nextGroupId:100, nextSubId:200, sortMode:'priority', sortModeOverrides:{},
});

const results = [];
const rec = (name, pass, detail) => { results.push({ name, pass, detail }); console.log(`${pass?'PASS':'FAIL'}  ${name}  ${detail!==undefined?detail:''}`); };

(async()=>{
  await new Promise(r=>srv.listen(0,r));
  const port = srv.address().port;
  const url = `http://localhost:${port}/index.html`;
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  const allErrs = [];

  async function mk(tasks){
    const ctx = await browser.newContext({ viewport:{width:1180,height:900}, acceptDownloads:true });
    const page = await ctx.newPage();
    const errs=[]; page.on('pageerror',e=>errs.push(e.message));
    await page.addInitScript((st)=>{
      localStorage.setItem('duskState_v3', JSON.stringify(st));
      localStorage.setItem('currentPage','main');
      localStorage.removeItem('duskState_v4');
      localStorage.removeItem('dusk_premigration_v3');
    }, seedState(tasks));
    await page.goto(url); await page.waitForTimeout(400);
    return { ctx, page, errs };
  }
  const v4 = (page) => page.evaluate(()=>JSON.parse(localStorage.getItem('duskState_v4')));
  const clickMenu = (page, sel) => page.evaluate((sel)=>{ const e=document.querySelector(sel); if(e) e.click(); return !!e; }, sel);

  // ── snooze menu ──
  {
    const { ctx, page, errs } = await mk([ task(11,'alpha',{deadline:{mode:'month',value:'12'}}) ]);
    await page.click('.task-item[data-id="11"] [data-act="openSnoozeMenu"]'); await page.waitForTimeout(180);
    rec('snooze menu opened', await page.locator('.snooze-menu [data-act="snoozeDeadline"]').count() >= 3);
    const hit = await clickMenu(page, '.snooze-menu [data-act="snoozeDeadline"][data-snz="1h"]'); await page.waitForTimeout(200);
    const dl = (await v4(page)).tasks.find(t=>t.id===11).deadline;
    rec('snooze +1h → deadline mode becomes date', hit && dl && dl.mode === 'date', `hit=${hit} dl=${JSON.stringify(dl)}`);
    allErrs.push(...errs); await ctx.close();
  }

  // ── task-more: duplicate ──
  {
    const { ctx, page, errs } = await mk([ task(11,'alpha'), task(12,'beta',{order:1}) ]);
    await page.click('.task-item[data-id="11"] [data-act="openTaskMoreMenu"]'); await page.waitForTimeout(180);
    rec('task-more menu opened', await page.locator('.task-more-menu [data-act="_taskMore"]').count() >= 2);
    const hit = await clickMenu(page, '.task-more-menu [data-act="_taskMore"][data-more="dup"]'); await page.waitForTimeout(200);
    rec('more → duplicate → tasks +1', hit && (await v4(page)).tasks.length === 3, `len=${(await v4(page)).tasks.length}`);
    allErrs.push(...errs); await ctx.close();
  }

  // ── task-more: save as template ──
  {
    const { ctx, page, errs } = await mk([ task(11,'alpha'), task(12,'beta',{order:1}) ]);
    await page.click('.task-item[data-id="11"] [data-act="openTaskMoreMenu"]'); await page.waitForTimeout(180);
    const hit = await clickMenu(page, '.task-more-menu [data-act="_taskMore"][data-more="tpl"]'); await page.waitForTimeout(200);
    rec('more → template → templates +1', hit && (await v4(page)).templates.length === 1, `tpl=${(await v4(page)).templates.length}`);
    allErrs.push(...errs); await ctx.close();
  }

  // ── task-more: demote → pick target (no subs → direct) ──
  {
    const { ctx, page, errs } = await mk([ task(11,'alpha'), task(12,'beta',{order:1}) ]);
    await page.click('.task-item[data-id="11"] [data-act="openTaskMoreMenu"]'); await page.waitForTimeout(180);
    await clickMenu(page, '.task-more-menu [data-act="_taskMore"][data-more="demote"]'); await page.waitForTimeout(220);
    rec('demote menu lists target', await page.locator('.demote-menu [data-act="_pickDemoteTarget"][data-target="12"]').count() === 1);
    const hit = await clickMenu(page, '.demote-menu [data-act="_pickDemoteTarget"][data-target="12"]'); await page.waitForTimeout(250);
    const st = await v4(page);
    const t12 = st.tasks.find(t=>t.id===12);
    rec('pick target → task demoted into subtask', hit && st.tasks.length === 1 && t12 && t12.subtasks.length === 1,
        `len=${st.tasks.length} subs=${t12?t12.subtasks.length:'?'}`);
    allErrs.push(...errs); await ctx.close();
  }

  // ── task-more: sub-check mode (per task) ──
  {
    const { ctx, page, errs } = await mk([ task(11,'alpha',{subtasks:[sub(101,'s1'),sub(102,'s2')]}) ]);
    await page.click('.task-item[data-id="11"] [data-act="openTaskMoreMenu"]'); await page.waitForTimeout(180);
    await clickMenu(page, '.task-more-menu [data-act="_taskMore"][data-more="submode"]'); await page.waitForTimeout(220);
    rec('submode menu opened', await page.locator('.submode-menu [data-act="setTaskSubMode"]').count() === 3);
    const hit = await clickMenu(page, '.submode-menu [data-act="setTaskSubMode"][data-mode="all"]'); await page.waitForTimeout(200);
    rec('submode → setTaskSubMode all', hit && (await v4(page)).tasks.find(t=>t.id===11).subCheckMode === 'all');
    allErrs.push(...errs); await ctx.close();
  }

  // ── global sub-check mode (toolbar) ──
  {
    const { ctx, page, errs } = await mk([ task(11,'alpha',{subtasks:[sub(101,'s1')]}) ]);
    await page.click('#btn-sub-anymode'); await page.waitForTimeout(180);
    rec('global submode menu opened', await page.locator('.submode-menu [data-act="setGlobalSubMode"]').count() === 2);
    const hit = await clickMenu(page, '.submode-menu [data-act="setGlobalSubMode"][data-mode="any"]'); await page.waitForTimeout(200);
    rec('global submode → subAnyMode true', hit && (await v4(page)).subAnyMode === true);
    allErrs.push(...errs); await ctx.close();
  }

  // ── export menu → triggers a download ──
  {
    const { ctx, page, errs } = await mk([ task(11,'alpha') ]);
    await page.click('#btn-export'); await page.waitForTimeout(180);
    rec('export menu opened', await page.locator('[data-act="exportData"]').count() === 3);
    const dlP = page.waitForEvent('download', { timeout: 2500 }).catch(()=>null);
    await clickMenu(page, '[data-act="exportData"][data-exp="tasks"]');
    const dl = await dlP;
    rec('export tasks → download fired', !!dl, dl ? dl.suggestedFilename() : 'no download');
    allErrs.push(...errs); await ctx.close();
  }

  rec('no pageerror', allErrs.length === 0, allErrs.join(' | '));

  await browser.close(); srv.close();
  const fails = results.filter(r=>!r.pass);
  console.log(`\n7c-SLICE3c SUMMARY  PASS ${results.length-fails.length}/${results.length}`);
  process.exit(fails.length?1:0);
})().catch(e=>{ console.error('CRASH',e); process.exit(2); });
