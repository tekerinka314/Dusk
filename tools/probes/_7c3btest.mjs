// 7c slice-3b (sort picker + colour filter delegation) — real-click behaviour tests.
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

const task = (id,text,gid,color) => ({ id, text, checked:false, priority:'none', color:color||null, groupId:gid, order:0,
  pinned:false, note:'', deadline:null, repeat:'none', cycleChecked:false, nextReset:null, subtasks:[], subtasksOpen:false });
const seedState = () => ({
  tasks:[ task(11,'t1',5,'#c0392b'), task(12,'t2',null,'#2980b9') ],
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
      localStorage.removeItem('dusk_colorFilter');
    }, seedState());
    await page.goto(url); await page.waitForTimeout(400);
    return { ctx, page, errs };
  }
  const allErrs = [];
  const clickPortalOpt = (page,k) => page.evaluate((k)=>{
    const o = document.querySelector(`.task-sort-portal .task-sort-opt[data-k="${k}"]`); if (o) o.click(); return !!o;
  }, k);

  // ── per-group sort override (portaled list carries data-gid) ──
  {
    const { ctx, page, errs } = await mk();
    await page.click('.group-section[data-group-id="5"] .btn-group-sort'); await page.waitForTimeout(180);
    const portaled = await page.locator('.task-sort-portal').count() === 1;
    rec('group sort trigger → list portaled to body', portaled);
    const hit = await clickPortalOpt(page, 'order'); await page.waitForTimeout(180);
    const ov = await page.evaluate(()=>JSON.parse(localStorage.getItem('duskState_v4')).sortModeOverrides || {});
    rec('group sort option → per-group override set', hit && ov['5'] === 'order', `hit=${hit} ov=${JSON.stringify(ov)}`);
    allErrs.push(...errs); await ctx.close();
  }

  // ── toolbar (global) sort (portaled list, no data-gid) ──
  {
    const { ctx, page, errs } = await mk();
    await page.click('#btn-sort-mode'); await page.waitForTimeout(180);
    rec('toolbar sort trigger → list portaled', await page.locator('.task-sort-portal').count() === 1);
    const hit = await clickPortalOpt(page, 'alpha'); await page.waitForTimeout(180);
    const sm = await page.evaluate(()=>JSON.parse(localStorage.getItem('duskState_v4')).sortMode);
    rec('toolbar sort option → global sortMode set', hit && sm === 'alpha', `hit=${hit} sortMode=${sm}`);
    allErrs.push(...errs); await ctx.close();
  }

  // ── colour filter swatch + clear ──
  {
    const { ctx, page, errs } = await mk();
    await page.evaluate(()=>openColorFilterModal()); await page.waitForTimeout(200);
    const swCount = await page.locator('.color-filter-swatch[data-act="setColorFilter"]').count();
    rec('colour filter modal populated swatches', swCount >= 2, `swatches=${swCount}`);

    await page.evaluate(()=>{ const b=document.querySelector('.color-filter-swatch[data-color="#c0392b"]'); if(b) b.click(); }); await page.waitForTimeout(200);
    const cf1 = await page.evaluate(()=>localStorage.getItem('dusk_colorFilter'));
    rec('swatch click → colour filter set', cf1 === '#c0392b', `cf=${cf1}`);

    // reopen → clear button now present → clears
    await page.evaluate(()=>openColorFilterModal()); await page.waitForTimeout(200);
    await page.evaluate(()=>{ const b=document.querySelector('.color-filter-clear'); if(b) b.click(); }); await page.waitForTimeout(200);
    const cf2 = await page.evaluate(()=>localStorage.getItem('dusk_colorFilter'));
    rec('clear button → colour filter cleared', cf2 === null, `cf=${cf2}`);
    allErrs.push(...errs); await ctx.close();
  }

  rec('no pageerror', allErrs.length === 0, allErrs.join(' | '));

  await browser.close(); srv.close();
  const fails = results.filter(r=>!r.pass);
  console.log(`\n7c-SLICE3b SUMMARY  PASS ${results.length-fails.length}/${results.length}`);
  process.exit(fails.length?1:0);
})().catch(e=>{ console.error('CRASH',e); process.exit(2); });
