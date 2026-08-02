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

const mkT = o => ({ id:o.id, text:o.text||('T'+o.id), checked:!!o.checked, priority:o.priority||'none',
  color:o.color||null, groupId:o.groupId??null, order:o.order??0, pinned:!!o.pinned, note:o.note||'',
  deadline:o.deadline||null, subtasks:o.subtasks||[] });
const mkG = (id,name)=>({ id, name, color:'#8a5cff' });
const baseState = over => ({ tasks:[], groups:[], archive:[], notes:[], notesArchive:[], templates:[],
  noteTemplates:[], nextId:100, nextGroupId:100, nextSubId:100, sortMode:'priority', sortModeOverrides:{}, ...over });

const results = [];
const rec = (name, pass, detail) => { results.push({ name, pass, detail }); console.log(`${pass?'PASS':'FAIL'}  ${name}  ${detail||''}`); };

(async()=>{
  await new Promise(r=>srv.listen(0,r));
  const port = srv.address().port;
  const url = `http://localhost:${port}/index.html`;
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  const context = await browser.newContext({ viewport:{width:1180,height:900} });
  await context.grantPermissions(['notifications'], { origin:`http://localhost:${port}` });

  async function seed(stateObj, extraLS){
    const page = await context.newPage();
    const errs=[]; page.on('pageerror',e=>errs.push(e.message));
    await page.addInitScript(([st,ls])=>{
      // Idea 8: this harness shares one browser context & re-seeds duskState_v3 per
      // page. The app now migrates v3→v4 once and prefers v4, so a leaked v4 from a
      // previous test would shadow the new seed. Clear v4 + the premigration snapshot
      // so each test exercises a clean v3→v4 migration from its own seed.
      localStorage.removeItem('duskState_v4');
      localStorage.removeItem('dusk_premigration_v3');
      localStorage.setItem('duskState_v3', JSON.stringify(st));
      localStorage.setItem('currentPage','main');
      if(ls) for(const k in ls) localStorage.setItem(k, ls[k]);
    },[stateObj, extraLS||null]);
    await page.goto(url); await page.waitForTimeout(350);
    return { page, errs };
  }

  // ================= C-1: group section DnD reorder by id (subset) =================
  try {
    const st = baseState({ groups:[mkG(1,'A'),mkG(2,'B'),mkG(3,'C'),mkG(4,'D')],
      tasks:[ mkT({id:11,text:'alpha',groupId:1}), mkT({id:12,text:'xray bb',groupId:2}),
              mkT({id:13,text:'xray cc',groupId:3}), mkT({id:14,text:'delta',groupId:4}) ] });
    const { page, errs } = await seed(st);
    const r = await page.evaluate(()=>{
      searchQuery='xray'; if(typeof searchBox!=='undefined'&&searchBox) searchBox.value='xray';
      render();
      const rendered = [...groupsContainer.querySelectorAll(':scope > .group-section')].map(s=>s.dataset.groupId);
      if (typeof sortableGroupSections==='undefined' || !sortableGroupSections) return { rendered, err:'NO_SORTABLE' };
      const secs=[...groupsContainer.querySelectorAll(':scope > .group-section')];
      const cEl=secs.find(s=>s.dataset.groupId==='3'), bEl=secs.find(s=>s.dataset.groupId==='2');
      groupsContainer.insertBefore(cEl,bEl);            // simulate drag: C now before B
      sortableGroupSections.options.onEnd({ item: cEl });
      return { rendered, order: state.groups.map(g=>g.id) };
    });
    const okSubset = JSON.stringify(r.rendered)===JSON.stringify(['2','3']);
    const okOrder  = JSON.stringify(r.order)===JSON.stringify([1,3,2,4]);
    rec('C-1 subset rendered = [B,C]', okSubset, JSON.stringify(r.rendered));
    rec('C-1 reorder by id keeps hidden A,D → [1,3,2,4]', !!r.order&&okOrder, r.err||JSON.stringify(r.order));
    rec('C-1 no pageerror', errs.length===0, errs.join('|'));
    await page.close();
  } catch(e){ rec('C-1 EXCEPTION', false, e.message); }

  // ================= C-1b: full set regression (move to front) =================
  try {
    const st = baseState({ groups:[mkG(1,'A'),mkG(2,'B'),mkG(3,'C'),mkG(4,'D')],
      tasks:[ mkT({id:11,groupId:1}), mkT({id:12,groupId:2}), mkT({id:13,groupId:3}), mkT({id:14,groupId:4}) ] });
    const { page, errs } = await seed(st);
    const r = await page.evaluate(()=>{
      render();
      const secs=[...groupsContainer.querySelectorAll(':scope > .group-section')];
      if(!sortableGroupSections) return {err:'NO_SORTABLE'};
      const dEl=secs.find(s=>s.dataset.groupId==='4'), first=secs[0];
      groupsContainer.insertBefore(dEl, first);
      sortableGroupSections.options.onEnd({ item: dEl });
      return { order: state.groups.map(g=>g.id) };
    });
    rec('C-1b full-set move D to front → [4,1,2,3]', JSON.stringify(r.order)===JSON.stringify([4,1,2,3]), r.err||JSON.stringify(r.order));
    rec('C-1b no pageerror', errs.length===0, errs.join('|'));
    await page.close();
  } catch(e){ rec('C-1b EXCEPTION', false, e.message); }

  // ================= C-2: three honest empty states =================
  try {
    const st = baseState({ tasks:[ mkT({id:21,text:'aaa',checked:true}), mkT({id:22,text:'bbb',checked:true}) ] });
    const { page, errs } = await seed(st);
    const r = await page.evaluate(()=>{
      const read=()=>({ empty:emptyState.style.display, allDone:allDone.style.display,
        msg:(emptyState.querySelector('p')||{}).textContent });
      // 1) all done + SEARCH filter active → honest "Ничего не найдено" (user's choice)
      searchQuery='zzz'; if(typeof searchBox!=='undefined'&&searchBox) searchBox.value='zzz'; render();
      const s1=read();
      // 1b) all done + "hide completed" (isFiltered) but NO search/colour/focus/today → plaque
      searchQuery=''; if(typeof searchBox!=='undefined'&&searchBox) searchBox.value='';
      isFiltered=true; render();
      const s1b=read();
      isFiltered=false;
      // 2) tasks exist, none checked, filter hides → "Ничего не найдено"
      state.tasks.forEach(t=>t.checked=false); searchQuery='zzz'; render();
      const s2=read();
      // 3) no tasks at all → "Нет задач. Добавьте первую."
      state.tasks=[]; searchQuery=''; if(typeof searchBox!=='undefined'&&searchBox) searchBox.value=''; render();
      const s3=read();
      return {s1,s1b,s2,s3};
    });
    rec('C-2 all-done+SEARCH → "Ничего не найдено", plaque hidden', r.s1.empty!=='none' && r.s1.msg==='Ничего не найдено' && r.s1.allDone==='none', JSON.stringify(r.s1));
    rec('C-2 all-done+hide-completed (no filter) → plaque shown', r.s1b.allDone!=='none' && r.s1b.empty==='none', JSON.stringify(r.s1b));
    rec('C-2 filtered-out → "Ничего не найдено"', r.s2.empty!=='none' && r.s2.msg==='Ничего не найдено' && r.s2.allDone==='none', JSON.stringify(r.s2));
    rec('C-2 no tasks → "Нет задач. Добавьте первую."', r.s3.empty!=='none' && r.s3.msg==='Нет задач. Добавьте первую.', JSON.stringify(r.s3));
    rec('C-2 no pageerror', errs.length===0, errs.join('|'));
    await page.close();
  } catch(e){ rec('C-2 EXCEPTION', false, e.message); }

  // ================= V-1: priority/color mutual exclusivity =================
  try {
    const st = baseState({ tasks:[ mkT({id:31,text:'one'}) ] });
    const { page, errs } = await seed(st);
    const r = await page.evaluate(()=>{
      const t=state.tasks[0]; const out={};
      t.color='#ff0000'; t.priority='none'; _setTaskPriority(t,'high'); out.setPrioClearsColor={p:t.priority,c:t.color};
      t.priority='high'; t.color=null; _setTaskColor(t,'#00ff00'); out.setColorClearsPrio={p:t.priority,c:t.color};
      // drag inheritance: colour-labelled task opts out (keeps colour + own priority)
      t.color='#123456'; t.priority='low'; const ul=document.getElementById('list-container')||document.body;
      applyPriorityInheritance(t.id, ul); out.inheritOptOut={p:t.priority,c:t.color};
      // modal click path: prio btn high on a colourless task
      t.color=null; t.priority='none'; openPrioModal(31);
      const btn=document.querySelector('#modal-prio-selector .prio-btn[data-prio="high"]');
      out.prioBtnFound=!!btn; if(btn) btn.click();
      out.afterPrioClick={p:t.priority,c:t.color};
      // colour commit path on a high-priority task clears priority
      t.priority='high'; t.color=null; editingTaskId=31; bulkColorActive=false; formColorActive=false; noteColorActive=false;
      _commitColorChoice('#abcdef'); out.afterColorCommit={p:t.priority,c:t.color};
      return out;
    });
    rec('V-1 _setTaskPriority clears colour', r.setPrioClearsColor.p==='high'&&r.setPrioClearsColor.c===null, JSON.stringify(r.setPrioClearsColor));
    rec('V-1 _setTaskColor clears priority', r.setColorClearsPrio.c==='#00ff00'&&r.setColorClearsPrio.p==='none', JSON.stringify(r.setColorClearsPrio));
    rec('V-1 drag inheritance opts out coloured task', r.inheritOptOut.c==='#123456'&&r.inheritOptOut.p==='low', JSON.stringify(r.inheritOptOut));
    rec('V-1 prio modal click → high, colour null', r.afterPrioClick.p==='high'&&r.afterPrioClick.c===null, JSON.stringify(r.afterPrioClick));
    rec('V-1 colour commit → colour set, prio none', r.afterColorCommit.c==='#abcdef'&&r.afterColorCommit.p==='none', JSON.stringify(r.afterColorCommit));
    rec('V-1 no pageerror', errs.length===0, errs.join('|'));
    await page.close();
  } catch(e){ rec('V-1 EXCEPTION', false, e.message); }

  // ================= V-2: notified Map persist / hydrate / re-notify / prune =================
  try {
    const st = baseState({ tasks:[ mkT({id:41,text:'dl', deadline:{mode:'date', value:'2020-01-01'}}) ] });
    const { page, errs } = await seed(st, { dusk_notified_v1: JSON.stringify([[41,'OLDSIG']]) });
    const r = await page.evaluate(()=>{
      const out={};
      out.perm = (typeof Notification!=='undefined') ? Notification.permission : 'no-api';
      out.isMap = (_notifiedDeadlines instanceof Map);
      out.hydrated = _notifiedDeadlines.get(41);                 // should be 'OLDSIG' from localStorage
      // fresh notify: clear, run → sets sig + persists
      _notifiedDeadlines.delete(41); _checkDeadlineNotifications();
      const sig=JSON.stringify(state.tasks[0].deadline);
      out.afterNotify = _notifiedDeadlines.get(41);
      out.persisted = localStorage.getItem('dusk_notified_v1');
      out.sigMatch = out.afterNotify===sig;
      // change deadline → new signature → re-notify
      state.tasks[0].deadline={mode:'date', value:'2019-01-01'};
      const before=_notifiedDeadlines.get(41); _checkDeadlineNotifications();
      out.renotified = _notifiedDeadlines.get(41)!==before;
      // complete the task → flag pruned
      state.tasks[0].checked=true; _checkDeadlineNotifications();
      out.prunedOnDone = !_notifiedDeadlines.has(41);
      return out;
    });
    rec('V-2 store is a Map', r.isMap, '');
    rec('V-2 hydrated from localStorage', r.hydrated==='OLDSIG', String(r.hydrated)+' perm='+r.perm);
    if (r.perm==='granted') {
      rec('V-2 notify sets+persists signature', r.sigMatch && /41/.test(r.persisted||''), JSON.stringify({a:r.afterNotify,p:r.persisted}));
      rec('V-2 edited deadline re-notifies', r.renotified, '');
      rec('V-2 completed task pruned', r.prunedOnDone, '');
    } else {
      rec('V-2 notify path', false, 'permission not granted: '+r.perm);
    }
    rec('V-2 no pageerror', errs.length===0, errs.join('|'));
    await page.close();
  } catch(e){ rec('V-2 EXCEPTION', false, e.message); }

  // ================= V-3: visible incl split-pinned + J/K nav =================
  try {
    const st = baseState({ tasks:[ mkT({id:51,text:'one'}), mkT({id:52,text:'pinned',pinned:true}), mkT({id:53,text:'three'}) ] });
    const { page, errs } = await seed(st, { groupSplitMode:'1' });
    const pre = await page.evaluate(()=>{
      render();
      return {
        splitMode: isGroupSplitMode,
        pinnedZone: document.querySelectorAll('.split-pinned-body > .task-item').length,
        visIds: getVisibleTaskIds(),
        visCount: _visibleTaskEls().length,
      };
    });
    // J/K nav: press j a few times, collect focused ids
    await page.evaluate(()=>{ _focusedTaskId=null; });
    const seq=[];
    for(let i=0;i<4;i++){ await page.keyboard.press('j'); seq.push(await page.evaluate(()=>_focusedTaskId)); }
    rec('V-3 split mode active', pre.splitMode===true, '');
    rec('V-3 pinned card in split-pinned-body', pre.pinnedZone>=1, 'count='+pre.pinnedZone);
    rec('V-3 getVisibleTaskIds includes pinned 52', pre.visIds.includes(52), JSON.stringify(pre.visIds));
    rec('V-3 visible count = 3', pre.visCount===3, 'count='+pre.visCount);
    rec('V-3 J/K nav reaches pinned 52', seq.includes(52), JSON.stringify(seq));
    rec('V-3 no pageerror', errs.length===0, errs.join('|'));
    await page.close();
  } catch(e){ rec('V-3 EXCEPTION', false, e.message); }

  // ================= V-4: task note edit = one undo + Escape revert =================
  try {
    const st = baseState({ tasks:[ mkT({id:61,text:'T1',note:'orig'}) ] });
    st.tasks[0].noteOpen = true;
    const { page, errs } = await seed(st);
    const r = await page.evaluate(()=>{
      const out={};
      const el=document.getElementById('note-61');
      out.elFound=!!el; if(!el) return out;
      // commit path → exactly one undo step
      const u0=undoStack.length;
      _taskNoteEdit(el);
      state.tasks[0].note='orig EDITED'; el.textContent='orig EDITED';   // simulate debounced autosave
      _taskNoteCommit(el);
      out.undoDelta=undoStack.length-u0;
      out.noteAfterCommit=state.tasks[0].note;
      undo();
      out.noteAfterUndo=state.tasks[0].note;
      // Escape path → revert + no undo push
      state.tasks[0].note='base'; el.innerHTML='base';
      const u1=undoStack.length;
      _taskNoteEdit(el);
      state.tasks[0].note='base TYPED'; el.textContent='base TYPED';
      el._noteCancel=true; _taskNoteCommit(el);
      out.undoDelta2=undoStack.length-u1;
      out.noteAfterEscape=state.tasks[0].note;
      return out;
    });
    rec('V-4 note editor element present', r.elFound, '');
    rec('V-4 commit = exactly 1 undo step', r.undoDelta===1, 'delta='+r.undoDelta);
    rec('V-4 commit persisted edit', r.noteAfterCommit==='orig EDITED', String(r.noteAfterCommit));
    rec('V-4 undo restores pre-edit note', r.noteAfterUndo==='orig', String(r.noteAfterUndo));
    rec('V-4 Escape pushes 0 undo', r.undoDelta2===0, 'delta='+r.undoDelta2);
    rec('V-4 Escape reverts autosaved text', r.noteAfterEscape==='base', String(r.noteAfterEscape));
    rec('V-4 no pageerror', errs.length===0, errs.join('|'));
    await page.close();
  } catch(e){ rec('V-4 EXCEPTION', false, e.message); }

  // ================= V-5: startSubEdit cleanup (escape/commit, no stacking) =================
  try {
    const st = baseState({ tasks:[ mkT({id:71,text:'P',subtasks:[{id:1,text:'Sub',checked:false}]}) ] });
    const { page, errs } = await seed(st);
    const r = await page.evaluate(async()=>{
      const out={};
      let span=document.querySelector('.task-item[data-id="71"] .sub-text');
      out.spanFound=!!span; if(!span) return out;
      const sub=()=>state.tasks[0].subtasks[0].text;
      // 3 escape cycles → must revert each time, no leak/stacking
      for(let i=0;i<3;i++){
        startSubEdit({target:span, stopPropagation(){}}, 71, 1);
        out['editable'+i]=span.contentEditable;
        span.textContent='Sub EDIT'+i;
        span.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
        out['afterEsc'+i]={ce:span.contentEditable, txt:span.textContent, state:sub()};
      }
      // commit path via Enter→blur
      startSubEdit({target:span, stopPropagation(){}}, 71, 1);
      span.textContent='Sub FINAL';
      span.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));
      await new Promise(r=>setTimeout(r,30));
      out.afterCommit={ce:span.contentEditable, state:sub()};
      return out;
    });
    rec('V-5 sub span present + editable on edit', r.spanFound && r.editable0==='true', JSON.stringify({f:r.spanFound,e:r.editable0}));
    const escOk = r.afterEsc0&&r.afterEsc1&&r.afterEsc2 &&
      [r.afterEsc0,r.afterEsc1,r.afterEsc2].every(a=>a.ce==='false' && a.txt==='Sub' && a.state==='Sub');
    rec('V-5 Escape reverts + ends edit (x3, no stacking)', escOk, JSON.stringify([r.afterEsc0,r.afterEsc1,r.afterEsc2]));
    rec('V-5 Enter commits new text', r.afterCommit && r.afterCommit.ce==='false' && r.afterCommit.state==='Sub FINAL', JSON.stringify(r.afterCommit));
    rec('V-5 no pageerror', errs.length===0, errs.join('|'));
    await page.close();
  } catch(e){ rec('V-5 EXCEPTION', false, e.message); }

  // ================= D-1: Russian plural in tag cloud =================
  try {
    const st = baseState({ tasks:[ mkT({id:81,text:'buy *milk'}) ] });
    const { page, errs } = await seed(st);
    const r = await page.evaluate(()=>{
      const fn=n=>_zadachi(n);
      const cases={1:fn(1),2:fn(2),5:fn(5),11:fn(11),21:fn(21),22:fn(22),25:fn(25),101:fn(101)};
      renderTagCloud();
      const chip=document.querySelector('#tag-cloud .tag-chip');
      return { cases, title: chip?chip.getAttribute('title'):null };
    });
    const c=r.cases;
    const okFn = c[1]==='задача'&&c[2]==='задачи'&&c[5]==='задач'&&c[11]==='задач'&&c[21]==='задача'&&c[22]==='задачи'&&c[25]==='задач'&&c[101]==='задача';
    rec('D-1 _zadachi plural rules', okFn, JSON.stringify(c));
    rec('D-1 tag chip title uses plural ("1 задача")', r.title==='1 задача', String(r.title));
    rec('D-1 no pageerror', errs.length===0, errs.join('|'));
    await page.close();
  } catch(e){ rec('D-1 EXCEPTION', false, e.message); }

  // ================= D-4: import sanitises priority/repeat/colour =================
  try {
    const { page, errs } = await seed(baseState({}));
    await page.evaluate(()=>{
      const bad={ tasks:[ { id:1, text:'Bad', priority:'EVIL', repeat:'hacky', color:'red',
        subtasks:[{ id:1, text:'s', priority:'xx', repeat:'yy' }] } ] };
      const file=new File([JSON.stringify(bad)], 'x.json', {type:'application/json'});
      importData({ target:{ files:[file], value:'' } });
    });
    await page.waitForTimeout(250);
    await page.click('#import-replace-btn');
    await page.waitForTimeout(150);
    const r = await page.evaluate(()=>{
      const t=state.tasks[0];
      return t ? { p:t.priority, rep:t.repeat, c:t.color, sp:t.subtasks[0].priority, srep:t.subtasks[0].repeat } : null;
    });
    const ok = r && r.p==='none' && r.rep==='none' && r.c===null && r.sp==='none' && r.srep==='none';
    rec('D-4 import whitelists bad enums + colour', ok, JSON.stringify(r));
    rec('D-4 no pageerror', errs.length===0, errs.join('|'));
    await page.close();
  } catch(e){ rec('D-4 EXCEPTION', false, e.message); }

  // ================= #3: in-pill ✕ search clear (main + archive) =================
  try {
    const st = baseState({ tasks:[ mkT({id:1,text:'alpha'}), mkT({id:2,text:'beta'}) ],
      archive:[ { id:9, text:'old note', checked:true, priority:'none', color:null, note:'', groupId:null, order:0, archivedAt:1700000000000, subtasks:[] } ] });
    const { page, errs } = await seed(st);
    // pointer-events flips instantly (not transitioned) → deterministic visibility signal
    const pe = sel => `getComputedStyle(document.querySelector('${sel}')).pointerEvents`;
    const mainEmpty = await page.evaluate(()=>getComputedStyle(document.querySelector('.search-wrap .search-x')).pointerEvents);
    await page.fill('#search-box','alpha');
    const mainVisible = await page.evaluate(()=>getComputedStyle(document.querySelector('.search-wrap .search-x')).pointerEvents);
    await page.click('.search-wrap .search-x');
    const mainAfter = await page.evaluate(()=>({ q:searchQuery, v:document.getElementById('search-box').value, pe:getComputedStyle(document.querySelector('.search-wrap .search-x')).pointerEvents }));
    // archive search (page hidden → drive via evaluate; tests CSS state + clear fn)
    const arc = await page.evaluate(()=>{
      renderArchive();
      const sb=document.getElementById('archive-search-box');
      const empty=getComputedStyle(document.querySelector('.archive-search-wrap .search-x')).pointerEvents;
      sb.value='old'; archiveSearchQuery='old';
      const shown=getComputedStyle(document.querySelector('.archive-search-wrap .search-x')).pointerEvents;
      clearArchiveSearch();
      return { empty, shown, q:archiveSearchQuery, v:sb.value, after:getComputedStyle(document.querySelector('.archive-search-wrap .search-x')).pointerEvents };
    });
    rec('#3 main ✕ hidden while empty', mainEmpty==='none', mainEmpty);
    rec('#3 main ✕ visible on input', mainVisible==='auto', mainVisible);
    rec('#3 main ✕ clears query + re-hides', mainAfter.q==='' && mainAfter.v==='' && mainAfter.pe==='none', JSON.stringify(mainAfter));
    rec('#3 archive ✕ hidden empty / visible on input', arc.empty==='none' && arc.shown==='auto', JSON.stringify({e:arc.empty,s:arc.shown}));
    rec('#3 archive ✕ clears query + re-hides', arc.q==='' && arc.v==='' && arc.after==='none', JSON.stringify(arc));
    rec('#3 no pageerror', errs.length===0, errs.join('|'));
    await page.close();
  } catch(e){ rec('#3 EXCEPTION', false, e.message); }

  // ================= #4: empty-state CTA button =================
  try {
    const { page, errs } = await seed(baseState({}));
    const noTasks = await page.evaluate(()=>{
      render();
      const b=document.getElementById('empty-add-btn');
      return { disp:b?b.style.display:null, msg:(emptyState.querySelector('p')||{}).textContent };
    });
    const filtered = await page.evaluate(()=>{
      state.tasks=[{id:1,text:'alpha',checked:false,priority:'none',color:null,groupId:null,order:0,subtasks:[]}];
      searchQuery='zzz'; render();
      const b=document.getElementById('empty-add-btn');
      return { disp:b?b.style.display:null, msg:(emptyState.querySelector('p')||{}).textContent };
    });
    const focused = await page.evaluate(()=>{
      searchQuery=''; state.tasks=[]; render();
      focusNewTaskInput();
      return document.activeElement && document.activeElement.id;
    });
    rec('#4 no tasks → CTA visible + "Нет задач…"', noTasks.disp==='inline-flex' && noTasks.msg==='Нет задач. Добавьте первую.', JSON.stringify(noTasks));
    rec('#4 filtered (tasks exist) → CTA hidden + "Ничего не найдено"', filtered.disp==='none' && filtered.msg==='Ничего не найдено', JSON.stringify(filtered));
    rec('#4 CTA focuses #input-box', focused==='input-box', String(focused));
    rec('#4 no pageerror', errs.length===0, errs.join('|'));
    await page.close();
  } catch(e){ rec('#4 EXCEPTION', false, e.message); }

  // ================= #2: _grimInk contrast for task colour labels =================
  try {
    const dark='#1a0033';
    const st = baseState({ tasks:[ mkT({id:1,text:'dark',color:dark}) ],
      archive:[ { id:9, text:'arc', checked:true, priority:'none', color:dark, note:'', groupId:null, order:0, archivedAt:1700000000000, subtasks:[] } ] });
    const { page, errs } = await seed(st);
    const r = await page.evaluate((dark)=>{
      render();
      const li=document.querySelector('.task-item[data-id="1"]');
      const ink=_grimInk(dark);
      const mainVar=li.style.getPropertyValue('--task-color').trim();
      const path=li.querySelector('.btn-task-color svg path');
      const fill=path?path.getAttribute('fill'):null;
      // lightness sanity: inked value must be brighter than raw dark
      const lum=h=>{const n=parseInt(h.slice(1),16);return ((n>>16)+((n>>8)&255)+(n&255))/3;};
      renderArchive();
      const ali=document.querySelector('#archive-list .archive-item');
      const arcVar=ali?ali.style.getPropertyValue('--task-color').trim():null;
      return { ink, mainVar, fill, arcVar, raw:dark, brighter: lum(ink)>lum(dark) };
    }, dark);
    rec('#2 main colour label inked (≠ raw dark)', r.mainVar===r.ink && r.mainVar!==r.raw, JSON.stringify({v:r.mainVar,ink:r.ink}));
    rec('#2 inked colour is brighter than raw', r.brighter===true, '');
    rec('#2 swatch fill inked', r.fill===r.ink, String(r.fill));
    rec('#2 archive colour label inked', r.arcVar===r.ink && r.arcVar!==r.raw, JSON.stringify({a:r.arcVar,ink:r.ink}));
    rec('#2 no pageerror', errs.length===0, errs.join('|'));
    await page.close();
  } catch(e){ rec('#2 EXCEPTION', false, e.message); }

  // ================= D-2: archive search highlight + linkify + colour =================
  try {
    const st = baseState({ archive:[ { id:91, text:'Buy milk xray', checked:true, priority:'none',
      color:'#33aa55', note:'see https://example.com now', groupId:null, order:0,
      archivedAt: 1700000000000, subtasks:[{id:1,text:'xray sub',checked:true}] } ] });
    const { page, errs } = await seed(st);
    const r = await page.evaluate(()=>{
      archiveSearchQuery=''; renderArchive();
      const li=document.querySelector('#archive-list .archive-item');
      const out={ found:!!li }; if(!li) return out;
      out.colorVar = li.style.getPropertyValue('--task-color').trim();
      out.inkExpected = _grimInk('#33aa55');   // #2: archive colour is now contrast-inked
      const noteEl = li.querySelector('.task-note-text');
      out.noteHtml = noteEl ? noteEl.innerHTML : '';
      out.linkOk = /<a [^>]*href="https:\/\/example\.com/.test(out.noteHtml);
      archiveSearchQuery='xray'; renderArchive();
      const li2=document.querySelector('#archive-list .archive-item');
      out.markText = li2 ? /<mark/.test(li2.querySelector('.task-text').innerHTML) : false;
      out.markSub  = li2 ? /<mark/.test(li2.querySelector('.archive-sub-text').innerHTML) : false;
      out.visible  = li2 ? li2.style.display!=='none' : false;
      return out;
    });
    rec('D-2 archive colour label (--task-color, inked)', r.colorVar===r.inkExpected && !!r.colorVar, `${r.colorVar} vs ${r.inkExpected}`);
    rec('D-2 archive note linkified', r.linkOk, (r.noteHtml||'').slice(0,70));
    rec('D-2 archive search highlights text', r.markText===true, '');
    rec('D-2 archive search highlights subtask', r.markSub===true, '');
    rec('D-2 archive matched item stays visible', r.visible===true, '');
    rec('D-2 no pageerror', errs.length===0, errs.join('|'));
    await page.close();
  } catch(e){ rec('D-2 EXCEPTION', false, e.message); }

  // ================= #5: grimoire keyboard parity (Del→склеп, T pin, E body, hint) =================
  try {
    const mkN = (id,title,body)=>({ id, title:title||'', body:body||'', fmt:true, color:null, createdAt:1700000000000, updatedAt:1700000000000 });
    const st = baseState({ notes:[ mkN('n1','First','<p>hello world</p>'), mkN('n2','Second','<p>second</p>') ] });
    const { page, errs } = await seed(st);
    await page.emulateMedia({ reducedMotion:'reduce' });   // instant page cuts → deterministic switchPage
    const r = await page.evaluate(()=>{
      const out={};
      currentPage='notes'; grimMode='active';
      // reveal the notes page container (we bypass switchPage's animation) so #grim-body is focusable
      if (typeof PAGE_EL!=='undefined' && PAGE_EL.notes) { Object.values(PAGE_EL).forEach(el=>el&&(el.style.display='none')); PAGE_EL.notes.style.display='block'; }
      renderNotes();
      const fire=(code,key)=>{ if(document.activeElement&&document.activeElement.blur)document.activeElement.blur();
        document.dispatchEvent(new KeyboardEvent('keydown',{code,key,bubbles:true,cancelable:true})); };
      grimOpen('n1'); out.opened=currentNoteId;
      // T → pin, T again → unpin
      fire('KeyT','t'); out.pinT1=(state.notes.find(n=>n.id==='n1')||{}).pinned;
      grimOpen('n1'); fire('KeyT','t'); out.pinT2=(state.notes.find(n=>n.id==='n1')||{}).pinned;
      // E → focus body
      grimOpen('n1'); fire('KeyE','e'); out.eFocus=document.activeElement&&document.activeElement.id;
      // Del → склеп (archive, undoable)
      grimOpen('n1'); fire('Delete','Delete');
      out.inArchive=(state.notesArchive||[]).some(n=>n.id==='n1');
      out.inActive =(state.notes||[]).some(n=>n.id==='n1');
      out.curAfterDel=currentNoteId;
      // archive-mode Del must be a NO-OP (permadelete keeps its 2-step button confirm)
      grimMode='archive'; currentNoteId='n1'; renderNotes(); fire('Delete','Delete');
      out.archiveModeKept=(state.notesArchive||[]).some(n=>n.id==='n1');
      // hint LIVE-syncs with tab/segment while it stays OPEN (the user's ask)
      const hintEl=document.getElementById('shortcuts-hint');
      grimMode='active'; currentNoteId=null;                  // clean start for the sync walk
      _shortcutsHintOpen=false; switchPage('main');           // ensure on tasks
      toggleShortcutsHint(); out.hOpenMain=hintEl.innerHTML;  // OPEN on tasks
      switchPage('notes');     out.hToNotes=hintEl.innerHTML; // → grimoire (active), hint untouched
      grimSetMode('archive');  out.hCrypt=hintEl.innerHTML;   // → склеп
      grimSetMode('active');   out.hBackActive=hintEl.innerHTML; // → записи
      switchPage('archive');   out.hTaskArchive=hintEl.innerHTML; // → tasks archive
      out.stillOpen=_shortcutsHintOpen;
      toggleShortcutsHint();                                   // close
      return out;
    });
    rec('#5 open note tracked (currentNoteId)', r.opened==='n1', String(r.opened));
    rec('#5 T pins open note', r.pinT1===true, String(r.pinT1));
    rec('#5 T again unpins', r.pinT2===false, String(r.pinT2));
    rec('#5 E focuses note body', r.eFocus==='grim-body', String(r.eFocus));
    rec('#5 Del → склеп (moved, currentNoteId cleared)', r.inArchive===true && r.inActive===false && r.curAfterDel===null, JSON.stringify({a:r.inArchive,act:r.inActive,c:r.curAfterDel}));
    rec('#5 archive-mode Del is no-op (no permadelete)', r.archiveModeKept===true, String(r.archiveModeKept));
    rec('#5 hint OPEN on tasks = task keys', /выполнить/.test(r.hOpenMain) && /приоритет/.test(r.hOpenMain), (r.hOpenMain||'').slice(0,40));
    rec('#5 hint live → notes/записи (E,Del; no выполнить)', /в склеп/.test(r.hToNotes) && /править/.test(r.hToNotes) && !/выполнить/.test(r.hToNotes), (r.hToNotes||'').slice(0,60));
    rec('#5 hint live → склеп (nav only; no E/Del/выполнить)', /новая запись/.test(r.hCrypt) && !/в склеп/.test(r.hCrypt) && !/править/.test(r.hCrypt) && !/выполнить/.test(r.hCrypt), (r.hCrypt||'').slice(0,60));
    rec('#5 hint live → back to записи', /править/.test(r.hBackActive) && /в склеп/.test(r.hBackActive), (r.hBackActive||'').slice(0,40));
    rec('#5 hint live → tasks archive (J/K, N, Ctrl+F)', /навигация/.test(r.hTaskArchive) && /новая задача/.test(r.hTaskArchive) && /Ctrl\+F/.test(r.hTaskArchive), (r.hTaskArchive||'').slice(0,60));
    rec('#5 hint stayed open through switches', r.stillOpen===true, String(r.stillOpen));
    rec('#5 no pageerror', errs.length===0, errs.join('|'));
    await page.close();
  } catch(e){ rec('#5 EXCEPTION', false, e.message); }

  // ================= #7: grimoire bulk colour (selection → one colour) =================
  try {
    const mkN = (id,title)=>({ id, title:title||'', body:'<p>x</p>', fmt:true, color:null, createdAt:1700000000000, updatedAt:1700000000000 });
    const st = baseState({ notes:[ mkN('n1','A'), mkN('n2','B'), mkN('n3','C') ] });
    const { page, errs } = await seed(st);
    const r = await page.evaluate(()=>{
      const out={};
      currentPage='notes'; grimMode='active';
      if (typeof PAGE_EL!=='undefined' && PAGE_EL.notes) { Object.values(PAGE_EL).forEach(el=>el&&(el.style.display='none')); PAGE_EL.notes.style.display='block'; }
      renderNotes();
      grimToggleSelectMode(); out.selModeOn=grimSelectMode;
      out.btnDisabled0=document.getElementById('grim-bulk-color').disabled;   // 0 ticked → disabled
      grimToggleSelectNote('n1'); grimToggleSelectNote('n3');
      out.btnEnabled=!document.getElementById('grim-bulk-color').disabled;     // 2 ticked → enabled
      const upd0=(state.notes.find(n=>n.id==='n1')||{}).updatedAt;
      openGrimBulkColorModal(); out.flagOn=grimBulkColorActive;
      _commitColorChoice('#aabbcc'); out.flagOff=(grimBulkColorActive===false);
      out.n1=(state.notes.find(n=>n.id==='n1')||{}).color;
      out.n2=(state.notes.find(n=>n.id==='n2')||{}).color;
      out.n3=(state.notes.find(n=>n.id==='n3')||{}).color;
      out.updUnchanged=((state.notes.find(n=>n.id==='n1')||{}).updatedAt===upd0);
      out.selExited=(grimSelectMode===false);
      // fresh selection → empty choice clears colour
      grimToggleSelectMode(); grimToggleSelectNote('n1');
      openGrimBulkColorModal(); _commitColorChoice('');
      out.n1cleared=(state.notes.find(n=>n.id==='n1')||{}).color;
      return out;
    });
    rec('#7 colour btn disabled@0 / enabled@2', r.btnDisabled0===true && r.btnEnabled===true, JSON.stringify({d:r.btnDisabled0,e:r.btnEnabled}));
    rec('#7 bulk flag set on open, cleared on commit', r.flagOn===true && r.flagOff===true, JSON.stringify({on:r.flagOn,off:r.flagOff}));
    rec('#7 colour applied to ticked n1,n3 only', r.n1==='#aabbcc' && r.n3==='#aabbcc' && r.n2===null, JSON.stringify({n1:r.n1,n2:r.n2,n3:r.n3}));
    rec('#7 colour is a label (updatedAt unchanged)', r.updUnchanged===true, '');
    rec('#7 select mode exits after apply', r.selExited===true, '');
    rec('#7 empty choice clears colour', r.n1cleared===null, String(r.n1cleared));
    rec('#7 no pageerror', errs.length===0, errs.join('|'));
    await page.close();
  } catch(e){ rec('#7 EXCEPTION', false, e.message); }

  // ================= #8: crypt (note archive) grouped by month =================
  try {
    const ts = (y,m,d)=>new Date(y, m-1, d, 12, 0, 0).getTime();   // local, mid-day → stable month
    const mkAN = (id,ar)=>({ id, title:id, body:'<p>x</p>', fmt:true, color:null, createdAt:ar, updatedAt:ar, archivedAt:ar });
    const st = baseState({
      notes:[ { id:'act1', title:'live', body:'<p>x</p>', fmt:true, color:null, createdAt:ts(2026,6,1), updatedAt:ts(2026,6,1) } ],
      notesArchive:[ mkAN('jun20',ts(2026,6,20)), mkAN('jun10',ts(2026,6,10)), mkAN('may15',ts(2026,5,15)), mkAN('dec01',ts(2025,12,1)) ] });
    const { page, errs } = await seed(st);
    const r = await page.evaluate(()=>{
      const out={};
      currentPage='notes'; notesSearchQuery=''; noteColorFilter=null;
      if (typeof PAGE_EL!=='undefined' && PAGE_EL.notes) { Object.values(PAGE_EL).forEach(el=>el&&(el.style.display='none')); PAGE_EL.notes.style.display='block'; }
      // active mode first — must stay flat (no month sections)
      grimMode='active'; renderNotes();
      out.activeNoSections = document.querySelectorAll('.grim-crypt-month').length===0
        && document.querySelectorAll('#grim-list .grim-leaf').length===1;
      // crypt
      grimMode='archive'; renderNotes();
      const secs=[...document.querySelectorAll('#grim-list .grim-crypt-month')];
      out.sectionKeys = secs.map(s=>s.dataset.monthKey);
      out.counts = secs.map(s=>s.querySelector('.grim-crypt-month-count').textContent);
      out.names  = secs.map(s=>s.querySelector('.grim-crypt-month-name').textContent);
      out.junIds = secs[0] ? [...secs[0].querySelectorAll('.grim-leaf')].map(b=>b.dataset.id) : [];
      out.visIds = _grimVisibleIds.slice();
      // collapse toggle persists
      const head0=secs[0].querySelector('.grim-crypt-month-head');
      grimToggleCryptMonth('2026-06', head0);
      out.collapsedClass = secs[0].classList.contains('collapsed');
      out.lsCollapsed = localStorage.getItem('cryptMonth_2026-06');
      grimToggleCryptMonth('2026-06', head0);
      out.expandedAgain = !secs[0].classList.contains('collapsed');
      out.lsExpanded = localStorage.getItem('cryptMonth_2026-06');
      // a folded month must force-open under a search hit
      localStorage.setItem('cryptMonth_2026-05','0');
      notesSearchQuery='may15'; renderNotes();
      const sec05=[...document.querySelectorAll('.grim-crypt-month')].find(s=>s.dataset.monthKey==='2026-05');
      out.filterForceExpand = sec05 ? !sec05.classList.contains('collapsed') : 'no-section';
      notesSearchQuery='';
      return out;
    });
    rec('#8 active mode stays flat (no month sections)', r.activeNoSections===true, JSON.stringify(r.activeNoSections));
    rec('#8 crypt sections newest-first', JSON.stringify(r.sectionKeys)===JSON.stringify(['2026-06','2026-05','2025-12']), JSON.stringify(r.sectionKeys));
    rec('#8 section counts [2,1,1]', JSON.stringify(r.counts)===JSON.stringify(['2','1','1']), JSON.stringify(r.counts));
    rec('#8 month names (past year shown)', r.names && r.names[0]==='Июнь' && r.names[1]==='Май' && r.names[2]==='Декабрь 2025', JSON.stringify(r.names));
    rec('#8 within-month newest first (jun20,jun10)', JSON.stringify(r.junIds)===JSON.stringify(['jun20','jun10']), JSON.stringify(r.junIds));
    rec('#8 _grimVisibleIds chronological desc', JSON.stringify(r.visIds)===JSON.stringify(['jun20','jun10','may15','dec01']), JSON.stringify(r.visIds));
    rec('#8 collapse toggles class + persists LS', r.collapsedClass===true && r.lsCollapsed==='0' && r.expandedAgain===true && r.lsExpanded==='1', JSON.stringify({c:r.collapsedClass,l0:r.lsCollapsed,e:r.expandedAgain,l1:r.lsExpanded}));
    rec('#8 filtering force-expands folded month', r.filterForceExpand===true, JSON.stringify(r.filterForceExpand));
    rec('#8 no pageerror', errs.length===0, errs.join('|'));
    await page.close();
  } catch(e){ rec('#8 EXCEPTION', false, e.message); }

  // ================= #A: tasks archive keyboard (J/K nav, Ctrl+F, N→new task) =================
  try {
    const ts = (y,m,d)=>new Date(y, m-1, d, 12, 0, 0).getTime();
    const mkA = (id,ar)=>({ id, text:'arc'+id, checked:true, priority:'none', color:null, note:'', groupId:null, order:0, archivedAt:ar, subtasks:[] });
    const st = baseState({ archive:[ mkA(1,ts(2026,6,10)), mkA(2,ts(2026,6,20)), mkA(3,ts(2026,5,5)), mkA(4,ts(2026,5,15)) ] });
    const { page, errs } = await seed(st);
    await page.emulateMedia({ reducedMotion:'reduce' });   // instant page cut
    const r = await page.evaluate(()=>{
      const out={};
      const fire=(code,key,mods)=>{ if(document.activeElement&&document.activeElement.blur)document.activeElement.blur();
        document.dispatchEvent(new KeyboardEvent('keydown', Object.assign({code,key,bubbles:true,cancelable:true}, mods||{}))); };
      switchPage('archive');
      out.itemCount = document.querySelectorAll('#archive-list .archive-item').length;
      out.visIds = _visibleArchiveIds();          // DOM order: May(4,3) then June(2,1)
      // J/K navigation
      _focusedArchiveId=null;
      fire('KeyJ','j'); out.j1=_focusedArchiveId;
      fire('KeyJ','j'); out.j2=_focusedArchiveId;
      fire('KeyK','k'); out.k1=_focusedArchiveId;
      out.ring = !!document.querySelector('#archive-list .archive-item.kb-focused');
      // collapsed month is skipped by nav
      localStorage.setItem('archMonth_2026-06','0'); renderArchive();
      out.visCollapsed=_visibleArchiveIds();       // June folded → only ['4','3']
      localStorage.removeItem('archMonth_2026-06'); renderArchive();
      // search-hidden items are skipped
      archiveSearchQuery='arc2'; renderArchive();
      out.visSearch=_visibleArchiveIds();          // only ['2']
      archiveSearchQuery=''; renderArchive();
      // Ctrl+F → focus crypt search
      fire('KeyF','f',{ctrlKey:true});
      out.ctrlF = document.activeElement && document.activeElement.id;
      // N → switch to Tasks tab (focus deferred, checked after the wait)
      fire('KeyN','n');
      out.afterN_page = currentPage;
      return out;
    });
    await page.waitForTimeout(420);
    const nFocus = await page.evaluate(()=>document.activeElement && document.activeElement.id);
    rec('#A archive renders 4 cards', r.itemCount===4, String(r.itemCount));
    rec('#A visible order May(4,3)→June(2,1)', JSON.stringify(r.visIds)===JSON.stringify(['4','3','2','1']), JSON.stringify(r.visIds));
    rec('#A J walks 4→3, K back to 4 + ring shown', r.j1==='4' && r.j2==='3' && r.k1==='4' && r.ring===true, JSON.stringify({j1:r.j1,j2:r.j2,k1:r.k1,ring:r.ring}));
    rec('#A collapsed month skipped by nav', JSON.stringify(r.visCollapsed)===JSON.stringify(['4','3']), JSON.stringify(r.visCollapsed));
    rec('#A search-hidden cards skipped by nav', JSON.stringify(r.visSearch)===JSON.stringify(['2']), JSON.stringify(r.visSearch));
    rec('#A Ctrl+F focuses #archive-search-box', r.ctrlF==='archive-search-box', String(r.ctrlF));
    rec('#A N switches to Tasks tab', r.afterN_page==='main', String(r.afterN_page));
    rec('#A N then focuses #input-box', nFocus==='input-box', String(nFocus));
    rec('#A no pageerror', errs.length===0, errs.join('|'));
    await page.close();
  } catch(e){ rec('#A EXCEPTION', false, e.message); }

  await browser.close(); srv.close();
  const fails = results.filter(r=>!r.pass);
  console.log('\n================ SUMMARY ================');
  console.log(`TOTAL ${results.length}  PASS ${results.length-fails.length}  FAIL ${fails.length}`);
  if (fails.length) { console.log('FAILED:'); fails.forEach(f=>console.log('  - '+f.name+'  '+(f.detail||''))); }
  process.exit(fails.length?1:0);
})().catch(e=>{ console.error('RUNNER CRASH', e); process.exit(2); });
