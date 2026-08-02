// 7c slice-3h (Grimoire list/crypt + portaled menus: history, sort, colour filter,
// find bar, template & IO popovers) — delegation tests.
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

const NOW = Date.now();
const note = (id,title,o={}) => ({ id, title, body:o.body||'<p>тело</p>', fmt:true, color:o.color||null,
  pinned:!!o.pinned, createdAt:NOW, updatedAt:NOW, ...(o.archivedAt?{archivedAt:o.archivedAt}:{}) });
const base = (extra) => ({ tasks:[], groups:[], archive:[], notes:[], notesArchive:[], templates:[], noteTemplates:[],
  nextId:100, nextGroupId:100, nextSubId:200, sortMode:'priority', sortModeOverrides:{}, notesSort:'edited', ...extra });

const results = [];
const rec = (name, pass, detail) => { results.push({ name, pass, detail }); console.log(`${pass?'PASS':'FAIL'}  ${name}  ${detail!==undefined?detail:''}`); };

(async()=>{
  await new Promise(r=>srv.listen(0,r));
  const port = srv.address().port;
  const url = `http://localhost:${port}/index.html`;
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  const allErrs = [];

  async function mk(state){
    const ctx = await browser.newContext({ viewport:{width:1280,height:900} });
    const page = await ctx.newPage();
    const errs=[]; page.on('pageerror',e=>errs.push(e.message));
    await page.addInitScript((st)=>{
      localStorage.setItem('duskState_v3', JSON.stringify(st));
      localStorage.setItem('currentPage','notes');
      localStorage.removeItem('duskState_v4');
      localStorage.removeItem('dusk_premigration_v3');
    }, state);
    await page.goto(url); await page.waitForTimeout(400);
    return { ctx, page, errs };
  }
  const v4 = (page) => page.evaluate(()=>JSON.parse(localStorage.getItem('duskState_v4')));
  const clickSel = (page, sel) => page.evaluate((sel)=>{ const e=document.querySelector(sel); if(e) e.click(); return !!e; }, sel);

  // ── list: sort menu + leaf open + select-toggle + colour filter ──
  {
    const { ctx, page, errs } = await mk(base({ notes:[ note('n1','Альфа',{color:'#88aa55'}), note('n2','Бета') ] }));
    await page.evaluate(()=>{ renderNotes(); }); await page.waitForTimeout(150);

    // sort: open trigger, click "По заглавию"
    await clickSel(page, '#grim-sort-trigger'); await page.waitForTimeout(80);
    const hitSort = await clickSel(page, '.dl-month-option[data-act="grimSetSort"][data-k="title"]'); await page.waitForTimeout(120);
    rec('grimSetSort changes notesSort', hitSort && await page.evaluate(()=>state.notesSort) === 'title', `notesSort=${await page.evaluate(()=>state.notesSort)}`);

    // leaf open → currentNoteId
    const hitLeaf = await clickSel(page, '.grim-leaf[data-id="n1"][data-act="grimOpen"]'); await page.waitForTimeout(150);
    rec('grimOpen opens note', hitLeaf && await page.evaluate(()=>currentNoteId === 'n1'), `cur=${await page.evaluate(()=>currentNoteId)}`);

    // select mode → leaf toggles selection
    await page.evaluate(()=>{ grimSelectMode = true; renderNotes(); }); await page.waitForTimeout(120);
    const hitSel = await clickSel(page, '.grim-leaf[data-id="n2"][data-act="grimToggleSelectNote"]'); await page.waitForTimeout(120);
    rec('grimToggleSelectNote ticks note', hitSel && await page.evaluate(()=>grimSelectedIds.has('n2')));
    await page.evaluate(()=>{ grimSelectMode = false; grimSelectedIds.clear(); renderNotes(); }); await page.waitForTimeout(80);

    // colour filter: build pop, click swatch
    await page.evaluate(()=>_grimBuildColorFilterPop()); await page.waitForTimeout(100);
    const hitC = await clickSel(page, '#grim-cfilter-pop .color-filter-swatch[data-act="grimSetColorFilter"]'); await page.waitForTimeout(150);
    rec('grimSetColorFilter sets noteColorFilter', hitC && await page.evaluate(()=>noteColorFilter) === '#88aa55', `flt=${await page.evaluate(()=>noteColorFilter)}`);
    allErrs.push(...errs); await ctx.close();
  }

  // ── template popover: use-builtin spawns note + delete-tpl removes & keeps popover ──
  {
    const { ctx, page, errs } = await mk(base({ notes:[ note('n1','Альфа') ], noteTemplates:[ { id:'tpl1', name:'Мой шаблон', title:'Из шаблона', body:'<p>seed</p>', color:null } ] }));
    await page.evaluate(()=>{ renderNotes(); }); await page.waitForTimeout(120);
    await clickSel(page, '#grim-tpl-trigger'); await page.waitForTimeout(150);
    rec('tpl popover renders builtin + user items',
        await page.locator('#grim-tpl-pop [data-act="grimUseBuiltin"][data-key="diary"]').count() === 1 &&
        await page.locator('#grim-tpl-pop [data-act="grimDeleteTpl"][data-id="tpl1"]').count() === 1);

    const n0 = await page.evaluate(()=>state.notes.length);
    await clickSel(page, '#grim-tpl-pop [data-act="grimUseBuiltin"][data-key="diary"]'); await page.waitForTimeout(180);
    rec('grimUseBuiltin spawns a note', await page.evaluate(()=>state.notes.length) === n0 + 1, `notes ${n0}→${await page.evaluate(()=>state.notes.length)}`);

    // re-open, delete user template — popover must survive (stopImmediatePropagation)
    await clickSel(page, '#grim-tpl-trigger'); await page.waitForTimeout(150);
    const hitDel = await clickSel(page, '#grim-tpl-pop [data-act="grimDeleteTpl"][data-id="tpl1"]'); await page.waitForTimeout(180);
    const gone = await page.evaluate(()=>(state.noteTemplates||[]).length === 0);
    const stillOpen = await page.evaluate(()=>{ const p=document.getElementById('grim-tpl-pop'); const s=document.getElementById('grim-new-split'); return !!p && p.querySelector('.grim-tpl-head') !== null && (!s || s.classList.contains('open')); });
    rec('grimDeleteTpl removes tpl & popover stays', hitDel && gone && stillOpen, `gone=${gone} open=${stillOpen}`);
    allErrs.push(...errs); await ctx.close();
  }

  // ── crypt: month head collapses (grimToggleCryptMonth) ──
  {
    const { ctx, page, errs } = await mk(base({ notesArchive:[ note('c1','Склеп-1',{archivedAt:NOW}), note('c2','Склеп-2',{archivedAt:NOW}) ] }));
    await page.evaluate(()=>{ grimMode='archive'; renderNotes(); }); await page.waitForTimeout(150);
    rec('crypt month head rendered', await page.locator('.grim-crypt-month-head[data-act="grimToggleCryptMonth"]').count() >= 1);
    const wasCollapsed = await page.evaluate(()=>document.querySelector('.grim-crypt-month').classList.contains('collapsed'));
    await clickSel(page, '.grim-crypt-month-head[data-act="grimToggleCryptMonth"]'); await page.waitForTimeout(120);
    const nowCollapsed = await page.evaluate(()=>document.querySelector('.grim-crypt-month').classList.contains('collapsed'));
    rec('grimToggleCryptMonth toggles month', wasCollapsed !== nowCollapsed, `${wasCollapsed}→${nowCollapsed}`);
    allErrs.push(...errs); await ctx.close();
  }

  // ── history modal: select older version → restore → close ──
  {
    const { ctx, page, errs } = await mk(base({ notes:[ note('n1','Текущая',{body:'<p>сейчас</p>'}) ] }));
    await page.evaluate(()=>{
      renderNotes();
      grimVersions['n1'] = [
        { at: Date.now()-30000, t:'V1', b:'<p>версия один</p>', kind:'auto' },
        { at: Date.now()-15000, t:'V2', b:'<p>версия два</p>',  kind:'auto' },
      ];
      grimOpenHistory('n1');
    });
    await page.waitForTimeout(180);
    rec('history modal renders version buttons', await page.locator('#grim-hist-ov [data-act="grimHistSelect"]').count() >= 2);

    // select the OLDEST version
    const oldestAt = await page.evaluate(()=>{
      const ats = [...document.querySelectorAll('#grim-hist-ov [data-act="grimHistSelect"]')].map(b=>+b.dataset.at);
      return Math.min(...ats);
    });
    await clickSel(page, `#grim-hist-ov [data-act="grimHistSelect"][data-at="${oldestAt}"]`); await page.waitForTimeout(120);
    rec('grimHistSelect shows restore button', await page.locator('#grim-hist-ov [data-act="grimHistRestore"]').count() === 1);

    await clickSel(page, '#grim-hist-ov [data-act="grimHistRestore"]'); await page.waitForTimeout(400);   // close is anim-deferred (.open drop → remove after 340ms)
    const restored = await page.evaluate(()=>state.notes.find(n=>n.id==='n1').body.includes('версия один'));
    const closed = await page.evaluate(()=>{ const o=document.getElementById('grim-hist-ov'); return !o || !o.classList.contains('open'); });
    rec('grimHistRestore restores body & closes modal', restored && closed, `restored=${restored} closed=${closed}`);
    allErrs.push(...errs); await ctx.close();
  }

  // ── find bar buttons are delegated (markup wiring) ──
  {
    const { ctx, page, errs } = await mk(base({ notes:[ note('n1','Альфа') ] }));
    await page.evaluate(()=>{ renderNotes(); _grimFindBar(); }); await page.waitForTimeout(120);
    rec('find bar buttons delegated',
        await page.locator('#grim-find [data-act="grimFindPrev"]').count() === 1 &&
        await page.locator('#grim-find [data-act="grimFindNext"]').count() === 1 &&
        await page.locator('#grim-find [data-act="grimFindClose"]').count() === 1);
    allErrs.push(...errs); await ctx.close();
  }

  rec('no pageerror', allErrs.length === 0, allErrs.join(' | '));

  await browser.close(); srv.close();
  const fails = results.filter(r=>!r.pass);
  console.log(`\n7c-SLICE3h SUMMARY  PASS ${results.length-fails.length}/${results.length}`);
  process.exit(fails.length?1:0);
})().catch(e=>{ console.error('CRASH',e); process.exit(2); });
