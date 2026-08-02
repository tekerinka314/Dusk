import { serve, launch, openApp } from './lib.mjs';
import { richSeed } from './seed.mjs';

(async () => {
  const { srv, port } = await serve();
  const b = await launch();
  const { page: p } = await openApp(b, { device: 'pixel7', page: 'main', seed: richSeed(), port });

  const measure = async (label) => {
    const r = await p.evaluate(() => {
      const t8 = [...document.querySelectorAll('.task-text')].map(e => Math.round(e.getBoundingClientRect().height)).sort((a,b)=>b-a).slice(0,4);
      const firstTxt = document.querySelector('.task-text');
      return {
        scrollH: document.body.scrollHeight,
        entering: document.querySelectorAll('.task-item.entering, .entering').length,
        tallestTaskText: t8,
        firstTaskTextW: firstTxt ? Math.round(firstTxt.getBoundingClientRect().width) : null,
      };
    });
    console.log(label, JSON.stringify(r));
  };

  await measure('AT_0.5s');
  await p.waitForTimeout(3000);
  await measure('AT_3.5s_settled');

  // now kill all animation/transition and re-measure the true resting layout
  await p.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important}' });
  await p.evaluate(() => document.querySelectorAll('.entering').forEach(e => e.classList.remove('entering')));
  await p.waitForTimeout(300);
  await measure('ANIM_OFF');

  await b.close(); srv.close();
})().catch(e => { console.error('CRASH', e); process.exit(2); });
