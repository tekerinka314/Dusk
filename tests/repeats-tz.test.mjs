// @vitest-environment happy-dom
//
// V2-B6-06 regression — shiftDeadline must mint the shifted date in LOCAL time
// (_ymd), not UTC (toISOString): east of UTC the UTC serialization lands one
// day short (daily never advanced at all). The suite runs in whatever tz the
// dev machine has (the user's is UTC+3); the assertions are tz-independent —
// they compare against a locally-computed expected date, so they pin the
// local-time convention everywhere.
import { it, expect, vi } from 'vitest';

const _store = {};
vi.mock('idb-keyval', () => ({
    get: vi.fn(async (k) => (k in _store ? _store[k] : undefined)),
    set: vi.fn(async (k, v) => { _store[k] = v; }),
}));

import '../src/idb-global.js';
import '../dusk/01-core.ts';
import '../dusk/02-grimoire.ts';
import '../dusk/03-render.ts';   // defines _ymd (globalThis at file end)
import '../dusk/04-tasks.ts';    // defines shiftDeadline
const S = globalThis;

const localYmd = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const plusDays = (ymd, n) => {
    const d = new Date(ymd + 'T00:00:00');
    d.setDate(d.getDate() + n);
    return d;
};

it('daily shift advances exactly +1 LOCAL day', () => {
    const out = S.shiftDeadline({ mode: 'date', value: '2026-07-11' }, 'daily');
    expect(out.value).toBe(localYmd(plusDays('2026-07-11', 1)));   // '2026-07-12'
});

it('weekly shift advances exactly +7 LOCAL days', () => {
    const out = S.shiftDeadline({ mode: 'date', value: '2026-07-11' }, 'weekly');
    expect(out.value).toBe(localYmd(plusDays('2026-07-11', 7)));   // '2026-07-18'
});

it('weekdays shift skips the weekend (Fri → Mon)', () => {
    // 2026-07-10 is a Friday; next weekday is Monday 2026-07-13.
    const out = S.shiftDeadline({ mode: 'date', value: '2026-07-10' }, 'weekdays');
    expect(out.value).toBe('2026-07-13');
});

it('month-boundary daily shift crosses correctly in local time', () => {
    const out = S.shiftDeadline({ mode: 'date', value: '2026-07-31' }, 'daily');
    expect(out.value).toBe('2026-08-01');
});

it('non-date modes pass through untouched', () => {
    const dl = { mode: 'weektime', value: 'fri 18:00' };
    expect(S.shiftDeadline(dl, 'daily')).toBe(dl);
});
