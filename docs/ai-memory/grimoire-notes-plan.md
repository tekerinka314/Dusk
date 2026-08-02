---
name: grimoire-notes-plan
description: "DUSK п11 «Гримуар» (вкладка заметок) — что сделано (этапы 0/1/1b + этап-2 таблицы), модель данных, архитектура контролов таблиц, и ближайший план (теги → DnD → сворачивание заметки)"
metadata: 
  node_type: memory
  type: project
  originSessionId: cc25111e-5f8c-4f85-9e5c-87b53b1d4fed
---

DUSK feature **п11 «Гримуар»** = third app page = standalone notes, independent of tasks.
Branch `fix/ui-repeat-meta-subtasks`, origin github.com/tekerinka314/Dusk. User reviews
every visual change himself; commit/push only when asked; communicate **Russian**;
**caveman mode** active. Verify visuals via Playwright (see harness below). On every
deploy bump `sw.js` CACHE const (SWR serves stale CSS/JS otherwise → "всё сломано").
Related: [[dusk-polish-2026-06]], [[dusk-headless-screenshot]], [[bg-gothic-include-in-commits]].

## DONE (committed on branch as of 2026-06-13)
- **Этап 0 — каркас** (commit 9914930): nav-tab «Гримуар» (tome icon); `switchPage`
  generalized to 3 pages (`PAGE_EL`/`PAGE_TAB`/`_renderPage`/`_updatePageTabs`/`_initPage`);
  fixed latent bug — `#notes-page` was missing from page-in/out CSS animations.
- **Compоновка «Кодекс»** (master-detail): left list (`#grim-list`) + right page
  (`#grim-detail`). renderNotes/renderGrimList/renderGrimDetail.
- **Отдельный архив «Склеп»**: `state.notesArchive` (NOT tasks archive). Segment toggle
  Записи/Склеп (`grimMode` 'active'|'archive', `grimSetMode`). Actions: grimArchive (soft,
  →склеп), grimDelete (perm), grimRestoreNote, grimDeleteForever — all undoable. Import
  merge + undo/redo + restoreBackup handle notesArchive; `normalizeState` ensures arrays.
- **Этап 1 — форматирование + md-экспорт** (commit b2ac18d; баги форматирования закрыты в 849e840):
  WYSIWYG via `document.execCommand`; floating toolbar (`_grimToolbarHTML`, reveals on
  `.grim-page:hover/:focus-within` via grid-rows). Formats: H1/H2/H3 (grimHeading +
  `_grimToggleBlock`), bold/italic (Ctrl+B/I), ul/ol, checklist (grimChecklist, `ul.task`
  + `li.done`, toggle via grimBodyClick on checkbox zone), blockquote, inline code
  (grimInlineCode), hr, link (grimLink, Ctrl+K). Toolbar active-state via
  `_grimSyncToolbar` on `selectionchange`. Markdown export: `grimExportNote` (toolbar,
  `.md`), `grimExportAll` (top bar `#grim-export-all`), `_grimHtmlToMd`/`_grimInlineMd`/
  `_grimNoteToMd`/`_grimDownload`.

## DATA MODEL (notes)
- `state.notes` / `state.notesArchive`: `{ id:uuid(crypto.randomUUID), title, body, fmt:true,
  createdAt, updatedAt, archivedAt? }`. `body` holds **sanitized HTML** (was plain text in
  этап 0). `fmt:true` marks migrated/HTML body.
- **Migration** `migrateNotes()` (called in `normalizeState`, persisted via saveState in
  loadState): old notes (fmt!==true) → `_grimPlainToHtml` (escape + paragraphs), set fmt.
- **Sanitizer** `_grimSanitize` (whitelist `GRIM_TAGS`: h1-3,p,br,strong,b,em,i,u,ul,ol,li,
  blockquote,code,hr,a,div,span; a[href] validated + target/rel; ul/li keep only
  task/done classes; strips script/style/on*). Body sanitized on every input + on render.
- `_grimPlain(html)` = textContent (used for list snippet + search filter).
- UI state vars (app.js ~558): currentNoteId, notesSearchQuery, grimMode, _grimSaveT.
- Icons: `GIC` object (tomeOpen, coffin, quill, restore=urn, hourglass, back=sword
  dl-month-chevron rotated, dividerFleur); `FIC` object (toolbar glyphs).

## этап 1 БАГИ — ВСЕ ПОЧИНЕНЫ (commit 849e840, pushed; 4 раунда правок)
Весь бэклог багов этапа 1 закрыт + доп. полировка от пользователя. Не переделывать.
Ключевые решения/детали (важно знать перед правками списков/кода):
- **Движок списков переписан, Notion-style** (`_grimSetListType`/`_grimConvertLine`/
  `_grimMergeAdjacentLists`/`_grimSelectedLines` + маркер курсора `_grimPlaceMarker`/
  `_grimRestoreMarker`). Тип меняется ТОЛЬКО для текущей/выделенных строк; список режется
  и соседние однотипные авто-сливаются. Три типа: `ul`(маркер) / `ol`(номер) / `ul.task`
  (чек-лист, плоская модель, без вложенности). grimFmt('ul'/'ol')→_grimSetListType,
  grimChecklist→task.
- **Память блока:** `li.dataset.pre` хранит исходный тег (h3/p) → toggle списка off
  возвращает H3, не дефолт. Живёт в DOM на сессию правки, санитайзером вычищается (не
  персистится) — это by design.
- **Backspace** в начале пункта: 1-е нажатие outdent→абзац (`_grimBackspaceOutdent`), 2-е
  default-merge. **Enter** выходит из blockquote/inline-code (`_grimExitOnEnter`).
- **Маркеры:** единый жёлоб (li padding-left:26px, все), центры точки/цифры/чекбокса ≈8.5px,
  цифра на базовой линии (font-main, font-size/line-height inherit). Чекбокс left:1px.
