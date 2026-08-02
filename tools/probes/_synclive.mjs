// Sync Phase 1 — LIVE smoke test in real Chrome (Playwright headless).
// Verifies the §3 model tweaks behave in the running app + the merge engine
// (dusk/09-sync.js) actually loads & round-trips in the browser. No network.
import http from 'http';
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright-core');

const ROOT = 'D:/VSCode projects/DUSK_v2.0';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const HEADLESS = !process.argv.includes('--show');   // pass --show to watch in a real window
const MIME = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.json':'application/json', '.svg':'image/svg+xml' };
const srv = http.createServer((q,s)=>{ let u=decodeURIComponent(q.url.split('?')[0]); if(u==='/')u='/index.html';
  fs.readFile(path.join(ROOT,u),(e,d)=>{ if(e){s.writeHead(404);s.end('nf');return;} s.writeHead(200,{'Content-Type':MIME[path.extname(u)]||'application/octet-stream'}); s.end(d); }); });

const sub = (id,text,over={}) => ({ id, text, checked:false, priority:'none', note:'', order:0, repeat:'none', cycleChecked:false, ...over });
const mkT = o => ({ id:o.id, text:o.text||('T'+o.id), checked:!!o.checked, priority:o.priority||'none',
  color:o.color||null, groupId:o.groupId??null, order:o.order??0, pinned:!!o.pinned, note:o.note||'',
  deadline:o.deadline||null, repeat:o.repeat||'none', cycleChecked:false, nextReset:null,
  subtasks:o.subtasks||[], subtasksOpen:true });
const v3State = () => ({
  tasks:[ mkT({id:11,text:'alpha',groupId:1,subtasks:[sub(101,'a1'),sub(102,'a2')]}), mkT({id:12,text:'beta'}) ],
  groups:[ {id:1,name:'Work',color:'#8a5cff'} ],
  archive:[], notes:[{id:'note-xyz', title:'N', body:'B', fmt:true, color:null, createdAt:1, updatedAt:1}],
  notesArchive:[], templates:[], noteTemplates:[],
  nextId:100, nextGroupId:100, nextSubId:200, sortMode:'priority', sortModeOverrides:{},
});

let pass=0, fail=0;
const rec=(name,cond,detail)=>{ if(cond)pass++; else { fail++; console.log(`  FAIL: ${name}  ${detail??''}`); } };

