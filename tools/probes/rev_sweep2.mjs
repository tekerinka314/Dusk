// Добор состояний, которые первый свип не открыл: снуз, хранилище, три панели
// массовых действий, ⋯-меню звена на десктопе, пустой зов Гримуара, тост.
import fs from 'node:fs';
import { serve, launch, openApp } from './lib.mjs';
import { richSeed } from './seed.mjs';

const OUT = 'D:/tmp/pw/b1/rev';
const DESKTOP = { width: 1280, height: 900, deviceScaleFactor: 1, isMobile: false, hasTouch: false,
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36' };
const MOBILE = { width: 412, height: 915, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
  userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36' };

const STATES = [
  { n: 'A_snooze',    page: 'main', dev: MOBILE, act: async p => { await p.evaluate(`_openSnoozeMenuAt(document.querySelector('.btn-snooze'), 2)`); } },
  { n: 'B_storage',   page: 'main', dev: MOBILE, act: async p => { await p.evaluate(`document.querySelector('#btn-tool-more').click()`); } },
  { n: 'C_mainbulk',  page: 'main', dev: MOBILE, act: async p => { await p.evaluate(`toggleMainSelectMode(); toggleMainSelectTask(1); toggleMainSelectTask(2);`); } },
  { n: 'D_cryptbulk', page: 'archive', dev: MOBILE, act: async p => { await p.evaluate(`toggleSelectMode(); toggleArchiveSelection(90);`); } },
  { n: 'E_grimbulk',  page: 'notes', dev: MOBILE, act: async p => { await p.evaluate(`grimToggleSelectMode(); grimToggleSelectNote('n1');`); } },
  { n: 'F_submore',   page: 'main', dev: DESKTOP, act: async p => {
      await p.hover('.subtask-item, .sub-item, li.subtask').catch(() => {});
      await p.waitForTimeout(250);
      await p.evaluate(`document.querySelector('.btn-sub-more')?.click()`); } },
  { n: 'G_grimzov',   page: 'notes', dev: MOBILE, act: async p => {
      await p.fill('#notes-search-box', 'ъъъ').catch(async () => { await p.evaluate(`{const i=document.querySelector('#notes-search-box'); i.value='ъъъ'; i.dispatchEvent(new Event('input',{bubbles:true}));}`); });
      await p.waitForTimeout(400); } },
  { n: 'H_toast_pin', page: 'main', dev: MOBILE, act: async p => { await p.evaluate(`togglePin(3)`); } },
  { n: 'I_toast_del', page: 'main', dev: MOBILE, act: async p => { await p.evaluate(`archiveTask ? archiveTask(3) : 0`); } },
  { n: 'J_toast_sub', page: 'main', dev: MOBILE, act: async p => { await p.evaluate(`promoteSubtask ? promoteSubtask(1, (state.tasks[0].subtasks[0]||{}).id) : 0`); } },
];

const { srv, port } = await serve();
const browser = await launch();
for (const st of STATES) {
  let ctx, p, errs;
  try {
    ({ ctx, page: p, errors: errs } = await openApp(browser, { device: st.dev, page: st.page, seed: richSeed(), port }));
    await p.waitForTimeout(450);
    let err = null;
    try { await st.act(p); } catch (e) { err = e.message.split('\n')[0].slice(0, 100); }
    await p.waitForTimeout(500);
    await p.screenshot({ path: `${OUT}/${st.n}.png` });
    const txt = await p.evaluate(() => {
      const pick = (sel) => [...document.querySelectorAll(sel)].filter(e => e.checkVisibility?.())
        .map(e => e.innerText.trim().replace(/\n+/g, ' | ')).filter(Boolean);
      return {
        menu: pick('.snooze-menu, .float-menu, .dropdown-menu, .sort-picker'),
        bars: pick('#main-select-bar, #archive-select-bar, #grim-select-bar'),
        toast: pick('.toast, #toast, .toast-wrap'),
        empty: pick('.grim-empty, .grim-list-none, #empty-state, #all-done'),
      };
    });
    console.log(`### ${st.n}${err ? '  ACT_ERR ' + err : ''}${errs.length ? '  JSERR ' + errs[0].slice(0, 60) : ''}`);
    for (const [k, v] of Object.entries(txt)) if (v.length) console.log(`  ${k}: ${v.join('  ||  ')}`);
  } catch (e) { console.log(`### ${st.n}  CRASH ${e.message.split('\n')[0].slice(0, 110)}`); }
  if (ctx) await ctx.close();
}
await browser.close(); srv.close();
