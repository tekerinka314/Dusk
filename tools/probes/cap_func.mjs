import { serve, launch, openApp, ensureShots } from './lib.mjs';
import { richSeed } from './seed.mjs';

(async () => {
  const dir = ensureShots();
  const { srv, port } = await serve();
  const b = await launch();
  const dev = 'pixel7';

  // (A) functional: add a task by TAP (touch path)
  {
    const { ctx, page: p } = await openApp(b, { device: dev, page: 'main', seed: richSeed(), port });
    await p.waitForTimeout(500);
    const before = await p.evaluate(() => state.tasks.length);
    await p.locator('#input-box').tap();
    await p.locator('#input-box').fill('Тач-добавленная !высокий *ритуал');
    await p.locator('#btn-add').tap();
    await p.waitForTimeout(500);
    const after = await p.evaluate(() => ({ n: state.tasks.length, last: state.tasks.find(t => t.text.includes('Тач')) }));
    console.log('ADD_BY_TAP before=%d after=%d parsedPriority=%s', before, after.n, after.last ? after.last.priority : 'NOT_ADDED');
    await ctx.close();
  }

  // (B) tap the schedule-mode toolbar button (touch), verify it engages
  {
    const { ctx, page: p } = await openApp(b, { device: dev, page: 'main', seed: richSeed(), port });
    await p.waitForTimeout(500);
    const btn = p.locator('[data-act="toggleScheduleMode"]').first();
    const exists = await btn.count();
    let engaged = 'n/a';
    if (exists) { await btn.tap(); await p.waitForTimeout(500); engaged = await p.evaluate(() => document.body.className + '|' + (document.querySelector('.dl-side-panel') ? 'sidePanel' : 'noSidePanel')); }
    console.log('SCHEDULE_TAP exists=%s state=%s', exists, engaged);
    await p.screenshot({ path: `${dir}/B1_schedule_${dev}.png` });
    await ctx.close();
  }

  // (C) quick-add typeahead placement when typing a trigger symbol
  {
    const { ctx, page: p } = await openApp(b, { device: dev, page: 'main', seed: richSeed(), port });
    await p.waitForTimeout(400);
    await p.locator('#input-box').tap();
    await p.locator('#input-box').fill('Задача *');
    await p.waitForTimeout(500);
    const ta = await p.evaluate(() => {
      const dd = document.querySelector('.qa-typeahead, .qa-dropdown, [class*="typeahead"], [class*="qa-suggest"]');
      if (!dd) return { present: false };
      const r = dd.getBoundingClientRect();
      return { present: true, cls: dd.className, top: Math.round(r.top), bottom: Math.round(r.bottom), w: Math.round(r.width), belowInput: r.top > (document.querySelector('#input-box').getBoundingClientRect().bottom) };
    });
    console.log('QA_TYPEAHEAD', JSON.stringify(ta));
    await p.screenshot({ path: `${dir}/B1_qa_typeahead_${dev}.png` });
    await ctx.close();
  }

  // (D) sort picker placement (gothic picker overlay)
  {
    const { ctx, page: p } = await openApp(b, { device: dev, page: 'main', seed: richSeed(), port });
    await p.waitForTimeout(400);
    try { await p.evaluate(() => toggleSortPicker && toggleSortPicker()); } catch (e) { console.log('SORT_ERR', e.message); }
    await p.waitForTimeout(400);
    const sp = await p.evaluate(() => { const el = document.querySelector('.sort-picker, .gothic-picker, [class*="picker"]:not([style*="display: none"])'); if (!el) return { present: false }; const r = el.getBoundingClientRect(); return { present: true, cls: el.className, top: Math.round(r.top), bottom: Math.round(r.bottom), rightOver: Math.round(r.right - window.innerWidth) }; });
    console.log('SORT_PICKER', JSON.stringify(sp));
    await p.screenshot({ path: `${dir}/B1_sortpicker_${dev}.png` });
    await ctx.close();
  }

  await b.close(); srv.close();
})().catch(e => { console.error('CRASH', e); process.exit(2); });
