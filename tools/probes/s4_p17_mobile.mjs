// S4/B6 P17 — mobile FUNCTIONAL taps (runtime, coarse-pointer emulation, per plan).
// §9 caveat: emulation gesture NEGATIVES lie → trust POSITIVE taps; for the CSS
// reveal, first confirm the coarse-pointer media actually matches before asserting.
// Checks: (1) matchMedia coarse/hover applies, (2) 6g row-action reveal opacity,
// (3) tap-target sizes ≥44 for primary controls, (4) REAL touch taps toggle state
// (check on/off), subtask toggle, note toggle — end-to-end handler proof.
import { serve, launch, openApp } from './lib.mjs';
import { richSeed } from './seed.mjs';
import fs from 'fs';

const OUT = 'D:/VSCode projects/DUSK_v2.0/audit-v2/shots/s4/p17_mobile.json';

(async () => {
  const { srv, port } = await serve();
  const browser = await launch();
  const { page, errors } = await openApp(browser, { device: 'pixel7', seed: richSeed(), port });

  // ── 1. media queries + 2. reveal opacity + 3. tap-target sizes ──────────────
  const measured = await page.evaluate(() => {
    const mm = q => window.matchMedia(q).matches;
    const media = {
      coarse: mm('(pointer: coarse)'), hoverNone: mm('(hover: none)'),
      fine: mm('(pointer: fine)'), hoverHover: mm('(hover: hover)'),
    };
    // 6g reveal: a task row's actions should not be opacity:0 on coarse
    const firstRow = document.querySelector('.task-item');
    const acts = firstRow && firstRow.querySelector('.task-actions');
    const actOpacity = acts ? parseFloat(getComputedStyle(acts).opacity) : null;
    // tap-target sizes for primary controls
    const size = sel => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { w: Math.round(r.width), h: Math.round(r.height) };
    };
    const targets = {
      task_check:     size('.task-item .task-check'),
      task_action:    size('.task-item .btn-task-action'),
      sub_check:      size('.subtask-item .sub-check'),
      add_btn:        size('#add-task-btn, .add-task-btn, [data-act="addTask"]'),
      sync_fab:       size('.sync-fab, #sync-fab, [class*="sync"][class*="fab"]'),
      sort_picker:    size('.sort-picker, [data-act="cycleSortMode"], #sort-btn'),
      nav_grimoire:   size('[data-act*="rimoire"], .nav-btn, .page-nav button'),
    };
    return { media, actOpacity, targets, vw: window.innerWidth };
  });

  // ── 4. REAL touch taps (positive, trustworthy) ──────────────────────────────
  const taps = { errors: [] };
  // 4a: toggle a simple task's check ON then OFF via touch
  try {
    const before = await page.evaluate(() => window.state.tasks.find(t => t.id === 12).checked);
    await page.locator('.task-item[data-id="12"] .task-check').scrollIntoViewIfNeeded();
    await page.tap('.task-item[data-id="12"] .task-check');
    await page.waitForTimeout(250);
    const afterOn = await page.evaluate(() => window.state.tasks.find(t => t.id === 12).checked);
    await page.tap('.task-item[data-id="12"] .task-check');
    await page.waitForTimeout(250);
    const afterOff = await page.evaluate(() => window.state.tasks.find(t => t.id === 12).checked);
    taps.check = { before, afterOn, afterOff, toggledOn: afterOn !== before, toggledBack: afterOff === before };
  } catch (e) { taps.errors.push('check: ' + e.message); }

  // 4b: subtask toggle on task 9 (has 8 subtasks) — tap the toggle, assert open flips
  try {
    const before = await page.evaluate(() => !!window.state.tasks.find(t => t.id === 9).subtasksOpen);
    const sel = '.task-item[data-id="9"] .btn-subtask-toggle, .task-item[data-id="9"] [data-act*="ubtask"]';
    await page.locator(sel).first().scrollIntoViewIfNeeded();
    await page.tap(sel);
    await page.waitForTimeout(300);
    const after = await page.evaluate(() => !!window.state.tasks.find(t => t.id === 9).subtasksOpen);
    taps.subtaskToggle = { before, after, flipped: after !== before };
  } catch (e) { taps.errors.push('subtaskToggle: ' + e.message); }

  // 4c: note toggle on task 12 (reversible) — tap, assert noteOpen or wrapper appears
  try {
    const before = await page.evaluate(() => !!window.state.tasks.find(t => t.id === 12).noteOpen);
    const sel = '.task-item[data-id="12"] .btn-note-toggle, .task-item[data-id="12"] [data-act*="ote"]';
    const has = await page.locator(sel).first().count();
    if (has) {
      await page.locator(sel).first().scrollIntoViewIfNeeded();
      await page.tap(sel);
      await page.waitForTimeout(300);
      const after = await page.evaluate(() => !!window.state.tasks.find(t => t.id === 12).noteOpen);
      taps.noteToggle = { before, after, flipped: after !== before, present: true };
    } else {
      taps.noteToggle = { present: false };
    }
  } catch (e) { taps.errors.push('noteToggle: ' + e.message); }

  // ── verdicts ────────────────────────────────────────────────────────────────
  const coarseApplies = measured.media.coarse && measured.media.hoverNone;
  const bigEnough = t => t && t.w >= 40 && t.h >= 40;   // 44 target, 4px tolerance
  const primaryTargets = ['task_check', 'task_action'].map(k => ({ k, t: measured.targets[k], ok: bigEnough(measured.targets[k]) }));
  const verdict = {
    coarsePointerApplies: coarseApplies,
    rowActionsRevealed: coarseApplies ? (measured.actOpacity != null && measured.actOpacity > 0.05) : 'n/a (media not coarse in emul)',
    primaryTapTargets44: primaryTargets.every(p => p.ok),
    tapToggleCheck: !!(taps.check && taps.check.toggledOn && taps.check.toggledBack),
    tapSubtaskToggle: !!(taps.subtaskToggle && taps.subtaskToggle.flipped),
    tapNoteToggle: taps.noteToggle && taps.noteToggle.present ? !!taps.noteToggle.flipped : 'no-note-toggle-on-row',
    noPageErrors: errors.length === 0,
  };

  const out = { verdict, measured, taps, pageErrors: errors.slice(), primaryTargets };
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));
  await browser.close(); srv.close();
})().catch(e => { console.error('PROBE ERROR', e); process.exit(1); });
