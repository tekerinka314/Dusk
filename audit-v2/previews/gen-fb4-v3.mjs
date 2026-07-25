// fb4 v3 — переделка по референсу юзера (гравюрный уроборос) + новые
// альтернативы FL2 (кодекс-разворот) и BL2 (кованая шторка над инструментами).
// Пишет audit-v2/previews/fb4-mini-glyphs.html целиком.
import fs from 'node:fs';

const OUT = 'D:/VSCode projects/DUSK_v2.0/audit-v2/previews/fb4-mini-glyphs.html';

/* ─────────────────── AZ3 · уроборос по референсу ───────────────────
   Кольцо тела с чешуёй-шевронами; голова ЛЕЖИТ ПОВЕРХ кольца сверху,
   пасть раскрыта влево и смыкается на кончике хвоста; раздвоенный язык
   свисает внутрь круга (главная опознавательная черта референса).
   Рогов НЕТ — натуралистичная змея, не геральдический дракон.          */
// Анатомия референса: голова НЕ приклеена сверху горбом — верхняя челюсть
// продолжает ТУ ЖЕ дугу, что и наружная кромка тела (кривизна непрерывна),
// череп даёт объём только у затылка и сходит на нет к морде, нижняя челюсть
// отваливается вниз широким углом, в пасти зубы, хвост входит между ними.
const cx = 12, cy = 12.6, R = 7.55;             // осевая линия тела
const RO_ = 8.15, RI_ = 6.85;                   // кромки тела = кромки головы
const NECK = -58, TAIL = -122;                  // границы разрыва вверху
const SNOUT = -112, HINGE = -80;                // морда и сустав челюсти
// Касательная в конце дуги (направление движения тела при выходе) — хвост
// обязан продолжиться ПО НЕЙ, иначе на кольце виден излом (репорт юзера).
const TANG = (d) => {
  const a = (d * Math.PI) / 180;
  return [+(-Math.sin(a)).toFixed(4), +Math.cos(a).toFixed(4)];
};
const P = (d, r) => {
  const a = (d * Math.PI) / 180;
  return [+(cx + r * Math.cos(a)).toFixed(2), +(cy + r * Math.sin(a)).toFixed(2)];
};
const pt = ([x, y]) => `${x} ${y}`;

// ── общая для обеих трактовок анатомия головы/хвоста/языка ──
// Голова = ЗАМКНУТЫЙ клин: от шеи расширяется к черепу, сходит на морду,
// назад идёт линия пасти. Нижняя челюсть отдельной дугой → пасть разомкнута
// на кончике хвоста (референс: змея кусает свой хвост).
// Контур начинается и заканчивается ровно на торце кольца (кромки round-cap
// при R=7.9, шея -52°) → голова ВЫРАСТАЕТ из тела, а не пересекает его.
// Компактный горизонтальный клин на макушке кольца. Иконочная дисциплина:
// в верхней четверти держим МИНИМУМ линий (череп · губа+горло · челюсть ·
// два клыка · глаз · хвост · язык) — надбровье и ноздря убраны как шум.
// Череп — ОСТРЫЙ клин: прямые сегменты вместо мягких дуг, гранёное надбровье,
// резкий скат к морде. Углы держатся miter-стыком (см. атрибуты <svg>).
// Богатство — В СИЛУЭТЕ, а не внутри: гранёный затылок, ступень надбровья,
// острый двухгранный клин морды. Внутри головы держим ровно три вещи, которые
// переживают 16px: щелевидный глаз, ноздря, пара клыков (остальное сливалось).
// ВЕРХНЯЯ ЧЕЛЮСТЬ = продолжение наружной кромки тела по той же окружности:
// кривизна не рвётся, горба нет. Морда — острый скос на самом конце.
// Верхняя челюсть = дуга тела; последний участок тоньше → морда СХОДИТ НА
// ОСТРИЁ без крючков (крючок давал колючку на miter-стыке).
// ГОЛОВА — ЗАЛИВКА, а не штрих. Это ключ: в референсе голова сплошная чёрная,
// и только заливка даёт (а) массу-объём, (б) настоящую дырку-глаз через
// fill-rule=evenodd, (в) чистый клин пасти между двумя залитыми челюстями.
// Верхний контур продолжает наружную кромку тела по касательной (без горба),
// нижний — линия пасти; сходятся ОСТРИЁМ на морде.
const HEAD_FILL =
  `<path fill="currentColor" stroke="none" fill-rule="evenodd" d="` +
    `M16.37 5.63 C14.6 3.95 11.9 3.35 9.55 4.65` +    // свод черепа → остриё морды
    ` C11.6 5.5 14.0 6.35 15.63 6.79 Z` +             // линия пасти назад к шее
    ` M14.72 5.35 a0.43 0.43 0 1 0 -0.86 0 a0.43 0.43 0 1 0 0.86 0 Z` +  // ГЛАЗ-дыра
  `"/>`;
// НИЖНЯЯ ЧЕЛЮСТЬ — тоже заливка: узкий клин от сустава вниз-вперёд.
const JAW_FILL =
  `<path fill="currentColor" stroke="none" d="` +
    `M15.3 7.0 C13.5 8.3 11.6 8.9 10.3 8.85` +
    ` C12.0 9.5 13.9 9.05 15.7 7.7 Z` +
  `"/>`;
// ЗУБЫ — залитые треугольники на кромках обеих челюстей, в раскрыв пасти.
const TEETH =
  `<path fill="currentColor" stroke="none" d="M13.9 6.28 L14.3 6.38 L13.75 7.3 Z"/>` +
  `<path fill="currentColor" stroke="none" d="M12.2 5.72 L12.6 5.85 L12.05 6.78 Z"/>` +
  `<path fill="currentColor" stroke="none" d="M10.65 5.05 L11.0 5.22 L10.6 6.05 Z"/>` +
  `<path fill="currentColor" stroke="none" d="M13.5 8.42 L13.85 8.3 L13.55 7.5 Z"/>` +
  `<path fill="currentColor" stroke="none" d="M11.9 8.82 L12.25 8.75 L12.05 8.0 Z"/>`;
const HEAD_DETAIL = HEAD_FILL + JAW_FILL + TEETH;
// язык вылетает из распахнутой пасти и падает внутрь круга
const TONGUE =
  `<path d="M10.5 7.6 C9.85 8.95 9.75 10.3 10.15 11.4" stroke-width="0.55" opacity="0.9"/>` +
  `<path d="M10.15 11.4 L9.2 12.4 M10.15 11.4 L10.95 12.3" stroke-width="0.5" opacity="0.9"/>`;

// ── (a) сплошное тело: один штрих, максимум читаемости на 12-16px ──
// Хвост продолжает дугу ПО КАСАТЕЛЬНОЙ (первая контрольная точка лежит на ней)
// → кольцо не ломается, кривизна плавная.
const END = P(TAIL + 360, R), T = TANG(TAIL + 360);
const c1 = [+(END[0] + T[0] * 0.8).toFixed(2), +(END[1] + T[1] * 0.8).toFixed(2)];
const bodyA = `M${pt(P(NECK, R))} A${R} ${R} 0 1 1 ${pt(END)}`;
// хвост уходит с кольца ПО КАСАТЕЛЬНОЙ (без излома) и входит между челюстей
const tailA =
  `<path d="M${pt(END)} C8.6 5.9 9.6 6.6 10.9 7.35" stroke-width="1.0"/>` +
  `<path d="M10.9 7.35 C11.25 7.4 11.6 7.43 11.95 7.45" stroke-width="0.72"/>`;
const AZ3a =
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.05" stroke-linecap="round" stroke-linejoin="miter" stroke-miterlimit="4">` +
  `<path d="${bodyA}" stroke-width="1.4" stroke-linejoin="round"/>` + tailA +
  HEAD_DETAIL + TONGUE + `</svg>`;

// ── (b) гравюра: тело двумя кромками, между ними — чешуйные насечки ──
// Кромки тела = ровно те же радиусы, что кромки головы → челюсть буквально
// продолжает контур тела, стык невидим.
const RO2 = RO_, RI2 = RI_;
// Кромки сходятся В ТОЧКУ на торце кольца (естественное сужение хвоста), и
// дальше в пасть идёт один тонкий штрих — кольцо остаётся ровным.
const bodyB =
  `<path d="M${pt(P(NECK, RO2))} A${RO2} ${RO2} 0 1 1 ${pt(P(TAIL + 360, RO2))}" stroke-width="0.85"/>` +
  `<path d="M${pt(P(NECK, RI2))} A${RI2} ${RI2} 0 1 1 ${pt(P(TAIL + 360, RI2))}" stroke-width="0.75"/>`;
let scalesB = '';
for (let d = NECK + 10; d <= TAIL + 360 - 8; d += 11) {
  const a = P(d - 1.4, RO2 - 0.42), b = P(d + 1.4, RI2 + 0.42);
  scalesB += `<path d="M${pt(a)} L${pt(b)}" stroke-width="0.42" opacity="0.6"/>`;
}
// кромки хвоста сходятся в точку — естественное сужение, кольцо не рвётся
const EO = P(TAIL + 360, RO2), EI = P(TAIL + 360, RI2), TIP = [10.75, 7.3];
const tailB =
  `<path d="M${pt(EO)} C${+(EO[0] + T[0] * 1.1).toFixed(2)} ${+(EO[1] + T[1] * 1.1).toFixed(2)} 8.75 5.95 ${pt(TIP)}" stroke-width="0.75"/>` +
  `<path d="M${pt(EI)} C${+(EI[0] + T[0] * 1.1).toFixed(2)} ${+(EI[1] + T[1] * 1.1).toFixed(2)} 9.35 7.55 ${pt(TIP)}" stroke-width="0.68"/>` +
  `<path d="M${pt(TIP)} C11.2 7.38 11.6 7.42 11.95 7.45" stroke-width="0.7"/>`;
const AZ3b =
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.0" stroke-linecap="round" stroke-linejoin="miter" stroke-miterlimit="4">` +
  bodyB + scalesB + tailB +
  HEAD_DETAIL + TONGUE + `</svg>`;

const AZ3 = AZ3a;

/* cycleReturn3 — микро-версия AZ3 (10×10, рендер 9px): кольцо, голова-клин
   сверху, короткий язычок. Чешуя убрана — на 9px это шум.               */
const CR3 =
  `<svg viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="0.62" stroke-linecap="round" stroke-linejoin="round">` +
  `<path d="M6.59 2.4 A3.4 3.4 0 1 1 3.2 2.52" stroke-width="0.72"/>` +
  `<path d="M6.75 2.09 C6.5 1.35 5.4 1.1 4.7 1.4 C4.35 1.55 4.2 1.7 4.1 1.9` +
    ` C4.6 2.2 5.4 2.45 6.05 2.5 C6.3 2.55 6.38 2.62 6.43 2.71" stroke-width="0.6"/>` +
  `<path d="M6.05 2.5 C5.7 2.95 5.2 3.15 4.7 3.1" stroke-width="0.55"/>` +
  `<circle cx="6.05" cy="1.95" r="0.26" fill="currentColor" stroke="none"/>` +
  `<path d="M3.2 2.52 C3.6 2.48 4.6 2.6 5.15 2.78" stroke-width="0.6"/>` +
  `<path d="M4.85 3.05 C4.55 3.6 4.5 4.15 4.65 4.6" stroke-width="0.45" opacity="0.9"/>` +
  `<path d="M4.65 4.6 L4.3 5.1 M4.65 4.6 L5.05 5.05" stroke-width="0.42" opacity="0.9"/></svg>`;

/* AZ2 (v2, юзер почти отклонил — держим для сравнения) */
const AZ2 = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15.76 5.54 A8 8 0 1 0 19.61 15.07" stroke-width="1.5"/><path d="M14.68 7.57 A5.7 5.7 0 1 0 17.42 14.36" stroke-width="1.3"/><path d="M19.61 15.07 C20.2 14.7 19.6 14.35 18.9 13.9 M17.42 14.36 C18.15 14.15 18.5 14.05 18.9 13.9" stroke-width="1.1"/><path d="M15.76 5.54 C18.6 5.5 21.3 7.2 21.9 9.6 C22.3 11.3 21.4 13.3 19.9 14.05 M14.68 7.57 C15.9 8.9 16.9 10.3 17.5 11.5 C17.85 12.2 18.0 12.75 18.1 13.1" stroke-width="1.6"/><path d="M17.2 7.0 C18.1 6.6 19.1 6.7 19.9 7.35" stroke-width="0.9" opacity="0.6"/><circle cx="18.35" cy="8.15" r="0.85" fill="currentColor" stroke="none"/><path d="M19.55 13.05 L19.15 13.85" stroke-width="0.75" opacity="0.9"/><path d="M16.45 5.0 C15.9 4.3 15.5 3.9 14.9 3.55" stroke-width="1.05" opacity="0.75"/></svg>`;

/* текущий в проекте: ∞-лемниската (IC.ouroboros) и ромб-стрелка (cycleReturn) */
const CUR_AZ = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M11.2 12C9.8 14.2 8.1 16.2 6 16.2C3.8 16.2 2.6 14.4 2.6 12.6C2.6 10.4 4.4 9 6.2 9.4C8.3 9.9 9.8 11.6 11.2 12Z"/><path d="M12.8 12C14.2 9.8 15.9 7.8 18 7.8C20.2 7.8 21.4 9.6 21.4 11.4C21.4 13.6 19.6 15 17.8 14.6C15.7 14.1 14.2 12.4 12.8 12Z"/></svg>`;
const CUR_CR = `<svg viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 1.2L8.8 5L5 8.8L1.2 5L3.5 2.7"/><polyline points="3.5,1.2 5,1.2 5,2.7"/></svg>`;

/* ─────────── FL1 (принят, оставляем) ─────────── */
const FL1 = [
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 19V10L6.5 6.5L9.5 10V19Z"/><path d="M6.5 5.9 L7.05 6.5 L6.5 7.1 L5.95 6.5 Z" fill="currentColor" stroke="none" opacity="0.85"/><path d="M5.1 12H7.9M5.1 14.4H7.9M5.1 16.8H7.9" stroke-width="0.9" opacity="0.55"/><circle cx="10.5" cy="12.2" r="0.42" fill="currentColor" stroke="none" opacity="0.5"/><circle cx="10.5" cy="16.2" r="0.42" fill="currentColor" stroke="none" opacity="0.5"/><path d="M11.5 19V10L15.5 6.5L19.5 10V19Z" stroke-opacity="0.4"/><path d="M13.2 12H17.8M13.2 14.4H17.8M13.2 16.8H16.2" stroke-width="0.9" opacity="0.28"/></svg>`,
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 19V11L4.9 8.6L6.3 11V19Z"/><path d="M4.9 12.6V13.9M4.9 15.6V16.9" stroke-width="0.85" opacity="0.55"/><circle cx="7.4" cy="12.2" r="0.42" fill="currentColor" stroke="none" opacity="0.5"/><circle cx="7.4" cy="16.2" r="0.42" fill="currentColor" stroke="none" opacity="0.5"/><path d="M8.5 19V9.5L14 5.8L19.5 9.5V19Z"/><path d="M14 5.1 L14.55 5.75 L14 6.4 L13.45 5.75 Z" fill="currentColor" stroke="none" opacity="0.85"/><path d="M10.4 12H17.6M10.4 14.4H17.6M10.4 16.8H14.8" stroke-width="0.9" opacity="0.45"/></svg>`,
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 19V9.5L11.75 4.8L20 9.5V19Z"/><path d="M11.75 4.1 L12.3 4.75 L11.75 5.4 L11.2 4.75 Z" fill="currentColor" stroke="none" opacity="0.85"/><path d="M6.6 11.4 L5.1 12.9 L6.6 14.4" stroke-opacity="0.5" stroke-width="1.2"/><path d="M8.9 12H17.4M8.9 14.4H17.4M8.9 16.8H13.6" stroke-width="0.9" opacity="0.45"/></svg>`,
];

