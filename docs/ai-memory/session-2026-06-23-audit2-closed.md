---
name: session-2026-06-23-audit2-closed
description: "БАЗА для аудита-3 (возможно финального): всё сделанное (аудит-1+2, Гримуар, анимации, сорт/фильтр), коммиты, gated-рефактор/синк, опциональный бэклог, переиспользуемые паттерны/уроки, план"
metadata: 
  node_type: memory
  type: project
  originSessionId: 9402d213-bb8e-45ba-b0cf-b2637fb02184
---

Хэндофф-точка перед СЛЕДУЮЩИМ аудитом DUSK (пользователь планирует ещё один,
**возможно финальный**). Это полная картина состояния. Связано:
[[audit2-2026-06-19-grimuar-crossapp]], [[audit-2026-06-fix-progress]],
[[optional-features-backlog]], [[grimoire-notes-plan]], [[icons-must-be-ornate-gothic]],
[[commit-means-push]], [[no-screenshot-html-previews]].

## Репо / ветка
- Ветка `fix/ui-repeat-meta-subtasks`, remote `origin` = github.com/tekerinka314/Dusk.
- master — дефолтная. Все работы пушатся в ветку. «Коммить» = commit **И** push.
- 3 файла: `index.html`, `app.js` (~13.9k строк), `style.css`. State в localStorage
  `duskState_v3`. Build-шага нет (vanilla PWA).

## ВСЁ СДЕЛАНО (закрыто, в ветке)
1. **Аудит-1 (красный кластер) + P-E** — закрыт ранее (см. [[audit-2026-06-fix-progress]]).
   Репо-файл AUDIT-FINDINGS.md отмечен.
2. **Гримуар (заметки) Этапы 0/1/1b/2/3** — ПОЛНОСТЬЮ (пп.2-17 вкл. TOC, летопись/
   история, каллауты, звук пера+волюм-бар, коммит 8933e13). См. [[grimoire-notes-plan]].
