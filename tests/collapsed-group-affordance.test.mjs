// V2-B4-04 — свёрнутый свод отличался от развёрнутого одним прочерком справа:
// на широком экране закрытую плиту было не отличить от открытой. Лечение —
// язык склепа, а не новый мотив: шов у нижней кромки (плита запечатана),
// приглушённое имя, повёрнутый меч-шеврон (он уже был).
import { it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../style.css', import.meta.url), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '');

const rule = (sel) => {
    const esc = sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const hits = [...css.matchAll(new RegExp(`(^|\\})[^{}]*${esc}\\s*\\{([^}]*)\\}`, 'g'))];
    return hits.map(m => m[2]).join(' ');
};

it('закрытая плита несёт шов у нижней кромки', () => {
    expect(rule('.group-section.collapsed .group-header')).toMatch(/box-shadow:\s*[^;]*inset/);
});

it('имя закрытого свода приглушено', () => {
    expect(rule('.group-section.collapsed .group-title')).toMatch(/color:/);
});

it('меч-шеврон остаётся знаком состояния', () => {
    expect(rule('.group-section.collapsed .group-chevron')).toMatch(/rotate\(-90deg\)/);
});

it('шов появляется плавно, а не скачком', () => {
    expect(rule('.group-header')).toMatch(/transition:[^;]*box-shadow/);
});
