import { serve, launch, openApp, ensureShots } from './lib.mjs';
import { richSeed } from './seed.mjs';

async function measure(p) {
  return await p.evaluate(() => {
    const cw = document.documentElement.clientWidth;
    const bar = document.querySelector('#main-select-bar');
    if (!bar) return { present:false };
    const r = bar.getBoundingClientRect();
    const btns = [...bar.querySelectorAll('.sb-btn, .btn-select-bar-cancel')];
    const tops = {};
    const sizes = btns.map(b=>{
      const br=b.getBoundingClientRect();
      const key=Math.round(br.top);
      tops[key]=(tops[key]||0)+1;
      return { cls:(b.className||'').split(' ').slice(-1)[0], w:Math.round(br.width), h:Math.round(br.height), top:Math.round(br.top), right:Math.round(br.right), overV: Math.round(br.right)>cw+1||Math.round(br.left)<-1 };
    });
    const off=[...bar.querySelectorAll('*')].map(e=>({t:(e.className||'').toString().split(' ')[0], r:Math.round(e.getBoundingClientRect().right)})).filter(o=>o.r>cw+1).sort((a,b)=>b.r-a.r).slice(0,5);
    // groups: measure each cluster + whether its ::before divider is at the start of a wrapped row
    const groups=[...bar.querySelectorAll('.select-bar-group')].map(g=>{
      const gr=g.getBoundingClientRect();
      const cs=getComputedStyle(g,'::before');
      return { left:Math.round(gr.left), top:Math.round(gr.top), right:Math.round(gr.right), width:Math.round(gr.width) };
    });
    // count element
    const cnt=bar.querySelector('.select-bar-count');
    const cr=cnt?cnt.getBoundingClientRect():null;
    return {
      present:true, clientW:cw,
      bar:{ top:Math.round(r.top), left:Math.round(r.left), right:Math.round(r.right), width:Math.round(r.width), height:Math.round(r.height), overRight:Math.round(r.right)-cw },
      rows:Object.keys(tops).length, rowCounts:tops, btnCount:btns.length,
      sizes, overflowOffenders:off,
      groups,
      count: cr?{ top:Math.round(cr.top), left:Math.round(cr.left), right:Math.round(cr.right) }:null,
      pageOverflow: document.documentElement.scrollWidth>cw+1,
      barFlexWrap: getComputedStyle(bar).flexWrap,
      actionsFlexWrap: getComputedStyle(bar.querySelector('.select-bar-actions')).flexWrap,
    };
  });
}

(async()=>{
  const dir=ensureShots();
  const { srv, port }=await serve();
  const b=await launch();
  for(const device of ['pixel7','small']){
    const { ctx, page:p }=await openApp(b,{ device, page:'main', seed:richSeed(), port });
    await p.waitForTimeout(500);
    const eng=await p.evaluate(()=>{ try{toggleMainSelectMode();return true;}catch(e){return 'ERR:'+e.message;} });
    await p.waitForTimeout(300);
    await p.evaluate(()=>{ state.tasks.slice(0,3).map(t=>t.id).forEach(id=>{try{toggleMainSelectTask(id);}catch(e){}}); });
    await p.waitForTimeout(300);
    const m=await measure(p);
    console.log(`\n=== [${device}] engaged=${eng} ===`);
    console.log(JSON.stringify(m,null,1));
    await ctx.close();
  }
  await b.close(); srv.close();
})().catch(e=>{console.error('CRASH',e);process.exit(2);});
