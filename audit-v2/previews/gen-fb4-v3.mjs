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
const cx = 12, cy = 13.3, R = 7.9;              // тело — ОДИН штрих по кольцу
const NECK = -62, TAIL = -122;                  // границы разрыва вверху
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
const HEAD =
  `M16.06 5.66` +
  ` C15.6 3.85 13.3 3.35 11.85 3.9` +       // покатый череп
  ` C11.05 4.2 10.7 4.55 10.5 4.95` +       // морда
  ` C11.5 5.65 13.2 6.2 14.5 6.35` +        // верхняя губа назад к углу пасти
  ` C15.0 6.42 15.2 6.7 15.36 6.98`;        // короткое горло к торцу тела
// нижняя челюсть вниз-вперёд → пасть раскрыта широким V
const JAW = `M14.5 6.35 C13.75 7.3 12.6 7.75 11.55 7.7`;
const HEAD_DETAIL =
  `<circle cx="14.55" cy="5.15" r="0.5" fill="currentColor" stroke="none"/>` +
  `<path d="M12.85 6.1 L12.7 6.85" stroke-width="0.5" opacity="0.95"/>` +
  `<path d="M13.15 7.45 L13.05 6.9" stroke-width="0.46" opacity="0.85"/>`;
const TONGUE =
  `<path d="M11.75 7.5 C11.05 8.85 10.9 10.25 11.2 11.4" stroke-width="0.6" opacity="0.9"/>` +
  `<path d="M11.2 11.4 L10.35 12.45 M11.2 11.4 L12.05 12.3" stroke-width="0.55" opacity="0.9"/>`;

// ── (a) сплошное тело: один штрих, максимум читаемости на 12-16px ──
const bodyA = `M${pt(P(NECK, R))} A${R} ${R} 0 1 1 ${pt(P(TAIL + 360, R))}`;
const tailA =
  `<path d="M${pt(P(TAIL + 360, R))} C8.5 6.05 10.9 6.15 12.15 6.65" stroke-width="1.15"/>` +
  `<path d="M12.15 6.65 C12.5 6.75 12.7 6.85 12.9 6.9" stroke-width="0.8"/>`;
const AZ3a =
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round">` +
  `<path d="${bodyA}" stroke-width="1.5"/>` + tailA +
  `<path d="${HEAD}" stroke-width="1.2"/><path d="${JAW}" stroke-width="1.05"/>` +
  HEAD_DETAIL + TONGUE + `</svg>`;

// ── (b) гравюра: тело двумя кромками, между ними — чешуйные насечки ──
const RO2 = R + 1.0, RI2 = R - 1.0;
const bodyB =
  `<path d="M${pt(P(NECK, RO2))} A${RO2} ${RO2} 0 1 1 ${pt(P(TAIL + 360, RO2))}" stroke-width="0.9"/>` +
  `<path d="M${pt(P(NECK, RI2))} A${RI2} ${RI2} 0 1 1 ${pt(P(TAIL + 358, RI2))}" stroke-width="0.8"/>`;
let scalesB = '';
for (let d = NECK + 10; d <= TAIL + 360 - 8; d += 11) {
  const a = P(d - 1.4, RO2 - 0.42), b = P(d + 1.4, RI2 + 0.42);
  scalesB += `<path d="M${pt(a)} L${pt(b)}" stroke-width="0.42" opacity="0.6"/>`;
}
const tailB =
  `<path d="M${pt(P(TAIL + 360, RO2))} C8.4 5.7 10.7 5.75 12.0 6.3" stroke-width="0.85"/>` +
  `<path d="M${pt(P(TAIL + 358, RI2))} C9.95 6.95 11.0 7.05 11.9 7.2" stroke-width="0.75"/>` +
  `<path d="M12.0 6.3 C12.4 6.5 12.7 6.75 12.9 6.9" stroke-width="0.7"/>`;
const AZ3b =
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.0" stroke-linecap="round" stroke-linejoin="round">` +
  bodyB + scalesB + tailB +
  `<path d="${HEAD}" stroke-width="1.05"/><path d="${JAW}" stroke-width="0.95"/>` +
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
   и заслонка над ним. auto = заслонка на половине, пунктиром, сигилы
   приглушены · open = поднята и заперта засовом-штырём, сигилы яркие ·
   closed = опущена до планки, сигилы скрыты за решёткой, снизу кольцо. */
const toolPlate = (o = 1) =>
  `<path d="M3.6 14.4C3.6 13.5 4.3 12.8 5.2 12.8H18.8C19.7 12.8 20.4 13.5 20.4 14.4V18.2C20.4 19.1 19.7 19.8 18.8 19.8H5.2C4.3 19.8 3.6 19.1 3.6 18.2Z" stroke-width="1.35" opacity="${o}"/>` +
  `<circle cx="5.3" cy="14.5" r="0.32" fill="currentColor" stroke="none" opacity="${0.55 * o}"/>` +
  `<circle cx="18.7" cy="14.5" r="0.32" fill="currentColor" stroke="none" opacity="${0.55 * o}"/>` +
  `<circle cx="5.3" cy="18.1" r="0.32" fill="currentColor" stroke="none" opacity="${0.55 * o}"/>` +
  `<circle cx="18.7" cy="18.1" r="0.32" fill="currentColor" stroke="none" opacity="${0.55 * o}"/>`;
