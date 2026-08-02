// Черновик кандидатов: PA-solid (маркеры приоритета под мелкий кегль)
// + нав-таб «Задачи» (13px орто vs 16px трио). Пишет JSON для _pxprobe.mjs.
import fs from 'fs';

/* ── PA-SOLID · залитая башня на сетке 13×13 (1 единица = 1 экранный пиксель) ──
   Цвет несёт ЗАЛИВКА (как несла его точка), а не тонкий штрих. Уровень = высота
   башни + навершие, язык тот же, что у контурной PA: двойные стены со щелью,
   шпиль, навершие, цоколь. Диагонали только у шпиля и только ≥45°.            */
const BASE = '<rect x="3" y="10" width="7" height="1"/>'
           + '<rect x="1" y="11" width="11" height="1" opacity="0.55"/>';
const solid = (finialY, apexY, baseY) =>
  `<svg viewBox="0 0 13 13" fill="currentColor">`
  + `<rect x="6" y="${finialY}" width="1" height="1"/>`
  + `<path d="M6.5 ${apexY}L9 ${baseY}H4Z"/>`
  + `<rect x="4" y="${baseY}" width="2" height="${10 - baseY}"/>`
  + `<rect x="7" y="${baseY}" width="2" height="${10 - baseY}"/>`
  + BASE + `</svg>`;

const PS = {
  high:   solid(0, 1, 4),
  medium: solid(2, 3, 6),
  low:    solid(4, 5, 8),
  none:
    `<svg viewBox="0 0 13 13" fill="currentColor">`
    + `<path d="M4 10V7H5V8H6V10Z"/>`
    + `<path d="M7 10V9H8V8H9V10Z"/>`
    + `<rect x="10" y="9" width="1" height="1" opacity="0.6"/>`
    + BASE + `</svg>`,
};

/* ── PA-SOLID на сетке 15 (центр 7.5 = центр пикселя) ── тот же язык, но есть
   бюджет на перемычку-архитрав и щель-окно между двойными стенами.            */
const BASE15 = '<rect x="3" y="12" width="9" height="1"/>'
             + '<rect x="1" y="13" width="13" height="1" opacity="0.55"/>';
const solid15 = (finialY, apexY, baseY) =>
  `<svg viewBox="0 0 15 15" fill="currentColor">`
  + `<rect x="7" y="${finialY}" width="1" height="${apexY - finialY}"/>`
  + `<path d="M7.5 ${apexY}L10.5 ${baseY}H4.5Z"/>`
  + `<rect x="5" y="${baseY}" width="5" height="1"/>`
  + `<rect x="5" y="${baseY + 1}" width="2" height="${11 - baseY}"/>`
  + `<rect x="8" y="${baseY + 1}" width="2" height="${11 - baseY}"/>`
  + BASE15 + `</svg>`;
const PS15 = {
  high:   solid15(0, 2, 5),
  medium: solid15(3, 5, 8),
  low:    solid15(5, 7, 10),
  none:
    `<svg viewBox="0 0 15 15" fill="currentColor">`
    + `<rect x="5" y="9" width="2" height="3"/>`
    + `<rect x="8" y="10" width="2" height="2"/>`
    + `<rect x="11" y="11" width="1" height="1" opacity="0.6"/>`
    + BASE15 + `</svg>`,
};

/* ── НАВ-ТАБ «ЗАДАЧИ» ─────────────────────────────────────────────────────── */
const NAV_WRAP13 = s =>
  `<svg viewBox="0 0 13 13" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="square" stroke-linejoin="miter">${s}</svg>`;
const NAV_WRAP16 = s =>
  `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="square" stroke-linejoin="miter">${s}</svg>`;

