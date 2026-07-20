// AZ5 — хвост сходится в точку ровно в глубине пасти; голова растёт из кольца; язык не пересекает челюсть
import { writeFileSync } from 'fs';
const C = 12, R_OUT = 8.15, R_IN = 6.85;
const rad = a => a * Math.PI / 180;
const P = (a, r) => [ +(C + r * Math.cos(rad(a))).toFixed(2), +(C + r * Math.sin(rad(a))).toFixed(2) ];

const HEAD = `<path fill="currentColor" stroke="none" fill-rule="evenodd" d="M16.37 5.63 C14.6 3.95 11.9 3.35 9.55 4.65 C11.6 5.5 14.0 6.35 15.63 6.79 Z M14.72 5.35 a0.43 0.43 0 1 0 -0.86 0 a0.43 0.43 0 1 0 0.86 0 Z"/>` +
// глотка: клин внутри силуэта головы — смыкает заднюю часть пасти, под ним
// прячутся окончания дуг тела (отдельной «шеи» больше нет)
`<path fill="currentColor" stroke="none" d="M16.37 5.63 L15.63 6.79 L15.3 7.4 L15.7 8.1 C16.4 7.4 16.6 6.5 16.37 5.63 Z"/>` +
// нижняя челюсть опущена на 0.4 — не упирается в хвост
`<g transform="translate(0 0.4)">` +
`<path fill="currentColor" stroke="none" d="M15.3 7.0 C13.5 8.3 11.6 8.9 10.3 8.85 C12.0 9.5 13.9 9.05 15.7 7.7 Z"/>` +
`<path fill="currentColor" stroke="none" d="M13.5 8.42 L13.85 8.3 L13.55 7.5 Z"/>` +
`<path fill="currentColor" stroke="none" d="M11.9 8.82 L12.25 8.75 L12.05 8.0 Z"/></g>` +
`<path fill="currentColor" stroke="none" d="M13.9 6.28 L14.3 6.38 L13.75 7.3 Z"/>` +
`<path fill="currentColor" stroke="none" d="M12.2 5.72 L12.6 5.85 L12.05 6.78 Z"/>` +
`<path fill="currentColor" stroke="none" d="M10.65 5.05 L11.0 5.22 L10.6 6.05 Z"/>`;
const NECK = `<path fill="currentColor" stroke="none" d="M16.37 5.63 C17.15 6.35 16.85 7.5 15.7 7.7 L15.3 7.0 L15.63 6.79 Z"/>`;
const TH = [15.95, 6.9];

// точка головы -> координаты глифа
const map = (tx, ty, s, rot) => (x, y) => {
  const u = (x - TH[0]) * s, v = (y - TH[1]) * s, c = Math.cos(rad(rot)), sn = Math.sin(rad(rot));
  return [ +(tx + c * u - sn * v).toFixed(2), +(ty + sn * u + c * v).toFixed(2) ];
};

function scales(a0, a1, step = 13) {
  let out = '';
  for (let a = -180; a < 180; a += step) {
    if (a > a0 && a < a1) continue;
    const [x1, y1] = P(a, R_OUT - 0.55), [x2, y2] = P(a + 4, R_IN + 0.5);
    out += `<path d="M${x1} ${y1} L${x2} ${y2}" stroke-width="0.42" opacity="0.6"/>`;
  }
  return out;
}

function az5({ tx, ty, s, rot, neck, aStart, aTaper, tongue, skip }) {
  const m = map(tx, ty, s, rot);
  const tip = m(15.45, 6.9);                       // глубина пасти — сюда сходится хвост
  const [ox, oy] = P(aStart, R_OUT), [ix, iy] = P(aStart, R_IN);
  const [otx, oty] = P(aTaper, R_OUT), [itx, ity] = P(aTaper, R_IN);
  const end = aTaper + 360;
  const [oex, oey] = P(end - 0.001, R_OUT);        // не используется, оставлено для ясности
  // дуги: от затылка (под заливкой) вокруг до начала сужения, затем схождение в точку
  const arcOut = `<path d="M${ox} ${oy} A${R_OUT} ${R_OUT} 0 1 1 ${otx} ${oty} C${(otx+0.9).toFixed(2)} ${(oty+0.25).toFixed(2)} ${(tip[0]-0.5).toFixed(2)} ${(tip[1]-0.55).toFixed(2)} ${tip[0]} ${tip[1]}" stroke-width="0.85"/>`;
  const arcIn  = `<path d="M${ix} ${iy} A${R_IN} ${R_IN} 0 1 1 ${itx} ${ity} C${(itx+0.7).toFixed(2)} ${(ity+0.2).toFixed(2)} ${(tip[0]-0.6).toFixed(2)} ${(tip[1]+0.35).toFixed(2)} ${tip[0]} ${tip[1]}" stroke-width="0.75"/>`;
  const g = `translate(${tx} ${ty}) rotate(${rot}) scale(${s}) translate(${-TH[0]} ${-TH[1]})`;
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.0" stroke-linecap="round" stroke-linejoin="miter" stroke-miterlimit="4">` +
    arcOut + arcIn + scales(skip[0], skip[1]) +
    `<g transform="${g}">${HEAD}</g>` + tongue + `</svg>`;
}

