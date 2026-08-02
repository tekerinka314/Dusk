// Idea 8 data-layer (uuid + updatedAt + tombstones + v3→v4 migration) tests.
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

const sub = (id,text,over={}) => ({ id, text, checked:false, priority:'none', note:'', order:0, repeat:'none', cycleChecked:false, ...over });
const mkT = o => ({ id:o.id, text:o.text||('T'+o.id), checked:!!o.checked, priority:o.priority||'none',
  color:o.color||null, groupId:o.groupId??null, order:o.order??0, pinned:!!o.pinned, note:o.note||'',
  deadline:o.deadline||null, repeat:o.repeat||'none', cycleChecked:false, nextReset:null,
  subtasks:o.subtasks||[], subtasksOpen:true });
const mkG = (id,name)=>({ id, name, color:'#8a5cff' });
// A v3-shaped state: int ids, NO uid / updatedAt / tombstones anywhere.
const v3State = () => ({
  tasks:[
    mkT({id:11,text:'alpha',groupId:1,subtasks:[sub(101,'a1'),sub(102,'a2')]}),
    mkT({id:12,text:'beta',groupId:1}),
    mkT({id:13,text:'gamma',groupId:null}),
  ],
  groups:[ mkG(1,'Work'), mkG(2,'Home') ],
  archive:[ mkT({id:14,text:'archived-one',groupId:null,subtasks:[sub(103,'z1')]}) ],
  notes:[], notesArchive:[], templates:[], noteTemplates:[],
  nextId:100, nextGroupId:100, nextSubId:200, sortMode:'priority', sortModeOverrides:{},
});

const results = [];
const rec = (name, pass, detail) => { results.push({ name, pass, detail }); console.log(`${pass?'PASS':'FAIL'}  ${name}  ${detail!==undefined?detail:''}`); };
const eq = (a,b)=>JSON.stringify(a)===JSON.stringify(b);