// A · ступенчатый гроб, 13px: ни одной пологой грани, плечи ступенькой
const A13 = NAV_WRAP13(
  `<path d="M4.5 0.5H8.5V2.5H10.5V6.5H9.5V9.5H8.5V11.5H4.5V9.5H3.5V6.5H2.5V2.5H4.5Z"/>`
  + `<line x1="6.5" y1="4" x2="6.5" y2="8" stroke-linecap="butt" opacity="0.85"/>`
  + `<line x1="5" y1="5.5" x2="8" y2="5.5" stroke-linecap="butt" opacity="0.85"/>`
  + `<rect x="4" y="1" width="1" height="1" fill="currentColor" stroke="none" opacity="0.55"/>`
  + `<rect x="8" y="1" width="1" height="1" fill="currentColor" stroke="none" opacity="0.55"/>`
  + `<rect x="4" y="10" width="1" height="1" fill="currentColor" stroke="none" opacity="0.55"/>`
  + `<rect x="8" y="10" width="1" height="1" fill="currentColor" stroke="none" opacity="0.55"/>`);

// A2 · тот же ход, но ступень одна (проверить, не читается ли чище)
const A13b = NAV_WRAP13(
  `<path d="M4.5 0.5H8.5V2.5H10.5V9.5H8.5V11.5H4.5V9.5H2.5V2.5H4.5Z"/>`
  + `<line x1="6.5" y1="4" x2="6.5" y2="8" stroke-linecap="butt" opacity="0.85"/>`
  + `<line x1="5" y1="5.5" x2="8" y2="5.5" stroke-linecap="butt" opacity="0.85"/>`
  + `<rect x="3" y="3" width="1" height="1" fill="currentColor" stroke="none" opacity="0.5"/>`
  + `<rect x="9" y="3" width="1" height="1" fill="currentColor" stroke="none" opacity="0.5"/>`
  + `<rect x="3" y="8" width="1" height="1" fill="currentColor" stroke="none" opacity="0.5"/>`
  + `<rect x="9" y="8" width="1" height="1" fill="currentColor" stroke="none" opacity="0.5"/>`);

// B15 · 15px, НЕЧЁТНАЯ канва: центр = 7.5 = центр пикселя, поэтому осевой штрих
// креста ложится точно. Грани только 45°, всё остальное — орто.
const NAV_WRAP15 = s =>
  `<svg viewBox="0 0 15 15" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="square" stroke-linejoin="miter">${s}</svg>`;
const B15 = NAV_WRAP15(
  `<path d="M5.5 0.5H9.5L12.5 3.5V10.5L9.5 13.5H5.5L2.5 10.5V3.5Z"/>`
  + `<line x1="3" y1="3.5" x2="12" y2="3.5" stroke-linecap="butt" opacity="0.5"/>`
  + `<line x1="7.5" y1="5" x2="7.5" y2="11" stroke-linecap="butt"/>`
  + `<line x1="5" y1="7.5" x2="10" y2="7.5" stroke-linecap="butt"/>`
  + `<rect x="7" y="4" width="1" height="1" fill="currentColor" stroke="none"/>`
  + `<rect x="7" y="11" width="1" height="1" fill="currentColor" stroke="none"/>`
  + `<rect x="4" y="7" width="1" height="1" fill="currentColor" stroke="none"/>`
  + `<rect x="10" y="7" width="1" height="1" fill="currentColor" stroke="none"/>`
  + `<rect x="3" y="5" width="1" height="1" fill="currentColor" stroke="none" opacity="0.5"/>`
  + `<rect x="11" y="5" width="1" height="1" fill="currentColor" stroke="none" opacity="0.5"/>`
  + `<rect x="3" y="9" width="1" height="1" fill="currentColor" stroke="none" opacity="0.5"/>`
  + `<rect x="11" y="9" width="1" height="1" fill="currentColor" stroke="none" opacity="0.5"/>`);

