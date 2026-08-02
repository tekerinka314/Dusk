// S4/B6 P11 — quick-add parser sibling sweep + battery. FIRST: does the \b-after-
// Cyrillic defect (B1-11, priority regex 08:38) also infect the % date (08:43, uses
// \S+) and * tag (07:1197, uses [\wа-яёА-ЯЁ]+u) siblings? Then the full battery.
import { serve, launch, ROOT } from './lib.mjs';
import fs from 'fs';

const OUT = 'D:/VSCode projects/DUSK_v2.0/audit-v2/shots/s4/p11_quickadd.json';

(async () => {
  const { srv, port } = await serve(ROOT);
  const browser = await launch();
  const ctx = await browser.newContext({ colorScheme: 'dark' });
  const page = await ctx.newPage();
  await page.goto(`http://localhost:${port}/index.html`, { waitUntil: 'load' });
  await page.waitForTimeout(500);

  const out = await page.evaluate(() => {
    const P = window.parseQuickInput, ET = window.extractTags;
    const pq = (s) => { const r = P(s); return { text: r.text, priority: r.priority, deadline: r.deadline ? r.deadline.mode + ':' + (r.deadline.value || '') : null }; };
    return {
      parserPresent: typeof P === 'function', tagPresent: typeof ET === 'function',
      // ── SIBLING SWEEP ──
      prio_ru_vysokij: pq('x !высокий'),      // B1-11: expect priority null (BROKEN)
      prio_ru_vys:     pq('x !выс'),
      prio_en_high:    pq('x !high'),          // expect high, stripped
      prio_en_h:       pq('x !h'),
      date_ru_zavtra:  pq('x %завтра'),        // sibling: expect date (\S+ safe)
      date_ru_segodnya:pq('x %сегодня'),
      tag_ru:          ET('купить *молоко *хлеб'),  // sibling: expect [*молоко,*хлеб]
      tag_ru_single:   ET('*тег'),
      // ── DATE BATTERY ──
      d_pn:   pq('x %пн'),        // weekday → weektime
      d_15:   pq('x %15'),        // bare day → date
      d_dm:   pq('x %12.07'),     // dd.mm → date
      d_rel:  pq('x %+3d'),       // +Nd → date
      d_relru:pq('x %+2нед'),     // +N weeks (ru)
      d_time: pq('x %20:30'),     // HH:MM → time
      d_junk: pq('x %мусор'),     // junk → null, token kept
      // ── COMBINED + FALSE TRIGGERS ──
      combined:  pq('задача !high *работа %завтра'),   // prio+tag+date
      false_pct: pq('скидка 50%'),                     // 50% must NOT parse as date
      false_bang:pq('это важно!'),                     // trailing ! must NOT parse as prio
      multitag:  ET('*a *b *a *В *в'),                 // dedup + lowercase
    };
  });

  fs.writeFileSync(OUT, JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));
  await browser.close(); srv.close();
})().catch(e => { console.error('PROBE ERROR', e); process.exit(1); });
