---
name: migration-ts-vite-plan
description: "СОГЛАСОВАННЫЙ план миграции DUSK на TS+Vite (Solid/Dexie ОТКЛОНЕНЫ) — Этап 4 (localStorage→IndexedDB) ПОЛНОСТЬЮ ЗАКРЫТ, дальше Этап 5 Playwright-в-репо (ТЕКУЩЕЕ)"
metadata: 
  node_type: memory
  type: project
  originSessionId: 818eced0-0b4e-485b-8183-8fc554517c1b
---

# Миграция DUSK → TypeScript + Vite (Этап 1-4 ГОТОВЫ, дальше Этап 5)

## ⭐⭐⭐ ЭТАП 4 — ПОЛНОСТЬЮ ЗАКРЫТ (2026-07-05): localStorage → IndexedDB (idb-keyval)

Все 4 шага закоммичены+запушены на `refactor/sync`, прод (`dusk-du4.pages.dev`)
подтверждён живьём (build `2026-07-05-3`). Развилки решены ЮЗЕРОМ явно
(AskUserQuestion, НЕ решались тихо моделью):
- **Boot = full switch**: `loadState()`/`init()` теперь async, boot читает
  IndexedDB ПЕРВЫМ; при пусто/ошибке — фоллбэк на LS v4 (уже существующий
  путь) + автоматическая миграция в IDB (бесплатно, через уже дуальный
  `saveState()`). LS получает ЖИВУЮ полную копию на КАЖДЫЙ `saveState()`
  навсегда (не разовый снапшот) — отдельный premigration-снапшот сочтён
  избыточным и НЕ сделан (обоснование в коммите 4.2).
- **Объём переноса = основной стейт (`K_STATE`/`duskState_v4`) + кольцо
  бэкапов (`K_BACKUPS`/`dusk_backups_v1`)** — оба на IDB-primary/LS-live-
  fallback. Синк-движковые LS-ключи (`dusk_sync_*`) и ~20 мелких UI-флагов
  НЕ трогали — вне периметра, как и планировалось.

**Коммиты (все на `refactor/sync`):**
- `05ab0ee` (4.0) — `npm i idb-keyval`; обёртка `_idbGet`/`_idbSet` в
  `dusk/01-core.ts` (глотает все ошибки сама, вызывающий код без try/catch).
  **Важный архитектурный урок**: статический `import` idb-keyval ПРЯМО в
  `01-core.ts` тихо превращает файл в ES-модуль для TypeScript → все его
  top-level объявления (`state`, `saveState`, `K_STATE`...) ПЕРЕСТАЮТ быть
  видны остальным 11 файлам как глобальные (script-mode merging ломается,
  сотни `Cannot find name` в других файлах). Фикс — как у Sortable: новый
  `src/idb-global.js` делает `import {get,set} from 'idb-keyval';
  globalThis._idbKvGet=get; globalThis._idbKvSet=set;`, импортируется из
  `src/main.js` ДО дусk-модулей; внутри `01-core.ts` — только `declare var
  _idbKvGet/_idbKvSet: any;` (тип-онли, ноль рантайма). Этот урок общий для
  ЛЮБОГО будущего npm-пакета, который понадобится дусk-модулю.
- `0fa03a3` (4.1) — `saveState()` дуально пишет: LS синхронно (как было) +
  `_idbSet(K_STATE, state)` fire-and-forget рядом.
- `45f27d2` (4.2) — `loadState()`/`init()` → async, IDB читается первым.
  **08's `init();` НЕ обёрнут в top-level `await`** — сознательный выбор:
  top-level await блокирует только модули, которые РЕАЛЬНО импортируют
  await-ющий модуль; сиблинг-импорты (`11-sync-ui.ts`/`12-sync-wake.ts`,
  импортируемые ПОСЛЕ 08 в `main.js`) НЕ являются зависимыми → по спеке ES
  modules их вычисление НЕ гарантированно ждёт resolve 08 — риск экзотики
  без выигрыша в безопасности (у 11/12 и так нет top-level кода, зависящего
  от `state`). Вместо этого — fire-and-forget `init().catch(...)`; порядок
  «state загружен → render()» и так гарантирован ВНУТРИ `init()` после его
  собственного `await loadState()`, независимо от того, ждёт ли вызывающий.
