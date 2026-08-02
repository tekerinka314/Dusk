---
name: sync-phase3-spec
description: "2026-06-29: СИНК ЦЕЛИКОМ — Ф3 цикл+глаз+карантин, Ф3.5 refresh-токен+будилка, переезд на CF Pages, ФАЗА 4 GC СДЕЛАНА (0dd365e) + 3 бага авторизации/статуса исправлены (b5cec3c), version 2026-06-29-12. Открыто: live two-profile OAuth happy-path (ручной)"
metadata: 
  node_type: memory
  type: project
  originSessionId: 0a1e223e-b6d1-498e-a433-745713f8b509
---

**СИНК Фаза 3 — КОД ГОТОВ+ЗАКОММИЧЕН `c89836f`→origin/refactor/sync** (спека `5c53f2b`). Звено
после [[sync-phase2-ready]] (Ф2 транспорт `b9aaa24`) и [[sync-merge-decisions]] (Ф1 движок `d88e7dc`).

**⭐ ФАЗА 4 GC — СДЕЛАНА (`0dd365e`, version `2026-06-29-12`).** Последний отложенный пункт синка закрыт.
Надгробия (`state.tombstones`) и журнал карантина (`state.syncJournal`) = append-only union → росли без предела, пухла Drive-файл. Чистка по возрасту ВНУТРИ `mergeStates`:
- Новый опц. `opts.gcNow` (ms-часы). Передан → пруним **выход** мержа: надгробия старше **90д** дропаем; **РЕШЁННЫЕ** записи журнала старше 90д собираем; **НЕРешённые держим вечно** (пока юзер не разберёт). `gcNow` НЕ передан (node-тесты, первый синк) → GC OFF → мерж остаётся чистой детерминированной функцией (39 Ф1-тестов не тронуты).
- GC на union-выходе каждый синк → оба устройства СХОДЯТСЯ (устаревшее надгробие, ре-добавленное из union пира, пруним заново на след. мерже; осцилляция только в окне клок-скью у границы 90д, безвредно).
- `TOMBSTONE_TTL_MS`/`JOURNAL_TTL_MS` (оба 90д) в `09-sync.js`; статы `gcTombstones`/`gcJournal` логируются в панель синка («GC: −N надгробий, −M журнал»). Phase 3 шлёт `gcNow:Date.now()`.
- Компромисс (по SYNC-SPEC): устройство офлайн >90д с живой копией удалённой записи может её воскресить.
- Тест `_syncgc_test.cjs` 13/13 (GC-off дефолт, старое прунится/свежее живёт, нерешённое вечно, граница, конвергенция, живые записи целы); регресс 0 (мерж 39/39, live 17/17, restore 23/23, triggers 8/8).

**⭐ 3 БАГА АВТОРИЗАЦИИ/СТАТУСА ИСПРАВЛЕНЫ (`b5cec3c`, version `2026-06-29-11`)** — все в `dusk/11-sync-ui.js`, worker-режим:
- **Баг 1 «выбивает через ~час»:** `_scheduleTokenRefresh` при ОДНОМ transient-сбое тихого рефреша (сетевой блик/холодный старт Worker на 1ч-отметке) делал `setSyncStatus('signed-out')` и переставал перепланировать → сессия мертва в UI пока refresh-токен жив. Фикс: «выключено» только если `cloudStatus().signedIn` стал false (токен реально отозван); пока refresh-токен есть — `refreshStatus()`+ретрай через 30с.
- **Баг 2 «статус в панели не живой»:** `openSyncPanel` строил снимок. Вынес `_syncPanelHtml()`; `refreshStatus()` теперь перерисовывает ОТКРЫТУЮ `.sync-panel` на месте (`_refreshSyncPanelIfOpen`, сохраняя позицию поповера и open-состояние `<details>` журнала).
- **Баг 3 «после логина пишет выключено пока вручную не синканёшь»:** в worker-режиме интерактивный `cloudAuth` = full-page редирект на Google, который НЕ возвращается к строкам после `await` → `_syncEnabled` не сохранялся. Фикс: `syncSignIn` ставит+сохраняет opt-in ДО редиректа; `_initSyncUI` цепляет `_exchangePromise.then` → после обмена `?code` включает+армит цепочки рефреша/периодики+пуллит, без клика (+покрывает релоад где выжил только refresh-токен, access протух).
- Тест `_authui3_test.mjs` 9/9 (worker-режимный, заменил крашащийся legacy-GIS `_tokenrefresh_test.mjs` — тот навигировал на Google т.к. worker-режим теперь дефолт). `_cloudtest.cjs`: устаревшая ассерта `cloudIsConfigured false in node` поправлена на `true` (worker-режим конфигурён без GIS). Регресс 0.

