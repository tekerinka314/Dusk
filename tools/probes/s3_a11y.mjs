// S3/B5 — §3.1 keyboard circuit + focus trap/return, §3.5 reduced-motion, warn-callout contrast.
import { serve, launch, ensureShots, DEVICES } from './lib.mjs';
import { richSeed } from './seed.mjs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright-core');
import fs from 'fs'; import path from 'path';
const DIR = ensureShots('s3');
const DESK = { width: 2560, height: 1440, deviceScaleFactor: 1, isMobile: false, hasTouch: false };

const { srv, port } = await serve();
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });

async function ctx(reduced, seed = richSeed(), page = 'main') {
  const c = await browser.newContext({ viewport:{ width:DESK.width, height:DESK.height }, deviceScaleFactor:1, isMobile:false, hasTouch:false, colorScheme:'dark', reducedMotion: reduced?'reduce':'no-preference' });
  const p = await c.newPage();
  await p.addInitScript(([st,pg])=>{ try{localStorage.clear();}catch(e){} localStorage.setItem('duskState_v4',JSON.stringify(st)); localStorage.setItem('currentPage',pg); localStorage.setItem('isFiltered','0'); try{indexedDB.deleteDatabase('keyval-store');}catch(e){} }, [seed, page]);
  await p.goto(`http://localhost:${port}/index.html`, { waitUntil:'load' });
  await p.waitForTimeout(600);
  return { c, p };
}
const desc = el => el ? `${el.tagName.toLowerCase()}${el.id?'#'+el.id:''}${el.className&&typeof el.className==='string'?'.'+el.className.trim().split(/\s+/).slice(0,2).join('.'):''}[${(el.textContent||'').trim().slice(0,16)}]` : 'null';

const R = { keyboard:{}, trap:{}, focusReturn:{}, reducedMotion:[], callout:null, landmarks:{} };

// ===== §3.1 keyboard circuit on main page =====
{
  const { c, p } = await ctx(false);
  // landmarks + headings
  R.landmarks = await p.evaluate(()=>({
    main: document.querySelectorAll('main,[role=main]').length,
    nav: document.querySelectorAll('nav,[role=navigation]').length,
    h1: [...document.querySelectorAll('h1')].map(h=>h.textContent.trim()).slice(0,3),
    h2: document.querySelectorAll('h2:not(.modal-title)').length,
    headingsVisible: [...document.querySelectorAll('h1,h2,h3')].filter(h=>h.offsetParent).map(h=>h.tagName+':'+h.textContent.trim().slice(0,14)).slice(0,12),
  }));
  await p.evaluate(()=>document.body.focus());
  await p.click('.brand-name').catch(()=>{});
  await p.evaluate(()=>{ if(document.activeElement&&document.activeElement.blur)document.activeElement.blur(); });
  const seq=[]; const rings=[];
  for (let i=0;i<45;i++){
    await p.keyboard.press('Tab');
    const info = await p.evaluate(()=>{
      const el=document.activeElement; if(!el||el===document.body) return {d:'BODY'};
      const cs=getComputedStyle(el);
      const r=el.getBoundingClientRect();
      return { d:`${el.tagName.toLowerCase()}${el.id?'#'+el.id:''}${typeof el.className==='string'&&el.className?'.'+el.className.trim().split(/\s+/)[0]:''}`,
        txt:(el.textContent||el.value||el.placeholder||'').trim().slice(0,18),
        outline: cs.outlineStyle!=='none'&&parseFloat(cs.outlineWidth)>0 ? `${cs.outlineWidth} ${cs.outlineColor}` : (cs.boxShadow!=='none'?'boxShadow':'NONE'),
        vis: r.width>0&&r.height>0, off: r.y<0||r.y>1440 };
    });
    seq.push(info);
  }
  R.keyboard.sequence = seq.map(s=>s.d+(s.txt?`«${s.txt}»`:'')+(s.outline==='NONE'?' ⟨NO-RING⟩':'')+(s.off?' ⟨OFFSCREEN⟩':''));
  R.keyboard.noRingCount = seq.filter(s=>s.outline==='NONE'&&s.d!=='BODY').length;
  R.keyboard.uniqueStops = new Set(seq.map(s=>s.d)).size;
  // interactive elements reachable?: count all vs how many appear in tab seq (rough)
  R.keyboard.totalFocusable = await p.evaluate(()=>document.querySelectorAll('button:not([disabled]),a[href],input:not([disabled]),[tabindex]:not([tabindex="-1"]),[role=button][tabindex]').length);
  await c.close();
}