(async()=>{
  await new Promise(r=>srv.listen(0,r));
  const port = srv.address().port;
  const url = `http://localhost:${port}/index.html`;
  const browser = await chromium.launch({ executablePath: CHROME, headless: HEADLESS });
  const context = await browser.newContext({ viewport:{width:1180,height:900} });
  const page = await context.newPage();
  const errs=[]; page.on('pageerror',e=>errs.push(e.message));
  await page.addInitScript((st)=>{ localStorage.setItem('duskState_v3', JSON.stringify(st)); localStorage.setItem('currentPage','main'); }, v3State());
  await page.goto(url); await page.waitForTimeout(400);

  // ── boot + engine present ──────────────────────────────────────────────────
  rec('app boots, no pageerror', errs.length===0, errs.join('|'));
  const eng = await page.evaluate(()=>({
    merge: typeof window.mergeStates, get: typeof window.getSyncSubset,
    apply: typeof window.applySyncSubset, unres: typeof window.unresolvedCount,
  }));
  rec('09-sync.js loaded in browser (mergeStates/getSyncSubset/applySyncSubset)',
      eng.merge==='function' && eng.get==='function' && eng.apply==='function', JSON.stringify(eng));

  // ── migration backfill: subtasks gained updatedAt; templates path safe ──────
  const mig = await page.evaluate(()=>{
    const t = state.tasks.find(x=>x.subtasks.length);
    return { subUpd: t.subtasks.every(s=>typeof s.updatedAt==='number' && s.updatedAt>0),
             journal: Array.isArray(state.syncJournal) };
  });
  rec('migration: subtasks have updatedAt', mig.subUpd);
  rec('normalizeState: syncJournal array exists', mig.journal);

  // ── monotonic clock ─────────────────────────────────────────────────────────
  const mono = await page.evaluate(()=>{ const a=nowTs(), b=nowTs(), c=nowTs(); return b>a && c>b; });
  rec('nowTs() strictly monotonic', mono);

  // ── subtask edit bumps its own updatedAt (auto-diff) ────────────────────────
  const subBump = await page.evaluate(()=>{
    const t = state.tasks.find(x=>x.subtasks.length);
    const s = t.subtasks[0]; const before = s.updatedAt; const pBefore = t.updatedAt;
    s.text = s.text + '-EDIT'; saveState();
    return { subBumped: s.updatedAt>before, parentBumped: t.updatedAt>pBefore };
  });
  rec('subtask edit bumps subtask updatedAt', subBump.subBumped);
  rec('subtask edit also bumps parent updatedAt', subBump.parentBumped);

  // ── archive stamps a newer updatedAt (location change) ──────────────────────
  const arch = await page.evaluate(()=>{
    const t = state.tasks.find(x=>x.text.startsWith('beta')); const before = t.updatedAt; const id=t.id;
    removeTask(id);
    const a = state.archive.find(x=>x.uid===t.uid);
    return { inArchive: !!a, stamped: a && a.updatedAt>before };
  });
  rec('archive: task moved to archive', arch.inArchive);
  rec('archive: updatedAt stamped newer than pre-archive', arch.stamped);

  // ── restore stamps a newer updatedAt ────────────────────────────────────────
  const rest = await page.evaluate(async()=>{
    const a = state.archive[0]; const before = a.updatedAt; const id=a.id;
    restoreTask(id); await new Promise(r=>setTimeout(r,50));
    const t = state.tasks.find(x=>x.uid===a.uid);
    return { back: !!t, stamped: t && t.updatedAt>before };
  });
  rec('restore: task back in live list', rest.back);
  rec('restore: updatedAt stamped newer', rest.stamped);

  // ── template identity backfill via normalizeState ───────────────────────────
  const tpl = await page.evaluate(()=>{
    state.templates.push({ id:1, name:'legacy-tpl', text:'x' });        // legacy template: no uid/timestamps
    normalizeState();
    const t = state.templates.find(x=>x.name==='legacy-tpl');
    return { uid: !!t.uid, upd: typeof t.updatedAt==='number', crt: typeof t.createdAt==='number' };
  });
  rec('template backfill: gains uid', tpl.uid);
  rec('template backfill: gains updatedAt + createdAt', tpl.upd && tpl.crt);

  // ── engine round-trips IN THE BROWSER (extract → merge → apply) ─────────────
  const rt = await page.evaluate(()=>{
    const before = JSON.stringify({ t:state.tasks.length, a:state.archive.length, n:state.notes.length });
    const sub = getSyncSubset(state);
    const empty = { tasks:[],groups:[],notes:[],templates:[],noteTemplates:[],tombstones:[],syncJournal:[],
                    _alloc:{nextId:1,nextGroupId:1,nextSubId:1,nextTemplateId:1} };
    const { merged, conflicts } = mergeStates(null, sub, empty);     // union with nothing → identity
    const clone = JSON.parse(JSON.stringify(state));
    applySyncSubset(clone, merged);
    const after = JSON.stringify({ t:clone.tasks.length, a:clone.archive.length, n:clone.notes.length });
    // every task still has a unique int id + a groupId that resolves (or null)
    const ids = clone.tasks.map(t=>t.id); const uniq = new Set(ids).size===ids.length;
    const gidsOk = clone.tasks.every(t=>t.groupId===null || clone.groups.some(g=>g.id===t.groupId));
    return { before, after, conflicts:conflicts.length, uniq, gidsOk };
  });
  rec('engine round-trip preserves counts (tasks/archive/notes)', rt.before===rt.after, `${rt.before} -> ${rt.after}`);
  rec('engine round-trip: 0 conflicts (identity merge)', rt.conflicts===0, 'conflicts='+rt.conflicts);
  rec('engine round-trip: unique int ids', rt.uniq);
  rec('engine round-trip: every groupId resolves', rt.gidsOk);

  rec('no pageerror through whole run', errs.length===0, errs.join('|'));

  if (!HEADLESS) await page.waitForTimeout(4000);
  await browser.close(); srv.close();
  console.log(`\nSYNC live smoke: ${pass} passed, ${fail} failed  (total ${pass+fail})`);
  process.exit(fail?1:0);
})();
