// PWA-контур: service worker встаёт и реально прекэширует, манифест и
// version.json отдаются валидными. Это же основание под пуш и TWA — оба
// живут в sw.js и в манифесте.
import { test, expect } from './fixtures/app.mjs';

test('service worker регистрируется, берёт управление и прекэширует оболочку', async ({ app, page }) => {
    await app.open();

    const scope = await page.evaluate(async () => {
        const reg = await navigator.serviceWorker.ready;
        return reg.active ? reg.scope : null;
    });
    expect(scope).toBeTruthy();

    // После перезагрузки страница обязана управляться воркером.
    await app.reload();
    expect(await page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);

    // Прекэш реально наполнен: пустой кэш = молча провалившийся addAll
    // (один 404 в CORE_ASSETS роняет ВЕСЬ addAll — оффлайн перестаёт работать).
    const cache = await page.evaluate(async () => {
        const names = await caches.keys();
        const shell = names.find(n => n.startsWith('dusk-shell'));
        if (!shell) return { shell: null, urls: [] };
        const c = await caches.open(shell);
        const keys = await c.keys();
        return { shell, urls: keys.map(r => new URL(r.url).pathname) };
    });
    expect(cache.shell, 'кэш оболочки должен существовать').toBeTruthy();
    for (const must of ['/index.html', '/app.js', '/style.css', '/manifest.json', '/version.json']) {
        expect(cache.urls, `${must} не попал в прекэш`).toContain(must);
    }
});

test('манифест и version.json отдаются валидными', async ({ app, page, request }) => {
    await app.open();

    const mres = await request.get('/manifest.json');
    expect(mres.status()).toBe(200);
    const manifest = await mres.json();
    expect(manifest.name || manifest.short_name).toBeTruthy();
    expect(manifest.display).toBeTruthy();
    expect(Array.isArray(manifest.icons) && manifest.icons.length).toBeTruthy();

    // Каждая иконка манифеста обязана существовать — битая иконка ломает
    // установку PWA и сборку TWA молча.
    for (const icon of manifest.icons) {
        const url = icon.src.replace(/^\.?\//, '/');
        expect((await request.get(url)).status(), `${icon.src} отсутствует`).toBe(200);
    }

    const vres = await request.get('/version.json');
    expect(vres.status()).toBe(200);
    const version = await vres.json();
    // BUILD ведёт тост обновления; формат YYYY-MM-DD-N зафиксирован практикой.
    expect(version.build).toMatch(/^\d{4}-\d{2}-\d{2}-\d+$/);
});
