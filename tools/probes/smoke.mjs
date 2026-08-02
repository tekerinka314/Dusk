import { serve, launch, openApp, ensureShots } from './lib.mjs';
import { richSeed } from './seed.mjs';

(async () => {
  const dir = ensureShots();
  const { srv, port } = await serve();
  const b = await launch();
  const seed = richSeed();
  const { page: p, errors, dev } = await openApp(b, { device: 'pixel7', page: 'main', seed, port });

  // Diagnostics: did the app render our seed?
  const diag = await p.evaluate(() => ({
    taskRows: document.querySelectorAll('.task-item').length,
    groups: document.querySelectorAll('.group-section').length,
    bodyH: document.body.scrollHeight,
    title: document.title,
    hasApp: !!document.querySelector('.todo-app'),
    firstTaskText: document.querySelector('.task-item .task-text, .task-item .todo-text')?.textContent?.slice(0, 40) || null,
    docW: document.documentElement.clientWidth,
    scrollW: document.documentElement.scrollWidth,
  }));
  await p.screenshot({ path: `${dir}/smoke_pixel7_main.png`, fullPage: true });

  console.log('DEVICE', JSON.stringify(dev));
  console.log('DIAG', JSON.stringify(diag, null, 2));
  console.log('CONSOLE_ERRORS', errors.length, JSON.stringify(errors.slice(0, 12), null, 2));
  console.log('H_OVERFLOW', diag.scrollW > diag.docW ? `YES (${diag.scrollW}>${diag.docW})` : 'no');

  await b.close(); srv.close();
})().catch(e => { console.error('CRASH', e); process.exit(2); });
