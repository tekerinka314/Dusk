---
name: sync-plan-web-first
description: "СЛЕДУЮЩИЙ КРУПНЫЙ ЭТАП — Синк через Google Drive. Полный согласованный план + решения. Кодить в НОВОЙ сессии по kickoff-промпту, начинать с Фазы 1 (движок мержа)."
metadata: 
  node_type: memory
  type: project
  originSessionId: 49d2d2c1-f861-401d-a1a8-cf9ec6083ff1
---

2026-06-27. Спроектирован синк (по запросу пользователя «проектируем, кодим в новой сессии»). **НЕ начато кодом.** Все пререквизиты готовы: Idea 8 data-layer (uid+updatedAt+tombstones, дедуп merge-import по uid) `05ca7a4`, 7c split `f9a3829`, мерцание `c1184e8`. Полиш исчерпан. Это «the real work» по CLAUDE.md. См. [[render-reconciliation-flicker-fix]], [[idea8-datalayer-done]], [[version-v2-branch-refactor-sync]].

## РЕШЕНИЯ ПОЛЬЗОВАТЕЛЯ (зафиксированы 2026-06-27)
- **Порядок платформ: ВЕБ → Android → Windows.** Веб первым.
- **Хостинг веба = GitHub Pages** (`https://tekerinka314.github.io/Dusk/`). Причина: OAuth ЗАПРЕЩЁН с `file://` (нет origin); Pages даёт бесплатный https-origin без сборки (DUSK — статика). Тот же URL = PWA на Android-Chrome → синк на Android почти бесплатно, **Capacitor APK становится опциональным «потом»** (sideload и так достаточно). Windows/Tauri — последним. Localhost = только dev-песочница.
- **Конфликты = 3-way** (baseline + локаль + облако). ⚠️ ОБНОВЛЕНО 2026-06-28 — детали и
  ВСЕ финальные решения в [[sync-merge-decisions]] + `SYNC-SPEC.md`. Кратко: **БЕЗ
  всплывающих окон** (прежнее «спрашивать» ОТМЕНЕНО); авто-дефолт + проигравшее в
  **синканутый карантин-журнал** (висит до выбора, бейдж нерешённого). Слияние по полям
  (задачи/группы), подзадачи-набор, заметки «обе копии». Часы монотонные. Плюс снимок
  локали ПЕРЕД мержем (страховка от бага движка).
- Канал: один файл `dusk-sync.json` в Google Drive **appDataFolder** (приватный, невидим в UI Диска, бесплатно). Scope `drive.appdata`. OAuth = Google Identity Services token flow. Consent в режиме **Testing** + добавить себя/друзей в тест-юзеры (экран «app isn't verified» — норм для личного).
- Требования (CLAUDE.md, жёсткие): не теряем данные (#1), офлайн-first (локаль = источник истины), работает через интернет/моб.данные, ноль серверов/денег, «синк при открытии» (eventual ок). Ручной export/import остаётся как fallback.

## ФАЗЫ (1–4 платформо-независимы, тестятся офлайн/localhost; кодит Claude)
- **Фаза 0 — настройка (ПОЛЬЗОВАТЕЛЬ руками, Claude даёт пошагово):**
  (a) GitHub Pages: Settings→Pages→Source ветка+root. Решить ветку (master после мержа / временно refactor/sync для dev). Проверить SW под подпутём `/Dusk/` (относительные `./`-пути).
  (b) Google Cloud Console: новый проект → включить Drive API → OAuth consent screen (External, Testing) + тест-юзеры (свой email + друзья) → OAuth client ID (тип Web), authorized JS origin = `https://tekerinka314.github.io` (+ `http://localhost:PORT` для dev). Сохранить client_id (публичный, в код можно; client_secret НЕ нужен для token-flow в браузере).
- **Фаза 1 — движок мержа (ЯДРО, без сети, начинать ОТСЮДА):** `mergeStates(base, local, remote)` → 3-way по uid+updatedAt; tombstone выигрывает удаление (deletedAt vs updatedAt); LWW по записи; вернуть список РЕАЛЬНЫХ конфликтов. Хранить локально `baseline` (последнее синканутое состояние) для детекции. Снимок локали перед мержем. Покрытие: задачи/группы/подзадачи/архив/заметки (всё на uid). Тесты офлайн «два устройства» → ноль потерь. 100% тестируемо без Google.
- **Фаза 2 — Drive-клиент (сеть, тест на localhost/Pages):** OAuth (GIS token client, токен в памяти + refresh), appDataFolder REST: найти/скачать/залить `dusk-sync.json` с ETag/версией (optimistic concurrency — не затереть параллельный push). Модуль `cloudSync`: auth/pull/push.
- **Фаза 3 — оркестрация:** на открытии + кнопка «Синк сейчас»: pull→merge→(конфликт? готик-модалка выбора версии)→записать локаль→push с проверкой версии. Офлайн = локаль истина, push в очередь до сети. Готик: индикатор статуса, вход/выход Google. Гот-стиль обязателен.
- **Фаза 4 — закалка:** retry/backoff, тесты двух-устройств + конфликты + офлайн-правки-потом-синк, проверка «смена устройства не теряет данные».
- **Фаза 5 — обёртки:** Android = сперва PWA-install с Pages (проверить OAuth на github.io в Chrome Android); Capacitor APK опционально позже (нативный OAuth/кастом-схема). Windows/Tauri — последним.

## Технические заметки/риски
- `file://` + OAuth = невозможно (нет origin) → поэтому Pages. На Tauri/Capacitor OAuth через кастом-схему/loopback.
- SW scope под `/Dusk/` — относительные пути и регистрация SW должны быть relative; проверить в Фазе 0.
- Idea 8 уже даёт всё для мержа: `state.tombstones`, per-task `updatedAt` (авто-бамп диффом в saveState), uid на задачах/группах/подзадачах, дедуп merge-import по uid. «LWW существующих при импорте» специально отложено в Idea 8 → решается здесь.
- Ветка работы — `refactor/sync` (текущая). Коммит+пуш только по «коммить» (= commit AND push, трейлер Co-Authored-By).
- Тест-харнесс: D:\tmp\pw, node `D:/Soft/Node/node.exe`, системный Chrome, локальный http-сервер, сид через addInitScript (+ removeItem v4/premigration). Движок мержа тестировать чистым node (без браузера) — он pure-logic.

## Точка отката
Тег **`v2.1-stable-pre-sync`** на `c1184e8` (запушен) = последняя стабильная file:// версия ДО синка. Откат сюда, если синк-стадия пойдёт не так. Прежние теги: `v2.0-monolith-pre-split`, `v1.86-stable-core`.

## Старт новой сессии
Пользователь откроет НОВУЮ сессию и вставит kickoff-промпт (выдан в чате 2026-06-27). Начинать с **Фазы 1 (движок мержа)** — безопасно, офлайн, без зависимостей от Фазы 0. Фазу 0 (Pages + Google Cloud) пользователь делает параллельно по инструкции.
