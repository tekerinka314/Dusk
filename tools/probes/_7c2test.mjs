// 7c slice-2 (subtask event delegation) — real-click behaviour tests.
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

const sub = (id,text,o={}) => ({ id, text, checked:!!o.checked, priority:o.priority||'none', note:o.note||'', order:o.order||0, repeat:'none', cycleChecked:false, deadline:o.deadline||null });
const seedState = () => ({
  tasks:[
    { id:11, text:'alpha', checked:false, priority:'none', color:null, groupId:null, order:0,
      pinned:false, note:'', deadline:null, repeat:'none', cycleChecked:false, nextReset:null,
      subtasks:[ sub(101,'a1'), sub(102,'a2',{note:'hi',deadline:{mode:'month',value:'12'}}), sub(103,'d1',{checked:true}) ],
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
  const allErrs = [];

  async function mk(filter, split){
    const ctx = await browser.newContext({ viewport:{width:1180,height:900} });
    const page = await ctx.newPage();
    page.on('pageerror',e=>allErrs.push(e.message));
    await page.addInitScript(([st,f,sp])=>{
      localStorage.setItem('duskState_v3', JSON.stringify(st));
      localStorage.setItem('currentPage','main');
      localStorage.setItem('isFiltered', f);
      localStorage.setItem('groupSplitMode', sp);
      localStorage.removeItem('duskState_v4');
      localStorage.removeItem('dusk_premigration_v3');
    }, [seedState(), filter, split]);
    await page.goto(url); await page.waitForTimeout(400);
    return { ctx, page };
  }
  const v4sub = (page, sid) => page.evaluate((sid)=>{
    const t = JSON.parse(localStorage.getItem('duskState_v4')).tasks.find(t=>t.id===11);
    return t.subtasks.find(s=>s.id===sid) || null;
  }, sid);

  // ===== Scene A: in-place interactions (filter off, standard) =====
  {
    const { ctx, page } = await mk('0','0');
    rec('subtasks rendered', await page.locator('.subtask-item').count() === 3);

    await page.click('.subtask-item[data-sid="101"] .sub-prio-btn'); await page.waitForTimeout(120);
    rec('click→cycleSubPriority changes priority', (await v4sub(page,101)).priority !== 'none', `prio=${(await v4sub(page,101)).priority}`);

    await page.click('.subtask-item[data-sid="101"] .sub-check'); await page.waitForTimeout(350);  // toggle defers a sublist rebuild (~220ms) — let it settle before the next step
    rec('click→toggleSubtask checks sub', (await v4sub(page,101)).checked === true);

    // toggleSubNote BEFORE any inline edit — note-open is ephemeral DOM state, so a
    // later render() (e.g. an edit commit) would wipe it; keep this clean.
    // 102 carries a note; a rebuild re-opens non-dismissed note wraps (existing
    // behaviour), so assert the toggle FLIPS note-open rather than ends open. The
    // bubbling el.click() routes through the document-delegated dispatch.
    const noteBefore = await page.evaluate(()=> document.getElementById('subnote-11-102').classList.contains('note-open'));
    await page.evaluate(()=>{ const b=document.querySelector('.subtask-item[data-sid="102"] .btn-sub-note-toggle'); if (b) b.click(); }); await page.waitForTimeout(150);
    const noteAfter = await page.evaluate(()=> document.getElementById('subnote-11-102').classList.contains('note-open'));
    rec('click→toggleSubNote toggles note panel', noteBefore !== noteAfter, `before=${noteBefore} after=${noteAfter}`);

    // note-delete: its button is reveal-animated and visually overlaps the row actions
    // in headless layout, so use a bubbling el.click() (still routes through the document
    // delegated listener — the real dispatch path) instead of a positional click.
    await page.evaluate(()=>{ const b=document.querySelector('.subtask-item[data-sid="102"] .btn-sub-note-delete'); if (b) b.click(); }); await page.waitForTimeout(200);
    rec('click→_noteDeleteClick clears sub note', ((await v4sub(page,102)).note||'') === '', `note="${(await v4sub(page,102)).note}"`);

    // kactivate on sub-deadline pill (102 still has its deadline → pill rendered)
    const dlShown = async () => page.evaluate(()=>{ const el=document.getElementById('deadline-modal'); return !!el && getComputedStyle(el).display!=='none'; });
    await page.focus('.subtask-item[data-sid="102"] .sub-dl-pill'); await page.keyboard.press('Enter'); await page.waitForTimeout(200);
    rec('keydown(Enter)→kactivate opens sub-deadline modal', await dlShown());
    await page.keyboard.press('Escape'); await page.waitForTimeout(250);

    // inline edit LAST (its lingering edit state can trigger a render on blur)
    await page.dblclick('.subtask-item[data-sid="101"] .sub-text'); await page.waitForTimeout(120);
    rec('dblclick→startSubEdit makes editable',
        await page.evaluate(()=>{ const s=document.querySelector('.subtask-item[data-sid="101"] .sub-text'); return s && s.contentEditable==='true'; }));
    await page.keyboard.press('Escape'); await page.waitForTimeout(100);

    await ctx.close();
  }

  // ===== Scene B: promoteSubtask (filter off) =====
  {
    const { ctx, page } = await mk('0','0');
    await page.click('.subtask-item[data-sid="101"] [data-act="promoteSubtask"]'); await page.waitForTimeout(200);
    const r = await page.evaluate(()=>{ const st=JSON.parse(localStorage.getItem('duskState_v4')); return { tasks: st.tasks.length, subs: st.tasks.find(t=>t.id===11).subtasks.length }; });
    rec('click→promoteSubtask adds a task & removes the sub', r.tasks === 2 && r.subs === 2, JSON.stringify(r));
    await ctx.close();
  }

  // ===== Scene C: deleteSubtask + tombstone (filter off) =====
  {
    const { ctx, page } = await mk('0','0');
    await page.click('.subtask-item[data-sid="101"] [data-act="deleteSubtask"]'); await page.waitForTimeout(300);
    const r = await page.evaluate(()=>{ const st=JSON.parse(localStorage.getItem('duskState_v4')); const t=st.tasks.find(x=>x.id===11); return { has101: t.subtasks.some(s=>s.id===101), tombs: (st.tombstones||[]).filter(x=>x.type==='subtask').length }; });
    rec('click→deleteSubtask removes sub + tombstone', r.has101 === false && r.tombs >= 1, JSON.stringify(r));
    await ctx.close();
  }

  // ===== Scene D: split-zone header toggle (filter off, split mode) =====
  {
    const { ctx, page } = await mk('0','1');
    rec('split: done header present', await page.locator('.sub-split-done-header').count() === 1);
    await page.click('.sub-split-done-header'); await page.waitForTimeout(150);
    rec('click→toggleSubSplitDone collapses zone',
        await page.locator('.sub-split-done-header.collapsed').count() === 1);
    await ctx.close();
  }

  rec('no pageerror', allErrs.length === 0, allErrs.join(' | '));

  await browser.close(); srv.close();
  const fails = results.filter(r=>!r.pass);
  console.log(`\n7c-SLICE2 SUMMARY  PASS ${results.length-fails.length}/${results.length}`);
  process.exit(fails.length?1:0);
})().catch(e=>{ console.error('CRASH',e); process.exit(2); });
