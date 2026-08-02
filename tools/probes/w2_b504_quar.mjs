// W2-4 / V2-B5-04 — verdict probe: does the quarantine overlay behave like a real
// dialog at runtime? Source contract is locked by tests/quarantine-modal-a11y.test.mjs;
// this measures the DOM in dist: accessible name, focus-in, Tab trap, Esc, focus return.
import { serve, launch, openApp } from './lib.mjs';
import { richSeed } from './seed.mjs';

const DESKTOP = { width: 1280, height: 860, deviceScaleFactor: 1, isMobile: false, hasTouch: false,
                  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36' };

const { srv, port } = await serve();
const browser = await launch();
const { page, errors } = await openApp(browser, { device: DESKTOP, page: 'main', seed: richSeed(), port });

// seed three unresolved journal entries and open the review the way the sync panel does
await page.evaluate(() => {
    state.syncJournal = [
        { uid: 'q1', kind: 'field', recType: 'task', recUid: 'x1', field: 'text', loser: 'Старый текст задачи', at: Date.now(), resolved: false },
        { uid: 'q2', kind: 'delete-vs-edit', loser: { text: 'Удалённая на другом устройстве' }, at: Date.now(), resolved: false },
        { uid: 'q3', kind: 'note-both', loser: { body: 'Вторая копия заметки' }, at: Date.now(), resolved: false },
    ];
});
await page.click('.sync-glyph');                                   // focus lands in the panel
await page.waitForSelector('.snooze-menu.sync-panel', { timeout: 3000 });
await page.evaluate(() => openQuarantine());
await page.waitForSelector('#quar-overlay', { timeout: 3000 });
await page.waitForTimeout(350);

const named = await page.evaluate(() => {
    const ov = document.getElementById('quar-overlay');
    const lb = ov.getAttribute('aria-labelledby');
    const t = lb && document.getElementById(lb);
    return { role: ov.getAttribute('role'), modal: ov.getAttribute('aria-modal'),
             labelledby: lb, name: t ? t.textContent.trim() : null };
});
const focusIn = await page.evaluate(() => {
    const ov = document.getElementById('quar-overlay');
    return { inside: ov.contains(document.activeElement), el: document.activeElement.className };
});

// Tab all the way round — focus must never leave the dialog
let escaped = null;
for (let i = 0; i < 14; i++) {
    await page.keyboard.press('Tab');
    const out = await page.evaluate(() => {
        const ov = document.getElementById('quar-overlay');
        return ov.contains(document.activeElement) ? null : (document.activeElement.className || document.activeElement.tagName);
    });
    if (out !== null) { escaped = `${out} (after ${i + 1} Tab)`; break; }
}

// Restore one row: the dialog must stay open, the list must shrink, focus stay inside
const before = await page.$$eval('.sync-quar-row', r => r.length);
await page.click('.sync-quar-dismiss');
await page.waitForTimeout(250);
const afterRefresh = await page.evaluate(() => {
    const ov = document.getElementById('quar-overlay');
    return { open: !!ov, rows: ov ? ov.querySelectorAll('.sync-quar-row').length : -1,
             focusInside: ov ? ov.contains(document.activeElement) : false };
});

// Esc closes it and hands focus back
await page.keyboard.press('Escape');
await page.waitForTimeout(500);
const afterEsc = await page.evaluate(() => ({
    stillThere: !!document.querySelector('.sync-quar-overlay'),
    focus: document.activeElement.id || document.activeElement.className || document.activeElement.tagName,
}));

const fail = [];
if (named.role !== 'dialog') fail.push('role is not dialog');
if (named.modal !== 'true') fail.push('aria-modal missing');
if (!named.name) fail.push('dialog has no accessible name (aria-labelledby unresolved)');
if (!focusIn.inside) fail.push('focus never entered the dialog');
if (escaped) fail.push('Tab escaped the dialog: ' + escaped);
if (before !== 3) fail.push(`seeded 3 rows, rendered ${before}`);
if (!afterRefresh.open) fail.push('dialog closed after resolving one of three entries');
if (afterRefresh.rows !== 2) fail.push(`after dismiss expected 2 rows, got ${afterRefresh.rows}`);
if (!afterRefresh.focusInside) fail.push('focus fell out of the dialog after the in-place refresh');
if (afterEsc.stillThere) fail.push('Esc did not close the overlay');
if (afterEsc.focus !== 'sync-glyph-btn') fail.push(`focus returned to ${afterEsc.focus}, expected sync-glyph-btn`);

console.log('dialog    :', JSON.stringify(named));
console.log('focus-in  :', JSON.stringify(focusIn));
console.log('tab escape:', escaped || 'none (trapped)');
console.log('refresh   :', JSON.stringify(afterRefresh), 'rows before:', before);
console.log('after Esc :', JSON.stringify(afterEsc));
console.log('console errors:', errors.length ? errors : 'none');
console.log(fail.length ? 'FAIL\n - ' + fail.join('\n - ') : 'PASS — quarantine overlay is a real modal dialog');

await browser.close(); srv.close();
