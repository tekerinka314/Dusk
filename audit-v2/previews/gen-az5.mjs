// AZ6 — уроборос. Хвост сужается СПИРАЛЬЮ (кромки сходятся к осевой радиуса),
// поэтому таперинг реальный, а стык с дугой — касательный (излома нет).
import { writeFileSync } from 'fs';
const C = 12, R_OUT = 8.15, R_IN = 6.85, R_MID = 7.55;
const rad = a => a * Math.PI / 180;
const pt = (a, r) => [ +(C + r * Math.cos(rad(a))).toFixed(2), +(C + r * Math.sin(rad(a))).toFixed(2) ];

const HEAD_UP = `<path fill="currentColor" stroke="none" fill-rule="evenodd" d="M16.37 5.63 C14.6 3.95 11.9 3.35 9.55 4.65 C11.6 5.5 14.0 6.35 15.63 6.79 Z M14.72 5.35 a0.43 0.43 0 1 0 -0.86 0 a0.43 0.43 0 1 0 0.86 0 Z"/>`;
// глотка: клин ВНУТРИ силуэта головы — смыкает заднюю часть пасти, под ним кончается хвост
const THROAT = `<path fill="currentColor" stroke="none" d="M16.37 5.63 L15.63 6.79 L15.3 7.4 L15.75 8.15 C16.45 7.35 16.6 6.5 16.37 5.63 Z"/>`;
// нижняя челюсть опущена на 0.4 — в хвост не упирается
// (кончик укорочен: раньше он доходил до самой кромки кольца и языку негде было выйти)
const HEAD_LOW = `<g transform="translate(0 0.4)">` +
  `<path fill="currentColor" stroke="none" d="M15.3 7.0 C13.8 8.2 12.3 8.85 11.4 8.95 C12.6 9.35 14.0 9.0 15.7 7.7 Z"/>` +
  `<path fill="currentColor" stroke="none" d="M13.5 8.42 L13.85 8.3 L13.55 7.5 Z"/>` +
  `<path fill="currentColor" stroke="none" d="M11.9 8.82 L12.25 8.75 L12.05 8.0 Z"/></g>`;
const TEETH_UP = `<path fill="currentColor" stroke="none" d="M13.9 6.28 L14.3 6.38 L13.75 7.3 Z"/>` +
  `<path fill="currentColor" stroke="none" d="M12.2 5.72 L12.6 5.85 L12.05 6.78 Z"/>` +
  `<path fill="currentColor" stroke="none" d="M10.65 5.05 L11.0 5.22 L10.6 6.05 Z"/>`;
const TH = [15.95, 6.9];
const TX = 15.35, TY = 5.05, S = 1.25, ROT = 8;
const HEAD_G = `<g transform="translate(${TX} ${TY}) rotate(${ROT}) scale(${S}) translate(${-TH[0]} ${-TH[1]})">${THROAT}${HEAD_UP}${HEAD_LOW}${TEETH_UP}</g>`;

// точка схождения хвоста = глубина пасти (у смыкания челюстей), в координатах глифа
const map = (x, y) => {
  const u = (x - TH[0]) * S, v = (y - TH[1]) * S, c = Math.cos(rad(ROT)), sn = Math.sin(rad(ROT));
  return [ TX + c * u - sn * v, TY + sn * u + c * v ];
};
const TIP = map(15.5, 6.9);
const A_TIP = Math.atan2(TIP[1] - C, TIP[0] - C) * 180 / Math.PI;   // ≈ -69°

const A_TAPER = -122;               // где хвост начинает сужаться (до входа в пасть)
const A_END   = A_TIP + 360;        // конец обхода
const SPAN    = A_END - (A_TAPER + 360);

