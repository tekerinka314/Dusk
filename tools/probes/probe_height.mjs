import { serve, launch, openApp } from './lib.mjs';
import { richSeed } from './seed.mjs';

(async () => {
  const { srv, port } = await serve();
  const b = await launch();
  const { page: p } = await openApp(b, { device: 'pixel7', page: 'main', seed: richSeed(), port });

  const r = await p.evaluate(() => {
    const info = (el) => el ? { tag: el.tagName + (el.id ? '#' + el.id : '') + (el.className ? '.' + String(el.className).split(' ').slice(0,2).join('.') : ''), h: Math.round(el.getBoundingClientRect().height), top: Math.round(el.getBoundingClientRect().top + window.scrollY) } : null;
    // top-level body children
    const bodyKids = [...document.body.children].map(info);
    // everything taller than 900px (viewport) — the culprits
    const tall = [...document.querySelectorAll('*')]
      .map(el => ({ el, h: el.getBoundingClientRect().height }))
      .filter(x => x.h > 900)
      .sort((a, b) => b.h - a.h)
      .slice(0, 25)
      .map(x => ({ ...info(x.el), pos: getComputedStyle(x.el).position, mh: getComputedStyle(x.el).minHeight }));
    return { bodyKids, tall, scrollH: document.body.scrollHeight };
  });
  console.log('SCROLLH', r.scrollH);
  console.log('BODY_CHILDREN', JSON.stringify(r.bodyKids, null, 1));
  console.log('TALL_ELEMENTS(>900px)', JSON.stringify(r.tall, null, 1));

  await b.close(); srv.close();
})().catch(e => { console.error('CRASH', e); process.exit(2); });
