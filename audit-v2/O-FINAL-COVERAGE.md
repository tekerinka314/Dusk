# O-FINAL — coverage-сверка (Opus, 2026-07-19, шаг 0 ADDENDUM v3)

Полный проход по всему icon-estate: каждый builder-конструктор + голые `<svg>`
во ВСЕХ dusk/*.ts и index.html + shared `<symbol>`/`<use>`, сверка с census
B3-icons.md (47 IC / 18 GIC / 22 FIC / 75 статик) и с derive-картой O-FINAL.

## Инвентарь (факт против census)

| Источник | Census | Факт | Δ |
|---|---|---|---|
| IC (01-core.ts:236) | 47 | **47** | 0 — рост отсутствует |
| GIC (02-grimoire.ts:179) | 18 | **20** | +2 (auto/open/closed стейт-энтри → fold/focus роли BK/BN) |
| FIC (02-grimoire.ts:3159) | 22 | **22** | 0 → все в AI1/BU (FIC-ряд, Tier-C) |
| index.html статики | 75 уник / 99 | **99 инстансов** | дубли: hex-кристалл ×5, меч-навершие ×5, череп ×4, полумесяц ×4, треуг. ×4×4 |
| shared `<symbol>` | 2 | **2** (icon-archive ×3 use, coffin-emblem ×2 use) | 0 |

Builder-функции вне IC/GIC/FIC (01-core): `coffinSVG` (161), `cycleCoffinSVG`
(208), `subCoffinSVG` → **роль BD (гроб-чекбокс), покрыто.**

## Tasks-side голые `<svg>` (03/04/07/08) — ВСЕ покрыты

- 03: `_SPLIT_ACTIVE_ICON`/`_SPLIT_DONE_ICON` (269/270)=**BG**; `_PIN_HDR_CHEVRON`
  (709) + `archive-month-chevron` (2170)=**AU** (меч-шеврон, Tier-A); галка
  цвет-фильтра (1440, generic polyline)=**BP0 keep**.
- 04: `sub-split-chevron` (343/402)=**AU**; `taskColorGlyph` (2266)=**H**.
- 07: 397/428 = **BG + AU** (инлайн-дубли split-иконок 03 → кандидат консолидации).
- 08: `_EXPORT_TASKS_IC`/`_EXPORT_MD_IC`/`_TOOLS_IMPORT/EXPORT/BACKUP_IC`
  (260-282)=**Q/R/S/T/U**; qa-typeahead меню (1055-1107)=**N**.

## Grimoire голые `<svg>` — почти все покрыты

- `GRIM_SORT_SWORD` (833) + `grim-crypt-month-chevron` (1089)=**AU**.
- io `import/backup/reading/full` (3325-3336)=**BJ** (крылатый свиток).
- цвет-метка ноты (1173, hex-кристалл) + `grim-cfilter-empty` (1592)=**H/BH**-семья.

## ГЭПЫ — глифы живут в app, вердикта НЕТ ни в fb1/fb2/fb3

Census их не считал (отдельные объекты, не IC/GIC/FIC). Per clause 4 — НЕ
рисовать самому; список для решения юзера (микро-Fable-проход или оставить).

1. **`GRIM_CO` callout-типы ×3** — `dusk/02-grimoire.ts:2715-2721`:
   `info`=«Скрижаль» (концентр.круги+компас-звезда), `warn`=«Угроза»,
   `secret`=«Шёпот». Живые: рендерятся в пикере типа врезки (2745,
   `.grim-co-pop-ic`). AI1/BU покрывают только тулбар-марк FIC.callout, НЕ эти
   3 глифа-типа.
2. **`GRIM_TPL_IC` note-шаблоны ×4 (+save/del)** — `dusk/02-grimoire.ts:3881-3885`:
   `diary`=«Дневник», `ritual` (пентаграмма), `codex` (иллюм.том), `tablet`
   (сетка). Живые: пикер шаблонов (3896) + кнопка «шаблон» (1174,
   `GRIM_TPL_IC.save`). Y1 покрывает IC.template (шаблон ЗАДАЧИ), не эти.
3. **(borderline)** grim цвет-свотч ноты (1173, hex) — вероятно H-мотив по
   derive «цвет-фильтр-кристалл ← H», но строго отдельный глиф. Минор.

Замечание: B3-census — «Grimuar (GIC/FIC) ближе всех к планке», и эти 7 глифов
уже довольно орнаментальны → «оставить как есть» — обоснованный выбор.

## ДОП-ПРОХОД v2 — CSS-рисованные и native иконки (пропущены в первом проходе)

Юзер поймал: первый проход искал только `<svg>` в JS/HTML и пропустил целый
класс — иконки из CSS (`background-image` SVG data-URI, `mask`, `::before
content`) и native `<select>`-стрелки. Прочёс style.css (12 svg data-URI + mask):

**AU-implant-цели (дропдауны — remit AU «все дропдауны и раскрытия», сейчас
НЕ готические, требуют правки при вживлении AU1):**
- `.group-select` фон (style.css:789) — **ГОЛЫЙ generic chevron**
  `polyline 6 9 12 15 18 9` — прямое нарушение CLAUDE.md. → AU-меч.
- 3 модальных native `<select>` — `#dl-weekday` (index.html:982), `#dl-month`
  (1051), `#repeat-anchor-day` (1407): класс `.modal-input` БЕЗ `appearance:none`
  → **нативная OS-стрелка**. → `appearance:none` + AU-меч-фон.
- `☰` в `.sync-panel .sync-panel-log summary::before` (style.css:8516) —
  generic юникод-гамбургер на `<details>`-раскрытии. → готический глиф/меч.

**CSS-дубли builder-глифов (правятся ВМЕСТЕ с редизайном builder'а):**
- меч-шеврон (style.css:6147) = AU-дубль · select-сосуд (6130) = K-дубль ·
  уроборос-бейдж (3136) = AZ-дубль · fleur-разделители (371, 8134) = BM.

**Callout-глифы живут в ДВУХ местах** (оба — «оставить как есть» по решению
юзера): JS `GRIM_CO.ic` (пикер, 2715) + CSS `--co-ico` маска блока
(style.css:8173/8177/8181).

Прочее проверено чисто: `content:`-глифы (кроме ☰ и typographic `\201C`/`\0060`)
= flex `justify-content`, ложные; литеральных `×`-close-кнопок нет; прочих
icon-ish CSS-vars нет.

## Вывод

Вся строка вердикта A-BU маппится без сирот. Доп-проход показал: **иконочный
estate шире census'а на CSS-слой** — 4 native/CSS дропдаун-стрелки (generic)
+ ☰ подпадают под уже-ратифицированную AU1 («все дропдауны»), НЕ новый дизайн;
+ 3 CSS-дубля синкать при редизайне. 7 grimoire-глифов (callout×3 в JS+CSS,
шаблоны×4) — **оставить как есть** (решение юзера 2026-07-19).
