// Блок 0.1 — замер геометрии: угловые кнопки Гримуара vs границы тулбара форматирования.
import { chromium } from 'playwright-core';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const URL = 'http://localhost:5173/';

const NOTE_BODY = '<h1>Первый раздел</h1><p>Текст записи для проверки.</p>'
  + '<h2>Второй раздел</h2><p>Ещё текст.</p>'
  + '<h3>Третий раздел</h3><p>И ещё текст, чтобы страница была длинной.</p>'
  + '<p>' + 'Строка. '.repeat(60) + '</p>';

const run = async (w, h, label) => {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForFunction(() => typeof globalThis.switchPage === 'function' && typeof globalThis.grimNew === 'function');
  await page.waitForTimeout(600);

  await page.evaluate(() => { switchPage('notes'); });
  await page.waitForTimeout(250);
  await page.evaluate(() => { grimNew(); });
  await page.waitForSelector('#grim-body', { timeout: 5000, state: 'attached' });
  await page.waitForTimeout(250);
  const why = await page.evaluate(() => {
    const out = [];
    let el = document.getElementById('grim-body');
    while (el && el !== document.documentElement) {
      const cs = getComputedStyle(el);
      const b = el.getBoundingClientRect();
      out.push(`${el.tagName}.${el.className || el.id} d=${cs.display} v=${cs.visibility} o=${cs.opacity} rect=${Math.round(b.width)}x${Math.round(b.height)}`);
      el = el.parentElement;
    }
    return out;
  });
  console.log('ANCESTRY:', why.join('\n  '));

  await page.evaluate((body) => {
    const ti = document.getElementById('grim-title-in');
    if (ti) { ti.value = 'Замер границ тулбара'; grimTitleInput(ti); }
    const b = document.getElementById('grim-body');
    b.innerHTML = body;
    grimBodyInput(b);
  }, NOTE_BODY);
  await page.waitForTimeout(400);
  // TOC доступен только на записях с >=3 заголовками
  await page.evaluate(() => { _grimRefreshToc(); });
  await page.waitForTimeout(200);
  // тулбар в режим «открыт», чтобы он был видим и измерим
  await page.evaluate(() => { for (let i = 0; i < 4 && grimBarMode !== 'open'; i++) grimToggleBar(); });
  await page.waitForTimeout(500);

  const m = await page.evaluate(() => {
    const r = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const b = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return { top: +b.top.toFixed(1), right: +b.right.toFixed(1), bottom: +b.bottom.toFixed(1),
               left: +b.left.toFixed(1), w: +b.width.toFixed(1), h: +b.height.toFixed(1),
               display: cs.display, vis: cs.visibility, op: cs.opacity,
               padR: parseFloat(cs.paddingRight) || 0 };
    };
    return {
      grimBarMode, grimTocOpen,
      page: r('#grim-detail .grim-page'),
      main: r('.grim-page-main'),
      focusBtn: r('.grim-focus-toggle'),
      barBtn: r('.grim-bar-toggle'),
      tocBtn: r('.grim-toc-toggle'),
      cluster: r('.fmt-cluster'),
      fmtbar: r('.fmt-bar'),
      divider: r('.grim-divider'),
      title: r('.grim-title-in'),
      body: r('.grim-body'),
    };
  });

  const overlap = (a, b) => {
    if (!a || !b) return null;
    const x = Math.min(a.right, b.right) - Math.max(a.left, b.left);
    const y = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
    return { x: +x.toFixed(1), y: +y.toFixed(1), overlaps: x > 0 && y > 0 };
  };

  console.log(`\n=== ${label} (${w}x${h}) === barMode=${m.grimBarMode} tocOpen=${m.grimTocOpen} errs=${errs.length}`);
  for (const k of ['page', 'main', 'title', 'divider', 'fmtbar', 'cluster', 'focusBtn', 'barBtn', 'tocBtn']) {
    console.log(String(k).padEnd(9), JSON.stringify(m[k]));
  }
  // ВЕРДИКТ: ни один элемент контентного стека не должен перекрывать колонку
  // угловых кнопок, и по горизонтали должен оставаться зазор >= 8px.
  const GAP_MIN = 8;
  const checks = [];
  for (const [cn, c] of [['cluster', m.cluster], ['divider', m.divider], ['title', m.title]]) {
    for (const [bn, b] of [['focusBtn', m.focusBtn], ['barBtn', m.barBtn], ['tocBtn', m.tocBtn]]) {
      if (!c || !b || b.display === 'none' || b.w === 0) continue;
      const o = overlap(c, b);
      if (!o.overlaps) continue;                       // вертикально не пересекаются — ок
      const edge = c.right - c.padR;                   // контентный край (у textarea решает padding)
      const gap = +(b.left - edge).toFixed(1);         // зазор между контентом и колонкой кнопок
      checks.push({ pair: `${cn}×${bn}`, overlapPx: `${o.x}x${o.y}`, gap, ok: gap >= GAP_MIN });
    }
  }
  const bad = checks.filter(c => !c.ok);
  console.log('VERDICT:', bad.length ? 'FAIL' : 'PASS');
  for (const c of checks) console.log('  ', c.ok ? 'ok  ' : 'FAIL', c.pair, `overlap=${c.overlapPx} gap=${c.gap}px`);
  console.log('cluster×barBtn ', JSON.stringify(overlap(m.cluster, m.barBtn)));
  console.log('cluster×tocBtn ', JSON.stringify(overlap(m.cluster, m.tocBtn)));
  console.log('divider×tocBtn ', JSON.stringify(overlap(m.divider, m.tocBtn)));
  console.log('divider×barBtn ', JSON.stringify(overlap(m.divider, m.barBtn)));
  console.log('title×barBtn   ', JSON.stringify(overlap(m.title, m.barBtn)));
  if (errs.length) console.log('PAGE ERRORS:', errs.slice(0, 3));

  await page.screenshot({ path: `D:/tmp/pw/shots/grimbar_${label}_${w}.png` });
  await browser.close();
};

await run(1440, 900, 'desktop');
await run(1100, 850, 'narrow');

await run(390, 844, 'mobile');
await run(768, 900, 'tablet');