**ФАЗА 3.5 — долгий логин (refresh-токен через Cloudflare Worker) + живая будилка между устройствами (`8147b0f`→origin/refactor/sync, version `2026-06-29-2`).** Юзер выбрал B+C сразу. DO на free-tier подтверждён (SQLite + WebSocket Hibernation = даром). **Дормант пока `SYNC_WORKER_URL=''`** → прод остаётся на legacy GIS, НОЛЬ изменений до деплоя.
- **B (убивает перелогин):** новый `worker/` (Cloudflare Worker, `src/index.js`+`wrangler.toml`+`README.md`). `/exchange`+`/refresh` проксируют Google token endpoint с `client_secret` (ТОЛЬКО в Worker, через `wrangler secret put GOOGLE_CLIENT_SECRET`, НИКОГДА в репо/клиент) → браузер получает **долгий refresh-токен** → тихий минт access месяцами, без попапа. `dusk/10-cloud.js` теперь **dual-mode**: WORKER = auth-code+PKCE редирект→exchange→хранит refresh→тихий рефреш/401/релоад; LEGACY (нет Worker) = старый GIS без изменений. `cloudStatus` signedIn если есть refresh. Тест-сим `window.__DUSK_WORKER_URL`.
- **C (живой синк):** Worker `SyncRoom` Durable Object (SQLite, Hibernation) раздаёт «changed»-пинг другим устройствам аккаунта. Новый `dusk/12-sync-wake.js`: коннект пока вкладка видима+залогинен, `syncNow` по пингу пира, нудж пирам после своего push, reconnect-backoff, закрытие при hidden. Room=hash(fileId). `syncNow`(11) зовёт `syncWakeNote`/`syncWakeNudge`; sign-out → `syncWakeStop`. index загружает 12 после 11; sw CORE+=12, CACHE v6.
- **Тесты:** worker handlers `_workertest.mjs` 14/14, worker-auth live `_workerauthlive.mjs` 11/11 (refresh-on-reload/silent-refresh/?code-exchange/CSRF-state/signout), wake `_syncwaketest.mjs` 7/7. Регресс 0: transport 24/24, merge 39/39, restore 23/23, sync-ui live 17/17, conflict live 23/23, pentest 6/6.
- **РАЗВЁРНУТО+ЖИВОЕ (2026-06-29):** Worker задеплоен юзером на **`https://dusk-sync.petrehundima.workers.dev`** (CF-аккаунт petrehundima@gmail.com, account id 627477c…). `SYNC_WORKER_URL` вписан в `10-cloud.js` (`aa04555`, version `2026-06-29-3`) → **worker-режим активен на Pages**. Залогинено на ПК+телефоне через редирект-флоу, долгий логин работает. Google Console: redirect URI `https://tekerinka314.github.io/Dusk/` добавлен, consent опубликован в Production (unverified-экран не вылез — согласие прошло сразу). **ГРАБЛИ при настройке:** (1) `wrangler deploy` упал «need workers.dev subdomain» → лечится открытием Workers&Pages в дашборде (создать subdomain) / любой Hello-World воркер; (2) первый секрет был неверный → Worker `/exchange` отдавал `invalid_client` «provided client secret is invalid» → переставить `wrangler secret put GOOGLE_CLIENT_SECRET` верным `GOCSPX-…` от клиента `493121023118-…`; проверка зондом `curl -X POST .../exchange` с фейк-кодом: `invalid_client`=секрет плохой, `invalid_grant`«Malformed auth code»=секрет ОК. `worker/.wrangler/` случайно закоммитился (account id) → убран+gitignore (`eab79b9`); account id остался в истории `aa04555` (не секрет, скраб не делали). **Setup-шаги в `worker/README.md`.** Все проверки прошли (логин ПК+телефон, будилка работает).
- **ФИКС потери правки во время летящего синка (`9441ab3`, version `2026-06-29-4`):** юзер заметил «бурст pin→unpin→rename → часть не подхватывается». Корень: `scheduleSyncPush()` делал `if(_syncing) return` ПЕРЕД установкой флага → правка во время летящего синка не ставила ни `_pendingPush`, ни дебаунс, ни очередь (а будилка участила синки → баг вылез). Фикс: всегда `_pendingPush=true`; если `_syncing` → `_syncQueued=true` (finally syncNow перезапустит и до-пушит новое). Дебаунс 4000→1500мс (меньше задержка, бурст всё равно схлопывается). Тест `_synclostedit_test.mjs` 5/5 (реальный scheduleSyncPush + медленный push, правка подтверждённо mid-flight доходит до Drive); регресс 0 (live 17/17, conflict 23/23, triggers 8/8).
- **ФИКС «глаз вечно syncing» (`d516810`, version `2026-06-29-5`) — регрессия предыдущего фикса:** `syncNow` сам зовёт внутренний `saveState` (применяет merged каждый прогон) → тот шёл в `scheduleSyncPush` → теперь ставил `_syncQueued` (т.к. `_syncing`) → `finally` перезапускал синк → снова saveState → **бесконечный цикл**, глаз висит + постоянный Drive-трафик. Фикс: флаг `_applyingMerge` вокруг merge-landing saveState в syncNow; `scheduleSyncPush` при `_applyingMerge` → return (не очередь). Юзерские правки во время синка по-прежнему ставят `_syncQueued`. Тест расширен (синк СЕТТЛИТСЯ: push не растёт, `_syncing`/`_syncQueued` false в покое) 7/7. Также: `sw.js` отдаёт `version.json` **network-only** (никогда из кэша SW) → тост обновления мгновенно как Pages опубликует; остаток задержки (минуты) = билд+CDN GitHub Pages, не клиент. CACHE v6→v7. Регресс 0 (live 17/17, conflict 23/23, triggers 8/8, sw 10/10, update 8/8, pentest 6/6).
- **ПЕРЕЕЗД НА CLOUDFLARE PAGES (мгновенный деплой/тост) — РАБОТАЕТ (`cbfe18b`, version `2026-06-29-9`):** новый origin **`https://dusk-du4.pages.dev`** (git-connected к репо, production branch `refactor/sync`, build none/output `/`). Тост обновления теперь **~10с** после push (CF деплой ~15-20с + опрос 5с) против минут у GH Pages — GitHub только хранит+webhook, билдит/раздаёт Cloudflare. CF Pages git-флоу в дашборде СПРЯТАН (всё гонят в Workers: «Deploy command required»/«Path» = Workers, не туда) — нашёлся через вкладку Pages. Изменения: Worker CORS теперь **allowlist** (`ALLOWED_ORIGIN` = comma-list github.io+pages.dev, эхает совпавший Origin +`Vary:Origin`) — оба origin живут в переходный период; добавлен **`_headers`** (version.json `no-store`, sw.js `no-cache` — CF Pages применяет, GH игнорит). **ФИКС детекта тоста (`cbfe18b`):** `check()` при `bootBuild==null` (битый замер версии на загрузке, напр. после OAuth-редиректа) молчал НАВСЕГДА → теперь принимает первый успешный замер как базу (самозалечивание). Тесты: worker 17/17 (+CORS echo/fallback), worker-auth live 11/11, update 8/8. **ЗАЧИСТКА ЗАВЕРШЕНА (2026-06-29):** репо приватный, GH Pages отключён, телефон+ПК на pages.dev, старый redirect URI удалён в Google, `ALLOWED_ORIGIN` обрезан до `https://dusk-du4.pages.dev` (Worker передеплоен, CORS проверен: github.io НЕ эхается, pages.dev да, секрет цел `invalid_grant`), CLAUDE.md обновлён (`e20ce66`, version `2026-06-29-10`).
**⚠️ УРОК wrangler deploy:** запускать ТОЛЬКО из `worker/` ИЛИ с `-c "D:/VSCode projects/DUSK_v2.0/worker/wrangler.toml"`. Голый `wrangler deploy` из КОРНЯ репо (cd в worker/ не всегда срабатывает в Bash-сессии — cwd персистит) → wrangler 4.x скаффолдит `wrangler.jsonc`(name=`v2-0`, assets:".")+`.gitignore`+`.wrangler` в корне и поднимает МУСОРНЫЙ воркер `v2-0.petrehundima.workers.dev`, ПУБЛИЧНО раздающий весь репо (1047 файлов). Случилось 2026-06-29, поймал+удалил (`wrangler delete --name v2-0`, в non-interactive fallback=yes), корневой скаффолд снёс. Секретов в репо нет → утечка кода минуты на нерекламируемом URL, низкий риск. Впредь — `-c` абсолютный.

