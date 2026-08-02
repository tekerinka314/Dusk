---
name: render-reconciliation-flicker-fix
description: Bug B мерцание списка ПОЛНОСТЬЮ закрыто — in-place reconciliation во всех режимах задач + подпункты (коммит c1184e8)
metadata: 
  node_type: memory
  type: project
  originSessionId: 49d2d2c1-f861-401d-a1a8-cf9ec6083ff1
---

2026-06-27. **Мерцание списка при чеке/любом действии ЗАКРЫТО.** Коммит **`c1184e8`** → origin/refactor/sync (после Bug A pen-sound `df75178`).

**Root cause** (не симптом): каждый рендер сносил DOM `innerHTML=''` и строил заново → вспышка карточек/подпунктов/рамки группы на КАЖДОМ действии, независимо от позиции задачи. Было в `renderTasks`, `appendSplitSection`, `appendScheduleSection`, `renderSubList`. Узловой reuse (_liCache/_subCache) НЕ помогал — узлы всё равно отцеплялись+вставлялись. Решение = **in-place reconciliation** (неизменные узлы не трогаются).

**Архитектура (dusk/03-render.js):**
- `_reconcile(parent, desired)` — приводит детей к списку без detach уже-стоящих.
- Рамка группы `.group-section` переиспользуется по `groupId` (`_secCache`) → кадр с blur не сносится. Шапка правит счётчик точечно (`_structSig` + `.group-count`.textContent).
- Helpers: `_ensureKeyed` (zone ul/sep по `data-zonekey`), `_ensureSplitZone` (header+wrap+body), `_pinnedNodes`, `_splitZoneNodes`. Рендеры: `_renderSplitBody` (split актив/выполнено), `_renderScheduleBody` (по дедлайну), `_renderScheduleSplitBody` (combo). **ВСЕ режимы реконсилятся:** обычный, split, schedule, combo; группы И ungrouped.
- Хитрость: каждый режим строит массив `desired` нод → один `_reconcile(container, desired)`; зоны переиспелзуются → карточки внутри не отцепляются.

**Подпункты (dusk/04-tasks.js):** `renderSubList` реконсилит ряды (норм. 2-кол сетка + split-зоны актив/выполнено) через `_subItemNode` + `_ensureSubZone`. Общий **`data-sig`** в `buildSubtaskItemHTML` (хеш `_hashStr`) — ряды из ПЕРВОГО рендера (через buildSubtaskSection) тоже переиспользуются, не только после второго. Путь чека подпункта: toggleSubtask→(_animateSubThenRefresh|render если parent auto-(un)check pc!=0)→refreshSubtaskList→renderSubList.

**Скрытый баг, вскрытый reuse (dusk/05-edit-notes-groups.js):** `initSubSortable` навешивал hover-листенеры заметок на КАЖДОМ рендере → на переиспользуемых рядах копились. Фикс: bind один раз (`item._hoverBound`). teardown-рендеры этим НЕ болеют (старые узлы → GC).

**sw.js:** CACHE `dusk-shell`→`dusk-shell-v2` (переустановка SW). Урок: DevTools «Disable cache» НЕ обходит service worker (свой Cache Storage) — если «фиксы не применяются», проверять `typeof _reconcile` в консоли, при `undefined` сносить SW (Application→Service Workers→Unregister + Clear site data).

**Тесты (D:\tmp\pw, 0 регрессов):** новые `_reconcileprobe` 11, `_splitprobe` 20, `_subreconcile` 16, `_schedreconcile` 16, `_dndintegrity` 7 (нет дублей Sortable, реордер ок). Регресс: audit3 103, idea8 33, 7c4 19, subreuse 17, subfilter 5, penfield 23, x7 14, x8 16 (#5 флап wall-clock), durwire 14, pentest 6.

**ОСТАВЛЕНО НАМЕРЕННО (не баг):** архив (`renderArchive`), Гримуар (`renderNotes`/`renderGrimList`), бар групп-чипов (`renderGroupBar`) всё ещё `innerHTML=''`. Пользователь визуальных проблем там не видит; польза реконсиляции (скорость/сохранение фокуса/скролла) для них маргинальна — отдельные экраны, действия реже. Трогать только при конкретном симптоме (потеря курсора при правке заметки, тормоза на сотнях заметок). См. [[7c-delegation-progress]].
