---
name: idea8-datalayer-done
description: "GATED шаг 1 (Idea 8 data-layer uuid+updatedAt+tombstones+миграция v3→v4) РЕАЛИЗОВАН+ПРОТЕСТИРОВАН, ждёт ревью пользователя (не закоммичен)"
metadata: 
  node_type: memory
  type: project
  originSessionId: 49d2d2c1-f861-401d-a1a8-cf9ec6083ff1
---

2026-06-26: стартовала GATED рефактор-стадия (пользователь дал «go»). Сделан ТОЛЬКО
шаг 1 — Idea 8 data-layer. Изменён только `app.js` (uncommitted, ветка `refactor/sync`).
НЕ продолжать в 7c split / синк без отдельного «go». См. [[version-v2-branch-refactor-sync]].

**Решения по развилкам (заданы пользователем):**
- updatedAt — **задача = атом мержа**: один `updatedAt` на задачу (бамп при любой правке,
  вкл. подзадачи), у подзадач свой `uid` но БЕЗ updatedAt; группы несут свой updatedAt.
- Охват: **задачи + группы + подзадачи** на `uid`. Заметки Гримуара не трогаем (уже uid/updatedAt).
- Tombstone — на **любое окончательное удаление** (вкл. очистку Склепа). Чистку tombstone
  НЕ делаем сейчас (решить на синк-стадии).
- Формат — **epoch-ms** (`Date.now()`), `uid` через существующий `uid()` (crypto.randomUUID + fallback).
- **Design B (выбран пользователем):** `uid` = идентичность для синка; старый int `id`
  ОСТАЁТСЯ локальным DOM/onclick-ключом. → НОЛЬ правок в onclick/parseInt/DnD, нет
  пересечения с отложенным 7c. Чистка int id уйдёт в 7c. (Полный id→uuid отвергнут:
  тянул кавычки в ~80 inline-onclick = работа 7c.) Поэтому scheduleModeGroups/focusGroup/
  sortModeOverrides (ключ = int id групп) работают без миграции.

**Как реализовано (ключевое в app.js):**
- Ключи: `K_STATE_V4='duskState_v4'` (активный), `K_STATE_V3` заморожен как fallback,
  `K_PREMIGRATION='dusk_premigration_v3'` (одноразовый сырой снимок v3 перед миграцией).
  `loadState`: v4 если есть, иначе `_migrateV3toV4()` (читает v3, снимает premigration-бэкап,
  migrateTasks+normalizeState, пишет v4, v3 НЕ трогает), иначе migrateFromOld.
- **updatedAt — авто-бамп диффом контента в `saveState()`** (`bumpUpdatedAt`), НЕ ручной
  touch() (нельзя пропустить мутацию). `_recSig` = подпись контента по uid (без таймстампов).
  `primeRecSig()` зовётся в КОНЦЕ `normalizeState()` → re-prime после каждого свопа
  (load/undo/redo/import/restoreBackup все идут через normalizeState) → undo не «трогает» в now.
- Tombstone — `state.tombstones=[{uid,type,parentUid,deletedAt}]`, `addTombstone()`. Точки:
  clearAll, deleteGroup(+задачи), deleteFromArchive, clearArchive, deleteSubtask, deleteTaskForever,
  bulkDelete, demoteTask(задача исчезла). НЕ tombstone: removeTask/restore*/bulkArchive (это
  перемещение в archive), promoteSubtask (трансформ, бамп родителя покрывает).
- merge-import переписан: дедуп по `uid` (ре-импорт того же бэкапа больше не дублирует),
  `gidMap` корректно ремапит groupId деднутых групп. int-offset теперь только локальный
  DOM-аллокатор. LWW-обновление существующих — на синк-стадии («ask on conflict»).
- uid/createdAt/updatedAt проставлены во ВСЕХ создателях: addTask, createTaskFromTemplate,
  duplicateGroup(+группа+подзадачи), duplicateTask, promoteSubtask, addSubtask, demoteTask,
  createGroup, legacy old-HTML импорт (+normalizeState). migrateTasks бэкфилит uid/updatedAt
  задачам+подзадачам (идемпотентно), normalizeState — группам + tombstones[].

**Тесты (D:\tmp\pw, node D:/Soft/Node/node.exe, системный Chrome):**
- `_idea8test.mjs` — **33/33**: миграция v3→v4, v3 untouched, premigration-бэкап, uid/updatedAt
  на всех записях, сохранность счётчиков/текстов, идемпотентный reload (uid стабильны, нет
  ложного бампа), авто-бамп updatedAt (правка задачи/подзадача→родитель), tombstone (delete/
  archive-не-tombstone/subtask), оффлайн file://.
- audit3 регресс `_audit3test.mjs` — **103/103** (=baseline до правок → ноль реальных
  регрессов). ВАЖНО: пришлось пофиксить сам харнесс — он шарит один browser-context и
  пере-сидит v3 на каждой странице; протёкший v4 затенял новый сид. Добавлен
  `removeItem('duskState_v4')+('dusk_premigration_v3')` в addInitScript seed(). Все 3 mjs
  харнесса (`_idea8test`,`_audit3test`,`_pentest`) обновлён ROOT `DUSK_1_86`→`DUSK_v2.0`.
- оффлайн `_pentest.mjs` — **6/6**.

**Статус:** ЗАКОММИЧЕН+ЗАПУШЕН `05ca7a4` → origin/refactor/sync (пользователь проверил живьём, дал «коммить»). Шаг 1 закрыт. Дальше — 7c split / синк только по отдельному «go».
