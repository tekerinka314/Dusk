// Two-device END-TO-END sync conflict test, CLEAN STATE (no stale tombstones).
// Two real Chrome contexts (separate localStorage) share ONE in-memory Drive held
// in node (exposeFunction). Each page runs the REAL syncNow loop + merge engine.
//
// Scenario 1 — same task renamed on both offline devices:
//   must be a FIELD conflict (not delete-vs-edit); newer wins; loser quarantined;
//   RESTORE edits the EXISTING task (no duplicate) and propagates to the other device.
// Scenario 2 — genuine delete-vs-edit (A deletes, B edits):
//   default DELETE + quarantine; RESTORE re-creates exactly ONE record (same uid),
//   propagates to the other device with no duplicate.
import http from 'http'; import fs from 'fs'; import path from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright-core');
const ROOT='D:/VSCode projects/DUSK_v2.0';
const CHROME='C:/Program Files/Google/Chrome/Application/chrome.exe';
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.jpg':'image/jpeg'};
const srv=http.createServer((q,s)=>{let u=decodeURIComponent(q.url.split('?')[0]);if(u==='/')u='/index.html';
  fs.readFile(path.join(ROOT,u),(e,d)=>{if(e){s.writeHead(404);s.end('nf');return;}s.writeHead(200,{'Content-Type':MIME[path.extname(u)]||'application/octet-stream'});s.end(d);});});

let pass=0,fail=0; const rec=(n,c,d)=>{if(c)pass++;else{fail++;console.log('  FAIL:',n,d!=null?'· '+JSON.stringify(d):'');}};

// ── shared Drive (node-side, both pages talk to it) ──────────────────────────
let drive=null, pushCount=0;
const driveDownload = () => drive ? { subset: JSON.parse(JSON.stringify(drive.subset)), version: drive.version, fileId:'f1' } : { empty:true };
const drivePush = (subset, expectedVersion) => {
  const cur = drive ? drive.version : null;
  if (expectedVersion != null && String(expectedVersion) !== String(cur)) return { conflict:true, current: cur };
  const v=(cur||0)+1; drive={ subset, version:v }; pushCount++; return { fileId:'f1', version:v };
};

const FAKE = () => {
  window.cloudIsConfigured=()=>true;
  window.cloudStatus=()=>({ signedIn:true, expiresAt: Date.now()+3.6e6 });
  window.cloudAuth=async()=>({ ok:true });
  window.cloudSignOut=()=>{};
  window.scheduleSyncPush=function(){};                       // disable debounce — drive manually
  window.cloudPull=async()=> await window.__driveDownload();
  window.cloudPush=async(subset,opts)=>{
    const r=await window.__drivePush(JSON.parse(JSON.stringify(subset)), (opts&&opts.expectedVersion!=null)?opts.expectedVersion:null);
    if (r&&r.conflict) throw new ConflictError(opts&&opts.expectedVersion, r.current);
    return r;
  };
};
const mkTask = (uidv,text) => ({ id:null, uid:uidv, createdAt:0, updatedAt:0, text, checked:false, priority:'none',
  groupId:null, deadline:null, note:'', noteOpen:false, order:0, repeat:'none', cycleChecked:false, nextReset:null, subtasks:[], subtasksOpen:false });

