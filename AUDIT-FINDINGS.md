# DUSK — реестр находок аудита (июнь 2026)

> **ЭТО ДОКУМЕНТ-HANDOFF между сессиями. Читать первым при возобновлении работы над аудитом.**
> Аудит (4 стадии) пройден; идёт стадия ФИКСОВ. Часть закрыта (см. ЖУРНАЛ), часть осталась (см. ОСТАЁТСЯ).

### 🔑 КАК ПРОДОЛЖАТЬ (для свежей сессии)
1. **Рабочая ветка:** `fix/ui-repeat-meta-subtasks` (remote `origin` = github.com/tekerinka314/Dusk). Всё уже запушено.
2. **Правило фикса:** КАЖДУЮ находку сначала перепроверить в коде/браузере — фиксить лишь реально
   подтверждённую (так уже отсеян G4-7, скорректирован P-A). Изменения **surgical**, готик-стиль обязателен.
3. **Ритм (по просьбе пользователя):** работать автономно блоками; каждый блок = **отдельный commit
   (с трейлером `Co-Authored-By: Claude Opus 4.8`) + push** на origin. Перед правкой `node --check`.
   Визуальные изменения пользователь смотрит сам в браузере — описывать, что проверить.
4. **НЕ начинать без отдельного явного «го»:** Фаза E = Idea 8 (uuid/updatedAt/tombstones), Sync
   (Google Drive appDataFolder), Capacitor/Tauri. CLAUDE.md это жёстко запрещает.
5. **Прогресс фикс-стадии:** ✅ Фаза A, Фаза B SW, P-A, S1-1, S1-2, S1-5, P-G, P-C, P-B, P-D, S1-7, G4-5,
   **U-1 (+S1-3), U-3 (+S1-6), U-2 (+G4-6), P-E (живые+форм подпункты)** (+ S1-4, S1-8, G4-7 проверены —
   уже сделаны/не баги). **ВЕСЬ КРАСНЫЙ КЛАСТЕР АУДИТА + P-E ЗАКРЫТ (2026-06-19).** ОСТАЁТСЯ только:
   **S1-9** (архитектурная заметка `overflow:hidden`), **S1-10** (полная фабрика пикеров — частично: outside-click
   сведён в G4-6, дедуп init отложен к 7c/Svelte), **G4-3** (перф Sortable — к 7c/Svelte), **P-F** (напоминания —
   на этап синка). **G4-1 WebP — ОТМЕНЁН пользователем (2026-06-14), не делать.**
6. **⚠️ Номера строк** в старых описаниях ниже могли сдвинуться после правок — перед фиксом **re-grep**
   по имени функции/селектору, не доверять старым `app.js:NNNN`.

### 🧠 Тех-заметки этой сессии (важно для следующей)
- Появился общий помощник **`onMaxHeightEnd(el, cb, fallbackMs=600)`** (рядом с `toggleSubtasksSection`):
  transitionend(max-height)+fallback-таймер+once-guard, возвращает `cancel()`. Используется в 3 collapse-функциях
  через `el._collapseCancel`. **U-3** должен строиться поверх/вместо него.
- **undo уже многоуровневый** (`undoStack` лимит 40). Добавлен **`redoStack`** + `redo()`; `pushUndo()` чистит redo.
  `undo()`/`redo()` теперь зовут `renderArchive()`+`updateArchiveBadge()`.
- **S1-1**: exit-keyframes используют `--row-h`, который JS ставит из `scrollHeight` перед классами
  `removing`/`removing-forever`/`restoring`.
- **C3-3 (uuid-аргумент)**: merge-импорт чинили вручную бампом счётчиков — это ещё один довод за Idea 8.

### 🖼️ Headless-скриншоты DUSK (наработано — позволяет проверять визуальные правки в браузере, а не на словах)
Рабочий рецепт (Windows, Chrome `C:\Program Files\Google\Chrome\Application\chrome.exe`, Node `D:\Soft\Node\node.exe`):
1. **Локальный http-сервер обязателен** — `file://` в этом headless отдаёт пустой DOM. Мини-сервер на Node отдаёт папку проекта.
   ⚠️ Путь-root с пробелом («VSCode projects») в `Start-Process -ArgumentList` нужно **квотировать** (`'"..js" "D:\VSCode projects\DUSK_1_86"'`), иначе аргумент рвётся → сервер 404 («nf»).
