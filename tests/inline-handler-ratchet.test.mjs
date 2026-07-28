// V2-B0-03 — the 7c contract is «zero inline on*= handlers»: everything goes
// through the delegated dispatcher (`data-act` → `ACTIONS` in 01-core).
// `_taskNotePersist` was the ONE surviving violation: it re-wrote the note
// button with a dynamic inline `onclick`, shadowing the `data-act` that
// `createTaskEl` had rendered. This file is the ratchet that keeps it at zero.
import { it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const read = p => readFileSync(new URL(p, root), 'utf8');

// Comments in this repo are Russian prose and quote the very idioms we ban
// («One delegated backdrop handler replaces 12 inline onclick=…»), so a raw
// scan would flag documentation. Strip them before scanning.
const stripComments = s => s
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1');

const tsFiles = readdirSync(new URL('dusk/', root))
    .filter(f => f.endsWith('.ts'))
    .map(f => ['dusk/' + f, stripComments(read('dusk/' + f))]);

it('no module assigns an inline handler via setAttribute', () => {
    const hits = tsFiles.filter(([, src]) => /setAttribute\(\s*['"`]on[a-z]+['"`]/i.test(src));
    expect(hits.map(([f]) => f)).toEqual([]);
});

it('no module emits an inline on*= attribute in markup', () => {
    const hits = tsFiles.filter(([, src]) =>
        /\son(click|change|input|submit|focus|blur|keydown|keyup|mousedown|touchstart)\s*=\s*["'`]/i.test(src));
    expect(hits.map(([f]) => f)).toEqual([]);
});

it('index.html carries no inline on*= attribute', () => {
    expect(/\son[a-z]+\s*=\s*["']/i.test(read('index.html'))).toBe(false);
});

it('_taskNotePersist re-points the note button through data-act, not onclick', () => {
    const src = stripComments(read('dusk/05-edit-notes-groups.ts'));
    const body = src.slice(src.indexOf('function _taskNotePersist'));
    const fn   = body.slice(0, body.indexOf('\nfunction '));
    expect(fn).toMatch(/setAttribute\(\s*['"]data-act['"]/);
    expect(fn).toMatch(/openEditNoteModal/);
    expect(fn).toMatch(/openNoteModal/);
});
