import { serve, launch, openApp, ensureShots } from './lib.mjs';
import { richSeed, perfSeed } from './seed.mjs';

const emptySeed = () => ({ tasks: [], groups: [], archive: [], notes: [], notesArchive: [], tombstones: [], templates: [], nextId: 1, nextGroupId: 1, nextSubId: 1, sortMode: 'priority', sortModeOverrides: {}, subAnyMode: false });
const allDoneSeed = () => { const s = richSeed(); s.tasks.forEach(t => { t.checked = true; (t.subtasks || []).forEach(x => x.checked = true); }); return s; };
const PATCH = '.task-head{flex-wrap:wrap!important} .task-actions{flex-basis:100%!important;margin-top:6px!important;justify-content:flex-start!important;opacity:1!important}';

const JOBS = [
  { name: 'main_patched',   page: 'main',   seed: richSeed,  patch: true },
  { name: 'main_empty',     page: 'main',   seed: emptySeed },
  { name: 'main_alldone',   page: 'main',   seed: allDoneSeed, patch: true },
  { name: 'main_schedule',  page: 'main',   seed: richSeed,  patch: true, setup: 'toggleScheduleMode()' },
  { name: 'main_today',     page: 'main',   seed: richSeed,  patch: true, setup: 'toggleTodayMode()' },
  { name: 'main_select',    page: 'main',   seed: richSeed,  patch: true, setup: 'toggleMainSelectMode()' },
  { name: 'main_expand',    page: 'main',   seed: richSeed,  setup: 'toggleExpand()' },
  { name: 'archive',        page: 'archive', seed: richSeed },
  { name: 'notes_list',     page: 'notes',  seed: richSeed },
  { name: 'notes_crypt',    page: 'notes',  seed: richSeed,  setup: "grimSetMode('archive')" },
];

(async () => {
  const dir = ensureShots();
  const { srv, port } = await serve();
  const b = await launch();
  const out = [];
  for (const dev of ['pixel7', 'small']) {
    for (const j of JOBS) {
      if (dev === 'small' && !['main_patched', 'main_expand', 'archive', 'notes_list'].includes(j.name)) continue;
      const { ctx, page: p } = await openApp(b, { device: dev, page: j.page, seed: j.seed(), port });
      if (j.patch) await p.addStyleTag({ content: PATCH });
      if (j.setup) { try { await p.evaluate(j.setup); } catch (e) { out.push(`${j.name}/${dev} SETUP_ERR ${e.message}`); } }
      await p.waitForTimeout(700);
      const m = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, sh: document.body.scrollHeight }));
      await p.screenshot({ path: `${dir}/B1_${j.name}_${dev}.png` });
      out.push(`${j.name}/${dev}: scrollW=${m.sw} clientW=${m.cw} hOverflow=${m.sw > m.cw ? 'YES(' + (m.sw - m.cw) + ')' : 'no'} scrollH=${m.sh}`);
      await ctx.close();
    }
  }
  console.log(out.join('\n'));
  await b.close(); srv.close();
})().catch(e => { console.error('CRASH', e); process.exit(2); });
