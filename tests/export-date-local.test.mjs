// @vitest-environment happy-dom
//
// V2-B6-06 cousin (cosmetic half): the export filename / markdown header minted
// «today» with `toISOString().slice(0,10)` — a UTC date on an app that lives in
// local time. Near local midnight the свиток is stamped with the wrong day
// (east of UTC: yesterday; west: tomorrow). Same cure as the deadline half: _ymd.
import { it, expect, vi, afterEach } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';

import { join } from 'node:path';

const _store = {};
vi.mock('idb-keyval', () => ({
    get: vi.fn(async (k) => (k in _store ? _store[k] : undefined)),
    set: vi.fn(async (k, v) => { _store[k] = v; }),
}));

import '../src/idb-global.js';
import '../dusk/01-core.ts';
import '../dusk/02-grimoire.ts';
import '../dusk/03-render.ts';   // defines _ymd / _todayStamp (globalThis at file end)
const S = globalThis;

afterEach(() => vi.useRealTimers());

// An instant whose LOCAL date differs from its UTC date in this machine's tz:
// east of UTC just after local midnight, west of UTC just before it. In UTC
// itself no such instant exists — there the assertions degrade to «still local».
const skewedInstant = () => {
    const east = new Date(2026, 6, 11, 12, 0).getTimezoneOffset() <= 0;
    return new Date(2026, 6, 11, east ? 0 : 23, 30);
};
const localYmd = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

it('_todayStamp mints the LOCAL date', () => {
    const now = skewedInstant();
    vi.useFakeTimers();
    vi.setSystemTime(now);
    expect(S._todayStamp()).toBe(localYmd(now));
});

it('_todayStamp disagrees with the UTC serialization when the tz is not UTC', () => {
    const now = skewedInstant();
    if (now.getTimezoneOffset() === 0) return;          // in UTC there is nothing to disagree about
    vi.useFakeTimers();
    vi.setSystemTime(now);
    expect(S._todayStamp()).not.toBe(now.toISOString().slice(0, 10));
});

it('no module stamps a date with toISOString().slice(0, 10) any more', () => {
    // ⚠ happy-dom: import.meta.url здесь НЕ file:-адрес, поэтому путь от cwd
    const dir  = join(process.cwd(), 'dusk');
    const hits = readdirSync(dir)
        .filter(f => f.endsWith('.ts'))
        .filter(f => /toISOString\(\)\s*\.slice\(\s*0\s*,\s*10\s*\)/.test(readFileSync(join(dir, f), 'utf8')));
    expect(hits).toEqual([]);
});
