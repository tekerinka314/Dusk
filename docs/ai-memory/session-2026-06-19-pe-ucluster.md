---
name: session-2026-06-19-pe-ucluster
description: Хэндофф к полному аудиту проекта — что свежего изменено (P-E дедлайн подпунктов + U-рефакторы) и где тест-харнесс
metadata: 
  node_type: memory
  type: project
  originSessionId: 81816d70-3880-4679-add3-9b9f3255a67a
---

Сессия 2026-06-19 закрыла **весь красный кластер аудита июня 2026 + P-E**. Ветка
`fix/ui-repeat-meta-subtasks`, дерево чистое, всё запушено на origin. Следующая
сессия = **полный аудит всего проекта** (по запросу пользователя).

**Для аудитора — где СВЕЖИЙ код (макс. ценность проверки, эти участки новые):**
- **P-E дедлайн подпунктов** (коммиты `4a6ace7` живые + `f69f20d` форм). Самое крупное и
  новое. Трогает: `confirmDeadline`/`applyDeadline` (ветвление `editingSubId` +
  `_formSubDeadlineIdx`), `openDeadlineModal` (4-й параметр `formSubIdx`),
  `buildSubtaskItemHTML`/`renderFormSubtasks` (бейдж/set-кнопка/hover-pill),
  `updateDeadlineBadges` (2-й проход), `promoteSubtask`/`demoteTask` (перенос дедлайна),
  `clearSubDeadline`/`clearFormSubDeadline`, DnD-filter, CSS `.sub-deadline-*`.
  ВНИМАНИЕ при аудите: weektime→авто sub.repeat=weekly; взаимодействие дедлайна с
  cycleChecked/checkCycleResets у подпунктов; импорт/миграция sub.deadline (миграции НЕ
  делал — поле новое, легаси нет); шаблоны/архив с sub.deadline.
- **U-1** (`5ccb309`) modal-controller: `MODAL_CLOSERS`+`dismissModalById`+один backdrop-делегат.
- **U-2/G4-6** (`14940e9`) `_gothicPickers`+`registerGothicPicker` (один outside-click делегат).
- **U-3/S1-6** (`65b23aa`) `--dur-collapse` на 11 collapse-блоках.
- **Повтор-модалка** (`2271dc9`) «Нет» off-switch + 2×2 + зеркальный пикер дня.

**Старый аудит:** репо `AUDIT-FINDINGS.md` — реестр июня 2026, почти закрыт. Читать,
но НЕ переделывать сделанное. Красный кластер + P-E там отмечены done; остаток (S1-9,
S1-10-фабрика, G4-3, P-F, 7c) отложен к Svelte/синку.

**Тест-харнесс (переиспользуй для аудита):** `D:\tmp\pw` — Playwright + системный Chrome
(`C:\Program Files\Google\Chrome\Application\chrome.exe`), Node `D:\Soft\Node\node.exe`,
playwright-core стоит. Паттерн: мини http-сервер отдаёт корень репо + `chromium.launch
({executablePath:CHROME,headless:true})` + `addInitScript` сеет `duskState_v3`. Примеры:
`_pe.js` (живые подпункты), `_pef.js` (форм). **Артефакт headless:** task/subtask-items
рендерятся с 0 высотой → реальный hover/скрин не работают; функц. проверки делать через
`evaluate` на state+DOM, не на layout. Скрин-рецепт — [[dusk-headless-screenshot]].

**Дальше после аудита** — развилка (ждёт «go»): (A) опциональный бэклог
[[optional-features-backlog]] ИЛИ (B) Фаза E: Idea 8 (uuid+updatedAt+tombstones) →
Google Drive sync → Capacitor/Tauri. Подробности — [[audit-2026-06-fix-progress]].
