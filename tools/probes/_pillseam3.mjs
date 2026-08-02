// Диагностика шва пилюля↔кнопка-гроб в drawer/рельсе: реальные метрики + зум.
import { serve, launch, openApp } from './lib.mjs';

const seed = {
  tasks: [{ id: 1, uid: 'u1', text: 'Задача', checked: false, groupId: 1, priority: 0, subtasks: [], updatedAt: 1 }],
  groups: [{ id: 1, uid: 'g1', name: 'ГРУППА', color: '#a05cff', updatedAt: 1 }],
  archive: [], notes: [], notesArchive: [], tombstones: [], templates: [], noteTemplates: [],
  nextId: 2, nextGroupId: 2, nextSubId: 1, sortMode: 'manual', sortModeOverrides: {}, subAnyMode: false,
};

const { srv, port } = await serve();
const b = await launch();
const { page: p } = await openApp(b, { device: { width: 412, height: 915, deviceScaleFactor: 8, isMobile: true, hasTouch: true, userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36' }, page: 'main', seed, port });

await p.evaluate(() => document.documentElement.classList.add('drawer-open'));
await p.waitForTimeout(400);

const m = await p.evaluate(() => {
  const pill = document.querySelector('.side-rail .meta-tag.group-pill');
  const btn  = document.querySelector('.side-rail .btn-pill-delete');
  if (!pill || !btn) return { err: 'no pill', railCount: document.querySelectorAll('.side-rail').length };
  const cs = getComputedStyle(btn, '::before');
  const bp = pill.getBoundingClientRect(), bb = btn.getBoundingClientRect();
  const csb = getComputedStyle(btn), csp = getComputedStyle(pill);
  return {
    pill: { top: bp.top, bottom: bp.bottom, h: bp.height, right: bp.right, radius: csp.borderTopRightRadius, bw: csp.borderTopWidth, bc: csp.borderTopColor, bg: csp.backgroundColor },
    btn:  { top: bb.top, bottom: bb.bottom, h: bb.height, left: bb.left, bw: csb.borderTopWidth, bc: csb.borderTopColor, bg: csb.backgroundColor, overflow: csb.overflow, pos: csb.position },
    before: { content: cs.content, top: cs.top, bottom: cs.bottom, h: cs.height, w: cs.width, bw: cs.borderTopWidth, bc: cs.borderTopColor, bg: cs.backgroundColor, mask: (cs.maskImage || cs.webkitMaskImage || '').slice(0, 60), box: cs.boxSizing },
    pillBg: csp.backgroundColor, varBg: csb.getPropertyValue('--pill-bg'),
  };
});
console.log(JSON.stringify(m, null, 1));

const box = await p.evaluate(() => {
  const pill = document.querySelector('.side-rail .meta-tag.group-pill');
  const btn  = document.querySelector('.side-rail .btn-pill-delete');
  const b1 = pill.getBoundingClientRect(), b2 = btn.getBoundingClientRect();
  return { x: b1.right - 22, y: b1.top - 3, width: (b2.right - b1.right) + 28, height: b1.height + 6 };
});
await p.screenshot({ path: 'D:/VSCode projects/DUSK_v2.0/audit-v2/shots/_pillseam3.png', clip: box });

await b.close(); srv.close();