- `60cd7df` (4.3) — то же лечение для кольца бэкапов (`loadBackups`
  async IDB-primary, `persistBackups` дуально пишет через defensive
  `arr.slice()` копию ДО LS-quota-урезания). `maybeBackup()` → async, вызов
  из `saveState()` тоже fire-and-forget (`maybeBackup().catch(_=>{})`) —
  старый `try{maybeBackup()}catch{}` больше не защищает ни от чего (async
  функция не бросает синхронно вызывающему). 3 юзер-фейсинг колл-сайта в
  `04-tasks.ts` (`openBackupModal`/`_renderBackupList`/`restoreBackup`) стали
  async — безопасно, т.к. вызываются ТОЛЬКО через `data-act`-делегирование,
  которое игнорирует return.
- `6833240` (4.4) — `navigator.storage.persist()` разово при успешном boot,
  best-effort, тем же defensive-стилем.

**Тесты**: новый `tests/idb-storage.test.mjs` (require `// @vitest-environment
happy-dom` docblock — единственный тест-файл из 6, который side-effect-
импортирует ДОМ-тяжёлый `01-core.ts`, остальные 5 живут в дефолтном node-
окружении; `npm i -D happy-dom`). 19 сценариев внутри одного `it()`
(wrapper/dual-write/boot-IDB-first/boot-LS-fallback/backups). **Грабли теста**:
`loadState()`→`normalizeState()`→`migrateNotes()` — последняя живёт в
`02-grimoire.ts` (script-mode global), тест ловил `ReferenceError:
migrateNotes is not defined`, пока не добавил `import '../dusk/02-grimoire.ts'`
тоже — это НЕ баг Этапа 4, а то, что более ранние тесты никогда не вызывали
`loadState()` напрямую (только `saveState()`/`_idbGet`/`_idbSet`), так и не
наткнувшись на эту межфайловую зависимость.

**Верификация (реальный headless Chrome, не только моки)**: `tsc --noEmit`
чист на каждом коммите; `npm test` 6/6 файлов, 9/9 (19 сценариев внутри);
`npm run build` — ОДИН бандл `app.js` (idb-keyval вшит статически через
`src/idb-global.js`, НЕ отдельным chunk'ом — критично для SW-прекэша по
точному имени). Смок на `dist/` (новый scratchpad-скрипт `smoke-idb.mjs`)
прямым чтением `indexedDB.open('keyval-store')`/store `'keyval'` (реальные
default-имена idb-keyval, не мок) подтвердил: данные реально лежат в IDB
(не только "state выглядит верно в памяти"); boot с очищенным LS (IDB-only)
работает + LS сам восстанавливается дальше через дуальную запись; boot с
очищенным IDB (симуляция недоступности) падает на LS и всё равно грузится.
Тот же прогон на `dist/dusk-portable.html` (file://, новый
`smoke-portable-idb.mjs`) — тоже всё ОК; единственные console-ошибки —
ПРЕДСУЩЕСТВУЮЩИЙ CORS-фейл `version.json` под file:// (тост апдейта,
задокументирован ещё в Этапе 2, к стораджу отношения не имеет). Прод
(`dusk-du4.pages.dev`) подтверждён: `wrangler pages deployment list` зелёный
на build `2026-07-05-3`, `curl` совпадает по версии/размеру, живой headless
смок в изолированном browser-контексте (не трогает реальные данные юзера)
0 ошибок + add+cleanup прошли.

**Ждёт юзера**: собственный живой ревью на проде (правило проекта — визуальные/
рискованные изменения юзер проверяет сам), включая ручной сценарий из плана:
очистить IndexedDB через DevTools → релоаднуть → приложение обязано
подняться на LS-фоллбэке без потери данных.

**Дальше**: Этап 5 — Playwright smoke в репо (заменяет внешние `D:\tmp\pw`
харнесы). Потом отдельное «go» на Capacitor/Tauri.

## ⭐⭐⭐ ЭТАП 3 — ПОЛНОСТЬЮ ЗАКРЫТ (2026-07-04)

Все 12 модулей `dusk/*.js` → `.ts`. Метод был чисто механический (playbook
ниже) — Sonnet 5 xhigh справился без потери качества, никаких архитектурных
решений не потребовалось.

