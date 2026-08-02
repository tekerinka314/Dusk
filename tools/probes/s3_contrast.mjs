// S3/B5 §3.4 — WCAG contrast measurements. Ground-truth backdrop by sampling the
// rendered pixel (screenshot → PNG decode) behind each text element, PLUS the
// getComputedStyle color. Reports exact ratios in a table.
import { serve, launch, openApp, ensureShots } from './lib.mjs';
import { richSeed } from './seed.mjs';
import zlib from 'zlib'; import fs from 'fs'; import path from 'path';

const DIR = ensureShots('s3');
const DESK = { width: 2560, height: 1440, deviceScaleFactor: 1, isMobile: false, hasTouch: false, userAgent: undefined };

// ---- PNG decode (RGB/RGBA, non-interlaced) + unfilter ----
function decodePNG(buf) {
  let p = 8; let w=0,h=0,ct=0,bd=0; const idat=[];
  while (p < buf.length) {
    const len = buf.readUInt32BE(p); const type = buf.toString('ascii', p+4, p+8); const data = buf.slice(p+8, p+8+len);
    if (type==='IHDR'){ w=data.readUInt32BE(0); h=data.readUInt32BE(4); bd=data[8]; ct=data[9]; }
    else if (type==='IDAT') idat.push(data);
    else if (type==='IEND') break;
    p += 12+len;
  }
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const bpp = ct===6?4 : ct===2?3 : ct===0?1:4;
  const rb = w*bpp; const out = Buffer.alloc(h*rb);
  const paeth=(a,b,c)=>{const pp=a+b-c,pa=Math.abs(pp-a),pb=Math.abs(pp-b),pc=Math.abs(pp-c);return pa<=pb&&pa<=pc?a:pb<=pc?b:c;};
  let sp=0;
  for (let y=0;y<h;y++){
    const ft=raw[sp++];
    for (let x=0;x<rb;x++){
      const v=raw[sp++]; const a=x>=bpp?out[y*rb+x-bpp]:0; const b=y>0?out[(y-1)*rb+x]:0; const c=(x>=bpp&&y>0)?out[(y-1)*rb+x-bpp]:0;
      let r; switch(ft){case 0:r=v;break;case 1:r=v+a;break;case 2:r=v+b;break;case 3:r=v+((a+b)>>1);break;case 4:r=v+paeth(a,b,c);break;default:r=v;}
      out[y*rb+x]=r&255;
    }
  }
  return { w,h,bpp,rb,out };
}
function pixelAt(png, x, y){ const i=y*png.rb + x*png.bpp; return [png.out[i],png.out[i+1],png.out[i+2]]; }

function relLum([r,g,b]){ const f=v=>{v/=255; return v<=0.03928? v/12.92 : Math.pow((v+0.055)/1.055,2.4);}; return 0.2126*f(r)+0.7152*f(g)+0.0722*f(b); }
function ratio(fg,bg){ const L1=relLum(fg),L2=relLum(bg); const a=Math.max(L1,L2),b=Math.min(L1,L2); return (a+0.05)/(b+0.05); }
function parseRGB(s){ const m=s.match(/rgba?\(([^)]+)\)/); if(!m) return null; const p=m[1].split(',').map(x=>parseFloat(x)); return [p[0],p[1],p[2], p[3]===undefined?1:p[3]]; }

const { srv, port } = await serve();
const browser = await launch();
const results = [];

