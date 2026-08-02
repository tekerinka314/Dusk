// W2-5 / V2-B5-03 — MEASUREMENT FIRST. The audit read border-color off the <input>
// itself, but most fields here have border:none and their focus highlight lives on a
// wrapper (.row:focus-within, .search-wrap:focus-within, .grim-search-wrap). Same
// class of error the contrast probe made with opacity — so measure before fixing:
// for every text field, real-Tab into it and record outline / box-shadow / border on
// BOTH the field and its nearest bordered ancestor, plus the contrast of the focused
// border against the surfaces on either side of it.
import { serve, launch, openApp } from './lib.mjs';
import { richSeed } from './seed.mjs';

const DESKTOP = { width: 1280, height: 900, deviceScaleFactor: 1, isMobile: false, hasTouch: false,
                  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36' };

const { srv, port } = await serve();
const browser = await launch();
const { page, errors } = await openApp(browser, { device: DESKTOP, page: 'main', seed: richSeed(), port });

await page.addScriptTag({ content: `
window.__fx = (function () {
  const px = c => { const m = String(c).match(/[\\d.]+/g) || []; return { r:+m[0]||0, g:+m[1]||0, b:+m[2]||0, a: m[3] === undefined ? 1 : +m[3] }; };
  const over = (fg, bg) => ({ r: fg.r*fg.a + bg.r*(1-fg.a), g: fg.g*fg.a + bg.g*(1-fg.a), b: fg.b*fg.a + bg.b*(1-fg.a), a: 1 });
  const lum = c => { const f = v => { v/=255; return v <= 0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055, 2.4); };
                     return 0.2126*f(c.r) + 0.7152*f(c.g) + 0.0722*f(c.b); };
  const ratio = (a, b) => { const l1 = lum(a), l2 = lum(b); const hi = Math.max(l1,l2), lo = Math.min(l1,l2); return (hi+0.05)/(lo+0.05); };
  // walk up compositing every non-transparent background, honouring opacity
  const surface = el => {
    let acc = null, node = el;
    const stack = [];
    while (node && node.nodeType === 1) {
      const cs = getComputedStyle(node);
      const bg = px(cs.backgroundColor);
      const op = parseFloat(cs.opacity);
      if (bg.a > 0) stack.push({ r:bg.r, g:bg.g, b:bg.b, a: bg.a * (isNaN(op) ? 1 : op) });
      node = node.parentElement;
    }
    stack.push({ r:10, g:4, b:32, a:1 });   // page floor
    acc = stack.pop();
    while (stack.length) acc = over(stack.pop(), acc);
    return acc;
  };
  return { px, over, lum, ratio, surface };
})();
` });

const FIELDS = [
    ['#input-box',        'быстрый ввод задачи'],
    ['#search-box',       'поиск задач'],
    ['#form-sub-input',   'подпункт в форме'],
];

const read = (sel) => page.evaluate((sel) => {
    const F = window.__fx;
    const el = document.querySelector(sel);
    if (!el) return { missing: true };
    // nearest ancestor (incl. self) that actually paints a border
    let owner = el;
    while (owner && owner.nodeType === 1) {
        const w = parseFloat(getComputedStyle(owner).borderTopWidth);
        if (w > 0) break;
        owner = owner.parentElement;
    }
    owner = owner || el;
    const cs = getComputedStyle(el), co = getComputedStyle(owner);
    const border = F.px(co.borderTopColor);
    const inside = F.surface(owner);                       // field fill
    const outside = F.surface(owner.parentElement || document.body);
    const solid = F.over(border, inside);
    return {
        owner: owner === el ? 'self' : (owner.className || owner.tagName),
        focused: document.activeElement === el,
        focusVisible: (() => { try { return el.matches(':focus-visible'); } catch { return null; } })(),
        elOutline: cs.outlineStyle === 'none' ? 'none' : `${cs.outlineWidth} ${cs.outlineColor}`,
        elShadow: cs.boxShadow === 'none' ? 'none' : cs.boxShadow.slice(0, 60),
        ownerBorder: co.borderTopColor,
        ownerShadow: co.boxShadow === 'none' ? 'none' : co.boxShadow.slice(0, 60),
        vsInside: +F.ratio(solid, inside).toFixed(2),
        vsOutside: +F.ratio(solid, outside).toFixed(2),
    };
}, sel);

const rows = [];
for (const [sel, name] of FIELDS) {
    await page.evaluate((s) => { document.querySelector(s).blur(); document.body.focus(); }, sel);
    await page.waitForTimeout(350);                    // let the border-color transition settle
    const blur = await read(sel);

    await page.evaluate((s) => { document.querySelector(s).focus(); }, sel);   // programmatic focus
    await page.waitForTimeout(350);
    const progF = await read(sel);

    // REAL keyboard focus so :focus-visible genuinely applies: Tab from the top
    await page.evaluate((s) => { document.querySelector(s).blur(); document.body.focus(); }, sel);
    let landed = false;
    for (let i = 0; i < 60 && !landed; i++) {
        await page.keyboard.press('Tab');
        landed = await page.evaluate((s) => document.activeElement === document.querySelector(s), sel);
    }
    if (landed) await page.waitForTimeout(350);
    const tabF = landed ? await read(sel) : null;
    rows.push({ name, sel, blur, progF, tabF, landed });
}

const NON_TEXT = 3;                   // WCAG 2.2 §1.4.11 для нетекстовых индикаторов
const fail = [];
for (const r of rows) {
    const f = r.progF;
    if (f.missing) { fail.push(`${r.name}: поле не найдено`); continue; }
    if (!f.focused) { fail.push(`${r.name}: фокус не встал`); continue; }
    const best = Math.max(f.vsInside, f.vsOutside);
    if (best < NON_TEXT) fail.push(`${r.name}: индикатор фокуса ${best}:1 < ${NON_TEXT}:1`);
    if (f.ownerBorder === r.blur.ownerBorder && f.elOutline === 'none' && f.elShadow === 'none')
        fail.push(`${r.name}: на фокусе не меняется НИЧЕГО`);
}

for (const r of rows) {
    console.log('\n── ' + r.name + '  (' + r.sel + ')  owner: ' + r.blur.owner);
    console.log('   blur   :', JSON.stringify(r.blur));
    console.log('   focus  :', JSON.stringify(r.progF));
    console.log('   tabbed :', r.landed ? JSON.stringify(r.tabF) : 'Tab did not land here');
}
console.log('\nconsole errors:', errors.length ? errors : 'none');
console.log(fail.length ? 'FAIL\n - ' + fail.join('\n - ')
                        : `PASS — у всех полей индикатор фокуса ≥ ${NON_TEXT}:1`);

await browser.close(); srv.close();