**Порядок ренейма (был НАМЕРЕННЫМ — от изолированного к связанному, крупные
файлы напоследок):** `09-sync.ts`(`ec93937`) → `10-cloud.ts`(`6b854a2`) →
`12-sync-wake.ts`(`a5be3be`) → `11-sync-ui.ts`(`f022432`) → `01-core.ts`(`d02ba93`) →
`06-deadlines.ts`(`61cc32a`) → `07-dnd-filter-progress.ts`(`9596ede`) →
`08-quickadd-export-init.ts`(`b951939`) → `05-edit-notes-groups.ts`(`53af2c9`) →
`03-render.ts`(`15532b5`) → `02-grimoire.ts`(`f25019d`, 4038 строк — самый
крупный) → `04-tasks.ts`(`51b18ba`, ПОСЛЕДНИЙ файл). Плюс подготовка: харнесы
→ нативный vitest (`5b58929`), `tsconfig.json`+`src/types.ts` (`8d651e7`).

**Итог:** `ls dusk/*.js` пусто, `ls dusk/*.ts` = 12 файлов. Каждый коммит —
`tsc --noEmit`+`npm test`(8/8)+`npm run build`+boot-smoke зелёные, version.json
НЕ бампался (чистый ренейм, ноль изменений рантайма). globalThis-мосты 2a
оставлены как есть (снятие на настоящие import/export — опционально, не
обязательно). worker/ не тронут.

**СЛЕДУЮЩИЙ ШАГ — Этап 4:** localStorage → IndexedDB блоб через `idb-keyval`
(dual-write, LS-копия НЕ удаляется, снапшот `dusk_premigration_ls_v4` перед
первым IDB-boot, `navigator.storage.persist()`, Drive-формат синка не меняется).
Потом Этап 5 (Playwright smoke в репо, заменяет внешние D:\tmp\pw харнесы).
Дальше отдельное «go» на Capacitor/Tauri.

### ⭐ ЭТАП 4 — kickoff-грант (2026-07-04, УЖЕ ПРОГРУНТОВАНО кодом, НЕ гадание)

**Вердикт по модели:** для Этапа 4 Opus 4.8/Fable 5 НЕ нужны — Sonnet 5 xhigh
справляется. Это НЕ чисто механическая задача как Этап 3 (есть реальный
архитектурный узел — см. ниже), но узел уже локализован чтением кода (не
абстрактным гаданием), а сама кодовая база даёт готовый ПРЕЦЕДЕНТ того же
паттерна (Idea 8 v3→v4, см. ниже) — копировать форму решения, не изобретать
с нуля. Единственное правило: если всплывёт РАЗВИЛКА с риском для данных —
спросить юзера явно (AskUserQuestion), а не тихо решить самому.

**Конкретика, найденная чтением кода (dusk/01-core.ts) — экономит грепы в
новой сессии:**
- Стейт живёт под ключом `K_STATE = K_STATE_V4 = 'duskState_v4'`
  (`dusk/01-core.ts:82-84`). Ещё есть ~20 МЕЛКИХ отдельных LS-ключей
  (UI-preferences: `dusk_colorFilter`, `dusk_focusGroup`, `scheduleMode`,
  `groupCollapsed_*`, `grimBarMode` и т.д.) — их НЕ трогаем, они мелкие и не
  растут (не имеют отношения к «разблокировать картинки Гримуара» — цели Э4).
- **ЧЕК-ПОИНТ ЗАПИСИ — ОДИН (низкий риск):** `saveState()` (`01-core.ts:1004`)
  — единственное место, где стейт пишется в LS (`localStorage.setItem(K_STATE,
  JSON.stringify(state))`), вызывается из ~30 мест по всему коду (Idea
  7a commit-helper так и не сделан), но ВСЕ идут через эту одну функцию.
  Добавить туда fire-and-forget `idbSet(K_STATE, state)` рядом с LS-записью —
  минимальная правка, дальше проверять vitest+build+smoke.
- **ЧЕК-ПОИНТ ЧТЕНИЯ — ОДИН, НО СИНХРОННЫЙ (главный архитектурный узел):**
  `loadState()` (`01-core.ts:1062`) вызывается ОДИН раз из `init()`
  (`01-core.ts:898`), которая сама вызывается на TOP-LEVEL модуля
  (`init();` в `08-quickadd-export-init.ts:1515`, исполняется при импорте) —
  синхронно, без await, сразу после идут синхронные setupEventListeners +
  первый рендер. `idb-keyval` — Promise-based → тут нужно РЕШЕНИЕ:
  - (A) top-level `await init()` в 08 (ES-модули + Vite это поддерживают) —
    первая отрисовка ждёт один IDB round-trip (~1-10мс), просто, мало правок,
    но чуть меняет тайминг загрузки;
  - (B) оставить `loadState()` синхронной на LS как сейчас (LS остаётся
    источником истины ПРИ ЗАГРУЗКЕ), IDB — асинхронный «зеркальный» стор
    рядом (только для будущих картинок Гримуара + доп. дубль на случай
    переполнения LS), почти нулевой риск смены поведения, но НЕ то же самое,
    что «localStorage → IndexedDB блоб» из формулировки CLAUDE.md.
  **Эти два прочтения плана (A vs B) расходятся** — в CLAUDE.md написано и
  «boot IDB→фолбэк LS v4» (звучит как A: IDB читаем ПЕРВЫМ при загрузке), и
  «dual-write (LS-зеркало)» (звучит как B: LS остаётся первичным, IDB —
  зеркало). Это НЕ решено — спросить юзера в начале Этапа 4, до кода.
