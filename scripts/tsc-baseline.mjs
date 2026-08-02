// Гейт типов с БАЗЛАЙНОМ. `tsc --noEmit` на этом проекте не бывает чистым: 12
// модулей склеиваются через globalThis-мосты (см. AGENTS.md), и часть forward-ссылок
// TypeScript увидеть не может. Значение имеет не ноль, а «не БОЛЬШЕ, чем вчера».
//
// Поэтому гейт сравнивает число ошибок с базлайном и падает только на РОСТЕ.
// Если вы честно уменьшили число ошибок — опустите BASELINE в этом файле тем же
// коммитом, иначе следующий исполнитель потеряет достижение.
import { spawnSync } from 'node:child_process';

const BASELINE = 27;   // на 2026-08-02, build 2026-07-28-18

// shell:true нужен под Windows, чтобы нашёлся npx.cmd; аргументы здесь наши
// собственные и не приходят извне, так что склейка безопасна.
const r = spawnSync('npx tsc --noEmit', { encoding: 'utf8', shell: true });
const out = (r.stdout || '') + (r.stderr || '');
const lines = out.split('\n').filter(l => /error TS\d+/.test(l));
const n = lines.length;

if (n > BASELINE) {
    console.error(`✗ ошибок типов ${n}, базлайн ${BASELINE} — выросло на ${n - BASELINE}.`);
    console.error('Новые/все ошибки:');
    console.error(lines.join('\n'));
    process.exit(1);
}

if (n < BASELINE) {
    console.log(`✓ ошибок типов ${n} против базлайна ${BASELINE} — стало меньше.`);
    console.log(`  Опустите BASELINE до ${n} в scripts/tsc-baseline.mjs тем же коммитом.`);
    process.exit(0);
}

console.log(`✓ ошибок типов ${n} — ровно базлайн.`);