2. **Preview-копия** `__preview.html` (рядом, потом удалить): из `index.html` вырезать внешние ресурсы (Google Fonts, SortableJS CDN → стаб `window.Sortable`, `serviceWorker.register`) — иначе офлайн `load` висит и скриншота нет. Перед `<script src="app.js">` вставить `<script>localStorage.setItem("duskState_v3", JSON.stringify({...засев задач...}))</script>`; драйвер на `window load` гонит UI (`toggleMainSelectMode()`+`toggleMainSelectTask(id)`, `_setFormColor(...)`, форс-раскрытие формы `extra-fields.style.maxHeight='none'`, форс-видимость модалки `el.style.opacity=1`).
3. **Chrome:** `--headless=new --user-data-dir=<свежий рандомный> --no-first-run --disable-gpu --disable-extensions --window-size=1000,1500 --hide-scrollbars --screenshot=<out> http://localhost:8731/__preview.html`. Перед каждым запуском **убивать зависшие** `chrome` (MainWindowTitle=='') — залоченный профиль молча ничего не делает. **НЕ** использовать `--virtual-time-budget` (2-сек `setInterval` приложения не даёт quiescence → зависание); снимать сразу после `load`.
4. Снимок всё равно **флакает** — гонять в ретрай-цикле, успех = размер PNG > 50 КБ (мелкий ~8 КБ = пустая/404 страница).
5. Кроп/апскейл детали — через `System.Drawing` (Bitmap + Graphics, NearestNeighbor для пикселей).
6. В PS-хелпере **только ASCII** (кириллица в here-string ломает кодировку файла .ps1); текст задач для вёрстки неважен.
Так в этой сессии подтверждены редизайн select-bar, тёмный тулбар и одностороннее свечение полоски (увидел, что blur светил по всему периметру).

Статус-метки: `[ ]` не тронуто · `[~]` частично · `[x]` исправлено · `[skip]` отклонено после перепроверки

