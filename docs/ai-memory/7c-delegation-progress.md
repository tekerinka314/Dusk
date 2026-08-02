---
name: 7c-delegation-progress
description: "GATED 7c (делегирование) — app.js И index.html ЗАВЕРШЕНЫ+ЗАКОММИЧЕНЫ (0 инлайнов on*= во ВСЁМ проекте). Слайсы 1–3h + 4a–4h запушены (`614fa69`). Тег `v2.0-monolith-pre-split` = точка отката до сплита. Дальше: физ.split A1"
metadata: 
  node_type: memory
  type: project
  originSessionId: 49d2d2c1-f861-401d-a1a8-cf9ec6083ff1
---

2026-06-26: пользователь дал «go» на **7c** (следующий GATED шаг после Idea 8 — см.
[[idea8-datalayer-done]]). 7c = ДВЕ независимые части: (1) инлайн `onclick`→`data-action`
+ делегирование событий; (2) физ. разбивка `app.js` (~15k строк) на модули.

**Развилки (выбраны пользователем):**
- **A1** — split-механизм: МНОГОФАЙЛ + namespace `window.DUSK` (plain `<script>`, без сборки).
  Причина выбора объяснена: ES-модули (`import`) НЕ грузятся с `file://` (origin null/CORS) →
  ломали бы hard-требование оффлайна; бандлер = шаг сборки, которого проект избегает.
  A2 (один файл, секции) — запасной дешёвый вариант если A1 по токенам/риску не зайдёт.
- **B1** — порядок: СНАЧАЛА делегирование (по подсистемам, тест после каждого слайса),
  физ. split — отдельной под-стадией ПОТОМ. 7a (`commit()`-хелпер) вкладывается в проход
  делегирования.

**Дизайн диспетчера (реализован, только app.js, после хелперов Idea-8 ~стр.1133):**
- Делегирование АДДИТИВНО: неконвертированный инлайн-`onclick` работает рядом → миграция
  по слайсам без поломок (функции остаются глобальными до split-стадии).
- Корень = `document` (bubble). 5 карт: `ACT` (click), `ACT_DBL` (dblclick), `ACT_INPUT`
  (input), `ACT_BLUR` (focusout — blur не всплывает), `ACT_KEY` (keydown). `_delegate(map,
  attr,e)` = `e.target.closest('['+attr+']')` → `map[dataset[attr.slice(5)]]`.
- Разметка: кнопкам только `data-act="fnName"` (+`data-actkey`/`data-actdbl`/...). id НЕ
  дублируется — берётся `_tid(el)=+el.closest('.task-item').dataset.id` (data-id уже на `li`).
- `currentTarget`-зависимые меню (openSnoozeMenu/openTaskMoreMenu якорят float-меню по
  `event.currentTarget`) → адаптер шлёт синтетику `_synEv={currentTarget:el,target,stopProp,
  preventDefault}`; сами функции НЕ тронуты.
- `event.stopPropagation()` пилюль был нужен ТОЛЬКО хендлеру `mainSelectMode` (стр.~7254);
  при делегировании на document он бесполезен → вместо него добавлен `[data-act]` в список
  исключений того хендлера. Эквивалентно.
- a11y keydown-зеркала пилюль (`if Enter/Space…`) → `data-actkey="kactivate"` (Enter/Space
  дёргает `ACT[dataset.act]`). `onmousedown="event.preventDefault()"` (анти-увод фокуса) →
  `data-pd` + один mousedown-листенер.
- **Гард (важный урок/баг):** `_delegate` и mousedown-листенер ОБЯЗАНЫ проверять
  `typeof e.target.closest==='function'` — иначе keydown без фокуса (target=document/window)
  кидает `e.target.closest is not a function`. Этот баг поймал ИМЕННО audit3-харнесс
  (мой _7ctest target всегда элемент — не словил). Подтверждение ценности per-slice тестов.