3. **Аудит-2 (NA-1…NA-13) — ВЕСЬ ЗАКРЫТ 2026-06-23.** Коммиты:
   - NA-1 _grimInk фиолет, NA-2 санитайз body, NA-3 летопись→export, NA-4 collapse-
     reflow ([[na4-grim-collapse-reflow-fix]]), NA-5 рестаггер, NA-6 merge-шаблоны,
     NA-8 модалки — ранние коммиты (хэши в [[audit2-2026-06-19-grimuar-crossapp]]).
   - **c2dd0eb** — плавные анимации чек/анчек подпунктов + авточек родителя (оба
     направления, settling-in/check-pulse/uncheck-pulse/cycle-spin; pc!==0 ветка в
     toggleSubtask играет ритуал одновременно на подпункте и авто-(ан)чекнутом родителе).
   - **e4a5254** — overflow-«…» меню + режим авто-чека родителя по любому подпункту.
   - **3ad04db** — NA-9 (J/K между записями + N=новая заметка; grimOpen(id,{fromKb:true})
     НЕ крадёт фокус в редактор → фокус на листе-кнопке, ходит подряд; _grimVisibleIds),
     NA-12 (_grimGrowTitle → rAF-коалесинг от layout-thrash ResizeObserver), NA-13
     (крестик очистки поиска заметок, скрещённые клинки GIC.dismiss, виден по CSS
     :placeholder-shown, grimClearSearch).
   - **5bde9d3** — NA-10 (цвет-фильтр заметок: кнопка-кристалл у поиска + попап свотчей
     присутствующих цветов; noteColorFilter + localStorage dusk_noteColorFilter; активный
     красит иконку+обводку кристалла через _grimInk; DnD off под фильтром; сброс при смене
     Записи↔Склеп) + NA-11 (сорт задач: бинарный тоггл → готик-попап 3 режима
     Приоритет/Порядок/Алфавит; IC.sortAlpha; глобал state.sortMode + пер-групповой
     state.sortModeOverrides; alpha=localeCompare ru; дедлайн/расписание НЕ тронуты).
   - **0cf6e49** — полировка сорт-попапа: легче/элегантнее, глобальный (#task-sort-list)
     умеренно крупнее компактных пер-групповых.
   - NA-7 (uuid задач) — **GATED** (входит в рефактор-блок ниже).

## GATED (только по отдельному явному «go» — НЕ начинать на аудите)
Порядок из CLAUDE.md: **Idea 8 data-layer (uuid + updatedAt + tombstones, миграция
int→uuid в migrateTasks) → 7c модульный split app.js (+7a commit() helper, +6a
collapse на grid-rows) → Sync (Google Drive appDataFolder, per-task merge, LWW+спросить
на конфликте) → Capacitor (Android) / Tauri (Windows) → опц. Svelte/Vite/IndexedDB.**
NA-7 = первый шаг (uuid) этого блока. Этап 4 Гримуара (картинки+IndexedDB) — отдельно.

## ОПЦИОНАЛЬНО (вне аудита, только по «go») — [[optional-features-backlog]]
Задачи: календарь (Idea 5, отложен), стрик (Idea 2), S1-9, G4-3. Гримуар: теги/папки/
бейджи/[[wiki]]/режим чтения/PDF/slash-меню/DnD блоков/заметка↔задача/перелистывание/
пергамент/вложенные чеклисты/AI-саммари.

## ПЕРЕИСПОЛЬЗУЕМЫЕ ПАТТЕРНЫ / УРОКИ (из этой сессии — пригодятся на аудите-3)
- **Body-portal для поповеров (НОВОЕ, важное).** Если поповер уходит ПОД контент или
  обрезается — причина обычно трансформированный предок (transform/filter/will-change
  делает его containing block для position:fixed) ИЛИ overflow-clip/стэк. Решение:
  на открытии `document.body.appendChild(list)` + position:fixed + вычислить top/right
  от rect триггера; на закрытии вернуть в исходный родитель (см. toggleSortPicker/
  _closeSortPicker, класс `.task-sort-list` + `.task-sort-portal`). Стили вешать на
  СОБСТВЕННЫЙ класс элемента (не через предка) — переживают перенос. Грабли: fixed +
  left:auto + right:Npx раздувает width → задать `width:max-content`.
- **Picker-система переиспользуется:** `.dl-month-picker/.dl-month-list/.dl-month-option`
  (дедлайн-месяц, weekday, grim-sort, теперь task-sort). `.dl-month-picker.open .dl-month-list`
  = veil-lift анимация; `.open-up` = вверх у низа экрана.
- **_grimInk(hex)** — поднимает яркость цвета в читаемую полосу для тёмного фона
  (иконки/обводки/текст по выбранному цвету). Сырой цвет — только для мягкого halo.
- **renderListOnly()** — частичный рендер для горячих путей (чек/пин/приоритет/цвет).
- Анимации: keyframe только с `from` (без `to`) едет к натуральному computed-значению
  (без вспышки). Токены `--ease-*`/`--dur-*`. Уважать prefers-reduced-motion.

## ХАРНЕСС (рабочий) — D:\tmp\pw
playwright-core + node v24 + реальный Chrome (`C:/Program Files/Google/Chrome/
Application/chrome.exe`). Паттерн: локальный http (порт 0) отдаёт ROOT='D:/VSCode
projects/DUSK_1_86'; `addInitScript` сеет localStorage `duskState_v3` + currentPage;
`reducedMotion:'no-preference'` чтобы ловить анимации; полить `getComputedStyle`/
`getBoundingClientRect` по времени. Скрипты сессии: _anim6, _na913, _na10(+shot),
_na11(+shot2/shot3), _clk. Артефакты png туда же. См. [[dusk-headless-screenshot]].

## ПРАВИЛА РАБОТЫ (держать на аудите-3)
- **Язык — русский.** Пользователь — новичок в backend/sync/infra: объяснять просто.
- **Готик-эстетика обязательна везде** (иконки только ornate-gothic, реюз мотивов;
  [[icons-must-be-ornate-gothic]]). Палитра фиолет/пурпур на near-black, danger-red
  только для деструктива.
- **Визуальные/рискованные правки — описать и дать подтвердить ДО коммита.**
  Пользователь сам смотрит каждое изменение в работающем приложении. Коммит — по «go».
- Фичи (как NA-10/11) — **спросить развилки ПЕРЕД кодом**. Token-budget aware:
  маленькие точные правки, по одному.
- HTML-превью/мокапы НЕ скриншотить самому — отдавать файлом ([[no-screenshot-html-previews]]).
- **Never lose data** — #1 продуктовое правило (драйвит undo-in-toast, tombstones-план).

## ПЛАН НА АУДИТ-3 (возможно финальный)
Аудит-1 и аудит-2 закрыты — **НЕ переделывать их находки**. Это «свежий взгляд с нуля»
на сильно выросший проект (Гримуар пп.1-17 + сорт/фильтр + анимации). Ожидаемые зоны
внимания: консистентность поповеров/модалок/клавиатуры между задачами и Гримуаром
(часть cross-app в audit2 закрыта — проверить остаток), доступность (focus-trap/aria),
перф на больших списках, готик-консистентность новых контролов (сорт-попап, цвет-фильтр),
мелочи UX. После аудита-3 — решение пользователя: чинить остаток ИЛИ открывать GATED
рефактор/синк-блок. Сначала спросить пользователя как вести аудит (объём/формат).
