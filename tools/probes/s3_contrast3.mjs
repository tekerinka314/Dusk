// W2-2 (V2-B5-01 + V2-B5-12) — contrast re-measure, OPACITY-AWARE.
// The 2026-07 audit probe (s3_contrast.mjs) read getComputedStyle().color only,
// which ignores element `opacity` — .dl-absolute paints at opacity .8, so the
// real ink is dimmer than the token. Here the effective foreground is composited
// over the sampled backdrop with the cumulative opacity of the element chain.
import { serve, launch, openApp, ensureShots } from './lib.mjs';
import { richSeed } from './seed.mjs';
import zlib from 'zlib'; import fs from 'fs'; import path from 'path';

const DIR = ensureShots('s3');
const DESK = { width: 2560, height: 1440, deviceScaleFactor: 1, isMobile: false, hasTouch: false, userAgent: undefined };

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
const pixelAt=(png,x,y)=>{const i=y*png.rb+x*png.bpp;return [png.out[i],png.out[i+1],png.out[i+2]];};
const relLum=([r,g,b])=>{const f=v=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4);};return 0.2126*f(r)+0.7152*f(g)+0.0722*f(b);};
const ratio=(fg,bg)=>{const a=Math.max(relLum(fg),relLum(bg)),b=Math.min(relLum(fg),relLum(bg));return (a+0.05)/(b+0.05);};
const parseRGB=s=>{const m=s.match(/rgba?\(([^)]+)\)/);if(!m)return null;const p=m[1].split(',').map(x=>parseFloat(x));return [p[0],p[1],p[2],p[3]===undefined?1:p[3]];};
const over=(fg,alpha,bg)=>fg.map((v,i)=>v*alpha+bg[i]*(1-alpha));

const { srv, port } = await serve();
const browser = await launch();
const results = [];

async function measure(p, sel, desc, page='main') {
  const el = typeof sel==='string' ? await p.$(sel) : sel;
  if (!el) { results.push({ desc, page, err:'NOT FOUND' }); return; }
  const info = await el.evaluate(node=>{
    const cs=getComputedStyle(node); const r=node.getBoundingClientRect();
    // cumulative opacity up the ancestor chain (each layer dims the painted ink)
    let op=1, n=node;
    while (n && n.nodeType===1) { op *= parseFloat(getComputedStyle(n).opacity||'1'); n=n.parentElement; }
    return { color:cs.color, opacity:op, fontSize:cs.fontSize, fontWeight:cs.fontWeight,
             x:r.x, y:r.y, w:r.width, h:r.height, txt:(node.textContent||'').trim().slice(0,24) };
  });
  if (info.w<1||info.h<1){ results.push({ desc, page, err:'zero-size' }); return; }
  const fg = parseRGB(info.color); if(!fg){ results.push({desc,page,err:'no-color'}); return; }
  await el.evaluate(node=>{ node.__oc=node.style.color; node.__os=node.style.textShadow; node.__of=node.style.webkitTextFillColor;
    node.style.color='transparent'; node.style.textShadow='none'; node.style.webkitTextFillColor='transparent'; });
  const cx=Math.min(2559,Math.round(info.x+info.w/2)), cy=Math.min(1439,Math.round(info.y+info.h/2));
  const clipW=Math.min(6, Math.max(2,Math.floor(info.w))), clipH=Math.min(6,Math.max(2,Math.floor(info.h)));
  const buf = await p.screenshot({ clip:{ x:Math.max(0,cx-2), y:Math.max(0,cy-2), width:clipW, height:clipH } });
  await el.evaluate(node=>{ node.style.color=node.__oc||''; node.style.textShadow=node.__os||''; node.style.webkitTextFillColor=node.__of||''; });
  let bg;
  try { const png=decodePNG(buf); bg=pixelAt(png, Math.floor(png.w/2), Math.floor(png.h/2)); }
  catch(e){ results.push({desc,page,err:'decode:'+e.message}); return; }
  const alpha = fg[3] * info.opacity;                 // token alpha × element opacity
  const eff = over([fg[0],fg[1],fg[2]], alpha, bg);
  const large = parseFloat(info.fontSize)>=24 || (parseFloat(info.fontSize)>=18.66 && parseInt(info.fontWeight)>=700);
  const need = large?3.0:4.5;
  const rawR = ratio([fg[0],fg[1],fg[2]], bg), effR = ratio(eff, bg);
  results.push({ desc, page, txt:info.txt, fs:info.fontSize, fw:info.fontWeight, op:+alpha.toFixed(2),
    fg:`rgb(${fg[0]},${fg[1]},${fg[2]})`, bg:`rgb(${bg[0]},${bg[1]},${bg[2]})`,
    raw:+rawR.toFixed(2), ratio:+effR.toFixed(2), need, pass: effR>=need });
}

