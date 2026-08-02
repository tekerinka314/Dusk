import { serve, launch, openApp } from './lib.mjs';
import { richSeed } from './seed.mjs';
(async () => {
  const { srv, port } = await serve();
  const b = await launch();
  const { page: p } = await openApp(b, { device: 'small', page: 'main', seed: richSeed(), port });
  await p.waitForTimeout(300);
  await p.evaluate(() => openDeadlineModal(1));
  await p.waitForTimeout(400);
  const r = await p.evaluate(() => {
    const ov = document.getElementById('deadline-modal');
    const cs = ov ? getComputedStyle(ov) : null;
    return ov ? { cls: ov.className, display: cs.display, opacity: cs.opacity, vis: cs.visibility, inlineStyle: ov.getAttribute('style'), h: Math.round(ov.getBoundingClientRect().height), modalH: Math.round((ov.querySelector('.modal')||{getBoundingClientRect:()=>({height:0})}).getBoundingClientRect().height) } : 'no overlay';
  });
  console.log(JSON.stringify(r, null, 1));
  await b.close(); srv.close();
})().catch(e => { console.error('CRASH', e); process.exit(2); });
