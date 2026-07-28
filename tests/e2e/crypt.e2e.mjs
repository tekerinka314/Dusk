// Склеп: погребение и воскрешение. Второй кейс — вечный замок на C-1
// (воскрешение теряло поля: ранг, витраж, звенья, примечание, исход).
import { test, expect } from './fixtures/app.mjs';

const RICH = 1;   // «Зажечь чёрные свечи» — ранг, витраж, исход, примечание, 4 звена

test('предать склепу: обет уходит из списка и ложится в склеп', async ({ app, page }) => {
    await app.open();
    const text = (await app.state()).tasks.find(t => t.id === RICH).text;

    await page.click(`.task-item[data-id="${RICH}"] [data-act="removeTask"]`);
    await expect(page.locator(`.task-item[data-id="${RICH}"]`)).toHaveCount(0);

    const st = await app.state();
    expect(st.tasks.some(t => t.id === RICH)).toBe(false);
    expect(st.archive.some(t => t.id === RICH)).toBe(true);
    expect(st.archive.find(t => t.id === RICH).archivedAt).toBeTruthy();

    await page.click('#nav-archive');
    await expect(page.locator('#archive-page')).toBeVisible();
    await expect(page.locator(`.archive-item[data-id="${RICH}"]`)).toContainText(text);
});

test('воскресить: обет возвращается со всеми полями (C-1)', async ({ app, page }) => {
    await app.open();
    const original = (await app.state()).tasks.find(t => t.id === RICH);

    await page.click(`.task-item[data-id="${RICH}"] [data-act="removeTask"]`);
    await expect(page.locator(`.task-item[data-id="${RICH}"]`)).toHaveCount(0);

    await page.click('#nav-archive');
    await page.click(`.archive-item[data-id="${RICH}"] [data-act="restoreTask"]`);
    await expect(page.locator(`.archive-item[data-id="${RICH}"]`)).toHaveCount(0);

    const back = (await app.state()).tasks.find(t => t.id === RICH);
    expect(back, 'обет должен вернуться в живой список').toBeTruthy();
    expect(back.uid).toBe(original.uid);
    expect(back.text).toBe(original.text);
    expect(back.priority).toBe(original.priority);
    expect(back.color).toBe(original.color);
    expect(back.note).toBe(original.note);
    expect(back.groupId).toBe(original.groupId);
    expect(back.deadline).toEqual(original.deadline);
    expect(back.subtasks.map(s => s.text)).toEqual(original.subtasks.map(s => s.text));
    // Погребальная метка обязана уйти — иначе обет останется «в склепе» логически.
    expect(back.archivedAt).toBeFalsy();
});
