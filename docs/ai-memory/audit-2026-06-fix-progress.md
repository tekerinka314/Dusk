---
name: audit-2026-06-fix-progress
description: DUSK audit-fix stage is in progress — read repo AUDIT-FINDINGS.md to resume
metadata: 
  node_type: memory
  type: project
  originSessionId: 22a751be-f6c8-478d-80fd-264f35d788e9
---

The June 2026 DUSK code audit (4 stages: UI/animations, product, correctness/data, code/perf/PWA/security)
is complete; the FIX stage is in progress on branch `fix/ui-repeat-meta-subtasks` (pushed to `origin` =
github.com/tekerinka314/Dusk).

LATEST (committed `f4064c1`, pushed): a user-driven **UI polish pass** (3 feedback rounds, outside the audit
registry) — toolbar dark bg + brighter cluster labels; **select-bar fully redesigned** into toolbar-style
square icon clusters in one centred row; visual-only select checkbox (row toggles); colour modal **form-mode**
+ symmetric 6×2 form picker with a fill-on-pick custom-spectrum crystal; gothic icons ("Без цвета" = struck
crystal in modal / crossed swords in form); colour↔priority mutually exclusive; task stripe 3px with a
**left-only glow** (`--stripe-glow: -5px 0 5px -5px`, negative spread = no top/bottom bleed). Verified in a real
browser via [[dusk-headless-screenshot]]. NOTE: `bg-gothic.jpg` is `M` in the tree from BEFORE this session
(origin unknown) — left uncommitted.

The authoritative handoff is committed in the repo at **`AUDIT-FINDINGS.md`** (commit `eb16af5`) — open it
FIRST to resume. It contains: full findings registry with status marks, the execution journal (commits
`9af225f`→`dfeccef`), what remains (P-B/P-C/P-D features, U-1/U-2/U-3 unification refactors, S1-6/S1-7/S1-8
polish, G4-1 WebP, G4-5 dead-code), the verified-correct list (do NOT re-audit), and resume rules.

How the user wants this work done: fix autonomously in blocks, each block = its own commit (with the
`Co-Authored-By: Claude Opus 4.8` trailer) + push to origin; run `node --check` before committing; re-verify
each finding in code/browser before fixing (this already reclassified G4-7 as "not a bug" and narrowed P-A
to redo-only); the user reviews every visual change himself in the running app. Do NOT start Phase E
(Idea 8 uuid/updatedAt/tombstones, Google Drive sync, Capacitor/Tauri) without an explicit separate go.

**2026-06-14 — утверждённый порядок ближней разработки:** A Гримуар (этап 1b мультивыбор → 2 организация+таблицы → 3 продвинутое; **этап 4 картинки+IndexedDB ВНЕ прохода A — отдельный отложенный план, только с явного «go»**) → B хвост аудита (P-E дедлайн подпунктов, S1-6 тайминги) → C рефактор-кластер U-1 modal-controller→U-2 фабрика дропдаунов→U-3 единый collapse (нужен отдельный «го») → D Фаза E (Idea 8 uuid/tombstones → split → Google Drive sync → Capacitor/Tauri, запрещено без явного «го»). **G4-1 (перекодировка bg в WebP) — ОТМЕНЕНА пользователем, не делать, из реестра вычищена.**

**2026-06-19 — решения направления (Этап 3 Гримуара ЗАКРЫТ, коммит `8933e13`):** пользователь
выбрал «доделать хвост аудита ДО синка, кроме синк-подготовки». БЕРЁМ в этот заход: рефактор-
кластер **U-1** (modal-controller, поглощает S1-3) → **U-3** (единый collapse=6a, поглощает S1-6) →
**U-2** (фабрика дропдаунов, поглощает S1-10/G4-6) → фича **P-E** (дедлайн подпунктов).

