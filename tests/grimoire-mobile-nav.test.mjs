// V2-B1-16 — на телефоне рельса оглавления скрыта совсем (222px рядом с 360px
// контента не живут), и замены ей не было: по длинной записи прыгать нечем.
// Вердикт юзера: нижняя СТВОРКА — та же идиома, что и остальные action-sheet.
//
// V2-B1-25 — тулбар форматирования прибит к верху записи: на телефоне до него
// тянуться через полэкрана. Вердикт юзера: липкий тулбар, причём и на ПК.
import { it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const css  = readFileSync(new URL('../style.css', import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const grim = readFileSync(new URL('../dusk/02-grimoire.ts', import.meta.url), 'utf8');
const core = readFileSync(new URL('../dusk/01-core.ts', import.meta.url), 'utf8');

const rule = (sel) => {
    const esc = sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return [...css.matchAll(new RegExp(`(^|\\})[^{}]*${esc}\\s*\\{([^}]*)\\}`, 'g'))].map(m => m[2]).join(' ');
};
// одноимённых @media в файле несколько (правила лежат рядом со своей темой),
// поэтому склеиваем ВСЕ блоки с этим условием, а не только первый.
const mediaBlock = (mq) => {
    const out = [];
    let from = css.indexOf(`@media (${mq})`);
    while (from >= 0) {
        let depth = 0;
        for (let j = css.indexOf('{', from); j < css.length; j++) {
            if (css[j] === '{') depth++;
            else if (css[j] === '}') { depth--; if (!depth) { out.push(css.slice(from, j + 1)); break; } }
        }
        from = css.indexOf(`@media (${mq})`, from + 1);
    }
    return out.join('\n');
};

it('кнопка оглавления жива и на телефоне', () => {
    // раньше показ был заперт в @media (min-width: 641px)
    const wide = mediaBlock('min-width: 641px');
    expect(wide).not.toMatch(/toc-avail[^{]*\.grim-toc-toggle/);
    expect(rule('.grim-page.toc-avail .grim-toc-toggle')).toMatch(/display:\s*inline-flex/);
});

it('на узком экране оглавление открывается створкой, а не рельсой', () => {
    expect(grim).toMatch(/function _grimTocIsSheet/);
    expect(grim).toMatch(/function grimToggleToc[\s\S]{0,400}_grimTocIsSheet\(\)/);
    expect(grim).toMatch(/_openFloatMenu\([^)]*grim-toc-sheet/);
});

it('строка створки — обычный пункт меню и ведёт к тому же прыжку', () => {
    expect(grim).toMatch(/role="menuitem"[^`]*data-act="_grimTocPick"/);
    expect(grim).toMatch(/function _grimTocPick[\s\S]{0,200}_grimTocGo/);
    expect(core).toMatch(/_grimTocPick/);          // канал диспетчера зарегистрирован
});

it('тулбар записи липкий на обоих тирах', () => {
    const narrow = mediaBlock('max-width: 640px');
    const wide   = mediaBlock('min-width: 641px');
    expect(wide).toMatch(/\.fmt-bar[^{]*\{[^}]*position:\s*sticky/);
    expect(wide).toMatch(/\.fmt-bar[^{]*\{[^}]*top:/);
    expect(narrow).toMatch(/\.fmt-bar[^{]*\{[^}]*position:\s*sticky/);
    expect(narrow).toMatch(/\.fmt-bar[^{]*\{[^}]*bottom:/);
});

it('липкий тулбар на телефоне держится над зоной жеста', () => {
    const narrow = mediaBlock('max-width: 640px');
    expect(narrow).toMatch(/\.fmt-bar[^{]*\{[^}]*safe-area-inset-bottom/);
});

it('на телефоне тулбар уходит в конец потока — иначе липкость мнимая', () => {
    // замер: sticky+bottom у элемента в НАЧАЛЕ контейнера просто уезжает вверх
    const narrow = mediaBlock('max-width: 640px');
    expect(narrow).toMatch(/\.grim-page-main[^{]*\{[^}]*flex-direction:\s*column/);
    expect(narrow).toMatch(/\.fmt-bar[^{]*\{[^}]*order:\s*9/);
});

it('и поднимается над клавиатурой', () => {
    // layout viewport под клавиатурой не сжимается — её высоту считает JS
    expect(mediaBlock('max-width: 640px')).toMatch(/\.fmt-bar[^{]*\{[^}]*var\(--kb-inset/);
    expect(grim).toMatch(/function _kbInsetSync[\s\S]{0,300}--kb-inset/);
    expect(grim).toMatch(/visualViewport\.addEventListener\('resize', _kbInsetSync\)/);
});
