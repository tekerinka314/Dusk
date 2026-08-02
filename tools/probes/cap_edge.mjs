import { serve, launch, openApp, ensureShots } from './lib.mjs';
import { richSeed } from './seed.mjs';

const ALL_MODALS = [
  ['note','openNoteModal(12)'],['prio','openPrioModal(1)'],['color','openTaskColorModal(1)'],
  ['colorFilter','openColorFilterModal()'],['templates','openTemplatesModal()'],['backup','openBackupModal()'],
  ['group','showAddGroupModal()'],['renameGroup','openRenameGroupModal(10)'],
];

(async () => {
  ensureShots();
  const { srv, port } = await serve();
  const b = await launch();

  // (A) ALL modals in landscape — which clip actions off-screen (extends B1-06 scope)
  const land = { width: 915, height: 412, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 7) Mobile' };
  const clipRep = [];
  for (const [label, expr] of ALL_MODALS) {
    const { ctx, page: p } = await openApp(b, { device: land, page: 'main', seed: richSeed(), port });
    await p.waitForTimeout(200);
    try { await p.evaluate(expr); } catch (e) {}
    await p.waitForTimeout(350);
    const m = await p.evaluate(() => {
      const ov = [...document.querySelectorAll('.modal-overlay')].find(o => getComputedStyle(o).display !== 'none');
      const modal = ov ? ov.querySelector('.modal') : null; if (!modal) return null;
      const r = modal.getBoundingClientRect(); const acts = modal.querySelector('.modal-actions');
      const ar = acts ? acts.getBoundingClientRect() : null;
      return { h: Math.round(r.height), vpH: window.innerHeight, over: r.height > window.innerHeight, actReach: ar ? (ar.bottom <= window.innerHeight + 0.5 && ar.top >= 0) : 'n/a' };
    });
    clipRep.push(`${label}: h=${m?m.h:'-'} vpH=${m?m.vpH:'-'} over=${m?m.over:'-'} actionsReachable=${m?m.actReach:'-'}`);
    await ctx.close();
  }
  console.log('=== ALL MODALS @landscape 915x412 ===\n' + clipRep.join('\n'));

  // (B) long unbroken word / URL overflow (task + grim note) at small 360
  const seedLong = () => { const s = richSeed();
    s.tasks[0].text = 'Смотри https://example.com/очень_длинный_путь_совсем_без_пробелов_ааааааааааааааааааааа';
    s.notes[0].body = '<p>https://пример.рф/оченьдлинныйнеразрывныйтокенбезпробеловببббاааааааааaaaaaaaaaaaaaaaaaaaaaaaa</p>';
    return s; };
  for (const [dev, pg] of [['small','main'],['small','notes']]) {
    const { ctx, page: p } = await openApp(b, { device: dev, page: pg, seed: seedLong(), port });
    if (pg==='notes') { await p.waitForTimeout(200); try{ await p.evaluate(()=>grimOpen('n1')); }catch(e){} }
    await p.waitForTimeout(500);
    const o = await p.evaluate(() => { const cw=document.documentElement.clientWidth; return { sw: document.documentElement.scrollWidth, cw, pageOverflow: document.documentElement.scrollWidth>cw }; });
    console.log(`LONGWORD ${pg}@small: scrollW=${o.sw} clientW=${o.cw} pageHOverflow=${o.pageOverflow}`);
    await ctx.close();
  }

  // (C) contrast: task-text vs its painted backdrop (over the bg image) — a11y
  {
    const { ctx, page: p } = await openApp(b, { device: 'pixel7', page: 'main', seed: richSeed(), port });
    await p.waitForTimeout(500);
    const c = await p.evaluate(() => {
      const lum = (rgb) => { const [r,g,b]=rgb.map(v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)}); return .2126*r+.7152*g+.0722*b; };
      const parse = (s)=>{ const m=s.match(/[\d.]+/g)||[]; return [+m[0]||0,+m[1]||0,+m[2]||0]; };
      const sample = (sel) => { const el=document.querySelector(sel); if(!el) return null; const cs=getComputedStyle(el); return { color: cs.color }; };
      const txt = sample('.task-text'); const muted = sample('.qa-hint, .task-meta, .group-count');
      // effective bg: body bg-color under the image is near-black #03010a → use that as worst case
      const bg=[3,1,10];
      const cr = (fg)=>{ const L1=lum(parse(fg))+.05, L2=lum(bg)+.05; return +(Math.max(L1,L2)/Math.min(L1,L2)).toFixed(2); };
      return { taskText: txt&&txt.color, taskContrastVsBlack: txt?cr(txt.color):null, muted: muted&&muted.color, mutedContrast: muted?cr(muted.color):null };
    });
    console.log('CONTRAST (vs near-black bg):', JSON.stringify(c));
    await ctx.close();
  }

  // (D) snooze menu at small (custom snooze input)
  {
    const { ctx, page: p } = await openApp(b, { device: 'small', page: 'main', seed: richSeed(), port });
    await p.addStyleTag({ content: '.task-actions{opacity:1!important}' });
    await p.waitForTimeout(400);
    const r = await p.evaluate(() => {
      const btn = document.querySelector('.btn-snooze'); if (!btn) return { noSnooze: true };
      btn.click(); return null;
    });
    await p.waitForTimeout(400);
    const m = await p.evaluate(() => { const el=document.querySelector('.snooze-menu, [class*="snooze"]'); if(!el) return {present:false}; const r=el.getBoundingClientRect(); return { present:true, right: Math.round(r.right), vw: window.innerWidth, overRight: r.right>window.innerWidth+1, items: el.querySelectorAll('button').length }; });
    console.log('SNOOZE@small:', JSON.stringify(m));
    await ctx.close();
  }

  await b.close(); srv.close();
})().catch(e => { console.error('CRASH', e); process.exit(2); });