- **Готовый ПРЕЦЕДЕНТ в этом же файле — копировать форму:** `_migrateV3toV4()`
  (`01-core.ts:1082`) уже делает ИДЕНТИЧНЫЙ паттерн («новый ключ пуст → проверить
  старый ключ → если есть, снять RAW-снапшот в `K_PREMIGRATION` (сделать
  ОДИН раз, если такого снапшота ещё нет) → смигрировать → писать в новый
  ключ → старый ключ НЕ трогать»). `dusk_premigration_ls_v4` (Этап 4) —
  прямой аналог `K_PREMIGRATION` (Idea 8). Значит структура кода для миграции
  LS→IDB уже один раз написана в этом же файле — не с нуля.
- `idb-keyval` ещё НЕ установлен (нет в package.json deps) — первым шагом
  `npm i idb-keyval`.
- Синк-движок (`09-sync.ts`) хранит СВОИ мелкие LS-ключи отдельно
  (`K_SYNC_BASELINE`/`K_SYNC_PREMERGE` = `dusk_sync_baseline_v1`/
  `dusk_sync_premerge_v1`) — они маленькие (не растут с картинками), скорее
  всего вне периметра Этапа 4, но не решено окончательно — пункт для того же
  уточняющего вопроса юзеру.

**Порядок действий на старте Этапа 4:** сначала спросить юзера про развилку
A/B выше (AskUserQuestion, не гадать) → потом `npm i idb-keyval` → написать
`_migrateLSToIDB()` по образцу `_migrateV3toV4()` → хук в `saveState()` →
хук в `loadState()`/`init()` по выбранному варианту → `dusk_premigration_ls_v4`
снапшот ДО первой миграции → `navigator.storage.persist()` разово при
успешном IDB-boot → vitest(8/8)+build+boot-smoke на каждом шаге, как в Этапе 3.

### Playbook ренейма ОДНОГО файла (повторить для 02 и 04)
1. `git mv dusk/NN-name.js dusk/NN-name.ts`
2. Прогнать скрипт `ts-rename.mjs` из scratchpad-директории сессии
   (`.../scratchpad/ts-rename.mjs`, аргумент — basename без расширения):
   чинит импорт в `src/main.js`→`.ts`, генерит `declare var X: any;`-блок под
   строкой `// ── ES-module bridge (migration 2a), part 1` для каждого
   `globalThis.X = ...` в файле, выпиливает мёртвый `module.exports`-футер.
   **Если скрипта нет в новой сессии** — пересоздать по этому описанию
   (тривиальная node-регулярка, ~40 строк, была в переписке).
3. `npx tsc --noEmit` → разбирать ошибки пачками через node -e с sed/replace
   по регуляркам (см. фикс-идиомы ниже). НЕ переписывать логику вручную —
   только типовые аннотации/касты, ноль изменений в поведении.
4. Когда `tsc --noEmit` чист: `npm test` (ожидать 8/8) + `npm run build`
   (ожидать зелёный, размер app.js не должен скакать сильнее ~0.1kB).
5. Boot-smoke на dist: `node .../scratchpad/smoke-dist.mjs` (headless Chrome
   через playwright-core из `D:/tmp/pw/node_modules`) — ждать `PAGE ERRORS (0)`,
   `ADD TASK: true`, `PERSISTED AFTER RELOAD: true`.
6. `git add -A && git commit` (conventional `refactor(3.N): dusk/NN-x.js → .ts`,
   тело = краткий список применённых фикс-идиом, `Co-Authored-By` трейлер) →
   `git push origin refactor/sync`. version.json НЕ бампать (чистый ренейм,
   ноль изменений рантайма — юзеру нечего тостить).

