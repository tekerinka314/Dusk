import { serve, launch, openApp } from './lib.mjs';
import { richSeed } from './seed.mjs';
const { srv, port } = await serve();
const browser = await launch();
const { ctx, page: p } = await openApp(browser, { device: 'pixel7', seed: richSeed(), port });
// 1) programmatic dblclick event through the real delegation
const prog = await p.evaluate(() => {
  const el = document.querySelector('.task-item[data-id="12"] .task-text');
  el.scrollIntoView({ block: 'center' });
  el.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true }));
  return { editable: el.getAttribute('contenteditable'), active: document.activeElement === el };
});
console.log('programmatic dblclick:', JSON.stringify(prog));
// reset
await p.keyboard.press('Escape'); await p.waitForTimeout(200);
// 2) double-tap with dblclick listener logging target
await p.evaluate(() => {
  globalThis.__log = [];
  ['click','dblclick'].forEach(t => document.addEventListener(t, e => {
    globalThis.__log.push(t + ':' + (e.target.className || e.target.tagName) + ' detail=' + e.detail);
  }, true));
});
const r = await p.evaluate(() => { const el = document.querySelector('.task-item[data-id="12"] .task-text'); const b = el.getBoundingClientRect(); return { x: Math.round(b.x + 15), y: Math.round(b.y + b.height / 2) }; });
await p.touchscreen.tap(r.x, r.y); await p.waitForTimeout(100);
await p.touchscreen.tap(r.x, r.y); await p.waitForTimeout(400);
console.log('after double-tap:', JSON.stringify(await p.evaluate(() => ({
  log: globalThis.__log,
  editable: document.querySelector('.task-item[data-id="12"] .task-text').getAttribute('contenteditable'),
})), null, 1));
await browser.close(); srv.close();
