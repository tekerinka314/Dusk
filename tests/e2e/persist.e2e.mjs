// Хвост последовательности (V2-B6-08): пачка быстрых правок и НЕМЕДЛЕННАЯ
// перезагрузка — ни одна правка не должна откатиться.
//
// ⚠ Здесь намеренно НЕ ждём, пока IDB-зеркало догонит: именно эта гонка и
// была багом. Перезагрузка обязана поднять более новый localStorage
// (_saveSeq newer-wins), а не отставшую IndexedDB.
import { test, expect } from './fixtures/app.mjs';

test('пачка правок переживает немедленную перезагрузку', async ({ app, page }) => {
    await app.open();
    const N = 8;

    for (let i = 1; i <= N; i++) {
        await page.fill('#input-box', `Спешный обет ${i}`);
        await page.click('#btn-add');
    }
    // Правки в состоянии есть — но зеркалу времени догнать НЕ даём.
    const live = await app.taskTexts();
    for (let i = 1; i <= N; i++) expect(live).toContain(`Спешный обет ${i}`);

    await app.reload();

    const after = await app.taskTexts();
    for (let i = 1; i <= N; i++) {
        expect(after, `правка ${i} откатилась`).toContain(`Спешный обет ${i}`);
    }
    await expect(page.locator('.task-item')).toHaveCount(14 + N);
});