// Sample the true backdrop pixel behind a text element: set its text transparent,
// screenshot a small clip at its center, read the middle pixel, restore.
async function measure(p, handleOrSel, desc, page='main') {
  const el = typeof handleOrSel==='string' ? await p.$(handleOrSel) : handleOrSel;
  if (!el) { results.push({ desc, page, err:'NOT FOUND' }); return; }
  const info = await el.evaluate(node=>{
    const cs=getComputedStyle(node); const r=node.getBoundingClientRect();
    return { color:cs.color, fontSize:cs.fontSize, fontWeight:cs.fontWeight, x:r.x, y:r.y, w:r.width, h:r.height, txt:(node.textContent||'').trim().slice(0,24) };
  });
  if (info.w<1||info.h<1){ results.push({ desc, page, err:'zero-size' }); return; }
  const fg = parseRGB(info.color); if(!fg){ results.push({desc,page,err:'no-color'}); return; }
  // hide glyphs to expose backdrop
  await el.evaluate(node=>{ node.__oc=node.style.color; node.__os=node.style.textShadow; node.__of=node.style.webkitTextFillColor; node.style.color='transparent'; node.style.textShadow='none'; node.style.webkitTextFillColor='transparent'; });
  const cx=Math.min(2559,Math.round(info.x+info.w/2)), cy=Math.min(1439,Math.round(info.y+info.h/2));
  const clipW=Math.min(6, Math.max(2,Math.floor(info.w))), clipH=Math.min(6,Math.max(2,Math.floor(info.h)));
  const buf = await p.screenshot({ clip:{ x:Math.max(0,cx-2), y:Math.max(0,cy-2), width:clipW, height:clipH } });
  await el.evaluate(node=>{ node.style.color=node.__oc||''; node.style.textShadow=node.__os||''; node.style.webkitTextFillColor=node.__of||''; });
  let bg;
  try { const png=decodePNG(buf); bg=pixelAt(png, Math.floor(png.w/2), Math.floor(png.h/2)); }
  catch(e){ results.push({desc,page,err:'decode:'+e.message}); return; }
  const large = parseFloat(info.fontSize)>=24 || (parseFloat(info.fontSize)>=18.66 && parseInt(info.fontWeight)>=700);
  const rr = ratio([fg[0],fg[1],fg[2]], bg);
  const need = large?3.0:4.5;
  results.push({ desc, page, txt:info.txt, fs:info.fontSize, fw:info.fontWeight, fg:`rgb(${fg[0]},${fg[1]},${fg[2]})`, bg:`rgb(${bg[0]},${bg[1]},${bg[2]})`, ratio:+rr.toFixed(2), need, pass: rr>=need, large });
}

