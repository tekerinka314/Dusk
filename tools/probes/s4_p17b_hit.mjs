// S4/B6 P17b — true tap-target hit boxes (closest interactive ancestor, not glyph)
// + note-toggle DOM trace on a note-less task (is noteOpen=false a bug or add-flow?).
import { serve, launch, openApp } from './lib.mjs';
import { richSeed } from './seed.mjs';
import fs from 'fs';
const OUT = 'D:/VSCode projects/DUSK_v2.0/audit-v2/shots/s4/p17b_hit.json';

(async () => {
  const { srv, port } = await serve();
  const browser = await launch();
  const { page, errors } = await openApp(browser, { device: 'pixel7', seed: richSeed(), port });

  const hit = await page.evaluate(() => {
    const box = el => { if (!el) return null; const r = el.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height), cls: el.className }; };
    // check: glyph vs its clickable column vs the row-level check hit
    const chk = document.querySelector('.task-item .task-check');
    const chkCol = document.querySelector('.task-item .task-check-col') || (chk && chk.closest('[class*="check"]'));
    const sub = document.querySelector('.subtask-item .sub-check');
    const subCol = sub && (sub.closest('.sub-check-col') || sub.parentElement);
    const dl = document.querySelector('.task-item .task-deadline, .task-item [class*="deadline"]');
    return {
      check_glyph: box(chk), check_col: box(chkCol),
      sub_glyph: box(sub), sub_col: box(subCol),
      task_action: box(document.querySelector('.task-item .btn-task-action')),
      deadline_pill: box(dl),
    };
  });

  // note-toggle trace on task 12 (no note in seed)
  const noteTrace = {};
  try {
    const sel = '.task-item[data-id="12"] .btn-note-toggle';
    noteTrace.togglePresent = await page.locator(sel).count();
    noteTrace.beforeInputCount = await page.evaluate(() => document.querySelectorAll('.task-item[data-id="12"] .inline-note-input, .task-item[data-id="12"] [contenteditable="true"], .task-item[data-id="12"] .task-note-wrapper').length);
    await page.locator(sel).scrollIntoViewIfNeeded();
    await page.tap(sel);
    await page.waitForTimeout(300);
    noteTrace.afterInputCount = await page.evaluate(() => document.querySelectorAll('.task-item[data-id="12"] .inline-note-input, .task-item[data-id="12"] [contenteditable="true"], .task-item[data-id="12"] .task-note-wrapper').length);
    noteTrace.afterHTML = await page.evaluate(() => { const el = document.querySelector('.task-item[data-id="12"] .task-note-wrapper, .task-item[data-id="12"] .inline-note-input'); return el ? el.outerHTML.slice(0, 160) : null; });
    noteTrace.noteOpen = await page.evaluate(() => !!window.state.tasks.find(t => t.id === 12).noteOpen);
    // a note editor appearing (input/wrapper count rose) = add-note flow working, not a bug
    noteTrace.editorAppeared = noteTrace.afterInputCount > noteTrace.beforeInputCount;
  } catch (e) { noteTrace.error = e.message; }

  // WCAG interpretation: AA 2.5.8 = 24px min, AAA 2.5.5 = 44px.
  const minSide = b => b ? Math.min(b.w, b.h) : 0;
  const verdict = {
    check_hit_side: minSide(hit.check_col || hit.check_glyph),
    sub_hit_side: minSide(hit.sub_col || hit.sub_glyph),
    action_side: minSide(hit.task_action),
    meetsAA_24: [hit.check_col || hit.check_glyph, hit.sub_col || hit.sub_glyph, hit.task_action].every(b => minSide(b) >= 24),
    meetsAAA_44: [hit.check_col || hit.check_glyph, hit.sub_col || hit.sub_glyph, hit.task_action].every(b => minSide(b) >= 44),
    noteEditorAppeared: !!noteTrace.editorAppeared,
  };

  const out = { verdict, hit, noteTrace, pageErrors: errors.slice() };
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));
  await browser.close(); srv.close();
})().catch(e => { console.error('PROBE ERROR', e); process.exit(1); });