// спираль: радиусы кромок сходятся к осевой; шаг мелкий → стык и кривая гладкие
function taperEdge(r0) {
  let d = '';
  const N = 22;
  for (let k = 0; k <= N; k++) {
    const u = k / N, e = Math.pow(u, 1.35);
    const a = A_TAPER + SPAN * u;
    const r = r0 + (R_MID - r0) * e;
    const [x, y] = pt(a, r);
    d += (k ? ` L${x} ${y}` : `M${x} ${y}`);
  }
  return d;
}
function scales(a0, a1, step = 13) {
  let out = '';
  for (let a = -180; a < 180; a += step) {
    if (a > a0 && a < a1) continue;
    const [x1, y1] = pt(a, R_OUT - 0.55), [x2, y2] = pt(a + 4, R_IN + 0.5);
    out += `<path d="M${x1} ${y1} L${x2} ${y2}" stroke-width="0.42" opacity="0.6"/>`;
  }
  return out;
}
// дуга постоянного радиуса: от точки под головой вокруг до начала сужения
function ring(r, sw) {
  const [x1, y1] = pt(A_TIP + 1.5, r), [x2, y2] = pt(A_TAPER, r);
  return `<path d="M${x1} ${y1} A${r} ${r} 0 1 1 ${x2} ${y2}" stroke-width="${sw}"/>`;
}

// язык: начинается в глотке под хвостом, идёт над верхней кромкой нижней челюсти,
// выходит мимо её кончика и стекает внутрь кольца. Ни хвоста, ни челюсти не касается.
const TONGUE = `<path d="M12.9 6.1 C11.8 6.5 10.6 6.75 9.75 6.85 C9.5 6.88 9.3 6.9 9.15 6.95 C8.5 7.5 8.05 8.4 8.05 9.25" stroke-width="0.55"/>` +
  `<path d="M8.05 9.25 L7.45 9.95 M8.05 9.25 L8.75 9.85" stroke-width="0.48"/>`;

const build = (withScales = true) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.0" stroke-linecap="round" stroke-linejoin="round" stroke-miterlimit="4">` +
  ring(R_OUT, 0.85) + ring(R_IN, 0.75) +
  `<path d="${taperEdge(R_OUT)}" stroke-width="0.85"/>` +
  `<path d="${taperEdge(R_IN)}" stroke-width="0.75"/>` +
  (withScales ? scales(-136, -42) : '') +
  HEAD_G + TONGUE + `</svg>`;

const AZ = build(true), AZ_BARE = build(false);
writeFileSync('az6-glyphs.txt', `AZ6:\n${AZ}\n\nAZ6 bare:\n${AZ_BARE}\n`);