### ЖУРНАЛ ВЫПОЛНЕНИЯ (коммичено + запушено на origin/fix/ui-repeat-meta-subtasks)
- `9af225f` Фаза A: C3-1, C3-2, C3-3, C3-4, C3-5, S1-4, G4-4 (+undo обновляет архив)
- `ebff3e4` Фаза B (SW): G4-1 (ядро/опц. split), G4-2 (дифф по заголовкам)
- `f97e977` P-A: redo (Ctrl+Shift+Z / Ctrl+Y)
- `908482d` Блок 1: S1-5 (onMaxHeightEnd), S1-2 (reduced-motion collapse), P-G (голое число), G4-7 (skip — не баг)
- `dfeccef` Блок 2: S1-1 (exit-анимации без клампа 80px → --row-h)
- `(P-C)` Блок 3: P-C — кольцевой бэкап (10 снимков, троттл 10 мин, дедуп, quota-safe) + готик-модалка «Точки восстановления» (песочные часы в тулбаре). Restore делает `pushUndo()` (откат отменяем). Логика проверена Node-тестом.
- `(P-B)` Блок 4: P-B — вид «Сегодня» (`isTodayMode`, `isDueTodayOrOverdue`, тогл-арка в тулбаре). Предикат покрыт Node-тестом по всем режимам дедлайна.
- `(P-D)` Блок 5: P-D — массовые группа/цвет/дедлайн в select-bar (переиспуск color/deadline модалок через bulk-флаги + мини-модалка групп).
- `(polish)` Блок 6: S1-7 (month-picker open-up), G4-5 (удалён мёртвый showShortcutsHint + Streak-комментарий); S1-8 проверен — уже реализован (skip).
- `5ccb309` **U-1** (+S1-3): единый modal-controller — `MODAL_CLOSERS`+`dismissModalById`+один backdrop-делегат вместо 12 inline onclick; Esc через реестр; color-filter/import-choice на общие хелперы. + 2 UX-нюанса (цвет-фильтр авто-закрытие; кнопки импорта в один ряд).
- `65b23aa` **U-3/S1-6**: единый темп collapse (`--dur-collapse: 280ms`/`--ease-gothic` на 11 блоках).
- `14940e9` **U-2/G4-6**: один делегат outside-click пикеров (`_gothicPickers`+`registerGothicPicker`).
- `2271dc9` Повтор-модалка: «Нет» широкий off-switch + 2×2 кадансы (убрана асимметрия); пикер дня repeat-anchor отзеркален (фиолет/белый).
- `4a6ace7` **P-E (живые подпункты)**: дедлайн через общую модалку (editingSubId), все 6 режимов, weektime→авто-повтор, иконка-статус+hover-pill, promote/demote перенос, живой тик, dormant.
- `f69f20d` **P-E (форм-подпункты)** + клик по pill→модалка + ФИКС задач: крестик-clear дедлайн-пилла теперь краснеет на hover (специфичность (0,5,0) после per-variant правил).
- `f4064c1` **UI-полировка (3 раунда фидбэка пользователя, вне реестра аудита):**
  - **Тулбар:** фон → `var(--bg-input)` (тёмный в тон приложению, не светлое стекло); подписи кластеров ярче (`--text-secondary`, opacity 0.85).
  - **Select-bar полностью переделан под язык тулбара:** компактные квадратные иконо-кнопки `.sb-btn` (32px) в 3 кластерах (приоритет │ группа·цвет·дедлайн │ архив·удаление) с готик-разделителями, **одна центрированная строка** (`.main-select-bar{justify-content:center}`), счётчик-«титул» слева, «Отмена» справа. Прежняя проблема: `space-between` давал мёртвую пустоту по центру, текст-пилюли переносились в 2 рваных строки.
  - **Чек-выбора:** теперь визуальный `<span>` (без `onclick`), тоггл — единственным обработчиком клика по строке (исправлен «неработающий гробик-чек»).
  - **Цвет-модалка:** добавлен **form-режим** (`formColorActive`) — открывается из формы создания кнопкой-кристаллом, «Применить»/пресет/«Без цвета» пишут в `selectedFormColor` (`_setFormColor`). «Без цвета» перенесён из футера спектра в ряд `.modal-actions` рядом с «Отмена».
  - **Пикер формы:** симметричная сетка **6×2** (10 пресетов + «без цвета» + кристалл «свой цвет»); кристалл при выбранном кастомном цвете **заливается этим цветом** как свотч (глиф прячется).
  - **Готик-иконки (правило: всегда готическая иконка слева от подписи):** «Без цвета» в модалке = перечёркнутый кристалл (реюз цветового мотива); «без цвета» в форме = `IC.crossedSwords` (скрещённые мечи). Размер кристалла в форме сделан чётным (12px) — центрируется без субпиксельного сдвига.
  - **Цвет ↔ приоритет взаимоисключающи:** выбор цвета молча снимает приоритет (per-task в `_commitColorChoice`, в форме в `_setFormColor`); bulk-приоритет снимает цвет. Старое «отключение пикера при приоритете» удалено вместе с мёртвым CSS.
  - **Полоска задачи:** 3px + **одностороннее свечение слева** через `--stripe-glow: -5px 0 5px -5px <цвет полоски>` (отрицательный spread = blur схлопывает тень по вертикали → НЕ растекается по верх/низ периметра; раньше обычный blur светил по всему контуру — это и было «свечение снизу»). Общий ambient/hover-glow задач убран.
  - **Bulk без выбора** → toast `_requireSelection()`.
  - ⚠️ `bg-gothic.jpg` в рабочем дереве помечен `M` ещё ДО этой сессии (происхождение неизвестно) — НЕ коммитил, оставлен вне `f4064c1`. Уточнить у пользователя, если всплывёт.

Проверка: `node --check` чистый на каждом шаге; merge-арифметика — Node-тест.
**Глазами в браузере проверить (накопилось):** two-step «Очистить архив»; Esc на всех модалках;
undo/redo (в т.ч. возврат архива); раскрытие/сворачивание при reduced-motion; уход высокой строки
(подпункты/заметка) в архив/удаление без рывка; `%15` в quick-add.

