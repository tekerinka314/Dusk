// V2-B5-07 — под prefers-reduced-motion тост продолжал играть toastAppear 0.3s
// с translateY+scale (замер D:/tmp/pw/b1/w2_b507_toast.mjs на dist подтвердил
// находку: transform менялся во времени и при reduce тоже).
// Замок: RM-блок существует, его keyframes трогают ТОЛЬКО opacity, а transform
// тоста остаётся translateX(-50%) — это центрирование, не движение; обнулив
// его, тост уехал бы вправо на половину ширины.
import { it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const _root = join(dirname(fileURLToPath(import.meta.url)), '..');
const css = readFileSync(join(_root, 'style.css'), 'utf8');

// последний @media-блок reduced-motion, в котором упомянут .toast (победитель каскада)
function rmToastBlock() {
    const re = /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{/g;
    let m, found = null;
    while ((m = re.exec(css))) {
        // сбалансированные скобки от открывающей
        let i = re.lastIndex, depth = 1;
        while (i < css.length && depth > 0) {
            if (css[i] === '{') depth++;
            else if (css[i] === '}') depth--;
            i++;
        }
        const body = css.slice(re.lastIndex, i - 1);
        if (/\.toast\b/.test(body)) found = body;
    }
    return found;
}

const block = rmToastBlock();

it('есть RM-блок, переопределяющий анимации тоста', () => {
    expect(block).not.toBeNull();
    expect(block).toMatch(/\.toast\.show\s*\{[^}]*animation:/);
    expect(block).toMatch(/\.toast\.hide\s*\{[^}]*animation:/);
});

it('RM-анимации тоста — чистая прозрачность, без transform в кейфреймах', () => {
    // тело кейфрейма содержит вложенные блоки from/to → матчим с одним уровнем вложенности
    const frames = [...block.matchAll(/@keyframes\s+([\w-]+)\s*\{((?:[^{}]|\{[^{}]*\})*)\}/g)];
    expect(frames.length).toBeGreaterThanOrEqual(2);
    for (const [, name, body] of frames) {
        expect(body, `${name} не должен двигать элемент`).not.toMatch(/transform|translate|scale|rotate/);
        expect(body, `${name} должен менять opacity`).toMatch(/opacity/);
    }
    // .toast.show/.hide под RM ссылаются именно на эти кейфреймы
    const names = frames.map(f => f[1]);
    for (const st of ['show', 'hide']) {
        const decl = block.match(new RegExp(`\\.toast\\.${st}\\s*\\{[^}]*animation:\\s*([\\w-]+)`));
        expect(names).toContain(decl[1]);
    }
});

it('центрирование тоста сохранено (translateX(-50%) не обнулён)', () => {
    const t = block.match(/\.toast\s*\{([^}]*)\}/);
    expect(t).not.toBeNull();
    expect(t[1]).toMatch(/transform:\s*translateX\(-50%\)\s*;/);
    expect(t[1]).not.toMatch(/transform:\s*none/);
});

it('обычный режим не тронут: .toast.show по-прежнему играет toastAppear', () => {
    const outside = css.replace(/@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*?\n\}/g, '');
    expect(outside).toMatch(/\.toast\.show\s*\{\s*animation:\s*toastAppear/);
});
