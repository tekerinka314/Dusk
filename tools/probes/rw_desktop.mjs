// Desktop no-change eyeball: 1280×900, mouse/hover context, seeded state.
import { serve, launch, ensureShots } from './lib.mjs';
import { richSeed } from './seed.mjs';
import path from 'path';

const { srv, port } = await serve();
const browser = await launch();
const dir = ensureShots('rework/sweep');
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, colorScheme: 'dark' });
const p = await ctx.newPage();
await p.addInitScript(st => {
  try { localStorage.clear(); } catch {}
  localStorage.setItem('duskState_v4', JSON.stringify(st));
  localStorage.setItem('currentPage', 'main');
  try { indexedDB.deleteDatabase('keyval-store'); } catch {}
}, richSeed());
await p.goto(`http://localhost:${port}/index.html`, { waitUntil: 'load' });
await p.waitForTimeout(2800);
await p.screenshot({ path: path.join(dir, 'desktop_check.png') });
console.log('desktop shot done');
await ctx.close(); await browser.close(); srv.close();
