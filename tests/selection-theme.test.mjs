// V2-B4-06 — ::selection was themed ONLY inside the Grimuar body, so every
// other surface (task titles, modals, inputs) painted the system blue on a
// near-black gothic page. Lock: a global rule exists and speaks the same violet.
import { it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../style.css', import.meta.url), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '');   // комментарии несут те же селекторы в прозе

// Every ::selection rule with its selector prefix.
const rules = [...css.matchAll(/([^{}]*)::selection\s*(?:,[^{}]*)?\{([^}]*)\}/g)]
    .map(m => ({ sel: m[0].slice(0, m[0].indexOf('{')).trim(), body: m[2] }));

it('a global ::selection rule exists (not scoped to a component)', () => {
    const global = rules.filter(r => /(^|,)\s*(\*\s*)?::selection/.test(r.sel));
    expect(global.length).toBeGreaterThan(0);
});

it('the global rule paints the violet already used by Grimuar, not the system blue', () => {
    const global = rules.find(r => /(^|,)\s*(\*\s*)?::selection/.test(r.sel));
    expect(global.body).toMatch(/background\s*:\s*rgba\(\s*150\s*,\s*70\s*,\s*255/);
});

it('selected text keeps a readable ink colour', () => {
    const global = rules.find(r => /(^|,)\s*(\*\s*)?::selection/.test(r.sel));
    expect(global.body).toMatch(/(^|;|\s)color\s*:/);
});
