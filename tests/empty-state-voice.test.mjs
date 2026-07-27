// W2-9 (V2-B2-04 + V2-B5-09) — пустые состояния говорят плотной готикой, у каждого
// состояния СВОЙ глиф, а поиск Гримуара без результата рисует полную плиту.
//
// Замок по ИСХОДНИКАМ (не по рантайму): течь здесь всегда одна и та же — правят
// один экран из четырёх и расходятся голоса/глифы. Рантайм-сторона (перекидывание
// href при фильтре) проверена зондом по dist.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(join(root, 'index.html'), 'utf8');
const css = readFileSync(join(root, 'style.css'), 'utf8');
const f07 = readFileSync(join(root, 'dusk/07-dnd-filter-progress.ts'), 'utf8');
const f02 = readFileSync(join(root, 'dusk/02-grimoire.ts'), 'utf8');

describe('W2-9 · голос пустых состояний', () => {
  it('канцелярских формулировок не осталось ни в разметке, ни в рендере', () => {
    for (const s of ['Нет задач', 'Ничего не найдено', 'Все задачи выполнены',
                     'Добавить первую задачу', 'Добавьте первую']) {
      expect(html.includes(s), `«${s}» в index.html`).toBe(false);
      expect(f07.includes(s), `«${s}» в 07`).toBe(false);
      expect(f02.includes(s), `«${s}» в 02`).toBe(false);
    }
  });

  it('утверждённые строки на своих местах', () => {
    expect(html).toContain('Алтарь пуст');
    expect(html).toContain('Ни одного обета ещё не дано');
    expect(html).toContain('Все обеты исполнены');
    expect(html).toContain('Ночь может забрать своё');
    expect(html).toContain('Дать первый обет');
    expect(html).toContain('Ни одно деяние ещё не погребено');
    expect(f07).toContain('Тишина в ответ');
    expect(f07).toContain('Ни один обет не отозвался на зов');
    expect(f02).toContain('Ни одна запись не отозвалась на зов');
  });

  it('у каждого состояния свой глиф, арт лежит одной копией в <symbol>', () => {
    for (const id of ['icon-candle-unlit', 'icon-coffin-sealed', 'icon-quill']) {
      expect(html).toContain(`<symbol id="${id}"`);
      expect(html).toContain(`href="#${id}"`);
    }
    // перо Гримуара берёт тот же symbol, а не свою копию арта
    expect(f02).toMatch(/quill:\s*`<svg[^`]*<use href="#icon-quill"\/>/);
    // «архив пуст» переиспользует нав-саркофаг, поиск — скраинг-шар
    expect(html).toMatch(/id="archive-empty"[\s\S]{0,700}href="#icon-tomb"/);
    expect(f02).toMatch(/grim-empty-inline[\s\S]{0,400}href="#icon-scrying"/);
  });

  it('фильтр перекидывает заголовок, подстроку И глиф одним куском', () => {
    expect(f07).toMatch(/_msgEl\.textContent\s*=\s*_noTasks\s*\?\s*'Алтарь пуст'/);
    expect(f07).toMatch(/_subEl\.textContent\s*=\s*_noTasks\s*\?/);
    expect(f07).toMatch(/_useEl\.setAttribute\('href',\s*_noTasks\s*\?\s*'#icon-candle-unlit'\s*:\s*'#icon-scrying'\)/);
  });

  it('подстрока и глиф оформлены, голая grim-list-none снята', () => {
    expect(css).toMatch(/^\.empty-sub\s*\{/m);
    expect(css).toMatch(/^\.empty-rune svg\s*\{/m);
    expect(css).toMatch(/^\.grim-empty-inline\s*\{[^}]*display:\s*flex/m);
    expect(css).not.toMatch(/^\.grim-list-none\s*\{/m);
    expect(f02).not.toContain('grim-list-none');
    // руна теперь глиф → доводка входа не должна гасить его до прежних 0.20
    expect(css).toMatch(/@keyframes emptyRuneIn[\s\S]*?100%[^}]*opacity:\s*0\.5/);
    expect(css).toMatch(/@keyframes emptySubIn/);
  });
});
