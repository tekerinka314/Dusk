// Панель синхронизации: открывается, недоступный пункт выглядит и ведёт себя
// погашенным (V2-B4-05), Esc закрывает. Живой OAuth не трогаем.
import { test, expect } from './fixtures/app.mjs';

test('панель синка открывается, мёртвый пункт погашен, Esc закрывает', async ({ app, page }) => {
    await app.open();

    await page.click('#sync-glyph-btn');
    const panel = page.locator('.sync-panel');
    await expect(panel).toBeVisible();

    // Без входа «Синхронизировать сейчас» недостижим — оба атрибута сразу:
    // нативный disabled блокирует клик, aria-disabled делает состояние
    // произносимым.
    const dead = panel.locator('[data-act="syncNowManual"]');
    await expect(dead).toBeDisabled();
    await expect(dead).toHaveAttribute('aria-disabled', 'true');

    // Скин погашенности — не только атрибут: до фикса строка выглядела живой.
    const skin = await dead.evaluate(el => {
        const cs = getComputedStyle(el);
        return { opacity: parseFloat(cs.opacity), cursor: cs.cursor };
    });
    expect(skin.opacity).toBeLessThan(0.7);
    expect(skin.cursor).toBe('not-allowed');

    await page.keyboard.press('Escape');
    await expect(panel).toHaveCount(0);
});
