// S4/B6 P4 — quota / storage-failure honesty. saveState() (01:1038) writes LS with
// NO try/catch and NO user messaging. A QuotaExceededError throws uncaught → is the
// edit silently lost with no toast? (rule #1: silent loss = finding)
import { serve, launch, ROOT } from './lib.mjs';
import { richSeed } from './seed.mjs';
import fs from 'fs';

const OUT = 'D:/VSCode projects/DUSK_v2.0/audit-v2/shots/s4/p4_quota.json';
const results = [];
const rec = (n, p, d) => results.push({ name: n, pass: p, detail: d });

(async () => {
  const { srv, port } = await serve(ROOT);
  const browser = await launch();
  const base = richSeed();

  const ctx = await browser.newContext({ colorScheme: 'dark' });
  const sp = await ctx.newPage();
  await sp.goto(`http://localhost:${port}/__seed__`, { waitUntil: 'load' }).catch(() => {});
  await sp.evaluate((s) => { localStorage.clear(); localStorage.setItem('duskState_v4', JSON.stringify(s)); localStorage.setItem('currentPage', 'main'); }, base);
  await sp.close();

  const page = await ctx.newPage();
  const pageErrors = [];
  page.on('pageerror', e => pageErrors.push(e.message));
  await page.goto(`http://localhost:${port}/index.html`, { waitUntil: 'load' });
  await page.waitForTimeout(600);

  // Patch setItem to throw a QuotaExceededError for the main state key AFTER boot,
  // then perform an edit that routes through saveState, and observe the outcome.
  const obs = await page.evaluate(() => {
    const orig = localStorage.setItem.bind(localStorage);
    localStorage.setItem = (k, v) => {
      if (k === 'duskState_v4') throw new DOMException('Quota exceeded', 'QuotaExceededError');
      return orig(k, v);
    };
    let threw = null;
    try {
      window.state.tasks[0].text = 'QUOTA-EDIT';
      window.saveState();
    } catch (e) { threw = e.name || String(e); }
    // any user-visible toast?
    const toastEls = [...document.querySelectorAll('.toast, #toast, [class*="toast"], [class*="Toast"]')]
      .filter(el => el.offsetParent !== null && el.textContent.trim());
    const toastText = toastEls.map(el => el.textContent.trim()).join(' | ') || null;
    localStorage.setItem = orig;   // restore so reload works
    return { threw, toastText };
  });

  // reload (quota restored) → did the edit survive?
  await page.goto(`http://localhost:${port}/index.html`, { waitUntil: 'load' });
  await page.waitForTimeout(600);
  const survived = await page.evaluate(() => {
    const ls = JSON.parse(localStorage.getItem('duskState_v4'));
    return ls.tasks.some(t => t.text === 'QUOTA-EDIT');
  });

  const silentLoss = survived === false && !obs.toastText;
  rec('P4 quota on saveState = silent loss (no toast, edit gone)', silentLoss,
    `threw=${obs.threw} toast=${obs.toastText} survivedReload=${survived} pageErrors=${pageErrors.length}`);

  await ctx.close();
  await browser.close();
  srv.close();
  fs.writeFileSync(OUT, JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
})().catch(e => { console.error('PROBE ERROR', e); process.exit(1); });