// язык: из глотки вдоль верхней кромки нижней челюсти, выходит МИМО её кончика
// (не пересекая её линию) и стекает внутрь кольца
const T = `<path d="M12.2 6.0 C10.9 6.25 9.5 6.4 8.3 6.25 C7.9 6.9 7.5 7.9 7.5 8.9" stroke-width="0.55"/>` +
  `<path d="M7.5 8.9 L6.85 9.65 M7.5 8.9 L8.25 9.5" stroke-width="0.48"/>`;

const base = { tx: 15.35, ty: 5.05, s: 1.25, rot: 8, aStart: -48, aTaper: -98, tongue: T, skip: [-138, -34] };
const V = [
  ['A старт -68', az5({ ...base, aStart: -68 })],
  ['B старт -64', az5({ ...base, aStart: -64 })],
  ['C старт -72', az5({ ...base, aStart: -72 })],
  ['D старт -68, rot 12', az5({ ...base, aStart: -68, rot: 12, ty: 5.2 })],
];
if (process.env.PROBE) {
  writeFileSync(process.argv[2], `<html><body style="background:#0a0417;color:#c9a0ff;font:12px monospace;padding:14px">
<style>.c{display:inline-block;margin:8px;text-align:center}.big svg{width:330px;height:330px}
.row svg{width:48px;height:48px}.row svg+svg{width:24px;height:24px}.row svg+svg+svg{width:16px;height:16px}
.row{display:flex;gap:10px;align-items:center;justify-content:center;margin:6px 0}.l{font-size:11px;color:#8f6fc0}</style>` +
  V.map(([n, s]) => `<div class=c><div class=big>${s}</div><div class=row>${s}${s}${s}</div><div class=l>${n}</div></div>`).join('') + `</body></html>`);
  console.log('probe'); process.exit(0);
}
const AZ5 = az5({ ...base, aStart: -68 });
const AZ5_BARE = az5({ ...base, aStart: -68, skip: [-180, 180] });
writeFileSync('az5-glyphs.txt', `AZ5 (repeat / ouroboros):\n${AZ5}\n\nAZ5 bare (cycleReturn @9px, опция):\n${AZ5_BARE}\n`);