- **НАСТРОЙКА ТРИГГЕРОВ под будилку (`700d7a2`, version `2026-06-29-6`):** юзер спросил нужны ли старые триггеры с будилкой. Решение: **periodic 30с→120с** (чистая страховка, realtime = будилка, фон-трафик −4×); **+WS-reconnect→catch-up синк** в `12-sync-wake` (дроп мог пропустить пинги → на RE-open один pull via `переподключение`; первый connect не синкает — только что синкали; флаг `_wsEverOpen`); оставлены on-open/visible/focus/online/debounced/flush-hide/manual/token/retry (каждый закрывает реальную дыру). Update-тост: минуты = билд+CDN Pages, НЕ клиент (опрос 5с + мгновенно visible/focus/online + `pageshow` bfcache, version.json network-only) — из кода не сократить, только сменой хостинга. Тест wake 10/10 (+reconnect); регресс 0 (live 17/17, conflict 23/23, lost-edit 7/7, update 8/8, sw 10/10, triggers 8/8).
- **Ключевой Google-нюанс:** браузер БЕЗ сервера >1ч держать нельзя (хардкап Google) — мелькающий попап = GIS silent refresh падает на строгих куках. Refresh-токен (только через server/Worker) = единственный железобетон.

**ФИКС restore-дубликата (`7d007af`→origin/refactor/sync, version `2026-06-29-1`):** live-тест юзера дал
конфликт `delete-vs-edit` (⚠1, `−1`), но restore проигравшего СОЗДАВАЛ НОВУЮ задачу вместо правки живой.
Причина: запись с тем же uid ОЖИЛА (другое устройство до-пушило её в синках после того как мердж её удалил),
а `restoreQuarantineEntry` ветка `delete-vs-edit` ВСЕГДА звала `_subsetToLive` → новый int-id + push → дубликат.
Из 4 видов только эта ветка не дедупила по uid (`field` правит существующую, `subtask` дедуп `findIndex`,
`note-both` копия by design). Фикс: restore сперва `_findRec` по uid — если жива, контент проигравшего
накладывается НА неё (id/groupId сохр., id подзадач чинятся); создаём только если записи реально нет; tombstone
снимается в обоих случаях. Мердж-движок 09-sync корректен, НЕ трогал. Тесты: `_syncuitest.cjs` restore 23/23
(+7 дедуп-кейсов), merge 39/39, cloud 24/24, sync-ui live 17/17. **Открыто:** так и не подтверждён ЖИВОЙ
two-profile OAuth happy-path на Pages (юзер гонял грязные сессии с разлогинами/релоадами — состояние устройств
замусорено старыми tombstone; чистый прогон с нуля ещё нужен).

