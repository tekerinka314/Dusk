---
name: fix-stage-strategy-2026-07-12
description: "Финальная Fable-стратегия фикс-стадии — волны W0-W4, аудит B7-B13 отложен, артефакты для Opus, Android=TWA-first"
metadata: 
  node_type: memory
  type: project
  originSessionId: 30f5b568-fa75-49d1-846f-95eda7546a1e
---

2026-07-12, последний полноценный день Fable 5. Пользователь утвердил стратегию
S-3 (ROI-max): **аудит B7–B13 ОТЛОЖЕН за фиксы** (67 findings уже больше фикс-бюджета;
B14-синтез выполнен Fable досрочно в виде FIX-PLAN). Windows/Tauri — отказ на месяц.

**Артефакты (все в репо, binding):**
- `audit-v2/FIX-PLAN.md` — волны W0 (data-safety, 6 фиксов со спеками) → W1 (мобайл)
  → W2 (crit UX) → W3 (polish) → W4 (big-ticket, каждый по явному «го»). Cut-line на
  случай 1 лимита Opus. B6-05 = leave-as-is (ратифицировано), B1-19 уже задеплоен.
- `audit-v2/MOBILE-REWORK-PLAN.md` — дизайн B1-P0: 6 слайсов (карточка 3 ряда,
  group header 2 ряда, float-menu→bottom-sheet на touch, модалки max-height+dvh,
  safe-area+FAB, quick-wins). Механические acceptance-критерии, тег отката
  `v2.3-pre-mobile-rework` перед слайсом 1.
- `OPUS-BRIEF.md` — стартовый ритуал + 7 вероятных ошибок Opus.
- `ANDROID-PRENOTES.md` — капкан: Google OAuth мёртв в WebView + origin-lock
  worker'а → **рекомендация TWA/Bubblewrap первым APK** (синк работает сразу),
  Capacitor только при реальной нативной нужде; нужен assetlinks.json в public/.
- FINDINGS.md: ратифицированы B6-01 (гейт syncNow на _stateLoadedPromise + fuse),
  B0-02 (_saveSeq newer-wins, Этап-4 порядок НЕ откатывать), B6-03 (try/catch+тост+
  IDB-continue), B6-02 (defer W3, storage-flag+mergeStates), B6-05 (as-is), B6-06 (_ymd).

**W0 ВЫПОЛНЕН FABLE ЦЕЛИКОМ (2026-07-12, 6/6, всё запушено+задеплоено):**
B6-06 `9b87915` (_ymd) · B6-03 `5ddb75c` (quota toast+IDB-continue) · B6-04
`f2422d4` (превью body/note) · B0-01 `eb28720` (склеп-tombstones) · B0-02
`4b18b42` (_saveSeq newer-wins; бамп seq ТОЛЬКО при изменении контента — иначе
ломается IDB-dedup, урок) · **B6-01 `f0e20d5` (ФЛАГМАН: _stateLoadedPromise-гейт
в syncNow + pristine-fuse c tombstone-дискриминатором; racetiming-проба: 0 wipes
15/15, было 5/5).** +6 новых vitest-файлов (30 тестов суммарно), tsc чист.
Уроки тестов: лексические функции модуля не стабятся через globalThis (двойной
вызов _armDanger); happy-dom Storage не патчится (vi.stubGlobal('localStorage'));
s4_p0_idbboot сидит legacy-блобы без _saveSeq → нужен seq-aware сид (Opus, мелочь).

**Дальше:** [[audit-v2-fable-2026-07]] — реестр; Opus идёт строго по FIX-PLAN:
W1 (MOBILE-REWORK-PLAN слайсы 1-6) → W2 → B11+B12 экспресс → Android (TWA).