// B · 16px: классический гроб с гранями 45°, кайма, крест pattée, гвозди, шов
const B16 = NAV_WRAP16(
  `<path d="M6.5 0.5H9.5L13.5 4.5V10.5L10.5 13.5H5.5L2.5 10.5V4.5Z"/>`
  + `<path d="M6.8 2.2H9.2L12 5V10L10 12H6L4 10V5Z" opacity="0.35"/>`
  + `<line x1="3" y1="5.5" x2="13" y2="5.5" stroke-linecap="butt" opacity="0.4"/>`
  + `<path d="M8 6.5V11" stroke-linecap="butt"/>`
  + `<path d="M5.5 8.5H10.5" stroke-linecap="butt"/>`
  + `<rect x="7" y="6" width="2" height="1" fill="currentColor" stroke="none"/>`
  + `<rect x="5" y="8" width="1" height="1" fill="currentColor" stroke="none"/>`
  + `<rect x="10" y="8" width="1" height="1" fill="currentColor" stroke="none"/>`
  + `<rect x="3" y="4" width="1" height="1" fill="currentColor" stroke="none" opacity="0.55"/>`
  + `<rect x="12" y="4" width="1" height="1" fill="currentColor" stroke="none" opacity="0.55"/>`
  + `<rect x="3" y="10" width="1" height="1" fill="currentColor" stroke="none" opacity="0.55"/>`
  + `<rect x="12" y="10" width="1" height="1" fill="currentColor" stroke="none" opacity="0.55"/>`);

// Трио под путь (б): саркофаг и том тоже переобводятся на 15
const TOMB15 = NAV_WRAP15(
  `<rect x="2.5" y="1.5" width="10" height="2"/>`
  + `<rect x="3.5" y="3.5" width="8" height="6"/>`
  + `<rect x="1.5" y="9.5" width="12" height="2" opacity="0.75"/>`
  + `<line x1="7.5" y1="4.5" x2="7.5" y2="8.5" stroke-linecap="butt" opacity="0.85"/>`
  + `<line x1="5.5" y1="6.5" x2="9.5" y2="6.5" stroke-linecap="butt" opacity="0.85"/>`
  + `<rect x="4" y="2" width="1" height="1" fill="currentColor" stroke="none" opacity="0.55"/>`
  + `<rect x="10" y="2" width="1" height="1" fill="currentColor" stroke="none" opacity="0.55"/>`
  + `<rect x="3" y="12" width="1" height="1" fill="currentColor" stroke="none" opacity="0.5"/>`
  + `<rect x="11" y="12" width="1" height="1" fill="currentColor" stroke="none" opacity="0.5"/>`);

const TOME15 = `<svg viewBox="0 0 15 15" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">`
  + `<path d="M7.5 5C6 3.8 3.8 3.6 1.5 4.3V11.5C3.8 10.8 6 11 7.5 12.2C9 11 11.2 10.8 13.5 11.5V4.3C11.2 3.6 9 3.8 7.5 5Z"/>`
  + `<path d="M7.5 5V12.2" opacity="0.5"/>`
  + `<path d="M7.5 0.6L8.1 2L9.5 2.6L8.1 3.2L7.5 4.6L6.9 3.2L5.5 2.6L6.9 2Z" fill="currentColor" stroke="none"/>`
  + `<path d="M3.5 6.5H6.5M2.5 8.5H6.5M3.5 10.5H6.5" opacity="0.45"/>`
  + `<path d="M11.5 6.5H8.5M12.5 8.5H8.5M11.5 10.5H8.5" opacity="0.45"/>`
  + `<rect x="2" y="5" width="1" height="1" fill="currentColor" stroke="none" opacity="0.6"/>`
  + `<rect x="12" y="5" width="1" height="1" fill="currentColor" stroke="none" opacity="0.6"/>`
  + `<path d="M6 12.4V14L7.5 13.1L9 14V12.4" opacity="0.6"/>`
  + `</svg>`;

fs.writeFileSync('D:/tmp/pw/_cand.json', JSON.stringify({
  PS_high: PS.high, PS_medium: PS.medium, PS_low: PS.low, PS_none: PS.none,
  PS15_high: PS15.high, PS15_medium: PS15.medium, PS15_low: PS15.low, PS15_none: PS15.none,
  A13, A13b, B15, B16, TOMB15, TOME15,
}, null, 1));
console.log('ok');