**U-1 ГОТОВ + ПУШ (коммит `5ccb309`, 2026-06-19).** Изгои color-filter/import-choice переведены на
openModalWithFocus/closeModalWithAnim (фокус-трап/возврат/exit-аним/aria) = закрыт **S1-3**. Реестр
`MODAL_CLOSERS`(12) + `dismissModalById` + ОДИН делегированный backdrop-слушатель вместо 12 inline
onclick (шаг к 7c). Esc теперь через реестр → не пропускает cleanup. import-choice backdrop-close
УБРАН (по выбору юзера; Esc+кнопки остаются). + 2 UX-нюанса юзера: цвет-фильтр выбор авто-закрывает
модалку; кнопки импорта в один ряд (nowrap, 340→380px) + описание 13→15px. Тест-харнесс в
`D:\tmp\pw`: `_u1modals.js` (структурный baseline→after, 13 модалок, 11 рабочих 0 изменений),
`_u1flows.js` (цвет-фильтр+импорт-кнопки). **NB:** в index.html осталось 10 `onclick="closeX()"` —
это footer-кнопки «Отмена/Закрыть» (не backdrop), их перевод = часть 7c (отложено).

**U-3/S1-6 ГОТОВ + ПУШ (коммит `65b23aa`, 2026-06-19).** Объём = ТОЛЬКО тайминги (юзер выбрал; НЕ
переводить на grid-rows — risk DnD-ghost в группах + клип выпадающих пикеров формы при overflow:hidden).
Новый токен `--dur-collapse: 280ms`; 11 collapse-блоков сведены на `var(--dur-collapse) var(--ease-gothic)`
(было 0.22–0.42с + 3 easing): extra-fields, group-body, archive-month-body, subtask-section,
sub-note-wrapper, task-note-wrapper, split active/done/pinned, sub-split active/done. Вне scope: qa-hint,
fmt-bar Гримуара. Чистый CSS, JS не тронут (fallback onMaxHeightEnd 600ms > 280ms). Тест `D:\tmp\pw\_u3.js`
(финишеры extra-fields→none, group→unlocked отработали; NB: ждать >600ms из-за 0-height артефакта
харнесса). **AUDIT-FINDINGS.md в репо НЕ отмечен** (S1-3/S1-6/U-1/U-3 →done) — обновить при сл. коммите.

**U-2/G4-6 ГОТОВ + ПУШ (коммит `14940e9`, 2026-06-19).** Объём = ТОЛЬКО G4-6 (юзер выбрал; полную
фабрику createGothicSelect / S1-10 НЕ делать — высокий риск, видимой пользы 0, как 7c). 4 постоянных
per-picker document-click слушателя сведены в ОДИН делегат: реестр `_gothicPickers` +
`registerGothicPicker(picker, closePicker)` + один `document.addEventListener('click')` (closePicker
каждого — no-op когда закрыт → делегат зовёт безусловно). Переведены group/month/weekday/form-weekday.
Логику open/close/keyboard/open-up НЕ трогал. Пикер дня недели repeat-модалки (pointerdown/classList)
оставлен со своим. **S1-10 ОСТАЁТСЯ открытым** (дедуп init-кода пикеров). Тест `D:\tmp\pw\_u2.js`
(month/weekday реальными кликами) + синтетика всех 4 (registrySize=4, open-on-trigger + close-on-outside).

