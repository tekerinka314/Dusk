// Жизненный цикл обета через настоящий UI: дать, исполнить, уничтожить с
// отменой, сменить ранг, приковать.
import { test, expect } from './fixtures/app.mjs';

const ROW = (id) => `.task-item[data-id="${id}"]`;
const PLAIN = 12;      // «Обычный обет без ничего» — без свода, звеньев и исхода

test('дать обет: строка появляется и уходит в состояние', async ({ app, page }) => {
    await app.open();

    await app.addTask('Обет, данный смоуком');

    await expect(page.locator('.task-item')).toHaveCount(15);
    expect(await app.taskTexts()).toContain('Обет, данный смоуком');

    const st = await app.state();
    expect(st.tasks.some(t => t.text === 'Обет, данный смоуком')).toBe(true);
    expect(await page.inputValue('#input-box')).toBe('');
});

test('исполнить обет: чек проставлен и записан', async ({ app, page }) => {
    await app.open();

    const check = page.locator(`${ROW(PLAIN)} .task-check`);
    await expect(check).toHaveAttribute('aria-checked', 'false');

    await check.click();

    await expect(page.locator(`${ROW(PLAIN)} .task-check`)).toHaveAttribute('aria-checked', 'true');
    const st = await app.state();
    expect(st.tasks.find(t => t.id === PLAIN).checked).toBe(true);
});

test('уничтожить обет: отмена в тосте возвращает его целиком', async ({ app, page }) => {
    await app.open();
    const before = await app.state();
    const victim = before.tasks.find(t => t.id === PLAIN);

    await page.click(`${ROW(PLAIN)} [data-act="deleteTaskForever"]`);

    await expect(page.locator(ROW(PLAIN))).toHaveCount(0);
    await expect(page.locator('.toast-undo-btn')).toBeVisible();

    await page.click('.toast-undo-btn');

    await expect(page.locator(ROW(PLAIN))).toHaveCount(1);
    const after = await app.state();
    const back = after.tasks.find(t => t.id === PLAIN);
    expect(back.text).toBe(victim.text);
    expect(back.uid).toBe(victim.uid);
    // Отмена не должна оставлять надгробие: обет вернулся живым.
    expect((after.tombstones || []).some(t => t.uid === victim.uid)).toBe(false);
});

test('сменить ранг через модалку', async ({ app, page }) => {
    await app.open();

    await page.click(`${ROW(PLAIN)} [data-act="openPrioModal"]`);
    await expect(page.locator('#prio-modal')).toBeVisible();

    await page.click('#modal-prio-selector [data-prio="high"]');

    await expect(page.locator('#prio-modal')).toBeHidden();
    const st = await app.state();
    expect(st.tasks.find(t => t.id === PLAIN).priority).toBe('high');
});

test('приковать обет: он поднимается над непрокованными', async ({ app, page }) => {
    await app.open();

    const plainText = (await app.state()).tasks.find(t => t.id === PLAIN).text;
    // Сравнивать можно только ВНУТРИ одной секции: обеты со сводом рисуются
    // своим блоком, и позиция относительно чужой секции ничего не значит.
    // Обет 9 — тоже без свода, ранг выше, приковки нет.
    const loose = (await app.state()).tasks.find(t => t.id === 9).text;

    const before = await app.taskTexts();
    expect(before.indexOf(plainText)).toBeGreaterThan(before.indexOf(loose));

    await page.click(`${ROW(PLAIN)} [data-act="togglePin"]`);

    expect((await app.state()).tasks.find(t => t.id === PLAIN).pinned).toBe(true);
    const after = await app.taskTexts();
    expect(after.indexOf(plainText)).toBeLessThan(after.indexOf(loose));
});
