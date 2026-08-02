import { serve, launch, openApp, ensureShots } from './lib.mjs';
import { richSeed } from './seed.mjs';

const SHOTS = 'D:/VSCode projects/DUSK_v2.0/audit-v2/shots';
const REVEAL = '.task-head{flex-wrap:wrap!important}.task-actions{flex-basis:100%!important;opacity:1!important}';

// page-side measurement helpers injected as a string
const MEASURE = `
function _m(el){
  if(!el) return {missing:true};
  const r=el.getBoundingClientRect();
  const vw=window.innerWidth, vh=window.innerHeight, de=document.documentElement;
  return {
    rect:{top:Math.round(r.top),right:Math.round(r.right),bottom:Math.round(r.bottom),left:Math.round(r.left),w:Math.round(r.width),h:Math.round(r.height)},
    vw,vh,
    clipR:Math.round(r.right-vw), clipB:Math.round(r.bottom-vh),
    clipL:Math.round(r.left), clipT:Math.round(r.top),
    pageOverflowX: de.scrollWidth-de.clientWidth
  };
}
function _items(root, sel){
  if(!root) return [];
  return [...root.querySelectorAll(sel)].map(e=>{
    const r=e.getBoundingClientRect();
    return {h:Math.round(r.height), w:Math.round(r.width), t:(e.textContent||'').trim().slice(0,24)};
  });
}
`;

