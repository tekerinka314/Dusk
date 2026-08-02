import { chromium } from 'playwright-core';
const b = await chromium.launch({ channel: 'chrome' });
const p = await b.newPage({ viewport: { width: 760, height: 560 } });
await p.goto('file:///' + process.argv[2].split('\\').join('/'));
await p.screenshot({ path: process.argv[3], fullPage: true });
await b.close();