**Реализовано в `dusk/11-sync-ui.js`** (грузится ПОСЛЕ 08; +в sw CORE, +в index `<script>`):
`syncNow(opts)` single-flight цикл (snapshot→pull→mergeStates→apply→normalize→save→render→push→saveBaseline;
ретрай ConflictError ≤4; baseline двигаем ТОЛЬКО после успешного push → офлайн/signed-out/ошибка НЕ теряют данные);
триггеры: открытие (гейт `_syncEnabled`=`dusk_sync_enabled_v1`, ставится после успешного cloudAuth), refocus, window 'online',
debounced push (хук `_afterSaveState` в КОНЦЕ `saveState` в 01-core); статус-глиф (data-sync), панель `sync-panel` через `_openFloatMenu`
(вход/выход/sync now/статус), бейдж непрочитанных, оверлей карантина restore/dismiss, `restoreQuarantineEntry(st,entry)` по kind
(field/subtask/delete-vs-edit/note-both, чистая, node-тест). ТИХО: тост только manual/ошибка.
**Глаз рептилоида** (статичный SVG `.sync-glyph`): щель-зрачок, веки `scaleY` по состояниям, бровь=кривая верх.века
следует за ним, скан+моргание при синке, drop-shadow свечение сглаживает мелкий размер, reduced-motion safe. CSS в конце style.css.
3 раунда правок глаза с юзером (глаз утверждён). Превью-файл: `D:/tmp/pw/_synceye.html`.