(async()=>{
  await new Promise(r=>srv.listen(0,r));
  const base=`http://localhost:${srv.address().port}/index.html`;
  const browser=await chromium.launch({executablePath:CHROME,headless:!process.argv.includes('--show')});
  const errs=[];
  const mkPage=async()=>{ const p=await (await browser.newContext({viewport:{width:1000,height:800}})).newPage();
    p.on('pageerror',e=>errs.push(e.message));
    await p.exposeFunction('__driveDownload', driveDownload);
    await p.exposeFunction('__drivePush', drivePush);
    await p.goto(base); await p.waitForTimeout(400); await p.evaluate(FAKE); return p; };
  const A=await mkPage(), B=await mkPage();
  const ev=(p,fn,arg)=>p.evaluate(fn,arg);
  const sync=(p)=>p.evaluate(async()=>{ await syncNow({manual:true}); });
  const tasksOf=(p)=>p.evaluate(()=>state.tasks.map(t=>({uid:t.uid,text:t.text,id:t.id})));

  // ═══ SCENARIO 1: same task renamed on both, offline → FIELD conflict ═════════
  await ev(A, t=>{ state.tasks.push(Object.assign(t,{id:state.nextId++,createdAt:nowTs(),updatedAt:nowTs()})); saveState(); }, mkTask('shared-1','orig'));
  await sync(A);                                              // → Drive v1
  rec('S1: A created file', drive && drive.version===1 && drive.subset.tasks.length===1, drive&&drive.version);
  await sync(B);                                              // B pulls v1
  let bt=await tasksOf(B);
  rec('S1: B pulled the shared task', bt.length===1 && bt[0].uid==='shared-1' && bt[0].text==='orig', bt);

  // both go "offline" and rename the SAME task differently (B newer → B wins)
  await ev(A, ()=>{ const t=state.tasks.find(x=>x.uid==='shared-1'); t.text='A-name'; t.updatedAt=nowTs(); saveState(); });
  await ev(B, ()=>{ const t=state.tasks.find(x=>x.uid==='shared-1'); t.text='B-name'; t.updatedAt=nowTs()+10000000; saveState(); });
  await sync(A);                                              // A pushes A-name (no conflict) → v2
  const s1 = await B.evaluate(async()=>{ await syncNow({manual:true});
    const e=(state.syncJournal||[]).filter(x=>!x.resolved);
    const t=state.tasks.find(x=>x.uid==='shared-1');
    return { unresolved:e.length, kind:e[0]&&e[0].kind, field:e[0]&&e[0].field, loser:e[0]&&e[0].loser, winText:t&&t.text, nTasks:state.tasks.length }; });
  rec('S1: B sees a FIELD conflict (not delete-vs-edit)', s1.kind==='field' && s1.field==='text', s1);
  rec('S1: newer (B-name) won live', s1.winText==='B-name', s1.winText);
  rec('S1: loser (A-name) quarantined', s1.unresolved===1 && s1.loser==='A-name', s1);
  rec('S1: still exactly 1 task on B', s1.nTasks===1, s1.nTasks);

  await sync(A);                                              // A pulls B-name
  rec('S1: B-name propagated to A', (await tasksOf(A))[0].text==='B-name');

  // RESTORE the loser on B → must edit the EXISTING task, NOT spawn a duplicate
  const s1r = await B.evaluate(async()=>{
    const e=(state.syncJournal||[]).find(x=>!x.resolved);
    restoreQuarantineEntry(state, e); e.resolved=true; e.resolvedAt=nowTs(); e.resolution='restore';
    normalizeState(); saveState();
    return { nTasks:state.tasks.length, text:state.tasks[0]&&state.tasks[0].text }; });
  rec('S1: RESTORE edits existing task — NO duplicate', s1r.nTasks===1, s1r);
  rec('S1: restored value (A-name) on the existing task', s1r.text==='A-name', s1r);

  await sync(B);                                              // push restored A-name
  const aProp = await A.evaluate(async()=>{ await syncNow({manual:true});   // A pulls it
    return { text:state.tasks[0]&&state.tasks[0].text, unres:unresolvedCount(state),
             jResolved:(state.syncJournal||[]).every(e=>e.resolved) }; });
  const aFinal=await tasksOf(A), bFinal=await tasksOf(B);
  rec('S1: A ends with exactly 1 task = A-name', aFinal.length===1 && aFinal[0].text==='A-name', aFinal);
  rec('S1: B ends with exactly 1 task = A-name', bFinal.length===1 && bFinal[0].text==='A-name', bFinal);
  rec('S1: RESOLUTION propagated — A badge clears WITHOUT re-resolving', aProp.unres===0 && aProp.jResolved, aProp);
  rec('S1: Drive holds exactly 1 task', drive.subset.tasks.length===1, drive.subset.tasks.length);

  // ═══ SCENARIO 2: genuine delete-vs-edit (A deletes, B edits) ═════════════════
  await ev(A, t=>{ state.tasks.push(Object.assign(t,{id:state.nextId++,createdAt:nowTs(),updatedAt:nowTs()})); saveState(); }, mkTask('shared-2','d-orig'));
  await sync(A); await sync(B);                               // both have shared-2, baseline synced
  rec('S2: both devices have shared-2', (await tasksOf(A)).some(t=>t.uid==='shared-2') && (await tasksOf(B)).some(t=>t.uid==='shared-2'));

  // offline: A permanently deletes (tombstone), B edits the same task
  await ev(A, ()=>{ const t=state.tasks.find(x=>x.uid==='shared-2'); deleteTaskForever(t.id); });
  await ev(B, ()=>{ const t=state.tasks.find(x=>x.uid==='shared-2'); t.text='B-edit'; t.updatedAt=nowTs()+10000000; saveState(); });
  await sync(A);                                              // A pushes the tombstone
  const s2 = await B.evaluate(async()=>{ await syncNow({manual:true});
    const e=(state.syncJournal||[]).filter(x=>!x.resolved);
    return { unresolved:e.length, kind:e[0]&&e[0].kind, loserText:e[0]&&e[0].loser&&e[0].loser.text, has2:state.tasks.some(t=>t.uid==='shared-2') }; });
  rec('S2: B sees a delete-vs-edit conflict', s2.kind==='delete-vs-edit', s2);
  rec('S2: default = DELETE (task gone on B)', s2.has2===false, s2);
  rec('S2: edited copy (B-edit) quarantined', s2.unresolved>=1 && s2.loserText==='B-edit', s2);

  await sync(A);                                              // A pulls — confirms still deleted everywhere
  rec('S2: shared-2 stays deleted on A pre-restore', !(await tasksOf(A)).some(t=>t.uid==='shared-2'));

  // RESTORE the deleted-but-edited copy on B → recreate exactly ONE record
  const s2r = await B.evaluate(async()=>{
    const e=(state.syncJournal||[]).find(x=>!x.resolved && x.kind==='delete-vs-edit');
    restoreQuarantineEntry(state, e); e.resolved=true; e.resolvedAt=nowTs(); e.resolution='restore';
    normalizeState(); saveState();
    const m=state.tasks.filter(t=>t.uid==='shared-2');
    return { count:m.length, text:m[0]&&m[0].text }; });
  rec('S2: RESTORE re-creates exactly ONE shared-2 on B', s2r.count===1, s2r);
  rec('S2: restored text = B-edit', s2r.text==='B-edit', s2r);

  await sync(B);                                              // push the revival
  await sync(A);                                              // A pulls it
  const a2=(await tasksOf(A)).filter(t=>t.uid==='shared-2');
  rec('S2: A gets exactly ONE shared-2 (no duplicate)', a2.length===1 && a2[0].text==='B-edit', a2);
  rec('S2: Drive holds exactly one shared-2', drive.subset.tasks.filter(t=>t.uid==='shared-2').length===1, drive.subset.tasks.filter(t=>t.uid==='shared-2').length);

  rec('end: no pageerror', errs.length===0, errs.join(' | '));
  await browser.close(); srv.close();
  console.log(`\ntwo-device conflict live: ${pass} passed, ${fail} failed  (total ${pass+fail})`);
  process.exit(fail?1:0);
})().catch(e=>{console.error('CRASH',e);process.exit(2);});
