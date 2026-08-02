---
name: f3-design-package
description: "Ф3 ЗАКРЫТА ЦЕЛИКОМ Fable (билды -8…-12, финал d8a9569): B4-01 B+A вживлён + нюансы юзера, B4-02 движок (float+sort, Esc везде, follow), O-3 long-press вживлён (0 голых кнопок из 183); ЖДЁТ: ревью пачки №2; ДАЛЬШЕ: новый план под сброшенный недельный лимит"
metadata: 
  node_type: memory
  type: project
  originSessionId: b49fd954-3fdf-460a-b246-e79e7f58a8ea
---

2026-07-17, коммит `1d57b86`. Ф3 (по [[strategy-2026-07-16-fable-abundant]])
исполнена в дизайн-части, **на high** (решение юзера: xhigh ROI мизерный;
исключение — если выберет master-detail, запросить xhigh на тот кусок).

Сделано:
- **B4-01 превью** `audit-v2/previews/f3-desktop-preview.html` — интерактивный
  полновьюпортный мок, свитчер: A шире-неф (780→960, sub 3-col) / B рельса
  (тулбар+группы в правую sticky-колонку через grid-areas на #main-page —
  сиблинги, CSS-only!) / C master-detail. **Рекомендация Fable = B**; C
  анти-рекомендован (редизайн). Вердикты в самом превью + REVIEW-QUEUE §Ф3.
- **B4-02 спека** `audit-v2/POPOVER-ENGINE-SPEC.md` — anchorPopover(el, anchor,
  opts): flip+clamp+maxHeight, следование за скроллом (rAF, capture),
  close при уходе якоря, Esc-стек, single-open реестр слоями (modal/popover),
  navRoot стрелки. Принятие: sortPicker → _openFloatMenu → qa (без navRoot!)
  → gothicPicker. Код = Opus. Отвергнуто: floating-ui, CSS anchor-positioning.
- **O-3 тач-хинты** — дизайн вжит в OPUS-QUEUE §O-3: long-press 480мс →
  плашка (клик гасится), slop 8px, исключить драг-хэндлы и armed-кнопки;
  отвергнуты «?»-режим и coach-marks. Ждёт «согласен?» юзера.

**B4-01 ВЖИВЛЁН (юзер выбрал B+A комбо): билд 2026-07-17-8, коммит `d5234f4`.**
Механика: #main-grid обёртка внутри #main-page (switchPage владеет inline
display #main-page — грид на нетронутом ребёнке); body[data-page] штамп
(02-grimoire switchPage + 01-core loadUiState, дефолт в <body>); .side-rail
обёртка тулбар+группы (display:contents ниже тира). Тиры: ≥1440 рельса 336px
sticky, карта 1220; ≥1600 карта 1360 + подзадачи 3-col (lone-last 3n+1 → 1/-1);
≥2200 карта 1460. Архив/Гримуар = 780 намеренно (гримуар-расширение — спросить
юзера отдельно). Уроки: flex min-width:auto капкан (пилюли размерят колонку
max-content'ом → width:100% цепочка); text-overflow НЕ работает на flex
container → pill display:block; ГЛАВНОЕ — inline style switchPage перебивает
любой CSS display на #main-page. Скрины audit-v2/shots/f3/ (untracked),
харнесс D:\tmp\pw\b1\f3_tier.mjs. Тесты 35/35, mobile pixel7 нетронут.

**Ф3 ДОБИТА ЦЕЛИКОМ (пачка №2, билды -9…-12):**
- Нюансы юзера по рельсе (`fa21348`): гроб статичен dim 0.38→hover (slide
  дёргал full-width ряды); пилюля=кнопка toggleFocusGroup + счётчик
  (adapter focusGroupById); плита «Грядущее» #rail-digest (6 ближайших,
  _renderRailDigest в render/renderListOnly, тик в updateDeadlineBadges,
  railDigestGo скролл+пульс); рельса stretch+шов (sticky на .rail-inner —
  stretch душит sticky!); :has(6+ кнопок)→лейбл сверху; рельса 352px;
  Гримуар 1220/1400, Архив 920@1600. КАПКАН: rail-digest нужен базовый
  display:none — JS сброс inline вытаскивал его на мобилу нестилизованным.
- B4-02 движок (`6f32654`+`d8a9569`): _apAttach/_apDetach в 03-render
  (rAF follow по scroll capture+resize, close при уходе якоря, single-open
  между семьями), _fmPlace/_spPlace вынесены, Esc теперь закрывает
  сорт-портал И готические пикеры (реестр G4-6), _apMenuKeyNav стрелки.
  Принято: float-family(9)+sort-portal; qa НЕ трогал (свой follow с F2),
  пикеры не порталируются → отрыв невозможен by design. Пруф
  f3_popover.mjs 8/8. Coarse-шиты без движка намеренно.
- O-3 long-press (`f19d646`): вживлён в 08 (480мс/slop 8/линжер 1.2с/
  suppress click capture-фазой, исключены drag-handles и .confirm-armed),
  .lp-hint z4100; пруф 5/5. Аудит: 183 кнопки, 0 без лейбла — инвентарь
  Опуса не нужен. OPUS-QUEUE обновлён (O-2 сузился: сорт-баг вероятно
  закрыт клампом — перепроверить на девайсе).

ЖДЁТ: ревью пачки №2 (REVIEW-QUEUE §Ф3 чек-лист); drawer-nav внесён в
FIX-PLAN W4 (одобренное направление, дизайн после обкатки F2-тулбара).
ДАЛЬШЕ: недельный лимит СБРОШЕН — план пересобрать под новые условия
(Ф4 TWA / Ф5 хвост / adversarial-воркфлоу всё ещё отложен юзером).