### ОСТАЁТСЯ (после закрытия красного кластера + P-E, 2026-06-19)
- **S1-9** — архитектурная заметка (`.task-item{overflow:hidden}` — потолок для inline-dropdown). Не баг, заметка на будущее.
- **S1-10** (частично) — полная фабрика готик-пикеров (дедуп init-кода). Outside-click уже сведён (G4-6). Остаток отложен к **7c/Svelte** (высокий риск, видимой пользы 0).
- **G4-3** — перф: `render()` пересоздаёт все Sortable. Смягчено `renderListOnly`+ленивые sub. Потолок масштаба → **7c/Svelte**.
- **P-F** — напоминания заранее (за 1ч/день). Требует SW-таймера/Notification → **на этап синка** (общий канал).
- **7c (+7a)** — модульный split + data-action делегирование. НЕ опциональное, но и НЕ блокер синка → отложено максимально далеко, к **Svelte-миграции**.
- **Опциональный бэклог** (только по явному «go»): Idea 5 календарь, Idea 2 стрик, + бэклог Гримуара. См. memory `optional-features-backlog`.
- ~~G4-1 WebP~~ — **ОТМЕНЁН пользователем (2026-06-14). Не делать.**
- **Запрещено без отдельного «го»:** Фаза E = Idea 8 (uuid/updatedAt/tombstones) → Sync (Google Drive appDataFolder) → Capacitor/Tauri.

---

## СТАДИЯ 1 — UI/UX + анимации

### 🔴 Критично
- [x] **S1-1. ИСПРАВЛЕНО (dfeccef): exit-анимации используют `--row-h` (реальный scrollHeight).** ~~Exit-анимации строк клампят `max-height:80px`.~~ `style.css:1380,1387,1400` (`taskArchive`/`taskRestore`/`taskDelete`). Высокие строки (подпункты/заметка/2 строки текста/метки) рывком ужимаются до 80px на кадре 0, потом уезжают. Чинить: измерять `scrollHeight`→CSS-var, гнать `max-height:var→0`; либо `grid-rows 1fr→0fr` (6a). Риск: низкий.
- [x] **S1-2. ИСПРАВЛЕНО (908482d): `@media reduce` гасит max-height-collapse.** ~~не покрывает~~ `style.css:649,1345,1837,2162,2483,3017,3031,3089`. Добавить общий `@media (prefers-reduced-motion:reduce){ transition:none }` для collapse-блоков. Связано с S1-5 (нужен fallback). Риск: низкий.

### 🟠 Важно
- [x] **S1-3. ИСПРАВЛЕНО (5ccb309, в составе U-1).** color-filter + import-choice переведены на `openModalWithFocus`/`closeModalWithAnim` (фокус-трап, возврат фокуса, exit-аним, aria). import-choice backdrop-close убран по выбору пользователя (Esc+кнопки остаются).
- [x] **S1-4. Esc закрывал не все модалки.** ИСПРАВЛЕНО: вместо захардкоженного списка — закрытие верхней видимой `.modal-overlay` через `closeModalWithAnim`. Бонус: color-filter/import-choice теперь получают и exit-анимацию (частично закрывает S1-3). Будущие модалки работают автоматически.
- [x] **S1-5. ИСПРАВЛЕНО (908482d): `onMaxHeightEnd()` (transitionend + fallback-таймер + cancel) в 3 collapse-функциях.** ~~без fallback~~ `toggleExpand` (open, `app.js:6688`), `toggleGroupCollapse` (`5096`), `toggleSubtasksSection` (`3523`). Если переход не происходит — секция застрянет. Вынести `onTransitionEndOnce(el,prop,cb,fallbackMs)` и переиспользовать. Риск: низкий.
- [x] **S1-6. ИСПРАВЛЕНО (65b23aa, в составе U-3).** Новый токен `--dur-collapse: 280ms`; 11 collapse-блоков (extra-fields, group-body, archive-month, sub-section, sub-note, task-note, split active/done/pinned, sub-split active/done) сведены на `var(--dur-collapse) var(--ease-gothic)`. Объём = ТОЛЬКО тайминги (по выбору пользователя; перевод на grid-rows НЕ делался — риск DnD-ghost/клип пикеров формы). Чистый CSS, JS не тронут.