### Fix-идиомы (повторяются в каждом файле — применять как есть)
- **Слоты, объявленные в ДРУГОМ ещё-JS модуле** (напр. 06/07 владеют
  `bulkDeadlineActive`/`formSubtasks`/`mainSelectMode` и т.п., а .ts-файл их
  ПРИСВАИВАЕТ): TS больше не видит их как global var (только .js-файлы дают
  authoring-global inference) → нужно `globalThis.slotName = ...` вместо
  голого `slotName = ...` в месте присваивания (не объявления!). Обычная
  причина ошибок `TS2539 Cannot assign to 'X' because it is not a variable`.
- **`declare var X: any;`** — для слотов, которыми файл ТОЛЬКО пользуется
  (не присваивает первым), если генератор их не поймал (напр. слот
  присваивается несколькими именами через `let a=null, b=null;` в одну
  строку — генератор берёт только последнее имя, остальные добавлять вручную).
- **`document.getElementById('lit')` консты** → `as HTMLInputElement`/`as any`
  сразу при объявлении (не на каждом использовании).
- **`.querySelectorAll('sel')`/`.querySelector('sel')`** → дженерик
  `<HTMLElement>` ТОЛЬКО когда приёмник уже типизирован (напр. `document.`);
  если приёмник сам `any` (напр. `wrap`/`item`/`inner` — параметры функций без
  типа), дженерик даёт `TS2347 Untyped function calls may not accept type
  arguments` — тогда СТРОГО без дженерика, доверять инференсу `any`.
- **`e.target`/`ev.target` в обработчиках** → `(e.target as any)` или
  `as HTMLElement` перед `.closest/.dataset/.classList/.style`.
- **`(window as any)._seamName`** для legacy window-хуков между ещё-не-типизированными
  модулями (`_weekdayPickerSet`, `_monthPickerSet`, `_closeGroupPicker` и т.п.).
- **`function f(event) {}` вызываемая где-то как `f()`** (типично closeXModal-семейство)
  → `function f(event?) {}` (опциональный параметр, ноль изменений в теле).
  Часто чинит СРАЗУ 5-10 ошибок разом (все нольарные вызовы одной функции).
  Аналогично для функций с 2 параметрами, вызываемых с 1.
- **`_undoFormSnapshot`/expando-поля на DOM-элементах** (`_collapseCancel`,
  `_armed`, `_armTimer`, `_noteCancel`, `_trapHandler`, `_returnFocus` и т.п.)
  → `(el as any)._fieldName` при чтении/записи.
- **Дубликат-ключи в объектном литерале** (`TS1117`) — если один и тот же
  ключ задан дважды в одном `{...}` (напр. заглушка `tasks: []` в дефолтах,
  потом переопределена ниже безусловно) — TS считает это подозрительным
  даже когда JS это легально (last-wins). Убрать ПЕРВОЕ (заглушечное)
  вхождение — рантайм идентичен, т.к. второе всё равно всегда побеждало.
- **`FileReader.onload` → `e.target.result`** типизируется как `string |
  ArrayBuffer` → `as string` (readAsText всегда даёт строку).
- **Класс с полями, назначаемыми только в конструкторе** (напр.
  `SegmentedInput`) → явные `field: any;` объявления перед `constructor`.
- **`new Set()`/`new Map()`/`{}` литералы без начального содержимого** →
  `new Set<string>()`/`Record<string, any>` аннотация в месте объявления
  (TS иначе выводит `{}`/`unknown[]` и ругается на все последующие обращения).
- **Spread в rest-параметр обёртки** (`onEnd: (...a) => onDragEnd(...a)`,
  где `onDragEnd` ещё в JS-файле = untyped) → `(...a: any[]) => (onDragEnd as
  any)(...a)`.
- **`declare const google: any;`** — GIS classic-script глобал (10-cloud.ts).
- **`'toolbar'` const** конфликтует с `lib.dom` `window.toolbar` (`BarProp`) —
  переименовать конст в `toolbarEl`, бриджить под старым именем в конце файла
  (`toolbar: toolbarEl` в globalThis-присвоении).

### Инструменты сессии (пересоздать при отсутствии scratchpad)
- `ts-rename.mjs` — механика ренейма (см. выше), в scratchpad-директории сессии.
- `smoke-dist.mjs` — headless-бут dist через `D:/tmp/pw/node_modules/playwright-core`
  + `C:/Program Files/Google/Chrome/Application/chrome.exe`, статик-сервер на
  случайном порту, пробует `init/state/render/mergeStates/cloudPull` в window,
  жмёт add-task, релоадит, проверяет персист. Держать под рукой на каждый файл.

