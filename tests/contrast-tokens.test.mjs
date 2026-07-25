// W2-2 — V2-B5-01 (просроченный чип) + V2-B5-12 (общий тусклый токен).
//
// Регрессионный замок на КОНТРАСТ. Ratio считается не «токен против чёрного»,
// а против РЕАЛЬНОГО фона, замеренного зондом D:/tmp/pw/b1/s3_contrast3.mjs
// (скриншот → пиксель под текстом): статусные чипы дедлайна лежат на своей
// красной подложке, а не на почти-чёрной карточке, и вдобавок приглушены
// собственной `opacity` — оба множителя учтены ниже.
//
// Порог 4.5:1 = WCAG 2.2 AA для мелкого текста (все эти надписи 10-16px).
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const CSS = fs.readFileSync(
    path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'style.css'), 'utf8');

/** значение токена из :root */
function token(name) {
    const m = CSS.match(new RegExp('\\n\\s*' + name + '\\s*:\\s*([^;]+);'));
    if (!m) throw new Error('токен не найден: ' + name);
    return m[1].trim();
}
/** число из объявления вида `.dl-absolute { … opacity: 0.92 … }` */
function decl(selector, prop) {
    const block = CSS.match(new RegExp('\\n' + selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*\\{([^}]*)\\}'));
    if (!block) throw new Error('правило не найдено: ' + selector);
    const m = block[1].match(new RegExp(prop + '\\s*:\\s*([^;]+)'));
    if (!m) throw new Error(`${selector} не объявляет ${prop}`);
    return m[1].trim();
}

const rgb = (hex) => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
const lum = (c) => {
    const f = c.map(v => v / 255).map(v => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * f[0] + 0.7152 * f[1] + 0.0722 * f[2];
};
const overlay = (fg, alpha, bg) => fg.map((v, i) => v * alpha + bg[i] * (1 - alpha));
const ratio = (a, b) => {
    const [x, y] = [lum(a) + 0.05, lum(b) + 0.05];
    return Math.max(x, y) / Math.min(x, y);
};
/** контраст токена, приглушённого opacity, на замеренном фоне */
const contrast = (hex, alpha, bgRGB) => ratio(overlay(rgb(hex), alpha, bgRGB), bgRGB);

const AA = 4.5;

// Фоны — пиксели, снятые зондом с собранного dist (2026-07-25).
const BG = {
    card:     [7, 2, 22],    // карточка задачи
    input:    [8, 3, 29],    // поле ввода
    chipOver: [50, 1, 20],   // чип «просрочено»  (--deadline-over-bg над карточкой)
    chipCrit: [53, 3, 27],   // чип «сегодня»     (--deadline-critical-bg над карточкой)
    chipWarn: [13, 9, 61],   // чип «через N дней»
    chipUrg:  [47, 22, 16],  // чип «завтра»
};

describe('W2-2 — контраст токенов ≥ AA на реальных фонах', () => {
    it('.dl-absolute гасит ink не сильнее, чем допускает запас (V2-B5-01)', () => {
        // 0.80 стоило чипам до 1.6 пункта ratio и роняло даже проходившие статусы
        expect(parseFloat(decl('.dl-absolute', 'opacity'))).toBeGreaterThanOrEqual(0.9);
        expect(parseFloat(decl('.dl-absolute', 'font-size'))).toBeGreaterThanOrEqual(10);
    });

    const dimAbs = () => parseFloat(decl('.dl-absolute', 'opacity'));

    it('просроченный дедлайн ≥ AA обеими половинами чипа (V2-B5-01)', () => {
        const c = token('--deadline-over');
        expect(contrast(c, 1, BG.chipOver)).toBeGreaterThanOrEqual(AA);          // «просрочено»
        expect(contrast(c, dimAbs(), BG.chipOver)).toBeGreaterThanOrEqual(AA);   // дата
    });

    it('критичный дедлайн ≥ AA обеими половинами чипа', () => {
        const c = token('--deadline-critical');
        expect(contrast(c, 1, BG.chipCrit)).toBeGreaterThanOrEqual(AA);
        expect(contrast(c, dimAbs(), BG.chipCrit)).toBeGreaterThanOrEqual(AA);
    });

    it('срочный и предупреждающий статусы ≥ AA', () => {
        expect(contrast(token('--deadline-urgent'), dimAbs(), BG.chipUrg)).toBeGreaterThanOrEqual(AA);
        expect(contrast(token('--deadline-warn'), dimAbs(), BG.chipWarn)).toBeGreaterThanOrEqual(AA);
    });

    it('общий тусклый токен держит ЗАПАС, а не пол AA (V2-B5-12)', () => {
        const muted = token('--text-muted');
        // 5.5:1 на карточке = запас на светлые области фоновой картинки и на
        // потребителей, которые сами глушат текст (подсказка квик-эдда, 0.85)
        expect(contrast(muted, 1, BG.card)).toBeGreaterThanOrEqual(5.5);
        expect(contrast(muted, 1, BG.input)).toBeGreaterThanOrEqual(5.5);
        expect(contrast(muted, 0.85, BG.card)).toBeGreaterThanOrEqual(AA);
    });

    it('иерархия текста сохранена: primary > secondary > muted', () => {
        const [p, s, m] = ['--text-primary', '--text-secondary', '--text-muted']
            .map(t => contrast(token(t), 1, BG.card));
        expect(p).toBeGreaterThan(s);
        expect(s).toBeGreaterThan(m);
    });
});
