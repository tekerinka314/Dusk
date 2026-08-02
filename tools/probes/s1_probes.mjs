// S1 — targeted B1 top-up probes (5 classes). Serial, one browser.
// Usage: node s1_probes.mjs [section]   section ∈ seg|pickers|kbmodals|rotate|quar|ta|all
import { serve, launch, openApp, ensureShots } from './lib.mjs';
import { richSeed } from './seed.mjs';
import fs from 'fs'; import path from 'path';

const SEC = process.argv[2] || 'all';
const shots = ensureShots('s1');
const OUT = {};
const log = (k, v) => { OUT[k] = v; console.log('==', k, JSON.stringify(v)); };

const vp = async (p) => p.evaluate(() => ({ w: innerWidth, h: innerHeight }));
const rect = async (p, sel) => p.evaluate(s => {
  const el = document.querySelector(s); if (!el) return null;
  const r = el.getBoundingClientRect();
  return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height),
           bottom: Math.round(r.bottom), right: Math.round(r.right), vis: r.width > 0 && r.height > 0 };
}, sel);
const shot = (p, name) => p.screenshot({ path: path.join(shots, name + '.png') });

// journal seed — shapes per 09-sync _entry()
function journalEntries() {
  const now = Date.now();
  const mk = (kind, recType, recUid, opts) => ({
    uid: kind + '|' + recType + '|' + recUid + '|' + (opts.field || opts.parentUid || '') + '|' + (opts.loserStamp || now),
    kind, recType, recUid, parentUid: opts.parentUid || null, field: opts.field || null,
    loser: opts.loser, winner: opts.winner ?? null, reason: opts.reason || kind,
    createdAt: opts.loserStamp || now, resolved: false, resolvedAt: null, resolution: null,
  });
  return [
    mk('field', 'tasks', 'u1', { field: 'text', loser: 'Зажечь белые свечи перед северным алтарём в полночь при полной луне (проигравшая длинная версия текста задачи для проверки переноса)', winner: 'Зажечь чёрные свечи перед алтарём' }),
    mk('field', 'groups', 'g10', { field: 'name', loser: 'Ритуалы глубокой ночи', winner: 'Ритуалы ночи' }),
    mk('subtask', 'tasks', 'u1', { parentUid: 'u1', loser: { uid: 'suX', text: 'проигравший подпункт с другого устройства', checked: false, priority: 'none', repeat: 'none', note: '', order: 9, cycleChecked: false, updatedAt: now, deadline: null } }),
    mk('delete-vs-edit', 'tasks', 'uDel', { loser: { uid: 'uDel', text: 'Задача, удалённая на этом устройстве, но правленная на другом', checked: false, priority: 'high', subtasks: [], updatedAt: now, _arch: false } }),
    mk('note-both', 'notes', 'n1', { loser: { id: 'n1', title: 'Заклинание вызова', body: '<p>Проигравшая копия заметки с <b>другого</b> устройства.</p>', fmt: true, updatedAt: now } }),
  ];
}

const { srv, port } = await serve();
const browser = await launch();
const seed = richSeed();