**Слайс-1 = строка задачи (ГОТОВ, протестирован):** конвертированы ВСЕ инлайн-хендлеры
строки: toggleCheck, togglePin, openTaskColorModal, open/clear Deadline, openSnoozeMenu,
open/clear Repeat, openPrioModal, openTaskMoreMenu, removeTask, deleteTaskForever,
toggleTaskNote, toggleSubtasksSection, toggleSubNotesAlwaysOpen, open(Edit)NoteModal,
startInlineEdit(dbl), _taskNoteEdit/Input/Keydown/Commit/Delete, пилюли дедлайна/повтора.

**Тесты:** `D:\tmp\pw\_7ctest.mjs` — **11/11** (реальные клики: pin-flip, dblclick-edit,
note-panel, deadline-modal, kactivate-Enter, snooze/more float-меню = доказывает анкер).
Регресс: audit3 **103/103**, idea8 **33/33**, pentest **6/6** (после гард-фикса). Синтаксис OK.

**Статус: ЗАКОММИЧЕН+ЗАПУШЕН** (пользователь проверил живьём «работает»). Слайс-1 =
`307dbed` → origin/refactor/sync. Коммитили РАЗДЕЛЬНО по просьбе: отдельным коммитом
`9fb3161` ушёл НЕзависимый баг-фикс фильтра (см. ниже). Раздельная фиксация одного файла
сделана через Edit-откат хунка → commit → Edit-возврат → commit (без интерактивного add -p).

**Сверх 7c — баг-фикс фильтра (`9fb3161`):** «только невыполненные» (`isFiltered`)
фильтровал лишь ЗАДАЧИ; выполненные ПОДпункты рендерились. Фикс — одна строка в
`_buildSubListContent` (`if (isFiltered) subs = subs.filter(s=>!s.checked && !s.cycleChecked)`),
единый источник → покрыл стандарт+сплит, полный+инкрементальный рендер. Прогресс-бар/счётчик
«подпункты N/M» остались правдивыми (считаются от task.subtasks). Тест `_subfiltertest.mjs` 5/5.

**Слайс-2 = подпункты (ЗАКОММИЧЕН+ЗАПУШЕН `dcb906a`):** конвертированы
~22 хендлера в `buildSubtaskItemHTML` + split-заголовки: toggleSubtask, cycleSubPriority,
toggleSubNote, promoteSubtask, deleteSubtask, openSubRepeatModal, openSubDeadlineModal
(badge+set-btn+пилюля с `kactivate`), clearSubDeadline, startSubEdit(dbl), split-заголовки
(`toggleSubSplitActive/Done` через `data-splitkey`), заметки подпунктов
(`_noteEdit/_noteInput/_noteKeydown/_noteCommit/_noteDeleteClick`). Хелперы `_sTid`/`_sSid`
из `.subtask-item[data-tid/data-sid]`. `startSubEdit` берёт `event.target` как редактируемый
span → синтетика с `target: el`. **Форм-подпункты НЕ тронуты** (отдельный слайс; `_note*`
шарятся — инлайн там жив рядом). Тест `_7c2test.mjs` **12/12**, регресс audit3 103/103,
7c-1 11/11, subfilter 5/5, idea8 33/33, pentest 6/6.
**Уроки харнесса (не баги приложения):** (1) `note-open` — эфемерный DOM-класс, теряется
при render()/rebuild → ассертить флип, не конечное состояние; пост-ребилд проход
app.js:9795 переоткрывает не-dismissed заметки. (2) reveal-анимированные кнопки в
`.sub-actions` флапают на позиционный `page.click` → bubbling `el.click()` через evaluate
(тот же путь через document-делегат). (3) toggleSubtask откладывает ребилд ~220ms — ждать >250ms.

**Слайс-3 = modals/widgets (ЗАКОММИЧЕН+ЗАПУШЕН, 4 под-слайса):** дроблён по кластерам.
- **3a** заголовок группы (`307dbed`→`89e73de`): `.group-header`→toggleGroupCollapse,
  кнопки schedule/focus/duplicate/rename/delete; id из `.group-section[data-group-id]`
  (`_gid`); drag-handle+`.group-actions`→`data-act="noop"` (поглощают клик по зазорам
  вместо старого stopProp; closest берёт ближайшую кнопку). Сорт-пикер оставлен инлайном
  (сам зовёт stopProp). Тест `_7c3atest.mjs` 11/11.