/* ─────────── FL2 · «Кодекс-разворот» (полная переделка) ───────────
   Метафора: иллюминированный разворот. Левая страница = СПИСОК (рубрика-
   буквица + строки записей), правая = ЗАМЕТКА (текст). Уровни:
   [0] разворот целиком · [1] левая страница перевёрнута в узкую кромку
   (виден срез стопки листов) · [2] одна страница во весь глиф + завиток
   скрытой стопки слева. Готика: стрельчатый верх, буквица-плашка,
   сшивка-станции на корешке, обрез стопки.                            */
const rule = (x1, x2, y, o = 0.5, w = 0.85) =>
  `<path d="M${x1} ${y}H${x2}" stroke-width="${w}" opacity="${o}"/>`;
const FL2 = [
  // [0] обе страницы
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round">` +
    // левая страница: стрельчатый верх + корешок справа
    `<path d="M2.6 20V8.4C2.6 6.6 4.3 5.2 6.6 5.2H11.4V20Z"/>` +
    // правая страница
    `<path d="M21.4 20V8.4C21.4 6.6 19.7 5.2 17.4 5.2H12.6V20Z" stroke-opacity="0.45"/>` +
    // корешок со сшивкой
    `<path d="M12 4.9V20.3" stroke-width="1.1"/>` +
    `<circle cx="12" cy="9.2" r="0.42" fill="currentColor" stroke="none" opacity="0.8"/>` +
    `<circle cx="12" cy="13" r="0.42" fill="currentColor" stroke="none" opacity="0.8"/>` +
    `<circle cx="12" cy="16.8" r="0.42" fill="currentColor" stroke="none" opacity="0.8"/>` +
    // буквица-рубрика на левой странице
    `<path d="M4.3 8.2H6.5V10.9H4.3Z" fill="currentColor" stroke="none" opacity="0.85"/>` +
    // строки записей списка
    rule(7.3, 10.2, 8.7, 0.6) + rule(7.3, 10.2, 10.4, 0.6) +
    rule(4.3, 10.2, 12.9, 0.55) + rule(4.3, 10.2, 15, 0.55) + rule(4.3, 8.6, 17.1, 0.55) +
    // текст правой страницы
    rule(13.8, 20, 9.2, 0.3) + rule(13.8, 20, 11.3, 0.3) + rule(13.8, 20, 13.4, 0.3) +
    rule(13.8, 18, 15.5, 0.3) +
  `</svg>`,
  // [1] левая перевёрнута в кромку-стопку, правая раскрыта
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round">` +
    // узкая кромка-стопка слева (обрез листов)
    `<path d="M2.6 19.7V8.6C2.6 7.3 3.3 6.4 4.5 6.4H5.6V19.7Z"/>` +
    `<path d="M4.05 7.6V19.2M5.0 7.2V19.4" stroke-width="0.7" opacity="0.5"/>` +
    // корешок
    `<path d="M6.4 5.6V20.3" stroke-width="1.1"/>` +
    `<circle cx="6.4" cy="9.4" r="0.42" fill="currentColor" stroke="none" opacity="0.8"/>` +
    `<circle cx="6.4" cy="13" r="0.42" fill="currentColor" stroke="none" opacity="0.8"/>` +
    `<circle cx="6.4" cy="16.6" r="0.42" fill="currentColor" stroke="none" opacity="0.8"/>` +
    // раскрытая страница-заметка
    `<path d="M21.4 20V8.6C21.4 6.7 19.6 5.4 17.2 5.4H7V20Z"/>` +
    `<path d="M8.5 8.1H10.7V10.8H8.5Z" fill="currentColor" stroke="none" opacity="0.85"/>` +
    rule(11.5, 19.8, 8.6, 0.5) + rule(11.5, 19.8, 10.5, 0.5) +
    rule(8.5, 19.8, 12.9, 0.45) + rule(8.5, 19.8, 15, 0.45) + rule(8.5, 16.8, 17.1, 0.45) +
  `</svg>`,
  // [2] одна страница во весь глиф, слева завиток скрытой стопки
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round">` +
    // скрытая стопка намёком
    `<path d="M3.3 18.4V9.2C3.3 8.2 3.7 7.6 4.5 7.3" stroke-width="0.85" opacity="0.45"/>` +
    // страница
    `<path d="M20.8 20V8.2C20.8 6.4 19.1 5 16.8 5H5.6V20Z"/>` +
    // стрельчатый заголовок-арочка + буквица
    `<path d="M7.2 10.5V9.2C7.2 8.35 7.85 7.8 8.7 7.8C9.55 7.8 10.2 8.35 10.2 9.2V10.5Z" stroke-width="0.95" opacity="0.8"/>` +
    `<path d="M8.7 7.15 L9.15 7.7 L8.7 8.25 L8.25 7.7 Z" fill="currentColor" stroke="none" opacity="0.85"/>` +
    rule(11.2, 19.2, 8.4, 0.5) + rule(11.2, 19.2, 10.2, 0.5) +
    rule(7.2, 19.2, 12.6, 0.45) + rule(7.2, 19.2, 14.7, 0.45) +
    rule(7.2, 19.2, 16.8, 0.45) + rule(7.2, 15.4, 18.6, 0.35) +
  `</svg>`,
];

/* ─────────── BL1 (принят, оставляем) ─────────── */
const frame = `<path d="M4.4 20.6V10.6C4.4 6.6 7.6 4.1 12 4.1C16.4 4.1 19.6 6.6 19.6 10.6V20.6" stroke-width="1.6"/>` +
  `<path d="M2.9 20.6H21.1" stroke-width="1.2" opacity="0.75"/>` +
  `<circle cx="4.4" cy="10.2" r="0.5" fill="currentColor" stroke="none" opacity="0.6"/>` +
  `<circle cx="19.6" cy="10.2" r="0.5" fill="currentColor" stroke="none" opacity="0.6"/>`;
