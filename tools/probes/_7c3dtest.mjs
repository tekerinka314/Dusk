// 7c slice-3d (list widgets) — archive, templates, backups, tag chip, quick-add.
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
const arch = (id,text,o={}) => ({ id, text, checked:!!o.checked, priority:'none', color:null, groupId:null,
  note:'', deadline:null, repeat:'none', subtasks:[], archivedAt: o.at || NOW, order:0 });
const base = (extra) => ({ tasks:[], groups:[], archive:[], notes:[], notesArchive:[], templates:[], noteTemplates:[],
  nextId:100, nextGroupId:100, nextSubId:200, sortMode:'priority', sortModeOverrides:{}, ...extra });

const results = [];
const rec = (name, pass, detail) => { results.push({ name, pass, detail }); console.log(`${pass?'PASS':'FAIL'}  ${name}  ${detail!==undefined?detail:''}`); };

(async()=>{
  await new Promise(r=>srv.listen(0,r));
  const port = srv.address().port;
  const url = `http://localhost:${port}/index.html`;
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  const allErrs = [];

  async function mk(state, { page: pg='main', backups=null } = {}){
    const ctx = await browser.newContext({ viewport:{width:1180,height:900} });
    const page = await ctx.newPage();
    const errs=[]; page.on('pageerror',e=>errs.push(e.message));
    await page.addInitScript(([st,pg,bk])=>{
      localStorage.setItem('duskState_v3', JSON.stringify(st));
      localStorage.setItem('currentPage', pg);
      if (bk) localStorage.setItem('dusk_backups_v1', JSON.stringify(bk));
      localStorage.removeItem('duskState_v4');
      localStorage.removeItem('dusk_premigration_v3');
    }, [state, pg, backups]);
    await page.goto(url); await page.waitForTimeout(400);
    return { ctx, page, errs };
  }
  const v4 = (page) => page.evaluate(()=>JSON.parse(localStorage.getItem('duskState_v4')));
  const clickSel = (page, sel) => page.evaluate((sel)=>{ const e=document.querySelector(sel); if(e) e.click(); return !!e; }, sel);

  // ── archive: restore (mutation is synchronous; save is deferred to the exit anim,
  //    so assert in-memory state rather than localStorage) ──
  {
    const { ctx, page, errs } = await mk(base({ archive:[ arch(21,'old1') ] }), { page:'archive' });
    await page.evaluate(()=>{ try{ setPage('archive'); }catch(e){} try{ renderArchive(); }catch(e){} }); await page.waitForTimeout(150);
    rec('archive rows rendered', await page.locator('.archive-item[data-id="21"]').count() === 1);
    const hit1 = await clickSel(page, '.archive-item[data-id="21"] [data-act="restoreTask"]'); await page.waitForTimeout(200);
    const a1 = await page.evaluate(()=>({ inTasks: state.tasks.some(t=>t.id===21), inArch: state.archive.some(a=>a.id===21) }));
    rec('restoreTask → task back, archive -1', hit1 && a1.inTasks && !a1.inArch, JSON.stringify(a1));
    allErrs.push(...errs); await ctx.close();
  }

  // ── archive: delete-forever (saves immediately + tombstone) ──
  {
    const { ctx, page, errs } = await mk(base({ archive:[ arch(22,'old2') ] }), { page:'archive' });
    await page.evaluate(()=>{ try{ setPage('archive'); }catch(e){} try{ renderArchive(); }catch(e){} }); await page.waitForTimeout(150);
    const hit2 = await clickSel(page, '.archive-item[data-id="22"] [data-act="deleteFromArchive"]'); await page.waitForTimeout(300);
    const a2 = await v4(page);
    rec('deleteFromArchive → gone + tombstone', hit2 && !a2.archive.some(x=>x.id===22) && (a2.tombstones||[]).some(t=>t.type==='task'),
        `arch=${a2.archive.length} tombs=${(a2.tombstones||[]).length}`);
    allErrs.push(...errs); await ctx.close();
  }

  // ── templates: create from + delete ──
  {
    const { ctx, page, errs } = await mk(base({ templates:[ { id:31, name:'Шаблон', text:'Шаблон задача', priority:'none', repeat:'none', deadline:null, subtasks:[] } ] }));
    await page.evaluate(()=>openTemplatesModal()); await page.waitForTimeout(200);
    rec('templates list rendered', await page.locator('[data-act="createTaskFromTemplate"][data-id="31"]').count() === 1);
    const hitC = await clickSel(page, '[data-act="createTaskFromTemplate"][data-id="31"]'); await page.waitForTimeout(220);
    rec('createTaskFromTemplate → task added', hitC && (await v4(page)).tasks.length === 1, `tasks=${(await v4(page)).tasks.length}`);

    await page.evaluate(()=>openTemplatesModal()); await page.waitForTimeout(200);
    const hitD = await clickSel(page, '[data-act="deleteTemplate"][data-id="31"]'); await page.waitForTimeout(200);
    rec('deleteTemplate → templates -1', hitD && (await v4(page)).templates.length === 0, `tpl=${(await v4(page)).templates.length}`);
    allErrs.push(...errs); await ctx.close();
  }

  // ── backups: restore ──
  {
    const snapState = base({ tasks:[ { id:77, text:'restored', checked:false, priority:'none', color:null, groupId:null, order:0, pinned:false, note:'', deadline:null, repeat:'none', cycleChecked:false, nextReset:null, subtasks:[], subtasksOpen:false } ] });
    const backups = [ { ts: NOW - 60000, json: JSON.stringify(snapState), counts:{ tasks:1, groups:0, archive:0 } } ];
    const { ctx, page, errs } = await mk(base({ tasks:[ { id:11, text:'current', checked:false, priority:'none', color:null, groupId:null, order:0, pinned:false, note:'', deadline:null, repeat:'none', cycleChecked:false, nextReset:null, subtasks:[], subtasksOpen:false } ] }), { backups });
    await page.evaluate(()=>openBackupModal()); await page.waitForTimeout(200);
    rec('backup list rendered', await page.locator(`[data-act="restoreBackup"][data-ts="${NOW-60000}"]`).count() === 1);
    const hit = await clickSel(page, `[data-act="restoreBackup"][data-ts="${NOW-60000}"]`); await page.waitForTimeout(250);
    const r = await v4(page);
    rec('restoreBackup → snapshot state loaded', hit && r.tasks.some(t=>t.id===77) && !r.tasks.some(t=>t.id===11),
        `ids=${r.tasks.map(t=>t.id).join(',')}`);
    allErrs.push(...errs); await ctx.close();
  }

  // ── tag chip → filterByTag (search set) ──
  {
    const { ctx, page, errs } = await mk(base({ tasks:[ { id:11, text:'do *work now', checked:false, priority:'none', color:null, groupId:null, order:0, pinned:false, note:'', deadline:null, repeat:'none', cycleChecked:false, nextReset:null, subtasks:[], subtasksOpen:false } ] }));
    await page.evaluate(()=>{ try{ renderTagCloud(); }catch(e){} }); await page.waitForTimeout(150);
    rec('tag chip rendered', await page.locator('.tag-chip[data-tag="*work"]').count() === 1);
    const hit = await clickSel(page, '.tag-chip[data-tag="*work"]'); await page.waitForTimeout(200);
    const sq = await page.evaluate(()=>localStorage.getItem('searchQuery'));
    rec('tag chip click → search filter set', hit && sq === '*work', `searchQuery=${sq}`);

    // hashtag-in-note markup carries the same data-act/data-tag payload
    const linked = await page.evaluate(()=>highlightHashtags('see *urgent today'));
    rec('note hashtag → data-act markup', /data-act="filterByTag"/.test(linked) && /data-tag="\*urgent"/.test(linked), linked.slice(0,120));
    allErrs.push(...errs); await ctx.close();
  }

  // ── quick-add typeahead: accept + hover ──
  {
    const { ctx, page, errs } = await mk(base());
    await page.click('#input-box');
    await page.type('#input-box', '!'); await page.waitForTimeout(180);
    rec('quick-add menu opened on "!"', await page.locator('.qa-item[data-act="_qaAccept"]').count() >= 3);

    // hover the 3rd option → it becomes active (ACT_OVER → _qaHover)
    await page.hover('.qa-item[data-idx="2"]'); await page.waitForTimeout(120);
    rec('hover → _qaHover marks active', await page.locator('.qa-item[data-idx="2"].active').count() === 1);

    // click first option → _qaAccept inserts its token into the input
    const hit = await clickSel(page, '.qa-item[data-idx="0"]'); await page.waitForTimeout(150);
    const val = await page.evaluate(()=>document.getElementById('input-box').value);
    rec('click → _qaAccept inserts token', hit && val.trim() === '!high', `val="${val}"`);
    allErrs.push(...errs); await ctx.close();
  }

  rec('no pageerror', allErrs.length === 0, allErrs.join(' | '));

  await browser.close(); srv.close();
  const fails = results.filter(r=>!r.pass);
  console.log(`\n7c-SLICE3d SUMMARY  PASS ${results.length-fails.length}/${results.length}`);
  process.exit(fails.length?1:0);
})().catch(e=>{ console.error('CRASH',e); process.exit(2); });