const toolSigils = (o = 1) =>
  // ромб (залитый) · крест · полумесяц — язык глифов DUSK, крупно и просто
  `<path d="M7.4 14.5 L9.0 16.4 L7.4 18.3 L5.8 16.4 Z" fill="currentColor" stroke="none" opacity="${o}"/>` +
  `<path d="M12 14.4V18.4M10.1 16.4H13.9" stroke-width="1.25" opacity="${o}"/>` +
  `<path d="M17.3 14.5A2.1 2.1 0 1 0 17.3 18.3A2.6 2.6 0 0 1 17.3 14.5Z" stroke-width="1.15" opacity="${o}"/>`;
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
const BL2 = {
  auto: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">${shutter(9.4, true)}${toolPlate(0.55)}${toolSigils(0.5)}</svg>`,
  open: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">${shutter(5.5, false, false)}${toolPlate(1)}${toolSigils(1)}` +
    // засов-штырь: заслонка заперта наверху
    `<path d="M20.9 4.6V7.8" stroke-width="1.15"/><circle cx="20.9" cy="4.05" r="0.72" stroke-width="1"/></svg>`,
  closed: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">${toolPlate(0.22)}${shutter(17.6, false)}` +
    // кольцо-ручка снизу
    `<circle cx="12" cy="19.9" r="1.15" stroke-width="1.05"/><path d="M12 18.75V17.6" stroke-width="0.9" opacity="0.8"/></svg>`,
};
/* текущая barLvl-лента (для сравнения) */
const CUR_BAR = {
  auto: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 8.5h14a1.5 1.5 0 0 1 1.5 1.5v4a1.5 1.5 0 0 1-1.5 1.5H5a1.5 1.5 0 0 1-1.5-1.5v-4A1.5 1.5 0 0 1 5 8.5Z" stroke-dasharray="2.4 2.2"/><path d="M8 10.6v2.8M12 10.6v2.8M16 10.6v2.8" stroke-opacity="0.55"/></svg>`,
  open: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 8.5h14a1.5 1.5 0 0 1 1.5 1.5v4a1.5 1.5 0 0 1-1.5 1.5H5a1.5 1.5 0 0 1-1.5-1.5v-4A1.5 1.5 0 0 1 5 8.5Z"/><path d="M8 10.6v2.8M12 10.6v2.8M16 10.6v2.8"/></svg>`,
  closed: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6.5 9.3h11M6.5 14.7h11"/><path d="M6.5 9.3a2.7 2.7 0 1 0 0 5.4M17.5 9.3a2.7 2.7 0 1 1 0 5.4"/><path d="M9 12h6" stroke-opacity="0.5"/></svg>`,
};

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
</style>
</head>
<body>
<h1>fb4 v3 · переделка по референсу (2026-07-19)</h1>
<p class="note">Рамкой отмечена рекомендация. AZ2 и старьё оставлены для сравнения.</p>

<h2>AZ3 · Уроборос по референсу</h2>
<p class="note">Адаптация гравюры под 2D-иконку: правильное замкнутое кольцо тела,
голова вырастает из тела на макушке и разомкнутой пастью смыкается на кончике
хвоста, из пасти глубоко внутрь круга свисает раздвоенный язык (главная примета
референса). Рогов НЕТ — натуралистичная змея; именно рога и пухлая «восьмёрка»
делали AZ2 мультяшным. Две трактовки тела: <b>a</b> — сплошной штрих (кольцо
держится даже в мета-теге 12px), <b>b</b> — гравюрные двойные кромки с чешуёй
между ними (богаче на 24-48px, мягче на 12px).</p>
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
<p class="note">Интуитивность BL1 хромала: голая решётка не говорит «тулбар».
В BL2 ВИДЕН сам ряд инструментов (кованая планка с тремя сигилами — ромб, крест,
полумесяц) и заслонка над ним: auto = на половине пунктиром, сигилы приглушены ·
open = поднята и заперта засовом-штырём, сигилы яркие · closed = опущена до
планки, сигилы скрыты, снизу кольцо-ручка.</p>
<div class="row">
${cell('BL2 auto', 'по наведению', mid(BL2.auto), 'rec')}
${cell('BL2 open', 'закреплён (засов)', mid(BL2.open), 'rec')}
${cell('BL2 closed', 'скрыт (кольцо-ручка)', mid(BL2.closed), 'rec')}
</div>
<div class="row" style="margin-top:14px">
${cell('BL1 auto', 'принят ранее', sz('g24', BL1.auto) + sz('g16', BL1.auto), 'old')}
${cell('BL1 open', 'принят ранее', sz('g24', BL1.open) + sz('g16', BL1.open), 'old')}
${cell('BL1 closed', 'принят ранее', sz('g24', BL1.closed) + sz('g16', BL1.closed), 'old')}
${cell('сейчас в проекте', 'лента-свиток', sz('g24', CUR_BAR.auto) + sz('g24', CUR_BAR.open) + sz('g24', CUR_BAR.closed), 'old')}
</div>
</body>
</html>
`;
fs.writeFileSync(OUT, html);
console.log('written · AZ3', AZ3.length, '· FL2', FL2.join('').length, '· BL2', Object.values(BL2).join('').length);
