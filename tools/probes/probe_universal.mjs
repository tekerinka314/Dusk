import { serve, launch, openApp, ensureShots } from './lib.mjs';
import { richSeed } from './seed.mjs';

(async () => {
  const dir = ensureShots();
  const { srv, port } = await serve();
  const b = await launch();

  for (const device of ['small', 'big']) {
    const { ctx, page: p } = await openApp(b, { device, page: 'main', seed: richSeed(), port });
    await p.waitForTimeout(1000);
    const m = await p.evaluate(() => {
      const li = document.querySelector('.task-item');
      const cw = li.querySelector('.task-content')?.getBoundingClientRect().width;
      const tw = li.querySelector('.task-text')?.getBoundingClientRect().width;
      const aw = li.querySelector('.task-actions')?.getBoundingClientRect().width;
      // 10-button task: does actions overflow content? which buttons are clipped by overflow:hidden?
      const rich = [...document.querySelectorAll('.task-item')].find(x => x.querySelectorAll('.task-actions button').length >= 10);
      let clip = null;
      if (rich) {
        const rb = rich.getBoundingClientRect();
        const btns = [...rich.querySelectorAll('.task-actions button')];
        clip = { total: btns.length, contentW: Math.round(rich.querySelector('.task-content').getBoundingClientRect().width),
          actW: Math.round(rich.querySelector('.task-actions').getBoundingClientRect().width),
          clippedRight: btns.filter(bn => bn.getBoundingClientRect().right > rb.right + 0.5).length };
      }
      // subtasks collapse too?
      const subRow = document.querySelector('.subtask-item, .sub-item, [class*="subtask"] li, li.sub-task');
      let subInfo = null;
      const anySub = document.querySelector('.sub-text');
      if (anySub) subInfo = { subTextW: Math.round(anySub.getBoundingClientRect().width), subRowH: Math.round(anySub.closest('li')?.getBoundingClientRect().height || 0) };
      return { contentW: Math.round(cw), textW: Math.round(tw), actW: Math.round(aw), scrollH: document.body.scrollHeight, clip, subInfo };
    });
    console.log(device.toUpperCase(), JSON.stringify(m));
    await p.screenshot({ path: `${dir}/B1-01_${device}_viewport.png` });
    await ctx.close();
  }
  await b.close(); srv.close();
})().catch(e => { console.error('CRASH', e); process.exit(2); });
