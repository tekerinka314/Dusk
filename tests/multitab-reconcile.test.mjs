// @vitest-environment happy-dom
//
// V2-B6-02 — две вкладки на одном origin делят localStorage, но каждая держит
// СВОЙ in-memory state. Раньше последнее `saveState` писало свой (возможно
// устаревший) блоб целиком → правка соседней вкладки исчезала молча, а для
// пользователя без синка — навсегда.
//
// Ратифицированный минимально-безопасный вариант: слушатель `storage` на
// K_STATE поднимает флаг; СЛЕДУЮЩЕЕ сохранение этой вкладки сначала перечитывает
// LS и прогоняет чужой блоб через ШТАТНЫЙ 3-way `mergeStates` (base = последний
// блоб, записанный этой вкладкой), и только потом пишет.
import { it, expect, vi, beforeEach } from 'vitest';

const _store = {};
vi.mock('idb-keyval', () => ({
    get: vi.fn(async (k) => (k in _store ? _store[k] : undefined)),
    set: vi.fn(async (k, v) => { _store[k] = v; }),
}));

import '../src/idb-global.js';
import '../dusk/01-core.ts';
import '../dusk/09-sync.ts';   // mergeStates / getSyncSubset / applySyncSubset
const S = globalThis;

S.showToast = () => {};

// Детерминированное хранилище (happy-dom Storage плохо переживает подмену —
// см. quota-savestate). saveState резолвит `localStorage` на глобале в момент
// ВЫЗОВА, поэтому подмена после загрузки 01-core видна всем последующим вызовам.
const mem = new Map();
const fakeLS = {
    getItem: k => (mem.has(k) ? mem.get(k) : null),
    setItem: (k, v) => { mem.set(k, String(v)); },
    removeItem: k => { mem.delete(k); },
    clear: () => mem.clear(),
    key: i => [...mem.keys()][i],
    get length() { return mem.size; },
};
Object.defineProperty(globalThis, 'localStorage', { value: fakeLS, configurable: true, writable: true });

const task = (uid, text, ts) => ({
    id: Number(uid.slice(1)), uid, text, checked: false, subtasks: [],
    priority: null, groupId: null, order: Number(uid.slice(1)), updatedAt: ts, createdAt: 1000,
});
const readLs = () => JSON.parse(mem.get(S.K_STATE));
const byUid  = (blob, uid) => (blob.tasks || []).find(t => t.uid === uid);

// Чужая вкладка: пишет свой блоб в LS напрямую и объявляет об этом событием
// `storage` (браузер шлёт его ТОЛЬКО другим документам — своё же письмо тихое).
const foreignWrite = (mutate) => {
    const blob = readLs();
    mutate(blob);
    const json = JSON.stringify(blob);
    mem.set(S.K_STATE, json);
    window.dispatchEvent(Object.assign(new Event('storage'), {
        key: S.K_STATE, newValue: json, storageArea: fakeLS,
    }));
};

beforeEach(() => {
    mem.clear();
    S.state = {
        tasks: [task('u1', 'обет A', 2000), task('u2', 'обет B', 2000)],
        groups: [], archive: [], notes: [], notesArchive: [],
        templates: [], noteTemplates: [], tombstones: [], syncJournal: [],
    };
    S.saveState();                     // эта вкладка застолбила базу
});

it('правка соседней вкладки переживает следующее сохранение этой', () => {
    foreignWrite(b => {
        const t = b.tasks.find(x => x.uid === 'u2');
        t.text = 'ПРАВКА ВКЛАДКИ 2'; t.updatedAt = 3000;
    });

    const mine = S.state.tasks.find(t => t.uid === 'u1');
    mine.text = 'ПРАВКА ВКЛАДКИ 1'; mine.updatedAt = 3001;
    S.saveState();

    const out = readLs();
    expect(byUid(out, 'u1').text).toBe('ПРАВКА ВКЛАДКИ 1');
    expect(byUid(out, 'u2').text).toBe('ПРАВКА ВКЛАДКИ 2');
});

it('чужая правка попадает и в живой state этой вкладки, не только в LS', () => {
    foreignWrite(b => {
        const t = b.tasks.find(x => x.uid === 'u2');
        t.text = 'ПРАВКА ВКЛАДКИ 2'; t.updatedAt = 3000;
    });
    S.saveState();
    expect(S.state.tasks.find(t => t.uid === 'u2').text).toBe('ПРАВКА ВКЛАДКИ 2');
});

it('удаление в соседней вкладке не воскресает', () => {
    foreignWrite(b => {
        b.tasks = b.tasks.filter(t => t.uid !== 'u1');
        b.tombstones = [{ uid: 'u1', coll: 'tasks', deletedAt: 3000 }];
    });
    S.saveState();
    expect(S.state.tasks.some(t => t.uid === 'u1')).toBe(false);
    expect(byUid(readLs(), 'u1')).toBeUndefined();
});

it('обычное сохранение не платит за мерж (флаг снят → движок не зовётся)', () => {
    const spy = vi.spyOn(S, 'mergeStates');
    S.saveState();
    S.saveState();
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
});

it('флаг одноразовый: мерж происходит ровно один раз на чужую запись', () => {
    const spy = vi.spyOn(S, 'mergeStates');
    foreignWrite(b => { b.tasks.find(x => x.uid === 'u2').updatedAt = 3000; });
    S.saveState();
    S.saveState();
    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockRestore();
});
