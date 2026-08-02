// W2-6 / V2-B5-02 — MEASUREMENT FIRST (audit lied twice already).
// Claim: collapsed #extra-fields (max-height:0) keeps ~40 controls in the tab
// order, and they come BEFORE #btn-expand. Verify by real Tab walk on dist.
import { serve, launch, openApp } from './lib.mjs';
import { richSeed } from './seed.mjs';

const DESKTOP = { width: 1280, height: 900, deviceScaleFactor: 1, isMobile: false, hasTouch: false,
                  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36' };

const { srv, port } = await serve();
const browser = await launch();
const { page, errors } = await openApp(browser, { device: DESKTOP, page: 'main', seed: richSeed(), port });
await page.waitForTimeout(600);

const desc = el => el;

async function snapshot(label) {
  return await page.evaluate(() => {
    const ef = document.getElementById('extra-fields');
    const cs = getComputedStyle(ef);
    const SEL = 'a[href],button,input,select,textarea,[tabindex]:not([tabindex="-1"]),[contenteditable="true"]';
    const all = [...ef.querySelectorAll(SEL)];
    const enabled = all.filter(e => !e.disabled && e.tabIndex > -1);
    return {
      maxHeight: cs.maxHeight, display: cs.display, visibility: cs.visibility,
      opacity: cs.opacity, height: ef.getBoundingClientRect().height,
      inert: ef.hasAttribute('inert'), hidden: ef.hasAttribute('hidden'),
      focusableCount: enabled.length,
      openClass: ef.classList.contains('open'),
      btnExpandOpen: document.getElementById('btn-expand').classList.contains('open'),
    };
  });
}

// Tab walk from the top of the document.
async function tabWalk(n) {
  await page.evaluate(() => { document.body.focus?.(); (document.activeElement||{}).blur?.(); });
  await page.click('h1, header, .todo-app', { position: { x: 2, y: 2 } }).catch(()=>{});
  await page.evaluate(() => { const a = document.activeElement; if (a && a.blur) a.blur(); });
  const seq = [];
  for (let i = 0; i < n; i++) {
    await page.keyboard.press('Tab');
    const info = await page.evaluate(() => {
      const a = document.activeElement;
      if (!a || a === document.body) return { tag: 'BODY' };
      const ef = document.getElementById('extra-fields');
      const r = a.getBoundingClientRect();
      return {
        tag: a.tagName, id: a.id || '', cls: (a.className || '').toString().slice(0, 48),
        inEF: !!(ef && ef.contains(a)),
        w: Math.round(r.width), h: Math.round(r.height),
      };
    });
    seq.push(info);
  }
  return seq;
}

const collapsed = await snapshot();
const seqC = await tabWalk(60);
const firstEF = seqC.findIndex(s => s.inEF);
const idxExpand = seqC.findIndex(s => s.id === 'btn-expand');
const inEFcount = seqC.filter(s => s.inEF).length;

console.log('--- COLLAPSED ---');
console.log(JSON.stringify(collapsed));
console.log('tab stops inside #extra-fields:', inEFcount, '| first at press#', firstEF + 1, '| btn-expand at press#', idxExpand + 1);
if (firstEF >= 0) console.log('  first inner stop:', JSON.stringify(seqC[firstEF]));
console.log('seq:', seqC.map((s, i) => `${i + 1}:${s.inEF ? '**' : ''}${s.id || s.tag}${s.cls ? '.' + s.cls.split(' ')[0] : ''}`).join(' '));

// Now open the panel and confirm all controls reachable
await page.click('#btn-expand');
await page.waitForTimeout(700);
const opened = await snapshot();
const seqO = await tabWalk(80);
console.log('--- EXPANDED ---');
console.log(JSON.stringify(opened));
console.log('tab stops inside #extra-fields:', seqO.filter(s => s.inEF).length, '/ focusable', opened.focusableCount);

// ── re-collapse while focus sits INSIDE the panel ──────────────────────────
await page.focus('#task-note');
await page.click('#btn-expand');
await page.waitForTimeout(700);
const reclosed = await snapshot();
const af = await page.evaluate(() => {
  const a = document.activeElement;
  return { id: a && a.id, inEF: !!document.getElementById('extra-fields').contains(a) };
});
const seqR = await tabWalk(45);
console.log('--- RE-COLLAPSED ---');
console.log(JSON.stringify(reclosed), '| activeElement after close:', JSON.stringify(af));
console.log('tab stops inside:', seqR.filter(s => s.inEF).length);

// ── boot with the panel restored open (expandOpen=1) ───────────────────────
const ctx2 = await openApp(browser, { device: DESKTOP, page: 'main', seed: richSeed(), port,
  extraInit: () => { localStorage.setItem('expandOpen', '1'); } });
await ctx2.page.waitForTimeout(700);
const boot = await ctx2.page.evaluate(() => {
  const ef = document.getElementById('extra-fields');
  return { inert: ef.hasAttribute('inert'), maxHeight: getComputedStyle(ef).maxHeight,
           h: Math.round(ef.getBoundingClientRect().height), vis: getComputedStyle(ef).visibility };
});
console.log('--- BOOT expandOpen=1 ---', JSON.stringify(boot));

const verdict = [];
verdict.push([`collapsed: no tab stop inside`, inEFcount === 0]);
verdict.push([`expanded: reachable`, seqO.filter(s => s.inEF).length > 0]);
verdict.push([`re-collapse: inert back on`, reclosed.inert === true]);
verdict.push([`re-collapse: focus parked on btn-expand`, af.id === 'btn-expand']);
verdict.push([`re-collapse: no tab stop inside`, seqR.filter(s => s.inEF).length === 0]);
verdict.push([`boot restored open: not inert, visible`, boot.inert === false && boot.h > 100]);
console.log('--- VERDICT ---');
for (const [n, ok] of verdict) console.log((ok ? 'PASS ' : 'FAIL ') + n);
if (errors.length) console.log('console errors:', errors.slice(0, 5));

await browser.close(); srv.close();
