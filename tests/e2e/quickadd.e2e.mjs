// Квик-эдд сквозным путём: строка ввода → разбор токенов → готовый обет.
// Юнит-тест tests/quickadd-cyrillic.test.mjs пинит сам parseQuickInput;
// здесь проверяется, что разобранное реально доезжает до состояния и DOM.
import { test, expect } from './fixtures/app.mjs';

test('кириллический токен ранга и даты доезжают до обета (V2-B1-11)', async ({ app, page }) => {
    await app.open();

    await page.fill('#input-box', 'Позвонить некроманту !высокий %завтра');
    await page.click('#btn-add');
    await page.waitForTimeout(200);

    const st = await app.state();
    const made = st.tasks.find(t => t.text === 'Позвонить некроманту');
    expect(made, 'токены должны быть вырезаны из текста').toBeTruthy();
    expect(made.priority).toBe('high');
    expect(made.deadline).toBeTruthy();
    expect(made.deadline.mode).toBe('date');

    // Чип исхода отрисован в самой строке — значит разобранное дошло до render.
    await expect(page.locator(`.task-item[data-id="${made.id}"] .deadline-tag`)).toBeVisible();
});

test('кириллическая метка остаётся в тексте и попадает в облако меток', async ({ app, page }) => {
    await app.open();

    await page.fill('#input-box', 'Собрать травы *дом');
    await page.click('#btn-add');
    await page.waitForTimeout(200);

    const st = await app.state();
    const made = st.tasks.find(t => (t.text || '').startsWith('Собрать травы'));
    expect(made).toBeTruthy();
    // Метка — часть текста (не отдельное поле): на этом держатся подсветка,
    // extractTags и фильтр по метке.
    expect(made.text).toContain('*дом');

    const cloud = page.locator('#tag-cloud');
    await expect(cloud).toBeVisible();
    await expect(cloud).toContainText('дом');
});
