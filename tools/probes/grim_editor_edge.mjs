// B1 mobile — Grimuar EDITOR edge cases: wide table, long code, checklist tap,
// callout render, link modal fit, focus levels, TOC rail on narrow screens.
import { serve, launch, openApp, ensureShots } from './lib.mjs';
import { richSeed } from './seed.mjs';

const now = Date.now();

// Real markup that SURVIVES _grimSanitize (migrateNotes runs it on boot):
//  - checklist: <ul class="task"><li>/<li class="done">
//  - callout:   <div class="grim-co grim-co-warn"><div class="grim-co-body"><p>…
//  - table/pre/headings: pass through.
function seedVariant() {
  const s = richSeed();
  const L120 = 'const result = ritual.invoke(demon, { candles: 13, blood: true, moon: "full", chant: "ABRACADABRA-XYZZY-1234" });'; // ~110-120 chars, no spaces to break early
  const wideTable =
    '<h2>Реестр жертв</h2><table><thead><tr>' +
    ['Имя','Дата','Место','Час','Печать','Итог'].map(h=>`<th>${h}</th>`).join('') +
    '</tr></thead><tbody>' +
    [['Азраил','полнолуние','склеп','23:45','пентаграмма','исполнено'],
     ['Лилит','затмение','башня','00:00','гексаграмма','отложено'],
     ['Вельзевул','новолуние','катакомбы','03:13','сигил-очень-длинное-слово-без-пробелов','провал']]
      .map(r=>'<tr>'+r.map(c=>`<td>${c}</td>`).join('')+'</tr>').join('') +
    '</tbody></table>';
  s.notes.push(
    { id: 'wt', title: 'Широкая таблица 6 колонок', body: wideTable, fmt: true, color: null, createdAt: now, updatedAt: now - 100 },
    { id: 'lc', title: 'Длинный код', body: `<p>Заклинание:</p><pre><code>${L120}\nfunction summon(demon){ return invoke(demon); }\n${L120}</code></pre>`, fmt: true, color: null, createdAt: now, updatedAt: now - 200 },
    { id: 'ck', title: 'Настоящий чек-лист', body: '<p>Задачи:</p><ul class="task"><li class="done">купить чёрные свечи</li><li>найти котёл на треноге</li><li>призвать фамильяра из бездны</li></ul>', fmt: true, color: null, createdAt: now, updatedAt: now - 300 },
    { id: 'co', title: 'Каллаут-врезка', body: '<div class="grim-co grim-co-warn"><div class="grim-co-body"><p>Не читать вслух после полуночи — древние услышат.</p></div></div><p>Обычный абзац после врезки для контекста.</p>', fmt: true, color: null, createdAt: now, updatedAt: now - 400 },
    { id: 'hd', title: 'Много заголовков (TOC)', body: '<h1>Первая глава</h1><p>Вступление в ритуал.</p><h2>Подготовка</h2><p>Свечи и мел.</p><h2>Призыв</h2><p>Слова силы.</p><h3>Опасности</h3><p>Берегись.</p><h2>Завершение</h2><p>Печать.</p>', fmt: true, color: null, createdAt: now, updatedAt: now - 500 },
  );
  return s;
}

const OVERFLOW_FN = () => {
  const cw = document.documentElement.clientWidth;
  const out = [];
  document.querySelectorAll('*').forEach(el => {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.right > cw + 1) out.push({ t: el.tagName + (el.className ? '.' + String(el.className).trim().split(/\s+/).slice(0,2).join('.') : ''), right: Math.round(r.right), w: Math.round(r.width) });
  });
  return out.sort((a,b)=>b.right-a.right).slice(0,8);
};

const scrollState = () => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth });

(async () => {
  const dir = ensureShots();
  const b = await launch();

  for (const dev of ['pixel7', 'small']) {
    const { srv, port } = await serve();
    const seed = seedVariant();

    // ---- 1. WIDE TABLE ----
    {
      const { ctx, page: p } = await openApp(b, { device: dev, page: 'notes', seed, port });
      await p.waitForTimeout(300);
      await p.evaluate(() => grimOpen('wt'));
      await p.waitForTimeout(500);
      const m = await p.evaluate(() => {
        const body = document.querySelector('#grim-detail .grim-body');
        const tbl = document.querySelector('#grim-detail .grim-body table');
        const bodyR = body && body.getBoundingClientRect();
        const tblR = tbl && tbl.getBoundingClientRect();
        return {
          bodyW: bodyR ? Math.round(bodyR.width) : null,
          bodyRight: bodyR ? Math.round(bodyR.right) : null,
          tblW: tbl ? Math.round(tbl.scrollWidth) : null,
          tblClientW: tbl ? Math.round(tbl.clientWidth) : null,
          tblRight: tblR ? Math.round(tblR.right) : null,
          bodyOverflowX: body ? getComputedStyle(body).overflowX : null,
          tblOverflowX: tbl ? getComputedStyle(tbl.parentElement).overflowX : null,
          ...( { sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth } ),
        };
      });
      const of = await p.evaluate(OVERFLOW_FN);
      await p.screenshot({ path: `${dir}/B1e_table_${dev}.png` });
      console.log(`[TABLE ${dev}]`, JSON.stringify(m), 'OVF', JSON.stringify(of));
      await ctx.close();
    }

    // ---- 2. LONG CODE ----
    {
      const { ctx, page: p } = await openApp(b, { device: dev, page: 'notes', seed, port });
      await p.waitForTimeout(300);
      await p.evaluate(() => grimOpen('lc'));
      await p.waitForTimeout(400);
      const m = await p.evaluate(() => {
        const body = document.querySelector('#grim-detail .grim-body');
        const pre = document.querySelector('#grim-detail .grim-body pre');
        const preR = pre && pre.getBoundingClientRect();
        return {
          bodyW: body ? Math.round(body.getBoundingClientRect().width) : null,
          preScrollW: pre ? Math.round(pre.scrollWidth) : null,
          preClientW: pre ? Math.round(pre.clientWidth) : null,
          preRight: preR ? Math.round(preR.right) : null,
          preWhiteSpace: pre ? getComputedStyle(pre).whiteSpace : null,
          preOverflowX: pre ? getComputedStyle(pre).overflowX : null,
          codeInnerScroll: pre ? (pre.scrollWidth > pre.clientWidth + 1) : null,
          sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth,
        };
      });
      const of = await p.evaluate(OVERFLOW_FN);
      await p.screenshot({ path: `${dir}/B1e_code_${dev}.png` });
      console.log(`[CODE ${dev}]`, JSON.stringify(m), 'OVF', JSON.stringify(of));
      await ctx.close();
    }

    // ---- 3. CHECKLIST TAP ----
    {
      const { ctx, page: p } = await openApp(b, { device: dev, page: 'notes', seed, port });
      await p.waitForTimeout(300);
      await p.evaluate(() => grimOpen('ck'));
      await p.waitForTimeout(400);
      // pick the 2nd li (not done), read its box + checkbox strip
      const box = await p.evaluate(() => {
        const lis = document.querySelectorAll('#grim-detail .grim-body ul.task li');
        if (lis.length < 2) return { err: 'no task li', count: lis.length };
        const li = lis[1];
        const r = li.getBoundingClientRect();
        return { count: lis.length, doneBefore: li.classList.contains('done'), x: r.left + 8, y: r.top + r.height/2, liLeft: Math.round(r.left), liH: Math.round(r.height), liText: li.textContent };
      });
      let tapResult = box;
      if (!box.err) {
        // tap the checkbox strip (<=26px from left)
        await p.touchscreen.tap(box.x, box.y);
        await p.waitForTimeout(250);
        const after = await p.evaluate(() => {
          const li = document.querySelectorAll('#grim-detail .grim-body ul.task li')[1];
          return { doneAfter: li.classList.contains('done') };
        });
        tapResult = { ...box, ...after, toggled: box.doneBefore !== after.doneAfter };
      }
      await p.screenshot({ path: `${dir}/B1e_checklist_${dev}.png` });
      console.log(`[CHECKLIST ${dev}]`, JSON.stringify(tapResult));
      await ctx.close();
    }

    // ---- 4. CALLOUT ----
    {
      const { ctx, page: p } = await openApp(b, { device: dev, page: 'notes', seed, port });
      await p.waitForTimeout(300);
      await p.evaluate(() => grimOpen('co'));
      await p.waitForTimeout(400);
      const m = await p.evaluate(() => {
        const co = document.querySelector('#grim-detail .grim-body .grim-co');
        const cob = document.querySelector('#grim-detail .grim-body .grim-co-body');
        const r = co && co.getBoundingClientRect();
        return {
          calloutPresent: !!co,
          hasVariantClass: co ? co.className : null,
          coBodyPresent: !!cob,
          coW: r ? Math.round(r.width) : null,
          coRight: r ? Math.round(r.right) : null,
          hasBorderLeft: co ? getComputedStyle(co).borderLeftWidth : null,
          iconShown: co ? getComputedStyle(co, '::before').maskImage || getComputedStyle(co, '::before').webkitMaskImage : null,
          sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth,
        };
      });
      const of = await p.evaluate(OVERFLOW_FN);
      await p.screenshot({ path: `${dir}/B1e_callout_${dev}.png` });
      console.log(`[CALLOUT ${dev}]`, JSON.stringify(m), 'OVF', JSON.stringify(of));
      await ctx.close();
    }

    // ---- 5. LINK MODAL ----
    {
      const { ctx, page: p } = await openApp(b, { device: dev, page: 'notes', seed, port });
      await p.waitForTimeout(300);
      await p.evaluate(() => grimOpen('ck'));
      await p.waitForTimeout(400);
      // Put a selection in the body then invoke grimLink (Ctrl+K path)
      const opened = await p.evaluate(() => {
        const bo = document.getElementById('grim-body');
        if (!bo) return { err: 'no body' };
        const li = bo.querySelector('li');
        const range = document.createRange(); range.selectNodeContents(li);
        const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(range);
        grimLink();
        const modal = document.getElementById('grim-link-modal');
        return { display: modal ? modal.style.display : null };
      });
      await p.waitForTimeout(400);
      const m = await p.evaluate(() => {
        const modal = document.getElementById('grim-link-modal');
        const boxEl = modal && modal.querySelector('.modal-box, .modal-content, .modal');
        const inp = document.getElementById('grim-link-input');
        const cw = document.documentElement.clientWidth, ch = document.documentElement.clientHeight;
        const br = boxEl && boxEl.getBoundingClientRect();
        const ir = inp && inp.getBoundingClientRect();
        return {
          boxClass: boxEl ? boxEl.className : null,
          boxW: br ? Math.round(br.width) : null,
          boxH: br ? Math.round(br.height) : null,
          boxLeft: br ? Math.round(br.left) : null,
          boxRight: br ? Math.round(br.right) : null,
          boxTop: br ? Math.round(br.top) : null,
          boxBottom: br ? Math.round(br.bottom) : null,
          fitsWidth: br ? (br.left >= -1 && br.right <= cw + 1) : null,
          fitsHeight: br ? (br.top >= -1 && br.bottom <= ch + 1) : null,
          inpW: ir ? Math.round(ir.width) : null,
          inpRight: ir ? Math.round(ir.right) : null,
          cw, ch,
        };
      });
      const of = await p.evaluate(OVERFLOW_FN);
      await p.screenshot({ path: `${dir}/B1e_linkmodal_${dev}.png` });
      console.log(`[LINKMODAL ${dev}]`, 'opened=', JSON.stringify(opened), JSON.stringify(m), 'OVF', JSON.stringify(of));
      await ctx.close();
    }

    // ---- 6. FOCUS LEVELS (cycle 0->1->2) ----
    {
      const { ctx, page: p } = await openApp(b, { device: dev, page: 'notes', seed, port });
      await p.waitForTimeout(300);
      await p.evaluate(() => grimOpen('hd'));
      await p.waitForTimeout(400);
      for (const lvl of [1, 2]) {
        await p.evaluate(() => grimToggleFocus());
        await p.waitForTimeout(350);
        const m = await p.evaluate(() => {
          const layout = document.getElementById('grim-layout');
          const page = document.querySelector('#grim-detail .grim-page');
          const body = document.querySelector('#grim-detail .grim-body');
          const focusBtn = document.querySelector('.grim-focus-toggle');
          const fr = focusBtn && focusBtn.getBoundingClientRect();
          return {
            grimFocusVar: typeof grimFocus !== 'undefined' ? grimFocus : null,
            layoutCls: layout ? layout.className : null,
            focusBtnVisible: focusBtn ? (getComputedStyle(focusBtn).display !== 'none' && fr.width > 0) : null,
            focusBtnSize: fr ? `${Math.round(fr.width)}x${Math.round(fr.height)}` : null,
            bodyW: body ? Math.round(body.getBoundingClientRect().width) : null,
            sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth,
          };
        });
        const of = await p.evaluate(OVERFLOW_FN);
        await p.screenshot({ path: `${dir}/B1e_focus${lvl}_${dev}.png` });
        console.log(`[FOCUS lvl=${lvl} ${dev}]`, JSON.stringify(m), 'OVF', JSON.stringify(of));
      }
      await ctx.close();
    }

    // ---- 7. TOC on narrow screen ----
    {
      const { ctx, page: p } = await openApp(b, { device: dev, page: 'notes', seed, port });
      await p.waitForTimeout(300);
      await p.evaluate(() => grimOpen('hd'));
      await p.waitForTimeout(400);
      const m = await p.evaluate(() => {
        const page = document.querySelector('#grim-detail .grim-page');
        const tocBtn = document.querySelector('.grim-toc-toggle');
        const toc = document.getElementById('grim-toc');
        const headings = document.querySelectorAll('#grim-detail .grim-body h1, #grim-detail .grim-body h2, #grim-detail .grim-body h3').length;
        const btnCs = tocBtn ? getComputedStyle(tocBtn) : null;
        const tocCs = toc ? getComputedStyle(toc) : null;
        return {
          headings,
          tocAvailClass: page ? page.classList.contains('toc-avail') : null,
          tocBtnExists: !!tocBtn,
          tocBtnDisplay: btnCs ? btnCs.display : null,
          tocBtnVisible: tocBtn ? (btnCs.display !== 'none' && tocBtn.getBoundingClientRect().width > 0) : null,
          tocRailDisplay: tocCs ? tocCs.display : null,
        };
      });
      // try to force-open TOC and see if a rail appears
      const forced = await p.evaluate(() => {
        try { grimToggleToc(); } catch(e) { return { err: e.message }; }
        const toc = document.getElementById('grim-toc');
        const cs = toc ? getComputedStyle(toc) : null;
        return { railDisplayAfterToggle: cs ? cs.display : null, railW: toc ? Math.round(toc.getBoundingClientRect().width) : null };
      });
      await p.screenshot({ path: `${dir}/B1e_toc_${dev}.png` });
      console.log(`[TOC ${dev}]`, JSON.stringify(m), 'FORCED', JSON.stringify(forced));
      await ctx.close();
    }

    srv.close();
  }
  await b.close();
})().catch(e => { console.error('CRASH', e); process.exit(2); });
