// Исходы: статус чипа считается по времени, отсрочка сдвигает срок.
import { test, expect } from './fixtures/app.mjs';

const OVERDUE = 2;   // исход вчера 09:00 → 'over'
const NEXTYEAR = 7;  // год +1 → 'urgent'

test('статус чипа исхода отражает срок', async ({ app, page }) => {
    await app.open();

    await expect(page.locator(`.task-item[data-id="${OVERDUE}"] .deadline-tag`)).toHaveClass(/\bover\b/);
    await expect(page.locator(`.task-item[data-id="${NEXTYEAR}"] .deadline-tag`)).toHaveClass(/\burgent\b/);
});

test('отсрочка сдвигает исход и снимает просрочку', async ({ app, page }) => {
    await app.open();
    const before = (await app.state()).tasks.find(t => t.id === OVERDUE).deadline;

    await page.click(`.task-item[data-id="${OVERDUE}"] .btn-snooze`);
    await page.click('[data-act="snoozeDeadline"][data-snz="week"]');
    await page.waitForTimeout(200);

    const after = (await app.state()).tasks.find(t => t.id === OVERDUE).deadline;
    expect(after.value).not.toBe(before.value);
    expect(new Date(after.value).getTime()).toBeGreaterThan(new Date(before.value).getTime());
    await expect(page.locator(`.task-item[data-id="${OVERDUE}"] .deadline-tag`)).not.toHaveClass(/\bover\b/);
});
