import { serve, launch, ROOT } from './lib.mjs';
import { richSeed } from './seed.mjs';
import { makeDrive, installFakeCloud, seedTokenInit } from './fakecloud.mjs';
const FAR = Date.now() + 3600_000;
(async () => {
  const s = await serve(ROOT); const B = await launch();
  for (const withToken of [false, true]) {
    const drive = makeDrive();
    const ctx = await B.newContext({ colorScheme: 'dark' });
    await installFakeCloud(ctx, drive);
    if (withToken) await ctx.addInitScript(seedTokenInit(FAR));
    const sp = await ctx.newPage();
    await sp.goto(`http://localhost:${s.port}/__seed__`, { waitUntil: 'load' }).catch(()=>{});
    await sp.evaluate((st) => { localStorage.setItem('duskState_v4', JSON.stringify(st)); try{indexedDB.deleteDatabase('keyval-store')}catch(e){} }, richSeed());
    await sp.close();
    const p = await ctx.newPage();
    await p.goto(`http://localhost:${s.port}/index.html`, { waitUntil: 'load' });
    await p.waitForTimeout(700);
    const d = await p.evaluate(() => { let ls=null; try{ls=JSON.parse(localStorage.getItem('duskState_v4'))}catch(e){} return { ls: ls&&ls.tasks?ls.tasks.length:null, st: window.state&&window.state.tasks?window.state.tasks.length:null }; });
    console.log(`withToken=${withToken}: LS.tasks=${d.ls} state.tasks=${d.st}`);
    await ctx.close();
  }
  await B.close(); s.srv.close();
})();
