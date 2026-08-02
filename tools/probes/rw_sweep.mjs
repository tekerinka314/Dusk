// Full mobile surface sweep — viewport screenshots of EVERY surface/state.
// Fable self-review pass: shots go to shots/rework/sweep/, reviewed visually.
// v2: page navigation via REAL tab clicks (localStorage+reload doesn't survive
// the IDB-first boot), empty state via a fresh context, + schedule-mode shot.
import { serve, launch, openApp, ensureShots } from './lib.mjs';
import { richSeed } from './seed.mjs';
import path from 'path';

const { srv, port } = await serve();
const browser = await launch();
const dir = ensureShots('rework/sweep');
const seed = richSeed();
const dev = process.argv[2] || 'pixel7';

const { ctx, page: p, errors } = await openApp(browser, { device: dev, page: 'main', seed, port });
await p.waitForTimeout(2800);

const shot = async name => { await p.screenshot({ path: path.join(dir, `${dev}_${name}.png`) }); console.log('shot', name); };

// 1. top: header + tabs + progress + new-task + params collapsed
await shot('01_top');
// 2. params expanded
await p.evaluate(() => { const b = document.querySelector('[data-act="toggleExpand"], #expand-toggle, .expand-toggle'); if (b) b.click(); else toggleExpand(); });
await p.waitForTimeout(600);
await shot('02_params');
// 3. quick-add form extra fields (params panel content bottom)
await p.evaluate(() => scrollTo(0, 300));
await p.waitForTimeout(300);
await shot('03_params_scrolled');
// close params
await p.evaluate(() => { try { toggleExpand(); } catch {} });
await p.waitForTimeout(400);

// 4. list areas at several scroll depths
await p.evaluate(() => scrollTo(0, 0));
await p.waitForTimeout(200);
const H = await p.evaluate(() => document.documentElement.scrollHeight - innerHeight);
for (let i = 1; i <= 5; i++) {
  await p.evaluate(y => scrollTo(0, y), Math.round(H * i / 5));
  await p.waitForTimeout(250);
  await shot(`04_list_${i}`);
}

// 5. templates popover
await p.evaluate(() => scrollTo(0, 0));
await p.waitForTimeout(300);
const tplBtn = await p.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => /ШАБЛОНЫ/i.test(x.textContent || '')); if (b) { b.click(); return true; } return false; });
await p.waitForTimeout(400);
if (tplBtn) await shot('05_templates');
await p.keyboard.press('Escape'); await p.waitForTimeout(200);

// 6. sync panel (sheet on coarse)
await p.evaluate(() => { const e = document.querySelector('.sync-glyph'); if (e) e.click(); });
await p.waitForTimeout(500);
await shot('06_syncpanel');
await p.keyboard.press('Escape'); await p.waitForTimeout(300);

// 6b. schedule (deadline) view mode — dl-side-panel on cards
await p.evaluate(() => { const b = document.querySelector('#btn-schedule, [data-act="toggleScheduleMode"], [data-act="toggleDeadlineMode"]'); if (b) b.click(); });
await p.waitForTimeout(700);
await shot('06b_schedule');
await p.evaluate(() => scrollTo(0, 500)); await p.waitForTimeout(250);
await shot('06c_schedule_mid');
await p.evaluate(() => { const b = document.querySelector('#btn-schedule.active, [data-act="toggleScheduleMode"].active, [data-act="toggleDeadlineMode"].active'); if (b) b.click(); });
await p.waitForTimeout(500);

// 7. archive — real tab click
await p.evaluate(() => scrollTo(0, 0));
await p.evaluate(() => document.getElementById('nav-archive')?.click());
await p.waitForTimeout(900);
await shot('07_archive_top');
await p.evaluate(() => scrollTo(0, 600)); await p.waitForTimeout(250);
await shot('08_archive_mid');

// 8. grimoire list — real tab click
await p.evaluate(() => document.getElementById('nav-notes')?.click());
await p.waitForTimeout(900);
await shot('09_grim_list');
// 9. grimoire note detail (open first note if any / create one)
const hasNote = await p.evaluate(() => {
  const leaf = document.querySelector('.grim-leaf, [data-act="grimOpen"]');
  if (leaf) { leaf.click(); return true; }
  const nb = document.getElementById('grim-new-btn'); if (nb) { nb.click(); return true; }
  return false;
});
await p.waitForTimeout(800);
if (hasNote) {
  await shot('10_grim_note');
  await p.evaluate(() => scrollTo(0, 400)); await p.waitForTimeout(250);
  await shot('11_grim_note_scrolled');
}

// 10. empty state — fresh context with an empty seed (reload path doesn't
// survive the IDB-first boot; a clean context does).
const emptySeed = richSeed();
emptySeed.tasks = []; emptySeed.groups = [];
const { ctx: ctx2, page: p2 } = await openApp(browser, { device: dev, page: 'main', seed: emptySeed, port });
await p2.waitForTimeout(2200);
await p2.screenshot({ path: path.join(dir, `${dev}_12_empty.png`) });
console.log('shot 12_empty');
await ctx2.close();

if (errors.length) console.log('CONSOLE ERRORS:', errors.slice(0, 8));
await ctx.close();
await browser.close();
srv.close();