const OLD = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.0" stroke-linecap="round" stroke-linejoin="miter" stroke-miterlimit="4"><path d="M16.32 5.69 A8.15 8.15 0 1 1 7.68 5.69" stroke-width="0.85"/><path d="M15.63 6.79 A6.85 6.85 0 1 1 8.37 6.79" stroke-width="0.75"/><path d="M7.68 5.69 C8.61 5.11 8.75 5.95 10.75 7.3" stroke-width="0.75"/><path d="M8.37 6.79 C9.3 6.21 9.35 7.55 10.75 7.3" stroke-width="0.68"/><path fill="currentColor" stroke="none" fill-rule="evenodd" d="M16.37 5.63 C14.6 3.95 11.9 3.35 9.55 4.65 C11.6 5.5 14.0 6.35 15.63 6.79 Z M14.72 5.35 a0.43 0.43 0 1 0 -0.86 0 a0.43 0.43 0 1 0 0.86 0 Z"/><path fill="currentColor" stroke="none" d="M15.3 7.0 C13.5 8.3 11.6 8.9 10.3 8.85 C12.0 9.5 13.9 9.05 15.7 7.7 Z"/><path d="M10.5 7.6 C9.85 8.95 9.75 10.3 10.15 11.4" stroke-width="0.55" opacity="0.9"/><path d="M10.15 11.4 L9.2 12.4 M10.15 11.4 L10.95 12.3" stroke-width="0.5" opacity="0.9"/></svg>`;
const sz = (svg, list) => list.map(c => `<span class="g${c}">${svg}</span>`).join('');
writeFileSync(process.argv[2] || 'out.html', `<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8">
<title>AZ6 — уроборос: сужающийся хвост в глотке</title>
<style>
 body{background:#0a0417;color:#b880e8;font:14px/1.6 Georgia,serif;padding:28px 34px}
 h1{font-size:17px;color:#f0e8ff;letter-spacing:2px} h2{font-size:13px;color:#c090ff;letter-spacing:1.5px;margin:32px 0 6px;text-transform:uppercase}
 .row{display:flex;gap:26px;align-items:flex-end;flex-wrap:wrap}
 .cell{display:flex;flex-direction:column;align-items:center;gap:8px;background:#120826;border:1px solid rgba(170,90,255,.3);border-radius:10px;padding:16px 20px;min-width:120px}
 .cell.rec{border-color:rgba(200,140,255,.7);box-shadow:0 0 16px rgba(150,70,255,.18)} .cell.old{opacity:.5}
 .lbl{font-size:10.5px;letter-spacing:1px;color:#9068c0;text-transform:uppercase} .cell.rec .lbl{color:#e0c0ff}
 .sizes{display:flex;gap:16px;align-items:center}
 .g160 svg{width:160px;height:160px}.g96 svg{width:96px;height:96px}.g48 svg{width:48px;height:48px}
 .g36 svg{width:36px;height:36px}.g24 svg{width:24px;height:24px}.g16 svg{width:16px;height:16px}.g9 svg{width:9px;height:9px}
 .tagline{font-size:11px;color:#7a50a8;text-align:center;max-width:26ch}
 ul{font-size:12.5px;color:#9068c0;max-width:78ch}
</style></head><body>
<h1>AZ6 · уроборос — третий круг правок</h1>
<ul>
 <li><b>Хвост сужается по-настоящему.</b> Последняя четверть тела — спираль: радиусы обеих
     кромок плавно сходятся к осевой, поэтому лента сужается от полной ширины до нуля на
     протяжении ~53° и кончается точкой. Ширина уменьшается монотонно, без ступеней.</li>
 <li><b>Излома нет физически.</b> Сужение начинается ровно там, где кончается дуга, тем же
     радиусом и тем же направлением — стык касательный, а не стык двух разных кривых.</li>
 <li><b>Язык не висит в воздухе и не пересекает хвост.</b> Начинается в глотке, под хвостом,
     идёт над верхней кромкой нижней челюсти (зазор ≥0.9 до хвоста и ≥0.3 до челюсти),
     выходит мимо её кончика и стекает внутрь кольца.</li>
 <li>Кольцо — идеальная окружность; отдельной «шеи» нет, дуги уходят под сам силуэт головы;
     нижняя челюсть опущена. Голова — принятая (8da6acd), не перерисована.</li>
</ul>
<h2>AZ6 · гравюра (повтор)</h2>
<div class="row">
  <div class="cell rec"><span class="lbl">AZ6 · повтор</span><div class="sizes">${sz(AZ, [160, 96, 48, 36, 24, 16])}</div><span class="tagline">160 / 96 / 48 / 36 / 24 / 16 px</span></div>
  <div class="cell old"><span class="lbl">AZ3b — было</span><div class="sizes">${sz(OLD, [96, 24])}</div><span class="tagline">излом, торчащий хвост, язык вниз</span></div>
</div>
<h2>cycleReturn — тот же глиф, меньше</h2>
<div class="row">
  <div class="cell rec"><span class="lbl">один в один</span><div class="sizes">${sz(AZ, [24, 16, 9])}</div><span class="tagline">24 / 16 / 9 px</span></div>
  <div class="cell"><span class="lbl">без чешуи (опция для 9px)</span><div class="sizes">${sz(AZ_BARE, [24, 16, 9])}</div><span class="tagline">та же геометрия, сняты штрихи</span></div>
</div>
</body></html>`);
console.log('tip', TIP.map(v => v.toFixed(2)).join(','), 'aTip', A_TIP.toFixed(1));