**ПЕРЕНОС глаза → плавающий страж F (`1eb3e9b`→origin/refactor/sync, version `2026-06-28-4`):** глаз УШЁЛ из угла шапки
(нарушал симметрию бренда) в **floating FAB левый-низ** (`position:fixed bottom:22 left:22; 52px кольцо / 40px глаз`),
зеркаля FAB звука пера справа (тот же хром: bg-app/hairline-border/blur/shadow). **КРИТ:** кнопка вынесена ИЗ `.todo-app`
на уровень `<body>` (рядом с `#btn-pen-sound`) — у `.todo-app` `backdrop-filter:blur(22px)` = containing-block для fixed-потомков
→ внутри глаз цеплялся к КАРТОЧКЕ (x≈233), не вьюпорту. На body → истинный угол (x=22). Per-state `opacity` перенесён с кнопки
на внутренний `<svg>` (кольцо-хром всегда читаемо, тускнеет/ярчает только сам глаз). Мобайл media: bottom:18 left:16 50px.
**ФИНАЛ размер (`1ccccf3`, version `2026-06-28-5`):** 52px показался юзеру великоват → **46px кольцо / 36px глаз** (мобайл 46). И:
панель раскрывалась ВНИЗ за экран (кнопка внизу) → `_openFloatMenu` (03-render) теперь **флипает меню ВВЕРХ** когда внизу нет места
и вверху есть (`top+mh>innerH-8 && r.top-mh-5>=8`). Generic — snooze/demote по-прежнему вниз (место есть). Проверено скрином:
панель над глазом, на экране; offline=тусклый прикрытый глаз в кольце, ok=открытый.

**ФИКС «клик Обновить — ничего не изменилось» (`0968584`, version `2026-06-28-6`, CACHE v4→v5):** корень — GitHub Pages
шлёт ВСЁ с `Cache-Control: max-age=600` (10мин). `version.json` опрашивается `no-store`→тост срабатывает, НО `index.html`/`style.css`
тянулись дефолт-кэшем → браузер 10мин отдавал старый shell из HTTP-кэша → reload после тоста приносил старое. Фикс в `sw.js`
`networkFirst`: shell-фетч теперь `fetch(request.url, {cache:'no-cache'})` (ETag-ревалидация: 304 если не менялось, свежак если
менялось) → reload всегда берёт текущий деплой. По `request.url` т.к. navigate-mode Request + init = TypeError. Оффлайн цел (нет
сети→Cache API fallback). **Нюанс перехода:** старый SW+HTTP-кэш у юзера → первый раз нужен ОДИН hard refresh (Ctrl+Shift+R)
чтобы поставить новый SW; дальше тост→обычный reload работает сам. Тесты sw 10/10, update 8/8.

