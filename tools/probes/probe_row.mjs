import { serve, launch, openApp } from './lib.mjs';
import { richSeed } from './seed.mjs';

(async () => {
  const { srv, port } = await serve();
  const b = await launch();
  const { page: p } = await openApp(b, { device: 'pixel7', page: 'main', seed: richSeed(), port });
  await p.waitForTimeout(1200);

  const r = await p.evaluate(() => {
    const li = document.querySelector('.task-item');
    const desc = (el) => {
      const cs = getComputedStyle(el); const b = el.getBoundingClientRect();
      return {
        tag: el.tagName + (el.className ? '.' + String(el.className).trim().split(/\s+/).join('.') : ''),
        w: Math.round(b.width), h: Math.round(b.height),
        disp: cs.display, flex: cs.flex, fw: cs.flexWrap, fShrink: cs.flexShrink, fBasis: cs.flexBasis,
        pos: cs.position, ov: cs.overflow,
      };
    };
    const chain = [];
    // task-head and its children
    const head = li.querySelector('.task-head');
    const headInfo = head ? { self: desc(head), children: [...head.children].map(desc) } : null;
    // the action row
    const actions = li.querySelector('.task-actions, .task-action-row, [class*="action"]');
    const actionsInfo = actions ? { self: desc(actions), visibleBtns: [...actions.querySelectorAll('button')].filter(bn => bn.offsetParent !== null || getComputedStyle(bn).display !== 'none').length, totalBtns: actions.querySelectorAll('button').length } : null;
    // list-item direct children
    const liKids = [...li.children].map(desc);
    return { li: desc(li), liKids, headInfo, actionsInfo,
      taskTextCS: (() => { const t = li.querySelector('.task-text'); const cs = getComputedStyle(t); const bb=t.getBoundingClientRect(); return { w: Math.round(bb.width), minW: cs.minWidth, wb: cs.wordBreak, ows: cs.overflowWrap, ws: cs.whiteSpace, flex: cs.flex, disp: cs.display }; })(),
    };
  });
  console.log(JSON.stringify(r, null, 1));
  await b.close(); srv.close();
})().catch(e => { console.error('CRASH', e); process.exit(2); });
