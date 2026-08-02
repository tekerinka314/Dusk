// Проверка: свайп вправо открывает drawer (кромка и не-кромка), влево — закрывает.
import { serve, launch, openApp } from './lib.mjs';
const seed = {
  tasks: [{ id: 1, uid: 'u1', text: 'Задача', checked: false, groupId: 1, priority: 0, subtasks: [], updatedAt: 1 }],
  groups: [{ id: 1, uid: 'g1', name: 'ГРУППА', color: '#a05cff', updatedAt: 1 }],
  archive: [], notes: [], notesArchive: [], tombstones: [], templates: [], noteTemplates: [],
  nextId: 2, nextGroupId: 2, nextSubId: 1, sortMode: 'manual', sortModeOverrides: {}, subAnyMode: false,
};
const { srv, port } = await serve();
const b = await launch();
const { page: p } = await openApp(b, { device: 'pixel7', page: 'main', seed, port });

const swipe = (x0, y0, dx) => p.evaluate(([x0, y0, dx]) => {
  const el = document.elementFromPoint(x0, y0) || document.body;
  const mk = (type, x) => {
    const t = new Touch({ identifier: 1, target: el, clientX: x, clientY: y0 });
    return new TouchEvent(type, { touches: type === 'touchend' ? [] : [t], changedTouches: [t], bubbles: true, cancelable: true });
  };
  el.dispatchEvent(mk('touchstart', x0));
  for (let s = 10; s <= Math.abs(dx); s += 10) el.dispatchEvent(mk('touchmove', x0 + Math.sign(dx) * s));
  el.dispatchEvent(mk('touchend', x0 + dx));
  return document.documentElement.classList.contains('drawer-open');
}, [x0, y0, dx]);

const open = () => p.evaluate(() => document.documentElement.classList.contains('drawer-open'));
const reset = () => p.evaluate(() => document.documentElement.classList.remove('drawer-open'));

const r = {};
await reset(); await swipe(8, 500, 60);   r.edge = await open();
await reset(); await swipe(200, 300, 90); r.middle = await open();
await reset(); await swipe(200, 300, 40); r.shortMiddleIgnored = !(await open());
r.closeBack = await (async () => { await p.evaluate(() => document.documentElement.classList.add('drawer-open')); await swipe(120, 400, -80); return !(await open()); })();
console.log(JSON.stringify(r));
await b.close(); srv.close();
