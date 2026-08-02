// Regression: a render() that tears down a FOCUSED inline-edit input fires a
// synchronous blur handler mid-reconcile. Before the fix _reconcile threw
// "node to be removed is no longer a child…". Now it must survive.
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

(async()=>{
  await new Promise(r=>srv.listen(0,r));
  const base=`http://localhost:${srv.address().port}`;
  const browser=await chromium.launch({executablePath:CHROME,headless:!process.argv.includes('--show')});
  const page=await (await browser.newContext({viewport:{width:1100,height:850}})).newPage();
  const errs=[]; page.on('pageerror',e=>errs.push(e.message));
  await page.goto(`${base}/index.html`); await page.waitForTimeout(600);

  await page.evaluate(()=>{ for(let i=0;i<4;i++) state.tasks.push({id:state.nextId++,uid:'U'+i,createdAt:nowTs(),updatedAt:nowTs(),text:'Задача '+i,checked:false,priority:'none',groupId:null,deadline:null,note:'',noteOpen:false,order:i,repeat:'none',cycleChecked:false,nextReset:null,subtasks:[],subtasksOpen:false}); saveState(); render(); });

  // Faithful repro of the crash: a focusout handler that calls render() (like the
  // inline-edit commit), and focus on a row element that reconcile will tear down.
  const started = await page.evaluate(()=>{
    window.__reentr = 0;
    document.addEventListener('focusout', () => { window.__reentr++; render(); });   // commit-on-blur → re-entrant render
    const btn = document.querySelector('.task-item [data-act], .task-item button, .task-text[data-id]');
    if (!btn) return false;
    if (!btn.tabIndex && btn.tabIndex !== 0) btn.tabIndex = 0;
    btn.focus();
    return document.activeElement === btn || !!document.activeElement;
  });
  rec('row element focused + focusout→render wired', started, started);

  // force a full render while that node is focused → reconcile removes it → focusout
  // fires synchronously → handler calls render() re-entrantly. Must NOT crash/hang.
  await page.evaluate(()=>{
    state.tasks.forEach(t => { t.text = t.text + ' ✦'; t.updatedAt = nowTs(); });
    render();
    render();
  });
  await page.waitForTimeout(200);
  const reentr = await page.evaluate(()=>window.__reentr);
  rec('re-entrant render actually exercised', reentr > 0, reentr);
  rec('no removeChild crash on render during focused edit', !errs.some(e=>/removeChild|no longer a child/i.test(e)), errs.join(' | '));
  rec('no pageerror at all', errs.length===0, errs.join(' | '));
  // list still intact
  const count = await page.evaluate(()=>document.querySelectorAll('.task-item').length);
  rec('list still rendered', count>=4, count);

  await browser.close(); srv.close();
  console.log(`\nreconcile test: ${pass} passed, ${fail} failed  (total ${pass+fail})`);
  process.exit(fail?1:0);
})().catch(e=>{console.error('CRASH',e);process.exit(2);});