**Доработка повтор-модалки + ПУШ (коммит `2271dc9`, 2026-06-19):** «Нет» спанит обе
колонки как off-switch бар (горизонт.) + 4 каданса в 2×2 (убрана асимметрия); пикер дня
недели repeat-anchor (#repeat-wd-picker) отзеркален — фиолет дефолт / белый ховер.

**P-E ЖИВЫЕ подзадачи ГОТОВ + ПУШ (коммит `4a6ace7`, 2026-06-19).** Полный паритет:
все 6 режимов через ту же deadline-модалку (editingSubId, как openSubRepeatModal).
openDeadlineModal(taskId,bulk,subId) subId-путь; confirmDeadline+applyDeadline ветвятся
на editingSubId; weektime зеркалит V-7 (авто sub.repeat=weekly+anchorDay). Дисплей:
всегда-видимая иконка-статус IC.window (цвет+пульс) в строке = клик-правка; muted
set-кнопка в .sub-actions когда дедлайна нет; мини-pill отсчёта раскрыв. по hover под
строкой (grid-rows 0fr↔1fr как заметка), КЛИКАБЕЛЕН→модалка (как бейдж задачи), inline
clear (stopPropagation). updateDeadlineBadges: 2-й проход по .subtask-item (живой тик).
promote/demote переносят дедлайн; clearSubDeadline+pushUndo. DnD filter дополнен
.sub-deadline-badge/.sub-deadline-wrapper. dormant у checked. Палитра=--deadline-*/
pulseCritical. Тесты D:\tmp\pw\_pe.js (6 режимов/weektime-авто/clear/promote/pill-click/
dormant/task-regress) — PAGEERRORS none. Скрин в headless пустой (0-height артефакт) —
ВИЗУАЛ юзер смотрит сам в живом app.

**P-E ФОРМ-подзадачи + доводка ГОТОВ + ПУШ (коммит `f69f20d`, 2026-06-19).** P-E ПОЛНОСТЬЮ
закрыт (живые + форм). Форм-подзадачи: openDeadlineModal получил 4-й параметр formSubIdx
(флаг `_formSubDeadlineIdx`, перехват ПЕРВЫМ в confirmDeadline weektime + applyDeadline,
как _formSubRepeatIdx); openFormSubDeadline/clearFormSubDeadline; renderFormSubtasks с тем
же бейдж/set/pill UI; newSubtasks.map переносит deadline при addTask. Доводка живых:
мини-pill кликабелен→модалка (role=button+Enter/Space, clear через stopPropagation,
cursor+focus-ring); updateDeadlineBadges «спящий» статус у выполненных. ФИКС задач (баг
юзера): крестик-clear дедлайн-пилла не краснел на hover — per-variant
:has(.deadline-tag.*) .btn-tag-clear (0,4,0) перебивали generic hover по source-order;
добавлено правило (0,5,0) ПОСЛЕ → ✕ всегда danger на hover. Тесты D:\tmp\pw\_pe.js (живые)
+ _pef.js (форм) — PAGEERRORS none.

**AUDIT-FINDINGS.md В РЕПО ОТМЕЧЕН (коммит `d6e41b9`):** U-1/S1-3, U-3/S1-6, U-2/G4-6,
P-E (живые+форм) → done; S1-10 → частично; журнал+сводка+ОСТАЁТСЯ переписаны. ВЕСЬ
КРАСНЫЙ КЛАСТЕР АУДИТА + P-E ЗАКРЫТ (2026-06-19). Мелкого/обязательного ДО синка не
осталось: S1-9 (заметка), S1-10-остаток/G4-3/7c → к Svelte, P-F → к синку.

СЛЕДУЮЩЕЕ = РАЗВИЛКА НАПРАВЛЕНИЯ (ждёт «go» юзера): (A) опциональный бэклог
([[optional-features-backlog]]: Idea 5 календарь, Idea 2 стрик, Гримуар-фичи) ИЛИ
(B) рефактор/синк-фундамент Фаза E: Idea 8 (uuid+updatedAt+tombstones) → Google Drive
appDataFolder sync → Capacitor(Android)/Tauri(Windows); 7c/Svelte отложено, не блокер.
ОТЛОЖЕНО:
- **7c (+7a)** модульный split + data-action делегирование — **отложен максимально далеко, к Svelte-
  миграции.** НЕ опциональное улучшение, но и НЕ блокер синка: синк стоит на data-layer (Idea 8), не
  на структуре файлов. «Синк сначала, 7c потом» = БЕЗ downgrade (только чуть больше кода разносить
  при split — не деградация). Порядок: Idea 8 → синк → потом 7c со Svelte.
- **Idea 5 календарь, Idea 2 стрик** → в [[optional-features-backlog]] (Idea 5: ценность средняя/
  стоимость высокая).
- **P-F напоминания** — на этап синка (нужен SW/Notification).

Related: [[audit-2026-06-plan]], [[grimoire-notes-plan]], [[optional-features-backlog]].
