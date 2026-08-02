// S3/B5 — verify collapsed-params focusable, input focus ring, hotkey firing, 200% zoom, find bar.
import { serve, launch, openApp, ensureShots } from './lib.mjs';
import { richSeed } from './seed.mjs';
import fs from 'fs'; import path from 'path';
const DIR = ensureShots('s3');
const DESK = { width: 2560, height: 1440, deviceScaleFactor: 1, isMobile: false, hasTouch: false, userAgent: undefined };
const { srv, port } = await serve();
const browser = await launch();
const R = {};

// (1) collapsed «Параметры» panel — are its controls focusable while hidden?
{
  const { page: p } = await openApp(browser, { device: DESK, seed: richSeed(), port });
  R.paramsPanel = await p.evaluate(()=>{
    const ef=document.getElementById('extra-fields');
    const cs=getComputedStyle(ef);
    const firstBtn=ef.querySelector('.prio-grid-btn');
    const bcs=getComputedStyle(firstBtn);
    firstBtn.focus();
    return { display:cs.display, visibility:cs.visibility, maxHeight:cs.maxHeight, height:cs.height, overflow:cs.overflow,
      childCount: ef.querySelectorAll('button,input,[tabindex]').length,
      firstBtnVisible: bcs.display!=='none' && bcs.visibility!=='hidden',
      focusLandedInside: ef.contains(document.activeElement),
      panelHasInert: ef.hasAttribute('inert') };
  });
}
// (2) input focus ring: outline + border before/after focus
{
  const { page: p } = await openApp(browser, { device: DESK, seed: richSeed(), port });
  R.inputRing = await p.evaluate(()=>{
    const inp=document.getElementById('input-box');
    const b4=getComputedStyle(inp); const before={outline:b4.outlineStyle+' '+b4.outlineWidth, border:b4.borderColor, boxShadow:b4.boxShadow.slice(0,30)};
    inp.focus();
    const af=getComputedStyle(inp); const after={outline:af.outlineStyle+' '+af.outlineWidth, border:af.borderColor, boxShadow:af.boxShadow.slice(0,30)};
    return { before, after, borderChanged: before.border!==after.border, ringAppeared: after.outline!==before.outline||after.boxShadow!==before.boxShadow };
  });
}
// (3) hotkey firing
{
  const { page: p, errors } = await openApp(browser, { device: DESK, seed: richSeed(), port });
  const fire = async (key, pre) => { if(pre)await pre(); await p.keyboard.press(key); await p.waitForTimeout(250); };
  const st = ()=>p.evaluate(()=>({ tasks:state.tasks.length, checked1:!!(state.tasks.find(t=>t.id===1)||{}).checked,
    focusedId: (typeof _focusedTaskId!=='undefined')?_focusedTaskId:'?',
    editing: !!document.querySelector('.task-text[contenteditable="true"]'),
    modalOpen: [...document.querySelectorAll('.modal-overlay')].filter(m=>getComputedStyle(m).display!=='none').map(m=>m.id).filter(Boolean),
    searchFocused: document.activeElement&&document.activeElement.id==='search-box',
    inputFocused: document.activeElement&&document.activeElement.id==='input-box' }));
  await p.click('body');
  await p.keyboard.press('KeyJ'); await p.waitForTimeout(200); const afterJ=await st();   // focus first task
  await p.keyboard.press('KeyX'); await p.waitForTimeout(250); const afterX=await st();   // toggle check
  await p.keyboard.press('KeyX'); await p.waitForTimeout(250);                             // toggle back
  await p.keyboard.press('KeyE'); await p.waitForTimeout(250); const afterE=await st();   // inline edit
  await p.keyboard.press('Escape'); await p.waitForTimeout(200);
  const beforeD=await p.evaluate(()=>state.tasks.length);
  await p.keyboard.press('KeyD'); await p.waitForTimeout(300); const afterD=await p.evaluate(()=>state.tasks.length);
  const openClose=async(k)=>{ await p.keyboard.press(k); await p.waitForTimeout(300); const m=await st(); await p.keyboard.press('Escape'); await p.waitForTimeout(250); return m.modalOpen; };
  const pMod=await openClose('KeyP'); const lMod=await openClose('KeyL'); const mMod=await openClose('KeyM'); const rMod=await openClose('KeyR');
  await p.keyboard.press('KeyT'); await p.waitForTimeout(200); const pin1=await p.evaluate(()=>!!(state.tasks.find(t=>t.id===1)||{}).pinned);
  await p.keyboard.press('KeyT'); await p.waitForTimeout(200);
  // / focuses search, N focuses input
  await p.click('body'); await p.keyboard.press('Slash'); await p.waitForTimeout(150); const slashFocus=await st();
  await p.keyboard.press('Escape'); await p.click('body'); await p.keyboard.press('KeyN'); await p.waitForTimeout(150); const nFocus=await st();
  R.hotkeys = { afterJ_focused:afterJ.focusedId, afterX_checked:afterX.checked1, afterE_editing:afterE.editing,
    D_added: afterD-beforeD, P_modal:pMod, L_modal:lMod, M_modal:mMod, R_modal:rMod, T_pinned:pin1,
    slash_searchFocused:slashFocus.searchFocused, N_inputFocused:nFocus.inputFocused, errors:errors.slice(0,3) };
}
// (4) 200% zoom reflow
{
  const { page: p } = await openApp(browser, { device: { width:1280, height:720, deviceScaleFactor:1, isMobile:false, hasTouch:false }, seed: richSeed(), port });
  await p.evaluate(()=>{ document.documentElement.style.zoom='2'; });
  await p.waitForTimeout(500);
  R.zoom200 = await p.evaluate(()=>({ scrollW:document.documentElement.scrollWidth, clientW:document.documentElement.clientWidth,
    hScroll: document.documentElement.scrollWidth>document.documentElement.clientWidth+2,
    toolbarReachable: !!document.getElementById('btn-expand'), navReachable: !!document.getElementById('nav-archive') }));
  await p.screenshot({ path: path.join(DIR,'D-zoom200.png') });
}
// (5) find bar UX (search on tasks + notes)
{
  const { page: p } = await openApp(browser, { device: DESK, seed: richSeed(), port });
  await p.click('#search-box'); await p.type('#search-box','ритуал',{delay:20}); await p.waitForTimeout(400);
  R.findTasks = await p.evaluate(()=>({ visibleTasks:[...document.querySelectorAll('.task-item')].filter(t=>t.offsetParent).length,
    tagCloud: !!document.querySelector('#tag-cloud[style*="flex"]'), hasClearBtn: !!document.querySelector('#search-box + *, .search-clear, [data-act*="clearSearch" i]') }));
  // Esc clears?
  await p.keyboard.press('Escape'); await p.waitForTimeout(200);
  R.findTasks.escCleared = await p.evaluate(()=>document.getElementById('search-box').value==='');
  // notes search + empty message
  const { page: p2 } = await openApp(browser, { device: DESK, seed: richSeed(), port, page:'notes' });
  await p2.click('#notes-search-box'); await p2.type('#notes-search-box',' zzznotfound',{delay:20}); await p2.waitForTimeout(400);
  R.findNotes = await p2.evaluate(()=>{ const list=document.querySelector('#notes-list, .grim-list, #grim-list'); return { emptyMsg: (document.querySelector('.grim-empty, .notes-empty, .search-empty')||{}).textContent?.trim().slice(0,60)||'(none)', visibleCards:[...document.querySelectorAll('.grim-card')].filter(c=>c.offsetParent).length }; });
}
fs.writeFileSync(path.join(DIR,'_probe3.json'), JSON.stringify(R,null,2));
console.log(JSON.stringify(R,null,2));
await browser.close(); srv.close();