// ===== §3.1 focus trap + focus return: deadline modal via natural trigger =====
{
  const { c, p } = await ctx(false);
  // focus the task-1 deadline chip (role=button tabindex=0) and activate it
  const chip = await p.$('.task-item[data-id="1"] [data-act="openDeadlineModal"]');
  await chip.evaluate(el=>el.focus());
  const trigDesc = await p.evaluate(()=>{const e=document.activeElement;return e.tagName+'.'+(typeof e.className==='string'?e.className.trim().split(/\s+/)[0]:'')});
  await p.keyboard.press('Enter'); await p.waitForTimeout(500);
  const modalOpen = await p.evaluate(()=>{const m=document.getElementById('deadline-modal');return m&&m.style.display!=='none';});
  // tab 25 times, assert containment
  let escaped=0, insideSample=[];
  for(let i=0;i<25;i++){ await p.keyboard.press('Tab');
    const inside=await p.evaluate(()=>{const m=document.getElementById('deadline-modal');return m&&m.contains(document.activeElement);});
    if(!inside)escaped++; if(i<3)insideSample.push(await p.evaluate(()=>document.activeElement.tagName+'.'+(typeof document.activeElement.className==='string'?document.activeElement.className.trim().split(/\s+/)[0]:'')));
  }
  R.trap = { modalOpen, escapedCount:escaped, insideSample };
  // close via Esc, assert focus returns to trigger chip
  await p.keyboard.press('Escape'); await p.waitForTimeout(500);
  const afterEsc = await p.evaluate(()=>{const e=document.activeElement;return{d:e?e.tagName+'.'+(typeof e.className==='string'?e.className.trim().split(/\s+/)[0]:''):'null', isChip: !!(e&&e.closest&&e.closest('[data-act="openDeadlineModal"]'))};});
  R.focusReturn.deadline = { trigDesc, afterEsc };
  await c.close();
}

// ===== quarantine overlay: role/label, Esc close, focus trap/return =====
{
  const seed = richSeed(); seed.syncJournal=[{uid:'jq1',kind:'field',recType:'task',recUid:'u1',field:'text',loser:'Проигравшая',winner:'Победа',reason:'clash',createdAt:Date.now()-6e4,resolved:false}];
  const { c, p } = await ctx(false, seed);
  await p.evaluate(()=>document.getElementById('btn-add')?.focus());
  const before = await p.evaluate(()=>document.activeElement.id||document.activeElement.tagName);
  await p.evaluate(()=>openQuarantine()); await p.waitForTimeout(500);
  const q = await p.evaluate(()=>{const o=document.querySelector('.sync-quar-overlay');return o?{role:o.getAttribute('role'),modal:o.getAttribute('aria-modal'),labelledby:o.getAttribute('aria-labelledby'),hasId:!!o.id,titleHasId:!!(o.querySelector('.modal-title')||{}).id,focusInside:o.contains(document.activeElement),activeEl:document.activeElement.tagName}:null;});
  await p.keyboard.press('Escape'); await p.waitForTimeout(400);
  const stillOpen = await p.evaluate(()=>!!document.querySelector('.sync-quar-overlay'));
  const afterFocus = await p.evaluate(()=>document.activeElement.id||document.activeElement.tagName);
  R.quarantine = { before, ...q, escClosed: !stillOpen, afterFocus };
  await c.close();
}

// ===== §3.5 reduced-motion sweep =====
{
  const { c, p } = await ctx(true);
  const rmCheck = async (label, sel, prop='animation') => {
    const v = await p.evaluate(([s,pr])=>{ const el=document.querySelector(s); if(!el)return 'NF'; const cs=getComputedStyle(el); return pr==='animation'?`anim=${cs.animationName}/${cs.animationDuration}`:`trans=${cs.transitionProperty}/${cs.transitionDuration}`; }, [sel,prop]);
    R.reducedMotion.push({ label, sel, v });
  };
  // trigger a collapse (group) and open a popover, snooze
  await rmCheck('task-item base','.task-item');
  await rmCheck('app-glow','.app-glow');
  await rmCheck('critical deadline pulse','.task-deadline.overdue, .dl-badge.overdue, .task-item[data-id="2"] [class*=deadline]');
  await rmCheck('sync eye FAB','#sync-glyph-btn');
  await rmCheck('candle/progress','.progress-fill, .candle-flame, [class*=flame]');
  await rmCheck('ember (subtask prio)','.subtask-item[data-prio=high], [style*="--sprio"]');
  // open snooze popover, check its anim
  await p.evaluate(()=>{const t=document.querySelector('.task-item[data-id="2"]');const b=t&&t.querySelector('[data-act="openSnoozeMenu"]');b&&b.click();}); await p.waitForTimeout(300);
  await rmCheck('snooze popover','.snooze-menu');
  await p.keyboard.press('Escape');
  // toast
  await p.evaluate(()=>showToast('тест')); await p.waitForTimeout(200);
  await rmCheck('toast','#toast, .toast');
  // collapse group transition
  await rmCheck('group collapse container','.group-tasks, .group-body, [class*=group][class*=task]','transition');
  // reduced-motion matchMedia truthy?
  R.reducedMotionActive = await p.evaluate(()=>matchMedia('(prefers-reduced-motion: reduce)').matches);
  await c.close();
}

// ===== warn callout contrast (inject correct grim-co markup) =====
{
  const { c, p } = await ctx(false, richSeed(), 'notes');
  await p.evaluate(()=>grimOpen('n1')); await p.waitForTimeout(600);
  const info = await p.evaluate(()=>{
    const body=document.querySelector('.grim-body'); if(!body)return null;
    const co=document.createElement('div'); co.className='grim-co grim-co-warn'; co.innerHTML='<div class="grim-co-body"><p id="__cotest">Не читать вслух после полуночи.</p></div>';
    body.appendChild(co);
    const el=document.getElementById('__cotest'); const cs=getComputedStyle(el);
    return { color:cs.color, fs:cs.fontSize };
  });
  R.callout = info;
  await c.close();
}

fs.writeFileSync(path.join(DIR,'_a11y.json'), JSON.stringify(R,null,2));
console.log(JSON.stringify(R,null,2));
await browser.close(); srv.close();