// ============ MAIN PAGE ============
{
  const { page: p } = await openApp(browser, { device: DESK, seed: richSeed(), port });
  await p.waitForTimeout(600);
  // task title (normal), pinned high task 1
  await measure(p, '.task-item[data-id="1"] .task-text', 'task title (normal)');
  // deadline chip states: task1 soon(date+2), task2 overdue(-1)
  await measure(p, '.task-item[data-id="1"] .dl-absolute', 'deadline chip — soon/normal');
  await measure(p, '.task-item[data-id="2"] .dl-absolute', 'deadline chip — overdue (red)');
  await measure(p, '.task-item[data-id="3"] .dl-absolute', 'deadline chip — time/daily');
  // meta chip labels
  await measure(p, '.task-item[data-id="1"] .btn-note-toggle span', 'meta label «заметка»');
  await measure(p, '.task-item[data-id="1"] .btn-subtask-toggle span', 'meta label «подпункты»');
  // checked subtask text (task1 sub 1 checked)
  const checkedSub = await p.$('.task-item[data-id="1"] .subtask-item.checked .sub-text, .task-item[data-id="1"] .subtask.checked .sub-text, .task-item[data-id="1"] li.checked .sub-text');
  await measure(p, checkedSub || '.task-item[data-id="1"] .sub-text', 'checked-subtask text');
  // active subtask text for reference
  await measure(p, '.task-item[data-id="9"] .sub-text', 'active-subtask text (ref)');
  // group header title
  await measure(p, '.group-title', 'group header title');
  // placeholder — measure input placeholder color vs input bg pixel
  {
    const inp = await p.$('#input-box');
    if (inp) {
      const ph = await inp.evaluate(n=>{ const cs=getComputedStyle(n,'::placeholder'); return cs.color; });
      const r = await inp.boundingBox();
      const buf = await p.screenshot({ clip:{ x:Math.round(r.x+20), y:Math.round(r.y+r.height/2-1), width:4, height:4 } });
      const png=decodePNG(buf); const bg=pixelAt(png,2,2); const fg=parseRGB(ph);
      const rr=ratio([fg[0],fg[1],fg[2]],bg);
      results.push({ desc:'input placeholder «Новая задача...»', page:'main', txt:'', fs:'?', fw:'?', fg:`rgb(${fg[0]},${fg[1]},${fg[2]})`, bg:`rgb(${bg[0]},${bg[1]},${bg[2]})`, ratio:+rr.toFixed(2), need:4.5, pass:rr>=4.5 });
    }
  }
  // hint bar — force show
  await p.evaluate(()=>{ const h=document.getElementById('shortcuts-hint'); if(h) h.style.display='block'; });
  await p.waitForTimeout(200);
  await measure(p, '#shortcuts-hint kbd', 'hint-bar kbd');
  await measure(p, '#shortcuts-hint', 'hint-bar text (node)');
  // qa syntax hint
  await p.click('#input-box'); await p.waitForTimeout(200);
  await measure(p, '#qa-syntax-hint span', 'quick-add syntax hint');
  await p.evaluate(()=>{ const h=document.getElementById('qa-syntax-hint'); h&&h.classList.remove('show'); });
  await p.keyboard.press('Escape');
}
// ============ ARCHIVE ============
{
  const { page: p } = await openApp(browser, { device: DESK, seed: richSeed(), port });
  await p.evaluate(()=>globalThis.showPage&&showPage('archive')); await p.waitForTimeout(700);
  await measure(p, '.archive-item .task-text, .archive-item .archive-title, .archive-item .arch-text', 'archived row title', 'archive');
  await measure(p, '.archive-month-header, .archive-month-title, .archive-month', 'archive month header', 'archive');
}
// ============ EMPTY ============
{
  const empty = { tasks: [], groups: [], archive: [], notes: [], notesArchive: [], tombstones: [], templates: [], nextId:1, nextGroupId:1, nextSubId:1, sortMode:'manual', sortModeOverrides:{}, subAnyMode:false };
  const { page: p } = await openApp(browser, { device: DESK, seed: empty, port });
  await p.waitForTimeout(400);
  await measure(p, '.empty-state, .empty-hint, .empty-caption, #task-list .empty', 'empty-state caption', 'empty');
}
// ============ GRIMUAR body + red callout ============
{
  const { page: p } = await openApp(browser, { device: DESK, seed: richSeed(), port, page:'notes' });
  await p.waitForTimeout(400);
  await p.evaluate(()=>globalThis.grimOpen&&grimOpen('n1')); await p.waitForTimeout(700);
  await measure(p, '.grim-body p', 'Grimuar body text (desktop)', 'notes');
  await p.evaluate(()=>globalThis.grimClose&&grimClose()); await p.waitForTimeout(300);
  await p.evaluate(()=>globalThis.grimOpen&&grimOpen('n5')); await p.waitForTimeout(700);
  await measure(p, '.grim-callout p, .grim-callout', 'red/warn callout body', 'notes');
}
// ============ SYNC panel + quarantine ============
{
  const seed = richSeed();
  seed.syncJournal = [
    { uid:'jq1', kind:'field', recType:'task', recUid:'u1', field:'text', loser:'Проигравшая правка', winner:'Победа', reason:'clash', createdAt:Date.now()-60000, resolved:false },
  ];
  const { page: p } = await openApp(browser, { device: DESK, seed, port });
  await p.waitForTimeout(400);
  const eye = await p.$('#sync-glyph-btn'); if(eye){ await eye.click(); await p.waitForTimeout(600); }
  await measure(p, '.sync-panel .sync-row, .sync-panel button, .sync-panel .sync-item', 'sync panel item', 'sync');
  await p.evaluate(()=>globalThis.openQuarantine&&openQuarantine()); await p.waitForTimeout(600);
  await measure(p, '.sync-quar-desc', 'quarantine explainer', 'sync');
  await measure(p, '.sync-quar-loser', 'quarantine loser preview', 'sync');
}

fs.writeFileSync(path.join(DIR,'_contrast.json'), JSON.stringify(results,null,2));
console.log('\n=== CONTRAST (fg vs sampled backdrop) ===');
for (const r of results) {
  if (r.err) { console.log(`✗ ${r.desc} [${r.page}] — ${r.err}`); continue; }
  console.log(`${r.pass?'PASS':'FAIL'} ${r.ratio}:1 (need ${r.need}) — ${r.desc} [${r.page}] fs=${r.fs} fw=${r.fw} fg=${r.fg} bg=${r.bg} "${r.txt}"`);
}
await browser.close(); srv.close();
