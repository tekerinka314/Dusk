// Общая фикстура смоука: засеять хранилища → поднять приложение → отдать
// страницу вместе с собранными ошибками консоли.
//
// Почему сид кладётся ОТДЕЛЬНОЙ навигацией (`/version.json` → evaluate →
// `/index.html`), а не через addInitScript: запись в IndexedDB асинхронна, а
// addInitScript не ждёт возвращённый промис — бут приложения успевал прочитать
// пустую базу. Отдельная навигация на тот же origin даёт полностью
// дождавшуюся запись и убирает гонку целиком.
import { test as base, expect } from '@playwright/test';
import { richSeed } from './seed.mjs';

export const IDB_DB = 'keyval-store';     // дефолтное имя стора idb-keyval
export const IDB_STORE = 'keyval';
export const K_STATE = 'duskState_v4';
const SEED_STUB = '/__e2e_seed__';   // фиктивный путь того же origin, отдаётся route'ом

// Выполняется В БРАУЗЕРЕ. Держать самодостаточной — замыкания не сериализуются.
async function _seedStorages({ state, pageName, idb, ls, db, store, key }) {
    localStorage.clear();
    if (state) localStorage.setItem(key, JSON.stringify(state));
    localStorage.setItem('currentPage', pageName);
    localStorage.setItem('isFiltered', '0');
    for (const [k, v] of Object.entries(ls || {})) localStorage.setItem(k, v);

    await new Promise((res) => {
        const r = indexedDB.deleteDatabase(db);
        r.onsuccess = r.onerror = r.onblocked = () => res();
    });
    if (!idb) return;
    await new Promise((res) => {
        const r = indexedDB.open(db, 1);
        r.onupgradeneeded = () => { r.result.createObjectStore(store); };
        r.onsuccess = () => {
            const dbh = r.result;
            const tx = dbh.transaction(store, 'readwrite');
            tx.objectStore(store).put(idb, key);
            tx.oncomplete = tx.onerror = () => { dbh.close(); res(); };
        };
        r.onerror = () => res();
    });
}

class App {
    constructor(page, errors) { this.page = page; this.errors = errors; }

    /** Засеять и открыть приложение. Возвращает саму себя для цепочек. */
    async open({ seed = richSeed(), page: pageName = 'main', idb = null, ls = {} } = {}) {
        // Заглушка для сева — своя, а не реальный файл: у любого документа без
        // <link rel="icon"> Chrome сам просит /favicon.ico и получает 404,
        // который потом всплывает в ошибках консоли как «баг приложения».
        if (!this._stubRouted) {
            await this.page.route(`**${SEED_STUB}`, r => r.fulfill({
                status: 200, contentType: 'text/html; charset=utf-8',
                body: '<!doctype html><meta charset="utf-8"><link rel="icon" href="data:,"><title>seed</title>',
            }));
            this._stubRouted = true;
        }
        await this.page.goto(SEED_STUB);
        await this.page.evaluate(_seedStorages, {
            state: seed, pageName, idb, ls, db: IDB_DB, store: IDB_STORE, key: K_STATE,
        });
        await this.page.goto('/index.html', { waitUntil: 'load' });
        await this.ready();
        return this;
    }

    /** Перезагрузка БЕЗ пересева — проверка того, что пережило хранилище. */
    async reload() {
        await this.page.reload({ waitUntil: 'load' });
        await this.ready();
        return this;
    }

    /** Бут завершён: loadState отработал (IDB+LS прочитаны) и список отрисован. */
    async ready() {
        await this.page.waitForFunction(() => window._stateLoaded === true, null, { timeout: 15_000 });
        await this.page.waitForSelector('.todo-app', { state: 'attached' });
        // render() зовётся синхронно следом за loadState; пауза — на анимацию
        // входа строк, чтобы клики не летели по ещё едущему списку.
        await this.page.waitForTimeout(150);
    }

    /** Живое состояние приложения (не то, что в хранилище). */
    state() { return this.page.evaluate(() => JSON.parse(JSON.stringify(window.state))); }

    /** Состояние, лежащее в localStorage. */
    lsState() { return this.page.evaluate((k) => JSON.parse(localStorage.getItem(k) || 'null'), K_STATE); }

    /** Состояние, лежащее в IndexedDB. */
    idbState() {
        return this.page.evaluate(({ db, store, key }) => new Promise((res) => {
            const r = indexedDB.open(db);
            r.onsuccess = () => {
                const dbh = r.result;
                if (!dbh.objectStoreNames.contains(store)) { dbh.close(); return res(null); }
                const tx = dbh.transaction(store, 'readonly');
                const g = tx.objectStore(store).get(key);
                g.onsuccess = () => { const v = g.result; dbh.close(); res(v ? JSON.parse(JSON.stringify(v)) : null); };
                g.onerror = () => { dbh.close(); res(null); };
            };
            r.onerror = () => res(null);
        }), { db: IDB_DB, store: IDB_STORE, key: K_STATE });
    }

    /** Тексты видимых обетов в порядке отрисовки. */
    taskTexts() {
        return this.page.$$eval('.task-item .task-text', els => els.map(e => e.textContent.trim()));
    }

    /** Дать обет через основное поле ввода. */
    async addTask(text) {
        await this.page.fill('#input-box', text);
        await this.page.click('#btn-add');
        await this.page.waitForTimeout(150);
    }

    /** Дождаться, пока IDB-зеркало догонит localStorage (запись fire-and-forget). */
    async idbSettled() {
        await this.page.waitForFunction(async ({ db, store, key }) => {
            const ls = localStorage.getItem(key);
            if (!ls) return false;
            const lsSeq = (JSON.parse(ls) || {})._saveSeq || 0;
            return await new Promise((res) => {
                const r = indexedDB.open(db);
                r.onsuccess = () => {
                    const dbh = r.result;
                    if (!dbh.objectStoreNames.contains(store)) { dbh.close(); return res(false); }
                    const g = dbh.transaction(store, 'readonly').objectStore(store).get(key);
                    g.onsuccess = () => { const v = g.result; dbh.close(); res(!!v && (v._saveSeq || 0) >= lsSeq); };
                    g.onerror = () => { dbh.close(); res(false); };
                };
                r.onerror = () => res(false);
            });
        }, { db: IDB_DB, store: IDB_STORE, key: K_STATE }, { timeout: 10_000 });
    }
}

export const test = base.extend({
    errors: async ({ page }, use) => {
        const errors = [];
        // location().url у сообщения о провале загрузки = сам провалившийся
        // URL; без него «Failed to load resource» не называет виновника.
        page.on('console', m => {
            if (m.type() !== 'error') return;
            const u = m.location()?.url;
            errors.push(u ? `${m.text()} @ ${u}` : m.text());
        });
        page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
        await use(errors);
    },
    // Сетевые провалы отдельно: сообщение console-ошибки про 404 не содержит
    // URL, и без этого списка падение теста не называет виновника.
    // ⚠ Слушать надо КОНТЕКСТ, а не страницу: запросы service worker'а на
    // page-события не приходят вовсе, и 404 из его precache остаётся невидим.
    net: async ({ page }, use) => {
        const bad = [];
        const ctx = page.context();
        ctx.on('response', r => { if (r.status() >= 400) bad.push(`${r.status()} ${r.url()}`); });
        ctx.on('requestfailed', r => bad.push(`FAILED ${r.url()} ${r.failure()?.errorText || ''}`));
        await use(bad);
    },
    app: async ({ page, errors }, use) => { await use(new App(page, errors)); },
});

export { expect };
