// Звенья: добавление через строку ввода внутри обета и авто-исполнение
// родителя, когда исполнены все звенья.
import { test, expect } from './fixtures/app.mjs';

const WITH_SUBS = 13;   // «Обет со звеном-исходом» — два звена, секция открыта

test('добавить звено: список и счётчик растут', async ({ app, page }) => {
    await app.open();

    const list = page.locator(`#sub-list-${WITH_SUBS} .subtask-item`);
    await expect(list).toHaveCount(2);

    await page.fill(`#sub-input-${WITH_SUBS}`, 'Звено, выкованное смоуком');
    await page.click(`#sub-section-${WITH_SUBS} .btn-subtask-confirm`);

    await expect(list).toHaveCount(3);
    const st = await app.state();
    const subs = st.tasks.find(t => t.id === WITH_SUBS).subtasks;
    expect(subs.map(s => s.text)).toContain('Звено, выкованное смоуком');
    // Каждое звено обязано получить uid и метку времени — на них держится
    // мерж подзадач набором (SYNC-SPEC).
    expect(subs.every(s => s.uid && s.updatedAt)).toBe(true);
});

test('все звенья исполнены → обет исполняется сам', async ({ app, page }) => {
    await app.open();

    const parentCheck = page.locator(`.task-item[data-id="${WITH_SUBS}"] .task-check`);
    await expect(parentCheck).toHaveAttribute('aria-checked', 'false');

    const checks = page.locator(`#sub-list-${WITH_SUBS} .subtask-item .sub-check`);
    const n = await checks.count();
    for (let i = 0; i < n; i++) {
        // Список пересортировывается после каждого клика (исполненные уезжают
        // вниз), поэтому каждый раз берём ПЕРВОЕ неисполненное звено.
        await page.locator(`#sub-list-${WITH_SUBS} .subtask-item:not(.checked) .sub-check`).first().click();
        await page.waitForTimeout(120);
    }

    await expect(parentCheck).toHaveAttribute('aria-checked', 'true');
    const st = await app.state();
    const parent = st.tasks.find(t => t.id === WITH_SUBS);
    expect(parent.checked).toBe(true);
    expect(parent.subtasks.every(s => s.checked)).toBe(true);
});
