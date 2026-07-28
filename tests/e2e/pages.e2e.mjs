// Навигация: три страницы переключаются и выбор переживает перезагрузку.
// Якоря — id нав-табов и контейнеров страниц, НЕ подписи: подписи ходят
// вместе с языковыми свипами (обеты/склеп/Гримуар), id — нет.
import { test, expect } from './fixtures/app.mjs';

test('нав-табы переключают три страницы', async ({ app, page }) => {
    await app.open();

    await expect(page.locator('#main-page')).toBeVisible();
    await expect(page.locator('#nav-main')).toHaveClass(/active/);

    await page.click('#nav-notes');
    await expect(page.locator('#notes-page')).toBeVisible();
    await expect(page.locator('#main-page')).toBeHidden();
    await expect(page.locator('#nav-notes')).toHaveClass(/active/);

    await page.click('#nav-archive');
    await expect(page.locator('#archive-page')).toBeVisible();
    await expect(page.locator('#notes-page')).toBeHidden();
    await expect(page.locator('#nav-archive')).toHaveClass(/active/);

    await page.click('#nav-main');
    await expect(page.locator('#main-page')).toBeVisible();
    await expect(page.locator('#nav-main')).toHaveClass(/active/);
});

test('выбранная страница переживает перезагрузку', async ({ app, page }) => {
    await app.open();

    await page.click('#nav-notes');
    await expect(page.locator('#notes-page')).toBeVisible();

    await app.reload();

    await expect(page.locator('#notes-page')).toBeVisible();
    await expect(page.locator('#nav-notes')).toHaveClass(/active/);
});