- **3b** сорт-пикер+цвет-фильтр (`55f3eff`): `_taskSortOptions(curK,gid)` эмитит
  `data-act="sortOpt" data-k data-gid` — опция несёт свой gid (нет → тулбар-глобал),
  т.к. список ПОРТАЛИТСЯ в body (нет `.group-section`-предка). Триггер сорта — шим с
  реальным stopProp. Свотчи цвета `data-color`. Тулбар-триггер (#btn-sort-mode) инлайн.
  Тест `_7c3btest.mjs` 8/8.
- **3c** body-float-меню (`96f4a04`): снуз/«…»/submode(per+глоб)/demote/экспорт. Меню в
  body → НЕТ предка-строки → каждый пункт несёт свой payload в data-* (task id, target,
  mode, snz-пресет, drop-флаг, exp-scope). Триггеры openSnoozeMenu/openTaskMoreMenu уже
  делегированы (сл.1); тулбар openExportMenu/openSubAnyModeMenu инлайн. Тест `_7c3ctest.mjs` 14/14.
- **3d** список-виджеты (`64912b8`): архив (restore/delete — строки УЖЕ
  `.task-item[data-id]`→reuse `_tid`), шаблоны, бэкап, тег-чипы+hashtag-в-заметке
  (`highlightHashtags`), quick-add typeahead. Новый канал **ACT_OVER** (mouseover) для
  hover `_qaHover`; mousedown-увод фокуса → `data-pd`. Тест `_7c3dtest.mjs` 15/15.
Регресс после каждого: audit3 103/103, idea8 33/33, сл.1 11/11, сл.2 12/12, subfilter 5/5,
pentest 6/6. **Урок:** падения тестов 3d были БАГАМИ ТЕСТА (seed шаблона без `text`→
`extractTags(undefined).match`; рестор сохраняет ОТЛОЖЕННО за анимацией→ассертить in-memory
`state` (он глобал в classic-script); hashtag-функция = `highlightHashtags`, не linkifyNote).

**Слайс-3e = форм-подпункты + add-подпункт-строка (ЗАКОММИЧЕН `839abb8`):** форм-строки =
`<li.subtask-item data-form-sub-idx>` (индекс в transient `formSubtasks`, нет sub-id) →
свой `_fsi`; add-инпут/кнопка внутри строки задачи → reuse `_tid`. Пилюля дедлайна форм-саба
reuse `kactivate`; clear → `data-stop`; заметка форм-саба reuse общих
`_noteEdit/_noteInput/_noteKeydown/_noteCommit/_noteDeleteClick`; note-toggle pointerdown→`data-pd`.
Тест `_7c3etest.mjs` 11/11. **Урок:** `removeFormSubtask` отложен (~240ms анимация); рестор
дедлайн-модалки требует докрытия после Escape (reopen во время закрытия = тоггл-закрытие).

**Слайс-3f = bulk-группа + чип-дропдаун групп (ЗАКОММИЧЕН `d7de24e`):** виджеты ВНЕ
`.group-section`. `bulkSetGroup` (`data-gid`/none→null), `selectGroupChip` (`data-chip`),
удаление = ОТДЕЛЬНЫЙ `deleteGroupById` (`+data-gid`; хедерный `deleteGroup` берёт `_gid` из
`.group-section` — нельзя переиспользовать). Чип-дел `data-stop` (не дёргать selectGroupChip).
Hover bulk-дел-кнопки: inline `this.style` → data-driven over/out пара → новый канал **ACT_OUT**
(mouseout) рядом с ACT_OVER. Тест `_7c3ftest.mjs` 9/9.

**Слайс-3g = редактор Гримуара + формат-тулбар (ЗАКОММИЧЕН+ЗАПУШЕН `38ef677`):** хедер-рейл
(grimBack/grimToggleFocus/grimToggleBar/grimToggleToc), редакторы grim-title-in/grim-body
(`data-actinput`/`-actblur`=grimCommit/`-actkey`; тело `data-act=grimBodyClick`), вставка plain-text
→ **новый канал ACT_PASTE** (document paste-листенер, `data-actpaste=plainTextPaste`), футер
(grimTogglePin/openGrimColorModal/grimSaveAsTpl/grimOpenHistory/grimArchive/grimDelete — id записи
СТРОКА в `data-nid`), склеп-детали (grimRestoreNote/grimDeleteForever). Формат-тулбар схлопнут в ОДИН
адаптер `grimFmtBtn`: каждая кнопка несёт команду в `data-cmd`, диспетч через `_GRIM_FMT`-карту;
table/callout якорят поповер по кнопке через `_synEv` (используют `e.currentTarget.getBoundingClientRect`);
`onmousedown=preventDefault`→`data-pd`. Тест `_7c3gtest.mjs` **14/14**.
**Слайс-3h = список/склеп Гримуара + body-поповеры (ЗАКОММИЧЕН+ЗАПУШЕН `cc9630c`):** лист grim-leaf
(`data-act=grimOpen|grimToggleSelectNote`, id из своего `data-id`), grimNew, сорт-пикер
(grimToggleSortMenu+grimSortTriggerKey, опции grimSetSort `data-k`), цвет-фильтр grimSetColorFilter
(`data-color`,escHtml), месяц склепа grimToggleCryptMonth (`data-key`, btn=el через closest), летопись-модалка
(grimHistSelect/grimHistRestore `data-at` + grimCloseHistory), find-бар (grimFindPrev/Next/Close), меню
шаблонов (grimUseBuiltin `data-key`/grimUseTpl `data-id`/grimDeleteTpl), меню «Перенос»/IO
(grimImportFiles + grimExport{FullBackup,Backup,Reading} `data-scope` all|sel; сигнатура `_grimIoItem`
inline-строка→act+scope). **Тонкость поповеров** (общий `_gothicPickers` outside-close = `!picker.contains(e.target)`
на document): grimSetColorFilter перестраивает поповер на выбор → e.target отрывается → contains=false →
закрытие — это РОВНО старый инлайн (там не было stopProp) → простой адаптер верен. grimDeleteTpl наоборот
держал поповер открытым через `event.stopPropagation`; делегатный эквивалент = **`stopImmediatePropagation`**
в адаптере (гасит соседний листенер `_gothicPickers` ДО его contains по уже оторванному узлу; ACT-листенер
зарегистрирован раньше → срабатывает первым). Тест `_7c3htest.mjs` **14/14** (флап «closed»=тест-баг:
grimCloseHistory снимает `.open` и удаляет оверлей через 340мс → ассертить снятие `.open`, не display).

**ИТОГ: проход делегирования по app.js ЗАВЕРШЁН — инлайн on*-хендлеров в РАЗМЕТКЕ app.js НОЛЬ**
(grep даёт только 3 коммента + `querySelector('[onclick="clearAll()"]')` на app.js:~8291 — это таргет
кнопки из index.html). Каналов диспетчера 8: click/dblclick/input/focusout/keydown/mouseover/mouseout/**paste**
(+`data-pd`,`data-stop`). Регресс после 3g/3h зелёный: audit3 103/103, idea8 33/33, 7c-1..3h всё, subfilter 5/5, pentest 6/6.

**Слайс-4 = index.html (4a–4h, ГОТОВ+ПРОТЕСТИРОВАН, UNCOMMITTED — ждёт живого ревью):** ВСЕ 80 статичных
on*= в index.html сняты → grep `on(click|change|...)=` по index.html даёт **НОЛЬ**. 4a таб-навигация+4b
тулбар-тогглы+4c no-arg главной (`249e619`,`711fc85` уже запушены). Доделано ЭТОЙ сессией (uncommitted):
- **4d форма** задачи: openFormColorModal, openFormDeadline (= `openDeadlineModal(null)`, ОТДЕЛЬНЫЙ act от
  строкового openDeadlineModal/`_tid`), clearFormDeadline (✕ ВНУТРИ кнопки-триггера → свой `data-act` ближе по
  closest → старый stopProp не нужен), formMonthdayStep (`data-delta`, обе ± кнопки в 1 адаптере, кламп 1..31),
  addFormSubtask, toggleFormPin, saveFormAsTemplate; monthday onchange + import file onchange → **новый канал
  ACT_CHANGE** (`data-actchange`); handleFormSubAdd → `data-actkey=formSubAddKey`.
- **4e тулбар+bulk-бар**: requestNotificationPermission, openSubAnyModeMenu/openExportMenu (float-меню по
  `_synEv` как сл.1), clearAll (+ querySelector в app.js:8313 обновлён на `[data-act="clearAll"]`), bulkSetPriority
  (`data-prio`), openBulk{Group,Color,Deadline}Modal, bulkArchive/bulkDelete. #btn-sort-mode reuse сл.3b
  toggleSortPicker; #btn-schedule reuse сл.3a toggleScheduleMode (`_gid`=null вне группы → глобал).
- **4f архив**: clearArchiveSearch/restoreAll/toggleSelectMode/clearArchive/restoreSelected; поиск oninput→
  `archiveSearchInput`.
- **4g Гримуар-шапка**: grimSetMode (`data-mode`), grimToggleSelectMode, grimToggleIoMenu/grimToggleTplMenu/
  grimToggleIoSelMenu, grimEmptyCrypt (el), grimNew (reuse 3h), grimClearSearch, grimToggleColorFilter,
  grimBulkArchive/Restore/Delete, openGrimBulkColorModal; поиск→`grimSearchInput`.
  **КЛЮЧЕВОЙ вывод по поповерам:** триггеры io/tpl/io-sel ВНУТРИ своих `_gothicPicker`-контейнеров
  (#grim-io-split/#grim-new-split/#grim-io-sel) → `picker.contains(trigger)`=true → outside-close НЕ срабатывает
  → **stopImmediate НЕ нужен** (в отличие от grimDeleteTpl, который перестраивает поповер и ОТЦЕПЛЯЕТ target!).
  grim-cfilter держит свой динамический outside-листенер, добавляемый ВО ВРЕМЯ клика (спек: не сработает на
  текущем клике) → простой адаптер (как grimToggleSortMenu в 3h).
- **4h модалки + плавающие кнопки**: close/confirm/clear футеры всех модалок (group/rename/link/deadline/prio/
  task-color/repeat/note/templates/backups/bulk-group), toggleDlAutoRepeat, stepDlDuration (`data-unit`+`data-delta`,
  обе пары степперов в 1 адаптере), `_clampDlDuration`→`clampDlDuration` (input), 2× RGB hue-слайдера→`grgbHue`
  (input), grgbApply, commitColorClear (=`_commitColorChoice('')`), toggleSound, toggleShortcutsHint. Backdrop-
  клики модалок — отдельный U-1 делегат (app.js:~11071 MODAL_CLOSERS), их НЕ трогал. import-choice кнопки —
  по id через addEventListener (никогда не были инлайном).

**Тест `_7c4test.mjs` 19/19** (реальные клики через делегацию: форм-дедлайн, степпер дедлайна, авто-повтор-тогл,
закрытие модалки [animated→ждать 450мс], monthdayStep+канал change, addFormSub, formPin, clearAll-arm-без-вайпа,
архив select-bar, grimSetMode, grimToggleIoMenu открыт-и-ОСТАЁТСЯ-открыт, grimToggleColorFilter, grimNew).
**Регресс ЗЕЛЁНЫЙ, 0 регрессов:** audit3 103/103, idea8 33/33, subfilter 5/5, pentest 6/6, **durwire 14/14, x7
14/14, x8 16/16** (x8 #5 = известный wall-clock флап, зелёный на ретрае), 7c4a 5/5, 7c3h 14/14. Синтаксис OK.
**Урок харнесса:** 3 теста (_durwire/_x7check/_x8check) имели УСТАРЕВШИЙ `ROOT='DUSK_1_86'` (папку
переименовали в DUSK_v2.0) → 404 → «openDeadlineModal not defined»; пофикшен sed-ом пути. Не регресс.

ИТОГ: **делегирование 7c ПОЛНОСТЬЮ ЗАВЕРШЕНО+ЗАКОММИЧЕНО — НОЛЬ инлайн on*= во всём проекте (app.js + index.html).**
Каналов диспетчера **9**: click/dblclick/input/focusout/keydown/mouseover/mouseout/paste/**change** (+`data-pd`,
`data-stop`). 4d–4h после живого ревью («поверхностно проверил, рабочим») закоммичены+запушены `614fa69`
→ origin/refactor/sync. В тот же коммит вошла правка по просьбе пользователя: **дефолт авто-повтора дедлайна
теперь ВЫКЛ во всех режимах** (`_dlAutoRepeat` + `_arInit` стартуют `false`; существующий повторяющийся
дедлайн при ре-редактировании всё равно отражает своё реальное состояние — `tgtRepeat !== 'none'`). Создан
аннотированный **тег `v2.0-monolith-pre-split`** (запушен) = последняя стабильная МОНОЛИТНАЯ app.js, точка
отката перед сплитом.

**ФИЗ. SPLIT A1 ЗАВЕРШЁН+ЗАКОММИЧЕН `f9a3829`→origin/refactor/sync (2026-06-27).** app.js (15388 строк)
физически разбит на **8 файлов `dusk/0X-*.js`** по границам секций. РЕШЕНИЕ механизма (спросил —
пользователь выбрал): **БЕЗ namespace** — классические `<script>` делят глобальный scope, поэтому
namespace `window.DUSK` функционально не нужен, а полный перенос символов = переписать каждый вызов
(огромный риск, нулевая польза). Порез = order-preserving contiguous slices: конкатенация в порядке
загрузки **байт-в-байт = старый app.js** (проверено `cmp` через `tail -n +S | head -n N`, НЕ sed — sed
съедал CR у CRLF-файла). Файлы: 01-core(1-1790 стейт+диспетчер+ACT) / 02-grimoire(1791-5781) /
03-render(5782-7452) / 04-tasks(7453-9807) / 05-edit-notes-groups(9808-11437) / 06-deadlines(11438-12682) /
07-dnd-filter-progress(12683-13909) / 08-quickadd-export-init(13910-15388, **init() последним**).
**УРОК (главный риск сплита):** немедленно-исполняемый топ-левел `const`-инициализатор, ссылающийся на
функцию из ПОЗЖЕ грузящегося файла, падает (в монолите спасал хойстинг функций в начало ЕДИНОГО скрипта;
в сплите хойстинг per-file). Написал детектор (`scratchpad/detect_fwd.mjs`) → нашёл **ровно 3**: SORTABLE_OPTS
`onEnd:onDragEnd`/`onAdd:onDragAdd` (core→07) и MODAL_CLOSERS `'deadline-modal':closeDeadlineModal` (05→06) →
сделал ленивыми обёртками `(...a)=>fn(...a)` (onDragEnd не юзает this → безопасно). Остальные 11 closer'ов и
`onFormSubDragEnd`(8051) — внутри своего файла (per-file хойстинг ОК). Каждый файл `node --check` OK. index.html:
app.js→8 тегов по порядку (pen-asset.js перед). sw.js: ./app.js→8 ./dusk/*.js (оффлайн-прекэш). app.js УДАЛЁН
(тег v2.0-monolith-pre-split + история хранят). Тесты 0 регрессов: audit3 103/103, idea8 33/33, 7c4 19/19,
subfilter 5/5, **pentest 6/6 (оффлайн на сплите)**, x7 14/14, x8 16/16, durwire 14/14. **7c ПОЛНОСТЬЮ ЗАКРЫТ**
(делегирование + физ.split). Дальше по плану: синк (Google Drive appDataFolder) — только по «go».