### После 02/04 (весь Этап 3 закрыт)
Опционально можно снять globalThis-мосты 2a на настоящие import/export (НЕ
обязательно — CLAUDE.md разрешает оставить). Дальше по roadmap: **Этап 4**
(localStorage → IndexedDB блоб через idb-keyval, dual-write, снапшот перед
первым IDB-boot, LS-копия не удаляется) → **Этап 5** (Playwright smoke в репо,
заменяет внешние D:\tmp\pw харнесы) → потом отдельное «go» на Capacitor/Tauri.

## Этап 1 — история (ниже, для контекста)

**Стек-вердикт (залочен, НЕ переспрашивать):** TS ✅, Vite ✅, Vitest ✅;
**Solid ❌** — рендер НЕ переписываем (ручная реконсиляция+SortableJS+contenteditable-Гримуар = макс. регресс при нуле пользы); календарь Idea 5 опционален и может вообще не случиться → фреймворк не нужен;
**Dexie ❌ → `idb-keyval`** (~600Б): стейт остаётся ОДНИМ блобом (синк/undo/baseline оперируют целым стейтом), картинки Гримуара = блобы по uid; апгрейд на `idb` если понадобятся индексы, Dexie только если реально припрёт.
**Фолбэк без сервера:** сборка Vite = классический **iife**-бандл (не module) + `base:'./'` → dist/index.html открывается с диска. **Юзер удалил AGENTS.md** (не восстанавливать).

**Роллбек-точка: тег `v2.2-pre-migration`** (= `0dd365e`, запушен).

## Этап 1 — СДЕЛАН (`b02f305` + `ac022f5`, version.json НЕ бампался — приложение не тронуто)
package.json (vitest ^4.1.9, `npm test`), .gitignore (node_modules/dist), тесты В РЕПО:
`tests/harness/` = порт из D:/tmp/pw с относительными require (sync-merge 39, sync-gc 13, cloud-transport 24, worker-oauth 17), обёртка `tests/harness.test.mjs` (spawn node, assert exit 0);
`tests/drive-format.test.mjs` + фикстуры `tests/fixtures/{sample-state.cjs,drive-subset.json,merged-null-base.json}` — **пин wire-формата Drive** (getSyncSubset/mergeStates/SYNC_COLLECTIONS/LS-ключи); смена формата = красный тест = нужен явный план миграции. Итог 8/8 vitest (93 внутр. ассерта). Merge детерминирован (проверено дважды).

## ✅ РЕВЬЮ ЮЗЕРА ПРОЙДЕНО (2026-07-02): «без регрессов» — Этап 2 ПОДТВЕРЖДЁН на проде. CLAUDE.md ПЕРЕПИСАН под новую архитектуру (шапка+хостинг+roadmap) и закоммичен.