// seed covering EVERY deadline status: over / critical / urgent / warn / ok / live
const D = (off) => { const d = new Date(); d.setDate(d.getDate() + off); return d.toISOString().slice(0, 10); };
const HHMM = (offMin) => { const d = new Date(Date.now() + offMin*60000); return String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0'); };
function seedDL() {
  const now = Date.now();
  const t = (id, text, deadline) => ({ id, uid:'u'+id, text, checked:false, priority:'none', groupId:null,
    deadline, note:'', noteOpen:false, order:id, repeat:'none', cycleChecked:false, nextReset:null,
    subtasks:[], subtasksOpen:false, subNotesAlwaysOpen:false, pinned:false, color:null, createdAt:now, updatedAt:now });
  return { tasks: [
      t(1, 'просрочено',  { mode:'date', value: D(-1) }),
      t(2, 'критично',    { mode:'date', value: D(0)  }),
      t(3, 'срочно',      { mode:'date', value: D(1)  }),
      t(4, 'скоро',       { mode:'date', value: D(4)  }),
      t(5, 'спокойно',    { mode:'date', value: D(30) }),
      t(6, 'идёт сейчас', { mode:'time', value: HHMM(-10) }),
    ], groups: [], archive: [], notes: [], notesArchive: [], tombstones: [], templates: [],
    nextId: 20, nextGroupId: 1, nextSubId: 1, sortMode: 'manual', sortModeOverrides: {}, subAnyMode: false };
}

{
  const { page: p } = await openApp(browser, { device: DESK, seed: seedDL(), port });
  await p.waitForTimeout(700);
  // deadline chips — walk every rendered chip and label by its status class
  const chips = await p.$$('.deadline-tag');
  for (const c of chips) {
    const cls = await c.evaluate(n=>n.className.replace('meta-tag deadline-tag','').trim() || 'ok');
    const abs = await c.$('.dl-absolute'); if (abs) await measure(p, abs, `deadline [${cls}] .dl-absolute`);
    const cd  = await c.$('.dl-countdown'); if (cd) await measure(p, cd, `deadline [${cls}] .dl-countdown`);
  }
  await measure(p, '.task-item .task-text', 'task title (ref)');
  await measure(p, '.btn-note-toggle span', 'meta label «заметка» (muted)');
  await measure(p, '.btn-subtask-toggle span', 'meta label «подпункты» (muted)');
  {
    const inp = await p.$('#input-box');
    if (inp) {
      const ph = await inp.evaluate(n=>getComputedStyle(n,'::placeholder').color);
      const r = await inp.boundingBox();
      const buf = await p.screenshot({ clip:{ x:Math.round(r.x+20), y:Math.round(r.y+r.height/2-1), width:4, height:4 } });
      const png=decodePNG(buf); const bg=pixelAt(png,2,2); const fg=parseRGB(ph);
      const eff=over([fg[0],fg[1],fg[2]], fg[3], bg); const rr=ratio(eff,bg);
      results.push({ desc:'input placeholder (muted)', page:'main', op:fg[3], fg:`rgb(${fg[0]},${fg[1]},${fg[2]})`,
        bg:`rgb(${bg[0]},${bg[1]},${bg[2]})`, raw:+ratio([fg[0],fg[1],fg[2]],bg).toFixed(2), ratio:+rr.toFixed(2), need:4.5, pass:rr>=4.5 });
    }
  }
  await p.click('#input-box'); await p.waitForTimeout(250);
  await measure(p, '#qa-syntax-hint span', 'quick-add syntax hint (muted)');
  await p.keyboard.press('Escape');
  // subtask deadline pill (open a task with subtasks)
  const subPill = await p.$('.sub-dl-pill');
  if (subPill) await measure(p, subPill, 'subtask deadline pill');
}
// EMPTY state caption
{
  const empty = { tasks: [], groups: [], archive: [], notes: [], notesArchive: [], tombstones: [], templates: [], nextId:1, nextGroupId:1, nextSubId:1, sortMode:'manual', sortModeOverrides:{}, subAnyMode:false };
  const { page: p } = await openApp(browser, { device: DESK, seed: empty, port });
  await p.waitForTimeout(500);
  await measure(p, '.empty-state, .empty-hint, .empty-caption, #task-list .empty', 'empty-state caption (muted)', 'empty');
}
// QUARANTINE
{
  const seed = richSeed();
  seed.syncJournal = [
    { uid:'jq1', kind:'field', recType:'task', recUid:'u1', field:'text', loser:'Проигравшая правка', winner:'Победа', reason:'clash', createdAt:Date.now()-60000, resolved:false },
  ];
  const { page: p } = await openApp(browser, { device: DESK, seed, port });
  await p.waitForTimeout(400);
  await p.evaluate(()=>globalThis.openQuarantine&&openQuarantine()); await p.waitForTimeout(600);
  await measure(p, '.sync-quar-desc', 'quarantine explainer (muted)', 'sync');
  await measure(p, '.sync-quar-loser', 'quarantine loser preview (muted)', 'sync');
}

fs.writeFileSync(path.join(DIR,'_contrast3.json'), JSON.stringify(results,null,2));
console.log('\n=== CONTRAST (effective ink incl. opacity, vs sampled backdrop) ===');
for (const r of results) {
  if (r.err) { console.log(`  ?  ${r.desc} [${r.page}] — ${r.err}`); continue; }
  console.log(`${r.pass?'PASS':'FAIL'} eff=${r.ratio}:1 raw=${r.raw} (need ${r.need}) op=${r.op} — ${r.desc} fs=${r.fs} fg=${r.fg} bg=${r.bg} "${r.txt||''}"`);
}
const fails = results.filter(r=>r.pass===false).length;
console.log(`\nFAILS: ${fails}`);
await browser.close(); srv.close();