**Хоткей S (`7ac13b7`, version `2026-06-28-7`):** глобальная клавиша **S** = синхронизация (signedIn→`syncNowManual`, иначе
`syncSignIn` интерактивный вход — явное действие юзера, не авто-auth). Разведён в общем keydown (`08-quickadd`:~635, рядом с N//),
гард `!inInput`+без модификаторов, `_matchKey` (layout-independent, физ. KeyS). `<kbd>S</kbd> синхронизация` добавлен во ВСЕ 4
контекст-подсказки (задачи DOM `#shortcuts-hint` index.html, +константы `_NOTES_HINT_HTML`/`_CRYPT_HINT_HTML`/`_TASK_ARCHIVE_HINT_HTML`).
Тест `_hotkeyS_test.mjs` 10/10 (вход→синк, синк-сейчас, игнор-в-инпуте, S в подсказке каждой вкладки); live 17/17, audit3 103/103.

**Задержка обновления (НЕ баг):** 5с — только клиентский опрос; сама задержка = сборка GitHub Pages (~20-60с) + продувка CDN после пуша. Вне приложения.

**ФИКС повторного логина на КАЖДОМ релоаде (`6fd778c`, version `2026-06-28-8`) — РАЗВОРОТ «токен только в памяти»:** симптом —
релоад мелькал OAuth-попапом и всё равно требовал входа заново. Причина: GIS token-flow БЕЗ refresh-токена + токен жил только в
памяти → релоад терял его → авто-синк при открытии звал `requestAccessToken({prompt:'none'})` (мелькающий попап), тихий рефреш
часто падал → ручной вход каждый раз. Фикс в `10-cloud.js`: **кэш короткоживущего токена + expiry в localStorage** (`dusk_sync_token_v1`),
`_restoreToken()` на загрузке модуля → релоад в пределах ~1ч восстанавливает сессию БЕЗ OAuth-UI (`cloudAuth` ранний-выход на живой
токен → нет requestAccessToken → нет попапа). Чистится при signOut/401/протухании. **Security-трейдофф осознанный:** токен теперь в
localStorage (XSS), принято т.к. короткоживущий (~1ч), scope только `drive.appdata`, приватность не приоритет (правило проекта). Тест `_tokenpersist_test.mjs` 12/12 (кэш при auth, restore-без-попапа на релоаде, чистка при signOut, сброс протухшего); transport 24/24, live 17/17, pentest 6/6.

**ДОЛГИЙ ВХОД — упреждающий тихий рефреш (`873bb30`, version `2026-06-28-9`) — юзер выбрал «вариант 1 (без сервера)»:** ВАЖНО — «релогин раз
в час» это МИФ/была моя ошибка. Грант согласия Google живёт МЕСЯЦАМИ; token-flow без сервера НЕ даёт refresh-токен (жёсткий лимит Google,
нужен server-side code exchange+secret), но и НЕ надо — приложение молча переполучает часовой токен. `_scheduleTokenRefresh()` в `11-sync-ui.js`:
пока вкладка открыта и вошёл — обновляет токен ровно когда кэш истекает (на `expiresAt`=`_tokenExp`, там ещё 60с реальной жизни; раньше нельзя
— `cloudAuth` рано-выходит на валидном токене), тихо (`prompt:'none'`, не всплывает), при успехе перепланирует → вход ОДИН раз держится недели/месяцы
пока жива сессия Google. Силент упал (сброс сессии Google/блок 3rd-party-cookies) → `signed-out`, один клик/S. Армится после успешного синка, на
загрузке при восстановленном токене, чистится при signOut. Тест `_tokenrefresh_test.mjs` 6/6 (стаб expires_in:65→окно~5с: молч.цепочка ≥2, сессия
держится, signOut стопит). **Развилка Serverless-брокер (Cloudflare Worker + secret → настоящий refresh-токен, железобетон) ОТКЛОНЕНА юзером — выбран no-server.**

**ТРИГГЕРЫ авто-синка расширены + скип лишних пушей (`cc18e6c`, version `2026-06-28-10`) — по жалобе юзера «триггеров мало, сценарии не продуманы»
+ провал живого теста конфликта.** Было: open/refocus/online/debounced-push/manual-S. Добавлено в `11-sync-ui.js`: **периодический фоновый синк
30с пока вкладка видима+вошёл** (`_startPeriodic`/`SYNC_PERIODIC_MS`, два открытых устройства сходятся сами), **window 'focus'→pull**,
**флаш при скрытии/закрытии** (`_flushIfPending` на visibilitychange→hidden + pagehide — правка перед закрытием не висит в дебаунсе),
периодик стопится при hidden/offline/signout. **Скип no-op пушей:** syncNow пишет в Drive ТОЛЬКО если `merged != remote` (или файла нет) —
open/refocus/периодик без локальных правок = чистый pull, без чурна версий Drive. Гейт сравнивает КОНТЕНТ (`_subsetEqual`, order-insensitive
deep-equal), НЕ in-memory `_pendingPush` (тот сбрасывается на релоаде → иначе непушнутая офлайн-правка потерялась бы после перезагрузки).
**Провал живого конфликта = почти точно правка A не доехала до Drive** (тихий фон без подтверждения) → B не увидел remote-изменения → нет конфликта;
сам путь конфликт→карантин→бейдж рабочий (live-loop тест 3, 17/17). Тест `_synctriggers_test.mjs` 7/7 (скип no-op, пуш при правке, правка доезжает,
remote применяется чистым pull). **Совет для ретеста:** жми S и смотри тост-итог (подтверждение пуша) + следи за глазом (pending→syncing→ok).

**УСТОЙЧИВОСТЬ К ПЕРЕПОДКЛЮЧЕНИЮ (`7abfb31`, version `2026-06-28-11`) — по жалобе: телефон B при возврате Wi-Fi → ошибка синка.** Классика:
`online` срабатывает когда navigator флипает, а мобильный линк ещё не юзабелен → немедленный `cloudPull` падает → глаз `error` без ретрая. Фикс
в `11-sync-ui.js`: (1) `online` ждёт `SYNC_ONLINE_SETTLE_MS`=1.5с перед синком; (2) любая транзиентная ошибка → **авто-ретрай с бэкоффом**
`SYNC_RETRY_DELAYS=[2,5,12]с` (`_retryTimer`/`_retryCount`), сброс при успехе и при свежем `online`, данные safe (baseline не двигаем); (3) **панель
показывает текст ошибки** (`_lastError.message`, `_escHtml`, CSS `.sync-panel-err`) — диагностируемо на любом устройстве. Тест `_syncretry_test.mjs`
5/5 (fail→error+ретрай→recover→ok). **NB:** реальный текст ошибки телефона ещё НЕ известен — если повторится, клик по глазу → панель покажет причину.

**КРАШ `removeChild ... moved in a 'blur' event handler` ИСПРАВЛЕН (`43487e2`, version `2026-06-28-12`) — корневой баг ре-ентрантного render.**
Юзер поймал на телефоне при reconnect + «restore карантина ничего не дал». Причина: снос сфокусированной ноды в `_reconcile` стреляет
СИНХРОННЫМ focusout/blur → делегированный обработчик (коммит inline-edit) зовёт `render()` повторно → вложенный render мутирует тот же DOM,
что внешний reconcile обходит → `removeChild` бросает; внутри синк-render это всплывало как «ошибка синхронизации», и прерывало render после
restore (потому restore «не сработал»). Фиксы в `dusk/03-render.js`: (1) **guard ре-ентрантности** в `render()`/`renderListOnly()` (`_rendering`/`_renderQueued`
— повторный render во время текущего коалесцируется в один follow-up, НЕ вложенно — это и есть настоящий фикс: вложенный render = no-op, внешний
reconcile не трогается); (2) `_reconcile` снапшотит детей + guard `n.parentNode===parent` (пояс+подтяжки); (3) `syncNow` оборачивает `render()` в try/catch.
Тест `_reconcile_test.mjs` 5/5 (focusout→render реально сработала, без краша; подтверждено что render-guard сам устраняет на старом reconcile). Регресс audit3 103/103.

**ЖИВОЙ КОНФЛИКТ ВСЁ ЕЩЁ ПАДАЕТ (`-13`, `7222b7a`) — ДИАГНОСТИКА вместо догадок.** Симптомы юзера: попытка1 ни одна версия не синканулась+релоад вернул старое;
попытка2 победила версия телефона (хотя ПК новее) + бейджа нет. Движок мержа ПРАВИЛЬНЫЙ (даже пустой baseline → present-both-different даёт конфликт; node 39/39, live 17/17),
значит вживую **правки реально НЕ доходят до Drive** (вероятно inline-rename не коммитился из-за краша `removeChild`, чинен в `-12`; или тест шёл на старом билде). Добавлен
**журнал синка прямо в панель глаза** (`_syncLog`/`_log`, `<details>Журнал`): каждый syncNow пишет триггер, pull (v + кол-во задач), merge (+~−⚠), push (→v/пропуск/ретрай),
итог/ошибку. На телефоне видно без консоли. **СЛЕДУЮЩИЙ ШАГ: юзер повторяет конфликт на `-13` (hard-refresh оба!), затем глаз→Журнал на ОБОИХ устройствах → копирует строки → по ним точная диагностика.**
Гипотеза №1: на ПК после правки `push: пропуск` или нет `push: →v` = правка не уехала.

**ДИАГНОЗ ПО ЖУРНАЛУ (`-15`, `0114c36`):** логи юзера показали ВЕЗДЕ `merge: +0 ~0 −0 ⚠0` + версия Drive растёт v296→301. Вывод: (1) **пуш-петля от шума** —
гейт пуша сравнивал весь сабсет, а порядок массивов (merge строит из Set) + `_alloc` + device-local int id/groupId + updatedAt отличаются у каждого устройства → пуш
впустую на каждом синке (без потери данных, но спам Drive + мусор в журнале). ПОФИКШЕНО: новый `_pushNeeded`/`_syncCanon` сравнивает только КОНТЕНТ (по uid, без порядка/локальных
полей/таймстампов) → пуш только на реальную правку. Тест triggers 8/8 (вкл. reorder+_alloc→без пуша). (2) **Конфликт у юзера не возникал т.к. ОБА устройства онлайн+быстрый
авто-синк (debounce 4с + periodic 30с)** → правки сериализуются через Drive (last-writer-wins), общей базы для 3-way нет. Движок конфликта рабочий (live тест 3 ⚠1). **Чтобы
поймать конфликт НАДО: ОБА устройства офлайн ОДНОВРЕМЕННО → каждое правит ту же задачу → потом оба онлайн.** Это дано юзеру как дефинитивный тест. Версия застряла на -13 (забыл бамп
файла в `bf0f6d4`) — выправлено в `0114c36`→-15.

**ЛОГАУТ на телефоне (issue, НЕ пофикшено — предел Google):** silent-refresh `prompt:'none'` на мобайл-вебе ненадёжен (сторонние куки/сессия) → токен истёк+тихий
рефреш упал → signed-out. Это известный предел web-flow; решится на НАТИВЕ (Capacitor, code-flow+PKCE = настоящий refresh-токен). Пока на телефоне-вебе — изредка один тап входа.

**ФИКС тоста обновления (тот же `1eb3e9b`):** был `POLL_MS=5мин` → свежий деплой всплывал только при перефокусе
(`visibilitychange`), не пока сидишь. Теперь опрос `version.json` каждые **5с пока вкладка ВИДИМА** (скрыта → `stopPolling`,
ноль фон-трафика; браузеры всё равно троттлят скрытые) + мгновенный `check()` при becoming-visible/`focus`/`online`. Деплой
всплывает за ~5с без перефокуса. 5с выбраны юзером (для него как тестера; для крошечного version.json вреда нет). Тест `_updatetest.mjs` 8/8.

**Тесты:** restore node `D:/tmp/pw/_syncuitest.cjs` 16/16; live-loop headless (фейк-облако подменой window.cloud*) `_syncuilive.mjs` 17/17;
регресс 0 (движок 39/39, sync-live 18/18, транспорт 24/24, pentest 6/6, audit3 103/103, idea8 33/33, sw 10/10, update 8/8).

**Осталось (ручное, headless OAuth нельзя):** live two-profile round-trip на Pages — вход в 2 профилях, приход данных + конфликт→бейдж на обоих.
Дальше Ф4 (GC надгробий+журнала, retry/backoff, durability-матрица). version.json BUILD сейчас `2026-06-28-3`.

**Спека:** `SYNC-SPEC-PHASE3.md` (репо, коммит `5c53f2b`→origin/refactor/sync). Кодить ПО НЕЙ.
Ф3 = только оркестрация уже готовых чистых функций (09/10) + DOM; мерж-семантику и transport API НЕ менять.

**UX-решения залочены (НЕ переспрашивать):**
- **Когда синк:** открытие (тихо) + pull при refocus + debounced push после правок (~4с) + ручная «Синхронизировать сейчас». Полный живой цикл, но eventual.
- **UI:** ненавязчивый статус-глиф в ШАПКЕ (не перетягивать с бренда) → клик открывает мини-панель.
- **Карантин:** ПОЛНАЯ панель ревью сейчас (бейдж непрочитанных + список проигравших версий с «Восстановить»/«Отклонить»).
- **Шум:** ТИХО + бейдж. Фоновый синк молчит; тост только при РУЧНОМ синке (итог) и ошибках.

**Ключевые куски спеки:** новый файл `dusk/11-sync-ui.js` (после 10-cloud, +в CORE_ASSETS sw + в `<script>` index).
`syncNow(opts)` = single-flight цикл по порядку SYNC-SPEC §8 (snapshot→pull→merge→apply→normalize→save→render→push→saveBaseline),
ретрай по `ConflictError` (≤4, base НЕ двигаем до успешного push → офлайн/ошибка безопасны).
Триггеры: init+1тик, visibilitychange, window 'online', debounced из saveState (только если signedIn+_syncReady), ручная.
БЕЗ явной очереди операций — full-state мерж сам несёт непушнутые правки («очередь»=локал+неподвинутый baseline; флаг `_pendingPush` для статуса).
Глиф-статус: data-sync = offline/signed-out/syncing/ok/pending/error. `restoreQuarantineEntry(state,entry)` по kind (field/subtask/delete-vs-edit/note-both) — чистая, node-тест.
Тест: ВЕСЬ цикл тестируется HEADLESS через подмену window.cloud* фейком (Drive=JS-объект subset+version) — OAuth не нужен; live two-profile только финально.

**Build-order (§9, каждый шаг деплой+ревью):** 1) превью готик-глифа синка (HTML-файл, ouroboros занят repeat+update → нужен ДРУГОЙ) → выбор; 2) loop+триггеры (фейк-облако, headless); 3) глиф+панель (вход/выход/sync now/статус); 4) бейдж+панель карантина (restore/dismiss); 5) live two-profile OAuth на Pages.

**В ТОМ ЖЕ коммите `5c53f2b` — 3 мелких фикса (просил юзер):** (1) тулбар теперь ВСЕГДА виден (был скрыт при 0 задач — а экспорт/импорт/точки нужны на свежем устройстве, портативность #1); (2) +`<meta name="mobile-web-app-capable">` (deprecated apple-* предупреждение); (3) кэш раздулся 3→19МБ = **opaque-паддинг от Google Fonts CSS без CORS** (не утечка, артефакт учёта) → `crossorigin` на фонт-стиль + SW больше НЕ кэширует opaque (`_cacheable` guard) + CACHE `v3→v4` (сброс). version.json BUILD→`2026-06-28-2`. Тесты: sw 10/10, update 8/8, pentest 6/6, audit3 103/103, движок 39/39 — регресс 0.

Дальше: ждать ревью/«go» на шаг 1 build-order (превью глифа) ИЛИ юзер скажет начинать loop.
