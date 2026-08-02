// S3/B5 — clean hotkey firing (re-nav each), search-empty feedback, icon-only aria census.
import { serve, launch, openApp, ensureShots } from './lib.mjs';
import { richSeed } from './seed.mjs';
import fs from 'fs'; import path from 'path';
const DIR = ensureShots('s3');
const DESK = { width: 2560, height: 1440, deviceScaleFactor: 1, isMobile: false, hasTouch: false, userAgent: undefined };
const { srv, port } = await serve();
const browser = await launch();
const R = {};

// clean hotkeys: J to focus, then the action, read modal/state, Esc, re-J
{
  const { page: p } = await openApp(browser, { device: DESK, seed: richSeed(), port });
  const openModals = ()=>p.evaluate(()=>[...document.querySelectorAll('.modal-overlay')].filter(m=>getComputedStyle(m).display!=='none').map(m=>m.id).filter(Boolean));
  const nav = async()=>{ await p.click('body'); await p.keyboard.press('KeyJ'); await p.waitForTimeout(120); };
  const res={};
  for(const [key,label] of [['KeyP','P_prio'],['KeyL','L_deadline'],['KeyM','M_note'],['KeyR','R_repeat']]){
    await nav(); await p.keyboard.press(key); await p.waitForTimeout(300);
    res[label]=await openModals(); await p.keyboard.press('Escape'); await p.waitForTimeout(250);
  }
  // X toggle on the focused id, checking THAT id
  await nav(); const fid=await p.evaluate(()=>_focusedTaskId);
  const before=await p.evaluate(id=>!!(state.tasks.find(t=>t.id===id)||{}).checked, fid);
  await p.keyboard.press('KeyX'); await p.waitForTimeout(250);
  const after=await p.evaluate(id=>!!(state.tasks.find(t=>t.id===id)||{}).checked, fid);
  await p.keyboard.press('KeyX'); await p.waitForTimeout(150);
  // D duplicate on focused
  await nav(); const nb=await p.evaluate(()=>state.tasks.length); await p.keyboard.press('KeyD'); await p.waitForTimeout(300); const na=await p.evaluate(()=>state.tasks.length);
  // T pin toggle on focused (read that id)
  await nav(); const tid=await p.evaluate(()=>_focusedTaskId); const pb=await p.evaluate(id=>!!(state.tasks.find(t=>t.id===id)||{}).pinned, tid);
  await p.keyboard.press('KeyT'); await p.waitForTimeout(200); const pa=await p.evaluate(id=>!!(state.tasks.find(t=>t.id===id)||{}).pinned, tid);
  R.hotkeysClean={ ...res, X_flipped: before!==after, D_added: na-nb, T_flipped: pb!==pa, focusedForX:fid, focusedForT:tid };
}
// search-empty feedback
{
  const { page: p } = await openApp(browser, { device: DESK, seed: richSeed(), port });
  await p.click('#search-box'); await p.type('#search-box','zznotexist',{delay:15}); await p.waitForTimeout(400);
  R.taskSearchEmpty = await p.evaluate(()=>{ const list=document.getElementById('task-list'); const visible=[...document.querySelectorAll('.task-item')].filter(t=>t.offsetParent).length;
    const empty=document.querySelector('.empty-state, .no-results, .search-empty, #task-list .empty'); return { visible, emptyText: empty? empty.textContent.trim().slice(0,80):'(NO EMPTY ELEMENT)', emptyVisible: empty? !!empty.offsetParent:false }; });
  const { page: p2 } = await openApp(browser, { device: DESK, seed: richSeed(), port, page:'notes' });
  await p2.click('#notes-search-box'); await p2.type('#notes-search-box','zznotexist',{delay:15}); await p2.waitForTimeout(400);
  R.notesSearchEmpty = await p2.evaluate(()=>{ const visible=[...document.querySelectorAll('.grim-card')].filter(c=>c.offsetParent).length;
    const empty=document.querySelector('.grim-empty, .notes-empty, .search-empty, .grim-list-empty'); return { visible, emptyText: empty? empty.textContent.trim().slice(0,80):'(NO EMPTY ELEMENT)', emptyVisible: empty? !!empty.offsetParent:false, listHTML: (document.querySelector('#grim-list,.grim-list,#notes-list')||{}).innerHTML?.slice(0,120) }; });
}
// icon-only button aria census
{
  const { page: p } = await openApp(browser, { device: DESK, seed: richSeed(), port });
  R.iconButtons = await p.evaluate(()=>{
    const btns=[...document.querySelectorAll('button')];
    const iconOnly=btns.filter(b=>{ if(!b.offsetParent&&b.closest('#extra-fields')===null&&getComputedStyle(b).display==='none')return false; const txt=(b.textContent||'').replace(/\s/g,''); return txt.length===0; });
    const noName=iconOnly.filter(b=>!(b.getAttribute('aria-label')||b.getAttribute('title')||'').trim());
    const sample=iconOnly.slice(0,40).map(b=>({ id:b.id||'', title:(b.getAttribute('title')||'').slice(0,30), aria:(b.getAttribute('aria-label')||'').slice(0,30) }));
    return { totalButtons:btns.length, iconOnlyCount:iconOnly.length, noAccessibleName:noName.length,
      noNameSample: noName.slice(0,15).map(b=>b.id||b.className.slice(0,30)), sample };
  });
}
fs.writeFileSync(path.join(DIR,'_probe4.json'), JSON.stringify(R,null,2));
console.log(JSON.stringify(R,null,2));
await browser.close(); srv.close();