### 🟡 Желательно
- [x] **S1-7. ИСПРАВЛЕНО.** Month-picker получил `open-up`: `openPicker` считает `spaceBelow<224 && rect.top>224` → класс `open-up`, `closePicker` его снимает; CSS `.dl-month-picker.open-up .dl-month-list` (bottom + bottom origin) зеркалит `.dl-weekday-picker`.
- [skip] **S1-8. НЕ БАГ (проверено).** Фокус активного инпута УЖЕ реализован: `openDeadlineModal` после `openModalWithFocus` зовёт `_focusDeadlineModeInput(mode)` через двойной rAF (перебивает фокус первой кнопки). Функция фокусит нужный инпут для каждого режима.
- [ ] **S1-9. `.task-item{overflow:hidden}` (`style.css:1627`)** — потолок для будущих inline-dropdown/тултипов на строке. Архитектурная заметка.
- [~] **S1-10. ЧАСТИЧНО.** Outside-click сведён в один делегат (G4-6, коммит 14940e9). Полная фабрика `createGothicSelect` для дедупа init-кода (`initMonthPicker`/`initWeekdayPicker`/`initFormWeekdayPicker` + пикер repeat-модалки) НЕ сделана — отложена (высокий риск, как 7c; по выбору пользователя). Делать вместе с 7c/Svelte.

---

## СТАДИЯ 2 — развитие продукта (ВСЕ к внедрению; порядок ниже)

**Рекомендуемый порядок внедрения** (определён мной; цель — все пункты в итоге сделать):
1. **P-C** (кольцевой бэкап) — страховка ПЕРЕД любыми рефакторами данных.
2. **U-1** (единый modal-controller) — закрывает S1-3/S1-4, подложка под будущие модалки.
3. **U-3** (единая collapse-система = отложенный 6a) — закрывает S1-1/S1-2/S1-5/S1-6 одним рефактором.
4. **U-2** (фабрика готик-дропдаунов) — закрывает S1-10.
5. **P-A** (многоуровневый undo + redo).
6. **P-B** (вид «Сегодня»).
7. **P-D** (паритет массовых действий: группа/цвет/дедлайн).
8. **P-G** (грамматика `%`-даты: завтра/пн/15/18:00).
9. **P-E** (дедлайн у подпунктов).
10. **P-F** (напоминания заранее) — присоединить к этапу синка (общий SW/Notification).

