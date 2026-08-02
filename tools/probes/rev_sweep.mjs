// Прод-ревью за юзера: обход всех экранов после свипов языка (билды -27-5…-28-6).
// На каждом состоянии: скриншот + автодетекторы (переполнение, обрезка текста,
// нерезолвнутые <use>, ошибки консоли) + дамп видимого текста.
import fs from 'node:fs';
import { serve, launch, openApp } from './lib.mjs';
import { richSeed } from './seed.mjs';

const OUT = 'D:/tmp/pw/b1/rev';
fs.mkdirSync(OUT, { recursive: true });

const DESKTOP = { width: 1280, height: 900, deviceScaleFactor: 1, isMobile: false, hasTouch: false,
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36' };
const MOBILE = { width: 412, height: 915, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
  userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36' };

const ev = (expr) => async (p) => { await p.evaluate(expr); };
const clk = (sel) => async (p) => { await p.click(sel, { force: true, timeout: 2500 }); };

const QUAR_SEED = `(() => {
  const t = (state.tasks || [])[0] || {}, g = (state.groups || [])[0] || {}, now = Date.now();
  state.syncJournal = [
    { uid:'q1', kind:'field', recType:'tasks', recUid:t.uid, field:'text', loser:'Старый заголовок обета', at:now, resolved:false },
    { uid:'q2', kind:'field', recType:'tasks', recUid:t.uid, field:'priority', loser:'high', at:now, resolved:false },
    { uid:'q4', kind:'field', recType:'tasks', recUid:t.uid, field:'repeat', loser:'weekdays', at:now, resolved:false },
    { uid:'q6', kind:'field', recType:'groups', recUid:g.uid, field:'name', loser:'Старое название', at:now, resolved:false },
    { uid:'q8', kind:'subtask', parentUid:t.uid, loser:{ text:'Звено с другого устройства' }, at:now, resolved:false },
    { uid:'q9', kind:'delete-vs-edit', recType:'tasks', loser:{ text:'Уничтоженный обет' }, at:now, resolved:false },
    { uid:'q10', kind:'note-both', recType:'notes', loser:{ body:'Вторая копия записи' }, at:now, resolved:false },
  ];
  openQuarantine();
})()`;

const STATES = [
  { n: '01_main',        page: 'main' },
  { n: '02_conditions',  page: 'main', act: ev('toggleExpand()') },
  { n: '03_taskmore',    page: 'main', act: clk('.btn-task-more') },
  { n: '04_submore',     page: 'main', act: ev('document.querySelector(".btn-sub-more").click()') },
  { n: '05_snooze',      page: 'main', act: clk('.btn-snooze') },
  { n: '06_groupmore',   page: 'main', act: clk('.btn-group-action') },
  { n: '07_storage',     page: 'main', act: ev('(document.querySelector("#btn-tool-more")?.offsetParent ? document.querySelector("#btn-tool-more").click() : 0)') },
  { n: '08_sort',        page: 'main', act: ev('document.querySelector("#btn-sort-mode").click()') },
  { n: '09_select',      page: 'main', act: ev('toggleMainSelectMode()') },
  { n: '10_selectall',   page: 'main', act: async (p) => { await p.evaluate('toggleMainSelectMode()'); await p.waitForTimeout(200);
                                                            await p.evaluate('document.querySelectorAll(".task-item").forEach((el,i)=>{ if(i<3) el.click(); })'); } },
  { n: '11_focusmode',   page: 'main', act: ev('toggleFilter()') },
  { n: '12_schedule',    page: 'main', act: ev('toggleScheduleMode()') },
  { n: '13_m_deadline',  page: 'main', act: ev('openDeadlineModal(1)') },
  { n: '14_m_repeat',    page: 'main', act: ev('openRepeatModal(4)') },
  { n: '15_m_prio',      page: 'main', act: ev('openPrioModal(1)') },
  { n: '16_m_color',     page: 'main', act: ev('openTaskColorModal(1)') },
  { n: '17_m_group',     page: 'main', act: ev('showAddGroupModal()') },
  { n: '18_m_rename',    page: 'main', act: ev('openRenameGroupModal(10)') },
  { n: '19_m_templates', page: 'main', act: ev('openTemplatesModal()') },
  { n: '20_m_colorfilt', page: 'main', act: ev('openColorFilterModal()') },
  { n: '21_m_note',      page: 'main', act: ev('openNoteModal(12)') },
  { n: '22_crypt',       page: 'archive' },
  { n: '23_crypt_sel',   page: 'archive', act: ev('toggleArchiveSelection()') },
  { n: '24_grim',        page: 'notes' },
  { n: '25_grim_crypt',  page: 'notes', act: ev("grimSetMode('archive')") },
  { n: '26_grim_sel',    page: 'notes', act: ev('toggleSelectMode()') },
  { n: '27_export',      page: 'main', act: ev('document.querySelector("#btn-export").click()') },
  { n: '28_sync',        page: 'main', act: ev('openSyncPanel()') },
  { n: '29_quar',        page: 'main', act: ev(QUAR_SEED) },
  { n: '30_hint',        page: 'main', act: ev('toggleShortcutsHint()') },
];

const PROBE = () => {
  const vw = window.innerWidth;
  const clipped = [], outside = [], deadUse = [];
  for (const el of document.querySelectorAll('body *')) {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) continue;
    if (el.checkVisibility && !el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) {
      if (el.tagName.toLowerCase() === 'svg' && el.querySelector('use')) {
        deadUse.push((el.querySelector('use').getAttribute('href') || '?') + ' @ ' + (el.parentElement?.className || '?'));
      }
      continue;
    }
    // текст обрезан своим же контейнером
    const own = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
    if (own && el.scrollWidth > el.clientWidth + 1 && cs.overflowX !== 'visible' && cs.overflowX !== 'auto' && cs.overflowX !== 'scroll') {
      clipped.push({ t: el.textContent.trim().slice(0, 46), cls: (el.className || '').toString().slice(0, 34), sw: el.scrollWidth, cw: el.clientWidth });
    }
    // вылез за правый край вьюпорта
    if (r.right > vw + 1 && r.width < vw * 1.5 && cs.position !== 'fixed') {
      const txt = el.textContent.trim().slice(0, 40);
      if (txt) outside.push({ t: txt, cls: (el.className || '').toString().slice(0, 34), right: Math.round(r.right) });
    }
  }
  const dedup = (a, k) => { const s = new Set(); return a.filter(x => { const v = k(x); if (s.has(v)) return false; s.add(v); return true; }); };
  return {
    hScroll: document.documentElement.scrollWidth > vw + 1 ? document.documentElement.scrollWidth : 0,
    clipped: dedup(clipped, x => x.t + x.cls).slice(0, 14),
    outside: dedup(outside, x => x.t + x.cls).slice(0, 10),
    deadUse: [...new Set(deadUse)].slice(0, 10),
    text: (document.body.innerText || '').replace(/\n{2,}/g, '\n').trim(),
  };
};

const { srv, port } = await serve();
const browser = await launch();
const report = {};

for (const [devName, dev] of [['m', MOBILE], ['d', DESKTOP]]) {
  for (const st of STATES) {
    const key = `${st.n}/${devName}`;
    let ctx, p, errs;
    try {
      ({ ctx, page: p, errors: errs } = await openApp(browser, { device: dev, page: st.page, seed: richSeed(), port }));
      await p.waitForTimeout(450);
      if (st.act) { try { await st.act(p); } catch (e) { report[key] = { ACT_ERR: e.message.split('\n')[0].slice(0, 90) }; } }
      await p.waitForTimeout(550);
      const res = await p.evaluate(PROBE);
      await p.screenshot({ path: `${OUT}/${st.n}_${devName}.png` });
      report[key] = Object.assign(report[key] || {}, res, { errs: errs.slice(0, 3) });
    } catch (e) {
      report[key] = { CRASH: e.message.split('\n')[0].slice(0, 120) };
    }
    if (ctx) await ctx.close();
  }
}

await browser.close(); srv.close();
fs.writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 1));

// краткая сводка в stdout
for (const [k, v] of Object.entries(report)) {
  const bits = [];
  if (v.CRASH) bits.push('CRASH ' + v.CRASH);
  if (v.ACT_ERR) bits.push('ACT_ERR ' + v.ACT_ERR);
  if (v.hScroll) bits.push('hScroll=' + v.hScroll);
  if (v.clipped?.length) bits.push('clipped:' + v.clipped.length);
  if (v.outside?.length) bits.push('outside:' + v.outside.length);
  if (v.deadUse?.length) bits.push('deadUse:' + v.deadUse.length);
  if (v.errs?.length) bits.push('jsErr:' + v.errs.length);
  if (bits.length) console.log(k.padEnd(20) + bits.join(' · '));
}
console.log('--- готово, отчёт: ' + OUT + '/report.json');