- **Inline-код:** `display:inline-block; max-width:100%` → монолитный прямоугольник с
  ЗАКРЫТОЙ рамкой при переносе (НЕ box-decoration-break — он рвёт/дробит). Фон
  `rgba(34,12,78,0.82)`. Пустой код держит каретку через ZWSP (String.fromCharCode(0x200B));
  ZWSP НЕ стрипается в санитайзере (иначе пустой код некликабелен), убирается только в
  `_grimPlain` (сниппет/поиск) и `_grimInlineMd` (экспорт).
- **Ссылка:** готик-модалка `#grim-link-modal` (url + опц. имя), prompt убран. Открытие
  обычным ЛКМ (`grimBodyClick`), Ctrl-клик = каретка для правки. Hover-подсветка.
- **Цвета:** в body НЕЛЬЗЯ `--text-primary` (#f0e8ff, почти-белый). H3/bold = `--accent-hover`.
- **Режим фокуса:** `grimFocus` + класс `.grim-focus` на `#grim-layout` → список схлопывается
  в узкий рейл (138px, только заголовки). Кнопка `grimToggleFocus` (угол `.grim-page`,
  desktop-only). Авто-сужение списка при открытой заметке: 244→198px.
- **Иконки:** `GIC.tomeOpen` (том+сигил) и `GIC.coffin` (гроб+крест) — детальные готические,
  ДУБЛИРУЮТСЯ инлайн в index.html (nav-таб строка ~66, сегменты «Записи»/«Склеп» ~676/680);
  при правке иконки менять И в GIC, И в index.html.
- **Возврат из склепа** авто-переключает на «Записи».
- На каждый деплой бампать `sw.js` CACHE (сейчас `dusk-v10-grimoire-code-bg`).

## Этап 1b — ГОТОВ (commit c7886e7, pushed 2026-06-14)
Мультивыбор заметок (зеркало `mainSelectMode`): `grimSelectMode`+`grimSelectedIds`,
кнопка «Выбрать» (#grim-select-btn), бар #grim-select-bar (archive/restore меняются по
сегменту, delete two-step), чекбоксы в листах (реюз IC.selectEmpty/Checked).
`grimToggleSelectMode/grimToggleSelectNote/_updateGrimSelectBar/_grimExitSelect/
grimBulkArchive/grimBulkRestore/grimBulkDelete`. Доп. правки этой сессии:
- **Two-step delete + toast** теперь и у ОДИНОЧНЫХ (grimDelete/grimDeleteForever) через общий
  `_armDanger(btn,hint)`; добавлен отсутствовавший `@keyframes dangerPulse` (пульса не было).
- **Заглавия записей** = токен `--grim-heading:#d18bff`, крупнее/выразительнее bold,
  `text-transform:uppercase` (Cinzel капсит лишь латиницу → transform для всех раскладок).
  В СПИСКЕ (.grim-leaf-t) регистр ОРИГИНАЛЬНЫЙ (без uppercase, font-main).
- **Заглавие переносится:** `<input>`→`<textarea>` + `_grimGrowTitle` (авто-высота),
  `grimTitleKey` (Enter→фокус в тело).
- **Фокус-режим персистит:** `grimFocus` в localStorage (load+save), `grimOpen` применяет класс.
- **SW-кэш стабилен** `dusk-shell` — бамп версии больше НЕ нужен на каждую правку (SWR сам
  освежает шелл + тост). sw.js трогать только при смене стратегии кэша.

## Этап 2 — ТАБЛИЦЫ: вставка + правка структуры ГОТОВО (commit df99dcf, pushed 2026-06-14)
Первый под-пункт этапа 2 закрыт целиком. Не переделывать.
- **Вставка:** кнопка таблицы в тулбаре → `grimTableMenu` (popover N×M size-grid `#grim-table-pop`)
  → `grimInsertTable(cols,rows)` (1-я строка = `<thead><th>`, остальные `<tbody><td>`).
- **CSS таблиц:** светлая сетка + вертикальные линии, заголовок капсом подчёркнут акцентом.
  Содержимое ячеек = `--text-secondary` (фиолетовая проза); `thead th` первичнее по
  ОФОРМЛЕНИЮ (label-шрифт Cormorant SC, капс, трекинг .8, вес 700, свечение) — не яркостью.
- **Правка структуры — НОВАЯ модель (заменила прежний caret-overlay):** у каждой таблицы
  wax-seal **сигил** (роза-окно, `FIC.tblSigil`) в правом-верхнем углу. Сигил виден ТОЛЬКО
  при наведении на таблицу/сигил (`.gtc-show`, делегирование mouseover/mouseout на body +
  mouseenter/leave сигила; `_grimApplySealVis`), либо когда таблица в режиме правки.
  Клик по сигилу → режим правки ЭТОЙ таблицы (`_grimEditTbl`): рамка `.gtc-frame`, гутеры-флёр
  (`FIC.tblGrip`) над колонками и слева у строк-ДАННЫХ (у `<thead>` гутера НЕТ — заголовок
  обязателен для markdown, не удаляется), edge-кресты «добавить» в конец. Клик по гутеру →
  плавающее меню `.gtc-pop` (добавить до `FIC.tblAdd` / удалить серпом `FIC.tblDel` / добавить
  после). Закрытие меню: выбор опции / клик по пустому / клик по гутеру / Esc (staged-dismiss
  `_grimDismissTableUI`: пикер→меню→режим). Каретка контролы НЕ триггерит.
- **Архитектура overlay:** `.grim-tctl` живёт в `.grim-page` (`contenteditable=false`,
  position:absolute inset:0), координаты считаются в content-box страницы (`ox/oy`) → приклеен
  к скроллу, вне потока, НЕ попадает в `note.body`. Сборка `_grimLayoutTableUI()` (rAF-коалесс
  `_grimScheduleTableUI`). Index-ops: `_grimColInsert/_grimColDelete/_grimRowInsert/
  _grimRowDelete/_grimRemoveTable`, edge — `grimTableAppend(kind,table)`. Tab/Shift+Tab ходит
  по ячейкам (`_grimTableTab`), Tab за последней — добавляет строку. MD-экспорт: `_grimTableToMd`
  (pipe-таблица) в `_grimHtmlToMd`.
- **Глифы (FIC, утверждены):** `tblAdd` крест-потент+ромб, `tblDel` серп (контур-лезвие +
  ЗАЛИТАЯ рукоять), `tblGrip` флёр-де-лис, `tblSigil` роза-окно.
- **Тонкие фиксы (знать перед правкой):**
  - Координаты сигила: `transform: translate(-50%,-50%)` + `Math.round` всех offset → иконка
    по центру кнопки (дробный % давал суб-пиксельный сдвиг).
  - Сигил не пропадает: `ResizeObserver` на body + `document.fonts.ready` + `window.focus`/
    `pageshow`/`visibilitychange` → перестройка (шрифты меняют метрики; возврат окна).
  - `grimCommit` (body onblur, напр. уход в другое окно) НЕ сносит overlay — гасит только
    меню/пикер; раньше `_grimHideTableUI` нулил сигил навсегда.
  - **ГЛАВНЫЙ подводный камень CSS:** в приложении **НЕТ `var(--ease)`** — есть только
    `--ease-gothic/--ease-spring/--ease-emerge/--ease-sink` и `--transition` (0.15s),
    `--dur-*`. Невалидный `var(--ease)` рушит ВЕСЬ `transition`/`animation` shorthand →
    `all 0s` (анимации мгновенные, выглядит как «нет плавности»). gtc-стили используют
    `var(--ease-emerge)`.
  - Тесты этого блока в `D:\tmp\pw`: app_tbl.js (логика), app_fix.js (центр/рендер/рамка),
    app_hover.js (hover+refocus suite 11/11), app_fade.js (замер opacity-перехода). Скриншот-
    харнесс инжектит заметку с таблицей в `state.notes` + `switchPage('notes');grimOpen(id)`.

## UX-доработки заметок (2026-06-15) — КОД ГОТОВ, ждёт визуального ревью пользователя (НЕ закоммичено)
Три пункта от пользователя, реализованы + проверены Playwright (14/14, 0 pageerror, харнесс
`D:\tmp\pw\dusk_fix3.js`). Ветка та же, коммита НЕТ (ждём «коммить»).
1. **Ручное управление тулбаром** — `grimBarMode` 'auto'|'open'|'closed' (персист localStorage).
   3-цикл кнопкой `.grim-bar-toggle` (угловой кластер, СЛЕВА от фокус-кнопки, right:48px; видна и
   на мобиле — у тача нет hover). auto=ревил по hover (как было, дефолт), open=закреплён видимым,
   closed=скрыт даже при hover. CSS гейтит hover-ревил на `:not(.bar-open):not(.bar-closed)`.
   Глифы `GIC.barLvl` (auto=пунктирная лента+полый штифт, open=сплошная лента+штифт, closed=свёрнутый
   свиток). Лейблы `GRIM_BAR_TITLE`. Функции `grimToggleBar`/`_grimApplyBarMode`.
2. **Заметка во весь контейнер** — `grimFocus` стал УРОВНЕМ 0/1/2 (был bool). Цикл ОДНОЙ кнопкой
   фокуса: 0=список+заметка → 1=узкий рейл 138px (старый grim-focus) → 2=`.grim-full` список свёрнут
   в 0 (note во всю ширину). ВАЖНО: список НЕ `display:none` (иначе detail авто-падает в пустой 0-трек
   и схлопывается) — collapse через width 0 + opacity 0 + остаётся grid-item. Глифы `GIC.focusLvl`
   (3 ланцетных арки-панели, список сужается). `_grimApplyFocus(layoutEl)` ставит классы.
3. **Кнопка «правка структуры таблицы» (сигил `.gtc-seal`):**
   - 3a сдвиг иконки влево: svg 19px в кнопке 30px → поля 5.5px (дробные) → при дробном Windows-
     масштабе (1.25/1.5) бьётся влево, hover-`scale` пере-привязывал → выглядело как сдвиг. Фикс:
     svg **18px** (поля 6px, целые пиксели). Headless DPR2 и так был центр (dx=0).
   - 3b прыжок: тулбар (раскрытие/скрытие) сдвигал таблицу, а сигил не переезжал (ResizeObserver на
     body не ловит сдвиг позиции). Фикс: overlay-элементы получили `_gtcReflow(ox,oy)` (репозиция БЕЗ
     rebuild → нет flicker/перезапуска fade); `_grimReflowOverlay()` + `_grimWireBarFollow()` слушает
     `transitionrun/end` на `.fmt-bar` и догоняет анимацию ~32 кадра. Сигил приклеен к углу таблицы.
   - Заголовок: padding-right 84px (чистит кластер из 2 угловых кнопок).

## UX-доработки заметок — РАУНД 2 (2026-06-15) — ЗАКОММИЧЕНО + ПУШ (commit afa7c36)
Ещё 5 пунктов, реализованы + Playwright (`D:\tmp\pw\dusk_fix4.js` 9/10 + `_gap.js`; «fail» был
артефактом теста — тело держало focus → `:focus-within` законно держал тулбар открытым).
1. **Заголовок не режется кнопками** — угловые кнопки (`.grim-bar-toggle` + `.grim-focus-toggle`/back)
   теперь СТОПКОЙ по вертикали (общий правый край right:12px; bar-toggle ушёл с right:48 на top:48).
   Title padding-right 84→**42px** (чистит одну колонку кнопок). + `_grimTitleRO` (ResizeObserver на
   `#grim-title-in`) пере-растит textarea при смене ширины (рейл списка вкл/выкл, resize) — иначе
   заголовок в 2+ строки обрезался в режимах где список показан (ширина у́же → больше строк).
2. **Тулбар: центр + симметрия при переносе** — структура `.fmt-bar > .fmt-inner(чистый collapse-
   wrapper, без box) > .fmt-cluster(хром+flex-wrap+justify-center)`. Кнопки сгруппированы в `.fmt-grp`
   (H/начертание/списки/блоки/таблица/экспорт) → переносятся кластерами, ряды центрируются и
   балансируются. Убраны `.fmt-sep` и `.fmt-spring` (разделение — через gap групп 9px).
3. **Подчёркивание + зачёркивание** — `FIC.underline`/`FIC.strike`; кнопки в группе начертания;
   `grimFmt('underline'/'strike')`→`_grimEmphasis('underline'/'strikeThrough')`; `styleWithCSS false`
   (теги `<u>`/`<strike>`, НЕ inline-style → переживают санитайзер). GRIM_TAGS += S/STRIKE/DEL.
   `_grimSyncToolbar` подсветка; `_grimInlineMd`: U→`<u>…</u>`, S/STRIKE/DEL→`~~…~~`; Ctrl+U.
4. **Divider больше не даёт пустоту снизу** — раньше скрытый тулбар оставлял ~12px резидуал
   (padding/border у `.fmt-inner` не схлопывались при `grid-rows:0fr`). Теперь хром на `.fmt-cluster`
   ВНУТРИ overflow-hidden `.fmt-inner` → скрытый тулбар реально barH=0, тело впритык к divider (8px).

## Этап 2 — РУЧНОЙ ПОРЯДОК (DnD) — ГОТОВО (commit f70ce0c, pushed 2026-06-15)
Перетаскивание записей в активном Гримуаре через SortableJS (reuse готических drag-классов
`sortable-ghost/chosen/drag`, `body.is-dragging`). `_grimInitListSortable` вызывается в конце
`renderGrimList` (re-wire после каждого ре-рендера); `_grimListSortable` инстанс. Включён ТОЛЬКО
в активном сегменте вне поиска/мультивыбора и при ≥2 листах — иначе destroy. delay:120ms →
быстрый тап открывает заметку, удержание = drag. `.grim-list-head` остаётся якорем (draggable
ограничен `.grim-leaf`). **Гибрид-порядок** (выбор пользователя): поле `note.ord` в числовом
пространстве `updatedAt`. onEnd → `_grimPersistOrder`: всем видимым `ord = Date.now()-i*1000`
(верх=больше), pushUndo+saveState, БЕЗ ре-рендера (DOM уже в новом порядке). Sort-ключ active =
`n.ord ?? n.updatedAt`. Правка заметки (`grimTitleInput`/`grimBodyInput`) делает `delete note.ord`
→ всплывает наверх по свежему updatedAt. Старые заметки без ord — по updatedAt (миграция не нужна,
поле плоское, само в localStorage/экспорт). Тест `D:\tmp\pw\_dnd.js` 9/9 (drag→top, persist,
survives re-render, edit→bubble, search/select disable).

## Аудит Ctrl+Z в гримуаре (2026-06-15) — ЧАСТЬ 1 ГОТОВА (commit 3e0d960), ЧАСТЬ 2 ОТКАТАНА (нужно решение)
Аудит выявил и подтвердил Playwright две проблемы (`D:\tmp\pw\_undo.js`, `_probe.js`, `_diag.js`):
- **(A) ПОТЕРЯ ДАННЫХ — ИСПРАВЛЕНО (Часть 1, commit 3e0d960, pushed).** Глобальный keydown
  (app.js ~10308) перехватывал Ctrl+Z/Y/Shift+Z БЕЗУСЛОВНО, в т.ч. когда каретка в `#grim-body`/
  `#grim-title-in`. app-`undo()` откатывает снимок ВСЕГО state (`undoStack`=JSON.stringify(state)) →
  при наборе текста Ctrl+Z удалял только что созданную заметку с черновиком. Тест подтвердил
  (notes 2→1). ФИКС: в начале обработчика — если активный элемент `grim-body`/`grim-title-in` и
  Ctrl+Z/Y → `return` без preventDefault → нативный undo браузера ведёт набор + execCommand-форматы
  (bold/italic/underline/strike/H1-3/цитата уже execCommand → УЖЕ нативно-откатываемы). Скоуп узкий —
  undo ФОРМЫ ЗАДАЧ (с `_undoFormSnapshot`) НЕ тронут. _undo.js сценарий A = PASS.
- **(B) ПРОБЕЛ — прямые-DOM ops не откатываются ничем.** `grimInsertTable`/index-ops/`grimTableAppend`/
  `_grimRemoveTable`/списки(`_grimSetListType`→`_grimConvertLine`, Notion-движок)/hr/инлайн-код пустой/
  чек-лист тоггл/правка-снятие ссылки меняют DOM НАПРЯМУЮ (не execCommand) → нативный undo не видит,
  pushUndo нет. **Часть 2 (попытка): обёртка `_grimUndoableDom(fn)`** — выполнить op вживую, затем
  revert+replay тела через `execCommand('insertHTML')` = один нативный undo-шаг. ОТКАТАНА: проба
  доказала, что insertHTML НАДЁЖЕН только для ВСТАВКИ в схлопнутую каретку (таблица/hr — OK), но при
  ЗАМЕНЕ мульти-блочного выделения (трансформация `<p>`→`<ul>` движком списков) `execCommand` возвращает
  **false** и НЕ применяется (`_diag.js`: RAW движок конвертит, через обёртку — тело откатывается в
  исходное). selectAll/delete+insertHTML тоже false. Значит insertHTML-unification негодна для
  transform-ops. Часть 2 отброшена, app.js возвращён на 3e0d960.
- **(B) ЧАСТЬ 2 — INSERTS-ONLY СДЕЛАНО (commit 6fa9006, pushed, протестировано 14/14).** Пользователь
  выбрал «частично: только вставки». Надёжные ВСТАВОЧНЫЕ ops переведены на `execCommand('insertHTML')`
  в каретку → нативный undo-стек браузера, Ctrl+Z откатывает целиком, Ctrl+Y повторяет:
  `grimInsertTable` (таблица через insertHTML; метка `data-gtnew` → каретка в 1-ю ячейку; пустой `<p>`
  заменяется чисто, мульти-инсерта пустых абзацев нет; mid-абзац режется, мелкий `&nbsp;` перед хвостом —
  незначительно), `_grimInsertHr` (hr), `grimInlineCode` пустая ветка (code-span). Ссылка-вставка +
  инлайн-код-с-выделением уже были на insertHTML. Тест `D:\tmp\pw\_undo3.js` 14/14, `_tedge.js` (крайние
  случаи вставки таблицы).
- **ВАЖНЫЙ УРОК (headless-артефакт):** прежний вывод «insertHTML негоден для transform-ops» был ЛОЖНЫМ —
  это артефакт активации документа: БЕЗ user-gesture (реальный Playwright `.click()`/keyboard) `execCommand`
  возвращает **false** и ничего не делает. С реальным жестом insertHTML работает. В реальном браузере у
  юзера всегда есть фокус. ВЫВОД ДЛЯ ТЕСТОВ: перед проверкой любого `execCommand`-пути ОБЯЗАТЕЛЬНО делать
  `await pg.locator('#grim-body').click()` (не только `.focus()` в evaluate — этого мало для активации).
- **ЧТО НЕ СДЕЛАНО по Ctrl+Z (осознанно отложено, НЕ баг):** keyboard-undo для ТРАНСФОРМАЦИЙ прямого DOM —
  списки/чек-лист (`_grimSetListType`/`_grimConvertLine`, Notion-движок), табличные index-ops
  (`_grimColInsert`/`_grimColDelete`/`_grimRowInsert`/`_grimRowDelete`/`grimTableAppend`/`_grimRemoveTable`),
  чек-лист тоггл (`grimBodyClick`), правка/снятие существующей ссылки (`grimLinkConfirm` anchor-ветка/
  `grimLinkRemove`). Они меняют DOM напрямую и НЕ откатываются с клавиатуры. insertHTML-replace для них
  НЕнадёжен (мульти-блочная замена), нужен КАСТОМНЫЙ in-body undo-стек (snapshot `bo.innerHTML` перед op +
  координация Ctrl+Z кастомного стека с нативным undo набора). Это вариант «полный app-undo», который
  пользователь не выбирал; делать только по отдельному запросу. Часть 1+2 уже закрыли главное (потеря
  данных) + дали undo для набора/форматов/заголовков/инлайна/вставок.

## Этап 2 — СВОРАЧИВАНИЕ ЗАМЕТКИ (toggle) — ГОТОВО (commit 2cadbbf, pushed 2026-06-16)
Клик по УЖЕ открытой записи в списке сворачивает её панель (список во всю ширину, выбор
сохранён, запись подсвечена) / разворачивает. Var `grimNoteCollapsed` (транзиент, без персиста).
`grimToggleCollapse`; `grimOpen(id)`: тот же id → toggle, другой → открыть(сброс collapsed).
`_grimApplyFocus` гасит focus/full при collapsed. Сброс в grimBack/grimNew. Десктоп-онли
(мобайл — кнопка назад). Тест `D:\tmp\pw\_collapse.js` 31/31.
- **РАСКЛАДКА grid→flex (важно!):** `grid-template-columns` НЕ интерполирует `px↔fr` → collapse
  схлопывался мгновенно (замер detail 486→0 за кадр). Перевёл `.grim-layout` на **flex**: список =
  flex-item с анимируемым `flex-basis` (px↔% интерполируется), detail = `flex:1 1 0` филлер сам
  плавно ужимается. focus(138px)/full(0)/collapse(100%) — всё на flex-basis. Мобайл = flex-column.
- **Иконка тогла = готический ГРИМУАР** (выбор юзера, вариант 5 из превью): `GIC.foldOpen`
  (раскрытая книга) / `GIC.foldClosed` (закрытый том: крест-сигил, бинты корешка, застёжка).
  Два глифа стопкой в `.grim-leaf-fold`, КРОССФЕЙД по классу `.grim-note-collapsed` (без ре-рендера).
  Шеврон/стрелки юзер забраковал как примитив. Превью-харнесс `D:\tmp\pw\_glyphs2.html` (+_g2shot.js,
  element-screenshot nth для кандидата ниже фолда).
- **Анимации:** направленные через end-state переходов — collapse `--ease-sink`, expand
  `--ease-emerge`; замедлены до `--dur-ritual` (520). При сворачивании opacity ведёт на --dur-standard
  (маскирует reflow). Оверлей таблицы переклеивается по `transitionend` грид→flex (dx=0 проверено).
- **Переход МЕЖДУ заметками = кроссфейд:** `grimOpen` при switch добавляет `.grim-page--leaving`
  старой странице (оседает вверх+гаснет 150ms sink, `_grimSwapT`), затем рендерит новую → усиленный
  `grimPageIn` (fade+rise14px+scale, --dur-ritual emerge). Список-подсветка мгновенно. reduced-motion ок.
- **grimCommit(e) — фикс «клик по листу терялся»:** blur тела при клике по листу пересобирал лист
  (renderGrimList) между mousedown/mouseup → клик терялся (открытие/тоггл требовали 2 клика). Теперь
  по `e.relatedTarget`: blur на ЛЮБОЙ лист → `_grimSyncActiveLeaf` (обновление НА МЕСТЕ, узел жив →
  1 клик); уход в не-лист → полный renderGrimList. Всплытие отредактированной заметки наверх: при
  переключении делает сам grimOpen (его renderGrimList пересортирует), при уходе — полный рендер.
- **УРОК (анимации):** статикой не проверить — мерить ширину во времени (`_anim.js` сэмплит
  getBoundingClientRect по 40ms). grid px↔fr и px↔minmax НЕ анимируются; flex-basis px↔% — да.

## ЭТАП 3 — СОГЛАСОВАННЫЙ ПЛАН (утверждён пользователем 2026-06-16, брейншторм-сессия)
После большого брейншторма (тир1→тир4) пользователь отобрал состав Этапа 3. Делаем по пунктам,
визуал/иконки — сперва HTML-превью с вариантами, анимации смотрит живьём, коммит/пуш по «коммить».
Порядок внутри — на усмотрение Клода, разумно от лёгкого к тяжёлому. Развилки реализации спрашивать
ПЕРЕД кодом каждого пункта.

**ВНЕДРЯЕМ СЕЙЧАС (ближний план):**
1. ~~**Счётчик слов/рун**~~ — ОТМЕНЁН пользователем 2026-06-16 («работает плохо»), правки откачены
   (git restore app.js style.css). НЕ возвращать без отдельного запроса.
2. ✅ **ГОТОВО + ПУШ (commit b560355, 2026-06-16).** **Поиск/подсветка (РАСШИРЕН пользователем)** — изначально «подсветка в сниппете» (она
   уже была через `highlightSearch`→`<mark>`). По ходу выросло в 3 части:
   - (готово) **эксцерпт-окно** `_grimSnippet`→`_grimSnippetHTML`: сниппет центрируется на 1-м вхождении
     (±36/120) с `…`, чтобы совпадение было видно даже вглубине тела;
   - **C. Адаптивный сниппет** — инлайн готик-глифы на месте блоков (таблица/цитата/код/список/чек-лист),
     чтобы структура не сливалась в плоский текст. ВЫБОР: треатмент **V3** (акцентный глиф без рамки),
     таблица = **сетка** (FIC.table). `_grimFlattenSnippet`+`_grimSnipGlyph`.
   - **A. Поиск-в-заметке (= п.10 Ctrl+F, втянут сюда)** — при открытой заметке с запросом: подсветка
     ВСЕХ совпадений в теле через **CSS Custom Highlight API** (range, НЕ пишется в body — без правок
     санитайзера/undo), автоскролл к первому, плавающая готик-панель «n/m»+←/→(меч)+закрыть. ВЫБОР панели:
     **низ по центру**, position:fixed (body-singleton, чтобы transform .grim-page не ломал fixed). Ctrl+F
     фокусит строку поиска (она — единый источник запроса для листа И тела). Enter/Shift+Enter в строке =
     след/пред. Превью-харнесс `D:\tmp\pw\_glyphs3.html`. Тест `D:\tmp\pw\_hl.js`.
3. ✅ **ГОТОВО (commit 8c1c27e).** **Дубликат заметки** — `grimDuplicate(id)` clone+новый uid.
4. ✅ **ГОТОВО (commit 8c1c27e, вместе с п.3).** **Чипы дат** в подвале/листе (`grimDate` относительное «правлено N дн назад»;
   `.grim-stamp` правлено/начертано в детали, `.grim-leaf-d` в листе).
5. ✅ **ГОТОВО (commit 0bfb7ba).** **Закреп (pin)** — `note.pinned`+`grimTogglePin`, липнет наверх поверх `ord`;
   pin НЕ трогает `updatedAt` (чтобы «правлено» оставалось честным). Кнопка `.grim-act.is-pin` (`IC.pin`).
6. ✅ **ГОТОВО (commit 8cc818f).** **Опустошить Склеп** — `grimEmptyCrypt(btn)` bulk-уничтожение архива (two-step `_armDanger`).
7. ✅ **ГОТОВО (commit 9798ecb).** **Сортировка листа** — `_grimSortControl`/`grimToggleSortMenu`, гибрид «по правке»/создание/А-Я
   (паттерн `dl-month-picker`). `grimSortMode` персистит.
8. ✅ **ГОТОВО (commits c075e98 многострочный + 74566c9 оформление A «гравёрная плита» + df4beb1 inline-бэктики).**
   **Блок кода** ` ``` `→`<pre>`, `grimCodeBlock()`, FIC.codeBlock; моноширинный, каменная плита.
9. ✅ **ГОТОВО (commit 26dc4bb).** **Цвет заметки** — реюз спектра `_grgbScope` (добавлен scope для заметки), палитра задач+RGB-picker,
   цветной акцент в листе.
10. ✅ **ГОТОВО (commit b560355, вместе с п.2).** **Поиск-в-заметке (Ctrl+F)** — CSS Custom Highlight API, переход n/m (см. п.2).
11. ✅ **ГОТОВО (commit 8f4b9bc).** **Импорт Markdown** — `_grimMdToHtml`/`_grimMdInline`/`_grimMdTable`, `.md`→новая заметка
    (парс H1-3/списки/чек/цитата/код-фенс/hr/таблицы/инлайн). Замкнул круг данных (был только экспорт).
12. ✅ **ГОТОВО (commit dbb9c25).** **Шаблоны заметок** — сплит-кнопка у «Начертать» (`#grim-tpl-trigger` двусостоянийная книга),
    `GRIM_BUILTIN_TPL` (4 чертежа) + `state.noteTemplates` (свои, `grimSaveAsTpl`), `grimUseBuiltin`/`grimUseTpl`/`grimDeleteTpl`.
12b. ✅ **ГОТОВО (commit 2370d16).** **Единый импорт/экспорт «Перенос»** (НЕ из списка 17, доп-фича сессии). Кнопка `#grim-io`
    (крылатый свиток) с попапом: экспорт **резервная копия** (один .md, каждая заметка = YAML-frontmatter блок, round-trips
    цвет+разбивается обратно на N заметок) / **для чтения** (ZIP store-метод, один .md на заметку). Экспорт ВЫБРАННЫХ
    (`#grim-io-sel` в баре мультивыбора). Импорт МНОЖЕСТВА файлов (.md+.zip, `grimImportFiles`, `_grimUnzip` через
    DecompressionStream deflate-raw). ZIP-writer: CRC32 + UTF-8 flag bit11 (0x0800) — иначе русские имена кракозябры.
    Функции: `GRIM_IO_IC`, `_grimZipStore`, `_grimParseBackup`, `_grimImportDocs`, `grimExportBackup/Reading`.
13. ✅ **ГОТОВО + ПУШ (commit 94dbb0f, 2026-06-17).** **Выравнивание ячеек таблицы** (по колонкам L/C/R + md pipes).
    Меню колонки (.gtc-pop) → ряд L/C/R (FIC.alignL/C/R = глиф-знамёна у резной кромки, вариант B), `.gtc-align.on` active;
    Shift+клик = всем колонкам (tooltip). `_grimColAlign(table,ci,a)`/`_grimColGetAlign` ставят/читают класс `align-c`/`align-r`
    (left=без класса). Санитайзер: в class-ветке th/td whitelist `align-c`/`align-r`. md-экспорт `_grimTableToMd`:
    разделитель `:-:`/`--:`/`---`. md-импорт `_grimMdTable(rows,sepLine)` парсит выравнивание обратно в классы.
    CSS `.grim-body th/td.align-c/.align-r{text-align}` + `.gtc-divline`. Гутеры прозрачнее (alpha 0.46→0.22/0.10→0.05).
    Тесты `D:\tmp\pw\_tblalign.js` 13/13 + `_tblalign2.js` 3/3.
14. ✅ **ГОТОВО + ПУШ (commit eb85a19, 2026-06-18).** **Оглавление/TOC** — автономная sticky-карточка справа от заметки.
    Кнопка-скоба `GIC.toc` (D «рубрика-скоба») в угловом стеке `.grim-toc-toggle` (top:78), видна ТОЛЬКО при ≥3 H1-3 (класс
    `.toc-avail`), desktop-only. `grimTocOpen` персист localStorage. Контент обёрнут в `.grim-page-main` (флекс-сосед рейла) —
    таблица-оверлей НЕ задет (координаты попиксельные от rect). Рейл `.grim-toc` = `position:sticky` САМ (НЕ оборачивать в
    overflow-ancestor — сломает sticky), overflow на нём же для слайд-клипа width 0↔222. Внутри `.grim-toc-inner` (видимая
    рамка, overflow:hidden+радиус → обрезает скроллбар по углам) → `.grim-toc-scroll` (max-height+overflow-y, тонкий скроллбар) →
    `.grim-toc-head` (sticky шапка) + `.grim-toc-nav` (пункты l1/l2/l3 по отступу, l1=арка-буллет `GIC.tocArch`, l2/l3=точка).
    Фон карточки = `var(--bg-input)` (КАК заметка — юзер требовал; отделяет рамка+тень, НЕ заливка — светлый/тёмный фон браковал).
    Scroll-spy `_grimTocSpy` (листенер scroll capture, rAF-throttle, TOP=104, active=последний прошедший линию). Клик `_grimTocGo`
    → smooth scrollIntoView (`scroll-margin-top:84px`) + вспышка `.grim-toc-flash`. Функции: `grimToggleToc`/`_grimRefreshToc`
    (gate+build)/`_grimTocSpy`/`_grimTocSpyScroll`/`_grimTocGo`/`_grimTocDetach`. Хук в `_grimAfterEdit` (заголовки меняются) +
    reset в начале `renderGrimDetail`. **Своя готик-иконка сворачивания `GIC.tocClose`** (меч вправо в ланцетный пилон+финиал,
    «убрать индекс в поля») — НЕ заменять чужие иконки без спроса (юзер ругался за подмену crossedSwords). **ВАЖНЫЙ ФИКС:**
    обёртка `.grim-page-main` порвала ревил тулбара — селектор был `.grim-page:hover > .fmt-bar` (прямой потомок), `.fmt-bar`
    теперь внутри обёртки → провёл цепочку `.grim-page > .grim-page-main:hover > .fmt-bar` (hover скоуплен на контент, не на рейл).
15. **История версий заметки** — снапшоты `body` → откат (бьёт в правило №1 «не терять данные»). Тир3. L.
16. **Каллауты/«вардовые» боксы** (тир2, согласовано 2026-06-16) — блок-врезки с готик-рамкой +
    сигил-иконкой + фоновым тоном (иллюминированная маргиналия). ДВА типа: **Завет** (нейтральная
    заметка, роза-окно) + **Предостережение** (опасность, тёплый красный — единственный разрешённый).
    **Сказание (цитата) — ОТКЛОНЕНО, НЕ делать.** Реализация как таблицы/hr: вставка из тулбара,
    класс в whitelist санитайзера, md-экспорт → `> [!note]`/`> [!warning]` (Obsidian-совм.).
17. **Звук пера** при наборе/действиях. Тир4. Дефолт **ВЫКЛ + тогл внизу-справа** (как тогл в задачах —
    найти реализацию того тогла и повторить паттерн). Уважать тихий режим. Готик-сэмпл (скрип пера).

## ОПЦИОНАЛЬНЫЕ улучшения гримуара → ПЕРЕЕХАЛИ в [[optional-features-backlog]]
Весь опциональный список (теги, папки/разделы, бейджи листа, [[wiki]]-связи+бэклинки,
режим чтения, PDF-экспорт, slash-меню, DnD блоков, связь заметка↔задача, анимация
перелистывания, текстура пергамента, вложенные чек-листы, AI-саммари) консолидирован
2026-06-19 в ЕДИНЫЙ бэклог [[optional-features-backlog]] (вместе с опциональными
задачами: Idea 5 календарь, Idea 2 стрик, S1-9, G4-3). Делать ТОЛЬКО по явному «go».
**Картинки + IndexedDB = Этап 4** — ОТДЕЛЬНЫЙ план, НЕ опциональный бэклог.

## СТАТУС НА 2026-06-18 (конец сессии) — п.14 TOC ГОТОВ (+ склеп)
**Пункты 2-14 + «Перенос» (12b) ГОТОВЫ и ЗАПУШЕНЫ** (п.1 счётчик слов — ОТМЕНЁН).
Последний коммит ветки: `031128d` (TOC и в read-only склепе). Ветка `fix/ui-repeat-meta-subtasks`
(origin github.com/tekerinka314/Dusk), рабочее дерево чистое. Сессия 2026-06-18: п.14 (eb85a19) —
несколько раундов правок дизайна карточки (фон/контраст/кнопка) по живому ревью юзера; затем TOC
добавлен и в склеп (031128d): `_grimRefreshToc` ищет тело через `#grim-detail .grim-body` (ловит
активное `#grim-body` И ro `.grim-body--ro`), архивная ветка обёрнута в `.grim-page-main`+панель.

**ОСТАЛОСЬ в Этапе 3 — 1 пункт (делать с greenlight'ом пользователя):**
- ~~**п.15 История версий**~~ ГОТОВ (`6a5dde5` летопись + `c5685bb` вырезано копирование заметок). Летопись в отдельном LS-ключе `dusk_note_versions_v1` (НЕ в state — фикс лага), умное прореживание, секция «Перед откатами», Ctrl+Z.
- ~~**п.16 Каллауты**~~ ГОТОВ (`e09add4`). Вариант B (иконка+полоса, без шапки), 3 типа: Скрижаль(фиолет)/Угроза(красный)/Шёпот(приглушённый). Кнопка-меню `grimCalloutMenu`/`grimCallout`, `GRIM_CO` map. Иконка = CSS-маска (`--co-ico` data-URI), в теле только `<div class="grim-co grim-co-TYPE"><div class="grim-co-body">`. Санитайзер бранч для DIV-классов. Текст+метки в цвет типа (color-mix 82% `--co-c`). Enter-выход + Backspace-удаление пустого (`_grimBackspaceCallout`, `_grimExitOnEnter`). Экспорт `> [!note/danger/secret]`. Спецификация: типовые CSS-правила ОБЯЗАНЫ иметь префикс `.grim-body`/`.grim-body--ro` (иначе базовое 2-классовое правило перебивает `--co-c/--co-ico`).
- **п.17 Звук пера** — дефолт ВЫКЛ + тогл внизу-справа (паттерн тогла из задач). Тир4. ← ПОСЛЕДНИЙ оставшийся пункт Этапа 3.

## КАК РАБОТАТЬ ДАЛЬШЕ — прямые указания новому Клоду (можно начинать без доп-вопросов «что делаем»)
1. **Спросить пользователя, какой из 4 оставшихся пунктов брать** (он ведёт работу по одному). Если скажет
   «берись»/«дальше» без уточнения — брать СЛЕДУЮЩИЙ по порядку = **п.14 TOC**.
2. **ПЕРЕД кодом каждого пункта — спросить развилки реализации** (AskUserQuestion: где/как, дать рекомендацию).
3. **Иконки/визуал — сперва HTML-превью с вариантами → скриншот** (`D:\tmp\pw`, харнесс ниже), показать
   пользователю, дождаться выбора. Готик-эстетика обязательна (hand-drawn SVG, без emoji/Material, реюз мотивов).
4. **НЕ коммитить без «коммить»/«комитим».** «коммить» = `node --check app.js` → commit И push в origin, трейлер
   `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`, сообщение по-русски. bg-gothic.jpg всегда стейджить.
5. **Каждую фичу проверять Playwright-логикой + скриншотом крупным планом**, не только logic-checks. Удалять
   временные превью-файлы из корня репо ПЕРЕД коммитом.
6. Перед правками форматирования читать `_grimSetListType`/`_grimConvertLine`/`_grimExitOnEnter` + блок CSS
   `.grim-body ...` (логика списков/кода тонкая). Перед правками таблиц — блок «Этап 2 ТАБЛИЦЫ» выше.
7. **Глобальный рефактор** (data-layer uuid+tombstones для ЗАДАЧ → модульный split app.js → синхронизация Google
   Drive) и **Этап 4** (картинки+IndexedDB) — НЕ начинать без отдельного явного «go».
8. **Общение по-русски, caveman-режим** (терсно; код/коммиты/безопасность — нормальным языком).

## TESTING HARNESS (Playwright, system Chrome — no browser download)
- Dir `D:\tmp\pw` (outside repo). `playwright-core` installed. Chrome at
  `C:\Program Files\Google\Chrome\Application\chrome.exe`. Pattern: tiny node http server
  serving repo root + `chromium.launch({executablePath:CHROME,headless:true})`; seed via
  `addInitScript localStorage.setItem('duskState_v3',...)` + `localStorage.setItem('currentPage','notes')`.
  Capture page.on('pageerror'/'console'). Existing scripts: runner*.js, footer.js, fmt*.js,
  inspect.js. Headless render == real Chrome → reliable for layout checks.

## PRODUCT RULES (keep)
Готик-эстетика обязательна (hand-drawn SVG, без emoji/Material). «Никогда не терять
данные» — правило №1 (undo-в-тостах, миграции idempotent). Quick-add символы !/*/% (tasks).