### Фичи
- [x] **P-A. redo ДОБАВЛЕН** (commit f97e977). `redoStack` (лимит 40), наполняется `undo()`, чистится `pushUndo()`; `redo()` + клавиши `Ctrl/Cmd+Shift+Z`/`Ctrl/Cmd+Y`; подсказка обновлена. Многоуровневый undo уже был.
- [x] **P-B. ИСПРАВЛЕНО.** Вид «Сегодня»: тогл `#btn-today` (готик-арка с отмеченным днём) → `isTodayMode` (persist `todayMode`). Новый предикат `isDueTodayOrOverdue(dl)` (today/overdue по календарным дням; month/year — только если over; time всегда «сегодня») фильтрует в `filterAndSort`/`filterAndSortDeadline`/`updateVisibility`/`updateGroupCounts`; `scheduleActive` → true (дедлайн-сортировка); пустые группы скрываются, бейдж считает today-объём. Без новой страницы. Покрытие режимов проверено Node-тестом.
- [x] **P-C. ИСПРАВЛЕНО.** Кольцевой бэкап: `maybeBackup()` в `saveState` (троттл 10 мин, кольцо 10 снимков, дедуп идентичных, quota-safe сброс старых) в ключе `dusk_backups_v1`; модалка `#backup-modal` («Точки восстановления», кнопка-часы в тулбаре) со списком снимков (возраст/штамп/счётчики); `restoreBackup` зовёт `pushUndo()` → откат самого восстановления возможен. Мост к синку, сделан ПЕРЕД Idea 8.
- [x] **P-D. ИСПРАВЛЕНО.** Массовые группа/цвет/дедлайн в `main-select-bar`. `bulkSetGroup`/`bulkSetColor`/`bulkSetDeadline` (паттерн `bulkSetPriority`: pushUndo→forEach→saveState→toggleMainSelectMode→toast). Группа — новая мини-модалка `#bulk-group-modal` (пилюли групп + «Без группы»). Цвет — переиспользует `task-color-modal` через флаг `bulkColorActive` (цвет гасит приоритет — взаимоисключение). Дедлайн — переиспускает `deadline-modal` через `openDeadlineModal(null,true)`+`bulkDeadlineActive`, перехват в `applyDeadline`; `wasBulk` глушит `updateRepeatAvailability` (не трогаем форму). Флаги сбрасываются при открытии (через параметр/reset-on-open) → Esc-закрытие не протекает; невалидный дедлайн оставляет модалку открытой без применения.
- [x] **P-E. ИСПРАВЛЕНО (4a6ace7 живые + f69f20d форм).** Полный паритет: дедлайн у подпунктов (живых и форм-) через ту же deadline-модалку — все 6 режимов (time/weektime/monthday/month/year/date) переиспользованы через `editingSubId` (живые) и 4-й параметр `formSubIdx`+`_formSubDeadlineIdx` (форм-), по образцу повтора подпункта. weektime зеркалит V-7 (авто sub.repeat=weekly+anchorDay). Дисплей: всегда-видимая иконка-статус `IC.window` (цвет+пульс) в строке = клик-правка; muted set-кнопка в `.sub-actions` когда дедлайна нет; кликабельный мини-pill отсчёта раскрывается по hover под строкой (grid-rows как заметка); inline-clear. updateDeadlineBadges 2-й проход (живой тик), «спящий» статус у выполненных. promote/demote переносят дедлайн; clear+pushUndo. DnD-filter дополнен `.sub-deadline-badge/.sub-deadline-wrapper`. Палитра=`--deadline-*`/`pulseCritical`. Тесты Playwright (`_pe.js`+`_pef.js`): 6 режимов, weektime-авто, clear, promote, pill-клик→модалка, dormant, создание-переносит, нет-регресса-задачи — PAGEERRORS none. Риск был средний → закрыт.
- [ ] **P-F. Напоминания заранее** (за 1ч/день). Требует SW-таймера/Notification → объединить с этапом синка. Риск: средний.
- [x] **P-G. ИСПРАВЛЕНО (908482d).** `_parseQuickDate` уже знал завтра/пн/HH:MM/+Nd/ДД.ММ; добавлено голое число `%15`→ближайшая дата.

### Системные унификации (множители скорости; закрывают находки Стадии 1)
- [x] **U-1. ИСПРАВЛЕНО (5ccb309).** Реестр `MODAL_CLOSERS` (12 модалок) + `dismissModalById` + ОДИН делегированный backdrop-слушатель вместо 12 inline `onclick`; Esc через реестр; изгои color-filter/import-choice переведены на общие хелперы (= закрыт S1-3). NB: 10 footer-кнопок «Отмена/Закрыть» в index.html ещё на inline onclick — это часть 7c (отложено к Svelte).
- [x] **U-2. ИСПРАВЛЕНО (14940e9) — объём = G4-6.** 4 постоянных per-picker `document`-click слушателя сведены в ОДИН делегат: реестр `_gothicPickers` + `registerGothicPicker`. Полная фабрика `createGothicSelect` (дедуп init-кода = S1-10) НЕ делалась (по выбору пользователя — высокий риск, видимой пользы 0, как 7c). **S1-10 остаётся открытым.**
- [x] **U-3. ИСПРАВЛЕНО (65b23aa) — объём = тайминги (S1-6).** Единый `--dur-collapse`/`--ease-gothic` на 11 collapse-блоках. Перевод на `grid-template-rows:0fr↔1fr` НЕ делался (риск DnD-ghost/клип пикеров формы при overflow:hidden); баги S1-1/S1-2/S1-5 уже закрыты поточечно ранее, оставался только тюнинг таймингов = S1-6.

---

## СТАДИЯ 3 — корректность и данные

