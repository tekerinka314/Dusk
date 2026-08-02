import http from 'http';
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright-core');
const ROOT = 'D:/VSCode projects/DUSK_1_86';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const MIME = { '.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.jpg':'image/jpeg' };
const srv = http.createServer((q,s)=>{ let u=decodeURIComponent(q.url.split('?')[0]); if(u==='/')u='/index.html';
  fs.readFile(path.join(ROOT,u),(e,d)=>{ if(e){s.writeHead(404);s.end('nf');return;} s.writeHead(200,{'Content-Type':MIME[path.extname(u)]||'application/octet-stream'}); s.end(d); }); });
const seed = { tasks:[{id:1,text:'Проверка Транша 1',order:0}], groups:[], archive:[], notes:[], notesArchive:[], nextId:2, nextGroupId:1, nextSubId:1, sortMode:'priority', sortModeOverrides:{} };
(async()=>{
  await new Promise(r=>srv.listen(0,r)); const port=srv.address().port;
  const browser = await chromium.launch({ executablePath:CHROME, headless:true });
  const page = await browser.newPage({ viewport:{width:1100,height:900}, deviceScaleFactor:2 });
  await page.addInitScript(([st])=>{ localStorage.setItem('duskState_v3',JSON.stringify(st)); localStorage.setItem('currentPage','main'); }, [seed]);
  await page.goto(`http://localhost:${port}/index.html`); await page.waitForTimeout(700);
  await page.click('#btn-export'); await page.waitForTimeout(150);
  const box = await page.evaluate(()=>{
    const b=document.getElementById('btn-export').getBoundingClientRect();
    const m=document.querySelector('.export-menu').getBoundingClientRect();
    const x=Math.min(b.left,m.left)-16, y=b.top-16, r=Math.max(b.right,m.right)+16, bot=m.bottom+16;
    return { x, y, w:r-x, h:bot-y };
  });
  await page.screenshot({ path:'D:/tmp/pw/_t1_pop_crop.png', clip:{ x:box.x, y:box.y, width:box.w, height:box.h } });
  await browser.close(); srv.close();
  console.log('crop done', JSON.stringify(box));
})().catch(e=>{ console.error('CRASH',e); process.exit(2); });
