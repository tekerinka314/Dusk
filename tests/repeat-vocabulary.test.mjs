// V2-B5-08 — в приложении ДВА разных повторения: круговорот обета (клавиша R,
// уроборос, `cycleChecked`/`nextReset`) и перенос самого исхода (тумблер в
// модалке исхода). Оба говорили словом «повтор», а тумблер вдобавок назывался
// «Авто-круговорот исхода» — то есть занимал слово чужой механики.
//
// Ратифицировано (Fable + вердикт юзера 2026-07-28): «круговорот» и уроборос —
// ТОЛЬКО у обета; тумблер исхода получает своё слово и однострочный пояснитель,
// который прямо снимает вопрос «станет ли обет круговоротным».
import { it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const dl   = readFileSync(new URL('../dusk/06-deadlines.ts', import.meta.url), 'utf8');

const labels = () => {
    const map = dl.slice(dl.indexOf('const _DL_REPEAT_LABELS'));
    const body = map.slice(0, map.indexOf('};') + 2);
    return ['weektime', 'time', 'monthday'].map(mode => {
        const row = body.match(new RegExp(`${mode}:\\s*\\{([^}]*)\\}`))[1];
        return {
            mode,
            t: row.match(/t:\s*'([^']*)'/)[1],
            s: row.match(/s:\s*'([^']*)'/)[1],
        };
    });
};

it('тумблер исхода не занимает слово чужой механики', () => {
    const tag = html.match(/<button[^>]*id="dl-repeat-toggle"[\s\S]*?>/)[0];
    expect(tag).not.toMatch(/круговорот/i);
    labels().forEach(l => expect(l.t).not.toMatch(/^Повтор/));
});

it('каждая подпись тумблера говорит именно об исходе', () => {
    labels().forEach(l => {
        expect(l.t).toMatch(/[Ии]сход/);
        expect(l.t).toMatch(/недел|день|месяц/);
    });
});

// ⚠ Находка аудита описывала механику НЕВЕРНО («обет не станет повторяющимся»).
// Замок держит копирайт на стороне КОДА: `_applyAutoRepeatToTarget` ставит
// obj.repeat, значит подпись обязана это обещать, а не отрицать.
it('пояснитель честен про круговорот, который тумблер реально назначает', () => {
    expect(dl).toMatch(/function _applyAutoRepeatToTarget[\s\S]{0,400}obj\.repeat = rep/);
    labels().forEach(l => {
        expect(l.s).toMatch(/обет/i);
        expect(l.s).toMatch(/круговоротн/i);
        expect(l.s).not.toMatch(/не станет/i);
    });
});

it('за обетом слово «круговорот» остаётся', () => {
    const tasks = readFileSync(new URL('../dusk/04-tasks.ts', import.meta.url), 'utf8');
    expect(tasks).toMatch(/Назначить круговорот/);
    expect(tasks).toMatch(/Изменить круговорот/);
});
