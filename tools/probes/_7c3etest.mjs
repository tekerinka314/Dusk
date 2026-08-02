// 7c slice-3e (form subtasks + per-task add-subtask) — real-dispatch behaviour tests.
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

const task = (id,text,o={}) => ({ id, text, checked:false, priority:'none', color:null, groupId:null, order:0,
  pinned:false, note:'', deadline:null, repeat:'none', cycleChecked:false, nextReset:null,
  subtasks:o.subtasks||[], subtasksOpen:o.subtasksOpen!==false });
const seedState = (tasks) => ({ tasks, groups:[], archive:[], notes:[], notesArchive:[], templates:[], noteTemplates:[],
  nextId:100, nextGroupId:100, nextSubId:200, sortMode:'priority', sortModeOverrides:{} });

const results = [];
const rec = (name, pass, detail) => { results.push({ name, pass, detail }); console.log(`${pass?'PASS':'FAIL'}  ${name}  ${detail!==undefined?detail:''}`); };

(async()=>{
  await new Promise(r=>srv.listen(0,r));
  const port = srv.address().port;
  const url = `http://localhost:${port}/index.html`;
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  const allErrs = [];

  async function mk(tasks){
    const ctx = await browser.newContext({ viewport:{width:1180,height:900} });
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
  const dispatch = (page, sel, type, init={}) => page.evaluate(([sel,type,init])=>{
    const el = document.querySelector(sel); if (!el) return false;
    if (type === 'click') { el.click(); return true; }
    const Ctor = type === 'keydown' ? KeyboardEvent : MouseEvent;
    el.dispatchEvent(new Ctor(type, Object.assign({ bubbles:true, cancelable:true }, init)));
    return true;
  }, [sel,type,init]);
  const fs2 = (page) => page.evaluate(()=>formSubtasks.map(s=>({ text:s.text, prio:s.priority, note:s.note, dl: s.deadline||null })));
  const dlOpen = (page) => page.evaluate(()=>{ const el=document.getElementById('deadline-modal'); return !!el && getComputedStyle(el).display!=='none'; });

  // ── per-task add-subtask (Enter key + confirm button) ──
  {
    const { ctx, page, errs } = await mk([ task(11,'alpha',{ subtasksOpen:true }) ]);
    await page.fill('#sub-input-11', 'через Enter'); await page.waitForTimeout(60);
    await page.focus('#sub-input-11'); await page.keyboard.press('Enter'); await page.waitForTimeout(200);
    let t = (await v4(page)).tasks.find(t=>t.id===11);
    rec('add-subtask via Enter (handleSubAdd)', t.subtasks.length === 1 && t.subtasks[0].text === 'через Enter', `subs=${t.subtasks.length}`);

    await page.fill('#sub-input-11', 'через кнопку'); await page.waitForTimeout(60);
    await dispatch(page, '.task-item[data-id="11"] [data-act="addSubtask"]', 'click'); await page.waitForTimeout(200);
    t = (await v4(page)).tasks.find(t=>t.id===11);
    rec('add-subtask via confirm button (addSubtask)', t.subtasks.length === 2, `subs=${t.subtasks.length}`);
    allErrs.push(...errs); await ctx.close();
  }

  // ── form subtasks (modal create/edit list) ──
  {
    const { ctx, page, errs } = await mk([ task(11,'alpha') ]);
    await page.evaluate(()=>{
      formSubtasks = [
        { text:'fs0', priority:'none', note:'', repeat:'none' },
        { text:'fs1', priority:'none', note:'заметка', repeat:'none', deadline:{ mode:'month', value:'12' } },
      ];
      renderFormSubtasks();
    });
    await page.waitForTimeout(120);
    rec('form subtasks rendered', await page.locator('#form-sub-list .subtask-item[data-form-sub-idx]').count() === 2);

    // cycleFormSubPriority on idx0
    await dispatch(page, '#form-sub-list .subtask-item[data-form-sub-idx="0"] [data-act="cycleFormSubPriority"]', 'click'); await page.waitForTimeout(120);
    rec('cycleFormSubPriority changes prio', (await fs2(page))[0].prio !== 'none', `prio=${(await fs2(page))[0].prio}`);

    // startFormSubEdit (dblclick) on idx0 sub-text → contentEditable
    await dispatch(page, '#form-sub-list .subtask-item[data-form-sub-idx="0"] .sub-text', 'dblclick'); await page.waitForTimeout(120);
    rec('startFormSubEdit makes text editable',
        await page.evaluate(()=>{ const s=document.querySelector('#form-sub-list .subtask-item[data-form-sub-idx="0"] .sub-text'); return s && s.contentEditable==='true'; }));

    // toggleFormSubNote on idx0 → note wrapper opens
    await dispatch(page, '#form-sub-list .subtask-item[data-form-sub-idx="0"] [data-act="toggleFormSubNote"]', 'click'); await page.waitForTimeout(150);
    rec('toggleFormSubNote opens note panel',
        await page.evaluate(()=>{ const w=document.getElementById('form-subnote-0'); return !!w && (w.classList.contains('note-open')||w.classList.contains('has-note')); }));

    // openFormSubDeadline (set-btn on idx0, which has no deadline) → deadline modal
    await dispatch(page, '#form-sub-list .subtask-item[data-form-sub-idx="0"] [data-act="openFormSubDeadline"]', 'click'); await page.waitForTimeout(180);
    rec('openFormSubDeadline opens modal', await dlOpen(page));
    await page.keyboard.press('Escape'); await page.waitForTimeout(420);   // let the close animation fully settle before reopening

    // kactivate (Enter) on idx1 deadline pill → modal
    await dispatch(page, '#form-sub-list .subtask-item[data-form-sub-idx="1"] .sub-dl-pill', 'keydown', { key:'Enter' }); await page.waitForTimeout(250);
    rec('kactivate Enter on form sub-dl-pill opens modal', await dlOpen(page));
    await page.keyboard.press('Escape'); await page.waitForTimeout(420);

    // clearFormSubDeadline on idx1 (data-stop) → deadline cleared
    await dispatch(page, '#form-sub-list .subtask-item[data-form-sub-idx="1"] [data-act="clearFormSubDeadline"]', 'click'); await page.waitForTimeout(150);
    rec('clearFormSubDeadline clears deadline', (await fs2(page))[1].dl === null, `dl=${JSON.stringify((await fs2(page))[1].dl)}`);

    // removeFormSubtask on idx0 → list shrinks to 1 (removal is anim-deferred ~240ms)
    await dispatch(page, '#form-sub-list .subtask-item[data-form-sub-idx="0"] [data-act="removeFormSubtask"]', 'click'); await page.waitForTimeout(350);
    rec('removeFormSubtask removes a row', (await fs2(page)).length === 1, `len=${(await fs2(page)).length}`);

    allErrs.push(...errs); await ctx.close();
  }

  rec('no pageerror', allErrs.length === 0, allErrs.join(' | '));

  await browser.close(); srv.close();
  const fails = results.filter(r=>!r.pass);
  console.log(`\n7c-SLICE3e SUMMARY  PASS ${results.length-fails.length}/${results.length}`);
  process.exit(fails.length?1:0);
})().catch(e=>{ console.error('CRASH',e); process.exit(2); });
