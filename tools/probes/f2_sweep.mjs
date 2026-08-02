// F2 exhaustive sweep — surface matrix. Device via argv[2] (pixel7|small|landscape).
// Robust: each step try/catch, continues on failure. Shots → f2/sweep/<dev>_NN_name.png
import { serve, launch, openApp, ensureShots } from './lib.mjs';
import { richSeed } from './seed.mjs';
import path from 'path';

const dev = process.argv[2] || 'pixel7';
const { srv, port } = await serve();
const browser = await launch();
const dir = ensureShots('f2/sweep');

const seed = richSeed();
const t = seed.tasks.find(x => x.subtasks?.length && x.subtasksOpen);
if (t) t.subtasks[1].deadline = { mode: 'date', value: new Date(Date.now() + 2 * 864e5).toISOString().slice(0, 10), time: '12:00' };

const { ctx, page: p, errors } = await openApp(browser, { device: dev, page: 'main', seed, port });
await p.waitForTimeout(1500);
let n = 0;
const shot = async name => { n++; await p.screenshot({ path: path.join(dir, `${dev}_${String(n).padStart(2, '0')}_${name}.png`) }); console.log('shot', name); };
const step = async (name, fn) => { try { await fn(); await p.waitForTimeout(650); await shot(name); } catch (e) { console.log('FAIL', name, e.message.slice(0, 120)); } };
const esc = async () => { await p.keyboard.press('Escape'); await p.waitForTimeout(350); };

// ── main page states ──
await shot('main');
await step('typeahead', async () => { await p.tap('#input-box'); await p.keyboard.type('Ритуал !'); });
await esc(); await p.evaluate(() => { const i = document.querySelector('#input-box'); i.value = ''; i.blur(); });
await step('sheet_task', () => p.evaluate(() => document.querySelector('.btn-task-more')?.click()));
await esc();
await step('sheet_sub', () => p.evaluate(() => document.querySelector('.btn-sub-more')?.click()));
await esc();
await step('sheet_group', () => p.evaluate(() => document.querySelector('[data-act="openGroupMoreMenu"]')?.click()));
await esc();
await step('sheet_groupsort', async () => {
  await p.evaluate(() => document.querySelector('[data-act="openGroupMoreMenu"]')?.click());
  await p.waitForTimeout(500);
  await p.evaluate(() => [...document.querySelectorAll('[data-act="_groupMore"]')].find(b => b.dataset.more === 'sort')?.click());
});
await esc();
await step('sheet_tools', () => p.evaluate(() => document.querySelector('#btn-tool-more')?.click()));
await esc();
await step('sheet_sync', () => p.evaluate(() => document.querySelector('.sync-eye, .btn-sync-eye, [data-act="openSyncPanel"]')?.click()));
await esc();
// modals via task-⋯ quick bar path (deadline/repeat/prio/color) — direct global calls
const firstId = await p.evaluate(() => state.tasks.find(x => !x.checked)?.id);
await step('modal_deadline', () => p.evaluate(id => openDeadlineModal(id), firstId));
await esc();
await step('modal_repeat', () => p.evaluate(id => openRepeatModal(id), firstId));
await esc();
await step('modal_prio', () => p.evaluate(id => openPrioModal(id), firstId));
await esc();
await step('modal_color', () => p.evaluate(id => openTaskColorModal(id), firstId));
await esc();
await step('modal_templates', () => p.evaluate(() => openTemplatesModal ? openTemplatesModal() : document.querySelector('[data-act="openTemplatesModal"]')?.click()));
await esc();
await step('snooze', () => p.evaluate(() => {
  const withDl = state.tasks.find(x => x.deadline && !x.checked);
  const li = document.querySelector(`.task-item[data-id="${withDl.id}"]`);
  (li?.querySelector('.btn-task-more'))?.click();
}));
await esc();
// modes
await step('mode_schedule', () => p.evaluate(() => document.querySelector('#btn-schedule')?.click()));
await step('mode_schedule_off', () => p.evaluate(() => document.querySelector('#btn-schedule')?.click()));
await step('mode_select_bulk', async () => {
  await p.evaluate(() => document.querySelector('#btn-main-select')?.click());
  await p.waitForTimeout(400);
  await p.evaluate(() => { [...document.querySelectorAll('.task-item')].slice(0, 2).forEach(li => li.querySelector('.task-check')?.click()); });
});
await step('mode_select_off', () => p.evaluate(() => document.querySelector('#btn-main-select')?.click()));
await step('mode_split', () => p.evaluate(() => document.querySelector('#btn-split-groups')?.click()));
await step('mode_split_off', () => p.evaluate(() => document.querySelector('#btn-split-groups')?.click()));
await step('mode_focus', () => p.evaluate(() => document.querySelector('[data-act="openGroupMoreMenu"]')?.click()).then(() => p.waitForTimeout(400)).then(() => p.evaluate(() => [...document.querySelectorAll('[data-act="_groupMore"]')].find(b => b.dataset.more === 'focus')?.click())));
await step('mode_focus_off', () => p.evaluate(() => document.querySelector('[data-act="openGroupMoreMenu"]')?.click()).then(() => p.waitForTimeout(400)).then(() => p.evaluate(() => [...document.querySelectorAll('[data-act="_groupMore"]')].find(b => b.dataset.more === 'focus')?.click())));
// note open inline
await step('note_inline', () => p.evaluate(() => document.querySelector('.btn-note-toggle')?.click()));

// ── archive ──
await step('archive', () => p.evaluate(() => document.querySelector('#nav-archive, [data-page="archive"]')?.click()));
await step('archive_scrolled', () => p.evaluate(() => scrollTo(0, 600)));

// ── grimoire ──
await step('grim_list', () => p.evaluate(() => document.querySelector('#nav-notes')?.click()));
await step('grim_editor', () => p.evaluate(() => document.querySelector('.grim-note-item, .grim-list-item, .grim-note')?.click()));
await step('grim_editor_scrolled', () => p.evaluate(() => scrollTo(0, 400)));

// ── empty state ──
await step('empty', () => p.evaluate(() => { state.tasks = []; state.groups = []; render(); }));

if (errors.length) console.log('CONSOLE ERRORS:', errors.slice(0, 10)); else console.log('no console errors');
await ctx.close(); await browser.close(); srv.close();
console.log('done', dev);
