import { serve, launch, openApp } from './lib.mjs';
import { richSeed } from './seed.mjs';
(async () => {
  const { srv, port } = await serve();
  const b = await launch();
  const { page: p } = await openApp(b, { device: 'pixel7', page: 'main', seed: richSeed(), port });
  await p.waitForTimeout(400);
  const r = await p.evaluate(() => [
    'Задача !высокий tail',
    'Задача !высокий',
    'Задача !выс',
    'Задача !high tail',
    'Задача !h',
    'Задача !средний',
    'Задача !нет',
  ].map(s => ({ in: s, out: parseQuickInput(s) })));
  console.log(JSON.stringify(r, null, 1));
  await b.close(); srv.close();
})().catch(e => { console.error('CRASH', e); process.exit(2); });
