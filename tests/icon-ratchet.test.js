// Ратчет иконочного инвентаря: любой inline-SVG приложения обязан быть в
// audit-v2/icon-registry.json. Новый/изменённый глиф без записи в реестре =
// красный тест → пропуски вида «иконку нарисовали, а в программу редизайна
// она не попала» невозможны молча.
//
// Появился легитимный новый глиф: `node scripts/icon-inventory.mjs --update`,
// затем проставить ему role (вердикт/derive/decor) в реестре тем же коммитом.
import { describe, it, expect } from 'vitest';
import { diff } from '../scripts/icon-inventory.mjs';

describe('icon ratchet', () => {
  const { unknown, stale, found } = diff();

  it('каждый SVG-глиф в коде есть в icon-registry.json', () => {
    const msg = unknown
      .map((u) => `${u.file}:${u.line} [${u.hash}] ${u.preview}`)
      .join('\n');
    expect(unknown, `непокрытые глифы:\n${msg}`).toEqual([]);
  });

  it('реестр не пуст и соответствует коду', () => {
    expect(found.length).toBeGreaterThan(50);
    // Устаревшие записи (глиф удалён из кода) — не ошибка, но должны чиститься
    // через --update; жёсткий предел, чтобы реестр не гнил бесконечно.
    expect(stale.length).toBeLessThan(15);
  });
});
