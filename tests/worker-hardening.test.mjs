// B11-04 — хардненинг воркера синка: серверная проверка Origin, потолок тела,
// потолок ретранслируемого нуджа. Тесты гоняют чистые функции из worker/src/index.js
// (как и worker-oauth.test.mjs — воркер остаётся обычным JS вне TS-миграции).
import { it, expect } from 'vitest';
import { handleExchange, handleRefresh, originAllowed, readJsonCapped, MAX_BODY_BYTES, SyncRoom }
    from '../worker/src/index.js';

const env = { GOOGLE_CLIENT_ID: 'CID', GOOGLE_CLIENT_SECRET: 'SECRET', ALLOWED_ORIGIN: 'https://dusk-du4.pages.dev' };
const post = (body, headers = {}) => new Request('https://worker/x', {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body),
});

// ── Origin ───────────────────────────────────────────────────────────────────
it('свой origin пропускается, чужой и отсутствующий — нет', () => {
    expect(originAllowed(env, post({}, { Origin: 'https://dusk-du4.pages.dev' }))).toBe(true);
    expect(originAllowed(env, post({}, { Origin: 'https://evil.example' }))).toBe(false);
    expect(originAllowed(env, post({}))).toBe(false);            // curl без Origin
});

it('несколько origin через запятую и пробелы разбираются верно', () => {
    const multi = { ...env, ALLOWED_ORIGIN: 'https://a.example , https://b.example' };
    expect(originAllowed(multi, post({}, { Origin: 'https://b.example' }))).toBe(true);
    expect(originAllowed(multi, post({}, { Origin: 'https://c.example' }))).toBe(false);
});

it('пустой ALLOWED_ORIGIN = «не настроено» → пропускаем (кривой деплой не убивает синк)', () => {
    expect(originAllowed({}, post({}))).toBe(true);
    expect(originAllowed({ ALLOWED_ORIGIN: '   ' }, post({}))).toBe(true);
});

// ── Потолок тела ─────────────────────────────────────────────────────────────
it('тело крупнее потолка не парсится', async () => {
    const big = await readJsonCapped(post({ refresh_token: 'x'.repeat(MAX_BODY_BYTES + 100) }));
    expect(big.tooBig).toBe(true);
    expect(big.body).toBeUndefined();
});

it('битый JSON отличается от слишком большого', async () => {
    const r = await readJsonCapped(new Request('https://worker/x', { method: 'POST', body: '{не json' }));
    expect(r.bad).toBe(true);
    expect(r.tooBig).toBeUndefined();
});

it('нормальное тело проходит', async () => {
    const r = await readJsonCapped(post({ refresh_token: 'RT' }));
    expect(r.body.refresh_token).toBe('RT');
});

it('огромное тело даёт 413 и НЕ ходит в Google', async () => {
    let called = false;
    globalThis.fetch = async () => { called = true; return { ok: true, status: 200, json: async () => ({}) }; };
    const rEx = await handleExchange(post({ code: 'c'.repeat(MAX_BODY_BYTES + 10), redirect_uri: 'https://x' }), env);
    const rRf = await handleRefresh(post({ refresh_token: 'r'.repeat(MAX_BODY_BYTES + 10) }), env);
    expect(rEx.status).toBe(413);
    expect(rRf.status).toBe(413);
    expect(called).toBe(false);
});

// ── Комната будилки ──────────────────────────────────────────────────────────
function fakeRoom() {
    const sent = [];
    const peer = { send: (m) => sent.push(m) };
    const me = { send: (m) => sent.push('SELF:' + m) };
    const room = new SyncRoom({ getWebSockets: () => [me, peer], acceptWebSocket() {} }, {});
    return { room, me, sent };
}

it('обычный нудж ретранслируется соседям, но не отправителю', async () => {
    const { room, me, sent } = fakeRoom();
    await room.webSocketMessage(me, 'x');
    expect(sent).toEqual(['x']);
});

it('переросшее сообщение НЕ ретранслируется (комната не усилитель трафика)', async () => {
    const { room, me, sent } = fakeRoom();
    await room.webSocketMessage(me, 'y'.repeat(1000));
    expect(sent.some(m => m.length > 256)).toBe(false);
    expect(sent).toEqual(['SELF:too_big']);
});

it('двоичное сообщение меряется по byteLength', async () => {
    const { room, me, sent } = fakeRoom();
    await room.webSocketMessage(me, new ArrayBuffer(1024));
    expect(sent).toEqual(['SELF:too_big']);
});
