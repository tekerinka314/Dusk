import { serve, launch, openApp, ensureShots } from './lib.mjs';
import { richSeed } from './seed.mjs';

(async () => {
  const dir = ensureShots();
  const { srv, port } = await serve();
  const b = await launch();
  const { page: p } = await openApp(b, { device: 'pixel7', page: 'main', seed: richSeed(), port });
  await p.waitForTimeout(1200);

  // (a) what the user actually sees on first screen (viewport-only)
  await p.screenshot({ path: `${dir}/B1-01_pixel7_viewport_asIs.png` });

  // (b) scroll to the first task rows and clip a band showing the collapsed towers
  await p.evaluate(() => { const gc = document.querySelector('#groups-container'); if (gc) gc.scrollIntoView(); });
  await p.waitForTimeout(200);
  await p.screenshot({ path: `${dir}/B1-01_pixel7_towers.png` });

  // measurements to cite
  const m = await p.evaluate(() => {
    const rows = [...document.querySelectorAll('.task-item')].map(li => ({
      txt: (li.querySelector('.task-text')?.textContent || '').slice(0, 24),
      textW: Math.round(li.querySelector('.task-text')?.getBoundingClientRect().width || 0),
      rowH: Math.round(li.getBoundingClientRect().height),
      actW: Math.round(li.querySelector('.task-actions')?.getBoundingClientRect().width || 0),
      btns: li.querySelectorAll('.task-actions button').length,
    }));
    return { rows, scrollH: document.body.scrollHeight, viewportH: window.innerHeight };
  });
  console.log('SCROLLH', m.scrollH, 'VIEWPORT', m.viewportH, 'RATIO', (m.scrollH / m.viewportH).toFixed(1) + 'x');
  console.log('ROWS', JSON.stringify(m.rows, null, 1));
  await b.close(); srv.close();
})().catch(e => { console.error('CRASH', e); process.exit(2); });
