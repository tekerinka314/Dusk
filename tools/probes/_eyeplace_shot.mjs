// Screenshot the real app to verify the floating sync-eye at bottom-LEFT (52px,
// FAB chrome) balances the pen-sound FAB at bottom-right. Captures offline + ok states.
import http from 'http';
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright-core');

const ROOT = 'D:/VSCode projects/DUSK_v2.0';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const OUT = 'C:/Users/serge/AppData/Local/Temp/claude/D--VSCode-projects-DUSK-v2-0/0a1e223e-b6d1-498e-a433-745713f8b509/scratchpad';
const MIME = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.json':'application/json', '.svg':'image/svg+xml', '.jpg':'image/jpeg' };

const srv = http.createServer((q,s)=>{
  let u = decodeURIComponent(q.url.split('?')[0]);
  if (u === '/') u = '/index.html';
  fs.readFile(path.join(ROOT,u),(e,d)=>{ if(e){s.writeHead(404);s.end('nf');return;}
    s.writeHead(200,{'Content-Type':MIME[path.extname(u)]||'application/octet-stream'}); s.end(d); });
});

(async()=>{
  await new Promise(r=>srv.listen(0,r));
  const port = srv.address().port; const base = `http://localhost:${port}`;
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  const page = await (await browser.newContext({ viewport:{width:1200,height:900} })).newPage();
  await page.goto(`${base}/index.html`);
  await page.waitForTimeout(800);
  // seed a few tasks + turn the pen FAB on so the right corner shows its sibling
  await page.evaluate(()=>{
    for (let i=0;i<3;i++) state.tasks.push({ id: state.nextId++, uid:'X'+i, createdAt: nowTs(), updatedAt: nowTs(),
      text:'Задача '+(i+1), checked:false, priority:'none', groupId:null, deadline:null, note:'', noteOpen:false,
      order:i, repeat:'none', cycleChecked:false, nextReset:null, subtasks:[], subtasksOpen:false });
    saveState(); render();
    var pb = document.getElementById('btn-pen-sound'); if (pb){ pb.classList.remove('off'); pb.classList.add('on'); }
  });
  await page.waitForTimeout(400);

  // offline state (default)
  await page.screenshot({ path: OUT + '/eye_offline_full.png' });
  await page.evaluate(()=>{ const b=document.getElementById('sync-glyph-btn'); b.scrollIntoView(); });
  await page.locator('#sync-glyph-btn').screenshot({ path: OUT + '/eye_offline_crop.png' });

  // ok state (bright eye)
  await page.evaluate(()=>{ document.getElementById('sync-glyph-btn').setAttribute('data-sync','ok'); });
  await page.waitForTimeout(500);
  await page.locator('#sync-glyph-btn').screenshot({ path: OUT + '/eye_ok_crop.png' });

  // syncing state
  await page.evaluate(()=>{ document.getElementById('sync-glyph-btn').setAttribute('data-sync','syncing'); });
  await page.waitForTimeout(400);
  await page.locator('#sync-glyph-btn').screenshot({ path: OUT + '/eye_syncing_crop.png' });

  // full page in ok to see both corners
  await page.evaluate(()=>{ document.getElementById('sync-glyph-btn').setAttribute('data-sync','ok'); });
  await page.screenshot({ path: OUT + '/eye_ok_full.png' });

  const box = await page.locator('#sync-glyph-btn').boundingBox();
  console.log('eye box', JSON.stringify(box));
  await browser.close(); srv.close();
})().catch(e=>{ console.error('CRASH',e); process.exit(2); });
