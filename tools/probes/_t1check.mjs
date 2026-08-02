import http from 'http';
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright-core');

const ROOT = 'D:/VSCode projects/DUSK_1_86';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const MIME = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.json':'application/json', '.svg':'image/svg+xml', '.jpg':'image/jpeg' };
const srv = http.createServer((q,s)=>{ let u=decodeURIComponent(q.url.split('?')[0]); if(u==='/')u='/index.html';
  fs.readFile(path.join(ROOT,u),(e,d)=>{ if(e){s.writeHead(404);s.end('nf');return;} s.writeHead(200,{'Content-Type':MIME[path.extname(u)]||'application/octet-stream'}); s.end(d); }); });

// One task → toolbar (and the export button) becomes visible.
const seed = { tasks:[{id:1,text:'Проверка Транша 1',order:0}], groups:[], archive:[], notes:[], notesArchive:[], templates:[], noteTemplates:[], nextId:2, nextGroupId:1, nextSubId:1, sortMode:'priority', sortModeOverrides:{} };
const results=[]; const rec=(n,p,d)=>{results.push({n,p,d});console.log(`${p?'PASS':'FAIL'}  ${n}  ${d||''}`);};

(async()=>{
  await new Promise(r=>srv.listen(0,r)); const port=srv.address().port;
  const browser = await chromium.launch({ executablePath:CHROME, headless:true, args:['--allow-file-access-from-files'] });

  async function boot(targetUrl){
    const page = await browser.newPage({ viewport:{width:1100,height:900} });
    const errs=[]; page.on('pageerror',e=>errs.push(e.message));
    await page.addInitScript(([st])=>{ localStorage.setItem('duskState_v3',JSON.stringify(st)); localStorage.setItem('currentPage','main'); }, [seed]);
    await page.goto(targetUrl); await page.waitForTimeout(700);
    return { page, errs };
  }

  // ── F-A: http:// boot ──────────────────────────────────────────────
  { const { page, errs } = await boot(`http://localhost:${port}/index.html`);
    const s = await page.evaluate(()=>({
      bodyKids: document.body.children.length,
      initRan: typeof render==='function' && typeof openExportMenu==='function',
      toolbarShown: (()=>{ const t=document.getElementById('toolbar'); return !!t && getComputedStyle(t).display!=='none'; })(),
      tasks: document.querySelectorAll('#list-wrapper .task-item').length,
      hasExportBtn: !!document.getElementById('btn-export'),
      penAsset: typeof window.PEN_ASSET,
    }));
    rec('F-A http — app booted (init ran, DOM populated)', s.bodyKids>0 && s.initRan, JSON.stringify(s));
    rec('F-A http — toolbar + export button visible', s.toolbarShown && s.hasExportBtn, `toolbar=${s.toolbarShown} btn=${s.hasExportBtn} tasks=${s.tasks}`);
    rec('F-A http — pen-asset.js loaded before app.js', s.penAsset==='string', s.penAsset);
    rec('F-A http — no pageerror', errs.length===0, errs.join(' | '));
    await page.screenshot({ path:'D:/tmp/pw/_t1_main.png' });

    // ── F-B: export popover ──────────────────────────────────────────
    await page.click('#btn-export');
    await page.waitForTimeout(150);
    const m = await page.evaluate(()=>{
      const menu = document.querySelector('.snooze-menu.export-menu');
      if(!menu) return { menu:false };
      const items=[...menu.querySelectorAll('button[role="menuitem"]')];
      return { menu:true, count:items.length, svgs: menu.querySelectorAll('svg').length,
               texts: items.map(b=>b.textContent.trim()) };
    });
    rec('F-B — export popover opened', m.menu===true, JSON.stringify(m));
    rec('F-B — two scope items with glyphs', m.count===2 && m.svgs===2, `count=${m.count} svgs=${m.svgs}`);
    rec('F-B — items = «Только задачи» / «Всё»', !!m.texts && /Только задачи/.test(m.texts[0]||'') && /Всё/.test(m.texts[1]||''), JSON.stringify(m.texts));
    await page.screenshot({ path:'D:/tmp/pw/_t1_popover.png' });
    await page.close();
  }

  // ── F-A must not break offline file:// boot ────────────────────────
  { const fileUrl = 'file:///' + (ROOT + '/index.html').replace(/ /g,'%20');
    const { page, errs } = await boot(fileUrl);
    const s = await page.evaluate(()=>({ bodyKids:document.body.children.length, initRan:typeof render==='function',
      btn:!!document.getElementById('btn-export') }));
    rec('F-A file:// — app still boots offline', s.bodyKids>0 && s.initRan && s.btn, JSON.stringify(s));
    rec('F-A file:// — no pageerror', errs.length===0, errs.join(' | '));
    await page.close();
  }

  await browser.close(); srv.close();
  const fails=results.filter(r=>!r.p);
  console.log(`\nТРАНШ-1 SUMMARY  PASS ${results.length-fails.length}/${results.length}`);
  process.exit(fails.length?1:0);
})().catch(e=>{ console.error('CRASH',e); process.exit(2); });