(async()=>{
  await new Promise(r=>srv.listen(0,r));
  const port = srv.address().port;
  const url = `http://localhost:${port}/index.html`;
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });

  async function freshSeeded(stateObj){
    const context = await browser.newContext({ viewport:{width:1180,height:900} });
    const page = await context.newPage();
    const errs=[]; page.on('pageerror',e=>errs.push(e.message));
    await page.addInitScript((st)=>{
      localStorage.setItem('duskState_v3', JSON.stringify(st));
      localStorage.setItem('currentPage','main');
    }, stateObj);
    await page.goto(url); await page.waitForTimeout(350);
    return { context, page, errs };
  }

  // ======== Migration v3 → v4 + preservation ========
  try {
    const seed = v3State();
    const { context, page, errs } = await freshSeeded(seed);
    const r = await page.evaluate((seedRaw)=>{
      const v4 = JSON.parse(localStorage.getItem('duskState_v4')||'null');
      const v3raw = localStorage.getItem('duskState_v3');
      const pre = localStorage.getItem('dusk_premigration_v3');
      const allTasks = [...v4.tasks, ...v4.archive];
      const allSubs  = allTasks.flatMap(t=>t.subtasks||[]);
      const hasUid = a => a.every(x=>typeof x.uid==='string' && x.uid.length>0);
      const hasUpd = a => a.every(x=>typeof x.updatedAt==='number' && x.updatedAt>0);
      return {
        v4exists: !!v4,
        v3untouched: v3raw === JSON.stringify(seedRaw),
        preBackup: pre === JSON.stringify(seedRaw),
        tasksUid: hasUid(v4.tasks), tasksUpd: hasUpd(v4.tasks),
        groupsUid: hasUid(v4.groups), groupsUpd: hasUpd(v4.groups),
        archUid: hasUid(v4.archive), archUpd: hasUpd(v4.archive),
        subsUid: hasUid(allSubs),
        tombstones: Array.isArray(v4.tombstones) && v4.tombstones.length===0,
        nTasks: v4.tasks.length, nGroups: v4.groups.length, nArch: v4.archive.length,
        nSubs: allSubs.length,
        texts: v4.tasks.map(t=>t.text).sort(),
        intIdKept: v4.tasks.every(t=>typeof t.id==='number'),
      };
    }, seed);
    rec('mig: v4 created', r.v4exists);
    rec('mig: v3 left UNTOUCHED as fallback', r.v3untouched);
    rec('mig: one-time pre-migration backup == raw v3', r.preBackup);
    rec('mig: all tasks have uid', r.tasksUid);
    rec('mig: all tasks have updatedAt', r.tasksUpd);
    rec('mig: all groups have uid', r.groupsUid);
    rec('mig: all groups have updatedAt', r.groupsUpd);
    rec('mig: archive tasks have uid+updatedAt', r.archUid && r.archUpd);
    rec('mig: all subtasks have uid', r.subsUid);
    rec('mig: tombstones[] present & empty', r.tombstones);
    rec('mig: int id kept as DOM key (Design B)', r.intIdKept);
    rec('preserve: counts 3 tasks / 2 groups / 1 archive / 3 subs',
        r.nTasks===3 && r.nGroups===2 && r.nArch===1 && r.nSubs===3, `${r.nTasks}/${r.nGroups}/${r.nArch}/${r.nSubs}`);
    rec('preserve: task texts intact', eq(r.texts, ['alpha','beta','gamma']), JSON.stringify(r.texts));
    rec('mig: no pageerror', errs.length===0, errs.join('|'));
    await context.close();
  } catch(e){ rec('MIGRATION EXCEPTION', false, e.stack||e.message); }

  // ======== Idempotent reload: stable uids, no false updatedAt bump ========
  try {
    const seed = v3State();
    const { context, page, errs } = await freshSeeded(seed);
    const snap1 = await page.evaluate(()=>{
      const v4=JSON.parse(localStorage.getItem('duskState_v4'));
      return { uids:v4.tasks.map(t=>t.uid), upd:v4.tasks.map(t=>t.updatedAt), guids:v4.groups.map(g=>g.uid) };
    });
    await page.reload(); await page.waitForTimeout(350);
    const snap2 = await page.evaluate(()=>{
      const v4=JSON.parse(localStorage.getItem('duskState_v4'));
      return { uids:v4.tasks.map(t=>t.uid), upd:v4.tasks.map(t=>t.updatedAt), guids:v4.groups.map(g=>g.uid) };
    });
    rec('idemp: task uids stable across reload', eq(snap1.uids, snap2.uids));
    rec('idemp: group uids stable across reload', eq(snap1.guids, snap2.guids));
    rec('idemp: NO false updatedAt bump on reload', eq(snap1.upd, snap2.upd), `${JSON.stringify(snap1.upd)} vs ${JSON.stringify(snap2.upd)}`);
    rec('idemp: no pageerror', errs.length===0, errs.join('|'));
    await context.close();
  } catch(e){ rec('IDEMPOTENT EXCEPTION', false, e.stack||e.message); }

  // ======== updatedAt auto-bump on content edit ========
  try {
    const { context, page, errs } = await freshSeeded(v3State());
    const r = await page.evaluate(async ()=>{
      const before = state.tasks.map(t=>({uid:t.uid, u:t.updatedAt}));
      await new Promise(r=>setTimeout(r,8));
      // edit task[0] content directly, leave task[1] untouched
      state.tasks[0].text = 'alpha-EDITED';
      saveState();
      const a = state.tasks[0], b = state.tasks[1];
      const aBefore = before.find(x=>x.uid===a.uid).u, bBefore = before.find(x=>x.uid===b.uid).u;
      return { aBumped: a.updatedAt>aBefore, bUnchanged: b.updatedAt===bBefore };
    });
    rec('updatedAt: edited task bumped', r.aBumped);
    rec('updatedAt: untouched task NOT bumped', r.bUnchanged);

    // subtask edit bumps PARENT task (task is the merge atom)
    const r2 = await page.evaluate(async ()=>{
      const parent = state.tasks.find(t=>(t.subtasks||[]).length>0);
      const before = parent.updatedAt;
      await new Promise(r=>setTimeout(r,8));
      parent.subtasks[0].text = 'a1-EDITED';
      saveState();
      return { bumped: parent.updatedAt>before };
    });
    rec('updatedAt: subtask edit bumps PARENT (task=atom)', r2.bumped);
    rec('bump: no pageerror', errs.length===0, errs.join('|'));
    await context.close();
  } catch(e){ rec('BUMP EXCEPTION', false, e.stack||e.message); }

  // ======== Tombstones ========
  try {
    const { context, page, errs } = await freshSeeded(v3State());
    // permanent delete → tombstone
    const r = await page.evaluate(()=>{
      const t = state.tasks.find(x=>x.text==='gamma');
      const uid = t.uid, id = t.id;
      deleteTaskForever(id);
      const ts = state.tombstones.find(z=>z.uid===uid);
      return { gone: !state.tasks.some(x=>x.id===id), tomb: !!ts, type: ts&&ts.type };
    });
    rec('tombstone: deleteTaskForever removes task', r.gone);
    rec('tombstone: records {uid,type:task}', r.tomb && r.type==='task', r.type);

    // archiving is NOT a deletion → no tombstone, uid preserved into archive
    const r2 = await page.evaluate(()=>{
      const t = state.tasks.find(x=>x.text==='beta');
      const uid = t.uid, id = t.id;
      const before = state.tombstones.length;
      removeTask(id);
      const inArch = state.archive.find(a=>a.uid===uid);
      return { noNewTomb: state.tombstones.length===before, archivedSameUid: !!inArch };
    });
    rec('tombstone: archiving does NOT tombstone', r2.noNewTomb);
    rec('tombstone: archived task keeps same uid (identity)', r2.archivedSameUid);

    // subtask delete → subtask tombstone (parentUid set) + parent bump
    const r3 = await page.evaluate(async ()=>{
      const parent = state.tasks.find(t=>(t.subtasks||[]).length>0);
      const s = parent.subtasks[0];
      const suid = s.uid, puid = parent.uid;
      const pBefore = parent.updatedAt;
      await new Promise(r=>setTimeout(r,8));
      deleteSubtask(parent.id, s.id);
      await new Promise(r=>setTimeout(r,320)); // wait the anim safety-net commit
      const ts = state.tombstones.find(z=>z.uid===suid);
      const p = state.tasks.find(t=>t.uid===puid);
      return { gone: !p.subtasks.some(x=>x.uid===suid), tomb: !!ts, type: ts&&ts.type, parent: ts&&ts.parentUid===puid, bumped: p.updatedAt>pBefore };
    });
    rec('tombstone: deleteSubtask removes subtask', r3.gone);
    rec('tombstone: subtask tombstone {type:subtask,parentUid}', r3.tomb && r3.type==='subtask' && r3.parent);
    rec('tombstone: subtask delete bumps parent updatedAt', r3.bumped);
    rec('tombstone: no pageerror', errs.length===0, errs.join('|'));
    await context.close();
  } catch(e){ rec('TOMBSTONE EXCEPTION', false, e.stack||e.message); }

  // ======== Offline file:// (fallback uid path, no secure context) ========
  try {
    const fileUrl = 'file:///' + (ROOT + '/index.html').replace(/ /g,'%20');
    const context = await browser.newContext({ viewport:{width:1180,height:900} });
    const page = await context.newPage();
    const errs=[]; page.on('pageerror',e=>errs.push(e.message));
    await page.addInitScript((st)=>{
      localStorage.setItem('duskState_v3', JSON.stringify(st));
      localStorage.setItem('currentPage','main');
    }, v3State());
    await page.goto(fileUrl); await page.waitForTimeout(400);
    const r = await page.evaluate(()=>{
      const v4 = JSON.parse(localStorage.getItem('duskState_v4')||'null');
      if(!v4) return { ok:false };
      const allTasks=[...v4.tasks,...v4.archive];
      return { ok:true, uids: allTasks.every(t=>typeof t.uid==='string'&&t.uid.length>0),
               tomb: Array.isArray(v4.tombstones), n: v4.tasks.length };
    });
    rec('offline file://: app loaded & migrated to v4', r.ok && r.n===3, JSON.stringify(r));
    rec('offline file://: uids generated (fallback if no crypto)', !!r.uids);
    rec('offline file://: no pageerror', errs.length===0, errs.join('|'));
    await context.close();
  } catch(e){ rec('OFFLINE EXCEPTION', false, e.stack||e.message); }

  await browser.close();
  srv.close();
  const pass = results.filter(r=>r.pass).length, total = results.length;
  console.log(`\n==== ${pass}/${total} PASS ====`);
  process.exit(pass===total?0:1);
})();
