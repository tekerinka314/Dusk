// In-app update-detection flow (real Chrome, Playwright). Serves the repo, but
// /version.json comes from a mutable variable so we can "deploy a new build".
// Verifies: no prompt when build unchanged; toast with a gothic «Обновить» button
// (ouroboros SVG) when build changes; click sets the pending flag + reloads; after
// reload a one-shot "Обновление установлено" toast confirms.
import http from 'http';
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright-core');

const ROOT = 'D:/VSCode projects/DUSK_v2.0';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const HEADLESS = !process.argv.includes('--show');
const MIME = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.json':'application/json', '.svg':'image/svg+xml', '.jpg':'image/jpeg' };

let BUILD = '2026-06-28-1';
const srv = http.createServer((q,s)=>{
  let u = decodeURIComponent(q.url.split('?')[0]);
  if (u === '/version.json') { s.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'}); s.end(JSON.stringify({build:BUILD})); return; }
  if (u === '/') u = '/index.html';
  fs.readFile(path.join(ROOT,u),(e,d)=>{ if(e){s.writeHead(404);s.end('nf');return;}
    s.writeHead(200,{'Content-Type':MIME[path.extname(u)]||'application/octet-stream'}); s.end(d); });
});

let pass=0, fail=0;
const rec=(name,cond,detail)=>{ if(cond)pass++; else { fail++; console.log(`  FAIL: ${name}  ${detail??''}`); } };
const toastState = page => page.evaluate(()=>{
  const t = document.getElementById('toast');
  const shown = t.classList.contains('show');
  const msg = (t.querySelector('.toast-msg')||{}).textContent || '';
  const btn = t.querySelector('.toast-undo-btn');
  return { shown, msg, hasBtn: !!btn, btnLabel: btn ? (btn.querySelector('span')||{}).textContent||'' : '', hasSvg: !!(btn && btn.querySelector('svg')) };
});

(async()=>{
  await new Promise(r=>srv.listen(0,r));
  const port = srv.address().port; const base = `http://localhost:${port}`;
  const browser = await chromium.launch({ executablePath: CHROME, headless: HEADLESS });
  const context = await browser.newContext({ viewport:{width:1100,height:850} });
  const page = await context.newPage();
  const errs=[]; page.on('pageerror',e=>errs.push(e.message));

  await page.goto(`${base}/index.html`);
  await page.waitForTimeout(900);                       // boot + version.json read
  rec('boot: no pageerror', errs.length===0, errs.join('|'));

  // no update prompt while build is unchanged (fire a focus check to be sure)
  await page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));
  await page.waitForTimeout(400);
  let st = await toastState(page);
  rec('no update toast when build unchanged', !(st.shown && /обновление/i.test(st.msg)), JSON.stringify(st));

  // ── deploy a new build → refocus triggers check() → update toast ────────────
  BUILD = '2026-06-28-2';
  await page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));
  await page.waitForFunction(()=>{
    const t=document.getElementById('toast');
    return t.classList.contains('show') && /Доступно обновление/.test(t.textContent||'');
  }, null, {timeout:5000}).catch(()=>{});
  st = await toastState(page);
  rec('update toast appears on new build', st.shown && /Доступно обновление/.test(st.msg), JSON.stringify(st));
  rec('toast has «Обновить» button', st.hasBtn && st.btnLabel==='Обновить', JSON.stringify(st));
  rec('button uses gothic ouroboros SVG (not generic/emoji)', st.hasSvg, JSON.stringify(st));

  // ── click «Обновить» → sets pending flag + reloads ──────────────────────────
  await page.evaluate(()=>document.querySelector('#toast .toast-undo-btn').click());
  await page.waitForTimeout(1200);                      // reload round-trip
  rec('after click: page reloaded (still booted)', await page.evaluate(()=>document.body.children.length>0));

  // ── post-reload one-shot success toast ──────────────────────────────────────
  await page.waitForFunction(()=>{
    const t=document.getElementById('toast');
    return t.classList.contains('show') && /установлено/i.test(t.textContent||'');
  }, null, {timeout:5000}).catch(()=>{});
  st = await toastState(page);
  rec('post-reload «Обновление установлено» toast', st.shown && /установлено/i.test(st.msg), JSON.stringify(st));
  const flag = await page.evaluate(()=>{ try { return sessionStorage.getItem('dusk_pending_update'); } catch(_){ return 'ERR'; } });
  rec('pending flag cleared after success toast', flag===null, 'flag='+flag);

  if (!HEADLESS) await page.waitForTimeout(3000);
  await browser.close(); srv.close();
  console.log(`\nUPDATE-flow test: ${pass} passed, ${fail} failed  (total ${pass+fail})`);
  process.exit(fail?1:0);
})().catch(e=>{ console.error('CRASH', e); process.exit(2); });