### 🔴 Критично (безвозвратная потеря данных — правило №1)
- [x] **C3-1. `clearArchive()` стирал архив мгновенно/необратимо.** ИСПРАВЛЕНО: two-step confirm (`_clearArchiveArmed`, класс `confirm-armed` на `#btn-clear-archive`) + `pushUndo()` + `showToast(…,{undo:true})`. `undo()` теперь зовёт `renderArchive()`+`updateArchiveBadge()`.
- [x] **C3-2. «Заменить»/fallback при импорте были необратимы** (`undoStack=[]`). ИСПРАВЛЕНО: убран `undoStack=[]` в обеих ветках, добавлен `{undo:true}` + `updateArchiveBadge()`.

### 🟠 Важно (целостность id / частичная потеря)
- [x] **C3-3. Merge-импорт не бампил `nextSubId`** (+`order` NaN). ИСПРАВЛЕНО: `remapTask` с `order:(t.order??0)+baseOrder`; счётчики `nextId/nextSubId` бампятся по tasks+archive. Node-тест: дублей/NaN нет.
- [x] **C3-4. Merge-импорт терял `loaded.archive`.** ИСПРАВЛЕНО: архив тоже ремапится (`newArchive`) и доливается; `migrateTasks(state.archive)` + `updateArchiveBadge()`.
- [x] **C3-5. Одиночное «Удалить из архива» было необратимо.** ИСПРАВЛЕНО: `pushUndo()` + `{undo:true}` в `deleteFromArchive`.

> ✅ Перепроверено и КОРРЕКТНО (не трогать): месячный сброс цикла (guard коротких месяцев), `calDayDiff`/`deadlineStatus` (календарные дни), сортировка month/year/monthday (bucket `withDlNoTs`), `deleteGroup`/`archiveAll`/`clearAll`/`restoreTask` (pushUndo + чистка LS + guard двойного animationend), санитайзинг импорта (длины + цвет regex).

---

## СТАДИЯ 4 — код / перф / PWA / безопасность

### 🟠 Важно
- [x] **G4-1. SW-часть ИСПРАВЛЕНА** (commit ebff3e4): `CORE_ASSETS` (атомарно) + `OPTIONAL_ASSETS` (best-effort, фон не валит install; докешируется лениво через SWR). ~~ОСТАЁТСЯ перекодировать `bg-gothic.jpg` → WebP~~ — **WebP-часть ОТМЕНЕНА пользователем (2026-06-14), не делать; находка закрыта.**
- [x] **G4-2. ИСПРАВЛЕНО** (commit ebff3e4): дифф шелла по `ETag`/`Last-Modified`/`Content-Length` с фолбэком на текст-дифф, если валидаторов нет.

### 🟡 Желательно
- [ ] **G4-3. Полный `render()` пересоздаёт все Sortable.** `setupSortables` `app.js:6222`. Смягчено `renderListOnly`+ленивые sub. Потолок масштаба → 7c/Svelte. Перф-замечание.
- [x] **G4-4. `escHtml` не экранировал `'`** (`app.js:7148`). ИСПРАВЛЕНО: добавлен `.replace(/'/g,'&#39;')` — defense-in-depth.
- [x] **G4-5. ИСПРАВЛЕНО.** Удалён мёртвый `showShortcutsHint()` no-op (вызовов нет нигде) и осиротевший CSS-комментарий `/* Streak counter */`. Скрытые `<select>` (group-select/dl-weekday/dl-month) ОСТАВЛЕНЫ намеренно — они источники value для готик-пикеров (не мёртвый код).
- [x] **G4-6. ИСПРАВЛЕНО (14940e9, в составе U-2).** 4 per-picker `document`-click слушателя сведены в один делегат (`_gothicPickers` + `registerGothicPicker`). Пикер дня недели repeat-модалки (pointerdown/classList) оставлен со своим.
- [skip] **G4-7. НЕ БАГ (проверено 908482d).** `attachPlainPasteHandlers` делает `removeEventListener` перед `addEventListener` — дублей нет.

> ✅ Крепко (не трогать): SW-стратегия SWR + тост обновления; teardown Sortable (`cancelAnimationFrame`-guard, destroy перед recreate); XSS (текст экранируется до вставки, теги ограничены `\w`/кириллицей).
