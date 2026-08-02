// 7c slice-1 (task-row event delegation) — real-click behaviour tests.
// Proves the document-level data-act dispatch fires for click / dblclick /
// keydown(kactivate) and that currentTarget-dependent float menus still anchor.
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
const seedState = () => ({
  tasks:[
    { id:11, text:'alpha', checked:false, priority:'none', color:null, groupId:null, order:0,
      pinned:false, note:'примечание', noteOpen:false, deadline:{mode:'month',value:'12'},
      repeat:'none', cycleChecked:false, nextReset:null,
      subtasks:[sub(101,'a1'),sub(102,'a2')], subtasksOpen:true },
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
  const context = await browser.newContext({ viewport:{width:1180,height:900} });
  const page = await context.newPage();
  const errs=[]; page.on('pageerror',e=>errs.push(e.message));
  await page.addInitScript((st)=>{
    localStorage.setItem('duskState_v3', JSON.stringify(st));
    localStorage.setItem('currentPage','main');
  }, seedState());
  await page.goto(url); await page.waitForTimeout(400);

  const v4 = async () => page.evaluate(()=>JSON.parse(localStorage.getItem('duskState_v4')||'null'));
  const T  = async () => (await v4()).tasks.find(t=>t.id===11);

  // row renders
  rec('row rendered', await page.locator('.task-item[data-id="11"]').count() === 1);

  // ── click: togglePin (no inline onclick anymore → must go through delegation) ──
  await page.click('.task-item[data-id="11"] .btn-pin');
  await page.waitForTimeout(120);
  rec('click→togglePin flips pinned', (await T()).pinned === true, `pinned=${(await T()).pinned}`);
  await page.click('.task-item[data-id="11"] .btn-pin');                 // toggle back
  await page.waitForTimeout(120);
  rec('click→togglePin flips back', (await T()).pinned === false);

  // ── dblclick: startInlineEdit (data-actdbl + _synEv + _tid) ──
  await page.dblclick('.task-item[data-id="11"] .task-text');
  await page.waitForTimeout(120);
  rec('dblclick→startInlineEdit makes text editable',
      await page.evaluate(()=>document.querySelector('.task-text[data-id="11"]').contentEditable==='true'));
  await page.keyboard.press('Escape');                                    // leave edit
  await page.waitForTimeout(120);

  // ── click: toggleTaskNote (data-pd + data-act) → panel becomes visible ──
  await page.click('.task-item[data-id="11"] .btn-note-toggle');
  await page.waitForTimeout(150);
  rec('click→toggleTaskNote shows note panel',
      await page.locator('.task-item[data-id="11"] .task-note-wrapper.visible').count() === 1);

  // ── click: openDeadlineModal (action button) → deadline-modal shown ──
  const modalShown = async () => page.evaluate(()=>{
    const el = document.getElementById('deadline-modal');
    return !!el && getComputedStyle(el).display !== 'none';
  });
  await page.click('.task-item[data-id="11"] .task-actions [data-act="openDeadlineModal"]');
  await page.waitForTimeout(200);
  rec('click→openDeadlineModal opens modal', await modalShown());
  await page.keyboard.press('Escape'); await page.waitForTimeout(250);
  rec('deadline modal closes', !(await modalShown()));

  // ── keydown kactivate: Enter on the deadline meta-pill opens the modal ──
  await page.focus('.task-item[data-id="11"] .deadline-tag[data-act="openDeadlineModal"]');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(200);
  rec('keydown(Enter)→kactivate opens modal', await modalShown());
  await page.keyboard.press('Escape'); await page.waitForTimeout(250);

  // ── click: openSnoozeMenu — float menu appears (proves _synEv.currentTarget=button) ──
  await page.click('.task-item[data-id="11"] [data-act="openSnoozeMenu"]');
  await page.waitForTimeout(150);
  rec('click→openSnoozeMenu floats menu (anchor ok)', await page.locator('.snooze-menu').count() >= 1);
  await page.keyboard.press('Escape'); await page.mouse.click(5,5); await page.waitForTimeout(150);

  // ── click: openTaskMoreMenu — task-more-menu appears ──
  await page.click('.task-item[data-id="11"] [data-act="openTaskMoreMenu"]');
  await page.waitForTimeout(150);
  rec('click→openTaskMoreMenu floats menu', await page.locator('.snooze-menu.task-more-menu').count() >= 1);
  await page.mouse.click(5,5); await page.waitForTimeout(150);

  // ── no page errors throughout ──
  rec('no pageerror', errs.length === 0, errs.join(' | '));

  await browser.close(); srv.close();
  const fails = results.filter(r=>!r.pass);
  console.log(`\n7c SUMMARY  PASS ${results.length-fails.length}/${results.length}`);
  process.exit(fails.length?1:0);
})().catch(e=>{ console.error('CRASH',e); process.exit(2); });
