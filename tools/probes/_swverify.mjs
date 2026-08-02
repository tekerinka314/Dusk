import { serve, launch, openApp } from './lib.mjs';
import { richSeed } from './seed.mjs';
(async () => {
  const { srv, port } = await serve();
  const b = await launch();
  const { page: p, errors } = await openApp(b, { device: 'pixel7', page: 'main', seed: richSeed(), port });
  await p.waitForTimeout(1500);
  const r = await p.evaluate(async () => {
    const reg = await navigator.serviceWorker.getRegistration().catch(() => null);
    return {
      taskRows: document.querySelectorAll('.task-item').length,
      swController: !!navigator.serviceWorker.controller,
      swRegistered: !!reg,
      title: document.title,
    };
  });
  console.log('RENDER', JSON.stringify(r));
  console.log('CONSOLE_ERRORS', errors.length, JSON.stringify(errors.slice(0,8)));
  await b.close(); srv.close();
})().catch(e => { console.error('CRASH', e); process.exit(2); });
