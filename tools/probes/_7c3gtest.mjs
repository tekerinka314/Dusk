// 7c slice-3g (Grimoire editor header/body/footer + format toolbar) — delegation tests.
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
const note = (id,title,o={}) => ({ id, title, body:o.body||'<p>тело записи</p>', fmt:true, color:o.color||null,
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

  // ── editor opens + live title input + footer pin / header focus·bar·toc ──
  {
    const { ctx, page, errs } = await mk(base({ notes:[ note('n1','Заметка') ] }));
    await page.evaluate(()=>{ renderNotes(); grimOpen('n1'); }); await page.waitForTimeout(200);
    rec('editor renders (title+body+toolbar)', await page.evaluate(()=>!!document.getElementById('grim-title-in') && !!document.getElementById('grim-body') && !!document.getElementById('grim-fmt-bar')));

    // grimTitleInput — set value then fire delegated input; model updates synchronously
    await page.evaluate(()=>{ const ti=document.getElementById('grim-title-in'); ti.value='Новое заглавие'; ti.dispatchEvent(new Event('input',{bubbles:true})); });
    await page.waitForTimeout(80);
    rec('grimTitleInput updates note.title live', await page.evaluate(()=>state.notes.find(n=>n.id==='n1').title==='Новое заглавие'));

    // grimToggleFocus / grimToggleBar / grimToggleToc via header rail clicks
    const f0 = await page.evaluate(()=>grimFocus);
    await clickSel(page, '.grim-focus-toggle'); await page.waitForTimeout(120);
    rec('grimToggleFocus changes grimFocus', await page.evaluate(()=>grimFocus) !== f0, `focus ${f0}→${await page.evaluate(()=>grimFocus)}`);

    const b0 = await page.evaluate(()=>grimBarMode);
    await clickSel(page, '.grim-bar-toggle'); await page.waitForTimeout(120);
    rec('grimToggleBar changes grimBarMode', await page.evaluate(()=>grimBarMode) !== b0, `bar ${b0}→${await page.evaluate(()=>grimBarMode)}`);

    const t0 = await page.evaluate(()=>grimTocOpen);
    await clickSel(page, '.grim-toc-toggle'); await page.waitForTimeout(120);
    rec('grimToggleToc toggles grimTocOpen', await page.evaluate(()=>grimTocOpen) !== t0, `toc ${t0}→${await page.evaluate(()=>grimTocOpen)}`);

    // footer pin → v4 note.pinned
    const hitPin = await clickSel(page, '.grim-act.is-pin[data-act="grimTogglePin"]'); await page.waitForTimeout(200);
    rec('grimTogglePin pins note', hitPin && (await v4(page)).notes.find(n=>n.id==='n1').pinned === true);
    allErrs.push(...errs); await ctx.close();
  }

  // ── format toolbar routes through grimFmtBtn (table popover is a pure-DOM proof) ──
  {
    const { ctx, page, errs } = await mk(base({ notes:[ note('n1','Заметка') ] }));
    await page.evaluate(()=>{ renderNotes(); grimOpen('n1'); }); await page.waitForTimeout(200);
    rec('toolbar buttons delegated (data-act=grimFmtBtn)', await page.locator('#grim-fmt-bar .fmt-btn[data-act="grimFmtBtn"]').count() >= 14);
    await clickSel(page, '#grim-fmt-bar .fmt-btn[data-cmd="table"]'); await page.waitForTimeout(150);
    rec('fmt table → grimTableMenu opens popover', await page.locator('#grim-table-pop').count() === 1);
    // close it, then callout
    await page.evaluate(()=>{ const p=document.getElementById('grim-table-pop'); if(p) p.remove(); });
    await clickSel(page, '#grim-fmt-bar .fmt-btn[data-cmd="callout"]'); await page.waitForTimeout(150);
    rec('fmt callout → grimCalloutMenu opens popover', await page.locator('#grim-co-pop').count() === 1);
    allErrs.push(...errs); await ctx.close();
  }

  // ── footer «в склеп» (grimArchive) + grimBack ──
  {
    const { ctx, page, errs } = await mk(base({ notes:[ note('n1','Заметка'), note('n2','Вторая') ] }));
    await page.evaluate(()=>{ renderNotes(); grimOpen('n1'); }); await page.waitForTimeout(180);
    const hitA = await clickSel(page, '.grim-act[data-act="grimArchive"]'); await page.waitForTimeout(220);
    const a = await v4(page);
    rec('grimArchive → moved to склеп', hitA && a.notesArchive.some(n=>n.id==='n1') && !a.notes.some(n=>n.id==='n1'),
        `notes=${a.notes.length} crypt=${a.notesArchive.length}`);

    await page.evaluate(()=>{ grimOpen('n2'); }); await page.waitForTimeout(150);
    const hitB = await clickSel(page, '.grim-back[data-act="grimBack"]'); await page.waitForTimeout(150);
    rec('grimBack → editor closed (currentNoteId null)', hitB && await page.evaluate(()=>currentNoteId === null));
    allErrs.push(...errs); await ctx.close();
  }

  // ── crypt (archive) detail: restore + destroy-forever ──
  {
    const { ctx, page, errs } = await mk(base({ notesArchive:[ note('c1','Склеп-1',{archivedAt:NOW}), note('c2','Склеп-2',{archivedAt:NOW}) ] }));
    await page.evaluate(()=>{ grimMode='archive'; renderNotes(); grimOpen('c1'); }); await page.waitForTimeout(200);
    rec('crypt detail renders restore/destroy', await page.locator('[data-act="grimRestoreNote"][data-nid="c1"]').count() === 1 && await page.locator('[data-act="grimDeleteForever"][data-nid="c1"]').count() === 1);
    const hitR = await clickSel(page, '[data-act="grimRestoreNote"][data-nid="c1"]'); await page.waitForTimeout(220);
    const r = await page.evaluate(()=>({ inNotes: state.notes.some(n=>n.id==='c1'), inCrypt: state.notesArchive.some(n=>n.id==='c1') }));
    rec('grimRestoreNote → back to гримуар', hitR && r.inNotes && !r.inCrypt, JSON.stringify(r));
    allErrs.push(...errs); await ctx.close();
  }

  rec('no pageerror', allErrs.length === 0, allErrs.join(' | '));

  await browser.close(); srv.close();
  const fails = results.filter(r=>!r.pass);
  console.log(`\n7c-SLICE3g SUMMARY  PASS ${results.length-fails.length}/${results.length}`);
  process.exit(fails.length?1:0);
})().catch(e=>{ console.error('CRASH',e); process.exit(2); });