// ───────────────────────── A. SegmentedInput family on touch ─────────────────
if (SEC === 'seg' || SEC === 'all') {
  const { ctx, page: p, errors } = await openApp(browser, { device: 'pixel7', seed, port });
  // 1) deadline modal, date mode (task 1: date+time)
  await p.evaluate(() => globalThis.openDeadlineModal(1));
  await p.waitForTimeout(450);
  const segSel = '#deadline-modal .seg-input';
  const segs = await p.evaluate(() => Array.from(document.querySelectorAll('#deadline-modal .seg-input-row')).map(row => {
    const wrap = row.querySelector('.seg-input');
    const r = wrap.getBoundingClientRect();
    return { visible: r.width > 0, x: Math.round(r.x + 8), y: Math.round(r.y + r.height / 2), id: row.querySelector('input')?.id };
  }).filter(s => s.visible));
  const res = [];
  for (const s of segs) {
    await p.touchscreen.tap(s.x, s.y);
    await p.waitForTimeout(150);
    const st = await p.evaluate(() => {
      const ae = document.activeElement;
      const activeSeg = document.querySelector('#deadline-modal .seg.seg-active, #deadline-modal .seg.active');
      return { activeTag: ae ? ae.tagName : null, activeClass: ae ? ae.className : null,
               editable: !!(ae && (ae.isContentEditable || ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA')),
               segActivated: !!activeSeg, inputMode: ae ? (ae.getAttribute('inputmode') || null) : null };
    });
    // try typing a digit — does it land? (hardware kbd works even on div; VK is the q.)
    await p.keyboard.type('1');
    await p.waitForTimeout(100);
    const buf = await p.evaluate(() => Array.from(document.querySelectorAll('#deadline-modal .seg')).map(e => e.textContent).join(','));
    res.push({ id: s.id, ...st, segTextAfterType1: buf });
  }
  log('seg_deadline_date', res);
  await shot(p, 'seg_dl_date_pixel7');
  // 2) monthday steppers (task 5)
  await p.evaluate(() => { globalThis.closeDeadlineModal ? globalThis.closeDeadlineModal() : null; });
  await p.waitForTimeout(300);
  await p.evaluate(() => globalThis.openDeadlineModal(5));
  await p.waitForTimeout(450);
  const incR = await rect(p, '#dl-monthday-inc');
  let stepper = null;
  if (incR && incR.vis) {
    const before = await p.evaluate(() => (document.getElementById('dl-monthday') || {}).value);
    await p.touchscreen.tap(incR.x + incR.w / 2, incR.y + incR.h / 2);
    await p.waitForTimeout(200);
    const after = await p.evaluate(() => (document.getElementById('dl-monthday') || {}).value);
    stepper = { before, after, tapWorks: before !== after, btn: incR };
  }
  log('seg_monthday_stepper', stepper);
  // native number input on touch: focus raises numeric VK — check attrs
  const mdAttrs = await p.evaluate(() => { const i = document.getElementById('dl-monthday'); return i ? { type: i.type, inputmode: i.getAttribute('inputmode') } : null; });
  log('seg_monthday_input', mdAttrs);
  await shot(p, 'seg_dl_monthday_pixel7');
  // 3) repeat modal anchor time (task 4 weekly)
  await p.evaluate(() => { globalThis.closeDeadlineModal ? globalThis.closeDeadlineModal() : null; });
  await p.waitForTimeout(300);
  await p.evaluate(() => globalThis.openRepeatModal(4));
  await p.waitForTimeout(450);
  const rep = await p.evaluate(() => {
    const row = document.querySelector('#repeat-modal .seg-input-row, .repeat-modal .seg-input-row');
    if (!row) return { found: false, modalOpen: !!document.querySelector('#repeat-modal, .repeat-modal') };
    const wrap = row.querySelector('.seg-input'); const r = wrap.getBoundingClientRect();
    return { found: true, visible: r.width > 0, x: Math.round(r.x + 8), y: Math.round(r.y + r.height / 2) };
  });
  if (rep.found && rep.visible) {
    await p.touchscreen.tap(rep.x, rep.y);
    await p.waitForTimeout(150);
    const st = await p.evaluate(() => { const ae = document.activeElement; return { activeClass: ae?.className, editable: !!(ae && (ae.isContentEditable || ae.tagName === 'INPUT')) }; });
    log('seg_repeat_anchor', { ...rep, ...st });
  } else log('seg_repeat_anchor', rep);
  await shot(p, 'seg_repeat_pixel7');
  log('seg_errors', errors);
  await ctx.close();
}

// ───────────────────────── B. gothic pickers @360 + landscape ────────────────
if (SEC === 'pickers' || SEC === 'all') {
  for (const dev of ['small', 'landscape']) {
    const { ctx, page: p } = await openApp(browser, { device: dev, seed, port });
    const V = await vp(p);
    const out = {};
    // dl-month picker (task 6 = month mode)
    await p.evaluate(() => globalThis.openDeadlineModal(6));
    await p.waitForTimeout(450);
    const mt = await rect(p, '#dl-month-trigger');
    if (mt && mt.vis) {
      await p.touchscreen.tap(mt.x + mt.w / 2, mt.y + mt.h / 2);
      await p.waitForTimeout(350);
      const list = await rect(p, '#dl-month-list');
      const item = await p.evaluate(() => { const el = document.querySelector('#dl-month-list [role="option"], #dl-month-list button, #dl-month-list .dl-month-item'); if (!el) return null; const r = el.getBoundingClientRect(); return { h: Math.round(r.height), w: Math.round(r.width) }; });
      out.month = { trigger: mt, list, itemSize: item, clipsBottom: list ? list.bottom > V.h : null, clipsRight: list ? list.right > V.w : null, opensOnTap: !!(list && list.vis) };
      await shot(p, `picker_month_${dev}`);
    } else out.month = { trigger: mt, note: 'trigger not visible' };
    // dl-weekday picker (task 4 weektime)
    await p.evaluate(() => { globalThis.closeDeadlineModal?.(); });
    await p.waitForTimeout(250);
    await p.evaluate(() => globalThis.openDeadlineModal(4));
    await p.waitForTimeout(450);
    const wt = await p.evaluate(() => { const el = document.querySelector('#dl-wd-trigger, #dl-weekday-trigger'); if (!el) return null; const r = el.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), vis: r.width > 0, id: el.id }; });
    if (wt && wt.vis) {
      await p.touchscreen.tap(wt.x + wt.w / 2, wt.y + wt.h / 2);
      await p.waitForTimeout(350);
      const list = await p.evaluate(() => { const el = document.querySelector('.dl-weekday-list:not([aria-hidden="true"])'); if (!el) return null; const r = el.getBoundingClientRect(); const it = el.querySelector('button, [role="option"]'); return { x: Math.round(r.x), y: Math.round(r.y), bottom: Math.round(r.bottom), right: Math.round(r.right), h: Math.round(r.height), vis: r.height > 0, itemH: it ? Math.round(it.getBoundingClientRect().height) : null }; });
      out.weekday = { trigger: wt, list, clipsBottom: list ? list.bottom > V.h : null, opensOnTap: !!(list && list.vis) };
      await shot(p, `picker_weekday_${dev}`);
    } else out.weekday = { trigger: wt, note: 'not visible (weektime mode?)' };
    await p.evaluate(() => { globalThis.closeDeadlineModal?.(); });
    await p.waitForTimeout(250);
    // params panel: form-wd + group picker
    const ptoggle = await rect(p, '#btn-expand');
    if (ptoggle && ptoggle.vis) {
      await p.touchscreen.tap(ptoggle.x + ptoggle.w / 2, ptoggle.y + ptoggle.h / 2);
      await p.waitForTimeout(500);
      const fwd = await rect(p, '#form-wd-trigger');
      out.paramsOpen = !!(fwd && fwd.vis);
      // form weekday picker (visible only when form repeat=weekly — check reachability)
      if (fwd && fwd.vis) {
        await p.touchscreen.tap(fwd.x + fwd.w / 2, fwd.y + fwd.h / 2);
        await p.waitForTimeout(350);
        const list = await p.evaluate(() => { const el = document.querySelector('#form-wd-list:not([aria-hidden="true"])'); if (!el) return null; const r = el.getBoundingClientRect(); return { bottom: Math.round(r.bottom), h: Math.round(r.height), vis: r.height > 0 }; });
        out.formWeekday = { trigger: fwd, list, clipsBottom: list ? list.bottom > V.h : null, opensOnTap: !!(list && list.vis) };
        await shot(p, `picker_formwd_${dev}`);
      }
      // group picker in params
      const gp = await rect(p, '#grp-trigger');
      if (gp && gp.vis) {
        await p.evaluate(() => document.getElementById('grp-trigger').scrollIntoView({ block: 'center' }));
        await p.waitForTimeout(200);
        const gp2 = await rect(p, '#grp-trigger');
        await p.touchscreen.tap(gp2.x + gp2.w / 2, gp2.y + gp2.h / 2);
        await p.waitForTimeout(350);
        const list = await p.evaluate(() => { const el = document.getElementById('grp-list'); const pk = document.getElementById('grp-picker'); if (!el || !pk.classList.contains('open')) return null; const r = el.getBoundingClientRect(); const it = el.querySelector('button, [role="option"], .grp-item'); return { bottom: Math.round(r.bottom), right: Math.round(r.right), h: Math.round(r.height), vis: r.height > 0, openUp: pk.classList.contains('open-up'), itemH: it ? Math.round(it.getBoundingClientRect().height) : null }; });
        out.groupPicker = { trigger: gp2, list, clipsBottom: list ? list.bottom > V.h : null, opensOnTap: !!(list && list.vis) };
        await shot(p, `picker_group_${dev}`);
        await p.touchscreen.tap(5, Math.round(V.h / 2)); await p.waitForTimeout(250);
      } else out.groupPicker = { trigger: gp };
    } else out.paramsToggle = ptoggle;
    // Grimuar colour-filter popover (notes page)
    await p.evaluate(() => { if (globalThis.switchPage) switchPage('notes'); });
    await p.waitForTimeout(500);
    const cf = await rect(p, '#grim-cfilter-btn');
    if (cf && cf.vis) {
      await p.touchscreen.tap(cf.x + cf.w / 2, cf.y + cf.h / 2);
      await p.waitForTimeout(350);
      const pop = await p.evaluate(() => { const el = document.getElementById('grim-cfilter-pop'); if (!el || el.getAttribute('aria-hidden') === 'true') return null; const r = el.getBoundingClientRect(); const sw = el.querySelector('button'); return { bottom: Math.round(r.bottom), right: Math.round(r.right), left: Math.round(r.left), vis: r.height > 0, swatchH: sw ? Math.round(sw.getBoundingClientRect().height) : null, swatchW: sw ? Math.round(sw.getBoundingClientRect().width) : null }; });
      out.grimColorFilter = { trigger: cf, pop, clipsRight: pop ? pop.right > V.w : null, clipsLeft: pop ? pop.left < 0 : null, opensOnTap: !!(pop && pop.vis) };
      await shot(p, `picker_grimcfilter_${dev}`);
    } else out.grimColorFilter = { trigger: cf };
    log('pickers_' + dev, out);
    await ctx.close();
  }
}