const OLD = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.0" stroke-linecap="round" stroke-linejoin="miter" stroke-miterlimit="4"><path d="M16.32 5.69 A8.15 8.15 0 1 1 7.68 5.69" stroke-width="0.85"/><path d="M15.63 6.79 A6.85 6.85 0 1 1 8.37 6.79" stroke-width="0.75"/><path d="M7.68 5.69 C8.61 5.11 8.75 5.95 10.75 7.3" stroke-width="0.75"/><path d="M8.37 6.79 C9.3 6.21 9.35 7.55 10.75 7.3" stroke-width="0.68"/><path fill="currentColor" stroke="none" fill-rule="evenodd" d="M16.37 5.63 C14.6 3.95 11.9 3.35 9.55 4.65 C11.6 5.5 14.0 6.35 15.63 6.79 Z M14.72 5.35 a0.43 0.43 0 1 0 -0.86 0 a0.43 0.43 0 1 0 0.86 0 Z"/><path fill="currentColor" stroke="none" d="M15.3 7.0 C13.5 8.3 11.6 8.9 10.3 8.85 C12.0 9.5 13.9 9.05 15.7 7.7 Z"/><path d="M10.5 7.6 C9.85 8.95 9.75 10.3 10.15 11.4" stroke-width="0.55" opacity="0.9"/><path d="M10.15 11.4 L9.2 12.4 M10.15 11.4 L10.95 12.3" stroke-width="0.5" opacity="0.9"/></svg>`;
const sz = (svg, list) => list.map(c => `<span class="g${c}">${svg}</span>`).join('');
writeFileSync(process.argv[2] || 'out.html', `<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8">
<title>AZ5 — уроборос: хвост сходится в глубине пасти</title>
<style>
 body{background:#0a0417;color:#b880e8;font:14px/1.6 Georgia,serif;padding:28px 34px}
 h1{font-size:17px;color:#f0e8ff;letter-spacing:2px} h2{font-size:13px;color:#c090ff;letter-spacing:1.5px;margin:32px 0 6px;text-transform:uppercase}
 p.note{font-size:12.5px;color:#9068c0;max-width:76ch;margin:4px 0 14px}
 .row{display:flex;gap:26px;align-items:flex-end;flex-wrap:wrap}
 .cell{display:flex;flex-direction:column;align-items:center;gap:8px;background:#120826;border:1px solid rgba(170,90,255,.3);border-radius:10px;padding:16px 20px;min-width:120px}
 .cell.rec{border-color:rgba(200,140,255,.7);box-shadow:0 0 16px rgba(150,70,255,.18)} .cell.old{opacity:.5}
 .lbl{font-size:10.5px;letter-spacing:1px;color:#9068c0;text-transform:uppercase} .cell.rec .lbl{color:#e0c0ff}
 .sizes{display:flex;gap:16px;align-items:center}
 .g96 svg{width:96px;height:96px}.g48 svg{width:48px;height:48px}.g36 svg{width:36px;height:36px}
 .g24 svg{width:24px;height:24px}.g16 svg{width:16px;height:16px}.g9 svg{width:9px;height:9px}
 .tagline{font-size:11px;color:#7a50a8;text-align:center;max-width:26ch}
 ul{font-size:12.5px;color:#9068c0;max-width:76ch}
</style></head><body>
<h1>AZ5 · уроборос — правки по второму кругу</h1>
<ul>
 <li><b>Кончик хвоста виден в пасти и сужается.</b> Обе кромки тела сходятся в ОДНУ точку
     ровно в глубине пасти (у смыкания челюстей): хвост сужается на подходе и там кончается.</li>
 <li><b>Шеи больше нет.</b> Отдельная заливка убрана совсем — дуги тела заходят прямо под
     саму голову и кончаются под ней. Ни лишней массы, ни гэпа, ни залитого пятна поверх
     полупрозрачного тела: у головы только её собственный силуэт.</li>
 <li><b>Нижняя челюсть опущена</b> — в хвост больше не упирается, пасть распахнута шире.</li>
 <li><b>Язык не пересекает челюсть.</b> Идёт над верхней кромкой нижней челюсти, выходит
     мимо её кончика в проём пасти и стекает внутрь кольца, не касаясь ни челюсти, ни кромки тела.</li>
 <li>Кольцо — идеальные окружности (r 8.15 / 6.85), изгиба нет. Голова — принятая (8da6acd),
     не перерисована: посадка ×1.25, поворот 8°.</li>
</ul>
<h2>AZ5 · гравюра (повтор)</h2>
<div class="row">
  <div class="cell rec"><span class="lbl">AZ5 · повтор</span><div class="sizes">${sz(AZ5, [96, 48, 36, 24, 16])}</div><span class="tagline">96 / 48 / 36 / 24 / 16 px</span></div>
  <div class="cell old"><span class="lbl">AZ3b — было</span><div class="sizes">${sz(OLD, [96, 24])}</div><span class="tagline">излом, торчащий хвост, язык вниз</span></div>
</div>
<h2>cycleReturn — тот же глиф, меньше</h2>
<div class="row">
  <div class="cell rec"><span class="lbl">один в один</span><div class="sizes">${sz(AZ5, [24, 16, 9])}</div><span class="tagline">24 / 16 / 9 px</span></div>
  <div class="cell"><span class="lbl">без чешуи (опция для 9px)</span><div class="sizes">${sz(AZ5_BARE, [24, 16, 9])}</div><span class="tagline">та же геометрия, сняты штрихи</span></div>
</div>
</body></html>`);
console.log('ok');
