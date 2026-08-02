// 7c slice-3a (group header cluster delegation) — real-click behaviour tests.
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

const task = (id,text,gid) => ({ id, text, checked:false, priority:'none', color:null, groupId:gid, order:0,
  pinned:false, note:'', deadline:null, repeat:'none', cycleChecked:false, nextReset:null, subtasks:[], subtasksOpen:false });
const seedState = () => ({
  tasks:[ task(11,'t1',5), task(12,'t2',5) ],
  groups:[ { id:5, name:'Грот', color:'#88aa55', collapsed:false, order:0 } ],
  archive:[], notes:[], notesArchive:[], templates:[], noteTemplates:[],
  nextId:100, nextGroupId:100, nextSubId:200, sortMode:'priority', sortModeOverrides:{},
});

const results = [];
const rec = (name, pass, detail) => { results.push({ name, pass, detail }); console.log(`${pass?'PASS':'FAIL'}  ${name}  ${detail!==undefined?detail:''}`); };

(async()=>{
  await new Promise(r=>srv.listen(0,r));
  const port = srv.address().port;
  const url = `http://localhost:${port}/index.html`;
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });

  async function mk(){
    const ctx = await browser.newContext({ viewport:{width:1180,height:900} });
    const page = await ctx.newPage();
    const errs=[]; page.on('pageerror',e=>errs.push(e.message));
    await page.addInitScript((st)=>{
      localStorage.setItem('duskState_v3', JSON.stringify(st));
      localStorage.setItem('currentPage','main');
      localStorage.removeItem('duskState_v4');
      localStorage.removeItem('dusk_premigration_v3');
    }, seedState());
    await page.goto(url); await page.waitForTimeout(400);
    return { ctx, page, errs };
  }
  const allErrs = [];
  const SEC = '.group-section[data-group-id="5"]';

  // ── header click toggles collapse, drag-handle does NOT ──
  {
    const { ctx, page, errs } = await mk();
    rec('group section rendered', await page.locator(SEC).count() === 1);

    await page.click(`${SEC} .group-header`); await page.waitForTimeout(150);
    rec('click .group-header → collapses', await page.locator(`${SEC}.collapsed`).count() === 1);
    await page.click(`${SEC} .group-header`); await page.waitForTimeout(150);
    rec('click .group-header again → expands', await page.locator(`${SEC}.collapsed`).count() === 0);

    // drag-handle is data-act="noop" → must NOT collapse
    await page.evaluate((sec)=>{ document.querySelector(sec+' .group-drag-handle').click(); }, SEC);
    await page.waitForTimeout(120);
    rec('click .group-drag-handle → no collapse (noop)', await page.locator(`${SEC}.collapsed`).count() === 0);
    allErrs.push(...errs); await ctx.close();
  }

  // ── toggleFocusGroup ──
  {
    const { ctx, page, errs } = await mk();
    await page.click(`${SEC} [data-act="toggleFocusGroup"]`); await page.waitForTimeout(150);
    rec('click toggleFocusGroup → group-focused', await page.locator('.group-section.group-focused').count() === 1);
    allErrs.push(...errs); await ctx.close();
  }

  // ── toggleScheduleMode (per-group) toggles active-sched on its button ──
  {
    const { ctx, page, errs } = await mk();
    await page.click(`${SEC} [data-act="toggleScheduleMode"]`); await page.waitForTimeout(150);
    rec('click toggleScheduleMode → button active-sched',
        await page.locator(`${SEC} [data-act="toggleScheduleMode"].active-sched`).count() === 1);
    allErrs.push(...errs); await ctx.close();
  }

  // ── duplicateGroup adds a group ──
  {
    const { ctx, page, errs } = await mk();
    await page.click(`${SEC} [data-act="duplicateGroup"]`); await page.waitForTimeout(200);
    const n = await page.evaluate(()=>JSON.parse(localStorage.getItem('duskState_v4')).groups.length);
    rec('click duplicateGroup → groups +1', n === 2, `groups=${n}`);
    allErrs.push(...errs); await ctx.close();
  }

  // ── openRenameGroupModal opens a modal ──
  {
    const { ctx, page, errs } = await mk();
    await page.click(`${SEC} [data-act="openRenameGroupModal"]`); await page.waitForTimeout(200);
    const shown = await page.evaluate(()=>{
      const ids=['rename-group-modal','group-rename-modal','rename-modal'];
      const byId = ids.map(i=>document.getElementById(i)).find(Boolean);
      if (byId) return getComputedStyle(byId).display !== 'none';
      // fallback: any visible modal overlay with a text input focused
      const ov = Array.from(document.querySelectorAll('.modal-overlay,.modal')).find(m=>getComputedStyle(m).display!=='none' && m.offsetParent!==null);
      return !!ov;
    });
    rec('click openRenameGroupModal → modal shown', shown);
    allErrs.push(...errs); await ctx.close();
  }

  // ── deleteGroup: 1st click arms (confirm), 2nd deletes + tombstone ──
  {
    const { ctx, page, errs } = await mk();
    await page.click(`${SEC} [data-act="deleteGroup"]`); await page.waitForTimeout(150);
    const armed = await page.locator(`${SEC} .btn-group-action.danger.confirm-armed`).count() === 1;
    const stillThere = await page.locator(SEC).count() === 1;
    rec('deleteGroup 1st click → arms, no delete', armed && stillThere, `armed=${armed} present=${stillThere}`);

    await page.click(`${SEC} [data-act="deleteGroup"]`); await page.waitForTimeout(250);
    const r = await page.evaluate(()=>{ const st=JSON.parse(localStorage.getItem('duskState_v4'));
      return { groups: st.groups.length, gtomb:(st.tombstones||[]).filter(x=>x.type==='group').length }; });
    rec('deleteGroup 2nd click → group gone + tombstone', r.groups === 0 && r.gtomb >= 1, JSON.stringify(r));
    allErrs.push(...errs); await ctx.close();
  }

  rec('no pageerror', allErrs.length === 0, allErrs.join(' | '));

  await browser.close(); srv.close();
  const fails = results.filter(r=>!r.pass);
  console.log(`\n7c-SLICE3a SUMMARY  PASS ${results.length-fails.length}/${results.length}`);
  process.exit(fails.length?1:0);
})().catch(e=>{ console.error('CRASH',e); process.exit(2); });