## СЛЕДУЮЩИЙ ШАГ — ЭТАП 3: TypeScript (детальный kickoff)
**Шаг 0 (ОБЯЗАТЕЛЬНО ПЕРВЫМ): портировать tests/harness/*.cjs|mjs в НАТИВНЫЕ vitest-тесты** (import вместо spawn-node): голый node в child-process НЕ умеет require('.ts') → переименование 09-sync.js→.ts сломало бы спавн-харнесы. Vitest сам транспилит TS при import. Заодно убрать обёртку harness.test.mjs. Потом:
1. `tsconfig.json`: loose старт — `allowJs:true, checkJs:false, strict:false, noImplicitAny:false, noEmit:true, target/module esnext, moduleResolution bundler, skipLibCheck`; include dusk/src/tests. Затягивать strict по мере конверсии.
2. `src/types.ts` — интерфейсы рекордов по SYNC-SPEC.md §4 (Task/Subtask/Group/Note/Template/Tombstone/QuarantineEntry/SyncSubset/_alloc). НЕ менять runtime-форму!
3. Переименование по файлу за коммит: **09-sync → 10-cloud → 12-wake → 11-sync-ui → 01-core → 03/04/… по надобности**. При ренейме: поправить import в src/main.js (Vite резолвит .ts), у 09/10 сохранить module.exports-футер (vitest import CJS-паттерна работает) или перевести на export+import.meta-гард.
4. На КАЖДЫЙ файл: `npx tsc --noEmit` + `npm test` + `npm run build` зелёные → commit+push (version.json бампать только если менялся runtime-код, чистые ренеймы+типы не требуют тоста).
5. worker/ НЕ трогать. globalThis-мосты 2a живут до конца Этапа 3 (снимать по мере перевода на настоящие import/export — опционально, можно оставить).
**Проверка регрессов**: браузерная батарея из D:\tmp\pw против dist (ROOT-подмена, как делалось: копии с `.Replace("'D:/VSCode projects/DUSK_v2.0'", ".../dist'")`); ключевые: _audit3test 103, _7c4test 19, _synclive 18, _syncuilive 17, _reconcile 5, _subfilter 5, _updatetest 8, _pentest 6; swtest 8/10 — норма (2 ассерта старого дизайна); hotkeyS 9/10 и tokenpersist-краш — старые поломки (не чинить в рамках Этапа 3). После Этапа 3 → Этап 4 idb-keyval → Этап 5 Playwright в репо → (по «go») Capacitor/Tauri.

## ЭТАП 2 ЦЕЛИКОМ ЗАКРЫТ (2026-07-02): прод НА VITE-СБОРКЕ
Юзер флипнул дашборд (build `npm ci && npm run build`, output `dist`) → превью migrate-vite проверен headless (Vite-бандл, 0 ошибок) → **merge `0fd1ca4` в refactor/sync, прод живой**: headless-проба dusk-du4.pages.dev = build `2026-07-02-2`, app.js-бандл, pen-asset, SW registered, cloudCfg true, глаз синка, 0 pageerrors. **2d СДЕЛАН (`c98f13f`): `npm run build:portable` → dist/dusk-portable.html (~1.4 МБ)** — весь JS/CSS/фон/перо инлайном, работает с диска file:// (инлайн-module не фетчит → CORS не мешает; secure context на file:// есть → uuid ок; SW/тост молча деградируют; данные в localStorage file://-origin → перенос через экспорт/импорт). Проверен headless с file://: 0 ошибок, add+persist. Заметка: bg-gothic.jpg на самом деле 284КБ (2.3МБ в CLAUDE.md устарело). Ветка migrate/vite слита, дальше можно работать на refactor/sync или новой ветке. **СЛЕДУЮЩИЙ ЭТАП: 3 — TypeScript** (tsconfig loose→строже; порядок: src/types.ts по SYNC-SPEC §4 → 09-sync → 10-cloud → 12 → 11 → 01-core → остальное; `tsc --noEmit`+vitest на каждый файл; worker/ не трогать). Потом Этап 4 idb-keyval, Этап 5 Playwright в репо.

## Этап 2b/2c — детали реализации (`0fd1ca4`, version `2026-07-02-2`)
Vite 8.1.3 (rolldown): `src/main.js` = единственный вход (side-effect импорты 12 dusk-модулей в старом порядке тегов — порядок = несущий контракт); `src/sortable-global.js` ставит npm sortablejs@1.15.2 в `globalThis.Sortable` ДО dusk-модулей (тело entry исполняется ПОСЛЕ его deps — присвоение в main.js сработало бы поздно!); CDN-тег Sortable удалён; статика в `public/` (version/manifest/иконки/bg/pen-asset/sw/_headers); **стабильные имена** `app.js`/`style.css` (assetFileNames-колбэк — иначе CSS выходил `index.css` и ломал прекэш sw!); sw.js: CACHE **v8**, CORE=бандл, jsdelivr-ветка удалена; `base:'./'`. Vite уносит entry-тег в `<head>` (deferred → эквивалентно). Ворнинги билда ок: pen-asset classic (намеренно), bg-gothic runtime-resolve (public), `::highlight` — lightningcss ворчит, но правила ВЫЖИВАЮТ (проверено в dist). Тесты против **dist**: smoke 0 ошибок, audit3 103/103, 7c4 19/19, reconcile 5/5, subfilter 5/5, synclive 18/18, syncuilive 17/17, update 8/8, pentest 6/6; swtest 8/10 — 2 фейла ассертят СТАРЫЙ дизайн (CDN+v7), не регрессии; dev-сервер headless 0 ошибок. **Дашборд Pages (делает юзер, ДО merge):** Settings→Build: command `npm ci && npm run build`, output `dist`; после флипа прод-пуши падают билдом (нет build-скрипта на refactor/sync) → сайт живёт на последнем успешном деплое до merge — это штатно. После флипа: Retry deployment на превью migrate/vite (или пустой коммит) → проверка превью → merge. Потом опционально 2d: portable single-file сборка (vite-plugin-singlefile) = фолбэк «с диска».

## Этап 2a — СДЕЛАН (`4540230`, version `2026-07-02-1`), ОДОБРЕН юзером, ВМЕРЖЕН в refactor/sync (прод, raw-ESM без сборки)
12 dusk/*.js теперь `<script type="module">` с ТОЧНОЙ classic-семантикой: 140 top-level `let/var` → `globalThis.*` (один слот — нет split-brain); функции — мост `Object.assign(globalThis,{…})` В НАЧАЛЕ файла (= classic hoisting; init() из 08 на верхнем уровне лезет в имена 08 через глобал); const/class — мост В КОНЦЕ (TDZ); 09/10 код не тронут (только мосты) → node require цел. **Грабли трансформации (не повторять):** (1) JS-regex `.`/`$` НЕ матчят `\r` → CRLF-файлы молча не матчились (11/12 LF-новые — матчились); (2) запятая в `//`-комменте попадала в имена моста (`taken`,`then` → мост кидал ReferenceError → каскад по всем файлам); (3) запятая в строковом литерале рвала splitTop — нужен quote-aware; (4) мост функций ОБЯЗАН быть сверху, снизу ломается load-time init(). Скрипты: scratchpad `transform-2a.mjs`/`analyze-globals.mjs`/`smoke-2a.mjs`. Тесты: vitest 8/8, smoke 0 ошибок+add+persist, батарея: audit3 103/103, 7c4 19/19, reconcile 5/5, subfilter 5/5, synclive 18/18, syncuilive 17/17, update 8/8, authui3 9/9, pentest 6/6, sw 10/10, idea8 31/33 (2 file://-фейла ОЖИДАЕМЫ — модули не работают с file://, фолбэк вернётся как iife-dist в 2c). `_hotkeyS` 9/10 и `_tokenpersist`-краш ВОСПРОИЗВОДЯТСЯ на v2.2-pre-migration = старые поломки worker-redirect-авторизации (наследник _authui3 зелёный), НЕ регрессии. **Превью:** migrate-vite.dusk-du4.pages.dev (build=none → raw ESM работает; синк-логин там НЕ работает — чужой origin). После ОК юзера: merge 2a → refactor/sync (прод ещё без сборки), потом 2b/2c.

## Дальше по порядку (каждый этап = зелёные тесты → мелкий commit+push)
- **Этап 2 — Vite cutover (продолжение на `migrate/vite`):**
  2b `src/main.ts` импортирует в старом порядке; SortableJS CDN→npm (та же 1.15.2); статика (version.json, manifest, иконки, bg, pen-asset.js, sw.js, _headers) → `public/`; GIS-тег остаётся внешним;
  2c build со СТАБИЛЬНЫМИ именами (app.js/style.css, без хэшей, iife) → sw.js меняется минимально (CORE_ASSETS список + CACHE v8), стратегия сеть-first НЕ трогается; version.json остаётся в корне+no-store → тост цел;
  2d **порядок Pages (юзер, ему нужна пошаговка):** СНАЧАЛА дашборд build=`npm ci && npm run build`, output=`dist` (упавший build НЕ роняет прод — Pages отдаёт последний успешный) → пуш migrate/vite → превью-URL (синк-логин там НЕ работает, чужой origin — ок) → merge в refactor/sync;
  2e убрать globalThis-мосты пофайлово.
- **Этап 3 — TS инкрементально:** tsconfig loose→строже; порядок: `src/types.ts` (рекорды по SYNC-SPEC §4) → 09-sync → 10-cloud → 12-wake → 11-sync-ui → 01-core → остальное; `tsc --noEmit` + vitest после каждого файла; worker/ НЕ трогаем.
- **Этап 4 — LS→IndexedDB блоб** (idb-keyval): boot IDB→фолбэк LS v4→миграция; двойная запись (LS-зеркало); LS-копия НЕ удаляется; снапшот `dusk_premigration_ls_v4` перед первым IDB-boot; `navigator.storage.persist()`; Drive-формат не меняется. Разблокирует картинки Гримуара.
- **Этап 5 — Playwright-smoke в репо** (boot, add task, reload-персист, оффлайн-boot, синк с моками; образец серверной обвязки = D:/tmp/pw/_authui3_test.mjs).
- Потом (отдельное «go»): Capacitor/Tauri (Vite уже готов).

## Правила этапов
Big bang запрещён (аргументировано юзеру, принято). Не трогать в ранних этапах: worker/, style.css, разметку index.html (кроме script-тегов в Э2), логику 09-sync, стратегию sw.js. version.json бампать только когда меняется само приложение. Полный прогон юзером на dusk-du4.pages.dev до закрытия этапа. Связано: [[sync-phase3-spec]], [[auto-commit-push-after-work]].
