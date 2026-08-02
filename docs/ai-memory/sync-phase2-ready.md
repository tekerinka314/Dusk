---
name: sync-phase2-ready
description: "⭐⭐ СИНК Фаза 2 (Google Drive клиент: auth+транспорт) — ЗАКОДЕНО+ЗАКОММИЧЕНО b9aaa24. dusk/10-cloud.js. Ждёт ручного OAuth round-trip + Pages. Дальше Ф3. ТЕКУЩЕЕ."
metadata:
  node_type: memory
  type: project
  originSessionId: 0a1e223e-b6d1-498e-a433-745713f8b509
---

2026-06-28. Фаза 1 (движок мержа) ЗАКОММИЧЕНА `d88e7dc`. Спроектирована Фаза 2 (сетевой слой
Google Drive). **НЕ закодено** — пользователь делает compact, потом начинаю код (тот же workflow,
что в Фазе 1). Инж.спека = **`SYNC-SPEC-PHASE2.md`** в корне репо — кодить по ней. Расширяет
[[sync-merge-decisions]] / [[sync-plan-web-first]]; setup-пререквизит закрыт в
[[sync-phase0-setup-reminder]].

## Готовые входные данные (от пользователя)
- **Client ID** (публичный, не секрет, в код можно):
  `493121023118-pln1rmhl37q3qi915jhbaqt57a7dkdtv.apps.googleusercontent.com`
- Scope: `https://www.googleapis.com/auth/drive.appdata`. Файл синка: `dusk-sync.json` в
  appDataFolder. client_secret НЕ нужен (browser token flow).
- GitHub Pages: репо делается публичным, публикация с ветки `refactor/sync`, URL
  `https://tekerinka314.github.io/Dusk/`. Origins: github.io + `http://localhost` (если
  localhost OAuth откажет — добавить точный порт в Cloud Console).

## Что Фаза 2 делает (и НЕ делает)
- **Делает:** новый `dusk/10-cloud.js` (грузится ПОСЛЕ 09-sync.js) — UI-less сетевой клиент:
  OAuth через Google Identity Services token-flow (токен В ПАМЯТИ, ~1ч, без refresh — пере-запрос
  при истечении/401), Drive REST по appDataFolder (find/download/create-multipart/update-media),
  оптимистичная конкуренция по полю `version` (перед PATCH сверить version → ConflictError при
  расхождении). API: `cloudAuth/cloudSignOut/cloudStatus/cloudPull→{subset,version,fileId}|{empty}`
  /`cloudPush(subset,{fileId,expectedVersion})`. + тег GIS-библиотеки в `<head>` index.html.
- **НЕ делает:** мерж (это Фаза 1, уже есть) и НИКАКОГО UI/живого потока (это Фаза 3). Клиент НЕ
  трогает `state` — гоняет subset-блоб (формат getSyncSubset + обёртка `{schema,subset,_meta}`).

## Уже сделано в этой сессии сверх Ф1 (закоммитить вместе)
- **Фикс Ф1:** добавлен `./dusk/09-sync.js` в `CORE_ASSETS` sw.js (был пропущен → холодный оффлайн
  не прекэшил бы). 10-cloud.js тоже добавить в CORE при создании.
- Аудит SW/manifest: всё относительное (`./sw.js`, scope `./`, start_url `./index.html`) →
  подпуть `/Dusk/` работает без правок. GIS/googleapis НЕ кэшируются SW (passthrough/bypass).

## Тестирование Ф2 — НЕ полностью headless
OAuth интерактивен (нужен реальный Google-аккаунт + origin + попап согласия). План: Drive-примитивы
гонять с вручную добытым токеном (проба node/консоль), полный round-trip — вручную на Pages (или
fixed-port localhost): два профиля браузера = реальная проверка «два устройства». Ф1 node-тесты +
регрессы держать зелёными (движок не трогаем).

## Статус
**ЗАКОДЕНО + ЗАКОММИЧЕНО `b9aaa24` → origin/refactor/sync (2026-06-28).** Новый `dusk/10-cloud.js`
(~300 строк, classic `<script>` после 09-sync, футер `module.exports` для node-пробы). GIS-тег
`<script async src=accounts.google.com/gsi/client>` в `<head>` index.html; `./dusk/10-cloud.js`
в sw.js CORE_ASSETS. Реализовано ровно по SYNC-SPEC-PHASE2.md:
- OAuth GIS token-flow: токен ТОЛЬКО в памяти (`_accessToken`, +60с запас), `cloudAuth({interactive})`
  (`true`→попап, `false`→`prompt:'none'` тихо, реджектит если нужен UI → фон не всплывает), `cloudSignOut`
  (revoke), `cloudStatus`. `_token()` тихий; `_driveFetch` 401→1 тихий рефреш+ретрай (без цикла).
- Drive REST appDataFolder: `_findFile/_downloadContent(alt=media)/_getVersion/_createFile(multipart)/_updateFile(PATCH media)`.
- Optimistic concurrency: перед PATCH сверка `version` (СТРОКОЙ) → `ConflictError(expected,actual)`.
- `cloudPull→{empty}|{subset,version,fileId,meta}`, `cloudPush(subset,{fileId,expectedVersion})`.
- Формат `{schema:1,subset,_meta:{updatedAt,device}}`; `device`=стабильный hint в LS (`dusk_sync_device_v1`).
- ВАЖНО про globals: `cloudPull/cloudPush/...`=function-декл→на `window`; `ConflictError`+config-консты
  =лексич.глобалы (по имени, НЕ `window.*`) — Ф3 в том же classic-scope достучится по имени.
- Тест-сим: `__setAccessTokenForTest(token,ttl)` (node-проба гоняет транспорт без GIS).

Тесты: Ф2 транспорт node (мок fetch) `_cloudtest.cjs` **24/24** (pull empty/file, push create/update,
version-конфликт, число-vs-строка, 401 без цикла, 403-ошибка, Bearer); Ф2 live Chrome `_cloudlive.mjs`
**13/13** (грузится, глобалы, конфиг, GIS-тег, auth реджектит чисто, 0 pageerror). Регресс 0: Ф1 движок
39/39, Ф1 live (грузится С 10-cloud) 18/18, оффлайн pentest 6/6. (`D:\tmp\pw`).

**ЖДЁТ от пользователя (ручное, headless OAuth невозможен):** включить GitHub Pages (ветка
`refactor/sync`, root, URL `tekerinka314.github.io/Dusk/`) → консольный round-trip C–F из выданной
инструкции (вход, pull empty, push getSyncSubset(state), pull назад, 2 профиля=2 устройства,
ConflictError при дрейфе версии, оффлайн→cloudIsConfigured false). Если localhost-OAuth откажет —
точный `http://localhost:ПОРТ` в Cloud Console (лучше тестить на Pages).

**Дальше = Фаза 3** (живой поток `snapshotPreMerge→cloudPull→mergeStates(loadBaseline,getSyncSubset,remote)
→applySyncSubset→normalizeState→saveState→render→cloudPush→saveBaseline` + version-retry, «sync on open»,
готик-UI входа/статуса/«Sync now», бейдж карантина `unresolvedCount`, оффлайн-очередь push).