const spikes = (y) => [8, 12, 16].map(x => `<path d="M${x} ${y} L${x - 0.55} ${y - 1.15} M${x} ${y} L${x + 0.55} ${y - 1.15}" stroke-width="0.8" opacity="0.9"/>`).join('');
const bars = (y1, y2, extra = '') => [8, 12, 16].map(x => `<path d="M${x} ${y1}V${y2}"${extra} stroke-width="1.25"/>`).join('');
const BL1 = {
  auto: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${frame}${bars(5.4, 12.6, ' stroke-dasharray="2.1 1.7"')}${spikes(13.7)}<path d="M6.3 8.6H17.7" stroke-width="1" opacity="0.6" stroke-dasharray="2.1 1.7"/></svg>`,
  open: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${frame}${bars(5.4, 8.2)}${spikes(9.3)}<path d="M6.3 6.9H17.7" stroke-width="1" opacity="0.7"/><circle cx="12" cy="2.6" r="0.85" stroke-width="1.1"/><path d="M12 3.45V5.4" stroke-width="0.9" opacity="0.8"/></svg>`,
  closed: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${frame}${bars(5.4, 19.4)}${spikes(20.4)}<path d="M6.3 9H17.7M6.3 13.6H17.7" stroke-width="1" opacity="0.7"/></svg>`,
};

/* ─────────── BL2 · «Кованая шторка над рядом инструментов» ───────────
   Интуитивность: ВИДЕН сам ряд инструментов (три сигила в кованой планке)
   и заслонка над ним. auto = заслонка на половине, сплошная, сигилы
   приглушены · open = поднята, сигилы яркие · closed = опущена до низа
   планки, сигилы скрыты за решёткой.
   Рерабока 2026-07-24 (4 правки юзера): пунктир auto → сплошная линия;
   убран засов-штырь у open; убрано кольцо-ручка у closed, пики решётки
   доведены до нижней кромки планки; содержимое планки переработано. */
const toolPlate = (o = 1) =>
  `<path d="M3.6 14.4C3.6 13.5 4.3 12.8 5.2 12.8H18.8C19.7 12.8 20.4 13.5 20.4 14.4V18.2C20.4 19.1 19.7 19.8 18.8 19.8H5.2C4.3 19.8 3.6 19.1 3.6 18.2Z" stroke-width="1.35" opacity="${o}"/>` +
  `<circle cx="5.3" cy="14.5" r="0.32" fill="currentColor" stroke="none" opacity="${0.55 * o}"/>` +
  `<circle cx="18.7" cy="14.5" r="0.32" fill="currentColor" stroke="none" opacity="${0.55 * o}"/>` +
  `<circle cx="5.3" cy="18.1" r="0.32" fill="currentColor" stroke="none" opacity="${0.55 * o}"/>` +
  `<circle cx="18.7" cy="18.1" r="0.32" fill="currentColor" stroke="none" opacity="${0.55 * o}"/>`;
// Рерабока: три сигила — не абстрактные фигуры, а СОБСТВЕННЫЕ мотивы DUSK,
// уже принятые юзером в других глифах, гравированные на планке инструментов:
//   1) стрельчатая арка с окулюсом и цоколем — архитектурный мотив приложения;
//   2) крест pattée «планки + клинья» — идиома BD1 (крышка гроба), не плоский крест;
//   3) флёр-де-лис — идиома BM1 (разделитель): лепесток, две волюты, поясок, шип.
const toolSigils = (o = 1) =>
  // 1 · стрельчатая арка (x≈6.9)
  `<path d="M5.25 18.55V16.35Q5.25 14.75 6.9 13.95Q8.55 14.75 8.55 16.35V18.55" stroke-width="1.1" opacity="${o}"/>` +
  `<path d="M4.75 18.55H9.05" stroke-width="0.85" opacity="${0.8 * o}"/>` +
  `<circle cx="6.9" cy="16.5" r="0.52" stroke-width="0.65" opacity="${0.75 * o}"/>` +
  // 2 · крест pattée (x=12) — планки + четыре клина на концах
  `<path d="M12 14.25V18.35M10.2 16.3H13.8" stroke-width="1.1" opacity="${o}"/>` +
  `<path d="M12 13.8 L12.62 14.62 L11.38 14.62 Z M12 18.8 L12.62 17.98 L11.38 17.98 Z` +
  ` M9.9 16.3 L10.7 16.9 L10.7 15.7 Z M14.1 16.3 L13.3 16.9 L13.3 15.7 Z"` +
  ` fill="currentColor" stroke="none" opacity="${0.9 * o}"/>` +
  // 3 · флёр-де-лис (x≈17.1)
  `<path d="M17.1 13.9 C16.64 14.67 16.64 15.55 17.1 16.23 C17.56 15.55 17.56 14.67 17.1 13.9 Z" stroke-width="0.85" opacity="${o}"/>` +
  `<path d="M16.22 15.06 C15.67 14.87 15.38 15.31 15.59 15.86 C15.84 16.42 16.39 16.47 16.76 16.23" stroke-width="0.8" opacity="${o}"/>` +
  `<path d="M17.98 15.06 C18.53 14.87 18.82 15.31 18.61 15.86 C18.36 16.42 17.81 16.47 17.44 16.23" stroke-width="0.8" opacity="${o}"/>` +
  `<path d="M16.13 16.76H18.07" stroke-width="0.95" opacity="${o}"/>` +
  `<path d="M17.1 16.76 C16.81 17.39 16.81 18.07 17.1 18.7 C17.39 18.07 17.39 17.39 17.1 16.76 Z" stroke-width="0.8" opacity="${o}"/>`;
const shutter = (yBottom, dashed, brace = true) => {
  const d = dashed ? ' stroke-dasharray="1.9 1.5"' : '';
  const top = 3.5, xs = [7.6, 12, 16.4];
  return `<path d="M3.4 ${top}H20.6" stroke-width="1.7"/>` +
    `<circle cx="3.4" cy="${top}" r="0.42" fill="currentColor" stroke="none" opacity="0.7"/>` +
    `<circle cx="20.6" cy="${top}" r="0.42" fill="currentColor" stroke="none" opacity="0.7"/>` +
    xs.map(x => `<path d="M${x} ${top}V${yBottom}"${d} stroke-width="1.3" opacity="0.95"/>`).join('') +
    (brace ? `<path d="M5.4 ${(top + yBottom) / 2}H18.6"${d} stroke-width="1.0" opacity="0.6"/>` : '') +
    xs.map(x =>
      `<path d="M${x} ${yBottom} L${x - 0.62} ${yBottom - 1.2} M${x} ${yBottom} L${x + 0.62} ${yBottom - 1.2}" stroke-width="0.85" opacity="0.95"/>`).join('');
};
// Вычисленные координаты/альфы дают хвосты вида 6.9799999999999995 — режем до
// 2 знаков, чтобы вживляемый в приложение svg был чистым и совпадал с превью.
const tidy = s => s.replace(/\d+\.\d{3,}/g, m => String(+(+m).toFixed(2)));
const BL2raw = {
  auto: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">${shutter(9.4, false)}${toolPlate(0.55)}${toolSigils(0.5)}</svg>`,
  open: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">${shutter(5.5, false, false)}${toolPlate(1)}${toolSigils(1)}</svg>`,
  closed: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">${toolPlate(0.22)}${shutter(18.9, false)}</svg>`,
};
const BL2 = Object.fromEntries(Object.entries(BL2raw).map(([k, v]) => [k, tidy(v)]));
/* текущая barLvl-лента (для сравнения) */
const CUR_BAR = {
  auto: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 8.5h14a1.5 1.5 0 0 1 1.5 1.5v4a1.5 1.5 0 0 1-1.5 1.5H5a1.5 1.5 0 0 1-1.5-1.5v-4A1.5 1.5 0 0 1 5 8.5Z" stroke-dasharray="2.4 2.2"/><path d="M8 10.6v2.8M12 10.6v2.8M16 10.6v2.8" stroke-opacity="0.55"/></svg>`,
  open: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 8.5h14a1.5 1.5 0 0 1 1.5 1.5v4a1.5 1.5 0 0 1-1.5 1.5H5a1.5 1.5 0 0 1-1.5-1.5v-4A1.5 1.5 0 0 1 5 8.5Z"/><path d="M8 10.6v2.8M12 10.6v2.8M16 10.6v2.8"/></svg>`,
  closed: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6.5 9.3h11M6.5 14.7h11"/><path d="M6.5 9.3a2.7 2.7 0 1 0 0 5.4M17.5 9.3a2.7 2.7 0 1 1 0 5.4"/><path d="M9 12h6" stroke-opacity="0.5"/></svg>`,
};

/* ────────────── N · сигилы типахеда квик-эдда (набор N3, вердикт юзера) ──────────────
   Арт взят БАЙТ-В-БАЙТ из fb2-icons-preview.html (кандидат N3, «переработка №2»):
   приоритет = кованый обелиск-«!» · тег = щит с каймой и звездой · дата = башенка-часы.
   Здесь решается ТОЛЬКО подача в реальной строке дропдауна (15px) и развилка по
   строке «Без приоритета» (у неё нет цвета приоритета — нужен свой знак).          */
const N3_PRIO = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
    <line x1="9.9" y1="3.4" x2="14.1" y2="3.4" stroke-width="1.3"/>
    <circle cx="9.2" cy="3.4" r="0.5" stroke-width="0.9"/>
    <circle cx="14.8" cy="3.4" r="0.5" stroke-width="0.9"/>
    <path d="M10.8 3.4L11.6 13.2H12.4L13.2 3.4"/>
    <line x1="12" y1="5.2" x2="12" y2="11.4" stroke-width="0.7" opacity="0.4"/>
    <path d="M12 15.2L13.4 16.9L12 18.6L10.6 16.9Z" stroke-width="1.3"/>
    <circle cx="12" cy="16.9" r="0.42" fill="currentColor" stroke="none"/>
</svg>`;
const N3_TAG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
    <path d="M6.6 4.5H17.4V11.6C17.4 15.6 15 18.5 12 19.8C9 18.5 6.6 15.6 6.6 11.6Z"/>
    <path d="M8.2 6.1H15.8V11.5C15.8 14.5 14.1 16.8 12 17.9C9.9 16.8 8.2 14.5 8.2 11.5Z" stroke-width="0.9" opacity="0.4"/>
    <line x1="12" y1="8.4" x2="12" y2="13.6" stroke-width="1.3"/>
    <line x1="9.8" y1="9.7" x2="14.2" y2="12.3" stroke-width="1.3"/>
    <line x1="14.2" y1="9.7" x2="9.8" y2="12.3" stroke-width="1.3"/>
</svg>`;
const N3_DATE = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
    <path d="M7.4 20.4V11C7.4 7 9.4 4.4 12 4.4C14.6 4.4 16.6 7 16.6 11V20.4"/>
    <path d="M12 4.4V2.9M11.1 3.6H12.9" stroke-width="1" opacity="0.7"/>
    <line x1="5.6" y1="20.4" x2="18.4" y2="20.4" stroke-width="1.4"/>
    <line x1="6.6" y1="22" x2="17.4" y2="22" stroke-width="0.9" opacity="0.5"/>
    <circle cx="12" cy="11.9" r="3.5"/>
    <circle cx="12" cy="11.9" r="2.6" stroke-width="0.7" opacity="0.4"/>
    <path d="M12 8.8V9.4M15.1 11.9H14.5M12 15V14.4M8.9 11.9H9.5" stroke-width="0.8" opacity="0.6"/>
    <line x1="12" y1="11.9" x2="12" y2="9.9" stroke-width="1.6"/>
    <line x1="12" y1="11.9" x2="13.5" y2="12.9" stroke-width="1.1"/>
    <circle cx="12" cy="11.9" r="0.55" fill="currentColor" stroke="none"/>
    <line x1="12" y1="15.4" x2="12" y2="18.2" stroke-width="0.95" opacity="0.6"/>
    <circle cx="12" cy="19" r="0.8" stroke-width="1.1" opacity="0.7"/>
</svg>`;
// Развилка «Без приоритета» — строка без цвета. Три трактовки:
//  A — тот же обелиск, только приглушённый (минимум вмешательства в принятый арт);
//  B — обелиск БЕЗ ромба-точки: «!» без точки = не восклицание = приоритета нет
//      (вычитание из принятого арта, ничего не выдумано);
//  C — обелиск, перерубленный кованой перекладиной (идиома «—» из панели выбора,
//      index.html:671 sb-prio-none), фаски на концах как у O2-перечёрка.
const N3_PRIO_B = N3_PRIO
  .replace('<path d="M12 15.2L13.4 16.9L12 18.6L10.6 16.9Z" stroke-width="1.3"/>\n    ', '')
  .replace('<circle cx="12" cy="16.9" r="0.42" fill="currentColor" stroke="none"/>\n', '');
const N3_PRIO_C = N3_PRIO.replace('</svg>',
  `<line x1="7.4" y1="8.3" x2="16.6" y2="8.3" stroke-width="1.5"/>
    <path d="M6.6 7.5L8 8.3L6.6 9.1M17.4 7.5L16 8.3L17.4 9.1" stroke-width="0.9" opacity="0.8"/>
</svg>`);

/* мок реальной строки дропдауна (.qa-item): сигил 15px + подпись + хинт */
const qaRow = (sig, colour, label, hint, active = false) =>
  `<div class="qa-item${active ? ' active' : ''}">` +
    `<span class="qa-sig"${colour ? ` style="color:${colour}"` : ''}>${sig}</span>` +
    `<span class="qa-label">${label}</span>` +
    (hint ? `<span class="qa-hint">${hint}</span>` : '') +
  `</div>`;
const qaDot = (colour, label, hint, active = false) =>
  `<div class="qa-item${active ? ' active' : ''}">` +
    `<span class="qa-dot" style="${colour ? `background:${colour}` : 'background:transparent;box-shadow:inset 0 0 0 1px rgba(130,50,220,0.48)'}"></span>` +
    `<span class="qa-label">${label}</span>` +
    (hint ? `<span class="qa-hint">${hint}</span>` : '') +
  `</div>`;
const qaMenu = rows => `<div class="qa-menu">${rows.join('')}</div>`;
const PRIO_ROWS = noneSig => [
  qaRow(N3_PRIO, '#e03060', 'Высокий', '!high', true),
  qaRow(N3_PRIO, '#d09020', 'Средний', '!medium'),
  qaRow(N3_PRIO, '#3cc870', 'Низкий', '!low'),
  qaRow(noneSig, 'rgba(144,104,192,0.75)', 'Без приоритета', '!none'),
];

/* ────────────── X1 · арки времени (дедлайн-модалка) ──────────────
   Арт X1 из fb2 (вердикт юзера). Живых целей в приложении ровно две:
   · «Время (необязательно)» — generic круг-часы, index.html:1202, рендерится 13×13;
   · степперы `.stepper-btn` — готическая ланса, 8 точек (dl-monthday/dl-year/
     repeat-anchor-monthday/form-anchor ×2), рендерятся 17×17 (style.css:6192).
   Календарь-арка из X1 цели НЕ имеет: поле даты нативное (<input type="date">),
   а триггер дедлайна давно переведён на IC.window. Вариант применения — ниже.  */
const X1_STEP_DOWN = `<svg viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="11" y1="3.6" x2="11" y2="11.6"/><line x1="7.8" y1="9.2" x2="14.2" y2="9.2" stroke-width="1.6"/><circle cx="7" cy="9.2" r="0.55" fill="currentColor" stroke="none"/><circle cx="15" cy="9.2" r="0.55" fill="currentColor" stroke="none"/><path d="M11 19L6.4 13.2H15.6Z" fill="currentColor" stroke="currentColor" stroke-width="1"/><path d="M11 3.6L11.6 2.7L11 1.8L10.4 2.7Z" fill="currentColor" stroke="none" opacity="0.7"/></svg>`;
// «вверх» выводится зеркалом по y=11 (y' = 22 - y) — иначе пара разъедется.
const X1_STEP_UP = `<svg viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M11 3L6.4 8.8H15.6Z" fill="currentColor" stroke="currentColor" stroke-width="1"/><line x1="11" y1="10.4" x2="11" y2="18.4"/><line x1="7.8" y1="12.8" x2="14.2" y2="12.8" stroke-width="1.6"/><circle cx="7" cy="12.8" r="0.55" fill="currentColor" stroke="none"/><circle cx="15" cy="12.8" r="0.55" fill="currentColor" stroke="none"/><path d="M11 18.4L11.6 19.3L11 20.2L10.4 19.3Z" fill="currentColor" stroke="none" opacity="0.7"/></svg>`;
// Подача 17px: шары r=0.55 на канве 22 дают 0.85px в диаметре — на грани пропажи.
// Вариант «17px-подача»: шары и ромб укрупнены, перекладина чуть толще.
const bulk = s => s.replace(/r="0.55"/g, 'r="0.8"')
  .replace('stroke-width="1.6"/><circle', 'stroke-width="1.9"/><circle')
  .replace('M11 3.6L11.6 2.7L11 1.8L10.4 2.7Z', 'M11 3.9L11.85 2.75L11 1.4L10.15 2.75Z')
  .replace('M11 18.4L11.6 19.3L11 20.2L10.4 19.3Z', 'M11 18.1L11.85 19.25L11 20.6L10.15 19.25Z')
  .replace('opacity="0.7"', 'opacity="0.85"');
const X1_STEP_DOWN_B = bulk(X1_STEP_DOWN), X1_STEP_UP_B = bulk(X1_STEP_UP);
const CUR_STEP_DOWN = `<svg viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="11" y1="3.5" x2="11" y2="11"/><line x1="7.5" y1="9" x2="14.5" y2="9"/><path d="M11 18.5L5.5 12H16.5Z" fill="currentColor" stroke="none"/></svg>`;
const CUR_STEP_UP = `<svg viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 3.5L5.5 10H16.5Z" fill="currentColor" stroke="none"/><line x1="11" y1="10" x2="11" y2="18.5"/><line x1="7.5" y1="13" x2="14.5" y2="13"/></svg>`;
const CUR_CLOCK = `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><circle cx="10" cy="10" r="8"/><line x1="10" y1="5.5" x2="10" y2="10"/><line x1="10" y1="10" x2="13.5" y2="12"/></svg>`;
// Башенка-часы на 13px: полный N3-арт имеет штрихи 0.7-0.95 при opacity 0.4-0.6 —
// на канве 24 это 0.4px на экране, то есть каша. «Lean» — та же башня, но снят
// весь шум (риски циферблата, второй обод, вторая база), штрихи подняты до ≥1.1.
const X1_TIME_LEAN = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <path d="M7.4 20.4V11C7.4 7 9.4 4.4 12 4.4C14.6 4.4 16.6 7 16.6 11V20.4"/>
    <path d="M12 4.4V2.6M11 3.4H13" stroke-width="1.3"/>
    <line x1="5.6" y1="20.4" x2="18.4" y2="20.4" stroke-width="1.8"/>
    <circle cx="12" cy="11.9" r="3.6" stroke-width="1.5"/>
    <line x1="12" y1="11.9" x2="12" y2="9.6" stroke-width="1.7"/>
    <line x1="12" y1="11.9" x2="13.8" y2="13" stroke-width="1.4"/>
    <line x1="12" y1="15.8" x2="12" y2="18.4" stroke-width="1.2" opacity="0.7"/>
    <circle cx="12" cy="19.2" r="0.95" stroke-width="1.3" opacity="0.8"/>
</svg>`;
const X1_CAL = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
    <path d="M5 21V9.5C5 6.1 8 3.7 12 3.7C16 3.7 19 6.1 19 9.5V21"/>
    <line x1="3.4" y1="21" x2="20.6" y2="21" stroke-width="1.5"/>
    <path d="M12 3.7V2.4M10.9 2.4H13.1" stroke-width="1.1" opacity="0.6"/>
    <line x1="5" y1="8.6" x2="19" y2="8.6" stroke-width="1.1" opacity="0.7"/>
    <line x1="5" y1="12.6" x2="19" y2="12.6" stroke-width="0.9" opacity="0.4"/>
    <line x1="5" y1="16.6" x2="19" y2="16.6" stroke-width="0.9" opacity="0.4"/>
    <line x1="9.7" y1="8.6" x2="9.7" y2="21" stroke-width="0.9" opacity="0.4"/>
    <line x1="14.3" y1="8.6" x2="14.3" y2="21" stroke-width="0.9" opacity="0.4"/>
    <path d="M12 13.6L13 14.6L12 15.6L11 14.6Z" fill="currentColor" stroke="none" opacity="0.9"/>
</svg>`;
/* мок кнопки-степпера в натуральную величину (44×40, svg 17px) */
const stepBtn = svg => `<span class="step-btn">${svg}</span>`;
const stepPair = (up, down) =>
  `<span class="step-wrap">${stepBtn(down)}<span class="step-num">14</span>${stepBtn(up)}</span>`;
/* мок метки «Время (необязательно)» в натуральную величину (глиф 13px) */
const timeLabel = svg => `<span class="dl-lab"><span class="dl-lab-ico">${svg}</span>Время (необязательно)</span>`;

/* ────────── ПАРТИЯ 2 · приоритет-сигил заново (обелиск признан неинтуитивным) ──────────
   Требование: максимум по всем трём осям — готика × детализация × ИНТУИТИВНОСТЬ.
   Ограничение, которое решает всё: сигил живёт на 15px в строке дропдауна. Любая
   композиция из трёх фигур там умирает, поэтому уровень должен читаться ОДНОЙ
   характеристикой силуэта. Отсюда два хода.                                        */
const GROUND = `<line x1="4.6" y1="20.4" x2="19.4" y2="20.4" stroke-width="1.5"/>` +
  `<line x1="5.6" y1="21.7" x2="18.4" y2="21.7" stroke-width="0.8" opacity="0.4"/>`;
const PLINTH = `<path d="M7.2 20.4V18.6H16.8V20.4" stroke-width="1.1" opacity="0.8"/>`;
// PA · БАШНЯ-РАНГ. Язык кладки взят у M3 (`IC.sortPriority`) — той самой иконки,
// которой приложение УЖЕ обозначает приоритет: двойные стены, шпиль, навершие,
// цоколь. Уровень = высота башни. На 15px разница высот видна мгновенно, а
// «выше = важнее» не нужно объяснять. «Без приоритета» = руина: цоколь и два
// обломка стен, шпиля нет.
const tower = (wallTop, apex, finial, win) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">` +
    `<line x1="8.4" y1="18.6" x2="8.4" y2="${wallTop}"/>` +
    `<line x1="15.6" y1="18.6" x2="15.6" y2="${wallTop}"/>` +
    `<path d="M8.4 ${wallTop}L12 ${apex}L15.6 ${wallTop}"/>` +
    `<path d="M9.6 ${wallTop}H14.4" stroke-width="0.85" opacity="0.45"/>` +
    finial + win + PLINTH + GROUND +
  `</svg>`;
const PA = {
  high: tower(8.4, 3.2,
    `<line x1="12" y1="3.2" x2="12" y2="1.9" stroke-width="1"/>` +
    `<path d="M12 0.9L12.75 1.8L12 2.7L11.25 1.8Z" fill="currentColor" stroke="none"/>` +
    `<path d="M9.5 5.9l-1.1-0.7M14.5 5.9l1.1-0.7" stroke-width="0.75" opacity="0.5"/>`,
    `<path d="M10.4 18.6V13.6C10.4 12 11.1 11.2 12 11.2C12.9 11.2 13.6 12 13.6 13.6V18.6" stroke-width="0.9" opacity="0.5"/>` +
    `<line x1="12" y1="12.4" x2="12" y2="18.6" stroke-width="0.7" opacity="0.32"/>`),
  medium: tower(12, 7.2,
    `<line x1="12" y1="7.2" x2="12" y2="6.1" stroke-width="0.95"/>` +
    `<path d="M12 5.3L12.62 6.05L12 6.8L11.38 6.05Z" fill="currentColor" stroke="none"/>`,
    `<path d="M10.4 18.6V15.2C10.4 13.9 11.1 13.2 12 13.2C12.9 13.2 13.6 13.9 13.6 15.2V18.6" stroke-width="0.9" opacity="0.5"/>` +
    `<line x1="12" y1="14.2" x2="12" y2="18.6" stroke-width="0.7" opacity="0.32"/>`),
  low: tower(15.4, 11.6,
    `<line x1="12" y1="11.6" x2="12" y2="10.8" stroke-width="0.9"/>` +
    `<circle cx="12" cy="10.2" r="0.62" stroke-width="0.9"/>`,
    `<line x1="12" y1="16.6" x2="12" y2="18.6" stroke-width="0.85" opacity="0.45"/>`),
  none: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">` +
    `<path d="M8.4 18.6V15.9L9.3 14.9L8.9 13.6" stroke-width="1.35" opacity="0.75"/>` +
    `<path d="M15.6 18.6V16.6L14.8 15.6L15.2 14.4" stroke-width="1.35" opacity="0.75"/>` +
    `<path d="M10.6 18.6V17.2H13.1" stroke-width="0.9" opacity="0.4"/>` +
    `<path d="M12.9 15.4L14.1 15.9L13.6 17L12.4 16.5Z" stroke-width="0.8" opacity="0.5"/>` +
    PLINTH + GROUND + `</svg>`,
};
// PB · ШЕВРОНЫ РАНГА. Считаемость вместо высоты: три нашивки — высокий, две —
// средний, одна — низкий, кованая планка без шевронов — без приоритета. Ковка:
// фаски на концах, ромб-заклёпка в вершине, шары-терминалы.
const chev = (y, o = 1) =>
  `<path d="M6.8 ${y}L12 ${y - 3.1}L17.2 ${y}" stroke-width="1.55" opacity="${o}"/>` +
  `<path d="M12 ${y - 3.9}L12.7 ${y - 3.1}L12 ${y - 2.3}L11.3 ${y - 3.1}Z" fill="currentColor" stroke="none" opacity="${0.9 * o}"/>` +
  `<circle cx="6.2" cy="${y + 0.25}" r="0.55" fill="currentColor" stroke="none" opacity="${0.75 * o}"/>` +
  `<circle cx="17.8" cy="${y + 0.25}" r="0.55" fill="currentColor" stroke="none" opacity="${0.75 * o}"/>`;
// вычисляемые y дают хвосты 17.099999999999998 — режем тем же tidy(), что и BL2
const chevSvg = inner => tidy(`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.55" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`);
const PB = {
  high:   chevSvg(chev(20.2) + chev(15.2) + chev(10.2)),
  medium: chevSvg(chev(20.2) + chev(15.2) + chev(10.2, 0.16)),
  low:    chevSvg(chev(20.2) + chev(15.2, 0.16) + chev(10.2, 0.16)),
  none:   chevSvg(
    `<line x1="6.6" y1="15.2" x2="17.4" y2="15.2" stroke-width="1.7"/>` +
    `<path d="M5.6 14.2L7.2 15.2L5.6 16.2M18.4 14.2L16.8 15.2L18.4 16.2" stroke-width="0.95" opacity="0.8"/>` +
    `<path d="M12 13.9L12.75 15.2L12 16.5L11.25 15.2Z" fill="currentColor" stroke="none" opacity="0.85"/>`),
};

/* ────────── ПАРТИЯ 2 · часы: свип и унификация ──────────
   Примитивных часов в приложении ровно ДВЕ штуки, и обе — устаревшие дубли уже
   принятого богатого AV1 (`IC.sundial`, Batch-10):
     · index.html:1202 — круг с двумя стрелками, метка «Время (необязательно)», 13px;
     · index.html:443  — «gothic tower clock» у кнопки сортировки по дедлайну (24px):
       голая арка + голый круг + две стрелки. AV1 живёт рядом в сепараторах
       «С дедлайном» (03-render:412/456/640, 07:351) — то есть на одном экране
       соседствуют бедная и богатая версия одних и тех же часов.
   Вывод: чинится это НЕ четвёртыми часами, а унификацией на AV1 + его lean-версией
   под 13px (полный AV1 держит риски штрихом 0.8 при opacity 0.6 — на 13px каша). */
const AV1 = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6.6 22V10.8C6.6 6.6 8.9 3.9 12 3.9C15.1 3.9 17.4 6.6 17.4 10.8V22"/><path d="M8 22V11C8 7.6 9.8 5.4 12 5.4C14.2 5.4 16 7.6 16 11V22" stroke-width="0.75" opacity="0.32"/><line x1="4.6" y1="22" x2="19.4" y2="22" stroke-width="1.6"/><line x1="5.6" y1="23.3" x2="18.4" y2="23.3" stroke-width="0.8" opacity="0.4"/><line x1="12" y1="3.9" x2="12" y2="1.7" stroke-width="1.2"/><line x1="11.2" y1="2.5" x2="12.8" y2="2.5" stroke-width="1"/><path d="M9.1 5.7l-1 -0.6M14.9 5.7l1 -0.6" stroke-width="0.8" opacity="0.5"/><circle cx="12" cy="12.4" r="3.7"/><circle cx="12" cy="12.4" r="2.95" stroke-width="0.7" opacity="0.4"/><line x1="12" y1="9.2" x2="12" y2="9.9" stroke-width="0.8" opacity="0.6"/><line x1="12" y1="14.9" x2="12" y2="15.6" stroke-width="0.8" opacity="0.6"/><line x1="8.8" y1="12.4" x2="9.5" y2="12.4" stroke-width="0.8" opacity="0.6"/><line x1="14.5" y1="12.4" x2="15.2" y2="12.4" stroke-width="0.8" opacity="0.6"/><line x1="12" y1="12.4" x2="10.5" y2="10.7" stroke-width="1.8"/><line x1="12" y1="12.4" x2="13.5" y2="11.1" stroke-width="1.15"/><circle cx="12" cy="12.4" r="0.8" fill="currentColor" stroke="none"/><line x1="12" y1="16.1" x2="12" y2="19.3" stroke-width="0.95" opacity="0.6"/><path d="M12 18.7L12.85 19.8L12 20.9L11.15 19.8Z" fill="currentColor" stroke="none" opacity="0.8"/></svg>`;
const AV1_LEAN = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <path d="M6.6 21V10.8C6.6 6.6 8.9 3.9 12 3.9C15.1 3.9 17.4 6.6 17.4 10.8V21"/>
    <line x1="12" y1="3.9" x2="12" y2="1.9" stroke-width="1.35"/>
    <line x1="10.95" y1="2.7" x2="13.05" y2="2.7" stroke-width="1.15"/>
    <line x1="4.6" y1="21" x2="19.4" y2="21" stroke-width="1.9"/>
    <circle cx="12" cy="12.2" r="3.7" stroke-width="1.5"/>
    <line x1="12" y1="12.2" x2="12" y2="9.5" stroke-width="1.75"/>
    <line x1="12" y1="12.2" x2="14" y2="13.4" stroke-width="1.4"/>
    <line x1="12" y1="15.9" x2="12" y2="17.4" stroke-width="1.2" opacity="0.7"/>
    <path d="M12 17L12.95 18.3L12 19.6L11.05 18.3Z" fill="currentColor" stroke="none" opacity="0.85"/>
</svg>`;
const CUR_TOWER_POOR = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M7 22V11.5C7 7 9.2 4 12 4C14.8 4 17 7 17 11.5V22"/><line x1="5" y1="22" x2="19" y2="22" stroke-width="1.6"/><circle cx="12" cy="13.5" r="3.8"/><line x1="12" y1="13.5" x2="10.2" y2="11.5" stroke-width="2"/></svg>`;
const CUR_SEG_CAL = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 22V10C5 6.5 8 3 12 3C16 3 19 6.5 19 10V22Z"/><line x1="3" y1="22" x2="21" y2="22"/><line x1="5" y1="13.5" x2="19" y2="13.5"/><line x1="5" y1="18.5" x2="19" y2="18.5"/><circle cx="12" cy="16" r="2.4"/><circle cx="12" cy="16" r="0.75" fill="currentColor" stroke="none"/></svg>`;

/* ────────── ПАРТИЯ 3 · часы ДРУГОЙ ПОРОДЫ (AV1 отклонён как «те же часы») ──────────
   Вердикт юзера: башня-с-циферблатом в любой доработке — одна и та же вещь.
   Значит менять надо не отделку, а САМ ПРИБОР. Два хода, оба — настоящие
   средневековые способы показывать время, а не «часы с деталями».                */
const R2D = a => (a * Math.PI) / 180;
const PO = (a, r, cx = 12, cy = 12) =>
  `${+(cx + r * Math.cos(R2D(a))).toFixed(2)} ${+(cy + r * Math.sin(R2D(a))).toFixed(2)}`;
// T1 · ОРЛОЙ — астрономический циферблат (Пражский тип): наружный обод с 24
// делениями, кольцо-зодиак, солнечная стрела с диском-солнцем и лунный указатель
// с серпом. Время читается не стрелками по кругу, а положением светил — это
// принципиально другой прибор, а не башня с циферблатом.
const orlojTicks = (step, r1, r2, w, o) => {
  let s = '';
  for (let a = 0; a < 360; a += step)
    s += `<path d="M${PO(a, r1)}L${PO(a, r2)}" stroke-width="${w}" opacity="${o}"/>`;
  return s;
};
const T1 = tidy(`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="10.3"/>
    <circle cx="12" cy="12" r="8.5" stroke-width="0.85" opacity="0.5"/>
    ${orlojTicks(30, 8.5, 10.3, 0.9, 0.75)}
    ${orlojTicks(90, 8.2, 10.3, 1.35, 0.95)}
    <circle cx="12" cy="12" r="6.5" stroke-width="0.75" opacity="0.35"/>
    ${orlojTicks(45, 6.5, 8.5, 0.65, 0.3)}
    <path d="M12 12L${PO(-64, 6.2)}" stroke-width="1.5"/>
    <circle cx="${PO(-64, 6.9).split(' ')[0]}" cy="${PO(-64, 6.9).split(' ')[1]}" r="1.5" stroke-width="1.1"/>
    <path d="M${PO(-64, 8.9)}L${PO(-58, 8.2)}M${PO(-64, 8.9)}L${PO(-70, 8.2)}" stroke-width="0.7" opacity="0.7"/>
    <path d="M12 12L${PO(146, 4.6)}" stroke-width="1.05" opacity="0.75"/>
    <path d="M${PO(146, 6.6)}a1.55 1.55 0 1 1 -0.05 -1.7a1.25 1.25 0 1 0 0.05 1.7Z" fill="currentColor" stroke="none" opacity="0.85"/>
    <circle cx="12" cy="12" r="1.15" stroke-width="1.1"/>
    <circle cx="12" cy="12" r="0.42" fill="currentColor" stroke="none"/>
    <path d="M12 1.7V0.5M11.35 1.05H12.65" stroke-width="1" opacity="0.8"/>
</svg>`);
// T2 · РОЗА-ЦИФЕРБЛАТ — готическое окно-роза, где трассировка И ЕСТЬ шкала:
// восемь стрельчатых лепестков вместо рисок, окулюсы между ними, в центре втулка
// со стрелками-копьями. Часы становятся архитектурой, а не прибором с рисками.
const rosePetals = () => {
  let s = '';
  for (let a = -90; a < 270; a += 45) {
    const base = 3.9, tip = 8.7, w = 20;
    s += `<path d="M${PO(a - w, base)}L${PO(a - w * 0.62, tip - 1.5)}L${PO(a, tip)}` +
         `L${PO(a + w * 0.62, tip - 1.5)}L${PO(a + w, base)}" stroke-width="0.95" opacity="0.8"/>`;
  }
  for (let a = -67.5; a < 292.5; a += 45)
    s += `<circle cx="${PO(a, 6.9).split(' ')[0]}" cy="${PO(a, 6.9).split(' ')[1]}" r="0.85" stroke-width="0.8" opacity="0.55"/>`;
  return s;
};
const T2 = tidy(`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="10.4"/>
    <circle cx="12" cy="12" r="9.3" stroke-width="0.8" opacity="0.45"/>
    ${orlojTicks(45, 9.3, 10.4, 0.8, 0.5)}
    ${rosePetals()}
    <circle cx="12" cy="12" r="3.5" stroke-width="1.1" opacity="0.9"/>
    <path d="M12 12L12 7.4M11.35 8.3L12 7L12.65 8.3" stroke-width="1.7"/>
    <path d="M12 12L${PO(28, 5.6)}M${PO(20, 5.1)}L${PO(28, 6.5)}L${PO(38, 5.6)}" stroke-width="1.2"/>
    <circle cx="12" cy="12" r="0.95" fill="currentColor" stroke="none"/>
</svg>`);
// lean-версии под 13px: у T1 снимаются мелкие деления и зодиак, у T2 — окулюсы
// и внутренний обод; штрихи подняты. Силуэт прибора сохранён.
const T1_LEAN = tidy(`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="10"/>
    ${orlojTicks(90, 7.9, 10, 1.7, 1)}
    ${orlojTicks(45, 8.8, 10, 1.2, 0.6)}
    <path d="M12 12L${PO(-64, 5.6)}" stroke-width="1.7"/>
    <circle cx="${PO(-64, 6.6).split(' ')[0]}" cy="${PO(-64, 6.6).split(' ')[1]}" r="1.7" stroke-width="1.4"/>
    <path d="M12 12L${PO(146, 4.4)}" stroke-width="1.3" opacity="0.8"/>
    <path d="M${PO(146, 6.4)}a1.75 1.75 0 1 1 -0.05 -1.9a1.4 1.4 0 1 0 0.05 1.9Z" fill="currentColor" stroke="none" opacity="0.9"/>
    <circle cx="12" cy="12" r="0.75" fill="currentColor" stroke="none"/>
</svg>`);
const T2_LEAN = tidy(`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="10.2"/>
    ${(() => { let s = ''; for (let a = -90; a < 270; a += 45) {
      s += `<path d="M${PO(a - 21, 4.2)}L${PO(a, 8.9)}L${PO(a + 21, 4.2)}" stroke-width="1.2" opacity="0.9"/>`;
    } return s; })()}
    <circle cx="12" cy="12" r="3.4" stroke-width="1.4"/>
    <path d="M12 12L12 7.6M11.3 8.5L12 7.1L12.7 8.5" stroke-width="1.8"/>
    <path d="M12 12L${PO(28, 5.4)}" stroke-width="1.5"/>
    <circle cx="12" cy="12" r="0.9" fill="currentColor" stroke="none"/>
</svg>`);

/* ────────── ПАРТИЯ 4 · archive де-алиасинг ──────────
   `#icon-archive` (U2-крипта) шарится ТРЕМЯ разными семантиками:
     · «В архив» одной задачи  — 04-tasks:186 и :2312 через IC.archive;
     · «Архивировать ВСЁ»      — index.html:610 (<use>) И 08:295 (IC.archive, меню);
     · «Архивировать ОТМЕЧЕННЫЕ» — index.html:721 (<use>).
   Вердикт юзера: одиночную оставить криптой, двум массовым — свои глифы.
   Жёсткое ограничение: тулбарная кнопка «всё» рендерится 14px (13px на мобиле),
   кнопка «отмеченные» — 15px. То есть места ровно на ОДИН различитель поверх
   портала; композиции из трёх фигур там умрут, как умер обелиск на 15px.
   Различитель берём не из головы: «отмеченные» получает K1 · РУННЫЙ КРУГ —
   которым приложение УЖЕ метит select везде (index.html:790, кнопка «Отметить»). */
const CRYPT = `<path d="M5 20V10C5 5.8 8 3 12 3C16 3 19 5.8 19 10V20"/>` +
  `<line x1="3.4" y1="20" x2="20.6" y2="20" stroke-width="1.5"/>` +
  `<path d="M12 2.2L12.7 3.1L12 4L11.3 3.1Z" fill="currentColor" stroke="none" opacity="0.7"/>`;
const STEPS = `<path d="M7.6 20V17.6H16.4V20" stroke-width="1.2" opacity="0.75"/>` +
  `<path d="M9 17.6V15.6H15V17.6" stroke-width="1.2" opacity="0.55"/>`;
const arSvg = inner => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;
// действующая U2 — эталон сравнения (её же оставляем одиночному «В архив»)
const U2 = arSvg(CRYPT + STEPS +
  `<line x1="12" y1="8" x2="12" y2="12.6" stroke-width="1.5"/>` +
  `<path d="M9.9 10.7L12 13.2L14.1 10.7"/>`);

// A1 · ВРАТА С ДВОЙНЫМ ШЕВРОНОМ. Одинарная стрела = «эта штука вниз»; сдвоенный
// шеврон = «всё, до самого низа» — квантор читается одной характеристикой и
// выживает на 13px. Заклёпку на древке НЕ ставим: на 14px она и ромб-финиал
// портала стали бы двумя точками-соринками одна над другой без информации.
const AR_ALL_1 = arSvg(CRYPT + STEPS +
  `<line x1="12" y1="5.9" x2="12" y2="8.4" stroke-width="1.45"/>` +
  `<path d="M9.6 8.6L12 11.2L14.4 8.6" stroke-width="1.6"/>` +
  `<path d="M9.6 11.7L12 14.3L14.4 11.7" stroke-width="1.4" opacity="0.72"/>`);
// A2 · ОССУАРИЙ. Квантор не в движении, а в СОДЕРЖИМОМ: три плиты одна под
// другой, сужающиеся книзу (перспектива схода), каждая с заклёпкой. «Всё
// укладывается сюда». Читается спокойнее A1, но менее «действие».
const AR_ALL_2 = arSvg(CRYPT + STEPS +
  `<line x1="7.4" y1="9.4" x2="16.6" y2="9.4" stroke-width="1.6"/>` +
  `<line x1="8.2" y1="12.4" x2="15.8" y2="12.4" stroke-width="1.45" opacity="0.82"/>` +
  `<line x1="9" y1="14.9" x2="15" y2="14.9" stroke-width="1.3" opacity="0.6"/>` +
  `<path d="M11.5 9.4L12 8.6L12.5 9.4L12 10.2Z" fill="currentColor" stroke="none" opacity="0.7"/>` +
  `<path d="M11.55 12.4L12 11.7L12.45 12.4L12 13.1Z" fill="currentColor" stroke="none" opacity="0.5"/>`);

// K1 — действующая идиома «отметить» (index.html:790), откуда взят круг.
const K1_SELECT = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5.8"/><line x1="12" y1="9.3" x2="12" y2="14.7" stroke-width="1.1" opacity="0.45"/><line x1="12" y1="4.2" x2="12" y2="5.5" stroke-width="1" opacity="0.5"/><line x1="12" y1="18.5" x2="12" y2="19.8" stroke-width="1" opacity="0.5"/><line x1="4.2" y1="12" x2="5.5" y2="12" stroke-width="1" opacity="0.5"/><line x1="18.5" y1="12" x2="19.8" y2="12" stroke-width="1" opacity="0.5"/></svg>`;
// B1 · ВРАТА С РУННЫМ КРУГОМ. В проём нисходит САМ знак отметки: круг K1 с
// засечками, под ним шеврон спуска. «То, что отмечено, — вниз».
const runeTicks = (cy, r, len, w, o) =>
  `<line x1="12" y1="${cy - r - 0.6}" x2="12" y2="${cy - r - 0.6 - len}" stroke-width="${w}" opacity="${o}"/>` +
  `<line x1="${12 - r - 0.6}" y1="${cy}" x2="${12 - r - 0.6 - len}" y2="${cy}" stroke-width="${w}" opacity="${o}"/>` +
  `<line x1="${12 + r + 0.6}" y1="${cy}" x2="${12 + r + 0.6 + len}" y2="${cy}" stroke-width="${w}" opacity="${o}"/>`;
const AR_SEL_1 = tidy(arSvg(CRYPT + STEPS +
  `<circle cx="12" cy="8.9" r="2.85" stroke-width="1.5"/>` +
  `<line x1="12" y1="7.6" x2="12" y2="10.2" stroke-width="1" opacity="0.5"/>` +
  runeTicks(8.9, 2.85, 1.15, 0.95, 0.55) +
  `<path d="M9.9 12.3L12 14.6L14.1 12.3" stroke-width="1.5"/>`));
// B2 · ПЕЧАТЬ НАД СПУСКОМ. Минимальное вмешательство: та же U2-стрела спуска, но
// над ней в проёме сидит рунная печать. «Спускается то, что помечено».
const AR_SEL_2 = arSvg(CRYPT + STEPS +
  `<circle cx="12" cy="6.6" r="1.95" stroke-width="1.3"/>` +
  `<line x1="12" y1="5.7" x2="12" y2="7.5" stroke-width="0.85" opacity="0.5"/>` +
  `<line x1="12" y1="9.5" x2="12" y2="13" stroke-width="1.5"/>` +
  `<path d="M9.9 11.1L12 13.6L14.1 11.1"/>`);

/* ══════════════════ ПАРТИЯ 7 · заказ 2026-07-25 (вечер) ══════════════════
   ЧАСТЬ 1 · маркеры приоритета (цветные кружки) → башни-ранги.
   Замер, который решает всё: контурная PA рисовалась под 15px и держится там
   на честном слове — растровая проба (`D:/tmp/pw/_pxprobe.mjs`) даёт у неё
   ПОЛНОГО покрытия 0-1 пикселя на 15px и сплошную кашу на 7-11px, где живут
   нынешние кружки. Значит в маркеры контур не переносится ни при каком раскладе.
   Ход: та же башня, но ЗАЛИТАЯ — цвет приоритета возвращается площадью, как у
   кружка, а уровень читается высотой и навершием, как у контурной PA.
   Канва НЕЧЁТНАЯ (15 или 13): центр приходится на центр пикселя, поэтому осевой
   элемент не расщепляется на два полутона.                                    */
const PS_BASE15 = `<rect x="3" y="12" width="9" height="1"/>`
                + `<rect x="1" y="13" width="13" height="1" opacity="0.55"/>`;
const psTower15 = (finialY, apexY, baseY) =>
  `<svg viewBox="0 0 15 15" fill="currentColor">`
  + `<rect x="7" y="${finialY}" width="1" height="${apexY - finialY}"/>`
  + `<path d="M7.5 ${apexY}L10.5 ${baseY}H4.5Z"/>`
  + `<rect x="5" y="${baseY}" width="5" height="1"/>`
  + `<rect x="5" y="${baseY + 1}" width="2" height="${11 - baseY}"/>`
  + `<rect x="8" y="${baseY + 1}" width="2" height="${11 - baseY}"/>`
  + PS_BASE15 + `</svg>`;
const PS15 = {
  high: psTower15(0, 2, 5),
  medium: psTower15(3, 5, 8),
  low: psTower15(5, 7, 10),
  none: `<svg viewBox="0 0 15 15" fill="currentColor">`
    + `<rect x="5" y="9" width="2" height="3"/>`
    + `<rect x="8" y="10" width="2" height="2"/>`
    + `<rect x="11" y="11" width="1" height="1" opacity="0.6"/>`
    + PS_BASE15 + `</svg>`,
};
// та же башня на канве 13 — если решим не поднимать маркеры до 15px
const PS_BASE13 = `<rect x="3" y="10" width="7" height="1"/>`
                + `<rect x="1" y="11" width="11" height="1" opacity="0.55"/>`;
const psTower13 = (finialY, apexY, baseY) =>
  `<svg viewBox="0 0 13 13" fill="currentColor">`
  + `<rect x="6" y="${finialY}" width="1" height="1"/>`
  + `<path d="M6.5 ${apexY}L9 ${baseY}H4Z"/>`
  + `<rect x="4" y="${baseY}" width="2" height="${10 - baseY}"/>`
  + `<rect x="7" y="${baseY}" width="2" height="${10 - baseY}"/>`
  + PS_BASE13 + `</svg>`;
const PS13 = {
  high: psTower13(0, 1, 4),
  medium: psTower13(2, 3, 6),
  low: psTower13(4, 5, 8),
  none: `<svg viewBox="0 0 13 13" fill="currentColor">`
    + `<rect x="4" y="7" width="2" height="3"/>`
    + `<rect x="7" y="8" width="2" height="2"/>`
    + `<rect x="10" y="9" width="1" height="1" opacity="0.6"/>`
    + PS_BASE13 + `</svg>`,
};

/* ЧАСТЬ 2 · нав-таб «Задачи». Претензия: «сильно не хватает детализации и
   эстетичности». Растр нынешнего AA1 показывает и вторую болезнь: нижний скос
   задан кривой Q — последний ряд идёт сплошным полутоном (`.=+*#*+=.`), то есть
   ровно та же лестница, из-за которой переделывали «Архив».
   (а) ОРТО В ТЕХ ЖЕ 13px — плечи ступенькой, ни одной пологой грани.
   (б) НЕЧЁТНАЯ КАНВА 15px — центр 7.5 попадает в центр пикселя, поэтому осевой
       штрих креста ложится точно; появляется бюджет на шов крышки, крест pattée
       с концевыми заклёпками и гвозди. Грани только 45° (правило «≥45° читается
       как намеренная фаска»). Переносить придётся ВСЕ ТРИ таба.               */
const NAVW13 = s => `<svg viewBox="0 0 13 13" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="square" stroke-linejoin="miter">${s}</svg>`;
const NAVW15 = s => `<svg viewBox="0 0 15 15" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="square" stroke-linejoin="miter">${s}</svg>`;

const NAV_A = NAVW13(
  `<path d="M4.5 0.5H8.5V2.5H10.5V9.5H8.5V11.5H4.5V9.5H2.5V2.5H4.5Z"/>`
  + `<line x1="6.5" y1="4" x2="6.5" y2="8" stroke-linecap="butt" opacity="0.85"/>`
  + `<line x1="5" y1="5.5" x2="8" y2="5.5" stroke-linecap="butt" opacity="0.85"/>`
  + `<rect x="3" y="3" width="1" height="1" fill="currentColor" stroke="none" opacity="0.5"/>`
  + `<rect x="9" y="3" width="1" height="1" fill="currentColor" stroke="none" opacity="0.5"/>`
  + `<rect x="3" y="8" width="1" height="1" fill="currentColor" stroke="none" opacity="0.5"/>`
  + `<rect x="9" y="8" width="1" height="1" fill="currentColor" stroke="none" opacity="0.5"/>`);
const NAV_A2 = NAVW13(
  `<path d="M4.5 0.5H8.5V2.5H10.5V6.5H9.5V9.5H8.5V11.5H4.5V9.5H3.5V6.5H2.5V2.5H4.5Z"/>`
  + `<line x1="6.5" y1="4" x2="6.5" y2="8" stroke-linecap="butt" opacity="0.85"/>`
  + `<line x1="5" y1="5.5" x2="8" y2="5.5" stroke-linecap="butt" opacity="0.85"/>`
  + `<rect x="4" y="1" width="1" height="1" fill="currentColor" stroke="none" opacity="0.55"/>`
  + `<rect x="8" y="1" width="1" height="1" fill="currentColor" stroke="none" opacity="0.55"/>`
  + `<rect x="4" y="10" width="1" height="1" fill="currentColor" stroke="none" opacity="0.55"/>`
  + `<rect x="8" y="10" width="1" height="1" fill="currentColor" stroke="none" opacity="0.55"/>`);

const NAV_B_MAIN = NAVW15(
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
const NAV_B_TOMB = NAVW15(
  `<rect x="2.5" y="1.5" width="10" height="2"/>`
  + `<rect x="3.5" y="3.5" width="8" height="6"/>`
  + `<rect x="1.5" y="9.5" width="12" height="2" opacity="0.75"/>`
  + `<line x1="7.5" y1="4.5" x2="7.5" y2="8.5" stroke-linecap="butt" opacity="0.85"/>`
  + `<line x1="5.5" y1="6.5" x2="9.5" y2="6.5" stroke-linecap="butt" opacity="0.85"/>`
  + `<rect x="4" y="2" width="1" height="1" fill="currentColor" stroke="none" opacity="0.55"/>`
  + `<rect x="10" y="2" width="1" height="1" fill="currentColor" stroke="none" opacity="0.55"/>`
  + `<rect x="3" y="12" width="1" height="1" fill="currentColor" stroke="none" opacity="0.5"/>`
  + `<rect x="11" y="12" width="1" height="1" fill="currentColor" stroke="none" opacity="0.5"/>`);
const NAV_B_TOME = `<svg viewBox="0 0 15 15" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">`
  + `<path d="M7.5 5C6 3.8 3.8 3.6 1.5 4.3V11.5C3.8 10.8 6 11 7.5 12.2C9 11 11.2 10.8 13.5 11.5V4.3C11.2 3.6 9 3.8 7.5 5Z"/>`
  + `<path d="M7.5 5V12.2" opacity="0.5"/>`
  + `<path d="M7.5 0.6L8.1 2L9.5 2.6L8.1 3.2L7.5 4.6L6.9 3.2L5.5 2.6L6.9 2Z" fill="currentColor" stroke="none"/>`
  + `<path d="M3.5 6.5H6.5M2.5 8.5H6.5M3.5 10.5H6.5" opacity="0.45"/>`
  + `<path d="M11.5 6.5H8.5M12.5 8.5H8.5M11.5 10.5H8.5" opacity="0.45"/>`
  + `<rect x="2" y="5" width="1" height="1" fill="currentColor" stroke="none" opacity="0.6"/>`
  + `<rect x="12" y="5" width="1" height="1" fill="currentColor" stroke="none" opacity="0.6"/>`
  + `<path d="M6 12.4V14L7.5 13.1L9 14V12.4" opacity="0.6"/>`
  + `</svg>`;

// нынешние глифы — для честного «до/после» (скопированы из index.html как есть)
const CUR_NAV_MAIN = `<svg viewBox="0 0 13 13" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><path d="M4.75 0.5H8.25L11.5 3.25V11.25Q6.5 13.25 1.5 11.25V3.25Z"/><line x1="6.5" y1="4" x2="6.5" y2="8"/><line x1="4.5" y1="5.5" x2="8.5" y2="5.5"/><rect x="6" y="2" width="1" height="1" fill="currentColor" stroke="none" opacity="0.8"/><rect x="2" y="3" width="1" height="1" fill="currentColor" stroke="none" opacity="0.55"/><rect x="10" y="3" width="1" height="1" fill="currentColor" stroke="none" opacity="0.55"/><rect x="2" y="10" width="1" height="1" fill="currentColor" stroke="none" opacity="0.55"/><rect x="10" y="10" width="1" height="1" fill="currentColor" stroke="none" opacity="0.55"/><path d="M4.75 0.5L4.25 2.3M8.25 0.5L8.75 2.3" opacity="0.45"/></svg>`;
const CUR_NAV_TOMB = NAVW13(
  `<rect x="2.5" y="1.5" width="8" height="2"/><rect x="3.5" y="3.5" width="6" height="6"/>`
  + `<rect x="1.5" y="9.5" width="10" height="2" opacity="0.75"/>`
  + `<line x1="6.5" y1="5" x2="6.5" y2="8" stroke-linecap="butt" opacity="0.85"/>`
  + `<line x1="5" y1="6.5" x2="8" y2="6.5" stroke-linecap="butt" opacity="0.85"/>`);
const CUR_NAV_TOME = `<svg viewBox="0 0 13 13" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><path d="M6.5 4.5C5 3.4 3.2 3.2 1.5 3.75V10.5C3.2 9.9 5 10.1 6.5 11C8 10.1 9.8 9.9 11.5 10.5V3.75C9.8 3.2 8 3.4 6.5 4.5Z"/><path d="M6.5 4.5V11" opacity="0.5"/><path d="M6.5 1L7 2L8 2.5L7 3L6.5 4L6 3L5 2.5L6 2Z" fill="currentColor" stroke="none"/><rect x="2" y="5" width="1" height="1" fill="currentColor" stroke="none" opacity="0.6"/><rect x="10" y="5" width="1" height="1" fill="currentColor" stroke="none" opacity="0.6"/><path d="M4 5.5H5.5M3 7.5H5.5" opacity="0.45"/><path d="M9 5.5H7.5M10 7.5H7.5" opacity="0.45"/><path d="M5.5 11V12.5L6.5 11.75L7.5 12.5V11" opacity="0.6"/></svg>`;

/* ─────────────────────────── сборка страницы ─────────────────────────── */
const sz = (cls, svg) => `<span class="${cls}">${svg}</span>`;
const cell = (lbl, tag, sizes, cls = '') => `  <div class="cell ${cls}">
    <span class="lbl">${lbl}</span>
    <div class="sizes">${sizes}</div>
    <span class="tagline">${tag}</span>
  </div>`;
const big = svg => sz('g48', svg) + sz('g36', svg) + sz('g24', svg) + sz('g16', svg);
const mid = svg => sz('g36', svg) + sz('g24', svg) + sz('g16', svg);

const html = `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8">
<title>fb4 v3 — AZ3 по референсу · FL2 кодекс · BL2 шторка</title>
<style>
  body { background:#0a0417; color:#b880e8; font:14px/1.5 Georgia,serif; padding:28px 34px; }
  h1 { font-size:17px; color:#f0e8ff; letter-spacing:2px; }
  h2 { font-size:13px; color:#c090ff; letter-spacing:1.5px; margin:34px 0 6px; text-transform:uppercase; }
  p.note { font-size:12.5px; color:#9068c0; max-width:74ch; margin:4px 0 14px; }
  .row { display:flex; gap:26px; align-items:flex-end; flex-wrap:wrap; }
  .cell { display:flex; flex-direction:column; align-items:center; gap:8px;
          background:#120826; border:1px solid rgba(170,90,255,0.3); border-radius:10px;
          padding:16px 20px; min-width:110px; }
  .cell.rec { border-color:rgba(200,140,255,0.7); box-shadow:0 0 16px rgba(150,70,255,0.18); }
  .cell.old { opacity:0.5; }
  .cell .lbl { font-size:10.5px; letter-spacing:1px; color:#9068c0; text-transform:uppercase; }
  .cell.rec .lbl { color:#e0c0ff; }
  .g48 svg { width:48px; height:48px; } .g36 svg { width:36px; height:36px; }
  .g24 svg { width:24px; height:24px; } .g16 svg { width:16px; height:16px; }
  .g9 svg { width:9px; height:9px; }
  .sizes { display:flex; gap:14px; align-items:center; }
  .tagline { font-size:11px; color:#7a50a8; text-align:center; max-width:24ch; }
  .g15 svg { width:15px; height:15px; }
  /* ── мок дропдауна квик-эдда: геометрия и цвета скопированы со style.css:1343+ ── */
  .qa-menu { display:flex; flex-direction:column; gap:2px; padding:5px; width:250px;
             background:#06021a; border:1px solid rgba(140,60,255,0.32); border-radius:6px;
             box-shadow:0 8px 26px rgba(0,0,0,0.55), 0 0 20px rgba(80,20,180,0.18); }
  .qa-item { display:flex; align-items:center; gap:8px; padding:7px 10px; border-radius:4px;
             color:#b880e8; font:14px/1.4 'Cormorant',Georgia,serif; }
  .qa-item.active { background:rgba(100,25,200,0.22); color:#f0e8ff; }
  .qa-label { flex:1; min-width:0; }
  .qa-hint { font-family:'Cormorant SC',serif; font-size:9px; letter-spacing:0.5px;
             text-transform:uppercase; color:#9068c0; opacity:0.75; flex-shrink:0; }
  .qa-dot { width:8px; height:8px; border-radius:50%; flex-shrink:0; }
  .qa-sig { width:15px; height:15px; flex-shrink:0; display:flex; }
  .qa-sig svg { width:15px; height:15px; }
  .menus { display:flex; gap:22px; flex-wrap:wrap; align-items:flex-start; }
  .menucol { display:flex; flex-direction:column; gap:8px; align-items:center; }
  .menucap { font-size:10.5px; letter-spacing:1px; color:#9068c0; text-transform:uppercase; }
  .menucol.rec .menucap { color:#e0c0ff; }
  /* ── мок степпера и метки времени в натуральную величину (style.css:5173/6192) ── */
  .step-wrap { display:inline-flex; align-items:stretch; border:1px solid rgba(130,50,220,0.48);
               border-radius:6px; overflow:hidden; background:#0d0524; }
  .step-btn { width:44px; min-height:40px; display:flex; align-items:center; justify-content:center;
              background:rgba(100,30,200,0.12); color:#b880e8; }
  .step-btn svg { width:17px; height:17px; display:block; }
  .step-num { min-width:56px; display:flex; align-items:center; justify-content:center;
              color:#f0e8ff; font:16px/1 'Cormorant',Georgia,serif; }
  .dl-lab { display:inline-flex; align-items:center; gap:6px; color:#9068c0;
            font:12.5px/1 'Cormorant',Georgia,serif; }
  .dl-lab-ico { display:flex; } .dl-lab-ico svg { width:13px; height:13px; }
  .g13 svg { width:13px; height:13px; }
  .g14 svg { width:14px; height:14px; }
  /* ── моки кнопок в натуральную величину (style.css:1536/4340) ── */
  .btnrow { display:flex; gap:6px; align-items:center; }
  .tb-btn, .sb-btn-mock { display:flex; align-items:center; justify-content:center;
      border:1px solid rgba(130,50,220,0.4); border-radius:6px; background:rgba(100,30,200,0.10);
      color:#b880e8; }
  .tb-btn { width:30px; height:30px; } .tb-btn svg { width:14px; height:14px; }
  .sb-btn-mock { width:32px; height:32px; } .sb-btn-mock svg { width:15px; height:15px; }
  /* ── ПАРТИЯ 7 · моки приоритета и нав-панели в натуральную величину ── */
  .dot { border-radius:50%; flex-shrink:0; display:block; }
  .d6 { width:6px; height:6px; } .d7 { width:7px; height:7px; }
  .d9 { width:9px; height:9px; box-shadow:0 0 5px currentColor; }
  .d11 { width:11px; height:11px; }
  .c-high { background:#e03060; color:#e03060; }
  .c-medium { background:#d09020; color:#d09020; }
  .c-low { background:#3cc870; color:#3cc870; }
  .c-none { background:rgba(150,130,190,0.45); }
  .mk { flex-shrink:0; display:flex; }
  .mk.s15 svg { width:15px; height:15px; display:block; }
  .mk.s13 svg { width:13px; height:13px; display:block; }
  .mk.s11 svg { width:11px; height:11px; display:block; }
  .mk.s9 svg { width:9px; height:9px; display:block; }
  .mk.s7 svg { width:7px; height:7px; display:block; }
  .p-high { color:#e03060; } .p-medium { color:#d09020; } .p-low { color:#3cc870; }
  .p-none { color:rgba(150,130,190,0.55); }
  /* .prio-btn (style.css:804) — пилюля модалки «Изменить приоритет» */
  .pchip { display:inline-flex; align-items:center; gap:5px; padding:6px 11px; border-radius:99px;
           border:1px solid rgba(120,50,200,0.28); background:#0d0524;
           font:500 11px/1 'Cormorant SC',Georgia,serif; letter-spacing:1px; color:#9d7ac4; }
  .pchip.on-high { background:rgba(200,30,60,0.14); color:#e03060; border-color:rgba(220,50,80,0.4); }
  /* .prio-grid-btn (style.css:875) — сетка приоритета в форме */
  .pgrid { display:grid; grid-template-columns:1fr 1fr; gap:4px; width:230px; }
  .pgbtn { display:flex; align-items:center; justify-content:center; gap:5px; padding:7px 10px;
           border-radius:6px; border:1px solid rgba(120,50,200,0.28); background:#0d0524;
           font:500 10.5px/1 'Cormorant SC',Georgia,serif; letter-spacing:1.5px; color:#9d7ac4;
           white-space:nowrap; }
  /* .fm-q (плавающее меню подпункта) */
  .fmrow { display:flex; align-items:center; gap:8px; padding:7px 10px; border-radius:4px;
           color:#b880e8; font:14px/1.4 'Cormorant',Georgia,serif; width:190px; }
  .fmrow.on { background:rgba(100,25,200,0.22); color:#f0e8ff; }
  .fmbox { display:flex; flex-direction:column; gap:2px; padding:5px; width:200px;
           background:#06021a; border:1px solid rgba(140,60,255,0.32); border-radius:6px; }
  /* .page-nav / .nav-tab (style.css:424) */
  .navmock { display:flex; gap:3px; background:#0d0524; border-radius:10px; padding:4px;
             border:1px solid rgba(120,50,200,0.28); width:330px; }
  .navtab { flex:1; display:flex; align-items:center; justify-content:center; gap:6px;
            padding:9px 12px; border-radius:6px; color:#7a5aa0;
            font:600 12px/1 'Cormorant SC',Georgia,serif; letter-spacing:1px; text-transform:uppercase; }
  .navtab.on { background:linear-gradient(135deg,rgba(110,30,220,0.30),rgba(80,15,180,0.20));
               color:#c89aff; box-shadow:inset 0 0 0 1px rgba(150,70,255,0.30); }
  .navtab.n13 svg { width:13px; height:13px; display:block; }
  .navtab.n15 svg { width:15px; height:15px; display:block; }
</style>
</head>
<body>
<h1>fb4 v3 · переделка по референсу (2026-07-19)</h1>
<p class="note">Рамкой отмечена рекомендация. AZ2 и старьё оставлены для сравнения.</p>

<h2>AZ3 · Уроборос по референсу</h2>
<p class="note">Переделано по существу, а не по деталям. Что изменилось против
прошлых попыток: <b>голова — ЗАЛИВКА, а не штрих</b> (в референсе она сплошная
чёрная) — только так появляются масса-объём, настоящая дырка-глаз и чистый клин
пасти; <b>верхняя челюсть продолжает само тело</b> по касательной, поэтому нет
«горба», который вы поймали; <b>пасть распахнута широко, с зубами</b> на обеих
челюстях; хвост входит между челюстей, и <b>сход хвоста с кольца строго по
касательной</b> — окружность больше не кривая. Две трактовки тела: <b>a</b> —
сплошной штрих (держится в мета-теге 12px), <b>b</b> — гравюрные двойные кромки
с чешуёй между ними (богаче на 24-48px).</p>
<div class="row">
${cell('AZ3a · сплошное тело', 'один штрих: максимум читаемости на 12-16px (мета-теги)', big(AZ3a), 'rec')}
${cell('AZ3b · гравюра', 'тело двумя кромками + чешуя между ними: максимум детализации', big(AZ3b), 'rec')}
${cell('cycleReturn3', 'микро-AZ3 (10×10): кольцо, голова, язычок', sz('g24', CR3) + sz('g16', CR3) + sz('g9', CR3), 'rec')}
${cell('AZ2 (v2)', 'предыдущая попытка', mid(AZ2), 'old')}
${cell('сейчас в проекте', '∞-лемниската / ромб-стрелка', sz('g24', CUR_AZ) + sz('g16', CUR_AZ) + sz('g24', CUR_CR) + sz('g9', CUR_CR), 'old')}
</div>

<h2>focusLvl · FL2 «Кодекс-разворот» (полная переделка) + FL1 (принят)</h2>
<p class="note">Метафора FL2: иллюминированный разворот. Левая страница = СПИСОК
(буквица-рубрика + строки записей), правая = ЗАМЕТКА. [0] разворот целиком ·
[1] левая страница перевёрнута в узкую кромку — виден срез стопки листов ·
[2] одна страница во весь глиф, слева завиток скрытой стопки. Готика: корешок
со сшивкой-станциями, стрельчатые верха, рубрицированная буквица.</p>
<div class="row">
${cell('FL2 [0] разворот', 'клик → свернуть список в кромку', mid(FL2[0]), 'rec')}
${cell('FL2 [1] кромка+страница', 'клик → заметка во весь экран', mid(FL2[1]), 'rec')}
${cell('FL2 [2] одна страница', 'клик → показать список', mid(FL2[2]), 'rec')}
</div>
<div class="row" style="margin-top:14px">
${cell('FL1 [0]', 'принят ранее', sz('g24', FL1[0]) + sz('g16', FL1[0]), 'old')}
${cell('FL1 [1]', 'принят ранее', sz('g24', FL1[1]) + sz('g16', FL1[1]), 'old')}
${cell('FL1 [2]', 'принят ранее', sz('g24', FL1[2]) + sz('g16', FL1[2]), 'old')}
</div>

<h2>barLvl · BL2 «Кованая шторка над инструментами» + BL1 (принят)</h2>
<p class="note"><b>Рерабока по 4 правкам (2026-07-24).</b> Интуитивность BL1 хромала:
голая решётка не говорит «тулбар». В BL2 ВИДЕН сам ряд инструментов — кованая
планка, на ней три сигила уже принятыми мотивами DUSK: <b>стрельчатая арка</b>
(окулюс + цоколь) · <b>крест pattée</b> идиомой BD1 (планки + клинья на концах) ·
<b>флёр-де-лис</b> идиомой BM1 (лепесток, две волюты, поясок, шип). Заслонка над
планкой: auto = на половине <b>сплошной линией</b> (пунктир убран), сигилы
приглушены · open = поднята, сигилы яркие (<b>засов-штырь убран</b>) · closed =
опущена, пики решётки <b>доведены до нижней кромки планки</b> (кольцо-ручка
убрана), сигилы скрыты.</p>
<div class="row">
${cell('BL2 auto', 'по наведению', mid(BL2.auto), 'rec')}
${cell('BL2 open', 'закреплён', mid(BL2.open), 'rec')}
${cell('BL2 closed', 'скрыт', mid(BL2.closed), 'rec')}
</div>
<div class="row" style="margin-top:14px">
${cell('BL1 auto', 'принят ранее', sz('g24', BL1.auto) + sz('g16', BL1.auto), 'old')}
${cell('BL1 open', 'принят ранее', sz('g24', BL1.open) + sz('g16', BL1.open), 'old')}
${cell('BL1 closed', 'принят ранее', sz('g24', BL1.closed) + sz('g16', BL1.closed), 'old')}
${cell('сейчас в проекте', 'лента-свиток', sz('g24', CUR_BAR.auto) + sz('g24', CUR_BAR.open) + sz('g24', CUR_BAR.closed), 'old')}
</div>

<h2>N · Сигилы типахеда квик-эдда (набор N3 — ваш вердикт)</h2>
<p class="note">Арт <b>не переделан</b> — взят байт-в-байт из fb2 (кандидат N3):
обелиск-«!» · щит со звездой · башенка-часы. Здесь решается только <b>подача</b>:
сигил встаёт на место цветной точки в строке дропдауна, 15px. Цвет приоритета
никуда не девается — он переезжает с точки на сам сигил, так что сигнал остался,
а строка получила язык. Сравнение «сейчас» справа.</p>
<div class="row">
${cell('N3 приоритет', 'кованый обелиск-«!»: жезл с перекладиной, кольца-финиалы, ромб-точка', mid(N3_PRIO) + sz('g15', N3_PRIO), 'rec')}
${cell('N3 тег', 'щит с каймой и звездой-сигилом', mid(N3_TAG) + sz('g15', N3_TAG), 'rec')}
${cell('N3 дата', 'башенка-часы языка дедлайна: крест-финиал, циферблат, маятник', mid(N3_DATE) + sz('g15', N3_DATE), 'rec')}
</div>

<h2 style="margin-top:22px">N · в реальной строке дропдауна</h2>
<div class="menus">
  <div class="menucol rec"><span class="menucap">! приоритет</span>
    ${qaMenu(PRIO_ROWS(N3_PRIO))}</div>
  <div class="menucol rec"><span class="menucap">* тег</span>
    ${qaMenu([
      qaRow(N3_TAG, '', '*письма', 'новый тег', true),
      qaRow(N3_TAG, '', '*травник', ''),
      qaRow(N3_TAG, '', '*ритуал', ''),
    ])}</div>
  <div class="menucol rec"><span class="menucap">% дата</span>
    ${qaMenu([
      qaRow(N3_DATE, '', '25 июля, 19:00', 'распознано', true),
      qaRow(N3_DATE, '', 'Сегодня', ''),
      qaRow(N3_DATE, '', 'Завтра', ''),
      qaRow(N3_DATE, '', 'Через неделю', ''),
    ])}</div>
  <div class="menucol"><span class="menucap">сейчас (точки)</span>
    ${qaMenu([
      qaDot('#e03060', 'Высокий', '!high', true),
      qaDot('#d09020', 'Средний', '!medium'),
      qaDot('', '*письма', 'новый тег'),
      qaDot('', 'Завтра', ''),
    ])}</div>
</div>

<h2 style="margin-top:22px">Развилка · строка «Без приоритета»</h2>
<p class="note">Единственная строка без цвета: приглушённый сигил читается просто
как «блёклый высокий». Три трактовки — <b>A</b> тот же обелиск приглушённым ·
<b>B</b> обелиск <b>без ромба-точки</b> («!» без точки = не восклицание; чистое
вычитание из принятого арта) · <b>C</b> обелиск, <b>перерубленный кованой
перекладиной</b> с фасками — идиома «—», которой в панели выбора уже помечен
«Без приоритета». Нужен ваш выбор.</p>
<div class="menus">
  <div class="menucol"><span class="menucap">A · приглушённый</span>
    ${qaMenu(PRIO_ROWS(N3_PRIO))}
    <div class="sizes">${sz('g24', N3_PRIO)}${sz('g16', N3_PRIO)}</div></div>
  <div class="menucol"><span class="menucap">B · без ромба-точки</span>
    ${qaMenu(PRIO_ROWS(N3_PRIO_B))}
    <div class="sizes">${sz('g24', N3_PRIO_B)}${sz('g16', N3_PRIO_B)}</div></div>
  <div class="menucol"><span class="menucap">C · перерублен</span>
    ${qaMenu(PRIO_ROWS(N3_PRIO_C))}
    <div class="sizes">${sz('g24', N3_PRIO_C)}${sz('g16', N3_PRIO_C)}</div></div>
</div>

<h2 style="margin-top:26px">X1 · Арки времени (дедлайн-модалка)</h2>
<p class="note">Живых целей в приложении оказалось <b>две</b>, а не три: степперы
<code>.stepper-btn</code> (8 точек, рендер 17px) и глиф метки «Время
(необязательно)» (13px, сейчас — generic круг с двумя стрелками). <b>Календарь-арка
цели не имеет</b>: поле даты нативное <code>&lt;input type="date"&gt;</code>, свой
триггер туда не поставить, а глиф дедлайна давно переведён на IC.window. Что с ней
делать — вопрос ниже.</p>

<h2 style="font-size:12px;margin-top:16px">Степперы — в натуральную величину (17px)</h2>
<div class="menus">
  <div class="menucol"><span class="menucap">сейчас · ланса</span>
    ${stepPair(CUR_STEP_UP, CUR_STEP_DOWN)}
    <div class="sizes">${sz('g24', CUR_STEP_DOWN)}${sz('g16', CUR_STEP_DOWN)}</div></div>
  <div class="menucol rec"><span class="menucap">X1 · как в вердикте</span>
    ${stepPair(X1_STEP_UP, X1_STEP_DOWN)}
    <div class="sizes">${sz('g24', X1_STEP_DOWN)}${sz('g16', X1_STEP_DOWN)}</div></div>
  <div class="menucol rec"><span class="menucap">X1 · подача под 17px</span>
    ${stepPair(X1_STEP_UP_B, X1_STEP_DOWN_B)}
    <div class="sizes">${sz('g24', X1_STEP_DOWN_B)}${sz('g16', X1_STEP_DOWN_B)}</div></div>
</div>
<p class="note">Различие только в подаче: у X1-как-в-вердикте шары на перекладине
имеют r=0.55 на канве 22 — на экране это 0.85px в диаметре, они почти пропадают,
а ромб-навершие сливается со стержнем. Правый вариант — тот же рисунок с
укрупнёнными шарами и ромбом (сам силуэт не тронут). «Вверх» выведен строгим
зеркалом по y=11, иначе пара разъезжается.</p>

<h2 style="font-size:12px;margin-top:20px">Метка «Время» — в натуральную величину (13px)</h2>
<div class="menus">
  <div class="menucol"><span class="menucap">сейчас · круг-часы</span>
    ${timeLabel(CUR_CLOCK)}<div class="sizes">${sz('g24', CUR_CLOCK)}${sz('g16', CUR_CLOCK)}</div></div>
  <div class="menucol"><span class="menucap">башенка N3 как есть</span>
    ${timeLabel(N3_DATE)}<div class="sizes">${sz('g24', N3_DATE)}${sz('g16', N3_DATE)}${sz('g13', N3_DATE)}</div></div>
  <div class="menucol rec"><span class="menucap">башенка · подача под 13px</span>
    ${timeLabel(X1_TIME_LEAN)}<div class="sizes">${sz('g24', X1_TIME_LEAN)}${sz('g16', X1_TIME_LEAN)}${sz('g13', X1_TIME_LEAN)}</div></div>
</div>
<p class="note">Ваша пометка в X1: «время = башенка из N3-языка, если N3 победит».
N3 победил → берём башенку. Но полный N3-арт держит риски циферблата и второй
обод штрихами 0.7-0.95 при opacity 0.4 — на 13px это 0.4px на экране, то есть
серая каша. Правый вариант — та же башня, снят шум, штрихи подняты до ≥1.1.</p>

<h2 style="font-size:12px;margin-top:20px">Календарь-арка · куда её</h2>
<div class="row">
${cell('X1 календарь-арка', 'ланцетная скрижаль: сетка дней, ромб = выбранный день, крест-навершие', mid(X1_CAL), 'rec')}
</div>
<p class="note"><b>Развилка.</b> (1) <b>Не вживлять</b> — цели нет, арт остаётся в
резерве (под будущий календарь, CALENDAR-SPEC). (2) <b>Дать строке «Дата»
собственную метку</b> с этим глифом — сейчас у времени метка с глифом есть, а у
даты нет вообще; арка их уравняет и заодно закроет асимметрию модалки.
(3) Куда-то ещё по вашему указанию.</p>

<hr style="margin:34px 0;border:none;border-top:1px solid rgba(170,90,255,0.25)">
<h1>ПАРТИЯ 2 · по вашим правкам 2026-07-24</h1>
<p class="note">Решено и в работе: «Без приоритета» = <b>C</b> · степперы = подача
под 17px · метка времени = lean · календарь-арка → в нативный пикер даты.
Ниже — два открытых вопроса из ваших правок.</p>

<h2>Приоритет-сигил заново (обелиск признан неинтуитивным)</h2>
<p class="note">Ограничение, которое решает всё: сигил живёт на <b>15px</b> в строке
дропдовна. Композиция из трёх фигур там умирает — значит уровень обязан читаться
<b>одной характеристикой силуэта</b>. Отсюда два хода. Оба дают <b>свой глиф на
каждый уровень</b> (обелиск давал один на все четыре, цвет нёс всё) — интуитивность
перестаёт зависеть от цвета.</p>
<div class="menus">
  <div class="menucol rec"><span class="menucap">PA · башня-ранг</span>
    ${qaMenu([
      qaRow(PA.high, '#e03060', 'Высокий', '!high', true),
      qaRow(PA.medium, '#d09020', 'Средний', '!medium'),
      qaRow(PA.low, '#3cc870', 'Низкий', '!low'),
      qaRow(PA.none, 'rgba(144,104,192,0.75)', 'Без приоритета', '!none'),
    ])}
    <div class="sizes">${sz('g24', PA.high)}${sz('g24', PA.medium)}${sz('g24', PA.low)}${sz('g24', PA.none)}</div>
    <div class="sizes">${sz('g16', PA.high)}${sz('g16', PA.medium)}${sz('g16', PA.low)}${sz('g16', PA.none)}</div></div>
  <div class="menucol rec"><span class="menucap">PB · шевроны ранга</span>
    ${qaMenu([
      qaRow(PB.high, '#e03060', 'Высокий', '!high', true),
      qaRow(PB.medium, '#d09020', 'Средний', '!medium'),
      qaRow(PB.low, '#3cc870', 'Низкий', '!low'),
      qaRow(PB.none, 'rgba(144,104,192,0.75)', 'Без приоритета', '!none'),
    ])}
    <div class="sizes">${sz('g24', PB.high)}${sz('g24', PB.medium)}${sz('g24', PB.low)}${sz('g24', PB.none)}</div>
    <div class="sizes">${sz('g16', PB.high)}${sz('g16', PB.medium)}${sz('g16', PB.low)}${sz('g16', PB.none)}</div></div>
  <div class="menucol"><span class="menucap">обелиск + C (отклонён)</span>
    ${qaMenu(PRIO_ROWS(N3_PRIO_C))}
    <div class="sizes">${sz('g24', N3_PRIO)}${sz('g16', N3_PRIO)}</div></div>
</div>
<p class="note"><b>PA · башня-ранг.</b> Язык кладки взят у <b>M3</b>
(<code>IC.sortPriority</code>) — той самой иконки, которой приложение УЖЕ обозначает
приоритет: двойные стены, шпиль, навершие, цоколь. Уровень = <b>высота башни</b>;
«выше = важнее» объяснять не нужно. Навершия тоже ранжированы: крест-ромб →
малый ромб → шар. «Без приоритета» = <b>руина</b>: цоколь, два обломка стены,
упавший блок — шпиля нет вовсе.<br>
<b>PB · шевроны ранга.</b> Считаемость вместо высоты: три кованые нашивки —
высокий, две — средний, одна — низкий; погашенные позиции остаются видны призраком,
поэтому ранг читается даже в одиночной строке. «Без приоритета» = кованая планка
с фасками и ромбом — та самая идиома «—», которой уровень «нет» помечен в панели
выбора. Ковка: фаски на концах, ромб-заклёпка в вершине, шары-терминалы.</p>

<h2 style="margin-top:22px">Часы: свип по приложению</h2>
<p class="note">Примитивных часов оказалось <b>ровно две</b> штуки, и обе —
устаревшие дубли уже принятого богатого <b>AV1</b> (<code>IC.sundial</code>, Batch-10):
<code>index.html:1202</code> (метка «Время», 13px) и <code>index.html:443</code>
(кнопка сортировки по дедлайну, 24px). AV1 при этом живёт рядом, в сепараторах
«С дедлайном» — то есть на одном экране соседствуют бедная и богатая версия одних
и тех же часов. Чинится это <b>не четвёртыми часами, а унификацией</b>: рисовать
конкурента принятому AV1 — значит расщепить язык времени, которого в приложении
ровно один.</p>
<div class="menus">
  <div class="menucol"><span class="menucap">сейчас · метка 13px</span>
    ${timeLabel(CUR_CLOCK)}<div class="sizes">${sz('g24', CUR_CLOCK)}${sz('g16', CUR_CLOCK)}</div></div>
  <div class="menucol rec"><span class="menucap">AV1-lean · метка 13px</span>
    ${timeLabel(AV1_LEAN)}<div class="sizes">${sz('g24', AV1_LEAN)}${sz('g16', AV1_LEAN)}${sz('g13', AV1_LEAN)}</div></div>
  <div class="menucol"><span class="menucap">сейчас · сортировка 24px</span>
    <div class="sizes">${sz('g36', CUR_TOWER_POOR)}${sz('g24', CUR_TOWER_POOR)}</div></div>
  <div class="menucol rec"><span class="menucap">AV1 · сортировка 24px</span>
    <div class="sizes">${sz('g36', AV1)}${sz('g24', AV1)}</div></div>
</div>
<p class="note">Если такой ответ («не новый глиф, а вымести дубли на AV1») вас не
устраивает и вы хотите, чтобы сами часы были переработаны заново — скажите, и
следующей партией я нарисую AV1-преемника: тогда он заменит и AV1 во всех
сепараторах, чтобы язык остался единым.</p>

<h2 style="margin-top:22px">Календарь-арка → нативный пикер даты (ваш вердикт #4)</h2>
<p class="note">Цель найдена: <code>seg-picker-btn</code> в
<code>08-quickadd-export-init.ts:1064</code> — кнопка, открывающая нативный пикер у
сегментированного поля даты (в т.ч. в дедлайн-модалке). Там уже стоит арка-календарь,
но ранняя и грубая: три полки, голый круг. X1 — та же арка, но с настоящей сеткой
дней, ромбом выбранного дня и крестом-навершием.</p>
<div class="row">
${cell('сейчас · seg-picker', 'три полки + голый круг', mid(CUR_SEG_CAL), 'old')}
${cell('X1 · календарь-арка', 'сетка дней, ромб = выбранный день, крест-навершие', mid(X1_CAL), 'rec')}
</div>

<hr style="margin:34px 0;border:none;border-top:1px solid rgba(170,90,255,0.25)">
<h1>ПАРТИЯ 3 · часы другой ПОРОДЫ</h1>
<p class="note">AV1 отклонён верно: башня-с-циферблатом в любой доработке остаётся
той же вещью. Значит менять надо не отделку, а <b>сам прибор</b>. Оба кандидата —
настоящие средневековые способы показывать время, а не «часы с деталями».
Ни один не наследует силуэт башни.</p>
<div class="row">
${cell('T1 · Орлой', 'астрономический циферблат: обод с делениями, кольцо-зодиак, солнечная стрела, лунный указатель', big(T1), 'rec')}
${cell('T2 · Роза-циферблат', 'окно-роза, где трассировка И ЕСТЬ шкала: восемь стрельчатых лепестков, окулюсы, стрелки-копья', big(T2), 'rec')}
${cell('AV1 (отклонён)', 'башня + циферблат + маятник', mid(AV1), 'old')}
${cell('сейчас · сортировка', 'голая арка, голый круг, две стрелки', mid(CUR_TOWER_POOR), 'old')}
</div>
<p class="note"><b>T1 · Орлой.</b> Пражский тип: время читается <b>положением
светил</b>, а не стрелками по кругу. Наружный обод с 12 делениями и утолщёнными
кардинальными, кольцо-зодиак с косыми рисками, солнечная стрела с диском-солнцем
и лучами, лунный указатель с серпом, втулка в кольце, крест-навершие сверху.
Другой прибор целиком — родства с башней нет.<br>
<b>T2 · Роза-циферблат.</b> Часы становятся <b>архитектурой</b>: готическое
окно-роза, где трассировка заменяет риски — восемь стрельчатых лепестков по кругу,
окулюсы в промежутках, каменная двойная рама. В центре втулка со стрелками-копьями,
поэтому «это часы» читается мгновенно, хотя ни одной обычной часовой детали нет.</p>

<h2 style="margin-top:20px">Оба — в реальных размерах приложения (13px метка · 17px · 24px)</h2>
<div class="menus">
  <div class="menucol rec"><span class="menucap">T1 · полный / lean</span>
    ${timeLabel(T1)}${timeLabel(T1_LEAN)}
    <div class="sizes">${sz('g24', T1)}${sz('g16', T1)}${sz('g13', T1)}</div>
    <div class="sizes">${sz('g24', T1_LEAN)}${sz('g16', T1_LEAN)}${sz('g13', T1_LEAN)}</div></div>
  <div class="menucol rec"><span class="menucap">T2 · полный / lean</span>
    ${timeLabel(T2)}${timeLabel(T2_LEAN)}
    <div class="sizes">${sz('g24', T2)}${sz('g16', T2)}${sz('g13', T2)}</div>
    <div class="sizes">${sz('g24', T2_LEAN)}${sz('g16', T2_LEAN)}${sz('g13', T2_LEAN)}</div></div>
  <div class="menucol"><span class="menucap">сейчас · метка 13px</span>
    ${timeLabel(CUR_CLOCK)}</div>
</div>
<p class="note">Верхняя метка в каждой колонке — полный арт на 13px, нижняя — lean
(сняты мелкие деления/окулюсы, штрихи подняты; силуэт прибора сохранён). Выбранный
кандидат заменит часы <b>везде</b>: метка «Время» (13px), кнопка сортировки по
дедлайну (24px) и <b>сепараторы «С дедлайном»</b>, где сейчас стоит AV1 — иначе
язык времени снова расщепится.</p>

<h1 style="margin-top:44px">ПАРТИЯ 4 · archive де-алиасинг</h1>
<p class="note">Одна крипта <b>U2</b> сейчас обслуживает три разных действия: «в
архив» ОДНОЙ задачи, «архивировать ВСЁ» и «архивировать ОТМЕЧЕННЫЕ». По вашему
вердикту одиночная остаётся криптой, двум массовым — свои глифы. Жёсткая рамка:
кнопка «всё» рендерится <b>14px</b> (13px на мобиле), «отмеченные» — <b>15px</b>,
то есть места ровно на ОДИН различитель поверх портала. Поэтому портал, ступени и
ромб-финиал у всех троих общие — меняется только то, что происходит в проёме.</p>

<h2>Действующая U2 — остаётся у одиночного «В архив»</h2>
<div class="row">
${cell('U2 · крипта', 'портал, ступени вниз, одна стрела спуска', big(U2) + sz('g15', U2) + sz('g14', U2) + sz('g13', U2))}
</div>

<h2>«Архивировать ВСЁ» — два кандидата</h2>
<div class="row">
${cell('A1 · двойной шеврон', 'квантор в ДВИЖЕНИИ: сдвоенный шеврон = «всё, до самого низа»', big(AR_ALL_1) + sz('g15', AR_ALL_1) + sz('g14', AR_ALL_1) + sz('g13', AR_ALL_1), 'rec')}
${cell('A2 · оссуарий', 'квантор в СОДЕРЖИМОМ: три плиты, сужающиеся книзу', big(AR_ALL_2) + sz('g15', AR_ALL_2) + sz('g14', AR_ALL_2) + sz('g13', AR_ALL_2), 'rec')}
${cell('сейчас', 'та же U2, что и у одиночной задачи', mid(U2) + sz('g14', U2), 'old')}
</div>
<p class="note"><b>A1</b> говорит про действие («отправить вниз всё»), <b>A2</b> —
про результат («здесь лежит всё»). A1 живее и дальше от U2 по силуэту; A2 спокойнее,
но рискует читаться просто как «архив», а не как «архивировать всё».</p>

<h2>«Архивировать ОТМЕЧЕННЫЕ» — два кандидата</h2>
<div class="row">
${cell('B1 · рунный круг в проёме', 'вниз нисходит САМ знак отметки', big(AR_SEL_1) + sz('g15', AR_SEL_1) + sz('g14', AR_SEL_1) + sz('g13', AR_SEL_1), 'rec')}
${cell('B2 · печать над спуском', 'та же стрела U2, но помечена печатью сверху', big(AR_SEL_2) + sz('g15', AR_SEL_2) + sz('g14', AR_SEL_2) + sz('g13', AR_SEL_2), 'rec')}
${cell('K1 · откуда взят круг', 'кнопка «Отметить» в архиве — идиома select в приложении', mid(K1_SELECT) + sz('g15', K1_SELECT), 'old')}
</div>
<p class="note">Различитель НЕ выдуман: <b>K1 · рунный круг</b> — то, чем приложение
уже метит выбор (кнопка «Отметить», <code>index.html:790</code>). <b>B1</b> ставит
его в проём как то, что нисходит; <b>B2</b> оставляет стрелу U2 нетронутой и вешает
печать над ней — минимальное вмешательство, но и меньше отличий от U2 на 15px.</p>

<h2>В натуральную величину — как это ляжет в кнопки</h2>
<div class="menus">
  <div class="menucol"><span class="menucap">тулбар · 14px</span>
    <div class="btnrow">
      <span class="tb-btn">${AR_ALL_1}</span><span class="tb-btn">${AR_ALL_2}</span><span class="tb-btn">${U2}</span>
    </div>
    <span class="tagline">A1 · A2 · нынешняя U2</span></div>
  <div class="menucol"><span class="menucap">панель выбора · 15px</span>
    <div class="btnrow">
      <span class="sb-btn-mock">${AR_SEL_1}</span><span class="sb-btn-mock">${AR_SEL_2}</span><span class="sb-btn-mock">${U2}</span>
    </div>
    <span class="tagline">B1 · B2 · нынешняя U2</span></div>
  <div class="menucol"><span class="menucap">все три рядом · 14px</span>
    <div class="btnrow">
      <span class="tb-btn">${U2}</span><span class="tb-btn">${AR_ALL_1}</span><span class="tb-btn">${AR_SEL_1}</span>
    </div>
    <span class="tagline">одиночная · всё · отмеченные — различимы ли</span></div>
</div>

<hr style="margin:38px 0;border:none;border-top:1px solid rgba(170,90,255,0.25)">
<h1>ПАРТИЯ 7 · заказ 2026-07-25 (вечер)</h1>

<h2>Часть 1 · кружки приоритета → башни</h2>
<p class="note"><b>Замер сначала, рисование потом.</b> Контурная PA рисовалась под
15px. Растровая проба (рендер ровно в N пикселей + печать альфы) даёт у неё
<b>0-1 пикселя полного покрытия на 15px</b> и сплошную кашу на 7-11px — там, где
живут нынешние кружки (6 / 7 / 9 / 11px). Вывод жёсткий: контур в маркеры не
переносится ни при каком раскладе, и это же объясняет вашу ремарку по билду -2
(цвет уехал с 8px заливки на 15px тонкую линию — площадь цвета упала в разы).<br>
Ход: <b>та же башня, но залитая</b>. Цвет возвращается площадью, как у кружка;
уровень читается высотой и навершием, как у контурной PA. Канва нечётная, каждая
грань на целом пикселе, диагональ одна — скат шпиля, ровно 45°.</p>
<div class="menus">
  <div class="menucol"><span class="menucap">сейчас · кружок</span>
    <div class="pgrid">
      <div class="pgbtn"><span class="dot d7 c-low"></span>Низкий</div>
      <div class="pgbtn"><span class="dot d7 c-medium"></span>Средний</div>
      <div class="pgbtn"><span class="dot d7 c-high"></span>Высокий</div>
      <div class="pgbtn">Без приоритета</div>
    </div>
    <span class="tagline">сетка в форме задачи · точка 7px</span></div>
  <div class="menucol rec"><span class="menucap">башня 15px</span>
    <div class="pgrid">
      <div class="pgbtn"><span class="mk s15 p-low">${PS15.low}</span>Низкий</div>
      <div class="pgbtn"><span class="mk s15 p-medium">${PS15.medium}</span>Средний</div>
      <div class="pgbtn"><span class="mk s15 p-high">${PS15.high}</span>Высокий</div>
      <div class="pgbtn"><span class="mk s15 p-none">${PS15.none}</span>Без</div>
    </div>
    <span class="tagline">высота = ранг, цвет = заливка</span></div>
  <div class="menucol"><span class="menucap">башня 13px</span>
    <div class="pgrid">
      <div class="pgbtn"><span class="mk s13 p-low">${PS13.low}</span>Низкий</div>
      <div class="pgbtn"><span class="mk s13 p-medium">${PS13.medium}</span>Средний</div>
      <div class="pgbtn"><span class="mk s13 p-high">${PS13.high}</span>Высокий</div>
      <div class="pgbtn"><span class="mk s13 p-none">${PS13.none}</span>Без</div>
    </div>
    <span class="tagline">строки уже, деталей меньше</span></div>
</div>

<h2 style="margin-top:24px">Те же башни во всех четырёх точках маркера</h2>
<div class="menus">
  <div class="menucol"><span class="menucap">пилюля модалки · было 6px</span>
    <div class="btnrow">
      <span class="pchip"><span class="dot d6 c-low"></span>Низкий</span>
      <span class="pchip on-high"><span class="dot d6 c-high"></span>Высокий</span>
    </div>
    <div class="btnrow" style="margin-top:8px">
      <span class="pchip"><span class="mk s15 p-low">${PS15.low}</span>Низкий</span>
      <span class="pchip on-high"><span class="mk s15 p-high">${PS15.high}</span>Высокий</span>
    </div>
    <span class="tagline">сверху нынешнее, снизу башни</span></div>
  <div class="menucol"><span class="menucap">панель выбора · было 9px</span>
    <div class="btnrow">
      <span class="sb-btn-mock"><span class="dot d9 c-high"></span></span>
      <span class="sb-btn-mock"><span class="dot d9 c-medium"></span></span>
      <span class="sb-btn-mock"><span class="dot d9 c-low"></span></span>
    </div>
    <div class="btnrow" style="margin-top:8px">
      <span class="sb-btn-mock"><span class="mk s15 p-high">${PS15.high}</span></span>
      <span class="sb-btn-mock"><span class="mk s15 p-medium">${PS15.medium}</span></span>
      <span class="sb-btn-mock"><span class="mk s15 p-low">${PS15.low}</span></span>
    </div>
    <span class="tagline">15px = ровно как у соседних кнопок панели</span></div>
  <div class="menucol"><span class="menucap">плавающее меню · было 11px</span>
    <div class="fmbox">
      <div class="fmrow on"><span class="mk s15 p-high">${PS15.high}</span><span>Высокий</span></div>
      <div class="fmrow"><span class="mk s15 p-medium">${PS15.medium}</span><span>Средний</span></div>
      <div class="fmrow"><span class="mk s15 p-low">${PS15.low}</span><span>Низкий</span></div>
      <div class="fmrow"><span class="mk s15 p-none">${PS15.none}</span><span>Без приоритета</span></div>
    </div>
    <span class="tagline">⋯-меню подпункта</span></div>
  <div class="menucol"><span class="menucap">квик-эдд · сейчас контур 15px</span>
    ${qaMenu([
      qaRow(PA.high, '#e03060', 'Высокий', '!high', true),
      qaRow(PA.medium, '#d09020', 'Средний', '!medium'),
      qaRow(PA.low, '#3cc870', 'Низкий', '!low'),
      qaRow(PA.none, 'rgba(144,104,192,0.75)', 'Без приоритета', '!none'),
    ])}
    <span class="tagline">↓ то же меню на залитых башнях</span>
    ${qaMenu([
      qaRow(PS15.high, '#e03060', 'Высокий', '!high', true),
      qaRow(PS15.medium, '#d09020', 'Средний', '!medium'),
      qaRow(PS15.low, '#3cc870', 'Низкий', '!low'),
      qaRow(PS15.none, 'rgba(144,104,192,0.75)', 'Без приоритета', '!none'),
    ])}
    </div>
</div>
<p class="note"><b>Развилка, которую нужно решить вам.</b> Меню квик-эдда
показывает ровно ОДИН канал за раз (приоритет ИЛИ теги ИЛИ дата) — залитая башня
там никогда не встанет рядом с контурным щитом-тегом, так что «разнобой в одной
строке» невозможен по устройству меню. Отсюда два расклада:<br>
<b>(1) Одна порода везде</b> — залитая башня и в маркерах, и в квик-эдде.
Приоритет говорит одним знаком во всём приложении, цвет всегда площадью, и
попутно закрывается ваша ремарка по билду -2. Цена: квик-эдд, принятый два билда
назад, меняется ещё раз.<br>
<b>(2) Два регистра</b> — контур остаётся в квик-эдде (15px), заливка идёт в
маркеры. Обычная практика иконных систем (outline на крупном, solid на мелком),
но силуэт один и тот же, поэтому родство читается.</p>

<h2 style="margin-top:24px">Часть 2 · нав-таб «Задачи»</h2>
<p class="note">Растр нынешнего AA1 вскрыл вторую болезнь помимо «мало деталей»:
нижний скос гроба задан кривой <code>Q</code>, и последний ряд пикселей идёт
сплошным полутоном — ровно та лестница, из-за которой переделывали «Архив».
Значит переделка нужна не только ради красоты.</p>
<div class="menus">
  <div class="menucol"><span class="menucap">сейчас · 13px</span>
    <div class="navmock">
      <div class="navtab n13 on">${CUR_NAV_MAIN}Задачи</div>
      <div class="navtab n13">${CUR_NAV_TOMB}Архив</div>
      <div class="navtab n13">${CUR_NAV_TOME}Гримуар</div>
    </div>
    <div class="sizes" style="margin-top:6px">${sz('g48', CUR_NAV_MAIN)}${sz('g24', CUR_NAV_MAIN)}</div></div>
  <div class="menucol"><span class="menucap">(а) орто · те же 13px</span>
    <div class="navmock">
      <div class="navtab n13 on">${NAV_A}Задачи</div>
      <div class="navtab n13">${CUR_NAV_TOMB}Архив</div>
      <div class="navtab n13">${CUR_NAV_TOME}Гримуар</div>
    </div>
    <div class="sizes" style="margin-top:6px">${sz('g48', NAV_A)}${sz('g48', NAV_A2)}${sz('g24', NAV_A)}${sz('g24', NAV_A2)}</div>
    <span class="tagline">одна ступень · две ступени</span></div>
  <div class="menucol rec"><span class="menucap">(б) 15px · трио переобведено</span>
    <div class="navmock">
      <div class="navtab n15 on">${NAV_B_MAIN}Задачи</div>
      <div class="navtab n15">${NAV_B_TOMB}Архив</div>
      <div class="navtab n15">${NAV_B_TOME}Гримуар</div>
    </div>
    <div class="sizes" style="margin-top:6px">${sz('g48', NAV_B_MAIN)}${sz('g24', NAV_B_MAIN)}</div>
    <span class="tagline">шов крышки · крест pattée с заклёпками · гвозди</span></div>
</div>
<p class="note"><b>(а) 13px, ортогональный.</b> Плечи ступенькой, ни одной пологой
грани, ни одного полутона. Дёшево и ничего в вёрстке не двигается — но потолок
детализации остаётся низким: на 13 пикселях помещается силуэт, крест и четыре
гвоздя, больше туда физически не входит.<br>
<b>(б) 15px, нечётная канва.</b> Центр 7.5 попадает в центр пикселя, поэтому
осевой штрих креста ложится точно (на чётной канве он расщепился бы на два
полутона — из-за этого канва 15, а не 16). Грани только 45°, то есть лестница
читается как намеренная фаска. Появляется бюджет на шов крышки, крест pattée с
концевыми заклёпками и гвозди по бортам.<br>
<b>Чего стоит (б).</b> Арт саркофага и тома живёт в
<code>&lt;symbol id="icon-tomb"&gt;</code> / <code>icon-tome</code> и раздаётся
ЕЩЁ ТРЁМ потребителям, кроме нав-табов: створка-drawer на мобиле, сегменты
Гримуара «Записи/Склеп», заголовок страницы «Архив». Все они рендерят 13px, и
если арт переедет на сетку 15, а они останутся на 13 — там начнётся ровно та
каша, от которой мы уходим. Значит поднимать надо всех четверых разом. Это
делается, но это в три раза больше правок, чем (а).</p>
</body>
</html>
`;
fs.writeFileSync(OUT, html);
console.log('written · AZ3', AZ3.length, '· FL2', FL2.join('').length, '· BL2', Object.values(BL2).join('').length);

/* `--dump <file>` выгружает утверждённые глифы как JSON — вживление берёт SVG
   ОТСЮДА, а не переписыванием руками, поэтому превью и приложение совпадают
   символ в символ (та же дисциплина, что дал tidy() на BL2).                 */
if (process.argv.includes('--dump')) {
  const to = process.argv[process.argv.indexOf('--dump') + 1];
  fs.writeFileSync(to, JSON.stringify({
    T1, T1_LEAN,
    PA_high: PA.high, PA_medium: PA.medium, PA_low: PA.low, PA_none: PA.none,
    N3_TAG,
    X1_STEP_UP_B, X1_STEP_DOWN_B, X1_CAL,
    AR_ALL_2, AR_SEL_1,
  }, null, 1) + '\n');
  console.log('dumped →', to);
}