async function run(){
  ensureShots();
  const { srv, port } = await serve();
  const b = await launch();
  const results = {};

  for(const device of ['pixel7','small']){
    // ---------- 1. SORT PICKER (toolbar) ----------
    {
      const { ctx, page:p } = await openApp(b,{device,page:'main',seed:richSeed(),port});
      await p.waitForTimeout(300);
      await p.addScriptTag({content:MEASURE});
      await p.locator('#btn-sort-mode').click();
      await p.waitForTimeout(300);
      const data = await p.evaluate(()=>{
        const list=document.querySelector('.task-sort-portal')||document.getElementById('task-sort-list');
        return { menu:_m(list), items:_items(list,'.dl-month-option'), open: !!document.querySelector('.task-sort-picker.open, #task-sort-picker.open') };
      });
      await p.screenshot({path:`${SHOTS}/B1w_sort_${device}.png`});
      results[`sort_${device}`]=data;
      await ctx.close();
    }

    // ---------- 2. GROUP DROPDOWN (Параметры panel) ----------
    {
      const { ctx, page:p } = await openApp(b,{device,page:'main',seed:richSeed(),port});
      await p.waitForTimeout(300);
      await p.addScriptTag({content:MEASURE});
      await p.evaluate(()=>toggleExpand());
      await p.waitForTimeout(500);
      // open the group picker
      await p.locator('#grp-trigger').click();
      await p.waitForTimeout(400);
      const data = await p.evaluate(()=>{
        const list=document.getElementById('grp-list');
        const ef=document.getElementById('extra-fields');
        const efOv = ef?getComputedStyle(ef).overflow:'?';
        const efR = ef?ef.getBoundingClientRect():null;
        const lr = list?list.getBoundingClientRect():null;
        return {
          menu:_m(list), items:_items(list,'.dl-month-option, .grp-option, [role=option]'),
          openUp: !!document.querySelector('#grp-picker.open-up'),
          extraFieldsOverflow: efOv,
          clippedByPanel: (efR&&lr)? Math.round(lr.bottom-efR.bottom) : null,
          efBottom: efR?Math.round(efR.bottom):null
        };
      });
      await p.screenshot({path:`${SHOTS}/B1w_group_${device}.png`});
      results[`group_${device}`]=data;
      await ctx.close();
    }

    // ---------- 3. SNOOZE MENU ----------
    {
      const { ctx, page:p } = await openApp(b,{device,page:'main',seed:richSeed(),port});
      await p.waitForTimeout(300);
      await p.addStyleTag({content:REVEAL});
      await p.addScriptTag({content:MEASURE});
      await p.waitForTimeout(200);
      // click the first snooze button (task with a deadline)
      const clicked = await p.evaluate(()=>{
        const btn=document.querySelector('.btn-snooze');
        if(!btn) return false;
        btn.click();
        return true;
      });
      await p.waitForTimeout(400);
      const data = await p.evaluate(()=>{
        const menu=document.querySelector('.snooze-menu.snooze-with-custom')||document.querySelector('.snooze-menu');
        return {
          clicked:true,
          menu:_m(menu),
          presetItems:_items(menu,'button[role=menuitem]'),
          units:_items(menu,'.snooze-unit'),
          customInput:_items(menu,'.snooze-custom-input'),
          goBtn:_items(menu,'.snooze-custom-go')
        };
      });
      results[`snooze_${device}`]={clicked, ...data};
      await p.screenshot({path:`${SHOTS}/B1w_snooze_${device}.png`});
      await ctx.close();
    }

    // ---------- 4. TASK MORE MENU ----------
    {
      const { ctx, page:p } = await openApp(b,{device,page:'main',seed:richSeed(),port});
      await p.waitForTimeout(300);
      await p.addStyleTag({content:REVEAL});
      await p.addScriptTag({content:MEASURE});
      await p.waitForTimeout(200);
      const clicked = await p.evaluate(()=>{
        const btn=document.querySelector('.btn-task-more');
        if(!btn) return false;
        btn.click();
        return true;
      });
      await p.waitForTimeout(400);
      const data = await p.evaluate(()=>{
        const menu=document.querySelector('.snooze-menu.task-more-menu')||document.querySelector('.snooze-menu');
        return { menu:_m(menu), items:_items(menu,'button[role=menuitem]') };
      });
      results[`more_${device}`]={clicked, ...data};
      await p.screenshot({path:`${SHOTS}/B1w_more_${device}.png`});
      await ctx.close();
    }

    // ---------- 5. QUICK-ADD TYPEAHEAD (tag) ----------
    {
      const { ctx, page:p } = await openApp(b,{device,page:'main',seed:richSeed(),port});
      await p.waitForTimeout(300);
      await p.addScriptTag({content:MEASURE});
      await p.locator('#input-box').click();
      await p.locator('#input-box').pressSequentially('дело *', {delay:40});
      await p.waitForTimeout(500);
      const dataTag = await p.evaluate(()=>{
        const menu=document.querySelector('.qa-menu');
        const inp=document.getElementById('input-box');
        const ir=inp?inp.getBoundingClientRect():null;
        return {
          menu:_m(menu), items:_items(menu,'.qa-item'),
          inputBottom: ir?Math.round(ir.bottom):null,
          menuTop: menu?Math.round(menu.getBoundingClientRect().top):null
        };
      });
      await p.screenshot({path:`${SHOTS}/B1w_typeahead_tag_${device}.png`});
      results[`typeahead_tag_${device}`]=dataTag;

      // priority trigger
      await p.evaluate(()=>{ const i=document.getElementById('input-box'); i.value=''; i.dispatchEvent(new Event('input',{bubbles:true})); });
      await p.locator('#input-box').pressSequentially('дело !', {delay:40});
      await p.waitForTimeout(400);
      const dataPrio = await p.evaluate(()=>{
        const menu=document.querySelector('.qa-menu');
        return { menu:_m(menu), items:_items(menu,'.qa-item') };
      });
      await p.screenshot({path:`${SHOTS}/B1w_typeahead_prio_${device}.png`});
      results[`typeahead_prio_${device}`]=dataPrio;

      // date trigger
      await p.evaluate(()=>{ const i=document.getElementById('input-box'); i.value=''; i.dispatchEvent(new Event('input',{bubbles:true})); });
      await p.locator('#input-box').pressSequentially('дело %', {delay:40});
      await p.waitForTimeout(400);
      const dataDate = await p.evaluate(()=>{
        const menu=document.querySelector('.qa-menu');
        return { menu:_m(menu), items:_items(menu,'.qa-item') };
      });
      results[`typeahead_date_${device}`]=dataDate;
      await ctx.close();
    }
  }

  // ---------- 6. QUICK-ADD TYPEAHEAD w/ KEYBOARD squeezed viewport ----------
  {
    const kb = { width: 412, height: 460, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true, userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 7) Mobile' };
    const { ctx, page:p } = await openApp(b,{device:kb,page:'main',seed:richSeed(),port});
    await p.waitForTimeout(300);
    await p.addScriptTag({content:MEASURE});
    await p.locator('#input-box').click();
    await p.locator('#input-box').pressSequentially('дело *', {delay:40});
    await p.waitForTimeout(500);
    const data = await p.evaluate(()=>{
      const menu=document.querySelector('.qa-menu');
      const inp=document.getElementById('input-box');
      const ir=inp?inp.getBoundingClientRect():null;
      return { menu:_m(menu), items:_items(menu,'.qa-item'), inputBottom: ir?Math.round(ir.bottom):null };
    });
    await p.screenshot({path:`${SHOTS}/B1w_typeahead_keyboard.png`});
    results['typeahead_keyboard']=data;
    await ctx.close();
  }

  console.log(JSON.stringify(results,null,1));
  await b.close(); srv.close();
}
run().catch(e=>{console.error('CRASH',e);process.exit(2);});
