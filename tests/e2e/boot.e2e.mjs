// Бут: приложение поднимается, состояние переживает перезагрузку, и при
// расхождении хранилищ выигрывает НОВЕЙШИЙ блоб (V2-B0-02).
import { test, expect } from './fixtures/app.mjs';
import { richSeed, withSeq } from './fixtures/seed.mjs';

test('приложение поднимается на засеянном состоянии без ошибок консоли', async ({ app, page, errors, net }) => {
    await app.open();

    await expect(page.locator('.task-item')).toHaveCount(14);
    expect(await page.locator('.group-section').count()).toBe(3);
    expect(net).toEqual([]);
    expect(errors).toEqual([]);
});

test('перезагрузка отдаёт то же состояние (IDB-first бут)', async ({ app, page }) => {
    await app.open();
    await app.addTask('Обет, переживший перезагрузку');
    await app.idbSettled();

    const before = await app.taskTexts();
    await app.reload();

    expect(await app.taskTexts()).toEqual(before);
    await expect(page.locator('.task-item')).toHaveCount(15);
});

// Долг W0 из FIX-PLAN: зонд s4_p0_idbboot сеял блобы БЕЗ _saveSeq и потому
// показывал легаси-путь (IDB безусловно главный), а не сам фикс 4b18b42.
// Здесь сравниваются именно счётчики: LS новее → LS и должен загрузиться.
test('seq-aware бут: более новый localStorage побеждает отставшую IDB', async ({ app, page }) => {
    const base = richSeed();
    const ls = withSeq(base, 2, 'МЕТКА-LS-НОВЕЕ');
    const idb = withSeq(base, 1, 'МЕТКА-IDB-СТАРЬЁ');

    await app.open({ seed: ls, idb });

    const texts = await app.taskTexts();
    expect(texts).toContain('МЕТКА-LS-НОВЕЕ');
    expect(texts).not.toContain('МЕТКА-IDB-СТАРЬЁ');

    // Проигравший слой должен быть тут же обновлён победителем, иначе
    // следующий бут снова разойдётся.
    await app.idbSettled();
    const mirrored = await app.idbState();
    expect(mirrored.tasks.some(t => t.text === 'МЕТКА-LS-НОВЕЕ')).toBe(true);
    expect(mirrored._saveSeq).toBeGreaterThanOrEqual(2);
});

test('seq-aware бут: более новая IDB побеждает отставший localStorage', async ({ app }) => {
    const base = richSeed();
    const ls = withSeq(base, 1, 'МЕТКА-LS-СТАРЬЁ');
    const idb = withSeq(base, 3, 'МЕТКА-IDB-НОВЕЕ');

    await app.open({ seed: ls, idb });

    const texts = await app.taskTexts();
    expect(texts).toContain('МЕТКА-IDB-НОВЕЕ');
    expect(texts).not.toContain('МЕТКА-LS-СТАРЬЁ');
});