// ───────────────── C. modals with keyboard raised (412×460 proxy) ────────────
if (SEC === 'kbmodals' || SEC === 'all') {
  const kb = { width: 412, height: 460, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true, userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36' };
  const { ctx, page: p } = await openApp(browser, { device: kb, seed, port });
  const V = await vp(p);
  const cases = [
    { name: 'note-modal', open: `globalThis.openNoteModal ? openNoteModal(10) : null`, input: '#note-modal textarea, #note-modal input[type="text"], #note-textarea', save: '#note-modal .btn-modal-confirm' },
    { name: 'rename-group', open: `globalThis.openRenameGroupModal(10)`, input: '#rename-group-input', save: '#rename-group-modal .btn-modal-confirm' },
    { name: 'template-save', open: `globalThis.openTemplatesModal()`, input: '#templates-modal input', save: '#templates-modal .btn-modal-confirm, #templates-modal .btn-modal-cancel' },
    { name: 'grim-link', open: `(function(){ switchPage('notes'); grimOpen('n1'); setTimeout(()=>{ const bo=document.getElementById('grim-body'); const r=document.createRange(); r.selectNodeContents(bo.querySelector('p')||bo); const s=getSelection(); s.removeAllRanges(); s.addRange(r); grimLink(); }, 400); })()`, input: '#grim-link-input', save: '#grim-link-modal .btn-modal-confirm' },
  ];
  const out = {};
  for (const c of cases) {
    try {
      await p.evaluate(new Function(c.open));
      await p.waitForTimeout(700);
      const ir = await rect(p, c.input);
      let focusRes = null;
      if (ir && ir.vis) {
        await p.touchscreen.tap(ir.x + Math.min(ir.w / 2, 100), ir.y + ir.h / 2);
        await p.waitForTimeout(300);
        const ir2 = await rect(p, c.input);
        const sv = await rect(p, c.save);
        focusRes = { inputFullyVisible: ir2 && ir2.y >= 0 && ir2.bottom <= V.h, inputRect: ir2, saveVisible: sv ? (sv.vis && sv.bottom <= V.h && sv.y >= 0) : null, saveRect: sv };
      }
      const modalR = await p.evaluate(() => {
        const ov = Array.from(document.querySelectorAll('.modal-overlay')).find(o => getComputedStyle(o).display !== 'none');
        const m = ov && ov.querySelector('.modal'); if (!m) return null; const r = m.getBoundingClientRect();
        return { id: ov.id, y: Math.round(r.y), bottom: Math.round(r.bottom), h: Math.round(r.height), clipsTop: r.y < 0, clipsBottom: r.bottom > innerHeight };
      });
      out[c.name] = { inputFound: !!(ir && ir.vis), modal: modalR, ...focusRes };
      await shot(p, 'kb_' + c.name);
      await p.keyboard.press('Escape'); await p.waitForTimeout(350);
      await p.evaluate(() => { // close leftover overlays WITHOUT removing static markup
        document.querySelectorAll('.modal-overlay').forEach(o => { if (getComputedStyle(o).display !== 'none') o.style.display = 'none'; });
      });
    } catch (e) { out[c.name] = { err: String(e).slice(0, 120) }; }
  }
  log('kbmodals_412x460', out);
  await ctx.close();
}

// ───────────────────────── D. orientation change mid-edit ────────────────────
if (SEC === 'rotate' || SEC === 'all') {
  const { ctx, page: p } = await openApp(browser, { device: 'pixel7', seed, port });
  const out = {};
  // 1) quick-add input typed → rotate
  const qi = await rect(p, '#input-box');
  if (qi) {
    await p.touchscreen.tap(qi.x + 50, qi.y + qi.h / 2);
    await p.keyboard.type('незавершённый ввод задачи');
    await p.setViewportSize({ width: 915, height: 412 });
    await p.waitForTimeout(500);
    const val = await p.evaluate(() => (document.querySelector('#input-box') || {}).value);
    out.quickAdd = { preserved: val === 'незавершённый ввод задачи', value: val };
    await p.setViewportSize({ width: 412, height: 915 });
    await p.waitForTimeout(400);
    const val2 = await p.evaluate(() => (document.querySelector('#input-box') || {}).value);
    out.quickAddBack = { preserved: val2 === 'незавершённый ввод задачи' };
    await p.evaluate(() => { const i = document.querySelector('#input-box'); if (i) i.value = ''; });
  } else out.quickAdd = { note: 'input not found' };
  // 2) task note contenteditable typed mid-edit → rotate BEFORE debounce
  const noteEl = await p.evaluate(() => {
    const el = document.querySelector('.task-item[data-id="10"] .task-note-text, .task-item[data-id="10"] [class*="note"] [contenteditable], .task-item[data-id="10"] .task-note');
    if (!el) return null; const r = el.getBoundingClientRect(); return { x: Math.round(r.x + 20), y: Math.round(r.y + r.height / 2), cls: el.className };
  });
  if (noteEl) {
    await p.evaluate(() => { const el = document.querySelector('.task-item[data-id="10"]'); el.scrollIntoView({ block: 'center' }); });
    await p.waitForTimeout(200);
    const ne2 = await p.evaluate(() => { const el = document.querySelector('.task-item[data-id="10"] .task-note-text, .task-item[data-id="10"] .task-note'); const r = el.getBoundingClientRect(); return { x: Math.round(r.x + 20), y: Math.round(r.y + r.height / 2) }; });
    // edit entry is dblclick-gated (data-actdbl) — try a fast double-tap
    await p.evaluate(() => { globalThis.__dbl = 0; document.addEventListener('dblclick', () => { globalThis.__dbl++; }, true); });
    await p.touchscreen.tap(ne2.x, ne2.y); await p.waitForTimeout(80);
    await p.touchscreen.tap(ne2.x, ne2.y); await p.waitForTimeout(350);
    let editing = await p.evaluate(() => { const ae = document.activeElement; return ae && ae.isContentEditable; });
    const dblFired = await p.evaluate(() => globalThis.__dbl);
    out.dblTapNote = { dblclickEventsFired: dblFired, enteredEditing: !!editing };
    // same for the task TITLE (startInlineEdit)
    const tt = await p.evaluate(() => { const el = document.querySelector('.task-item[data-id="12"] .task-text'); if (!el) return null; el.scrollIntoView({ block: 'center' }); const r = el.getBoundingClientRect(); return { x: Math.round(r.x + 20), y: Math.round(r.y + r.height / 2) }; });
    if (tt) {
      await p.touchscreen.tap(tt.x, tt.y); await p.waitForTimeout(80);
      await p.touchscreen.tap(tt.x, tt.y); await p.waitForTimeout(350);
      out.dblTapTitle = await p.evaluate(() => { const el = document.querySelector('.task-item[data-id="12"] .task-text'); const ae = document.activeElement; return { titleEditable: el ? el.getAttribute('contenteditable') : null, activeIsTitle: ae === el, dblTotal: globalThis.__dbl }; });
    }
    if (editing) {
      await p.keyboard.type(' ДОБАВКА');
      await p.setViewportSize({ width: 915, height: 412 });   // rotate within 350ms debounce
      await p.waitForTimeout(600);
      const after = await p.evaluate(() => {
        const ae = document.activeElement;
        const domTxt = (document.querySelector('.task-item[data-id="10"] .task-note-text, .task-item[data-id="10"] .task-note') || {}).textContent || '';
        const stTxt = (globalThis.state.tasks.find(t => t.id === 10) || {}).note;
        return { stillEditing: !!(ae && ae.isContentEditable), domHasTyped: domTxt.includes('ДОБАВКА'), stateHasTyped: (stTxt || '').includes('ДОБАВКА'), stateNote: stTxt };
      });
      out.taskNoteRotate = after;
      await p.setViewportSize({ width: 412, height: 915 }); await p.waitForTimeout(300);
      await p.keyboard.press('Escape'); await p.waitForTimeout(200);
    } else out.taskNoteRotate = { note: 'could not enter edit mode by tap', editing };
  } else out.taskNoteRotate = { note: 'note element not found' };
  // 3) deadline modal typed segments → rotate
  await p.evaluate(() => globalThis.openDeadlineModal(12));   // task without deadline → fresh modal
  await p.waitForTimeout(450);
  // switch to date mode if needed
  await p.evaluate(() => { const b = document.querySelector('#deadline-modal [data-mode="date"], .dl-mode-btn[data-mode="date"]'); if (b) b.click(); });
  await p.waitForTimeout(300);
  const dateSegTyped = await p.evaluate(() => {
    // focus first date segment programmatically (keyboard path — the touch defect is separate)
    const si = globalThis.segInputs && segInputs['dl-date'];
    if (!si) return { found: false };
    si._focus(0); return { found: true };
  });
  if (dateSegTyped.found) {
    await p.keyboard.type('2512');
    await p.waitForTimeout(150);
    const before = await p.evaluate(() => segInputs['dl-date'].segs.map(s => s.buf).join('|'));
    await p.setViewportSize({ width: 915, height: 412 });
    await p.waitForTimeout(500);
    const after = await p.evaluate(() => ({
      bufs: segInputs['dl-date'].segs.map(s => s.buf).join('|'),
      segText: Array.from(document.querySelectorAll('#deadline-modal .seg')).slice(0, 3).map(e => e.textContent).join(','),
      modalOpen: !!document.querySelector('#dl-modal') && getComputedStyle(document.querySelector('#dl-modal')).display !== 'none',
      saveVisible: (() => { const b = document.querySelector('#deadline-modal .btn-modal-save, #deadline-modal button[class*="save"]'); if (!b) return null; const r = b.getBoundingClientRect(); return r.bottom <= innerHeight && r.y >= 0; })(),
    }));
    out.deadlineRotate = { before, ...after, preserved: after.bufs === before };
    await shot(p, 'rotate_dl_landscape');
    await p.setViewportSize({ width: 412, height: 915 }); await p.waitForTimeout(300);
    await p.evaluate(() => globalThis.closeDeadlineModal?.());
  } else out.deadlineRotate = dateSegTyped;
  // 4) grimuar editor typed → rotate
  await p.evaluate(() => { if (globalThis.switchPage) switchPage('notes'); });
  await p.waitForTimeout(500);
  const opened = await p.evaluate(() => { if (globalThis.grimOpen) { grimOpen('n8'); return true; } return false; });
  await p.waitForTimeout(600);
  const body = await p.evaluate(() => { const el = document.getElementById('grim-body'); if (!el) return null; const r = el.getBoundingClientRect(); return { x: Math.round(r.x + 30), y: Math.round(r.y + 20) }; });
  if (body) {
    await p.touchscreen.tap(body.x, body.y); await p.waitForTimeout(250);
    await p.keyboard.type('РОТАЦИЯ-ТЕСТ ');
    await p.setViewportSize({ width: 915, height: 412 });
    await p.waitForTimeout(700);
    const after = await p.evaluate(() => {
      const el = document.querySelector('#grim-detail [contenteditable="true"], .grim-body[contenteditable]');
      const note = (globalThis.state.notes || []).find(n => n.id === 'n8');
      return { domHasTyped: !!el && el.textContent.includes('РОТАЦИЯ-ТЕСТ'), stateHasTyped: !!note && (note.body || '').includes('РОТАЦИЯ-ТЕСТ'), detailStillOpen: !!el };
    });
    out.grimRotate = after;
    await shot(p, 'rotate_grim_landscape');
  } else out.grimRotate = { note: 'editor body not found', opened };
  log('rotate', out);
  await ctx.close();
}

// ───────────────────────── E. quarantine overlay on mobile ───────────────────
if (SEC === 'quar' || SEC === 'all') {
  const qseed = { ...richSeed(), syncJournal: journalEntries() };
  for (const dev of ['pixel7', 'small', 'landscape']) {
    const { ctx, page: p } = await openApp(browser, { device: dev, seed: qseed, port });
    const V = await vp(p);
    // badge on the sync FAB
    const badge = await p.evaluate(() => {
      if (globalThis.refreshQuarantineBadge) refreshQuarantineBadge();
      const b = document.querySelector('.sync-quar-badge, .sync-glyph [class*="badge"], .sync-glyph-badge');
      if (!b) return { found: false };
      const r = b.getBoundingClientRect();
      return { found: true, vis: r.width > 0, w: Math.round(r.width), h: Math.round(r.height), text: b.textContent, bottom: Math.round(r.bottom), inViewport: r.bottom <= innerHeight && r.left >= 0 };
    });
    await p.evaluate(() => globalThis.openQuarantine());
    await p.waitForTimeout(450);
    const m = await p.evaluate(() => {
      const modal = document.querySelector('.sync-quar-modal'); if (!modal) return null;
      const r = modal.getBoundingClientRect();
      const rows = Array.from(document.querySelectorAll('.sync-quar-row')).map(row => {
        const rr = row.getBoundingClientRect();
        const rb = row.querySelector('.sync-quar-restore').getBoundingClientRect();
        return { w: Math.round(rr.width), h: Math.round(rr.height), btnW: Math.round(rb.width), btnH: Math.round(rb.height), overflowsX: rr.right > innerWidth };
      });
      const list = document.querySelector('.sync-quar-list');
      return { modal: { y: Math.round(r.y), bottom: Math.round(r.bottom), w: Math.round(r.width), clipsTop: r.y < 0, clipsBottom: r.bottom > innerHeight },
               rows, listScrollable: list ? list.scrollHeight > list.clientHeight : null, count: rows.length };
    });
    await shot(p, `quar_${dev}`);
    // tap-restore functional check (pixel7 only)
    let restore = null;
    if (dev === 'pixel7') {
      const rb = await rect(p, '.sync-quar-restore');
      if (rb) {
        await p.touchscreen.tap(rb.x + rb.w / 2, rb.y + rb.h / 2);
        await p.waitForTimeout(400);
        restore = await p.evaluate(() => ({
          remaining: document.querySelectorAll('.sync-quar-row').length,
          taskTextRestored: (globalThis.state.tasks.find(t => t.uid === 'u1') || {}).text,
        }));
      }
    }
    log('quar_' + dev, { viewport: V, badge, overlay: m, restoreTap: restore });
    await ctx.close();
  }
}

// ───────────────────────── F. quick-add typeahead on mobile ──────────────────
if (SEC === 'ta' || SEC === 'all') {
  const kb = { width: 412, height: 460, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true, userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36' };
  for (const [label, dev] of [['pixel7', 'pixel7'], ['kbshort', kb], ['landscape', 'landscape']]) {
    const { ctx, page: p } = await openApp(browser, { device: dev, seed, port });
    const V = await vp(p);
    const qi = await rect(p, '#input-box');
    if (!qi) { log('ta_' + label, { note: 'input not found' }); await ctx.close(); continue; }
    await p.touchscreen.tap(qi.x + 50, qi.y + qi.h / 2);
    await p.waitForTimeout(200);
    await p.keyboard.type('задача !', { delay: 40 });
    await p.waitForTimeout(400);
    const menu = await p.evaluate(() => {
      const m = document.querySelector('.qa-menu'); if (!m) return { open: false };
      const r = m.getBoundingClientRect();
      const items = Array.from(m.querySelectorAll('.qa-item')).map(i => Math.round(i.getBoundingClientRect().height));
      return { open: true, y: Math.round(r.y), bottom: Math.round(r.bottom), h: Math.round(r.height), right: Math.round(r.right), itemHeights: items, clipsBottom: r.bottom > innerHeight };
    });
    let tapAccept = null;
    if (menu.open) {
      const it = await rect(p, '.qa-menu .qa-item:not(.qa-disabled)');
      if (it) {
        await p.touchscreen.tap(it.x + it.w / 2, it.y + it.h / 2);
        await p.waitForTimeout(250);
        tapAccept = await p.evaluate(() => ({ value: (document.querySelector('#input-box') || {}).value, menuGone: !document.querySelector('.qa-menu') }));
      }
    }
    await shot(p, `ta_${label}`);
    log('ta_' + label, { viewport: V, inputRect: qi, menu, tapAccept });
    await ctx.close();
  }
}

fs.writeFileSync(path.join(shots, '_s1_results.json'), JSON.stringify(OUT, null, 2));
await browser.close(); srv.close();
console.log('DONE');
