// Гримуар: запись создаётся и переживает уход со страницы; поиск фильтрует
// и на пустой выдаче показывает полную плиту (W2-9).
import { test, expect } from './fixtures/app.mjs';

test('новая запись сохраняется и переживает уход со страницы', async ({ app, page }) => {
    await app.open({ page: 'notes' });
    await expect(page.locator('#notes-page')).toBeVisible();

    const before = await page.locator('.grim-leaf').count();
    await page.click('#grim-new-btn');
    await expect(page.locator('.grim-leaf')).toHaveCount(before + 1);

    await page.fill('#grim-title-in', 'Запись, начертанная смоуком');
    await page.locator('#grim-body').click();
    await page.keyboard.type('Тело записи из смоука.');

    // Уход со страницы = blur редактора = коммит записи.
    await page.click('#nav-main');
    await expect(page.locator('#main-page')).toBeVisible();

    const st = await app.state();
    const made = st.notes.find(n => n.title === 'Запись, начертанная смоуком');
    expect(made, 'запись должна лежать в состоянии').toBeTruthy();
    expect(made.body).toContain('Тело записи из смоука.');

    await page.click('#nav-notes');
    await expect(page.locator('#grim-title-in')).toHaveValue('Запись, начертанная смоуком');
    await expect(page.locator('#grim-body')).toContainText('Тело записи из смоука.');
});

test('поиск фильтрует записи, пустой зов даёт плиту', async ({ app, page }) => {
    await app.open({ page: 'notes' });

    const all = await page.locator('.grim-leaf').count();
    expect(all).toBeGreaterThan(1);

    await page.fill('#notes-search-box', 'Заклинание');
    await expect(page.locator('.grim-leaf')).toHaveCount(1);

    await page.fill('#notes-search-box', 'ззззнесуществующее');
    await expect(page.locator('.grim-leaf')).toHaveCount(0);
    // Плита целиком: глиф + заголовок + подстрока, а не голая строчка.
    const plate = page.locator('.grim-empty-inline');
    await expect(plate).toBeVisible();
    await expect(plate.locator('.grim-empty-ic')).toBeVisible();
    await expect(plate.locator('.grim-empty-sub')).toBeVisible();

    await page.fill('#notes-search-box', '');
    await expect(page.locator('.grim-leaf')).toHaveCount(all);
});
